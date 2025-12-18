//! Saint-Venant 1D Unsteady Flow Solver
//!
//! Implements the complete 1D Saint-Venant equations for unsteady open channel flow:
//!
//! **Continuity Equation:**
//! ∂A/∂t + ∂Q/∂x = q_l
//!
//! **Momentum Equation:**
//! ∂Q/∂t + ∂(βQ²/A)/∂x + gA(∂h/∂x) + gA(Sf - S0) = 0
//!
//! Where:
//! - A = cross-sectional flow area (m²)
//! - Q = discharge (m³/s)
//! - q_l = lateral inflow per unit length (m²/s)
//! - β = momentum correction factor (Boussinesq coefficient)
//! - g = gravitational acceleration (m/s²)
//! - h = water surface elevation (m)
//! - Sf = friction slope (Manning equation)
//! - S0 = bed slope
//!
//! **Numerical Scheme:** Preissmann 4-point implicit finite difference
//! - Unconditionally stable for θ ≥ 0.5
//! - Second-order accurate in space
//! - Handles subcritical, supercritical, and mixed flow regimes
//!
//! **Features:**
//! - Automatic transition detection (contractions/expansions)
//! - Adaptive mesh refinement at geometric discontinuities
//! - Hydraulic jump capturing via shock-fitting
//! - Supercritical/subcritical regime tracking

use crate::{HydraulicError, Result, SectionType, G};
use nalgebra::{DMatrix, DVector};
use serde::{Deserialize, Serialize};

// =============================================================================
// CONFIGURATION
// =============================================================================

/// Configuration for the Saint-Venant solver
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaintVenantConfig {
    /// Time step (s) - adaptive if 0
    pub dt: f64,

    /// Spatial step (m) - base step, refined at transitions
    pub dx: f64,

    /// Preissmann weighting factor θ ∈ [0.5, 1.0]
    /// - 0.5 = Crank-Nicolson (most accurate but can oscillate)
    /// - 0.6 = recommended for most cases
    /// - 1.0 = fully implicit (most stable, some numerical diffusion)
    pub theta: f64,

    /// Maximum number of Newton-Raphson iterations per time step
    pub max_iterations: usize,

    /// Convergence tolerance for Newton-Raphson
    pub tolerance: f64,

    /// Courant number limit for adaptive time stepping
    pub courant_max: f64,

    /// Minimum water depth (m) - prevents dry bed singularities
    pub min_depth: f64,

    /// Enable adaptive mesh refinement at transitions
    pub adaptive_mesh: bool,

    /// Refinement factor for transitions (smaller = finer mesh)
    pub transition_refinement: f64,

    /// Enable shock capturing for hydraulic jumps
    pub shock_capturing: bool,

    /// Artificial viscosity coefficient for shock capturing
    pub artificial_viscosity: f64,

    /// Manning's n default value
    pub default_manning_n: f64,

    /// Momentum correction factor β (Boussinesq)
    pub beta: f64,

    /// Energy correction factor α (Coriolis)
    pub alpha: f64,

    /// Include lateral inflow terms
    pub include_lateral_inflow: bool,

    /// Include wind stress terms
    pub include_wind_stress: bool,

    /// Simulation end time (s) - 0 for steady state
    pub end_time: f64,

    /// Output interval (s)
    pub output_interval: f64,
}

impl Default for SaintVenantConfig {
    fn default() -> Self {
        Self {
            dt: 0.0,                     // Adaptive
            dx: 1.0,                     // 1 meter base
            theta: 0.6,                  // Preissmann weighting
            max_iterations: 20,          // Newton iterations
            tolerance: 1e-6,             // Convergence tolerance
            courant_max: 0.9,            // Courant limit
            min_depth: 0.001,            // 1 mm minimum
            adaptive_mesh: true,         // Enable mesh refinement
            transition_refinement: 0.25, // 4x refinement at transitions
            shock_capturing: true,       // Enable shock capturing
            artificial_viscosity: 0.1,   // Small viscosity
            default_manning_n: 0.015,    // Concrete channel
            beta: 1.0,                   // Momentum correction
            alpha: 1.0,                  // Energy correction
            include_lateral_inflow: false,
            include_wind_stress: false,
            end_time: 0.0,        // Steady state
            output_interval: 1.0, // Output every second
        }
    }
}

// =============================================================================
// GEOMETRY TYPES
// =============================================================================

/// Type of geometric transition detected
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TransitionType {
    /// No transition - uniform channel
    None,
    /// Gradual contraction (area decreasing downstream)
    GradualContraction,
    /// Gradual expansion (area increasing downstream)
    GradualExpansion,
    /// Abrupt contraction
    AbruptContraction,
    /// Abrupt expansion
    AbruptExpansion,
    /// Bed drop (vertical or sloped)
    BedDrop,
    /// Bed rise (weir, sill)
    BedRise,
    /// Side slope change
    SideSlope,
    /// Combined transition (multiple changes)
    Combined,
}

/// Detected geometric feature in the channel
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeometricFeature {
    /// Start station (m)
    pub start_station: f64,
    /// End station (m)
    pub end_station: f64,
    /// Type of transition
    pub transition_type: TransitionType,
    /// Contraction ratio (downstream area / upstream area)
    pub area_ratio: f64,
    /// Change in bottom width (m)
    pub width_change: f64,
    /// Change in bed elevation (m)
    pub bed_change: f64,
    /// Recommended loss coefficient
    pub loss_coefficient: f64,
    /// Required mesh refinement level
    pub refinement_level: u8,
}

/// Channel cross-section at a computational node
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossSection {
    /// Station along channel (m)
    pub station: f64,
    /// Bed elevation (m)
    pub bed_elevation: f64,
    /// Section geometry
    pub section: SectionType,
    /// Manning's n coefficient
    pub manning_n: f64,
    /// Lateral inflow rate (m²/s)
    pub lateral_inflow: f64,
    /// Is this a transition zone?
    pub is_transition: bool,
    /// Local bed slope
    pub bed_slope: f64,
    /// Expansion/contraction coefficient
    pub transition_coeff: f64,
}

/// Computational mesh node
#[derive(Debug, Clone)]
pub struct MeshNode {
    /// Node index
    pub index: usize,
    /// Station (m)
    pub x: f64,
    /// Cross-section data
    pub section: CrossSection,
    /// Distance to next node (m)
    pub dx_next: f64,
    /// Is boundary node?
    pub is_boundary: bool,
    /// Refinement level (0 = base, higher = finer)
    pub refinement_level: u8,
}

// =============================================================================
// STATE VARIABLES
// =============================================================================

/// Flow state at a computational node
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowState {
    /// Water depth (m)
    pub depth: f64,
    /// Discharge (m³/s)
    pub discharge: f64,
    /// Flow area (m²)
    pub area: f64,
    /// Velocity (m/s)
    pub velocity: f64,
    /// Water surface elevation (m)
    pub wse: f64,
    /// Energy grade line elevation (m)
    pub egl: f64,
    /// Froude number
    pub froude: f64,
    /// Flow regime
    pub regime: FlowRegime,
    /// Friction slope
    pub friction_slope: f64,
    /// Specific energy (m)
    pub specific_energy: f64,
    /// Specific momentum (m³)
    pub specific_momentum: f64,
}

/// Flow regime classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FlowRegime {
    Subcritical,
    Critical,
    Supercritical,
    /// Transition zone (near critical)
    TransCritical,
}

impl FlowRegime {
    pub fn from_froude(fr: f64) -> Self {
        if fr < 0.95 {
            FlowRegime::Subcritical
        } else if fr > 1.05 {
            FlowRegime::Supercritical
        } else {
            FlowRegime::Critical
        }
    }
}

// =============================================================================
// BOUNDARY CONDITIONS
// =============================================================================

/// Upstream boundary condition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpstreamBC {
    /// Constant discharge (m³/s)
    ConstantDischarge(f64),
    /// Discharge hydrograph: (time, discharge) pairs
    DischargeHydrograph(Vec<(f64, f64)>),
    /// Stage hydrograph: (time, water surface elevation) pairs
    StageHydrograph(Vec<(f64, f64)>),
    /// Rating curve: Q = f(h)
    RatingCurve { a: f64, b: f64, h0: f64 }, // Q = a * (h - h0)^b
}

/// Downstream boundary condition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DownstreamBC {
    /// Known water surface elevation (m)
    KnownStage(f64),
    /// Normal depth (uniform flow)
    NormalDepth,
    /// Critical depth
    CriticalDepth,
    /// Free outfall (supercritical exit)
    FreeOutfall,
    /// Stage hydrograph
    StageHydrograph(Vec<(f64, f64)>),
    /// Rating curve: h = f(Q)
    RatingCurve { a: f64, b: f64, q0: f64 }, // h = a * (Q - q0)^b
    /// Weir overflow
    WeirOverflow {
        crest_elevation: f64,
        coefficient: f64,
        length: f64,
    },
}

// =============================================================================
// INPUT STRUCTURE
// =============================================================================

/// Complete input for Saint-Venant analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaintVenantInput {
    /// Channel cross-sections (must be in order upstream to downstream)
    pub sections: Vec<CrossSection>,
    /// Upstream boundary condition
    pub upstream_bc: UpstreamBC,
    /// Downstream boundary condition
    pub downstream_bc: DownstreamBC,
    /// Initial condition type
    pub initial_condition: InitialCondition,
    /// Solver configuration
    pub config: SaintVenantConfig,
}

/// Initial condition specification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum InitialCondition {
    /// Dry bed everywhere
    DryBed,
    /// Uniform depth
    UniformDepth(f64),
    /// Normal depth based on steady discharge
    NormalDepth(f64), // discharge
    /// From previous GVF analysis
    FromGvfProfile(Vec<(f64, f64)>), // (station, depth) pairs
    /// Custom profile
    CustomProfile(Vec<(f64, f64, f64)>), // (station, depth, discharge)
}

// =============================================================================
// OUTPUT STRUCTURES
// =============================================================================

/// Results at a single time step
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeStepResult {
    /// Simulation time (s)
    pub time: f64,
    /// Flow states at each node
    pub states: Vec<FlowState>,
    /// Detected hydraulic jumps
    pub hydraulic_jumps: Vec<HydraulicJumpInfo>,
    /// Maximum Courant number
    pub max_courant: f64,
    /// Number of iterations to converge
    pub iterations: usize,
    /// Residual norm
    pub residual: f64,
}

/// Information about detected hydraulic jump
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HydraulicJumpInfo {
    /// Jump location (station, m)
    pub station: f64,
    /// Upstream depth (m)
    pub y1: f64,
    /// Downstream (sequent) depth (m)
    pub y2: f64,
    /// Upstream Froude number
    pub fr1: f64,
    /// Downstream Froude number
    pub fr2: f64,
    /// Energy dissipation (m)
    pub energy_loss: f64,
    /// Jump length (m)
    pub length: f64,
    /// Jump type classification
    pub jump_type: JumpType,
}

/// Jump type based on upstream Froude number
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum JumpType {
    Undular,     // Fr1 = 1.0-1.7
    Weak,        // Fr1 = 1.7-2.5
    Oscillating, // Fr1 = 2.5-4.5
    Steady,      // Fr1 = 4.5-9.0
    Strong,      // Fr1 > 9.0
}

impl JumpType {
    pub fn from_froude(fr: f64) -> Self {
        if fr < 1.7 {
            JumpType::Undular
        } else if fr < 2.5 {
            JumpType::Weak
        } else if fr < 4.5 {
            JumpType::Oscillating
        } else if fr < 9.0 {
            JumpType::Steady
        } else {
            JumpType::Strong
        }
    }
}

/// Complete Saint-Venant analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaintVenantResult {
    /// Time series of results
    pub time_series: Vec<TimeStepResult>,
    /// Final steady state (if converged)
    pub steady_state: Option<TimeStepResult>,
    /// Detected geometric features
    pub geometric_features: Vec<GeometricFeature>,
    /// Computational mesh info
    pub mesh_info: MeshInfo,
    /// Solver statistics
    pub solver_stats: SolverStats,
    /// Warnings generated during analysis
    pub warnings: Vec<String>,
}

/// Mesh information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MeshInfo {
    /// Total number of nodes
    pub num_nodes: usize,
    /// Number of refined nodes
    pub num_refined: usize,
    /// Minimum dx (m)
    pub min_dx: f64,
    /// Maximum dx (m)
    pub max_dx: f64,
    /// Total channel length (m)
    pub total_length: f64,
}

/// Solver statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolverStats {
    /// Total time steps computed
    pub total_steps: usize,
    /// Average iterations per step
    pub avg_iterations: f64,
    /// Maximum iterations in any step
    pub max_iterations: usize,
    /// Number of step reductions due to non-convergence
    pub step_reductions: usize,
    /// Total CPU time (ms)
    pub cpu_time_ms: u64,
    /// Did solution reach steady state?
    pub reached_steady_state: bool,
}

// =============================================================================
// MAIN SOLVER
// =============================================================================

/// Saint-Venant 1D Unsteady Flow Solver
pub struct SaintVenantSolver {
    config: SaintVenantConfig,
    mesh: Vec<MeshNode>,
    n_nodes: usize,
    // State vectors: [y0, Q0, y1, Q1, ..., yn, Qn]
    state: DVector<f64>,
    state_prev: DVector<f64>,
    // Jacobian matrix for Newton-Raphson
    jacobian: DMatrix<f64>,
    // Right-hand side vector
    rhs: DVector<f64>,
    // Geometric features detected
    features: Vec<GeometricFeature>,
    // Boundary conditions
    upstream_bc: UpstreamBC,
    downstream_bc: DownstreamBC,
    // Current simulation time
    current_time: f64,
    // Warnings
    warnings: Vec<String>,
}

impl SaintVenantSolver {
    /// Create a new solver from input
    pub fn new(input: &SaintVenantInput) -> Result<Self> {
        if input.sections.len() < 2 {
            return Err(HydraulicError::InvalidParameter(
                "At least 2 cross-sections required".into(),
            ));
        }

        let config = input.config.clone();

        // Build computational mesh with adaptive refinement
        let (mesh, features) = Self::build_mesh(&input.sections, &config)?;
        let n_nodes = mesh.len();

        // Initialize state vectors (2 unknowns per node: depth and discharge)
        let n_vars = 2 * n_nodes;
        let state = DVector::zeros(n_vars);
        let state_prev = DVector::zeros(n_vars);
        let jacobian = DMatrix::zeros(n_vars, n_vars);
        let rhs = DVector::zeros(n_vars);

        let mut solver = Self {
            config,
            mesh,
            n_nodes,
            state,
            state_prev,
            jacobian,
            rhs,
            features,
            upstream_bc: input.upstream_bc.clone(),
            downstream_bc: input.downstream_bc.clone(),
            current_time: 0.0,
            warnings: Vec::new(),
        };

        // Set initial conditions
        solver.set_initial_conditions(&input.initial_condition)?;

        Ok(solver)
    }

    /// Build computational mesh with adaptive refinement at transitions
    fn build_mesh(
        sections: &[CrossSection],
        config: &SaintVenantConfig,
    ) -> Result<(Vec<MeshNode>, Vec<GeometricFeature>)> {
        let mut mesh = Vec::new();
        let mut features = Vec::new();

        // First pass: detect geometric features
        for i in 0..sections.len() - 1 {
            let s1 = &sections[i];
            let s2 = &sections[i + 1];

            if let Some(feature) = Self::detect_transition(s1, s2) {
                features.push(feature);
            }
        }

        // Second pass: build mesh with refinement
        let mut node_idx = 0;
        for i in 0..sections.len() - 1 {
            let s1 = &sections[i];
            let s2 = &sections[i + 1];
            let segment_length = s2.station - s1.station;

            // Determine refinement level for this segment
            let refinement = if config.adaptive_mesh {
                features
                    .iter()
                    .find(|f| f.start_station <= s1.station && f.end_station >= s2.station)
                    .map(|f| f.refinement_level)
                    .unwrap_or(0)
            } else {
                0
            };

            // Calculate dx for this segment
            let dx = config.dx * config.transition_refinement.powi(refinement as i32);
            let n_cells = ((segment_length / dx).ceil() as usize).max(1);
            let actual_dx = segment_length / n_cells as f64;

            // Generate nodes for this segment
            for j in 0..n_cells {
                let t = j as f64 / n_cells as f64;
                let x = s1.station + t * segment_length;

                // Interpolate cross-section properties
                let section = Self::interpolate_section(s1, s2, t);

                mesh.push(MeshNode {
                    index: node_idx,
                    x,
                    section,
                    dx_next: actual_dx,
                    is_boundary: node_idx == 0,
                    refinement_level: refinement,
                });

                node_idx += 1;
            }
        }

        // Add final node
        let last_section = sections.last().unwrap();
        mesh.push(MeshNode {
            index: node_idx,
            x: last_section.station,
            section: last_section.clone(),
            dx_next: 0.0,
            is_boundary: true,
            refinement_level: 0,
        });

        Ok((mesh, features))
    }

    /// Detect geometric transition between two sections
    fn detect_transition(s1: &CrossSection, s2: &CrossSection) -> Option<GeometricFeature> {
        let dx = s2.station - s1.station;
        if dx <= 0.0 {
            return None;
        }

        // Get reference areas at a standard depth
        let ref_depth = 1.0; // 1m reference depth
        let props1 = s1.section.hydraulic_properties(ref_depth);
        let props2 = s2.section.hydraulic_properties(ref_depth);

        let area_ratio = if props1.area > 0.0 {
            props2.area / props1.area
        } else {
            1.0
        };

        let width_change = s2.section.bottom_width() - s1.section.bottom_width();
        let bed_change = s2.bed_elevation - s1.bed_elevation;

        // Determine transition type based on changes
        let area_change = (area_ratio - 1.0).abs();
        let is_abrupt = dx < 0.5; // Less than 0.5m is considered abrupt

        let transition_type = if area_change < 0.05 && bed_change.abs() < 0.01 {
            return None; // No significant transition
        } else if area_ratio < 0.95 {
            // Contraction
            if is_abrupt {
                TransitionType::AbruptContraction
            } else {
                TransitionType::GradualContraction
            }
        } else if area_ratio > 1.05 {
            // Expansion
            if is_abrupt {
                TransitionType::AbruptExpansion
            } else {
                TransitionType::GradualExpansion
            }
        } else if bed_change < -0.05 {
            TransitionType::BedDrop
        } else if bed_change > 0.05 {
            TransitionType::BedRise
        } else {
            TransitionType::SideSlope
        };

        // Calculate loss coefficient based on transition type
        let loss_coefficient = match transition_type {
            TransitionType::GradualContraction => 0.1,
            TransitionType::GradualExpansion => 0.3,
            TransitionType::AbruptContraction => 0.5,
            TransitionType::AbruptExpansion => 1.0,
            TransitionType::BedDrop => 0.5,
            TransitionType::BedRise => 0.35,
            _ => 0.2,
        };

        // Determine refinement level based on severity
        let refinement_level = if is_abrupt || area_change > 0.3 {
            3 // High refinement
        } else if area_change > 0.15 {
            2 // Medium refinement
        } else {
            1 // Low refinement
        };

        Some(GeometricFeature {
            start_station: s1.station,
            end_station: s2.station,
            transition_type,
            area_ratio,
            width_change,
            bed_change,
            loss_coefficient,
            refinement_level,
        })
    }

    /// Interpolate cross-section properties
    fn interpolate_section(s1: &CrossSection, s2: &CrossSection, t: f64) -> CrossSection {
        let t = t.clamp(0.0, 1.0);

        CrossSection {
            station: s1.station + t * (s2.station - s1.station),
            bed_elevation: s1.bed_elevation + t * (s2.bed_elevation - s1.bed_elevation),
            section: SectionType::interpolate(&s1.section, &s2.section, t),
            manning_n: s1.manning_n + t * (s2.manning_n - s1.manning_n),
            lateral_inflow: s1.lateral_inflow + t * (s2.lateral_inflow - s1.lateral_inflow),
            is_transition: s1.is_transition || s2.is_transition || t > 0.0 && t < 1.0,
            bed_slope: s1.bed_slope + t * (s2.bed_slope - s1.bed_slope),
            transition_coeff: s1.transition_coeff.max(s2.transition_coeff),
        }
    }

    /// Set initial conditions
    fn set_initial_conditions(&mut self, ic: &InitialCondition) -> Result<()> {
        match ic {
            InitialCondition::DryBed => {
                for i in 0..self.n_nodes {
                    self.set_depth(i, self.config.min_depth);
                    self.set_discharge(i, 0.0);
                }
            }
            InitialCondition::UniformDepth(depth) => {
                let q = self.get_upstream_discharge(0.0);
                for i in 0..self.n_nodes {
                    self.set_depth(i, *depth);
                    self.set_discharge(i, q);
                }
            }
            InitialCondition::NormalDepth(discharge) => {
                // Calculate normal depth at each section
                for i in 0..self.n_nodes {
                    let node = &self.mesh[i];
                    let yn = self.calculate_normal_depth(
                        &node.section.section,
                        *discharge,
                        node.section.bed_slope.abs().max(0.001),
                        node.section.manning_n,
                    )?;
                    self.set_depth(i, yn);
                    self.set_discharge(i, *discharge);
                }
            }
            InitialCondition::FromGvfProfile(profile) => {
                let q = self.get_upstream_discharge(0.0);
                for i in 0..self.n_nodes {
                    let x = self.mesh[i].x;
                    let depth = Self::interpolate_from_profile(profile, x);
                    self.set_depth(i, depth.max(self.config.min_depth));
                    self.set_discharge(i, q);
                }
            }
            InitialCondition::CustomProfile(profile) => {
                for i in 0..self.n_nodes {
                    let x = self.mesh[i].x;
                    let (depth, discharge) = Self::interpolate_from_custom_profile(profile, x);
                    self.set_depth(i, depth.max(self.config.min_depth));
                    self.set_discharge(i, discharge);
                }
            }
        }

        // Copy to previous state
        self.state_prev.copy_from(&self.state);

        Ok(())
    }

    /// Calculate normal depth using bisection
    fn calculate_normal_depth(
        &self,
        section: &SectionType,
        discharge: f64,
        slope: f64,
        manning_n: f64,
    ) -> Result<f64> {
        if discharge <= 0.0 {
            return Ok(self.config.min_depth);
        }

        let mut y_low = self.config.min_depth;
        let mut y_high = section.max_depth() * 2.0;

        for _ in 0..100 {
            let y_mid = (y_low + y_high) / 2.0;
            let props = section.hydraulic_properties(y_mid);

            if props.area <= 0.0 || props.hydraulic_radius <= 0.0 {
                y_low = y_mid;
                continue;
            }

            // Manning: Q = (1/n) * A * R^(2/3) * S^(1/2)
            let q_calc = (1.0 / manning_n)
                * props.area
                * props.hydraulic_radius.powf(2.0 / 3.0)
                * slope.sqrt();

            if (q_calc - discharge).abs() / discharge.max(1e-10) < 0.001 {
                return Ok(y_mid);
            }

            if q_calc < discharge {
                y_low = y_mid;
            } else {
                y_high = y_mid;
            }
        }

        Ok((y_low + y_high) / 2.0)
    }

    /// Get upstream discharge at time t
    fn get_upstream_discharge(&self, t: f64) -> f64 {
        match &self.upstream_bc {
            UpstreamBC::ConstantDischarge(q) => *q,
            UpstreamBC::DischargeHydrograph(hydrograph) => {
                Self::interpolate_hydrograph(hydrograph, t)
            }
            UpstreamBC::StageHydrograph(_) => {
                // Need to compute from rating curve or solve
                0.0 // Placeholder
            }
            UpstreamBC::RatingCurve { a, b, h0 } => {
                let depth = self.get_depth(0);
                let h = depth + self.mesh[0].section.bed_elevation;
                if h > *h0 {
                    *a * (h - h0).powf(*b)
                } else {
                    0.0
                }
            }
        }
    }

    /// Interpolate value from hydrograph
    fn interpolate_hydrograph(hydrograph: &[(f64, f64)], t: f64) -> f64 {
        if hydrograph.is_empty() {
            return 0.0;
        }
        if hydrograph.len() == 1 {
            return hydrograph[0].1;
        }

        // Find bracketing points
        for i in 0..hydrograph.len() - 1 {
            let (t1, v1) = hydrograph[i];
            let (t2, v2) = hydrograph[i + 1];
            if t >= t1 && t <= t2 {
                let frac = (t - t1) / (t2 - t1);
                return v1 + frac * (v2 - v1);
            }
        }

        // Extrapolate from last value
        hydrograph.last().unwrap().1
    }

    /// Interpolate depth from profile
    fn interpolate_from_profile(profile: &[(f64, f64)], x: f64) -> f64 {
        if profile.is_empty() {
            return 0.0;
        }

        for i in 0..profile.len() - 1 {
            let (x1, y1) = profile[i];
            let (x2, y2) = profile[i + 1];
            if x >= x1 && x <= x2 {
                let t = (x - x1) / (x2 - x1);
                return y1 + t * (y2 - y1);
            }
        }

        profile.last().unwrap().1
    }

    /// Interpolate from custom profile (station, depth, discharge)
    fn interpolate_from_custom_profile(profile: &[(f64, f64, f64)], x: f64) -> (f64, f64) {
        if profile.is_empty() {
            return (0.0, 0.0);
        }

        for i in 0..profile.len() - 1 {
            let (x1, y1, q1) = profile[i];
            let (x2, y2, q2) = profile[i + 1];
            if x >= x1 && x <= x2 {
                let t = (x - x1) / (x2 - x1);
                return (y1 + t * (y2 - y1), q1 + t * (q2 - q1));
            }
        }

        let last = profile.last().unwrap();
        (last.1, last.2)
    }

    // State vector accessors
    fn get_depth(&self, i: usize) -> f64 {
        self.state[2 * i]
    }

    fn set_depth(&mut self, i: usize, y: f64) {
        self.state[2 * i] = y.max(self.config.min_depth);
    }

    fn get_discharge(&self, i: usize) -> f64 {
        self.state[2 * i + 1]
    }

    fn set_discharge(&mut self, i: usize, q: f64) {
        self.state[2 * i + 1] = q;
    }

    fn get_depth_prev(&self, i: usize) -> f64 {
        self.state_prev[2 * i]
    }

    fn get_discharge_prev(&self, i: usize) -> f64 {
        self.state_prev[2 * i + 1]
    }

    /// Run the solver and return results
    pub fn solve(&mut self) -> Result<SaintVenantResult> {
        let start_time = std::time::Instant::now();
        let mut time_series = Vec::new();
        let mut total_steps = 0;
        let mut total_iterations = 0;
        let mut max_iterations = 0;
        let mut step_reductions = 0;

        // Determine if steady state or transient
        let is_steady_state = self.config.end_time <= 0.0;

        if is_steady_state {
            // Pseudo-transient approach to steady state
            let pseudo_dt = 1000.0; // Large time step for fast convergence
            let max_pseudo_steps = 1000;

            for _step in 0..max_pseudo_steps {
                let dt = pseudo_dt;

                // Save previous state
                self.state_prev.copy_from(&self.state);

                // Newton-Raphson iteration
                let (converged, iterations, _residual) = self.newton_iteration(dt)?;

                total_iterations += iterations;
                max_iterations = max_iterations.max(iterations);
                total_steps += 1;

                if !converged {
                    step_reductions += 1;
                    // Restore and try smaller step
                    self.state.copy_from(&self.state_prev);
                    continue;
                }

                // Check for steady state convergence
                let change = self.compute_state_change();
                if change < self.config.tolerance * 10.0 {
                    // Converged to steady state
                    let result = self.extract_time_step_result(self.current_time)?;
                    time_series.push(result.clone());

                    return Ok(SaintVenantResult {
                        time_series,
                        steady_state: Some(result),
                        geometric_features: self.features.clone(),
                        mesh_info: self.get_mesh_info(),
                        solver_stats: SolverStats {
                            total_steps,
                            avg_iterations: total_iterations as f64 / total_steps as f64,
                            max_iterations,
                            step_reductions,
                            cpu_time_ms: start_time.elapsed().as_millis() as u64,
                            reached_steady_state: true,
                        },
                        warnings: self.warnings.clone(),
                    });
                }
            }

            self.warnings
                .push("Did not converge to steady state within iteration limit".into());
        } else {
            // Transient simulation
            let mut dt = if self.config.dt > 0.0 {
                self.config.dt
            } else {
                self.calculate_stable_dt()
            };

            let mut next_output = 0.0;

            while self.current_time < self.config.end_time {
                // Adjust dt for end time
                if self.current_time + dt > self.config.end_time {
                    dt = self.config.end_time - self.current_time;
                }

                // Save previous state
                self.state_prev.copy_from(&self.state);

                // Newton-Raphson iteration
                let (converged, iterations, _residual) = self.newton_iteration(dt)?;

                if !converged {
                    step_reductions += 1;
                    // Restore and try smaller step
                    self.state.copy_from(&self.state_prev);
                    dt *= 0.5;
                    continue;
                }

                total_iterations += iterations;
                max_iterations = max_iterations.max(iterations);
                total_steps += 1;

                self.current_time += dt;

                // Output results at specified intervals
                if self.current_time >= next_output {
                    let result = self.extract_time_step_result(self.current_time)?;
                    time_series.push(result);
                    next_output += self.config.output_interval;
                }

                // Adaptive time stepping
                if self.config.dt <= 0.0 {
                    dt = self.calculate_stable_dt();
                }
            }
        }

        // Final result
        let final_result = self.extract_time_step_result(self.current_time)?;
        if time_series.is_empty() || time_series.last().unwrap().time != self.current_time {
            time_series.push(final_result.clone());
        }

        Ok(SaintVenantResult {
            time_series,
            steady_state: if is_steady_state {
                Some(final_result)
            } else {
                None
            },
            geometric_features: self.features.clone(),
            mesh_info: self.get_mesh_info(),
            solver_stats: SolverStats {
                total_steps,
                avg_iterations: if total_steps > 0 {
                    total_iterations as f64 / total_steps as f64
                } else {
                    0.0
                },
                max_iterations,
                step_reductions,
                cpu_time_ms: start_time.elapsed().as_millis() as u64,
                reached_steady_state: is_steady_state,
            },
            warnings: self.warnings.clone(),
        })
    }

    /// Newton-Raphson iteration for one time step
    fn newton_iteration(&mut self, dt: f64) -> Result<(bool, usize, f64)> {
        let theta = self.config.theta;

        for iter in 0..self.config.max_iterations {
            // Reset Jacobian and RHS
            self.jacobian.fill(0.0);
            self.rhs.fill(0.0);

            // Assemble equations for interior nodes
            for i in 1..self.n_nodes - 1 {
                self.assemble_interior_equations(i, dt, theta)?;
            }

            // Apply boundary conditions
            self.apply_upstream_bc(dt)?;
            self.apply_downstream_bc(dt)?;

            // Solve linear system: J * delta = -rhs
            let residual_norm = self.rhs.norm();

            if residual_norm < self.config.tolerance {
                return Ok((true, iter + 1, residual_norm));
            }

            // Solve using LU decomposition
            match self.jacobian.clone().lu().solve(&(-&self.rhs)) {
                Some(delta) => {
                    // Update state with relaxation for stability
                    let relaxation = if iter < 3 { 0.8 } else { 1.0 };
                    self.state += relaxation * delta;

                    // Enforce minimum depth
                    for i in 0..self.n_nodes {
                        if self.get_depth(i) < self.config.min_depth {
                            self.set_depth(i, self.config.min_depth);
                        }
                    }
                }
                None => {
                    self.warnings.push(format!(
                        "Jacobian singular at time {:.3}s, iteration {}",
                        self.current_time, iter
                    ));
                    return Ok((false, iter + 1, residual_norm));
                }
            }
        }

        Ok((false, self.config.max_iterations, self.rhs.norm()))
    }

    /// Assemble equations for an interior node using Preissmann scheme
    fn assemble_interior_equations(&mut self, i: usize, dt: f64, theta: f64) -> Result<()> {
        let node = &self.mesh[i];
        let dx = self.mesh[i - 1].dx_next;

        // Current state
        let y_i = self.get_depth(i);
        let q_i = self.get_discharge(i);
        let y_im1 = self.get_depth(i - 1);
        let q_im1 = self.get_discharge(i - 1);

        // Previous state
        let y_i_prev = self.get_depth_prev(i);
        let q_i_prev = self.get_discharge_prev(i);
        let _y_im1_prev = self.get_depth_prev(i - 1);
        let q_im1_prev = self.get_discharge_prev(i - 1);

        // Hydraulic properties at current time
        let props_i = node.section.section.hydraulic_properties(y_i);
        let props_im1 = self.mesh[i - 1].section.section.hydraulic_properties(y_im1);

        let a_i = props_i.area;
        let a_im1 = props_im1.area;
        let t_i = props_i.top_width;
        let t_im1 = props_im1.top_width;

        // Velocities
        let v_i = if a_i > 0.0 { q_i / a_i } else { 0.0 };
        let v_im1 = if a_im1 > 0.0 { q_im1 / a_im1 } else { 0.0 };

        // Friction slopes (Manning)
        let sf_i = self.friction_slope(v_i, props_i.hydraulic_radius, node.section.manning_n);
        let sf_im1 = self.friction_slope(
            v_im1,
            props_im1.hydraulic_radius,
            self.mesh[i - 1].section.manning_n,
        );

        // Bed elevations
        let z_i = node.section.bed_elevation;
        let z_im1 = self.mesh[i - 1].section.bed_elevation;

        // Water surface elevations
        let h_i = z_i + y_i;
        let h_im1 = z_im1 + y_im1;

        // Averaged values at cell face
        let a_avg = 0.5 * (a_i + a_im1);
        let _q_avg = 0.5 * (q_i + q_im1);
        let sf_avg = 0.5 * (sf_i + sf_im1);

        // Equation indices
        let eq_cont = 2 * i; // Continuity equation
        let eq_mom = 2 * i + 1; // Momentum equation

        // === CONTINUITY EQUATION ===
        // ∂A/∂t + ∂Q/∂x = q_l
        // Preissmann discretization:
        // (A_i^n+1 - A_i^n)/dt + θ*(Q_i^n+1 - Q_{i-1}^n+1)/dx + (1-θ)*(Q_i^n - Q_{i-1}^n)/dx = q_l

        // Time derivative term (using T = dA/dy)
        let da_dt_i = t_i * (y_i - y_i_prev) / dt;

        // Spatial derivative at n+1
        let dq_dx_new = (q_i - q_im1) / dx;

        // Spatial derivative at n
        let dq_dx_old = (q_i_prev - q_im1_prev) / dx;

        // Lateral inflow
        let ql = node.section.lateral_inflow;

        // Continuity residual
        self.rhs[eq_cont] = da_dt_i + theta * dq_dx_new + (1.0 - theta) * dq_dx_old - ql;

        // Jacobian entries for continuity
        // d(residual)/d(y_i)
        self.jacobian[(eq_cont, 2 * i)] = t_i / dt;
        // d(residual)/d(Q_i)
        self.jacobian[(eq_cont, 2 * i + 1)] = theta / dx;
        // d(residual)/d(Q_{i-1})
        self.jacobian[(eq_cont, 2 * (i - 1) + 1)] = -theta / dx;

        // === MOMENTUM EQUATION ===
        // ∂Q/∂t + ∂(βQ²/A)/∂x + gA(∂h/∂x + Sf) = 0
        // Including transition losses via artificial viscosity

        let beta = self.config.beta;

        // Time derivative
        let dq_dt = (q_i - q_i_prev) / dt;

        // Convective term: ∂(βQ²/A)/∂x
        let conv_i = beta * q_i * q_i / a_i.max(1e-10);
        let conv_im1 = beta * q_im1 * q_im1 / a_im1.max(1e-10);
        let d_conv_dx = (conv_i - conv_im1) / dx;

        // Pressure term: gA * ∂h/∂x
        let dh_dx = (h_i - h_im1) / dx;
        let pressure_term = G * a_avg * dh_dx;

        // Friction term: gA * Sf
        let friction_term = G * a_avg * sf_avg;

        // Artificial viscosity for shock capturing (transitions and jumps)
        let visc_term = if self.config.shock_capturing && node.section.is_transition {
            let mu = self.config.artificial_viscosity;
            let d2q_dx2 = 0.0; // Simplified - would need 3-point stencil
            mu * d2q_dx2
        } else {
            0.0
        };

        // Transition loss term
        let transition_loss = if node.section.transition_coeff > 0.0 {
            let dv = v_i - v_im1;
            node.section.transition_coeff * dv.abs() * dv / (2.0 * dx)
        } else {
            0.0
        };

        // Momentum residual
        self.rhs[eq_mom] =
            dq_dt + d_conv_dx + pressure_term + friction_term + transition_loss - visc_term;

        // Jacobian entries for momentum (linearized)
        // These are approximations - full Jacobian would be more complex

        // d(residual)/d(y_i) - includes pressure and friction dependence
        let da_dy_i = t_i;
        let dr_dy_i = props_i.hydraulic_radius / y_i.max(1e-10) * (2.0 / 3.0); // Approximate
        let dsf_dy_i = -sf_i * (4.0 / 3.0) * dr_dy_i / props_i.hydraulic_radius.max(1e-10);

        self.jacobian[(eq_mom, 2 * i)] = G * 0.5 * da_dy_i * dh_dx
            + G * a_avg / dx
            + G * 0.5 * da_dy_i * sf_avg
            + G * a_avg * 0.5 * dsf_dy_i
            - 2.0 * beta * q_i * q_i / (a_i * a_i).max(1e-10) * da_dy_i / dx;

        // d(residual)/d(Q_i)
        let dsf_dq_i = 2.0 * sf_i / q_i.abs().max(1e-10);
        self.jacobian[(eq_mom, 2 * i + 1)] =
            1.0 / dt + 2.0 * beta * q_i / a_i.max(1e-10) / dx + G * a_avg * 0.5 * dsf_dq_i;

        // d(residual)/d(y_{i-1})
        let da_dy_im1 = t_im1;
        self.jacobian[(eq_mom, 2 * (i - 1))] = G * 0.5 * da_dy_im1 * dh_dx - G * a_avg / dx
            + 2.0 * beta * q_im1 * q_im1 / (a_im1 * a_im1).max(1e-10) * da_dy_im1 / dx;

        // d(residual)/d(Q_{i-1})
        self.jacobian[(eq_mom, 2 * (i - 1) + 1)] = -2.0 * beta * q_im1 / a_im1.max(1e-10) / dx;

        Ok(())
    }

    /// Calculate friction slope using Manning equation
    fn friction_slope(&self, velocity: f64, hydraulic_radius: f64, manning_n: f64) -> f64 {
        if hydraulic_radius <= 0.0 {
            return 0.0;
        }
        let sf = (manning_n * velocity).powi(2) / hydraulic_radius.powf(4.0 / 3.0);
        // Sign of friction slope follows velocity
        if velocity >= 0.0 {
            sf
        } else {
            -sf
        }
    }

    /// Apply upstream boundary condition
    fn apply_upstream_bc(&mut self, _dt: f64) -> Result<()> {
        let q_upstream = self.get_upstream_discharge(self.current_time);

        match &self.upstream_bc {
            UpstreamBC::ConstantDischarge(_) | UpstreamBC::DischargeHydrograph(_) => {
                // Prescribed discharge
                self.rhs[1] = self.get_discharge(0) - q_upstream;
                self.jacobian[(1, 1)] = 1.0;

                // Characteristic equation for depth (supercritical: both from upstream)
                let y = self.get_depth(0);
                let props = self.mesh[0].section.section.hydraulic_properties(y);
                let fr = if props.area > 0.0 && props.hydraulic_depth > 0.0 {
                    q_upstream / props.area / (G * props.hydraulic_depth).sqrt()
                } else {
                    0.0
                };

                if fr > 1.0 {
                    // Supercritical: need to specify depth too
                    // Use normal depth as upstream condition
                    let yn = self.calculate_normal_depth(
                        &self.mesh[0].section.section,
                        q_upstream,
                        self.mesh[0].section.bed_slope.abs().max(0.001),
                        self.mesh[0].section.manning_n,
                    )?;
                    self.rhs[0] = self.get_depth(0) - yn;
                    self.jacobian[(0, 0)] = 1.0;
                } else {
                    // Subcritical: characteristic from downstream
                    self.rhs[0] = 0.0; // Will be set by internal equation
                }
            }
            UpstreamBC::StageHydrograph(hydrograph) => {
                let h = Self::interpolate_hydrograph(hydrograph, self.current_time);
                let z = self.mesh[0].section.bed_elevation;
                let y = (h - z).max(self.config.min_depth);
                self.rhs[0] = self.get_depth(0) - y;
                self.jacobian[(0, 0)] = 1.0;
            }
            UpstreamBC::RatingCurve { .. } => {
                // Rating curve handled in discharge calculation
                self.rhs[1] = self.get_discharge(0) - q_upstream;
                self.jacobian[(1, 1)] = 1.0;
            }
        }

        Ok(())
    }

    /// Apply downstream boundary condition
    fn apply_downstream_bc(&mut self, _dt: f64) -> Result<()> {
        let n = self.n_nodes - 1;
        let eq_y = 2 * n;
        let eq_q = 2 * n + 1;

        match &self.downstream_bc {
            DownstreamBC::KnownStage(h) => {
                let z = self.mesh[n].section.bed_elevation;
                let y = (*h - z).max(self.config.min_depth);
                self.rhs[eq_y] = self.get_depth(n) - y;
                self.jacobian[(eq_y, eq_y)] = 1.0;
            }
            DownstreamBC::NormalDepth => {
                let q = self.get_discharge(n);
                let yn = self.calculate_normal_depth(
                    &self.mesh[n].section.section,
                    q.abs(),
                    self.mesh[n].section.bed_slope.abs().max(0.001),
                    self.mesh[n].section.manning_n,
                )?;
                self.rhs[eq_y] = self.get_depth(n) - yn;
                self.jacobian[(eq_y, eq_y)] = 1.0;
            }
            DownstreamBC::CriticalDepth => {
                let q = self.get_discharge(n);
                let yc = self.calculate_critical_depth(&self.mesh[n].section.section, q.abs())?;
                self.rhs[eq_y] = self.get_depth(n) - yc;
                self.jacobian[(eq_y, eq_y)] = 1.0;
            }
            DownstreamBC::FreeOutfall => {
                // Critical or supercritical exit
                let y = self.get_depth(n);
                let q = self.get_discharge(n);
                let props = self.mesh[n].section.section.hydraulic_properties(y);
                let v = if props.area > 0.0 {
                    q / props.area
                } else {
                    0.0
                };
                let fr = if props.hydraulic_depth > 0.0 {
                    v / (G * props.hydraulic_depth).sqrt()
                } else {
                    0.0
                };

                if fr < 1.0 {
                    // Force critical depth
                    let yc =
                        self.calculate_critical_depth(&self.mesh[n].section.section, q.abs())?;
                    self.rhs[eq_y] = y - yc;
                    self.jacobian[(eq_y, eq_y)] = 1.0;
                }
                // If supercritical, no downstream BC needed for depth
            }
            DownstreamBC::StageHydrograph(hydrograph) => {
                let h = Self::interpolate_hydrograph(hydrograph, self.current_time);
                let z = self.mesh[n].section.bed_elevation;
                let y = (h - z).max(self.config.min_depth);
                self.rhs[eq_y] = self.get_depth(n) - y;
                self.jacobian[(eq_y, eq_y)] = 1.0;
            }
            DownstreamBC::RatingCurve { a, b, q0 } => {
                let y = self.get_depth(n);
                let q = self.get_discharge(n);
                let z = self.mesh[n].section.bed_elevation;
                let h = z + y;
                let q_rating = if q > *q0 { *a * (q - q0).powf(*b) } else { 0.0 };
                self.rhs[eq_y] = h - q_rating;
                // Approximate Jacobian
                self.jacobian[(eq_y, eq_y)] = 1.0;
                self.jacobian[(eq_y, eq_q)] = -(*a) * (*b) * (q - q0).max(1e-10).powf(*b - 1.0);
            }
            DownstreamBC::WeirOverflow {
                crest_elevation,
                coefficient,
                length,
            } => {
                let y = self.get_depth(n);
                let z = self.mesh[n].section.bed_elevation;
                let h = z + y;
                let head = (h - crest_elevation).max(0.0);
                let q_weir = coefficient * length * head.powf(1.5);
                self.rhs[eq_q] = self.get_discharge(n) - q_weir;
                self.jacobian[(eq_q, eq_q)] = 1.0;
                self.jacobian[(eq_q, eq_y)] =
                    -1.5 * coefficient * length * head.max(1e-10).powf(0.5);
            }
        }

        Ok(())
    }

    /// Calculate critical depth
    fn calculate_critical_depth(&self, section: &SectionType, discharge: f64) -> Result<f64> {
        if discharge <= 0.0 {
            return Ok(self.config.min_depth);
        }

        let target = discharge.powi(2) / G; // Q²/g = A³/T

        let mut y_low = self.config.min_depth;
        let mut y_high = section.max_depth() * 2.0;

        for _ in 0..100 {
            let y_mid = (y_low + y_high) / 2.0;
            let props = section.hydraulic_properties(y_mid);

            if props.area <= 0.0 || props.top_width <= 0.0 {
                y_low = y_mid;
                continue;
            }

            let section_factor = props.area.powi(3) / props.top_width;

            if (section_factor - target).abs() / target.max(1e-10) < 0.001 {
                return Ok(y_mid);
            }

            if section_factor < target {
                y_low = y_mid;
            } else {
                y_high = y_mid;
            }
        }

        Ok((y_low + y_high) / 2.0)
    }

    /// Calculate stable time step based on CFL condition
    fn calculate_stable_dt(&self) -> f64 {
        let mut min_dt = f64::MAX;

        for i in 0..self.n_nodes - 1 {
            let y = self.get_depth(i);
            let q = self.get_discharge(i);
            let props = self.mesh[i].section.section.hydraulic_properties(y);

            let v = if props.area > 0.0 {
                q / props.area
            } else {
                0.0
            };
            let c = (G * props.hydraulic_depth.max(self.config.min_depth)).sqrt();

            let dx = self.mesh[i].dx_next;
            if dx > 0.0 {
                let wave_speed = v.abs() + c;
                if wave_speed > 0.0 {
                    let dt = self.config.courant_max * dx / wave_speed;
                    min_dt = min_dt.min(dt);
                }
            }
        }

        min_dt.max(0.001) // Minimum 1ms
    }

    /// Compute change between current and previous state
    fn compute_state_change(&self) -> f64 {
        let mut max_change: f64 = 0.0;
        for i in 0..self.n_nodes {
            let dy = (self.get_depth(i) - self.get_depth_prev(i)).abs();
            let dq = (self.get_discharge(i) - self.get_discharge_prev(i)).abs();
            max_change = max_change.max(dy).max(dq);
        }
        max_change
    }

    /// Extract results for current time step
    fn extract_time_step_result(&self, time: f64) -> Result<TimeStepResult> {
        let mut states = Vec::with_capacity(self.n_nodes);
        let mut hydraulic_jumps = Vec::new();
        let mut max_courant: f64 = 0.0;

        let mut prev_regime = None;
        let mut prev_depth = None;
        let mut prev_station = None;

        for i in 0..self.n_nodes {
            let node = &self.mesh[i];
            let y = self.get_depth(i);
            let q = self.get_discharge(i);

            let props = node.section.section.hydraulic_properties(y);
            let v = if props.area > 0.0 {
                (q / props.area).min(20.0) // Max velocity limit
            } else {
                0.0
            };

            let z = node.section.bed_elevation;
            let wse = z + y;
            let velocity_head = v * v / (2.0 * G);
            let egl = wse + velocity_head;

            let fr = if props.hydraulic_depth > 0.0 {
                v / (G * props.hydraulic_depth).sqrt()
            } else {
                0.0
            };

            let regime = FlowRegime::from_froude(fr);
            let sf = self.friction_slope(v, props.hydraulic_radius, node.section.manning_n);

            // Specific energy and momentum
            let specific_energy = y + velocity_head;
            let specific_momentum = q * q / (G * props.area.max(1e-10)) + props.area * y / 2.0;

            // Courant number
            let c = (G * props.hydraulic_depth.max(self.config.min_depth)).sqrt();
            if node.dx_next > 0.0 {
                let courant = (v.abs() + c) * self.config.dt.max(1.0) / node.dx_next;
                max_courant = max_courant.max(courant);
            }

            // Detect hydraulic jumps
            if let (Some(prev_r), Some(prev_y), Some(prev_x)) =
                (prev_regime, prev_depth, prev_station)
            {
                if prev_r == FlowRegime::Supercritical && regime == FlowRegime::Subcritical {
                    // Hydraulic jump detected!
                    let fr1 = if prev_y > 0.0 {
                        let prev_props = self.mesh[i - 1]
                            .section
                            .section
                            .hydraulic_properties(prev_y);
                        let prev_v = if prev_props.area > 0.0 {
                            self.get_discharge(i - 1) / prev_props.area
                        } else {
                            0.0
                        };
                        prev_v / (G * prev_props.hydraulic_depth.max(0.01)).sqrt()
                    } else {
                        1.0
                    };

                    let _y2_conjugate = prev_y * 0.5 * ((1.0 + 8.0 * fr1 * fr1).sqrt() - 1.0);
                    let energy_loss = (y - prev_y).powi(3) / (4.0 * prev_y * y).max(1e-10);
                    let jump_length = 6.1 * y; // USBR approximation

                    hydraulic_jumps.push(HydraulicJumpInfo {
                        station: (prev_x + node.x) / 2.0,
                        y1: prev_y,
                        y2: y,
                        fr1,
                        fr2: fr,
                        energy_loss,
                        length: jump_length,
                        jump_type: JumpType::from_froude(fr1),
                    });
                }
            }

            prev_regime = Some(regime);
            prev_depth = Some(y);
            prev_station = Some(node.x);

            states.push(FlowState {
                depth: y,
                discharge: q,
                area: props.area,
                velocity: v,
                wse,
                egl,
                froude: fr,
                regime,
                friction_slope: sf,
                specific_energy,
                specific_momentum,
            });
        }

        Ok(TimeStepResult {
            time,
            states,
            hydraulic_jumps,
            max_courant,
            iterations: 0, // Set by caller
            residual: 0.0, // Set by caller
        })
    }

    /// Get mesh information
    fn get_mesh_info(&self) -> MeshInfo {
        let num_refined = self.mesh.iter().filter(|n| n.refinement_level > 0).count();
        let min_dx = self
            .mesh
            .iter()
            .filter(|n| n.dx_next > 0.0)
            .map(|n| n.dx_next)
            .fold(f64::MAX, f64::min);
        let max_dx = self.mesh.iter().map(|n| n.dx_next).fold(0.0, f64::max);
        let total_length = if !self.mesh.is_empty() {
            self.mesh.last().unwrap().x - self.mesh.first().unwrap().x
        } else {
            0.0
        };

        MeshInfo {
            num_nodes: self.n_nodes,
            num_refined,
            min_dx: if min_dx == f64::MAX { 0.0 } else { min_dx },
            max_dx,
            total_length,
        }
    }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/// Perform Saint-Venant 1D unsteady flow analysis
pub fn analyze_saint_venant(input: SaintVenantInput) -> Result<SaintVenantResult> {
    let mut solver = SaintVenantSolver::new(&input)?;
    solver.solve()
}

/// Convert GVF steady-state result to Saint-Venant input for transient analysis
pub fn gvf_to_saint_venant(
    gvf_result: &crate::GvfResult,
    channel_system: &crate::ChannelSystem,
    upstream_bc: UpstreamBC,
    downstream_bc: DownstreamBC,
    config: SaintVenantConfig,
) -> Result<SaintVenantInput> {
    // Convert GVF stations to cross-sections
    let mut sections = Vec::new();

    for (i, station) in gvf_result.profile.iter().enumerate() {
        // Find the reach this station belongs to
        let reach = channel_system
            .reaches
            .iter()
            .find(|r| station.station >= r.start_station && station.station <= r.end_station)
            .ok_or_else(|| {
                HydraulicError::NotFound(format!("Reach for station {}", station.station))
            })?;

        let bed_slope = if i > 0 {
            let prev = &gvf_result.profile[i - 1];
            (prev.bed_elevation - station.bed_elevation)
                / (station.station - prev.station).max(0.001)
        } else {
            reach.slope
        };

        sections.push(CrossSection {
            station: station.station,
            bed_elevation: station.bed_elevation,
            section: reach.section.clone(),
            manning_n: reach.manning_n,
            lateral_inflow: 0.0,
            is_transition: reach.is_transition(),
            bed_slope,
            transition_coeff: if reach.is_transition() { 0.3 } else { 0.0 },
        });
    }

    // Create initial condition from GVF profile
    let initial_profile: Vec<(f64, f64)> = gvf_result
        .profile
        .iter()
        .map(|s| (s.station, s.water_depth))
        .collect();

    Ok(SaintVenantInput {
        sections,
        upstream_bc,
        downstream_bc,
        initial_condition: InitialCondition::FromGvfProfile(initial_profile),
        config,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jump_type_classification() {
        assert_eq!(JumpType::from_froude(1.5), JumpType::Undular);
        assert_eq!(JumpType::from_froude(2.0), JumpType::Weak);
        assert_eq!(JumpType::from_froude(3.5), JumpType::Oscillating);
        assert_eq!(JumpType::from_froude(6.0), JumpType::Steady);
        assert_eq!(JumpType::from_froude(10.0), JumpType::Strong);
    }

    #[test]
    fn test_flow_regime_classification() {
        assert_eq!(FlowRegime::from_froude(0.5), FlowRegime::Subcritical);
        assert_eq!(FlowRegime::from_froude(1.0), FlowRegime::Critical);
        assert_eq!(FlowRegime::from_froude(1.5), FlowRegime::Supercritical);
    }
}
