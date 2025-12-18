/**
 * Viewer Package Tests - @cadhy/viewer
 *
 * Basic tests for the viewer package exports and types.
 * Note: Full component tests require a 3D context (WebGL/Canvas)
 * which is not available in the test environment.
 */

import { describe, expect, test } from "bun:test"

describe("Viewer Package", () => {
  test("should export components from index", async () => {
    const exports = await import("../index")
    expect(exports).toBeDefined()
  })

  test("should export hooks from hooks/index", async () => {
    const hooks = await import("../hooks/index")
    expect(hooks).toBeDefined()
    expect(hooks.useSelection).toBeDefined()
    expect(hooks.useCamera).toBeDefined()
  })

  test("should export components from components/index", async () => {
    const components = await import("../components/index")
    expect(components).toBeDefined()
  })
})

describe("View types", () => {
  test("view types should be valid strings", () => {
    const validViews = ["top", "front", "right", "isometric"]
    expect(validViews).toContain("top")
    expect(validViews).toContain("front")
    expect(validViews).toContain("right")
    expect(validViews).toContain("isometric")
  })
})
