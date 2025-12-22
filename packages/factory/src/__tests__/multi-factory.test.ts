/**
 * Tests for MultiGeometryFactory
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import { CancellablePromise } from "@cadhy/command"
import type { MeshData } from "@cadhy/types"
import type { FactoryOptions, FactoryResult, FactoryState } from "../geometry-factory"
import {
  type ComposableFactory,
  delegatedGetter,
  delegatedSetter,
  MultiGeometryFactory,
  Reducers,
} from "../multi-factory"

// =============================================================================
// MOCK IMPLEMENTATIONS
// =============================================================================

const createMockMesh = (id: number): MeshData => ({
  vertices: new Float32Array([id, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
})

/**
 * Mock sub-factory for testing
 */
class MockSubFactory implements ComposableFactory {
  readonly id: number
  private _state: FactoryState = "idle"
  private _value = 10

  constructor(id: number) {
    this.id = id
  }

  get name(): string {
    return `MockFactory-${this.id}`
  }

  get state(): FactoryState {
    return this._state
  }

  get value(): number {
    return this._value
  }
  set value(v: number) {
    this._value = v
  }

  isValid(): boolean {
    return this._value > 0
  }

  updateWithCache(_options?: FactoryOptions): CancellablePromise<MeshData> {
    return CancellablePromise.resolved(createMockMesh(this.id))
  }

  toParams(): Record<string, unknown> {
    return { id: this.id, value: this._value }
  }

  async commit(_options?: FactoryOptions): Promise<FactoryResult> {
    this._state = "committed"
    return {
      shapeId: `shape-${this.id}`,
      mesh: createMockMesh(this.id),
      success: true,
    }
  }

  cancel(): void {
    this._state = "cancelled"
  }

  dispose(): void {
    this._state = "cancelled"
  }
}

/**
 * Concrete multi-factory for testing
 */
class TestMultiFactory extends MultiGeometryFactory<MockSubFactory> {
  get name(): string {
    return "TestMultiFactory"
  }

  // Expose protected methods for testing
  addSubFactory(factory: MockSubFactory): void {
    this.addFactory(factory)
  }

  removeSubFactory(factory: MockSubFactory): void {
    this.removeFactory(factory)
  }

  clearSubFactories(): void {
    this.clearFactories()
  }

  // Delegated property example
  get totalValue(): number {
    return delegatedGetter(this.factories, (f) => f.value, Reducers.sum)
  }

  set valueForAll(v: number) {
    delegatedSetter(
      this._factories,
      (f, val) => {
        f.value = val
      },
      v
    )
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe("MultiGeometryFactory", () => {
  let factory: TestMultiFactory

  beforeEach(() => {
    factory = new TestMultiFactory()
  })

  describe("initialization", () => {
    test("has correct name", () => {
      expect(factory.name).toBe("TestMultiFactory")
    })

    test("starts with no factories", () => {
      expect(factory.count).toBe(0)
      expect(factory.isEmpty).toBe(true)
    })

    test("starts in idle state", () => {
      expect(factory.state).toBe("idle")
    })
  })

  describe("factory management", () => {
    test("can add factories", () => {
      factory.addSubFactory(new MockSubFactory(1))
      factory.addSubFactory(new MockSubFactory(2))

      expect(factory.count).toBe(2)
      expect(factory.isEmpty).toBe(false)
    })

    test("can remove factories", () => {
      const sub1 = new MockSubFactory(1)
      const sub2 = new MockSubFactory(2)

      factory.addSubFactory(sub1)
      factory.addSubFactory(sub2)
      factory.removeSubFactory(sub1)

      expect(factory.count).toBe(1)
      expect(factory.factories[0].id).toBe(2)
    })

    test("can clear all factories", () => {
      factory.addSubFactory(new MockSubFactory(1))
      factory.addSubFactory(new MockSubFactory(2))
      factory.clearSubFactories()

      expect(factory.count).toBe(0)
      expect(factory.isEmpty).toBe(true)
    })
  })

  describe("validation", () => {
    test("is invalid when empty", () => {
      expect(factory.isValid()).toBe(false)
    })

    test("is valid when all sub-factories are valid", () => {
      factory.addSubFactory(new MockSubFactory(1))
      factory.addSubFactory(new MockSubFactory(2))

      expect(factory.isValid()).toBe(true)
    })

    test("is invalid when any sub-factory is invalid", () => {
      const sub1 = new MockSubFactory(1)
      const sub2 = new MockSubFactory(2)
      sub2.value = -1 // Invalid

      factory.addSubFactory(sub1)
      factory.addSubFactory(sub2)

      expect(factory.isValid()).toBe(false)
    })
  })

  describe("update()", () => {
    test("rejects when invalid", async () => {
      await expect(factory.update()).rejects.toThrow("not valid")
    })

    test("updates all factories and returns combined meshes", async () => {
      factory.addSubFactory(new MockSubFactory(1))
      factory.addSubFactory(new MockSubFactory(2))

      const result = await factory.update()

      expect(result.meshes).toHaveLength(2)
      expect(result.factoryIndices).toEqual([0, 1])
    })

    test("returns to idle state after update", async () => {
      factory.addSubFactory(new MockSubFactory(1))

      await factory.update()

      expect(factory.state).toBe("idle")
    })

    test("calls onUpdate event", async () => {
      const onUpdate = mock(() => {})
      factory.setEvents({ onUpdate })
      factory.addSubFactory(new MockSubFactory(1))

      await factory.update()

      expect(onUpdate).toHaveBeenCalled()
    })
  })

  describe("commit()", () => {
    test("throws when invalid", async () => {
      await expect(factory.commit()).rejects.toThrow("not valid")
    })

    test("commits all factories in sequence", async () => {
      const sub1 = new MockSubFactory(1)
      const sub2 = new MockSubFactory(2)

      factory.addSubFactory(sub1)
      factory.addSubFactory(sub2)

      const result = await factory.commit()

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].shapeId).toBe("shape-1")
      expect(result.results[1].shapeId).toBe("shape-2")
    })

    test("sets state to committed", async () => {
      factory.addSubFactory(new MockSubFactory(1))

      await factory.commit()

      expect(factory.state).toBe("committed")
    })

    test("calls onCommit event", async () => {
      const onCommit = mock(() => {})
      factory.setEvents({ onCommit })
      factory.addSubFactory(new MockSubFactory(1))

      await factory.commit()

      expect(onCommit).toHaveBeenCalled()
    })
  })

  describe("cancel()", () => {
    test("cancels all sub-factories", () => {
      const sub1 = new MockSubFactory(1)
      const sub2 = new MockSubFactory(2)

      factory.addSubFactory(sub1)
      factory.addSubFactory(sub2)

      factory.cancel()

      expect(sub1.state).toBe("cancelled")
      expect(sub2.state).toBe("cancelled")
      expect(factory.state).toBe("cancelled")
    })
  })

  describe("toParams()", () => {
    test("returns params from all sub-factories", () => {
      const sub1 = new MockSubFactory(1)
      const sub2 = new MockSubFactory(2)
      sub1.value = 100
      sub2.value = 200

      factory.addSubFactory(sub1)
      factory.addSubFactory(sub2)

      const params = factory.toParams()

      expect(params).toEqual([
        { id: 1, value: 100 },
        { id: 2, value: 200 },
      ])
    })
  })

  describe("dispose()", () => {
    test("disposes all sub-factories", () => {
      const sub1 = new MockSubFactory(1)
      const sub2 = new MockSubFactory(2)

      factory.addSubFactory(sub1)
      factory.addSubFactory(sub2)

      factory.dispose()

      expect(factory.count).toBe(0)
    })
  })

  describe("delegated properties", () => {
    test("totalValue uses Reducers.sum", () => {
      const sub1 = new MockSubFactory(1)
      const sub2 = new MockSubFactory(2)
      sub1.value = 10
      sub2.value = 20

      factory.addSubFactory(sub1)
      factory.addSubFactory(sub2)

      expect(factory.totalValue).toBe(30)
    })

    test("valueForAll sets value on all factories", () => {
      const sub1 = new MockSubFactory(1)
      const sub2 = new MockSubFactory(2)

      factory.addSubFactory(sub1)
      factory.addSubFactory(sub2)

      factory.valueForAll = 50

      expect(sub1.value).toBe(50)
      expect(sub2.value).toBe(50)
    })
  })
})

describe("Reducers", () => {
  test("first returns first element", () => {
    expect(Reducers.first([1, 2, 3])).toBe(1)
  })

  test("last returns last element", () => {
    expect(Reducers.last([1, 2, 3])).toBe(3)
  })

  test("min returns minimum value", () => {
    expect(Reducers.min([3, 1, 2])).toBe(1)
  })

  test("max returns maximum value", () => {
    expect(Reducers.max([3, 1, 2])).toBe(3)
  })

  test("sum returns sum of all values", () => {
    expect(Reducers.sum([1, 2, 3])).toBe(6)
  })

  test("average returns average of all values", () => {
    expect(Reducers.average([2, 4, 6])).toBe(4)
  })

  test("average returns 0 for empty array", () => {
    expect(Reducers.average([])).toBe(0)
  })

  test("all returns true if all values are true", () => {
    expect(Reducers.all([true, true, true])).toBe(true)
    expect(Reducers.all([true, false, true])).toBe(false)
  })

  test("any returns true if any value is true", () => {
    expect(Reducers.any([false, true, false])).toBe(true)
    expect(Reducers.any([false, false, false])).toBe(false)
  })

  test("flatten flattens nested arrays", () => {
    expect(Reducers.flatten([[1, 2], [3, 4], [5]])).toEqual([1, 2, 3, 4, 5])
  })
})

describe("delegatedGetter", () => {
  test("applies getter and reducer", () => {
    const items = [{ value: 10 }, { value: 20 }, { value: 30 }]
    const result = delegatedGetter(items, (i) => i.value, Reducers.sum)
    expect(result).toBe(60)
  })
})

describe("delegatedSetter", () => {
  test("applies setter to all items", () => {
    const items = [{ value: 0 }, { value: 0 }, { value: 0 }]
    delegatedSetter(
      items,
      (i, v) => {
        i.value = v
      },
      100
    )
    expect(items.every((i) => i.value === 100)).toBe(true)
  })
})
