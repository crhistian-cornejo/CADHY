/**
 * CommandContextBridge - CADHY
 *
 * Bridges the CommandContext (inside Canvas) to global state/store (outside Canvas).
 * This allows components outside the Canvas to execute commands.
 */

import { useEffect } from "react"
import { useCommandContext } from "./CommandProvider"

// Global storage for command functions
let globalExecuteBoxCommand: (() => Promise<string | null>) | null = null

export function getExecuteBoxCommand(): (() => Promise<string | null>) | null {
  return globalExecuteBoxCommand
}

export function CommandContextBridge() {
  const { executeBoxCommand } = useCommandContext()

  useEffect(() => {
    // Store command function globally so it can be accessed outside Canvas
    globalExecuteBoxCommand = executeBoxCommand
    console.log("[CommandContextBridge] executeBoxCommand registered globally")

    return () => {
      globalExecuteBoxCommand = null
    }
  }, [executeBoxCommand])

  // This component doesn't render anything
  return null
}

export default CommandContextBridge
