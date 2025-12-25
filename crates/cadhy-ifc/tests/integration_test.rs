//! Integration tests for cadhy-ifc

use cadhy_ifc::{ExportOptions, HydraulicProperties, IfcExporter, IfcSchema, MeshGeometry};
use std::fs;
use tempfile::tempdir;

#[test]
fn test_exporter_basic() {
    let exporter = IfcExporter::new("Test Project");
    assert_eq!(exporter.options.project_name, "Test Project");
}

#[test]
fn test_exporter_with_options() {
    let options = ExportOptions {
        project_name: "My Project".to_string(),
        description: Some("Test description".to_string()),
        author: Some("Test Author".to_string()),
        organization: Some("Test Org".to_string()),
        schema: IfcSchema::Ifc4x3,
        include_hydraulics: true,
    };

    let exporter = IfcExporter::with_options(options);
    // Exporter should be created successfully
}

#[test]
fn test_hydraulic_properties() {
    let props = HydraulicProperties {
        manning_n: Some(0.013),
        slope: Some(0.001),
        design_flow: Some(10.0),
        normal_depth: Some(1.5),
        critical_depth: Some(0.8),
        froude_number: Some(0.5),
        width: Some(3.0),
        depth: Some(2.0),
        side_slope: Some(1.5),
        thickness: Some(0.2),
    };

    assert_eq!(props.manning_n, Some(0.013));
    assert_eq!(props.slope, Some(0.001));
}

#[test]
fn test_mesh_geometry() {
    let mesh = MeshGeometry {
        vertices: vec![0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0, 0.0],
        indices: vec![0, 1, 2],
        normals: Some(vec![0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0]),
    };

    assert_eq!(mesh.vertices.len(), 9); // 3 vertices * 3 components
    assert_eq!(mesh.indices.len(), 3); // 1 triangle
}

#[test]
fn test_export_to_file() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test_export.ifc");

    let mut exporter = IfcExporter::new("Test Export");

    // Create simple mesh
    let mesh = MeshGeometry {
        vertices: vec![0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0],
        indices: vec![0, 1, 2, 0, 2, 3],
        normals: None,
    };

    let props = HydraulicProperties::default();

    // Add channel
    let result = exporter.add_hydraulic_channel("Test Channel", &mesh, &props);
    assert!(result.is_ok());

    // Write to file
    let write_result = exporter.write_to_file(&file_path);
    assert!(write_result.is_ok());

    // Verify file exists
    assert!(file_path.exists());

    // Read and verify content has IFC structure
    let content = fs::read_to_string(&file_path).unwrap();
    assert!(content.contains("ISO-10303-21;"));
    assert!(content.contains("HEADER;"));
    assert!(content.contains("DATA;"));
    assert!(content.contains("END-ISO-10303-21;"));
    assert!(content.contains("Test Export"));
}

#[test]
fn test_schema_display() {
    assert_eq!(format!("{}", IfcSchema::Ifc2x3), "IFC2X3");
    assert_eq!(format!("{}", IfcSchema::Ifc4), "IFC4");
    assert_eq!(format!("{}", IfcSchema::Ifc4x3), "IFC4X3");
}
