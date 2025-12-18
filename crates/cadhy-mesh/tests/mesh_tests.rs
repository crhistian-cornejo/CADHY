//! Tests for cadhy-mesh types and quality metrics

use cadhy_mesh::params::*;
use cadhy_mesh::quality::*;
use cadhy_mesh::types::*;

// ============================================================
// Vertex Tests
// ============================================================

#[test]
fn test_vertex_creation() {
    let v = Vertex::new(1.0, 2.0, 3.0);
    assert_eq!(v.x, 1.0);
    assert_eq!(v.y, 2.0);
    assert_eq!(v.z, 3.0);
}

#[test]
fn test_vertex_zero() {
    let v = Vertex::zero();
    assert_eq!(v.x, 0.0);
    assert_eq!(v.y, 0.0);
    assert_eq!(v.z, 0.0);
}

#[test]
fn test_vertex_distance() {
    let v1 = Vertex::new(0.0, 0.0, 0.0);
    let v2 = Vertex::new(3.0, 4.0, 0.0);
    let dist = v1.distance_to(&v2);
    assert!((dist - 5.0).abs() < 1e-10);
}

#[test]
fn test_vertex_as_array() {
    let v = Vertex::new(1.0, 2.0, 3.0);
    assert_eq!(v.as_array(), [1.0, 2.0, 3.0]);
}

#[test]
fn test_vertex_as_f32_array() {
    let v = Vertex::new(1.0, 2.0, 3.0);
    assert_eq!(v.as_f32_array(), [1.0f32, 2.0f32, 3.0f32]);
}

#[test]
fn test_vertex_from_f64_array() {
    let v: Vertex = [1.0, 2.0, 3.0].into();
    assert_eq!(v.x, 1.0);
    assert_eq!(v.y, 2.0);
    assert_eq!(v.z, 3.0);
}

// ============================================================
// Triangle Tests
// ============================================================

#[test]
fn test_triangle_creation() {
    let tri = Triangle::new(0, 1, 2);
    assert_eq!(tri.i0, 0);
    assert_eq!(tri.i1, 1);
    assert_eq!(tri.i2, 2);
}

#[test]
fn test_triangle_as_array() {
    let tri = Triangle::new(0, 1, 2);
    assert_eq!(tri.as_array(), [0, 1, 2]);
}

#[test]
fn test_triangle_indices() {
    let tri = Triangle::new(5, 10, 15);
    assert_eq!(tri.indices(), [5, 10, 15]);
}

#[test]
fn test_triangle_from_array() {
    let tri: Triangle = [3, 4, 5].into();
    assert_eq!(tri.i0, 3);
    assert_eq!(tri.i1, 4);
    assert_eq!(tri.i2, 5);
}

// ============================================================
// SurfaceMesh Tests
// ============================================================

#[test]
fn test_surface_mesh_empty() {
    let mesh = SurfaceMesh::empty();
    assert!(mesh.is_empty());
    assert_eq!(mesh.vertex_count(), 0);
    assert_eq!(mesh.triangle_count(), 0);
}

#[test]
fn test_surface_mesh_from_raw() {
    let vertices = vec![[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [0.5, 1.0, 0.0]];
    let triangles = vec![[0, 1, 2]];
    let mesh = SurfaceMesh::from_raw(vertices, triangles, None);

    assert!(!mesh.is_empty());
    assert_eq!(mesh.vertex_count(), 3);
    assert_eq!(mesh.triangle_count(), 1);
}

#[test]
fn test_surface_mesh_vertices_f32() {
    let mesh = SurfaceMesh {
        vertices: vec![Vertex::new(1.0, 2.0, 3.0), Vertex::new(4.0, 5.0, 6.0)],
        triangles: vec![],
        normals: None,
        metadata: Default::default(),
    };

    let flat = mesh.vertices_f32();
    assert_eq!(flat, vec![1.0f32, 2.0, 3.0, 4.0, 5.0, 6.0]);
}

#[test]
fn test_surface_mesh_indices_flat() {
    let mesh = SurfaceMesh {
        vertices: vec![],
        triangles: vec![Triangle::new(0, 1, 2), Triangle::new(2, 3, 0)],
        normals: None,
        metadata: Default::default(),
    };

    let flat = mesh.indices_flat();
    assert_eq!(flat, vec![0, 1, 2, 2, 3, 0]);
}

#[test]
fn test_surface_mesh_bounding_box() {
    let mesh = SurfaceMesh {
        vertices: vec![
            Vertex::new(0.0, 0.0, 0.0),
            Vertex::new(10.0, 5.0, 3.0),
            Vertex::new(-2.0, 8.0, -1.0),
        ],
        triangles: vec![Triangle::new(0, 1, 2)],
        normals: None,
        metadata: Default::default(),
    };

    let bbox = mesh.bounding_box().expect("Should have bounding box");
    assert_eq!(bbox.min, [-2.0, 0.0, -1.0]);
    assert_eq!(bbox.max, [10.0, 8.0, 3.0]);
}

#[test]
fn test_surface_mesh_normals() {
    let mesh = SurfaceMesh {
        vertices: vec![
            Vertex::new(0.0, 0.0, 0.0),
            Vertex::new(1.0, 0.0, 0.0),
            Vertex::new(0.0, 1.0, 0.0),
        ],
        triangles: vec![Triangle::new(0, 1, 2)],
        normals: None,
        metadata: Default::default(),
    };

    let normals = mesh.normals_f32();
    // Computed normals should point in +Z direction
    assert!(!normals.is_empty());
    // Each vertex gets a normal (3 vertices * 3 components)
    assert_eq!(normals.len(), 9);
}

// ============================================================
// BoundingBox Tests
// ============================================================

#[test]
fn test_bounding_box_size() {
    let bbox = BoundingBox {
        min: [0.0, 0.0, 0.0],
        max: [10.0, 20.0, 30.0],
    };
    assert_eq!(bbox.size(), [10.0, 20.0, 30.0]);
}

#[test]
fn test_bounding_box_center() {
    let bbox = BoundingBox {
        min: [0.0, 0.0, 0.0],
        max: [10.0, 20.0, 30.0],
    };
    assert_eq!(bbox.center(), [5.0, 10.0, 15.0]);
}

#[test]
fn test_bounding_box_diagonal() {
    let bbox = BoundingBox {
        min: [0.0, 0.0, 0.0],
        max: [3.0, 4.0, 0.0],
    };
    assert!((bbox.diagonal() - 5.0).abs() < 1e-10);
}

// ============================================================
// Mesh Parameters Tests
// ============================================================

#[test]
fn test_mesh_params_default() {
    let params = MeshParams::default();
    assert!(params.linear_deflection > 0.0);
    assert!(params.angular_deflection > 0.0);
}

#[test]
fn test_mesh_params_visualization() {
    let params = MeshParams::visualization();
    assert!(params.linear_deflection > MeshParams::high_quality().linear_deflection);
}

#[test]
fn test_mesh_params_high_quality() {
    let params = MeshParams::high_quality();
    assert!(params.linear_deflection < MeshParams::visualization().linear_deflection);
}

#[test]
fn test_mesh_params_export_quality() {
    let params = MeshParams::export_quality();
    assert!(params.linear_deflection < MeshParams::high_quality().linear_deflection);
}

#[test]
fn test_mesh_params_printing() {
    let params = MeshParams::printing();
    assert!(params.linear_deflection > 0.0);
    assert!(params.angular_deflection < 0.5);
}

#[test]
fn test_mesh_params_builder() {
    let params = MeshParams::builder()
        .linear_deflection(0.05)
        .angular_deflection(0.3)
        .relative(true)
        .min_points_per_edge(5)
        .parallel(false)
        .build();

    assert_eq!(params.linear_deflection, 0.05);
    assert_eq!(params.angular_deflection, 0.3);
    assert!(params.relative);
    assert_eq!(params.min_points_per_edge, 5);
    assert!(!params.parallel);
}

#[test]
fn test_mesh_params_builder_clamps_angular_deflection() {
    let params = MeshParams::builder()
        .angular_deflection(10.0) // Should be clamped to PI
        .build();
    assert!(params.angular_deflection <= std::f64::consts::PI);

    let params2 = MeshParams::builder()
        .angular_deflection(0.001) // Should be clamped to 0.01
        .build();
    assert!(params2.angular_deflection >= 0.01);
}

// ============================================================
// QualityPreset Tests
// ============================================================

#[test]
fn test_quality_preset_default() {
    let preset = QualityPreset::default();
    assert_eq!(preset, QualityPreset::Standard);
}

#[test]
fn test_quality_preset_to_params() {
    let params = QualityPreset::High.to_params();
    assert_eq!(
        params.linear_deflection,
        MeshParams::high_quality().linear_deflection
    );
}

// ============================================================
// Surface Quality Tests
// ============================================================

fn make_equilateral_mesh() -> SurfaceMesh {
    // Equilateral triangle with side = 1
    let h = (3.0_f64).sqrt() / 2.0;
    SurfaceMesh {
        vertices: vec![
            Vertex::new(0.0, 0.0, 0.0),
            Vertex::new(1.0, 0.0, 0.0),
            Vertex::new(0.5, h, 0.0),
        ],
        triangles: vec![Triangle::new(0, 1, 2)],
        normals: None,
        metadata: Default::default(),
    }
}

fn make_degenerate_mesh() -> SurfaceMesh {
    // Degenerate triangle (all vertices on a line)
    SurfaceMesh {
        vertices: vec![
            Vertex::new(0.0, 0.0, 0.0),
            Vertex::new(1.0, 0.0, 0.0),
            Vertex::new(2.0, 0.0, 0.0),
        ],
        triangles: vec![Triangle::new(0, 1, 2)],
        normals: None,
        metadata: Default::default(),
    }
}

#[test]
fn test_surface_quality_equilateral() {
    let mesh = make_equilateral_mesh();
    let quality = compute_surface_quality(&mesh);

    assert!(
        quality.overall_score > 0.9,
        "Equilateral should have high quality"
    );
    assert!(
        quality.aspect_ratio.max < 1.1,
        "Equilateral should have aspect ratio ~1"
    );
    assert_eq!(quality.degenerate_count, 0);
    assert!(quality.is_acceptable());
}

#[test]
fn test_surface_quality_degenerate() {
    let mesh = make_degenerate_mesh();
    let quality = compute_surface_quality(&mesh);

    assert_eq!(quality.degenerate_count, 1);
    assert!(!quality.is_acceptable());
}

#[test]
fn test_surface_quality_empty() {
    let mesh = SurfaceMesh::empty();
    let quality = compute_surface_quality(&mesh);

    assert_eq!(quality.overall_score, 0.0);
    assert_eq!(quality.degenerate_count, 0);
}

#[test]
fn test_surface_quality_thresholds_default() {
    let thresholds = SurfaceQualityThresholds::default();
    assert!(thresholds.max_aspect_ratio > 1.0);
    assert!(thresholds.min_area > 0.0);
}

#[test]
fn test_surface_quality_thresholds_strict() {
    let thresholds = SurfaceQualityThresholds::strict();
    assert!(thresholds.max_aspect_ratio < SurfaceQualityThresholds::default().max_aspect_ratio);
}

#[test]
fn test_surface_quality_thresholds_relaxed() {
    let thresholds = SurfaceQualityThresholds::relaxed();
    assert!(thresholds.max_aspect_ratio > SurfaceQualityThresholds::default().max_aspect_ratio);
}

#[test]
fn test_validate_surface_mesh_good() {
    let mesh = make_equilateral_mesh();
    let result = validate_surface_mesh(&mesh, &SurfaceQualityThresholds::default());
    assert!(result.is_ok());
}

#[test]
fn test_validate_surface_mesh_degenerate() {
    let mesh = make_degenerate_mesh();
    let result = validate_surface_mesh(&mesh, &SurfaceQualityThresholds::default());
    assert!(result.is_err());
}

// ============================================================
// Backend Availability Tests
// ============================================================

#[test]
fn test_available_backends() {
    let backends = cadhy_mesh::available_backends();
    assert!(backends.contains(&"occt"));
}

#[test]
fn test_mesh_generator_creation() {
    use cadhy_mesh::MeshGenerator;
    let result = MeshGenerator::new();
    // May fail if OCCT is not available, but should not panic
    let _ = result;
}
