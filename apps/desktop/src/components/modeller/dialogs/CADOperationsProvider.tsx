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
  // Boolean operations
  executeBooleanUnion: () => Promise<boolean>
  executeBooleanSubtract: () => Promise<boolean>
  executeBooleanIntersect: () => Promise<boolean>
  // Transform operations
  executeMirror: (plane?: "yz" | "xz" | "xy", keepOriginal?: boolean) => Promise<boolean>
  dialogState: OperationDialogState
  setDialogAdvancedValue: (key: string, value: string | number | boolean) => void
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
    toggleInteractiveMode,
    executeFillet,
    executeChamfer,
    executeShell,
    // Boolean operations
    executeBooleanUnion,
    executeBooleanSubtract,
    executeBooleanIntersect,
    // Transform operations
    executeMirror,
    setDialogAdvancedValue,
  } = useCADOperations()

  return (
    <CADOperationsContext.Provider
      value={{
        openOperationDialog,
        executeFillet,
        executeChamfer,
        executeShell,
        executeBooleanUnion,
        executeBooleanSubtract,
        executeBooleanIntersect,
        executeMirror,
        dialogState,
        setDialogAdvancedValue,
      }}
    >
      {children}
      <FloatingCADOperationsPanel
        open={dialogState.open}
        operation={dialogState.operation as "fillet" | "chamfer" | "shell" | null}
        title={dialogState.title}
        description={dialogState.description}
        label={dialogState.label}
        value={dialogState.value}
        interactiveMode={dialogState.interactiveMode}
        continuity={dialogState.continuity}
        chamferMode={dialogState.chamferMode}
        value2={dialogState.value2}
        angle={dialogState.angle}
        onValueChange={setDialogValue}
        onAdvancedValueChange={setDialogAdvancedValue}
        onApply={applyOperation}
        onCancel={closeDialog}
        onToggleInteractiveMode={toggleInteractiveMode}
      />
    </CADOperationsContext.Provider>
  )
}
