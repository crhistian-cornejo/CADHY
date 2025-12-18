//! cadhy-cad - OpenCASCADE 7.9.2 bindings for GraphCAD-AI
//!
//! This crate provides safe Rust bindings to OpenCASCADE using precompiled
//! binaries and the cxx crate for FFI.
//!
//! # Features
//!
//! - **Primitives**: Box, Cylinder, Sphere, Cone
//! - **Operations**: Boolean union/difference/intersection, fillet, chamfer
//! - **I/O**: STEP, IGES, glTF, OBJ, STL, PLY import/export
//! - **Meshing**: Tessellation for visualization
//! - **Analysis**: Shape validation, geometry fixing, distance measurement
//! - **Configuration**: Centralized configuration for tolerances, styles, etc.
//!
//! # Example
//!
//! ```no_run
//! use cadhy_cad::{Shape, Primitives, Export, Analysis};
//!
//! // Create a shape
//! let box_shape = Primitives::make_box(10.0, 20.0, 30.0).unwrap();
//!
//! // Analyze it
//! let analysis = Analysis::analyze(&box_shape);
//! println!("Valid: {}, Faces: {}", analysis.is_valid, analysis.num_faces);
//!
//! // Export to various formats
//! Export::write_glb(&box_shape, "model.glb", 0.1).unwrap();
//! Export::write_stl_binary(&box_shape, "model.stl", 0.1).unwrap();
//! ```
//!
//! # Configuration
//!
//! ```rust
//! use cadhy_cad::config::{CadhyCadConfig, TessellationConfig};
//!
//! // Use preset configurations
//! let config = CadhyCadConfig::high_precision();
//!
//! // Or customize
//! let custom = CadhyCadConfig {
//!     tessellation: TessellationConfig::HIGH_QUALITY,
//!     ..Default::default()
//! };
//! ```

pub mod analysis;
pub mod config;
pub mod dimensions;
mod error;
pub mod export;
mod ffi;
mod mesh;
mod operations;
mod primitives;
pub mod projection;
pub mod section;
mod shape;
mod step_io;
pub mod topology;

pub use analysis::{Analysis, DistanceMeasurement, FixOptions, ShapeAnalysis, SupportType};
pub use config::{
    get_config, set_config, tessellation, tolerances, CadhyCadConfig, DimensionStyleConfig,
    ExportDefaults, HatchDefaults, LineStyleConfig, TessellationConfig, ToleranceConfig,
    ViewLabels,
};
pub use dimensions::{
    ArrowStyle, AutoDimensioner, Dimension, DimensionConfig, DimensionLine, DimensionSet,
    DimensionType, ExtensionLine,
};
pub use error::{OcctError, OcctResult};
pub use export::Export;
pub use ffi::ffi::{ExplodeResult, ExplodedPart};
pub use mesh::{FaceInfo, MeshData, SurfaceType, Vertex3};
pub use operations::Operations;
pub use primitives::Primitives;
pub use projection::{
    generate_standard_views, generate_standard_views_v2, project_shape, project_shape_v2, Arc2D,
    BoundingBox2D, Curve2D, Curve2DType, Ellipse2D, Line2D, LineType, Point2D, Polyline2D,
    ProjectionResult, ProjectionResultV2, ProjectionType,
};
pub use section::{
    compute_section_view, compute_section_with_hatch, generate_horizontal_sections_with_hatch,
    HatchConfig, HatchLine, HatchPattern, HatchRegion, HatchedRegion, SectionCurve, SectionPlane,
    SectionResult, SectionWithHatchResult,
};
pub use shape::Shape;
pub use step_io::StepIO;
pub use topology::{
    CurveType, EdgePoint, EdgeTessellation, FaceInfo as TopologyFaceInfo,
    SurfaceType as TopologySurfaceType, Topology, TopologyData, VertexInfo,
};
