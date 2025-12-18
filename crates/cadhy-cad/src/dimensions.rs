//! Automatic dimensioning module
//!
//! This module provides functionality for automatically generating dimensions
//! and annotations for 2D technical drawings.
//!
//! # Features
//!
//! - Linear dimensions (horizontal, vertical, aligned)
//! - Angular dimensions
//! - Radial/diameter dimensions
//! - Automatic dimension placement
//! - Engineering annotations

use crate::projection::{Line2D, Point2D, ProjectionResult};
use serde::{Deserialize, Serialize};

/// Types of dimensions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DimensionType {
    /// Linear dimension (distance between two points)
    Linear,
    /// Horizontal dimension
    Horizontal,
    /// Vertical dimension
    Vertical,
    /// Aligned dimension (along the line between points)
    Aligned,
    /// Angular dimension
    Angular,
    /// Radial dimension (radius)
    Radial,
    /// Diameter dimension
    Diameter,
    /// Ordinate dimension (from a datum)
    Ordinate,
}

/// A single dimension annotation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dimension {
    /// Type of dimension
    pub dim_type: DimensionType,
    /// Measured value
    pub value: f64,
    /// Unit of measurement
    pub unit: String,
    /// Position for the dimension text
    pub text_position: Point2D,
    /// First reference point
    pub point1: Point2D,
    /// Second reference point (not used for radial)
    pub point2: Option<Point2D>,
    /// Extension lines (from reference points to dimension line)
    pub extension_lines: Vec<ExtensionLine>,
    /// Dimension line (the line with arrows)
    pub dimension_line: DimensionLine,
    /// Optional prefix (e.g., "∅" for diameter, "R" for radius)
    pub prefix: Option<String>,
    /// Optional suffix (e.g., "TYP" for typical)
    pub suffix: Option<String>,
    /// Custom label override
    pub label_override: Option<String>,
}

/// Extension line from reference point to dimension line
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionLine {
    pub start: Point2D,
    pub end: Point2D,
}

/// The dimension line with arrows
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionLine {
    pub start: Point2D,
    pub end: Point2D,
    /// Arrow style at start
    pub start_arrow: ArrowStyle,
    /// Arrow style at end
    pub end_arrow: ArrowStyle,
}

/// Arrow styles for dimension lines
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ArrowStyle {
    /// Filled triangle arrow
    Filled,
    /// Open triangle arrow
    Open,
    /// Tick mark
    Tick,
    /// Dot
    Dot,
    /// No arrow
    None,
}

/// Configuration for automatic dimensioning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionConfig {
    /// Minimum offset from geometry to dimension line
    pub offset: f64,
    /// Gap between extension line and geometry
    pub extension_gap: f64,
    /// Extension beyond dimension line
    pub extension_overshoot: f64,
    /// Arrow size
    pub arrow_size: f64,
    /// Text height
    pub text_height: f64,
    /// Number of decimal places
    pub precision: u8,
    /// Unit of measurement
    pub unit: String,
    /// Whether to show unit in label
    pub show_unit: bool,
    /// Arrow style
    pub arrow_style: ArrowStyle,
}

impl Default for DimensionConfig {
    fn default() -> Self {
        Self {
            offset: 10.0,
            extension_gap: 2.0,
            extension_overshoot: 2.0,
            arrow_size: 3.0,
            text_height: 3.5,
            precision: 2,
            unit: "mm".to_string(),
            show_unit: false,
            arrow_style: ArrowStyle::Filled,
        }
    }
}

/// A complete set of dimensions for a drawing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionSet {
    /// All dimensions
    pub dimensions: Vec<Dimension>,
    /// Configuration used
    pub config: DimensionConfig,
}

impl DimensionSet {
    /// Create a new empty dimension set
    pub fn new(config: DimensionConfig) -> Self {
        Self {
            dimensions: Vec::new(),
            config,
        }
    }

    /// Add a dimension
    pub fn add(&mut self, dim: Dimension) {
        self.dimensions.push(dim);
    }

    /// Get dimensions by type
    pub fn by_type(&self, dim_type: DimensionType) -> Vec<&Dimension> {
        self.dimensions
            .iter()
            .filter(|d| d.dim_type == dim_type)
            .collect()
    }
}

/// Automatic dimension generator
pub struct AutoDimensioner {
    config: DimensionConfig,
}

impl AutoDimensioner {
    /// Create a new auto-dimensioner with given config
    pub fn new(config: DimensionConfig) -> Self {
        Self { config }
    }

    /// Create with default config
    pub fn default_config() -> Self {
        Self::new(DimensionConfig::default())
    }

    /// Generate automatic dimensions for a projection
    ///
    /// This analyzes the projection and generates appropriate dimensions:
    /// - Overall width and height
    /// - Major features (horizontal and vertical lines)
    pub fn auto_dimension(&self, projection: &ProjectionResult) -> DimensionSet {
        let mut dims = DimensionSet::new(self.config.clone());

        // Get bounding box dimensions
        let bbox = &projection.bounding_box;
        let _width = bbox.width();
        let _height = bbox.height();

        // Add overall width dimension (below the drawing)
        let width_dim = self.create_horizontal_dimension(
            Point2D::new(bbox.min.x, bbox.min.y),
            Point2D::new(bbox.max.x, bbox.min.y),
            -self.config.offset,
        );
        dims.add(width_dim);

        // Add overall height dimension (to the right of the drawing)
        let height_dim = self.create_vertical_dimension(
            Point2D::new(bbox.max.x, bbox.min.y),
            Point2D::new(bbox.max.x, bbox.max.y),
            self.config.offset,
        );
        dims.add(height_dim);

        // Find and dimension major horizontal and vertical lines
        self.add_feature_dimensions(projection, &mut dims);

        dims
    }

    /// Create a horizontal dimension
    pub fn create_horizontal_dimension(&self, p1: Point2D, p2: Point2D, offset: f64) -> Dimension {
        let value = (p2.x - p1.x).abs();
        let y_pos = if offset < 0.0 {
            p1.y.min(p2.y) + offset
        } else {
            p1.y.max(p2.y) + offset
        };

        let text_pos = Point2D::new((p1.x + p2.x) / 2.0, y_pos);

        Dimension {
            dim_type: DimensionType::Horizontal,
            value,
            unit: self.config.unit.clone(),
            text_position: text_pos,
            point1: p1,
            point2: Some(p2),
            extension_lines: vec![
                ExtensionLine {
                    start: Point2D::new(p1.x, p1.y + self.config.extension_gap.copysign(offset)),
                    end: Point2D::new(
                        p1.x,
                        y_pos + self.config.extension_overshoot.copysign(offset),
                    ),
                },
                ExtensionLine {
                    start: Point2D::new(p2.x, p2.y + self.config.extension_gap.copysign(offset)),
                    end: Point2D::new(
                        p2.x,
                        y_pos + self.config.extension_overshoot.copysign(offset),
                    ),
                },
            ],
            dimension_line: DimensionLine {
                start: Point2D::new(p1.x, y_pos),
                end: Point2D::new(p2.x, y_pos),
                start_arrow: self.config.arrow_style,
                end_arrow: self.config.arrow_style,
            },
            prefix: None,
            suffix: None,
            label_override: None,
        }
    }

    /// Create a vertical dimension
    pub fn create_vertical_dimension(&self, p1: Point2D, p2: Point2D, offset: f64) -> Dimension {
        let value = (p2.y - p1.y).abs();
        let x_pos = if offset < 0.0 {
            p1.x.min(p2.x) + offset
        } else {
            p1.x.max(p2.x) + offset
        };

        let text_pos = Point2D::new(x_pos, (p1.y + p2.y) / 2.0);

        Dimension {
            dim_type: DimensionType::Vertical,
            value,
            unit: self.config.unit.clone(),
            text_position: text_pos,
            point1: p1,
            point2: Some(p2),
            extension_lines: vec![
                ExtensionLine {
                    start: Point2D::new(p1.x + self.config.extension_gap.copysign(offset), p1.y),
                    end: Point2D::new(
                        x_pos + self.config.extension_overshoot.copysign(offset),
                        p1.y,
                    ),
                },
                ExtensionLine {
                    start: Point2D::new(p2.x + self.config.extension_gap.copysign(offset), p2.y),
                    end: Point2D::new(
                        x_pos + self.config.extension_overshoot.copysign(offset),
                        p2.y,
                    ),
                },
            ],
            dimension_line: DimensionLine {
                start: Point2D::new(x_pos, p1.y),
                end: Point2D::new(x_pos, p2.y),
                start_arrow: self.config.arrow_style,
                end_arrow: self.config.arrow_style,
            },
            prefix: None,
            suffix: None,
            label_override: None,
        }
    }

    /// Create a radial (radius) dimension
    pub fn create_radial_dimension(
        &self,
        center: Point2D,
        radius: f64,
        angle_deg: f64,
    ) -> Dimension {
        let angle_rad = angle_deg.to_radians();
        let edge_point = Point2D::new(
            center.x + radius * angle_rad.cos(),
            center.y + radius * angle_rad.sin(),
        );
        let text_pos = Point2D::new(
            center.x + (radius * 0.7) * angle_rad.cos(),
            center.y + (radius * 0.7) * angle_rad.sin(),
        );

        Dimension {
            dim_type: DimensionType::Radial,
            value: radius,
            unit: self.config.unit.clone(),
            text_position: text_pos,
            point1: center,
            point2: Some(edge_point),
            extension_lines: Vec::new(),
            dimension_line: DimensionLine {
                start: center,
                end: edge_point,
                start_arrow: ArrowStyle::None,
                end_arrow: self.config.arrow_style,
            },
            prefix: Some("R".to_string()),
            suffix: None,
            label_override: None,
        }
    }

    /// Create a diameter dimension
    pub fn create_diameter_dimension(
        &self,
        center: Point2D,
        diameter: f64,
        angle_deg: f64,
    ) -> Dimension {
        let radius = diameter / 2.0;
        let angle_rad = angle_deg.to_radians();
        let p1 = Point2D::new(
            center.x - radius * angle_rad.cos(),
            center.y - radius * angle_rad.sin(),
        );
        let p2 = Point2D::new(
            center.x + radius * angle_rad.cos(),
            center.y + radius * angle_rad.sin(),
        );

        Dimension {
            dim_type: DimensionType::Diameter,
            value: diameter,
            unit: self.config.unit.clone(),
            text_position: center,
            point1: p1,
            point2: Some(p2),
            extension_lines: Vec::new(),
            dimension_line: DimensionLine {
                start: p1,
                end: p2,
                start_arrow: self.config.arrow_style,
                end_arrow: self.config.arrow_style,
            },
            prefix: Some("∅".to_string()),
            suffix: None,
            label_override: None,
        }
    }

    /// Add dimensions for major features in the projection
    fn add_feature_dimensions(&self, projection: &ProjectionResult, dims: &mut DimensionSet) {
        // Find significant horizontal lines (potential widths)
        let horizontal_lines: Vec<&Line2D> = projection
            .lines
            .iter()
            .filter(|l| {
                let dy = (l.end.y - l.start.y).abs();
                let dx = (l.end.x - l.start.x).abs();
                dy < 0.01 * dx && l.length() > 5.0 // Nearly horizontal and significant length
            })
            .collect();

        // Find significant vertical lines (potential heights)
        let _vertical_lines: Vec<&Line2D> = projection
            .lines
            .iter()
            .filter(|l| {
                let dy = (l.end.y - l.start.y).abs();
                let dx = (l.end.x - l.start.x).abs();
                dx < 0.01 * dy && l.length() > 5.0 // Nearly vertical and significant length
            })
            .collect();

        // Add dimensions for distinct horizontal features
        // (This is a simplified implementation - a full version would detect
        // features like steps, offsets, etc.)
        let mut y_positions: Vec<f64> = horizontal_lines.iter().map(|l| l.start.y).collect();
        y_positions.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        y_positions.dedup_by(|a, b| (*a - *b).abs() < 1.0);

        // Add dimensions between distinct Y levels on the left side
        if y_positions.len() > 2 {
            let bbox = &projection.bounding_box;
            for window in y_positions.windows(2) {
                if let [y1, y2] = window {
                    if (*y2 - *y1).abs() > 5.0 {
                        let dim = self.create_vertical_dimension(
                            Point2D::new(bbox.min.x, *y1),
                            Point2D::new(bbox.min.x, *y2),
                            -self.config.offset * 2.0,
                        );
                        dims.add(dim);
                    }
                }
            }
        }
    }

    /// Format a dimension value as a string
    pub fn format_value(&self, value: f64) -> String {
        let formatted = format!("{:.prec$}", value, prec = self.config.precision as usize);
        if self.config.show_unit {
            format!("{} {}", formatted, self.config.unit)
        } else {
            formatted
        }
    }
}

impl Dimension {
    /// Get the formatted label for this dimension
    pub fn label(&self, config: &DimensionConfig) -> String {
        if let Some(override_label) = &self.label_override {
            return override_label.clone();
        }

        let mut label = String::new();

        if let Some(prefix) = &self.prefix {
            label.push_str(prefix);
        }

        let value_str = format!("{:.prec$}", self.value, prec = config.precision as usize);
        label.push_str(&value_str);

        if config.show_unit {
            label.push(' ');
            label.push_str(&self.unit);
        }

        if let Some(suffix) = &self.suffix {
            label.push(' ');
            label.push_str(suffix);
        }

        label
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dimension_config_default() {
        let config = DimensionConfig::default();
        assert_eq!(config.precision, 2);
        assert_eq!(config.unit, "mm");
    }

    #[test]
    fn test_auto_dimensioner_horizontal() {
        let dimensioner = AutoDimensioner::default_config();
        let dim = dimensioner.create_horizontal_dimension(
            Point2D::new(0.0, 0.0),
            Point2D::new(100.0, 0.0),
            -10.0,
        );
        assert!((dim.value - 100.0).abs() < 1e-10);
        assert_eq!(dim.dim_type, DimensionType::Horizontal);
    }

    #[test]
    fn test_dimension_label() {
        let config = DimensionConfig::default();
        let dim = Dimension {
            dim_type: DimensionType::Diameter,
            value: 50.0,
            unit: "mm".to_string(),
            text_position: Point2D::new(0.0, 0.0),
            point1: Point2D::new(-25.0, 0.0),
            point2: Some(Point2D::new(25.0, 0.0)),
            extension_lines: Vec::new(),
            dimension_line: DimensionLine {
                start: Point2D::new(-25.0, 0.0),
                end: Point2D::new(25.0, 0.0),
                start_arrow: ArrowStyle::Filled,
                end_arrow: ArrowStyle::Filled,
            },
            prefix: Some("∅".to_string()),
            suffix: None,
            label_override: None,
        };

        assert_eq!(dim.label(&config), "∅50.00");
    }
}
