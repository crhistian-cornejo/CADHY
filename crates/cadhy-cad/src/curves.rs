//! Curve and wire creation
//!
//! Functions for creating 2D and 3D curves including lines, arcs, circles,
//! ellipses, splines, and NURBS.
//!
//! Curves are the foundation for sketching and creating complex profiles
//! that can be extruded, revolved, lofted, or swept.

#![allow(clippy::too_many_arguments)]

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// Factory for creating curve shapes (wires/edges)
///
/// Curves are 1D geometric entities that can be used as:
/// - Profiles for extrusion, revolution, lofting
/// - Paths for sweep operations
/// - Construction geometry for snapping
/// - Sketch elements
pub struct Curves;

impl Curves {
    // ═══════════════════════════════════════════════════════════════════════
    // LINES
    // ═══════════════════════════════════════════════════════════════════════

    /// Create a line segment between two points
    ///
    /// # Arguments
    /// * `x1`, `y1`, `z1` - Start point coordinates
    /// * `x2`, `y2`, `z2` - End point coordinates
    ///
    /// # Returns
    /// An edge representing the line segment
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::Curves;
    ///
    /// // Create a horizontal line from origin to (10, 0, 0)
    /// let line = Curves::make_line(0.0, 0.0, 0.0, 10.0, 0.0, 0.0).unwrap();
    /// ```
    pub fn make_line(x1: f64, y1: f64, z1: f64, x2: f64, y2: f64, z2: f64) -> OcctResult<Shape> {
        // Check for zero-length line
        let dx = x2 - x1;
        let dy = y2 - y1;
        let dz = z2 - z1;
        let length_sq = dx * dx + dy * dy + dz * dz;

        if length_sq < 1e-14 {
            return Err(OcctError::CurveCreationFailed(
                "Line endpoints must be distinct".to_string(),
            ));
        }

        let ptr = ffi::make_line(x1, y1, z1, x2, y2, z2);
        Shape::from_ptr(ptr)
    }

    /// Create a line from start point, direction, and length
    ///
    /// # Arguments
    /// * `x`, `y`, `z` - Start point coordinates
    /// * `dx`, `dy`, `dz` - Direction vector (will be normalized)
    /// * `length` - Length of the line
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::Curves;
    ///
    /// // Create a line starting at origin, pointing in X direction, length 10
    /// let line = Curves::make_line_dir(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 10.0).unwrap();
    /// ```
    pub fn make_line_dir(
        x: f64,
        y: f64,
        z: f64,
        dx: f64,
        dy: f64,
        dz: f64,
        length: f64,
    ) -> OcctResult<Shape> {
        if length <= 0.0 {
            return Err(OcctError::CurveCreationFailed(
                "Line length must be positive".to_string(),
            ));
        }

        let len = (dx * dx + dy * dy + dz * dz).sqrt();
        if len < 1e-10 {
            return Err(OcctError::CurveCreationFailed(
                "Direction vector cannot be zero".to_string(),
            ));
        }

        // Normalize direction and compute end point
        let ux = dx / len;
        let uy = dy / len;
        let uz = dz / len;

        let x2 = x + ux * length;
        let y2 = y + uy * length;
        let z2 = z + uz * length;

        let ptr = ffi::make_line(x, y, z, x2, y2, z2);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CIRCLES
    // ═══════════════════════════════════════════════════════════════════════

    /// Create a full circle
    ///
    /// # Arguments
    /// * `cx`, `cy`, `cz` - Center point coordinates
    /// * `nx`, `ny`, `nz` - Normal vector (circle lies in plane perpendicular to this)
    /// * `radius` - Circle radius
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::Curves;
    ///
    /// // Create a circle in the XY plane at origin with radius 5
    /// let circle = Curves::make_circle(0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 5.0).unwrap();
    /// ```
    pub fn make_circle(
        cx: f64,
        cy: f64,
        cz: f64,
        nx: f64,
        ny: f64,
        nz: f64,
        radius: f64,
    ) -> OcctResult<Shape> {
        if radius <= 0.0 {
            return Err(OcctError::CurveCreationFailed(
                "Circle radius must be positive".to_string(),
            ));
        }

        let len = (nx * nx + ny * ny + nz * nz).sqrt();
        if len < 1e-10 {
            return Err(OcctError::CurveCreationFailed(
                "Normal vector cannot be zero".to_string(),
            ));
        }

        let ptr = ffi::make_circle(cx, cy, cz, nx, ny, nz, radius);
        Shape::from_ptr(ptr)
    }

    /// Create a circle in the XY plane (Z = 0)
    ///
    /// Convenience function for 2D sketching.
    ///
    /// # Arguments
    /// * `cx`, `cy` - Center point coordinates
    /// * `radius` - Circle radius
    pub fn make_circle_xy(cx: f64, cy: f64, radius: f64) -> OcctResult<Shape> {
        Self::make_circle(cx, cy, 0.0, 0.0, 0.0, 1.0, radius)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ARCS
    // ═══════════════════════════════════════════════════════════════════════

    /// Create a circular arc from center, radius, and angles
    ///
    /// # Arguments
    /// * `cx`, `cy`, `cz` - Center point coordinates
    /// * `nx`, `ny`, `nz` - Normal vector (arc lies in plane perpendicular to this)
    /// * `radius` - Arc radius
    /// * `start_angle` - Start angle in radians (0 = positive X direction in local plane)
    /// * `end_angle` - End angle in radians
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::Curves;
    /// use std::f64::consts::PI;
    ///
    /// // Create a 90-degree arc in the XY plane
    /// let arc = Curves::make_arc(0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 5.0, 0.0, PI/2.0).unwrap();
    /// ```
    pub fn make_arc(
        cx: f64,
        cy: f64,
        cz: f64,
        nx: f64,
        ny: f64,
        nz: f64,
        radius: f64,
        start_angle: f64,
        end_angle: f64,
    ) -> OcctResult<Shape> {
        if radius <= 0.0 {
            return Err(OcctError::CurveCreationFailed(
                "Arc radius must be positive".to_string(),
            ));
        }

        let len = (nx * nx + ny * ny + nz * nz).sqrt();
        if len < 1e-10 {
            return Err(OcctError::CurveCreationFailed(
                "Normal vector cannot be zero".to_string(),
            ));
        }

        // Check for zero-angle arc
        if (end_angle - start_angle).abs() < 1e-10 {
            return Err(OcctError::CurveCreationFailed(
                "Arc must have non-zero angular extent".to_string(),
            ));
        }

        let ptr = ffi::make_arc(cx, cy, cz, nx, ny, nz, radius, start_angle, end_angle);
        Shape::from_ptr(ptr)
    }

    /// Create an arc in the XY plane (Z = 0)
    ///
    /// Convenience function for 2D sketching.
    ///
    /// # Arguments
    /// * `cx`, `cy` - Center point coordinates
    /// * `radius` - Arc radius
    /// * `start_angle` - Start angle in radians
    /// * `end_angle` - End angle in radians
    pub fn make_arc_xy(
        cx: f64,
        cy: f64,
        radius: f64,
        start_angle: f64,
        end_angle: f64,
    ) -> OcctResult<Shape> {
        Self::make_arc(cx, cy, 0.0, 0.0, 0.0, 1.0, radius, start_angle, end_angle)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RECTANGLES
    // ═══════════════════════════════════════════════════════════════════════

    /// Create a rectangle wire in the XY plane
    ///
    /// # Arguments
    /// * `x`, `y` - Corner position (bottom-left)
    /// * `width` - Rectangle width (X direction)
    /// * `height` - Rectangle height (Y direction)
    ///
    /// # Returns
    /// A closed wire representing the rectangle
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::Curves;
    ///
    /// // Create a 10x5 rectangle at origin
    /// let rect = Curves::make_rectangle(0.0, 0.0, 10.0, 5.0).unwrap();
    /// ```
    pub fn make_rectangle(x: f64, y: f64, width: f64, height: f64) -> OcctResult<Shape> {
        if width <= 0.0 || height <= 0.0 {
            return Err(OcctError::CurveCreationFailed(
                "Rectangle dimensions must be positive".to_string(),
            ));
        }

        let ptr = ffi::make_rectangle(x, y, width, height);
        Shape::from_ptr(ptr)
    }

    /// Create a centered rectangle in the XY plane
    ///
    /// The rectangle is centered at the given point.
    ///
    /// # Arguments
    /// * `cx`, `cy` - Center point coordinates
    /// * `width` - Rectangle width (X direction)
    /// * `height` - Rectangle height (Y direction)
    pub fn make_rectangle_centered(cx: f64, cy: f64, width: f64, height: f64) -> OcctResult<Shape> {
        Self::make_rectangle(cx - width / 2.0, cy - height / 2.0, width, height)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // POLYGONS
    // ═══════════════════════════════════════════════════════════════════════

    /// Create a closed polygon wire from 2D points (XY plane, Z=0)
    ///
    /// Points should be ordered (CCW for outer, CW for holes).
    /// The wire is automatically closed (last point connects to first).
    ///
    /// # Arguments
    /// * `points` - Slice of (x, y) tuples defining the polygon vertices
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::Curves;
    ///
    /// // Create a trapezoidal profile
    /// let points = vec![
    ///     (-1.0, 0.0),   // bottom-left
    ///     (1.0, 0.0),    // bottom-right
    ///     (0.5, 1.5),    // top-right
    ///     (-0.5, 1.5),   // top-left
    /// ];
    /// let wire = Curves::make_polygon_2d(&points).unwrap();
    /// ```
    pub fn make_polygon_2d(points: &[(f64, f64)]) -> OcctResult<Shape> {
        if points.len() < 3 {
            return Err(OcctError::CurveCreationFailed(
                "Polygon requires at least 3 points".to_string(),
            ));
        }

        let vertices: Vec<ffi::Vertex> = points
            .iter()
            .map(|(x, y)| ffi::Vertex {
                x: *x,
                y: *y,
                z: 0.0,
            })
            .collect();

        let ptr = ffi::make_polygon_wire(&vertices);
        Shape::from_ptr(ptr)
    }

    /// Create a closed polygon wire from 3D points
    ///
    /// Points should be ordered and roughly coplanar for best results.
    /// The wire is automatically closed (last point connects to first).
    ///
    /// # Arguments
    /// * `points` - Slice of (x, y, z) tuples defining the polygon vertices
    pub fn make_polygon_3d(points: &[(f64, f64, f64)]) -> OcctResult<Shape> {
        if points.len() < 3 {
            return Err(OcctError::CurveCreationFailed(
                "Polygon requires at least 3 points".to_string(),
            ));
        }

        let vertices: Vec<ffi::Vertex> = points
            .iter()
            .map(|(x, y, z)| ffi::Vertex {
                x: *x,
                y: *y,
                z: *z,
            })
            .collect();

        let ptr = ffi::make_polygon_wire_3d(&vertices);
        Shape::from_ptr(ptr)
    }

    /// Create a regular polygon (equilateral, centered)
    ///
    /// # Arguments
    /// * `cx`, `cy` - Center point coordinates (in XY plane)
    /// * `radius` - Circumscribed radius (distance from center to vertices)
    /// * `sides` - Number of sides (3 = triangle, 4 = square, 6 = hexagon, etc.)
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::Curves;
    ///
    /// // Create a hexagon
    /// let hex = Curves::make_regular_polygon(0.0, 0.0, 5.0, 6).unwrap();
    /// ```
    pub fn make_regular_polygon(cx: f64, cy: f64, radius: f64, sides: u32) -> OcctResult<Shape> {
        if radius <= 0.0 {
            return Err(OcctError::CurveCreationFailed(
                "Polygon radius must be positive".to_string(),
            ));
        }

        if sides < 3 {
            return Err(OcctError::CurveCreationFailed(
                "Polygon must have at least 3 sides".to_string(),
            ));
        }

        let angle_step = 2.0 * std::f64::consts::PI / sides as f64;
        let points: Vec<(f64, f64)> = (0..sides)
            .map(|i| {
                let angle = i as f64 * angle_step;
                (cx + radius * angle.cos(), cy + radius * angle.sin())
            })
            .collect();

        Self::make_polygon_2d(&points)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // POLYLINES (open)
    // ═══════════════════════════════════════════════════════════════════════

    /// Create an open polyline from 2D points (not closed)
    ///
    /// # Arguments
    /// * `points` - Slice of (x, y) tuples defining the polyline vertices
    ///
    /// # Returns
    /// An open wire (not closed at the ends)
    pub fn make_polyline_2d(points: &[(f64, f64)]) -> OcctResult<Shape> {
        if points.len() < 2 {
            return Err(OcctError::CurveCreationFailed(
                "Polyline requires at least 2 points".to_string(),
            ));
        }

        // Create line edges and combine into a wire
        let mut edges: Vec<Shape> = Vec::with_capacity(points.len() - 1);
        for i in 0..points.len() - 1 {
            let (x1, y1) = points[i];
            let (x2, y2) = points[i + 1];
            edges.push(Self::make_line(x1, y1, 0.0, x2, y2, 0.0)?);
        }

        Self::make_wire_from_edges(&edges.iter().collect::<Vec<_>>())
    }

    /// Create an open polyline from 3D points (not closed)
    ///
    /// # Arguments
    /// * `points` - Slice of (x, y, z) tuples defining the polyline vertices
    pub fn make_polyline_3d(points: &[(f64, f64, f64)]) -> OcctResult<Shape> {
        if points.len() < 2 {
            return Err(OcctError::CurveCreationFailed(
                "Polyline requires at least 2 points".to_string(),
            ));
        }

        // Create line edges and combine into a wire
        let mut edges: Vec<Shape> = Vec::with_capacity(points.len() - 1);
        for i in 0..points.len() - 1 {
            let (x1, y1, z1) = points[i];
            let (x2, y2, z2) = points[i + 1];
            edges.push(Self::make_line(x1, y1, z1, x2, y2, z2)?);
        }

        Self::make_wire_from_edges(&edges.iter().collect::<Vec<_>>())
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WIRE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════

    /// Create a wire from multiple edges
    ///
    /// Edges should be connected end-to-end. The wire builder will
    /// automatically order and orient the edges.
    ///
    /// # Arguments
    /// * `edges` - Slice of edge shapes to combine
    ///
    /// # Returns
    /// A wire combining all edges
    pub fn make_wire_from_edges(edges: &[&Shape]) -> OcctResult<Shape> {
        if edges.is_empty() {
            return Err(OcctError::CurveCreationFailed(
                "Wire requires at least one edge".to_string(),
            ));
        }

        let ptrs: Vec<*const ffi::OcctShape> =
            edges.iter().map(|s| s.inner() as *const _).collect();

        let ptr = ffi::make_wire_from_edges(&ptrs, ptrs.len());
        Shape::from_ptr(ptr)
    }

    /// Create a face from a closed wire
    ///
    /// The wire must be closed and planar (or nearly planar).
    /// The resulting face can be used for extrusion, revolution, etc.
    ///
    /// # Arguments
    /// * `wire` - Closed wire shape
    ///
    /// # Returns
    /// A planar face bounded by the wire
    pub fn make_face_from_wire(wire: &Shape) -> OcctResult<Shape> {
        let ptr = ffi::make_face_from_wire(wire.inner());
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ELLIPSES
    // ═══════════════════════════════════════════════════════════════════════

    /// Create an ellipse in a plane defined by center and normal
    ///
    /// # Arguments
    /// * `cx`, `cy`, `cz` - Center point coordinates
    /// * `nx`, `ny`, `nz` - Normal vector (defines the plane)
    /// * `major_radius` - Major radius (must be >= minor_radius)
    /// * `minor_radius` - Minor radius
    /// * `rotation` - Rotation angle around normal (radians)
    ///
    /// # Returns
    /// An edge representing the full ellipse
    pub fn make_ellipse(
        cx: f64,
        cy: f64,
        cz: f64,
        nx: f64,
        ny: f64,
        nz: f64,
        major_radius: f64,
        minor_radius: f64,
        rotation: f64,
    ) -> OcctResult<Shape> {
        if major_radius <= 0.0 || minor_radius <= 0.0 {
            return Err(OcctError::CurveCreationFailed(
                "Ellipse radii must be positive".to_string(),
            ));
        }
        if minor_radius > major_radius {
            return Err(OcctError::CurveCreationFailed(
                "Minor radius cannot exceed major radius".to_string(),
            ));
        }
        let ptr = ffi::make_ellipse(cx, cy, cz, nx, ny, nz, major_radius, minor_radius, rotation);
        Shape::from_ptr(ptr)
    }

    /// Create an ellipse in the XY plane
    ///
    /// # Arguments
    /// * `cx`, `cy` - Center point in XY plane
    /// * `major_radius` - Major radius
    /// * `minor_radius` - Minor radius
    /// * `rotation` - Rotation angle (radians)
    pub fn make_ellipse_xy(
        cx: f64,
        cy: f64,
        major_radius: f64,
        minor_radius: f64,
        rotation: f64,
    ) -> OcctResult<Shape> {
        Self::make_ellipse(
            cx,
            cy,
            0.0,
            0.0,
            0.0,
            1.0,
            major_radius,
            minor_radius,
            rotation,
        )
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ARC VARIANTS
    // ═══════════════════════════════════════════════════════════════════════

    /// Create an arc passing through 3 points
    ///
    /// The arc is defined by a start point, a middle point, and an end point.
    /// The three points must not be collinear.
    ///
    /// # Arguments
    /// * `x1`, `y1`, `z1` - Start point
    /// * `x2`, `y2`, `z2` - Point on the arc (middle)
    /// * `x3`, `y3`, `z3` - End point
    pub fn make_arc_3_points(
        x1: f64,
        y1: f64,
        z1: f64,
        x2: f64,
        y2: f64,
        z2: f64,
        x3: f64,
        y3: f64,
        z3: f64,
    ) -> OcctResult<Shape> {
        let d12 = ((x2 - x1).powi(2) + (y2 - y1).powi(2) + (z2 - z1).powi(2)).sqrt();
        let d23 = ((x3 - x2).powi(2) + (y3 - y2).powi(2) + (z3 - z2).powi(2)).sqrt();
        let d13 = ((x3 - x1).powi(2) + (y3 - y1).powi(2) + (z3 - z1).powi(2)).sqrt();

        if d12 < 1e-10 || d23 < 1e-10 || d13 < 1e-10 {
            return Err(OcctError::CurveCreationFailed(
                "Arc points must be distinct".to_string(),
            ));
        }

        let ptr = ffi::make_arc_3_points(x1, y1, z1, x2, y2, z2, x3, y3, z3);
        Shape::from_ptr(ptr)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SPLINES & BEZIER
    // ═══════════════════════════════════════════════════════════════════════

    /// Create a B-spline curve interpolating through points
    ///
    /// The curve will pass exactly through all given points.
    ///
    /// # Arguments
    /// * `points` - Points the curve must pass through (minimum 2)
    /// * `closed` - If true, creates a closed (periodic) curve
    ///
    /// # Returns
    /// An edge representing the B-spline curve
    pub fn make_bspline(points: &[(f64, f64, f64)], closed: bool) -> OcctResult<Shape> {
        if points.len() < 2 {
            return Err(OcctError::CurveCreationFailed(
                "B-spline requires at least 2 points".to_string(),
            ));
        }
        if closed && points.len() < 3 {
            return Err(OcctError::CurveCreationFailed(
                "Closed B-spline requires at least 3 points".to_string(),
            ));
        }

        let vertices: Vec<ffi::Vertex> = points
            .iter()
            .map(|(x, y, z)| ffi::Vertex {
                x: *x,
                y: *y,
                z: *z,
            })
            .collect();

        let ptr = ffi::make_bspline_interpolate(&vertices, closed);
        Shape::from_ptr(ptr)
    }

    /// Create a Bezier curve from control points
    ///
    /// The curve is defined by control points that form the control polygon.
    /// The curve will pass through the first and last points, but generally
    /// not through the intermediate control points.
    ///
    /// # Arguments
    /// * `control_points` - Control polygon vertices (2-25 points)
    ///
    /// # Returns
    /// An edge representing the Bezier curve
    pub fn make_bezier(control_points: &[(f64, f64, f64)]) -> OcctResult<Shape> {
        if control_points.len() < 2 {
            return Err(OcctError::CurveCreationFailed(
                "Bezier curve requires at least 2 control points".to_string(),
            ));
        }
        if control_points.len() > 25 {
            return Err(OcctError::CurveCreationFailed(
                "Bezier curve supports maximum 25 control points".to_string(),
            ));
        }

        let vertices: Vec<ffi::Vertex> = control_points
            .iter()
            .map(|(x, y, z)| ffi::Vertex {
                x: *x,
                y: *y,
                z: *z,
            })
            .collect();

        let ptr = ffi::make_bezier(&vertices);
        Shape::from_ptr(ptr)
    }
}
