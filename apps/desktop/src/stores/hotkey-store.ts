/**
 * Hotkey Store - CADHY
 *
 * Manages customizable keyboard shortcuts with persistence.
 * Syncs with the HotkeyRegistry service for global hotkey handling.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"

// ============================================================================
// TYPES
// ============================================================================

export type HotkeyCategory =
  | "file"
  | "edit"
  | "view"
  | "transform"
  | "navigation"
  | "workspace"
  | "tools"
  | "operations"
  | "selection"

export interface HotkeyDefinition {
  id: string
  name: string
  description: string
  category: HotkeyCategory
  defaultKeys: string[]
  currentKeys: string[]
  enabled: boolean
  context?: "global" | "modeller" | "viewport" | "dialog"
}

export interface HotkeyConflict {
  keys: string[]
  existingHotkey: HotkeyDefinition
  newHotkey: HotkeyDefinition
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface HotkeyStoreState {
  /** Custom key bindings that override defaults (id -> keys[]) */
  customBindings: Record<string, string[]>
  /** Whether to show hotkey hints in UI */
  showHotkeyHints: boolean
  /** Collapsed categories in settings UI */
  collapsedCategories: HotkeyCategory[]
}

interface HotkeyStoreActions {
  /** Rebind a hotkey to new keys */
  rebindHotkey: (id: string, keys: string[]) => boolean
  /** Reset a single hotkey to default */
  resetToDefault: (id: string) => void
  /** Reset all hotkeys to defaults */
  resetAllToDefault: () => void
  /** Toggle showing hotkey hints */
  toggleHotkeyHints: () => void
  /** Toggle a category collapsed state */
  toggleCategory: (category: HotkeyCategory) => void
  /** Export current bindings as JSON string */
  exportBindings: () => string
  /** Import bindings from JSON string */
  importBindings: (json: string) => boolean
  /** Get current keys for a hotkey (custom or default) */
  getKeys: (id: string, defaultKeys: string[]) => string[]
  /** Check if a hotkey has been customized */
  isCustomized: (id: string) => boolean
}

type HotkeyStore = HotkeyStoreState & HotkeyStoreActions

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useHotkeyStore = create<HotkeyStore>()(
  persist(
    (set, get) => ({
      // Initial state
      customBindings: {},
      showHotkeyHints: true,
      collapsedCategories: [],

      // Rebind a hotkey
      rebindHotkey: (id, keys) => {
        set((state) => ({
          customBindings: {
            ...state.customBindings,
            [id]: keys,
          },
        }))
        return true
      },

      // Reset single hotkey
      resetToDefault: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.customBindings
          return { customBindings: rest }
        })
      },

      // Reset all hotkeys
      resetAllToDefault: () => {
        set({ customBindings: {} })
      },

      // Toggle hints
      toggleHotkeyHints: () => {
        set((state) => ({ showHotkeyHints: !state.showHotkeyHints }))
      },

      // Toggle category
      toggleCategory: (category) => {
        set((state) => {
          const isCollapsed = state.collapsedCategories.includes(category)
          return {
            collapsedCategories: isCollapsed
              ? state.collapsedCategories.filter((c) => c !== category)
              : [...state.collapsedCategories, category],
          }
        })
      },

      // Export bindings
      exportBindings: () => {
        return JSON.stringify(get().customBindings, null, 2)
      },

      // Import bindings
      importBindings: (json) => {
        try {
          const bindings = JSON.parse(json)
          if (typeof bindings === "object" && bindings !== null) {
            set({ customBindings: bindings })
            return true
          }
          return false
        } catch {
          return false
        }
      },

      // Get current keys for a hotkey
      getKeys: (id, defaultKeys) => {
        const custom = get().customBindings[id]
        return custom ?? defaultKeys
      },

      // Check if customized
      isCustomized: (id) => {
        return id in get().customBindings
      },
    }),
    {
      name: "cadhy-hotkeys",
      version: 1,
      partialize: (state) => ({
        customBindings: state.customBindings,
        showHotkeyHints: state.showHotkeyHints,
        collapsedCategories: state.collapsedCategories,
      }),
    }
  )
)

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useHotkeyHints = () => useHotkeyStore((s) => s.showHotkeyHints)
export const useCollapsedCategories = () => useHotkeyStore((s) => s.collapsedCategories)
export const useCustomBindings = () => useHotkeyStore((s) => s.customBindings)
