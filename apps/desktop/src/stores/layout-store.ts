/**
 * Layout Store - CADHY
 *
 * Manages the visibility state of all panels and layout presets.
 * Persists to localStorage for session continuity.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useShallow } from "zustand/shallow"

// ============================================================================
// TYPES
// ============================================================================

export type PanelId =
  | "sidebar"
  | "aiChat"
  | "properties"
  | "results"
  | "modellerLeft"
  | "modellerRight"

export interface LayoutState {
  // Panel visibility
  panels: {
    sidebar: boolean
    aiChat: boolean
    properties: boolean
    results: boolean
    /** Modeller left panel (OUTLINER/ASSETS) */
    modellerLeft: boolean
    /** Modeller right panel (Viewport Settings) */
    modellerRight: boolean
  }

  // Sidebar collapsed state
  sidebarCollapsed: boolean
}

// ============================================================================
// STORE
// ============================================================================

interface LayoutStore {
  // State
  panels: LayoutState["panels"]
  sidebarCollapsed: boolean

  // Actions
  togglePanel: (panel: PanelId) => void
  setPanel: (panel: PanelId, visible: boolean) => void
  setPanels: (panels: Partial<LayoutState["panels"]>) => void
  toggleSidebarCollapsed: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Reset
  reset: () => void
}

const DEFAULT_PANELS: LayoutState["panels"] = {
  sidebar: true,
  aiChat: false,
  properties: true,
  results: false,
  modellerLeft: true,
  modellerRight: true,
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      // Initial state
      panels: DEFAULT_PANELS,
      sidebarCollapsed: false,

      // Toggle a panel
      togglePanel: (panel) => {
        set((state) => ({
          panels: {
            ...state.panels,
            [panel]: !state.panels[panel],
          },
        }))
      },

      // Set panel visibility
      setPanel: (panel, visible) => {
        set((state) => ({
          panels: {
            ...state.panels,
            [panel]: visible,
          },
        }))
      },

      // Set multiple panels at once
      setPanels: (panels) => {
        set((state) => ({
          panels: {
            ...state.panels,
            ...panels,
          },
        }))
      },

      // Toggle sidebar collapsed
      toggleSidebarCollapsed: () => {
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        }))
      },

      // Set sidebar collapsed
      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed })
      },

      // Reset to defaults
      reset: () => {
        set({
          panels: DEFAULT_PANELS,
          sidebarCollapsed: false,
        })
      },
    }),
    {
      name: "cadhy-layout",
      version: 3,
    }
  )
)

// ============================================================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================================================

export const useShowSidebar = () => useLayoutStore((s) => s.panels.sidebar)
export const useShowAiChat = () => useLayoutStore((s) => s.panels.aiChat)
export const useShowProperties = () => useLayoutStore((s) => s.panels.properties)
export const useShowResults = () => useLayoutStore((s) => s.panels.results)
export const useShowModellerLeft = () => useLayoutStore((s) => s.panels.modellerLeft)
export const useShowModellerRight = () => useLayoutStore((s) => s.panels.modellerRight)
export const useSidebarCollapsed = () => useLayoutStore((s) => s.sidebarCollapsed)
export const useLayoutActions = () =>
  useLayoutStore(
    useShallow((s) => ({
      togglePanel: s.togglePanel,
      setPanel: s.setPanel,
      setPanels: s.setPanels,
      toggleSidebarCollapsed: s.toggleSidebarCollapsed,
      setSidebarCollapsed: s.setSidebarCollapsed,
      reset: s.reset,
    }))
  )
