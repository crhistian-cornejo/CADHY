//! Type definitions for IFC data structures

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// IFC schema version
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub enum IfcSchema {
    Ifc2x3,
    Ifc4,
    Ifc4x1,
    Ifc4x2,
    #[default]
    Ifc4x3,
}

impl std::fmt::Display for IfcSchema {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Ifc2x3 => write!(f, "IFC2X3"),
            Self::Ifc4 => write!(f, "IFC4"),
            Self::Ifc4x1 => write!(f, "IFC4X1"),
            Self::Ifc4x2 => write!(f, "IFC4X2"),
            Self::Ifc4x3 => write!(f, "IFC4X3"),
        }
    }
}

/// IFC entity class types relevant for hydraulics
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum IfcClass {
    /// Generic building element
    IfcBuildingElement,
    /// Flow segment (pipes, channels)
    IfcFlowSegment,
    /// Flow fitting (joints, transitions)
    IfcFlowFitting,
    /// Flow terminal (outlets, inlets)
    IfcFlowTerminal,
    /// Distribution element
    IfcDistributionElement,
    /// Civil element (IFC4x3)
    IfcCivilElement,
    /// Generic proxy element
    IfcProxy,
    /// Unknown/other
    Other(String),
}

impl From<&str> for IfcClass {
    fn from(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "IFCBUILDINGELEMENT" => Self::IfcBuildingElement,
            "IFCFLOWSEGMENT" => Self::IfcFlowSegment,
            "IFCFLOWFITTING" => Self::IfcFlowFitting,
            "IFCFLOWTERMINAL" => Self::IfcFlowTerminal,
            "IFCDISTRIBUTIONELEMENT" => Self::IfcDistributionElement,
            "IFCCIVILELEMENT" => Self::IfcCivilElement,
            "IFCPROXY" => Self::IfcProxy,
            other => Self::Other(other.to_string()),
        }
    }
}

/// Imported object from IFC file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedObject {
    /// Unique identifier
    pub id: String,
    /// Object name
    pub name: String,
    /// IFC entity class
    pub ifc_class: IfcClass,
    /// Global ID from IFC file
    pub global_id: String,
    /// Geometry data (if extracted)
    pub geometry: Option<IfcGeometry>,
    /// Property sets
    pub properties: HashMap<String, PropertyValue>,
    /// Parent object ID (if any)
    pub parent_id: Option<String>,
    /// Material information
    pub material: Option<IfcMaterial>,
}

/// Geometry representation from IFC
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IfcGeometry {
    /// Triangulated mesh
    Mesh(MeshGeometry),
    /// B-Rep solid
    BRep(BRepGeometry),
    /// Extrusion
    Extrusion(ExtrusionGeometry),
    /// Swept solid
    SweptSolid(SweptSolidGeometry),
}

/// Triangulated mesh geometry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeshGeometry {
    /// Vertices as [x, y, z, x, y, z, ...]
    pub vertices: Vec<f64>,
    /// Triangle indices
    pub indices: Vec<u32>,
    /// Normals (optional)
    pub normals: Option<Vec<f64>>,
}

/// B-Rep geometry (boundary representation)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BRepGeometry {
    /// Faces
    pub faces: Vec<BRepFace>,
    /// Edges
    pub edges: Vec<BRepEdge>,
    /// Vertices
    pub vertices: Vec<[f64; 3]>,
}

/// B-Rep face
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BRepFace {
    /// Edge indices forming the face boundary
    pub edge_indices: Vec<usize>,
    /// Surface normal
    pub normal: [f64; 3],
}

/// B-Rep edge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BRepEdge {
    /// Start vertex index
    pub start: usize,
    /// End vertex index
    pub end: usize,
    /// Curve type
    pub curve_type: CurveType,
}

/// Curve types for edges
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CurveType {
    Line,
    Arc { center: [f64; 3], radius: f64 },
    Circle { center: [f64; 3], radius: f64 },
    BSpline { control_points: Vec<[f64; 3]> },
}

/// Extrusion geometry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtrusionGeometry {
    /// Profile points
    pub profile: Vec<[f64; 2]>,
    /// Extrusion direction
    pub direction: [f64; 3],
    /// Extrusion depth
    pub depth: f64,
}

/// Swept solid geometry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SweptSolidGeometry {
    /// Profile points
    pub profile: Vec<[f64; 2]>,
    /// Sweep path points
    pub path: Vec<[f64; 3]>,
}

/// Property value types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PropertyValue {
    String(String),
    Real(f64),
    Integer(i64),
    Boolean(bool),
    List(Vec<PropertyValue>),
}

impl PropertyValue {
    pub fn as_f64(&self) -> Option<f64> {
        match self {
            Self::Real(v) => Some(*v),
            Self::Integer(v) => Some(*v as f64),
            _ => None,
        }
    }

    pub fn as_string(&self) -> Option<&str> {
        match self {
            Self::String(s) => Some(s.as_str()),
            _ => None,
        }
    }

    pub fn as_bool(&self) -> Option<bool> {
        match self {
            Self::Boolean(b) => Some(*b),
            _ => None,
        }
    }
}

/// Material information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IfcMaterial {
    /// Material name
    pub name: String,
    /// Color (RGBA)
    pub color: Option<[f64; 4]>,
    /// Additional properties
    pub properties: HashMap<String, PropertyValue>,
}

/// Hydraulic properties for export
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct HydraulicProperties {
    /// Manning's roughness coefficient
    pub manning_n: Option<f64>,
    /// Longitudinal slope (m/m)
    pub slope: Option<f64>,
    /// Design flow (m³/s)
    pub design_flow: Option<f64>,
    /// Normal depth (m)
    pub normal_depth: Option<f64>,
    /// Critical depth (m)
    pub critical_depth: Option<f64>,
    /// Froude number
    pub froude_number: Option<f64>,
    /// Channel width (m)
    pub width: Option<f64>,
    /// Channel depth (m)
    pub depth: Option<f64>,
    /// Side slope (H:V)
    pub side_slope: Option<f64>,
    /// Wall thickness (m)
    pub thickness: Option<f64>,
}

/// Export options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    /// Project name
    pub project_name: String,
    /// Project description
    pub description: Option<String>,
    /// Author name
    pub author: Option<String>,
    /// Organization
    pub organization: Option<String>,
    /// Schema version
    pub schema: IfcSchema,
    /// Include hydraulic properties
    pub include_hydraulics: bool,
}

impl Default for ExportOptions {
    fn default() -> Self {
        Self {
            project_name: "CADHY Export".to_string(),
            description: None,
            author: None,
            organization: None,
            schema: IfcSchema::Ifc4x3,
            include_hydraulics: true,
        }
    }
}

/// Import result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    /// Imported objects
    pub objects: Vec<ImportedObject>,
    /// Total object count
    pub total_count: usize,
    /// Warnings during import
    pub warnings: Vec<String>,
    /// Schema version detected
    pub schema: IfcSchema,
}
