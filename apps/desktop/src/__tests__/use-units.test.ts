/**
 * Unit Conversion Tests - @cadhy/desktop
 *
 * Tests for unit conversion functions used throughout the app.
 */

import { describe, expect, test } from "bun:test"
import {
  angleToDisplay,
  angleToInternal,
  areaToDisplay,
  areaToInternal,
  flowRateToDisplay,
  flowRateToInternal,
  lengthToDisplay,
  lengthToInternal,
  UNIT_LABELS,
  UnitConversions,
  velocityToDisplay,
  velocityToInternal,
  volumeToDisplay,
  volumeToInternal,
} from "../hooks/use-units"

// ============================================================================
// LENGTH CONVERSIONS
// ============================================================================

describe("length conversions", () => {
  describe("lengthToDisplay", () => {
    test("meters to meters should be 1:1", () => {
      expect(lengthToDisplay(1, "m")).toBe(1)
      expect(lengthToDisplay(100, "m")).toBe(100)
    })

    test("meters to feet conversion", () => {
      // 1 meter = 3.28084 feet
      const result = lengthToDisplay(1, "ft")
      expect(result).toBeCloseTo(3.28084, 3)
    })

    test("meters to millimeters conversion", () => {
      expect(lengthToDisplay(1, "mm")).toBe(1000)
      expect(lengthToDisplay(0.001, "mm")).toBe(1)
    })

    test("meters to inches conversion", () => {
      // 1 meter = 39.3701 inches
      const result = lengthToDisplay(1, "in")
      expect(result).toBeCloseTo(39.3701, 2)
    })

    test("meters to centimeters conversion", () => {
      expect(lengthToDisplay(1, "cm")).toBe(100)
      expect(lengthToDisplay(0.5, "cm")).toBe(50)
    })
  })

  describe("lengthToInternal", () => {
    test("meters to internal should be 1:1", () => {
      expect(lengthToInternal(1, "m")).toBe(1)
      expect(lengthToInternal(100, "m")).toBe(100)
    })

    test("feet to meters conversion", () => {
      const result = lengthToInternal(1, "ft")
      expect(result).toBeCloseTo(0.3048, 4)
    })

    test("millimeters to meters conversion", () => {
      expect(lengthToInternal(1000, "mm")).toBe(1)
      expect(lengthToInternal(1, "mm")).toBe(0.001)
    })

    test("inches to meters conversion", () => {
      const result = lengthToInternal(1, "in")
      expect(result).toBeCloseTo(0.0254, 4)
    })

    test("centimeters to meters conversion", () => {
      expect(lengthToInternal(100, "cm")).toBe(1)
      expect(lengthToInternal(50, "cm")).toBe(0.5)
    })
  })

  describe("round-trip conversion", () => {
    test("meters round-trip", () => {
      const original = 5.5
      const displayed = lengthToDisplay(original, "m")
      const internal = lengthToInternal(displayed, "m")
      expect(internal).toBeCloseTo(original, 10)
    })

    test("feet round-trip", () => {
      const original = 3.5 // meters
      const displayed = lengthToDisplay(original, "ft")
      const internal = lengthToInternal(displayed, "ft")
      expect(internal).toBeCloseTo(original, 10)
    })

    test("millimeters round-trip", () => {
      const original = 0.125 // meters
      const displayed = lengthToDisplay(original, "mm")
      const internal = lengthToInternal(displayed, "mm")
      expect(internal).toBeCloseTo(original, 10)
    })
  })
})

// ============================================================================
// ANGLE CONVERSIONS
// ============================================================================

describe("angle conversions", () => {
  describe("angleToDisplay", () => {
    test("radians to radians should be 1:1", () => {
      expect(angleToDisplay(1, "rad")).toBe(1)
      expect(angleToDisplay(Math.PI, "rad")).toBe(Math.PI)
    })

    test("radians to degrees conversion", () => {
      expect(angleToDisplay(Math.PI, "deg")).toBeCloseTo(180, 10)
      expect(angleToDisplay(Math.PI / 2, "deg")).toBeCloseTo(90, 10)
      expect(angleToDisplay(Math.PI / 4, "deg")).toBeCloseTo(45, 10)
    })
  })

  describe("angleToInternal", () => {
    test("radians to internal should be 1:1", () => {
      expect(angleToInternal(1, "rad")).toBe(1)
    })

    test("degrees to radians conversion", () => {
      expect(angleToInternal(180, "deg")).toBeCloseTo(Math.PI, 10)
      expect(angleToInternal(90, "deg")).toBeCloseTo(Math.PI / 2, 10)
      expect(angleToInternal(45, "deg")).toBeCloseTo(Math.PI / 4, 10)
    })
  })

  describe("round-trip conversion", () => {
    test("degrees round-trip", () => {
      const original = Math.PI / 3 // radians (60 degrees)
      const displayed = angleToDisplay(original, "deg")
      const internal = angleToInternal(displayed, "deg")
      expect(internal).toBeCloseTo(original, 10)
    })
  })
})

// ============================================================================
// VELOCITY CONVERSIONS
// ============================================================================

describe("velocity conversions", () => {
  describe("velocityToDisplay", () => {
    test("m/s to m/s should be 1:1", () => {
      expect(velocityToDisplay(1, "m/s")).toBe(1)
      expect(velocityToDisplay(5.5, "m/s")).toBe(5.5)
    })

    test("m/s to ft/s conversion", () => {
      // 1 m/s = 3.28084 ft/s
      const result = velocityToDisplay(1, "ft/s")
      expect(result).toBeCloseTo(3.28084, 3)
    })
  })

  describe("velocityToInternal", () => {
    test("m/s to internal should be 1:1", () => {
      expect(velocityToInternal(1, "m/s")).toBe(1)
    })

    test("ft/s to m/s conversion", () => {
      const result = velocityToInternal(1, "ft/s")
      expect(result).toBeCloseTo(0.3048, 4)
    })
  })
})

// ============================================================================
// AREA CONVERSIONS
// ============================================================================

describe("area conversions", () => {
  describe("areaToDisplay", () => {
    test("m² to m² should be 1:1", () => {
      expect(areaToDisplay(1, "m²")).toBe(1)
    })

    test("m² to ft² conversion", () => {
      // 1 m² = 10.7639 ft²
      const result = areaToDisplay(1, "ft²")
      expect(result).toBeCloseTo(10.7639, 2)
    })

    test("m² to mm² conversion", () => {
      expect(areaToDisplay(1, "mm²")).toBe(1000000)
    })
  })

  describe("areaToInternal", () => {
    test("m² to internal should be 1:1", () => {
      expect(areaToInternal(1, "m²")).toBe(1)
    })

    test("ft² to m² conversion", () => {
      const result = areaToInternal(1, "ft²")
      expect(result).toBeCloseTo(0.092903, 4)
    })
  })
})

// ============================================================================
// VOLUME CONVERSIONS
// ============================================================================

describe("volume conversions", () => {
  describe("volumeToDisplay", () => {
    test("m³ to m³ should be 1:1", () => {
      expect(volumeToDisplay(1, "m³")).toBe(1)
    })

    test("m³ to liters conversion", () => {
      expect(volumeToDisplay(1, "L")).toBe(1000)
      expect(volumeToDisplay(0.001, "L")).toBe(1)
    })

    test("m³ to ft³ conversion", () => {
      // 1 m³ = 35.3147 ft³
      const result = volumeToDisplay(1, "ft³")
      expect(result).toBeCloseTo(35.3147, 2)
    })

    test("m³ to gallons conversion", () => {
      // 1 m³ = 264.172 gallons
      const result = volumeToDisplay(1, "gal")
      expect(result).toBeCloseTo(264.172, 0)
    })
  })

  describe("volumeToInternal", () => {
    test("m³ to internal should be 1:1", () => {
      expect(volumeToInternal(1, "m³")).toBe(1)
    })

    test("liters to m³ conversion", () => {
      expect(volumeToInternal(1000, "L")).toBe(1)
      expect(volumeToInternal(1, "L")).toBe(0.001)
    })
  })
})

// ============================================================================
// FLOW RATE CONVERSIONS
// ============================================================================

describe("flow rate conversions", () => {
  describe("flowRateToDisplay", () => {
    test("m³/s to m³/s should be 1:1", () => {
      expect(flowRateToDisplay(1, "m³/s")).toBe(1)
    })

    test("m³/s to L/s conversion", () => {
      expect(flowRateToDisplay(1, "L/s")).toBe(1000)
      expect(flowRateToDisplay(0.001, "L/s")).toBe(1)
    })

    test("m³/s to ft³/s conversion", () => {
      // 1 m³/s = 35.3147 ft³/s
      const result = flowRateToDisplay(1, "ft³/s")
      expect(result).toBeCloseTo(35.3147, 2)
    })
  })

  describe("flowRateToInternal", () => {
    test("m³/s to internal should be 1:1", () => {
      expect(flowRateToInternal(1, "m³/s")).toBe(1)
    })

    test("L/s to m³/s conversion", () => {
      expect(flowRateToInternal(1000, "L/s")).toBe(1)
      expect(flowRateToInternal(1, "L/s")).toBe(0.001)
    })
  })
})

// ============================================================================
// UNIT LABELS
// ============================================================================

describe("UNIT_LABELS", () => {
  test("should have length labels", () => {
    expect(UNIT_LABELS.length.m).toBe("m")
    expect(UNIT_LABELS.length.ft).toBe("ft")
    expect(UNIT_LABELS.length.mm).toBe("mm")
    expect(UNIT_LABELS.length.in).toBe("in")
    expect(UNIT_LABELS.length.cm).toBe("cm")
  })

  test("should have angle labels", () => {
    expect(UNIT_LABELS.angle.deg).toBe("°")
    expect(UNIT_LABELS.angle.rad).toBe("rad")
  })

  test("should have velocity labels", () => {
    expect(UNIT_LABELS.velocity["m/s"]).toBe("m/s")
    expect(UNIT_LABELS.velocity["ft/s"]).toBe("ft/s")
  })

  test("should have area labels", () => {
    expect(UNIT_LABELS.area["m²"]).toBe("m²")
    expect(UNIT_LABELS.area["ft²"]).toBe("ft²")
  })

  test("should have volume labels", () => {
    expect(UNIT_LABELS.volume["m³"]).toBe("m³")
    expect(UNIT_LABELS.volume.L).toBe("L")
    expect(UNIT_LABELS.volume.gal).toBe("gal")
  })

  test("should have flow rate labels", () => {
    expect(UNIT_LABELS.flowRate["m³/s"]).toBe("m³/s")
    expect(UNIT_LABELS.flowRate["L/s"]).toBe("L/s")
  })

  test("should have slope labels", () => {
    expect(UNIT_LABELS.slope["m/m"]).toBe("m/m")
    expect(UNIT_LABELS.slope["%"]).toBe("%")
    expect(UNIT_LABELS.slope["‰"]).toBe("‰")
  })
})

// ============================================================================
// UNIT CONVERSIONS OBJECT
// ============================================================================

describe("UnitConversions", () => {
  test("should have all conversion categories", () => {
    expect(UnitConversions.length).toBeDefined()
    expect(UnitConversions.angle).toBeDefined()
    expect(UnitConversions.velocity).toBeDefined()
    expect(UnitConversions.area).toBeDefined()
    expect(UnitConversions.volume).toBeDefined()
    expect(UnitConversions.flowRate).toBeDefined()
  })

  test("length should have toDisplay, toInternal, and factors", () => {
    expect(UnitConversions.length.toDisplay).toBe(lengthToDisplay)
    expect(UnitConversions.length.toInternal).toBe(lengthToInternal)
    expect(UnitConversions.length.factors).toBeDefined()
    expect(UnitConversions.length.factors.m).toBe(1)
  })

  test("angle should have toDisplay, toInternal, and factors", () => {
    expect(UnitConversions.angle.toDisplay).toBe(angleToDisplay)
    expect(UnitConversions.angle.toInternal).toBe(angleToInternal)
    expect(UnitConversions.angle.factors).toBeDefined()
    expect(UnitConversions.angle.factors.rad).toBe(1)
  })
})
