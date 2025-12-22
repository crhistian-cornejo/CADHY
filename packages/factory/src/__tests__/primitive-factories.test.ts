/**
 * Tests for Primitive Factories
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import type { MeshData } from "@cadhy/types"
import {
  BoxFactory,
  type CadOperations,
  ConeFactory,
  CylinderFactory,
  createPrimitiveFactory,
  SphereFactory,
  setCadOperations,
  TorusFactory,
} from "../primitive-factories"

// =============================================================================
// MOCK CAD OPERATIONS
// =============================================================================

const createMockMesh = (): MeshData => ({
  vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
})

let shapeIdCounter = 0
const deletedShapes: string[] = []

const mockCadOps: CadOperations = {
  createBox: mock(async (x, y, z, width, depth, height) => ({
    id: `box-${++shapeIdCounter}`,
    analysis: { width, depth, height, x, y, z },
  })),

  createCylinder: mock(async (x, y, z, radius, height) => ({
    id: `cylinder-${++shapeIdCounter}`,
    analysis: { radius, height, x, y, z },
  })),

  createSphere: mock(async (x, y, z, radius) => ({
    id: `sphere-${++shapeIdCounter}`,
    analysis: { radius, x, y, z },
  })),

  createCone: mock(async (x, y, z, baseRadius, topRadius, height) => ({
    id: `cone-${++shapeIdCounter}`,
    analysis: { baseRadius, topRadius, height, x, y, z },
  })),

  createTorus: mock(async (x, y, z, majorRadius, minorRadius) => ({
    id: `torus-${++shapeIdCounter}`,
    analysis: { majorRadius, minorRadius, x, y, z },
  })),

  tessellate: mock(async (_shapeId, _deflection) => createMockMesh()),

  deleteShape: mock(async (shapeId) => {
    deletedShapes.push(shapeId)
  }),
}

// =============================================================================
// SETUP
// =============================================================================

beforeEach(() => {
  shapeIdCounter = 0
  deletedShapes.length = 0
  setCadOperations(mockCadOps)

  // Reset mocks
  for (const key of Object.keys(mockCadOps) as (keyof CadOperations)[]) {
    ;(mockCadOps[key] as ReturnType<typeof mock>).mockClear?.()
  }
})

// =============================================================================
// BOX FACTORY TESTS
// =============================================================================

describe("BoxFactory", () => {
  let factory: BoxFactory

  beforeEach(() => {
    factory = new BoxFactory()
  })

  afterEach(() => {
    factory.dispose()
  })

  describe("initialization", () => {
    test("has correct name", () => {
      expect(factory.name).toBe("Box")
    })

    test("has default dimensions", () => {
      expect(factory.width).toBe(1)
      expect(factory.height).toBe(1)
      expect(factory.depth).toBe(1)
    })

    test("has default position at origin", () => {
      expect(factory.x).toBe(0)
      expect(factory.y).toBe(0)
      expect(factory.z).toBe(0)
    })
  })

  describe("validation", () => {
    test("is valid with positive dimensions", () => {
      expect(factory.isValid()).toBe(true)
    })

    test("is invalid with zero width", () => {
      factory.width = 0
      expect(factory.isValid()).toBe(false)
    })

    test("is invalid with zero height", () => {
      factory.height = 0
      expect(factory.isValid()).toBe(false)
    })

    test("is invalid with zero depth", () => {
      factory.depth = 0
      expect(factory.isValid()).toBe(false)
    })

    test("ignores non-positive values in setters", () => {
      factory.width = -5
      expect(factory.width).toBe(1) // unchanged

      factory.height = 0
      expect(factory.height).toBe(1) // unchanged
    })
  })

  describe("toParams()", () => {
    test("returns all parameters", () => {
      factory.width = 10
      factory.height = 20
      factory.depth = 30
      factory.setPosition(5, 6, 7)

      expect(factory.toParams()).toEqual({
        x: 5,
        y: 6,
        z: 7,
        width: 10,
        height: 20,
        depth: 30,
      })
    })
  })

  describe("update()", () => {
    test("calls CAD operations", async () => {
      factory.width = 10
      factory.height = 20
      factory.depth = 30

      await factory.update()

      expect(mockCadOps.createBox).toHaveBeenCalledWith(0, 0, 0, 10, 30, 20)
      expect(mockCadOps.tessellate).toHaveBeenCalled()
    })

    test("returns mesh data", async () => {
      const mesh = await factory.update()
      expect(mesh.vertices).toBeDefined()
      expect(mesh.normals).toBeDefined()
      expect(mesh.indices).toBeDefined()
    })

    test("cleans up previous preview on subsequent updates", async () => {
      await factory.update()
      const firstShapeId = `box-1`

      await factory.update()

      expect(deletedShapes).toContain(firstShapeId)
    })
  })

  describe("commit()", () => {
    test("returns successful result", async () => {
      const result = await factory.commit()
      expect(result.success).toBe(true)
      expect(result.shapeId).toMatch(/^box-/)
    })

    test("uses preview shape if available", async () => {
      await factory.update()
      const result = await factory.commit()

      // Only one createBox call (from update), not two
      expect(mockCadOps.createBox).toHaveBeenCalledTimes(1)
      expect(result.shapeId).toBe("box-1")
    })
  })

  describe("dispose()", () => {
    test("cleans up preview shape", async () => {
      await factory.update()
      factory.dispose()

      expect(deletedShapes).toContain("box-1")
    })

    test("does not clean up committed shape", async () => {
      await factory.update()
      await factory.commit()
      factory.dispose()

      expect(deletedShapes).not.toContain("box-1")
    })
  })
})

// =============================================================================
// CYLINDER FACTORY TESTS
// =============================================================================

describe("CylinderFactory", () => {
  let factory: CylinderFactory

  beforeEach(() => {
    factory = new CylinderFactory()
  })

  afterEach(() => {
    factory.dispose()
  })

  test("has correct name", () => {
    expect(factory.name).toBe("Cylinder")
  })

  test("has default values", () => {
    expect(factory.radius).toBe(0.5)
    expect(factory.height).toBe(1)
  })

  test("is valid with positive values", () => {
    expect(factory.isValid()).toBe(true)
  })

  test("is invalid with zero radius", () => {
    factory.radius = 0
    expect(factory.isValid()).toBe(false)
  })

  test("toParams includes all properties", () => {
    factory.radius = 5
    factory.height = 10
    factory.setPosition(1, 2, 3)

    expect(factory.toParams()).toEqual({
      x: 1,
      y: 2,
      z: 3,
      radius: 5,
      height: 10,
    })
  })

  test("update calls correct CAD operation", async () => {
    factory.radius = 5
    factory.height = 10

    await factory.update()

    expect(mockCadOps.createCylinder).toHaveBeenCalledWith(0, 0, 0, 5, 10)
  })
})

// =============================================================================
// SPHERE FACTORY TESTS
// =============================================================================

describe("SphereFactory", () => {
  let factory: SphereFactory

  beforeEach(() => {
    factory = new SphereFactory()
  })

  afterEach(() => {
    factory.dispose()
  })

  test("has correct name", () => {
    expect(factory.name).toBe("Sphere")
  })

  test("has default radius", () => {
    expect(factory.radius).toBe(0.5)
  })

  test("is valid with positive radius", () => {
    expect(factory.isValid()).toBe(true)
  })

  test("is invalid with zero radius", () => {
    factory.radius = 0
    expect(factory.isValid()).toBe(false)
  })

  test("toParams includes all properties", () => {
    factory.radius = 10
    factory.setPosition(1, 2, 3)

    expect(factory.toParams()).toEqual({
      x: 1,
      y: 2,
      z: 3,
      radius: 10,
    })
  })

  test("update calls correct CAD operation", async () => {
    factory.radius = 7
    factory.setPosition(5, 6, 7)

    await factory.update()

    expect(mockCadOps.createSphere).toHaveBeenCalledWith(5, 6, 7, 7)
  })
})

// =============================================================================
// CONE FACTORY TESTS
// =============================================================================

describe("ConeFactory", () => {
  let factory: ConeFactory

  beforeEach(() => {
    factory = new ConeFactory()
  })

  afterEach(() => {
    factory.dispose()
  })

  test("has correct name", () => {
    expect(factory.name).toBe("Cone")
  })

  test("has default values", () => {
    expect(factory.baseRadius).toBe(0.5)
    expect(factory.topRadius).toBe(0)
    expect(factory.height).toBe(1)
  })

  test("is valid with positive base radius", () => {
    expect(factory.isValid()).toBe(true)
  })

  test("is valid with positive top radius only", () => {
    factory.baseRadius = 0
    factory.topRadius = 1
    expect(factory.isValid()).toBe(true)
  })

  test("is invalid with both radii zero", () => {
    factory.baseRadius = 0
    factory.topRadius = 0
    expect(factory.isValid()).toBe(false)
  })

  test("is invalid with zero height", () => {
    factory.height = 0
    expect(factory.isValid()).toBe(false)
  })

  test("toParams includes all properties", () => {
    factory.baseRadius = 5
    factory.topRadius = 2
    factory.height = 10

    expect(factory.toParams()).toEqual({
      x: 0,
      y: 0,
      z: 0,
      baseRadius: 5,
      topRadius: 2,
      height: 10,
    })
  })

  test("update calls correct CAD operation", async () => {
    factory.baseRadius = 5
    factory.topRadius = 2
    factory.height = 10

    await factory.update()

    expect(mockCadOps.createCone).toHaveBeenCalledWith(0, 0, 0, 5, 2, 10)
  })
})

// =============================================================================
// TORUS FACTORY TESTS
// =============================================================================

describe("TorusFactory", () => {
  let factory: TorusFactory

  beforeEach(() => {
    factory = new TorusFactory()
  })

  afterEach(() => {
    factory.dispose()
  })

  test("has correct name", () => {
    expect(factory.name).toBe("Torus")
  })

  test("has default values", () => {
    expect(factory.majorRadius).toBe(1)
    expect(factory.minorRadius).toBe(0.25)
  })

  test("is valid with minor < major", () => {
    expect(factory.isValid()).toBe(true)
  })

  test("is invalid with minor >= major", () => {
    factory.minorRadius = 1.5
    expect(factory.isValid()).toBe(false)
  })

  test("is invalid with equal radii", () => {
    factory.majorRadius = 1
    factory.minorRadius = 1
    expect(factory.isValid()).toBe(false)
  })

  test("toParams includes all properties", () => {
    factory.majorRadius = 5
    factory.minorRadius = 1

    expect(factory.toParams()).toEqual({
      x: 0,
      y: 0,
      z: 0,
      majorRadius: 5,
      minorRadius: 1,
    })
  })

  test("update calls correct CAD operation", async () => {
    factory.majorRadius = 5
    factory.minorRadius = 1

    await factory.update()

    expect(mockCadOps.createTorus).toHaveBeenCalledWith(0, 0, 0, 5, 1)
  })
})

// =============================================================================
// FACTORY REGISTRY TESTS
// =============================================================================

describe("createPrimitiveFactory", () => {
  test("creates BoxFactory for 'box'", () => {
    const factory = createPrimitiveFactory("box")
    expect(factory).toBeInstanceOf(BoxFactory)
    factory.dispose()
  })

  test("creates CylinderFactory for 'cylinder'", () => {
    const factory = createPrimitiveFactory("cylinder")
    expect(factory).toBeInstanceOf(CylinderFactory)
    factory.dispose()
  })

  test("creates SphereFactory for 'sphere'", () => {
    const factory = createPrimitiveFactory("sphere")
    expect(factory).toBeInstanceOf(SphereFactory)
    factory.dispose()
  })

  test("creates ConeFactory for 'cone'", () => {
    const factory = createPrimitiveFactory("cone")
    expect(factory).toBeInstanceOf(ConeFactory)
    factory.dispose()
  })

  test("creates TorusFactory for 'torus'", () => {
    const factory = createPrimitiveFactory("torus")
    expect(factory).toBeInstanceOf(TorusFactory)
    factory.dispose()
  })

  test("throws for unknown type", () => {
    expect(() => createPrimitiveFactory("unknown" as any)).toThrow()
  })
})
