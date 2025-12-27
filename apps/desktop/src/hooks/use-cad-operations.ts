/**
 * CAD Operations Hook - CADHY
 *
 * Shared hook for CAD operations across the application.
 * Handles parameter dialogs and backend communication.
 */

import { toast } from "@cadhy/ui"
import { useCallback, useState } from "react"
import * as cadService from "@/services/cad-service"
import type { ShapeObject } from "@/stores/modeller"
import { useModellerStore, useSelectedObjects } from "@/stores/modeller"
import { shapeIdMap } from "./use-cad"

const DEFAULT_MATERIAL = {
  color: "#ffffff",
  opacity: 1,
  metalness: 0.5,
  roughness: 0.5,
}

export interface OperationDialogState {
  open: boolean
  operation: "fillet" | "chamfer" | "shell" | "extrude" | "offset" | null
  value: string
  title: string
  description: string
  label: string
  /** Interactive mode - uses edge gizmos instead of dialog */
  interactiveMode: boolean
  // Advanced parameters
  continuity?: number // 0: C0, 1: G1, 2: G2
  chamferMode?: "constant" | "two-distances" | "distance-angle"
  value2?: string
  angle?: string
}

/**
 * Get backend shape ID for a scene object
 * First tries shapeIdMap, then metadata fallback
 */
function getBackendShapeId(objectId: string, metadata?: Record<string, unknown>): string | null {
  let backendId = shapeIdMap.get(objectId)
  if (!backendId && metadata?.backendShapeId) {
    backendId = metadata.backendShapeId as string
    shapeIdMap.set(objectId, backendId)
  }
  return backendId || null
}

/**
 * Calculate the centroid of mesh vertices, transforming from backend (Z-up) to Three.js (Y-up)
 * This is used to position compound shapes (boolean/mirror results) correctly for gizmo placement.
 */
function calculateMeshCentroid(vertices: number[]): { x: number; y: number; z: number } {
  let x = 0,
    y = 0,
    z = 0
  const count = vertices.length / 3
  for (let i = 0; i < vertices.length; i += 3) {
    // Backend uses Z-up, Three.js uses Y-up
    x += vertices[i] // X stays X
    y += vertices[i + 2] // Three.js Y = Backend Z
    z += -vertices[i + 1] // Three.js Z = -Backend Y
  }
  if (count > 0) {
    x /= count
    y /= count
    z /= count
  }
  return { x, y, z }
}

/**
 * Recreate a shape in the backend based on its parameters
 * This handles app restarts where backend shapes are lost
 *
 * NOTE: OpenCASCADE primitives are now created CENTERED at origin to match Three.js:
 * - make_box_centered, make_cylinder_centered, make_cone_centered
 * - No additional centering translation is needed
 */
async function recreateShapeInBackend(obj: ShapeObject): Promise<string | null> {
  // Debug logging removed for performance

  try {
    let result: { id: string } | null = null

    switch (obj.shapeType) {
      case "box": {
        const { width = 1, depth = 1, height = 1 } = obj.parameters
        result = await cadService.createBox(width, depth, height)
        // Backend now creates centered box - no offset needed
        break
      }
      case "cylinder": {
        const { radius = 0.5, height = 1 } = obj.parameters
        result = await cadService.createCylinder(radius, height)
        // Backend now creates centered cylinder - no offset needed
        break
      }
      case "sphere": {
        const { radius = 0.5 } = obj.parameters
        result = await cadService.createSphere(radius)
        // Sphere is already centered at origin in both systems
        break
      }
      case "cone": {
        const { bottomRadius = 0.5, topRadius = 0, height = 1 } = obj.parameters
        result = await cadService.createCone(bottomRadius, topRadius, height)
        // Backend now creates centered cone - no offset needed
        break
      }
      case "torus": {
        const { majorRadius = 1, minorRadius = 0.3 } = obj.parameters
        result = await cadService.createTorus(majorRadius, minorRadius)
        // Torus is already centered at origin in both systems
        break
      }
      default:
        console.error("[CAD Operations] Cannot recreate shape of type:", obj.shapeType)
        return null
    }

    // Shape recreated successfully
    if (result?.id) {
      shapeIdMap.set(obj.id, result.id)
      return result.id
    }
  } catch (error) {
    console.error("[CAD Operations] Failed to recreate shape:", error)
  }

  return null
}

/**
 * Ensure a shape exists in the backend, recreating it if necessary
 */
async function ensureShapeInBackend(obj: ShapeObject): Promise<string | null> {
  // First try to get existing backend ID
  const backendId = getBackendShapeId(obj.id, obj.metadata)

  // If we have a backend ID, check if it still exists
  if (backendId) {
    try {
      const exists = await cadService.shapeExists(backendId)
      if (exists) {
        return backendId
      }
      // Shape no longer exists in backend, will recreate
    } catch (error) {
      console.warn("[CAD Operations] Error checking shape existence:", error)
    }
  }

  // Shape doesn't exist or ID not found, try to recreate it
  // Only basic primitives can be recreated
  if (["box", "cylinder", "sphere", "cone", "torus"].includes(obj.shapeType)) {
    return recreateShapeInBackend(obj)
  }

  // For compound shapes (boolean results), we can't recreate them
  // The user would need to redo the operation
  console.error(
    "[CAD Operations] Cannot recreate compound shape. Please create new primitives and redo the operation."
  )
  return null
}

/**
 * Merge BIM information from multiple objects
 * Combines metadata while preserving important fields
 */
function mergeBIMMetadata(
  objects: ShapeObject[],
  operationType: "union" | "subtract" | "intersect"
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    operation: `boolean-${operationType}`,
    sourceIds: objects.map((obj) => obj.id),
    sourceNames: objects.map((obj) => obj.name),
    createdAt: Date.now(),
  }

  // Collect all BIM properties from sources
  const bimProperties: Record<string, unknown>[] = []
  for (const obj of objects) {
    if (obj.metadata?.bim) {
      bimProperties.push(obj.metadata.bim as Record<string, unknown>)
    }
    // Preserve IFC data if present
    if (obj.metadata?.ifc) {
      merged.ifc = merged.ifc || obj.metadata.ifc
    }
    // Preserve material info
    if (obj.metadata?.material) {
      merged.materialSources = merged.materialSources || []
      ;(merged.materialSources as unknown[]).push(obj.metadata.material)
    }
  }

  if (bimProperties.length > 0) {
    merged.bim = {
      combined: true,
      sources: bimProperties,
      // Sum volumes if available
      totalVolume: bimProperties.reduce((sum, p) => sum + ((p.volume as number) || 0), 0),
      // Sum areas if available
      totalArea: bimProperties.reduce((sum, p) => sum + ((p.area as number) || 0), 0),
    }
  }

  return merged
}

/**
 * Serialize shape to BREP and add to metadata for persistence
 * This ensures shapes survive app restarts by storing complete B-Rep geometry.
 *
 * @param backendShapeId - The shape ID in the backend registry
 * @param baseMetadata - Existing metadata to merge with
 * @returns Metadata object with brepData and backendShapeId
 */
async function serializeShapeForPersistence(
  backendShapeId: string,
  baseMetadata: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const metadata: Record<string, unknown> = {
    ...baseMetadata,
    backendShapeId,
  }

  try {
    const brepData = await cadService.serializeShape(backendShapeId)
    metadata.brepData = brepData
    // Debug: Shape serialized for persistence - logging removed for performance
  } catch (serializeError) {
    console.warn("[CAD Operations] Failed to serialize shape for persistence:", serializeError)
    // Continue without BREP data - shape won't persist across restarts
  }

  return metadata
}

/**
 * Convert frontend coordinates (Three.js, Y-up) to backend coordinates (OpenCASCADE, Z-up)
 *
 * Three.js (Y-up):       OpenCASCADE (Z-up):
 *    Y (up)                   Z (up)
 *    |                        |
 *    |___ X (right)           |___ X (right)
 *   /                        /
 *  Z (forward)              Y (forward)
 *
 * Conversion:
 *   Backend X = Frontend X
 *   Backend Y = -Frontend Z
 *   Backend Z = Frontend Y
 */
function frontendToBackendCoords(
  frontendX: number,
  frontendY: number,
  frontendZ: number
): { x: number; y: number; z: number } {
  return {
    x: frontendX,
    y: -frontendZ, // Three.js Z (forward) -> OpenCASCADE -Y
    z: frontendY, // Three.js Y (up) -> OpenCASCADE Z
  }
}

/**
 * Apply frontend transform to a backend shape
 * This creates a NEW transformed shape in the backend
 *
 * IMPORTANT: Converts coordinates from frontend (Three.js, Y-up) to backend (OpenCASCADE, Z-up)
 */
async function applyTransformToBackend(
  backendId: string,
  frontendTransform: {
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    scale: { x: number; y: number; z: number }
  }
): Promise<string> {
  let currentId = backendId
  const { position, rotation, scale: scaleVec } = frontendTransform

  // Convert position from frontend to backend coordinate system
  const backendPos = frontendToBackendCoords(position.x, position.y, position.z)

  // Apply scale if not uniform (1, 1, 1)
  const avgScale = (scaleVec.x + scaleVec.y + scaleVec.z) / 3
  if (Math.abs(avgScale - 1) > 0.0001) {
    const scaleResult = await cadService.scale(currentId, 0, 0, 0, avgScale)
    currentId = scaleResult.id
  }

  // Apply rotation (convert axes for coordinate system)
  // Frontend rotation X (around X axis) -> Backend rotation around X axis
  // Frontend rotation Y (around Y/up axis) -> Backend rotation around Z axis
  // Frontend rotation Z (around Z/forward axis) -> Backend rotation around -Y axis
  if (Math.abs(rotation.x) > 0.0001) {
    const rotateResult = await cadService.rotate(
      currentId,
      0,
      0,
      0,
      1,
      0,
      0, // Backend X axis
      cadService.degreesToRadians(rotation.x)
    )
    currentId = rotateResult.id
  }
  if (Math.abs(rotation.y) > 0.0001) {
    const rotateResult = await cadService.rotate(
      currentId,
      0,
      0,
      0,
      0,
      0,
      1, // Backend Z axis (corresponds to frontend Y/up axis)
      cadService.degreesToRadians(rotation.y)
    )
    currentId = rotateResult.id
  }
  if (Math.abs(rotation.z) > 0.0001) {
    const rotateResult = await cadService.rotate(
      currentId,
      0,
      0,
      0,
      0,
      -1,
      0, // Backend -Y axis (corresponds to frontend Z/forward axis)
      cadService.degreesToRadians(rotation.z)
    )
    currentId = rotateResult.id
  }

  // Apply translation using converted coordinates
  if (
    Math.abs(backendPos.x) > 0.0001 ||
    Math.abs(backendPos.y) > 0.0001 ||
    Math.abs(backendPos.z) > 0.0001
  ) {
    const translateResult = await cadService.translate(
      currentId,
      backendPos.x,
      backendPos.y,
      backendPos.z
    )
    currentId = translateResult.id
  }

  return currentId
}

export function useCADOperations() {
  const selectedObjects = useSelectedObjects()
  const { addObject, deleteObject, select } = useModellerStore()

  const [dialogState, setDialogState] = useState<OperationDialogState>({
    open: false,
    operation: null,
    value: "",
    title: "",
    description: "",
    label: "",
    interactiveMode: true, // Default to interactive mode
  })

  // Execute Fillet operation
  const executeFillet = useCallback(
    async (radius: number, edgeIndices?: number[], continuity = 1) => {
      const selectedObject = selectedObjects[0]
      if (!selectedObject) {
        toast.error("No objects selected")
        return false
      }

      // Save state before action for proper undo
      useModellerStore.getState().saveStateBeforeAction()

      // Try to get backend ID from shapeIdMap first, then from metadata as fallback
      let backendId = shapeIdMap.get(selectedObject.id)

      // Fallback: try to get from metadata
      if (!backendId && selectedObject.metadata?.backendShapeId) {
        backendId = selectedObject.metadata.backendShapeId as string
        // Register it in the map for future use
        shapeIdMap.set(selectedObject.id, backendId)
      }

      if (!backendId) {
        toast.error("Shape not found in backend")
        return false
      }

      try {
        let result: { id: string } | null = null

        if (edgeIndices && edgeIndices.length > 0) {
          // Use advanced fillet for specific edges
          const radii = edgeIndices.map(() => radius)
          result = await cadService.filletEdgesAdvanced(backendId, edgeIndices, radii, continuity)
        } else {
          // Use global fillet
          result = await cadService.fillet(backendId, radius)
        }

        if (result) {
          const meshData = await cadService.tessellate(result.id, 0.1)

          // Serialize shape to BREP for persistence across app restarts
          const persistedMetadata = await serializeShapeForPersistence(result.id, {
            ...selectedObject.metadata,
            operation: "fillet",
            sourceId: selectedObject.id,
            parameter: radius,
            edgeIndices,
            continuity,
          })

          const newObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
            type: "shape",
            shapeType: "compound", // Changed: Fillet result is no longer a pure primitive
            parameters: {}, // Clear parameters since shape is now modified
            layerId: selectedObject.layerId,
            areaId: selectedObject.areaId,
            transform: { ...selectedObject.transform },
            visible: true,
            locked: false,
            selected: true,
            name: `Fillet ${radius}`,
            metadata: persistedMetadata,
            mesh: {
              vertices: new Float32Array(meshData.vertices),
              indices: new Uint32Array(meshData.indices),
              normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
            },
            material: selectedObject.material || {
              color: "#ffffff",
              opacity: 1,
              metalness: 0.5,
              roughness: 0.5,
            },
          }

          deleteObject(selectedObject.id)
          const newId = addObject(newObject)
          shapeIdMap.set(newId, result.id)

          // Save to history
          useModellerStore.getState().commitToHistory(`Empalme: ${selectedObject.name}`)

          toast.success("Fillet applied successfully")
          return true
        }
        return false
      } catch (error) {
        toast.error(`Fillet failed: ${error instanceof Error ? error.message : String(error)}`)
        return false
      }
    },
    [selectedObjects, addObject, deleteObject]
  )

  // Execute Chamfer operation
  const executeChamfer = useCallback(
    async (
      distance: number,
      edgeIndices?: number[],
      mode: "constant" | "two-distances" | "distance-angle" = "constant",
      distance2?: number,
      angle?: number
    ) => {
      const selectedObject = selectedObjects[0]
      if (!selectedObject) {
        toast.error("No objects selected")
        return false
      }

      // Save state before action for proper undo
      useModellerStore.getState().saveStateBeforeAction()

      // Try to get backend ID from shapeIdMap first, then from metadata as fallback
      let backendId = shapeIdMap.get(selectedObject.id)
      if (!backendId && selectedObject.metadata?.backendShapeId) {
        backendId = selectedObject.metadata.backendShapeId as string
        shapeIdMap.set(selectedObject.id, backendId)
      }

      if (!backendId) {
        toast.error("Shape not found in backend")
        return false
      }

      try {
        let result: { id: string } | null = null

        if (edgeIndices && edgeIndices.length > 0) {
          // Edge-specific chamfer
          switch (mode) {
            case "constant":
              result = await cadService.chamferEdges(
                backendId,
                edgeIndices,
                edgeIndices.map(() => distance)
              )
              break
            case "two-distances":
              if (distance2 === undefined) return false
              result = await cadService.chamferEdgesTwoDistances(
                backendId,
                edgeIndices,
                edgeIndices.map(() => distance),
                edgeIndices.map(() => distance2)
              )
              break
            case "distance-angle":
              if (angle === undefined) return false
              result = await cadService.chamferEdgesDistanceAngle(
                backendId,
                edgeIndices,
                edgeIndices.map(() => distance),
                edgeIndices.map(() => angle)
              )
              break
          }
        } else {
          // Global chamfer
          result = await cadService.chamfer(backendId, distance)
        }

        if (result) {
          const meshData = await cadService.tessellate(result.id, 0.1)

          // Serialize shape to BREP for persistence across app restarts
          const persistedMetadata = await serializeShapeForPersistence(result.id, {
            ...selectedObject.metadata,
            operation: "chamfer",
            sourceId: selectedObject.id,
            parameter: distance,
            edgeIndices,
            mode,
          })

          const newObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
            type: "shape",
            shapeType: "compound", // Changed: Chamfer result is no longer a pure primitive
            parameters: {}, // Clear parameters since shape is now modified
            layerId: selectedObject.layerId,
            areaId: selectedObject.areaId,
            transform: { ...selectedObject.transform },
            visible: true,
            locked: false,
            selected: true,
            name: `Chaflán ${distance}`,
            metadata: persistedMetadata,
            mesh: {
              vertices: new Float32Array(meshData.vertices),
              indices: new Uint32Array(meshData.indices),
              normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
            },
            material: selectedObject.material || {
              color: "#ffffff",
              opacity: 1,
              metalness: 0.5,
              roughness: 0.5,
            },
          }

          deleteObject(selectedObject.id)
          const newId = addObject(newObject)
          shapeIdMap.set(newId, result.id)

          // Save to history
          useModellerStore.getState().commitToHistory(`Chaflán: ${selectedObject.name}`)

          toast.success("Chaflán aplicado exitosamente")
          return true
        }
        return false
      } catch (error) {
        toast.error(`Chaflán fallido: ${error instanceof Error ? error.message : String(error)}`)
        return false
      }
    },
    [selectedObjects, addObject, deleteObject]
  )

  // Execute Shell operation
  const executeShell = useCallback(
    async (thickness: number) => {
      const selectedObject = selectedObjects[0]
      if (!selectedObject) {
        toast.error("No objects selected")
        return false
      }

      // Save state before action for proper undo
      useModellerStore.getState().saveStateBeforeAction()

      // Try to get backend ID from shapeIdMap first, then from metadata as fallback
      let backendId = shapeIdMap.get(selectedObject.id)
      if (!backendId && selectedObject.metadata?.backendShapeId) {
        backendId = selectedObject.metadata.backendShapeId as string
        shapeIdMap.set(selectedObject.id, backendId)
      }

      if (!backendId) {
        toast.error("Shape not found in backend")
        return false
      }

      try {
        const result = await cadService.shell(backendId, thickness)

        if (result) {
          const meshData = await cadService.tessellate(result.id, 0.1)

          // Serialize shape to BREP for persistence across app restarts
          const persistedMetadata = await serializeShapeForPersistence(result.id, {
            ...selectedObject.metadata,
            operation: "shell",
            sourceId: selectedObject.id,
            parameter: thickness,
          })

          const newObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
            type: "shape",
            shapeType: "compound", // Changed: Shell result is no longer a pure primitive
            parameters: {}, // Clear parameters since shape is now modified
            layerId: selectedObject.layerId,
            areaId: selectedObject.areaId,
            transform: { ...selectedObject.transform },
            visible: true,
            locked: false,
            selected: true,
            name: `Vaciado ${thickness}`,
            metadata: persistedMetadata,
            mesh: {
              vertices: new Float32Array(meshData.vertices),
              indices: new Uint32Array(meshData.indices),
              normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
            },
            material: selectedObject.material || {
              color: "#ffffff",
              opacity: 1,
              metalness: 0.5,
              roughness: 0.5,
            },
          }

          deleteObject(selectedObject.id)
          const newId = addObject(newObject)
          shapeIdMap.set(newId, result.id)

          // Save to history
          useModellerStore.getState().commitToHistory(`Vaciado: ${selectedObject.name}`)

          toast.success("Vaciado aplicado exitosamente")
          return true
        }
        return false
      } catch (error) {
        toast.error(`Vaciado fallido: ${error instanceof Error ? error.message : String(error)}`)
        return false
      }
    },
    [selectedObjects, addObject, deleteObject]
  )

  // Open dialog for operation
  const openOperationDialog = useCallback((operation: "fillet" | "chamfer" | "shell") => {
    const configs = {
      fillet: {
        title: "Empalme (Redondear aristas)",
        description: "Ingresa el radio para redondear las aristas",
        label: "Radio",
        defaultValue: "1.0",
      },
      chamfer: {
        title: "Chaflán (Biselar aristas)",
        description: "Ingresa la distancia para biselar las aristas",
        label: "Distancia",
        defaultValue: "0.5",
      },
      shell: {
        title: "Vaciado (Hollow Out)",
        description: "Ingresa el espesor de pared",
        label: "Espesor",
        defaultValue: "0.5",
      },
    }

    const config = configs[operation]
    setDialogState({
      open: true,
      operation,
      value: config.defaultValue,
      title: config.title,
      description: config.description,
      label: config.label,
      interactiveMode: true, // Use interactive mode by default
      continuity: 1, // Default to G1
      chamferMode: "constant",
      value2: "0.5",
      angle: "45",
    })
  }, [])

  // Close dialog
  const closeDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, open: false }))
  }, [])

  // Apply operation from dialog
  const applyOperation = useCallback(
    async (edgeIndices?: number[]) => {
      const value = Number.parseFloat(dialogState.value)
      if (Number.isNaN(value) || value <= 0) {
        toast.error("Ingresa un valor positivo válido")
        return
      }

      let success = false
      switch (dialogState.operation) {
        case "fillet":
          success = await executeFillet(value, edgeIndices, dialogState.continuity)
          break
        case "chamfer":
          success = await executeChamfer(
            value,
            edgeIndices,
            dialogState.chamferMode,
            Number.parseFloat(dialogState.value2 || "0.5"),
            cadService.degreesToRadians(Number.parseFloat(dialogState.angle || "45"))
          )
          break
        case "shell":
          success = await executeShell(value)
          break
      }

      if (success) {
        closeDialog()
      }
    },
    [dialogState, executeFillet, executeChamfer, executeShell, closeDialog]
  )

  // Toggle interactive mode
  const toggleInteractiveMode = useCallback(() => {
    setDialogState((prev) => ({ ...prev, interactiveMode: !prev.interactiveMode }))
  }, [])

  // ============================================================================
  // BOOLEAN OPERATIONS
  // ============================================================================

  /**
   * Execute Boolean Union (Fuse) - Combines multiple objects into one
   * Requires at least 2 selected shape objects
   */
  const executeBooleanUnion = useCallback(async () => {
    // Filter to shape objects only
    const shapeObjects = selectedObjects.filter((obj) => obj.type === "shape") as ShapeObject[]

    if (shapeObjects.length < 2) {
      toast.error("Selecciona al menos 2 sólidos para unir")
      return false
    }

    // Save state before action for proper undo
    useModellerStore.getState().saveStateBeforeAction()

    try {
      // Get backend IDs and apply transforms for all selected objects
      // Automatically recreate shapes if they don't exist (e.g., after app restart)
      const transformedIds: string[] = []
      for (const obj of shapeObjects) {
        // Ensure shape exists in backend, recreating if necessary
        const backendId = await ensureShapeInBackend(obj)
        if (!backendId) {
          toast.error(
            `No se pudo recuperar el sólido "${obj.name}". ` +
              "Si es un resultado de operación booleana anterior, deberás recrearlo."
          )
          return false
        }

        // Apply frontend transform to backend shape
        const transformedId = await applyTransformToBackend(backendId, obj.transform)
        transformedIds.push(transformedId)
      }

      // Fuse all shapes sequentially
      let resultId = transformedIds[0] as string
      for (let i = 1; i < transformedIds.length; i++) {
        const fuseResult = await cadService.booleanFuse(resultId, transformedIds[i] as string)
        resultId = fuseResult.id
      }

      // DISABLED: Simplify was converting L-shapes to boxes!
      // The ShapeUpgrade_UnifySameDomain tool can merge co-planar faces
      // which causes issues with compound shapes from boolean operations.
      // const simplifiedResult = await cadService.simplify(resultId, true, true)
      // const finalId = simplifiedResult.id
      const finalId = resultId // Use raw fuse result without simplification

      // DIAGNOSTIC: Verify fused shape geometry (logging removed for performance)
      // Only log errors if analysis fails
      try {
        await cadService.analyze(finalId as string)
      } catch {
        // Analysis failed - continue anyway
      }

      // Tessellate the final result
      const meshData = await cadService.tessellate(finalId as string, 0.1)

      // CRITICAL: Validate mesh data is not empty
      if (
        !meshData ||
        !meshData.vertices ||
        meshData.vertices.length === 0 ||
        !meshData.indices ||
        meshData.indices.length === 0
      ) {
        console.error("[Boolean Union] Tessellation returned empty mesh:", {
          finalId,
          hasVertices: !!meshData?.vertices,
          vertexCount: meshData?.vertices?.length ?? 0,
          hasIndices: !!meshData?.indices,
          indexCount: meshData?.indices?.length ?? 0,
        })
        toast.error(
          "La operación booleana produjo geometría vacía. " +
            "Asegúrate de que los sólidos se intersecten correctamente."
        )
        return false
      }

      // Merge BIM metadata from all source objects
      const mergedMetadata = mergeBIMMetadata(shapeObjects, "union")
      mergedMetadata.backendShapeId = finalId

      // Serialize the shape to BREP for persistence across app restarts
      try {
        const brepData = await cadService.serializeShape(finalId)
        mergedMetadata.brepData = brepData
      } catch {
        // Failed to serialize - continue without BREP data
      }

      // Use the first object's position and material as base
      const baseObject = shapeObjects[0]
      if (!baseObject) return false

      // Calculate the centroid of the union mesh for correct gizmo placement
      const centroid = calculateMeshCentroid(Array.from(meshData.vertices))

      const newObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
        type: "shape",
        shapeType: "compound",
        parameters: {},
        mesh: {
          vertices: new Float32Array(meshData.vertices),
          indices: new Uint32Array(meshData.indices),
          normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
        },
        metadata: mergedMetadata,
        transform: {
          position: { x: centroid.x, y: centroid.y, z: centroid.z },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        visible: true,
        locked: false,
        selected: true,
        layerId: baseObject.layerId,
        name: `Union (${shapeObjects.map((o) => o.name).join(" + ")})`,
        material: baseObject.material || DEFAULT_MATERIAL,
      }

      // Delete all original objects
      for (const obj of shapeObjects) {
        deleteObject(obj.id)
      }

      // Add the new fused object
      const newId = addObject(newObject)
      shapeIdMap.set(newId, finalId)

      select(newId)

      // Save to history
      useModellerStore
        .getState()
        .commitToHistory(`Unión: ${shapeObjects.map((o) => o.name).join(", ")}`)

      toast.success(`${shapeObjects.length} sólidos unidos exitosamente`)
      return true
    } catch (error) {
      toast.error(`Error en unión: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }, [selectedObjects, addObject, deleteObject, select])

  /**
   * Execute Boolean Subtract - Subtracts tool objects from the base object
   * First selected object is the base, rest are tools
   */
  const executeBooleanSubtract = useCallback(async () => {
    const shapeObjects = selectedObjects.filter((obj) => obj.type === "shape") as ShapeObject[]

    if (shapeObjects.length < 2) {
      toast.error("Selecciona al menos 2 sólidos: el primero es la base, los demás se restarán")
      return false
    }

    useModellerStore.getState().saveStateBeforeAction()

    try {
      // Get backend IDs and apply transforms for all selected objects
      // Automatically recreate shapes if they don't exist (e.g., after app restart)
      const transformedIds: string[] = []
      for (const obj of shapeObjects) {
        // Ensure shape exists in backend, recreating if necessary
        const backendId = await ensureShapeInBackend(obj)
        if (!backendId) {
          toast.error(
            `No se pudo recuperar el sólido "${obj.name}". ` +
              "Si es un resultado de operación booleana anterior, deberás recrearlo."
          )
          return false
        }

        // Apply frontend transform to backend shape
        const transformedId = await applyTransformToBackend(backendId, obj.transform)
        transformedIds.push(transformedId)
      }

      // Cut all tool shapes from the base
      let resultId = transformedIds[0] as string
      for (let i = 1; i < transformedIds.length; i++) {
        const cutResult = await cadService.booleanCut(resultId, transformedIds[i] as string)
        resultId = cutResult.id
      }

      // DISABLED: Simplify can cause issues with compound shapes
      // const simplifiedResult = await cadService.simplify(resultId, true, true)
      // const finalId = simplifiedResult.id
      const finalId = resultId // Use raw cut result without simplification

      const meshData = await cadService.tessellate(finalId, 0.1)

      // CRITICAL: Validate mesh data is not empty
      if (
        !meshData ||
        !meshData.vertices ||
        meshData.vertices.length === 0 ||
        !meshData.indices ||
        meshData.indices.length === 0
      ) {
        console.error("[Boolean Subtract] Tessellation returned empty mesh:", {
          finalId,
          hasVertices: !!meshData?.vertices,
          vertexCount: meshData?.vertices?.length ?? 0,
          hasIndices: !!meshData?.indices,
          indexCount: meshData?.indices?.length ?? 0,
        })
        toast.error(
          "La resta booleana produjo geometría vacía. " +
            "Asegúrate de que los sólidos se intersecten correctamente."
        )
        return false
      }

      const mergedMetadata = mergeBIMMetadata(shapeObjects, "subtract")
      mergedMetadata.backendShapeId = finalId

      // Serialize the shape to BREP for persistence across app restarts
      try {
        const brepData = await cadService.serializeShape(finalId)
        mergedMetadata.brepData = brepData
        console.log("[Boolean Subtract] Shape serialized for persistence:", {
          shapeId: finalId,
          brepSize: brepData.length,
        })
      } catch (serializeError) {
        console.warn(
          "[Boolean Subtract] Failed to serialize shape for persistence:",
          serializeError
        )
      }

      const baseObject = shapeObjects[0]
      if (!baseObject) return false
      const toolNames = shapeObjects.slice(1).map((o) => o.name)

      // Calculate the centroid of the subtraction mesh for correct gizmo placement
      const centroid = calculateMeshCentroid(Array.from(meshData.vertices))

      const newObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
        type: "shape",
        shapeType: "compound",
        parameters: {},
        mesh: {
          vertices: new Float32Array(meshData.vertices),
          indices: new Uint32Array(meshData.indices),
          normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
        },
        metadata: mergedMetadata,
        transform: {
          position: { x: centroid.x, y: centroid.y, z: centroid.z },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        visible: true,
        locked: false,
        selected: true,
        layerId: baseObject.layerId,
        name: `${baseObject.name} - (${toolNames.join(", ")})`,
        material: baseObject.material || DEFAULT_MATERIAL,
      }

      for (const obj of shapeObjects) {
        deleteObject(obj.id)
      }

      const newId = addObject(newObject)
      shapeIdMap.set(newId, finalId)
      select(newId)

      useModellerStore
        .getState()
        .commitToHistory(`Resta: ${baseObject.name} - ${toolNames.join(", ")}`)

      toast.success(`Resta booleana aplicada exitosamente`)
      return true
    } catch (error) {
      toast.error(`Error en resta: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }, [selectedObjects, addObject, deleteObject, select])

  /**
   * Execute Boolean Intersect - Creates the common volume of all objects
   * Requires at least 2 selected shape objects
   */
  const executeBooleanIntersect = useCallback(async () => {
    const shapeObjects = selectedObjects.filter((obj) => obj.type === "shape") as ShapeObject[]

    if (shapeObjects.length < 2) {
      toast.error("Selecciona al menos 2 sólidos para intersectar")
      return false
    }

    useModellerStore.getState().saveStateBeforeAction()

    try {
      // Get backend IDs and apply transforms for all selected objects
      // Automatically recreate shapes if they don't exist (e.g., after app restart)
      const transformedIds: string[] = []
      for (const obj of shapeObjects) {
        // Ensure shape exists in backend, recreating if necessary
        const backendId = await ensureShapeInBackend(obj)
        if (!backendId) {
          toast.error(
            `No se pudo recuperar el sólido "${obj.name}". ` +
              "Si es un resultado de operación booleana anterior, deberás recrearlo."
          )
          return false
        }

        // Apply frontend transform to backend shape
        const transformedId = await applyTransformToBackend(backendId, obj.transform)
        transformedIds.push(transformedId)
      }

      // Intersect all shapes sequentially
      let resultId = transformedIds[0] as string
      for (let i = 1; i < transformedIds.length; i++) {
        const commonResult = await cadService.booleanCommon(resultId, transformedIds[i] as string)
        resultId = commonResult.id
      }

      // DISABLED: Simplify can cause issues with compound shapes
      // const simplifiedResult = await cadService.simplify(resultId, true, true)
      // const finalId = simplifiedResult.id
      const finalId = resultId // Use raw intersect result without simplification

      const meshData = await cadService.tessellate(finalId, 0.1)

      // CRITICAL: Validate mesh data is not empty
      if (
        !meshData ||
        !meshData.vertices ||
        meshData.vertices.length === 0 ||
        !meshData.indices ||
        meshData.indices.length === 0
      ) {
        console.error("[Boolean Intersect] Tessellation returned empty mesh:", {
          finalId,
          hasVertices: !!meshData?.vertices,
          vertexCount: meshData?.vertices?.length ?? 0,
          hasIndices: !!meshData?.indices,
          indexCount: meshData?.indices?.length ?? 0,
        })
        toast.error(
          "La intersección booleana produjo geometría vacía. " +
            "Asegúrate de que los sólidos se intersecten correctamente."
        )
        return false
      }

      const mergedMetadata = mergeBIMMetadata(shapeObjects, "intersect")
      mergedMetadata.backendShapeId = finalId

      // Serialize the shape to BREP for persistence across app restarts
      try {
        const brepData = await cadService.serializeShape(finalId)
        mergedMetadata.brepData = brepData
        console.log("[Boolean Intersect] Shape serialized for persistence:", {
          shapeId: finalId,
          brepSize: brepData.length,
        })
      } catch (serializeError) {
        console.warn(
          "[Boolean Intersect] Failed to serialize shape for persistence:",
          serializeError
        )
      }

      const baseObject = shapeObjects[0]
      if (!baseObject) return false

      // Calculate the centroid of the intersection mesh for correct gizmo placement
      const centroid = calculateMeshCentroid(Array.from(meshData.vertices))

      const newObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
        type: "shape",
        shapeType: "compound",
        parameters: {},
        mesh: {
          vertices: new Float32Array(meshData.vertices),
          indices: new Uint32Array(meshData.indices),
          normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
        },
        metadata: mergedMetadata,
        transform: {
          position: { x: centroid.x, y: centroid.y, z: centroid.z },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        visible: true,
        locked: false,
        selected: true,
        layerId: baseObject.layerId,
        name: `Intersección (${shapeObjects.map((o) => o.name).join(" ∩ ")})`,
        material: baseObject.material || DEFAULT_MATERIAL,
      }

      for (const obj of shapeObjects) {
        deleteObject(obj.id)
      }

      const newId = addObject(newObject)
      shapeIdMap.set(newId, finalId)
      select(newId)

      useModellerStore
        .getState()
        .commitToHistory(`Intersección: ${shapeObjects.map((o) => o.name).join(", ")}`)

      toast.success(`Intersección booleana aplicada exitosamente`)
      return true
    } catch (error) {
      toast.error(
        `Error en intersección: ${error instanceof Error ? error.message : String(error)}`
      )
      return false
    }
  }, [selectedObjects, addObject, deleteObject, select])

  // ============================================================================
  // MIRROR OPERATION
  // ============================================================================

  /**
   * Execute Mirror operation - Creates a mirrored copy of the selected object
   * @param plane - Mirror plane: 'yz' (mirror X), 'xz' (mirror Y), 'xy' (mirror Z)
   * @param keepOriginal - If true, keeps the original object; if false, replaces it
   */
  const executeMirror = useCallback(
    async (plane: "yz" | "xz" | "xy" = "yz", keepOriginal = true) => {
      const shapeObjects = selectedObjects.filter((obj) => obj.type === "shape") as ShapeObject[]

      if (shapeObjects.length === 0) {
        toast.error("Selecciona al menos un sólido para espejar")
        return false
      }

      useModellerStore.getState().saveStateBeforeAction()

      try {
        const results: Array<{ newId: string; backendId: string; sourceObj: ShapeObject }> = []

        for (const obj of shapeObjects) {
          const backendId = getBackendShapeId(obj.id, obj.metadata)
          if (!backendId) {
            toast.error(`No se encontró el sólido "${obj.name}" en el backend`)
            return false
          }

          // Calculate mirror plane based on object's position
          const pos = obj.transform?.position || { x: 0, y: 0, z: 0 }

          // Normal vector for the mirror plane
          let normalX = 0,
            normalY = 0,
            normalZ = 0
          switch (plane) {
            case "yz": // Mirror across YZ plane (flip X)
              normalX = 1
              break
            case "xz": // Mirror across XZ plane (flip Y)
              normalY = 1
              break
            case "xy": // Mirror across XY plane (flip Z)
              normalZ = 1
              break
          }

          // Mirror the shape
          const mirrorResult = await cadService.mirror(
            backendId,
            pos.x,
            pos.y,
            pos.z,
            normalX,
            normalY,
            normalZ
          )

          // Tessellate the mirrored shape
          const meshData = await cadService.tessellate(mirrorResult.id, 0.1)

          // Calculate the centroid of the mirrored mesh for correct gizmo placement
          const centroid = calculateMeshCentroid(Array.from(meshData.vertices))

          // Serialize shape to BREP for persistence across app restarts
          const persistedMetadata = await serializeShapeForPersistence(mirrorResult.id, {
            ...obj.metadata,
            operation: "mirror",
            sourceId: obj.id,
            mirrorPlane: plane,
          })

          const newObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
            type: "shape",
            shapeType: "compound", // Mark as compound so SceneObjectMesh handles it correctly
            parameters: { ...obj.parameters },
            mesh: {
              vertices: new Float32Array(meshData.vertices),
              indices: new Uint32Array(meshData.indices),
              normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
            },
            metadata: persistedMetadata,
            // Use centroid as position so gizmo appears at the correct location
            transform: {
              position: { x: centroid.x, y: centroid.y, z: centroid.z },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            visible: true,
            locked: false,
            selected: true,
            layerId: obj.layerId,
            areaId: obj.areaId,
            name: `${obj.name} (Mirror)`,
            material: obj.material || DEFAULT_MATERIAL,
          }

          // Add the mirrored object
          const newId = addObject(newObject)
          shapeIdMap.set(newId, mirrorResult.id)

          results.push({ newId, backendId: mirrorResult.id, sourceObj: obj })
        }

        // Delete originals if not keeping them
        if (!keepOriginal) {
          for (const { sourceObj } of results) {
            deleteObject(sourceObj.id)
          }
        }

        // Save to history
        const names = shapeObjects.map((o) => o.name).join(", ")
        useModellerStore.getState().commitToHistory(`Mirror: ${names}`)

        // Select the new objects
        const newIds = results.map((r) => r.newId)
        if (newIds.length > 0 && newIds[0]) {
          // Select the first one (or potentially all if API supported it)
          select(newIds[0])
        }

        toast.success(
          `${shapeObjects.length} objeto(s) espejado(s) exitosamente${keepOriginal ? " (original conservado)" : ""}`
        )
        return true
      } catch (error) {
        toast.error(`Error en espejo: ${error instanceof Error ? error.message : String(error)}`)
        return false
      }
    },
    [selectedObjects, addObject, deleteObject, select]
  )

  return {
    dialogState,
    openOperationDialog,
    closeDialog,
    applyOperation,
    setDialogValue: (value: string) => setDialogState((prev) => ({ ...prev, value })),
    setDialogAdvancedValue: (key: string, value: string | number | boolean) =>
      setDialogState((prev) => ({ ...prev, [key]: value })),
    toggleInteractiveMode,
    // Boolean operations
    executeBooleanUnion,
    executeBooleanSubtract,
    executeBooleanIntersect,
    // Modification operations
    executeFillet,
    executeChamfer,
    executeShell,
    // Transform operations
    executeMirror,
  }
}
