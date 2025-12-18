/**
 * Hydraulic Tools Tests - @cadhy/ai
 *
 * Tests for hydraulic tool definitions and schemas.
 */

import { describe, expect, test } from "bun:test"
import {
  analyzeFlowTool,
  analyzeGVFTool,
  analyzeNormalFlowTool,
  calculateCriticalDepthTool,
  calculateDischargeDepthTool,
  createChannelTool,
  createRectangularChannelTool,
  createTransitionTool,
  createTrapezoidalChannelTool,
  createTriangularChannelTool,
  deleteObjectTool,
  duplicateObjectTool,
  exportSceneTool,
  hydraulicTools,
  modifyChannelTool,
} from "../tools/hydraulic-tools"

describe("hydraulicTools export", () => {
  test("should export all channel creation tools", () => {
    expect(hydraulicTools.createRectangularChannel).toBeDefined()
    expect(hydraulicTools.createTrapezoidalChannel).toBeDefined()
    expect(hydraulicTools.createTriangularChannel).toBeDefined()
  })

  test("should export transition tool", () => {
    expect(hydraulicTools.createTransition).toBeDefined()
  })

  test("should export analysis tools", () => {
    expect(hydraulicTools.analyzeNormalFlow).toBeDefined()
    expect(hydraulicTools.calculateDischargeDepth).toBeDefined()
    expect(hydraulicTools.calculateCriticalDepth).toBeDefined()
    expect(hydraulicTools.analyzeGVF).toBeDefined()
  })

  test("should export chute tools", () => {
    expect(hydraulicTools.createChute).toBeDefined()
    expect(hydraulicTools.addStillingBasin).toBeDefined()
  })

  test("should export modification tools", () => {
    expect(hydraulicTools.modifyChannel).toBeDefined()
    expect(hydraulicTools.deleteObject).toBeDefined()
    expect(hydraulicTools.duplicateObject).toBeDefined()
    expect(hydraulicTools.exportScene).toBeDefined()
  })

  test("should have 14 total tools", () => {
    expect(Object.keys(hydraulicTools)).toHaveLength(14)
  })
})

describe("legacy exports", () => {
  test("createChannelTool should be createTrapezoidalChannelTool", () => {
    expect(createChannelTool).toBe(createTrapezoidalChannelTool)
  })

  test("analyzeFlowTool should be analyzeNormalFlowTool", () => {
    expect(analyzeFlowTool).toBe(analyzeNormalFlowTool)
  })
})

describe("createRectangularChannelTool", () => {
  test("should have correct description", () => {
    expect(createRectangularChannelTool.description).toContain("rectangular")
    expect(createRectangularChannelTool.description).toContain("vertical walls")
    expect(createRectangularChannelTool.description).toContain("concrete")
  })

  test("should have execute function", () => {
    expect(createRectangularChannelTool.execute).toBeDefined()
    expect(typeof createRectangularChannelTool.execute).toBe("function")
  })
})

describe("createTrapezoidalChannelTool", () => {
  test("should have correct description", () => {
    expect(createTrapezoidalChannelTool.description).toContain("trapezoidal")
    expect(createTrapezoidalChannelTool.description).toContain("sloped sides")
    expect(createTrapezoidalChannelTool.description).toContain("irrigation")
  })

  test("should have execute function", () => {
    expect(createTrapezoidalChannelTool.execute).toBeDefined()
  })
})

describe("createTriangularChannelTool", () => {
  test("should have correct description", () => {
    expect(createTriangularChannelTool.description).toContain("V-shaped")
    expect(createTriangularChannelTool.description).toContain("triangular")
    expect(createTriangularChannelTool.description).toContain("gutter")
  })

  test("should have execute function", () => {
    expect(createTriangularChannelTool.execute).toBeDefined()
  })
})

describe("createTransitionTool", () => {
  test("should have correct description", () => {
    expect(createTransitionTool.description).toContain("transition")
    expect(createTransitionTool.description).toContain("linear")
    expect(createTransitionTool.description).toContain("warped")
    expect(createTransitionTool.description).toContain("cylindrical")
  })

  test("should have execute function", () => {
    expect(createTransitionTool.execute).toBeDefined()
  })
})

describe("analyzeNormalFlowTool", () => {
  test("should have correct description", () => {
    expect(analyzeNormalFlowTool.description).toContain("normal")
    expect(analyzeNormalFlowTool.description).toContain("Manning")
    expect(analyzeNormalFlowTool.description).toContain("Froude")
    expect(analyzeNormalFlowTool.description).toContain("discharge")
  })

  test("should have execute function", () => {
    expect(analyzeNormalFlowTool.execute).toBeDefined()
  })
})

describe("calculateDischargeDepthTool", () => {
  test("should have correct description", () => {
    expect(calculateDischargeDepthTool.description).toContain("normal depth")
    expect(calculateDischargeDepthTool.description).toContain("discharge")
    expect(calculateDischargeDepthTool.description).toContain("Manning")
  })

  test("should have execute function", () => {
    expect(calculateDischargeDepthTool.execute).toBeDefined()
  })
})

describe("calculateCriticalDepthTool", () => {
  test("should have correct description", () => {
    expect(calculateCriticalDepthTool.description).toContain("critical depth")
    expect(calculateCriticalDepthTool.description).toContain("Froude")
  })

  test("should have execute function", () => {
    expect(calculateCriticalDepthTool.execute).toBeDefined()
  })
})

describe("analyzeGVFTool", () => {
  test("should have correct description", () => {
    expect(analyzeGVFTool.description).toContain("Gradually Varied Flow")
    expect(analyzeGVFTool.description).toContain("GVF")
    expect(analyzeGVFTool.description).toContain("water surface")
  })

  test("should have execute function", () => {
    expect(analyzeGVFTool.execute).toBeDefined()
  })
})

describe("modifyChannelTool", () => {
  test("should have correct description", () => {
    expect(modifyChannelTool.description).toContain("Modify")
    expect(modifyChannelTool.description).toContain("channel")
    expect(modifyChannelTool.description).toContain("dimensions")
  })

  test("should have execute function", () => {
    expect(modifyChannelTool.execute).toBeDefined()
  })
})

describe("deleteObjectTool", () => {
  test("should have correct description", () => {
    expect(deleteObjectTool.description).toContain("Delete")
    expect(deleteObjectTool.description).toContain("ID")
    expect(deleteObjectTool.description).toContain("name")
  })

  test("should have execute function", () => {
    expect(deleteObjectTool.execute).toBeDefined()
  })
})

describe("duplicateObjectTool", () => {
  test("should have correct description", () => {
    expect(duplicateObjectTool.description).toContain("copy")
    expect(duplicateObjectTool.description).toContain("duplicate")
  })

  test("should have execute function", () => {
    expect(duplicateObjectTool.execute).toBeDefined()
  })
})

describe("exportSceneTool", () => {
  test("should have correct description", () => {
    expect(exportSceneTool.description).toContain("Export")
    expect(exportSceneTool.description).toContain("STL")
    expect(exportSceneTool.description).toContain("OBJ")
  })

  test("should have execute function", () => {
    expect(exportSceneTool.execute).toBeDefined()
  })
})

describe("tool descriptions are complete", () => {
  test("all tools have non-empty descriptions", () => {
    const tools = [
      createRectangularChannelTool,
      createTrapezoidalChannelTool,
      createTriangularChannelTool,
      createTransitionTool,
      analyzeNormalFlowTool,
      calculateDischargeDepthTool,
      calculateCriticalDepthTool,
      analyzeGVFTool,
      modifyChannelTool,
      deleteObjectTool,
      duplicateObjectTool,
      exportSceneTool,
    ]

    for (const tool of tools) {
      expect(tool.description).toBeDefined()
      expect(tool.description?.length).toBeGreaterThan(30)
    }
  })
})
