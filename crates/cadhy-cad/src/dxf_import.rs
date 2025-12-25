//! DXF file import support
//!
//! Parses AutoCAD DXF files and converts entities to CADHY shapes.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

#[cfg(feature = "dxf-import")]
use crate::{Curves, OcctError, OcctResult, Shape};

#[cfg(feature = "dxf-import")]
use dxf::{entities::EntityType, Drawing};

#[cfg(not(feature = "dxf-import"))]
use crate::error::{OcctError, OcctResult};

/// Result of importing a DXF file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DxfImportResult {
    /// Imported entity metadata (geometry stored separately)
    pub entities: Vec<DxfEntityInfo>,
    /// Total entity count
    pub total_count: usize,
    /// Warnings during import
    pub warnings: Vec<String>,
    /// Layers found in file
    pub layers: Vec<DxfLayer>,
}

/// Metadata for an imported DXF entity (without the geometry itself)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DxfEntityInfo {
    /// Index in the shapes vector
    pub index: usize,
    /// Layer name
    pub layer: String,
    /// Entity type
    pub entity_type: String,
    /// Color (DXF color index)
    pub color: i32,
    /// Handle (DXF handle as string)
    pub handle: Option<String>,
    /// Whether geometry was successfully created
    pub has_geometry: bool,
}

/// DXF layer information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DxfLayer {
    /// Layer name
    pub name: String,
    /// Color
    pub color: i32,
    /// Is visible
    pub visible: bool,
    /// Is frozen (always false - dxf crate doesn't expose this)
    pub frozen: bool,
    /// Is locked (always false - dxf crate doesn't expose this)
    pub locked: bool,
    /// Entity count
    pub entity_count: usize,
}

/// Result containing both metadata and geometry
#[cfg(feature = "dxf-import")]
pub struct DxfImportWithShapes {
    /// Metadata result (serializable)
    pub result: DxfImportResult,
    /// Shapes (one per entity with has_geometry=true)
    pub shapes: Vec<Shape>,
}

/// DXF importer
#[cfg(feature = "dxf-import")]
pub struct DxfImporter {
    drawing: Drawing,
}

#[cfg(feature = "dxf-import")]
impl DxfImporter {
    /// Load a DXF file from path
    pub fn from_file<P: AsRef<Path>>(path: P) -> OcctResult<Self> {
        let drawing = Drawing::load_file(path.as_ref()).map_err(|e| {
            OcctError::IOError(format!(
                "Failed to read DXF file '{}': {}",
                path.as_ref().display(),
                e
            ))
        })?;

        Ok(Self { drawing })
    }

    /// Import all entities from the DXF file
    pub fn import(&self) -> OcctResult<DxfImportWithShapes> {
        let mut entities = Vec::new();
        let mut shapes = Vec::new();
        let mut warnings = Vec::new();
        let mut layer_counts: HashMap<String, usize> = HashMap::new();
        let mut shape_index = 0usize;

        for entity in self.drawing.entities() {
            let layer = entity.common.layer.clone();
            *layer_counts.entry(layer.clone()).or_insert(0) += 1;

            let (entity_type, shape_result) = self.convert_entity(&entity.specific);

            let has_geometry = shape_result.is_some();
            let current_index = shape_index;

            if let Some(shape) = shape_result {
                shapes.push(shape);
                shape_index += 1;
            } else if entity_type != "UNKNOWN" && entity_type != "TEXT" && entity_type != "POINT" {
                warnings.push(format!(
                    "Failed to create geometry for {} entity",
                    entity_type
                ));
            }

            entities.push(DxfEntityInfo {
                index: current_index,
                layer,
                entity_type,
                color: entity.common.color.index().unwrap_or(7) as i32,
                handle: Some(format!("{:X}", entity.common.handle.0)),
                has_geometry,
            });
        }

        // Build layer info
        let layers: Vec<DxfLayer> = self
            .drawing
            .layers()
            .map(|layer| DxfLayer {
                name: layer.name.clone(),
                color: layer.color.index().unwrap_or(7) as i32,
                visible: layer.is_layer_on,
                frozen: false,
                locked: false,
                entity_count: layer_counts.get(&layer.name).copied().unwrap_or(0),
            })
            .collect();

        Ok(DxfImportWithShapes {
            result: DxfImportResult {
                total_count: entities.len(),
                entities,
                warnings,
                layers,
            },
            shapes,
        })
    }

    /// Convert a single DXF entity to a Shape
    fn convert_entity(&self, entity: &EntityType) -> (String, Option<Shape>) {
        match entity {
            EntityType::Line(line) => {
                let result = Curves::make_line(
                    line.p1.x, line.p1.y, line.p1.z, line.p2.x, line.p2.y, line.p2.z,
                );
                ("LINE".to_string(), result.ok())
            }
            EntityType::Circle(circle) => {
                let result = Curves::make_circle(
                    circle.center.x,
                    circle.center.y,
                    circle.center.z,
                    circle.normal.x,
                    circle.normal.y,
                    circle.normal.z,
                    circle.radius,
                );
                ("CIRCLE".to_string(), result.ok())
            }
            EntityType::Arc(arc) => {
                let start_angle = arc.start_angle.to_radians();
                let end_angle = arc.end_angle.to_radians();
                let result = Curves::make_arc(
                    arc.center.x,
                    arc.center.y,
                    arc.center.z,
                    arc.normal.x,
                    arc.normal.y,
                    arc.normal.z,
                    arc.radius,
                    start_angle,
                    end_angle,
                );
                ("ARC".to_string(), result.ok())
            }
            EntityType::Polyline(polyline) => {
                let vertices: Vec<_> = polyline.vertices().collect();
                if vertices.len() >= 2 {
                    let points: Vec<(f64, f64, f64)> = vertices
                        .iter()
                        .map(|v| (v.location.x, v.location.y, v.location.z))
                        .collect();

                    let result = if polyline.is_closed() {
                        Curves::make_polygon_3d(&points)
                    } else {
                        Curves::make_polyline_3d(&points)
                    };
                    ("POLYLINE".to_string(), result.ok())
                } else {
                    ("POLYLINE".to_string(), None)
                }
            }
            EntityType::LwPolyline(lwpolyline) => {
                if lwpolyline.vertices.len() >= 2 {
                    let points: Vec<(f64, f64)> =
                        lwpolyline.vertices.iter().map(|v| (v.x, v.y)).collect();

                    let result = if lwpolyline.is_closed() {
                        Curves::make_polygon_2d(&points)
                    } else {
                        Curves::make_polyline_2d(&points)
                    };
                    ("LWPOLYLINE".to_string(), result.ok())
                } else {
                    ("LWPOLYLINE".to_string(), None)
                }
            }
            EntityType::Ellipse(ellipse) => {
                let major_length = (ellipse.major_axis.x.powi(2)
                    + ellipse.major_axis.y.powi(2)
                    + ellipse.major_axis.z.powi(2))
                .sqrt();

                let minor_length = major_length * ellipse.minor_axis_ratio;

                // Calculate rotation angle from major axis direction
                let rotation = ellipse.major_axis.y.atan2(ellipse.major_axis.x);

                let result = Curves::make_ellipse(
                    ellipse.center.x,
                    ellipse.center.y,
                    ellipse.center.z,
                    ellipse.normal.x,
                    ellipse.normal.y,
                    ellipse.normal.z,
                    major_length,
                    minor_length,
                    rotation,
                );
                ("ELLIPSE".to_string(), result.ok())
            }
            EntityType::Spline(spline) => {
                if spline.control_points.len() >= 2 {
                    let points: Vec<(f64, f64, f64)> = spline
                        .control_points
                        .iter()
                        .map(|p| (p.x, p.y, p.z))
                        .collect();

                    // Check if spline is closed by examining flag
                    let is_closed = spline.flags & 1 != 0; // Bit 0 = closed

                    let result = Curves::make_bspline(&points, is_closed);
                    ("SPLINE".to_string(), result.ok())
                } else {
                    ("SPLINE".to_string(), None)
                }
            }
            EntityType::Text(_) | EntityType::MText(_) => {
                // Text entities are not converted to geometry
                ("TEXT".to_string(), None)
            }
            EntityType::Insert(_) => {
                // Block references require block table support
                ("INSERT".to_string(), None)
            }
            EntityType::Solid(_) | EntityType::Face3D(_) => {
                // 3D solids/faces require more complex handling
                ("3DSOLID".to_string(), None)
            }
            _ => ("UNKNOWN".to_string(), None),
        }
    }

    /// Get all layer names
    pub fn layer_names(&self) -> Vec<String> {
        self.drawing.layers().map(|l| l.name.clone()).collect()
    }

    /// Get drawing units description
    pub fn units(&self) -> String {
        format!("{:?}", self.drawing.header.default_drawing_units)
    }
}

/// Import a DXF file (convenience function)
#[cfg(feature = "dxf-import")]
pub fn import_dxf<P: AsRef<Path>>(path: P) -> OcctResult<DxfImportWithShapes> {
    let importer = DxfImporter::from_file(path)?;
    importer.import()
}

/// Stub when feature is disabled
#[cfg(not(feature = "dxf-import"))]
pub fn import_dxf<P: AsRef<std::path::Path>>(_path: P) -> OcctResult<DxfImportResult> {
    Err(OcctError::Unimplemented(
        "DXF import requires the 'dxf-import' feature".to_string(),
    ))
}

#[cfg(test)]
#[cfg(feature = "dxf-import")]
mod tests {
    #[test]
    fn test_dxf_module_compiles() {
        // Ensures the module compiles correctly
    }
}
