//! Error types for IFC operations

use thiserror::Error;

/// Result type for IFC operations
pub type IfcResult<T> = Result<T, IfcError>;

/// Errors that can occur during IFC operations
#[derive(Error, Debug)]
pub enum IfcError {
    #[error("Failed to read IFC file: {0}")]
    ReadError(String),

    #[error("Failed to parse IFC file: {0}")]
    ParseError(String),

    #[error("Invalid IFC schema: {0}")]
    SchemaError(String),

    #[error("Geometry conversion failed: {0}")]
    GeometryError(String),

    #[error("Unsupported IFC entity: {0}")]
    UnsupportedEntity(String),

    #[error("Missing required property: {0}")]
    MissingProperty(String),

    #[error("Failed to write IFC file: {0}")]
    WriteError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Internal error: {0}")]
    Internal(String),
}
