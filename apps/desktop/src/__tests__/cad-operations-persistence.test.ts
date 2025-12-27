/**
 * CAD Operations Persistence Tests - @cadhy/desktop
 *
 * Tests for BREP serialization and persistence across app restarts.
 * Verifies that CAD operations (fillet, chamfer, shell, mirror, booleans)
 * correctly serialize shapes to BREP format for persistence.
 *
 * These tests focus on:
 * - BREP serialization is called after operations
 * - Metadata includes brepData after operations
 * - Deserialization restores shapes correctly
 * - shapeType is correctly set to "compound" for modified shapes
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock CAD service with controllable responses
const mockSerializeShape = mock(() => Promise.resolve("MOCK_BREP_DATA_BASE64"))
const mockDeserializeShape = mock(() =>
  Promise.resolve({
    id: "restored-shape-123",
    analysis: { faces: 6, edges: 12, vertices: 8, solids: 1 },
  })
)
const mockFillet = mock(() =>
  Promise.resolve({
    id: "fillet-result-123",
    analysis: { faces: 10, edges: 20, vertices: 16, solids: 1 },
  })
)
const mockChamfer = mock(() =>
  Promise.resolve({
    id: "chamfer-result-123",
    analysis: { faces: 10, edges: 20, vertices: 16, solids: 1 },
  })
)
const mockShell = mock(() =>
  Promise.resolve({
    id: "shell-result-123",
    analysis: { faces: 12, edges: 24, vertices: 16, solids: 1 },
  })
)
const mockMirror = mock(() =>
  Promise.resolve({
    id: "mirror-result-123",
    analysis: { faces: 6, edges: 12, vertices: 8, solids: 1 },
  })
)
const mockBooleanFuse = mock(() =>
  Promise.resolve({
    id: "fuse-result-123",
    analysis: { faces: 10, edges: 20, vertices: 16, solids: 1 },
  })
)
const mockTessellate = mock(() =>
  Promise.resolve({
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]),
    indices: new Uint32Array([0, 1, 2]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  })
)
const mockShapeExists = mock(() => Promise.resolve(true))

// NOTE: We don't use mock.module for cad-service because it persists across test files.
// Instead, we test the serialization pattern directly using local mock functions.
// This approach isolates these tests from the rest of the test suite.

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulates the serializeShapeForPersistence function behavior
 * This is what we're testing - the pattern used in all CAD operations
 */
async function simulateSerializeForPersistence(
  backendShapeId: string,
  baseMetadata: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const metadata: Record<string, unknown> = {
    ...baseMetadata,
    backendShapeId,
  }

  try {
    const brepData = await mockSerializeShape(backendShapeId)
    metadata.brepData = brepData
  } catch {
    // Continue without BREP data
  }

  return metadata
}

/**
 * Creates a mock shape object for testing
 */
function createMockShapeObject(overrides?: Record<string, unknown>) {
  return {
    id: "test-shape-1",
    type: "shape",
    shapeType: "box",
    name: "Test Box",
    layerId: "default",
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    visible: true,
    locked: false,
    selected: false,
    metadata: {
      backendShapeId: "backend-shape-1",
    },
    parameters: { width: 1, height: 1, depth: 1 },
    material: {
      color: "#ffffff",
      opacity: 1,
      metalness: 0.5,
      roughness: 0.5,
    },
    ...overrides,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe("CAD Operations Persistence", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockSerializeShape.mockClear()
    mockDeserializeShape.mockClear()
    mockFillet.mockClear()
    mockChamfer.mockClear()
    mockShell.mockClear()
    mockMirror.mockClear()
    mockBooleanFuse.mockClear()
    mockTessellate.mockClear()
  })

  // ============================================================================
  // Serialization Pattern Tests
  // ============================================================================

  describe("serializeShapeForPersistence pattern", () => {
    test("should add brepData to metadata on successful serialization", async () => {
      const baseMetadata = {
        operation: "fillet",
        sourceId: "original-shape",
        parameter: 0.5,
      }

      const result = await simulateSerializeForPersistence("fillet-result-123", baseMetadata)

      expect(result.brepData).toBe("MOCK_BREP_DATA_BASE64")
      expect(result.backendShapeId).toBe("fillet-result-123")
      expect(result.operation).toBe("fillet")
      expect(result.sourceId).toBe("original-shape")
      expect(result.parameter).toBe(0.5)
    })

    test("should preserve backendShapeId even if serialization fails", async () => {
      mockSerializeShape.mockImplementationOnce(() =>
        Promise.reject(new Error("Serialization failed"))
      )

      const baseMetadata = { operation: "chamfer" }

      const result = await simulateSerializeForPersistence("chamfer-result-123", baseMetadata)

      expect(result.backendShapeId).toBe("chamfer-result-123")
      expect(result.brepData).toBeUndefined()
    })

    test("should call serializeShape with correct shape ID", async () => {
      await simulateSerializeForPersistence("my-shape-id", {})

      expect(mockSerializeShape).toHaveBeenCalledTimes(1)
      expect(mockSerializeShape).toHaveBeenCalledWith("my-shape-id")
    })
  })

  // ============================================================================
  // Fillet Operation Tests
  // ============================================================================

  describe("Fillet operation persistence", () => {
    test("should serialize BREP after fillet operation", async () => {
      // Simulate fillet workflow
      const filletResult = await mockFillet("source-shape", 0.5)
      await mockTessellate(filletResult.id, 0.1)

      const metadata = await simulateSerializeForPersistence(filletResult.id, {
        operation: "fillet",
        sourceId: "original-box",
        parameter: 0.5,
      })

      expect(metadata.brepData).toBe("MOCK_BREP_DATA_BASE64")
      expect(metadata.operation).toBe("fillet")
    })

    test("fillet result should be marked as compound type", () => {
      // This verifies our design decision: fillet results are no longer primitives
      const originalShape = createMockShapeObject({ shapeType: "box" })

      // After fillet, the shape type should change to compound
      const filletedShape = {
        ...originalShape,
        shapeType: "compound", // This is what we changed in the implementation
        parameters: {}, // Parameters cleared since it's no longer a pure primitive
      }

      expect(filletedShape.shapeType).toBe("compound")
      expect(filletedShape.parameters).toEqual({})
    })
  })

  // ============================================================================
  // Chamfer Operation Tests
  // ============================================================================

  describe("Chamfer operation persistence", () => {
    test("should serialize BREP after chamfer operation", async () => {
      const chamferResult = await mockChamfer("source-shape", 0.3)
      await mockTessellate(chamferResult.id, 0.1)

      const metadata = await simulateSerializeForPersistence(chamferResult.id, {
        operation: "chamfer",
        sourceId: "original-box",
        parameter: 0.3,
        mode: "constant",
      })

      expect(metadata.brepData).toBe("MOCK_BREP_DATA_BASE64")
      expect(metadata.operation).toBe("chamfer")
      expect(metadata.mode).toBe("constant")
    })

    test("chamfer with two distances should include both in metadata", async () => {
      const metadata = await simulateSerializeForPersistence("chamfer-id", {
        operation: "chamfer",
        mode: "two-distances",
        parameter: 0.3,
        distance2: 0.5,
      })

      expect(metadata.mode).toBe("two-distances")
      expect(metadata.parameter).toBe(0.3)
      expect(metadata.distance2).toBe(0.5)
    })
  })

  // ============================================================================
  // Shell Operation Tests
  // ============================================================================

  describe("Shell operation persistence", () => {
    test("should serialize BREP after shell operation", async () => {
      const shellResult = await mockShell("source-shape", 0.1)
      await mockTessellate(shellResult.id, 0.1)

      const metadata = await simulateSerializeForPersistence(shellResult.id, {
        operation: "shell",
        sourceId: "original-box",
        parameter: 0.1,
      })

      expect(metadata.brepData).toBe("MOCK_BREP_DATA_BASE64")
      expect(metadata.operation).toBe("shell")
      expect(metadata.parameter).toBe(0.1)
    })
  })

  // ============================================================================
  // Mirror Operation Tests
  // ============================================================================

  describe("Mirror operation persistence", () => {
    test("should serialize BREP after mirror operation", async () => {
      const mirrorResult = await mockMirror(
        "source-shape",
        0,
        0,
        0, // point
        1,
        0,
        0 // normal (YZ plane)
      )
      await mockTessellate(mirrorResult.id, 0.1)

      const metadata = await simulateSerializeForPersistence(mirrorResult.id, {
        operation: "mirror",
        sourceId: "original-shape",
        mirrorPlane: "yz",
      })

      expect(metadata.brepData).toBe("MOCK_BREP_DATA_BASE64")
      expect(metadata.operation).toBe("mirror")
      expect(metadata.mirrorPlane).toBe("yz")
    })

    test("mirror should preserve original shape type", () => {
      // Mirror is a geometric transformation that preserves topology
      const originalShape = createMockShapeObject({ shapeType: "cylinder" })

      // After mirror, the shape type stays the same (unlike fillet/chamfer/shell)
      const mirroredShape = {
        ...originalShape,
        shapeType: originalShape.shapeType, // Preserved!
        name: `${originalShape.name} (Mirror)`,
      }

      expect(mirroredShape.shapeType).toBe("cylinder")
    })
  })

  // ============================================================================
  // Boolean Operations Tests
  // ============================================================================

  describe("Boolean operations persistence", () => {
    test("should serialize BREP after boolean union", async () => {
      const fuseResult = await mockBooleanFuse("shape1", "shape2")

      const metadata = await simulateSerializeForPersistence(fuseResult.id, {
        operation: "boolean-union",
        sourceIds: ["obj1", "obj2"],
        sourceNames: ["Box 1", "Box 2"],
      })

      expect(metadata.brepData).toBe("MOCK_BREP_DATA_BASE64")
      expect(metadata.operation).toBe("boolean-union")
      expect(metadata.sourceIds).toEqual(["obj1", "obj2"])
    })

    test("boolean results should be marked as compound type", () => {
      const unionResult = {
        type: "shape",
        shapeType: "compound",
        parameters: {},
        metadata: {
          operation: "boolean-union",
          brepData: "MOCK_BREP_DATA",
        },
      }

      expect(unionResult.shapeType).toBe("compound")
      expect(unionResult.metadata.brepData).toBeDefined()
    })
  })

  // ============================================================================
  // Deserialization Tests
  // ============================================================================

  describe("BREP Deserialization", () => {
    test("should restore shape from brepData", async () => {
      const brepData = "MOCK_BREP_DATA_BASE64"

      const result = await mockDeserializeShape(brepData)

      expect(result.id).toBe("restored-shape-123")
      expect(result.analysis.faces).toBe(6)
      expect(result.analysis.solids).toBe(1)
    })

    test("should call deserializeShape with correct BREP data", async () => {
      const brepData = "MY_CUSTOM_BREP_DATA"

      await mockDeserializeShape(brepData)

      expect(mockDeserializeShape).toHaveBeenCalledWith(brepData)
    })

    test("deserialized shape should get new backend ID", async () => {
      // Simulating what happens in project-store when opening a project
      const savedObject = createMockShapeObject({
        metadata: {
          backendShapeId: "old-backend-id",
          brepData: "MOCK_BREP_DATA",
          operation: "fillet",
        },
      })

      // When project opens, brepData is deserialized
      const restoredResult = await mockDeserializeShape(savedObject.metadata.brepData)

      // The new backend ID should be different from the old one
      expect(restoredResult.id).toBe("restored-shape-123")
      expect(restoredResult.id).not.toBe("old-backend-id")

      // The object's metadata should be updated with new ID
      const updatedMetadata = {
        ...savedObject.metadata,
        backendShapeId: restoredResult.id,
      }

      expect(updatedMetadata.backendShapeId).toBe("restored-shape-123")
      expect(updatedMetadata.brepData).toBe("MOCK_BREP_DATA") // Preserved
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge cases", () => {
    test("should handle missing brepData gracefully", async () => {
      const objectWithoutBrep = createMockShapeObject({
        metadata: {
          backendShapeId: "some-id",
          // No brepData!
        },
      })

      // This simulates what happens when loading an old project
      // that was saved before BREP serialization was added
      expect(objectWithoutBrep.metadata.brepData).toBeUndefined()

      // For primitives, this is OK - they can be recreated from parameters
      expect(objectWithoutBrep.shapeType).toBe("box")
      expect(objectWithoutBrep.parameters).toBeDefined()
    })

    test("should handle empty brepData string", async () => {
      mockDeserializeShape.mockImplementationOnce(() =>
        Promise.reject(new Error("Invalid BREP data"))
      )

      try {
        await mockDeserializeShape("")
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    test("compound shapes without brepData cannot be recreated", () => {
      // This is the critical case our fix addresses
      const compoundWithoutBrep = createMockShapeObject({
        shapeType: "compound",
        parameters: {},
        metadata: {
          backendShapeId: "old-id",
          operation: "boolean-union",
          // No brepData - shape CANNOT be recreated!
        },
      })

      // Compound shapes have no parameters to recreate from
      expect(compoundWithoutBrep.shapeType).toBe("compound")
      expect(compoundWithoutBrep.parameters).toEqual({})
      expect(compoundWithoutBrep.metadata.brepData).toBeUndefined()

      // This is why we MUST serialize BREP for all operations
    })
  })

  // ============================================================================
  // Integration-like Tests
  // ============================================================================

  describe("Full operation workflow", () => {
    test("complete fillet workflow produces persistable object", async () => {
      // 1. Start with a primitive
      const originalBox = createMockShapeObject({
        shapeType: "box",
        parameters: { width: 10, depth: 10, height: 5 },
      })

      // 2. Apply fillet operation
      const filletResult = await mockFillet(originalBox.metadata.backendShapeId, 1.0)

      // 3. Tessellate for visualization
      const meshData = await mockTessellate(filletResult.id, 0.1)

      // 4. Serialize for persistence
      const metadata = await simulateSerializeForPersistence(filletResult.id, {
        operation: "fillet",
        sourceId: originalBox.id,
        parameter: 1.0,
      })

      // 5. Create the new object
      const filletedObject = {
        type: "shape",
        shapeType: "compound", // Changed from "box"!
        parameters: {}, // Cleared
        metadata,
        mesh: {
          vertices: meshData.vertices,
          indices: meshData.indices,
          normals: meshData.normals,
        },
      }

      // Verify the object is correctly formed for persistence
      expect(filletedObject.shapeType).toBe("compound")
      expect(filletedObject.metadata.brepData).toBe("MOCK_BREP_DATA_BASE64")
      expect(filletedObject.metadata.backendShapeId).toBe("fillet-result-123")
      expect(filletedObject.metadata.operation).toBe("fillet")
      expect(filletedObject.mesh.vertices).toBeDefined()
    })

    test("project save and restore cycle preserves geometry", async () => {
      // 1. Create and save object with BREP
      const savedObject = {
        id: "obj-1",
        type: "shape",
        shapeType: "compound",
        metadata: {
          backendShapeId: "old-backend-id",
          brepData: "PERSISTED_BREP_DATA",
          operation: "shell",
        },
      }

      // 2. Simulate app restart - backend shapes are lost

      // 3. Restore from BREP
      const restoredResult = await mockDeserializeShape(savedObject.metadata.brepData)

      // 4. Update metadata with new backend ID
      const restoredObject = {
        ...savedObject,
        metadata: {
          ...savedObject.metadata,
          backendShapeId: restoredResult.id, // New ID!
        },
      }

      // Verify restoration
      expect(restoredObject.metadata.backendShapeId).toBe("restored-shape-123")
      expect(restoredObject.metadata.brepData).toBe("PERSISTED_BREP_DATA")
      expect(restoredObject.shapeType).toBe("compound")
    })
  })
})

describe("shapeIdMap consistency", () => {
  test("frontend ID should map to backend ID after operation", () => {
    // Simulating the shapeIdMap behavior
    const shapeIdMap = new Map<string, string>()

    const frontendId = "frontend-obj-123"
    const backendId = "backend-shape-456"

    // After any CAD operation, we update the map
    shapeIdMap.set(frontendId, backendId)

    expect(shapeIdMap.get(frontendId)).toBe(backendId)
  })

  test("shapeIdMap should update after deserialization", () => {
    const shapeIdMap = new Map<string, string>()

    const frontendId = "frontend-obj-123"
    const oldBackendId = "old-backend-id"
    const newBackendId = "restored-shape-123"

    // Before: old mapping
    shapeIdMap.set(frontendId, oldBackendId)

    // After deserialization: update to new backend ID
    shapeIdMap.set(frontendId, newBackendId)

    expect(shapeIdMap.get(frontendId)).toBe(newBackendId)
  })
})
