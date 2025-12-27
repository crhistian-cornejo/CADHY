//! Configuration module for cadhy-cad
//!
//! Centralizes all tolerance values, defaults, and configurable parameters
//! that were previously hardcoded throughout the codebase.
//!
//! # Usage
//!
//! ```rust
//! use cadhy_cad::config::{TessellationConfig, ToleranceConfig};
//!
//! // Use defaults
//! let tess = TessellationConfig::default();
//! println!("Default deflection: {}", tess.deflection);
//!
//! // Or customize
//! let custom = TessellationConfig {
//!     deflection: 0.05,
//!     angular_deflection: 0.05,
//! };
//! ```

use serde::{Deserialize, Serialize};

// =============================================================================
// TESSELLATION CONFIGURATION
// =============================================================================

/// Configuration for mesh tessellation operations.
///
/// Controls the quality and density of generated mesh geometry.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct TessellationConfig {
    /// Linear deflection - maximum distance between the mesh and the actual curve.
    /// Smaller values = higher quality, more triangles.
    /// Default: 0.1
    pub deflection: f64,

    /// Angular deflection in radians - maximum angle between adjacent triangles.
    /// Default: 0.1 (~5.7 degrees)
    pub angular_deflection: f64,
}

impl Default for TessellationConfig {
    fn default() -> Self {
        Self {
            deflection: 0.1,
            angular_deflection: 0.1,
        }
    }
}

impl TessellationConfig {
    /// High quality settings for final renders
    pub const HIGH_QUALITY: Self = Self {
        deflection: 0.01,
        angular_deflection: 0.05,
    };

    /// Medium quality for interactive viewing
    pub const MEDIUM_QUALITY: Self = Self {
        deflection: 0.1,
        angular_deflection: 0.1,
    };

    /// Low quality for fast preview
    pub const LOW_QUALITY: Self = Self {
        deflection: 0.5,
        angular_deflection: 0.3,
    };

    /// Preview quality for large models
    pub const PREVIEW: Self = Self {
        deflection: 1.0,
        angular_deflection: 0.5,
    };
}

// =============================================================================
// TOLERANCE CONFIGURATION
// =============================================================================

/// Numerical tolerances used in geometric operations.
///
/// These values affect precision vs. performance tradeoffs.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ToleranceConfig {
    /// Tolerance for intersection calculations.
    /// Default: 1e-10
    pub intersection: f64,

    /// Tolerance for detecting degenerate edges (edges with near-zero length).
    /// Default: 1e-7
    pub degenerate_edge: f64,

    /// Tolerance for normal vector classification (dot product threshold).
    /// Default: 0.9 (approximately 25 degrees)
    pub normal_classification: f64,

    /// Tolerance for thick solid operations.
    /// Default: 1e-6
    pub thick_solid: f64,

    /// Minimum tolerance for capping operations.
    /// Default: 0.001
    pub cap_minimum: f64,

    /// Tolerance for detecting full circles (2π comparison).
    /// Default: 0.001
    pub full_circle: f64,

    /// Tolerance for detecting horizontal/vertical lines.
    /// Default: 0.01
    pub line_direction: f64,
}

impl Default for ToleranceConfig {
    fn default() -> Self {
        Self {
            intersection: 1e-10,
            degenerate_edge: 1e-7,
            normal_classification: 0.9,
            thick_solid: 1e-6,
            cap_minimum: 0.001,
            full_circle: 0.001,
            line_direction: 0.01,
        }
    }
}

impl ToleranceConfig {
    /// Strict tolerances for high precision work
    pub const STRICT: Self = Self {
        intersection: 1e-12,
        degenerate_edge: 1e-9,
        normal_classification: 0.95,
        thick_solid: 1e-8,
        cap_minimum: 0.0001,
        full_circle: 0.0001,
        line_direction: 0.001,
    };

    /// Relaxed tolerances for performance
    pub const RELAXED: Self = Self {
        intersection: 1e-8,
        degenerate_edge: 1e-5,
        normal_classification: 0.85,
        thick_solid: 1e-4,
        cap_minimum: 0.01,
        full_circle: 0.01,
        line_direction: 0.1,
    };
}

// =============================================================================
// DIMENSION STYLE CONFIGURATION
// =============================================================================

/// Style configuration for dimension lines and annotations.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DimensionStyleConfig {
    /// Offset distance from geometry for dimension lines.
    /// Default: 10.0
    pub offset: f64,

    /// Gap between dimension line and extension line.
    /// Default: 2.0
    pub extension_gap: f64,

    /// Extension line overshoot past dimension line.
    /// Default: 2.0
    pub extension_overshoot: f64,

    /// Arrow head size.
    /// Default: 3.0
    pub arrow_size: f64,

    /// Text height for dimension values.
    /// Default: 3.5
    pub text_height: f64,

    /// Ratio for radial dimension text positioning.
    /// Default: 0.7
    pub radial_text_ratio: f64,

    /// Minimum line length to consider as significant.
    /// Default: 5.0
    pub min_significant_length: f64,

    /// Tolerance for deduplicating Y positions.
    /// Default: 1.0
    pub y_dedup_tolerance: f64,
}

impl Default for DimensionStyleConfig {
    fn default() -> Self {
        Self {
            offset: 10.0,
            extension_gap: 2.0,
            extension_overshoot: 2.0,
            arrow_size: 3.0,
            text_height: 3.5,
            radial_text_ratio: 0.7,
            min_significant_length: 5.0,
            y_dedup_tolerance: 1.0,
        }
    }
}

impl DimensionStyleConfig {
    /// Compact style for small drawings
    pub const COMPACT: Self = Self {
        offset: 5.0,
        extension_gap: 1.0,
        extension_overshoot: 1.0,
        arrow_size: 2.0,
        text_height: 2.5,
        radial_text_ratio: 0.6,
        min_significant_length: 3.0,
        y_dedup_tolerance: 0.5,
    };

    /// Large style for presentation drawings
    pub const LARGE: Self = Self {
        offset: 15.0,
        extension_gap: 3.0,
        extension_overshoot: 3.0,
        arrow_size: 5.0,
        text_height: 5.0,
        radial_text_ratio: 0.75,
        min_significant_length: 8.0,
        y_dedup_tolerance: 2.0,
    };
}

// =============================================================================
// LINE STYLE CONFIGURATION
// =============================================================================

/// Configuration for line styles in technical drawings.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LineStyleConfig {
    /// Stroke width for visible edges.
    /// Default: 0.5
    pub visible_stroke_width: f64,

    /// Stroke width for visible sharp edges.
    /// Default: 0.7
    pub visible_sharp_stroke_width: f64,

    /// Stroke width for hidden edges.
    /// Default: 0.25
    pub hidden_stroke_width: f64,

    /// Stroke width for hidden sharp edges.
    /// Default: 0.35
    pub hidden_sharp_stroke_width: f64,

    /// SVG dash array pattern for hidden lines.
    /// Default: "4,2"
    pub hidden_dash_pattern: String,
}

impl Default for LineStyleConfig {
    fn default() -> Self {
        Self {
            visible_stroke_width: 0.5,
            visible_sharp_stroke_width: 0.7,
            hidden_stroke_width: 0.25,
            hidden_sharp_stroke_width: 0.35,
            hidden_dash_pattern: "4,2".to_string(),
        }
    }
}

// =============================================================================
// VIEW LABELS (for i18n)
// =============================================================================

/// Labels for standard projection views.
///
/// Can be customized for different languages.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ViewLabels {
    pub front: String,
    pub back: String,
    pub left: String,
    pub right: String,
    pub top: String,
    pub bottom: String,
    pub isometric: String,
    pub isometric_sw: String,
    pub isometric_se: String,
    pub isometric_ne: String,
    pub isometric_nw: String,
}

impl Default for ViewLabels {
    fn default() -> Self {
        Self::spanish()
    }
}

impl ViewLabels {
    /// Spanish labels (current default)
    pub fn spanish() -> Self {
        Self {
            front: "Vista Frontal".to_string(),
            back: "Vista Posterior".to_string(),
            left: "Vista Izquierda".to_string(),
            right: "Vista Derecha".to_string(),
            top: "Vista Superior".to_string(),
            bottom: "Vista Inferior".to_string(),
            isometric: "Isométrica".to_string(),
            isometric_sw: "Isométrica SW".to_string(),
            isometric_se: "Isométrica SE".to_string(),
            isometric_ne: "Isométrica NE".to_string(),
            isometric_nw: "Isométrica NW".to_string(),
        }
    }

    /// English labels
    pub fn english() -> Self {
        Self {
            front: "Front View".to_string(),
            back: "Back View".to_string(),
            left: "Left View".to_string(),
            right: "Right View".to_string(),
            top: "Top View".to_string(),
            bottom: "Bottom View".to_string(),
            isometric: "Isometric".to_string(),
            isometric_sw: "Isometric SW".to_string(),
            isometric_se: "Isometric SE".to_string(),
            isometric_ne: "Isometric NE".to_string(),
            isometric_nw: "Isometric NW".to_string(),
        }
    }

    /// Technical/ISO labels
    pub fn technical() -> Self {
        Self {
            front: "Front".to_string(),
            back: "Rear".to_string(),
            left: "Left".to_string(),
            right: "Right".to_string(),
            top: "Plan".to_string(),
            bottom: "Bottom".to_string(),
            isometric: "ISO".to_string(),
            isometric_sw: "ISO-SW".to_string(),
            isometric_se: "ISO-SE".to_string(),
            isometric_ne: "ISO-NE".to_string(),
            isometric_nw: "ISO-NW".to_string(),
        }
    }
}

// =============================================================================
// HATCH CONFIGURATION
// =============================================================================

/// Default hatch pattern configuration.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct HatchDefaults {
    /// Hatch line angle in degrees.
    /// Default: 45.0
    pub angle_degrees: f64,

    /// Spacing between hatch lines.
    /// Default: 2.0
    pub spacing: f64,
}

impl Default for HatchDefaults {
    fn default() -> Self {
        Self {
            angle_degrees: 45.0,
            spacing: 2.0,
        }
    }
}

// =============================================================================
// EXPORT DEFAULTS
// =============================================================================

/// Default values for export operations.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ExportDefaults {
    /// Default deflection for mesh export.
    /// Default: 0.1
    pub deflection: f64,

    /// Whether to use binary format when available.
    /// Default: true
    pub binary: bool,
}

impl Default for ExportDefaults {
    fn default() -> Self {
        Self {
            deflection: 0.1,
            binary: true,
        }
    }
}

// =============================================================================
// MASTER CONFIGURATION
// =============================================================================

/// Master configuration structure containing all sub-configurations.
///
/// This can be used to configure the entire cadhy-cad library at once.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct CadhyCadConfig {
    pub tessellation: TessellationConfig,
    pub tolerances: ToleranceConfig,
    pub dimension_style: DimensionStyleConfig,
    pub line_style: LineStyleConfig,
    pub view_labels: ViewLabels,
    pub hatch: HatchDefaults,
    pub export: ExportDefaults,
}

impl CadhyCadConfig {
    /// High precision configuration for production work
    pub fn high_precision() -> Self {
        Self {
            tessellation: TessellationConfig::HIGH_QUALITY,
            tolerances: ToleranceConfig::STRICT,
            ..Default::default()
        }
    }

    /// Fast preview configuration for interactive work
    pub fn preview() -> Self {
        Self {
            tessellation: TessellationConfig::PREVIEW,
            tolerances: ToleranceConfig::RELAXED,
            ..Default::default()
        }
    }

    /// English language configuration
    pub fn english() -> Self {
        Self {
            view_labels: ViewLabels::english(),
            ..Default::default()
        }
    }
}

// =============================================================================
// GLOBAL CONFIGURATION (optional runtime configuration)
// =============================================================================

use std::sync::OnceLock;

static GLOBAL_CONFIG: OnceLock<CadhyCadConfig> = OnceLock::new();

/// Get the global configuration, initializing with defaults if not set.
pub fn get_config() -> &'static CadhyCadConfig {
    GLOBAL_CONFIG.get_or_init(CadhyCadConfig::default)
}

/// Set the global configuration. Can only be called once.
/// Returns Err if already initialized.
pub fn set_config(config: CadhyCadConfig) -> Result<(), Box<CadhyCadConfig>> {
    GLOBAL_CONFIG.set(config).map_err(Box::new)
}

// =============================================================================
// CONVENIENCE CONSTANTS
// =============================================================================

/// Common tolerance constants for direct use.
pub mod tolerances {
    /// Default intersection tolerance
    pub const INTERSECTION: f64 = 1e-10;

    /// Default degenerate edge tolerance
    pub const DEGENERATE_EDGE: f64 = 1e-7;

    /// Default normal classification tolerance
    pub const NORMAL_CLASSIFICATION: f64 = 0.9;

    /// Default thick solid tolerance
    pub const THICK_SOLID: f64 = 1e-6;

    /// Default full circle detection tolerance
    pub const FULL_CIRCLE: f64 = 0.001;

    /// Default line direction tolerance
    pub const LINE_DIRECTION: f64 = 0.01;
}

/// Common tessellation constants for direct use.
pub mod tessellation {
    /// Default linear deflection
    pub const DEFAULT_DEFLECTION: f64 = 0.1;

    /// Default angular deflection
    pub const DEFAULT_ANGULAR_DEFLECTION: f64 = 0.1;

    /// High quality deflection
    pub const HIGH_QUALITY_DEFLECTION: f64 = 0.01;

    /// Preview quality deflection
    pub const PREVIEW_DEFLECTION: f64 = 1.0;
}
