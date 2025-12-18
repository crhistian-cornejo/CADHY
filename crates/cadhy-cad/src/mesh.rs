//! Mesh data structures
//!
//! Types for tessellated geometry output.

use crate::ffi::ffi::MeshResult;

/// 3D vertex with position
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Vertex3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vertex3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    /// Convert to f32 array for graphics APIs
    pub fn as_f32_array(&self) -> [f32; 3] {
        [self.x as f32, self.y as f32, self.z as f32]
    }
}

/// Surface type enumeration for face classification
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SurfaceType {
    Plane,
    Cylinder,
    Cone,
    Sphere,
    Torus,
    BezierSurface,
    BSplineSurface,
    Other,
}

impl From<i32> for SurfaceType {
    fn from(value: i32) -> Self {
        match value {
            0 => SurfaceType::Plane,
            1 => SurfaceType::Cylinder,
            2 => SurfaceType::Cone,
            3 => SurfaceType::Sphere,
            4 => SurfaceType::Torus,
            5 => SurfaceType::BezierSurface,
            6 => SurfaceType::BSplineSurface,
            _ => SurfaceType::Other,
        }
    }
}

/// Information about a face in the shape topology
#[derive(Debug, Clone)]
pub struct FaceInfo {
    /// Face index (0-based)
    pub index: u32,
    /// Type of surface
    pub surface_type: SurfaceType,
    /// Normal direction at face center
    pub normal: Vertex3,
    /// Is the face orientation reversed
    pub is_reversed: bool,
    /// Surface area of the face
    pub area: f64,
    /// Number of edges bounding this face
    pub num_edges: i32,
    /// Semantic label: "top", "bottom", "side", "front", "back", "left", "right", "curved_side", "spherical", "toroidal", "freeform"
    pub label: String,
}

/// Triangle mesh data from tessellation
#[derive(Debug, Clone)]
pub struct MeshData {
    /// Vertex positions
    pub vertices: Vec<Vertex3>,
    /// Vertex normals
    pub normals: Vec<Vertex3>,
    /// Triangle indices (3 per triangle)
    pub indices: Vec<u32>,
    /// Face index for each triangle (which face generated this triangle)
    pub face_ids: Option<Vec<u32>>,
    /// Information about each face in the mesh
    pub faces: Option<Vec<FaceInfo>>,
}

impl MeshData {
    /// Create empty mesh
    pub fn empty() -> Self {
        Self {
            vertices: Vec::new(),
            normals: Vec::new(),
            indices: Vec::new(),
            face_ids: None,
            faces: None,
        }
    }

    /// Convert from FFI result
    pub(crate) fn from_ffi_result(result: MeshResult) -> Self {
        let vertices: Vec<Vertex3> = result
            .vertices
            .iter()
            .map(|v| Vertex3::new(v.x, v.y, v.z))
            .collect();

        let normals: Vec<Vertex3> = result
            .normals
            .iter()
            .map(|n| Vertex3::new(n.x, n.y, n.z))
            .collect();

        let indices: Vec<u32> = result
            .triangles
            .iter()
            .flat_map(|t| [t.v1, t.v2, t.v3])
            .collect();

        // Convert face topology data if present
        let (face_ids, faces) = if !result.face_ids.is_empty() && !result.faces.is_empty() {
            let face_ids = result.face_ids.clone();
            let faces: Vec<FaceInfo> = result
                .faces
                .iter()
                .map(|f| FaceInfo {
                    index: f.index,
                    surface_type: SurfaceType::from(f.surface_type),
                    normal: Vertex3::new(f.normal_x, f.normal_y, f.normal_z),
                    is_reversed: f.is_reversed,
                    area: f.area,
                    num_edges: f.num_edges,
                    label: f.label.clone(),
                })
                .collect();
            (Some(face_ids), Some(faces))
        } else {
            (None, None)
        };

        Self {
            vertices,
            normals,
            indices,
            face_ids,
            faces,
        }
    }

    /// Number of triangles in the mesh
    pub fn triangle_count(&self) -> usize {
        self.indices.len() / 3
    }

    /// Number of vertices
    pub fn vertex_count(&self) -> usize {
        self.vertices.len()
    }

    /// Check if mesh is empty
    pub fn is_empty(&self) -> bool {
        self.vertices.is_empty()
    }

    /// Check if this mesh has face topology information
    pub fn has_topology(&self) -> bool {
        self.face_ids.is_some() && self.faces.is_some()
    }

    /// Get the face index for a specific triangle
    pub fn get_triangle_face(&self, triangle_index: usize) -> Option<u32> {
        self.face_ids.as_ref()?.get(triangle_index).copied()
    }

    /// Get face info by index
    pub fn get_face_info(&self, face_index: u32) -> Option<&FaceInfo> {
        self.faces.as_ref()?.iter().find(|f| f.index == face_index)
    }

    /// Get all triangles for a specific face
    pub fn get_face_triangles(&self, face_index: u32) -> Vec<usize> {
        let Some(face_ids) = &self.face_ids else {
            return Vec::new();
        };
        face_ids
            .iter()
            .enumerate()
            .filter(|&(_, &fid)| fid == face_index)
            .map(|(i, _)| i)
            .collect()
    }

    /// Get all unique face labels in this mesh
    pub fn get_face_labels(&self) -> Vec<String> {
        let Some(faces) = &self.faces else {
            return Vec::new();
        };
        let mut labels: Vec<String> = faces.iter().map(|f| f.label.clone()).collect();
        labels.sort();
        labels.dedup();
        labels
    }

    /// Get vertices as flat f32 array for GPU upload
    pub fn vertices_as_f32(&self) -> Vec<f32> {
        self.vertices
            .iter()
            .flat_map(|v| [v.x as f32, v.y as f32, v.z as f32])
            .collect()
    }

    /// Get normals as flat f32 array
    pub fn normals_as_f32(&self) -> Vec<f32> {
        self.normals
            .iter()
            .flat_map(|n| [n.x as f32, n.y as f32, n.z as f32])
            .collect()
    }
}
