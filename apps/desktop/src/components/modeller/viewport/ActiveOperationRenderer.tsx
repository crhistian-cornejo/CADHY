/**
 * ActiveOperationRenderer - CADHY
 *
 * Renders ActiveOperationDialog outside the Canvas based on command state.
 * Uses a React context bridge to access command state from inside Canvas.
 */

import { useEffect, useState } from "react"
import type { ActiveOperationState } from "@/hooks"
import { ActiveOperationDialog } from "../dialogs/ActiveOperationDialog"

// ============================================================================
// GLOBAL STATE BRIDGE
// ============================================================================

// We use a simple event emitter pattern to bridge the context from inside Canvas
// to outside Canvas where we need to render the dialog
let activeOperationState: ActiveOperationState | null = null
const listeners = new Set<(state: ActiveOperationState) => void>()

export function updateActiveOperationState(state: ActiveOperationState) {
  activeOperationState = state
  listeners.forEach((listener) => listener(state))
}

export function subscribeToActiveOperationState(listener: (state: ActiveOperationState) => void) {
  listeners.add(listener)
  if (activeOperationState) {
    listener(activeOperationState)
  }
  return () => listeners.delete(listener)
}

// ============================================================================
// RENDERER COMPONENT
// ============================================================================

export function ActiveOperationRenderer() {
  const [state, setState] = useState<ActiveOperationState | null>(null)

  useEffect(() => {
    return subscribeToActiveOperationState(setState)
  }, [])

  if (!state || !state.open) {
    return null
  }

  return (
    <ActiveOperationDialog
      open={state.open}
      operation={state.operation}
      title={state.title}
      parameters={state.parameters}
      onParameterChange={state.onParameterChange}
      onConfirm={state.onConfirm}
      onCancel={state.onCancel}
    />
  )
}

export default ActiveOperationRenderer
