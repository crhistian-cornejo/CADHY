/**
 * Auto-save Hook - CADHY
 *
 * Automatically saves the current project every 20 seconds when changes are detected.
 * Features:
 * - Real-time countdown to next save
 * - Visual status feedback via autosave-store
 * - Debounced saves to prevent excessive disk writes
 * - Error handling with retry logic
 */

import { logger } from "@cadhy/shared/logger"
import { useCallback, useEffect, useRef } from "react"
import { useAutoSaveStore } from "@/stores/autosave-store"
import { useIsDirty } from "@/stores/modeller"
import { useCurrentProject, useProjectSettings, useProjectStore } from "@/stores/project-store"

interface UseAutoSaveOptions {
  /** Override the auto-save interval (in seconds) */
  intervalOverride?: number
  /** Callback when auto-save completes */
  onSave?: () => void
  /** Callback when auto-save fails */
  onError?: (error: Error) => void
  /** Whether to show console logs */
  debug?: boolean
}

// Minimum time between saves (prevents rapid successive saves)
const MIN_SAVE_GAP_MS = 3000 // 3 seconds

/**
 * Hook that automatically saves the project at regular intervals when dirty.
 * Provides real-time countdown and status feedback.
 */
export function useAutoSave(options: UseAutoSaveOptions = {}) {
  const { intervalOverride, onSave, onError, debug = false } = options

  // Project state
  const currentProject = useCurrentProject()
  const settings = useProjectSettings()
  const isDirty = useIsDirty()
  const saveCurrentProject = useProjectStore((s) => s.saveCurrentProject)

  // Auto-save store actions
  const {
    setStatus,
    setCountdown,
    markSaved,
    markError,
    setConfig,
    reset: resetAutoSave,
  } = useAutoSaveStore()

  // Refs for tracking state
  const lastSaveAttempt = useRef<number>(0)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)

  // Get effective interval (in seconds)
  const intervalSeconds = intervalOverride ?? settings.autoSaveInterval
  const autoSaveEnabled = settings.autoSave

  // Sync config to store
  useEffect(() => {
    setConfig(autoSaveEnabled, intervalSeconds)
  }, [autoSaveEnabled, intervalSeconds, setConfig])

  /**
   * Perform the actual save operation
   */
  const performSave = useCallback(async () => {
    if (!currentProject || !isDirty) {
      if (debug) logger.log("[AutoSave] Skipping - no project or not dirty")
      return false
    }

    // Prevent concurrent saves
    if (isSavingRef.current) {
      if (debug) logger.log("[AutoSave] Already saving, skipping")
      return false
    }

    // Check minimum gap
    const now = Date.now()
    const timeSinceLastSave = now - lastSaveAttempt.current
    if (timeSinceLastSave < MIN_SAVE_GAP_MS) {
      if (debug) logger.log("[AutoSave] Too soon since last save, skipping")
      return false
    }

    isSavingRef.current = true
    lastSaveAttempt.current = now
    setStatus("saving")

    try {
      if (debug) {
        logger.log(`[AutoSave] Saving project: ${currentProject.name}`)
      }

      await saveCurrentProject()

      markSaved()
      onSave?.()

      if (debug) {
        logger.log("[AutoSave] Project saved successfully")
      }

      // After a short delay, show as idle or pending
      setTimeout(() => {
        const store = useAutoSaveStore.getState()
        if (store.status === "saved") {
          setStatus("idle")
        }
      }, 2000)

      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Auto-save failed")
      console.error("[AutoSave] Failed to save project:", error.message)
      markError(error.message)
      onError?.(error)
      return false
    } finally {
      isSavingRef.current = false
    }
  }, [
    currentProject,
    isDirty,
    saveCurrentProject,
    setStatus,
    markSaved,
    markError,
    onSave,
    onError,
    debug,
  ])

  /**
   * Start countdown timer
   */
  const startCountdown = useCallback(
    (seconds: number) => {
      // Clear existing countdown
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }

      let remaining = seconds
      setCountdown(remaining)
      setStatus("pending")

      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1

        if (remaining <= 0) {
          // Time to save
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
          setCountdown(null)
          performSave()
        } else {
          setCountdown(remaining)
        }
      }, 1000)
    },
    [setCountdown, setStatus, performSave]
  )

  /**
   * Schedule next auto-save
   */
  const scheduleAutoSave = useCallback(() => {
    // Clear any existing timers
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    // Don't schedule if disabled, no project, or not dirty
    if (!autoSaveEnabled || !currentProject || !isDirty) {
      setCountdown(null)
      if (!isDirty && currentProject) {
        setStatus("idle")
      }
      return
    }

    // Start countdown
    startCountdown(intervalSeconds)
  }, [
    autoSaveEnabled,
    currentProject,
    isDirty,
    intervalSeconds,
    startCountdown,
    setCountdown,
    setStatus,
  ])

  /**
   * Effect: Schedule auto-save when dirty state changes
   */
  useEffect(() => {
    scheduleAutoSave()

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [scheduleAutoSave])

  /**
   * Effect: Reset when project changes or closes
   */
  useEffect(() => {
    if (!currentProject) {
      resetAutoSave()
    }
  }, [currentProject, resetAutoSave])

  // Return controls for manual intervention
  return {
    /** Trigger an immediate save */
    saveNow: performSave,
    /** Whether auto-save is enabled */
    isEnabled: autoSaveEnabled,
    /** Whether there are unsaved changes */
    isDirty,
    /** Current auto-save interval in seconds */
    interval: intervalSeconds,
    /** Reschedule auto-save (useful after manual save) */
    reschedule: scheduleAutoSave,
  }
}

/**
 * Hook that warns the user about unsaved changes when trying to close/navigate.
 */
export function useUnsavedChangesWarning() {
  const isDirty = useIsDirty()
  const currentProject = useCurrentProject()

  useEffect(() => {
    if (!isDirty || !currentProject) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Most modern browsers ignore custom messages, but we still need to set returnValue
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
      return e.returnValue
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty, currentProject])

  return isDirty
}

// ============================================================================
// PROJECT KEYBOARD SHORTCUTS
// ============================================================================

interface UseProjectShortcutsOptions {
  /** Called when user triggers New Project (Cmd+N) */
  onNewProject?: () => void
  /** Called when user triggers Open Project (Cmd+O) */
  onOpenProject?: () => void
  /** Called when user triggers Close Project (Cmd+W) */
  onCloseProject?: () => void
  /** Whether to show console logs */
  debug?: boolean
}

/**
 * Hook that handles global project keyboard shortcuts.
 * - Cmd/Ctrl+S: Save current project
 * - Cmd/Ctrl+Shift+S: Save As
 * - Cmd/Ctrl+N: New project (callback)
 * - Cmd/Ctrl+O: Open project (callback)
 * - Cmd/Ctrl+W: Close project (callback)
 */
export function useProjectShortcuts(options: UseProjectShortcutsOptions = {}) {
  const { onNewProject, onOpenProject, onCloseProject, debug = false } = options

  const currentProject = useCurrentProject()
  const saveCurrentProject = useProjectStore((s) => s.saveCurrentProject)
  const { setStatus, markSaved, markError } = useAutoSaveStore()
  const isSavingRef = useRef(false)

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = e.key.toLowerCase()
      const isCtrl = e.ctrlKey || e.metaKey
      const isShift = e.shiftKey

      // Cmd/Ctrl+S: Save
      if (key === "s" && isCtrl && !isShift) {
        e.preventDefault()

        if (!currentProject) {
          if (debug) logger.log("[Shortcuts] No project to save")
          return
        }

        if (isSavingRef.current) {
          if (debug) logger.log("[Shortcuts] Already saving, ignoring")
          return
        }

        isSavingRef.current = true
        setStatus("saving")

        try {
          if (debug) logger.log("[Shortcuts] Saving project...")
          await saveCurrentProject()
          markSaved()
          if (debug) logger.log("[Shortcuts] Project saved")

          // Reset status after brief display
          setTimeout(() => {
            const store = useAutoSaveStore.getState()
            if (store.status === "saved") {
              setStatus("idle")
            }
          }, 2000)
        } catch (err) {
          const error = err instanceof Error ? err : new Error("Save failed")
          console.error("[Shortcuts] Failed to save:", error)
          markError(error.message)
        } finally {
          isSavingRef.current = false
        }
      }
      // Cmd/Ctrl+Shift+S: Save As (TODO: implement dialog)
      else if (key === "s" && isCtrl && isShift) {
        e.preventDefault()
        if (debug) logger.log("[Shortcuts] Save As - not yet implemented")
        // TODO: Open Save As dialog
      }
      // Cmd/Ctrl+N: New Project
      else if (key === "n" && isCtrl) {
        e.preventDefault()
        if (debug) logger.log("[Shortcuts] New Project")
        onNewProject?.()
      }
      // Cmd/Ctrl+O: Open Project
      else if (key === "o" && isCtrl) {
        e.preventDefault()
        if (debug) logger.log("[Shortcuts] Open Project")
        onOpenProject?.()
      }
      // Cmd/Ctrl+W: Close Project
      else if (key === "w" && isCtrl && !isShift) {
        e.preventDefault()
        if (debug) logger.log("[Shortcuts] Close Project")
        onCloseProject?.()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    currentProject,
    saveCurrentProject,
    setStatus,
    markSaved,
    markError,
    onNewProject,
    onOpenProject,
    onCloseProject,
    debug,
  ])
}
