//! CAD operations commands for CADHY
//!
//! Exposes OpenCASCADE primitives and operations to the frontend.
//! These commands allow creating and manipulating 3D shapes.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use cadhy_cad::{Analysis, Export, Operations, Primitives, Shape, ShapeAnalysis, StepIO, Topology};

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

/// Check if a shape exists in the registry
pub fn shape_exists_in_registry(id: &str) -> bool {
    if let Ok(registry) = get_registry().lock() {
        registry.contains_key(id)
    } else {
        false
    }
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
    pub vertices: Vec<f32>,
    /// Triangle indices as flat array [i1, i2, i3, ...]
    pub indices: Vec<u32>,
    /// Normals as flat array (if available)
    pub normals: Option<Vec<f32>>,
    /// Number of vertices
    pub vertex_count: usize,
    /// Number of triangles
    pub triangle_count: usize,
}

// =============================================================================
// TOPOLOGY TYPES (B-Rep)
// =============================================================================

/// A single point along a tessellated edge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgePoint {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub parameter: f64,
}

/// Tessellated edge for wireframe rendering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeTessellationResult {
    pub index: u32,
    pub curve_type: String,
    pub start_vertex: u32,
    pub end_vertex: u32,
    pub length: f64,
    pub is_degenerated: bool,
    pub points: Vec<EdgePoint>,
    pub adjacent_faces: Vec<u32>,
}

/// Information about a topological vertex
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VertexInfoResult {
    pub index: u32,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub tolerance: f64,
    pub num_edges: i32,
}

/// Information about a topological face
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaceInfoResult {
    pub index: u32,
    pub surface_type: String,
    pub area: f64,
    pub is_reversed: bool,
    pub num_edges: i32,
    pub boundary_edges: Vec<u32>,
    pub center: [f64; 3],
    pub normal: [f64; 3],
}

/// Complete topology result with adjacency information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopologyDataResult {
    pub vertices: Vec<VertexInfoResult>,
    pub edges: Vec<EdgeTessellationResult>,
    pub faces: Vec<FaceInfoResult>,
    pub vertex_to_edges: Vec<u32>,
    pub vertex_to_edges_offset: Vec<u32>,
    pub edge_to_faces: Vec<u32>,
    pub edge_to_faces_offset: Vec<u32>,
}

// =============================================================================
// UTILITY COMMANDS
// =============================================================================

/// Check if a shape exists in the registry
#[tauri::command(rename_all = "camelCase")]
pub fn cad_shape_exists(shape_id: String) -> bool {
    shape_exists_in_registry(&shape_id)
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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

/// Tessellate a shape to get mesh data for rendering (High Performance Binary version)
/// Returns raw bytes for faster transfer than JSON
#[tauri::command(rename_all = "camelCase")]
pub fn cad_tessellate_binary(shape_id: String, deflection: f64) -> Result<Vec<u8>, String> {
    let shape = get_shape(&shape_id)?;
    let mesh = shape.tessellate(deflection).map_err(|e| e.to_string())?;

    let vertex_count = mesh.vertices.len() as u32;
    let triangle_count = (mesh.indices.len() / 3) as u32;
    let has_normals = !mesh.normals.is_empty();

    // Calculate total size:
    // header: 4 (v_count) + 4 (t_count) + 1 (has_normals) = 9 bytes
    // vertices: vertex_count * 3 * 4 bytes
    // indices: triangle_count * 3 * 4 bytes
    // normals: (if has) vertex_count * 3 * 4 bytes
    let mut size = 9 + (vertex_count as usize * 3 * 4) + (triangle_count as usize * 3 * 4);
    if has_normals {
        size += vertex_count as usize * 3 * 4;
    }

    let mut buffer = Vec::with_capacity(size);

    // Write header
    buffer.extend_from_slice(&vertex_count.to_le_bytes());
    buffer.extend_from_slice(&triangle_count.to_le_bytes());
    buffer.push(if has_normals { 1 } else { 0 });

    // Write vertices (f32)
    for v in &mesh.vertices {
        buffer.extend_from_slice(&(v.x as f32).to_le_bytes());
        buffer.extend_from_slice(&(v.y as f32).to_le_bytes());
        buffer.extend_from_slice(&(v.z as f32).to_le_bytes());
    }

    // Write indices (u32)
    for &idx in &mesh.indices {
        buffer.extend_from_slice(&idx.to_le_bytes());
    }

    // Write normals (f32)
    if has_normals {
        for n in &mesh.normals {
            buffer.extend_from_slice(&(n.x as f32).to_le_bytes());
            buffer.extend_from_slice(&(n.y as f32).to_le_bytes());
            buffer.extend_from_slice(&(n.z as f32).to_le_bytes());
        }
    }

    Ok(buffer)
}

// =============================================================================
// IMPORT / EXPORT
// =============================================================================

/// Import a STEP file
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
pub async fn cad_export_step(shape_id: String, file_path: String) -> Result<String, String> {
    let shape = get_shape(&shape_id)?;

    StepIO::write(&shape, &file_path).map_err(|e| e.to_string())?;
    Ok(file_path)
}

/// Export a shape to STL file (binary)
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
pub fn cad_analyze(shape_id: String) -> Result<ShapeAnalysisResult, String> {
    let shape = get_shape(&shape_id)?;
    let analysis = Analysis::analyze(&shape);
    Ok(analysis.into())
}

/// Measure distance between two shapes
#[tauri::command(rename_all = "camelCase")]
pub fn cad_measure_distance(shape1_id: String, shape2_id: String) -> Result<f64, String> {
    let shape1 = get_shape(&shape1_id)?;
    let shape2 = get_shape(&shape2_id)?;

    Ok(Operations::measure_distance(&shape1, &shape2))
}

/// Delete a shape from the registry
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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

// =============================================================================
// TOPOLOGY COMMANDS (B-Rep)
// =============================================================================

/// Get complete topology information from a shape
/// Returns vertices, edges (tessellated), faces, and adjacency maps
#[tauri::command(rename_all = "camelCase")]
pub fn cad_get_topology(
    shape_id: String,
    edge_deflection: f64,
) -> Result<TopologyDataResult, String> {
    let shape = get_shape(&shape_id)?;
    let topology = Topology::get_full(&shape, edge_deflection);

    // Convert CurveType and SurfaceType to strings
    let curve_type_to_string = |ct: &cadhy_cad::topology::CurveType| -> String {
        match ct {
            cadhy_cad::topology::CurveType::Line => "Line".to_string(),
            cadhy_cad::topology::CurveType::Circle => "Circle".to_string(),
            cadhy_cad::topology::CurveType::Ellipse => "Ellipse".to_string(),
            cadhy_cad::topology::CurveType::Hyperbola => "Hyperbola".to_string(),
            cadhy_cad::topology::CurveType::Parabola => "Parabola".to_string(),
            cadhy_cad::topology::CurveType::BezierCurve => "BezierCurve".to_string(),
            cadhy_cad::topology::CurveType::BSplineCurve => "BSplineCurve".to_string(),
            cadhy_cad::topology::CurveType::OffsetCurve => "OffsetCurve".to_string(),
            cadhy_cad::topology::CurveType::Other => "Other".to_string(),
        }
    };

    let surface_type_to_string = |st: &cadhy_cad::topology::SurfaceType| -> String {
        match st {
            cadhy_cad::topology::SurfaceType::Plane => "Plane".to_string(),
            cadhy_cad::topology::SurfaceType::Cylinder => "Cylinder".to_string(),
            cadhy_cad::topology::SurfaceType::Cone => "Cone".to_string(),
            cadhy_cad::topology::SurfaceType::Sphere => "Sphere".to_string(),
            cadhy_cad::topology::SurfaceType::Torus => "Torus".to_string(),
            cadhy_cad::topology::SurfaceType::BezierSurface => "BezierSurface".to_string(),
            cadhy_cad::topology::SurfaceType::BSplineSurface => "BSplineSurface".to_string(),
            cadhy_cad::topology::SurfaceType::RevolutionSurface => "RevolutionSurface".to_string(),
            cadhy_cad::topology::SurfaceType::ExtrusionSurface => "ExtrusionSurface".to_string(),
            cadhy_cad::topology::SurfaceType::OffsetSurface => "OffsetSurface".to_string(),
            cadhy_cad::topology::SurfaceType::Other => "Other".to_string(),
        }
    };

    Ok(TopologyDataResult {
        vertices: topology
            .vertices
            .iter()
            .map(|v| VertexInfoResult {
                index: v.index,
                x: v.x,
                y: v.y,
                z: v.z,
                tolerance: v.tolerance,
                num_edges: v.num_edges,
            })
            .collect(),
        edges: topology
            .edges
            .iter()
            .map(|e| EdgeTessellationResult {
                index: e.index,
                curve_type: curve_type_to_string(&e.curve_type),
                start_vertex: e.start_vertex,
                end_vertex: e.end_vertex,
                length: e.length,
                is_degenerated: e.is_degenerated,
                points: e
                    .points
                    .iter()
                    .map(|p| EdgePoint {
                        x: p.x,
                        y: p.y,
                        z: p.z,
                        parameter: p.parameter,
                    })
                    .collect(),
                adjacent_faces: e.adjacent_faces.clone(),
            })
            .collect(),
        faces: topology
            .faces
            .iter()
            .map(|f| FaceInfoResult {
                index: f.index,
                surface_type: surface_type_to_string(&f.surface_type),
                area: f.area,
                is_reversed: f.is_reversed,
                num_edges: f.num_edges,
                boundary_edges: f.boundary_edges.clone(),
                center: [f.center.0, f.center.1, f.center.2],
                normal: [f.normal.0, f.normal.1, f.normal.2],
            })
            .collect(),
        vertex_to_edges: topology.vertex_to_edges.clone(),
        vertex_to_edges_offset: topology.vertex_to_edges_offset.clone(),
        edge_to_faces: topology.edge_to_faces.clone(),
        edge_to_faces_offset: topology.edge_to_faces_offset.clone(),
    })
}
