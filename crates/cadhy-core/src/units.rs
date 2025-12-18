//! # Unit System for GraphCAD
//!
//! Provides comprehensive unit support for CAD operations including:
//! - Length units (mm, cm, m, in, ft, etc.)
//! - Angle units (degrees, radians)
//! - Automatic conversion between unit systems
//! - Parsing of values with units (e.g., "5mm", "2.5in", "45°")
//!
//! All internal calculations use millimeters and radians as base units.

use serde::{Deserialize, Serialize};
use std::f64::consts::PI;
use std::fmt;
use std::str::FromStr;
use ts_rs::TS;

/// Length unit types supported by the system
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum LengthUnit {
    /// Millimeters (base unit)
    #[default]
    Millimeter,
    /// Centimeters
    Centimeter,
    /// Meters
    Meter,
    /// Inches
    Inch,
    /// Feet
    Foot,
    /// Yards
    Yard,
    /// Micrometers
    Micrometer,
}

impl LengthUnit {
    /// Conversion factor to millimeters (base unit)
    pub fn to_mm_factor(&self) -> f64 {
        match self {
            LengthUnit::Millimeter => 1.0,
            LengthUnit::Centimeter => 10.0,
            LengthUnit::Meter => 1000.0,
            LengthUnit::Inch => 25.4,
            LengthUnit::Foot => 304.8,
            LengthUnit::Yard => 914.4,
            LengthUnit::Micrometer => 0.001,
        }
    }

    /// Convert a value from this unit to millimeters
    pub fn to_mm(&self, value: f64) -> f64 {
        value * self.to_mm_factor()
    }

    /// Convert a value from millimeters to this unit
    pub fn from_mm(&self, value: f64) -> f64 {
        value / self.to_mm_factor()
    }

    /// Get the unit abbreviation
    pub fn abbreviation(&self) -> &'static str {
        match self {
            LengthUnit::Millimeter => "mm",
            LengthUnit::Centimeter => "cm",
            LengthUnit::Meter => "m",
            LengthUnit::Inch => "in",
            LengthUnit::Foot => "ft",
            LengthUnit::Yard => "yd",
            LengthUnit::Micrometer => "μm",
        }
    }

    /// Get all valid abbreviations for this unit (for parsing)
    pub fn all_abbreviations(&self) -> &'static [&'static str] {
        match self {
            LengthUnit::Millimeter => &["mm", "millimeter", "millimeters"],
            LengthUnit::Centimeter => &["cm", "centimeter", "centimeters"],
            LengthUnit::Meter => &["m", "meter", "meters"],
            LengthUnit::Inch => &["in", "inch", "inches", "\""],
            LengthUnit::Foot => &["ft", "foot", "feet", "'"],
            LengthUnit::Yard => &["yd", "yard", "yards"],
            LengthUnit::Micrometer => {
                &["μm", "um", "micrometer", "micrometers", "micron", "microns"]
            }
        }
    }

    /// Get all length units
    pub fn all() -> &'static [LengthUnit] {
        &[
            LengthUnit::Micrometer,
            LengthUnit::Millimeter,
            LengthUnit::Centimeter,
            LengthUnit::Meter,
            LengthUnit::Inch,
            LengthUnit::Foot,
            LengthUnit::Yard,
        ]
    }
}

impl fmt::Display for LengthUnit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.abbreviation())
    }
}

/// Error type for unit parsing
#[derive(Debug, Clone, PartialEq)]
pub struct ParseUnitError {
    pub input: String,
    pub message: String,
}

impl fmt::Display for ParseUnitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Failed to parse '{}': {}", self.input, self.message)
    }
}

impl std::error::Error for ParseUnitError {}

impl FromStr for LengthUnit {
    type Err = ParseUnitError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let s = s.trim().to_lowercase();
        for unit in LengthUnit::all() {
            for abbrev in unit.all_abbreviations() {
                if s == *abbrev {
                    return Ok(*unit);
                }
            }
        }
        Err(ParseUnitError {
            input: s,
            message: "Unknown length unit. Valid units: mm, cm, m, in, ft, yd, μm".to_string(),
        })
    }
}

/// Angle unit types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum AngleUnit {
    /// Radians (base unit for calculations)
    #[default]
    Radian,
    /// Degrees
    Degree,
    /// Gradians (400 per full circle)
    Gradian,
}

impl AngleUnit {
    /// Convert a value from this unit to radians
    pub fn to_radians(&self, value: f64) -> f64 {
        match self {
            AngleUnit::Radian => value,
            AngleUnit::Degree => value * PI / 180.0,
            AngleUnit::Gradian => value * PI / 200.0,
        }
    }

    /// Convert a value from radians to this unit
    pub fn from_radians(&self, value: f64) -> f64 {
        match self {
            AngleUnit::Radian => value,
            AngleUnit::Degree => value * 180.0 / PI,
            AngleUnit::Gradian => value * 200.0 / PI,
        }
    }

    /// Get the unit abbreviation
    pub fn abbreviation(&self) -> &'static str {
        match self {
            AngleUnit::Radian => "rad",
            AngleUnit::Degree => "°",
            AngleUnit::Gradian => "grad",
        }
    }

    /// Get all valid abbreviations for this unit (for parsing)
    pub fn all_abbreviations(&self) -> &'static [&'static str] {
        match self {
            AngleUnit::Radian => &["rad", "radian", "radians"],
            AngleUnit::Degree => &["°", "deg", "degree", "degrees"],
            AngleUnit::Gradian => &["grad", "gradian", "gradians", "gon"],
        }
    }

    /// Get all angle units
    pub fn all() -> &'static [AngleUnit] {
        &[AngleUnit::Degree, AngleUnit::Radian, AngleUnit::Gradian]
    }
}

impl fmt::Display for AngleUnit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.abbreviation())
    }
}

impl FromStr for AngleUnit {
    type Err = ParseUnitError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let s = s.trim().to_lowercase();
        for unit in AngleUnit::all() {
            for abbrev in unit.all_abbreviations() {
                if s == *abbrev {
                    return Ok(*unit);
                }
            }
        }
        Err(ParseUnitError {
            input: s,
            message: "Unknown angle unit. Valid units: deg, °, rad, grad".to_string(),
        })
    }
}

/// Unit system configuration for a document/project
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct UnitSystem {
    /// Primary length unit for display
    pub length: LengthUnit,
    /// Primary angle unit for display
    pub angle: AngleUnit,
    /// Precision for length display (decimal places)
    pub length_precision: u8,
    /// Precision for angle display (decimal places)
    pub angle_precision: u8,
}

impl Default for UnitSystem {
    fn default() -> Self {
        Self {
            length: LengthUnit::Millimeter,
            angle: AngleUnit::Degree,
            length_precision: 3,
            angle_precision: 2,
        }
    }
}

impl UnitSystem {
    /// Create a metric unit system (mm, degrees)
    pub fn metric() -> Self {
        Self::default()
    }

    /// Create an imperial unit system (inches, degrees)
    pub fn imperial() -> Self {
        Self {
            length: LengthUnit::Inch,
            angle: AngleUnit::Degree,
            length_precision: 4,
            angle_precision: 2,
        }
    }

    /// Convert a length value from the current unit to mm (internal)
    pub fn length_to_internal(&self, value: f64) -> f64 {
        self.length.to_mm(value)
    }

    /// Convert a length value from mm (internal) to the current unit
    pub fn length_from_internal(&self, value: f64) -> f64 {
        self.length.from_mm(value)
    }

    /// Convert an angle value from the current unit to radians (internal)
    pub fn angle_to_internal(&self, value: f64) -> f64 {
        self.angle.to_radians(value)
    }

    /// Convert an angle value from radians (internal) to the current unit
    pub fn angle_from_internal(&self, value: f64) -> f64 {
        self.angle.from_radians(value)
    }

    /// Format a length value for display
    pub fn format_length(&self, value_mm: f64) -> String {
        let value = self.length.from_mm(value_mm);
        format!(
            "{:.prec$} {}",
            value,
            self.length.abbreviation(),
            prec = self.length_precision as usize
        )
    }

    /// Format an angle value for display
    pub fn format_angle(&self, value_rad: f64) -> String {
        let value = self.angle.from_radians(value_rad);
        format!(
            "{:.prec$}{}",
            value,
            self.angle.abbreviation(),
            prec = self.angle_precision as usize
        )
    }
}

/// A length value with its unit
#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Length {
    /// Value in the specified unit
    pub value: f64,
    /// The unit of the value
    pub unit: LengthUnit,
}

impl Length {
    /// Create a new length value
    pub fn new(value: f64, unit: LengthUnit) -> Self {
        Self { value, unit }
    }

    /// Create a length in millimeters
    pub fn mm(value: f64) -> Self {
        Self::new(value, LengthUnit::Millimeter)
    }

    /// Create a length in inches
    pub fn inches(value: f64) -> Self {
        Self::new(value, LengthUnit::Inch)
    }

    /// Convert to millimeters (internal representation)
    pub fn to_mm(&self) -> f64 {
        self.unit.to_mm(self.value)
    }

    /// Convert to a different unit
    pub fn convert_to(&self, target: LengthUnit) -> Self {
        let mm = self.to_mm();
        Self::new(target.from_mm(mm), target)
    }
}

impl fmt::Display for Length {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} {}", self.value, self.unit)
    }
}

impl FromStr for Length {
    type Err = ParseUnitError;

    /// Parse a length string like "5mm", "2.5 in", "10.5 cm"
    ///
    /// Supports:
    /// - No spaces: "5mm", "2.5in"
    /// - With spaces: "5 mm", "2.5 in"
    /// - Various units: mm, cm, m, in, ft, yd, μm
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let s = s.trim();
        if s.is_empty() {
            return Err(ParseUnitError {
                input: s.to_string(),
                message: "Empty input".to_string(),
            });
        }

        // Find where the number ends and unit begins
        let (num_str, unit_str) = split_value_and_unit(s)?;

        // Parse the number
        let value: f64 = num_str.parse().map_err(|_| ParseUnitError {
            input: s.to_string(),
            message: format!("Invalid number: '{}'", num_str),
        })?;

        // Parse the unit (if provided)
        let unit = if unit_str.is_empty() {
            LengthUnit::default() // Default to mm
        } else {
            unit_str.parse()?
        };

        Ok(Length::new(value, unit))
    }
}

/// An angle value with its unit
#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Angle {
    /// Value in the specified unit
    pub value: f64,
    /// The unit of the value
    pub unit: AngleUnit,
}

impl Angle {
    /// Create a new angle value
    pub fn new(value: f64, unit: AngleUnit) -> Self {
        Self { value, unit }
    }

    /// Create an angle in degrees
    pub fn degrees(value: f64) -> Self {
        Self::new(value, AngleUnit::Degree)
    }

    /// Create an angle in radians
    pub fn radians(value: f64) -> Self {
        Self::new(value, AngleUnit::Radian)
    }

    /// Convert to radians (internal representation)
    pub fn to_radians(&self) -> f64 {
        self.unit.to_radians(self.value)
    }

    /// Convert to a different unit
    pub fn convert_to(&self, target: AngleUnit) -> Self {
        let rad = self.to_radians();
        Self::new(target.from_radians(rad), target)
    }
}

impl fmt::Display for Angle {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}{}", self.value, self.unit)
    }
}

impl FromStr for Angle {
    type Err = ParseUnitError;

    /// Parse an angle string like "45°", "1.5rad", "90 deg"
    ///
    /// Supports:
    /// - No spaces: "45°", "1.5rad"
    /// - With spaces: "45 deg", "1.5 rad"
    /// - Various units: deg, °, rad, grad
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let s = s.trim();
        if s.is_empty() {
            return Err(ParseUnitError {
                input: s.to_string(),
                message: "Empty input".to_string(),
            });
        }

        // Find where the number ends and unit begins
        let (num_str, unit_str) = split_value_and_unit(s)?;

        // Parse the number
        let value: f64 = num_str.parse().map_err(|_| ParseUnitError {
            input: s.to_string(),
            message: format!("Invalid number: '{}'", num_str),
        })?;

        // Parse the unit (if provided)
        let unit = if unit_str.is_empty() {
            AngleUnit::default() // Default to radians
        } else {
            unit_str.parse()?
        };

        Ok(Angle::new(value, unit))
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Split a string like "5mm" or "2.5 in" into ("5", "mm") or ("2.5", "in")
fn split_value_and_unit(s: &str) -> Result<(String, String), ParseUnitError> {
    let s = s.trim();

    // Handle special case: degree symbol at start (unlikely but handle it)
    // Handle foot/inch symbols: ', "
    let mut num_end = 0;
    let mut in_number = true;
    let chars: Vec<char> = s.chars().collect();

    for (i, c) in chars.iter().enumerate() {
        if in_number {
            if c.is_ascii_digit() || *c == '.' || *c == '-' || *c == '+' {
                num_end = i + 1;
            } else if c.is_whitespace() {
                // Space after number
                in_number = false;
            } else if *c == 'e' || *c == 'E' {
                // Scientific notation: check if followed by digit or +/-
                if i + 1 < chars.len() {
                    let next = chars[i + 1];
                    if next.is_ascii_digit() || next == '+' || next == '-' {
                        num_end = i + 1;
                        continue;
                    }
                }
                in_number = false;
            } else {
                // Start of unit
                in_number = false;
            }
        }
    }

    let num_str = s[..num_end].trim().to_string();
    let unit_str = s[num_end..].trim().to_string();

    if num_str.is_empty() {
        return Err(ParseUnitError {
            input: s.to_string(),
            message: "No numeric value found".to_string(),
        });
    }

    Ok((num_str, unit_str))
}

/// Parse a length value with optional unit, using a default unit if none specified
pub fn parse_length_with_default(
    s: &str,
    default_unit: LengthUnit,
) -> Result<Length, ParseUnitError> {
    let s = s.trim();
    let (num_str, unit_str) = split_value_and_unit(s)?;

    let value: f64 = num_str.parse().map_err(|_| ParseUnitError {
        input: s.to_string(),
        message: format!("Invalid number: '{}'", num_str),
    })?;

    let unit = if unit_str.is_empty() {
        default_unit
    } else {
        unit_str.parse()?
    };

    Ok(Length::new(value, unit))
}

/// Parse an angle value with optional unit, using a default unit if none specified
pub fn parse_angle_with_default(s: &str, default_unit: AngleUnit) -> Result<Angle, ParseUnitError> {
    let s = s.trim();
    let (num_str, unit_str) = split_value_and_unit(s)?;

    let value: f64 = num_str.parse().map_err(|_| ParseUnitError {
        input: s.to_string(),
        message: format!("Invalid number: '{}'", num_str),
    })?;

    let unit = if unit_str.is_empty() {
        default_unit
    } else {
        unit_str.parse()?
    };

    Ok(Angle::new(value, unit))
}
