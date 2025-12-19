/**
 * useCAD Hook - CADHY
 *
 * Connects the CAD service (Rust backend) with the modeller store (React state).
 * Creates shapes via OpenCASCADE and adds them to the 3D scene.
 */

import { logger } from "@cadhy/shared/logger"
import { useCallback } from "react"
import {
  booleanCommon,
  booleanCut,
  booleanFuse,
  type CadMeshData,
  clearAll as clearBackendShapes,
  createBox,
  createCone,
  createCylinder,
  createSphere,
  createTorus,
  deleteShape as deleteBackendShape,
  tessellate,
} from "@/services/cad-service"
import { type ShapeObject, useModellerStore } from "@/stores/modeller-store"

// ============================================================================
// TYPES
// ============================================================================

interface CreateBoxOptions {
  width: number
  depth: number
  height: number
  name?: string
  color?: string
}

interface CreateCylinderOptions {
  radius: number
  height: number
  name?: string
  color?: string
}

interface CreateSphereOptions {
  radius: number
  name?: string
  color?: string
}

interface CreateConeOptions {
  baseRadius: number
  topRadius?: number
  height: number
  name?: string
  color?: string
}

interface CreateTorusOptions {
  majorRadius: number
  minorRadius: number
  name?: string
  color?: string
}

interface CreateWedgeOptions {
  dx: number
  dy: number
  dz: number
  ltx: number
  name?: string
  color?: string
}

// Map to track backend shape IDs for scene objects
export const shapeIdMap = new Map<string, string>() // sceneObjectId -> backendShapeId

// ============================================================================
// HOOK
// ============================================================================

export function useCAD() {
  const addObject = useModellerStore((s) => s.addObject)
  const deleteObject = useModellerStore((s) => s.deleteObject)
  const _updateObject = useModellerStore((s) => s.updateObject)
  const getObjectById = useModellerStore((s) => s.getObjectById)
  const select = useModellerStore((s) => s.select)

  /**
   * Convert CadMeshData to the format expected by the store
   */
  const convertMeshData = useCallback((meshData: CadMeshData) => {
    return {
      vertices: meshData.vertices,
      indices: meshData.indices,
      normals: meshData.normals ?? undefined,
      vertexCount: meshData.vertex_count,
      triangleCount: meshData.triangle_count,
    }
  }, [])

  /**
   * Create a box shape
   */
  const createBoxShape = useCallback(
    async (options: CreateBoxOptions): Promise<string | null> => {
      try {
        const { width, depth, height, name = "Box", color = "#6366f1" } = options

        logger.log("[useCAD] Creating box:", { width, depth, height })
        // Create shape in backend
        const result = await createBox(width, depth, height)
        logger.log("[useCAD] createBox result:", result)

        if (!result || !result.id) {
          throw new Error("createBox returned invalid result - missing id")
        }

        // Tessellate for rendering
        logger.log("[useCAD] Tessellating shape with id:", result.id)
        const meshData = await tessellate(result.id, 0.1)
        logger.log("[useCAD] Tessellation complete, vertices:", meshData.vertex_count)

        // Create scene object
        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name,
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "box",
          parameters: { width, depth, height },
          mesh: convertMeshData(meshData),
          material: {
            color,
            opacity: 1,
            metalness: 0.1,
            roughness: 0.6,
          },
          transform: {
            position: { x: 0, y: height / 2, z: 0 }, // Center at base
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          metadata: {
            backendShapeId: result.id,
            analysis: result.analysis,
          },
        }

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, result.id)
        select(sceneId)

        return sceneId
      } catch (error) {
        console.error("Failed to create box:", error)
        return null
      }
    },
    [addObject, select, convertMeshData]
  )

  /**
   * Create a cylinder shape
   */
  const createCylinderShape = useCallback(
    async (options: CreateCylinderOptions): Promise<string | null> => {
      try {
        const { radius, height, name = "Cylinder", color = "#22c55e" } = options

        logger.log("[useCAD] Creating cylinder:", { radius, height })
        const result = await createCylinder(radius, height)
        logger.log("[useCAD] createCylinder result:", result)

        if (!result || !result.id) {
          throw new Error("createCylinder returned invalid result - missing id")
        }

        logger.log("[useCAD] Tessellating shape with id:", result.id)
        const meshData = await tessellate(result.id, 0.1)
        logger.log("[useCAD] Tessellation complete, vertices:", meshData.vertex_count)

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name,
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "cylinder",
          parameters: { radius, height },
          mesh: convertMeshData(meshData),
          material: {
            color,
            opacity: 1,
            metalness: 0.1,
            roughness: 0.6,
          },
          transform: {
            position: { x: 0, y: height / 2, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          metadata: {
            backendShapeId: result.id,
            analysis: result.analysis,
          },
        }

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, result.id)
        select(sceneId)

        return sceneId
      } catch (error) {
        console.error("Failed to create cylinder:", error)
        return null
      }
    },
    [addObject, select, convertMeshData]
  )

  /**
   * Create a sphere shape
   */
  const createSphereShape = useCallback(
    async (options: CreateSphereOptions): Promise<string | null> => {
      try {
        const { radius, name = "Sphere", color = "#f59e0b" } = options

        logger.log("[useCAD] Creating sphere with radius:", radius)
        const result = await createSphere(radius)
        logger.log("[useCAD] createSphere result:", result)

        if (!result || !result.id) {
          console.error("[useCAD] createSphere returned invalid result:", result)
          throw new Error("createSphere returned invalid result - missing id")
        }

        logger.log("[useCAD] Tessellating shape with id:", result.id)
        const meshData = await tessellate(result.id, 0.1)
        logger.log("[useCAD] Tessellation complete, vertices:", meshData.vertex_count)

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name,
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "sphere",
          parameters: { radius },
          mesh: convertMeshData(meshData),
          material: {
            color,
            opacity: 1,
            metalness: 0.2,
            roughness: 0.4,
          },
          transform: {
            position: { x: 0, y: radius, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          metadata: {
            backendShapeId: result.id,
            analysis: result.analysis,
          },
        }

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, result.id)
        select(sceneId)

        return sceneId
      } catch (error) {
        console.error("Failed to create sphere:", error)
        return null
      }
    },
    [addObject, select, convertMeshData]
  )

  /**
   * Create a cone shape
   */
  const createConeShape = useCallback(
    async (options: CreateConeOptions): Promise<string | null> => {
      try {
        const { baseRadius, topRadius = 0, height, name = "Cone", color = "#ec4899" } = options

        const result = await createCone(baseRadius, topRadius, height)
        const meshData = await tessellate(result.id, 0.1)

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name,
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "cone",
          parameters: { baseRadius, topRadius, height },
          mesh: convertMeshData(meshData),
          material: {
            color,
            opacity: 1,
            metalness: 0.1,
            roughness: 0.6,
          },
          transform: {
            position: { x: 0, y: height / 2, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          metadata: {
            backendShapeId: result.id,
            analysis: result.analysis,
          },
        }

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, result.id)
        select(sceneId)

        return sceneId
      } catch (error) {
        console.error("Failed to create cone:", error)
        return null
      }
    },
    [addObject, select, convertMeshData]
  )

  /**
   * Create a torus shape
   */
  const createTorusShape = useCallback(
    async (options: CreateTorusOptions): Promise<string | null> => {
      try {
        const { majorRadius, minorRadius, name = "Torus", color = "#8b5cf6" } = options

        const result = await createTorus(majorRadius, minorRadius)
        const meshData = await tessellate(result.id, 0.1)

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name,
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "torus",
          parameters: { majorRadius, minorRadius },
          mesh: convertMeshData(meshData),
          material: {
            color,
            opacity: 1,
            metalness: 0.3,
            roughness: 0.4,
          },
          transform: {
            position: { x: 0, y: majorRadius + minorRadius, z: 0 },
            rotation: { x: 90, y: 0, z: 0 }, // Lay flat
            scale: { x: 1, y: 1, z: 1 },
          },
          metadata: {
            backendShapeId: result.id,
            analysis: result.analysis,
          },
        }

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, result.id)
        select(sceneId)

        return sceneId
      } catch (error) {
        console.error("Failed to create torus:", error)
        return null
      }
    },
    [addObject, select, convertMeshData]
  )

  /**
   * Boolean fuse (union) two shapes
   */
  const fuseShapes = useCallback(
    async (sceneId1: string, sceneId2: string, name?: string): Promise<string | null> => {
      try {
        const backendId1 = shapeIdMap.get(sceneId1)
        const backendId2 = shapeIdMap.get(sceneId2)

        if (!backendId1 || !backendId2) {
          console.error("Backend shape IDs not found")
          return null
        }

        const result = await booleanFuse(backendId1, backendId2)
        const meshData = await tessellate(result.id, 0.1)

        // Get original objects for properties
        const obj1 = getObjectById(sceneId1) as ShapeObject | undefined

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name: name ?? "Fused Shape",
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "box", // Generic
          parameters: {},
          mesh: convertMeshData(meshData),
          material: obj1?.material ?? {
            color: "#6366f1",
            opacity: 1,
            metalness: 0.1,
            roughness: 0.6,
          },
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          metadata: {
            backendShapeId: result.id,
            analysis: result.analysis,
            operation: "fuse",
            sourceIds: [sceneId1, sceneId2],
          },
        }

        // Delete original objects
        deleteObject(sceneId1)
        deleteObject(sceneId2)

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, result.id)
        select(sceneId)

        return sceneId
      } catch (error) {
        console.error("Failed to fuse shapes:", error)
        return null
      }
    },
    [addObject, deleteObject, getObjectById, select, convertMeshData]
  )

  /**
   * Boolean cut (difference) - subtract shape2 from shape1
   */
  const cutShapes = useCallback(
    async (sceneId1: string, sceneId2: string, name?: string): Promise<string | null> => {
      try {
        const backendId1 = shapeIdMap.get(sceneId1)
        const backendId2 = shapeIdMap.get(sceneId2)

        if (!backendId1 || !backendId2) {
          console.error("Backend shape IDs not found")
          return null
        }

        const result = await booleanCut(backendId1, backendId2)
        const meshData = await tessellate(result.id, 0.1)

        const obj1 = getObjectById(sceneId1) as ShapeObject | undefined

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name: name ?? "Cut Shape",
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "box",
          parameters: {},
          mesh: convertMeshData(meshData),
          material: obj1?.material ?? {
            color: "#6366f1",
            opacity: 1,
            metalness: 0.1,
            roughness: 0.6,
          },
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          metadata: {
            backendShapeId: result.id,
            analysis: result.analysis,
            operation: "cut",
            sourceIds: [sceneId1, sceneId2],
          },
        }

        deleteObject(sceneId1)
        deleteObject(sceneId2)

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, result.id)
        select(sceneId)

        return sceneId
      } catch (error) {
        console.error("Failed to cut shapes:", error)
        return null
      }
    },
    [addObject, deleteObject, getObjectById, select, convertMeshData]
  )

  /**
   * Boolean intersection (common)
   */
  const intersectShapes = useCallback(
    async (sceneId1: string, sceneId2: string, name?: string): Promise<string | null> => {
      try {
        const backendId1 = shapeIdMap.get(sceneId1)
        const backendId2 = shapeIdMap.get(sceneId2)

        if (!backendId1 || !backendId2) {
          console.error("Backend shape IDs not found")
          return null
        }

        const result = await booleanCommon(backendId1, backendId2)
        const meshData = await tessellate(result.id, 0.1)

        const obj1 = getObjectById(sceneId1) as ShapeObject | undefined

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name: name ?? "Intersection",
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "box",
          parameters: {},
          mesh: convertMeshData(meshData),
          material: obj1?.material ?? {
            color: "#6366f1",
            opacity: 1,
            metalness: 0.1,
            roughness: 0.6,
          },
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          metadata: {
            backendShapeId: result.id,
            analysis: result.analysis,
            operation: "intersect",
            sourceIds: [sceneId1, sceneId2],
          },
        }

        deleteObject(sceneId1)
        deleteObject(sceneId2)

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, result.id)
        select(sceneId)

        return sceneId
      } catch (error) {
        console.error("Failed to intersect shapes:", error)
        return null
      }
    },
    [addObject, deleteObject, getObjectById, select, convertMeshData]
  )

  /**
   * Clean up backend shapes when scene object is deleted
   */
  const cleanupShape = useCallback(async (sceneId: string) => {
    const backendId = shapeIdMap.get(sceneId)
    if (backendId) {
      try {
        await deleteBackendShape(backendId)
        shapeIdMap.delete(sceneId)
      } catch (error) {
        console.error("Failed to cleanup backend shape:", error)
      }
    }
  }, [])

  /**
   * Clear all backend shapes
   */
  const clearAllShapes = useCallback(async () => {
    try {
      await clearBackendShapes()
      shapeIdMap.clear()
    } catch (error) {
      console.error("Failed to clear backend shapes:", error)
    }
  }, [])

  return {
    // Primitives
    createBoxShape,
    createCylinderShape,
    createSphereShape,
    createConeShape,
    createTorusShape,

    // Boolean operations
    fuseShapes,
    cutShapes,
    intersectShapes,

    // Utility
    cleanupShape,
    clearAllShapes,
  }
}

export default useCAD
