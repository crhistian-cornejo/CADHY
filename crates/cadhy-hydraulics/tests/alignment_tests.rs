//! Tests for alignment module

use cadhy_hydraulics::{Alignment, AlignmentPI, Point3};

// ============================================================
// Basic Alignment Tests
// ============================================================

#[test]
fn straight_alignment_creation() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    assert_eq!(alignment.total_length(), 100.0);
    assert_eq!(alignment.segments().len(), 1);
}

#[test]
fn straight_alignment_midpoint() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mid = alignment.position_at(50.0);
    assert!((mid.x - 50.0).abs() < 0.001);
    assert!((mid.y - 0.0).abs() < 0.001);
}

#[test]
fn alignment_with_two_pis() {
    let pis = vec![
        AlignmentPI::new(0.0, Point3::new(0.0, 0.0, 0.0), None),
        AlignmentPI::new(100.0, Point3::new(100.0, 0.0, 0.0), None),
    ];

    let alignment = Alignment::new("Two PI", pis).unwrap();
    assert_eq!(alignment.total_length(), 100.0);
}

#[test]
fn alignment_requires_two_pis() {
    let pis = vec![AlignmentPI::new(0.0, Point3::new(0.0, 0.0, 0.0), None)];
    let result = Alignment::new("Single PI", pis);
    assert!(result.is_err());
}

// ============================================================
// Elevation Profile Tests
// ============================================================

#[test]
fn elevation_with_base_slope() {
    let mut alignment = Alignment::default();
    alignment.start_elevation = 100.0;
    alignment.base_slope = -0.01; // 1% descending

    let elev_at_0 = alignment.elevation_at(0.0);
    let elev_at_50 = alignment.elevation_at(50.0);

    assert!((elev_at_0 - 100.0).abs() < 0.001);
    assert!((elev_at_50 - 99.5).abs() < 0.001); // 100 - 0.01*50 = 99.5
}

#[test]
fn elevation_ascending_slope() {
    let mut alignment = Alignment::default();
    alignment.start_elevation = 100.0;
    alignment.base_slope = 0.02; // 2% ascending

    let elev_at_100 = alignment.elevation_at(100.0);
    assert!((elev_at_100 - 102.0).abs() < 0.001);
}

#[test]
fn position_3d_includes_elevation() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let pos = alignment.position_3d_at(50.0);
    // Should have both horizontal position and elevation
    assert!((pos.x - 50.0).abs() < 0.001);
}

// ============================================================
// Polyline Generation Tests
// ============================================================

#[test]
fn polyline_generation() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let polyline = alignment.to_polyline(10.0);
    assert_eq!(polyline.len(), 11); // 0, 10, 20, ..., 100
}

#[test]
fn polyline_first_and_last_points() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(50.0, 0.0, 0.0),
    )
    .unwrap();

    let polyline = alignment.to_polyline(10.0);

    let first = polyline.first().unwrap();
    let last = polyline.last().unwrap();

    assert!((first.x - 0.0).abs() < 0.001);
    assert!((last.x - 50.0).abs() < 0.001);
}

// ============================================================
// Tangent Direction Tests
// ============================================================

#[test]
fn tangent_direction_straight() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let tangent = alignment.tangent_at(50.0);
    assert!((tangent.x - 1.0).abs() < 0.001);
    assert!((tangent.y - 0.0).abs() < 0.001);
}

#[test]
fn tangent_is_unit_vector() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 50.0, 0.0),
    )
    .unwrap();

    let tangent = alignment.tangent_at(25.0);
    let length = (tangent.x.powi(2) + tangent.y.powi(2) + tangent.z.powi(2)).sqrt();
    assert!((length - 1.0).abs() < 0.001);
}
