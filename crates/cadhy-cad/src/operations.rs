//! Solid modeling operations
//!
//! Boolean operations, fillets, chamfers, etc.

#![allow(clippy::too_many_arguments)]

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// Operations on shapes
pub struct Operations;

impl Operations {
    /// Boolean union (fuse) of two shapes
    ///
    /// Creates a new shape that is the combination of both input shapes.
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::{Primitives, Operations};
    ///
    /// let box1 = Primitives::make_box(10.0, 10.0, 10.0).unwrap();
    /// let box2 = Primitives::make_box_at(5.0, 5.0, 5.0, 10.0, 10.0, 10.0).unwrap();
    /// let result = Operations::fuse(&box1, &box2).unwrap();
    /// ```
    pub fn fuse(shape1: &Shape, shape2: &Shape) -> OcctResult<Shape> {
        let ptr = ffi::boolean_fuse(shape1.inner(), shape2.inner());
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::BooleanOperationFailed("Fuse operation failed".to_string()))
    }

    /// Boolean difference (cut) - subtract shape2 from shape1
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::{Primitives, Operations};
    ///
    /// let box1 = Primitives::make_box(20.0, 20.0, 20.0).unwrap();
    /// let hole = Primitives::make_cylinder_at(10.0, 10.0, 0.0, 0.0, 0.0, 1.0, 5.0, 25.0).unwrap();
    /// let result = Operations::cut(&box1, &hole).unwrap();
    /// ```
    pub fn cut(shape1: &Shape, shape2: &Shape) -> OcctResult<Shape> {
        let ptr = ffi::boolean_cut(shape1.inner(), shape2.inner());
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::BooleanOperationFailed("Cut operation failed".to_string()))
    }

    /// Boolean intersection (common) of two shapes
    ///
    /// Creates a new shape that is the common volume of both shapes.
    pub fn common(shape1: &Shape, shape2: &Shape) -> OcctResult<Shape> {
        let ptr = ffi::boolean_common(shape1.inner(), shape2.inner());
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::BooleanOperationFailed("Common operation failed".to_string()))
    }

    /// Apply fillet to all edges of a shape
    ///
    /// # Arguments
    /// * `shape` - Input shape
    /// * `radius` - Fillet radius
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::{Primitives, Operations};
    ///
    /// let box_shape = Primitives::make_box(10.0, 10.0, 10.0).unwrap();
    /// let filleted = Operations::fillet(&box_shape, 1.0).unwrap();
    /// ```
    pub fn fillet(shape: &Shape, radius: f64) -> OcctResult<Shape> {
        if radius <= 0.0 {
            return Err(OcctError::FilletChamferFailed(
                "Fillet radius must be positive".to_string(),
            ));
        }
        let ptr = ffi::fillet_all_edges(shape.inner(), radius);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::FilletChamferFailed("Fillet operation failed".to_string()))
    }

    /// Apply chamfer to all edges of a shape
    ///
    /// # Arguments
    /// * `shape` - Input shape
    /// * `distance` - Chamfer distance
    pub fn chamfer(shape: &Shape, distance: f64) -> OcctResult<Shape> {
        if distance <= 0.0 {
            return Err(OcctError::FilletChamferFailed(
                "Chamfer distance must be positive".to_string(),
            ));
        }
        let ptr = ffi::chamfer_all_edges(shape.inner(), distance);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::FilletChamferFailed("Chamfer operation failed".to_string()))
    }

    /// Apply fillet to specific edges of a shape
    ///
    /// This allows applying different fillet radii to different edges.
    /// Edge indices can be obtained from topology analysis.
    ///
    /// # Arguments
    /// * `shape` - Input shape
    /// * `edge_indices` - Indices of edges to fillet (0-based)
    /// * `radii` - Radius for each edge (must match length of edge_indices)
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::{Primitives, Operations};
    ///
    /// let box_shape = Primitives::make_box(10.0, 10.0, 10.0).unwrap();
    /// // Fillet edges 0, 1, 2 with radii 1.0, 1.5, 2.0 respectively
    /// let filleted = Operations::fillet_edges(&box_shape, &[0, 1, 2], &[1.0, 1.5, 2.0]).unwrap();
    /// ```
    pub fn fillet_edges(shape: &Shape, edge_indices: &[i32], radii: &[f64]) -> OcctResult<Shape> {
        if edge_indices.is_empty() {
            return Err(OcctError::FilletChamferFailed(
                "At least one edge index required".to_string(),
            ));
        }
        if edge_indices.len() != radii.len() {
            return Err(OcctError::FilletChamferFailed(format!(
                "edge_indices length ({}) must match radii length ({})",
                edge_indices.len(),
                radii.len()
            )));
        }
        for (i, &r) in radii.iter().enumerate() {
            if r <= 0.0 {
                return Err(OcctError::FilletChamferFailed(format!(
                    "Fillet radius at index {} must be positive (got {})",
                    i, r
                )));
            }
        }

        let ptr = ffi::fillet_edges(shape.inner(), edge_indices, radii);
        Shape::from_ptr(ptr).map_err(|_| {
            OcctError::FilletChamferFailed("Fillet edges operation failed".to_string())
        })
    }

    /// Apply fillet to specific edges with a uniform radius
    ///
    /// Convenience function when all edges should have the same radius.
    ///
    /// # Arguments
    /// * `shape` - Input shape
    /// * `edge_indices` - Indices of edges to fillet (0-based)
    /// * `radius` - Uniform radius for all edges
    pub fn fillet_edges_uniform(
        shape: &Shape,
        edge_indices: &[i32],
        radius: f64,
    ) -> OcctResult<Shape> {
        let radii: Vec<f64> = vec![radius; edge_indices.len()];
        Self::fillet_edges(shape, edge_indices, &radii)
    }

    /// Apply chamfer to specific edges of a shape
    ///
    /// This allows applying different chamfer distances to different edges.
    /// Edge indices can be obtained from topology analysis.
    ///
    /// # Arguments
    /// * `shape` - Input shape
    /// * `edge_indices` - Indices of edges to chamfer (0-based)
    /// * `distances` - Distance for each edge (must match length of edge_indices)
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::{Primitives, Operations};
    ///
    /// let box_shape = Primitives::make_box(10.0, 10.0, 10.0).unwrap();
    /// // Chamfer edges 0, 1 with distances 1.0, 2.0 respectively
    /// let chamfered = Operations::chamfer_edges(&box_shape, &[0, 1], &[1.0, 2.0]).unwrap();
    /// ```
    pub fn chamfer_edges(
        shape: &Shape,
        edge_indices: &[i32],
        distances: &[f64],
    ) -> OcctResult<Shape> {
        if edge_indices.is_empty() {
            return Err(OcctError::FilletChamferFailed(
                "At least one edge index required".to_string(),
            ));
        }
        if edge_indices.len() != distances.len() {
            return Err(OcctError::FilletChamferFailed(format!(
                "edge_indices length ({}) must match distances length ({})",
                edge_indices.len(),
                distances.len()
            )));
        }
        for (i, &d) in distances.iter().enumerate() {
            if d <= 0.0 {
                return Err(OcctError::FilletChamferFailed(format!(
                    "Chamfer distance at index {} must be positive (got {})",
                    i, d
                )));
            }
        }

        let ptr = ffi::chamfer_edges(shape.inner(), edge_indices, distances);
        Shape::from_ptr(ptr).map_err(|_| {
            OcctError::FilletChamferFailed("Chamfer edges operation failed".to_string())
        })
    }

    /// Apply chamfer to specific edges with a uniform distance
    ///
    /// Convenience function when all edges should have the same distance.
    ///
    /// # Arguments
    /// * `shape` - Input shape
    /// * `edge_indices` - Indices of edges to chamfer (0-based)
    /// * `distance` - Uniform distance for all edges
    pub fn chamfer_edges_uniform(
        shape: &Shape,
        edge_indices: &[i32],
        distance: f64,
    ) -> OcctResult<Shape> {
        let distances: Vec<f64> = vec![distance; edge_indices.len()];
        Self::chamfer_edges(shape, edge_indices, &distances)
    }

    /// Fuse multiple shapes together
    pub fn fuse_many(shapes: &[&Shape]) -> OcctResult<Shape> {
        if shapes.len() < 2 {
            return Err(OcctError::BooleanOperationFailed(
                "Fuse requires at least 2 shapes".to_string(),
            ));
        }

        let mut result = shapes[0].clone();
        for shape in &shapes[1..] {
            result = Self::fuse(&result, shape)?;
        }
        Ok(result)
    }

    /// Subtract multiple shapes from a base shape
    pub fn cut_many(base: &Shape, tools: &[&Shape]) -> OcctResult<Shape> {
        let mut result = base.clone();
        for tool in tools {
            result = Self::cut(&result, tool)?;
        }
        Ok(result)
    }

    /// Create a shell (hollow solid) from a shape
    ///
    /// # Arguments
    /// * `shape` - Input solid shape
    /// * `thickness` - Wall thickness (positive = inward, negative = outward)
    pub fn shell(shape: &Shape, thickness: f64) -> OcctResult<Shape> {
        if thickness == 0.0 {
            return Err(OcctError::OperationFailed(
                "Shell thickness cannot be zero".to_string(),
            ));
        }
        let ptr = ffi::make_shell(shape.inner(), thickness);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::OperationFailed("Shell operation failed".to_string()))
    }

    /// Offset a solid shape
    ///
    /// # Arguments
    /// * `shape` - Input shape
    /// * `offset` - Offset distance (positive = outward, negative = inward)
    pub fn offset(shape: &Shape, offset: f64) -> OcctResult<Shape> {
        let ptr = ffi::offset_solid(shape.inner(), offset);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::OperationFailed("Offset operation failed".to_string()))
    }

    /// Translate a shape by a vector
    pub fn translate(shape: &Shape, dx: f64, dy: f64, dz: f64) -> OcctResult<Shape> {
        let ptr = ffi::translate(shape.inner(), dx, dy, dz);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::TransformFailed("Translate operation failed".to_string()))
    }

    /// Rotate a shape around an axis
    ///
    /// # Arguments
    /// * `shape` - Input shape
    /// * `origin` - Point on the rotation axis (ox, oy, oz)
    /// * `axis` - Axis direction (ax, ay, az)
    /// * `angle` - Rotation angle in radians
    pub fn rotate(
        shape: &Shape,
        ox: f64,
        oy: f64,
        oz: f64,
        ax: f64,
        ay: f64,
        az: f64,
        angle: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::rotate(shape.inner(), ox, oy, oz, ax, ay, az, angle);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::TransformFailed("Rotate operation failed".to_string()))
    }

    /// Scale a shape uniformly from a center point
    pub fn scale(shape: &Shape, cx: f64, cy: f64, cz: f64, factor: f64) -> OcctResult<Shape> {
        if factor <= 0.0 {
            return Err(OcctError::TransformFailed(
                "Scale factor must be positive".to_string(),
            ));
        }
        let ptr = ffi::scale_uniform(shape.inner(), cx, cy, cz, factor);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::TransformFailed("Scale operation failed".to_string()))
    }

    /// Mirror a shape across a plane
    ///
    /// # Arguments
    /// * `shape` - Input shape
    /// * `origin` - Point on the mirror plane (ox, oy, oz)
    /// * `normal` - Normal direction of the mirror plane (nx, ny, nz)
    pub fn mirror(
        shape: &Shape,
        ox: f64,
        oy: f64,
        oz: f64,
        nx: f64,
        ny: f64,
        nz: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::mirror(shape.inner(), ox, oy, oz, nx, ny, nz);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::TransformFailed("Mirror operation failed".to_string()))
    }

    /// Extrude a profile shape along a direction
    pub fn extrude(shape: &Shape, dx: f64, dy: f64, dz: f64) -> OcctResult<Shape> {
        let ptr = ffi::extrude(shape.inner(), dx, dy, dz);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::OperationFailed("Extrude operation failed".to_string()))
    }

    /// Revolve a profile shape around an axis
    ///
    /// # Arguments
    /// * `shape` - Profile shape to revolve
    /// * `origin` - Point on the revolution axis
    /// * `axis` - Direction of the revolution axis
    /// * `angle` - Revolution angle in radians (2*PI for full revolution)
    pub fn revolve(
        shape: &Shape,
        ox: f64,
        oy: f64,
        oz: f64,
        ax: f64,
        ay: f64,
        az: f64,
        angle: f64,
    ) -> OcctResult<Shape> {
        let ptr = ffi::revolve(shape.inner(), ox, oy, oz, ax, ay, az, angle);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::OperationFailed("Revolve operation failed".to_string()))
    }

    /// Create a lofted solid/shell through multiple wire profiles
    ///
    /// Loft creates a smooth surface that passes through all the given profiles.
    /// Useful for creating boat hulls, aircraft fuselages, and organic shapes.
    ///
    /// # Arguments
    /// * `profiles` - Wire profiles to loft through (minimum 2)
    /// * `solid` - If true, create a solid; if false, create a shell
    /// * `ruled` - If true, use ruled surfaces (straight lines between profiles)
    ///
    /// # Example
    /// ```ignore
    /// use cadhy_cad::{Primitives, Operations};
    ///
    /// let circle1 = Primitives::make_circle(0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 10.0).unwrap();
    /// let circle2 = Primitives::make_circle(0.0, 0.0, 20.0, 0.0, 0.0, 1.0, 5.0).unwrap();
    /// let lofted = Operations::loft(&[&circle1, &circle2], true, false).unwrap();
    /// ```
    pub fn loft(profiles: &[&Shape], solid: bool, ruled: bool) -> OcctResult<Shape> {
        if profiles.len() < 2 {
            return Err(OcctError::OperationFailed(
                "Loft requires at least 2 profiles".to_string(),
            ));
        }

        // Convert to raw pointers for FFI
        let ptrs: Vec<*const crate::ffi::ffi::OcctShape> =
            profiles.iter().map(|s| s.inner() as *const _).collect();

        let ptr = ffi::make_loft(&ptrs, ptrs.len(), solid, ruled);
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::OperationFailed("Loft operation failed".to_string()))
    }

    /// Sweep a profile along a spine path (pipe operation)
    ///
    /// Creates a solid by sweeping a profile wire/face along a path wire.
    /// The profile is moved along the spine while maintaining its shape.
    ///
    /// # Arguments
    /// * `profile` - Wire or face to sweep
    /// * `spine` - Path wire/edge to sweep along
    ///
    /// # Example
    /// ```ignore
    /// use cadhy_cad::{Primitives, Operations};
    ///
    /// let circle = Primitives::make_circle(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 2.0).unwrap();
    /// let path = Primitives::make_line(0.0, 0.0, 0.0, 100.0, 0.0, 0.0).unwrap();
    /// let pipe = Operations::pipe(&circle, &path).unwrap();
    /// ```
    pub fn pipe(profile: &Shape, spine: &Shape) -> OcctResult<Shape> {
        let ptr = ffi::make_pipe(profile.inner(), spine.inner());
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::OperationFailed("Pipe operation failed".to_string()))
    }

    /// Sweep a profile along a spine with more control (advanced pipe)
    ///
    /// This is a more advanced version of pipe that provides additional control
    /// over how the profile is swept along the spine.
    ///
    /// # Arguments
    /// * `profile` - Wire to sweep
    /// * `spine` - Path wire to sweep along
    /// * `with_contact` - Maintain contact with spine (Frenet mode)
    /// * `with_correction` - Apply correction for smooth result (C1 approximation)
    ///
    /// # Example
    /// ```ignore
    /// use cadhy_cad::{Primitives, Operations};
    ///
    /// let circle = Primitives::make_circle(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 2.0).unwrap();
    /// let helix = // create a helix path
    /// # Primitives::make_line(0.0, 0.0, 0.0, 10.0, 0.0, 0.0).unwrap();
    /// let spring = Operations::pipe_shell(&circle, &helix, true, true).unwrap();
    /// ```
    pub fn pipe_shell(
        profile: &Shape,
        spine: &Shape,
        with_contact: bool,
        with_correction: bool,
    ) -> OcctResult<Shape> {
        let ptr = ffi::make_pipe_shell(
            profile.inner(),
            spine.inner(),
            with_contact,
            with_correction,
        );
        Shape::from_ptr(ptr)
            .map_err(|_| OcctError::OperationFailed("Pipe shell operation failed".to_string()))
    }

    /// Measure the minimum distance between two shapes
    pub fn measure_distance(shape1: &Shape, shape2: &Shape) -> f64 {
        ffi::measure_distance(shape1.inner(), shape2.inner())
    }

    /// Explode a shape into its sub-components with offset vectors
    ///
    /// This operation separates a shape into its constituent parts and calculates
    /// offset vectors that can be used to animate an "exploded view" of the assembly.
    ///
    /// # Arguments
    /// * `shape` - The shape to explode
    /// * `level` - Decomposition level: 0=solids, 1=shells, 2=faces
    /// * `distance` - How far to move parts from center (in model units)
    /// * `deflection` - Tessellation quality (smaller = higher quality)
    ///
    /// # Returns
    /// An `ExplodeResult` containing the exploded parts with their mesh data and offset vectors
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::{Primitives, Operations};
    ///
    /// let assembly = Primitives::make_box(10.0, 10.0, 10.0).unwrap();
    /// let result = Operations::explode(&assembly, 0, 20.0, 0.1).unwrap();
    /// for part in result.parts {
    ///     println!("Part {} offset: ({}, {}, {})",
    ///         part.index, part.offset_x, part.offset_y, part.offset_z);
    /// }
    /// ```
    pub fn explode(
        shape: &Shape,
        level: i32,
        distance: f64,
        deflection: f64,
    ) -> OcctResult<ffi::ExplodeResult> {
        let result = ffi::explode_shape(shape.inner(), level, distance, deflection);
        if result.success {
            Ok(result)
        } else {
            Err(OcctError::OperationFailed(
                "Explode operation failed".to_string(),
            ))
        }
    }

    /// Get shape components without offset (for analysis)
    ///
    /// Returns the sub-components of a shape at the specified decomposition level
    /// without applying any offset. Useful for inspecting assembly structure.
    ///
    /// # Arguments
    /// * `shape` - The shape to analyze
    /// * `level` - Decomposition level: 0=solids, 1=shells, 2=faces
    /// * `deflection` - Tessellation quality
    pub fn get_components(shape: &Shape, level: i32, deflection: f64) -> Vec<ffi::ExplodedPart> {
        ffi::get_shape_components(shape.inner(), level, deflection)
    }

    /// Count the number of sub-components at a given level
    ///
    /// # Arguments
    /// * `shape` - The shape to analyze
    /// * `level` - Decomposition level: 0=solids, 1=shells, 2=faces
    pub fn count_components(shape: &Shape, level: i32) -> i32 {
        ffi::count_shape_components(shape.inner(), level)
    }
}
