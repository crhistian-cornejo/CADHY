/**
 * CommandProvider - CADHY
 *
 * Provides command execution context inside the Canvas.
 * Has access to Three.js camera, scene, and dom element.
 */

import { useThree } from "@react-three/fiber"
import { createContext, type ReactNode, useContext, useEffect, useState } from "react"
import { type ActiveOperationState, useCommand } from "@/hooks"
import { updateActiveOperationState } from "./ActiveOperationRenderer"
import { CommandContextBridge } from "./CommandContextBridge"

// ============================================================================
// CONTEXT
// ============================================================================

interface CommandContextValue {
  executeBoxCommand: () => Promise<string | null>
  activeOperation: ActiveOperationState
}

const CommandContext = createContext<CommandContextValue | null>(null)

export function useCommandContext() {
  const context = useContext(CommandContext)
  if (!context) {
    throw new Error("useCommandContext must be used within CommandProvider")
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

interface CommandProviderProps {
  children: ReactNode
}

export function CommandProvider({ children }: CommandProviderProps) {
  const { camera, scene, gl } = useThree()
  const [domElement, setDomElement] = useState<HTMLElement | null>(null)

  // Get the canvas element
  useEffect(() => {
    if (gl.domElement) {
      setDomElement(gl.domElement)
    }
  }, [gl])

  // Use command hook with viewport context
  const { executeBoxCommand, activeOperation } = useCommand({
    camera: camera || null,
    scene: scene || null,
    domElement,
  })

  // Publish active operation state to renderer outside Canvas
  useEffect(() => {
    updateActiveOperationState(activeOperation)
  }, [activeOperation])

  return (
    <CommandContext.Provider value={{ executeBoxCommand, activeOperation }}>
      <CommandContextBridge />
      {children}
    </CommandContext.Provider>
  )
}

export default CommandProvider
