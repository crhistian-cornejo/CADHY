/**
 * CAD Operations Provider - CADHY
 *
 * Global provider for CAD operations that can be triggered from anywhere
 * in the modeller (hotkeys, toolbar, menus, etc.)
 */

import { createContext, type ReactNode, useContext } from "react"
import { type OperationDialogState, useCADOperations } from "@/hooks"
import { FloatingCADOperationsPanel } from "./FloatingCADOperationsPanel"

// ============================================================================
// CONTEXT
// ============================================================================

interface CADOperationsContextValue {
  openOperationDialog: (operation: "fillet" | "chamfer" | "shell") => void
  executeFillet: (radius: number) => Promise<boolean>
  executeChamfer: (distance: number) => Promise<boolean>
  executeShell: (thickness: number) => Promise<boolean>
  dialogState: OperationDialogState
}

const CADOperationsContext = createContext<CADOperationsContextValue | null>(null)

export function useCADOperationsContext() {
  const context = useContext(CADOperationsContext)
  if (!context) {
    throw new Error("useCADOperationsContext must be used within CADOperationsProvider")
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

interface CADOperationsProviderProps {
  children: ReactNode
}

export function CADOperationsProvider({ children }: CADOperationsProviderProps) {
  const {
    dialogState,
    openOperationDialog,
    closeDialog,
    applyOperation,
    setDialogValue,
    executeFillet,
    executeChamfer,
    executeShell,
  } = useCADOperations()

  return (
    <CADOperationsContext.Provider
      value={{
        openOperationDialog,
        executeFillet,
        executeChamfer,
        executeShell,
        dialogState,
      }}
    >
      {children}
      <FloatingCADOperationsPanel
        open={dialogState.open}
        operation={dialogState.operation}
        title={dialogState.title}
        description={dialogState.description}
        label={dialogState.label}
        value={dialogState.value}
        onValueChange={setDialogValue}
        onApply={applyOperation}
        onCancel={closeDialog}
      />
    </CADOperationsContext.Provider>
  )
}
