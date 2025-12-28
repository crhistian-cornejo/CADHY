//! Technical drawing commands for CADHY
//!
//! Exposes 2D projection and technical drawing functionality to the frontend.
//! These commands allow creating technical drawings from 3D shapes.

use cadhy_cad::projection::{
    generate_standard_views, project_shape, ProjectionResult, ProjectionType,
};
use cadhy_cad::section::{
    compute_section_with_hatch, HatchConfig, HatchedRegion, SectionCurve, SectionPlane,
    SectionWithHatchResult,
};
use log::{debug, warn};
use serde::{Deserialize, Serialize};

use crate::commands::cmd_cad::get_shape_from_registry;

// =============================================================================
// TYPES
// =============================================================================

/// Result of creating a projection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectionResultResponse {
    /// The projection result with all 2D lines
    pub projection: ProjectionResult,
    /// ID of the source shape
    pub shape_id: String,
}

/// Result of generating standard views
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandardViewsResult {
    /// All generated projections
    pub projections: Vec<ProjectionResult>,
    /// ID of the source shape
    pub shape_id: String,
}

// =============================================================================
// COMMANDS
// =============================================================================

/// Create a 2D projection of a 3D shape
///
/// # Arguments
///
/// * `shape_id` - ID of the shape to project (must exist in registry)
/// * `view_type` - Type of projection view (Top, Front, Right, Isometric, etc.)
/// * `scale` - Scale factor for the projection
///
/// # Returns
///
/// A `ProjectionResultResponse` containing the 2D projection lines and metadata
#[tauri::command]
pub fn drawing_create_projection(
    shape_id: String,
    view_type: ProjectionType,
    scale: f64,
) -> Result<ProjectionResultResponse, String> {
    debug!(
        "Creating projection: shape_id={}, view_type={:?}, scale={}",
        shape_id, view_type, scale
    );

    // Get the shape from registry
    let shape = get_shape_from_registry(&shape_id)
        .map_err(|e| format!("Failed to get shape '{}': {}", shape_id, e))?;

    // Generate projection directly - shapes are already simplified during boolean operations
    let projection = project_shape(&shape, view_type, scale)
        .map_err(|e| format!("Failed to create projection: {}", e))?;

    debug!(
        "Projection generated: {} total lines ({} visible, {} hidden)",
        projection.lines.len(),
        projection.visible_lines().len(),
        projection.hidden_lines().len()
    );

    Ok(ProjectionResultResponse {
        projection,
        shape_id,
    })
}

/// Generate standard views (Top, Front, Right, Isometric) for a shape
///
/// # Arguments
///
/// * `shape_id` - ID of the shape to project
/// * `scale` - Scale factor for all projections
///
/// # Returns
///
/// A `StandardViewsResult` containing all four standard projections
#[tauri::command]
pub fn drawing_generate_standard_views(
    shape_id: String,
    scale: f64,
) -> Result<StandardViewsResult, String> {
    debug!(
        "Generating standard views: shape_id='{}', scale={}",
        shape_id, scale
    );

    // Get the shape from registry
    let shape = get_shape_from_registry(&shape_id)
        .map_err(|e| format!("Failed to get shape '{}': {}", shape_id, e))?;

    // Validate shape topology
    let analysis = cadhy_cad::Analysis::analyze(&shape);
    if analysis.num_faces == 0 {
        warn!(
            "Shape '{}' has no faces - projection may be empty",
            shape_id
        );
    }

    // Generate standard views - shapes are already simplified during boolean operations
    let projections = generate_standard_views(&shape, scale)
        .map_err(|e| format!("Failed to generate standard views: {}", e))?;

    debug!(
        "Generated {} standard views for shape '{}'",
        projections.len(),
        shape_id
    );

    Ok(StandardViewsResult {
        projections,
        shape_id,
    })
}

/// Generate a specific view by name
///
/// Convenience function that converts string view names to ProjectionType
#[tauri::command]
pub fn drawing_create_view_by_name(
    shape_id: String,
    view_name: String,
    scale: f64,
) -> Result<ProjectionResultResponse, String> {
    // Convert string to ProjectionType
    let view_type = match view_name.to_uppercase().as_str() {
        "TOP" | "PLANTA" => ProjectionType::Top,
        "BOTTOM" | "INFERIOR" => ProjectionType::Bottom,
        "FRONT" | "ALZADO" => ProjectionType::Front,
        "BACK" | "POSTERIOR" => ProjectionType::Back,
        "RIGHT" | "PERFIL DERECHO" | "DERECHO" => ProjectionType::Right,
        "LEFT" | "PERFIL IZQUIERDO" | "IZQUIERDO" => ProjectionType::Left,
        "ISOMETRIC" | "ISOMÉTRICA" | "ISOMETRICA" => ProjectionType::Isometric,
        _ => {
            return Err(format!(
                "Unknown view type: '{}'. Valid types: Top, Front, Right, Left, Bottom, Back, Isometric",
                view_name
            ));
        }
    };

    drawing_create_projection(shape_id, view_type, scale)
}

// =============================================================================
// SECTION VIEWS (CUTS/CORTES)
// =============================================================================

/// Input for creating a section view
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SectionViewInput {
    /// ID of the shape to section
    pub shape_id: String,
    /// Section plane type
    pub plane_type: SectionPlaneType,
    /// Position value (Z for horizontal, Y for longitudinal, X for transversal)
    pub position: f64,
    /// Label for the section (e.g., "A", "B", "1")
    pub label: String,
    /// Hatch angle in degrees (default: 45)
    #[serde(default = "default_hatch_angle")]
    pub hatch_angle: f64,
    /// Hatch spacing in mm (default: 2.0)
    #[serde(default = "default_hatch_spacing")]
    pub hatch_spacing: f64,
}

fn default_hatch_angle() -> f64 {
    45.0
}
fn default_hatch_spacing() -> f64 {
    2.0
}

/// Type of section plane
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SectionPlaneType {
    /// Horizontal section (floor plan) at Z height
    Horizontal,
    /// Longitudinal section (front cut) at Y position
    Longitudinal,
    /// Transversal section (side cut) at X position
    Transversal,
    /// Custom angled section
    #[serde(rename_all = "camelCase")]
    Custom {
        origin: [f64; 3],
        normal: [f64; 3],
        up: [f64; 3],
    },
}

/// Response for section view creation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SectionViewResponse {
    /// Section curves (boundaries)
    pub curves: Vec<SectionCurveResponse>,
    /// Hatched regions with hatch lines
    pub hatched_regions: Vec<HatchedRegionResponse>,
    /// Bounding box [[min_x, min_y], [max_x, max_y]]
    pub bounding_box: [[f64; 2]; 2],
    /// Section label (e.g., "A-A")
    pub label: String,
    /// Number of closed regions
    pub num_regions: usize,
    /// Total hatch lines generated
    pub total_hatch_lines: usize,
    /// Source shape ID
    pub shape_id: String,
}

/// A curve in the section response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SectionCurveResponse {
    pub points: Vec<[f64; 2]>,
    pub is_closed: bool,
    pub is_outer: bool,
}

/// A hatched region response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HatchedRegionResponse {
    pub boundary: Vec<[f64; 2]>,
    pub hatch_lines: Vec<HatchLineResponse>,
    pub area: f64,
    pub is_outer: bool,
}

/// A single hatch line
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HatchLineResponse {
    pub start: [f64; 2],
    pub end: [f64; 2],
}

/// Create a section view (cut) of a 3D shape
///
/// # Arguments
///
/// * `input` - Section view input parameters
///
/// # Returns
///
/// A `SectionViewResponse` with section curves and hatched regions
#[tauri::command(rename_all = "camelCase")]
pub fn drawing_create_section_view(input: SectionViewInput) -> Result<SectionViewResponse, String> {
    debug!(
        "Creating section view: shape_id={}, plane_type={:?}, position={}, label={}",
        input.shape_id, input.plane_type, input.position, input.label
    );

    // Get the shape from registry
    let shape = get_shape_from_registry(&input.shape_id)
        .map_err(|e| format!("Failed to get shape '{}': {}", input.shape_id, e))?;

    // Create section plane based on type
    let plane = match input.plane_type {
        SectionPlaneType::Horizontal => SectionPlane::horizontal(input.position, &input.label),
        SectionPlaneType::Longitudinal => SectionPlane::longitudinal(input.position, &input.label),
        SectionPlaneType::Transversal => SectionPlane::transversal(input.position, &input.label),
        SectionPlaneType::Custom { origin, normal, up } => {
            SectionPlane::new(origin, normal, up, &input.label)
        }
    };

    // Create hatch config
    let hatch_config = HatchConfig {
        angle_deg: input.hatch_angle,
        spacing: input.hatch_spacing,
    };

    // Compute section with hatching
    let result = compute_section_with_hatch(&shape, &plane, &hatch_config)
        .map_err(|e| format!("Failed to compute section: {}", e))?;

    debug!(
        "Section generated: {} curves, {} regions, {} hatch lines",
        result.curves.len(),
        result.num_regions,
        result.total_hatch_lines
    );

    // Convert to response format
    let curves: Vec<SectionCurveResponse> = result
        .curves
        .iter()
        .map(|c| SectionCurveResponse {
            points: c.points.clone(),
            is_closed: c.is_closed,
            is_outer: c.is_outer,
        })
        .collect();

    let hatched_regions: Vec<HatchedRegionResponse> = result
        .hatched_regions
        .iter()
        .map(|r| HatchedRegionResponse {
            boundary: r.boundary.clone(),
            hatch_lines: r
                .hatch_lines
                .iter()
                .map(|l| HatchLineResponse {
                    start: l.start,
                    end: l.end,
                })
                .collect(),
            area: r.area,
            is_outer: r.is_outer,
        })
        .collect();

    Ok(SectionViewResponse {
        curves,
        hatched_regions,
        bounding_box: result.bounding_box,
        label: plane.full_label(),
        num_regions: result.num_regions,
        total_hatch_lines: result.total_hatch_lines,
        shape_id: input.shape_id,
    })
}

/// Generate multiple horizontal sections at specified heights
#[tauri::command(rename_all = "camelCase")]
pub fn drawing_generate_horizontal_sections(
    shape_id: String,
    heights: Vec<f64>,
    hatch_angle: Option<f64>,
    hatch_spacing: Option<f64>,
) -> Result<Vec<SectionViewResponse>, String> {
    debug!(
        "Generating {} horizontal sections for shape '{}'",
        heights.len(),
        shape_id
    );

    let mut results = Vec::with_capacity(heights.len());

    for (i, height) in heights.iter().enumerate() {
        let label = format!("{}", (b'A' + i as u8) as char);
        let input = SectionViewInput {
            shape_id: shape_id.clone(),
            plane_type: SectionPlaneType::Horizontal,
            position: *height,
            label,
            hatch_angle: hatch_angle.unwrap_or(45.0),
            hatch_spacing: hatch_spacing.unwrap_or(2.0),
        };

        match drawing_create_section_view(input) {
            Ok(section) => results.push(section),
            Err(e) => {
                warn!("Failed to create section at height {}: {}", height, e);
                // Continue with other sections
            }
        }
    }

    if results.is_empty() && !heights.is_empty() {
        return Err("Failed to generate any sections".to_string());
    }

    Ok(results)
}
