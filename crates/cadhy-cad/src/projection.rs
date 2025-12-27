//! 2D Projection and Hidden Line Removal (HLR) module
//!
//! This module provides functionality for generating 2D technical drawings
//! from 3D shapes using OpenCASCADE's HLR (Hidden Line Removal) algorithms.
//!
//! # Features
//!
//! - Multiple projection types (Top, Front, Right, Isometric, etc.)
//! - Separation of visible and hidden lines
//! - Edge type classification (sharp, smooth, outline)
//!
//! # Example
//!
//! ```no_run
//! use cadhy_cad::{Shape, Primitives, projection::*};
//!
//! let box_shape = Primitives::make_box(10.0, 20.0, 30.0).unwrap();
//! let result = project_shape(&box_shape, ProjectionType::Top, 1.0).unwrap();
//! ```

use crate::{OcctError, OcctResult, Shape};
use serde::{Deserialize, Serialize};

/// Type of projection view
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum ProjectionType {
    /// Top view (plan) - looking down Z axis
    Top,
    /// Bottom view - looking up Z axis
    Bottom,
    /// Front view (elevation) - looking along -Y axis
    Front,
    /// Back view - looking along +Y axis
    Back,
    /// Right side view - looking along -X axis
    Right,
    /// Left side view - looking along +X axis
    Left,
    /// Isometric view (default SW orientation for backwards compatibility)
    Isometric,
    /// Isometric SW - looking from (+X, +Y, +Z) toward origin (front-right view)
    IsometricSW,
    /// Isometric SE - looking from (-X, +Y, +Z) toward origin (front-left view)
    IsometricSE,
    /// Isometric NE - looking from (-X, -Y, +Z) toward origin (back-left view)
    IsometricNE,
    /// Isometric NW - looking from (+X, -Y, +Z) toward origin (back-right view)
    IsometricNW,
    /// Custom view direction
    Custom { direction: [f64; 3], up: [f64; 3] },
}

impl ProjectionType {
    /// Get the view direction and up vector for this projection type
    pub fn get_vectors(&self) -> ([f64; 3], [f64; 3]) {
        match self {
            ProjectionType::Top => ([0.0, 0.0, -1.0], [0.0, 1.0, 0.0]),
            ProjectionType::Bottom => ([0.0, 0.0, 1.0], [0.0, 1.0, 0.0]),
            ProjectionType::Front => ([0.0, -1.0, 0.0], [0.0, 0.0, 1.0]),
            ProjectionType::Back => ([0.0, 1.0, 0.0], [0.0, 0.0, 1.0]),
            ProjectionType::Right => ([-1.0, 0.0, 0.0], [0.0, 0.0, 1.0]),
            ProjectionType::Left => ([1.0, 0.0, 0.0], [0.0, 0.0, 1.0]),
            ProjectionType::Isometric | ProjectionType::IsometricSW => {
                // Isometric SW: looking from (+X, +Y, +Z) toward origin (front-right view)
                // Direction vector: normalized (-1, -1, -1)
                let inv_sqrt3 = 1.0 / 3.0_f64.sqrt();
                // Up vector keeps Z pointing "up" on screen
                let inv_sqrt6 = 1.0 / 6.0_f64.sqrt();
                (
                    [-inv_sqrt3, -inv_sqrt3, -inv_sqrt3],
                    [-inv_sqrt6, -inv_sqrt6, 2.0 * inv_sqrt6],
                )
            }
            ProjectionType::IsometricSE => {
                // Isometric SE: looking from (-X, +Y, +Z) toward origin (front-left view)
                // Direction vector: normalized (+1, -1, -1)
                let inv_sqrt3 = 1.0 / 3.0_f64.sqrt();
                let inv_sqrt6 = 1.0 / 6.0_f64.sqrt();
                (
                    [inv_sqrt3, -inv_sqrt3, -inv_sqrt3],
                    [inv_sqrt6, -inv_sqrt6, 2.0 * inv_sqrt6],
                )
            }
            ProjectionType::IsometricNE => {
                // Isometric NE: looking from (-X, -Y, +Z) toward origin (back-left view)
                // Direction vector: normalized (+1, +1, -1)
                let inv_sqrt3 = 1.0 / 3.0_f64.sqrt();
                let inv_sqrt6 = 1.0 / 6.0_f64.sqrt();
                (
                    [inv_sqrt3, inv_sqrt3, -inv_sqrt3],
                    [inv_sqrt6, inv_sqrt6, 2.0 * inv_sqrt6],
                )
            }
            ProjectionType::IsometricNW => {
                // Isometric NW: looking from (+X, -Y, +Z) toward origin (back-right view)
                // Direction vector: normalized (-1, +1, -1)
                let inv_sqrt3 = 1.0 / 3.0_f64.sqrt();
                let inv_sqrt6 = 1.0 / 6.0_f64.sqrt();
                (
                    [-inv_sqrt3, inv_sqrt3, -inv_sqrt3],
                    [-inv_sqrt6, inv_sqrt6, 2.0 * inv_sqrt6],
                )
            }
            ProjectionType::Custom { direction, up } => (*direction, *up),
        }
    }

    /// Get a human-readable label for this view
    pub fn label(&self) -> &'static str {
        match self {
            ProjectionType::Top => "PLANTA",
            ProjectionType::Bottom => "INFERIOR",
            ProjectionType::Front => "ALZADO",
            ProjectionType::Back => "POSTERIOR",
            ProjectionType::Right => "PERFIL DERECHO",
            ProjectionType::Left => "PERFIL IZQUIERDO",
            ProjectionType::Isometric | ProjectionType::IsometricSW => "ISOMÉTRICA SW",
            ProjectionType::IsometricSE => "ISOMÉTRICA SE",
            ProjectionType::IsometricNE => "ISOMÉTRICA NE",
            ProjectionType::IsometricNW => "ISOMÉTRICA NW",
            ProjectionType::Custom { .. } => "PERSONALIZADA",
        }
    }

    /// Check if this is an isometric projection type
    pub fn is_isometric(&self) -> bool {
        matches!(
            self,
            ProjectionType::Isometric
                | ProjectionType::IsometricSW
                | ProjectionType::IsometricSE
                | ProjectionType::IsometricNE
                | ProjectionType::IsometricNW
        )
    }
}

/// Type of line in the 2D projection
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LineType {
    /// Visible sharp edge (continuous line)
    VisibleSharp,
    /// Hidden sharp edge (dashed line)
    HiddenSharp,
    /// Visible smooth transition edge
    VisibleSmooth,
    /// Hidden smooth transition edge
    HiddenSmooth,
    /// Visible outline/silhouette
    VisibleOutline,
    /// Hidden outline
    HiddenOutline,
    /// Section cut line
    SectionCut,
    /// Center/axis line (chain line)
    Centerline,
}

impl LineType {
    /// Whether this line type should be visible (not hidden)
    pub fn is_visible(&self) -> bool {
        matches!(
            self,
            LineType::VisibleSharp
                | LineType::VisibleSmooth
                | LineType::VisibleOutline
                | LineType::SectionCut
                | LineType::Centerline
        )
    }

    /// Get SVG dash array for this line type
    pub fn svg_dash_array(&self) -> Option<&'static str> {
        match self {
            LineType::HiddenSharp | LineType::HiddenSmooth | LineType::HiddenOutline => Some("4,2"),
            // Dash-dot pattern for centerlines
            LineType::Centerline => Some("6,2,1,2"),
            _ => None,
        }
    }

    /// Get recommended stroke width for this line type (in mm)
    pub fn stroke_width(&self) -> f64 {
        match self {
            LineType::VisibleSharp | LineType::SectionCut => 0.5,
            LineType::VisibleOutline => 0.7,
            LineType::HiddenSharp => 0.25,
            LineType::VisibleSmooth | LineType::HiddenSmooth | LineType::HiddenOutline => 0.35,
            LineType::Centerline => 0.18,
        }
    }
}

/// A 2D point
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point2D {
    pub x: f64,
    pub y: f64,
}

impl Point2D {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    pub fn distance_to(&self, other: &Point2D) -> f64 {
        ((self.x - other.x).powi(2) + (self.y - other.y).powi(2)).sqrt()
    }
}

/// A 2D line segment in the projection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Line2D {
    /// Start point
    pub start: Point2D,
    /// End point
    pub end: Point2D,
    /// Type of line
    pub line_type: LineType,
}

impl Line2D {
    pub fn new(start: Point2D, end: Point2D, line_type: LineType) -> Self {
        Self {
            start,
            end,
            line_type,
        }
    }

    /// Length of the line segment
    pub fn length(&self) -> f64 {
        self.start.distance_to(&self.end)
    }

    /// Check if this is a degenerate (zero-length) line
    pub fn is_degenerate(&self, tolerance: f64) -> bool {
        self.length() < tolerance
    }

    /// Get the midpoint of the line
    pub fn midpoint(&self) -> Point2D {
        Point2D::new(
            (self.start.x + self.end.x) / 2.0,
            (self.start.y + self.end.y) / 2.0,
        )
    }
}

// ============================================================
// ENHANCED CURVE TYPES FOR V2 PROJECTION
// ============================================================

/// Type of 2D curve in the enhanced projection
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Curve2DType {
    /// Straight line segment
    Line,
    /// Circular arc
    Arc,
    /// Full circle
    Circle,
    /// Ellipse or elliptical arc
    Ellipse,
    /// Complex curve (BSpline, etc.) - tessellated as polyline
    Spline,
}

impl Curve2DType {
    /// Convert from FFI integer to Curve2DType
    pub fn from_ffi(value: i32) -> Self {
        match value {
            0 => Curve2DType::Line,
            1 => Curve2DType::Arc,
            2 => Curve2DType::Circle,
            3 => Curve2DType::Ellipse,
            _ => Curve2DType::Spline,
        }
    }
}

/// A 2D arc in the projection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Arc2D {
    /// Center point
    pub center: Point2D,
    /// Radius
    pub radius: f64,
    /// Start angle in radians
    pub start_angle: f64,
    /// End angle in radians
    pub end_angle: f64,
    /// Counter-clockwise direction
    pub ccw: bool,
    /// Start point (for convenience)
    pub start: Point2D,
    /// End point (for convenience)
    pub end: Point2D,
    /// Type of line (visibility)
    pub line_type: LineType,
}

impl Arc2D {
    /// Calculate arc length
    pub fn arc_length(&self) -> f64 {
        let angle_span = if self.ccw {
            if self.end_angle > self.start_angle {
                self.end_angle - self.start_angle
            } else {
                (2.0 * std::f64::consts::PI) - (self.start_angle - self.end_angle)
            }
        } else if self.start_angle > self.end_angle {
            self.start_angle - self.end_angle
        } else {
            (2.0 * std::f64::consts::PI) - (self.end_angle - self.start_angle)
        };
        self.radius * angle_span.abs()
    }

    /// Check if this is a full circle
    pub fn is_full_circle(&self) -> bool {
        let angle_span = (self.end_angle - self.start_angle).abs();
        angle_span >= 2.0 * std::f64::consts::PI - 0.001
    }

    /// Generate SVG arc path data
    /// Returns the "A" command parameters for SVG path
    pub fn to_svg_arc_params(&self) -> String {
        let large_arc = if (self.end_angle - self.start_angle).abs() > std::f64::consts::PI {
            1
        } else {
            0
        };
        let sweep = if self.ccw { 1 } else { 0 };
        format!(
            "A {} {} 0 {} {} {} {}",
            self.radius, self.radius, large_arc, sweep, self.end.x, -self.end.y
        )
    }
}

/// A 2D ellipse or elliptical arc in the projection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ellipse2D {
    /// Center point
    pub center: Point2D,
    /// Major radius (semi-major axis)
    pub major_radius: f64,
    /// Minor radius (semi-minor axis)
    pub minor_radius: f64,
    /// Rotation angle of major axis from X (radians)
    pub rotation: f64,
    /// Start angle in radians (for arcs)
    pub start_angle: f64,
    /// End angle in radians (for arcs)
    pub end_angle: f64,
    /// Counter-clockwise direction
    pub ccw: bool,
    /// Start point
    pub start: Point2D,
    /// End point
    pub end: Point2D,
    /// Type of line (visibility)
    pub line_type: LineType,
}

/// A polyline (tessellated complex curve) in the projection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Polyline2D {
    /// Points forming the polyline
    pub points: Vec<Point2D>,
    /// Type of line (visibility)
    pub line_type: LineType,
}

impl Polyline2D {
    /// Total length of the polyline
    pub fn length(&self) -> f64 {
        if self.points.len() < 2 {
            return 0.0;
        }
        self.points
            .windows(2)
            .map(|w| w[0].distance_to(&w[1]))
            .sum()
    }

    /// Generate SVG path data for the polyline
    pub fn to_svg_path(&self) -> String {
        if self.points.is_empty() {
            return String::new();
        }
        let mut path = format!("M {} {}", self.points[0].x, -self.points[0].y);
        for p in &self.points[1..] {
            path.push_str(&format!(" L {} {}", p.x, -p.y));
        }
        path
    }
}

/// A generic 2D curve that can be any type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Curve2D {
    Line(Line2D),
    Arc(Arc2D),
    Ellipse(Ellipse2D),
    Polyline(Polyline2D),
}

impl Curve2D {
    /// Get the line type (visibility) of this curve
    pub fn line_type(&self) -> LineType {
        match self {
            Curve2D::Line(l) => l.line_type,
            Curve2D::Arc(a) => a.line_type,
            Curve2D::Ellipse(e) => e.line_type,
            Curve2D::Polyline(p) => p.line_type,
        }
    }

    /// Check if this curve is visible
    pub fn is_visible(&self) -> bool {
        self.line_type().is_visible()
    }

    /// Get the curve type
    pub fn curve_type(&self) -> Curve2DType {
        match self {
            Curve2D::Line(_) => Curve2DType::Line,
            Curve2D::Arc(_) => Curve2DType::Arc,
            Curve2D::Ellipse(_) => Curve2DType::Ellipse,
            Curve2D::Polyline(_) => Curve2DType::Spline,
        }
    }
}

/// Enhanced projection result with curve support (V2)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectionResultV2 {
    /// All curves in the projection (lines, arcs, polylines)
    pub curves: Vec<Curve2D>,
    /// Bounding box of the projection
    pub bounding_box: BoundingBox2D,
    /// Scale factor used
    pub scale: f64,
    /// Type of view
    pub view_type: ProjectionType,
    /// Label for the view
    pub label: String,
    /// Statistics: number of lines
    pub num_lines: i32,
    /// Statistics: number of arcs/circles
    pub num_arcs: i32,
    /// Statistics: number of polylines
    pub num_polylines: i32,
}

impl ProjectionResultV2 {
    /// Get only visible curves
    pub fn visible_curves(&self) -> Vec<&Curve2D> {
        self.curves.iter().filter(|c| c.is_visible()).collect()
    }

    /// Get only hidden curves
    pub fn hidden_curves(&self) -> Vec<&Curve2D> {
        self.curves.iter().filter(|c| !c.is_visible()).collect()
    }

    /// Get curves by line type
    pub fn curves_by_line_type(&self, line_type: LineType) -> Vec<&Curve2D> {
        self.curves
            .iter()
            .filter(|c| c.line_type() == line_type)
            .collect()
    }

    /// Get curves by curve type
    pub fn curves_by_type(&self, curve_type: Curve2DType) -> Vec<&Curve2D> {
        self.curves
            .iter()
            .filter(|c| c.curve_type() == curve_type)
            .collect()
    }

    /// Convert to legacy ProjectionResult (lines only, arcs become line segments)
    pub fn to_legacy(&self) -> ProjectionResult {
        let mut lines = Vec::new();
        for curve in &self.curves {
            match curve {
                Curve2D::Line(l) => lines.push(l.clone()),
                Curve2D::Arc(a) => {
                    // Convert arc to line from start to end
                    lines.push(Line2D::new(a.start, a.end, a.line_type));
                }
                Curve2D::Ellipse(e) => {
                    lines.push(Line2D::new(e.start, e.end, e.line_type));
                }
                Curve2D::Polyline(p) => {
                    // Convert polyline to line segments
                    for window in p.points.windows(2) {
                        lines.push(Line2D::new(window[0], window[1], p.line_type));
                    }
                }
            }
        }
        ProjectionResult {
            lines,
            bounding_box: self.bounding_box,
            scale: self.scale,
            view_type: self.view_type,
            label: self.label.clone(),
        }
    }
}

/// 2D bounding box
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BoundingBox2D {
    pub min: Point2D,
    pub max: Point2D,
}

impl BoundingBox2D {
    pub fn new(min: Point2D, max: Point2D) -> Self {
        Self { min, max }
    }

    pub fn from_points(points: &[Point2D]) -> Option<Self> {
        if points.is_empty() {
            return None;
        }

        let mut min_x = f64::MAX;
        let mut min_y = f64::MAX;
        let mut max_x = f64::MIN;
        let mut max_y = f64::MIN;

        for p in points {
            min_x = min_x.min(p.x);
            min_y = min_y.min(p.y);
            max_x = max_x.max(p.x);
            max_y = max_y.max(p.y);
        }

        Some(Self {
            min: Point2D::new(min_x, min_y),
            max: Point2D::new(max_x, max_y),
        })
    }

    pub fn width(&self) -> f64 {
        self.max.x - self.min.x
    }

    pub fn height(&self) -> f64 {
        self.max.y - self.min.y
    }

    pub fn center(&self) -> Point2D {
        Point2D::new(
            (self.min.x + self.max.x) / 2.0,
            (self.min.y + self.max.y) / 2.0,
        )
    }

    /// Expand the bounding box by a margin
    pub fn expand(&self, margin: f64) -> Self {
        Self {
            min: Point2D::new(self.min.x - margin, self.min.y - margin),
            max: Point2D::new(self.max.x + margin, self.max.y + margin),
        }
    }
}

/// Result of a 2D projection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectionResult {
    /// All line segments in the projection
    pub lines: Vec<Line2D>,
    /// Bounding box of the projection
    pub bounding_box: BoundingBox2D,
    /// Scale factor used
    pub scale: f64,
    /// Type of view
    pub view_type: ProjectionType,
    /// Label for the view
    pub label: String,
}

impl ProjectionResult {
    /// Get only visible lines
    pub fn visible_lines(&self) -> Vec<&Line2D> {
        self.lines
            .iter()
            .filter(|l| l.line_type.is_visible())
            .collect()
    }

    /// Get only hidden lines
    pub fn hidden_lines(&self) -> Vec<&Line2D> {
        self.lines
            .iter()
            .filter(|l| !l.line_type.is_visible())
            .collect()
    }

    /// Get lines by type
    pub fn lines_by_type(&self, line_type: LineType) -> Vec<&Line2D> {
        self.lines
            .iter()
            .filter(|l| l.line_type == line_type)
            .collect()
    }

    /// Calculate the bounding box from the lines
    pub fn recalculate_bounding_box(&mut self) {
        let points: Vec<Point2D> = self
            .lines
            .iter()
            .flat_map(|l| vec![l.start, l.end])
            .collect();

        if let Some(bbox) = BoundingBox2D::from_points(&points) {
            self.bounding_box = bbox;
        }
    }
}

/// Project a 3D shape to 2D using Hidden Line Removal
///
/// # Arguments
///
/// * `shape` - The 3D shape to project
/// * `view_type` - The type of projection view
/// * `scale` - Scale factor for the output (1.0 = 1:1)
///
/// # Returns
///
/// A `ProjectionResult` containing all 2D lines and metadata
pub fn project_shape(
    shape: &Shape,
    view_type: ProjectionType,
    scale: f64,
) -> OcctResult<ProjectionResult> {
    use crate::ffi::ffi;

    let (direction, up) = view_type.get_vectors();

    eprintln!(
        "[projection.rs] project_shape: view={:?}, direction={:?}, up={:?}, scale={}",
        view_type.label(),
        direction,
        up,
        scale
    );

    // Call the FFI function
    let result = ffi::compute_hlr_projection(
        shape.inner(),
        direction[0],
        direction[1],
        direction[2],
        up[0],
        up[1],
        up[2],
        scale,
    );

    eprintln!(
        "[projection.rs] HLR result: {} lines, bbox=({:.2},{:.2})-({:.2},{:.2})",
        result.lines.len(),
        result.min_x,
        result.min_y,
        result.max_x,
        result.max_y
    );

    // Check for empty result - the C++ layer now has a bounding box fallback,
    // so this should only happen if the shape is completely empty
    if result.lines.is_empty() {
        eprintln!("[projection.rs] WARNING: HLR projection produced no lines even with fallback");
        return Err(OcctError::OperationFailed(
            "HLR projection produced no lines - shape may be empty or invalid".to_string(),
        ));
    }

    // Convert FFI result to Rust types
    let mut lines = Vec::with_capacity(result.lines.len());
    for ffi_line in result.lines.iter() {
        let line_type = match ffi_line.line_type {
            0 => LineType::VisibleSharp,
            1 => LineType::HiddenSharp,
            2 => LineType::VisibleSmooth,
            3 => LineType::HiddenSmooth,
            4 => LineType::VisibleOutline,
            5 => LineType::HiddenOutline,
            6 => LineType::Centerline,
            _ => LineType::VisibleSharp,
        };

        lines.push(Line2D {
            start: Point2D::new(ffi_line.start_x, ffi_line.start_y),
            end: Point2D::new(ffi_line.end_x, ffi_line.end_y),
            line_type,
        });
    }

    let bounding_box = BoundingBox2D {
        min: Point2D::new(result.min_x, result.min_y),
        max: Point2D::new(result.max_x, result.max_y),
    };

    eprintln!(
        "[projection.rs] SUCCESS: Generated {} projection lines",
        lines.len()
    );

    Ok(ProjectionResult {
        lines,
        bounding_box,
        scale,
        view_type,
        label: view_type.label().to_string(),
    })
}

/// Generate multiple standard views of a shape
///
/// Returns projections for: Top, Front, Right, and Isometric views
pub fn generate_standard_views(shape: &Shape, scale: f64) -> OcctResult<Vec<ProjectionResult>> {
    let view_types = [
        ProjectionType::Top,
        ProjectionType::Front,
        ProjectionType::Right,
        ProjectionType::Isometric,
    ];

    let mut results = Vec::with_capacity(4);
    for view_type in view_types {
        results.push(project_shape(shape, view_type, scale)?);
    }

    Ok(results)
}

/// Project a 3D shape to 2D with full curve support (V2)
///
/// This enhanced version extracts circles, arcs, and ellipses as proper curves
/// instead of converting everything to line segments.
///
/// # Arguments
///
/// * `shape` - The 3D shape to project
/// * `view_type` - The type of projection view
/// * `scale` - Scale factor for the output (1.0 = 1:1)
/// * `deflection` - Curve tessellation quality (0.01 recommended, smaller = smoother)
///
/// # Returns
///
/// A `ProjectionResultV2` containing curves, arcs, and metadata
pub fn project_shape_v2(
    shape: &Shape,
    view_type: ProjectionType,
    scale: f64,
    deflection: f64,
) -> OcctResult<ProjectionResultV2> {
    use crate::ffi::ffi;

    let (direction, up) = view_type.get_vectors();

    eprintln!(
        "[projection.rs] project_shape_v2: view={:?}, deflection={}",
        view_type.label(),
        deflection
    );

    // Call the V2 FFI function
    let result = ffi::compute_hlr_projection_v2(
        shape.inner(),
        direction[0],
        direction[1],
        direction[2],
        up[0],
        up[1],
        up[2],
        scale,
        deflection,
    );

    eprintln!(
        "[projection.rs] HLR-V2 result: {} curves, {} polylines, bbox=({:.2},{:.2})-({:.2},{:.2})",
        result.curves.len(),
        result.polylines.len(),
        result.min_x,
        result.min_y,
        result.max_x,
        result.max_y
    );

    // Check for empty result
    if result.curves.is_empty() && result.polylines.is_empty() {
        return Err(OcctError::OperationFailed(
            "HLR-V2 projection produced no curves - shape may be empty or invalid".to_string(),
        ));
    }

    // Helper to convert FFI line_type to LineType
    let to_line_type = |lt: i32| -> LineType {
        match lt {
            0 => LineType::VisibleSharp,
            1 => LineType::HiddenSharp,
            2 => LineType::VisibleSmooth,
            3 => LineType::HiddenSmooth,
            4 => LineType::VisibleOutline,
            5 => LineType::HiddenOutline,
            _ => LineType::VisibleSharp,
        }
    };

    // Convert FFI curves to Rust types
    let mut curves = Vec::with_capacity(result.curves.len() + result.polylines.len());

    for ffi_curve in result.curves.iter() {
        let line_type = to_line_type(ffi_curve.line_type);
        let curve_type = Curve2DType::from_ffi(ffi_curve.curve_type);

        match curve_type {
            Curve2DType::Line => {
                curves.push(Curve2D::Line(Line2D {
                    start: Point2D::new(ffi_curve.start_x, ffi_curve.start_y),
                    end: Point2D::new(ffi_curve.end_x, ffi_curve.end_y),
                    line_type,
                }));
            }
            Curve2DType::Arc | Curve2DType::Circle => {
                curves.push(Curve2D::Arc(Arc2D {
                    center: Point2D::new(ffi_curve.center_x, ffi_curve.center_y),
                    radius: ffi_curve.radius,
                    start_angle: ffi_curve.start_angle,
                    end_angle: ffi_curve.end_angle,
                    ccw: ffi_curve.ccw,
                    start: Point2D::new(ffi_curve.start_x, ffi_curve.start_y),
                    end: Point2D::new(ffi_curve.end_x, ffi_curve.end_y),
                    line_type,
                }));
            }
            Curve2DType::Ellipse => {
                curves.push(Curve2D::Ellipse(Ellipse2D {
                    center: Point2D::new(ffi_curve.center_x, ffi_curve.center_y),
                    major_radius: ffi_curve.major_radius,
                    minor_radius: ffi_curve.minor_radius,
                    rotation: ffi_curve.rotation,
                    start_angle: ffi_curve.start_angle,
                    end_angle: ffi_curve.end_angle,
                    ccw: ffi_curve.ccw,
                    start: Point2D::new(ffi_curve.start_x, ffi_curve.start_y),
                    end: Point2D::new(ffi_curve.end_x, ffi_curve.end_y),
                    line_type,
                }));
            }
            Curve2DType::Spline => {
                // This shouldn't happen for simple curves, but handle it
                curves.push(Curve2D::Line(Line2D {
                    start: Point2D::new(ffi_curve.start_x, ffi_curve.start_y),
                    end: Point2D::new(ffi_curve.end_x, ffi_curve.end_y),
                    line_type,
                }));
            }
        }
    }

    // Convert FFI polylines to Rust types
    for ffi_polyline in result.polylines.iter() {
        let line_type = to_line_type(ffi_polyline.line_type);
        let points: Vec<Point2D> = ffi_polyline
            .points
            .iter()
            .map(|p| Point2D::new(p.x, p.y))
            .collect();

        if points.len() >= 2 {
            curves.push(Curve2D::Polyline(Polyline2D { points, line_type }));
        }
    }

    let bounding_box = BoundingBox2D {
        min: Point2D::new(result.min_x, result.min_y),
        max: Point2D::new(result.max_x, result.max_y),
    };

    eprintln!(
        "[projection.rs] SUCCESS: Generated {} curves ({} lines, {} arcs, {} polylines)",
        curves.len(),
        result.num_lines,
        result.num_arcs,
        result.num_polylines
    );

    Ok(ProjectionResultV2 {
        curves,
        bounding_box,
        scale,
        view_type,
        label: view_type.label().to_string(),
        num_lines: result.num_lines,
        num_arcs: result.num_arcs,
        num_polylines: result.num_polylines,
    })
}

/// Generate multiple standard views with curve support (V2)
///
/// Returns projections for: Top, Front, Right, and Isometric views
pub fn generate_standard_views_v2(
    shape: &Shape,
    scale: f64,
    deflection: f64,
) -> OcctResult<Vec<ProjectionResultV2>> {
    let view_types = [
        ProjectionType::Top,
        ProjectionType::Front,
        ProjectionType::Right,
        ProjectionType::Isometric,
    ];

    let mut results = Vec::with_capacity(4);
    for view_type in view_types {
        results.push(project_shape_v2(shape, view_type, scale, deflection)?);
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_projection_type_vectors() {
        let (dir, up) = ProjectionType::Top.get_vectors();
        assert!((dir[2] - (-1.0)).abs() < 1e-10);
        assert!((up[1] - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_line_type_visibility() {
        assert!(LineType::VisibleSharp.is_visible());
        assert!(!LineType::HiddenSharp.is_visible());
    }

    #[test]
    fn test_bounding_box() {
        let points = vec![
            Point2D::new(0.0, 0.0),
            Point2D::new(10.0, 5.0),
            Point2D::new(-5.0, 20.0),
        ];
        let bbox = BoundingBox2D::from_points(&points).unwrap();
        assert!((bbox.min.x - (-5.0)).abs() < 1e-10);
        assert!((bbox.max.y - 20.0).abs() < 1e-10);
    }
}
