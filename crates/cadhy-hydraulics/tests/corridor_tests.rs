//! Tests for corridor generation module

use cadhy_hydraulics::{
    Alignment, BaffleBlockInput, ChuteBlockInput, ChuteGeometryInput, ChuteTypeInput, Corridor,
    CorridorGenerator, EndSillInput, Point3, SectionType, StationSection, StillingBasinInput,
    StillingBasinTypeInput, TransitionGeometryInput, TransitionType,
};

// ============================================================
// Corridor Creation Tests
// ============================================================

#[test]
fn corridor_creation() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let corridor = Corridor::new("Test Corridor", alignment);

    assert_eq!(corridor.name, "Test Corridor");
    assert!(corridor.sections.is_empty());
}

#[test]
fn corridor_add_section() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));

    assert_eq!(corridor.sections.len(), 1);
}

#[test]
fn corridor_multiple_sections_ordered() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);

    // Add out of order
    corridor.add_section(StationSection::new(
        50.0,
        SectionType::rectangular(3.0, 2.0),
    ));
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));
    corridor.add_section(StationSection::new(
        100.0,
        SectionType::rectangular(4.0, 2.5),
    ));

    // Should be sorted
    assert_eq!(corridor.sections[0].station, 0.0);
    assert_eq!(corridor.sections[1].station, 50.0);
    assert_eq!(corridor.sections[2].station, 100.0);
}

// ============================================================
// Section At Tests
// ============================================================

#[test]
fn section_at_exact_station() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));
    corridor.add_section(StationSection::new(
        50.0,
        SectionType::rectangular(3.0, 2.0),
    ));

    let section = corridor.section_at(50.0).unwrap();
    assert_eq!(section.station, 50.0);
}

#[test]
fn section_at_between_stations() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));
    corridor.add_section(StationSection::new(
        50.0,
        SectionType::rectangular(3.0, 2.0),
    ));

    // Should return the previous section
    let section = corridor.section_at(25.0).unwrap();
    assert_eq!(section.station, 0.0);
}

#[test]
fn section_at_after_last() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));
    corridor.add_section(StationSection::new(
        50.0,
        SectionType::rectangular(3.0, 2.0),
    ));

    let section = corridor.section_at(75.0).unwrap();
    assert_eq!(section.station, 50.0);
}

// ============================================================
// Section Change Detection Tests
// ============================================================

#[test]
fn has_section_change_true() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));
    corridor.add_section(StationSection::new(
        50.0,
        SectionType::rectangular(3.0, 2.0),
    ));

    assert!(corridor.has_section_change(25.0, 75.0));
}

#[test]
fn has_section_change_false() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));
    corridor.add_section(StationSection::new(
        50.0,
        SectionType::rectangular(3.0, 2.0),
    ));

    assert!(!corridor.has_section_change(10.0, 40.0));
}

// ============================================================
// Geometry Generation Tests
// ============================================================

#[test]
fn generate_corridor_mesh() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(50.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));

    let result = CorridorGenerator::generate(&corridor, 5.0).unwrap();

    assert!(!result.vertices.is_empty());
    assert!(!result.indices.is_empty());
}

#[test]
fn generate_corridor_no_sections_error() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(50.0, 0.0, 0.0),
    )
    .unwrap();

    let corridor = Corridor::new("Empty", alignment);
    let result = CorridorGenerator::generate(&corridor, 5.0);

    assert!(result.is_err());
}

#[test]
fn generate_corridor_has_normals() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(50.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));

    let result = CorridorGenerator::generate(&corridor, 5.0).unwrap();

    assert!(result.normals.is_some());
}

#[test]
fn generate_corridor_has_stations() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(50.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));

    let result = CorridorGenerator::generate(&corridor, 5.0).unwrap();

    assert!(result.stations.is_some());
}

// ============================================================
// Loft Generation Tests
// ============================================================

#[test]
fn generate_loft_between_sections() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let from_section = StationSection::new(0.0, SectionType::rectangular(2.0, 1.5));
    let to_section = StationSection::new(10.0, SectionType::rectangular(3.0, 2.0));

    let result =
        CorridorGenerator::generate_loft(&from_section, &to_section, &alignment, 10).unwrap();

    assert!(!result.vertices.is_empty());
    assert!(!result.indices.is_empty());
}

#[test]
fn loft_vertices_increase_with_steps() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let from_section = StationSection::new(0.0, SectionType::rectangular(2.0, 1.5));
    let to_section = StationSection::new(10.0, SectionType::rectangular(3.0, 2.0));

    let result_5 =
        CorridorGenerator::generate_loft(&from_section, &to_section, &alignment, 5).unwrap();
    let result_20 =
        CorridorGenerator::generate_loft(&from_section, &to_section, &alignment, 20).unwrap();

    assert!(result_20.vertices.len() > result_5.vertices.len());
}

// ============================================================
// Resolution Tests
// ============================================================

#[test]
fn higher_resolution_more_vertices() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));

    let result_coarse = CorridorGenerator::generate(&corridor, 20.0).unwrap();
    let result_fine = CorridorGenerator::generate(&corridor, 5.0).unwrap();

    assert!(result_fine.vertices.len() > result_coarse.vertices.len());
}

// ============================================================
// Solid Geometry Tests (Walls, Floor, Caps)
// ============================================================

#[test]
fn generate_solid_rectangular_channel() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(10.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Solid", alignment);
    let section = StationSection::new(0.0, SectionType::rectangular(2.0, 1.5))
        .with_wall_thickness(0.15)
        .with_floor_thickness(0.20);
    corridor.add_section(section);

    let result = CorridorGenerator::generate(&corridor, 2.0).unwrap();

    // Should have vertices (solid has more than surface-only)
    assert!(result.vertices.len() > 0);
    // Should have indices for triangles
    assert!(result.indices.len() > 0);
    // Indices should be in groups of 3 (triangles)
    assert_eq!(result.indices.len() % 3, 0);
}

#[test]
fn generate_solid_trapezoidal_channel() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(10.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Solid", alignment);
    let section = StationSection::new(0.0, SectionType::trapezoidal(2.0, 1.5, 1.5))
        .with_wall_thickness(0.15)
        .with_floor_thickness(0.20);
    corridor.add_section(section);

    let result = CorridorGenerator::generate(&corridor, 2.0).unwrap();

    assert!(result.vertices.len() > 0);
    assert!(result.indices.len() > 0);
}

#[test]
fn generate_solid_triangular_channel() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(10.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Solid", alignment);
    let section = StationSection::new(
        0.0,
        SectionType::Triangular {
            depth: 1.5,
            left_slope: 1.0,
            right_slope: 1.0,
        },
    )
    .with_wall_thickness(0.15)
    .with_floor_thickness(0.20);
    corridor.add_section(section);

    let result = CorridorGenerator::generate(&corridor, 2.0).unwrap();

    assert!(result.vertices.len() > 0);
    assert!(result.indices.len() > 0);
}

#[test]
fn solid_channel_has_normals() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(10.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Solid", alignment);
    let section = StationSection::new(0.0, SectionType::rectangular(2.0, 1.5))
        .with_wall_thickness(0.15)
        .with_floor_thickness(0.20);
    corridor.add_section(section);

    let result = CorridorGenerator::generate(&corridor, 2.0).unwrap();

    assert!(result.normals.is_some());
    let normals = result.normals.unwrap();
    // Should have same number of normals as vertices
    assert_eq!(normals.len(), result.vertices.len());
}

#[test]
fn normals_are_normalized() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(10.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    let section =
        StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)).with_wall_thickness(0.15);
    corridor.add_section(section);

    let result = CorridorGenerator::generate(&corridor, 2.0).unwrap();
    let normals = result.normals.unwrap();

    // Check that all normals have length approximately 1.0
    for normal in &normals {
        let len = (normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]).sqrt();
        assert!(
            (len - 1.0).abs() < 0.01,
            "Normal not normalized: length = {}",
            len
        );
    }
}

#[test]
fn solid_channel_with_slope() {
    let mut alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();
    alignment.start_elevation = 10.0;
    alignment.set_base_slope(-0.001); // 0.1% slope

    let mut corridor = Corridor::new("Sloped", alignment);
    let section =
        StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)).with_wall_thickness(0.15);
    corridor.add_section(section);

    let result = CorridorGenerator::generate(&corridor, 10.0).unwrap();

    // Find min and max Z values
    let mut min_z = f64::MAX;
    let mut max_z = f64::MIN;
    for v in &result.vertices {
        min_z = min_z.min(v[2]);
        max_z = max_z.max(v[2]);
    }

    // With 100m length and 0.1% slope, elevation drop is 0.1m
    // Max Z should be around start elevation
    assert!(max_z > 9.0, "Max Z should be near start elevation");
}

// ============================================================
// Transition Geometry Tests
// ============================================================

#[test]
fn generate_linear_transition() {
    let input = TransitionGeometryInput {
        transition_type: TransitionType::Linear,
        length: 5.0,
        resolution: 1.0,
        start_station: 0.0,
        start_elevation: 0.0,
        end_elevation: 0.0,
        inlet_section_type: "rectangular".to_string(),
        inlet_width: 2.0,
        inlet_depth: 1.5,
        inlet_side_slope: 0.0,
        inlet_wall_thickness: 0.15,
        inlet_floor_thickness: 0.20,
        outlet_section_type: "rectangular".to_string(),
        outlet_width: 3.0,
        outlet_depth: 2.0,
        outlet_side_slope: 0.0,
        outlet_wall_thickness: 0.15,
        outlet_floor_thickness: 0.20,
    };

    let result = CorridorGenerator::generate_transition(&input).unwrap();

    assert!(result.vertices.len() > 0, "Should generate vertices");
    assert!(result.indices.len() > 0, "Should generate indices");
    assert!(result.normals.is_some(), "Should generate normals");
}

#[test]
fn generate_warped_transition() {
    let input = TransitionGeometryInput {
        transition_type: TransitionType::Warped,
        length: 5.0,
        resolution: 1.0,
        start_station: 0.0,
        start_elevation: 0.0,
        end_elevation: 0.0,
        inlet_section_type: "rectangular".to_string(),
        inlet_width: 2.0,
        inlet_depth: 1.5,
        inlet_side_slope: 0.0,
        inlet_wall_thickness: 0.15,
        inlet_floor_thickness: 0.20,
        outlet_section_type: "rectangular".to_string(),
        outlet_width: 3.0,
        outlet_depth: 2.0,
        outlet_side_slope: 0.0,
        outlet_wall_thickness: 0.15,
        outlet_floor_thickness: 0.20,
    };

    let result = CorridorGenerator::generate_transition(&input).unwrap();

    assert!(result.vertices.len() > 0);
}

#[test]
fn generate_transition_rect_to_trap() {
    let input = TransitionGeometryInput {
        transition_type: TransitionType::Linear,
        length: 5.0,
        resolution: 1.0,
        start_station: 0.0,
        start_elevation: 0.0,
        end_elevation: 0.0,
        inlet_section_type: "rectangular".to_string(),
        inlet_width: 2.0,
        inlet_depth: 1.5,
        inlet_side_slope: 0.0,
        inlet_wall_thickness: 0.15,
        inlet_floor_thickness: 0.20,
        outlet_section_type: "trapezoidal".to_string(),
        outlet_width: 2.0,
        outlet_depth: 1.5,
        outlet_side_slope: 1.5,
        outlet_wall_thickness: 0.15,
        outlet_floor_thickness: 0.20,
    };

    let result = CorridorGenerator::generate_transition(&input).unwrap();

    assert!(result.vertices.len() > 0);
    assert!(result.indices.len() > 0);
}

#[test]
fn transition_with_elevation_change() {
    let input = TransitionGeometryInput {
        transition_type: TransitionType::Linear,
        length: 10.0,
        resolution: 2.0,
        start_station: 0.0,
        start_elevation: 10.0,
        end_elevation: 9.5, // 5% slope over 10m
        inlet_section_type: "rectangular".to_string(),
        inlet_width: 2.0,
        inlet_depth: 1.5,
        inlet_side_slope: 0.0,
        inlet_wall_thickness: 0.15,
        inlet_floor_thickness: 0.20,
        outlet_section_type: "rectangular".to_string(),
        outlet_width: 2.0,
        outlet_depth: 1.5,
        outlet_side_slope: 0.0,
        outlet_wall_thickness: 0.15,
        outlet_floor_thickness: 0.20,
    };

    let result = CorridorGenerator::generate_transition(&input).unwrap();

    // Find min and max Z values
    let mut min_z = f64::MAX;
    let mut max_z = f64::MIN;
    for v in &result.vertices {
        min_z = min_z.min(v[2]);
        max_z = max_z.max(v[2]);
    }

    // Z values should span from ~9.5 to ~10 + section depth
    assert!(min_z < 10.0, "Min Z should be below start elevation");
}

#[test]
fn transition_normals_are_normalized() {
    let input = TransitionGeometryInput {
        transition_type: TransitionType::Linear,
        length: 5.0,
        resolution: 1.0,
        start_station: 0.0,
        start_elevation: 0.0,
        end_elevation: 0.0,
        inlet_section_type: "rectangular".to_string(),
        inlet_width: 2.0,
        inlet_depth: 1.5,
        inlet_side_slope: 0.0,
        inlet_wall_thickness: 0.15,
        inlet_floor_thickness: 0.20,
        outlet_section_type: "rectangular".to_string(),
        outlet_width: 3.0,
        outlet_depth: 2.0,
        outlet_side_slope: 0.0,
        outlet_wall_thickness: 0.15,
        outlet_floor_thickness: 0.20,
    };

    let result = CorridorGenerator::generate_transition(&input).unwrap();
    let normals = result.normals.unwrap();

    for normal in &normals {
        let len = (normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]).sqrt();
        assert!(
            (len - 1.0).abs() < 0.01,
            "Transition normal not normalized: length = {}",
            len
        );
    }
}

#[test]
fn transition_triangular_sections() {
    let input = TransitionGeometryInput {
        transition_type: TransitionType::Linear,
        length: 5.0,
        resolution: 1.0,
        start_station: 0.0,
        start_elevation: 0.0,
        end_elevation: 0.0,
        inlet_section_type: "triangular".to_string(),
        inlet_width: 0.0, // triangular has no width
        inlet_depth: 1.5,
        inlet_side_slope: 1.0,
        inlet_wall_thickness: 0.15,
        inlet_floor_thickness: 0.20,
        outlet_section_type: "triangular".to_string(),
        outlet_width: 0.0,
        outlet_depth: 2.0,
        outlet_side_slope: 1.5,
        outlet_wall_thickness: 0.15,
        outlet_floor_thickness: 0.20,
    };

    let result = CorridorGenerator::generate_transition(&input).unwrap();

    assert!(result.vertices.len() > 0);
    assert!(result.indices.len() > 0);
}

#[test]
fn transition_inlet_type() {
    let input = TransitionGeometryInput {
        transition_type: TransitionType::Inlet,
        length: 5.0,
        resolution: 1.0,
        start_station: 0.0,
        start_elevation: 0.0,
        end_elevation: 0.0,
        inlet_section_type: "rectangular".to_string(),
        inlet_width: 4.0, // larger inlet (expansion)
        inlet_depth: 2.0,
        inlet_side_slope: 0.0,
        inlet_wall_thickness: 0.15,
        inlet_floor_thickness: 0.20,
        outlet_section_type: "rectangular".to_string(),
        outlet_width: 2.0,
        outlet_depth: 1.5,
        outlet_side_slope: 0.0,
        outlet_wall_thickness: 0.15,
        outlet_floor_thickness: 0.20,
    };

    let result = CorridorGenerator::generate_transition(&input).unwrap();

    assert!(result.vertices.len() > 0);
}

#[test]
fn transition_outlet_type() {
    let input = TransitionGeometryInput {
        transition_type: TransitionType::Outlet,
        length: 5.0,
        resolution: 1.0,
        start_station: 0.0,
        start_elevation: 0.0,
        end_elevation: 0.0,
        inlet_section_type: "rectangular".to_string(),
        inlet_width: 2.0,
        inlet_depth: 1.5,
        inlet_side_slope: 0.0,
        inlet_wall_thickness: 0.15,
        inlet_floor_thickness: 0.20,
        outlet_section_type: "rectangular".to_string(),
        outlet_width: 4.0, // larger outlet (contraction)
        outlet_depth: 2.0,
        outlet_side_slope: 0.0,
        outlet_wall_thickness: 0.15,
        outlet_floor_thickness: 0.20,
    };

    let result = CorridorGenerator::generate_transition(&input).unwrap();

    assert!(result.vertices.len() > 0);
}

// ============================================================
// Corridor with Dissipators Tests
// ============================================================

use cadhy_hydraulics::{
    BaffleBlock, BaffleBlockShape, BaffleRow, DissipatorGeometryGenerator, EndSillType,
    HydraulicJumpType, NaVec3, StillingBasinDesign, StillingBasinType, Transition,
};

#[test]
fn generate_corridor_without_dissipators() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));

    let result = CorridorGenerator::generate_with_dissipators(&corridor, 5.0).unwrap();

    assert!(result.channel.vertices.len() > 0);
    assert!(result.dissipators.is_none());
    assert!(result.transition_dissipators.is_empty());
    assert!(result.stilling_basins.is_empty());
}

#[test]
fn generate_baffle_block_geometry() {
    let block = BaffleBlock {
        width: 0.3,
        height: 0.4,
        thickness: 0.2,
        shape: BaffleBlockShape::Rectangular,
        x_offset: 0.0,
        y_position: 10.0,
    };

    let tangent = NaVec3::new(1.0, 0.0, 0.0);
    let geo = DissipatorGeometryGenerator::generate_baffle_block(&block, 100.0, &tangent);

    // A box has 6 faces, each with 4 vertices = 24 vertices
    // Each face has 2 triangles = 12 triangles total = 36 indices
    assert_eq!(geo.vertices.len(), 24);
    assert_eq!(geo.indices.len(), 36);
    assert_eq!(geo.normals.len(), 24);
}

#[test]
fn generate_baffle_row_geometry() {
    let template = BaffleBlock {
        width: 0.3,
        height: 0.4,
        thickness: 0.2,
        shape: BaffleBlockShape::Rectangular,
        x_offset: 0.0,
        y_position: 0.0,
    };

    let row = BaffleRow::uniform(
        3,         // num_blocks
        2.0,       // channel_width
        &template, // block_template
        5.0,       // distance_from_toe
        0,         // row_index
    );

    let tangent = NaVec3::new(1.0, 0.0, 0.0);
    let geo = DissipatorGeometryGenerator::generate_baffle_row(&row, 100.0, &tangent);

    // 3 blocks * 24 vertices each = 72 vertices
    assert_eq!(geo.vertices.len(), 72);
    // 3 blocks * 36 indices each = 108 indices
    assert_eq!(geo.indices.len(), 108);
}

#[test]
fn generate_stilling_basin_geometry_type_ii() {
    // Create a Type II stilling basin (with dentated end sill)
    let basin = StillingBasinDesign {
        basin_type: StillingBasinType::TypeII,
        jump_type: HydraulicJumpType::Steady,
        y1: 0.5,
        y2: 2.0,
        v1: 10.0,
        froude: 4.5,
        discharge: 10.0,
        channel_width: 2.0,
        length: 8.0,
        depth: 0.3,
        floor_elevation: 99.7,
        chute_blocks: vec![], // Type II has no chute blocks
        baffle_rows: vec![],  // Type II has no baffle blocks
        end_sill: EndSillType::Dentated {
            tooth_height: 0.3,
            tooth_width: 0.15,
            tooth_spacing: 0.15,
        },
        apron_length: 2.0,
        energy_loss: 1.5,
        efficiency: 0.5,
        submergence_ratio: 1.15,
    };

    let tangent = NaVec3::new(1.0, 0.0, 0.0);
    let geo = DissipatorGeometryGenerator::generate_stilling_basin(&basin, 0.0, 99.7, &tangent);

    // Should have geometry for dentated end sill (multiple teeth)
    assert!(geo.vertices.len() > 0);
    assert!(geo.indices.len() > 0);
}

#[test]
fn generate_stilling_basin_geometry_type_iii() {
    // Create a Type III stilling basin (with chute blocks and baffle blocks)
    let chute_blocks = vec![
        cadhy_hydraulics::ChuteBlock {
            width: 0.2,
            height: 0.3,
            thickness: 0.15,
            x_offset: -0.4,
        },
        cadhy_hydraulics::ChuteBlock {
            width: 0.2,
            height: 0.3,
            thickness: 0.15,
            x_offset: 0.0,
        },
        cadhy_hydraulics::ChuteBlock {
            width: 0.2,
            height: 0.3,
            thickness: 0.15,
            x_offset: 0.4,
        },
    ];

    let baffle_template = BaffleBlock {
        width: 0.25,
        height: 0.35,
        thickness: 0.2,
        shape: BaffleBlockShape::Rectangular,
        x_offset: 0.0,
        y_position: 0.0,
    };

    let baffle_rows = vec![BaffleRow::uniform(3, 2.0, &baffle_template, 3.0, 0)];

    let basin = StillingBasinDesign {
        basin_type: StillingBasinType::TypeIII,
        jump_type: HydraulicJumpType::Steady,
        y1: 0.4,
        y2: 1.5,
        v1: 8.0,
        froude: 4.0,
        discharge: 6.4,
        channel_width: 2.0,
        length: 6.0,
        depth: 0.25,
        floor_elevation: 99.75,
        chute_blocks,
        baffle_rows,
        end_sill: EndSillType::Solid { height: 0.25 },
        apron_length: 1.5,
        energy_loss: 1.2,
        efficiency: 0.55,
        submergence_ratio: 1.1,
    };

    let tangent = NaVec3::new(1.0, 0.0, 0.0);
    let geo = DissipatorGeometryGenerator::generate_stilling_basin(&basin, 0.0, 99.75, &tangent);

    // Should have geometry for:
    // - 3 chute blocks (3 * 24 = 72 vertices)
    // - 3 baffle blocks (3 * 24 = 72 vertices)
    // - 1 solid end sill (24 vertices)
    // Total: 168 vertices
    assert_eq!(geo.vertices.len(), 168);
}

#[test]
fn merge_geometries_correctly() {
    let block1 = BaffleBlock {
        width: 0.3,
        height: 0.4,
        thickness: 0.2,
        shape: BaffleBlockShape::Rectangular,
        x_offset: -0.5,
        y_position: 10.0,
    };
    let block2 = BaffleBlock {
        width: 0.3,
        height: 0.4,
        thickness: 0.2,
        shape: BaffleBlockShape::Rectangular,
        x_offset: 0.5,
        y_position: 10.0,
    };

    let tangent = NaVec3::new(1.0, 0.0, 0.0);
    let geo1 = DissipatorGeometryGenerator::generate_baffle_block(&block1, 100.0, &tangent);
    let geo2 = DissipatorGeometryGenerator::generate_baffle_block(&block2, 100.0, &tangent);

    let mut combined = cadhy_hydraulics::BaffleBlockGeometry {
        vertices: vec![],
        indices: vec![],
        normals: vec![],
    };

    DissipatorGeometryGenerator::merge_geometries(&mut combined, &geo1);
    DissipatorGeometryGenerator::merge_geometries(&mut combined, &geo2);

    // Combined should have both blocks
    assert_eq!(combined.vertices.len(), 48); // 24 * 2
    assert_eq!(combined.indices.len(), 72); // 36 * 2

    // Check that indices are properly offset
    // First block indices should be 0-23
    // Second block indices should be 24-47
    let max_first_block = combined.indices[..36].iter().max().unwrap();
    let min_second_block = combined.indices[36..].iter().min().unwrap();

    assert_eq!(*max_first_block, 23);
    assert_eq!(*min_second_block, 24);
}

#[test]
fn corridor_with_dissipators_structure() {
    let alignment = Alignment::straight(
        "Test",
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(100.0, 0.0, 0.0),
    )
    .unwrap();

    let mut corridor = Corridor::new("Test", alignment);
    corridor.add_section(StationSection::new(0.0, SectionType::rectangular(2.0, 1.5)));

    // Add a transition with baffle blocks
    let baffle_template = BaffleBlock {
        width: 0.25,
        height: 0.3,
        thickness: 0.15,
        shape: BaffleBlockShape::Rectangular,
        x_offset: 0.0,
        y_position: 0.0,
    };

    let mut transition = Transition::new(20.0, 30.0, TransitionType::Linear).unwrap();
    transition.baffle_rows = vec![BaffleRow::uniform(3, 2.0, &baffle_template, 5.0, 0)];
    corridor.transitions.push(transition);

    let result = CorridorGenerator::generate_with_dissipators(&corridor, 5.0).unwrap();

    // Should have channel geometry
    assert!(result.channel.vertices.len() > 0);

    // Should have dissipator geometry
    assert!(result.dissipators.is_some());
    let dissipators = result.dissipators.unwrap();
    assert!(dissipators.vertices.len() > 0);

    // Should have transition dissipator info
    assert_eq!(result.transition_dissipators.len(), 1);
    assert_eq!(result.transition_dissipators[0].start_station, 20.0);
    assert_eq!(result.transition_dissipators[0].end_station, 30.0);
}

#[test]
fn baffle_block_position_in_world_coords() {
    let block = BaffleBlock {
        width: 0.3,
        height: 0.4,
        thickness: 0.2,
        shape: BaffleBlockShape::Rectangular,
        x_offset: 1.0,    // 1m to the right of center
        y_position: 10.0, // At station 10
    };

    let tangent = NaVec3::new(1.0, 0.0, 0.0);
    let base_elevation = 100.0;
    let geo = DissipatorGeometryGenerator::generate_baffle_block(&block, base_elevation, &tangent);

    // Check that vertices are positioned correctly
    // Center should be at x_offset=1.0, y_position=10.0, z=base_elevation
    let xs: Vec<f64> = geo.vertices.iter().map(|v| v[0]).collect();
    let ys: Vec<f64> = geo.vertices.iter().map(|v| v[1]).collect();
    let zs: Vec<f64> = geo.vertices.iter().map(|v| v[2]).collect();

    // X range should be around 1.0 ± half_width (0.15)
    let x_min = xs.iter().cloned().fold(f64::INFINITY, f64::min);
    let x_max = xs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    assert!((x_min - 0.85).abs() < 0.01, "x_min = {}", x_min);
    assert!((x_max - 1.15).abs() < 0.01, "x_max = {}", x_max);

    // Y range should be around 10.0 ± half_thickness (0.1)
    let y_min = ys.iter().cloned().fold(f64::INFINITY, f64::min);
    let y_max = ys.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    assert!((y_min - 9.9).abs() < 0.01, "y_min = {}", y_min);
    assert!((y_max - 10.1).abs() < 0.01, "y_max = {}", y_max);

    // Z range should be from base_elevation to base_elevation + height
    let z_min = zs.iter().cloned().fold(f64::INFINITY, f64::min);
    let z_max = zs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    assert!((z_min - 100.0).abs() < 0.01, "z_min = {}", z_min);
    assert!((z_max - 100.4).abs() < 0.01, "z_max = {}", z_max);
}

// ============================================================
// Chute Geometry Tests
// ============================================================

#[test]
fn generate_smooth_chute() {
    let input = ChuteGeometryInput {
        name: "Test Chute".to_string(),
        chute_type: ChuteTypeInput::Smooth,
        inlet_length: 2.0,
        inlet_slope: 0.0,
        length: 20.0,
        drop: 10.0,
        width: 2.0,
        depth: 1.5,
        side_slope: 0.0,
        thickness: 0.2,
        start_station: 0.0,
        start_elevation: 100.0,
        resolution: 1.0,
        step_height: 0.5,
        step_length: 0.0,
        baffle_spacing: 2.0,
        baffle_height: 0.3,
        stilling_basin: None,
    };

    let result = CorridorGenerator::generate_chute(&input).unwrap();

    assert!(!result.vertices.is_empty(), "Should generate vertices");
    assert!(!result.indices.is_empty(), "Should generate indices");
    assert!(result.normals.is_some(), "Should generate normals");
    assert!(result.stations.is_some(), "Should generate stations");
}

#[test]
fn generate_stepped_chute() {
    let input = ChuteGeometryInput {
        name: "Stepped Chute".to_string(),
        chute_type: ChuteTypeInput::Stepped,
        inlet_length: 2.0,
        inlet_slope: 0.0,
        length: 20.0,
        drop: 10.0,
        width: 2.0,
        depth: 1.5,
        side_slope: 0.0,
        thickness: 0.2,
        start_station: 0.0,
        start_elevation: 100.0,
        resolution: 1.0,
        step_height: 0.5,
        step_length: 0.0, // 20 steps for 10m drop
        baffle_spacing: 2.0,
        baffle_height: 0.3,
        stilling_basin: None,
    };

    let result = CorridorGenerator::generate_chute(&input).unwrap();

    assert!(!result.vertices.is_empty(), "Should generate vertices");
    assert!(!result.indices.is_empty(), "Should generate indices");
    // Stepped chutes should have more vertices due to step geometry
    assert!(
        result.vertices.len() > 100,
        "Stepped chute should have substantial geometry"
    );
}

#[test]
fn generate_baffled_chute() {
    let input = ChuteGeometryInput {
        name: "Baffled Chute".to_string(),
        chute_type: ChuteTypeInput::Baffled,
        inlet_length: 2.0,
        inlet_slope: 0.0,
        length: 20.0,
        drop: 10.0,
        width: 2.0,
        depth: 1.5,
        side_slope: 0.0,
        thickness: 0.2,
        start_station: 0.0,
        start_elevation: 100.0,
        resolution: 1.0,
        step_height: 0.5,
        step_length: 0.0,
        baffle_spacing: 2.0, // Baffles every 2m
        baffle_height: 0.3,
        stilling_basin: None,
    };

    let result = CorridorGenerator::generate_chute(&input).unwrap();

    assert!(!result.vertices.is_empty(), "Should generate vertices");
    // Baffled chute should have baffle block geometry included
    assert!(
        result.vertices.len() > 100,
        "Baffled chute should have baffle geometry"
    );
}

#[test]
fn chute_with_stilling_basin_type_ii() {
    let input = ChuteGeometryInput {
        name: "Chute with Basin".to_string(),
        chute_type: ChuteTypeInput::Smooth,
        inlet_length: 2.0,
        inlet_slope: 0.0,
        length: 20.0,
        drop: 10.0,
        width: 2.0,
        depth: 1.5,
        side_slope: 0.0,
        thickness: 0.2,
        start_station: 0.0,
        start_elevation: 100.0,
        resolution: 1.0,
        step_height: 0.5,
        step_length: 0.0,
        baffle_spacing: 2.0,
        baffle_height: 0.3,
        stilling_basin: Some(StillingBasinInput {
            basin_type: StillingBasinTypeInput::TypeIi,
            length: 8.0,
            depth: 1.0,
            floor_thickness: 0.25,
            chute_blocks: None,
            baffle_blocks: None,
            end_sill: Some(EndSillInput {
                sill_type: "dentated".to_string(),
                height: 0.3,
                tooth_width: Some(0.15),
                tooth_spacing: Some(0.15),
            }),
            wingwall_angle: 0.0,
        }),
    };

    let result = CorridorGenerator::generate_chute(&input).unwrap();

    assert!(!result.vertices.is_empty(), "Should generate vertices");
    assert!(!result.indices.is_empty(), "Should generate indices");
    // With basin, should have more geometry
    assert!(
        result.vertices.len() > 200,
        "Should include stilling basin geometry"
    );
}

#[test]
fn chute_with_stilling_basin_type_iii() {
    let input = ChuteGeometryInput {
        name: "Chute with Type III Basin".to_string(),
        chute_type: ChuteTypeInput::Smooth,
        inlet_length: 2.0,
        inlet_slope: 0.0,
        length: 20.0,
        drop: 10.0,
        width: 2.0,
        depth: 1.5,
        side_slope: 0.0,
        thickness: 0.2,
        start_station: 0.0,
        start_elevation: 100.0,
        resolution: 1.0,
        step_height: 0.5,
        step_length: 0.0,
        baffle_spacing: 2.0,
        baffle_height: 0.3,
        stilling_basin: Some(StillingBasinInput {
            basin_type: StillingBasinTypeInput::TypeIii,
            length: 6.0,
            depth: 0.8,
            floor_thickness: 0.25,
            chute_blocks: Some(ChuteBlockInput {
                count: 3,
                width: 0.3,
                height: 0.3,
                thickness: 0.2,
                spacing: 0.3,
            }),
            baffle_blocks: Some(BaffleBlockInput {
                rows: 1,
                blocks_per_row: 3,
                width: 0.3,
                height: 0.4,
                thickness: 0.15,
                distance_from_inlet: 1.0,
                row_spacing: 1.5,
            }),
            end_sill: Some(EndSillInput {
                sill_type: "solid".to_string(),
                height: 0.25,
                tooth_width: None,
                tooth_spacing: None,
            }),
            wingwall_angle: 15.0,
        }),
    };

    let result = CorridorGenerator::generate_chute(&input).unwrap();

    assert!(!result.vertices.is_empty(), "Should generate vertices");
    // Type III has chute blocks + baffle blocks + end sill
    assert!(
        result.vertices.len() > 300,
        "Type III should have extensive geometry"
    );
}

#[test]
fn chute_elevation_decreases_along_length() {
    let input = ChuteGeometryInput {
        name: "Sloped Chute".to_string(),
        chute_type: ChuteTypeInput::Smooth,
        inlet_length: 0.0,
        inlet_slope: 0.0,
        length: 20.0,
        drop: 10.0, // 50% slope
        width: 2.0,
        depth: 1.5,
        side_slope: 0.0,
        thickness: 0.2,
        start_station: 0.0,
        start_elevation: 100.0,
        resolution: 2.0,
        step_height: 0.5,
        step_length: 0.0,
        baffle_spacing: 2.0,
        baffle_height: 0.3,
        stilling_basin: None,
    };

    let result = CorridorGenerator::generate_chute(&input).unwrap();

    // The chute drops 10m over 20m length
    // In Rust coordinate system: Z is vertical (elevation)
    // Z values should span at least most of the drop range
    let mut min_z = f64::MAX;
    let mut max_z = f64::MIN;

    for v in &result.vertices {
        min_z = min_z.min(v[2]); // v[2] is Z (elevation in Rust coords)
        max_z = max_z.max(v[2]);
    }

    // Should have substantial Z range due to the 10m drop
    // (accounting for wall depth ~1.5m and thickness ~0.2m)
    let z_range = max_z - min_z;
    assert!(
        z_range > 8.0,
        "Z range ({}) should be at least 8m for a 10m drop chute",
        z_range
    );
}

#[test]
fn chute_normals_are_normalized() {
    let input = ChuteGeometryInput {
        name: "Normal Test Chute".to_string(),
        chute_type: ChuteTypeInput::Smooth,
        inlet_length: 2.0,
        inlet_slope: 0.0,
        length: 20.0,
        drop: 10.0,
        width: 2.0,
        depth: 1.5,
        side_slope: 0.0,
        thickness: 0.2,
        start_station: 0.0,
        start_elevation: 100.0,
        resolution: 2.0,
        step_height: 0.5,
        step_length: 0.0,
        baffle_spacing: 2.0,
        baffle_height: 0.3,
        stilling_basin: None,
    };

    let result = CorridorGenerator::generate_chute(&input).unwrap();
    let normals = result.normals.expect("Should have normals");

    for normal in &normals {
        let len = (normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]).sqrt();
        assert!(
            (len - 1.0).abs() < 0.1,
            "Chute normal not normalized: length = {}",
            len
        );
    }
}

#[test]
fn stepped_chute_geometry_has_steps() {
    let input = ChuteGeometryInput {
        name: "Step Count Test".to_string(),
        chute_type: ChuteTypeInput::Stepped,
        inlet_length: 0.0,
        inlet_slope: 0.0,
        length: 10.0,
        drop: 5.0, // 5m drop with 0.5m steps = 10 steps
        width: 2.0,
        depth: 1.5,
        side_slope: 0.0,
        thickness: 0.2,
        start_station: 0.0,
        start_elevation: 100.0,
        resolution: 0.5,
        step_height: 0.5,
        step_length: 0.0,
        baffle_spacing: 2.0,
        baffle_height: 0.3,
        stilling_basin: None,
    };

    let result = CorridorGenerator::generate_chute(&input).unwrap();

    // Each step is a box with 24 vertices (6 faces * 4 vertices)
    // 10 steps would add substantial geometry
    assert!(
        result.vertices.len() > 200,
        "Stepped chute should have step box geometry"
    );
}
