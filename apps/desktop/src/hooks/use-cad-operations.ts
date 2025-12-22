/**
 * CAD Operations Hook - CADHY
 *
 * Shared hook for CAD operations across the application.
 * Handles parameter dialogs and backend communication.
 */

import { toast } from "@cadhy/ui"
import { useCallback, useState } from "react"
import * as cadService from "@/services/cad-service"
import { useModellerStore, useSelectedObjects } from "@/stores/modeller"
import { shapeIdMap } from "./use-cad"

export interface OperationDialogState {
  open: boolean
  operation: "fillet" | "chamfer" | "shell" | "extrude" | "offset" | null
  value: string
  title: string
  description: string
  label: string
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
  })

  // Execute Fillet operation
  const executeFillet = useCallback(
    async (radius: number) => {
      if (selectedObjects.length === 0) {
        toast.error("No objects selected")
        return false
      }

      const selectedObject = selectedObjects[0]
      const backendId = shapeIdMap.get(selectedObject.id)

      if (!backendId) {
        toast.error("Shape not found in backend")
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

      const selectedObject = selectedObjects[0]
      const backendId = shapeIdMap.get(selectedObject.id)

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

      const selectedObject = selectedObjects[0]
      const backendId = shapeIdMap.get(selectedObject.id)

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

  return {
    dialogState,
    openOperationDialog,
    closeDialog,
    applyOperation,
    setDialogValue: (value: string) => setDialogState((prev) => ({ ...prev, value })),
    executeFillet,
    executeChamfer,
    executeShell,
  }
}
