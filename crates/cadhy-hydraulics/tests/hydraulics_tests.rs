//! Tests for hydraulics calculation engine

use cadhy_hydraulics::{FlowRegime, HydraulicsEngine, SectionType};

// ============================================================
// Manning Flow Calculation Tests
// ============================================================

#[test]
fn manning_flow_rectangular() {
    let section = SectionType::rectangular(2.0, 1.5);
    let flow = HydraulicsEngine::manning_flow(&section, 0.001, 0.015, 1.0);

    // Q = (1/n) * A * R^(2/3) * S^(1/2)
    // Q = (1/0.015) * 2 * 0.5^(2/3) * 0.001^0.5 ≈ 2.65 m³/s
    assert!(flow.discharge > 2.0 && flow.discharge < 3.0);
}

#[test]
fn manning_flow_returns_correct_area() {
    let section = SectionType::rectangular(2.0, 1.5);
    let flow = HydraulicsEngine::manning_flow(&section, 0.001, 0.015, 1.0);

    assert!((flow.area - 2.0).abs() < 0.001);
}

#[test]
fn manning_flow_velocity() {
    let section = SectionType::rectangular(2.0, 1.5);
    let flow = HydraulicsEngine::manning_flow(&section, 0.001, 0.015, 1.0);

    // V = Q / A
    let expected_velocity = flow.discharge / flow.area;
    assert!((flow.velocity - expected_velocity).abs() < 0.001);
}

#[test]
fn manning_flow_zero_slope() {
    let section = SectionType::rectangular(2.0, 1.5);
    let flow = HydraulicsEngine::manning_flow(&section, 0.0, 0.015, 1.0);

    assert_eq!(flow.discharge, 0.0);
    assert_eq!(flow.velocity, 0.0);
}

#[test]
fn manning_flow_steep_slope() {
    let section = SectionType::rectangular(2.0, 1.5);
    let flow_gentle = HydraulicsEngine::manning_flow(&section, 0.001, 0.015, 1.0);
    let flow_steep = HydraulicsEngine::manning_flow(&section, 0.01, 0.015, 1.0);

    assert!(flow_steep.discharge > flow_gentle.discharge);
}

// ============================================================
// Flow Regime Tests
// ============================================================

#[test]
fn flow_regime_subcritical() {
    assert_eq!(FlowRegime::from_froude(0.5), FlowRegime::Subcritical);
}

#[test]
fn flow_regime_critical() {
    assert_eq!(FlowRegime::from_froude(1.0), FlowRegime::Critical);
}

#[test]
fn flow_regime_supercritical() {
    assert_eq!(FlowRegime::from_froude(2.0), FlowRegime::Supercritical);
}

#[test]
fn manning_flow_subcritical_regime() {
    let section = SectionType::rectangular(2.0, 1.5);
    let flow = HydraulicsEngine::manning_flow(&section, 0.001, 0.015, 1.0);

    // Gentle slope should produce subcritical flow
    assert_eq!(flow.flow_regime, FlowRegime::Subcritical);
}

#[test]
fn froude_number_calculation() {
    let section = SectionType::rectangular(2.0, 1.5);
    let flow = HydraulicsEngine::manning_flow(&section, 0.001, 0.015, 1.0);

    // Fr = V / sqrt(g * D)
    // Should be positive and less than 1 for subcritical
    assert!(flow.froude > 0.0);
    assert!(flow.froude < 1.0);
}

// ============================================================
// Normal Depth Tests
// ============================================================

#[test]
fn normal_depth_calculation() {
    let section = SectionType::rectangular(2.0, 1.5);
    let yn = HydraulicsEngine::normal_depth(&section, 2.0, 0.001, 0.015, 0.001, 100).unwrap();

    // Verify by computing flow at yn
    let flow = HydraulicsEngine::manning_flow(&section, 0.001, 0.015, yn);
    assert!((flow.discharge - 2.0).abs() < 0.01);
}

#[test]
fn normal_depth_zero_discharge() {
    let section = SectionType::rectangular(2.0, 1.5);
    let yn = HydraulicsEngine::normal_depth(&section, 0.0, 0.001, 0.015, 0.001, 100).unwrap();

    assert_eq!(yn, 0.0);
}

#[test]
fn normal_depth_requires_positive_slope() {
    let section = SectionType::rectangular(2.0, 1.5);
    let result = HydraulicsEngine::normal_depth(&section, 2.0, 0.0, 0.015, 0.001, 100);

    assert!(result.is_err());
}

#[test]
fn normal_depth_increases_with_discharge() {
    let section = SectionType::rectangular(2.0, 1.5);
    let yn_small = HydraulicsEngine::normal_depth(&section, 1.0, 0.001, 0.015, 0.001, 100).unwrap();
    let yn_large = HydraulicsEngine::normal_depth(&section, 3.0, 0.001, 0.015, 0.001, 100).unwrap();

    assert!(yn_large > yn_small);
}

// ============================================================
// Critical Depth Tests
// ============================================================

#[test]
fn critical_depth_calculation() {
    let section = SectionType::rectangular(2.0, 1.5);
    let yc = HydraulicsEngine::critical_depth(&section, 2.0, 0.001, 100).unwrap();

    // At critical depth, Fr = 1
    let props = section.hydraulic_properties(yc);
    let v = 2.0 / props.area;
    let fr = v / (9.81 * props.hydraulic_depth).sqrt();

    assert!((fr - 1.0).abs() < 0.1);
}

#[test]
fn critical_depth_zero_discharge() {
    let section = SectionType::rectangular(2.0, 1.5);
    let yc = HydraulicsEngine::critical_depth(&section, 0.0, 0.001, 100).unwrap();

    assert_eq!(yc, 0.0);
}

#[test]
fn critical_depth_increases_with_discharge() {
    let section = SectionType::rectangular(2.0, 1.5);
    let yc_small = HydraulicsEngine::critical_depth(&section, 1.0, 0.001, 100).unwrap();
    let yc_large = HydraulicsEngine::critical_depth(&section, 3.0, 0.001, 100).unwrap();

    assert!(yc_large > yc_small);
}

// ============================================================
// Specific Energy Tests
// ============================================================

#[test]
fn specific_energy_calculation() {
    let e = HydraulicsEngine::specific_energy(2.0, 1.0);
    // E = y + V²/(2g) = 1.0 + 4/(2*9.81) ≈ 1.204
    assert!((e - 1.204).abs() < 0.01);
}

#[test]
fn specific_energy_zero_velocity() {
    let e = HydraulicsEngine::specific_energy(0.0, 1.5);
    assert!((e - 1.5).abs() < 0.001);
}

// ============================================================
// Transition Head Loss Tests
// ============================================================

#[test]
fn transition_head_loss_expansion() {
    let hl = HydraulicsEngine::transition_head_loss(2.0, 1.0, 0.5);
    // hL = K * |V2² - V1²| / (2g) = 0.5 * |1 - 4| / 19.62 ≈ 0.076
    assert!((hl - 0.0765).abs() < 0.01);
}

#[test]
fn transition_head_loss_contraction() {
    let hl = HydraulicsEngine::transition_head_loss(1.0, 2.0, 0.3);
    // hL = 0.3 * |4 - 1| / 19.62 ≈ 0.046
    assert!((hl - 0.046).abs() < 0.01);
}

#[test]
fn transition_head_loss_no_velocity_change() {
    let hl = HydraulicsEngine::transition_head_loss(2.0, 2.0, 0.5);
    assert_eq!(hl, 0.0);
}

// ============================================================
// Capacity Check Tests
// ============================================================

#[test]
fn capacity_check_basic() {
    let section = SectionType::rectangular(2.0, 1.5);
    let check = HydraulicsEngine::check_capacity(&section, 2.0, 0.001, 0.015, 0.3);

    assert!(check.normal_depth > 0.0);
    assert!(check.critical_depth > 0.0);
    assert!(check.freeboard >= 0.0);
}

#[test]
fn capacity_check_freeboard() {
    let section = SectionType::rectangular(2.0, 1.5);
    let check = HydraulicsEngine::check_capacity(&section, 1.0, 0.001, 0.015, 0.3);

    // Freeboard = max_depth - normal_depth
    let expected_freeboard = 1.5 - check.normal_depth;
    assert!((check.freeboard - expected_freeboard).abs() < 0.01);
}

#[test]
fn capacity_check_velocity_safe_range() {
    let section = SectionType::rectangular(2.0, 1.5);
    let check = HydraulicsEngine::check_capacity(&section, 2.0, 0.001, 0.015, 0.3);

    // Safe velocity typically 0.3 - 3.0 m/s
    if check.velocity >= 0.3 && check.velocity <= 3.0 {
        assert!(check.is_velocity_safe);
    }
}
