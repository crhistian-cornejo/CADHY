/**
 * CAD Service Tests - @cadhy/desktop
 *
 * Tests for the CAD service that interfaces with OpenCASCADE:
 * - Helper functions (degreesToRadians, radiansToDegrees, getBoundingBoxDimensions)
 * - API function signatures
 * - CadService class structure
 *
 * Note: Actual Tauri invoke calls are mocked since they require the backend.
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import type { BoundingBox, ShapeResult } from "../core/services/SV_cad"

// Mock Tauri invoke before importing the service
const mockInvoke = mock(() => Promise.resolve({}))

mock.module("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}))

// Now import after mocking
import {
  CadService,
  cadService,
  degreesToRadians,
  getBoundingBoxDimensions,
  radiansToDegrees,
} from "../core/services/SV_cad"

describe("CAD Service", () => {
  beforeEach(() => {
    mockInvoke.mockClear()
  })

  // ============================================================
  // Helper Function Tests
  // ============================================================

  describe("degreesToRadians", () => {
    test("should convert 0 degrees to 0 radians", () => {
      expect(degreesToRadians(0)).toBe(0)
    })

    test("should convert 90 degrees to PI/2 radians", () => {
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 10)
    })

    test("should convert 180 degrees to PI radians", () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10)
    })

    test("should convert 360 degrees to 2*PI radians", () => {
      expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI, 10)
    })

    test("should convert 45 degrees to PI/4 radians", () => {
      expect(degreesToRadians(45)).toBeCloseTo(Math.PI / 4, 10)
    })

    test("should handle negative degrees", () => {
      expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2, 10)
    })
  })

  describe("radiansToDegrees", () => {
    test("should convert 0 radians to 0 degrees", () => {
      expect(radiansToDegrees(0)).toBe(0)
    })

    test("should convert PI/2 radians to 90 degrees", () => {
      expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 10)
    })

    test("should convert PI radians to 180 degrees", () => {
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 10)
    })

    test("should convert 2*PI radians to 360 degrees", () => {
      expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360, 10)
    })

    test("should handle negative radians", () => {
      expect(radiansToDegrees(-Math.PI)).toBeCloseTo(-180, 10)
    })
  })

  describe("Round-trip conversion", () => {
    test("degrees -> radians -> degrees should be identity", () => {
      const degrees = 123.456
      const result = radiansToDegrees(degreesToRadians(degrees))
      expect(result).toBeCloseTo(degrees, 10)
    })

    test("radians -> degrees -> radians should be identity", () => {
      const radians = 1.234
      const result = degreesToRadians(radiansToDegrees(radians))
      expect(result).toBeCloseTo(radians, 10)
    })
  })

  // ============================================================
  // Bounding Box Helper Tests
  // ============================================================

  describe("getBoundingBoxDimensions", () => {
    test("should calculate width correctly", () => {
      const bbox: BoundingBox = {
        min: [0, 0, 0],
        max: [10, 5, 3],
      }

      const dimensions = getBoundingBoxDimensions(bbox)
      expect(dimensions.width).toBe(10)
    })

    test("should calculate depth correctly", () => {
      const bbox: BoundingBox = {
        min: [0, 0, 0],
        max: [10, 5, 3],
      }

      const dimensions = getBoundingBoxDimensions(bbox)
      expect(dimensions.depth).toBe(5)
    })

    test("should calculate height correctly", () => {
      const bbox: BoundingBox = {
        min: [0, 0, 0],
        max: [10, 5, 3],
      }

      const dimensions = getBoundingBoxDimensions(bbox)
      expect(dimensions.height).toBe(3)
    })

    test("should calculate center correctly", () => {
      const bbox: BoundingBox = {
        min: [0, 0, 0],
        max: [10, 10, 10],
      }

      const dimensions = getBoundingBoxDimensions(bbox)
      expect(dimensions.center).toEqual([5, 5, 5])
    })

    test("should handle negative coordinates", () => {
      const bbox: BoundingBox = {
        min: [-5, -5, -5],
        max: [5, 5, 5],
      }

      const dimensions = getBoundingBoxDimensions(bbox)
      expect(dimensions.width).toBe(10)
      expect(dimensions.depth).toBe(10)
      expect(dimensions.height).toBe(10)
      expect(dimensions.center).toEqual([0, 0, 0])
    })

    test("should handle offset bounding box", () => {
      const bbox: BoundingBox = {
        min: [100, 200, 300],
        max: [110, 220, 340],
      }

      const dimensions = getBoundingBoxDimensions(bbox)
      expect(dimensions.width).toBe(10)
      expect(dimensions.depth).toBe(20)
      expect(dimensions.height).toBe(40)
      expect(dimensions.center).toEqual([105, 210, 320])
    })
  })

  // ============================================================
  // CadService Class Tests
  // ============================================================

  describe("CadService Class", () => {
    test("should have singleton instance", () => {
      expect(cadService).toBeDefined()
      expect(cadService).toBeInstanceOf(CadService)
    })

    test("should have primitive creation methods", () => {
      expect(typeof cadService.createBox).toBe("function")
      expect(typeof cadService.createBoxAt).toBe("function")
      expect(typeof cadService.createCylinder).toBe("function")
      expect(typeof cadService.createCylinderAt).toBe("function")
      expect(typeof cadService.createSphere).toBe("function")
      expect(typeof cadService.createSphereAt).toBe("function")
      expect(typeof cadService.createCone).toBe("function")
      expect(typeof cadService.createTorus).toBe("function")
      expect(typeof cadService.createWedge).toBe("function")
      expect(typeof cadService.createHelix).toBe("function")
      expect(typeof cadService.createPyramid).toBe("function")
      expect(typeof cadService.createEllipsoid).toBe("function")
      expect(typeof cadService.createVertex).toBe("function")
    })

    test("should have boolean operation methods", () => {
      expect(typeof cadService.booleanFuse).toBe("function")
      expect(typeof cadService.booleanCut).toBe("function")
      expect(typeof cadService.booleanCommon).toBe("function")
    })

    test("should have modification methods", () => {
      expect(typeof cadService.fillet).toBe("function")
      expect(typeof cadService.filletEdges).toBe("function")
      expect(typeof cadService.filletEdgesAdvanced).toBe("function")
      expect(typeof cadService.chamfer).toBe("function")
      expect(typeof cadService.chamferEdges).toBe("function")
      expect(typeof cadService.shell).toBe("function")
    })

    test("should have transform methods", () => {
      expect(typeof cadService.translate).toBe("function")
      expect(typeof cadService.rotate).toBe("function")
      expect(typeof cadService.scale).toBe("function")
      expect(typeof cadService.mirror).toBe("function")
    })

    test("should have advanced operation methods", () => {
      expect(typeof cadService.extrude).toBe("function")
      expect(typeof cadService.revolve).toBe("function")
      expect(typeof cadService.loft).toBe("function")
      expect(typeof cadService.pipe).toBe("function")
      expect(typeof cadService.pipeShell).toBe("function")
      expect(typeof cadService.offset).toBe("function")
    })

    test("should have curve creation methods", () => {
      expect(typeof cadService.createLine).toBe("function")
      expect(typeof cadService.createCircle).toBe("function")
      expect(typeof cadService.createArc).toBe("function")
      expect(typeof cadService.createRectangle).toBe("function")
      expect(typeof cadService.createPolygon2D).toBe("function")
      expect(typeof cadService.createPolygon3D).toBe("function")
      expect(typeof cadService.createBSpline).toBe("function")
      expect(typeof cadService.createBezier).toBe("function")
    })

    test("should have tessellation method", () => {
      expect(typeof cadService.tessellate).toBe("function")
    })

    test("should have topology method", () => {
      expect(typeof cadService.getTopology).toBe("function")
    })

    test("should have import/export methods", () => {
      expect(typeof cadService.importStep).toBe("function")
      expect(typeof cadService.exportStep).toBe("function")
      expect(typeof cadService.exportStl).toBe("function")
      expect(typeof cadService.exportObj).toBe("function")
      expect(typeof cadService.exportGlb).toBe("function")
    })

    test("should have utility methods", () => {
      expect(typeof cadService.analyze).toBe("function")
      expect(typeof cadService.measureDistance).toBe("function")
      expect(typeof cadService.deleteShape).toBe("function")
      expect(typeof cadService.clearAll).toBe("function")
      expect(typeof cadService.getShapeCount).toBe("function")
      expect(typeof cadService.simplify).toBe("function")
      expect(typeof cadService.combine).toBe("function")
    })

    test("should have helper methods", () => {
      expect(typeof cadService.degreesToRadians).toBe("function")
      expect(typeof cadService.radiansToDegrees).toBe("function")
      expect(typeof cadService.getBoundingBoxDimensions).toBe("function")
    })
  })

  // ============================================================
  // API Function Call Tests (with mocked invoke)
  // ============================================================

  describe("API Function Calls", () => {
    test("createBox should call invoke with correct parameters", async () => {
      const mockResult: ShapeResult = {
        id: "shape-123",
        analysis: {
          is_valid: true,
          num_vertices: 8,
          num_edges: 12,
          num_faces: 6,
          num_solids: 1,
          surface_area: 600,
          volume: 1000,
          bounding_box: { min: [0, 0, 0], max: [10, 10, 10] },
        },
      }
      mockInvoke.mockResolvedValueOnce(mockResult)

      const { createBox } = await import("../core/services/SV_cad")
      const result = await createBox(10, 10, 10)

      expect(mockInvoke).toHaveBeenCalledWith("cad_create_box", {
        width: 10,
        depth: 10,
        height: 10,
      })
      expect(result).toEqual(mockResult)
    })

    test("createCylinder should call invoke with correct parameters", async () => {
      const mockResult: ShapeResult = {
        id: "shape-456",
        analysis: {
          is_valid: true,
          num_vertices: 0,
          num_edges: 3,
          num_faces: 3,
          num_solids: 1,
          surface_area: 0,
          volume: 0,
          bounding_box: null,
        },
      }
      mockInvoke.mockResolvedValueOnce(mockResult)

      const { createCylinder } = await import("../core/services/SV_cad")
      await createCylinder(5, 20)

      expect(mockInvoke).toHaveBeenCalledWith("cad_create_cylinder", {
        radius: 5,
        height: 20,
      })
    })

    test("booleanFuse should call invoke with shape IDs", async () => {
      mockInvoke.mockResolvedValueOnce({ id: "result", analysis: {} })

      const { booleanFuse } = await import("../core/services/SV_cad")
      await booleanFuse("shape-1", "shape-2")

      expect(mockInvoke).toHaveBeenCalledWith("cad_boolean_fuse", {
        shape1Id: "shape-1",
        shape2Id: "shape-2",
      })
    })

    test("translate should call invoke with correct parameters", async () => {
      mockInvoke.mockResolvedValueOnce({ id: "result", analysis: {} })

      const { translate } = await import("../core/services/SV_cad")
      await translate("shape-1", 10, 20, 30)

      expect(mockInvoke).toHaveBeenCalledWith("cad_translate", {
        shapeId: "shape-1",
        dx: 10,
        dy: 20,
        dz: 30,
      })
    })

    test("rotate should call invoke with all parameters", async () => {
      mockInvoke.mockResolvedValueOnce({ id: "result", analysis: {} })

      const { rotate } = await import("../core/services/SV_cad")
      await rotate("shape-1", 0, 0, 0, 0, 0, 1, Math.PI / 2)

      expect(mockInvoke).toHaveBeenCalledWith("cad_rotate", {
        shapeId: "shape-1",
        originX: 0,
        originY: 0,
        originZ: 0,
        axisX: 0,
        axisY: 0,
        axisZ: 1,
        angleRadians: Math.PI / 2,
      })
    })

    test("fillet should call invoke with shapeId and radius", async () => {
      mockInvoke.mockResolvedValueOnce({ id: "result", analysis: {} })

      const { fillet } = await import("../core/services/SV_cad")
      await fillet("shape-1", 0.5)

      expect(mockInvoke).toHaveBeenCalledWith("cad_fillet", {
        shapeId: "shape-1",
        radius: 0.5,
      })
    })

    test("extrude should call invoke with direction vector", async () => {
      mockInvoke.mockResolvedValueOnce({ id: "result", analysis: {} })

      const { extrude } = await import("../core/services/SV_cad")
      await extrude("profile-1", 0, 0, 10)

      expect(mockInvoke).toHaveBeenCalledWith("cad_extrude", {
        shapeId: "profile-1",
        dx: 0,
        dy: 0,
        dz: 10,
      })
    })

    test("loft should call invoke with profile IDs and options", async () => {
      mockInvoke.mockResolvedValueOnce({ id: "result", analysis: {} })

      const { loft } = await import("../core/services/SV_cad")
      await loft(["profile-1", "profile-2", "profile-3"], true, false)

      expect(mockInvoke).toHaveBeenCalledWith("cad_loft", {
        profileIds: ["profile-1", "profile-2", "profile-3"],
        solid: true,
        ruled: false,
      })
    })

    test("deleteShape should call invoke with shapeId", async () => {
      mockInvoke.mockResolvedValueOnce(undefined)

      const { deleteShape } = await import("../core/services/SV_cad")
      await deleteShape("shape-1")

      expect(mockInvoke).toHaveBeenCalledWith("cad_delete_shape", {
        shapeId: "shape-1",
      })
    })

    test("clearAll should call invoke and return count", async () => {
      mockInvoke.mockResolvedValueOnce(5)

      const { clearAll } = await import("../core/services/SV_cad")
      const count = await clearAll()

      expect(mockInvoke).toHaveBeenCalledWith("cad_clear_all")
      expect(count).toBe(5)
    })
  })

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe("Error Handling", () => {
    test("tessellate should throw for missing shapeId", async () => {
      const { tessellate } = await import("../core/services/SV_cad")

      await expect(tessellate("")).rejects.toThrow("shapeId is required")
    })
  })
})
