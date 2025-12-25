//! Technical drawing commands for CADHY
//!
//! Exposes 2D projection and technical drawing functionality to the frontend.
//! These commands allow creating technical drawings from 3D shapes.

use cadhy_cad::projection::{
    generate_standard_views, project_shape, ProjectionResult, ProjectionType,
};
use cadhy_cad::Shape;
use serde::{Deserialize, Serialize};

use crate::commands::cad::{get_shape_from_registry, ShapeResult};

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
    // Get the shape from registry
    let shape = get_shape_from_registry(&shape_id)
        .map_err(|e| format!("Failed to get shape '{}': {}", shape_id, e))?;

    // Generate projection
    let projection = project_shape(&shape, view_type, scale)
        .map_err(|e| format!("Failed to create projection: {}", e))?;

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
    // Get the shape from registry
    let shape = get_shape_from_registry(&shape_id)
        .map_err(|e| format!("Failed to get shape '{}': {}", shape_id, e))?;

    // Generate standard views
    let projections = generate_standard_views(&shape, scale)
        .map_err(|e| format!("Failed to generate standard views: {}", e))?;

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
