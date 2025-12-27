//! Technical drawing commands for CADHY
//!
//! Exposes 2D projection and technical drawing functionality to the frontend.
//! These commands allow creating technical drawings from 3D shapes.

use cadhy_cad::projection::{
    generate_standard_views, project_shape, ProjectionResult, ProjectionType,
};
use cadhy_cad::Shape;
use serde::{Deserialize, Serialize};

use crate::commands::cad::{get_shape_from_registry, list_registry_shapes};

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

/// Prepare a shape for projection.
///
/// Note: Simplification via ShapeUpgrade_UnifySameDomain is now applied automatically
/// during boolean operations (fuse, cut, common) in bridge.cpp. This ensures:
/// - Coplanar faces are merged at the point of creation
/// - Internal seam edges are removed
/// - HLR projection receives clean topology
///
/// The previous approach of simplifying here caused issues because:
/// - UnifyEdges=true was converting L-shapes to boxes (too aggressive)
/// - Now we use UnifyEdges=false, UnifyFaces=true in the C++ boolean ops
fn prepare_shape_for_projection(shape: &Shape) -> Shape {
    // Log shape info for debugging
    let analysis = cadhy_cad::Analysis::analyze(shape);
    println!(
        "[Drawing Backend] Shape for projection: faces={}, edges={}, solids={}",
        analysis.num_faces, analysis.num_edges, analysis.num_solids
    );

    // Shape is already simplified by boolean operations, return as-is
    shape.clone()
}

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
    println!(
        "[Drawing Backend] Creating projection for shape_id={}, view_type={:?}, scale={}",
        shape_id, view_type, scale
    );

    // Get the shape from registry
    let shape = get_shape_from_registry(&shape_id)
        .map_err(|e| format!("Failed to get shape '{}': {}", shape_id, e))?;

    // Log shape info
    let analysis = cadhy_cad::Analysis::analyze(&shape);
    println!(
        "[Drawing Backend] Shape analysis: faces={}, edges={}, vertices={}, solids={}",
        analysis.num_faces, analysis.num_edges, analysis.num_vertices, analysis.num_solids
    );

    // Simplify shape to remove boolean operation artifacts before projection
    // This prevents extra lines from redundant edges in compound shapes
    let prepared_shape = prepare_shape_for_projection(&shape);

    // Generate projection
    let projection = project_shape(&prepared_shape, view_type, scale)
        .map_err(|e| format!("Failed to create projection: {}", e))?;

    println!(
        "[Drawing Backend] Projection generated: {} total lines ({} visible, {} hidden)",
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
    println!(
        "\n[Drawing Backend] ========== GENERATE STANDARD VIEWS ==========",
    );
    println!(
        "[Drawing Backend] Requested shape_id: '{}', scale: {}",
        shape_id, scale
    );

    // DEBUG: List all shapes in registry
    let all_shapes = list_registry_shapes();
    println!(
        "[Drawing Backend] Registry contains {} shapes:",
        all_shapes.len()
    );
    for (id, faces, edges, solids) in &all_shapes {
        let marker = if id == &shape_id { " <-- REQUESTED" } else { "" };
        println!(
            "[Drawing Backend]   - '{}': faces={}, edges={}, solids={}{}",
            id, faces, edges, solids, marker
        );
    }

    // Get the shape from registry
    let shape = get_shape_from_registry(&shape_id)
        .map_err(|e| format!("Failed to get shape '{}': {}", shape_id, e))?;

    // Log shape info to verify we have the correct shape
    let analysis = cadhy_cad::Analysis::analyze(&shape);
    println!(
        "[Drawing Backend] Retrieved shape: faces={}, edges={}, vertices={}, solids={}",
        analysis.num_faces, analysis.num_edges, analysis.num_vertices, analysis.num_solids
    );

    // A simple box has 6 faces, a union of two boxes should have more (typically 10-12)
    if analysis.num_faces == 6 {
        println!("[Drawing Backend] ⚠️ WARNING: Shape has only 6 faces - likely a simple box, NOT a compound!");
        println!("[Drawing Backend] Expected compound shapes from boolean operations to have more faces.");
    } else if analysis.num_faces > 6 {
        println!("[Drawing Backend] ✓ Shape appears to be a compound (more than 6 faces)");
    }

    // Simplify shape to remove boolean operation artifacts before projection
    // This prevents extra lines from redundant edges in compound shapes
    let prepared_shape = prepare_shape_for_projection(&shape);

    // Generate standard views
    let projections = generate_standard_views(&prepared_shape, scale)
        .map_err(|e| format!("Failed to generate standard views: {}", e))?;

    println!(
        "[Drawing Backend] Generated {} standard views:",
        projections.len()
    );
    for proj in &projections {
        println!(
            "[Drawing Backend]   - {}: {} lines (bbox: {:.2}x{:.2})",
            proj.label,
            proj.lines.len(),
            proj.bounding_box.width(),
            proj.bounding_box.height()
        );
    }
    println!("[Drawing Backend] ========== END STANDARD VIEWS ==========\n");

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
