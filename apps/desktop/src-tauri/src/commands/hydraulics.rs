//! Hydraulic analysis commands
//!
//! Tauri commands for hydraulic analysis using the cadhy-hydraulics crate.
//! These commands expose the hydraulic calculation engine to the frontend.

use cadhy_hydraulics::{
    hydraulics::{FlowRegime, FlowResult, HydraulicsEngine},
    sections::SectionType,
};
use serde::{Deserialize, Serialize};

// ============================================================================
// TYPES - Bridge types for Tauri serialization
// ============================================================================

/// Channel type enumeration (frontend-friendly)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChannelType {
    Rectangular,
    Trapezoidal,
    Triangular,
}

/// Channel parameters for analysis (frontend input)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelParams {
    pub channel_type: ChannelType,
    /// Bottom width (m) - for rectangular/trapezoidal
    pub width: Option<f64>,
    /// Side slope z (H:V) - for trapezoidal/triangular
    pub side_slope: Option<f64>,
    /// Manning's n coefficient
    pub manning_n: f64,
    /// Channel bed slope (m/m)
    pub slope: f64,
}

impl ChannelParams {
    /// Convert to cadhy-hydraulics SectionType
    fn to_section_type(&self, depth: f64) -> Result<SectionType, String> {
        match self.channel_type {
            ChannelType::Rectangular => {
                let width = self.width.ok_or("Width required for rectangular channel")?;
                Ok(SectionType::rectangular(width, depth))
            }
            ChannelType::Trapezoidal => {
                let bottom_width = self.width.ok_or("Width required for trapezoidal channel")?;
                let side_slope = self
                    .side_slope
                    .ok_or("Side slope required for trapezoidal channel")?;
                Ok(SectionType::trapezoidal(bottom_width, depth, side_slope))
            }
            ChannelType::Triangular => {
                let side_slope = self
                    .side_slope
                    .ok_or("Side slope required for triangular channel")?;
                Ok(SectionType::Triangular {
                    depth,
                    left_slope: side_slope,
                    right_slope: side_slope,
                })
            }
        }
    }
}

/// Flow analysis result (frontend output)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowAnalysis {
    /// Flow depth (m)
    pub depth: f64,
    /// Cross-sectional area (m²)
    pub area: f64,
    /// Wetted perimeter (m)
    pub wetted_perimeter: f64,
    /// Hydraulic radius (m)
    pub hydraulic_radius: f64,
    /// Top width (m)
    pub top_width: f64,
    /// Hydraulic depth (m)
    pub hydraulic_depth: f64,
    /// Flow velocity (m/s)
    pub velocity: f64,
    /// Discharge (m³/s)
    pub discharge: f64,
    /// Froude number
    pub froude_number: f64,
    /// Flow regime
    pub flow_regime: String,
    /// Specific energy (m)
    pub specific_energy: f64,
}

impl From<FlowResult> for FlowAnalysis {
    fn from(result: FlowResult) -> Self {
        Self {
            depth: result.water_depth,
            area: result.area,
            wetted_perimeter: result.wetted_perimeter,
            hydraulic_radius: result.hydraulic_radius,
            top_width: result.top_width,
            hydraulic_depth: result.area / result.top_width,
            velocity: result.velocity,
            discharge: result.discharge,
            froude_number: result.froude,
            flow_regime: match result.flow_regime {
                FlowRegime::Subcritical => "Subcritical".to_string(),
                FlowRegime::Critical => "Critical".to_string(),
                FlowRegime::Supercritical => "Supercritical".to_string(),
            },
            specific_energy: result.specific_energy,
        }
    }
}

/// Water profile analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaterProfileResult {
    /// Stations along the channel (m)
    pub stations: Vec<f64>,
    /// Water depths at each station (m)
    pub depths: Vec<f64>,
    /// Velocities at each station (m/s)
    pub velocities: Vec<f64>,
    /// Froude numbers at each station
    pub froude_numbers: Vec<f64>,
    /// Profile type (M1, M2, S1, S2, etc.)
    pub profile_type: String,
}

// ============================================================================
// COMMANDS
// ============================================================================

/// Analyze a channel section at a given depth
#[tauri::command]
pub fn analyze_channel(params: ChannelParams, depth: f64) -> Result<FlowAnalysis, String> {
    if depth <= 0.0 {
        return Err("Depth must be positive".to_string());
    }

    // Create section type with a reasonable max depth
    let section = params.to_section_type(depth * 2.0)?;

    // Use the hydraulics engine from the crate
    let result = HydraulicsEngine::manning_flow(&section, params.slope, params.manning_n, depth);

    Ok(FlowAnalysis::from(result))
}

/// Calculate normal depth for a given discharge using the hydraulics crate
#[tauri::command]
pub fn calculate_normal_depth(params: ChannelParams, discharge: f64) -> Result<f64, String> {
    if discharge <= 0.0 {
        return Err("Discharge must be positive".to_string());
    }

    if params.slope <= 0.0 {
        return Err("Slope must be positive for normal depth calculation".to_string());
    }

    // Create section with reasonable max depth for calculation
    let max_depth = 10.0; // Assume max 10m depth for iteration
    let section = params.to_section_type(max_depth)?;

    HydraulicsEngine::normal_depth(
        &section,
        discharge,
        params.slope,
        params.manning_n,
        1e-6, // tolerance
        100,  // max iterations
    )
    .map_err(|e| e.to_string())
}

/// Calculate critical depth for a given discharge
#[tauri::command]
pub fn calculate_critical_depth(params: ChannelParams, discharge: f64) -> Result<f64, String> {
    if discharge <= 0.0 {
        return Err("Discharge must be positive".to_string());
    }

    // Create section with reasonable max depth for calculation
    let max_depth = 10.0;
    let section = params.to_section_type(max_depth)?;

    HydraulicsEngine::critical_depth(
        &section, discharge, 1e-6, // tolerance
        100,  // max iterations
    )
    .map_err(|e| e.to_string())
}

/// Analyze water surface profile using gradually varied flow equations
#[tauri::command]
pub fn analyze_water_profile(
    params: ChannelParams,
    discharge: f64,
    upstream_depth: f64,
    channel_length: f64,
    num_steps: usize,
) -> Result<WaterProfileResult, String> {
    if discharge <= 0.0 {
        return Err("Discharge must be positive".to_string());
    }
    if channel_length <= 0.0 {
        return Err("Channel length must be positive".to_string());
    }
    if num_steps < 2 {
        return Err("Number of steps must be at least 2".to_string());
    }

    let dx = channel_length / (num_steps - 1) as f64;
    let max_depth = 10.0;
    let section = params.to_section_type(max_depth)?;

    let normal_depth = HydraulicsEngine::normal_depth(
        &section,
        discharge,
        params.slope,
        params.manning_n,
        1e-6,
        100,
    )
    .map_err(|e| e.to_string())?;

    let critical_depth = HydraulicsEngine::critical_depth(&section, discharge, 1e-6, 100)
        .map_err(|e| e.to_string())?;

    // Determine profile type
    let profile_type =
        determine_profile_type(params.slope, upstream_depth, normal_depth, critical_depth);

    let mut stations = vec![0.0];
    let mut depths = vec![upstream_depth];
    let mut velocities = Vec::new();
    let mut froude_numbers = Vec::new();

    // Get initial conditions
    let initial_flow =
        HydraulicsEngine::manning_flow(&section, params.slope, params.manning_n, upstream_depth);
    velocities.push(initial_flow.velocity);
    froude_numbers.push(initial_flow.froude);

    let mut y = upstream_depth;
    let _g = 9.81;

    // Standard step method for GVF computation
    for i in 1..num_steps {
        let x = i as f64 * dx;
        let flow = HydraulicsEngine::manning_flow(&section, params.slope, params.manning_n, y);

        // Energy slope: Se = n² * V² / R^(4/3)
        let se = params.manning_n.powi(2) * flow.velocity.powi(2)
            / flow.hydraulic_radius.powf(4.0 / 3.0);

        // Gradually varied flow equation: dy/dx = (S0 - Se) / (1 - Fr²)
        let fr_squared = flow.froude.powi(2);
        if (1.0 - fr_squared).abs() < 1e-6 {
            return Err("Flow near critical, numerical instability".to_string());
        }

        let dy_dx = (params.slope - se) / (1.0 - fr_squared);
        y += dy_dx * dx;

        // Ensure depth stays positive and reasonable
        y = y.max(0.01).min(10.0 * normal_depth);

        stations.push(x);
        depths.push(y);

        let step_flow = HydraulicsEngine::manning_flow(&section, params.slope, params.manning_n, y);
        velocities.push(step_flow.velocity);
        froude_numbers.push(step_flow.froude);
    }

    Ok(WaterProfileResult {
        stations,
        depths,
        velocities,
        froude_numbers,
        profile_type,
    })
}

/// Check channel capacity with freeboard requirements
#[tauri::command]
pub fn check_channel_capacity(
    params: ChannelParams,
    discharge: f64,
    min_freeboard: f64,
) -> Result<CapacityCheckResult, String> {
    if discharge <= 0.0 {
        return Err("Discharge must be positive".to_string());
    }

    let max_depth = 10.0;
    let section = params.to_section_type(max_depth)?;

    let check = HydraulicsEngine::check_capacity(
        &section,
        discharge,
        params.slope,
        params.manning_n,
        min_freeboard,
    );

    Ok(CapacityCheckResult {
        normal_depth: check.normal_depth,
        critical_depth: check.critical_depth,
        freeboard: check.freeboard,
        has_adequate_freeboard: check.has_adequate_freeboard,
        flow_regime: match check.flow_regime {
            FlowRegime::Subcritical => "Subcritical".to_string(),
            FlowRegime::Critical => "Critical".to_string(),
            FlowRegime::Supercritical => "Supercritical".to_string(),
        },
        is_subcritical: check.is_subcritical,
        velocity: check.velocity,
        is_velocity_safe: check.is_velocity_safe,
        design_capacity: check.design_capacity,
    })
}

/// Capacity check result for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapacityCheckResult {
    pub normal_depth: f64,
    pub critical_depth: f64,
    pub freeboard: f64,
    pub has_adequate_freeboard: bool,
    pub flow_regime: String,
    pub is_subcritical: bool,
    pub velocity: f64,
    pub is_velocity_safe: bool,
    pub design_capacity: f64,
}

// ============================================================================
// HELPERS
// ============================================================================

/// Determine the water surface profile type
fn determine_profile_type(_slope: f64, y: f64, yn: f64, yc: f64) -> String {
    let is_mild = yn > yc;
    let is_steep = yn < yc;
    let is_critical = (yn - yc).abs() < 0.001;

    if is_mild {
        if y > yn {
            "M1 (Backwater)".to_string()
        } else if y > yc {
            "M2 (Drawdown)".to_string()
        } else {
            "M3 (Rapidly varied)".to_string()
        }
    } else if is_steep {
        if y > yc {
            "S1 (Backwater)".to_string()
        } else if y > yn {
            "S2 (Drawdown)".to_string()
        } else {
            "S3 (Rapidly varied)".to_string()
        }
    } else if is_critical {
        "C (Critical slope)".to_string()
    } else {
        "Unknown".to_string()
    }
}
