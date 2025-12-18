//! STEP file import/export
//!
//! Read and write STEP (ISO 10303-21) CAD files.

use std::path::Path;

use crate::error::{OcctError, OcctResult};
use crate::ffi::ffi;
use crate::shape::Shape;

/// STEP file I/O operations
pub struct StepIO;

impl StepIO {
    /// Read a STEP file and return the shape
    ///
    /// # Arguments
    /// * `path` - Path to the STEP file (.step or .stp)
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::StepIO;
    ///
    /// let shape = StepIO::read("model.step").unwrap();
    /// ```
    pub fn read<P: AsRef<Path>>(path: P) -> OcctResult<Shape> {
        let path_str = path.as_ref().to_string_lossy().to_string();

        if !path.as_ref().exists() {
            return Err(OcctError::StepImportFailed(format!(
                "File not found: {}",
                path_str
            )));
        }

        let ptr = ffi::read_step(&path_str);
        Shape::from_ptr(ptr).map_err(|_| {
            OcctError::StepImportFailed(format!("Failed to read STEP file: {}", path_str))
        })
    }

    /// Write a shape to a STEP file
    ///
    /// # Arguments
    /// * `shape` - The shape to export
    /// * `path` - Output file path
    ///
    /// # Example
    /// ```no_run
    /// use cadhy_cad::{Primitives, StepIO};
    ///
    /// let shape = Primitives::make_box(10.0, 20.0, 30.0).unwrap();
    /// StepIO::write(&shape, "output.step").unwrap();
    /// ```
    pub fn write<P: AsRef<Path>>(shape: &Shape, path: P) -> OcctResult<()> {
        let path_str = path.as_ref().to_string_lossy().to_string();

        let success = ffi::write_step(shape.inner(), &path_str);

        if success {
            Ok(())
        } else {
            Err(OcctError::StepExportFailed(format!(
                "Failed to write STEP file: {}",
                path_str
            )))
        }
    }
}
