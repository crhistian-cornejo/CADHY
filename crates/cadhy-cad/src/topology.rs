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

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================
    // CurveType Tests
    // ============================================================

    #[test]
    fn curve_type_from_i32_line() {
        assert_eq!(CurveType::from(0), CurveType::Line);
    }

    #[test]
    fn curve_type_from_i32_circle() {
        assert_eq!(CurveType::from(1), CurveType::Circle);
    }

    #[test]
    fn curve_type_from_i32_ellipse() {
        assert_eq!(CurveType::from(2), CurveType::Ellipse);
    }

    #[test]
    fn curve_type_from_i32_hyperbola() {
        assert_eq!(CurveType::from(3), CurveType::Hyperbola);
    }

    #[test]
    fn curve_type_from_i32_parabola() {
        assert_eq!(CurveType::from(4), CurveType::Parabola);
    }

    #[test]
    fn curve_type_from_i32_bezier() {
        assert_eq!(CurveType::from(5), CurveType::BezierCurve);
    }

    #[test]
    fn curve_type_from_i32_bspline() {
        assert_eq!(CurveType::from(6), CurveType::BSplineCurve);
    }

    #[test]
    fn curve_type_from_i32_offset() {
        assert_eq!(CurveType::from(7), CurveType::OffsetCurve);
    }

    #[test]
    fn curve_type_from_i32_unknown() {
        assert_eq!(CurveType::from(99), CurveType::Other);
        assert_eq!(CurveType::from(-1), CurveType::Other);
        assert_eq!(CurveType::from(100), CurveType::Other);
    }

    // ============================================================
    // SurfaceType Tests
    // ============================================================

    #[test]
    fn surface_type_from_i32_plane() {
        assert_eq!(SurfaceType::from(0), SurfaceType::Plane);
    }

    #[test]
    fn surface_type_from_i32_cylinder() {
        assert_eq!(SurfaceType::from(1), SurfaceType::Cylinder);
    }

    #[test]
    fn surface_type_from_i32_cone() {
        assert_eq!(SurfaceType::from(2), SurfaceType::Cone);
    }

    #[test]
    fn surface_type_from_i32_sphere() {
        assert_eq!(SurfaceType::from(3), SurfaceType::Sphere);
    }

    #[test]
    fn surface_type_from_i32_torus() {
        assert_eq!(SurfaceType::from(4), SurfaceType::Torus);
    }

    #[test]
    fn surface_type_from_i32_bezier_surface() {
        assert_eq!(SurfaceType::from(5), SurfaceType::BezierSurface);
    }

    #[test]
    fn surface_type_from_i32_bspline_surface() {
        assert_eq!(SurfaceType::from(6), SurfaceType::BSplineSurface);
    }

    #[test]
    fn surface_type_from_i32_revolution() {
        assert_eq!(SurfaceType::from(7), SurfaceType::RevolutionSurface);
    }

    #[test]
    fn surface_type_from_i32_extrusion() {
        assert_eq!(SurfaceType::from(8), SurfaceType::ExtrusionSurface);
    }

    #[test]
    fn surface_type_from_i32_offset() {
        assert_eq!(SurfaceType::from(9), SurfaceType::OffsetSurface);
    }

    #[test]
    fn surface_type_from_i32_unknown() {
        assert_eq!(SurfaceType::from(99), SurfaceType::Other);
        assert_eq!(SurfaceType::from(-1), SurfaceType::Other);
    }

    // ============================================================
    // TopologyData Tests
    // ============================================================

    #[test]
    fn topology_data_edges_for_vertex_empty() {
        let data = TopologyData {
            vertices: vec![],
            edges: vec![],
            faces: vec![],
            vertex_to_edges: vec![],
            vertex_to_edges_offset: vec![0], // One offset for no vertices
            edge_to_faces: vec![],
            edge_to_faces_offset: vec![0],
        };

        // Invalid index should return empty slice
        let edges = data.edges_for_vertex(100);
        assert!(edges.is_empty());
    }

    #[test]
    fn topology_data_faces_for_edge_empty() {
        let data = TopologyData {
            vertices: vec![],
            edges: vec![],
            faces: vec![],
            vertex_to_edges: vec![],
            vertex_to_edges_offset: vec![0],
            edge_to_faces: vec![],
            edge_to_faces_offset: vec![0],
        };

        // Invalid index should return empty slice
        let faces = data.faces_for_edge(100);
        assert!(faces.is_empty());
    }

    #[test]
    fn topology_data_vertices_as_flat_empty() {
        let data = TopologyData {
            vertices: vec![],
            edges: vec![],
            faces: vec![],
            vertex_to_edges: vec![],
            vertex_to_edges_offset: vec![],
            edge_to_faces: vec![],
            edge_to_faces_offset: vec![],
        };

        let flat = data.vertices_as_flat();
        assert!(flat.is_empty());
    }

    #[test]
    fn topology_data_vertices_as_flat_with_data() {
        let data = TopologyData {
            vertices: vec![
                VertexInfo {
                    index: 0,
                    x: 1.0,
                    y: 2.0,
                    z: 3.0,
                    tolerance: 0.001,
                    num_edges: 3,
                },
                VertexInfo {
                    index: 1,
                    x: 4.0,
                    y: 5.0,
                    z: 6.0,
                    tolerance: 0.001,
                    num_edges: 2,
                },
            ],
            edges: vec![],
            faces: vec![],
            vertex_to_edges: vec![],
            vertex_to_edges_offset: vec![],
            edge_to_faces: vec![],
            edge_to_faces_offset: vec![],
        };

        let flat = data.vertices_as_flat();
        assert_eq!(flat.len(), 6); // 2 vertices × 3 coords
        assert_eq!(flat, vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);
    }

    #[test]
    fn topology_data_edges_as_line_segments_empty() {
        let data = TopologyData {
            vertices: vec![],
            edges: vec![],
            faces: vec![],
            vertex_to_edges: vec![],
            vertex_to_edges_offset: vec![],
            edge_to_faces: vec![],
            edge_to_faces_offset: vec![],
        };

        let (positions, indices) = data.edges_as_line_segments();
        assert!(positions.is_empty());
        assert!(indices.is_empty());
    }

    #[test]
    fn topology_data_edges_as_line_segments_skips_degenerate() {
        let data = TopologyData {
            vertices: vec![],
            edges: vec![EdgeTessellation {
                index: 0,
                curve_type: CurveType::Line,
                start_vertex: 0,
                end_vertex: 0,
                length: 0.0,
                is_degenerated: true, // Should be skipped
                points: vec![
                    EdgePoint {
                        x: 0.0,
                        y: 0.0,
                        z: 0.0,
                        parameter: 0.0,
                    },
                    EdgePoint {
                        x: 0.0,
                        y: 0.0,
                        z: 0.0,
                        parameter: 1.0,
                    },
                ],
                adjacent_faces: vec![],
            }],
            faces: vec![],
            vertex_to_edges: vec![],
            vertex_to_edges_offset: vec![],
            edge_to_faces: vec![],
            edge_to_faces_offset: vec![],
        };

        let (positions, indices) = data.edges_as_line_segments();
        assert!(positions.is_empty(), "Degenerate edge should be skipped");
        assert!(indices.is_empty());
    }

    #[test]
    fn topology_data_edges_as_line_segments_with_valid_edge() {
        let data = TopologyData {
            vertices: vec![],
            edges: vec![EdgeTessellation {
                index: 5,
                curve_type: CurveType::Line,
                start_vertex: 0,
                end_vertex: 1,
                length: 10.0,
                is_degenerated: false,
                points: vec![
                    EdgePoint {
                        x: 0.0,
                        y: 0.0,
                        z: 0.0,
                        parameter: 0.0,
                    },
                    EdgePoint {
                        x: 10.0,
                        y: 0.0,
                        z: 0.0,
                        parameter: 1.0,
                    },
                ],
                adjacent_faces: vec![0, 1],
            }],
            faces: vec![],
            vertex_to_edges: vec![],
            vertex_to_edges_offset: vec![],
            edge_to_faces: vec![],
            edge_to_faces_offset: vec![],
        };

        let (positions, indices) = data.edges_as_line_segments();
        assert_eq!(positions.len(), 6); // 2 points × 3 coords
        assert_eq!(indices.len(), 1);
        assert_eq!(indices[0], 5); // Edge index
    }

    // ============================================================
    // VertexInfo Tests
    // ============================================================

    #[test]
    fn vertex_info_has_expected_fields() {
        let vertex = VertexInfo {
            index: 42,
            x: 1.5,
            y: 2.5,
            z: 3.5,
            tolerance: 0.0001,
            num_edges: 4,
        };

        assert_eq!(vertex.index, 42);
        assert!((vertex.x - 1.5).abs() < 1e-10);
        assert!((vertex.y - 2.5).abs() < 1e-10);
        assert!((vertex.z - 3.5).abs() < 1e-10);
        assert!((vertex.tolerance - 0.0001).abs() < 1e-10);
        assert_eq!(vertex.num_edges, 4);
    }

    // ============================================================
    // EdgePoint Tests
    // ============================================================

    #[test]
    fn edge_point_parameter_range() {
        // Parameter should typically be 0.0 to 1.0
        let start = EdgePoint {
            x: 0.0,
            y: 0.0,
            z: 0.0,
            parameter: 0.0,
        };
        let end = EdgePoint {
            x: 1.0,
            y: 1.0,
            z: 1.0,
            parameter: 1.0,
        };

        assert!((start.parameter - 0.0).abs() < 1e-10);
        assert!((end.parameter - 1.0).abs() < 1e-10);
    }

    // ============================================================
    // FaceInfo Tests
    // ============================================================

    #[test]
    fn face_info_has_expected_fields() {
        let face = FaceInfo {
            index: 10,
            surface_type: SurfaceType::Plane,
            area: 100.0,
            is_reversed: false,
            num_edges: 4,
            boundary_edges: vec![0, 1, 2, 3],
            center: (5.0, 5.0, 0.0),
            normal: (0.0, 0.0, 1.0),
        };

        assert_eq!(face.index, 10);
        assert_eq!(face.surface_type, SurfaceType::Plane);
        assert!((face.area - 100.0).abs() < 1e-10);
        assert!(!face.is_reversed);
        assert_eq!(face.num_edges, 4);
        assert_eq!(face.boundary_edges.len(), 4);
    }

    // ============================================================
    // EdgeTessellation Tests
    // ============================================================

    #[test]
    fn edge_tessellation_adjacent_faces() {
        let edge = EdgeTessellation {
            index: 0,
            curve_type: CurveType::Circle,
            start_vertex: 0,
            end_vertex: 0, // Closed curve
            length: 31.4159,
            is_degenerated: false,
            points: vec![],
            adjacent_faces: vec![0, 1, 2],
        };

        assert_eq!(edge.adjacent_faces.len(), 3);
        assert!(edge.adjacent_faces.contains(&0));
        assert!(edge.adjacent_faces.contains(&1));
        assert!(edge.adjacent_faces.contains(&2));
    }

    // ============================================================
    // Serialization Tests
    // ============================================================

    #[test]
    fn curve_type_serialization() {
        let types = [
            CurveType::Line,
            CurveType::Circle,
            CurveType::Ellipse,
            CurveType::BezierCurve,
            CurveType::BSplineCurve,
            CurveType::Other,
        ];

        for curve_type in types {
            let json = serde_json::to_string(&curve_type).expect("should serialize");
            let deserialized: CurveType =
                serde_json::from_str(&json).expect("should deserialize");
            assert_eq!(curve_type, deserialized);
        }
    }

    #[test]
    fn surface_type_serialization() {
        let types = [
            SurfaceType::Plane,
            SurfaceType::Cylinder,
            SurfaceType::Cone,
            SurfaceType::Sphere,
            SurfaceType::Torus,
            SurfaceType::BezierSurface,
            SurfaceType::Other,
        ];

        for surface_type in types {
            let json = serde_json::to_string(&surface_type).expect("should serialize");
            let deserialized: SurfaceType =
                serde_json::from_str(&json).expect("should deserialize");
            assert_eq!(surface_type, deserialized);
        }
    }

    #[test]
    fn vertex_info_serialization() {
        let vertex = VertexInfo {
            index: 0,
            x: 1.0,
            y: 2.0,
            z: 3.0,
            tolerance: 0.001,
            num_edges: 3,
        };

        let json = serde_json::to_string(&vertex).expect("should serialize");
        let deserialized: VertexInfo = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(vertex.index, deserialized.index);
        assert!((vertex.x - deserialized.x).abs() < 1e-10);
        assert!((vertex.y - deserialized.y).abs() < 1e-10);
        assert!((vertex.z - deserialized.z).abs() < 1e-10);
    }
}
