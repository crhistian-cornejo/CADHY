//! Tests for sections module

use cadhy_hydraulics::{Berm, BermSide, SectionType, StationSection};

// ============================================================
// Rectangular Section Tests
// ============================================================

#[test]
fn rectangular_section_creation() {
    let section = SectionType::rectangular(2.0, 1.5);
    assert_eq!(section.max_depth(), 1.5);
    assert_eq!(section.max_top_width(), 2.0);
}

#[test]
fn rectangular_hydraulic_area() {
    let section = SectionType::rectangular(2.0, 1.5);
    let props = section.hydraulic_properties(1.0);

    // Area = width * depth = 2 * 1 = 2
    assert!((props.area - 2.0).abs() < 0.001);
}

#[test]
fn rectangular_wetted_perimeter() {
    let section = SectionType::rectangular(2.0, 1.5);
    let props = section.hydraulic_properties(1.0);

    // P = width + 2*depth = 2 + 2*1 = 4
    assert!((props.wetted_perimeter - 4.0).abs() < 0.001);
}

#[test]
fn rectangular_hydraulic_radius() {
    let section = SectionType::rectangular(2.0, 1.5);
    let props = section.hydraulic_properties(1.0);

    // R = A/P = 2/4 = 0.5
    assert!((props.hydraulic_radius - 0.5).abs() < 0.001);
}

#[test]
fn rectangular_profile_points() {
    let section = SectionType::rectangular(2.0, 1.5);
    let points = section.profile_points(32);

    assert_eq!(points.len(), 4);
    // First point should be at -width/2
    assert!((points[0].x - (-1.0)).abs() < 0.001);
    // Second point at +width/2
    assert!((points[1].x - 1.0).abs() < 0.001);
}

// ============================================================
// Trapezoidal Section Tests
// ============================================================

#[test]
fn trapezoidal_section_creation() {
    let section = SectionType::trapezoidal(2.0, 1.5, 1.5);
    assert_eq!(section.max_depth(), 1.5);
}

#[test]
fn trapezoidal_top_width() {
    let section = SectionType::trapezoidal(2.0, 1.5, 1.5);
    // Top width = bottom + 2 * depth * slope = 2 + 2 * 1.5 * 1.5 = 6.5
    assert!((section.max_top_width() - 6.5).abs() < 0.001);
}

#[test]
fn trapezoidal_hydraulic_area() {
    let section = SectionType::trapezoidal(2.0, 1.5, 1.5);
    let props = section.hydraulic_properties(1.0);

    // Area = (b + T)/2 * y = (2 + 5)/2 * 1 = 3.5
    // T = 2 + 2*1*1.5 = 5
    assert!((props.area - 3.5).abs() < 0.001);
}

#[test]
fn trapezoidal_asymmetric_slopes() {
    let section = SectionType::Trapezoidal {
        bottom_width: 2.0,
        depth: 1.5,
        left_slope: 1.0,
        right_slope: 2.0,
    };

    let props = section.hydraulic_properties(1.0);
    // Top width = 2 + 1*1 + 1*2 = 5
    assert!((props.top_width - 5.0).abs() < 0.001);
}

// ============================================================
// Circular Section Tests
// ============================================================

#[test]
fn circular_section_creation() {
    let section = SectionType::circular(2.0);
    assert_eq!(section.max_depth(), 2.0);
    assert_eq!(section.max_top_width(), 2.0);
}

#[test]
fn circular_full_flow() {
    let section = SectionType::circular(2.0);
    let props = section.hydraulic_properties(2.0); // Full pipe

    // Area = π * r² = π * 1² = π
    assert!((props.area - std::f64::consts::PI).abs() < 0.01);
}

#[test]
fn circular_half_full() {
    let section = SectionType::circular(2.0);
    let props = section.hydraulic_properties(1.0); // Half full

    // Area = π * r² / 2 = π / 2
    assert!((props.area - std::f64::consts::PI / 2.0).abs() < 0.01);
}

#[test]
fn circular_profile_points() {
    let section = SectionType::circular(2.0);
    let points = section.profile_points(32);

    // Should have 33 points (0 to 32 inclusive for a half circle)
    assert_eq!(points.len(), 33);
}

// ============================================================
// Triangular Section Tests
// ============================================================

#[test]
fn triangular_section() {
    let section = SectionType::Triangular {
        depth: 1.5,
        left_slope: 1.5,
        right_slope: 1.5,
    };

    let props = section.hydraulic_properties(1.0);
    // Area = y² * (z1 + z2) / 2 = 1 * (1.5 + 1.5) / 2 = 1.5
    assert!((props.area - 1.5).abs() < 0.001);
}

// ============================================================
// StationSection Tests
// ============================================================

#[test]
fn station_section_creation() {
    let section = StationSection::new(50.0, SectionType::rectangular(2.0, 1.5));

    assert_eq!(section.station, 50.0);
    assert_eq!(section.wall_thickness, 0.15); // Default
    assert_eq!(section.floor_thickness, 0.20); // Default
    assert_eq!(section.manning_n, 0.015); // Default
}

#[test]
fn station_section_builder_pattern() {
    let section = StationSection::new(0.0, SectionType::rectangular(2.0, 1.5))
        .with_wall_thickness(0.20)
        .with_floor_thickness(0.25)
        .with_manning(0.013);

    assert_eq!(section.wall_thickness, 0.20);
    assert_eq!(section.floor_thickness, 0.25);
    assert_eq!(section.manning_n, 0.013);
}

// ============================================================
// Validation Tests
// ============================================================

#[test]
fn rectangular_validation_positive_width() {
    let section = SectionType::rectangular(2.0, 1.5);
    assert!(section.validate().is_ok());
}

#[test]
fn rectangular_validation_negative_width() {
    let section = SectionType::Rectangular {
        width: -1.0,
        depth: 1.5,
    };
    assert!(section.validate().is_err());
}

#[test]
fn rectangular_validation_zero_depth() {
    let section = SectionType::Rectangular {
        width: 2.0,
        depth: 0.0,
    };
    assert!(section.validate().is_err());
}

#[test]
fn circular_validation_positive_diameter() {
    let section = SectionType::circular(1.0);
    assert!(section.validate().is_ok());
}

#[test]
fn circular_validation_negative_diameter() {
    let section = SectionType::Circular { diameter: -0.5 };
    assert!(section.validate().is_err());
}

// ============================================================
// Section Type Comparison Tests
// ============================================================

#[test]
fn same_type_comparison() {
    let rect1 = SectionType::rectangular(2.0, 1.5);
    let rect2 = SectionType::rectangular(3.0, 2.0);
    assert!(rect1.same_type(&rect2));
}

#[test]
fn different_type_comparison() {
    let rect = SectionType::rectangular(2.0, 1.5);
    let trap = SectionType::trapezoidal(2.0, 1.5, 1.0);
    assert!(!rect.same_type(&trap));
}

// ============================================================
// Compound Section Tests
// ============================================================

#[test]
fn compound_section_main_channel_only() {
    // Canal principal trapezoidal sin bermas
    let main = SectionType::trapezoidal(2.0, 1.5, 1.5);
    let compound = SectionType::Compound {
        main_channel: Box::new(main.clone()),
        berms: vec![],
    };

    let props_main = main.hydraulic_properties(1.0);
    let props_compound = compound.hydraulic_properties(1.0);

    // Sin bermas, debe ser igual al canal principal
    assert!((props_compound.area - props_main.area).abs() < 0.001);
    assert!((props_compound.wetted_perimeter - props_main.wetted_perimeter).abs() < 0.001);
}

#[test]
fn compound_section_with_berms_below_water() {
    // Canal con bermas que NO están activas (agua no llega a ellas)
    let main = SectionType::trapezoidal(2.0, 1.5, 1.5);
    let berms = vec![Berm {
        side: BermSide::Left,
        width: 5.0,
        elevation: 1.2, // Berma a 1.2m del fondo
        slope: 0.02,
        manning_n: 0.030,
    }];

    let compound = SectionType::Compound {
        main_channel: Box::new(main.clone()),
        berms,
    };

    // Agua a 1.0m (por debajo de la berma a 1.2m)
    let result = compound.compound_hydraulic_properties(1.0, 0.015);

    // Solo el canal principal debe estar activo
    assert_eq!(result.zone_flows.len(), 1);
    assert_eq!(result.zone_flows[0].zone_name, "Canal Principal");
}

#[test]
fn compound_section_with_active_berms() {
    // Canal con bermas activas
    let main = SectionType::trapezoidal(2.0, 1.5, 1.5);
    let berms = vec![
        Berm {
            side: BermSide::Left,
            width: 5.0,
            elevation: 0.8, // Berma a 0.8m del fondo
            slope: 0.02,
            manning_n: 0.030,
        },
        Berm {
            side: BermSide::Right,
            width: 5.0,
            elevation: 0.8,
            slope: 0.02,
            manning_n: 0.030,
        },
    ];

    let compound = SectionType::Compound {
        main_channel: Box::new(main),
        berms,
    };

    // Agua a 1.2m (por encima de las bermas)
    let result = compound.compound_hydraulic_properties(1.2, 0.015);

    // Deben estar activas las 3 zonas
    assert_eq!(result.zone_flows.len(), 3);

    // Área total debe ser mayor que solo canal principal
    let main_only = SectionType::trapezoidal(2.0, 1.5, 1.5);
    let main_props = main_only.hydraulic_properties(1.2);
    assert!(result.total_area > main_props.area);
}

#[test]
fn compound_section_equivalent_manning() {
    // Verificar que n equivalente (Lotter) es razonable
    let main = SectionType::rectangular(3.0, 2.0);
    let berms = vec![Berm {
        side: BermSide::Left,
        width: 10.0,
        elevation: 1.0,
        slope: 0.0,
        manning_n: 0.050, // Berma muy rugosa
    }];

    let compound = SectionType::Compound {
        main_channel: Box::new(main),
        berms,
    };

    let result = compound.compound_hydraulic_properties(1.5, 0.015);

    // n equivalente debe estar entre n del canal (0.015) y n de berma (0.050)
    assert!(result.equivalent_n > 0.015);
    assert!(result.equivalent_n < 0.050);
}

#[test]
fn compound_section_coriolis_factor() {
    // Factor α (Coriolis) debe ser >= 1.0
    let main = SectionType::trapezoidal(3.0, 2.0, 1.0);
    let berms = vec![
        Berm {
            side: BermSide::Left,
            width: 8.0,
            elevation: 1.0,
            slope: 0.01,
            manning_n: 0.035,
        },
        Berm {
            side: BermSide::Right,
            width: 8.0,
            elevation: 1.0,
            slope: 0.01,
            manning_n: 0.035,
        },
    ];

    let compound = SectionType::Compound {
        main_channel: Box::new(main),
        berms,
    };

    let result = compound.compound_hydraulic_properties(1.8, 0.015);

    // α >= 1.0 siempre
    assert!(result.alpha_coriolis >= 1.0);
    // β >= 1.0 siempre
    assert!(result.beta_boussinesq >= 1.0);
}

#[test]
fn compound_conveyance_distribution() {
    // Verificar que la conveyance se distribuye correctamente
    let main = SectionType::rectangular(2.0, 2.0);
    let berms = vec![Berm {
        side: BermSide::Left,
        width: 5.0,
        elevation: 1.0,
        slope: 0.0,
        manning_n: 0.030,
    }];

    let compound = SectionType::Compound {
        main_channel: Box::new(main),
        berms,
    };

    let result = compound.compound_hydraulic_properties(1.5, 0.015);

    // Suma de conveyances por zona debe ser igual al total
    let sum_k: f64 = result.zone_flows.iter().map(|z| z.conveyance).sum();
    assert!((sum_k - result.total_conveyance).abs() < 0.001);
}
