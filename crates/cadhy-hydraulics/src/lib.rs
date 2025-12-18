//! GraphCAD Hydraulics - Sistema de Diseno de Canales Hidraulicos
//!
//! Este modulo implementa un sistema completo de diseno de canales basado en:
//! - Alineamientos (ejes 3D con curvas y tangentes)
//! - Secciones transversales parametricas
//! - Transiciones automaticas entre secciones
//! - Estructuras hidraulicas (caidas, vertederos, junciones)
//! - Calculos hidraulicos (Manning, Froude, GVF)
//!
//! La geometria se genera usando OpenCASCADE (via cadhy-cad).

pub mod alignment;
pub mod characteristic_curves;
pub mod corridor;
pub mod gate_flow;
pub mod gvf_analysis;
pub mod hydraulics;
pub mod optimization;
pub mod saint_venant;
pub mod sections;
pub mod sediment_transport;
pub mod structures;
pub mod transitions;

// Re-exports
pub use alignment::{Alignment, AlignmentPI, AlignmentSegment, SegmentType};
pub use characteristic_curves::{
    CurveGenerator, RatingCurve, SpecificEnergyCurve, SpecificMomentumCurve,
};
pub use corridor::{
    // Dissipator geometry
    BaffleBlockGeometry,
    BaffleBlockInput,
    ChuteBlockInput,
    // Chute geometry
    ChuteGeometryInput,
    ChuteTypeInput,
    Corridor,
    CorridorGenerator,
    CorridorResult,
    CorridorWithDissipators,
    DissipatorGeometryGenerator,
    EndSillInput,
    StillingBasinInput,
    StillingBasinTypeInput,
    TransitionGeometryInput,
};
pub use gate_flow::{GateFlowAnalyzer, GateFlowCondition, GateFlowResult, GateGeometry, GateType};
pub use gvf_analysis::{
    ChannelElementType, ChannelReach, ChannelSystem, DownstreamControl, FlowRegimeType, GvfConfig,
    GvfProfileType, GvfResult, GvfSolver, GvfStation, GvfSummary, HydraulicJump, JumpType,
};
pub use hydraulics::{FlowRegime, FlowResult, HydraulicsEngine};
pub use optimization::{
    ChannelOptimizer, DesignConstraints, OptimizationCriterion, OptimizationResult, SectionTypeHint,
};
pub use saint_venant::{
    analyze_saint_venant, CrossSection, DownstreamBC as SVDownstreamBC, FlowRegime as SVFlowRegime,
    FlowState, GeometricFeature, HydraulicJumpInfo, InitialCondition, JumpType as SVJumpType,
    MeshInfo, SaintVenantConfig, SaintVenantInput, SaintVenantResult, SaintVenantSolver,
    SolverStats, TimeStepResult, TransitionType as SVTransitionType, UpstreamBC,
};
pub use sections::{
    Berm, BermSide, CompoundFlowResult, HydraulicProperties, SectionType, StationSection, ZoneFlow,
};
pub use sediment_transport::{
    SedimentClass, SedimentMotionState, SedimentProperties, SedimentTransportEngine,
    SedimentTransportResult, ShieldsAnalysis, ShieldsAnalyzer, TransportMethod,
};
pub use structures::{
    // Baffle Blocks
    BaffleBlock,
    BaffleBlockShape,
    BaffleRow,
    // Chutes
    Chute,
    ChuteBlock,
    // Drops
    Drop,
    DropType,
    EndSillType,
    // Energy Dissipators
    EnergyDissipator,
    // Gate Type (structures module version)
    GateType as StructureGateType,
    HydraulicJumpType,
    // Junctions
    Junction,
    JunctionSide,
    JunctionType,
    StillingBasinDesign,
    // USBR Stilling Basins
    StillingBasinType,
    // Weirs
    Weir,
    WeirType,
};
pub use transitions::{Transition, TransitionDesignParams, TransitionType};

/// ID unico para elementos del sistema
pub type ElementId = uuid::Uuid;

/// Vector 3D de nalgebra (usado para calculos matriciales internos)
/// Para interoperabilidad con cadhy-core, usar las funciones de conversion
pub type NaVec3 = nalgebra::Vector3<f64>;

/// Punto 3D de nalgebra
pub type Point3 = nalgebra::Point3<f64>;

/// Constante gravitacional (m/s^2)
pub const G: f64 = 9.81;

// ============================================================================
// Conversion entre cadhy_core::Vec3 y nalgebra types
// ============================================================================

/// Convierte cadhy_core::Vec3 a nalgebra::Vector3
pub fn to_navec3(v: &cadhy_core::Vec3) -> NaVec3 {
    NaVec3::new(v.x, v.y, v.z)
}

/// Convierte nalgebra::Vector3 a cadhy_core::Vec3
pub fn from_navec3(v: &NaVec3) -> cadhy_core::Vec3 {
    cadhy_core::Vec3::new(v.x, v.y, v.z)
}

/// Convierte cadhy_core::Vec3 a nalgebra::Point3
pub fn to_point3(v: &cadhy_core::Vec3) -> Point3 {
    Point3::new(v.x, v.y, v.z)
}

/// Convierte nalgebra::Point3 a cadhy_core::Vec3
pub fn from_point3(p: &Point3) -> cadhy_core::Vec3 {
    cadhy_core::Vec3::new(p.x, p.y, p.z)
}

/// Error types para el modulo
#[derive(Debug, thiserror::Error)]
pub enum HydraulicError {
    #[error("Alignment error: {0}")]
    Alignment(String),

    #[error("Section error: {0}")]
    Section(String),

    #[error("Hydraulic calculation error: {0}")]
    Calculation(String),

    #[error("Geometry generation error: {0}")]
    Geometry(String),

    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),

    #[error("Not found: {0}")]
    NotFound(String),
}

pub type Result<T> = std::result::Result<T, HydraulicError>;
