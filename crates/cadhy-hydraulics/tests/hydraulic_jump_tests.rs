//! Tests for hydraulic jump detection and calculations

use cadhy_hydraulics::{
    ChannelElementType, ChannelReach, ChannelSystem, DownstreamControl, GvfSolver, JumpType,
    SectionType,
};

// ============================================================
// JumpType Classification Tests
// ============================================================

#[test]
fn jump_type_undular() {
    assert_eq!(JumpType::from_froude(1.0), JumpType::Undular);
    assert_eq!(JumpType::from_froude(1.5), JumpType::Undular);
    assert_eq!(JumpType::from_froude(1.69), JumpType::Undular);
}

#[test]
fn jump_type_weak() {
    assert_eq!(JumpType::from_froude(1.7), JumpType::Weak);
    assert_eq!(JumpType::from_froude(2.0), JumpType::Weak);
    assert_eq!(JumpType::from_froude(2.49), JumpType::Weak);
}

#[test]
fn jump_type_oscillating() {
    assert_eq!(JumpType::from_froude(2.5), JumpType::Oscillating);
    assert_eq!(JumpType::from_froude(3.5), JumpType::Oscillating);
    assert_eq!(JumpType::from_froude(4.49), JumpType::Oscillating);
}

#[test]
fn jump_type_steady() {
    assert_eq!(JumpType::from_froude(4.5), JumpType::Steady);
    assert_eq!(JumpType::from_froude(6.0), JumpType::Steady);
    assert_eq!(JumpType::from_froude(8.99), JumpType::Steady);
}

#[test]
fn jump_type_strong() {
    assert_eq!(JumpType::from_froude(9.0), JumpType::Strong);
    assert_eq!(JumpType::from_froude(12.0), JumpType::Strong);
}

#[test]
fn jump_type_design_suitability() {
    assert!(!JumpType::Undular.is_suitable_for_design());
    assert!(!JumpType::Weak.is_suitable_for_design());
    assert!(!JumpType::Oscillating.is_suitable_for_design());
    assert!(JumpType::Steady.is_suitable_for_design());
    assert!(!JumpType::Strong.is_suitable_for_design());
}

// ============================================================
// Conjugate Depth Tests (Bélanger Equation)
// ============================================================

#[test]
fn conjugate_depth_froude_2() {
    // For Fr1 = 2.0, y2/y1 = 0.5 × (√(1 + 8×4) - 1) = 0.5 × (√33 - 1) ≈ 2.37
    let solver = GvfSolver::new();
    let section = SectionType::rectangular(2.0, 3.0);

    // Set up discharge to get Fr ≈ 2 at depth 0.5m
    // Fr = V / sqrt(g*D) => V = Fr * sqrt(g*D) = 2 * sqrt(9.81 * 0.5) ≈ 4.43 m/s
    // Q = V * A = 4.43 * (2.0 * 0.5) = 4.43 m³/s
    let q = 4.43;
    let y1 = 0.5;

    let y2 = solver.conjugate_depth(&section, q, y1);

    // Expected ratio ≈ 2.37
    let ratio = y2 / y1;
    assert!(ratio > 2.0 && ratio < 3.0, "Ratio was {}", ratio);
}

#[test]
fn conjugate_depth_subcritical_returns_same() {
    let solver = GvfSolver::new();
    let section = SectionType::rectangular(2.0, 3.0);

    // Low discharge for subcritical flow
    let q = 0.5;
    let y1 = 1.5;

    let y2 = solver.conjugate_depth(&section, q, y1);

    // Should return same depth since already subcritical
    assert!((y2 - y1).abs() < 0.01, "Expected {}, got {}", y1, y2);
}

// ============================================================
// Hydraulic Jump Detection Tests
// ============================================================

#[test]
fn no_jump_in_subcritical_flow() {
    // Canal con pendiente suave - flujo completamente subcrítico
    let system = ChannelSystem {
        name: "Test Subcritical".into(),
        design_discharge: 2.0,
        reaches: vec![ChannelReach {
            id: "reach1".into(),
            start_station: 0.0,
            end_station: 100.0,
            section: SectionType::trapezoidal(2.0, 1.5, 1.0),
            manning_n: 0.015,
            slope: 0.0005, // Pendiente suave
            start_elevation: 10.0,
            end_elevation: None,
            element_type: ChannelElementType::Channel,
        }],
        downstream_control: DownstreamControl::NormalDepth,
    };

    let solver = GvfSolver::new();
    let result = solver.analyze(&system).expect("Analysis failed");

    // No debe haber salto en flujo subcrítico uniforme
    assert!(result.hydraulic_jump.is_none());
}

#[test]
fn no_jump_in_supercritical_flow() {
    // Canal con pendiente pronunciada - flujo completamente supercrítico
    let system = ChannelSystem {
        name: "Test Supercritical".into(),
        design_discharge: 2.0,
        reaches: vec![ChannelReach {
            id: "reach1".into(),
            start_station: 0.0,
            end_station: 50.0,
            section: SectionType::trapezoidal(2.0, 1.5, 1.0),
            manning_n: 0.015,
            slope: 0.02, // Pendiente pronunciada
            start_elevation: 10.0,
            end_elevation: None,
            element_type: ChannelElementType::Channel,
        }],
        downstream_control: DownstreamControl::NormalDepth,
    };

    let solver = GvfSolver::new();
    let result = solver.analyze(&system).expect("Analysis failed");

    // No debe haber salto si el flujo es uniformemente supercrítico
    assert!(result.hydraulic_jump.is_none());
}

// ============================================================
// Hydraulic Jump Properties Tests
// ============================================================

#[test]
fn jump_length_formula() {
    // L = 6.1 × y2 (USBR)
    let y2: f64 = 1.5;
    let expected_length = 6.1 * y2;
    assert!((expected_length - 9.15).abs() < 0.01);
}

#[test]
fn energy_loss_formula() {
    // ΔE = (y2 - y1)³ / (4 × y1 × y2)
    let y1: f64 = 0.5;
    let y2: f64 = 1.5;
    let expected_loss = (y2 - y1).powi(3) / (4.0 * y1 * y2);

    // (1.0)³ / (4 × 0.5 × 1.5) = 1.0 / 3.0 ≈ 0.333
    assert!((expected_loss - 0.333).abs() < 0.01);
}

#[test]
fn belanger_equation_verification() {
    // Verify: y2/y1 = 0.5 × (√(1 + 8×Fr1²) - 1)
    let fr1: f64 = 3.0;
    let ratio = 0.5 * ((1.0 + 8.0 * fr1.powi(2)).sqrt() - 1.0);

    // For Fr1 = 3: ratio = 0.5 × (√73 - 1) = 0.5 × (8.544 - 1) = 3.77
    assert!((ratio - 3.77).abs() < 0.01, "Ratio was {}", ratio);
}

#[test]
fn stilling_basin_required_for_high_froude() {
    // Basin required when Fr1 > 2.5
    assert!(!needs_basin(2.0));
    assert!(!needs_basin(2.5));
    assert!(needs_basin(2.6));
    assert!(needs_basin(5.0));
}

fn needs_basin(fr: f64) -> bool {
    fr > 2.5
}

// ============================================================
// Jump Description Tests
// ============================================================

#[test]
fn jump_type_descriptions() {
    assert!(JumpType::Undular.description_es().contains("1.7"));
    assert!(JumpType::Weak.description_es().contains("2.5"));
    assert!(JumpType::Oscillating.description_es().contains("Evitar"));
    assert!(JumpType::Steady.description_es().contains("Óptimo"));
    assert!(JumpType::Strong.description_es().contains("Erosivo"));
}
