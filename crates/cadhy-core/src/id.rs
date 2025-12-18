//! Entity ID types for GraphCAD

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

/// A unique identifier for entities in the graph
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct EntityId(Uuid);

impl EntityId {
    /// Create a new unique ID
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    /// Create from an existing UUID
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }

    /// Get the inner UUID
    pub fn as_uuid(&self) -> &Uuid {
        &self.0
    }
}

impl Default for EntityId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for EntityId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::str::FromStr for EntityId {
    type Err = uuid::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s).map(EntityId)
    }
}

/// A unique identifier for nodes in the command graph
pub type NodeId = EntityId;

/// A unique identifier for shapes/geometry
pub type ShapeId = EntityId;

/// A unique identifier for sketches
pub type SketchId = EntityId;
