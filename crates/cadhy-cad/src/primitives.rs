//! Primitive shape creation
//!
//! Functions for creating basic geometric primitives.

#![allow(clippy::too_many_arguments)]

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// Factory for creating primitive shapes
pub struct Primitives;

impl Primitives {
    /// Create a box with given dimensions, centered at origin
    ///
    /// # Arguments
    /// * `width` - Size in X direction
    /// * `depth` - Size in Y direction  
    /// * `height` - Size in Z direction
    ///
    /// # Example
    /// ```no_run
    /// let box_shape = cadhy_cad::Primitives::make_box(10.0, 20.0, 30.0).unwrap();
    /// ```
    pub fn make_box(width: f64, depth: f64, height: f64) -> OcctResult<Shape> {
        if width <= 0.0 || depth <= 0.0 || height <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Box dimensions must be positive".to_string(),
            ));
        }
        // Use make_box_centered to match Three.js BoxGeometry behavior
        // This ensures boolean operations produce correctly positioned results
        let ptr = ffi::make_box_centered(width, depth, height);
        Shape::from_ptr(ptr)
    }

    /// Create a box at a specific position
    ///
    /// # Arguments
    /// * `x`, `y`, `z` - Corner position
    /// * `width`, `depth`, `height` - Dimensions
    pub fn make_box_at(
        x: f64,
        y: f64,
        z: f64,
        width: f64,
        depth: f64,
        height: f64,
    ) -> OcctResult<Shape> {
        if width <= 0.0 || depth <= 0.0 || height <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Box dimensions must be positive".to_string(),
            ));
        }
        let ptr = ffi::make_box_at(x, y, z, width, depth, height);
        Shape::from_ptr(ptr)
    }

    /// Create a cylinder with given radius and height, centered at origin
    ///
    /// # Arguments
    /// * `radius` - Cylinder radius
    /// * `height` - Cylinder height along Z axis
    pub fn make_cylinder(radius: f64, height: f64) -> OcctResult<Shape> {
        if radius <= 0.0 || height <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Cylinder dimensions must be positive".to_string(),
            ));
        }
        // Use make_cylinder_centered to match Three.js CylinderGeometry behavior
        // This ensures boolean operations produce correctly positioned results
        let ptr = ffi::make_cylinder_centered(radius, height);
        Shape::from_ptr(ptr)
    }

    /// Create a cylinder at position with custom axis
    ///
    /// # Arguments
    /// * `x`, `y`, `z` - Base center position
    /// * `ax`, `ay`, `az` - Axis direction (will be normalized)
    /// * `radius` - Cylinder radius
    /// * `height` - Cylinder height
    pub fn make_cylinder_at(
        x: f64,
        y: f64,
        z: f64,
        ax: f64,
        ay: f64,
        az: f64,
        radius: f64,
        height: f64,
    ) -> OcctResult<Shape> {
        if radius <= 0.0 || height <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Cylinder dimensions must be positive".to_string(),
            ));
        }
        let ptr = ffi::make_cylinder_at(x, y, z, ax, ay, az, radius, height);
        Shape::from_ptr(ptr)
    }

    /// Create a sphere with given radius
    ///
    /// # Arguments
    /// * `radius` - Sphere radius
    pub fn make_sphere(radius: f64) -> OcctResult<Shape> {
        if radius <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Sphere radius must be positive".to_string(),
            ));
        }
        let ptr = ffi::make_sphere(radius);
        Shape::from_ptr(ptr)
    }

    /// Create a sphere at a specific position
    pub fn make_sphere_at(x: f64, y: f64, z: f64, radius: f64) -> OcctResult<Shape> {
        if radius <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Sphere radius must be positive".to_string(),
            ));
        }
        let ptr = ffi::make_sphere_at(x, y, z, radius);
        Shape::from_ptr(ptr)
    }

    /// Create a cone or truncated cone, centered at origin
    ///
    /// # Arguments
    /// * `base_radius` - Radius at base (bottom)
    /// * `top_radius` - Radius at top (0 for pointed cone)
    /// * `height` - Cone height
    pub fn make_cone(base_radius: f64, top_radius: f64, height: f64) -> OcctResult<Shape> {
        if base_radius <= 0.0 || top_radius < 0.0 || height <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Cone dimensions must be valid".to_string(),
            ));
        }
        // Use make_cone_centered to match Three.js ConeGeometry behavior
        // This ensures boolean operations produce correctly positioned results
        let ptr = ffi::make_cone_centered(base_radius, top_radius, height);
        Shape::from_ptr(ptr)
    }

    /// Create a cone at a specific position with custom axis
    pub fn make_cone_at(
        x: f64,
        y: f64,
        z: f64,
        ax: f64,
        ay: f64,
        az: f64,
        base_radius: f64,
        top_radius: f64,
        height: f64,
    ) -> OcctResult<Shape> {
        if base_radius <= 0.0 || top_radius < 0.0 || height <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Cone dimensions must be valid".to_string(),
            ));
        }
        let ptr = ffi::make_cone_at(x, y, z, ax, ay, az, base_radius, top_radius, height);
        Shape::from_ptr(ptr)
    }

    /// Create a torus (donut shape)
    ///
    /// # Arguments
    /// * `major_radius` - Distance from center to tube center
    /// * `minor_radius` - Tube radius
    pub fn make_torus(major_radius: f64, minor_radius: f64) -> OcctResult<Shape> {
        if major_radius <= 0.0 || minor_radius <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Torus radii must be positive".to_string(),
            ));
        }
        if minor_radius >= major_radius {
            return Err(OcctError::PrimitiveCreationFailed(
                "Minor radius must be less than major radius".to_string(),
            ));
        }
        let ptr = ffi::make_torus(major_radius, minor_radius);
        Shape::from_ptr(ptr)
    }

    /// Create a torus at a specific position with custom axis
    pub fn make_torus_at(
        x: f64,
        y: f64,
        z: f64,
        ax: f64,
        ay: f64,
        az: f64,
        major_radius: f64,
        minor_radius: f64,
    ) -> OcctResult<Shape> {
        if major_radius <= 0.0 || minor_radius <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Torus radii must be positive".to_string(),
            ));
        }
        let ptr = ffi::make_torus_at(x, y, z, ax, ay, az, major_radius, minor_radius);
        Shape::from_ptr(ptr)
    }

    /// Create a wedge (tapered box)
    ///
    /// # Arguments
    /// * `dx`, `dy`, `dz` - Base dimensions
    /// * `ltx` - Top X dimension (for tapering)
    pub fn make_wedge(dx: f64, dy: f64, dz: f64, ltx: f64) -> OcctResult<Shape> {
        if dx <= 0.0 || dy <= 0.0 || dz <= 0.0 || ltx < 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Wedge dimensions must be valid".to_string(),
            ));
        }
        let ptr = ffi::make_wedge(dx, dy, dz, ltx);
        Shape::from_ptr(ptr)
    }

    /// Create a helix (spiral wire)
    ///
    /// # Arguments
    /// * `radius` - Helix radius
    /// * `pitch` - Distance between turns
    /// * `height` - Total height of helix
    /// * `clockwise` - Direction of rotation
    ///
    /// # Example
    /// ```no_run
    /// // Create a spring-like helix
    /// let helix = cadhy_cad::Primitives::make_helix(1.0, 0.5, 10.0, true).unwrap();
    /// ```
    pub fn make_helix(radius: f64, pitch: f64, height: f64, clockwise: bool) -> OcctResult<Shape> {
        if radius <= 0.0 || pitch <= 0.0 || height <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Helix parameters must be positive".to_string(),
            ));
        }
        let ptr = ffi::make_helix(radius, pitch, height, clockwise);
        Shape::from_ptr(ptr)
    }

    /// Create a helix at a specific position with custom axis
    ///
    /// # Arguments
    /// * `x`, `y`, `z` - Base center position
    /// * `ax`, `ay`, `az` - Axis direction (will be normalized)
    /// * `radius` - Helix radius
    /// * `pitch` - Distance between turns
    /// * `height` - Total height of helix
    /// * `clockwise` - Direction of rotation
    pub fn make_helix_at(
        x: f64,
        y: f64,
        z: f64,
        ax: f64,
        ay: f64,
        az: f64,
        radius: f64,
        pitch: f64,
        height: f64,
        clockwise: bool,
    ) -> OcctResult<Shape> {
        if radius <= 0.0 || pitch <= 0.0 || height <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Helix parameters must be positive".to_string(),
            ));
        }
        let ptr = ffi::make_helix_at(x, y, z, ax, ay, az, radius, pitch, height, clockwise);
        Shape::from_ptr(ptr)
    }

    /// Create a pyramid (square base tapering to a point)
    ///
    /// # Arguments
    /// * `x, y, z` - Base dimensions (width, depth, height)
    /// * `px, py, pz` - Base center position
    /// * `dx, dy, dz` - Normal direction (apex direction)
    ///
    /// # Example
    /// ```no_run
    /// let pyramid = cadhy_cad::Primitives::make_pyramid(
    ///     10.0, 10.0, 15.0,  // base 10x10, height 15
    ///     0.0, 0.0, 0.0,     // centered at origin
    ///     0.0, 0.0, 1.0      // pointing up (Z-axis)
    /// ).unwrap();
    /// ```
    pub fn make_pyramid(
        x: f64,
        y: f64,
        z: f64,
        px: f64,
        py: f64,
        pz: f64,
        dx: f64,
        dy: f64,
        dz: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_pyramid(x, y, z, px, py, pz, dx, dy, dz);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::PrimitiveCreationFailed("Pyramid creation failed".to_string()))
    }

    /// Create an ellipsoid (3D ellipse with different radii)
    ///
    /// # Arguments
    /// * `cx, cy, cz` - Center position
    /// * `rx, ry, rz` - Radii along X, Y, Z axes
    ///
    /// # Example
    /// ```no_run
    /// let ellipsoid = cadhy_cad::Primitives::make_ellipsoid(
    ///     0.0, 0.0, 0.0,     // centered at origin
    ///     5.0, 3.0, 2.0      // wider in X, narrower in Z
    /// ).unwrap();
    /// ```
    pub fn make_ellipsoid(
        cx: f64,
        cy: f64,
        cz: f64,
        rx: f64,
        ry: f64,
        rz: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_ellipsoid(cx, cy, cz, rx, ry, rz);
        Shape::from_ptr(ptr).map_err(|_| {
            OcctError::PrimitiveCreationFailed("Ellipsoid creation failed".to_string())
        })
    }

    /// Create a vertex (point)
    ///
    /// # Arguments
    /// * `x, y, z` - Point position
    ///
    /// # Example
    /// ```no_run
    /// let vertex = cadhy_cad::Primitives::make_vertex(1.0, 2.0, 3.0).unwrap();
    /// ```
    pub fn make_vertex(x: f64, y: f64, z: f64) -> OcctResult<Shape> {
        let ptr = ffi::make_vertex(x, y, z);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::PrimitiveCreationFailed("Vertex creation failed".to_string()))
    }

    /// Create a rectangle wire in the XY plane
    ///
    /// # Arguments
    /// * `x`, `y` - Corner position
    /// * `width`, `height` - Rectangle dimensions
    pub fn make_rectangle(x: f64, y: f64, width: f64, height: f64) -> OcctResult<Shape> {
        if width <= 0.0 || height <= 0.0 {
            return Err(OcctError::PrimitiveCreationFailed(
                "Rectangle dimensions must be positive".to_string(),
            ));
        }
        let ptr = ffi::make_rectangle(x, y, width, height);
        Shape::from_ptr(ptr)
    }

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
    /// // Create a trapezoidal profile
    /// let points = vec![
    ///     (-1.0, 0.0),   // bottom-left
    ///     (1.0, 0.0),    // bottom-right
    ///     (1.5, 1.5),    // top-right
    ///     (-1.5, 1.5),   // top-left
    /// ];
    /// let wire = cadhy_cad::Primitives::make_polygon_2d(&points).unwrap();
    /// ```
    pub fn make_polygon_2d(points: &[(f64, f64)]) -> OcctResult<Shape> {
        if points.len() < 3 {
            return Err(OcctError::PrimitiveCreationFailed(
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
            return Err(OcctError::PrimitiveCreationFailed(
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

    /// Create a face from a closed wire
    ///
    /// The wire must be closed and planar (or nearly planar).
    pub fn make_face_from_wire(wire: &Shape) -> OcctResult<Shape> {
        let ptr = ffi::make_face_from_wire(wire.inner());
        Shape::from_ptr(ptr)
    }
}
