/**
 * Navigation Store - CADHY
 *
 * Manages the current active view/page in the application.
 * Persists to localStorage for session continuity.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useShallow } from "zustand/shallow"

// ============================================================================
// TYPES
// ============================================================================

export type ViewId =
  | "projects"
  | "new-project"
  | "open"
  | "examples"
  | "gallery"
  | "modeller"
  | "drawings"
  | "mesh"
  | "cadras"
  | "cfd"
  | "results"

export interface NavigationState {
  currentView: ViewId
}

// ============================================================================
// STORE
// ============================================================================

interface NavigationStore {
  // State
  currentView: ViewId

  // Actions
  setView: (view: ViewId) => void
  /** @deprecated Use setView instead */
  navigateTo: (view: ViewId) => void
  reset: () => void
}

const DEFAULT_VIEW: ViewId = "modeller"

export const useNavigationStore = create<NavigationStore>()(
  persist(
    (set) => ({
      // Initial state
      currentView: DEFAULT_VIEW,

      // Set current view
      setView: (view) => {
        set({ currentView: view })
      },

      // Alias for backward compatibility (deprecated)
      navigateTo: (view) => {
        set({ currentView: view })
      },

      // Reset to defaults
      reset: () => {
        set({ currentView: DEFAULT_VIEW })
      },
    }),
    {
      name: "cadhy-navigation",
      version: 1,
    }
  )
)

// ============================================================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================================================

export const useCurrentView = () => useNavigationStore((s) => s.currentView)
export const useNavigationActions = () =>
  useNavigationStore(
    useShallow((s) => ({
      setView: s.setView,
      navigateTo: s.navigateTo,
      reset: s.reset,
    }))
  )
