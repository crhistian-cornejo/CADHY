/**
 * useCommand - CADHY
 *
 * Hook for executing interactive CAD commands.
 * Provides access to viewport context (camera, scene, domElement).
 * Manages ActiveOperationDialog state.
 */

import { useCallback, useState } from "react"
import type * as THREE from "three"
import { BoxCommand, type BoxDialogParams } from "@/commands"
import type { OperationParameter, OperationType } from "@/components/modeller/dialogs"

// ============================================================================
// TYPES
// ============================================================================

export interface CommandContext {
  camera: THREE.Camera | null
  scene: THREE.Scene | null
  domElement: HTMLElement | null
}

export interface ActiveOperationState {
  open: boolean
  operation: OperationType
  title: string
  parameters: OperationParameter[]
  onParameterChange?: (id: string, value: number | string) => void
  onConfirm?: () => void
  onCancel?: () => void
}

// ============================================================================
// HOOK
// ============================================================================

export function useCommand(context: CommandContext) {
  const { camera, scene, domElement } = context

  const [activeOperation, setActiveOperation] = useState<ActiveOperationState>({
    open: false,
    operation: "extrude",
    title: "",
    parameters: [],
  })

  /**
   * Execute box creation command
   */
  const executeBoxCommand = useCallback(async (): Promise<string | null> => {
    if (!camera || !scene || !domElement) {
      console.error("[useCommand] Missing viewport context")
      return null
    }

    console.log("[useCommand] Starting box command...")

    const command = new BoxCommand({
      camera,
      scene,
      domElement,
      onShowDialog: (params: BoxDialogParams) => {
        console.log("[useCommand] Showing dialog with params:", params)
        setActiveOperation({
          open: true,
          operation: "extrude",
          title: "Box",
          parameters: [
            {
              id: "width",
              label: "Width",
              value: params.width,
              unit: "m",
              shortcut: "W",
              type: "number",
              min: 0.01,
              step: 0.1,
            },
            {
              id: "length",
              label: "Length",
              value: params.length,
              unit: "m",
              shortcut: "L",
              type: "number",
              min: 0.01,
              step: 0.1,
            },
            {
              id: "height",
              label: "Height",
              value: params.height,
              unit: "m",
              shortcut: "H",
              type: "number",
              min: 0.01,
              step: 0.1,
            },
          ],
          onParameterChange: params.onParameterChange,
          onConfirm: params.onConfirm,
          onCancel: params.onCancel,
        })
      },
      onHideDialog: () => {
        console.log("[useCommand] Hiding dialog")
        setActiveOperation((prev) => ({ ...prev, open: false }))
      },
    })

    try {
      const shapeId = await command.execute()
      console.log("[useCommand] Box command completed, shapeId:", shapeId)
      return shapeId
    } catch (error) {
      console.error("[useCommand] Box command failed:", error)
      throw error
    }
  }, [camera, scene, domElement])

  return {
    executeBoxCommand,
    activeOperation,
  }
}

export default useCommand
