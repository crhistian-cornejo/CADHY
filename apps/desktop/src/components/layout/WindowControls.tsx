/**
 * WindowControls - Cross-platform window control buttons
 *
 * Renders minimize, maximize/restore, and close buttons for Windows/Linux.
 * On macOS, returns null since native traffic lights are used.
 */

import { Button, cn } from "@cadhy/ui"
import { Cancel01Icon, Copy01Icon, MinusSignIcon, SquareIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { getCurrentWindow, type Window } from "@tauri-apps/api/window"
import { useCallback, useEffect, useRef, useState } from "react"
import { usePlatform } from "@/hooks/use-platform"

// Check if we're running in Tauri context
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

interface WindowControlsProps {
  className?: string
}

export function WindowControls({ className }: WindowControlsProps) {
  const { isMacOS } = usePlatform()
  const [isMaximized, setIsMaximized] = useState(false)
  const appWindowRef = useRef<Window | null>(null)

  // Get window reference on mount
  useEffect(() => {
    if (isTauri) {
      appWindowRef.current = getCurrentWindow()
    }
  }, [])

  // Track maximize state
  useEffect(() => {
    if (!isTauri || !appWindowRef.current) return

    const appWindow = appWindowRef.current

    const checkMaximized = async () => {
      try {
        const maximized = await appWindow.isMaximized()
        setIsMaximized(maximized)
      } catch {
        // Ignore errors if window not available
      }
    }

    checkMaximized()

    // Listen for window resize events to update maximize state
    const unlisten = appWindow.onResized(async () => {
      try {
        const maximized = await appWindow.isMaximized()
        setIsMaximized(maximized)
      } catch {
        // Ignore errors
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const handleMinimize = useCallback(async () => {
    if (!appWindowRef.current) return
    try {
      await appWindowRef.current.minimize()
    } catch {
      console.error("Failed to minimize window")
    }
  }, [])

  const handleMaximize = useCallback(async () => {
    if (!appWindowRef.current) return
    try {
      await appWindowRef.current.toggleMaximize()
    } catch {
      console.error("Failed to toggle maximize")
    }
  }, [])

  const handleClose = useCallback(async () => {
    if (!appWindowRef.current) return
    try {
      await appWindowRef.current.close()
    } catch {
      console.error("Failed to close window")
    }
  }, [])

  // On macOS with overlay titlebar, use native traffic lights
  if (isMacOS) {
    return null
  }

  return (
    <div className={cn("flex items-center", className)}>
      {/* Minimize */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleMinimize}
        className="rounded-none hover:bg-muted h-8 w-11"
        data-tauri-drag-region="false"
      >
        <HugeiconsIcon icon={MinusSignIcon} className="size-3.5" />
      </Button>

      {/* Maximize/Restore */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleMaximize}
        className="rounded-none hover:bg-muted h-8 w-11"
        data-tauri-drag-region="false"
      >
        <HugeiconsIcon icon={isMaximized ? Copy01Icon : SquareIcon} className="size-3.5" />
      </Button>

      {/* Close */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleClose}
        className="rounded-none hover:bg-destructive hover:text-destructive-foreground h-8 w-11"
        data-tauri-drag-region="false"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
      </Button>
    </div>
  )
}
