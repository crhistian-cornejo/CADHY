/**
 * Auto-save Hook - CADHY
 *
 * Automatically saves the current project when changes are detected.
 * Respects project settings for auto-save interval.
 */

import { logger } from "@cadhy/shared/logger"
import { useCallback, useEffect, useRef } from "react"
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

/**
 * Hook that automatically saves the project at regular intervals when dirty.
 */
export function useAutoSave(options: UseAutoSaveOptions = {}) {
  const { intervalOverride, onSave, onError, debug = false } = options

  const currentProject = useCurrentProject()
  const settings = useProjectSettings()
  const isDirty = useIsDirty()
  const saveCurrentProject = useProjectStore((s) => s.saveCurrentProject)

  const lastSaveAttempt = useRef<number>(0)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get effective interval (in milliseconds)
  const intervalMs = (intervalOverride ?? settings.autoSaveInterval) * 1000
  const autoSaveEnabled = settings.autoSave

  const performAutoSave = useCallback(async () => {
    if (!currentProject || !isDirty) return

    const now = Date.now()
    const timeSinceLastSave = now - lastSaveAttempt.current

    // Don't save too frequently (minimum 5 second gap)
    if (timeSinceLastSave < 5000) return

    lastSaveAttempt.current = now

    try {
      if (debug) {
        logger.log("[AutoSave] Saving project...", currentProject.name)
      }

      await saveCurrentProject()

      if (debug) {
        logger.log("[AutoSave] Project saved successfully")
      }

      onSave?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Auto-save failed")
      console.error("[AutoSave] Failed to save project:", error.message)
      onError?.(error)
    }
  }, [currentProject, isDirty, saveCurrentProject, onSave, onError, debug])

  useEffect(() => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    // Don't schedule if auto-save is disabled, no project, or not dirty
    if (!autoSaveEnabled || !currentProject || !isDirty) {
      return
    }

    // Schedule next auto-save
    saveTimeoutRef.current = setTimeout(() => {
      performAutoSave()
    }, intervalMs)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [autoSaveEnabled, currentProject, isDirty, intervalMs, performAutoSave])

  // Return controls for manual intervention if needed
  return {
    /** Trigger an immediate save */
    saveNow: performAutoSave,
    /** Whether auto-save is enabled */
    isEnabled: autoSaveEnabled,
    /** Whether there are unsaved changes */
    isDirty,
    /** Current auto-save interval in seconds */
    interval: intervalMs / 1000,
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
          // Don't trigger new project - just do nothing
          return
        }

        if (isSavingRef.current) {
          if (debug) logger.log("[Shortcuts] Already saving, ignoring")
          return
        }

        isSavingRef.current = true
        try {
          if (debug) logger.log("[Shortcuts] Saving project...")
          await saveCurrentProject()
          if (debug) logger.log("[Shortcuts] Project saved")
        } catch (err) {
          console.error("[Shortcuts] Failed to save:", err)
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
  }, [currentProject, saveCurrentProject, onNewProject, onOpenProject, onCloseProject, debug])
}
