//! cadhy-mesh - Surface Mesh Generation Library
//!
//! This crate provides surface mesh generation capabilities for GraphCAD-AI,
//! using OpenCASCADE's TKMesh for triangulation.
//!
//! ## Features
//!
//! - **Surface Tessellation**: Convert BREP shapes to triangular meshes
//! - **Quality Control**: Adjustable deflection and angle parameters
//! - **Export Formats**: STL, OBJ, PLY support
//!
//! ## Usage
//!
//! ```rust,ignore
//! use cadhy_mesh::{MeshGenerator, MeshParams};
//!
//! // Create mesh generator
//! let generator = MeshGenerator::new()?;
//!
//! // Configure parameters
//! let params = MeshParams::builder()
//!     .linear_deflection(0.1)
//!     .angular_deflection(0.5)
//!     .build();
//!
//! // Generate mesh from OCCT shape
//! let mesh = generator.tessellate_shape(&shape, &params)?;
//!
//! // Export
//! mesh.export_stl("output.stl")?;
//! ```
//!
//! ## Note on Volumetric Meshing
//!
//! This library currently supports surface tessellation only.
//! Volumetric meshing (tetrahedra for FEM/FEA) requires additional
//! licensed components and may be added in a future release.

pub mod error;
pub mod export;
pub mod params;
pub mod quality;
pub mod types;

mod ffi;
mod generator;

// Re-exports
pub use error::{MeshError, Result};
pub use generator::MeshGenerator;
pub use params::*;
pub use quality::*;
pub use types::*;

/// Check available mesh backends
pub fn available_backends() -> Vec<&'static str> {
    vec!["occt"] // OpenCASCADE TKMesh is always available
}

/// Library version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
