//! Section and cutting plane module
//!
//! This module provides functionality for creating section views of 3D shapes
//! by cutting them with planes, similar to how architectural sections work.
//!
//! # Features
//!
//! - Define cutting planes (horizontal, vertical, custom)
//! - Generate section curves
//! - Support for hatching patterns
//!
//! # Example
//!
//! ```no_run
//! use cadhy_cad::{Shape, Primitives, section::*};
//!
//! let box_shape = Primitives::make_box(10.0, 20.0, 30.0).unwrap();
//! let plane = SectionPlane::horizontal(5.0, "A");
//! let section = compute_section_view(&box_shape, &plane).unwrap();
//! ```

use crate::{OcctError, OcctResult, Shape};
use serde::{Deserialize, Serialize};

/// Definition of a cutting plane
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionPlane {
    /// Point on the cutting plane
    pub origin: [f64; 3],
    /// Normal direction of the plane (direction you look from)
    pub normal: [f64; 3],
    /// Up direction for the resulting view
    pub up: [f64; 3],
    /// Label for this section (e.g., "A", "B", "1", "2")
    pub label: String,
    /// Optional depth limit for the view (None = infinite)
    pub depth: Option<f64>,
}

impl SectionPlane {
    /// Create a new section plane
    pub fn new(origin: [f64; 3], normal: [f64; 3], up: [f64; 3], label: &str) -> Self {
        Self {
            origin,
            normal,
            up,
            label: label.to_string(),
            depth: None,
        }
    }

    /// Create a horizontal section plane at a given Z height
    ///
    /// This creates a floor plan-like view looking down
    pub fn horizontal(z: f64, label: &str) -> Self {
        Self {
            origin: [0.0, 0.0, z],
            normal: [0.0, 0.0, -1.0], // Looking down
            up: [0.0, 1.0, 0.0],      // Y is up in the view
            label: label.to_string(),
            depth: None,
        }
    }

    /// Create a vertical longitudinal section plane at a given Y position
    ///
    /// This creates a front elevation section looking along -Y
    pub fn longitudinal(y: f64, label: &str) -> Self {
        Self {
            origin: [0.0, y, 0.0],
            normal: [0.0, -1.0, 0.0], // Looking along -Y
            up: [0.0, 0.0, 1.0],      // Z is up in the view
            label: label.to_string(),
            depth: None,
        }
    }

    /// Create a vertical transversal section plane at a given X position
    ///
    /// This creates a side elevation section looking along -X
    pub fn transversal(x: f64, label: &str) -> Self {
        Self {
            origin: [x, 0.0, 0.0],
            normal: [-1.0, 0.0, 0.0], // Looking along -X
            up: [0.0, 0.0, 1.0],      // Z is up in the view
            label: label.to_string(),
            depth: None,
        }
    }

    /// Create a custom angled section plane
    pub fn angled(origin: [f64; 3], angle_deg: f64, label: &str) -> Self {
        let angle_rad = angle_deg.to_radians();
        let normal = [angle_rad.cos(), angle_rad.sin(), 0.0];
        Self {
            origin,
            normal,
            up: [0.0, 0.0, 1.0],
            label: label.to_string(),
            depth: None,
        }
    }

    /// Set the depth limit for this section
    pub fn with_depth(mut self, depth: f64) -> Self {
        self.depth = Some(depth);
        self
    }

    /// Get the section label with standard notation (e.g., "A-A")
    pub fn full_label(&self) -> String {
        format!("{}-{}", self.label, self.label)
    }
}

/// Standard hatching patterns for section cuts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HatchPattern {
    /// Solid fill
    Solid,
    /// Parallel lines at 45 degrees
    Lines45,
    /// Parallel lines at -45 degrees
    Lines135,
    /// Cross-hatch pattern
    CrossHatch,
    /// Dots pattern
    Dots,
    /// Concrete pattern (random aggregate)
    Concrete,
    /// Steel/metal pattern
    Steel,
    /// Wood grain pattern
    Wood,
    /// Earth/soil pattern
    Earth,
    /// Brick pattern
    Brick,
    /// Insulation pattern
    Insulation,
    /// No fill
    None,
}

impl HatchPattern {
    /// Get the SVG pattern definition for this hatch
    pub fn svg_pattern_id(&self) -> &'static str {
        match self {
            HatchPattern::Solid => "hatch-solid",
            HatchPattern::Lines45 => "hatch-lines45",
            HatchPattern::Lines135 => "hatch-lines135",
            HatchPattern::CrossHatch => "hatch-crosshatch",
            HatchPattern::Dots => "hatch-dots",
            HatchPattern::Concrete => "hatch-concrete",
            HatchPattern::Steel => "hatch-steel",
            HatchPattern::Wood => "hatch-wood",
            HatchPattern::Earth => "hatch-earth",
            HatchPattern::Brick => "hatch-brick",
            HatchPattern::Insulation => "hatch-insulation",
            HatchPattern::None => "none",
        }
    }

    /// Get DXF hatch pattern name
    pub fn dxf_pattern_name(&self) -> &'static str {
        match self {
            HatchPattern::Solid => "SOLID",
            HatchPattern::Lines45 => "ANSI31",
            HatchPattern::Lines135 => "ANSI32",
            HatchPattern::CrossHatch => "ANSI37",
            HatchPattern::Dots => "DOTS",
            HatchPattern::Concrete => "AR-CONC",
            HatchPattern::Steel => "STEEL",
            HatchPattern::Wood => "AR-HBONE",
            HatchPattern::Earth => "EARTH",
            HatchPattern::Brick => "AR-BRSTD",
            HatchPattern::Insulation => "INSUL",
            HatchPattern::None => "",
        }
    }
}

/// A region that should be hatched in a section view
///
/// This is a generic hatch region type that can be used for custom hatching.
/// For automatic hatching from OCCT section cuts, use [`compute_section_with_hatch`]
/// which returns [`HatchedRegion`] with pre-computed hatch lines.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HatchRegion {
    /// Boundary points of the region (closed polygon)
    pub boundary: Vec<[f64; 2]>,
    /// Pattern to use for hatching
    pub pattern: HatchPattern,
    /// Optional material identifier
    pub material_id: Option<String>,
}

/// Result of a section cut operation (without hatching)
///
/// This is a lightweight section result that only contains the cut curves.
/// For hatched sections (technical drawings), use [`compute_section_with_hatch`] instead.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionResult {
    /// The section plane used
    pub plane: SectionPlane,
    /// 2D curves from the section cut (boundary of cut faces)
    pub cut_curves: Vec<SectionCurve>,
    /// Bounding box of the section
    pub bounding_box: [[f64; 2]; 2],
}

/// A curve in the section result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionCurve {
    /// Points defining the curve
    pub points: Vec<[f64; 2]>,
    /// Whether this is a closed curve
    pub is_closed: bool,
    /// Whether this is an outer boundary (vs inner hole)
    pub is_outer: bool,
}

impl SectionCurve {
    /// Calculate the area enclosed by a closed curve (positive for CCW, negative for CW)
    pub fn signed_area(&self) -> f64 {
        if !self.is_closed || self.points.len() < 3 {
            return 0.0;
        }

        let mut area = 0.0;
        let n = self.points.len();
        for i in 0..n {
            let j = (i + 1) % n;
            area += self.points[i][0] * self.points[j][1];
            area -= self.points[j][0] * self.points[i][1];
        }
        area / 2.0
    }

    /// Check if the curve is counter-clockwise
    pub fn is_ccw(&self) -> bool {
        self.signed_area() > 0.0
    }
}

/// Compute a section view of a shape (without hatching)
///
/// This is a lightweight section operation that returns only the cut curves
/// projected onto the section plane. Use this when you need the section outline
/// but don't need hatching (e.g., for quick previews or analysis).
///
/// For technical drawings with hatched regions, use [`compute_section_with_hatch`] instead.
///
/// # Arguments
///
/// * `shape` - The 3D shape to section
/// * `plane` - The section plane definition
///
/// # Returns
///
/// A `SectionResult` containing the section curves (no hatch data)
///
/// # Example
///
/// ```no_run
/// use cadhy_cad::{Shape, Primitives, section::*};
///
/// let box_shape = Primitives::make_box(10.0, 20.0, 30.0).unwrap();
/// let plane = SectionPlane::horizontal(5.0, "A");
///
/// // Quick section without hatching
/// let section = compute_section_view(&box_shape, &plane).unwrap();
/// println!("Section has {} curves", section.cut_curves.len());
///
/// // For hatched sections, use compute_section_with_hatch instead
/// ```
pub fn compute_section_view(shape: &Shape, plane: &SectionPlane) -> OcctResult<SectionResult> {
    use crate::ffi::ffi;

    // Call FFI to get section curves
    let section_shape = ffi::compute_section(
        shape.inner(),
        plane.origin[0],
        plane.origin[1],
        plane.origin[2],
        plane.normal[0],
        plane.normal[1],
        plane.normal[2],
    );

    if section_shape.is_null() {
        return Err(OcctError::OperationFailed(
            "Section operation failed".to_string(),
        ));
    }

    // Get edges from the section shape
    let edges = ffi::get_edges(&section_shape);

    // Convert 3D edges to 2D curves based on the section plane orientation
    let mut cut_curves = Vec::new();
    let mut min_x = f64::MAX;
    let mut min_y = f64::MAX;
    let mut max_x = f64::MIN;
    let mut max_y = f64::MIN;

    // Project edges onto the section plane's coordinate system
    for edge in edges.iter() {
        // Transform 3D points to 2D based on plane orientation
        let (x1, y1) = project_to_plane([edge.start_x, edge.start_y, edge.start_z], plane);
        let (x2, y2) = project_to_plane([edge.end_x, edge.end_y, edge.end_z], plane);

        min_x = min_x.min(x1).min(x2);
        min_y = min_y.min(y1).min(y2);
        max_x = max_x.max(x1).max(x2);
        max_y = max_y.max(y1).max(y2);

        cut_curves.push(SectionCurve {
            points: vec![[x1, y1], [x2, y2]],
            is_closed: false,
            is_outer: true,
        });
    }

    // Handle empty results
    if cut_curves.is_empty() {
        min_x = 0.0;
        min_y = 0.0;
        max_x = 0.0;
        max_y = 0.0;
    }

    Ok(SectionResult {
        plane: plane.clone(),
        cut_curves,
        bounding_box: [[min_x, min_y], [max_x, max_y]],
    })
}

// =============================================================================
// SECTION WITH HATCHING (OCCT-BASED)
// =============================================================================

/// A single hatch line in a section view
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HatchLine {
    pub start: [f64; 2],
    pub end: [f64; 2],
}

/// A hatch region with its boundary and hatch lines
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HatchedRegion {
    /// Boundary points (closed polygon)
    pub boundary: Vec<[f64; 2]>,
    /// Hatch lines inside this region
    pub hatch_lines: Vec<HatchLine>,
    /// Region area
    pub area: f64,
    /// Is this an outer boundary (vs hole)
    pub is_outer: bool,
}

/// Configuration for hatching generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HatchConfig {
    /// Hatch line angle in degrees (0 = horizontal, 45 = diagonal)
    pub angle_deg: f64,
    /// Spacing between hatch lines
    pub spacing: f64,
}

impl Default for HatchConfig {
    fn default() -> Self {
        Self {
            angle_deg: 45.0,
            spacing: 2.0,
        }
    }
}

/// Result of a section cut with hatching
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionWithHatchResult {
    /// The section plane used
    pub plane: SectionPlane,
    /// Section boundary curves
    pub curves: Vec<SectionCurve>,
    /// Hatched regions (closed areas with hatch lines)
    pub hatched_regions: Vec<HatchedRegion>,
    /// Bounding box of the section [[min_x, min_y], [max_x, max_y]]
    pub bounding_box: [[f64; 2]; 2],
    /// Number of closed regions found
    pub num_regions: usize,
    /// Total number of hatch lines generated
    pub total_hatch_lines: usize,
}

/// Compute a section view with automatic hatching of cut regions
///
/// This function cuts the shape with a plane and automatically generates
/// hatch lines for closed regions (representing the cut solid material).
///
/// # Arguments
///
/// * `shape` - The 3D shape to section
/// * `plane` - The section plane definition
/// * `hatch_config` - Configuration for hatch line generation
///
/// # Returns
///
/// A `SectionWithHatchResult` containing section curves and hatched regions
///
/// # Example
///
/// ```no_run
/// use cadhy_cad::{Shape, Primitives, section::*};
///
/// let box_shape = Primitives::make_box(10.0, 20.0, 30.0).unwrap();
/// let plane = SectionPlane::horizontal(5.0, "A");
/// let config = HatchConfig { angle_deg: 45.0, spacing: 1.5 };
/// let result = compute_section_with_hatch(&box_shape, &plane, &config).unwrap();
///
/// println!("Found {} hatched regions", result.num_regions);
/// for region in &result.hatched_regions {
///     println!("  Region with {} hatch lines", region.hatch_lines.len());
/// }
/// ```
pub fn compute_section_with_hatch(
    shape: &Shape,
    plane: &SectionPlane,
    hatch_config: &HatchConfig,
) -> OcctResult<SectionWithHatchResult> {
    use crate::ffi::ffi;

    // Call FFI to compute section with hatching
    let ffi_result = ffi::compute_section_with_hatch(
        shape.inner(),
        plane.origin[0],
        plane.origin[1],
        plane.origin[2],
        plane.normal[0],
        plane.normal[1],
        plane.normal[2],
        plane.up[0],
        plane.up[1],
        plane.up[2],
        hatch_config.angle_deg,
        hatch_config.spacing,
    );

    // Check if we got valid results
    if ffi_result.curves.is_empty() && ffi_result.regions.is_empty() {
        return Err(OcctError::OperationFailed(
            "Section with hatch operation produced no results".to_string(),
        ));
    }

    // Convert FFI curves to Rust curves
    let curves: Vec<SectionCurve> = ffi_result
        .curves
        .iter()
        .map(|c| {
            let points: Vec<[f64; 2]> = c.points.iter().map(|p| [p.x, p.y]).collect();
            let is_outer = if c.is_closed {
                // Determine if outer by signed area (CCW = outer)
                signed_area_2d(&points) > 0.0
            } else {
                true
            };
            SectionCurve {
                points,
                is_closed: c.is_closed,
                is_outer,
            }
        })
        .collect();

    // Convert FFI regions to Rust hatched regions
    let hatched_regions: Vec<HatchedRegion> = ffi_result
        .regions
        .iter()
        .map(|r| {
            let boundary: Vec<[f64; 2]> = r.boundary.iter().map(|p| [p.x, p.y]).collect();
            let hatch_lines: Vec<HatchLine> = r
                .hatch_lines
                .iter()
                .map(|l| HatchLine {
                    start: [l.start_x, l.start_y],
                    end: [l.end_x, l.end_y],
                })
                .collect();
            HatchedRegion {
                boundary,
                hatch_lines,
                area: r.area,
                is_outer: r.is_outer,
            }
        })
        .collect();

    let total_hatch_lines: usize = hatched_regions.iter().map(|r| r.hatch_lines.len()).sum();

    Ok(SectionWithHatchResult {
        plane: plane.clone(),
        curves,
        hatched_regions,
        bounding_box: [
            [ffi_result.min_x, ffi_result.min_y],
            [ffi_result.max_x, ffi_result.max_y],
        ],
        num_regions: ffi_result.num_regions as usize,
        total_hatch_lines,
    })
}

/// Calculate signed area of a 2D polygon (positive = CCW, negative = CW)
fn signed_area_2d(points: &[[f64; 2]]) -> f64 {
    if points.len() < 3 {
        return 0.0;
    }
    let mut area = 0.0;
    let n = points.len();
    for i in 0..n {
        let j = (i + 1) % n;
        area += points[i][0] * points[j][1];
        area -= points[j][0] * points[i][1];
    }
    area / 2.0
}

/// Generate standard section views with hatching for a shape
///
/// Creates horizontal sections at multiple heights with automatic hatching.
///
/// # Arguments
///
/// * `shape` - The 3D shape to section
/// * `heights` - Z heights at which to create horizontal sections
/// * `hatch_config` - Configuration for hatch line generation
///
/// # Returns
///
/// A vector of section results, one for each height
pub fn generate_horizontal_sections_with_hatch(
    shape: &Shape,
    heights: &[f64],
    hatch_config: &HatchConfig,
) -> Vec<OcctResult<SectionWithHatchResult>> {
    heights
        .iter()
        .enumerate()
        .map(|(i, &z)| {
            let label = format!("{}", (b'A' + i as u8) as char);
            let plane = SectionPlane::horizontal(z, &label);
            compute_section_with_hatch(shape, &plane, hatch_config)
        })
        .collect()
}

/// Project a 3D point onto the section plane's 2D coordinate system
fn project_to_plane(point: [f64; 3], plane: &SectionPlane) -> (f64, f64) {
    // Calculate the plane's local coordinate axes
    let normal = plane.normal;
    let up = plane.up;

    // X axis of plane = up × normal (cross product)
    let x_axis = [
        up[1] * normal[2] - up[2] * normal[1],
        up[2] * normal[0] - up[0] * normal[2],
        up[0] * normal[1] - up[1] * normal[0],
    ];

    // Normalize x_axis
    let x_len = (x_axis[0].powi(2) + x_axis[1].powi(2) + x_axis[2].powi(2)).sqrt();
    let x_axis = if x_len > 1e-10 {
        [x_axis[0] / x_len, x_axis[1] / x_len, x_axis[2] / x_len]
    } else {
        [1.0, 0.0, 0.0]
    };

    // Y axis = normal × x_axis
    let y_axis = [
        normal[1] * x_axis[2] - normal[2] * x_axis[1],
        normal[2] * x_axis[0] - normal[0] * x_axis[2],
        normal[0] * x_axis[1] - normal[1] * x_axis[0],
    ];

    // Vector from plane origin to point
    let v = [
        point[0] - plane.origin[0],
        point[1] - plane.origin[1],
        point[2] - plane.origin[2],
    ];

    // Project onto plane axes (dot products)
    let x = v[0] * x_axis[0] + v[1] * x_axis[1] + v[2] * x_axis[2];
    let y = v[0] * y_axis[0] + v[1] * y_axis[1] + v[2] * y_axis[2];

    (x, y)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_section_plane_horizontal() {
        let plane = SectionPlane::horizontal(5.0, "A");
        assert_eq!(plane.origin[2], 5.0);
        assert_eq!(plane.normal, [0.0, 0.0, -1.0]);
        assert_eq!(plane.full_label(), "A-A");
    }

    #[test]
    fn test_hatch_pattern_svg() {
        assert_eq!(HatchPattern::Concrete.svg_pattern_id(), "hatch-concrete");
        assert_eq!(HatchPattern::Steel.dxf_pattern_name(), "STEEL");
    }

    #[test]
    fn test_section_curve_area() {
        // Simple square (CCW)
        let curve = SectionCurve {
            points: vec![[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]],
            is_closed: true,
            is_outer: true,
        };
        assert!((curve.signed_area() - 1.0).abs() < 1e-10);
        assert!(curve.is_ccw());
    }

    #[test]
    fn test_hatch_config_default() {
        let config = HatchConfig::default();
        assert_eq!(config.angle_deg, 45.0);
        assert_eq!(config.spacing, 2.0);
    }

    #[test]
    fn test_signed_area_2d() {
        // CCW square
        let ccw = vec![[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]];
        assert!(signed_area_2d(&ccw) > 0.0);

        // CW square
        let cw = vec![[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0]];
        assert!(signed_area_2d(&cw) < 0.0);

        // Degenerate cases
        assert_eq!(signed_area_2d(&[]), 0.0);
        assert_eq!(signed_area_2d(&[[0.0, 0.0]]), 0.0);
        assert_eq!(signed_area_2d(&[[0.0, 0.0], [1.0, 1.0]]), 0.0);
    }

    #[test]
    fn test_hatch_line_serialization() {
        let line = HatchLine {
            start: [0.0, 0.0],
            end: [10.0, 10.0],
        };
        let json = serde_json::to_string(&line).unwrap();
        let deserialized: HatchLine = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.start, line.start);
        assert_eq!(deserialized.end, line.end);
    }

    #[test]
    fn test_hatched_region_serialization() {
        let region = HatchedRegion {
            boundary: vec![[0.0, 0.0], [10.0, 0.0], [10.0, 10.0], [0.0, 10.0]],
            hatch_lines: vec![HatchLine {
                start: [0.0, 5.0],
                end: [10.0, 5.0],
            }],
            area: 100.0,
            is_outer: true,
        };
        let json = serde_json::to_string(&region).unwrap();
        let deserialized: HatchedRegion = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.boundary.len(), 4);
        assert_eq!(deserialized.hatch_lines.len(), 1);
        assert_eq!(deserialized.area, 100.0);
        assert!(deserialized.is_outer);
    }
}
