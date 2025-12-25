//! FFI bridge definitions using cxx
//!
//! This module defines the C++ <-> Rust interface using the cxx crate.
//!
//! Provides bindings for:
//! - Primitive creation (box, cylinder, sphere, cone, torus, wedge)
//! - Boolean operations (fuse, cut, common)
//! - Modification operations (fillet, chamfer, offset, shell, draft)
//! - Transform operations (translate, rotate, scale, mirror)
//! - Surface operations (extrude, revolve, sweep, loft)
//! - Sketch/wire operations
//! - Tessellation and STEP I/O

// NOTE:
// Many of the FFI functions and structs declared in this module are not yet
// wired up to safe Rust wrappers. They are kept here intentionally for future
// features (IGES I/O, detailed measurements, sketch helpers, etc.).
//
// This module is internal to the crate (`mod ffi;` in lib.rs), so the Rust
// compiler treats unused items here as dead code and emits warnings.
//
// We silence `dead_code` *only* for this FFI bridge so that we can keep the
// declarations in sync with the C++ side without polluting build output with
// expected warnings. When a function/struct is actually wrapped and used from
// safe Rust, it will naturally become "live" again.
#[allow(dead_code, clippy::module_inception, clippy::too_many_arguments)]
#[cxx::bridge(namespace = "cadhy_cad")]
pub mod ffi {
    /// Vertex data for mesh output and geometry
    #[derive(Debug, Clone)]
    pub struct Vertex {
        pub x: f64,
        pub y: f64,
        pub z: f64,
    }

    /// Triangle indices
    #[derive(Debug, Clone)]
    pub struct Triangle {
        pub v1: u32,
        pub v2: u32,
        pub v3: u32,
    }

    /// Mesh data returned from tessellation
    #[derive(Debug)]
    pub struct MeshResult {
        pub vertices: Vec<Vertex>,
        pub normals: Vec<Vertex>,
        pub triangles: Vec<Triangle>,
        /// Face index for each triangle (which face generated this triangle)
        pub face_ids: Vec<u32>,
        /// Information about each face in the shape
        pub faces: Vec<FaceInfo>,
    }

    /// Information about a face in the shape topology
    #[derive(Debug, Clone)]
    pub struct FaceInfo {
        /// Face index (0-based)
        pub index: u32,
        /// Surface type: 0=Plane, 1=Cylinder, 2=Cone, 3=Sphere, 4=Torus, 5=BezierSurface, 6=BSplineSurface, 7=Other
        pub surface_type: i32,
        /// Normal direction at face center (for planar faces)
        pub normal_x: f64,
        pub normal_y: f64,
        pub normal_z: f64,
        /// Is the face reversed
        pub is_reversed: bool,
        /// Area of the face
        pub area: f64,
        /// Number of edges bounding this face
        pub num_edges: i32,
        /// Semantic label (if determinable): "top", "bottom", "side", "front", "back", "left", "right", "curved", "unknown"
        pub label: String,
    }

    /// Bounding box result
    #[derive(Debug, Clone)]
    pub struct BoundingBoxResult {
        pub min_x: f64,
        pub min_y: f64,
        pub min_z: f64,
        pub max_x: f64,
        pub max_y: f64,
        pub max_z: f64,
        pub valid: bool,
    }

    /// Shape properties (volume, surface area, center of mass)
    #[derive(Debug, Clone)]
    pub struct ShapeProperties {
        pub volume: f64,
        pub surface_area: f64,
        pub center_x: f64,
        pub center_y: f64,
        pub center_z: f64,
        pub valid: bool,
    }

    /// Edge info for dimensioning
    #[derive(Debug, Clone)]
    pub struct EdgeInfo {
        pub start_x: f64,
        pub start_y: f64,
        pub start_z: f64,
        pub end_x: f64,
        pub end_y: f64,
        pub end_z: f64,
        pub length: f64,
        pub edge_type: i32, // 0=line, 1=arc, 2=circle, 3=other
    }

    /// 2D line for HLR projection results
    #[derive(Debug, Clone)]
    pub struct Line2DFFI {
        pub start_x: f64,
        pub start_y: f64,
        pub end_x: f64,
        pub end_y: f64,
        pub line_type: i32, // 0=VisibleSharp, 1=HiddenSharp, 2=VisibleSmooth, 3=HiddenSmooth, 4=VisibleOutline, 5=HiddenOutline, 6=Centerline
    }

    /// HLR projection result
    #[derive(Debug)]
    pub struct HLRProjectionResult {
        pub lines: Vec<Line2DFFI>,
        pub min_x: f64,
        pub min_y: f64,
        pub max_x: f64,
        pub max_y: f64,
    }

    // ============================================================
    // ENHANCED 2D PROJECTION WITH CURVE SUPPORT
    // ============================================================

    /// 2D curve for enhanced HLR projection (supports arcs, circles, splines)
    /// curve_type: 0=Line, 1=Arc, 2=Circle, 3=Ellipse, 4=Spline/Polyline
    #[derive(Debug, Clone)]
    pub struct Curve2DFFI {
        /// Curve type: 0=Line, 1=Arc, 2=Circle, 3=Ellipse, 4=Spline
        pub curve_type: i32,
        /// Line type for rendering: 0=VisibleSharp, 1=HiddenSharp, etc.
        pub line_type: i32,
        /// Start point X
        pub start_x: f64,
        /// Start point Y
        pub start_y: f64,
        /// End point X (for lines and arcs)
        pub end_x: f64,
        /// End point Y (for lines and arcs)
        pub end_y: f64,
        /// Center X (for arcs, circles, ellipses)
        pub center_x: f64,
        /// Center Y (for arcs, circles, ellipses)
        pub center_y: f64,
        /// Radius (for arcs and circles)
        pub radius: f64,
        /// Major radius (for ellipses)
        pub major_radius: f64,
        /// Minor radius (for ellipses)
        pub minor_radius: f64,
        /// Start angle in radians (for arcs)
        pub start_angle: f64,
        /// End angle in radians (for arcs)
        pub end_angle: f64,
        /// Rotation angle for ellipse axis (radians)
        pub rotation: f64,
        /// Is counter-clockwise (for arc direction in SVG)
        pub ccw: bool,
    }

    /// Tessellated points for spline/complex curves
    #[derive(Debug, Clone)]
    pub struct TessPoint2D {
        pub x: f64,
        pub y: f64,
    }

    /// A polyline (tessellated curve) for complex curves
    #[derive(Debug)]
    pub struct Polyline2DFFI {
        /// Line type for rendering
        pub line_type: i32,
        /// Tessellated points
        pub points: Vec<TessPoint2D>,
    }

    /// Enhanced HLR projection result with curves and polylines
    #[derive(Debug)]
    pub struct HLRProjectionResultV2 {
        /// Simple curves (lines, arcs, circles, ellipses)
        pub curves: Vec<Curve2DFFI>,
        /// Complex curves tessellated as polylines
        pub polylines: Vec<Polyline2DFFI>,
        /// Bounding box
        pub min_x: f64,
        pub min_y: f64,
        pub max_x: f64,
        pub max_y: f64,
        /// Number of original edges processed
        pub num_edges: i32,
        /// Number of lines extracted
        pub num_lines: i32,
        /// Number of arcs/circles extracted
        pub num_arcs: i32,
        /// Number of splines/polylines extracted
        pub num_polylines: i32,
    }

    // ============================================================
    // SECTION VIEW WITH HATCHING
    // ============================================================

    /// A single hatch line in a section view
    #[derive(Debug, Clone)]
    pub struct HatchLineFFI {
        pub start_x: f64,
        pub start_y: f64,
        pub end_x: f64,
        pub end_y: f64,
    }

    /// A closed region boundary for hatching
    #[derive(Debug, Clone)]
    pub struct HatchRegionFFI {
        /// Boundary points (closed polygon)
        pub boundary: Vec<TessPoint2D>,
        /// Hatch lines inside this region
        pub hatch_lines: Vec<HatchLineFFI>,
        /// Region area (for sorting/filtering)
        pub area: f64,
        /// Is this an outer boundary (vs hole)
        pub is_outer: bool,
    }

    /// Section curve (boundary of cut)
    #[derive(Debug, Clone)]
    pub struct SectionCurveFFI {
        /// Points defining the curve
        pub points: Vec<TessPoint2D>,
        /// Is the curve closed
        pub is_closed: bool,
    }

    /// Result of section with hatch computation
    #[derive(Debug)]
    pub struct SectionWithHatchResult {
        /// Section boundary curves
        pub curves: Vec<SectionCurveFFI>,
        /// Hatch regions with their hatch lines
        pub regions: Vec<HatchRegionFFI>,
        /// Bounding box
        pub min_x: f64,
        pub min_y: f64,
        pub max_x: f64,
        pub max_y: f64,
        /// Number of closed regions found
        pub num_regions: i32,
        /// Total number of hatch lines generated
        pub num_hatch_lines: i32,
    }

    /// Shape analysis result for diagnostics
    #[derive(Debug, Clone)]
    pub struct ShapeAnalysisResult {
        pub is_valid: bool,
        pub num_solids: i32,
        pub num_shells: i32,
        pub num_faces: i32,
        pub num_wires: i32,
        pub num_edges: i32,
        pub num_vertices: i32,
        pub has_free_edges: bool,
        pub has_free_vertices: bool,
        pub num_small_edges: i32,
        pub num_degenerated_edges: i32,
        pub tolerance: f64,
    }

    /// Distance measurement result with points
    #[derive(Debug, Clone)]
    pub struct DistanceResult {
        pub distance: f64,
        pub point1_x: f64,
        pub point1_y: f64,
        pub point1_z: f64,
        pub point2_x: f64,
        pub point2_y: f64,
        pub point2_z: f64,
        pub support_type1: i32, // 0=Vertex, 1=Edge, 2=Face
        pub support_type2: i32,
        pub valid: bool,
    }

    // ============================================================
    // TOPOLOGY DATA STRUCTURES FOR INTERACTIVE SELECTION
    // ============================================================

    /// Information about a topological vertex in the shape
    #[derive(Debug, Clone)]
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

    /// A single point in edge tessellation
    #[derive(Debug, Clone)]
    pub struct EdgePoint {
        pub x: f64,
        pub y: f64,
        pub z: f64,
        /// Parameter value on the curve (0.0 to 1.0 normalized)
        pub parameter: f64,
    }

    /// Tessellated edge for wireframe rendering
    #[derive(Debug, Clone)]
    pub struct EdgeTessellation {
        /// Edge index (0-based)
        pub index: u32,
        /// Curve type: 0=Line, 1=Circle, 2=Ellipse, 3=Hyperbola, 4=Parabola, 5=BezierCurve, 6=BSplineCurve, 7=OffsetCurve, 8=Other
        pub curve_type: i32,
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
        /// Indices of faces that share this edge (usually 2 for manifold)
        pub adjacent_faces: Vec<u32>,
    }

    /// Information about a topological face for selection
    #[derive(Debug, Clone)]
    pub struct FaceTopologyInfo {
        /// Face index (0-based)
        pub index: u32,
        /// Surface type: 0=Plane, 1=Cylinder, 2=Cone, 3=Sphere, 4=Torus, 5=BezierSurface, 6=BSplineSurface, 7=Revolution, 8=Extrusion, 9=Offset, 10=Other
        pub surface_type: i32,
        /// Surface area
        pub area: f64,
        /// Is the face orientation reversed
        pub is_reversed: bool,
        /// Number of edges bounding this face
        pub num_edges: i32,
        /// Indices of edges bounding this face
        pub boundary_edges: Vec<u32>,
        /// Center X coordinate
        pub center_x: f64,
        /// Center Y coordinate
        pub center_y: f64,
        /// Center Z coordinate
        pub center_z: f64,
        /// Normal X at center
        pub normal_x: f64,
        /// Normal Y at center
        pub normal_y: f64,
        /// Normal Z at center
        pub normal_z: f64,
    }

    /// Complete topology result with all selectable entities
    #[derive(Debug)]
    pub struct TopologyResult {
        /// All vertices in the shape
        pub vertices: Vec<VertexInfo>,
        /// All tessellated edges for wireframe rendering
        pub edges: Vec<EdgeTessellation>,
        /// All faces in the shape
        pub faces: Vec<FaceTopologyInfo>,
        /// Vertex to edge adjacency: for each vertex, list of edge indices
        pub vertex_to_edges: Vec<u32>,
        /// Offset into vertex_to_edges for each vertex (CSR format)
        pub vertex_to_edges_offset: Vec<u32>,
        /// Edge to face adjacency: for each edge, list of face indices
        pub edge_to_faces: Vec<u32>,
        /// Offset into edge_to_faces for each edge (CSR format)
        pub edge_to_faces_offset: Vec<u32>,
    }

    // ============================================================
    // EXPLODE/IMPLODE VIEW DATA STRUCTURES
    // ============================================================

    /// An exploded part with its mesh data and offset vector
    #[derive(Debug)]
    pub struct ExplodedPart {
        /// Part index (0-based)
        pub index: u32,
        /// Shape type of this part: 0=compound, 1=compsolid, 2=solid, 3=shell, 4=face, etc.
        pub shape_type: i32,
        /// Original center X coordinate
        pub center_x: f64,
        /// Original center Y coordinate
        pub center_y: f64,
        /// Original center Z coordinate
        pub center_z: f64,
        /// Offset X to apply for explode animation
        pub offset_x: f64,
        /// Offset Y to apply for explode animation
        pub offset_y: f64,
        /// Offset Z to apply for explode animation
        pub offset_z: f64,
        /// Tessellated vertices for this part
        pub vertices: Vec<Vertex>,
        /// Tessellated normals for this part
        pub normals: Vec<Vertex>,
        /// Triangles for this part
        pub triangles: Vec<Triangle>,
    }

    /// Result of explode operation
    #[derive(Debug)]
    pub struct ExplodeResult {
        /// All exploded parts
        pub parts: Vec<ExplodedPart>,
        /// Parent shape center X
        pub parent_center_x: f64,
        /// Parent shape center Y
        pub parent_center_y: f64,
        /// Parent shape center Z
        pub parent_center_z: f64,
        /// Whether the operation succeeded
        pub success: bool,
    }

    unsafe extern "C++" {
        include!("include/bridge.h");

        /// Opaque type representing TopoDS_Shape
        type OcctShape;

        // ============================================================
        // PRIMITIVE CREATION
        // ============================================================

        /// Create a box with given dimensions at origin
        fn make_box(dx: f64, dy: f64, dz: f64) -> UniquePtr<OcctShape>;

        /// Create a box at a specific position
        fn make_box_at(x: f64, y: f64, z: f64, dx: f64, dy: f64, dz: f64) -> UniquePtr<OcctShape>;

        /// Create a centered box
        fn make_box_centered(dx: f64, dy: f64, dz: f64) -> UniquePtr<OcctShape>;

        /// Create a cylinder at origin along Z axis
        fn make_cylinder(radius: f64, height: f64) -> UniquePtr<OcctShape>;

        /// Create a cylinder at position with custom axis
        fn make_cylinder_at(
            x: f64,
            y: f64,
            z: f64,
            ax: f64,
            ay: f64,
            az: f64,
            radius: f64,
            height: f64,
        ) -> UniquePtr<OcctShape>;

        /// Create a sphere at origin
        fn make_sphere(radius: f64) -> UniquePtr<OcctShape>;

        /// Create a sphere at position
        fn make_sphere_at(x: f64, y: f64, z: f64, radius: f64) -> UniquePtr<OcctShape>;

        /// Create a cone/frustum at origin
        fn make_cone(r1: f64, r2: f64, height: f64) -> UniquePtr<OcctShape>;

        /// Create a cone at position with axis
        fn make_cone_at(
            x: f64,
            y: f64,
            z: f64,
            ax: f64,
            ay: f64,
            az: f64,
            r1: f64,
            r2: f64,
            height: f64,
        ) -> UniquePtr<OcctShape>;

        /// Create a torus
        fn make_torus(major_radius: f64, minor_radius: f64) -> UniquePtr<OcctShape>;

        /// Create a torus at position with axis
        fn make_torus_at(
            x: f64,
            y: f64,
            z: f64,
            ax: f64,
            ay: f64,
            az: f64,
            major_radius: f64,
            minor_radius: f64,
        ) -> UniquePtr<OcctShape>;

        /// Create a wedge (tapered box)
        fn make_wedge(dx: f64, dy: f64, dz: f64, ltx: f64) -> UniquePtr<OcctShape>;

        /// Create a helix (spiral) wire
        /// radius: helix radius
        /// pitch: distance between turns
        /// height: total height of the helix
        /// clockwise: true for right-handed helix
        fn make_helix(
            radius: f64,
            pitch: f64,
            height: f64,
            clockwise: bool,
        ) -> UniquePtr<OcctShape>;

        /// Create a helix at a specific position with custom axis
        fn make_helix_at(
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
        ) -> UniquePtr<OcctShape>;

        /// Create a pyramid (square base tapering to a point)
        fn make_pyramid(
            x: f64,
            y: f64,
            z: f64,
            px: f64,
            py: f64,
            pz: f64,
            dx: f64,
            dy: f64,
            dz: f64,
        ) -> UniquePtr<OcctShape>;

        /// Create an ellipsoid (3D ellipse with different radii)
        fn make_ellipsoid(
            cx: f64,
            cy: f64,
            cz: f64,
            rx: f64,
            ry: f64,
            rz: f64,
        ) -> UniquePtr<OcctShape>;

        /// Create a vertex (point)
        fn make_vertex(x: f64, y: f64, z: f64) -> UniquePtr<OcctShape>;

        // ============================================================
        // BOOLEAN OPERATIONS
        // ============================================================

        /// Boolean fuse (union) of two shapes
        fn boolean_fuse(shape1: &OcctShape, shape2: &OcctShape) -> UniquePtr<OcctShape>;

        /// Boolean cut (difference) - subtract shape2 from shape1
        fn boolean_cut(shape1: &OcctShape, shape2: &OcctShape) -> UniquePtr<OcctShape>;

        /// Boolean common (intersection) of two shapes
        fn boolean_common(shape1: &OcctShape, shape2: &OcctShape) -> UniquePtr<OcctShape>;

        // ============================================================
        // MODIFICATION OPERATIONS
        // ============================================================

        /// Apply fillet to all edges
        fn fillet_all_edges(shape: &OcctShape, radius: f64) -> UniquePtr<OcctShape>;

        /// Apply chamfer to all edges
        fn chamfer_all_edges(shape: &OcctShape, distance: f64) -> UniquePtr<OcctShape>;

        /// Create an offset shell (hollow solid)
        fn make_shell(shape: &OcctShape, thickness: f64) -> UniquePtr<OcctShape>;

        /// Offset solid (thicken/shrink)
        fn offset_solid(shape: &OcctShape, offset: f64) -> UniquePtr<OcctShape>;

        /// Apply fillet to specific edges by index
        /// edge_indices: indices of edges to fillet (0-based)
        /// radii: radius for each edge (same length as edge_indices)
        fn fillet_edges(
            shape: &OcctShape,
            edge_indices: &[i32],
            radii: &[f64],
        ) -> UniquePtr<OcctShape>;

        /// Apply chamfer to specific edges by index
        /// edge_indices: indices of edges to chamfer (0-based)
        /// distances: distance for each edge (same length as edge_indices)
        fn chamfer_edges(
            shape: &OcctShape,
            edge_indices: &[i32],
            distances: &[f64],
        ) -> UniquePtr<OcctShape>;

        /// Add draft angle to faces (for mold release)
        /// angle: draft angle in radians
        /// dir_x, dir_y, dir_z: pull direction
        /// neutral_x, neutral_y, neutral_z: point on the neutral plane
        fn add_draft(
            shape: &OcctShape,
            angle: f64,
            dir_x: f64,
            dir_y: f64,
            dir_z: f64,
            neutral_x: f64,
            neutral_y: f64,
            neutral_z: f64,
        ) -> UniquePtr<OcctShape>;

        /// Thicken a surface/shell into a solid
        /// thickness: thickness to add (positive = outward, negative = inward)
        /// both_sides: if true, add thickness to both sides
        fn thicken(shape: &OcctShape, thickness: f64, both_sides: bool) -> UniquePtr<OcctShape>;

        // ============================================================
        // SHAPE OPERATIONS
        // ============================================================

        /// Simplify a shape by unifying faces and edges
        /// Critical for cleaning up boolean operation results
        fn simplify_shape(
            shape: &OcctShape,
            unify_edges: bool,
            unify_faces: bool,
        ) -> UniquePtr<OcctShape>;

        /// Combine multiple shapes into a compound
        /// Note: Pass shape pointers, not IDs
        fn combine_shapes(shapes: &[*const OcctShape]) -> UniquePtr<OcctShape>;

        // ============================================================
        // TRANSFORM OPERATIONS
        // ============================================================

        /// Translate shape by vector
        fn translate(shape: &OcctShape, dx: f64, dy: f64, dz: f64) -> UniquePtr<OcctShape>;

        /// Rotate shape around axis (angle in radians)
        fn rotate(
            shape: &OcctShape,
            origin_x: f64,
            origin_y: f64,
            origin_z: f64,
            axis_x: f64,
            axis_y: f64,
            axis_z: f64,
            angle: f64,
        ) -> UniquePtr<OcctShape>;

        /// Scale shape uniformly from point
        fn scale_uniform(
            shape: &OcctShape,
            center_x: f64,
            center_y: f64,
            center_z: f64,
            factor: f64,
        ) -> UniquePtr<OcctShape>;

        /// Scale shape non-uniformly
        fn scale_xyz(
            shape: &OcctShape,
            center_x: f64,
            center_y: f64,
            center_z: f64,
            fx: f64,
            fy: f64,
            fz: f64,
        ) -> UniquePtr<OcctShape>;

        /// Mirror shape across plane
        fn mirror(
            shape: &OcctShape,
            origin_x: f64,
            origin_y: f64,
            origin_z: f64,
            normal_x: f64,
            normal_y: f64,
            normal_z: f64,
        ) -> UniquePtr<OcctShape>;

        // ============================================================
        // SURFACE/SOLID GENERATION
        // ============================================================

        /// Extrude a wire/face along direction
        fn extrude(shape: &OcctShape, dx: f64, dy: f64, dz: f64) -> UniquePtr<OcctShape>;

        /// Revolve a wire/face around axis (angle in radians, 2*PI for full)
        fn revolve(
            shape: &OcctShape,
            origin_x: f64,
            origin_y: f64,
            origin_z: f64,
            axis_x: f64,
            axis_y: f64,
            axis_z: f64,
            angle: f64,
        ) -> UniquePtr<OcctShape>;

        // ============================================================
        // LOFT/SWEEP OPERATIONS
        // ============================================================

        /// Create a lofted solid/shell through multiple wire profiles
        /// profiles: array of wire/edge/vertex shapes to loft through
        /// count: number of profiles
        /// solid: if true, create a solid; if false, create a shell
        /// ruled: if true, use ruled surfaces (straight lines between profiles)
        fn make_loft(
            profiles: &[*const OcctShape],
            count: usize,
            solid: bool,
            ruled: bool,
        ) -> UniquePtr<OcctShape>;

        /// Sweep a profile along a spine path (simple pipe)
        /// profile: wire or face to sweep
        /// spine: path wire/edge to sweep along
        fn make_pipe(profile: &OcctShape, spine: &OcctShape) -> UniquePtr<OcctShape>;

        /// Sweep a profile along a spine path with more control
        /// profile: wire to sweep
        /// spine: path wire to sweep along
        /// with_contact: maintain contact with spine
        /// with_correction: apply correction for smooth result
        fn make_pipe_shell(
            profile: &OcctShape,
            spine: &OcctShape,
            with_contact: bool,
            with_correction: bool,
        ) -> UniquePtr<OcctShape>;

        // ============================================================
        // WIRE/SKETCH OPERATIONS
        // ============================================================

        /// Create a line edge
        fn make_line(x1: f64, y1: f64, z1: f64, x2: f64, y2: f64, z2: f64) -> UniquePtr<OcctShape>;

        /// Create a circular edge
        fn make_circle(
            cx: f64,
            cy: f64,
            cz: f64,
            nx: f64,
            ny: f64,
            nz: f64,
            radius: f64,
        ) -> UniquePtr<OcctShape>;

        /// Create an arc (start angle to end angle in radians)
        fn make_arc(
            cx: f64,
            cy: f64,
            cz: f64,
            nx: f64,
            ny: f64,
            nz: f64,
            radius: f64,
            start_angle: f64,
            end_angle: f64,
        ) -> UniquePtr<OcctShape>;

        /// Create a rectangle wire
        fn make_rectangle(x: f64, y: f64, width: f64, height: f64) -> UniquePtr<OcctShape>;

        /// Create a face from a closed wire
        fn make_face_from_wire(wire: &OcctShape) -> UniquePtr<OcctShape>;

        /// Combine edges into a wire
        fn make_wire_from_edges(edges: &[*const OcctShape], count: usize) -> UniquePtr<OcctShape>;

        /// Create a closed polygon wire from 2D points (XY plane)
        fn make_polygon_wire(points: &[Vertex]) -> UniquePtr<OcctShape>;

        /// Create a closed polygon wire from 3D points
        fn make_polygon_wire_3d(points: &[Vertex]) -> UniquePtr<OcctShape>;

        /// Create an ellipse edge
        fn make_ellipse(
            cx: f64,
            cy: f64,
            cz: f64,
            nx: f64,
            ny: f64,
            nz: f64,
            major_radius: f64,
            minor_radius: f64,
            rotation: f64,
        ) -> UniquePtr<OcctShape>;

        /// Create an arc through 3 points
        fn make_arc_3_points(
            x1: f64,
            y1: f64,
            z1: f64,
            x2: f64,
            y2: f64,
            z2: f64,
            x3: f64,
            y3: f64,
            z3: f64,
        ) -> UniquePtr<OcctShape>;

        /// Create a B-spline curve interpolating through points
        fn make_bspline_interpolate(points: &[Vertex], closed: bool) -> UniquePtr<OcctShape>;

        /// Create a Bezier curve from control points
        fn make_bezier(control_points: &[Vertex]) -> UniquePtr<OcctShape>;

        // ============================================================
        // TESSELLATION
        // ============================================================

        /// Tessellate shape to triangular mesh
        fn tessellate(shape: &OcctShape, deflection: f64) -> MeshResult;

        /// Tessellate with angular control
        fn tessellate_with_angle(shape: &OcctShape, deflection: f64, angle: f64) -> MeshResult;

        // ============================================================
        // BREP I/O
        // ============================================================

        /// Write shape to BRep byte array (for in-memory storage)
        fn write_brep(shape: &OcctShape) -> Vec<u8>;

        /// Read shape from BRep byte array
        fn read_brep(data: &[u8]) -> UniquePtr<OcctShape>;

        /// Write shape to BRep file
        fn write_brep_file(shape: &OcctShape, filename: &str) -> bool;

        /// Read shape from BRep file
        fn read_brep_file(filename: &str) -> UniquePtr<OcctShape>;

        // ============================================================
        // STEP/IGES I/O
        // ============================================================

        /// Read STEP file and return shape
        fn read_step(filename: &str) -> UniquePtr<OcctShape>;

        /// Write shape to STEP file
        fn write_step(shape: &OcctShape, filename: &str) -> bool;

        /// Read IGES file and return shape
        fn read_iges(filename: &str) -> UniquePtr<OcctShape>;

        /// Write shape to IGES file
        fn write_iges(shape: &OcctShape, filename: &str) -> bool;

        // ============================================================
        // MODERN FORMAT EXPORT (glTF, OBJ, STL, PLY)
        // ============================================================

        /// Write shape to glTF file (text format)
        fn write_gltf(shape: &OcctShape, filename: &str, deflection: f64) -> bool;

        /// Write shape to GLB file (binary glTF)
        fn write_glb(shape: &OcctShape, filename: &str, deflection: f64) -> bool;

        /// Write shape to OBJ file
        fn write_obj(shape: &OcctShape, filename: &str, deflection: f64) -> bool;

        /// Write shape to STL file (ASCII)
        fn write_stl(shape: &OcctShape, filename: &str, deflection: f64) -> bool;

        /// Write shape to STL file (binary)
        fn write_stl_binary(shape: &OcctShape, filename: &str, deflection: f64) -> bool;

        /// Write shape to PLY file
        fn write_ply(shape: &OcctShape, filename: &str, deflection: f64) -> bool;

        // ============================================================
        // SHAPE ANALYSIS & VALIDATION
        // ============================================================

        /// Analyze shape and return detailed diagnostics
        fn analyze_shape(shape: &OcctShape) -> ShapeAnalysisResult;

        /// Check if shape has valid topology
        fn check_shape_validity(shape: &OcctShape) -> bool;

        /// Get shape tolerance
        fn get_shape_tolerance(shape: &OcctShape) -> f64;

        /// Fix shape with advanced healing options
        fn fix_shape_advanced(
            shape: &OcctShape,
            fix_small_faces: bool,
            fix_small_edges: bool,
            fix_degenerated: bool,
            fix_self_intersection: bool,
            tolerance: f64,
        ) -> UniquePtr<OcctShape>;

        // ============================================================
        // ADVANCED DISTANCE MEASUREMENT
        // ============================================================

        /// Calculate minimum distance between two shapes with detailed results
        fn compute_minimum_distance(shape1: &OcctShape, shape2: &OcctShape) -> DistanceResult;

        /// Calculate distance from a point to a shape
        fn compute_point_to_shape_distance(
            px: f64,
            py: f64,
            pz: f64,
            shape: &OcctShape,
        ) -> DistanceResult;

        // ============================================================
        // MEASUREMENT/PROPERTIES
        // ============================================================

        /// Get bounding box of shape
        fn get_bounding_box(shape: &OcctShape) -> BoundingBoxResult;

        /// Get shape properties (volume, surface area, center of mass)
        fn get_shape_properties(shape: &OcctShape) -> ShapeProperties;

        /// Calculate distance between two points on shapes
        fn measure_distance(shape1: &OcctShape, shape2: &OcctShape) -> f64;

        /// Get all edges as EdgeInfo for dimensioning
        fn get_edges(shape: &OcctShape) -> Vec<EdgeInfo>;

        // ============================================================
        // SHAPE UTILITIES
        // ============================================================

        /// Check if shape is valid
        fn is_valid(shape: &OcctShape) -> bool;

        /// Check if shape is null
        fn is_null(shape: &OcctShape) -> bool;

        /// Clone a shape
        fn clone_shape(shape: &OcctShape) -> UniquePtr<OcctShape>;

        /// Fix shape (healing)
        fn fix_shape(shape: &OcctShape) -> UniquePtr<OcctShape>;

        /// Get shape type (0=compound, 1=compsolid, 2=solid, 3=shell, 4=face, 5=wire, 6=edge, 7=vertex)
        fn get_shape_type(shape: &OcctShape) -> i32;

        // ============================================================
        // HLR PROJECTION (2D Technical Drawings)
        // ============================================================

        /// Compute Hidden Line Removal projection of a shape
        /// Returns lines classified by visibility and type
        fn compute_hlr_projection(
            shape: &OcctShape,
            dir_x: f64,
            dir_y: f64,
            dir_z: f64,
            up_x: f64,
            up_y: f64,
            up_z: f64,
            scale: f64,
        ) -> HLRProjectionResult;

        /// Compute Hidden Line Removal projection with full curve support
        /// Returns curves (lines, arcs, circles) and polylines for complex curves
        /// deflection: controls curve tessellation quality (smaller = more points, 0.01 recommended)
        fn compute_hlr_projection_v2(
            shape: &OcctShape,
            dir_x: f64,
            dir_y: f64,
            dir_z: f64,
            up_x: f64,
            up_y: f64,
            up_z: f64,
            scale: f64,
            deflection: f64,
        ) -> HLRProjectionResultV2;

        /// Compute a section cut of a shape with a plane
        fn compute_section(
            shape: &OcctShape,
            origin_x: f64,
            origin_y: f64,
            origin_z: f64,
            normal_x: f64,
            normal_y: f64,
            normal_z: f64,
        ) -> UniquePtr<OcctShape>;

        /// Compute a section cut with hatching for technical drawings
        /// Returns section curves and hatch lines for closed regions
        fn compute_section_with_hatch(
            shape: &OcctShape,
            origin_x: f64,
            origin_y: f64,
            origin_z: f64,
            normal_x: f64,
            normal_y: f64,
            normal_z: f64,
            up_x: f64,
            up_y: f64,
            up_z: f64,
            hatch_angle: f64,
            hatch_spacing: f64,
        ) -> SectionWithHatchResult;

        // ============================================================
        // TOPOLOGY EXTRACTION FOR INTERACTIVE SELECTION
        // ============================================================

        /// Extract all topological vertices from the shape
        fn get_topology_vertices(shape: &OcctShape) -> Vec<VertexInfo>;

        /// Tessellate all edges for wireframe rendering
        /// deflection: controls curve approximation quality (smaller = more points)
        fn tessellate_edges(shape: &OcctShape, deflection: f64) -> Vec<EdgeTessellation>;

        /// Get complete topology with adjacency information
        /// This is the most comprehensive function for selection support
        fn get_full_topology(shape: &OcctShape, edge_deflection: f64) -> TopologyResult;

        // ============================================================
        // EXPLODE/IMPLODE VIEW OPERATIONS
        // ============================================================

        /// Explode a shape into its sub-components with offset vectors
        /// shape: the shape to explode
        /// level: 0=solids, 1=shells, 2=faces
        /// distance: how far to move parts from center
        /// deflection: tessellation quality
        fn explode_shape(
            shape: &OcctShape,
            level: i32,
            distance: f64,
            deflection: f64,
        ) -> ExplodeResult;

        /// Get shape components without offset (for analysis)
        fn get_shape_components(
            shape: &OcctShape,
            level: i32,
            deflection: f64,
        ) -> Vec<ExplodedPart>;

        /// Count the number of sub-components at a given level
        fn count_shape_components(shape: &OcctShape, level: i32) -> i32;
    }
}
