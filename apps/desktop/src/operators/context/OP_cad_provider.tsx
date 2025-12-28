/**
 * CAD Operations Provider - CADHY
 *
 * Global provider for CAD operations that can be triggered from anywhere
 * in the modeller (hotkeys, toolbar, menus, etc.)
 */

import { createContext, type ReactNode, useContext } from "react"
import { type OperationDialogState, useCADOperations } from "@/lib/hooks"
import { FloatingCADOperationsPanel } from "./OP_floating_panel"

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
    // During hot reload in development, the provider might not be ready yet
    // Return a no-op context to prevent crash - component will re-render when provider is ready
    if (import.meta.env.DEV) {
      console.warn(
        "[useCADOperationsContext] Provider not available - this is likely a hot reload issue. Component will re-render once provider is ready."
      )
      return {
        openOperationDialog: () => {},
        executeFillet: async () => false,
        executeChamfer: async () => false,
        executeShell: async () => false,
        executeBooleanUnion: async () => false,
        executeBooleanSubtract: async () => false,
        executeBooleanIntersect: async () => false,
        executeMirror: async () => false,
        dialogState: {
          open: false,
          operation: null,
          title: "",
          description: "",
          label: "",
          value: "",
          interactiveMode: false,
        },
        setDialogAdvancedValue: () => {},
      } as CADOperationsContextValue
    }
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
