//! DXF import Tauri commands
//!
//! Provides commands for importing DXF files.

#[cfg(feature = "dxf-import")]
use cadhy_cad::{import_dxf, DxfEntityInfo as CadDxfEntity, DxfLayer as CadDxfLayer};

use serde::{Deserialize, Serialize};

/// Import result for frontend
#[derive(Debug, Serialize)]
pub struct DxfImportResult {
    pub entities: Vec<DxfEntityInfo>,
    pub total_count: usize,
    pub warnings: Vec<String>,
    pub layers: Vec<DxfLayerInfo>,
}

/// Entity info for frontend
#[derive(Debug, Serialize)]
pub struct DxfEntityInfo {
    pub id: String,
    pub index: usize,
    pub layer: String,
    pub entity_type: String,
    pub color: i32,
    pub has_geometry: bool,
}

/// Layer info for frontend
#[derive(Debug, Serialize)]
pub struct DxfLayerInfo {
    pub name: String,
    pub color: i32,
    pub visible: bool,
    pub frozen: bool,
    pub locked: bool,
    pub entity_count: usize,
}

/// Import a DXF file
#[tauri::command]
pub async fn import_dxf_file(file_path: String) -> Result<DxfImportResult, String> {
    #[cfg(feature = "dxf-import")]
    {
        let result = import_dxf(&file_path).map_err(|e| e.to_string())?;

        let entities: Vec<DxfEntityInfo> = result
            .result
            .entities
            .into_iter()
            .enumerate()
            .map(|(idx, e)| DxfEntityInfo {
                id: format!("dxf_{}", idx),
                index: e.index,
                layer: e.layer,
                entity_type: e.entity_type,
                color: e.color,
                has_geometry: e.has_geometry,
            })
            .collect();

        let layers: Vec<DxfLayerInfo> = result
            .result
            .layers
            .into_iter()
            .map(|l| DxfLayerInfo {
                name: l.name,
                color: l.color,
                visible: l.visible,
                frozen: l.frozen,
                locked: l.locked,
                entity_count: l.entity_count,
            })
            .collect();

        Ok(DxfImportResult {
            total_count: entities.len(),
            entities,
            warnings: result.result.warnings,
            layers,
        })
    }

    #[cfg(not(feature = "dxf-import"))]
    {
        let _ = file_path;
        Err("DXF import is not enabled in this build".to_string())
    }
}

/// Preview a DXF file (lightweight import for UI preview)
#[tauri::command]
pub async fn preview_dxf(file_path: String) -> Result<DxfImportResult, String> {
    import_dxf_file(file_path).await
}

/// Get supported DXF versions
#[tauri::command]
pub fn get_dxf_versions() -> Vec<String> {
    vec![
        "AutoCAD R12 (DXF)".to_string(),
        "AutoCAD 2000 (DXF)".to_string(),
        "AutoCAD 2004 (DXF)".to_string(),
        "AutoCAD 2007 (DXF)".to_string(),
        "AutoCAD 2010 (DXF)".to_string(),
        "AutoCAD 2013 (DXF)".to_string(),
        "AutoCAD 2018 (DXF)".to_string(),
    ]
}
