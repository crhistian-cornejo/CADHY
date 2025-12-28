/**
 * Hotkey Hooks - CADHY
 *
 * React hooks for registering and using keyboard shortcuts.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { formatKeysForDisplay, hotkeyRegistry } from "@/services/hotkey-registry"
import { type HotkeyCategory, type HotkeyDefinition, useHotkeyStore } from "@/stores/hotkey-store"

// Cached snapshot for useSyncExternalStore
let cachedHotkeys: HotkeyDefinition[] = []
let cacheVersion = 0

function updateCache() {
  cachedHotkeys = hotkeyRegistry.getAll()
  cacheVersion++
}

// Initialize cache
updateCache()

// Subscribe to registry changes to update cache
hotkeyRegistry.subscribe(() => {
  updateCache()
})

// ============================================================================
// TYPES
// ============================================================================

export interface UseHotkeyOptions {
  /** Unique identifier for this hotkey */
  id: string
  /** Display name */
  name: string
  /** Description of what the hotkey does */
  description: string
  /** Category for organization */
  category: HotkeyCategory
  /** Default key combinations */
  keys: string[]
  /** Whether the hotkey is enabled (default: true) */
  enabled?: boolean
  /** Context where the hotkey is active */
  context?: "global" | "modeller" | "viewport" | "dialog"
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Register a hotkey with the global registry
 */
export function useHotkey(options: UseHotkeyOptions, action: () => void): void {
  const { id, name, description, category, keys, enabled = true, context = "global" } = options
  const customBindings = useHotkeyStore((s) => s.customBindings)

  useEffect(() => {
    // Get custom keys if available
    const _currentKeys = customBindings[id] ?? keys

    hotkeyRegistry.register(id, {
      name,
      description,
      category,
      defaultKeys: keys,
      enabled,
      context,
      action,
    })

    // If there are custom bindings, apply them
    if (customBindings[id]) {
      hotkeyRegistry.rebind(id, customBindings[id])
    }

    return () => {
      hotkeyRegistry.unregister(id)
    }
  }, [id, name, description, category, enabled, context, action, customBindings[id], keys])

  // Update enabled state when it changes
  useEffect(() => {
    hotkeyRegistry.setEnabled(id, enabled)
  }, [id, enabled])
}

/**
 * Subscribe to all registered hotkeys (reactive)
 */
export function useHotkeyRegistry(): HotkeyDefinition[] {
  const subscribe = useCallback((callback: () => void) => hotkeyRegistry.subscribe(callback), [])

  // Return cached snapshot - this is stable between renders unless cache is updated
  const getSnapshot = useCallback(() => cachedHotkeys, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Get hotkeys by category (reactive)
 */
export function useHotkeysByCategory(category: HotkeyCategory): HotkeyDefinition[] {
  const allHotkeys = useHotkeyRegistry()
  return allHotkeys.filter((h) => h.category === category)
}

/**
 * Get a specific hotkey by ID (reactive)
 */
export function useHotkeyById(id: string): HotkeyDefinition | undefined {
  const allHotkeys = useHotkeyRegistry()
  return allHotkeys.find((h) => h.id === id)
}

/**
 * Global keyboard event handler for hotkeys
 * Uses capture phase to ensure hotkeys are processed before Canvas/OrbitControls
 */
export function useGlobalHotkeyHandler(context?: HotkeyDefinition["context"]): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if target is an input/textarea (unless it's a modifier-only combo)
      const target = event.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      // Allow modifier combos (Ctrl+S, etc.) even in inputs
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey

      if (isInput && !hasModifier) {
        return
      }

      hotkeyRegistry.handleKeyboardEvent(event, context)
    }

    // Use capture phase to ensure we get events before Canvas/OrbitControls
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [context])
}

/**
 * Get formatted keys for display
 */
export function useFormattedKeys(keys: string[]): string {
  return formatKeysForDisplay(keys)
}

/**
 * Hook for rebinding hotkeys
 */
export function useHotkeyActions() {
  const { rebindHotkey, resetToDefault, resetAllToDefault } = useHotkeyStore()

  const rebind = useCallback(
    (id: string, newKeys: string[]) => {
      const conflicts = hotkeyRegistry.rebind(id, newKeys)
      if (conflicts.length === 0) {
        rebindHotkey(id, newKeys)
        return { success: true, conflicts: [] }
      }
      return { success: false, conflicts }
    },
    [rebindHotkey]
  )

  const reset = useCallback(
    (id: string) => {
      hotkeyRegistry.resetToDefault(id)
      resetToDefault(id)
    },
    [resetToDefault]
  )

  const resetAll = useCallback(() => {
    hotkeyRegistry.resetAllToDefault()
    resetAllToDefault()
  }, [resetAllToDefault])

  return { rebind, reset, resetAll }
}
