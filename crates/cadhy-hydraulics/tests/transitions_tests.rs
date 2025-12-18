//! Tests for transitions module

use cadhy_hydraulics::{Transition, TransitionType};

// ============================================================
// Transition Creation Tests
// ============================================================

#[test]
fn transition_linear_creation() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear).unwrap();

    assert_eq!(transition.start_station, 0.0);
    assert_eq!(transition.end_station, 10.0);
    assert_eq!(transition.transition_type, TransitionType::Linear);
}

#[test]
fn transition_warped_creation() {
    let transition = Transition::new(50.0, 60.0, TransitionType::Warped).unwrap();

    assert_eq!(transition.transition_type, TransitionType::Warped);
}

#[test]
fn transition_invalid_stations() {
    let result = Transition::new(10.0, 5.0, TransitionType::Linear);
    assert!(result.is_err());
}

#[test]
fn transition_same_station() {
    let result = Transition::new(10.0, 10.0, TransitionType::Linear);
    assert!(result.is_err());
}

// ============================================================
// Length Tests
// ============================================================

#[test]
fn transition_length() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear).unwrap();
    assert_eq!(transition.length(), 10.0);
}

#[test]
fn transition_length_non_zero_start() {
    let transition = Transition::new(25.0, 50.0, TransitionType::Linear).unwrap();
    assert_eq!(transition.length(), 25.0);
}

// ============================================================
// Default Loss Coefficients Tests
// ============================================================

#[test]
fn loss_coefficient_linear() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear).unwrap();
    assert_eq!(transition.loss_coefficient, 0.3);
}

#[test]
fn loss_coefficient_warped() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Warped).unwrap();
    assert_eq!(transition.loss_coefficient, 0.1);
}

#[test]
fn loss_coefficient_cylindrical() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Cylindrical).unwrap();
    assert_eq!(transition.loss_coefficient, 0.15);
}

#[test]
fn loss_coefficient_inlet() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Inlet).unwrap();
    assert_eq!(transition.loss_coefficient, 0.5);
}

#[test]
fn loss_coefficient_outlet() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Outlet).unwrap();
    assert_eq!(transition.loss_coefficient, 0.2);
}

// ============================================================
// Interpolation Tests
// ============================================================

#[test]
fn interpolation_linear_start() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear).unwrap();
    assert!((transition.interpolation_factor(0.0) - 0.0).abs() < 0.001);
}

#[test]
fn interpolation_linear_middle() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear).unwrap();
    assert!((transition.interpolation_factor(5.0) - 0.5).abs() < 0.001);
}

#[test]
fn interpolation_linear_end() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear).unwrap();
    assert!((transition.interpolation_factor(10.0) - 1.0).abs() < 0.001);
}

#[test]
fn interpolation_warped_middle() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Warped).unwrap();
    let mid = transition.interpolation_factor(5.0);

    // Warped (S-curve) should be approximately 0.5 at midpoint
    assert!((mid - 0.5).abs() < 0.1);
}

#[test]
fn interpolation_before_start() {
    let transition = Transition::new(10.0, 20.0, TransitionType::Linear).unwrap();
    assert_eq!(transition.interpolation_factor(5.0), 0.0);
}

#[test]
fn interpolation_after_end() {
    let transition = Transition::new(10.0, 20.0, TransitionType::Linear).unwrap();
    assert_eq!(transition.interpolation_factor(25.0), 1.0);
}

// ============================================================
// Contains Station Tests
// ============================================================

#[test]
fn contains_station_inside() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear).unwrap();
    assert!(transition.contains_station(5.0));
}

#[test]
fn contains_station_at_start() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear).unwrap();
    assert!(transition.contains_station(0.0));
}

#[test]
fn contains_station_at_end() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear).unwrap();
    assert!(transition.contains_station(10.0));
}

#[test]
fn contains_station_before() {
    let transition = Transition::new(10.0, 20.0, TransitionType::Linear).unwrap();
    assert!(!transition.contains_station(5.0));
}

#[test]
fn contains_station_after() {
    let transition = Transition::new(10.0, 20.0, TransitionType::Linear).unwrap();
    assert!(!transition.contains_station(25.0));
}

// ============================================================
// Head Loss Tests
// ============================================================

#[test]
fn head_loss_expansion() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear)
        .unwrap()
        .with_loss_coefficient(0.5);

    // hL = 0.5 * |2² - 1²| / (2*9.81) = 0.5 * 3 / 19.62 ≈ 0.076
    let hl = transition.head_loss(1.0, 2.0);
    assert!((hl - 0.0765).abs() < 0.01);
}

#[test]
fn head_loss_contraction() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear)
        .unwrap()
        .with_loss_coefficient(0.3);

    let hl = transition.head_loss(2.0, 1.0);
    // Same magnitude as expansion
    assert!(hl > 0.0);
}

#[test]
fn head_loss_no_change() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear).unwrap();
    let hl = transition.head_loss(2.0, 2.0);
    assert_eq!(hl, 0.0);
}

// ============================================================
// Builder Pattern Tests
// ============================================================

#[test]
fn builder_with_loss_coefficient() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear)
        .unwrap()
        .with_loss_coefficient(0.4);

    assert_eq!(transition.loss_coefficient, 0.4);
}

#[test]
fn builder_with_max_angle() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Inlet)
        .unwrap()
        .with_max_angle(12.5);

    assert_eq!(transition.max_angle, Some(12.5));
}

#[test]
fn builder_with_fillet() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Linear)
        .unwrap()
        .with_fillet(0.15);

    assert_eq!(transition.fillet_radius, Some(0.15));
}

#[test]
fn builder_chaining() {
    let transition = Transition::new(0.0, 10.0, TransitionType::Warped)
        .unwrap()
        .with_loss_coefficient(0.15)
        .with_max_angle(10.0)
        .with_fillet(0.1);

    assert_eq!(transition.loss_coefficient, 0.15);
    assert_eq!(transition.max_angle, Some(10.0));
    assert_eq!(transition.fillet_radius, Some(0.1));
}

// ============================================================
// Display Name Tests
// ============================================================

#[test]
fn display_name_linear() {
    assert_eq!(TransitionType::Linear.display_name(), "Linear");
}

#[test]
fn display_name_warped() {
    assert_eq!(TransitionType::Warped.display_name(), "Warped");
}

#[test]
fn display_name_inlet() {
    assert_eq!(TransitionType::Inlet.display_name(), "Inlet (Expansion)");
}

#[test]
fn display_name_outlet() {
    assert_eq!(
        TransitionType::Outlet.display_name(),
        "Outlet (Contraction)"
    );
}
