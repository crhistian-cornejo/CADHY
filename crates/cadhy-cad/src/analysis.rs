//! Shape analysis and validation utilities
//!
//! Provides tools for:
//! - Validating shape topology
//! - Analyzing shape properties
//! - Detecting and fixing geometry issues
//! - Advanced distance measurements
//!
//! # Example
//! ```no_run
//! use cadhy_cad::{Shape, Primitives, Analysis};
//!
//! let shape = Primitives::make_box(10.0, 20.0, 30.0).unwrap();
//! let analysis = Analysis::analyze(&shape);
//! println!("Shape is valid: {}", analysis.is_valid);
//! println!("Number of faces: {}", analysis.num_faces);
//! ```

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// Detailed shape analysis result
#[derive(Debug, Clone)]
pub struct ShapeAnalysis {
    /// Whether the shape has valid topology
    pub is_valid: bool,
    /// Number of solid bodies
    pub num_solids: i32,
    /// Number of shells
    pub num_shells: i32,
    /// Number of faces
    pub num_faces: i32,
    /// Number of wires
    pub num_wires: i32,
    /// Number of edges
    pub num_edges: i32,
    /// Number of vertices
    pub num_vertices: i32,
    /// Whether there are free (unconnected) edges
    pub has_free_edges: bool,
    /// Whether there are free vertices
    pub has_free_vertices: bool,
    /// Number of small edges that might cause issues
    pub num_small_edges: i32,
    /// Number of degenerated edges
    pub num_degenerated_edges: i32,
    /// Average tolerance of the shape
    pub tolerance: f64,
}

impl From<ffi::ShapeAnalysisResult> for ShapeAnalysis {
    fn from(result: ffi::ShapeAnalysisResult) -> Self {
        Self {
            is_valid: result.is_valid,
            num_solids: result.num_solids,
            num_shells: result.num_shells,
            num_faces: result.num_faces,
            num_wires: result.num_wires,
            num_edges: result.num_edges,
            num_vertices: result.num_vertices,
            has_free_edges: result.has_free_edges,
            has_free_vertices: result.has_free_vertices,
            num_small_edges: result.num_small_edges,
            num_degenerated_edges: result.num_degenerated_edges,
            tolerance: result.tolerance,
        }
    }
}

/// Support type for distance measurement
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupportType {
    /// Point is on a vertex
    Vertex,
    /// Point is on an edge
    Edge,
    /// Point is on a face
    Face,
    /// Unknown support type
    Unknown,
}

impl From<i32> for SupportType {
    fn from(value: i32) -> Self {
        match value {
            0 => SupportType::Vertex,
            1 => SupportType::Edge,
            2 => SupportType::Face,
            _ => SupportType::Unknown,
        }
    }
}

/// Result of a distance measurement between shapes
#[derive(Debug, Clone)]
pub struct DistanceMeasurement {
    /// The minimum distance between the shapes
    pub distance: f64,
    /// The closest point on the first shape
    pub point1: [f64; 3],
    /// The closest point on the second shape
    pub point2: [f64; 3],
    /// What geometry element point1 lies on
    pub support_type1: SupportType,
    /// What geometry element point2 lies on
    pub support_type2: SupportType,
}

impl From<ffi::DistanceResult> for Option<DistanceMeasurement> {
    fn from(result: ffi::DistanceResult) -> Self {
        if !result.valid {
            return None;
        }
        Some(DistanceMeasurement {
            distance: result.distance,
            point1: [result.point1_x, result.point1_y, result.point1_z],
            point2: [result.point2_x, result.point2_y, result.point2_z],
            support_type1: SupportType::from(result.support_type1),
            support_type2: SupportType::from(result.support_type2),
        })
    }
}

/// Options for shape fixing
#[derive(Debug, Clone)]
pub struct FixOptions {
    /// Fix small faces (merged or removed)
    pub fix_small_faces: bool,
    /// Fix small edges
    pub fix_small_edges: bool,
    /// Fix degenerated geometry
    pub fix_degenerated: bool,
    /// Attempt to fix self-intersections
    pub fix_self_intersection: bool,
    /// Tolerance for fixing operations (0 = use default)
    pub tolerance: f64,
}

impl Default for FixOptions {
    fn default() -> Self {
        Self {
            fix_small_faces: true,
            fix_small_edges: true,
            fix_degenerated: true,
            fix_self_intersection: false,
            tolerance: 0.0,
        }
    }
}

/// Shape analysis and validation tools
pub struct Analysis;

impl Analysis {
    /// Perform detailed analysis of a shape
    ///
    /// Returns comprehensive information about the shape's topology,
    /// validity, and potential issues.
    pub fn analyze(shape: &Shape) -> ShapeAnalysis {
        let result = ffi::analyze_shape(shape.inner());
        ShapeAnalysis::from(result)
    }

    /// Check if shape has valid topology
    ///
    /// Quick validity check without full analysis.
    pub fn is_valid(shape: &Shape) -> bool {
        ffi::check_shape_validity(shape.inner())
    }

    /// Get the average tolerance of a shape
    pub fn get_tolerance(shape: &Shape) -> f64 {
        ffi::get_shape_tolerance(shape.inner())
    }

    /// Fix shape geometry issues
    ///
    /// Attempts to repair common geometry problems:
    /// - Small edges and faces
    /// - Degenerated geometry
    /// - Wire gaps
    /// - Tolerance issues
    pub fn fix_shape(shape: &Shape) -> OcctResult<Shape> {
        Self::fix_shape_with_options(shape, &FixOptions::default())
    }

    /// Fix shape with custom options
    pub fn fix_shape_with_options(shape: &Shape, options: &FixOptions) -> OcctResult<Shape> {
        let result = ffi::fix_shape_advanced(
            shape.inner(),
            options.fix_small_faces,
            options.fix_small_edges,
            options.fix_degenerated,
            options.fix_self_intersection,
            options.tolerance,
        );

        if result.is_null() {
            Err(OcctError::OperationFailed(
                "Failed to fix shape".to_string(),
            ))
        } else {
            Shape::from_ptr(result)
        }
    }

    /// Calculate minimum distance between two shapes
    ///
    /// Returns the minimum distance and the closest points on each shape.
    pub fn minimum_distance(shape1: &Shape, shape2: &Shape) -> OcctResult<DistanceMeasurement> {
        let result = ffi::compute_minimum_distance(shape1.inner(), shape2.inner());

        if !result.valid {
            return Err(OcctError::OperationFailed(
                "Failed to compute distance".to_string(),
            ));
        }

        Ok(DistanceMeasurement {
            distance: result.distance,
            point1: [result.point1_x, result.point1_y, result.point1_z],
            point2: [result.point2_x, result.point2_y, result.point2_z],
            support_type1: SupportType::from(result.support_type1),
            support_type2: SupportType::from(result.support_type2),
        })
    }

    /// Calculate distance from a point to a shape
    ///
    /// Returns the minimum distance and the closest point on the shape.
    pub fn point_to_shape_distance(
        point: [f64; 3],
        shape: &Shape,
    ) -> OcctResult<DistanceMeasurement> {
        let result =
            ffi::compute_point_to_shape_distance(point[0], point[1], point[2], shape.inner());

        if !result.valid {
            return Err(OcctError::OperationFailed(
                "Failed to compute point-to-shape distance".to_string(),
            ));
        }

        Ok(DistanceMeasurement {
            distance: result.distance,
            point1: point,
            point2: [result.point2_x, result.point2_y, result.point2_z],
            support_type1: SupportType::Vertex,
            support_type2: SupportType::from(result.support_type2),
        })
    }

    /// Check if two shapes intersect
    ///
    /// Returns true if the minimum distance is effectively zero.
    pub fn shapes_intersect(shape1: &Shape, shape2: &Shape) -> bool {
        if let Ok(dist) = Self::minimum_distance(shape1, shape2) {
            dist.distance < 1e-10
        } else {
            false
        }
    }

    /// Get a summary string of shape analysis
    pub fn summary(shape: &Shape) -> String {
        let analysis = Self::analyze(shape);

        format!(
            "Shape Analysis:\n\
             - Valid: {}\n\
             - Solids: {}, Shells: {}, Faces: {}\n\
             - Wires: {}, Edges: {}, Vertices: {}\n\
             - Free edges: {}, Free vertices: {}\n\
             - Small edges: {}, Degenerated: {}\n\
             - Tolerance: {:.2e}",
            if analysis.is_valid { "Yes" } else { "No" },
            analysis.num_solids,
            analysis.num_shells,
            analysis.num_faces,
            analysis.num_wires,
            analysis.num_edges,
            analysis.num_vertices,
            analysis.has_free_edges,
            analysis.has_free_vertices,
            analysis.num_small_edges,
            analysis.num_degenerated_edges,
            analysis.tolerance,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::primitives::Primitives;

    #[test]
    fn test_analyze_box() {
        let shape = Primitives::make_box(10.0, 20.0, 30.0).unwrap();
        let analysis = Analysis::analyze(&shape);

        assert!(analysis.is_valid);
        assert_eq!(analysis.num_solids, 1);
        assert_eq!(analysis.num_faces, 6); // Box has 6 faces
        assert!(!analysis.has_free_edges);
    }

    #[test]
    fn test_is_valid() {
        let shape = Primitives::make_sphere(5.0).unwrap();
        assert!(Analysis::is_valid(&shape));
    }
}
