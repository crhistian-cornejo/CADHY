//! Tests for graph types

use cadhy_core::{
    DataType, Edge, NodeMeta, PortDef, PortId, Position, ValidationError, ValidationResult,
};

// ============================================================
// PortId Tests
// ============================================================

#[test]
fn port_id_new() {
    let node_id = cadhy_core::EntityId::new();
    let port = PortId::new(node_id, "output");
    assert_eq!(port.node_id, node_id);
    assert_eq!(port.port_name, "output");
}

#[test]
fn port_id_from_string() {
    let node_id = cadhy_core::EntityId::new();
    let port = PortId::new(node_id, String::from("input"));
    assert_eq!(port.port_name, "input");
}

// ============================================================
// Edge Tests
// ============================================================

#[test]
fn edge_new() {
    let node1 = cadhy_core::EntityId::new();
    let node2 = cadhy_core::EntityId::new();
    let source = PortId::new(node1, "out");
    let target = PortId::new(node2, "in");

    let edge = Edge::new(source.clone(), target.clone());
    assert_eq!(edge.source, source);
    assert_eq!(edge.target, target);
}

// ============================================================
// DataType Tests
// ============================================================

#[test]
fn data_type_variants() {
    // Ensure all variants exist and can be created
    let _number = DataType::Number;
    let _vec2 = DataType::Vec2;
    let _vec3 = DataType::Vec3;
    let _plane = DataType::Plane;
    let _sketch = DataType::Sketch;
    let _curve = DataType::Curve;
    let _surface = DataType::Surface;
    let _solid = DataType::Solid;
    let _mesh = DataType::Mesh;
    let _boolean = DataType::Boolean;
    let _string = DataType::String;
    let _any = DataType::Any;
}

// ============================================================
// PortDef Tests
// ============================================================

#[test]
fn port_def_required() {
    let port = PortDef {
        name: "input".to_string(),
        data_type: DataType::Solid,
        label: "Input Shape".to_string(),
        optional: false,
    };
    assert!(!port.optional);
}

#[test]
fn port_def_optional() {
    let port = PortDef {
        name: "radius".to_string(),
        data_type: DataType::Number,
        label: "Radius".to_string(),
        optional: true,
    };
    assert!(port.optional);
}

// ============================================================
// Position Tests
// ============================================================

#[test]
fn position_new() {
    let pos = Position::new(100.0, 200.0);
    assert_eq!(pos.x, 100.0);
    assert_eq!(pos.y, 200.0);
}

// ============================================================
// NodeMeta Tests
// ============================================================

#[test]
fn node_meta_defaults() {
    let id = cadhy_core::EntityId::new();
    let meta = NodeMeta {
        id,
        position: Position::new(0.0, 0.0),
        selected: false,
        collapsed: false,
    };
    assert!(!meta.selected);
    assert!(!meta.collapsed);
}

// ============================================================
// ValidationResult Tests
// ============================================================

#[test]
fn validation_result_valid() {
    let result = ValidationResult::valid();
    assert!(result.is_valid);
    assert!(result.errors.is_empty());
    assert!(result.warnings.is_empty());
}

#[test]
fn validation_result_invalid() {
    let errors = vec![ValidationError {
        node_id: None,
        message: "Cycle detected".to_string(),
    }];
    let result = ValidationResult::invalid(errors);
    assert!(!result.is_valid);
    assert_eq!(result.errors.len(), 1);
}

#[test]
fn validation_error_with_node_id() {
    let node_id = cadhy_core::EntityId::new();
    let error = ValidationError {
        node_id: Some(node_id),
        message: "Invalid input".to_string(),
    };
    assert!(error.node_id.is_some());
}
