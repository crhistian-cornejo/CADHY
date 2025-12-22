//! Curve and wire creation commands for CADHY
//!
//! Exposes OpenCASCADE curve creation to the frontend.
//! These commands allow creating 2D and 3D curves that can be used as profiles
//! for extrusion, revolution, lofting, and sweeping operations.

use serde::{Deserialize, Serialize};

use cadhy_cad::{Analysis, Curves, Shape};

use super::cad::ShapeResult;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

fn generate_shape_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("System time is before UNIX epoch");
    format!("shape_{}", duration.as_nanos())
}

fn store_shape_in_registry(shape: Shape) -> Result<String, String> {
    let id = generate_shape_id();
    // Use the same registry as cad.rs
    super::cad::store_shape_with_id(id.clone(), shape)?;
    Ok(id)
}

// =============================================================================
// LINE COMMANDS
// =============================================================================

/// Create a line segment between two points
#[tauri::command]
pub fn cad_create_line(
    x1: f64,
    y1: f64,
    z1: f64,
    x2: f64,
    y2: f64,
    z2: f64,
) -> Result<ShapeResult, String> {
    let shape = Curves::make_line(x1, y1, z1, x2, y2, z2).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a line from start point, direction, and length
#[tauri::command]
pub fn cad_create_line_dir(
    x: f64,
    y: f64,
    z: f64,
    dx: f64,
    dy: f64,
    dz: f64,
    length: f64,
) -> Result<ShapeResult, String> {
    let shape = Curves::make_line_dir(x, y, z, dx, dy, dz, length).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// CIRCLE COMMANDS
// =============================================================================

/// Create a full circle
#[tauri::command]
pub fn cad_create_circle(
    cx: f64,
    cy: f64,
    cz: f64,
    nx: f64,
    ny: f64,
    nz: f64,
    radius: f64,
) -> Result<ShapeResult, String> {
    let shape = Curves::make_circle(cx, cy, cz, nx, ny, nz, radius).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a circle in the XY plane (Z = 0)
#[tauri::command]
pub fn cad_create_circle_xy(cx: f64, cy: f64, radius: f64) -> Result<ShapeResult, String> {
    let shape = Curves::make_circle_xy(cx, cy, radius).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// ARC COMMANDS
// =============================================================================

/// Create a circular arc from center, radius, and angles
#[tauri::command]
pub fn cad_create_arc(
    cx: f64,
    cy: f64,
    cz: f64,
    nx: f64,
    ny: f64,
    nz: f64,
    radius: f64,
    start_angle: f64,
    end_angle: f64,
) -> Result<ShapeResult, String> {
    let shape = Curves::make_arc(cx, cy, cz, nx, ny, nz, radius, start_angle, end_angle)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create an arc in the XY plane (Z = 0)
#[tauri::command]
pub fn cad_create_arc_xy(
    cx: f64,
    cy: f64,
    radius: f64,
    start_angle: f64,
    end_angle: f64,
) -> Result<ShapeResult, String> {
    let shape =
        Curves::make_arc_xy(cx, cy, radius, start_angle, end_angle).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create an arc passing through 3 points
#[tauri::command]
pub fn cad_create_arc_3_points(
    x1: f64,
    y1: f64,
    z1: f64,
    x2: f64,
    y2: f64,
    z2: f64,
    x3: f64,
    y3: f64,
    z3: f64,
) -> Result<ShapeResult, String> {
    let shape =
        Curves::make_arc_3_points(x1, y1, z1, x2, y2, z2, x3, y3, z3).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// RECTANGLE COMMANDS
// =============================================================================

/// Create a rectangle wire in the XY plane
#[tauri::command]
pub fn cad_create_rectangle(
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<ShapeResult, String> {
    let shape = Curves::make_rectangle(x, y, width, height).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a centered rectangle in the XY plane
#[tauri::command]
pub fn cad_create_rectangle_centered(
    cx: f64,
    cy: f64,
    width: f64,
    height: f64,
) -> Result<ShapeResult, String> {
    let shape =
        Curves::make_rectangle_centered(cx, cy, width, height).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// POLYGON COMMANDS
// =============================================================================

/// Point for 2D polygon
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point2D {
    pub x: f64,
    pub y: f64,
}

/// Point for 3D polygon
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

/// Create a closed polygon wire from 2D points (XY plane, Z=0)
#[tauri::command]
pub fn cad_create_polygon_2d(points: Vec<Point2D>) -> Result<ShapeResult, String> {
    let pts: Vec<(f64, f64)> = points.iter().map(|p| (p.x, p.y)).collect();
    let shape = Curves::make_polygon_2d(&pts).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a closed polygon wire from 3D points
#[tauri::command]
pub fn cad_create_polygon_3d(points: Vec<Point3D>) -> Result<ShapeResult, String> {
    let pts: Vec<(f64, f64, f64)> = points.iter().map(|p| (p.x, p.y, p.z)).collect();
    let shape = Curves::make_polygon_3d(&pts).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a regular polygon (equilateral, centered)
#[tauri::command]
pub fn cad_create_regular_polygon(
    cx: f64,
    cy: f64,
    radius: f64,
    sides: u32,
) -> Result<ShapeResult, String> {
    let shape = Curves::make_regular_polygon(cx, cy, radius, sides).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// POLYLINE COMMANDS (OPEN)
// =============================================================================

/// Create an open polyline from 2D points (not closed)
#[tauri::command]
pub fn cad_create_polyline_2d(points: Vec<Point2D>) -> Result<ShapeResult, String> {
    let pts: Vec<(f64, f64)> = points.iter().map(|p| (p.x, p.y)).collect();
    let shape = Curves::make_polyline_2d(&pts).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create an open polyline from 3D points (not closed)
#[tauri::command]
pub fn cad_create_polyline_3d(points: Vec<Point3D>) -> Result<ShapeResult, String> {
    let pts: Vec<(f64, f64, f64)> = points.iter().map(|p| (p.x, p.y, p.z)).collect();
    let shape = Curves::make_polyline_3d(&pts).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// ELLIPSE COMMANDS
// =============================================================================

/// Create an ellipse in a plane defined by center and normal
#[tauri::command]
pub fn cad_create_ellipse(
    cx: f64,
    cy: f64,
    cz: f64,
    nx: f64,
    ny: f64,
    nz: f64,
    major_radius: f64,
    minor_radius: f64,
    rotation: f64,
) -> Result<ShapeResult, String> {
    let shape = Curves::make_ellipse(cx, cy, cz, nx, ny, nz, major_radius, minor_radius, rotation)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create an ellipse in the XY plane
#[tauri::command]
pub fn cad_create_ellipse_xy(
    cx: f64,
    cy: f64,
    major_radius: f64,
    minor_radius: f64,
    rotation: f64,
) -> Result<ShapeResult, String> {
    let shape = Curves::make_ellipse_xy(cx, cy, major_radius, minor_radius, rotation)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// SPLINE COMMANDS
// =============================================================================

/// Create a B-spline curve interpolating through points
#[tauri::command]
pub fn cad_create_bspline(points: Vec<Point3D>, closed: bool) -> Result<ShapeResult, String> {
    let pts: Vec<(f64, f64, f64)> = points.iter().map(|p| (p.x, p.y, p.z)).collect();
    let shape = Curves::make_bspline(&pts, closed).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a Bezier curve from control points
#[tauri::command]
pub fn cad_create_bezier(control_points: Vec<Point3D>) -> Result<ShapeResult, String> {
    let pts: Vec<(f64, f64, f64)> = control_points.iter().map(|p| (p.x, p.y, p.z)).collect();
    let shape = Curves::make_bezier(&pts).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// WIRE OPERATIONS
// =============================================================================

/// Create a wire from multiple edges
#[tauri::command]
pub fn cad_create_wire_from_edges(edge_ids: Vec<String>) -> Result<ShapeResult, String> {
    // Get all edge shapes from registry
    let edges: Result<Vec<Shape>, String> = edge_ids
        .iter()
        .map(|id| super::cad::get_shape_from_registry(id))
        .collect();

    let edges = edges?;
    let edge_refs: Vec<&Shape> = edges.iter().collect();

    let shape = Curves::make_wire_from_edges(&edge_refs).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a face from a closed wire
#[tauri::command]
pub fn cad_create_face_from_wire(wire_id: String) -> Result<ShapeResult, String> {
    let wire = super::cad::get_shape_from_registry(&wire_id)?;

    let shape = Curves::make_face_from_wire(&wire).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape_in_registry(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}
