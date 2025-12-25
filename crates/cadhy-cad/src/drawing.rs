//! Technical drawing and sheet management module
//!
//! This module provides data structures for managing technical drawings,
//! including sheet configuration, views, and dimensions.

use crate::dimensions::{DimensionConfig, DimensionSet};
use crate::projection::{ProjectionResult, ProjectionType};
use serde::{Deserialize, Serialize};

// =============================================================================
// SHEET CONFIGURATION
// =============================================================================

/// Paper orientation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Orientation {
    /// Portrait (vertical)
    Vertical,
    /// Landscape (horizontal)
    Horizontal,
}

/// Standard paper sizes (ISO A series)
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum PaperSize {
    /// A0: 841 x 1189 mm
    A0,
    /// A1: 594 x 841 mm
    A1,
    /// A2: 420 x 594 mm
    A2,
    /// A3: 297 x 420 mm
    A3,
    /// A4: 210 x 297 mm
    A4,
    /// Custom size
    Custom { width: f64, height: f64 },
}

impl PaperSize {
    /// Get dimensions in millimeters
    pub fn dimensions(&self) -> (f64, f64) {
        match self {
            PaperSize::A0 => (841.0, 1189.0),
            PaperSize::A1 => (594.0, 841.0),
            PaperSize::A2 => (420.0, 594.0),
            PaperSize::A3 => (297.0, 420.0),
            PaperSize::A4 => (210.0, 297.0),
            PaperSize::Custom { width, height } => (*width, *height),
        }
    }

    /// Get dimensions accounting for orientation
    pub fn dimensions_with_orientation(&self, orientation: Orientation) -> (f64, f64) {
        let (width, height) = self.dimensions();
        match orientation {
            Orientation::Vertical => (width.min(height), width.max(height)),
            Orientation::Horizontal => (width.max(height), width.min(height)),
        }
    }

    /// Get label string
    pub fn label(&self) -> String {
        match self {
            PaperSize::A0 => "ISO A0 (841 x 1189 mm)".to_string(),
            PaperSize::A1 => "ISO A1 (594 x 841 mm)".to_string(),
            PaperSize::A2 => "ISO A2 (420 x 594 mm)".to_string(),
            PaperSize::A3 => "ISO A3 (297 x 420 mm)".to_string(),
            PaperSize::A4 => "ISO A4 (210 x 297 mm)".to_string(),
            PaperSize::Custom { width, height } => {
                format!("Personalizado ({} x {} mm)", width, height)
            }
        }
    }
}

/// Projection angle standard
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProjectionAngle {
    /// First angle projection (European standard)
    FirstAngle,
    /// Third angle projection (American standard)
    ThirdAngle,
}

/// Sheet configuration for a technical drawing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SheetConfig {
    /// Paper orientation
    pub orientation: Orientation,
    /// Paper size
    pub size: PaperSize,
    /// View to sheet scale (e.g., 1.0 = 1:1, 0.25 = 1:4)
    pub scale: f64,
    /// Projection angle standard
    pub projection_angle: ProjectionAngle,
    /// Units for dimensions (e.g., "m", "mm", "cm")
    pub units: String,
    /// Title block style
    pub title_block: TitleBlockStyle,
}

impl Default for SheetConfig {
    fn default() -> Self {
        Self {
            orientation: Orientation::Horizontal,
            size: PaperSize::A3,
            scale: 0.25, // 1:4 scale
            projection_angle: ProjectionAngle::FirstAngle,
            units: "m".to_string(),
            title_block: TitleBlockStyle::Simple,
        }
    }
}

/// Title block style
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TitleBlockStyle {
    /// Simple title block
    Simple,
    /// Standard title block with more fields
    Standard,
    /// Custom title block
    Custom,
}

// =============================================================================
// DRAWING VIEW
// =============================================================================

/// A single view in a technical drawing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrawingView {
    /// Unique identifier for this view
    pub id: String,
    /// Type of projection
    pub projection_type: ProjectionType,
    /// The 2D projection data
    pub projection: ProjectionResult,
    /// Position on the sheet (in sheet coordinates, mm)
    pub position: (f64, f64),
    /// Whether this view is visible
    pub visible: bool,
    /// Optional label for the view
    pub label: Option<String>,
}

impl DrawingView {
    /// Create a new drawing view
    pub fn new(
        id: String,
        projection_type: ProjectionType,
        projection: ProjectionResult,
        position: (f64, f64),
    ) -> Self {
        Self {
            id,
            projection_type,
            projection,
            position,
            visible: true,
            label: None,
        }
    }
}

// =============================================================================
// TECHNICAL DRAWING
// =============================================================================

/// A complete technical drawing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Drawing {
    /// Unique identifier
    pub id: String,
    /// Drawing name/title
    pub name: String,
    /// Sheet configuration
    pub sheet_config: SheetConfig,
    /// All views in this drawing
    pub views: Vec<DrawingView>,
    /// Dimensions and annotations
    pub dimensions: DimensionSet,
    /// ID of the source shape(s) used to create this drawing
    pub source_shape_ids: Vec<String>,
    /// Creation timestamp
    pub created_at: i64,
    /// Last update timestamp
    pub updated_at: i64,
}

impl Drawing {
    /// Create a new empty drawing
    pub fn new(name: String, sheet_config: SheetConfig, source_shape_ids: Vec<String>) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Self {
            id: format!("drawing_{}", now),
            name,
            sheet_config,
            views: Vec::new(),
            dimensions: DimensionSet::new(DimensionConfig::default()),
            source_shape_ids,
            created_at: now,
            updated_at: now,
        }
    }

    /// Add a view to the drawing
    pub fn add_view(&mut self, view: DrawingView) {
        self.views.push(view);
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
    }

    /// Remove a view by ID
    pub fn remove_view(&mut self, view_id: &str) -> bool {
        let initial_len = self.views.len();
        self.views.retain(|v| v.id != view_id);
        let removed = self.views.len() < initial_len;
        if removed {
            self.updated_at = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;
        }
        removed
    }

    /// Get a view by ID
    pub fn get_view(&self, view_id: &str) -> Option<&DrawingView> {
        self.views.iter().find(|v| v.id == view_id)
    }

    /// Get a mutable view by ID
    pub fn get_view_mut(&mut self, view_id: &str) -> Option<&mut DrawingView> {
        self.views.iter_mut().find(|v| v.id == view_id)
    }

    /// Update sheet configuration
    pub fn update_sheet_config(&mut self, config: SheetConfig) {
        self.sheet_config = config;
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
    }
}
