//! Error types for cadhy-cad

use thiserror::Error;

/// Result type for OCCT operations
pub type OcctResult<T> = Result<T, OcctError>;

/// Errors that can occur during OCCT operations
#[derive(Error, Debug)]
pub enum OcctError {
    #[error("Failed to create primitive: {0}")]
    PrimitiveCreationFailed(String),

    #[error("Boolean operation failed: {0}")]
    BooleanOperationFailed(String),

    #[error("Fillet/Chamfer operation failed: {0}")]
    FilletChamferFailed(String),

    #[error("Tessellation failed: {0}")]
    TessellationFailed(String),

    #[error("STEP import failed: {0}")]
    StepImportFailed(String),

    #[error("STEP export failed: {0}")]
    StepExportFailed(String),

    #[error("IGES import failed: {0}")]
    IgesImportFailed(String),

    #[error("IGES export failed: {0}")]
    IgesExportFailed(String),

    #[error("Export failed: {0}")]
    ExportFailed(String),

    #[error("Import failed: {0}")]
    ImportFailed(String),

    #[error("I/O error: {0}")]
    IoError(String),

    #[error("Invalid shape: {0}")]
    InvalidShape(String),

    #[error("Shape is null or empty")]
    NullShape,

    #[error("FFI error: {0}")]
    FfiError(String),

    #[error("Operation failed: {0}")]
    OperationFailed(String),

    #[error("Transform failed: {0}")]
    TransformFailed(String),

    #[error("Wire/Sketch operation failed: {0}")]
    WireOperationFailed(String),

    #[error("Analysis failed: {0}")]
    AnalysisFailed(String),
}

impl From<cxx::Exception> for OcctError {
    fn from(e: cxx::Exception) -> Self {
        OcctError::FfiError(e.what().to_string())
    }
}
