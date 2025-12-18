//! Topology extraction for interactive selection
//!
//! This module provides functions to extract topological information
//! from OCCT shapes for use in interactive 3D selection.
//!
//! # Features
//!
//! - **Vertex extraction**: Get all vertices with coordinates and connectivity
//! - **Edge tessellation**: Convert edges to polylines for wireframe rendering
//! - **Adjacency maps**: Vertex→Edge and Edge→Face relationships
//!
//! # Example
//!
//! ```no_run
//! use cadhy_cad::{Shape, Primitives, Topology};
//!
//! let shape = Primitives::make_box(10.0, 20.0, 30.0).unwrap();
//! let topology = Topology::get_full(&shape, 0.1);
//!
//! println!("Vertices: {}", topology.vertices.len());
//! println!("Edges: {}", topology.edges.len());
//!
//! // Get coordinates of first vertex
//! if let Some(v) = topology.vertices.first() {
//!     println!("First vertex: ({}, {}, {})", v.x, v.y, v.z);
//! }
//! ```

use crate::ffi::ffi;
use crate::shape::Shape;
use serde::{Deserialize, Serialize};

/// Information about a topological vertex
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VertexInfo {
    /// Unique vertex index (0-based)
    pub index: u32,
    /// X coordinate
    pub x: f64,
    /// Y coordinate
    pub y: f64,
    /// Z coordinate
    pub z: f64,
    /// Tolerance of the vertex
    pub tolerance: f64,
    /// Number of edges connected to this vertex
    pub num_edges: i32,
}

impl From<&ffi::VertexInfo> for VertexInfo {
    fn from(v: &ffi::VertexInfo) -> Self {
        Self {
            index: v.index,
            x: v.x,
            y: v.y,
            z: v.z,
            tolerance: v.tolerance,
            num_edges: v.num_edges,
        }
    }
}

/// A single point along a tessellated edge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgePoint {
    /// X coordinate
    pub x: f64,
    /// Y coordinate
    pub y: f64,
    /// Z coordinate
    pub z: f64,
    /// Parameter value on the curve (0.0 to 1.0)
    pub parameter: f64,
}

impl From<&ffi::EdgePoint> for EdgePoint {
    fn from(p: &ffi::EdgePoint) -> Self {
        Self {
            x: p.x,
            y: p.y,
            z: p.z,
            parameter: p.parameter,
        }
    }
}

/// Type of curve for an edge
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CurveType {
    Line,
    Circle,
    Ellipse,
    Hyperbola,
    Parabola,
    BezierCurve,
    BSplineCurve,
    OffsetCurve,
    Other,
}

impl From<i32> for CurveType {
    fn from(value: i32) -> Self {
        match value {
            0 => CurveType::Line,
            1 => CurveType::Circle,
            2 => CurveType::Ellipse,
            3 => CurveType::Hyperbola,
            4 => CurveType::Parabola,
            5 => CurveType::BezierCurve,
            6 => CurveType::BSplineCurve,
            7 => CurveType::OffsetCurve,
            _ => CurveType::Other,
        }
    }
}

/// Tessellated edge for wireframe rendering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeTessellation {
    /// Edge index (0-based)
    pub index: u32,
    /// Type of curve
    pub curve_type: CurveType,
    /// Start vertex index
    pub start_vertex: u32,
    /// End vertex index
    pub end_vertex: u32,
    /// Edge length
    pub length: f64,
    /// Is edge degenerated (zero length)
    pub is_degenerated: bool,
    /// Tessellated points along the edge
    pub points: Vec<EdgePoint>,
    /// Indices of faces that share this edge
    pub adjacent_faces: Vec<u32>,
}

impl From<&ffi::EdgeTessellation> for EdgeTessellation {
    fn from(e: &ffi::EdgeTessellation) -> Self {
        Self {
            index: e.index,
            curve_type: CurveType::from(e.curve_type),
            start_vertex: e.start_vertex,
            end_vertex: e.end_vertex,
            length: e.length,
            is_degenerated: e.is_degenerated,
            points: e.points.iter().map(EdgePoint::from).collect(),
            adjacent_faces: e.adjacent_faces.to_vec(),
        }
    }
}

/// Type of surface for a face
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

/// Information about a topological face
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaceInfo {
    /// Face index (0-based)
    pub index: u32,
    /// Type of surface
    pub surface_type: SurfaceType,
    /// Surface area
    pub area: f64,
    /// Is the face orientation reversed
    pub is_reversed: bool,
    /// Number of edges bounding this face
    pub num_edges: i32,
    /// Indices of edges bounding this face
    pub boundary_edges: Vec<u32>,
    /// Center point of the face
    pub center: (f64, f64, f64),
    /// Normal at center
    pub normal: (f64, f64, f64),
}

impl From<&ffi::FaceTopologyInfo> for FaceInfo {
    fn from(f: &ffi::FaceTopologyInfo) -> Self {
        Self {
            index: f.index,
            surface_type: SurfaceType::from(f.surface_type),
            area: f.area,
            is_reversed: f.is_reversed,
            num_edges: f.num_edges,
            boundary_edges: f.boundary_edges.to_vec(),
            center: (f.center_x, f.center_y, f.center_z),
            normal: (f.normal_x, f.normal_y, f.normal_z),
        }
    }
}

/// Complete topology result with adjacency information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopologyData {
    /// All vertices in the shape
    pub vertices: Vec<VertexInfo>,
    /// All tessellated edges for wireframe rendering
    pub edges: Vec<EdgeTessellation>,
    /// All faces in the shape
    pub faces: Vec<FaceInfo>,
    /// Vertex to edge adjacency (CSR format data)
    pub vertex_to_edges: Vec<u32>,
    /// Offsets for vertex_to_edges (CSR format)
    pub vertex_to_edges_offset: Vec<u32>,
    /// Edge to face adjacency (CSR format data)
    pub edge_to_faces: Vec<u32>,
    /// Offsets for edge_to_faces (CSR format)
    pub edge_to_faces_offset: Vec<u32>,
}

impl TopologyData {
    /// Get edges connected to a vertex
    pub fn edges_for_vertex(&self, vertex_index: usize) -> &[u32] {
        if vertex_index >= self.vertex_to_edges_offset.len().saturating_sub(1) {
            return &[];
        }
        let start = self.vertex_to_edges_offset[vertex_index] as usize;
        let end = self.vertex_to_edges_offset[vertex_index + 1] as usize;
        &self.vertex_to_edges[start..end]
    }

    /// Get faces adjacent to an edge
    pub fn faces_for_edge(&self, edge_index: usize) -> &[u32] {
        if edge_index >= self.edge_to_faces_offset.len().saturating_sub(1) {
            return &[];
        }
        let start = self.edge_to_faces_offset[edge_index] as usize;
        let end = self.edge_to_faces_offset[edge_index + 1] as usize;
        &self.edge_to_faces[start..end]
    }

    /// Get vertex coordinates as flat array [x0, y0, z0, x1, y1, z1, ...]
    pub fn vertices_as_flat(&self) -> Vec<f64> {
        self.vertices.iter().flat_map(|v| [v.x, v.y, v.z]).collect()
    }

    /// Get all edge points as flat arrays for rendering
    /// Returns (positions, edge_indices) where positions is [x, y, z, x, y, z, ...]
    /// and edge_indices maps each line segment to its edge index
    pub fn edges_as_line_segments(&self) -> (Vec<f32>, Vec<u32>) {
        let mut positions: Vec<f32> = Vec::new();
        let mut edge_indices: Vec<u32> = Vec::new();

        for edge in &self.edges {
            if edge.is_degenerated || edge.points.len() < 2 {
                continue;
            }

            // Create line segments from consecutive points
            for i in 0..edge.points.len() - 1 {
                let p1 = &edge.points[i];
                let p2 = &edge.points[i + 1];

                positions.extend_from_slice(&[
                    p1.x as f32,
                    p1.y as f32,
                    p1.z as f32,
                    p2.x as f32,
                    p2.y as f32,
                    p2.z as f32,
                ]);
                edge_indices.push(edge.index);
            }
        }

        (positions, edge_indices)
    }
}

impl From<ffi::TopologyResult> for TopologyData {
    fn from(t: ffi::TopologyResult) -> Self {
        Self {
            vertices: t.vertices.iter().map(VertexInfo::from).collect(),
            edges: t.edges.iter().map(EdgeTessellation::from).collect(),
            faces: t.faces.iter().map(FaceInfo::from).collect(),
            vertex_to_edges: t.vertex_to_edges.to_vec(),
            vertex_to_edges_offset: t.vertex_to_edges_offset.to_vec(),
            edge_to_faces: t.edge_to_faces.to_vec(),
            edge_to_faces_offset: t.edge_to_faces_offset.to_vec(),
        }
    }
}

/// Topology extraction functions
pub struct Topology;

impl Topology {
    /// Get all vertices from a shape
    pub fn get_vertices(shape: &Shape) -> Vec<VertexInfo> {
        let raw = ffi::get_topology_vertices(shape.inner());
        raw.iter().map(VertexInfo::from).collect()
    }

    /// Get tessellated edges for wireframe rendering
    ///
    /// # Arguments
    /// * `shape` - The shape to extract edges from
    /// * `deflection` - Controls curve approximation quality (smaller = more points)
    pub fn tessellate_edges(shape: &Shape, deflection: f64) -> Vec<EdgeTessellation> {
        let raw = ffi::tessellate_edges(shape.inner(), deflection);
        raw.iter().map(EdgeTessellation::from).collect()
    }

    /// Get complete topology with all adjacency information
    ///
    /// This is the most comprehensive function for interactive selection support.
    /// It returns vertices, edges (tessellated), and adjacency maps.
    ///
    /// # Arguments
    /// * `shape` - The shape to extract topology from
    /// * `edge_deflection` - Controls edge curve approximation (default: 0.1)
    pub fn get_full(shape: &Shape, edge_deflection: f64) -> TopologyData {
        let raw = ffi::get_full_topology(shape.inner(), edge_deflection);
        TopologyData::from(raw)
    }
}
