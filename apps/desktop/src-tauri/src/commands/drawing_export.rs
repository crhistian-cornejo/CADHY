//! Technical drawing export commands (DXF/SVG/PDF)
//!
//! These commands take the current Drawing payload from the frontend and write
//! exports to disk.

use lopdf::{dictionary, Document, Object, Stream};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

// =============================================================================
// Payload types (mirrors @cadhy/types)
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point2D {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Line2D {
    pub start: Point2D,
    pub end: Point2D,
    pub line_type: LineType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox2D {
    pub min: Point2D,
    pub max: Point2D,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectionResult {
    pub lines: Vec<Line2D>,
    #[serde(default)]
    pub bounding_box: Option<BoundingBox2D>,
    #[serde(default)]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrawingView {
    pub id: String,
    pub projection: ProjectionResult,
    pub position: [f64; 2],
    pub visible: bool,
    #[serde(default)]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum LineType {
    VisibleSharp,
    HiddenSharp,
    VisibleSmooth,
    HiddenSmooth,
    VisibleOutline,
    HiddenOutline,
    SectionCut,
    Centerline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineWidthsConfig {
    pub visible: f64,
    pub hidden: f64,
    pub dimension: f64,
    pub centerline: f64,
    pub section: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PaperSize {
    Standard(String),
    Custom {
        r#type: String,
        width: f64,
        height: f64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TitleBlockInfo {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub revision: Option<String>,
    #[serde(default)]
    #[serde(rename = "sheetNumber")]
    pub sheet_number: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SheetConfig {
    pub orientation: String, // "portrait" | "landscape"
    pub size: PaperSize,
    pub scale: f64,
    #[serde(rename = "projectionAngle")]
    pub projection_angle: String,
    pub units: String,
    #[serde(rename = "titleBlock")]
    pub title_block: String,
    #[serde(default)]
    #[serde(rename = "titleBlockInfo")]
    pub title_block_info: Option<TitleBlockInfo>,
    #[serde(default)]
    #[serde(rename = "lineWidths")]
    pub line_widths: Option<LineWidthsConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionLine {
    pub start: Point2D,
    pub end: Point2D,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionLine {
    pub start: Point2D,
    pub end: Point2D,
    #[serde(default)]
    #[serde(rename = "startArrow")]
    pub start_arrow: Option<String>,
    #[serde(default)]
    #[serde(rename = "endArrow")]
    pub end_arrow: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dimension {
    #[serde(rename = "dimType")]
    pub dim_type: String,
    pub value: f64,
    pub unit: String,
    #[serde(rename = "textPosition")]
    pub text_position: Point2D,
    #[serde(rename = "extensionLines")]
    pub extension_lines: Vec<ExtensionLine>,
    #[serde(rename = "dimensionLine")]
    pub dimension_line: DimensionLine,
    #[serde(default)]
    pub prefix: Option<String>,
    #[serde(default)]
    pub suffix: Option<String>,
    #[serde(default)]
    #[serde(rename = "labelOverride")]
    pub label_override: Option<String>,
    /// ID of the view this dimension is attached to (for relative positioning)
    #[serde(default)]
    #[serde(rename = "viewId")]
    pub view_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DimensionConfig {
    #[serde(rename = "arrowSize")]
    pub arrow_size: f64,
    #[serde(rename = "textHeight")]
    pub text_height: f64,
    pub precision: i32,
    #[serde(rename = "showUnit")]
    pub show_unit: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionSet {
    pub dimensions: Vec<Dimension>,
    pub config: DimensionConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Drawing {
    pub id: String,
    pub name: String,
    #[serde(rename = "sheetConfig")]
    pub sheet_config: SheetConfig,
    pub views: Vec<DrawingView>,
    #[serde(default)]
    pub dimensions: Option<DimensionSet>,
}

// =============================================================================
// Utilities
// =============================================================================

fn paper_dimensions_mm(size: &PaperSize, orientation: &str) -> (f64, f64) {
    let (mut w, mut h) = match size {
        PaperSize::Standard(s) => match s.as_str() {
            "A0" => (841.0, 1189.0),
            "A1" => (594.0, 841.0),
            "A2" => (420.0, 594.0),
            "A3" => (297.0, 420.0),
            "A4" => (210.0, 297.0),
            _ => (297.0, 420.0), // default A3
        },
        PaperSize::Custom { width, height, .. } => (*width, *height),
    };

    if orientation == "landscape" {
        std::mem::swap(&mut w, &mut h);
    }
    (w, h)
}

fn default_line_widths() -> LineWidthsConfig {
    LineWidthsConfig {
        visible: 0.5,
        hidden: 0.25,
        dimension: 0.25,
        centerline: 0.18,
        section: 0.7,
    }
}

fn line_width_mm(sheet: &SheetConfig, lt: &LineType) -> f64 {
    let lw = sheet
        .line_widths
        .clone()
        .unwrap_or_else(default_line_widths);
    match lt {
        LineType::VisibleSharp | LineType::VisibleSmooth | LineType::VisibleOutline => lw.visible,
        LineType::HiddenSharp | LineType::HiddenSmooth | LineType::HiddenOutline => lw.hidden,
        LineType::SectionCut => lw.section,
        LineType::Centerline => lw.centerline,
    }
}

fn dash_array_mm(lt: &LineType) -> Option<&'static [f64]> {
    // values in mm (paper)
    match lt {
        LineType::HiddenSharp | LineType::HiddenSmooth | LineType::HiddenOutline => {
            Some(&[4.0, 2.0])
        }
        LineType::Centerline => Some(&[6.0, 2.0, 1.0, 2.0]),
        _ => None,
    }
}

fn stroke_color_hex(lt: &LineType) -> &'static str {
    match lt {
        LineType::HiddenSharp | LineType::HiddenSmooth | LineType::HiddenOutline => "#666666",
        LineType::SectionCut => "#cc0000",
        _ => "#000000",
    }
}

fn clamp_nonzero(v: f64, fallback: f64) -> f64 {
    if v.is_finite() && v > 0.0 {
        v
    } else {
        fallback
    }
}

fn to_paper_xy_mm(sheet_w: f64, sheet_h: f64, x_center_mm: f64, y_center_mm: f64) -> (f64, f64) {
    // Convert from center-origin (x right, y up) to paper coordinates (origin top-left, y down)
    let px = sheet_w / 2.0 + x_center_mm;
    let py = sheet_h / 2.0 - y_center_mm;
    (px, py)
}

fn to_dxf_xy_mm(sheet_h: f64, paper_x: f64, paper_y: f64) -> (f64, f64) {
    // DXF uses a y-up coordinate system by convention.
    (paper_x, sheet_h - paper_y)
}

#[derive(Debug, Clone)]
struct ExportLine {
    x1: f64,
    y1: f64,
    x2: f64,
    y2: f64,
    line_type: LineType,
    layer: &'static str,
}

#[derive(Debug, Clone, Copy)]
enum TextAnchor {
    Start,  // left-aligned
    Middle, // centered
    End,    // right-aligned
}

#[derive(Debug, Clone, Copy)]
enum TextBaseline {
    Top,    // text hangs down from y
    Middle, // text centered vertically on y
    Bottom, // text sits on y
}

#[derive(Debug, Clone)]
struct ExportText {
    x: f64,
    y: f64,
    text: String,
    height: f64,
    layer: &'static str,
    anchor: TextAnchor,
    baseline: TextBaseline,
}

fn format_dimension_text(dim: &Dimension, cfg: &DimensionConfig) -> String {
    if let Some(s) = &dim.label_override {
        return s.clone();
    }
    let prec = cfg.precision.max(0) as usize;
    let mut base = format!("{:.*}", prec, dim.value);
    if let Some(p) = &dim.prefix {
        base = format!("{}{}", p, base);
    }
    if let Some(s) = &dim.suffix {
        base = format!("{}{}", base, s);
    }
    if cfg.show_unit {
        base = format!("{} {}", base, dim.unit);
    }
    base
}

fn collect_export_primitives(drawing: &Drawing) -> (f64, f64, Vec<ExportLine>, Vec<ExportText>) {
    let sheet = &drawing.sheet_config;
    let (w, h) = paper_dimensions_mm(&sheet.size, &sheet.orientation);

    let mut lines: Vec<ExportLine> = Vec::new();
    let mut texts: Vec<ExportText> = Vec::new();

    // Margins for the drawing area
    let margin = 10.0; // 10mm margin
    let grid_band = 8.0; // Width of grid reference band

    // Outer frame
    lines.push(ExportLine {
        x1: 0.0,
        y1: 0.0,
        x2: w,
        y2: 0.0,
        line_type: LineType::VisibleSharp,
        layer: "FRAME",
    });
    lines.push(ExportLine {
        x1: w,
        y1: 0.0,
        x2: w,
        y2: h,
        line_type: LineType::VisibleSharp,
        layer: "FRAME",
    });
    lines.push(ExportLine {
        x1: w,
        y1: h,
        x2: 0.0,
        y2: h,
        line_type: LineType::VisibleSharp,
        layer: "FRAME",
    });
    lines.push(ExportLine {
        x1: 0.0,
        y1: h,
        x2: 0.0,
        y2: 0.0,
        line_type: LineType::VisibleSharp,
        layer: "FRAME",
    });

    // Inner frame (drawing area boundary)
    let inner_left = margin + grid_band;
    let inner_right = w - margin - grid_band;
    let inner_top = margin + grid_band;
    let inner_bottom = h - margin - grid_band;

    lines.push(ExportLine {
        x1: inner_left,
        y1: inner_top,
        x2: inner_right,
        y2: inner_top,
        line_type: LineType::VisibleSharp,
        layer: "FRAME",
    });
    lines.push(ExportLine {
        x1: inner_right,
        y1: inner_top,
        x2: inner_right,
        y2: inner_bottom,
        line_type: LineType::VisibleSharp,
        layer: "FRAME",
    });
    lines.push(ExportLine {
        x1: inner_right,
        y1: inner_bottom,
        x2: inner_left,
        y2: inner_bottom,
        line_type: LineType::VisibleSharp,
        layer: "FRAME",
    });
    lines.push(ExportLine {
        x1: inner_left,
        y1: inner_bottom,
        x2: inner_left,
        y2: inner_top,
        line_type: LineType::VisibleSharp,
        layer: "FRAME",
    });

    // Grid references - columns (numbers 1-8)
    let num_cols = 8;
    let col_width = (inner_right - inner_left) / num_cols as f64;
    for i in 0..=num_cols {
        let x = inner_left + i as f64 * col_width;
        // Top grid dividers
        lines.push(ExportLine {
            x1: x,
            y1: margin,
            x2: x,
            y2: inner_top,
            line_type: LineType::VisibleSharp,
            layer: "GRID",
        });
        // Bottom grid dividers
        lines.push(ExportLine {
            x1: x,
            y1: inner_bottom,
            x2: x,
            y2: h - margin,
            line_type: LineType::VisibleSharp,
            layer: "GRID",
        });
        // Column number labels (centered in each cell)
        if i < num_cols {
            let label_x = x + col_width / 2.0;
            // Top label
            texts.push(ExportText {
                x: label_x,
                y: margin + grid_band / 2.0,
                text: format!("{}", i + 1),
                height: 3.5,
                layer: "GRID",
                anchor: TextAnchor::Middle,
                baseline: TextBaseline::Middle,
            });
            // Bottom label
            texts.push(ExportText {
                x: label_x,
                y: h - margin - grid_band / 2.0,
                text: format!("{}", i + 1),
                height: 3.5,
                layer: "GRID",
                anchor: TextAnchor::Middle,
                baseline: TextBaseline::Middle,
            });
        }
    }

    // Grid references - rows (letters A-F)
    let num_rows = 6;
    let row_height = (inner_bottom - inner_top) / num_rows as f64;
    let row_letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    for i in 0..=num_rows {
        let y = inner_top + i as f64 * row_height;
        // Left grid dividers
        lines.push(ExportLine {
            x1: margin,
            y1: y,
            x2: inner_left,
            y2: y,
            line_type: LineType::VisibleSharp,
            layer: "GRID",
        });
        // Right grid dividers
        lines.push(ExportLine {
            x1: inner_right,
            y1: y,
            x2: w - margin,
            y2: y,
            line_type: LineType::VisibleSharp,
            layer: "GRID",
        });
        // Row letter labels (centered in each cell)
        if i < num_rows {
            let label_y = y + row_height / 2.0;
            // Left label
            texts.push(ExportText {
                x: margin + grid_band / 2.0,
                y: label_y,
                text: row_letters[i].to_string(),
                height: 3.5,
                layer: "GRID",
                anchor: TextAnchor::Middle,
                baseline: TextBaseline::Middle,
            });
            // Right label
            texts.push(ExportText {
                x: w - margin - grid_band / 2.0,
                y: label_y,
                text: row_letters[i].to_string(),
                height: 3.5,
                layer: "GRID",
                anchor: TextAnchor::Middle,
                baseline: TextBaseline::Middle,
            });
        }
    }

    // Views (projection lines and labels)
    for view in drawing.views.iter().filter(|v| v.visible) {
        let bbox = match &view.projection.bounding_box {
            Some(b) => b,
            None => continue,
        };
        let view_center_x = (bbox.min.x + bbox.max.x) / 2.0;
        let view_center_y = (bbox.min.y + bbox.max.y) / 2.0;
        let view_half_height = (bbox.max.y - bbox.min.y) / 2.0;

        // Draw projection lines
        for l in &view.projection.lines {
            let x1c = view.position[0] + (l.start.x - view_center_x);
            let y1c = view.position[1] + (l.start.y - view_center_y);
            let x2c = view.position[0] + (l.end.x - view_center_x);
            let y2c = view.position[1] + (l.end.y - view_center_y);

            let (x1, y1) = to_paper_xy_mm(w, h, x1c, y1c);
            let (x2, y2) = to_paper_xy_mm(w, h, x2c, y2c);

            let layer = match l.line_type {
                LineType::HiddenSharp | LineType::HiddenSmooth | LineType::HiddenOutline => {
                    "HIDDEN"
                }
                LineType::Centerline => "CENTER",
                LineType::SectionCut => "SECTION",
                _ => "VISIBLE",
            };

            lines.push(ExportLine {
                x1,
                y1,
                x2,
                y2,
                line_type: l.line_type.clone(),
                layer,
            });
        }

        // Add view label below the view (use view.label or projection.label)
        let label_text = view
            .label
            .clone()
            .or_else(|| view.projection.label.clone())
            .filter(|s| !s.is_empty());

        if let Some(label) = label_text {
            // Position label below the view
            let label_y = view.position[1] - view_half_height - 8.0; // 8mm below the view
            let (lx, ly) = to_paper_xy_mm(w, h, view.position[0], label_y);
            texts.push(ExportText {
                x: lx,
                y: ly,
                text: label,
                height: 4.0,
                layer: "VIEWLABEL",
                anchor: TextAnchor::Middle,
                baseline: TextBaseline::Middle,
            });
        }
    }

    // Dimensions
    if let Some(dimset) = &drawing.dimensions {
        for dim in &dimset.dimensions {
            // Get view offset if dimension is attached to a view
            let (view_offset_x, view_offset_y) = if let Some(view_id) = &dim.view_id {
                drawing
                    .views
                    .iter()
                    .find(|v| &v.id == view_id)
                    .map(|v| (v.position[0], v.position[1]))
                    .unwrap_or((0.0, 0.0))
            } else {
                (0.0, 0.0)
            };

            // Extension lines
            for el in &dim.extension_lines {
                // Add view offset to convert from view-relative to paper center-origin coordinates
                let abs_x1 = el.start.x + view_offset_x;
                let abs_y1 = el.start.y + view_offset_y;
                let abs_x2 = el.end.x + view_offset_x;
                let abs_y2 = el.end.y + view_offset_y;
                // Then convert from center-origin to top-left paper coordinates
                let (x1, y1) = to_paper_xy_mm(w, h, abs_x1, abs_y1);
                let (x2, y2) = to_paper_xy_mm(w, h, abs_x2, abs_y2);
                lines.push(ExportLine {
                    x1,
                    y1,
                    x2,
                    y2,
                    line_type: LineType::VisibleSharp,
                    layer: "DIMENSION",
                });
            }
            // Dimension line
            let abs_dx1 = dim.dimension_line.start.x + view_offset_x;
            let abs_dy1 = dim.dimension_line.start.y + view_offset_y;
            let abs_dx2 = dim.dimension_line.end.x + view_offset_x;
            let abs_dy2 = dim.dimension_line.end.y + view_offset_y;
            let (dx1, dy1) = to_paper_xy_mm(w, h, abs_dx1, abs_dy1);
            let (dx2, dy2) = to_paper_xy_mm(w, h, abs_dx2, abs_dy2);
            lines.push(ExportLine {
                x1: dx1,
                y1: dy1,
                x2: dx2,
                y2: dy2,
                line_type: LineType::VisibleSharp,
                layer: "DIMENSION",
            });

            // Simple arrowheads (two short strokes) on each end
            // Arrows point INWARD (toward the center of the dimension line)
            let arrow = clamp_nonzero(dimset.config.arrow_size, 3.0);
            let vx = dx2 - dx1;
            let vy = dy2 - dy1;
            let vlen = (vx * vx + vy * vy).sqrt().max(1e-9);
            let ux = vx / vlen;
            let uy = vy / vlen;
            // Perp
            let px = -uy;
            let py = ux;
            let a = arrow;
            let wing = a * 0.6;

            // at start - arrow points INWARD (toward end)
            lines.push(ExportLine {
                x1: dx1,
                y1: dy1,
                x2: dx1 + (ux * a + px * wing), // INVERTED: now points inward with +ux
                y2: dy1 + (uy * a + py * wing),
                line_type: LineType::VisibleSharp,
                layer: "DIMENSION",
            });
            lines.push(ExportLine {
                x1: dx1,
                y1: dy1,
                x2: dx1 + (ux * a - px * wing), // INVERTED: now points inward with +ux
                y2: dy1 + (uy * a - py * wing),
                line_type: LineType::VisibleSharp,
                layer: "DIMENSION",
            });

            // at end - arrow points INWARD (toward start)
            lines.push(ExportLine {
                x1: dx2,
                y1: dy2,
                x2: dx2 + (-ux * a + px * wing), // INVERTED: now points inward with -ux
                y2: dy2 + (-uy * a + py * wing),
                line_type: LineType::VisibleSharp,
                layer: "DIMENSION",
            });
            lines.push(ExportLine {
                x1: dx2,
                y1: dy2,
                x2: dx2 + (-ux * a - px * wing), // INVERTED: now points inward with -ux
                y2: dy2 + (-uy * a - py * wing),
                line_type: LineType::VisibleSharp,
                layer: "DIMENSION",
            });

            // Text
            let abs_tx = dim.text_position.x + view_offset_x;
            let abs_ty = dim.text_position.y + view_offset_y;
            let (tx, ty) = to_paper_xy_mm(w, h, abs_tx, abs_ty);
            texts.push(ExportText {
                x: tx,
                y: ty,
                text: format_dimension_text(dim, &dimset.config),
                height: clamp_nonzero(dimset.config.text_height, 3.5),
                layer: "DIMENSION",
                anchor: TextAnchor::Middle,
                baseline: TextBaseline::Middle,
            });
        }
    }

    // Title block (bottom-right corner) - Shapr3D Style (3 rows)
    // Match the exact layout from Viewport2D.tsx renderTitleBlock()
    // Dynamic sizing based on paper size for flexibility
    let inner_width = inner_right - inner_left;
    let inner_height = inner_bottom - inner_top;

    // Dynamic title block size (scales with paper size)
    let tb_width = (inner_width * 0.15).max(50.0).min(80.0); // 15% of width, between 50-80mm
    let base_row_height = (inner_height * 0.025).max(6.0).min(10.0); // 2.5% of height, 6-10mm
    let title_row_height = base_row_height * 1.3; // Title row is taller
    let tb_height = title_row_height + base_row_height * 2.0; // 3 rows total

    let tb_left = inner_right - tb_width;
    let tb_top = inner_bottom - tb_height;
    let tb_right = inner_right;
    let tb_bottom = inner_bottom;

    // Column widths for rows 2 and 3 (3-column layout)
    let col1_width = tb_width * 0.27; // First column (27%)
    let col2_width = tb_width * 0.42; // Second column (42%) - wider for projection symbol
    let _col3_width = tb_width - col1_width - col2_width; // Third column (31%)

    // Cell padding
    let cell_padding = 1.0; // 1mm padding

    // Text sizes - dynamic based on row height for scalability
    let label_size = (base_row_height * 0.25).max(1.8).min(2.5); // 25% of row height
    let value_size = (base_row_height * 0.35).max(2.2).min(3.0); // 35% of row height
    let title_value_size = (base_row_height * 0.45).max(2.8).min(4.0); // 45% of row height

    // Title block outer frame
    lines.push(ExportLine {
        x1: tb_left,
        y1: tb_top,
        x2: tb_right,
        y2: tb_top,
        line_type: LineType::VisibleSharp,
        layer: "TITLEBLOCK",
    });
    lines.push(ExportLine {
        x1: tb_right,
        y1: tb_top,
        x2: tb_right,
        y2: tb_bottom,
        line_type: LineType::VisibleSharp,
        layer: "TITLEBLOCK",
    });
    lines.push(ExportLine {
        x1: tb_right,
        y1: tb_bottom,
        x2: tb_left,
        y2: tb_bottom,
        line_type: LineType::VisibleSharp,
        layer: "TITLEBLOCK",
    });
    lines.push(ExportLine {
        x1: tb_left,
        y1: tb_bottom,
        x2: tb_left,
        y2: tb_top,
        line_type: LineType::VisibleSharp,
        layer: "TITLEBLOCK",
    });

    // Horizontal dividers (2 dividers for 3 rows)
    // After title row
    lines.push(ExportLine {
        x1: tb_left,
        y1: tb_top + title_row_height,
        x2: tb_right,
        y2: tb_top + title_row_height,
        line_type: LineType::VisibleSharp,
        layer: "TITLEBLOCK",
    });
    // After row 2
    lines.push(ExportLine {
        x1: tb_left,
        y1: tb_top + title_row_height + base_row_height,
        x2: tb_right,
        y2: tb_top + title_row_height + base_row_height,
        line_type: LineType::VisibleSharp,
        layer: "TITLEBLOCK",
    });

    // Vertical dividers for rows 2 and 3 (2 dividers for 3 columns)
    // First divider (after col1)
    lines.push(ExportLine {
        x1: tb_left + col1_width,
        y1: tb_top + title_row_height,
        x2: tb_left + col1_width,
        y2: tb_bottom,
        line_type: LineType::VisibleSharp,
        layer: "TITLEBLOCK",
    });
    // Second divider (after col2)
    lines.push(ExportLine {
        x1: tb_left + col1_width + col2_width,
        y1: tb_top + title_row_height,
        x2: tb_left + col1_width + col2_width,
        y2: tb_bottom,
        line_type: LineType::VisibleSharp,
        layer: "TITLEBLOCK",
    });

    // ─── ROW 1: TITLE ───
    // Label (top-left)
    texts.push(ExportText {
        x: tb_left + cell_padding,
        y: tb_top + cell_padding,
        text: "TITLE".to_string(),
        height: label_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Start,
        baseline: TextBaseline::Top,
    });
    // Value (left-aligned, centered vertically)
    let title_text = sheet
        .title_block_info
        .as_ref()
        .and_then(|info| info.title.clone())
        .unwrap_or_else(|| "Untitled".to_string());
    texts.push(ExportText {
        x: tb_left + cell_padding,
        y: tb_top + title_row_height / 2.0,
        text: title_text,
        height: title_value_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Start,
        baseline: TextBaseline::Middle,
    });

    // ─── ROW 2: UNITS | ÁNG. PROY. | TAMAÑO ───
    let row2_y = tb_top + title_row_height;

    // Column 1: UNITS
    texts.push(ExportText {
        x: tb_left + cell_padding,
        y: row2_y + cell_padding,
        text: "UNITS".to_string(),
        height: label_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Start,
        baseline: TextBaseline::Top,
    });
    let units_label = match sheet.units.as_str() {
        "mm" => "Milímetros",
        "cm" => "Centímetros",
        "m" => "Metros",
        "in" => "Pulgadas",
        "ft" => "Pies",
        _ => &sheet.units,
    };
    texts.push(ExportText {
        x: tb_left + cell_padding,
        y: row2_y + base_row_height - cell_padding,
        text: units_label.to_string(),
        height: value_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Start,
        baseline: TextBaseline::Bottom,
    });

    // Column 2: ÁNG. PROY. (centered)
    texts.push(ExportText {
        x: tb_left + col1_width + col2_width / 2.0,
        y: row2_y + cell_padding,
        text: "ÁNG. PROY.".to_string(),
        height: label_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Middle,
        baseline: TextBaseline::Top,
    });
    // Projection angle symbol/text (centered)
    let proj_text = if sheet.projection_angle == "first" {
        "1st Angle"
    } else {
        "3rd Angle"
    };
    texts.push(ExportText {
        x: tb_left + col1_width + col2_width / 2.0,
        y: row2_y + base_row_height - cell_padding,
        text: proj_text.to_string(),
        height: value_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Middle,
        baseline: TextBaseline::Bottom,
    });

    // Column 3: TAMAÑO
    texts.push(ExportText {
        x: tb_left + col1_width + col2_width + cell_padding,
        y: row2_y + cell_padding,
        text: "TAMAÑO".to_string(),
        height: label_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Start,
        baseline: TextBaseline::Top,
    });
    let size_str = match &sheet.size {
        PaperSize::Standard(s) => s.clone(),
        PaperSize::Custom { .. } => "Custom".to_string(),
    };
    texts.push(ExportText {
        x: tb_left + col1_width + col2_width + cell_padding,
        y: row2_y + base_row_height - cell_padding,
        text: size_str,
        height: value_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Start,
        baseline: TextBaseline::Bottom,
    });

    // ─── ROW 3: ESCALA | ÚLTIMA ACTUALIZACIÓN | HOJA ───
    let row3_y = tb_top + title_row_height + base_row_height;

    // Column 1: ESCALA
    texts.push(ExportText {
        x: tb_left + cell_padding,
        y: row3_y + cell_padding,
        text: "ESCALA".to_string(),
        height: label_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Start,
        baseline: TextBaseline::Top,
    });
    // Format scale properly (e.g., 0.25 -> 1:4, 2.0 -> 2:1)
    let scale_str = if sheet.scale >= 1.0 {
        format!("{}:1", (sheet.scale).round() as i32)
    } else {
        format!("1:{}", (1.0 / sheet.scale).round() as i32)
    };
    texts.push(ExportText {
        x: tb_left + cell_padding,
        y: row3_y + base_row_height - cell_padding,
        text: scale_str,
        height: value_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Start,
        baseline: TextBaseline::Bottom,
    });

    // Column 2: ÚLTIMA ACTUALIZACIÓN (centered)
    texts.push(ExportText {
        x: tb_left + col1_width + col2_width / 2.0,
        y: row3_y + cell_padding,
        text: "ÚLTIMA ACTUALIZACIÓN".to_string(),
        height: label_size * 0.8, // Slightly smaller to fit
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Middle,
        baseline: TextBaseline::Top,
    });
    // Format date
    let now = chrono::Local::now();
    texts.push(ExportText {
        x: tb_left + col1_width + col2_width / 2.0,
        y: row3_y + base_row_height - cell_padding,
        text: now.format("%d/%m/%y").to_string(),
        height: value_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Middle,
        baseline: TextBaseline::Bottom,
    });

    // Column 3: HOJA
    texts.push(ExportText {
        x: tb_left + col1_width + col2_width + cell_padding,
        y: row3_y + cell_padding,
        text: "HOJA".to_string(),
        height: label_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Start,
        baseline: TextBaseline::Top,
    });
    let sheet_num = sheet
        .title_block_info
        .as_ref()
        .and_then(|i| i.sheet_number.clone())
        .unwrap_or_else(|| "1/1".to_string());
    texts.push(ExportText {
        x: tb_left + col1_width + col2_width + cell_padding,
        y: row3_y + base_row_height - cell_padding,
        text: sheet_num,
        height: value_size,
        layer: "TITLEBLOCK",
        anchor: TextAnchor::Start,
        baseline: TextBaseline::Bottom,
    });

    (w, h, lines, texts)
}

// =============================================================================
// SVG
// =============================================================================

fn export_svg(drawing: &Drawing) -> String {
    let (w, h, lines, texts) = collect_export_primitives(drawing);
    let mut out = String::new();

    out.push_str(r#"<?xml version="1.0" encoding="UTF-8"?>"#);
    out.push('\n');
    out.push_str(&format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" viewBox="0 0 {w} {h}">"#,
    ));
    out.push('\n');
    out.push_str(r#"<rect x="0" y="0" width="100%" height="100%" fill="white"/>"#);
    out.push('\n');

    // Lines
    for l in &lines {
        let stroke = match l.layer {
            "DIMENSION" => "#e11d48", // Red for all dimension lines
            "GRID" | "TITLEBLOCK" => "#333333",
            "FRAME" => "#000000",
            _ => stroke_color_hex(&l.line_type),
        };
        let stroke_w = match l.layer {
            "DIMENSION" => {
                drawing
                    .sheet_config
                    .line_widths
                    .clone()
                    .unwrap_or_else(default_line_widths)
                    .dimension
            }
            "FRAME" => 0.35,
            "GRID" | "TITLEBLOCK" => 0.18,
            _ => line_width_mm(&drawing.sheet_config, &l.line_type),
        };

        out.push_str(&format!(
            r#"<line x1="{:.3}" y1="{:.3}" x2="{:.3}" y2="{:.3}" stroke="{}" stroke-width="{:.3}" stroke-linecap="round""#,
            l.x1, l.y1, l.x2, l.y2, stroke, stroke_w
        ));
        if let Some(dash) = dash_array_mm(&l.line_type) {
            out.push_str(r#" stroke-dasharray=""#);
            for (i, d) in dash.iter().enumerate() {
                if i > 0 {
                    out.push(' ');
                }
                out.push_str(&format!("{:.3}", d));
            }
            out.push('"');
        }
        out.push_str("/>");
        out.push('\n');
    }

    // Text
    for t in &texts {
        let fill = match t.layer {
            "DIMENSION" => "#e11d48", // Red for dimensions (like canvas)
            "GRID" => "#333333",
            "VIEWLABEL" => "#000000",
            "TITLEBLOCK" => "#333333",
            _ => "#000000",
        };
        let font_weight = if t.layer == "VIEWLABEL" {
            "font-weight=\"bold\" "
        } else {
            ""
        };
        let text_anchor = match t.anchor {
            TextAnchor::Start => "start",
            TextAnchor::Middle => "middle",
            TextAnchor::End => "end",
        };
        let dominant_baseline = match t.baseline {
            TextBaseline::Top => "hanging",
            TextBaseline::Middle => "middle",
            TextBaseline::Bottom => "auto",
        };
        out.push_str(&format!(
            r##"<text x="{:.3}" y="{:.3}" font-family="sans-serif" font-size="{:.3}" fill="{}" {}text-anchor="{}" dominant-baseline="{}">{}</text>"##,
            t.x, t.y, t.height, fill, font_weight, text_anchor, dominant_baseline, escape_xml(&t.text)
        ));
        out.push('\n');
    }

    out.push_str("</svg>\n");
    out
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

// =============================================================================
// DXF (ASCII)
// =============================================================================

fn export_dxf(drawing: &Drawing) -> String {
    let (w, h, lines, texts) = collect_export_primitives(drawing);

    let mut out = String::new();

    // HEADER
    out.push_str("0\nSECTION\n2\nHEADER\n");
    out.push_str("9\n$ACADVER\n1\nAC1015\n");
    out.push_str("9\n$INSUNITS\n70\n4\n"); // 4 = millimeters
    out.push_str("0\nENDSEC\n");

    // ENTITIES
    out.push_str("0\nSECTION\n2\nENTITIES\n");

    for l in &lines {
        let (x1, y1) = to_dxf_xy_mm(h, l.x1, l.y1);
        let (x2, y2) = to_dxf_xy_mm(h, l.x2, l.y2);

        let (layer, ltype, color) = match l.layer {
            "HIDDEN" => ("HIDDEN", "HIDDEN", 8),
            "CENTER" => ("CENTER", "CENTER", 2),
            "SECTION" => ("SECTION", "CONTINUOUS", 1),
            "DIMENSION" => ("DIMENSION", "CONTINUOUS", 3),
            "FRAME" => ("FRAME", "CONTINUOUS", 7),
            "GRID" => ("GRID", "CONTINUOUS", 8),
            "TITLEBLOCK" => ("TITLEBLOCK", "CONTINUOUS", 8),
            "VIEWLABEL" => ("VIEWLABEL", "CONTINUOUS", 7),
            _ => ("VISIBLE", "CONTINUOUS", 7),
        };

        let lw_mm = match l.layer {
            "DIMENSION" => {
                drawing
                    .sheet_config
                    .line_widths
                    .clone()
                    .unwrap_or_else(default_line_widths)
                    .dimension
            }
            "FRAME" => 0.25,
            _ => line_width_mm(&drawing.sheet_config, &l.line_type),
        };
        let lw_100mm = (lw_mm * 100.0).round().clamp(0.0, 211.0) as i32;

        out.push_str("0\nLINE\n");
        out.push_str(&format!("8\n{}\n", layer));
        out.push_str(&format!("6\n{}\n", ltype));
        out.push_str(&format!("62\n{}\n", color));
        out.push_str(&format!("370\n{}\n", lw_100mm));
        out.push_str(&format!("10\n{:.6}\n20\n{:.6}\n30\n0.0\n", x1, y1));
        out.push_str(&format!("11\n{:.6}\n21\n{:.6}\n31\n0.0\n", x2, y2));
    }

    for t in &texts {
        let (x, y) = to_dxf_xy_mm(h, t.x, t.y);
        out.push_str("0\nTEXT\n");
        out.push_str(&format!("8\n{}\n", t.layer));
        out.push_str("7\nSTANDARD\n");
        out.push_str(&format!("10\n{:.6}\n20\n{:.6}\n30\n0.0\n", x, y));
        out.push_str(&format!("40\n{:.6}\n", t.height));
        out.push_str("50\n0.0\n"); // rotation
        out.push_str(&format!("1\n{}\n", t.text.replace('\n', " ")));
    }

    out.push_str("0\nENDSEC\n0\nEOF\n");

    let _ = w; // w not used for DXF currently
    out
}

// =============================================================================
// PDF (using lopdf)
// =============================================================================

fn mm_to_pt(mm: f64) -> f64 {
    mm * 72.0 / 25.4
}

fn export_pdf_bytes(drawing: &Drawing) -> Result<Vec<u8>, String> {
    let (w_mm, h_mm, lines, texts) = collect_export_primitives(drawing);
    let w_pt = mm_to_pt(w_mm);
    let h_pt = mm_to_pt(h_mm);

    // Create new PDF document
    let mut doc = Document::with_version("1.7");

    // Create pages object
    let pages_id = doc.new_object_id();

    // Create page object
    let page_id = doc.new_object_id();

    // Create content stream
    let mut content = String::new();

    // Draw lines
    for l in &lines {
        let stroke = match l.layer {
            "DIMENSION" => (0.882, 0.114, 0.282), // Red #e11d48 (like canvas)
            "SECTION" => (0.8, 0.0, 0.0),
            "GRID" | "TITLEBLOCK" => (0.2, 0.2, 0.2),
            _ if matches!(
                l.line_type,
                LineType::HiddenSharp | LineType::HiddenSmooth | LineType::HiddenOutline
            ) => (0.4, 0.4, 0.4),
            _ => (0.0, 0.0, 0.0),
        };

        let lw_mm = match l.layer {
            "DIMENSION" => {
                drawing
                    .sheet_config
                    .line_widths
                    .clone()
                    .unwrap_or_else(default_line_widths)
                    .dimension
            }
            "FRAME" => 0.35,
            "GRID" | "TITLEBLOCK" => 0.18,
            _ => line_width_mm(&drawing.sheet_config, &l.line_type),
        };

        content.push_str(&format!(
            "{:.3} {:.3} {:.3} RG\n",
            stroke.0, stroke.1, stroke.2
        ));
        content.push_str(&format!("{:.3} w\n", mm_to_pt(lw_mm)));

        if let Some(dash) = dash_array_mm(&l.line_type) {
            content.push('[');
            for (i, d) in dash.iter().enumerate() {
                if i > 0 {
                    content.push(' ');
                }
                content.push_str(&format!("{:.3}", mm_to_pt(*d)));
            }
            content.push_str("] 0 d\n");
        } else {
            content.push_str("[] 0 d\n");
        }

        let x1 = mm_to_pt(l.x1);
        let y1 = h_pt - mm_to_pt(l.y1);
        let x2 = mm_to_pt(l.x2);
        let y2 = h_pt - mm_to_pt(l.y2);

        content.push_str(&format!("{:.3} {:.3} m\n", x1, y1));
        content.push_str(&format!("{:.3} {:.3} l\n", x2, y2));
        content.push_str("S\n");
    }

    // Draw text
    for t in &texts {
        let fill = match t.layer {
            "DIMENSION" => (0.882, 0.114, 0.282), // Red #e11d48 (like canvas)
            "GRID" | "TITLEBLOCK" => (0.2, 0.2, 0.2),
            _ => (0.0, 0.0, 0.0),
        };

        let mut x = mm_to_pt(t.x);
        let mut y = h_pt - mm_to_pt(t.y);
        let size = mm_to_pt(t.height);

        // Adjust vertical position based on baseline
        // NOTE: In PDF, Y coordinates are inverted (bottom-up), and text is positioned by baseline
        match t.baseline {
            TextBaseline::Top => {
                // Text hangs down from y - in PDF, move down by 80% of font size
                // (not full size to account for descenders)
                y -= size * 0.8;
            }
            TextBaseline::Middle => {
                // Text centered on y - move down by ~20% for visual centering
                y -= size * 0.2;
            }
            TextBaseline::Bottom => {
                // Text sits on y - in PDF, baseline is at the point (no adjustment)
            }
        }

        // Adjust horizontal position based on anchor
        // Conservative approximation for Helvetica with Spanish text (accents, wide chars)
        // Use 0.75 to ensure no overlap, better slightly wide than overlapping
        let approx_width = t.text.len() as f64 * size * 0.75;
        match t.anchor {
            TextAnchor::Start => {
                // Left-aligned, no adjustment
            }
            TextAnchor::Middle => {
                // Center-aligned
                x -= approx_width / 2.0;
            }
            TextAnchor::End => {
                // Right-aligned
                x -= approx_width;
            }
        }

        content.push_str("BT\n");
        content.push_str(&format!("{:.3} {:.3} {:.3} rg\n", fill.0, fill.1, fill.2));
        content.push_str("/F1 ");
        content.push_str(&format!("{:.3} Tf\n", size));
        content.push_str(&format!("{:.3} {:.3} Td\n", x, y));
        content.push_str("(");
        // Escape special characters in PDF strings
        for ch in t.text.chars() {
            match ch {
                '(' | ')' | '\\' => {
                    content.push('\\');
                    content.push(ch);
                }
                '\n' | '\r' | '\t' => content.push(' '),
                _ => content.push(ch),
            }
        }
        content.push_str(") Tj\n");
        content.push_str("ET\n");
    }

    // Create content stream object
    let content_id = doc.add_object(Stream::new(dictionary! {}, content.into_bytes()));

    // Create font object
    let font_id = doc.add_object(dictionary! {
        "Type" => "Font",
        "Subtype" => "Type1",
        "BaseFont" => "Helvetica",
    });

    // Create resources object
    let resources_id = doc.add_object(dictionary! {
        "Font" => dictionary! {
            "F1" => font_id,
        },
    });

    // Update page object
    let page = dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "Contents" => content_id,
        "Resources" => resources_id,
        "MediaBox" => vec![0.into(), 0.into(), w_pt.into(), h_pt.into()],
    };
    doc.objects.insert(page_id, Object::Dictionary(page));

    // Update pages object
    let pages = dictionary! {
        "Type" => "Pages",
        "Kids" => vec![page_id.into()],
        "Count" => 1,
    };
    doc.objects.insert(pages_id, Object::Dictionary(pages));

    // Create catalog
    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });

    // Set catalog as root and save
    doc.trailer.set("Root", catalog_id);
    doc.compress();

    let mut buf = Vec::new();
    doc.save_to(&mut buf)
        .map_err(|e| format!("Failed to save PDF: {}", e))?;

    Ok(buf)
}

// =============================================================================
// Commands
// =============================================================================

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn drawing_export_svg(drawing: Drawing, path: String) -> Result<(), String> {
    let p = Path::new(&path);
    ensure_parent_dir(p)?;
    let svg = export_svg(&drawing);
    fs::write(p, svg).map_err(|e| format!("Failed to write SVG: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn drawing_export_dxf(drawing: Drawing, path: String) -> Result<(), String> {
    let p = Path::new(&path);
    ensure_parent_dir(p)?;
    let dxf = export_dxf(&drawing);
    fs::write(p, dxf).map_err(|e| format!("Failed to write DXF: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn drawing_export_pdf(drawing: Drawing, path: String) -> Result<(), String> {
    let p = Path::new(&path);
    ensure_parent_dir(p)?;
    let pdf = export_pdf_bytes(&drawing)?;
    fs::write(p, pdf).map_err(|e| format!("Failed to write PDF: {}", e))?;
    Ok(())
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_paper_xy_mm_center() {
        // Center point (0, 0) should map to center of sheet
        let (px, py) = to_paper_xy_mm(297.0, 420.0, 0.0, 0.0);
        assert!((px - 148.5).abs() < 0.001);
        assert!((py - 210.0).abs() < 0.001);
    }

    #[test]
    fn test_to_paper_xy_mm_right_up() {
        // Point to the right and up should map correctly
        let (px, py) = to_paper_xy_mm(297.0, 420.0, 50.0, 50.0);
        assert!((px - 198.5).abs() < 0.001); // 148.5 + 50
        assert!((py - 160.0).abs() < 0.001); // 210 - 50 (y is flipped)
    }

    #[test]
    fn test_to_paper_xy_mm_left_down() {
        // Point to the left and down should map correctly
        let (px, py) = to_paper_xy_mm(297.0, 420.0, -50.0, -50.0);
        assert!((px - 98.5).abs() < 0.001); // 148.5 - 50
        assert!((py - 260.0).abs() < 0.001); // 210 + 50 (y is flipped)
    }

    #[test]
    fn test_dimension_view_offset_applied() {
        // Create a minimal drawing with a view and dimension
        let drawing = Drawing {
            id: "test".to_string(),
            name: "Test Drawing".to_string(),
            sheet_config: SheetConfig {
                orientation: "portrait".to_string(),
                size: PaperSize::Standard("A3".to_string()),
                scale: 1.0,
                projection_angle: "third".to_string(),
                units: "mm".to_string(),
                title_block: "simple".to_string(),
                title_block_info: None,
                line_widths: None,
            },
            views: vec![DrawingView {
                id: "view1".to_string(),
                projection: ProjectionResult {
                    lines: vec![],
                    bounding_box: Some(BoundingBox2D {
                        min: Point2D { x: -10.0, y: -10.0 },
                        max: Point2D { x: 10.0, y: 10.0 },
                    }),
                    label: Some("Top View".to_string()),
                },
                position: [50.0, 30.0], // View offset in paper center-origin coords
                visible: true,
                label: None,
            }],
            dimensions: Some(DimensionSet {
                dimensions: vec![Dimension {
                    dim_type: "Linear".to_string(),
                    value: 20.0,
                    unit: "mm".to_string(),
                    text_position: Point2D { x: 0.0, y: 10.0 }, // View-relative
                    extension_lines: vec![
                        ExtensionLine {
                            start: Point2D { x: -10.0, y: 0.0 }, // View-relative
                            end: Point2D { x: -10.0, y: 5.0 },
                        },
                        ExtensionLine {
                            start: Point2D { x: 10.0, y: 0.0 },
                            end: Point2D { x: 10.0, y: 5.0 },
                        },
                    ],
                    dimension_line: DimensionLine {
                        start: Point2D { x: -10.0, y: 5.0 }, // View-relative
                        end: Point2D { x: 10.0, y: 5.0 },
                        start_arrow: None,
                        end_arrow: None,
                    },
                    prefix: None,
                    suffix: None,
                    label_override: None,
                    view_id: Some("view1".to_string()), // Attached to view1
                }],
                config: DimensionConfig {
                    arrow_size: 3.0,
                    text_height: 3.5,
                    precision: 2,
                    show_unit: false,
                },
            }),
        };

        let (w, h) = paper_dimensions_mm(&drawing.sheet_config.size, &drawing.sheet_config.orientation);
        let (_width, _height, lines, _texts) = collect_export_primitives(&drawing);

        // Verify dimension lines were generated
        let dim_lines: Vec<_> = lines
            .iter()
            .filter(|l| l.layer == "DIMENSION")
            .collect();

        assert!(dim_lines.len() >= 3, "Should have dimension line + extension lines");

        // Find the main dimension line (the longest one)
        let main_line = dim_lines
            .iter()
            .max_by(|a, b| {
                let len_a = ((a.x2 - a.x1).powi(2) + (a.y2 - a.y1).powi(2)).sqrt();
                let len_b = ((b.x2 - b.x1).powi(2) + (b.y2 - b.y1).powi(2)).sqrt();
                len_a.partial_cmp(&len_b).unwrap()
            })
            .unwrap();

        // The dimension line should be transformed:
        // 1. View-relative: start=(-10, 5), end=(10, 5)
        // 2. Add view offset: start=(-10+50, 5+30)=(40, 35), end=(10+50, 5+30)=(60, 35)
        // 3. Convert to paper: to_paper_xy_mm(w, h, 40, 35) and to_paper_xy_mm(w, h, 60, 35)

        let expected_x1 = w / 2.0 + 40.0;
        let expected_y1 = h / 2.0 - 35.0;
        let expected_x2 = w / 2.0 + 60.0;
        let expected_y2 = h / 2.0 - 35.0;

        assert!((main_line.x1 - expected_x1).abs() < 0.1,
            "Dimension start x should be {} but got {}", expected_x1, main_line.x1);
        assert!((main_line.y1 - expected_y1).abs() < 0.1,
            "Dimension start y should be {} but got {}", expected_y1, main_line.y1);
        assert!((main_line.x2 - expected_x2).abs() < 0.1,
            "Dimension end x should be {} but got {}", expected_x2, main_line.x2);
        assert!((main_line.y2 - expected_y2).abs() < 0.1,
            "Dimension end y should be {} but got {}", expected_y2, main_line.y2);
    }

    #[test]
    fn test_export_primitives_has_grid_and_titleblock() {
        // Create a minimal drawing
        let drawing = Drawing {
            id: "test".to_string(),
            name: "Test Drawing".to_string(),
            sheet_config: SheetConfig {
                orientation: "landscape".to_string(),
                size: PaperSize::Standard("A4".to_string()),
                scale: 1.0,
                projection_angle: "third".to_string(),
                units: "mm".to_string(),
                title_block: "standard".to_string(),
                title_block_info: Some(TitleBlockInfo {
                    title: Some("Test".to_string()),
                    author: Some("Tester".to_string()),
                    revision: Some("A".to_string()),
                    sheet_number: Some("1/1".to_string()),
                }),
                line_widths: None,
            },
            views: vec![],
            dimensions: None,
        };

        let (_width, _height, lines, texts) = collect_export_primitives(&drawing);

        // Should have grid references
        let grid_lines: Vec<_> = lines.iter().filter(|l| l.layer == "GRID").collect();
        assert!(grid_lines.len() > 0, "Should have grid reference lines");

        // Should have title block
        let titleblock_lines: Vec<_> = lines.iter().filter(|l| l.layer == "TITLEBLOCK").collect();
        assert!(titleblock_lines.len() > 0, "Should have title block lines");

        // Should have title block text
        let titleblock_texts: Vec<_> = texts.iter().filter(|t| t.layer == "TITLEBLOCK").collect();
        assert!(titleblock_texts.len() > 0, "Should have title block text");
    }

    #[test]
    fn test_pdf_export_creates_valid_structure() {
        // Create a minimal drawing
        let drawing = Drawing {
            id: "test".to_string(),
            name: "Test Drawing".to_string(),
            sheet_config: SheetConfig {
                orientation: "portrait".to_string(),
                size: PaperSize::Standard("A4".to_string()),
                scale: 1.0,
                projection_angle: "third".to_string(),
                units: "mm".to_string(),
                title_block: "simple".to_string(),
                title_block_info: None,
                line_widths: None,
            },
            views: vec![],
            dimensions: None,
        };

        let pdf_bytes = export_pdf_bytes(&drawing).expect("PDF export should succeed");

        // Basic validation: PDF should start with %PDF
        assert!(pdf_bytes.len() > 100, "PDF should have content");
        assert_eq!(&pdf_bytes[0..4], b"%PDF", "PDF should have PDF header");
    }

    #[test]
    fn test_clamp_nonzero() {
        assert_eq!(clamp_nonzero(5.0, 10.0), 5.0);
        assert_eq!(clamp_nonzero(0.0, 10.0), 10.0);
        assert_eq!(clamp_nonzero(-1.0, 10.0), 10.0);
    }

    #[test]
    fn test_format_dimension_text() {
        let dim = Dimension {
            dim_type: "Linear".to_string(),
            value: 25.5,
            unit: "mm".to_string(),
            text_position: Point2D { x: 0.0, y: 0.0 },
            extension_lines: vec![],
            dimension_line: DimensionLine {
                start: Point2D { x: 0.0, y: 0.0 },
                end: Point2D { x: 25.5, y: 0.0 },
                start_arrow: None,
                end_arrow: None,
            },
            prefix: Some("L=".to_string()),
            suffix: None,
            label_override: None,
            view_id: None,
        };

        let config = DimensionConfig {
            arrow_size: 3.0,
            text_height: 3.5,
            precision: 2,
            show_unit: true,
        };

        let text = format_dimension_text(&dim, &config);
        assert_eq!(text, "L=25.50 mm");

        // Test with label override
        let dim_override = Dimension {
            label_override: Some("Custom".to_string()),
            ..dim
        };
        let text_override = format_dimension_text(&dim_override, &config);
        assert_eq!(text_override, "Custom");
    }
}
