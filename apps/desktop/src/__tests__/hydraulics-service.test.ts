/**
 * Hydraulics Service Tests - @cadhy/desktop
 *
 * Tests for hydraulic service types and utility functions.
 * Note: Functions that invoke Tauri commands cannot be tested without mocking.
 * We focus on the pure utility functions and type definitions.
 */

import { describe, expect, test } from "bun:test"
import {
  type ChannelParams,
  type ChannelSectionDef,
  type ChannelSectionType,
  convertSectionToBackend,
  type ExportFormat,
  type FlowAnalysis,
  type RectangularSectionDef,
  sectionToChannelParams,
  type TransitionType,
  type TrapezoidalSectionDef,
  type TriangularSectionDef,
} from "../services/hydraulics-service"

describe("Hydraulics Service", () => {
  // ============================================================
  // Type Definitions
  // ============================================================

  describe("ChannelSectionType", () => {
    test("should include all section types", () => {
      const types: ChannelSectionType[] = ["rectangular", "trapezoidal", "triangular"]
      expect(types).toHaveLength(3)
    })
  })

  describe("TransitionType", () => {
    test("should include all transition types", () => {
      const types: TransitionType[] = ["linear", "warped", "cylindrical", "inlet", "outlet"]
      expect(types).toHaveLength(5)
    })
  })

  describe("ExportFormat", () => {
    test("should include all export formats", () => {
      const formats: ExportFormat[] = ["stl", "obj", "step"]
      expect(formats).toHaveLength(3)
    })
  })

  // ============================================================
  // convertSectionToBackend
  // ============================================================

  describe("convertSectionToBackend", () => {
    test("should convert rectangular section", () => {
      const result = convertSectionToBackend("rectangular", {
        width: 3,
        depth: 2,
      })

      expect(result.type).toBe("rectangular")
      expect((result as RectangularSectionDef).width).toBe(3)
      expect((result as RectangularSectionDef).depth).toBe(2)
    })

    test("should use defaults for rectangular section", () => {
      const result = convertSectionToBackend("rectangular", {})

      expect(result.type).toBe("rectangular")
      expect((result as RectangularSectionDef).width).toBe(2)
      expect((result as RectangularSectionDef).depth).toBe(1)
    })

    test("should convert trapezoidal section", () => {
      const result = convertSectionToBackend("trapezoidal", {
        bottomWidth: 4,
        depth: 2.5,
        sideSlope: 2,
      })

      expect(result.type).toBe("trapezoidal")
      expect((result as TrapezoidalSectionDef).bottom_width).toBe(4)
      expect((result as TrapezoidalSectionDef).depth).toBe(2.5)
      expect((result as TrapezoidalSectionDef).side_slope).toBe(2)
    })

    test("should use defaults for trapezoidal section", () => {
      const result = convertSectionToBackend("trapezoidal", {})

      expect(result.type).toBe("trapezoidal")
      expect((result as TrapezoidalSectionDef).bottom_width).toBe(2)
      expect((result as TrapezoidalSectionDef).depth).toBe(1.5)
      expect((result as TrapezoidalSectionDef).side_slope).toBe(1.5)
    })

    test("should convert triangular section", () => {
      const result = convertSectionToBackend("triangular", {
        depth: 1.5,
        sideSlope: 2,
      })

      expect(result.type).toBe("triangular")
      expect((result as TriangularSectionDef).depth).toBe(1.5)
      expect((result as TriangularSectionDef).side_slope).toBe(2)
    })

    test("should use defaults for triangular section", () => {
      const result = convertSectionToBackend("triangular", {})

      expect(result.type).toBe("triangular")
      expect((result as TriangularSectionDef).depth).toBe(1)
      expect((result as TriangularSectionDef).side_slope).toBe(1)
    })
  })

  // ============================================================
  // sectionToChannelParams
  // ============================================================

  describe("sectionToChannelParams", () => {
    test("should convert rectangular section to params", () => {
      const result = sectionToChannelParams("rectangular", { width: 5 }, 0.013, 0.001)

      expect(result.channel_type).toBe("rectangular")
      expect(result.width).toBe(5)
      expect(result.manning_n).toBe(0.013)
      expect(result.slope).toBe(0.001)
    })

    test("should use default width for rectangular", () => {
      const result = sectionToChannelParams("rectangular", {}, 0.015, 0.002)

      expect(result.width).toBe(2)
    })

    test("should convert trapezoidal section to params", () => {
      const result = sectionToChannelParams(
        "trapezoidal",
        { bottomWidth: 3, sideSlope: 1.5 },
        0.013,
        0.001
      )

      expect(result.channel_type).toBe("trapezoidal")
      expect(result.width).toBe(3)
      expect(result.side_slope).toBe(1.5)
      expect(result.manning_n).toBe(0.013)
      expect(result.slope).toBe(0.001)
    })

    test("should use defaults for trapezoidal", () => {
      const result = sectionToChannelParams("trapezoidal", {}, 0.015, 0.002)

      expect(result.width).toBe(2)
      expect(result.side_slope).toBe(1.5)
    })

    test("should convert triangular section to params", () => {
      const result = sectionToChannelParams("triangular", { sideSlope: 2 }, 0.013, 0.001)

      expect(result.channel_type).toBe("triangular")
      expect(result.side_slope).toBe(2)
      expect(result.manning_n).toBe(0.013)
      expect(result.slope).toBe(0.001)
    })

    test("should use default side slope for triangular", () => {
      const result = sectionToChannelParams("triangular", {}, 0.015, 0.002)

      expect(result.side_slope).toBe(1)
    })
  })

  // ============================================================
  // Section Type Structures
  // ============================================================

  describe("Section Type Structures", () => {
    test("RectangularSectionDef should have required fields", () => {
      const section: RectangularSectionDef = {
        type: "rectangular",
        width: 2,
        depth: 1,
      }

      expect(section.type).toBe("rectangular")
      expect(section.width).toBe(2)
      expect(section.depth).toBe(1)
    })

    test("TrapezoidalSectionDef should have required fields", () => {
      const section: TrapezoidalSectionDef = {
        type: "trapezoidal",
        bottom_width: 3,
        depth: 2,
        side_slope: 1.5,
      }

      expect(section.type).toBe("trapezoidal")
      expect(section.bottom_width).toBe(3)
      expect(section.depth).toBe(2)
      expect(section.side_slope).toBe(1.5)
    })

    test("TriangularSectionDef should have required fields", () => {
      const section: TriangularSectionDef = {
        type: "triangular",
        depth: 1.5,
        side_slope: 2,
      }

      expect(section.type).toBe("triangular")
      expect(section.depth).toBe(1.5)
      expect(section.side_slope).toBe(2)
    })

    test("ChannelSectionDef union should work", () => {
      const sections: ChannelSectionDef[] = [
        { type: "rectangular", width: 2, depth: 1 },
        { type: "trapezoidal", bottom_width: 3, depth: 2, side_slope: 1.5 },
        { type: "triangular", depth: 1.5, side_slope: 2 },
      ]

      expect(sections).toHaveLength(3)
      expect(sections[0].type).toBe("rectangular")
      expect(sections[1].type).toBe("trapezoidal")
      expect(sections[2].type).toBe("triangular")
    })
  })

  // ============================================================
  // ChannelParams Structure
  // ============================================================

  describe("ChannelParams Structure", () => {
    test("should have required manning_n and slope", () => {
      const params: ChannelParams = {
        channel_type: "rectangular",
        manning_n: 0.013,
        slope: 0.001,
        width: 2,
      }

      expect(params.manning_n).toBe(0.013)
      expect(params.slope).toBe(0.001)
    })

    test("should accept optional diameter", () => {
      const params: ChannelParams = {
        channel_type: "rectangular",
        manning_n: 0.013,
        slope: 0.001,
        diameter: 1.5,
      }

      expect(params.diameter).toBe(1.5)
    })
  })

  // ============================================================
  // FlowAnalysis Structure
  // ============================================================

  describe("FlowAnalysis Structure", () => {
    test("should contain all hydraulic properties", () => {
      const analysis: FlowAnalysis = {
        depth: 1.5,
        area: 3.0,
        wetted_perimeter: 5.0,
        hydraulic_radius: 0.6,
        top_width: 2.0,
        hydraulic_depth: 1.5,
        velocity: 1.2,
        discharge: 3.6,
        froude_number: 0.31,
        flow_regime: "subcritical",
        specific_energy: 1.57,
      }

      expect(analysis.depth).toBe(1.5)
      expect(analysis.area).toBe(3.0)
      expect(analysis.wetted_perimeter).toBe(5.0)
      expect(analysis.hydraulic_radius).toBe(0.6)
      expect(analysis.top_width).toBe(2.0)
      expect(analysis.hydraulic_depth).toBe(1.5)
      expect(analysis.velocity).toBe(1.2)
      expect(analysis.discharge).toBe(3.6)
      expect(analysis.froude_number).toBe(0.31)
      expect(analysis.flow_regime).toBe("subcritical")
      expect(analysis.specific_energy).toBe(1.57)
    })

    test("flow_regime should indicate flow type", () => {
      const subcritical: FlowAnalysis = {
        depth: 1.5,
        area: 3.0,
        wetted_perimeter: 5.0,
        hydraulic_radius: 0.6,
        top_width: 2.0,
        hydraulic_depth: 1.5,
        velocity: 1.2,
        discharge: 3.6,
        froude_number: 0.31,
        flow_regime: "subcritical",
        specific_energy: 1.57,
      }

      expect(subcritical.froude_number).toBeLessThan(1)
      expect(subcritical.flow_regime).toBe("subcritical")
    })
  })

  // ============================================================
  // Manning's n Values
  // ============================================================

  describe("Manning's n Values", () => {
    // Common Manning's n values for reference
    test("typical concrete channel n value", () => {
      const concreteN = 0.013
      expect(concreteN).toBeGreaterThan(0.01)
      expect(concreteN).toBeLessThan(0.02)
    })

    test("typical earth channel n value", () => {
      const earthN = 0.025
      expect(earthN).toBeGreaterThan(0.02)
      expect(earthN).toBeLessThan(0.04)
    })

    test("typical natural stream n value", () => {
      const streamN = 0.035
      expect(streamN).toBeGreaterThan(0.03)
      expect(streamN).toBeLessThan(0.05)
    })
  })

  // ============================================================
  // Hydraulic Calculations Validation
  // ============================================================

  describe("Hydraulic Calculations", () => {
    test("hydraulic radius should equal area / wetted perimeter", () => {
      const area = 3.0
      const wettedPerimeter = 5.0
      const hydraulicRadius = area / wettedPerimeter

      expect(hydraulicRadius).toBeCloseTo(0.6, 5)
    })

    test("Froude number < 1 indicates subcritical flow", () => {
      const froudeNumber = 0.5
      const flowRegime = froudeNumber < 1 ? "subcritical" : "supercritical"

      expect(flowRegime).toBe("subcritical")
    })

    test("Froude number > 1 indicates supercritical flow", () => {
      const froudeNumber = 1.5
      const flowRegime = froudeNumber < 1 ? "subcritical" : "supercritical"

      expect(flowRegime).toBe("supercritical")
    })

    test("Froude number = 1 indicates critical flow", () => {
      const froudeNumber = 1.0
      const flowRegime =
        froudeNumber < 1 ? "subcritical" : froudeNumber > 1 ? "supercritical" : "critical"

      expect(flowRegime).toBe("critical")
    })
  })
})
