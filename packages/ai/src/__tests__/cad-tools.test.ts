/**
 * CAD Tools Tests - @cadhy/ai
 *
 * Tests for CAD tool definitions and schemas.
 */

import { describe, expect, test } from "bun:test"
import {
  booleanIntersectTool,
  booleanSubtractTool,
  booleanUnionTool,
  cadTools,
  createBoxTool,
  createConeTool,
  createCylinderTool,
  createSphereTool,
  createTorusTool,
  modifyShapeTool,
} from "../tools/cad-tools"

describe("cadTools export", () => {
  test("should export all CAD tools", () => {
    expect(cadTools.createBox).toBeDefined()
    expect(cadTools.createCylinder).toBeDefined()
    expect(cadTools.createSphere).toBeDefined()
    expect(cadTools.createCone).toBeDefined()
    expect(cadTools.createTorus).toBeDefined()
    expect(cadTools.modifyShape).toBeDefined()
    expect(cadTools.booleanUnion).toBeDefined()
    expect(cadTools.booleanSubtract).toBeDefined()
    expect(cadTools.booleanIntersect).toBeDefined()
  })

  test("should have 9 total tools", () => {
    expect(Object.keys(cadTools)).toHaveLength(9)
  })
})

describe("createBoxTool", () => {
  test("should have correct description", () => {
    expect(createBoxTool.description).toContain("box")
    expect(createBoxTool.description).toContain("rectangular")
  })

  test("should have execute function", () => {
    expect(createBoxTool.execute).toBeDefined()
    expect(typeof createBoxTool.execute).toBe("function")
  })

  test("should have inputSchema with required dimensions", () => {
    expect(createBoxTool.inputSchema).toBeDefined()
  })
})

describe("createCylinderTool", () => {
  test("should have correct description", () => {
    expect(createCylinderTool.description).toContain("cylinder")
    expect(createCylinderTool.description).toContain("pipe")
  })

  test("should have execute function", () => {
    expect(createCylinderTool.execute).toBeDefined()
  })
})

describe("createSphereTool", () => {
  test("should have correct description", () => {
    expect(createSphereTool.description).toContain("sphere")
    expect(createSphereTool.description).toContain("tank")
  })

  test("should have execute function", () => {
    expect(createSphereTool.execute).toBeDefined()
  })
})

describe("createConeTool", () => {
  test("should have correct description", () => {
    expect(createConeTool.description).toContain("cone")
    expect(createConeTool.description).toContain("frustum")
    expect(createConeTool.description).toContain("truncated")
  })

  test("should have execute function", () => {
    expect(createConeTool.execute).toBeDefined()
  })
})

describe("createTorusTool", () => {
  test("should have correct description", () => {
    expect(createTorusTool.description).toContain("torus")
    expect(createTorusTool.description).toContain("donut")
  })

  test("should have execute function", () => {
    expect(createTorusTool.execute).toBeDefined()
  })
})

describe("modifyShapeTool", () => {
  test("should have correct description", () => {
    expect(modifyShapeTool.description).toContain("Modify")
    expect(modifyShapeTool.description).toContain("existing shape")
  })

  test("should have execute function", () => {
    expect(modifyShapeTool.execute).toBeDefined()
  })
})

describe("booleanUnionTool", () => {
  test("should have correct description", () => {
    expect(booleanUnionTool.description).toContain("union")
    expect(booleanUnionTool.description).toContain("Combine")
  })

  test("should have execute function", () => {
    expect(booleanUnionTool.execute).toBeDefined()
  })
})

describe("booleanSubtractTool", () => {
  test("should have correct description", () => {
    expect(booleanSubtractTool.description).toContain("Subtract")
    expect(booleanSubtractTool.description).toContain("difference")
  })

  test("should have execute function", () => {
    expect(booleanSubtractTool.execute).toBeDefined()
  })
})

describe("booleanIntersectTool", () => {
  test("should have correct description", () => {
    expect(booleanIntersectTool.description).toContain("intersection")
    expect(booleanIntersectTool.description).toContain("common")
  })

  test("should have execute function", () => {
    expect(booleanIntersectTool.execute).toBeDefined()
  })
})

describe("tool descriptions are complete", () => {
  test("all tools have non-empty descriptions", () => {
    const tools = [
      createBoxTool,
      createCylinderTool,
      createSphereTool,
      createConeTool,
      createTorusTool,
      modifyShapeTool,
      booleanUnionTool,
      booleanSubtractTool,
      booleanIntersectTool,
    ]

    for (const tool of tools) {
      expect(tool.description).toBeDefined()
      expect(tool.description?.length).toBeGreaterThan(20)
    }
  })
})
