//! Tests for geometry types

use cadhy_core::{BoundingBox, MeshData, Plane, Vec2, Vec3};

// ============================================================
// Vec3 Tests
// ============================================================

#[test]
fn vec3_new() {
    let v = Vec3::new(1.0, 2.0, 3.0);
    assert_eq!(v.x, 1.0);
    assert_eq!(v.y, 2.0);
    assert_eq!(v.z, 3.0);
}

#[test]
fn vec3_constants() {
    assert_eq!(Vec3::ZERO, Vec3::new(0.0, 0.0, 0.0));
    assert_eq!(Vec3::X, Vec3::new(1.0, 0.0, 0.0));
    assert_eq!(Vec3::Y, Vec3::new(0.0, 1.0, 0.0));
    assert_eq!(Vec3::Z, Vec3::new(0.0, 0.0, 1.0));
}

#[test]
fn vec3_dot_product() {
    let v1 = Vec3::new(1.0, 2.0, 3.0);
    let v2 = Vec3::new(4.0, 5.0, 6.0);
    let dot = v1.dot(&v2);
    assert!((dot - 32.0).abs() < 1e-10);
}

#[test]
fn vec3_cross_product() {
    let x = Vec3::X;
    let y = Vec3::Y;
    let z = x.cross(&y);
    assert!((z.x - 0.0).abs() < 1e-10);
    assert!((z.y - 0.0).abs() < 1e-10);
    assert!((z.z - 1.0).abs() < 1e-10);
}

#[test]
fn vec3_length() {
    let v = Vec3::new(3.0, 4.0, 0.0);
    assert!((v.length() - 5.0).abs() < 1e-10);
}

#[test]
fn vec3_normalize() {
    let v = Vec3::new(3.0, 4.0, 0.0);
    let n = v.normalize();
    assert!((n.length() - 1.0).abs() < 1e-10);
    assert!((n.x - 0.6).abs() < 1e-10);
    assert!((n.y - 0.8).abs() < 1e-10);
}

#[test]
fn vec3_normalize_zero_returns_self() {
    let v = Vec3::ZERO;
    let n = v.normalize();
    assert_eq!(n, Vec3::ZERO);
}

// ============================================================
// Vec2 Tests
// ============================================================

#[test]
fn vec2_new() {
    let v = Vec2::new(1.0, 2.0);
    assert_eq!(v.x, 1.0);
    assert_eq!(v.y, 2.0);
}

#[test]
fn vec2_zero() {
    assert_eq!(Vec2::ZERO, Vec2::new(0.0, 0.0));
}

// ============================================================
// Plane Tests
// ============================================================

#[test]
fn plane_xy() {
    let p = Plane::XY;
    assert_eq!(p.origin, Vec3::ZERO);
    assert_eq!(p.normal, Vec3::Z);
    assert_eq!(p.x_axis, Vec3::X);
}

#[test]
fn plane_xz() {
    let p = Plane::XZ;
    assert_eq!(p.origin, Vec3::ZERO);
    assert_eq!(p.normal, Vec3::Y);
}

#[test]
fn plane_yz() {
    let p = Plane::YZ;
    assert_eq!(p.origin, Vec3::ZERO);
    assert_eq!(p.normal, Vec3::X);
}

#[test]
fn plane_y_axis() {
    let p = Plane::XY;
    let y = p.y_axis();
    // Y axis should be normal cross X = Z cross X = -Y, but normalized
    // Actually: Z cross X = Y
    assert!((y.y - 1.0).abs() < 1e-10 || (y.y - (-1.0)).abs() < 1e-10);
}

#[test]
fn plane_custom() {
    let origin = Vec3::new(1.0, 2.0, 3.0);
    let normal = Vec3::new(0.0, 0.0, 2.0); // Not normalized
    let x_axis = Vec3::new(2.0, 0.0, 0.0); // Not normalized

    let p = Plane::new(origin, normal, x_axis);

    // Should be normalized
    assert!((p.normal.length() - 1.0).abs() < 1e-10);
    assert!((p.x_axis.length() - 1.0).abs() < 1e-10);
}

// ============================================================
// BoundingBox Tests
// ============================================================

#[test]
fn bounding_box_center() {
    let bbox = BoundingBox::new(Vec3::new(0.0, 0.0, 0.0), Vec3::new(10.0, 20.0, 30.0));
    let center = bbox.center();
    assert!((center.x - 5.0).abs() < 1e-10);
    assert!((center.y - 10.0).abs() < 1e-10);
    assert!((center.z - 15.0).abs() < 1e-10);
}

#[test]
fn bounding_box_size() {
    let bbox = BoundingBox::new(Vec3::new(5.0, 10.0, 15.0), Vec3::new(15.0, 30.0, 45.0));
    let size = bbox.size();
    assert!((size.x - 10.0).abs() < 1e-10);
    assert!((size.y - 20.0).abs() < 1e-10);
    assert!((size.z - 30.0).abs() < 1e-10);
}

// ============================================================
// MeshData Tests
// ============================================================

#[test]
fn mesh_data_vertex_count() {
    let mesh = MeshData {
        node_id: None,
        vertices: vec![0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        normals: vec![0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0],
        indices: vec![0, 1, 2],
        face_ids: None,
        faces: None,
    };
    assert_eq!(mesh.vertex_count(), 3);
}

#[test]
fn mesh_data_triangle_count() {
    let mesh = MeshData {
        node_id: None,
        vertices: vec![0.0; 12], // 4 vertices
        normals: vec![0.0; 12],
        indices: vec![0, 1, 2, 0, 2, 3], // 2 triangles
        face_ids: None,
        faces: None,
    };
    assert_eq!(mesh.triangle_count(), 2);
}

#[test]
fn mesh_data_empty() {
    let mesh = MeshData {
        node_id: None,
        vertices: vec![],
        normals: vec![],
        indices: vec![],
        face_ids: None,
        faces: None,
    };
    assert_eq!(mesh.vertex_count(), 0);
    assert_eq!(mesh.triangle_count(), 0);
}
