//! Tests for unit system

use cadhy_core::{parse_angle_with_default, parse_length_with_default};
use cadhy_core::{Angle, AngleUnit, Length, LengthUnit, UnitSystem};
use std::f64::consts::PI;
use std::str::FromStr;

// ============================================================
// LengthUnit Tests
// ============================================================

#[test]
fn length_unit_to_mm_factors() {
    assert_eq!(LengthUnit::Millimeter.to_mm_factor(), 1.0);
    assert_eq!(LengthUnit::Centimeter.to_mm_factor(), 10.0);
    assert_eq!(LengthUnit::Meter.to_mm_factor(), 1000.0);
    assert_eq!(LengthUnit::Inch.to_mm_factor(), 25.4);
    assert_eq!(LengthUnit::Foot.to_mm_factor(), 304.8);
    assert_eq!(LengthUnit::Yard.to_mm_factor(), 914.4);
    assert_eq!(LengthUnit::Micrometer.to_mm_factor(), 0.001);
}

#[test]
fn length_unit_to_mm() {
    assert!((LengthUnit::Meter.to_mm(1.0) - 1000.0).abs() < 1e-10);
    assert!((LengthUnit::Inch.to_mm(1.0) - 25.4).abs() < 1e-10);
}

#[test]
fn length_unit_from_mm() {
    assert!((LengthUnit::Meter.from_mm(1000.0) - 1.0).abs() < 1e-10);
    assert!((LengthUnit::Inch.from_mm(25.4) - 1.0).abs() < 1e-10);
}

#[test]
fn length_unit_abbreviations() {
    assert_eq!(LengthUnit::Millimeter.abbreviation(), "mm");
    assert_eq!(LengthUnit::Centimeter.abbreviation(), "cm");
    assert_eq!(LengthUnit::Meter.abbreviation(), "m");
    assert_eq!(LengthUnit::Inch.abbreviation(), "in");
    assert_eq!(LengthUnit::Foot.abbreviation(), "ft");
    assert_eq!(LengthUnit::Yard.abbreviation(), "yd");
    assert_eq!(LengthUnit::Micrometer.abbreviation(), "μm");
}

// ============================================================
// AngleUnit Tests
// ============================================================

#[test]
fn angle_unit_to_radians() {
    assert!((AngleUnit::Radian.to_radians(PI) - PI).abs() < 1e-10);
    assert!((AngleUnit::Degree.to_radians(180.0) - PI).abs() < 1e-10);
    assert!((AngleUnit::Gradian.to_radians(200.0) - PI).abs() < 1e-10);
}

#[test]
fn angle_unit_from_radians() {
    assert!((AngleUnit::Radian.from_radians(PI) - PI).abs() < 1e-10);
    assert!((AngleUnit::Degree.from_radians(PI) - 180.0).abs() < 1e-10);
    assert!((AngleUnit::Gradian.from_radians(PI) - 200.0).abs() < 1e-10);
}

#[test]
fn angle_unit_abbreviations() {
    assert_eq!(AngleUnit::Radian.abbreviation(), "rad");
    assert_eq!(AngleUnit::Degree.abbreviation(), "°");
    assert_eq!(AngleUnit::Gradian.abbreviation(), "grad");
}

// ============================================================
// UnitSystem Tests
// ============================================================

#[test]
fn unit_system_default_is_metric() {
    let sys = UnitSystem::default();
    assert_eq!(sys.length, LengthUnit::Millimeter);
    assert_eq!(sys.angle, AngleUnit::Degree);
}

#[test]
fn unit_system_imperial() {
    let sys = UnitSystem::imperial();
    assert_eq!(sys.length, LengthUnit::Inch);
    assert_eq!(sys.angle, AngleUnit::Degree);
}

#[test]
fn unit_system_length_conversion() {
    let sys = UnitSystem::imperial();
    let internal = sys.length_to_internal(1.0); // 1 inch to mm
    assert!((internal - 25.4).abs() < 1e-10);

    let external = sys.length_from_internal(25.4); // mm to inches
    assert!((external - 1.0).abs() < 1e-10);
}

#[test]
fn unit_system_angle_conversion() {
    let sys = UnitSystem::default();
    let internal = sys.angle_to_internal(180.0); // degrees to radians
    assert!((internal - PI).abs() < 1e-10);

    let external = sys.angle_from_internal(PI); // radians to degrees
    assert!((external - 180.0).abs() < 1e-10);
}

#[test]
fn unit_system_format_length() {
    let sys = UnitSystem::metric();
    let formatted = sys.format_length(1500.0);
    assert!(formatted.contains("1500"));
    assert!(formatted.contains("mm"));
}

#[test]
fn unit_system_format_angle() {
    let sys = UnitSystem::metric();
    let formatted = sys.format_angle(PI / 2.0);
    assert!(formatted.contains("90"));
    assert!(formatted.contains("°"));
}

// ============================================================
// Length Type Tests
// ============================================================

#[test]
fn length_mm() {
    let len = Length::mm(100.0);
    assert_eq!(len.value, 100.0);
    assert_eq!(len.unit, LengthUnit::Millimeter);
    assert!((len.to_mm() - 100.0).abs() < 1e-10);
}

#[test]
fn length_inches() {
    let len = Length::inches(1.0);
    assert_eq!(len.value, 1.0);
    assert_eq!(len.unit, LengthUnit::Inch);
    assert!((len.to_mm() - 25.4).abs() < 1e-10);
}

#[test]
fn length_convert_to() {
    let len = Length::mm(25.4);
    let in_inches = len.convert_to(LengthUnit::Inch);
    assert!((in_inches.value - 1.0).abs() < 1e-10);
    assert_eq!(in_inches.unit, LengthUnit::Inch);
}

// ============================================================
// Angle Type Tests
// ============================================================

#[test]
fn angle_degrees() {
    let a = Angle::degrees(90.0);
    assert_eq!(a.value, 90.0);
    assert_eq!(a.unit, AngleUnit::Degree);
    assert!((a.to_radians() - PI / 2.0).abs() < 1e-10);
}

#[test]
fn angle_radians() {
    let a = Angle::radians(PI);
    assert_eq!(a.value, PI);
    assert_eq!(a.unit, AngleUnit::Radian);
    assert!((a.to_radians() - PI).abs() < 1e-10);
}

#[test]
fn angle_convert_to() {
    let a = Angle::radians(PI);
    let in_degrees = a.convert_to(AngleUnit::Degree);
    assert!((in_degrees.value - 180.0).abs() < 1e-10);
    assert_eq!(in_degrees.unit, AngleUnit::Degree);
}

// ============================================================
// FromStr / Parsing Tests
// ============================================================

#[test]
fn length_unit_from_str() {
    assert_eq!(LengthUnit::from_str("mm").unwrap(), LengthUnit::Millimeter);
    assert_eq!(LengthUnit::from_str("cm").unwrap(), LengthUnit::Centimeter);
    assert_eq!(LengthUnit::from_str("m").unwrap(), LengthUnit::Meter);
    assert_eq!(LengthUnit::from_str("in").unwrap(), LengthUnit::Inch);
    assert_eq!(LengthUnit::from_str("ft").unwrap(), LengthUnit::Foot);
    assert_eq!(LengthUnit::from_str("yd").unwrap(), LengthUnit::Yard);
    assert_eq!(LengthUnit::from_str("um").unwrap(), LengthUnit::Micrometer);
    assert_eq!(LengthUnit::from_str("μm").unwrap(), LengthUnit::Micrometer);
}

#[test]
fn length_unit_from_str_full_names() {
    assert_eq!(
        LengthUnit::from_str("millimeter").unwrap(),
        LengthUnit::Millimeter
    );
    assert_eq!(
        LengthUnit::from_str("centimeters").unwrap(),
        LengthUnit::Centimeter
    );
    assert_eq!(LengthUnit::from_str("meter").unwrap(), LengthUnit::Meter);
    assert_eq!(LengthUnit::from_str("inch").unwrap(), LengthUnit::Inch);
    assert_eq!(LengthUnit::from_str("inches").unwrap(), LengthUnit::Inch);
    assert_eq!(LengthUnit::from_str("foot").unwrap(), LengthUnit::Foot);
    assert_eq!(LengthUnit::from_str("feet").unwrap(), LengthUnit::Foot);
}

#[test]
fn length_unit_from_str_case_insensitive() {
    assert_eq!(LengthUnit::from_str("MM").unwrap(), LengthUnit::Millimeter);
    assert_eq!(LengthUnit::from_str("Inch").unwrap(), LengthUnit::Inch);
    assert_eq!(LengthUnit::from_str("METER").unwrap(), LengthUnit::Meter);
}

#[test]
fn length_unit_from_str_invalid() {
    assert!(LengthUnit::from_str("xyz").is_err());
    assert!(LengthUnit::from_str("").is_err());
}

#[test]
fn angle_unit_from_str() {
    assert_eq!(AngleUnit::from_str("deg").unwrap(), AngleUnit::Degree);
    assert_eq!(AngleUnit::from_str("°").unwrap(), AngleUnit::Degree);
    assert_eq!(AngleUnit::from_str("rad").unwrap(), AngleUnit::Radian);
    assert_eq!(AngleUnit::from_str("grad").unwrap(), AngleUnit::Gradian);
}

#[test]
fn angle_unit_from_str_full_names() {
    assert_eq!(AngleUnit::from_str("degree").unwrap(), AngleUnit::Degree);
    assert_eq!(AngleUnit::from_str("degrees").unwrap(), AngleUnit::Degree);
    assert_eq!(AngleUnit::from_str("radian").unwrap(), AngleUnit::Radian);
    assert_eq!(AngleUnit::from_str("radians").unwrap(), AngleUnit::Radian);
}

#[test]
fn angle_unit_from_str_invalid() {
    assert!(AngleUnit::from_str("xyz").is_err());
    assert!(AngleUnit::from_str("").is_err());
}

// ============================================================
// Length Parsing Tests
// ============================================================

#[test]
fn length_parse_no_space() {
    let len: Length = "5mm".parse().unwrap();
    assert!((len.value - 5.0).abs() < 1e-10);
    assert_eq!(len.unit, LengthUnit::Millimeter);

    let len: Length = "2.5in".parse().unwrap();
    assert!((len.value - 2.5).abs() < 1e-10);
    assert_eq!(len.unit, LengthUnit::Inch);
}

#[test]
fn length_parse_with_space() {
    let len: Length = "5 mm".parse().unwrap();
    assert!((len.value - 5.0).abs() < 1e-10);
    assert_eq!(len.unit, LengthUnit::Millimeter);

    let len: Length = "10.5 cm".parse().unwrap();
    assert!((len.value - 10.5).abs() < 1e-10);
    assert_eq!(len.unit, LengthUnit::Centimeter);
}

#[test]
fn length_parse_no_unit_defaults_to_mm() {
    let len: Length = "42".parse().unwrap();
    assert!((len.value - 42.0).abs() < 1e-10);
    assert_eq!(len.unit, LengthUnit::Millimeter);
}

#[test]
fn length_parse_negative() {
    let len: Length = "-5mm".parse().unwrap();
    assert!((len.value - (-5.0)).abs() < 1e-10);
    assert_eq!(len.unit, LengthUnit::Millimeter);
}

#[test]
fn length_parse_scientific_notation() {
    let len: Length = "1e3mm".parse().unwrap();
    assert!((len.value - 1000.0).abs() < 1e-10);
    assert_eq!(len.unit, LengthUnit::Millimeter);

    let len: Length = "2.5e-2m".parse().unwrap();
    assert!((len.value - 0.025).abs() < 1e-10);
    assert_eq!(len.unit, LengthUnit::Meter);
}

#[test]
fn length_parse_with_default_unit() {
    // Without unit, use specified default
    let len = parse_length_with_default("5", LengthUnit::Inch).unwrap();
    assert!((len.value - 5.0).abs() < 1e-10);
    assert_eq!(len.unit, LengthUnit::Inch);

    // With unit, override default
    let len = parse_length_with_default("5mm", LengthUnit::Inch).unwrap();
    assert!((len.value - 5.0).abs() < 1e-10);
    assert_eq!(len.unit, LengthUnit::Millimeter);
}

#[test]
fn length_parse_invalid() {
    assert!(Length::from_str("").is_err());
    assert!(Length::from_str("mm").is_err()); // No number
    assert!(Length::from_str("abc").is_err());
}

// ============================================================
// Angle Parsing Tests
// ============================================================

#[test]
fn angle_parse_no_space() {
    let a: Angle = "45deg".parse().unwrap();
    assert!((a.value - 45.0).abs() < 1e-10);
    assert_eq!(a.unit, AngleUnit::Degree);

    let a: Angle = "1.5rad".parse().unwrap();
    assert!((a.value - 1.5).abs() < 1e-10);
    assert_eq!(a.unit, AngleUnit::Radian);
}

#[test]
fn angle_parse_degree_symbol() {
    let a: Angle = "90°".parse().unwrap();
    assert!((a.value - 90.0).abs() < 1e-10);
    assert_eq!(a.unit, AngleUnit::Degree);
}

#[test]
fn angle_parse_with_space() {
    let a: Angle = "45 deg".parse().unwrap();
    assert!((a.value - 45.0).abs() < 1e-10);
    assert_eq!(a.unit, AngleUnit::Degree);

    let a: Angle = "2.5 rad".parse().unwrap();
    assert!((a.value - 2.5).abs() < 1e-10);
    assert_eq!(a.unit, AngleUnit::Radian);
}

#[test]
fn angle_parse_no_unit_defaults_to_radians() {
    let a: Angle = "1.57".parse().unwrap();
    assert!((a.value - 1.57).abs() < 1e-10);
    assert_eq!(a.unit, AngleUnit::Radian);
}

#[test]
fn angle_parse_negative() {
    let a: Angle = "-45deg".parse().unwrap();
    assert!((a.value - (-45.0)).abs() < 1e-10);
    assert_eq!(a.unit, AngleUnit::Degree);
}

#[test]
fn angle_parse_with_default_unit() {
    // Without unit, use specified default
    let a = parse_angle_with_default("45", AngleUnit::Degree).unwrap();
    assert!((a.value - 45.0).abs() < 1e-10);
    assert_eq!(a.unit, AngleUnit::Degree);

    // With unit, override default
    let a = parse_angle_with_default("1.5rad", AngleUnit::Degree).unwrap();
    assert!((a.value - 1.5).abs() < 1e-10);
    assert_eq!(a.unit, AngleUnit::Radian);
}

#[test]
fn angle_parse_invalid() {
    assert!(Angle::from_str("").is_err());
    assert!(Angle::from_str("deg").is_err()); // No number
    assert!(Angle::from_str("abc").is_err());
}

// ============================================================
// Display Tests
// ============================================================

#[test]
fn length_display() {
    let len = Length::mm(5.0);
    assert_eq!(format!("{}", len), "5 mm");

    let len = Length::inches(2.5);
    assert_eq!(format!("{}", len), "2.5 in");
}

#[test]
fn angle_display() {
    let a = Angle::degrees(45.0);
    assert_eq!(format!("{}", a), "45°");

    let a = Angle::radians(1.5);
    assert_eq!(format!("{}", a), "1.5rad");
}

#[test]
fn length_unit_display() {
    assert_eq!(format!("{}", LengthUnit::Millimeter), "mm");
    assert_eq!(format!("{}", LengthUnit::Inch), "in");
}

#[test]
fn angle_unit_display() {
    assert_eq!(format!("{}", AngleUnit::Degree), "°");
    assert_eq!(format!("{}", AngleUnit::Radian), "rad");
}
