//! Core geometry types - kernel-agnostic

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// 3D point/vector
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, Default)]
#[ts(export)]
pub struct Vec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vec3 {
    pub const ZERO: Self = Self {
        x: 0.0,
        y: 0.0,
        z: 0.0,
    };
    pub const X: Self = Self {
        x: 1.0,
        y: 0.0,
        z: 0.0,
    };
    pub const Y: Self = Self {
        x: 0.0,
        y: 1.0,
        z: 0.0,
    };
    pub const Z: Self = Self {
        x: 0.0,
        y: 0.0,
        z: 1.0,
    };

    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    pub fn dot(&self, other: &Self) -> f64 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn cross(&self, other: &Self) -> Self {
        Self {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }

    pub fn length(&self) -> f64 {
        self.dot(self).sqrt()
    }

    pub fn normalize(&self) -> Self {
        let len = self.length();
        if len > 1e-10 {
            Self {
                x: self.x / len,
                y: self.y / len,
                z: self.z / len,
            }
        } else {
            *self
        }
    }
}

/// 2D point for sketches
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Vec2 {
    pub x: f64,
    pub y: f64,
}

impl Vec2 {
    pub const ZERO: Self = Self { x: 0.0, y: 0.0 };

    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
}

/// Plane definition
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Plane {
    pub origin: Vec3,
    pub normal: Vec3,
    pub x_axis: Vec3,
}

impl Plane {
    pub const XY: Self = Self {
        origin: Vec3::ZERO,
        normal: Vec3::Z,
        x_axis: Vec3::X,
    };
    pub const XZ: Self = Self {
        origin: Vec3::ZERO,
        normal: Vec3::Y,
        x_axis: Vec3::X,
    };
    pub const YZ: Self = Self {
        origin: Vec3::ZERO,
        normal: Vec3::X,
        x_axis: Vec3::Y,
    };

    pub fn new(origin: Vec3, normal: Vec3, x_axis: Vec3) -> Self {
        Self {
            origin,
            normal: normal.normalize(),
            x_axis: x_axis.normalize(),
        }
    }

    pub fn y_axis(&self) -> Vec3 {
        self.normal.cross(&self.x_axis).normalize()
    }
}

/// Bounding box
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BoundingBox {
    pub min: Vec3,
    pub max: Vec3,
}

impl BoundingBox {
    pub fn new(min: Vec3, max: Vec3) -> Self {
        Self { min, max }
    }

    pub fn center(&self) -> Vec3 {
        Vec3::new(
            (self.min.x + self.max.x) / 2.0,
            (self.min.y + self.max.y) / 2.0,
            (self.min.z + self.max.z) / 2.0,
        )
    }

    pub fn size(&self) -> Vec3 {
        Vec3::new(
            self.max.x - self.min.x,
            self.max.y - self.min.y,
            self.max.z - self.min.z,
        )
    }
}

/// Surface type enumeration for face classification
///
/// This is the canonical definition used across all crates.
/// cadhy-cad reuses this type for consistency.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub enum SurfaceType {
    Plane,
    Cylinder,
    Cone,
    Sphere,
    Torus,
    BezierSurface,
    BSplineSurface,
    RevolutionSurface,
    ExtrusionSurface,
    OffsetSurface,
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
            7 => SurfaceType::RevolutionSurface,
            8 => SurfaceType::ExtrusionSurface,
            9 => SurfaceType::OffsetSurface,
            _ => SurfaceType::Other,
        }
    }
}

/// Information about a face in the shape topology
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct FaceInfo {
    /// Face index (0-based)
    pub index: u32,
    /// Type of surface
    pub surface_type: SurfaceType,
    /// Normal direction at face center
    pub normal: Vec3,
    /// Is the face orientation reversed
    pub is_reversed: bool,
    /// Surface area of the face
    pub area: f64,
    /// Number of edges bounding this face
    pub num_edges: i32,
    /// Semantic label: "top", "bottom", "side", "front", "back", "left", "right", "curved_side", "spherical", "toroidal", "freeform"
    pub label: String,
}

/// Mesh data for visualization
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct MeshData {
    /// Optional ID of the node that generated this mesh
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub node_id: Option<String>,
    pub vertices: Vec<f32>,
    pub normals: Vec<f32>,
    pub indices: Vec<u32>,
    /// Face index for each triangle (which face generated this triangle)
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub face_ids: Option<Vec<u32>>,
    /// Information about each face in the mesh
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub faces: Option<Vec<FaceInfo>>,
}

impl MeshData {
    /// Create a new MeshData with vertices, normals, and indices
    pub fn new(vertices: Vec<f32>, normals: Vec<f32>, indices: Vec<u32>) -> Self {
        Self {
            node_id: None,
            vertices,
            normals,
            indices,
            face_ids: None,
            faces: None,
        }
    }

    /// Create a new MeshData with face topology information
    pub fn with_topology(
        vertices: Vec<f32>,
        normals: Vec<f32>,
        indices: Vec<u32>,
        face_ids: Vec<u32>,
        faces: Vec<FaceInfo>,
    ) -> Self {
        Self {
            node_id: None,
            vertices,
            normals,
            indices,
            face_ids: Some(face_ids),
            faces: Some(faces),
        }
    }

    /// Create an empty MeshData
    pub fn empty() -> Self {
        Self::new(Vec::new(), Vec::new(), Vec::new())
    }

    /// Set the node_id for this mesh
    pub fn with_node_id(mut self, node_id: impl Into<String>) -> Self {
        self.node_id = Some(node_id.into());
        self
    }

    pub fn vertex_count(&self) -> usize {
        self.vertices.len() / 3
    }

    pub fn triangle_count(&self) -> usize {
        self.indices.len() / 3
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

    /// Filter mesh to only include triangles from faces with specific labels
    pub fn filter_by_labels(&self, labels: &[&str]) -> Option<MeshData> {
        let face_ids = self.face_ids.as_ref()?;
        let faces = self.faces.as_ref()?;

        // Find face indices matching the labels
        let matching_face_indices: std::collections::HashSet<u32> = faces
            .iter()
            .filter(|f| labels.contains(&f.label.as_str()))
            .map(|f| f.index)
            .collect();

        if matching_face_indices.is_empty() {
            return None;
        }

        // Collect triangle indices that match
        let matching_triangles: Vec<usize> = face_ids
            .iter()
            .enumerate()
            .filter(|&(_, &fid)| matching_face_indices.contains(&fid))
            .map(|(i, _)| i)
            .collect();

        if matching_triangles.is_empty() {
            return None;
        }

        // Build new mesh with only matching triangles
        // For simplicity, we include all vertices (Three.js can handle unused vertices)
        let new_indices: Vec<u32> = matching_triangles
            .iter()
            .flat_map(|&tri_idx| {
                let base = tri_idx * 3;
                vec![
                    self.indices[base],
                    self.indices[base + 1],
                    self.indices[base + 2],
                ]
            })
            .collect();

        let new_face_ids: Vec<u32> = matching_triangles
            .iter()
            .map(|&tri_idx| face_ids[tri_idx])
            .collect();

        Some(MeshData {
            node_id: self.node_id.clone(),
            vertices: self.vertices.clone(),
            normals: self.normals.clone(),
            indices: new_indices,
            face_ids: Some(new_face_ids),
            faces: Some(
                faces
                    .iter()
                    .filter(|f| matching_face_indices.contains(&f.index))
                    .cloned()
                    .collect(),
            ),
        })
    }
}
