//! Core mesh data types for surface tessellation

use serde::{Deserialize, Serialize};

/// 3D vertex position
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Vertex {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vertex {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    pub fn zero() -> Self {
        Self::new(0.0, 0.0, 0.0)
    }

    pub fn as_array(&self) -> [f64; 3] {
        [self.x, self.y, self.z]
    }

    pub fn as_f32_array(&self) -> [f32; 3] {
        [self.x as f32, self.y as f32, self.z as f32]
    }

    pub fn distance_to(&self, other: &Vertex) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        let dz = self.z - other.z;
        (dx * dx + dy * dy + dz * dz).sqrt()
    }
}

impl From<[f64; 3]> for Vertex {
    fn from(arr: [f64; 3]) -> Self {
        Self::new(arr[0], arr[1], arr[2])
    }
}

impl From<[f32; 3]> for Vertex {
    fn from(arr: [f32; 3]) -> Self {
        Self::new(arr[0] as f64, arr[1] as f64, arr[2] as f64)
    }
}

/// Triangle (3 vertex indices)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Triangle {
    pub i0: u32,
    pub i1: u32,
    pub i2: u32,
}

impl Triangle {
    pub fn new(i0: u32, i1: u32, i2: u32) -> Self {
        Self { i0, i1, i2 }
    }

    pub fn as_array(&self) -> [u32; 3] {
        [self.i0, self.i1, self.i2]
    }

    pub fn indices(&self) -> [u32; 3] {
        [self.i0, self.i1, self.i2]
    }
}

impl From<[u32; 3]> for Triangle {
    fn from(arr: [u32; 3]) -> Self {
        Self::new(arr[0], arr[1], arr[2])
    }
}

/// Surface mesh (triangulated surface for visualization and export)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SurfaceMesh {
    /// Mesh vertices
    pub vertices: Vec<Vertex>,
    /// Triangles (indices into vertices)
    pub triangles: Vec<Triangle>,
    /// Normal vectors (per vertex) - optional
    pub normals: Option<Vec<[f32; 3]>>,
    /// Metadata
    pub metadata: MeshMetadata,
}

impl SurfaceMesh {
    /// Create an empty mesh
    pub fn empty() -> Self {
        Self {
            vertices: Vec::new(),
            triangles: Vec::new(),
            normals: None,
            metadata: MeshMetadata::default(),
        }
    }

    /// Create mesh from raw data
    pub fn from_raw(
        vertices: Vec<[f64; 3]>,
        triangles: Vec<[u32; 3]>,
        normals: Option<Vec<[f32; 3]>>,
    ) -> Self {
        Self {
            vertices: vertices.into_iter().map(Vertex::from).collect(),
            triangles: triangles.into_iter().map(Triangle::from).collect(),
            normals,
            metadata: MeshMetadata::default(),
        }
    }

    /// Number of vertices
    pub fn vertex_count(&self) -> usize {
        self.vertices.len()
    }

    /// Number of triangles
    pub fn triangle_count(&self) -> usize {
        self.triangles.len()
    }

    /// Check if mesh is empty
    pub fn is_empty(&self) -> bool {
        self.vertices.is_empty() || self.triangles.is_empty()
    }

    /// Get vertices as flat f32 array (for GPU upload)
    pub fn vertices_f32(&self) -> Vec<f32> {
        self.vertices
            .iter()
            .flat_map(|v| [v.x as f32, v.y as f32, v.z as f32])
            .collect()
    }

    /// Get triangles as flat u32 array (for GPU upload)
    pub fn indices_flat(&self) -> Vec<u32> {
        self.triangles
            .iter()
            .flat_map(|t| [t.i0, t.i1, t.i2])
            .collect()
    }

    /// Get or compute normals as flat f32 array
    pub fn normals_f32(&self) -> Vec<f32> {
        if let Some(ref normals) = self.normals {
            normals.iter().flat_map(|n| *n).collect()
        } else {
            // Compute flat normals if not present
            self.compute_flat_normals()
        }
    }

    /// Compute flat (per-face) normals
    fn compute_flat_normals(&self) -> Vec<f32> {
        let mut normals = vec![0.0f32; self.vertices.len() * 3];

        for tri in &self.triangles {
            let v0 = &self.vertices[tri.i0 as usize];
            let v1 = &self.vertices[tri.i1 as usize];
            let v2 = &self.vertices[tri.i2 as usize];

            // Compute edge vectors
            let e1 = [v1.x - v0.x, v1.y - v0.y, v1.z - v0.z];
            let e2 = [v2.x - v0.x, v2.y - v0.y, v2.z - v0.z];

            // Cross product
            let nx = e1[1] * e2[2] - e1[2] * e2[1];
            let ny = e1[2] * e2[0] - e1[0] * e2[2];
            let nz = e1[0] * e2[1] - e1[1] * e2[0];

            // Normalize
            let len = (nx * nx + ny * ny + nz * nz).sqrt();
            let (nx, ny, nz) = if len > 1e-10 {
                (nx / len, ny / len, nz / len)
            } else {
                (0.0, 0.0, 1.0)
            };

            // Accumulate to vertices
            for &idx in &[tri.i0, tri.i1, tri.i2] {
                let i = idx as usize * 3;
                normals[i] += nx as f32;
                normals[i + 1] += ny as f32;
                normals[i + 2] += nz as f32;
            }
        }

        // Normalize accumulated normals
        for chunk in normals.chunks_mut(3) {
            let len = (chunk[0] * chunk[0] + chunk[1] * chunk[1] + chunk[2] * chunk[2]).sqrt();
            if len > 1e-10 {
                chunk[0] /= len;
                chunk[1] /= len;
                chunk[2] /= len;
            }
        }

        normals
    }

    /// Calculate mesh bounding box
    pub fn bounding_box(&self) -> Option<BoundingBox> {
        if self.vertices.is_empty() {
            return None;
        }

        let mut min = [f64::MAX, f64::MAX, f64::MAX];
        let mut max = [f64::MIN, f64::MIN, f64::MIN];

        for v in &self.vertices {
            min[0] = min[0].min(v.x);
            min[1] = min[1].min(v.y);
            min[2] = min[2].min(v.z);
            max[0] = max[0].max(v.x);
            max[1] = max[1].max(v.y);
            max[2] = max[2].max(v.z);
        }

        Some(BoundingBox { min, max })
    }
}

impl Default for SurfaceMesh {
    fn default() -> Self {
        Self::empty()
    }
}

/// Axis-aligned bounding box
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BoundingBox {
    pub min: [f64; 3],
    pub max: [f64; 3],
}

impl BoundingBox {
    pub fn size(&self) -> [f64; 3] {
        [
            self.max[0] - self.min[0],
            self.max[1] - self.min[1],
            self.max[2] - self.min[2],
        ]
    }

    pub fn center(&self) -> [f64; 3] {
        [
            (self.min[0] + self.max[0]) / 2.0,
            (self.min[1] + self.max[1]) / 2.0,
            (self.min[2] + self.max[2]) / 2.0,
        ]
    }

    pub fn diagonal(&self) -> f64 {
        let s = self.size();
        (s[0] * s[0] + s[1] * s[1] + s[2] * s[2]).sqrt()
    }
}

/// Mesh metadata
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MeshMetadata {
    /// Generator used (e.g., "occt", "stl-import")
    pub generator: Option<String>,
    /// Number of vertices
    pub vertex_count: usize,
    /// Number of triangles
    pub triangle_count: usize,
    /// Generation time in seconds
    pub generation_time_secs: Option<f64>,
    /// Source file path
    pub source_file: Option<String>,
}
