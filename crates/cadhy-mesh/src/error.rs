//! Error types for mesh generation

use thiserror::Error;

/// Result type alias for mesh operations
pub type Result<T> = std::result::Result<T, MeshError>;

/// Mesh generation errors
#[derive(Error, Debug)]
pub enum MeshError {
    /// Initialization failed
    #[error("Mesh initialization failed: {0}")]
    InitializationFailed(String),

    /// Backend not available (feature not enabled or library not found)
    #[error("Mesh backend '{0}' is not available")]
    BackendNotAvailable(String),

    /// Invalid input geometry
    #[error("Invalid input geometry: {0}")]
    InvalidGeometry(String),

    /// Meshing failed
    #[error("Mesh generation failed: {0}")]
    GenerationFailed(String),

    /// Invalid mesh parameters
    #[error("Invalid mesh parameters: {0}")]
    InvalidParameters(String),

    /// Mesh quality check failed
    #[error("Mesh quality check failed: {0}")]
    QualityCheckFailed(String),

    /// Export error
    #[error("Failed to export mesh: {0}")]
    ExportError(String),

    /// Import error
    #[error("Failed to import mesh: {0}")]
    ImportError(String),

    /// FFI error from C++ backend
    #[error("FFI error: {0}")]
    FfiError(String),

    /// IO error
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    /// Generic error
    #[error("{0}")]
    Other(String),
}

impl From<anyhow::Error> for MeshError {
    fn from(err: anyhow::Error) -> Self {
        MeshError::Other(err.to_string())
    }
}
