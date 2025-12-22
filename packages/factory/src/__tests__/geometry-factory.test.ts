/**
 * Tests for GeometryFactory base classes
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import type { MeshData } from "@cadhy/types"
import {
  type FactoryOptions,
  type FactoryResult,
  GeometryFactory,
  PositionedGeometryFactory,
} from "../geometry-factory"

// =============================================================================
// MOCK IMPLEMENTATIONS
// =============================================================================

const createMockMesh = (): MeshData => ({
  vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
})

/**
 * Concrete implementation for testing
 */
class TestFactory extends GeometryFactory {
  value = 10
  shouldFail = false
  generatePreviewCalls = 0
  executeCommitCalls = 0

  get name(): string {
    return "TestFactory"
  }

  isValid(): boolean {
    return this.value > 0
  }

  toParams(): Record<string, unknown> {
    return { value: this.value }
  }

  protected async generatePreview(_options: FactoryOptions): Promise<MeshData> {
    this.generatePreviewCalls++
    if (this.shouldFail) {
      throw new Error("Preview failed")
    }
    return createMockMesh()
  }

  protected async executeCommit(_options: FactoryOptions): Promise<FactoryResult> {
    this.executeCommitCalls++
    if (this.shouldFail) {
      throw new Error("Commit failed")
    }
    return {
      shapeId: "shape-123",
      mesh: createMockMesh(),
      success: true,
    }
  }
}

/**
 * Positioned factory for testing
 */
class TestPositionedFactory extends PositionedGeometryFactory {
  radius = 5

  get name(): string {
    return "TestPositionedFactory"
  }

  isValid(): boolean {
    return this.radius > 0
  }

  override toParams(): Record<string, unknown> {
    return {
      ...super.toParams(),
      radius: this.radius,
    }
  }

  protected async generatePreview(_options: FactoryOptions): Promise<MeshData> {
    return createMockMesh()
  }

  protected async executeCommit(_options: FactoryOptions): Promise<FactoryResult> {
    return {
      shapeId: "shape-456",
      mesh: createMockMesh(),
      success: true,
    }
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe("GeometryFactory", () => {
  let factory: TestFactory

  beforeEach(() => {
    factory = new TestFactory()
  })

  describe("initialization", () => {
    test("has correct initial state", () => {
      expect(factory.state).toBe("idle")
      expect(factory.previewMesh).toBeNull()
      expect(factory.resultShapeId).toBeNull()
    })

    test("returns correct name", () => {
      expect(factory.name).toBe("TestFactory")
    })

    test("isValid returns true for valid parameters", () => {
      expect(factory.isValid()).toBe(true)
    })

    test("isValid returns false for invalid parameters", () => {
      factory.value = -1
      expect(factory.isValid()).toBe(false)
    })
  })

  describe("canUpdate", () => {
    test("returns true when idle and valid", () => {
      expect(factory.canUpdate).toBe(true)
    })

    test("returns false when invalid", () => {
      factory.value = -1
      expect(factory.canUpdate).toBe(false)
    })
  })

  describe("canCommit", () => {
    test("returns true when idle and valid", () => {
      expect(factory.canCommit).toBe(true)
    })

    test("returns false when invalid", () => {
      factory.value = -1
      expect(factory.canCommit).toBe(false)
    })

    test("returns false when cancelled", async () => {
      factory.cancel()
      expect(factory.canCommit).toBe(false)
    })
  })

  describe("update()", () => {
    test("generates preview mesh", async () => {
      const mesh = await factory.update()
      expect(mesh.vertices).toBeDefined()
      expect(mesh.normals).toBeDefined()
      expect(mesh.indices).toBeDefined()
      expect(factory.generatePreviewCalls).toBe(1)
    })

    test("caches preview mesh", async () => {
      await factory.update()
      expect(factory.previewMesh).not.toBeNull()
    })

    test("returns to idle state after update", async () => {
      await factory.update()
      expect(factory.state).toBe("idle")
    })

    test("rejects when invalid", async () => {
      factory.value = -1
      await expect(factory.update()).rejects.toThrow("invalid")
    })

    test("handles errors gracefully", async () => {
      factory.shouldFail = true
      await expect(factory.update()).rejects.toThrow("Preview failed")
      expect(factory.state).toBe("idle")
    })

    test("cancels previous update when called again", async () => {
      const promise1 = factory.update()
      const promise2 = factory.update()

      // First promise should be cancelled
      await expect(promise1).rejects.toThrow()
      // Second promise should succeed
      const mesh = await promise2
      expect(mesh).toBeDefined()
    })
  })

  describe("updateWithCache()", () => {
    test("uses cache when parameters unchanged", async () => {
      await factory.updateWithCache()
      expect(factory.generatePreviewCalls).toBe(1)

      await factory.updateWithCache()
      expect(factory.generatePreviewCalls).toBe(1) // Still 1, used cache
    })

    test("regenerates when parameters change", async () => {
      await factory.updateWithCache()
      expect(factory.generatePreviewCalls).toBe(1)

      factory.value = 20
      await factory.updateWithCache()
      expect(factory.generatePreviewCalls).toBe(2)
    })
  })

  describe("commit()", () => {
    test("executes commit operation", async () => {
      const result = await factory.commit()
      expect(result.success).toBe(true)
      expect(result.shapeId).toBe("shape-123")
      expect(factory.executeCommitCalls).toBe(1)
    })

    test("sets state to committed", async () => {
      await factory.commit()
      expect(factory.state).toBe("committed")
    })

    test("stores result shape ID", async () => {
      await factory.commit()
      expect(factory.resultShapeId).toBe("shape-123")
    })

    test("throws when invalid", async () => {
      factory.value = -1
      await expect(factory.commit()).rejects.toThrow("Cannot commit")
    })

    test("handles errors gracefully", async () => {
      factory.shouldFail = true
      await expect(factory.commit()).rejects.toThrow("Commit failed")
      expect(factory.state).toBe("idle")
    })
  })

  describe("cancel()", () => {
    test("sets state to cancelled", () => {
      factory.cancel()
      expect(factory.state).toBe("cancelled")
    })

    test("clears preview mesh", async () => {
      await factory.update()
      expect(factory.previewMesh).not.toBeNull()

      factory.cancel()
      expect(factory.previewMesh).toBeNull()
    })
  })

  describe("reset()", () => {
    test("resets state to idle", async () => {
      await factory.commit()
      factory.reset()
      expect(factory.state).toBe("idle")
    })

    test("clears result shape ID", async () => {
      await factory.commit()
      expect(factory.resultShapeId).not.toBeNull()

      factory.reset()
      expect(factory.resultShapeId).toBeNull()
    })
  })

  describe("toParams()", () => {
    test("returns parameters as object", () => {
      const params = factory.toParams()
      expect(params).toEqual({ value: 10 })
    })
  })

  describe("events", () => {
    test("calls onPreviewUpdate on successful update", async () => {
      const onPreviewUpdate = mock(() => {})
      factory.setEvents({ onPreviewUpdate })

      await factory.update()
      expect(onPreviewUpdate).toHaveBeenCalled()
    })

    test("calls onCommit on successful commit", async () => {
      const onCommit = mock(() => {})
      factory.setEvents({ onCommit })

      await factory.commit()
      expect(onCommit).toHaveBeenCalled()
    })

    test("calls onCancel when cancelled", () => {
      const onCancel = mock(() => {})
      factory.setEvents({ onCancel })

      factory.cancel()
      expect(onCancel).toHaveBeenCalled()
    })

    test("calls onError on update failure", async () => {
      const onError = mock(() => {})
      factory.setEvents({ onError })
      factory.shouldFail = true

      await factory.update().catch(() => {})
      expect(onError).toHaveBeenCalled()
    })

    test("calls onError on commit failure", async () => {
      const onError = mock(() => {})
      factory.setEvents({ onError })
      factory.shouldFail = true

      await factory.commit().catch(() => {})
      expect(onError).toHaveBeenCalled()
    })
  })

  describe("dispose()", () => {
    test("cancels factory", () => {
      factory.dispose()
      expect(factory.state).toBe("cancelled")
    })
  })
})

describe("PositionedGeometryFactory", () => {
  let factory: TestPositionedFactory

  beforeEach(() => {
    factory = new TestPositionedFactory()
  })

  describe("position properties", () => {
    test("has default position at origin", () => {
      expect(factory.x).toBe(0)
      expect(factory.y).toBe(0)
      expect(factory.z).toBe(0)
    })

    test("can set individual coordinates", () => {
      factory.x = 10
      factory.y = 20
      factory.z = 30

      expect(factory.x).toBe(10)
      expect(factory.y).toBe(20)
      expect(factory.z).toBe(30)
    })

    test("can set position all at once", () => {
      factory.setPosition(1, 2, 3)

      expect(factory.x).toBe(1)
      expect(factory.y).toBe(2)
      expect(factory.z).toBe(3)
    })
  })

  describe("toParams()", () => {
    test("includes position in params", () => {
      factory.setPosition(5, 10, 15)
      factory.radius = 3

      const params = factory.toParams()
      expect(params).toEqual({
        x: 5,
        y: 10,
        z: 15,
        radius: 3,
      })
    })
  })

  describe("parameter change notification", () => {
    test("notifies on x change", () => {
      const onParameterChange = mock(() => {})
      factory.setEvents({ onParameterChange })

      factory.x = 100
      expect(onParameterChange).toHaveBeenCalled()
    })

    test("notifies on y change", () => {
      const onParameterChange = mock(() => {})
      factory.setEvents({ onParameterChange })

      factory.y = 100
      expect(onParameterChange).toHaveBeenCalled()
    })

    test("notifies on z change", () => {
      const onParameterChange = mock(() => {})
      factory.setEvents({ onParameterChange })

      factory.z = 100
      expect(onParameterChange).toHaveBeenCalled()
    })

    test("notifies on setPosition", () => {
      const onParameterChange = mock(() => {})
      factory.setEvents({ onParameterChange })

      factory.setPosition(1, 2, 3)
      expect(onParameterChange).toHaveBeenCalled()
    })
  })
})
