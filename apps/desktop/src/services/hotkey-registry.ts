/**
 * Hotkey Registry Service - CADHY
 *
 * Central registry for all keyboard shortcuts with:
 * - Global hotkey registration and execution
 * - Conflict detection
 * - Platform-aware key formatting (Cmd vs Ctrl)
 * - Context-based hotkey filtering
 */

import { getPlatformSync } from "@/hooks/use-platform"
import type { HotkeyCategory, HotkeyConflict, HotkeyDefinition } from "@/stores/hotkey-store"

// ============================================================================
// KEY UTILITIES
// ============================================================================

/**
 * Parse a shortcut string into its components
 */
export function parseShortcut(shortcut: string): {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  key: string
} {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((p) => p.trim())

  return {
    ctrl: parts.includes("ctrl") || parts.includes("control"),
    alt: parts.includes("alt") || parts.includes("option"),
    shift: parts.includes("shift"),
    meta: parts.includes("meta") || parts.includes("cmd") || parts.includes("command"),
    key:
      parts.filter(
        (p) => !["ctrl", "control", "alt", "option", "shift", "meta", "cmd", "command"].includes(p)
      )[0] || "",
  }
}

/**
 * Format a parsed shortcut back to string
 */
export function formatShortcut(parsed: ReturnType<typeof parseShortcut>): string {
  const isMac = getPlatformSync() === "macos"
  const parts: string[] = []

  if (parsed.ctrl || parsed.meta) {
    parts.push(isMac ? "Cmd" : "Ctrl")
  }
  if (parsed.alt) {
    parts.push(isMac ? "Option" : "Alt")
  }
  if (parsed.shift) {
    parts.push("Shift")
  }
  if (parsed.key) {
    parts.push(parsed.key.charAt(0).toUpperCase() + parsed.key.slice(1))
  }

  return parts.join("+")
}

/**
 * Normalize a shortcut string for consistent comparison
 */
export function normalizeShortcut(shortcut: string): string {
  return formatShortcut(parseShortcut(shortcut))
}

/**
 * Check if a keyboard event matches a shortcut string
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut)
  const isMac = getPlatformSync() === "macos"

  // On Mac, Cmd maps to metaKey; on others, Ctrl maps to ctrlKey
  const modifierMatch = isMac
    ? (parsed.ctrl || parsed.meta) === event.metaKey
    : (parsed.ctrl || parsed.meta) === event.ctrlKey

  const altMatch = parsed.alt === event.altKey
  const shiftMatch = parsed.shift === event.shiftKey

  // Normalize key comparison
  const eventKey = event.key.toLowerCase()
  const eventCode = event.code.toLowerCase()
  const shortcutKey = parsed.key.toLowerCase()

  // Handle numpad keys - shortcut defined as "numpad0" but event.key is "0"
  // We need to check event.code which will be "numpad0"
  const isNumpadShortcut = shortcutKey.startsWith("numpad")

  let keyMatch = false

  if (isNumpadShortcut) {
    // For numpad shortcuts, match against event.code
    keyMatch = eventCode === shortcutKey
  } else {
    // Handle special keys
    keyMatch =
      eventKey === shortcutKey ||
      (shortcutKey === "delete" && (eventKey === "delete" || eventKey === "backspace")) ||
      (shortcutKey === "escape" && eventKey === "escape") ||
      (shortcutKey === "enter" && eventKey === "enter") ||
      (shortcutKey === "tab" && eventKey === "tab") ||
      (shortcutKey === "space" && eventKey === " ")
  }

  return modifierMatch && altMatch && shiftMatch && keyMatch
}

/**
 * Format keys for display in UI
 */
export function formatKeysForDisplay(keys: string[]): string {
  const isMac = getPlatformSync() === "macos"

  return keys
    .map((key) => {
      if (isMac) {
        return key
          .replace(/Ctrl\+/gi, "\u2318")
          .replace(/Cmd\+/gi, "\u2318")
          .replace(/Alt\+/gi, "\u2325")
          .replace(/Option\+/gi, "\u2325")
          .replace(/Shift\+/gi, "\u21E7")
          .replace(/\+/g, "")
      }
      return key
    })
    .join(" / ")
}

// ============================================================================
// REGISTRY CLASS
// ============================================================================

interface RegisteredHotkey extends HotkeyDefinition {
  action: () => void
}

class HotkeyRegistryClass {
  private hotkeys: Map<string, RegisteredHotkey> = new Map()
  private keyToIdMap: Map<string, string> = new Map()
  private listeners: Set<() => void> = new Set()
  private customBindings: Record<string, string[]> = {}

  /**
   * Register a hotkey
   */
  register(
    id: string,
    definition: Omit<HotkeyDefinition, "id" | "currentKeys"> & { action: () => void }
  ): HotkeyDefinition | null {
    const currentKeys = this.customBindings[id] ?? definition.defaultKeys

    const hotkey: RegisteredHotkey = {
      ...definition,
      id,
      currentKeys,
    }

    this.hotkeys.set(id, hotkey)

    // Update key-to-id mapping
    currentKeys.forEach((key) => {
      const normalized = normalizeShortcut(key)
      this.keyToIdMap.set(normalized, id)
    })

    this.notifyListeners()
    return hotkey
  }

  /**
   * Unregister a hotkey
   */
  unregister(id: string): boolean {
    const hotkey = this.hotkeys.get(id)
    if (!hotkey) return false

    // Remove from key-to-id mapping
    hotkey.currentKeys.forEach((key) => {
      const normalized = normalizeShortcut(key)
      if (this.keyToIdMap.get(normalized) === id) {
        this.keyToIdMap.delete(normalized)
      }
    })

    this.hotkeys.delete(id)
    this.notifyListeners()
    return true
  }

  /**
   * Get a hotkey by ID
   */
  get(id: string): RegisteredHotkey | undefined {
    return this.hotkeys.get(id)
  }

  /**
   * Get all registered hotkeys
   */
  getAll(): HotkeyDefinition[] {
    return Array.from(this.hotkeys.values())
  }

  /**
   * Get hotkeys by category
   */
  getByCategory(category: HotkeyCategory): HotkeyDefinition[] {
    return this.getAll().filter((h) => h.category === category)
  }

  /**
   * Get all categories that have hotkeys
   */
  getCategories(): HotkeyCategory[] {
    const categories = new Set<HotkeyCategory>()
    this.hotkeys.forEach((h) => categories.add(h.category))
    return Array.from(categories)
  }

  /**
   * Rebind a hotkey to new keys
   */
  rebind(id: string, newKeys: string[]): HotkeyConflict[] {
    const hotkey = this.hotkeys.get(id)
    if (!hotkey) return []

    const conflicts: HotkeyConflict[] = []

    // Check for conflicts
    newKeys.forEach((key) => {
      const normalized = normalizeShortcut(key)
      const existingId = this.keyToIdMap.get(normalized)

      if (existingId && existingId !== id) {
        const existing = this.hotkeys.get(existingId)
        if (existing) {
          conflicts.push({
            keys: [key],
            existingHotkey: existing,
            newHotkey: hotkey,
          })
        }
      }
    })

    if (conflicts.length > 0) {
      return conflicts
    }

    // Remove old key mappings
    hotkey.currentKeys.forEach((key) => {
      const normalized = normalizeShortcut(key)
      if (this.keyToIdMap.get(normalized) === id) {
        this.keyToIdMap.delete(normalized)
      }
    })

    // Update hotkey
    hotkey.currentKeys = newKeys

    // Add new key mappings
    newKeys.forEach((key) => {
      const normalized = normalizeShortcut(key)
      this.keyToIdMap.set(normalized, id)
    })

    this.notifyListeners()
    return []
  }

  /**
   * Reset a hotkey to default keys
   */
  resetToDefault(id: string): void {
    const hotkey = this.hotkeys.get(id)
    if (!hotkey) return

    this.rebind(id, hotkey.defaultKeys)
  }

  /**
   * Reset all hotkeys to defaults
   */
  resetAllToDefault(): void {
    this.hotkeys.forEach((hotkey) => {
      this.rebind(hotkey.id, hotkey.defaultKeys)
    })
  }

  /**
   * Check for a conflict with given keys
   */
  getConflict(keys: string, excludeId?: string): HotkeyDefinition | null {
    const normalized = normalizeShortcut(keys)
    const existingId = this.keyToIdMap.get(normalized)

    if (existingId && existingId !== excludeId) {
      return this.hotkeys.get(existingId) ?? null
    }

    return null
  }

  /**
   * Handle a keyboard event
   */
  handleKeyboardEvent(event: KeyboardEvent, context?: HotkeyDefinition["context"]): boolean {
    // Find matching hotkey
    for (const hotkey of this.hotkeys.values()) {
      if (!hotkey.enabled) continue

      // Check context
      if (hotkey.context && hotkey.context !== "global" && hotkey.context !== context) {
        continue
      }

      // Check if any of the keys match
      for (const key of hotkey.currentKeys) {
        if (matchesShortcut(event, key)) {
          event.preventDefault()
          event.stopPropagation()
          hotkey.action()
          return true
        }
      }
    }

    return false
  }

  /**
   * Set enabled state for a hotkey
   */
  setEnabled(id: string, enabled: boolean): void {
    const hotkey = this.hotkeys.get(id)
    if (hotkey) {
      hotkey.enabled = enabled
      this.notifyListeners()
    }
  }

  /**
   * Sync custom bindings from store
   */
  syncCustomBindings(bindings: Record<string, string[]>): void {
    this.customBindings = bindings

    // Update all registered hotkeys
    this.hotkeys.forEach((hotkey, id) => {
      const customKeys = bindings[id]
      if (customKeys) {
        this.rebind(id, customKeys)
      } else if (hotkey.currentKeys !== hotkey.defaultKeys) {
        this.rebind(id, hotkey.defaultKeys)
      }
    })
  }

  /**
   * Export current bindings
   */
  exportBindings(): Record<string, string[]> {
    const bindings: Record<string, string[]> = {}

    this.hotkeys.forEach((hotkey) => {
      if (JSON.stringify(hotkey.currentKeys) !== JSON.stringify(hotkey.defaultKeys)) {
        bindings[hotkey.id] = hotkey.currentKeys
      }
    })

    return bindings
  }

  /**
   * Import bindings
   */
  importBindings(bindings: Record<string, string[]>): void {
    this.customBindings = bindings

    Object.entries(bindings).forEach(([id, keys]) => {
      const hotkey = this.hotkeys.get(id)
      if (hotkey) {
        this.rebind(id, keys)
      }
    })
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener())
  }
}

// Singleton instance
export const hotkeyRegistry = new HotkeyRegistryClass()
