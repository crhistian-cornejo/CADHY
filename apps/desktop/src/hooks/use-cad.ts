/**
 * useCAD Hook - CADHY
 *
 * Connects the CAD service (Rust backend) with the modeller store (React state).
 * Creates shapes via OpenCASCADE and adds them to the 3D scene.
 */

import { logger } from "@cadhy/shared/logger"
import { toast } from "@cadhy/ui"
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
  degreesToRadians,
  deleteShape as deleteBackendShape,
  importStep,
  rotate,
  type ShapeResult,
  scale,
  serializeShape,
  shapeExists,
  simplify,
  tessellate,
  translate,
} from "@/services/cad-service"
import { type ShapeObject, useModellerStore } from "@/stores/modeller"

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
  const saveStateBeforeAction = useModellerStore((s) => s.saveStateBeforeAction)
  const commitToHistory = useModellerStore((s) => s.commitToHistory)

  /**
   * Ensure a shape exists in the backend, recreating it if necessary
   * This handles the case where the app was restarted and shapes were lost
   */
  const ensureShapeInBackend = useCallback(
    async (sceneId: string): Promise<string | null> => {
      const currentBackendId = shapeIdMap.get(sceneId)

      // If we have a backend ID, check if it still exists
      if (currentBackendId) {
        try {
          const exists = await shapeExists(currentBackendId)
          if (exists) {
            logger.log("[useCAD] Shape exists in backend:", currentBackendId)
            return currentBackendId
          }
          logger.log("[useCAD] Shape no longer exists in backend, will recreate:", currentBackendId)
        } catch (error) {
          logger.warn("[useCAD] Error checking shape existence:", error)
        }
      }

      // Shape doesn't exist, need to recreate it
      const obj = getObjectById(sceneId) as ShapeObject | undefined
      if (!obj) {
        logger.error("[useCAD] Cannot find scene object to recreate:", sceneId)
        return null
      }

      logger.log("[useCAD] Recreating shape in backend:", obj.shapeType, obj.parameters)

      let result: ShapeResult | null = null

      try {
        switch (obj.shapeType) {
          case "box": {
            const { width = 1, depth = 1, height = 1 } = obj.parameters
            result = await createBox(width, depth, height)
            break
          }
          case "cylinder": {
            const { radius = 0.5, height = 1 } = obj.parameters
            result = await createCylinder(radius, height)
            break
          }
          case "sphere": {
            const { radius = 0.5 } = obj.parameters
            result = await createSphere(radius)
            break
          }
          case "cone": {
            const { bottomRadius = 0.5, topRadius = 0, height = 1 } = obj.parameters
            result = await createCone(bottomRadius, topRadius, height)
            break
          }
          case "torus": {
            const { majorRadius = 1, minorRadius = 0.3 } = obj.parameters
            result = await createTorus(majorRadius, minorRadius)
            break
          }
          default:
            logger.error("[useCAD] Cannot recreate shape of type:", obj.shapeType)
            return null
        }

        if (result && result.id) {
          // Update the shape ID map with the new backend ID
          shapeIdMap.set(sceneId, result.id)
          logger.log("[useCAD] Shape recreated successfully:", result.id)
          return result.id
        }
      } catch (error) {
        logger.error("[useCAD] Failed to recreate shape:", error)
      }

      return null
    },
    [getObjectById]
  )

  /**
   * Convert CadMeshData to the format expected by the store
   * Converts number arrays to TypedArrays for proper Three.js compatibility
   */
  const convertMeshData = useCallback((meshData: CadMeshData) => {
    return {
      vertices: Array.isArray(meshData.vertices)
        ? new Float32Array(meshData.vertices)
        : meshData.vertices instanceof Float32Array
          ? meshData.vertices
          : new Float32Array(0),
      indices: Array.isArray(meshData.indices)
        ? new Uint32Array(meshData.indices)
        : meshData.indices instanceof Uint32Array
          ? meshData.indices
          : new Uint32Array(0),
      normals: meshData.normals
        ? Array.isArray(meshData.normals)
          ? new Float32Array(meshData.normals)
          : meshData.normals instanceof Float32Array
            ? meshData.normals
            : new Float32Array(0)
        : new Float32Array(0),
      vertexCount: meshData.vertex_count,
      triangleCount: meshData.triangle_count,
    }
  }, [])

  /**
   * Calculate bounding box from mesh vertices
   * Used for box selection and other spatial queries
   */
  const calculateBBoxFromVertices = useCallback((vertices: Float32Array) => {
    if (vertices.length < 3) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }
    }

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i] ?? 0
      const y = vertices[i + 1] ?? 0
      const z = vertices[i + 2] ?? 0

      if (x < minX) minX = x
      if (y < minY) minY = y
      if (z < minZ) minZ = z
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (z > maxZ) maxZ = z
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
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

        // Convert mesh data and calculate bbox
        const mesh = convertMeshData(meshData)
        const localBBox = calculateBBoxFromVertices(mesh.vertices)

        // Offset bbox by transform position
        const posY = height / 2
        const bbox = {
          min: { x: localBBox.min.x, y: localBBox.min.y + posY, z: localBBox.min.z },
          max: { x: localBBox.max.x, y: localBBox.max.y + posY, z: localBBox.max.z },
        }

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
          mesh,
          bbox,
          material: {
            color,
            opacity: 1,
            metalness: 0.1,
            roughness: 0.6,
          },
          transform: {
            position: { x: 0, y: posY, z: 0 }, // Center at base
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
    [addObject, select, convertMeshData, calculateBBoxFromVertices]
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

        // Convert mesh data and calculate bbox
        const mesh = convertMeshData(meshData)
        const localBBox = calculateBBoxFromVertices(mesh.vertices)
        const posY = height / 2
        const bbox = {
          min: { x: localBBox.min.x, y: localBBox.min.y + posY, z: localBBox.min.z },
          max: { x: localBBox.max.x, y: localBBox.max.y + posY, z: localBBox.max.z },
        }

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name,
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "cylinder",
          parameters: { radius, height },
          mesh,
          bbox,
          material: {
            color,
            opacity: 1,
            metalness: 0.1,
            roughness: 0.6,
          },
          transform: {
            position: { x: 0, y: posY, z: 0 },
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
    [addObject, select, convertMeshData, calculateBBoxFromVertices]
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

        // Convert mesh data and calculate bbox
        const mesh = convertMeshData(meshData)
        const localBBox = calculateBBoxFromVertices(mesh.vertices)
        const posY = radius
        const bbox = {
          min: { x: localBBox.min.x, y: localBBox.min.y + posY, z: localBBox.min.z },
          max: { x: localBBox.max.x, y: localBBox.max.y + posY, z: localBBox.max.z },
        }

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name,
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "sphere",
          parameters: { radius },
          mesh,
          bbox,
          material: {
            color,
            opacity: 1,
            metalness: 0.2,
            roughness: 0.4,
          },
          transform: {
            position: { x: 0, y: posY, z: 0 },
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
    [addObject, select, convertMeshData, calculateBBoxFromVertices]
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

        // Convert mesh data and calculate bbox
        const mesh = convertMeshData(meshData)
        const localBBox = calculateBBoxFromVertices(mesh.vertices)
        const posY = height / 2
        const bbox = {
          min: { x: localBBox.min.x, y: localBBox.min.y + posY, z: localBBox.min.z },
          max: { x: localBBox.max.x, y: localBBox.max.y + posY, z: localBBox.max.z },
        }

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name,
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "cone",
          parameters: { baseRadius, topRadius, height },
          mesh,
          bbox,
          material: {
            color,
            opacity: 1,
            metalness: 0.1,
            roughness: 0.6,
          },
          transform: {
            position: { x: 0, y: posY, z: 0 },
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
    [addObject, select, convertMeshData, calculateBBoxFromVertices]
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

        // Convert mesh data and calculate bbox
        const mesh = convertMeshData(meshData)
        const localBBox = calculateBBoxFromVertices(mesh.vertices)
        const posY = majorRadius + minorRadius
        const bbox = {
          min: { x: localBBox.min.x, y: localBBox.min.y + posY, z: localBBox.min.z },
          max: { x: localBBox.max.x, y: localBBox.max.y + posY, z: localBBox.max.z },
        }

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name,
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "torus",
          parameters: { majorRadius, minorRadius },
          mesh,
          bbox,
          material: {
            color,
            opacity: 1,
            metalness: 0.3,
            roughness: 0.4,
          },
          transform: {
            position: { x: 0, y: posY, z: 0 },
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
    [addObject, select, convertMeshData, calculateBBoxFromVertices]
  )

  /**
   * Apply frontend transform to a backend shape
   * This creates a NEW transformed shape in the backend
   */
  const applyTransformToBackend = async (
    backendId: string,
    frontendTransform: {
      position: { x: number; y: number; z: number }
      rotation: { x: number; y: number; z: number }
      scale: { x: number; y: number; z: number }
    }
  ): Promise<string> => {
    let currentId = backendId
    const { position, rotation, scale: scaleVec } = frontendTransform

    // Apply scale if not uniform (1, 1, 1)
    // Note: OpenCASCADE uniform scale only - use average for non-uniform
    const avgScale = (scaleVec.x + scaleVec.y + scaleVec.z) / 3
    if (Math.abs(avgScale - 1) > 0.0001) {
      const scaleResult = await scale(currentId, 0, 0, 0, avgScale)
      currentId = scaleResult.id
    }

    // Apply rotation (X, Y, Z order - Euler angles in degrees)
    if (Math.abs(rotation.x) > 0.0001) {
      const rotateResult = await rotate(currentId, 0, 0, 0, 1, 0, 0, degreesToRadians(rotation.x))
      currentId = rotateResult.id
    }
    if (Math.abs(rotation.y) > 0.0001) {
      const rotateResult = await rotate(currentId, 0, 0, 0, 0, 1, 0, degreesToRadians(rotation.y))
      currentId = rotateResult.id
    }
    if (Math.abs(rotation.z) > 0.0001) {
      const rotateResult = await rotate(currentId, 0, 0, 0, 0, 0, 1, degreesToRadians(rotation.z))
      currentId = rotateResult.id
    }

    // Apply translation
    if (
      Math.abs(position.x) > 0.0001 ||
      Math.abs(position.y) > 0.0001 ||
      Math.abs(position.z) > 0.0001
    ) {
      const translateResult = await translate(currentId, position.x, position.y, position.z)
      currentId = translateResult.id
    }

    return currentId
  }

  /**
   * Boolean fuse (union) two shapes
   * Applies frontend transforms before fusing, then simplifies the result
   * Automatically recreates shapes in backend if they don't exist (e.g., after app restart)
   */
  const fuseShapes = useCallback(
    async (sceneId1: string, sceneId2: string, name?: string): Promise<string | null> => {
      try {
        // Ensure shapes exist in backend (recreate if necessary)
        const backendId1 = await ensureShapeInBackend(sceneId1)
        const backendId2 = await ensureShapeInBackend(sceneId2)

        if (!backendId1 || !backendId2) {
          console.error("Failed to ensure shapes exist in backend")
          return null
        }

        // Get original objects
        const obj1 = getObjectById(sceneId1) as ShapeObject | undefined
        const obj2 = getObjectById(sceneId2) as ShapeObject | undefined

        if (!obj1 || !obj2) {
          console.error("Scene objects not found")
          return null
        }

        logger.log("[useCAD] Fusing shapes with transforms:", {
          shape1: { id: sceneId1, transform: obj1.transform },
          shape2: { id: sceneId2, transform: obj2.transform },
        })

        // Apply frontend transforms to backend shapes
        const transformedId1 = await applyTransformToBackend(backendId1, obj1.transform)
        const transformedId2 = await applyTransformToBackend(backendId2, obj2.transform)

        // Perform the boolean fuse
        const fuseResult = await booleanFuse(transformedId1, transformedId2)
        logger.log("[useCAD] Fuse result:", fuseResult.analysis)

        // DISABLED: Simplify was causing issues with compound shapes
        // ShapeUpgrade_UnifySameDomain can merge faces in ways that break HLR projection
        const finalId = fuseResult.id

        // Tessellate the final result
        const meshData = await tessellate(finalId, 0.1)

        // Serialize BREP data for persistence across app restarts
        let brepData: string | undefined
        try {
          brepData = await serializeShape(finalId)
          logger.log("[useCAD] BREP serialized for fuse result, size:", brepData.length)
        } catch (brepError) {
          logger.warn("[useCAD] Failed to serialize BREP for fuse result:", brepError)
        }

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name: name ?? `${obj1.name} + ${obj2.name}`,
          layerId: obj1.layerId,
          visible: true,
          locked: false,
          selected: false,
          shapeType: "compound", // Correct type for fused shapes
          parameters: {},
          mesh: convertMeshData(meshData),
          material: obj1.material ?? {
            color: "#6366f1",
            opacity: 1,
            metalness: 0.1,
            roughness: 0.6,
          },
          transform: {
            // Result is already positioned correctly in world space
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          metadata: {
            backendShapeId: finalId,
            brepData, // BREP serialization for persistence
            analysis: fuseResult.analysis,
            operation: "fuse",
            sourceIds: [sceneId1, sceneId2],
            sourceNames: [obj1.name, obj2.name],
          },
        }

        // Delete original objects
        deleteObject(sceneId1)
        deleteObject(sceneId2)

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, finalId)
        select(sceneId)

        logger.log("[useCAD] Fuse complete, new object:", sceneId)
        return sceneId
      } catch (error) {
        console.error("Failed to fuse shapes:", error)
        return null
      }
    },
    [addObject, deleteObject, getObjectById, select, convertMeshData, ensureShapeInBackend]
  )

  /**
   * Boolean cut (difference) - subtract shape2 from shape1
   * Applies frontend transforms before cutting, then simplifies the result
   * Automatically recreates shapes in backend if they don't exist (e.g., after app restart)
   */
  const cutShapes = useCallback(
    async (sceneId1: string, sceneId2: string, name?: string): Promise<string | null> => {
      try {
        // Ensure shapes exist in backend (recreate if necessary)
        const backendId1 = await ensureShapeInBackend(sceneId1)
        const backendId2 = await ensureShapeInBackend(sceneId2)

        if (!backendId1 || !backendId2) {
          console.error("Failed to ensure shapes exist in backend")
          return null
        }

        // Get original objects
        const obj1 = getObjectById(sceneId1) as ShapeObject | undefined
        const obj2 = getObjectById(sceneId2) as ShapeObject | undefined

        if (!obj1 || !obj2) {
          console.error("Scene objects not found")
          return null
        }

        logger.log("[useCAD] Cutting shapes with transforms:", {
          base: { id: sceneId1, transform: obj1.transform },
          tool: { id: sceneId2, transform: obj2.transform },
        })

        // Apply frontend transforms to backend shapes
        const transformedId1 = await applyTransformToBackend(backendId1, obj1.transform)
        const transformedId2 = await applyTransformToBackend(backendId2, obj2.transform)

        // Perform the boolean cut
        const cutResult = await booleanCut(transformedId1, transformedId2)
        logger.log("[useCAD] Cut result:", cutResult.analysis)

        // DISABLED: Simplify was causing issues with compound shapes
        const finalId = cutResult.id

        // Tessellate the final result
        const meshData = await tessellate(finalId, 0.1)

        // Serialize BREP data for persistence across app restarts
        let brepData: string | undefined
        try {
          brepData = await serializeShape(finalId)
          logger.log("[useCAD] BREP serialized for cut result, size:", brepData.length)
        } catch (brepError) {
          logger.warn("[useCAD] Failed to serialize BREP for cut result:", brepError)
        }

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name: name ?? `${obj1.name} - ${obj2.name}`,
          layerId: obj1.layerId,
          visible: true,
          locked: false,
          selected: false,
          shapeType: "compound",
          parameters: {},
          mesh: convertMeshData(meshData),
          material: obj1.material ?? {
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
            backendShapeId: finalId,
            brepData, // BREP serialization for persistence
            analysis: cutResult.analysis,
            operation: "cut",
            sourceIds: [sceneId1, sceneId2],
            sourceNames: [obj1.name, obj2.name],
          },
        }

        // Delete original objects
        deleteObject(sceneId1)
        deleteObject(sceneId2)

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, finalId)
        select(sceneId)

        logger.log("[useCAD] Cut complete, new object:", sceneId)
        return sceneId
      } catch (error) {
        console.error("Failed to cut shapes:", error)
        return null
      }
    },
    [addObject, deleteObject, getObjectById, select, convertMeshData, ensureShapeInBackend]
  )

  /**
   * Boolean intersection (common) of two shapes
   * Applies frontend transforms before intersection, then simplifies the result
   * Automatically recreates shapes in backend if they don't exist (e.g., after app restart)
   */
  const intersectShapes = useCallback(
    async (sceneId1: string, sceneId2: string, name?: string): Promise<string | null> => {
      try {
        // Ensure shapes exist in backend (recreate if necessary)
        const backendId1 = await ensureShapeInBackend(sceneId1)
        const backendId2 = await ensureShapeInBackend(sceneId2)

        if (!backendId1 || !backendId2) {
          console.error("Failed to ensure shapes exist in backend")
          return null
        }

        // Get original objects
        const obj1 = getObjectById(sceneId1) as ShapeObject | undefined
        const obj2 = getObjectById(sceneId2) as ShapeObject | undefined

        if (!obj1 || !obj2) {
          console.error("Scene objects not found")
          return null
        }

        logger.log("[useCAD] Intersecting shapes with transforms:", {
          shape1: { id: sceneId1, transform: obj1.transform },
          shape2: { id: sceneId2, transform: obj2.transform },
        })

        // Apply frontend transforms to backend shapes
        const transformedId1 = await applyTransformToBackend(backendId1, obj1.transform)
        const transformedId2 = await applyTransformToBackend(backendId2, obj2.transform)

        // Perform the boolean intersection
        const intersectResult = await booleanCommon(transformedId1, transformedId2)
        logger.log("[useCAD] Intersection result:", intersectResult.analysis)

        // DISABLED: Simplify was causing issues with compound shapes
        const finalId = intersectResult.id

        // Tessellate the final result
        const meshData = await tessellate(finalId, 0.1)

        // Serialize BREP data for persistence across app restarts
        let brepData: string | undefined
        try {
          brepData = await serializeShape(finalId)
          logger.log("[useCAD] BREP serialized for intersect result, size:", brepData.length)
        } catch (brepError) {
          logger.warn("[useCAD] Failed to serialize BREP for intersect result:", brepError)
        }

        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name: name ?? `${obj1.name} ∩ ${obj2.name}`,
          layerId: obj1.layerId,
          visible: true,
          locked: false,
          selected: false,
          shapeType: "compound",
          parameters: {},
          mesh: convertMeshData(meshData),
          material: obj1.material ?? {
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
            backendShapeId: finalId,
            brepData, // BREP serialization for persistence
            analysis: intersectResult.analysis,
            operation: "intersect",
            sourceIds: [sceneId1, sceneId2],
            sourceNames: [obj1.name, obj2.name],
          },
        }

        // Delete original objects
        deleteObject(sceneId1)
        deleteObject(sceneId2)

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, finalId)
        select(sceneId)

        logger.log("[useCAD] Intersection complete, new object:", sceneId)
        return sceneId
      } catch (error) {
        console.error("Failed to intersect shapes:", error)
        return null
      }
    },
    [addObject, deleteObject, getObjectById, select, convertMeshData, ensureShapeInBackend]
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

  /**
   * Update shape parameters and regenerate geometry
   * This is the key function for editing primitive properties
   */
  const updateShapeParameters = useCallback(
    async (sceneId: string, newParameters: Record<string, number>): Promise<boolean> => {
      try {
        const obj = getObjectById(sceneId) as ShapeObject | undefined
        if (!obj || obj.type !== "shape") {
          console.error("[useCAD] Object not found or not a shape:", sceneId)
          return false
        }

        logger.log("[useCAD] Updating shape parameters:", {
          sceneId,
          shapeType: obj.shapeType,
          newParameters,
        })

        // Create new geometry based on shape type
        let result: ShapeResult

        switch (obj.shapeType) {
          case "box": {
            const width = newParameters.width ?? obj.parameters.width ?? 1
            const depth = newParameters.depth ?? obj.parameters.depth ?? 1
            const height = newParameters.height ?? obj.parameters.height ?? 1
            result = await createBox(width, depth, height)
            break
          }
          case "cylinder": {
            const radius = newParameters.radius ?? obj.parameters.radius ?? 0.5
            const height = newParameters.height ?? obj.parameters.height ?? 1
            result = await createCylinder(radius, height)
            break
          }
          case "sphere": {
            const radius = newParameters.radius ?? obj.parameters.radius ?? 0.5
            result = await createSphere(radius)
            break
          }
          case "cone": {
            const bottomRadius = newParameters.bottomRadius ?? obj.parameters.bottomRadius ?? 0.5
            const topRadius = newParameters.topRadius ?? obj.parameters.topRadius ?? 0
            const height = newParameters.height ?? obj.parameters.height ?? 1
            result = await createCone(bottomRadius, topRadius, height)
            break
          }
          case "torus": {
            const majorRadius = newParameters.majorRadius ?? obj.parameters.majorRadius ?? 1
            const minorRadius = newParameters.minorRadius ?? obj.parameters.minorRadius ?? 0.3
            result = await createTorus(majorRadius, minorRadius)
            break
          }
          default:
            console.error("[useCAD] Unknown shape type:", obj.shapeType)
            return false
        }

        if (!result || !result.id) {
          throw new Error("Failed to create new geometry")
        }

        // Calculate deflection from segments parameter
        // Higher segments = lower deflection = more detail
        // Box: segments 1-10, default 1 (subdivisions)
        // Others: segments 8-128, default 32 (tessellation detail)
        const defaultSegments = obj.shapeType === "box" ? 1 : 32
        const segments = newParameters.segments ?? obj.parameters.segments ?? defaultSegments

        // Calculate deflection based on shape type
        let deflection: number
        if (obj.shapeType === "box") {
          // Box: segments 1-10 maps to deflection 0.5-0.05
          deflection = Math.max(0.05, 0.5 / segments)
        } else {
          // Others: segments 8-128 maps to deflection 0.5-0.01
          // Lower deflection = more triangles = better curve approximation
          deflection = Math.max(0.01, Math.min(0.5, 1.0 / (segments / 2)))
        }

        // Tessellate the new geometry
        console.log("[useCAD] Tessellating new geometry:", {
          shapeId: result.id,
          shapeType: obj.shapeType,
          segments,
          deflection,
        })
        const meshData = await tessellate(result.id, deflection)
        console.log("[useCAD] Tessellation result:", {
          vertexCount: meshData.vertex_count,
          triangleCount: meshData.triangle_count,
        })

        // Delete old backend shape if exists
        const oldBackendId = shapeIdMap.get(sceneId)
        if (oldBackendId) {
          try {
            await deleteBackendShape(oldBackendId)
          } catch (e) {
            // Ignore errors when deleting old shape
          }
        }

        // Update shape ID map
        shapeIdMap.set(sceneId, result.id)

        // Merge new parameters with existing ones
        const mergedParameters = { ...obj.parameters, ...newParameters }

        // Save state before updating (for history)
        saveStateBeforeAction()

        // Update the store with new mesh and parameters
        _updateObject(
          sceneId,
          {
            parameters: mergedParameters,
            mesh: convertMeshData(meshData),
            metadata: {
              ...obj.metadata,
              backendShapeId: result.id,
              analysis: result.analysis,
            },
          },
          false // Don't save history here, we'll commit manually
        )

        // Commit to history with descriptive action name
        const paramNames = Object.keys(newParameters).join(", ")
        commitToHistory(`Modificar geometría: ${obj.name} (${paramNames})`, {
          targetBodies: [sceneId],
        })

        logger.log("[useCAD] Shape parameters updated successfully")
        return true
      } catch (error) {
        console.error("[useCAD] Failed to update shape parameters:", error)
        return false
      }
    },
    [getObjectById, _updateObject, convertMeshData, saveStateBeforeAction, commitToHistory]
  )

  return {
    // Primitives
    createBoxShape,
    createCylinderShape,
    createSphereShape,
    createConeShape,
    createTorusShape,
    /**
     * Import a STEP file
     */
    importStepShape: async (filePath: string, name?: string): Promise<string | null> => {
      const toastId = toast.loading(`Importando STEP: ${filePath.split(/[/\\]/).pop()}...`)
      try {
        logger.log("[useCAD] Importing STEP:", filePath)
        const result = await importStep(filePath)

        if (!result || !result.id) {
          throw new Error("El motor CAD no devolvió un ID válido.")
        }

        // Tessellate for rendering
        const meshData = await tessellate(result.id, 0.1)

        // Convert mesh data and calculate bbox
        const mesh = convertMeshData(meshData)
        const localBBox = calculateBBoxFromVertices(mesh.vertices)

        // Derive name if not provided
        const fileName = filePath.split(/[/\\]/).pop() ?? "Imported"
        const finalName = name ?? fileName.replace(".step", "").replace(".stp", "")

        // Create scene object
        const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
          type: "shape",
          name: finalName,
          layerId: "default",
          visible: true,
          locked: false,
          selected: false,
          shapeType: "compound", // STEP files are usually compounds
          parameters: {},
          mesh,
          bbox: localBBox,
          material: {
            color: "#94a3b8", // Neutral slate color for imports
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
            sourcePath: filePath,
          },
        }

        const sceneId = addObject(shapeObject)
        shapeIdMap.set(sceneId, result.id)
        select(sceneId)

        commitToHistory(`Importar STEP: ${finalName}`, { targetBodies: [sceneId] })

        toast.success(`STEP importado: ${finalName}`, { id: toastId })
        return sceneId
      } catch (error) {
        console.error("Failed to import STEP:", error)
        toast.error(
          `Error al importar STEP: ${error instanceof Error ? error.message : String(error)}`,
          {
            id: toastId,
          }
        )
        return null
      }
    },

    // Boolean operations
    fuseShapes,
    cutShapes,
    intersectShapes,

    // Parameter editing
    updateShapeParameters,

    // Utility
    cleanupShape,
    clearAllShapes,
  }
}

export default useCAD
