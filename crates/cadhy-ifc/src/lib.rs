//! # cadhy-ifc
//!
//! IFC (Industry Foundation Classes) import/export support for CADHY.
//!
//! This crate provides:
//! - IFC 2x3 and IFC 4.x file parsing
//! - Geometry extraction and conversion
//! - Property set extraction
//! - IFC export with hydraulic properties
//!
//! ## Example
//!
//! ```ignore
//! use cadhy_ifc::{IfcImporter, IfcExporter};
//!
//! // Import
//! let importer = IfcImporter::from_file("model.ifc")?;
//! let objects = importer.extract_geometry()?;
//!
//! // Export
//! let mut exporter = IfcExporter::new("My Project");
//! exporter.add_hydraulic_channel(&shape, &properties)?;
//! exporter.write_to_file("output.ifc")?;
//! ```

pub mod error;
pub mod exporter;
pub mod geometry;
pub mod parser;
pub mod types;

pub use error::{IfcError, IfcResult};
pub use exporter::IfcExporter;
pub use parser::IfcImporter;
pub use types::*;
