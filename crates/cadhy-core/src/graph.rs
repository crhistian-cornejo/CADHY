//! Graph types for the command DAG

use crate::id::NodeId;
use serde::{Deserialize, Serialize};

/// A port identifier (input or output socket on a node)
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PortId {
    pub node_id: NodeId,
    pub port_name: String,
}

impl PortId {
    pub fn new(node_id: NodeId, port_name: impl Into<String>) -> Self {
        Self {
            node_id,
            port_name: port_name.into(),
        }
    }
}

/// An edge connecting two ports
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Edge {
    pub source: PortId,
    pub target: PortId,
}

impl Edge {
    pub fn new(source: PortId, target: PortId) -> Self {
        Self { source, target }
    }
}

/// Data type for port connections
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DataType {
    Number,
    Vec2,
    Vec3,
    Plane,
    Sketch,
    Curve,
    Surface,
    Solid,
    Mesh,
    Boolean,
    String,
    Any,
}

/// Port definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortDef {
    pub name: String,
    pub data_type: DataType,
    pub label: String,
    #[serde(default)]
    pub optional: bool,
}

/// Node position in the graph UI
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

impl Position {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
}

/// Graph node metadata (UI state, not execution data)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeMeta {
    pub id: NodeId,
    pub position: Position,
    #[serde(default)]
    pub selected: bool,
    #[serde(default)]
    pub collapsed: bool,
}

/// Result of graph validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub node_id: Option<NodeId>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationWarning {
    pub node_id: Option<NodeId>,
    pub message: String,
}

impl ValidationResult {
    pub fn valid() -> Self {
        Self {
            is_valid: true,
            errors: vec![],
            warnings: vec![],
        }
    }

    pub fn invalid(errors: Vec<ValidationError>) -> Self {
        Self {
            is_valid: false,
            errors,
            warnings: vec![],
        }
    }
}
