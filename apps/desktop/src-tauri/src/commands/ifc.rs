//! IFC import/export Tauri commands
//!
//! Provides commands for importing and exporting IFC files.

use cadhy_ifc::{
    ExportOptions, HydraulicProperties, IfcExporter, IfcImporter, MeshGeometry,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Import result for frontend
#[derive(Debug, Serialize)]
pub struct IfcImportResult {
    pub objects: Vec<ImportedObjectInfo>,
    pub total_count: usize,
    pub warnings: Vec<String>,
    pub schema: String,
}

/// Simplified object info for frontend
#[derive(Debug, Serialize)]
pub struct ImportedObjectInfo {
    pub id: String,
    pub name: String,
    pub ifc_class: String,
    pub global_id: String,
    pub has_geometry: bool,
    pub properties: HashMap<String, serde_json::Value>,
}

/// Mesh data for frontend
#[derive(Debug, Serialize)]
pub struct MeshDataResult {
    pub vertices: Vec<f64>,
    pub indices: Vec<u32>,
    pub normals: Option<Vec<f64>>,
}

/// Export options from frontend
#[derive(Debug, Deserialize)]
pub struct ExportOptionsInput {
    pub project_name: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub organization: Option<String>,
    pub include_hydraulics: bool,
}

/// Channel data for export
#[derive(Debug, Deserialize)]
pub struct ChannelExportData {
    pub name: String,
    pub vertices: Vec<f64>,
    pub indices: Vec<u32>,
    pub normals: Option<Vec<f64>>,
    pub properties: HydraulicPropertiesInput,
}

/// Hydraulic properties input
#[derive(Debug, Deserialize)]
pub struct HydraulicPropertiesInput {
    pub manning_n: Option<f64>,
    pub slope: Option<f64>,
    pub design_flow: Option<f64>,
    pub normal_depth: Option<f64>,
    pub critical_depth: Option<f64>,
    pub froude_number: Option<f64>,
    pub width: Option<f64>,
    pub depth: Option<f64>,
    pub side_slope: Option<f64>,
    pub thickness: Option<f64>,
}

impl From<HydraulicPropertiesInput> for HydraulicProperties {
    fn from(input: HydraulicPropertiesInput) -> Self {
        HydraulicProperties {
            manning_n: input.manning_n,
            slope: input.slope,
            design_flow: input.design_flow,
            normal_depth: input.normal_depth,
            critical_depth: input.critical_depth,
            froude_number: input.froude_number,
            width: input.width,
            depth: input.depth,
            side_slope: input.side_slope,
            thickness: input.thickness,
        }
    }
}

/// Import an IFC file
#[tauri::command]
pub async fn import_ifc(file_path: String) -> Result<IfcImportResult, String> {
    let importer = IfcImporter::from_file(&file_path).map_err(|e| e.to_string())?;

    let result = importer.import().map_err(|e| e.to_string())?;

    let objects: Vec<ImportedObjectInfo> = result
        .objects
        .into_iter()
        .map(|obj| {
            let properties: HashMap<String, serde_json::Value> = obj
                .properties
                .into_iter()
                .map(|(k, v)| {
                    let json_val = match v {
                        cadhy_ifc::PropertyValue::String(s) => serde_json::Value::String(s),
                        cadhy_ifc::PropertyValue::Real(r) => serde_json::Value::Number(
                            serde_json::Number::from_f64(r).unwrap_or(serde_json::Number::from(0)),
                        ),
                        cadhy_ifc::PropertyValue::Integer(i) => serde_json::Value::Number(i.into()),
                        cadhy_ifc::PropertyValue::Boolean(b) => serde_json::Value::Bool(b),
                        cadhy_ifc::PropertyValue::List(_) => serde_json::Value::Array(vec![]),
                    };
                    (k, json_val)
                })
                .collect();

            ImportedObjectInfo {
                id: obj.id,
                name: obj.name,
                ifc_class: format!("{:?}", obj.ifc_class),
                global_id: obj.global_id,
                has_geometry: obj.geometry.is_some(),
                properties,
            }
        })
        .collect();

    Ok(IfcImportResult {
        total_count: objects.len(),
        objects,
        warnings: result.warnings,
        schema: format!("{}", result.schema),
    })
}

/// Preview an IFC file (lightweight import for UI preview)
#[tauri::command]
pub async fn preview_ifc(file_path: String) -> Result<IfcImportResult, String> {
    // Same as import for now, but could be optimized to skip geometry
    import_ifc(file_path).await
}

/// Export objects to IFC file
#[tauri::command]
pub async fn export_ifc(
    file_path: String,
    channels: Vec<ChannelExportData>,
    options: ExportOptionsInput,
) -> Result<String, String> {
    let export_options = ExportOptions {
        project_name: options.project_name,
        description: options.description,
        author: options.author,
        organization: options.organization,
        schema: cadhy_ifc::IfcSchema::Ifc4x3,
        include_hydraulics: options.include_hydraulics,
    };

    let mut exporter = IfcExporter::with_options(export_options);

    for channel in channels {
        let mesh = MeshGeometry {
            vertices: channel.vertices,
            indices: channel.indices,
            normals: channel.normals,
        };

        let props: HydraulicProperties = channel.properties.into();

        exporter
            .add_hydraulic_channel(&channel.name, &mesh, &props)
            .map_err(|e| e.to_string())?;
    }

    exporter
        .write_to_file(&file_path)
        .map_err(|e| e.to_string())?;

    Ok(file_path)
}

/// Get supported IFC versions
#[tauri::command]
pub fn get_ifc_versions() -> Vec<String> {
    vec![
        "IFC2X3".to_string(),
        "IFC4".to_string(),
        "IFC4X1".to_string(),
        "IFC4X2".to_string(),
        "IFC4X3".to_string(),
    ]
}
