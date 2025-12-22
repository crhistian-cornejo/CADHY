//! CADHY Export Module
//!
//! Provides functionality to export 3D geometry to various formats:
//! - STL (ASCII and Binary)
//! - OBJ (Wavefront)
//! - STEP (via OpenCASCADE, future)
//!
//! # Example
//! ```ignore
//! use cadhy_export::{export_mesh, ExportFormat, ExportMesh};
//!
//! let mesh = ExportMesh::new(vertices, indices);
//! export_mesh(&mesh, "output.stl", ExportFormat::StlBinary)?;
//! ```

use std::path::Path;
use thiserror::Error;

pub mod obj;
pub mod stl;

/// Export errors
#[derive(Debug, Error)]
pub enum ExportError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid mesh: {0}")]
    InvalidMesh(String),

    #[error("Format not supported: {0}")]
    UnsupportedFormat(String),
}

pub type Result<T> = std::result::Result<T, ExportError>;

/// Supported export formats
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    /// STL ASCII format
    StlAscii,
    /// STL Binary format
    StlBinary,
    /// Wavefront OBJ format
    Obj,
    /// STEP format (requires OpenCASCADE)
    Step,
}

impl ExportFormat {
    /// Get file extension for format
    pub fn extension(&self) -> &'static str {
        match self {
            ExportFormat::StlAscii | ExportFormat::StlBinary => "stl",
            ExportFormat::Obj => "obj",
            ExportFormat::Step => "step",
        }
    }

    /// Detect format from file extension
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_lowercase().as_str() {
            "stl" => Some(ExportFormat::StlBinary),
            "obj" => Some(ExportFormat::Obj),
            "step" | "stp" => Some(ExportFormat::Step),
            _ => None,
        }
    }
}

/// Simple mesh data for export
#[derive(Debug, Clone)]
pub struct ExportMesh {
    /// Vertices as [x, y, z] arrays
    pub vertices: Vec<[f64; 3]>,
    /// Triangle indices
    pub indices: Vec<u32>,
    /// Optional normals
    pub normals: Option<Vec<[f64; 3]>>,
}

impl ExportMesh {
    /// Create new export mesh
    pub fn new(vertices: Vec<[f64; 3]>, indices: Vec<u32>) -> Self {
        Self {
            vertices,
            indices,
            normals: None,
        }
    }

    /// Set normals
    pub fn with_normals(mut self, normals: Vec<[f64; 3]>) -> Self {
        self.normals = Some(normals);
        self
    }

    /// Validate mesh data
    pub fn validate(&self) -> Result<()> {
        if self.vertices.is_empty() {
            return Err(ExportError::InvalidMesh("No vertices".into()));
        }
        if self.indices.is_empty() {
            return Err(ExportError::InvalidMesh("No indices".into()));
        }
        if !self.indices.len().is_multiple_of(3) {
            return Err(ExportError::InvalidMesh(
                "Indices not divisible by 3".into(),
            ));
        }
        // Check indices are in bounds
        let max_idx = self.vertices.len() as u32;
        for idx in &self.indices {
            if *idx >= max_idx {
                return Err(ExportError::InvalidMesh(format!(
                    "Index {} out of bounds (max: {})",
                    idx,
                    max_idx - 1
                )));
            }
        }
        Ok(())
    }
}

/// Export mesh to file with specified format
pub fn export_mesh<P: AsRef<Path>>(mesh: &ExportMesh, path: P, format: ExportFormat) -> Result<()> {
    match format {
        ExportFormat::StlAscii => stl::export_ascii(mesh, path),
        ExportFormat::StlBinary => stl::export_binary(mesh, path),
        ExportFormat::Obj => obj::export(mesh, path),
        ExportFormat::Step => Err(ExportError::UnsupportedFormat(
            "STEP export requires cadhy-cad FFI bridge".into(),
        )),
    }
}

/// Export mesh to file (format auto-detected from extension)
pub fn export_auto<P: AsRef<Path>>(mesh: &ExportMesh, path: P) -> Result<()> {
    let path = path.as_ref();
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("stl");

    let format = ExportFormat::from_extension(ext).unwrap_or(ExportFormat::StlBinary);
    export_mesh(mesh, path, format)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_format_extension() {
        assert_eq!(ExportFormat::StlAscii.extension(), "stl");
        assert_eq!(ExportFormat::StlBinary.extension(), "stl");
        assert_eq!(ExportFormat::Obj.extension(), "obj");
        assert_eq!(ExportFormat::Step.extension(), "step");
    }

    #[test]
    fn test_export_format_from_extension() {
        assert_eq!(
            ExportFormat::from_extension("stl"),
            Some(ExportFormat::StlBinary)
        );
        assert_eq!(ExportFormat::from_extension("obj"), Some(ExportFormat::Obj));
        assert_eq!(
            ExportFormat::from_extension("step"),
            Some(ExportFormat::Step)
        );
        assert_eq!(
            ExportFormat::from_extension("stp"),
            Some(ExportFormat::Step)
        );
        assert_eq!(ExportFormat::from_extension("unknown"), None);
    }

    #[test]
    fn test_mesh_validation() {
        let mesh = ExportMesh::new(vec![[0.0, 0.0, 0.0]], vec![0, 1, 2]);
        assert!(mesh.validate().is_err()); // Index out of bounds
    }

    #[test]
    fn test_export_auto() {
        let mesh = ExportMesh::new(
            vec![[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [0.5, 1.0, 0.0]],
            vec![0, 1, 2],
        );

        let temp_dir = tempfile::tempdir().unwrap();

        // Test auto-detection for STL
        let stl_path = temp_dir.path().join("test.stl");
        export_auto(&mesh, &stl_path).unwrap();
        assert!(stl_path.exists());

        // Test auto-detection for OBJ
        let obj_path = temp_dir.path().join("test.obj");
        export_auto(&mesh, &obj_path).unwrap();
        assert!(obj_path.exists());
    }
}
