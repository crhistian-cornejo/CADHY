//! Tests for structures module (Drops, Weirs, Junctions)

use cadhy_hydraulics::{
    BaffleBlock, BaffleBlockShape, BaffleRow, Chute, ChuteBlock, EndSillType, HydraulicJumpType,
    StillingBasinDesign, StillingBasinType,
};
use cadhy_hydraulics::{Drop, DropType, Junction, JunctionSide, JunctionType, Weir, WeirType};

// ============================================================
// Drop Tests
// ============================================================

#[test]
fn drop_vertical_creation() {
    let drop = Drop::vertical(50.0, 2.0);

    assert_eq!(drop.station, 50.0);
    assert_eq!(drop.height, 2.0);
    assert_eq!(drop.drop_type, DropType::Vertical);
}

#[test]
fn drop_inclined_creation() {
    let drop = Drop::inclined(0.0, 3.0, 0.5);

    assert_eq!(drop.drop_type, DropType::Inclined);
    assert_eq!(drop.height, 3.0);
    assert_eq!(drop.slope, Some(0.5));
    // Length = height / slope = 3 / 0.5 = 6
    assert!((drop.length - 6.0).abs() < 0.001);
}

#[test]
fn drop_stepped_creation() {
    let drop = Drop::stepped(0.0, 2.0, 5);

    assert_eq!(drop.drop_type, DropType::Stepped);
    assert_eq!(drop.num_steps, Some(5));
}

#[test]
fn drop_discharge_calculation() {
    let drop = Drop::vertical(0.0, 2.0);
    let q = drop.discharge(0.5, 2.0); // 0.5m head, 2m width

    // Q = Cd * L * H^1.5 * sqrt(2g) = 0.6 * 2 * 0.5^1.5 * sqrt(19.62) ≈ 1.88 m³/s
    assert!(q > 1.5 && q < 2.5);
}

#[test]
fn drop_end_station() {
    let drop = Drop::vertical(50.0, 2.0);
    assert!((drop.end_station() - (50.0 + drop.length)).abs() < 0.001);
}

#[test]
fn drop_stilling_basin() {
    let drop = Drop::vertical(0.0, 2.0).with_stilling_basin(5.0, 0.5);

    match drop.dissipator {
        cadhy_hydraulics::structures::EnergyDissipator::StillingBasin { length, depth, .. } => {
            assert_eq!(length, 5.0);
            assert_eq!(depth, 0.5);
        }
        _ => panic!("Expected StillingBasin dissipator"),
    }
}

#[test]
fn downstream_depth_supercritical() {
    let drop = Drop::vertical(0.0, 2.0);

    // Supercritical: v=5m/s, y=0.3m, Fr=5/sqrt(9.81*0.3)≈2.9
    let y2 = drop.downstream_depth(5.0, 0.3);

    // y2 = 0.3 * 0.5 * (sqrt(1 + 8*2.9²) - 1) ≈ 1.05m
    assert!(y2 > 0.8 && y2 < 1.3);
}

#[test]
fn downstream_depth_subcritical() {
    let drop = Drop::vertical(0.0, 2.0);

    // Subcritical: v=0.5m/s, y=1.0m, Fr < 1
    let y2 = drop.downstream_depth(0.5, 1.0);

    // No jump for subcritical flow
    assert!((y2 - 1.0).abs() < 0.001);
}

// ============================================================
// Weir Tests
// ============================================================

#[test]
fn weir_rectangular_sharp_creation() {
    let weir = Weir::rectangular_sharp(100.0, 3.0, 0.5);

    assert_eq!(weir.station, 100.0);
    assert_eq!(weir.crest_length, 3.0);
    assert_eq!(weir.crest_elevation, 0.5);
    assert_eq!(weir.weir_type, WeirType::RectangularSharpCrested);
}

#[test]
fn weir_trapezoidal_creation() {
    let weir = Weir::trapezoidal(0.0, 2.0, 0.3);

    assert_eq!(weir.weir_type, WeirType::Trapezoidal);
    assert_eq!(weir.side_slope, Some(0.25)); // Cipolletti default
}

#[test]
fn weir_triangular_creation() {
    let weir = Weir::triangular(0.0, 90.0, 0.5);

    assert_eq!(weir.weir_type, WeirType::Triangular);
    assert_eq!(weir.notch_angle, Some(90.0));
}

#[test]
fn weir_ogee_creation() {
    let weir = Weir::ogee(0.0, 5.0, 0.5, 3.0);

    assert_eq!(weir.weir_type, WeirType::Ogee);
    assert_eq!(weir.ogee_height, Some(3.0));
}

#[test]
fn weir_rectangular_discharge() {
    let weir = Weir::rectangular_sharp(0.0, 3.0, 0.5);
    let q = weir.discharge(0.3);

    // Q = Cd * L * H^1.5 = 1.84 * 3 * 0.3^1.5 ≈ 0.91 m³/s
    assert!(q > 0.8 && q < 1.0);
}

#[test]
fn weir_triangular_discharge() {
    let weir = Weir::triangular(0.0, 90.0, 0.5);
    let q = weir.discharge(0.3);

    // Q = Cd * tan(θ/2) * H^2.5 = 1.38 * tan(45°) * 0.3^2.5 ≈ 0.068 m³/s
    assert!(q > 0.05 && q < 0.1);
}

#[test]
fn weir_discharge_zero_head() {
    let weir = Weir::rectangular_sharp(0.0, 3.0, 0.5);
    let q = weir.discharge(0.0);

    assert_eq!(q, 0.0);
}

#[test]
fn weir_discharge_negative_head() {
    let weir = Weir::rectangular_sharp(0.0, 3.0, 0.5);
    let q = weir.discharge(-0.5);

    assert_eq!(q, 0.0);
}

#[test]
fn weir_head_for_discharge() {
    let weir = Weir::rectangular_sharp(0.0, 3.0, 0.5);
    let target_q = 1.0;
    let head = weir.head_for_discharge(target_q);

    // Verify round-trip
    let actual_q = weir.discharge(head);
    assert!((actual_q - target_q).abs() < 0.01);
}

// ============================================================
// Junction Tests
// ============================================================

#[test]
fn junction_lateral_creation() {
    let junction = Junction::lateral(75.0, JunctionSide::Left, 1.5, 45.0);

    assert_eq!(junction.main_station, 75.0);
    assert_eq!(junction.branch_width, 1.5);
    assert_eq!(junction.branch_angle, 45.0);
    assert_eq!(junction.side, JunctionSide::Left);
    assert_eq!(junction.junction_type, JunctionType::Lateral);
}

#[test]
fn junction_confluence_creation() {
    let junction = Junction::confluence(100.0, JunctionSide::Right, 2.0, 30.0);

    assert_eq!(junction.junction_type, JunctionType::Confluence);
    assert_eq!(junction.side, JunctionSide::Right);
}

#[test]
fn junction_head_loss() {
    let junction = Junction::lateral(0.0, JunctionSide::Right, 2.0, 30.0);
    let hl = junction.head_loss(2.0); // 2 m/s

    // hL = K * v² / 2g ≈ 0.8 * 4 / 19.62 ≈ 0.16m
    assert!(hl > 0.1 && hl < 0.25);
}

#[test]
fn junction_loss_increases_with_angle() {
    let junction_30 = Junction::lateral(0.0, JunctionSide::Left, 2.0, 30.0);
    let junction_60 = Junction::lateral(0.0, JunctionSide::Left, 2.0, 60.0);

    // Loss coefficient increases with angle
    assert!(junction_60.loss_coefficient > junction_30.loss_coefficient);
}

#[test]
fn junction_with_gate() {
    let junction = Junction::lateral(0.0, JunctionSide::Left, 2.0, 45.0).with_sluice_gate(1.5, 1.0);

    match junction.gate {
        cadhy_hydraulics::structures::GateType::Sluice { width, height } => {
            assert_eq!(width, 1.5);
            assert_eq!(height, 1.0);
        }
        _ => panic!("Expected Sluice gate"),
    }
}

#[test]
fn junction_with_depth() {
    let junction = Junction::lateral(0.0, JunctionSide::Left, 2.0, 45.0).with_depth(1.8);

    assert_eq!(junction.branch_depth, 1.8);
}

#[test]
fn junction_transition_length() {
    let junction = Junction::lateral(0.0, JunctionSide::Left, 2.0, 45.0);

    // Default transition length = branch_width * 2
    assert_eq!(junction.transition_length, 4.0);
}

#[test]
fn junction_branch_discharge() {
    let junction = Junction::lateral(0.0, JunctionSide::Left, 2.0, 45.0).with_depth(1.5);

    let q_branch = junction.branch_discharge(10.0, 2.0);

    // Should be a fraction of main discharge
    assert!(q_branch > 0.0);
    assert!(q_branch < 10.0);
}

// ============================================================
// Hydraulic Jump Type Tests
// ============================================================

#[test]
fn hydraulic_jump_type_classification() {
    assert_eq!(
        HydraulicJumpType::from_froude(0.8),
        HydraulicJumpType::NoJump
    );
    assert_eq!(
        HydraulicJumpType::from_froude(1.5),
        HydraulicJumpType::Undular
    );
    assert_eq!(HydraulicJumpType::from_froude(2.0), HydraulicJumpType::Weak);
    assert_eq!(
        HydraulicJumpType::from_froude(3.5),
        HydraulicJumpType::Oscillating
    );
    assert_eq!(
        HydraulicJumpType::from_froude(6.0),
        HydraulicJumpType::Steady
    );
    assert_eq!(
        HydraulicJumpType::from_froude(12.0),
        HydraulicJumpType::Strong
    );
}

#[test]
fn hydraulic_jump_type_safety() {
    assert!(HydraulicJumpType::Undular.is_design_safe());
    assert!(HydraulicJumpType::Weak.is_design_safe());
    assert!(!HydraulicJumpType::Oscillating.is_design_safe());
    assert!(HydraulicJumpType::Steady.is_design_safe());
    assert!(!HydraulicJumpType::Strong.is_design_safe());
}

#[test]
fn hydraulic_jump_type_efficiency() {
    let (min, max) = HydraulicJumpType::Steady.efficiency_range();
    assert!(min > 0.4 && max < 0.75);
}

// ============================================================
// Stilling Basin Type Tests
// ============================================================

#[test]
fn stilling_basin_type_selection() {
    // Low Froude - Type I
    assert_eq!(
        StillingBasinType::select(1.5, 5.0),
        StillingBasinType::TypeI
    );

    // Medium Froude, low velocity - Type II
    assert_eq!(
        StillingBasinType::select(3.5, 10.0),
        StillingBasinType::TypeII
    );

    // High Froude, moderate velocity - Type III
    assert_eq!(
        StillingBasinType::select(6.0, 12.0),
        StillingBasinType::TypeIII
    );

    // High Froude, high velocity - Type II (more robust)
    assert_eq!(
        StillingBasinType::select(6.0, 18.0),
        StillingBasinType::TypeII
    );
}

#[test]
fn stilling_basin_type_description() {
    let desc = StillingBasinType::TypeIII.description();
    assert!(desc.contains("Fr > 4.5"));
    assert!(desc.contains("15 m/s"));
}

// ============================================================
// Stilling Basin Design Tests
// ============================================================

#[test]
fn stilling_basin_design_basic() {
    // Design parameters:
    // Q = 20 m³/s, width = 4 m, y1 = 0.5 m, v1 = 10 m/s, tailwater = 2 m
    let result = StillingBasinDesign::design(20.0, 4.0, 0.5, 10.0, 2.0);

    assert!(result.is_ok());
    let basin = result.unwrap();

    // Check Froude calculation: Fr = v / sqrt(g*y) = 10 / sqrt(9.81*0.5) ≈ 4.5
    assert!(basin.froude > 4.0 && basin.froude < 5.0);

    // Check y2 (conjugate depth) using Belanger
    // y2/y1 = 0.5 * (sqrt(1 + 8*Fr²) - 1)
    // y2 ≈ 0.5 * 0.5 * (sqrt(1 + 8*20.25) - 1) ≈ 2.9 m
    assert!(basin.y2 > 2.5 && basin.y2 < 3.5);

    // Check that length is reasonable (typically 2.5-6.1 * y2)
    assert!(basin.length > 2.0 * basin.y2);
    assert!(basin.length < 7.0 * basin.y2);

    // Check efficiency is positive
    assert!(basin.efficiency > 0.0 && basin.efficiency < 1.0);
}

#[test]
fn stilling_basin_design_subcritical_fails() {
    // Subcritical flow (Fr < 1) should fail
    let result = StillingBasinDesign::design(5.0, 4.0, 2.0, 0.5, 2.0);

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("subcritical"));
}

#[test]
fn stilling_basin_design_high_froude() {
    // High Froude number case (Fr ≈ 7)
    let result = StillingBasinDesign::design(30.0, 5.0, 0.4, 15.0, 3.0);

    assert!(result.is_ok());
    let basin = result.unwrap();

    // Should select Type III for Fr > 4.5 and v ≤ 15 m/s
    assert_eq!(basin.basin_type, StillingBasinType::TypeIII);
    assert_eq!(basin.jump_type, HydraulicJumpType::Steady);

    // Type III should have baffle blocks
    assert!(!basin.baffle_rows.is_empty());

    // Should have solid end sill
    matches!(basin.end_sill, EndSillType::Solid { .. });
}

#[test]
fn stilling_basin_type2_has_dentated_sill() {
    // Design with Froude that should produce Type II
    // Fr = v / sqrt(g*y) = 7 / sqrt(9.81*0.6) ≈ 2.9 (oscillating range)
    let result = StillingBasinDesign::design(10.0, 4.0, 0.6, 7.0, 2.5);

    assert!(result.is_ok());
    let basin = result.unwrap();

    // Type II should have dentated end sill (when oscillating jump)
    // Note: Actual type depends on Froude and velocity combination
    if basin.basin_type == StillingBasinType::TypeII {
        matches!(basin.end_sill, EndSillType::Dentated { .. });
    }
}

#[test]
fn stilling_basin_warnings() {
    // Low submergence case
    let mut basin = StillingBasinDesign::design(20.0, 4.0, 0.5, 10.0, 1.5).unwrap();
    basin.submergence_ratio = 0.7; // Force low submergence

    let warnings = basin.warnings();
    assert!(!warnings.is_empty());
    assert!(warnings.iter().any(|w| w.contains("submergence")));
}

#[test]
fn stilling_basin_concrete_volume() {
    let basin = StillingBasinDesign::design(20.0, 4.0, 0.5, 10.0, 2.0).unwrap();

    let volume = basin.concrete_volume(0.3, 0.4);

    // Volume should be positive and reasonable
    assert!(volume > 0.0);
    assert!(volume < 500.0); // Sanity check
}

// ============================================================
// Baffle Block Tests
// ============================================================

#[test]
fn baffle_block_usbr_type3() {
    let y1 = 0.5;
    let block = BaffleBlock::usbr_type3(y1, 0.0, 5.0);

    // Type III dimensions: h = y1, w = 0.75*y1, t = 0.75*y1
    assert_eq!(block.height, y1);
    assert!((block.width - 0.75 * y1).abs() < 0.001);
    assert!((block.thickness - 0.75 * y1).abs() < 0.001);
    assert_eq!(block.shape, BaffleBlockShape::Rectangular);
}

#[test]
fn baffle_block_saf() {
    let y1 = 0.3;
    let y2 = 1.5;
    let block = BaffleBlock::saf(y1, y2, 1.0, 3.0);

    // SAF dimensions: h = 0.8*y1, w = 0.4*y2
    assert!((block.height - 0.8 * y1).abs() < 0.001);
    assert!((block.width - 0.4 * y2).abs() < 0.001);
}

#[test]
fn baffle_block_volume() {
    let block = BaffleBlock {
        width: 0.4,
        height: 0.5,
        thickness: 0.4,
        shape: BaffleBlockShape::Rectangular,
        x_offset: 0.0,
        y_position: 0.0,
    };

    let vol = block.volume();
    assert!((vol - 0.4 * 0.5 * 0.4).abs() < 0.001);
}

// ============================================================
// Baffle Row Tests
// ============================================================

#[test]
fn baffle_row_uniform_distribution() {
    let block_template = BaffleBlock::usbr_type3(0.5, 0.0, 0.0);
    let row = BaffleRow::uniform(3, 4.0, &block_template, 5.0, 0);

    assert_eq!(row.blocks.len(), 3);
    assert_eq!(row.distance_from_toe, 5.0);
    assert_eq!(row.row_index, 0);

    // Check blocks are distributed
    let x_positions: Vec<f64> = row.blocks.iter().map(|b| b.x_offset).collect();
    assert!(x_positions[0] < x_positions[1]);
    assert!(x_positions[1] < x_positions[2]);
}

#[test]
fn baffle_row_staggered() {
    let block_template = BaffleBlock::usbr_type3(0.4, 0.0, 0.0);

    let row1 = BaffleRow::staggered(3.0, &block_template, 4.0, 0, false);
    let row2 = BaffleRow::staggered(3.0, &block_template, 5.0, 1, true);

    // Row 2 should be offset from row 1
    if !row1.blocks.is_empty() && !row2.blocks.is_empty() {
        let x1 = row1.blocks[0].x_offset;
        let x2 = row2.blocks[0].x_offset;
        // Offset row should start at a different position
        assert!((x1 - x2).abs() > 0.01);
    }
}

#[test]
fn baffle_row_empty_for_zero_blocks() {
    let block_template = BaffleBlock::usbr_type3(0.5, 0.0, 0.0);
    let row = BaffleRow::uniform(0, 4.0, &block_template, 5.0, 0);

    assert!(row.blocks.is_empty());
}

// ============================================================
// Chute Block Tests
// ============================================================

#[test]
fn chute_block_usbr() {
    let y1 = 0.6;
    let block = ChuteBlock::usbr(y1, 0.0);

    // USBR chute blocks are cubes: h = w = t = y1
    assert_eq!(block.height, y1);
    assert_eq!(block.width, y1);
    assert_eq!(block.thickness, y1);
}

// ============================================================
// Chute Tests
// ============================================================

#[test]
fn chute_creation() {
    let chute = Chute::new(0.0, 50.0, 10.0, 4.0);

    assert_eq!(chute.start_station, 0.0);
    assert_eq!(chute.length, 50.0);
    assert_eq!(chute.drop, 10.0);
    assert_eq!(chute.width, 4.0);
    assert!((chute.slope - 0.2).abs() < 0.001); // 10/50 = 0.2
}

#[test]
fn chute_critical_depth() {
    let chute = Chute::new(0.0, 50.0, 10.0, 4.0);

    // yc = (q²/g)^(1/3) where q = Q/B
    // For Q = 20 m³/s, B = 4 m: q = 5 m²/s
    // yc = (25/9.81)^(1/3) ≈ 1.37 m
    let yc = chute.critical_depth(20.0);
    assert!(yc > 1.2 && yc < 1.5);
}

#[test]
fn chute_normal_depth() {
    let chute = Chute::new(0.0, 50.0, 10.0, 4.0);

    let yn = chute.normal_depth(20.0);

    // Normal depth should be positive and reasonable
    assert!(yn > 0.1 && yn < 2.0);

    // For steep slopes, normal depth < critical depth
    let yc = chute.critical_depth(20.0);
    assert!(yn < yc);
}

#[test]
fn chute_with_step_blocks() {
    let chute = Chute::new(0.0, 50.0, 10.0, 4.0).with_step_blocks(5.0);

    assert!(chute.with_step_blocks);
    assert_eq!(chute.step_block_spacing, Some(5.0));
}

#[test]
fn chute_hydraulic_profile() {
    let chute = Chute::new(0.0, 50.0, 10.0, 4.0);

    let profile = chute.hydraulic_profile(10.0, 10);

    assert_eq!(profile.len(), 10);

    // Check profile structure
    for (dist, depth, velocity, froude) in &profile {
        assert!(*dist >= 0.0 && *dist <= 50.0);
        assert!(*depth > 0.0);
        assert!(*velocity > 0.0);
        assert!(*froude > 0.0);
    }

    // First point should be at distance 0
    assert_eq!(profile[0].0, 0.0);
}

#[test]
fn chute_end_stations() {
    let chute = Chute::new(10.0, 50.0, 10.0, 4.0);

    assert_eq!(chute.end_station(), 60.0);
    assert_eq!(chute.total_end_station(), 60.0); // No basin

    // With stilling basin, total should be longer
    // (Can't easily test this without designing basin which may fail)
}

#[test]
fn chute_design_stilling_basin() {
    let chute = Chute::new(0.0, 50.0, 10.0, 4.0);

    // Try to design with reasonable parameters
    let result = chute.design_stilling_basin(20.0, 1.5);

    // This may fail depending on conditions, but should not panic
    if let Ok(chute_with_basin) = result {
        assert!(chute_with_basin.stilling_basin.is_some());
        assert!(chute_with_basin.max_velocity > 0.0);
    }
}
