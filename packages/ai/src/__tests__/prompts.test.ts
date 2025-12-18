/**
 * AI Generation Prompts Tests - @cadhy/ai
 */

import { describe, expect, test } from "bun:test"
import {
  CAD_SYSTEM_PROMPT,
  createHydraulicPrompt,
  HYDRAULIC_SYSTEM_PROMPT,
  type HydraulicPromptContext,
} from "../generation/prompts"

describe("HYDRAULIC_SYSTEM_PROMPT", () => {
  test("should be a non-empty string", () => {
    expect(HYDRAULIC_SYSTEM_PROMPT).toBeDefined()
    expect(typeof HYDRAULIC_SYSTEM_PROMPT).toBe("string")
    expect(HYDRAULIC_SYSTEM_PROMPT.length).toBeGreaterThan(0)
  })

  test("should contain key hydraulic concepts", () => {
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("Manning")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("Froude")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("discharge")
  })

  test("should mention channel types", () => {
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("Rectangular")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("Trapezoidal")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("Triangular")
  })

  test("should specify units in meters", () => {
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("meters")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("m/m")
    // Can be m3/s or m³/s (unicode superscript)
    expect(
      HYDRAULIC_SYSTEM_PROMPT.includes("m3/s") || HYDRAULIC_SYSTEM_PROMPT.includes("m³/s")
    ).toBe(true)
  })

  test("should include tool descriptions", () => {
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("createRectangularChannel")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("createTrapezoidalChannel")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("createTriangularChannel")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("analyzeNormalFlow")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("createTransition")
  })

  test("should include Manning's n reference values", () => {
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("Concrete")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("0.012")
  })

  test("should mention language rule for multilingual support", () => {
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("LANGUAGE RULE")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("Spanish")
    expect(HYDRAULIC_SYSTEM_PROMPT).toContain("English")
  })
})

describe("CAD_SYSTEM_PROMPT", () => {
  test("should be a non-empty string", () => {
    expect(CAD_SYSTEM_PROMPT).toBeDefined()
    expect(typeof CAD_SYSTEM_PROMPT).toBe("string")
    expect(CAD_SYSTEM_PROMPT.length).toBeGreaterThan(0)
  })

  test("should mention CAD primitives", () => {
    expect(CAD_SYSTEM_PROMPT).toContain("createBox")
    expect(CAD_SYSTEM_PROMPT).toContain("createCylinder")
    expect(CAD_SYSTEM_PROMPT).toContain("createSphere")
    expect(CAD_SYSTEM_PROMPT).toContain("createCone")
    expect(CAD_SYSTEM_PROMPT).toContain("createTorus")
  })

  test("should specify units in meters", () => {
    expect(CAD_SYSTEM_PROMPT).toContain("METERS")
  })
})

describe("createHydraulicPrompt", () => {
  test("should return user request when no context provided", () => {
    const result = createHydraulicPrompt("Create a channel")
    expect(result).toBe("Create a channel")
  })

  test("should return user request when empty context provided", () => {
    const result = createHydraulicPrompt("Create a channel", {})
    expect(result).toBe("Create a channel")
  })

  test("should append existing channels to prompt", () => {
    const context: HydraulicPromptContext = {
      existingChannels: [
        {
          id: "ch-1",
          type: "channel",
          sectionType: "rectangular",
          name: "Main Channel",
          endStation: 100,
        },
      ],
    }
    const result = createHydraulicPrompt("Analyze the flow", context)

    expect(result).toContain("Analyze the flow")
    expect(result).toContain("Existing elements")
    expect(result).toContain("ch-1")
    expect(result).toContain("channel")
    expect(result).toContain("rectangular")
    expect(result).toContain("Main Channel")
    expect(result).toContain("100m")
  })

  test("should append multiple channels to prompt", () => {
    const context: HydraulicPromptContext = {
      existingChannels: [
        { id: "ch-1", type: "channel", sectionType: "rectangular" },
        { id: "ch-2", type: "channel", sectionType: "trapezoidal" },
        { id: "tr-1", type: "transition" },
      ],
    }
    const result = createHydraulicPrompt("Analyze", context)

    expect(result).toContain("ch-1")
    expect(result).toContain("ch-2")
    expect(result).toContain("tr-1")
    expect(result).toContain("rectangular")
    expect(result).toContain("trapezoidal")
    expect(result).toContain("transition")
  })

  test("should append selected objects to prompt", () => {
    const context: HydraulicPromptContext = {
      selectedObjects: ["ch-1", "ch-2"],
    }
    const result = createHydraulicPrompt("Modify selected", context)

    expect(result).toContain("Currently selected")
    expect(result).toContain("ch-1")
    expect(result).toContain("ch-2")
  })

  test("should append current discharge to prompt", () => {
    const context: HydraulicPromptContext = {
      currentDischarge: 5.5,
    }
    const result = createHydraulicPrompt("Calculate depth", context)

    expect(result).toContain("Design discharge")
    expect(result).toContain("5.5")
    // Can be m3/s or m³/s (unicode superscript)
    expect(result.includes("m3/s") || result.includes("m³/s")).toBe(true)
  })

  test("should append constraints to prompt", () => {
    const context: HydraulicPromptContext = {
      constraints: "Froude number must be less than 0.8",
    }
    const result = createHydraulicPrompt("Design channel", context)

    expect(result).toContain("Additional constraints")
    expect(result).toContain("Froude number must be less than 0.8")
  })

  test("should combine all context elements", () => {
    const context: HydraulicPromptContext = {
      existingChannels: [{ id: "ch-1", type: "channel", sectionType: "rectangular" }],
      selectedObjects: ["ch-1"],
      currentDischarge: 10,
      constraints: "Max velocity 3 m/s",
    }
    const result = createHydraulicPrompt("Full analysis", context)

    expect(result).toContain("Full analysis")
    expect(result).toContain("Existing elements")
    expect(result).toContain("ch-1")
    expect(result).toContain("Currently selected")
    expect(result).toContain("Design discharge")
    expect(result).toContain("10")
    expect(result).toContain("Additional constraints")
    expect(result).toContain("Max velocity 3 m/s")
  })

  test("should handle channel without optional fields", () => {
    const context: HydraulicPromptContext = {
      existingChannels: [{ id: "ch-1", type: "channel" }],
    }
    const result = createHydraulicPrompt("Check", context)

    expect(result).toContain("ch-1")
    expect(result).toContain("channel")
    // Should not have undefined or null in output
    expect(result).not.toContain("undefined")
    expect(result).not.toContain("null")
  })
})
