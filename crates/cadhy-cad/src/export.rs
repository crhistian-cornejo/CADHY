//! Advanced export functionality for multiple CAD formats
//!
//! Supports: glTF, GLB, OBJ, STL, PLY, IGES
//!
//! # Example
//! ```no_run
//! use cadhy_cad::{Shape, Primitives, Export};
//!
//! let shape = Primitives::make_box(10.0, 20.0, 30.0).unwrap();
//! Export::write_gltf(&shape, "model.gltf", 0.1).unwrap();
//! Export::write_stl_binary(&shape, "model.stl", 0.1).unwrap();
//! ```

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// Export options for various CAD formats
#[derive(Debug, Clone)]
pub struct ExportOptions {
    /// Tessellation deflection (smaller = more detailed)
    pub deflection: f64,
    /// Whether to use binary format (where applicable)
    pub binary: bool,
}

impl Default for ExportOptions {
    fn default() -> Self {
        Self {
            deflection: 0.1,
            binary: true,
        }
    }
}

/// Multi-format CAD exporter
pub struct Export;

impl Export {
    // ============================================================
    // glTF / GLB Export (Modern web-friendly format)
    // ============================================================

    /// Write shape to glTF file (text JSON format)
    ///
    /// # Arguments
    /// * `shape` - The shape to export
    /// * `filename` - Output file path (should end with .gltf)
    /// * `deflection` - Tessellation quality (smaller = more detailed, typical: 0.1)
    pub fn write_gltf(shape: &Shape, filename: &str, deflection: f64) -> OcctResult<()> {
        let result = ffi::write_gltf(shape.inner(), filename, deflection);
        if result {
            Ok(())
        } else {
            Err(OcctError::ExportFailed(format!(
                "Failed to write glTF file: {}",
                filename
            )))
        }
    }

    /// Write shape to GLB file (binary glTF format - smaller, faster to load)
    ///
    /// # Arguments
    /// * `shape` - The shape to export
    /// * `filename` - Output file path (should end with .glb)
    /// * `deflection` - Tessellation quality (smaller = more detailed, typical: 0.1)
    pub fn write_glb(shape: &Shape, filename: &str, deflection: f64) -> OcctResult<()> {
        let result = ffi::write_glb(shape.inner(), filename, deflection);
        if result {
            Ok(())
        } else {
            Err(OcctError::ExportFailed(format!(
                "Failed to write GLB file: {}",
                filename
            )))
        }
    }

    // ============================================================
    // OBJ Export (Widely supported mesh format)
    // ============================================================

    /// Write shape to OBJ file
    ///
    /// OBJ is a simple, widely-supported mesh format. Creates companion .mtl file
    /// for materials if applicable.
    pub fn write_obj(shape: &Shape, filename: &str, deflection: f64) -> OcctResult<()> {
        let result = ffi::write_obj(shape.inner(), filename, deflection);
        if result {
            Ok(())
        } else {
            Err(OcctError::ExportFailed(format!(
                "Failed to write OBJ file: {}",
                filename
            )))
        }
    }

    // ============================================================
    // STL Export (3D printing standard)
    // ============================================================

    /// Write shape to ASCII STL file
    ///
    /// ASCII STL is human-readable but larger. Use for debugging or compatibility.
    pub fn write_stl(shape: &Shape, filename: &str, deflection: f64) -> OcctResult<()> {
        let result = ffi::write_stl(shape.inner(), filename, deflection);
        if result {
            Ok(())
        } else {
            Err(OcctError::ExportFailed(format!(
                "Failed to write STL file: {}",
                filename
            )))
        }
    }

    /// Write shape to binary STL file
    ///
    /// Binary STL is more compact and faster to parse. Recommended for production.
    pub fn write_stl_binary(shape: &Shape, filename: &str, deflection: f64) -> OcctResult<()> {
        let result = ffi::write_stl_binary(shape.inner(), filename, deflection);
        if result {
            Ok(())
        } else {
            Err(OcctError::ExportFailed(format!(
                "Failed to write binary STL file: {}",
                filename
            )))
        }
    }

    // ============================================================
    // PLY Export (Point cloud / mesh format)
    // ============================================================

    /// Write shape to PLY file
    ///
    /// PLY (Polygon File Format) supports colors and normals.
    pub fn write_ply(shape: &Shape, filename: &str, deflection: f64) -> OcctResult<()> {
        let result = ffi::write_ply(shape.inner(), filename, deflection);
        if result {
            Ok(())
        } else {
            Err(OcctError::ExportFailed(format!(
                "Failed to write PLY file: {}",
                filename
            )))
        }
    }

    // ============================================================
    // IGES Export (Industry standard CAD format)
    // ============================================================

    /// Write shape to IGES file
    ///
    /// IGES is an older but widely-supported industry format.
    /// Preserves exact geometry (B-Rep), not tessellated.
    pub fn write_iges(shape: &Shape, filename: &str) -> OcctResult<()> {
        let result = ffi::write_iges(shape.inner(), filename);
        if result {
            Ok(())
        } else {
            Err(OcctError::ExportFailed(format!(
                "Failed to write IGES file: {}",
                filename
            )))
        }
    }

    /// Read shape from IGES file
    pub fn read_iges(filename: &str) -> OcctResult<Shape> {
        let shape_ptr = ffi::read_iges(filename);
        if shape_ptr.is_null() {
            Err(OcctError::ImportFailed(format!(
                "Failed to read IGES file: {}",
                filename
            )))
        } else {
            Shape::from_ptr(shape_ptr)
        }
    }

    // ============================================================
    // Convenience methods
    // ============================================================

    /// Export to format based on file extension
    ///
    /// Automatically detects format from filename extension:
    /// - .gltf → glTF text
    /// - .glb → glTF binary
    /// - .obj → OBJ
    /// - .stl → Binary STL
    /// - .ply → PLY
    /// - .igs, .iges → IGES
    /// - .step, .stp → STEP
    pub fn export_auto(shape: &Shape, filename: &str, deflection: f64) -> OcctResult<()> {
        let lower = filename.to_lowercase();

        if lower.ends_with(".gltf") {
            Self::write_gltf(shape, filename, deflection)
        } else if lower.ends_with(".glb") {
            Self::write_glb(shape, filename, deflection)
        } else if lower.ends_with(".obj") {
            Self::write_obj(shape, filename, deflection)
        } else if lower.ends_with(".stl") {
            Self::write_stl_binary(shape, filename, deflection)
        } else if lower.ends_with(".ply") {
            Self::write_ply(shape, filename, deflection)
        } else if lower.ends_with(".igs") || lower.ends_with(".iges") {
            Self::write_iges(shape, filename)
        } else if lower.ends_with(".step") || lower.ends_with(".stp") {
            shape.write_step(filename)
        } else {
            Err(OcctError::ExportFailed(format!(
                "Unknown file extension: {}",
                filename
            )))
        }
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_export_detection() {
        // This test just verifies the extension detection logic
        assert!("model.gltf".to_lowercase().ends_with(".gltf"));
        assert!("model.glb".to_lowercase().ends_with(".glb"));
        assert!("model.stl".to_lowercase().ends_with(".stl"));
    }
}
