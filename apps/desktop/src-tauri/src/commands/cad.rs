//! CAD operations commands for CADHY
//!
//! Exposes OpenCASCADE primitives and operations to the frontend.
//! These commands allow creating and manipulating 3D shapes.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use cadhy_cad::{Analysis, Export, Operations, Primitives, Shape, ShapeAnalysis, StepIO};

// =============================================================================
// SHAPE REGISTRY
// =============================================================================

/// Thread-safe shape registry with string IDs
static SHAPE_REGISTRY: OnceLock<Mutex<HashMap<String, Shape>>> = OnceLock::new();

fn get_registry() -> &'static Mutex<HashMap<String, Shape>> {
    SHAPE_REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

fn generate_shape_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("System time is before UNIX epoch");
    format!("shape_{}", duration.as_nanos())
}

fn store_shape(shape: Shape) -> Result<String, String> {
    let id = generate_shape_id();
    let mut registry = get_registry()
        .lock()
        .map_err(|e| format!("Failed to acquire shape registry lock: {}", e))?;
    registry.insert(id.clone(), shape);
    Ok(id)
}

fn get_shape(id: &str) -> Result<Shape, String> {
    let registry = get_registry()
        .lock()
        .map_err(|e| format!("Failed to acquire shape registry lock: {}", e))?;
    registry
        .get(id)
        .cloned()
        .ok_or_else(|| format!("Shape '{}' not found", id))
}

fn remove_shape(id: &str) -> Result<(), String> {
    let mut registry = get_registry()
        .lock()
        .map_err(|e| format!("Failed to acquire shape registry lock: {}", e))?;
    registry
        .remove(id)
        .map(|_| ())
        .ok_or_else(|| format!("Shape '{}' not found", id))
}

// Public helper functions for use by other command modules
pub fn store_shape_with_id(id: String, shape: Shape) -> Result<(), String> {
    let mut registry = get_registry()
        .lock()
        .map_err(|e| format!("Failed to acquire shape registry lock: {}", e))?;
    registry.insert(id, shape);
    Ok(())
}

pub fn get_shape_from_registry(id: &str) -> Result<Shape, String> {
    get_shape(id)
}

// =============================================================================
// TYPES
// =============================================================================

/// Result of creating a shape
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShapeResult {
    /// Unique shape ID for referencing in subsequent operations
    pub id: String,
    /// Shape analysis information
    pub analysis: ShapeAnalysisResult,
}

/// Shape analysis data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShapeAnalysisResult {
    pub is_valid: bool,
    pub num_vertices: i32,
    pub num_edges: i32,
    pub num_faces: i32,
    pub num_solids: i32,
    pub surface_area: f64,
    pub volume: f64,
    pub bounding_box: Option<BoundingBoxResult>,
}

impl From<ShapeAnalysis> for ShapeAnalysisResult {
    fn from(analysis: ShapeAnalysis) -> Self {
        Self {
            is_valid: analysis.is_valid,
            num_vertices: analysis.num_vertices,
            num_edges: analysis.num_edges,
            num_faces: analysis.num_faces,
            num_solids: analysis.num_solids,
            surface_area: 0.0,  // Not available in current ShapeAnalysis
            volume: 0.0,        // Not available in current ShapeAnalysis
            bounding_box: None, // Not available in current ShapeAnalysis
        }
    }
}

/// Bounding box result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBoxResult {
    pub min: [f64; 3],
    pub max: [f64; 3],
}

/// Mesh result from tessellation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CadMeshResult {
    /// Vertices as flat array [x1, y1, z1, x2, y2, z2, ...]
    pub vertices: Vec<f64>,
    /// Triangle indices as flat array [i1, i2, i3, ...]
    pub indices: Vec<u32>,
    /// Normals as flat array (if available)
    pub normals: Option<Vec<f64>>,
    /// Number of vertices
    pub vertex_count: usize,
    /// Number of triangles
    pub triangle_count: usize,
}

// =============================================================================
// PRIMITIVE COMMANDS
// =============================================================================

/// Create a box shape
#[tauri::command]
pub fn cad_create_box(width: f64, depth: f64, height: f64) -> Result<ShapeResult, String> {
    let shape = Primitives::make_box(width, depth, height).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a box at a specific position
#[tauri::command]
pub fn cad_create_box_at(
    x: f64,
    y: f64,
    z: f64,
    width: f64,
    depth: f64,
    height: f64,
) -> Result<ShapeResult, String> {
    let shape =
        Primitives::make_box_at(x, y, z, width, depth, height).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a cylinder shape
#[tauri::command]
pub fn cad_create_cylinder(radius: f64, height: f64) -> Result<ShapeResult, String> {
    let shape = Primitives::make_cylinder(radius, height).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a cylinder at a specific position with custom axis
#[tauri::command]
pub fn cad_create_cylinder_at(
    x: f64,
    y: f64,
    z: f64,
    axis_x: f64,
    axis_y: f64,
    axis_z: f64,
    radius: f64,
    height: f64,
) -> Result<ShapeResult, String> {
    let shape = Primitives::make_cylinder_at(x, y, z, axis_x, axis_y, axis_z, radius, height)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a sphere shape
#[tauri::command]
pub fn cad_create_sphere(radius: f64) -> Result<ShapeResult, String> {
    let shape = Primitives::make_sphere(radius).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a sphere at a specific position
#[tauri::command]
pub fn cad_create_sphere_at(x: f64, y: f64, z: f64, radius: f64) -> Result<ShapeResult, String> {
    let shape = Primitives::make_sphere_at(x, y, z, radius).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a cone or truncated cone
#[tauri::command]
pub fn cad_create_cone(
    base_radius: f64,
    top_radius: f64,
    height: f64,
) -> Result<ShapeResult, String> {
    let shape =
        Primitives::make_cone(base_radius, top_radius, height).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a torus (donut shape)
#[tauri::command]
pub fn cad_create_torus(major_radius: f64, minor_radius: f64) -> Result<ShapeResult, String> {
    let shape = Primitives::make_torus(major_radius, minor_radius).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a wedge (tapered box)
#[tauri::command]
pub fn cad_create_wedge(dx: f64, dy: f64, dz: f64, ltx: f64) -> Result<ShapeResult, String> {
    let shape = Primitives::make_wedge(dx, dy, dz, ltx).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a helix (spiral wire)
#[tauri::command]
pub fn cad_create_helix(
    radius: f64,
    pitch: f64,
    height: f64,
    clockwise: bool,
) -> Result<ShapeResult, String> {
    let shape =
        Primitives::make_helix(radius, pitch, height, clockwise).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// BOOLEAN OPERATIONS
// =============================================================================

/// Boolean union (fuse) of two shapes
#[tauri::command]
pub fn cad_boolean_fuse(shape1_id: String, shape2_id: String) -> Result<ShapeResult, String> {
    let shape1 = get_shape(&shape1_id)?;
    let shape2 = get_shape(&shape2_id)?;

    let result = Operations::fuse(&shape1, &shape2).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Boolean difference (cut) - subtract shape2 from shape1
#[tauri::command]
pub fn cad_boolean_cut(shape1_id: String, shape2_id: String) -> Result<ShapeResult, String> {
    let shape1 = get_shape(&shape1_id)?;
    let shape2 = get_shape(&shape2_id)?;

    let result = Operations::cut(&shape1, &shape2).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Boolean intersection (common) of two shapes
#[tauri::command]
pub fn cad_boolean_common(shape1_id: String, shape2_id: String) -> Result<ShapeResult, String> {
    let shape1 = get_shape(&shape1_id)?;
    let shape2 = get_shape(&shape2_id)?;

    let result = Operations::common(&shape1, &shape2).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// MODIFICATION OPERATIONS
// =============================================================================

/// Apply fillet to all edges of a shape
#[tauri::command]
pub fn cad_fillet(shape_id: String, radius: f64) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result = Operations::fillet(&shape, radius).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Apply chamfer to all edges of a shape
#[tauri::command]
pub fn cad_chamfer(shape_id: String, distance: f64) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result = Operations::chamfer(&shape, distance).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Apply fillet to specific edges (RECOMMENDED - more reliable than filleting all edges)
#[tauri::command]
pub fn cad_fillet_edges(
    shape_id: String,
    edge_indices: Vec<i32>,
    radii: Vec<f64>,
) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result =
        Operations::fillet_edges(&shape, &edge_indices, &radii).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Apply chamfer to specific edges
#[tauri::command]
pub fn cad_chamfer_edges(
    shape_id: String,
    edge_indices: Vec<i32>,
    distances: Vec<f64>,
) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result =
        Operations::chamfer_edges(&shape, &edge_indices, &distances).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a shell (hollow solid) from a shape
#[tauri::command]
pub fn cad_shell(shape_id: String, thickness: f64) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result = Operations::shell(&shape, thickness).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// TRANSFORM OPERATIONS
// =============================================================================

/// Translate a shape by a vector
#[tauri::command]
pub fn cad_translate(shape_id: String, dx: f64, dy: f64, dz: f64) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result = Operations::translate(&shape, dx, dy, dz).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Rotate a shape around an axis
#[tauri::command]
pub fn cad_rotate(
    shape_id: String,
    origin_x: f64,
    origin_y: f64,
    origin_z: f64,
    axis_x: f64,
    axis_y: f64,
    axis_z: f64,
    angle_radians: f64,
) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result = Operations::rotate(
        &shape,
        origin_x,
        origin_y,
        origin_z,
        axis_x,
        axis_y,
        axis_z,
        angle_radians,
    )
    .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Scale a shape uniformly from a center point
#[tauri::command]
pub fn cad_scale(
    shape_id: String,
    center_x: f64,
    center_y: f64,
    center_z: f64,
    factor: f64,
) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result = Operations::scale(&shape, center_x, center_y, center_z, factor)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Mirror a shape across a plane
#[tauri::command]
pub fn cad_mirror(
    shape_id: String,
    origin_x: f64,
    origin_y: f64,
    origin_z: f64,
    normal_x: f64,
    normal_y: f64,
    normal_z: f64,
) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result = Operations::mirror(
        &shape, origin_x, origin_y, origin_z, normal_x, normal_y, normal_z,
    )
    .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// ADVANCED OPERATIONS
// =============================================================================

/// Extrude a profile shape along a direction
#[tauri::command]
pub fn cad_extrude(shape_id: String, dx: f64, dy: f64, dz: f64) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result = Operations::extrude(&shape, dx, dy, dz).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Revolve a profile shape around an axis
#[tauri::command]
pub fn cad_revolve(
    shape_id: String,
    origin_x: f64,
    origin_y: f64,
    origin_z: f64,
    axis_x: f64,
    axis_y: f64,
    axis_z: f64,
    angle_radians: f64,
) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result = Operations::revolve(
        &shape,
        origin_x,
        origin_y,
        origin_z,
        axis_x,
        axis_y,
        axis_z,
        angle_radians,
    )
    .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a lofted solid/shell through multiple wire profiles
#[tauri::command]
pub fn cad_loft(profile_ids: Vec<String>, solid: bool, ruled: bool) -> Result<ShapeResult, String> {
    // Get all profile shapes from registry
    let profiles: Result<Vec<Shape>, String> = profile_ids.iter().map(|id| get_shape(id)).collect();

    let profiles = profiles?;
    let profile_refs: Vec<&Shape> = profiles.iter().collect();

    let result = Operations::loft(&profile_refs, solid, ruled).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Sweep a profile along a spine path (pipe operation)
#[tauri::command]
pub fn cad_pipe(profile_id: String, spine_id: String) -> Result<ShapeResult, String> {
    let profile = get_shape(&profile_id)?;
    let spine = get_shape(&spine_id)?;

    let result = Operations::pipe(&profile, &spine).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Sweep a profile along a spine with more control (advanced pipe)
#[tauri::command]
pub fn cad_pipe_shell(
    profile_id: String,
    spine_id: String,
    with_contact: bool,
    with_correction: bool,
) -> Result<ShapeResult, String> {
    let profile = get_shape(&profile_id)?;
    let spine = get_shape(&spine_id)?;

    let result = Operations::pipe_shell(&profile, &spine, with_contact, with_correction)
        .map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Offset a solid shape
#[tauri::command]
pub fn cad_offset(shape_id: String, offset: f64) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;

    let result = Operations::offset(&shape, offset).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// TESSELLATION / MESH
// =============================================================================

/// Tessellate a shape to get mesh data for rendering
#[tauri::command]
pub fn cad_tessellate(shape_id: String, deflection: f64) -> Result<CadMeshResult, String> {
    println!("[cad_tessellate] Received shape_id: {}", shape_id);
    let shape = get_shape(&shape_id)?;

    let mesh = shape.tessellate(deflection).map_err(|e| e.to_string())?;

    // Convert MeshData to CadMeshResult
    let vertices: Vec<f64> = mesh
        .vertices
        .iter()
        .flat_map(|v| vec![v.x, v.y, v.z])
        .collect();

    let normals: Option<Vec<f64>> = if !mesh.normals.is_empty() {
        Some(
            mesh.normals
                .iter()
                .flat_map(|n| vec![n.x, n.y, n.z])
                .collect(),
        )
    } else {
        None
    };

    let vertex_count = mesh.vertices.len();
    let triangle_count = mesh.indices.len() / 3;

    Ok(CadMeshResult {
        vertices,
        indices: mesh.indices,
        normals,
        vertex_count,
        triangle_count,
    })
}

// =============================================================================
// IMPORT / EXPORT
// =============================================================================

/// Import a STEP file
#[tauri::command]
pub async fn cad_import_step(file_path: String) -> Result<ShapeResult, String> {
    let shape = StepIO::read(&file_path).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Export a shape to STEP file
#[tauri::command]
pub async fn cad_export_step(shape_id: String, file_path: String) -> Result<String, String> {
    let shape = get_shape(&shape_id)?;

    StepIO::write(&shape, &file_path).map_err(|e| e.to_string())?;
    Ok(file_path)
}

/// Export a shape to STL file (binary)
#[tauri::command]
pub async fn cad_export_stl(
    shape_id: String,
    file_path: String,
    deflection: f64,
) -> Result<String, String> {
    let shape = get_shape(&shape_id)?;

    Export::write_stl_binary(&shape, &file_path, deflection).map_err(|e| e.to_string())?;
    Ok(file_path)
}

/// Export a shape to OBJ file
#[tauri::command]
pub async fn cad_export_obj(
    shape_id: String,
    file_path: String,
    deflection: f64,
) -> Result<String, String> {
    let shape = get_shape(&shape_id)?;

    Export::write_obj(&shape, &file_path, deflection).map_err(|e| e.to_string())?;
    Ok(file_path)
}

/// Export a shape to glTF binary file
#[tauri::command]
pub async fn cad_export_glb(
    shape_id: String,
    file_path: String,
    deflection: f64,
) -> Result<String, String> {
    let shape = get_shape(&shape_id)?;

    Export::write_glb(&shape, &file_path, deflection).map_err(|e| e.to_string())?;
    Ok(file_path)
}

// =============================================================================
// UTILITY COMMANDS
// =============================================================================

/// Analyze a shape
#[tauri::command]
pub fn cad_analyze(shape_id: String) -> Result<ShapeAnalysisResult, String> {
    let shape = get_shape(&shape_id)?;
    let analysis = Analysis::analyze(&shape);
    Ok(analysis.into())
}

/// Measure distance between two shapes
#[tauri::command]
pub fn cad_measure_distance(shape1_id: String, shape2_id: String) -> Result<f64, String> {
    let shape1 = get_shape(&shape1_id)?;
    let shape2 = get_shape(&shape2_id)?;

    Ok(Operations::measure_distance(&shape1, &shape2))
}

/// Delete a shape from the registry
#[tauri::command]
pub fn cad_delete_shape(shape_id: String) -> Result<(), String> {
    remove_shape(&shape_id)
}

/// Clear all shapes from the registry
#[tauri::command]
pub fn cad_clear_all() -> Result<usize, String> {
    let mut registry = get_registry()
        .lock()
        .map_err(|e| format!("Failed to acquire shape registry lock: {}", e))?;
    let count = registry.len();
    registry.clear();
    Ok(count)
}

/// Get count of shapes in registry
#[tauri::command]
pub fn cad_shape_count() -> Result<usize, String> {
    let registry = get_registry()
        .lock()
        .map_err(|e| format!("Failed to acquire shape registry lock: {}", e))?;
    Ok(registry.len())
}

// =============================================================================
// NEW PRIMITIVES (FROM CHILLI3D)
// =============================================================================

/// Create a pyramid (square base tapering to a point)
#[tauri::command]
pub fn cad_create_pyramid(
    x: f64,
    y: f64,
    z: f64,
    px: f64,
    py: f64,
    pz: f64,
    dx: f64,
    dy: f64,
    dz: f64,
) -> Result<ShapeResult, String> {
    let shape =
        Primitives::make_pyramid(x, y, z, px, py, pz, dx, dy, dz).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create an ellipsoid (3D ellipse with different radii)
#[tauri::command]
pub fn cad_create_ellipsoid(
    cx: f64,
    cy: f64,
    cz: f64,
    rx: f64,
    ry: f64,
    rz: f64,
) -> Result<ShapeResult, String> {
    let shape = Primitives::make_ellipsoid(cx, cy, cz, rx, ry, rz).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Create a vertex (point)
#[tauri::command]
pub fn cad_create_vertex(x: f64, y: f64, z: f64) -> Result<ShapeResult, String> {
    let shape = Primitives::make_vertex(x, y, z).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&shape);
    let id = store_shape(shape)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

// =============================================================================
// NEW OPERATIONS (FROM CHILLI3D)
// =============================================================================

/// Simplify a shape by unifying faces and edges
/// CRITICAL: Use this after boolean operations to clean up geometry!
#[tauri::command]
pub fn cad_simplify(
    shape_id: String,
    unify_edges: bool,
    unify_faces: bool,
) -> Result<ShapeResult, String> {
    let shape = get_shape(&shape_id)?;
    let result =
        Operations::simplify(&shape, unify_edges, unify_faces).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}

/// Combine multiple shapes into a compound (assembly)
#[tauri::command]
pub fn cad_combine(shape_ids: Vec<String>) -> Result<ShapeResult, String> {
    let shapes: Result<Vec<Shape>, String> = shape_ids.iter().map(|id| get_shape(id)).collect();
    let shapes = shapes?;
    let shape_refs: Vec<&Shape> = shapes.iter().collect();

    let result = Operations::combine(&shape_refs).map_err(|e| e.to_string())?;
    let analysis = Analysis::analyze(&result);
    let id = store_shape(result)?;

    Ok(ShapeResult {
        id,
        analysis: analysis.into(),
    })
}
