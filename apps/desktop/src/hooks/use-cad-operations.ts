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

export interface OperationDialogState {
  open: boolean
  operation: "fillet" | "chamfer" | "shell" | "extrude" | "offset" | null
  value: string
  title: string
  description: string
  label: string
  /** Interactive mode - uses edge gizmos instead of dialog */
  interactiveMode: boolean
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

export function useCADOperations() {
  const selectedObjects = useSelectedObjects()
  const { addObject, deleteObject } = useModellerStore()

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
    async (radius: number) => {
      if (selectedObjects.length === 0) {
        toast.error("No objects selected")
        return false
      }

      // Save state before action for proper undo
      useModellerStore.getState().saveStateBeforeAction()

      const selectedObject = selectedObjects[0]
      console.log("[CAD Operations] === FILLET OPERATION ===")
      console.log("[CAD Operations] Selected object ID:", selectedObject.id)
      console.log("[CAD Operations] Selected object type:", selectedObject.type)
      console.log("[CAD Operations] Selected object name:", selectedObject.name)
      console.log("[CAD Operations] Metadata:", JSON.stringify(selectedObject.metadata, null, 2))
      console.log("[CAD Operations] shapeIdMap size:", shapeIdMap.size)
      console.log("[CAD Operations] shapeIdMap contents:", Array.from(shapeIdMap.entries()))

      // Try to get backend ID from shapeIdMap first, then from metadata as fallback
      let backendId = shapeIdMap.get(selectedObject.id)
      console.log("[CAD Operations] Backend ID from shapeIdMap:", backendId)

      // Fallback: try to get from metadata
      if (!backendId && selectedObject.metadata?.backendShapeId) {
        backendId = selectedObject.metadata.backendShapeId as string
        console.log("[CAD Operations] Using backend ID from metadata:", backendId)
        // Register it in the map for future use
        shapeIdMap.set(selectedObject.id, backendId)
      }

      if (!backendId) {
        console.error("[CAD Operations] === SHAPE NOT FOUND ===")
        console.error("[CAD Operations] Failed to find backend shape ID")
        console.error("[CAD Operations] This usually means the object was created incorrectly")
        console.error("[CAD Operations] Try creating a new object and applying the operation to it")
        toast.error("Shape not found in backend. Try creating a new object.")
        return false
      }

      try {
        const result = await cadService.fillet(backendId, radius)

        if (result) {
          const meshData = await cadService.tessellate(result.id, 0.1)
          const newObject = {
            type: "shape" as const,
            mesh: {
              vertices: new Float32Array(meshData.vertices),
              indices: new Uint32Array(meshData.indices),
              normals: new Float32Array(meshData.normals),
            },
            metadata: {
              backendShapeId: result.id,
              operation: "fillet",
              sourceId: selectedObject.id,
              parameter: radius,
            },
            position: selectedObject.position,
            rotation: selectedObject.rotation,
            scale: selectedObject.scale,
            visible: true,
            name: `Fillet ${radius}`,
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
    async (distance: number) => {
      if (selectedObjects.length === 0) {
        toast.error("No objects selected")
        return false
      }

      // Save state before action for proper undo
      useModellerStore.getState().saveStateBeforeAction()

      const selectedObject = selectedObjects[0]

      // Try to get backend ID from shapeIdMap first, then from metadata as fallback
      let backendId = shapeIdMap.get(selectedObject.id)
      if (!backendId && selectedObject.metadata?.backendShapeId) {
        backendId = selectedObject.metadata.backendShapeId
        shapeIdMap.set(selectedObject.id, backendId)
      }

      if (!backendId) {
        toast.error("Shape not found in backend")
        return false
      }

      try {
        const result = await cadService.chamfer(backendId, distance)

        if (result) {
          const meshData = await cadService.tessellate(result.id, 0.1)
          const newObject = {
            type: "shape" as const,
            mesh: {
              vertices: new Float32Array(meshData.vertices),
              indices: new Uint32Array(meshData.indices),
              normals: new Float32Array(meshData.normals),
            },
            metadata: {
              backendShapeId: result.id,
              operation: "chamfer",
              sourceId: selectedObject.id,
              parameter: distance,
            },
            position: selectedObject.position,
            rotation: selectedObject.rotation,
            scale: selectedObject.scale,
            visible: true,
            name: `Chamfer ${distance}`,
          }

          deleteObject(selectedObject.id)
          const newId = addObject(newObject)
          shapeIdMap.set(newId, result.id)

          // Save to history
          useModellerStore.getState().commitToHistory(`Chaflán: ${selectedObject.name}`)

          toast.success("Chamfer applied successfully")
          return true
        }
        return false
      } catch (error) {
        toast.error(`Chamfer failed: ${error instanceof Error ? error.message : String(error)}`)
        return false
      }
    },
    [selectedObjects, addObject, deleteObject]
  )

  // Execute Shell operation
  const executeShell = useCallback(
    async (thickness: number) => {
      if (selectedObjects.length === 0) {
        toast.error("No objects selected")
        return false
      }

      // Save state before action for proper undo
      useModellerStore.getState().saveStateBeforeAction()

      const selectedObject = selectedObjects[0]

      // Try to get backend ID from shapeIdMap first, then from metadata as fallback
      let backendId = shapeIdMap.get(selectedObject.id)
      if (!backendId && selectedObject.metadata?.backendShapeId) {
        backendId = selectedObject.metadata.backendShapeId
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
          const newObject = {
            type: "shape" as const,
            mesh: {
              vertices: new Float32Array(meshData.vertices),
              indices: new Uint32Array(meshData.indices),
              normals: new Float32Array(meshData.normals),
            },
            metadata: {
              backendShapeId: result.id,
              operation: "shell",
              sourceId: selectedObject.id,
              parameter: thickness,
            },
            position: selectedObject.position,
            rotation: selectedObject.rotation,
            scale: selectedObject.scale,
            visible: true,
            name: `Shell ${thickness}`,
          }

          deleteObject(selectedObject.id)
          const newId = addObject(newObject)
          shapeIdMap.set(newId, result.id)

          // Save to history
          useModellerStore.getState().commitToHistory(`Desfase de la cara: ${selectedObject.name}`)

          toast.success("Shell applied successfully")
          return true
        }
        return false
      } catch (error) {
        toast.error(`Shell failed: ${error instanceof Error ? error.message : String(error)}`)
        return false
      }
    },
    [selectedObjects, addObject, deleteObject]
  )

  // Open dialog for operation
  const openOperationDialog = useCallback((operation: "fillet" | "chamfer" | "shell") => {
    const configs = {
      fillet: {
        title: "Fillet (Round Edges)",
        description: "Enter the radius for rounding edges",
        label: "Radius",
        defaultValue: "1.0",
      },
      chamfer: {
        title: "Chamfer (Bevel Edges)",
        description: "Enter the distance for beveling edges",
        label: "Distance",
        defaultValue: "0.5",
      },
      shell: {
        title: "Shell (Hollow Out)",
        description: "Enter the wall thickness",
        label: "Thickness",
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
    })
  }, [])

  // Close dialog
  const closeDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, open: false }))
  }, [])

  // Apply operation from dialog
  const applyOperation = useCallback(async () => {
    const value = parseFloat(dialogState.value)
    if (Number.isNaN(value) || value <= 0) {
      toast.error("Please enter a valid positive number")
      return
    }

    let success = false
    switch (dialogState.operation) {
      case "fillet":
        success = await executeFillet(value)
        break
      case "chamfer":
        success = await executeChamfer(value)
        break
      case "shell":
        success = await executeShell(value)
        break
    }

    if (success) {
      closeDialog()
    }
  }, [dialogState, executeFillet, executeChamfer, executeShell, closeDialog])

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
      // Get backend IDs for all selected objects and verify they exist
      const backendIds: string[] = []
      for (const obj of shapeObjects) {
        const backendId = getBackendShapeId(obj.id, obj.metadata)
        if (!backendId) {
          toast.error(`No se encontró el ID del sólido "${obj.name}"`)
          return false
        }

        // Verify shape exists in backend
        const exists = await cadService.shapeExists(backendId)
        if (!exists) {
          toast.error(
            `El sólido "${obj.name}" ya no existe en el backend. ` +
              "Esto puede ocurrir si la aplicación fue reiniciada. " +
              "Por favor, crea los sólidos nuevamente."
          )
          return false
        }
        backendIds.push(backendId)
      }

      // Fuse all shapes sequentially
      let resultId = backendIds[0]
      for (let i = 1; i < backendIds.length; i++) {
        const fuseResult = await cadService.booleanFuse(resultId, backendIds[i])
        resultId = fuseResult.id
      }

      // Simplify the result to clean up geometry
      const simplifiedResult = await cadService.simplify(resultId, true, true)
      const finalId = simplifiedResult.id

      // Tessellate the final result
      const meshData = await cadService.tessellate(finalId, 0.1)

      // Merge BIM metadata from all source objects
      const mergedMetadata = mergeBIMMetadata(shapeObjects, "union")
      mergedMetadata.backendShapeId = finalId

      // Use the first object's position and material as base
      const baseObject = shapeObjects[0]
      const newObject = {
        type: "shape" as const,
        shapeType: "compound" as const,
        parameters: {},
        mesh: {
          vertices: new Float32Array(meshData.vertices),
          indices: new Uint32Array(meshData.indices),
          normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
        },
        metadata: mergedMetadata,
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        visible: true,
        name: `Union (${shapeObjects.map((o) => o.name).join(" + ")})`,
        material: baseObject.material,
      }

      // Delete all original objects
      for (const obj of shapeObjects) {
        deleteObject(obj.id)
      }

      // Add the new fused object
      const newId = addObject(newObject)
      shapeIdMap.set(newId, finalId)

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
  }, [selectedObjects, addObject, deleteObject])

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
      const backendIds: string[] = []
      for (const obj of shapeObjects) {
        const backendId = getBackendShapeId(obj.id, obj.metadata)
        if (!backendId) {
          toast.error(`No se encontró el ID del sólido "${obj.name}"`)
          return false
        }

        // Verify shape exists in backend
        const exists = await cadService.shapeExists(backendId)
        if (!exists) {
          toast.error(
            `El sólido "${obj.name}" ya no existe en el backend. ` +
              "Por favor, crea los sólidos nuevamente."
          )
          return false
        }
        backendIds.push(backendId)
      }

      // Cut all tool shapes from the base
      let resultId = backendIds[0]
      for (let i = 1; i < backendIds.length; i++) {
        const cutResult = await cadService.booleanCut(resultId, backendIds[i])
        resultId = cutResult.id
      }

      // Simplify the result
      const simplifiedResult = await cadService.simplify(resultId, true, true)
      const finalId = simplifiedResult.id

      const meshData = await cadService.tessellate(finalId, 0.1)

      const mergedMetadata = mergeBIMMetadata(shapeObjects, "subtract")
      mergedMetadata.backendShapeId = finalId

      const baseObject = shapeObjects[0]
      const toolNames = shapeObjects.slice(1).map((o) => o.name)

      const newObject = {
        type: "shape" as const,
        shapeType: "compound" as const,
        parameters: {},
        mesh: {
          vertices: new Float32Array(meshData.vertices),
          indices: new Uint32Array(meshData.indices),
          normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
        },
        metadata: mergedMetadata,
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        visible: true,
        name: `${baseObject.name} - (${toolNames.join(", ")})`,
        material: baseObject.material,
      }

      for (const obj of shapeObjects) {
        deleteObject(obj.id)
      }

      const newId = addObject(newObject)
      shapeIdMap.set(newId, finalId)

      useModellerStore
        .getState()
        .commitToHistory(`Resta: ${baseObject.name} - ${toolNames.join(", ")}`)

      toast.success(`Resta booleana aplicada exitosamente`)
      return true
    } catch (error) {
      toast.error(`Error en resta: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }, [selectedObjects, addObject, deleteObject])

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
      const backendIds: string[] = []
      for (const obj of shapeObjects) {
        const backendId = getBackendShapeId(obj.id, obj.metadata)
        if (!backendId) {
          toast.error(`No se encontró el ID del sólido "${obj.name}"`)
          return false
        }

        // Verify shape exists in backend
        const exists = await cadService.shapeExists(backendId)
        if (!exists) {
          toast.error(
            `El sólido "${obj.name}" ya no existe en el backend. ` +
              "Por favor, crea los sólidos nuevamente."
          )
          return false
        }
        backendIds.push(backendId)
      }

      // Intersect all shapes sequentially
      let resultId = backendIds[0]
      for (let i = 1; i < backendIds.length; i++) {
        const commonResult = await cadService.booleanCommon(resultId, backendIds[i])
        resultId = commonResult.id
      }

      // Simplify the result
      const simplifiedResult = await cadService.simplify(resultId, true, true)
      const finalId = simplifiedResult.id

      const meshData = await cadService.tessellate(finalId, 0.1)

      const mergedMetadata = mergeBIMMetadata(shapeObjects, "intersect")
      mergedMetadata.backendShapeId = finalId

      const baseObject = shapeObjects[0]

      const newObject = {
        type: "shape" as const,
        shapeType: "compound" as const,
        parameters: {},
        mesh: {
          vertices: new Float32Array(meshData.vertices),
          indices: new Uint32Array(meshData.indices),
          normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
        },
        metadata: mergedMetadata,
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        visible: true,
        name: `Intersección (${shapeObjects.map((o) => o.name).join(" ∩ ")})`,
        material: baseObject.material,
      }

      for (const obj of shapeObjects) {
        deleteObject(obj.id)
      }

      const newId = addObject(newObject)
      shapeIdMap.set(newId, finalId)

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
  }, [selectedObjects, addObject, deleteObject])

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

          const newObject = {
            type: "shape" as const,
            shapeType: obj.shapeType,
            parameters: obj.parameters,
            mesh: {
              vertices: new Float32Array(meshData.vertices),
              indices: new Uint32Array(meshData.indices),
              normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
            },
            metadata: {
              ...obj.metadata,
              backendShapeId: mirrorResult.id,
              operation: "mirror",
              sourceId: obj.id,
              mirrorPlane: plane,
            },
            transform: obj.transform,
            visible: true,
            name: `${obj.name} (Mirror)`,
            material: obj.material,
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

        toast.success(
          `${shapeObjects.length} objeto(s) espejado(s) exitosamente${keepOriginal ? " (original conservado)" : ""}`
        )
        return true
      } catch (error) {
        toast.error(`Error en espejo: ${error instanceof Error ? error.message : String(error)}`)
        return false
      }
    },
    [selectedObjects, addObject, deleteObject]
  )

  return {
    dialogState,
    openOperationDialog,
    closeDialog,
    applyOperation,
    setDialogValue: (value: string) => setDialogState((prev) => ({ ...prev, value })),
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
