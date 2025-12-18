/**
 * Theme Store - CADHY
 *
 * Manages the application theme (light, dark, system).
 * Persists to localStorage and syncs with document class.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"

// ============================================================================
// TYPES
// ============================================================================

export type Theme = "light" | "dark" | "system"

interface ThemeStore {
  // State
  theme: Theme
  resolvedTheme: "light" | "dark"

  // Actions
  setTheme: (theme: Theme) => void
}

// ============================================================================
// HELPERS
// ============================================================================

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme
  const root = document.documentElement

  root.classList.remove("light", "dark")
  root.classList.add(resolved)

  return resolved
}

// ============================================================================
// STORE
// ============================================================================

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, _get) => ({
      // Initial state
      theme: "system",
      resolvedTheme: getSystemTheme(),

      // Set theme
      setTheme: (theme) => {
        const resolved = applyTheme(theme)
        set({ theme, resolvedTheme: resolved })
      },
    }),
    {
      name: "cadhy-theme",
      version: 1,
      onRehydrateStorage: () => (state) => {
        // Apply theme on rehydration
        if (state) {
          applyTheme(state.theme)
        }
      },
    }
  )
)

// ============================================================================
// INITIALIZE
// ============================================================================

// Apply theme on initial load
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("cadhy-theme")
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      if (state?.theme) {
        applyTheme(state.theme)
      }
    } catch {
      applyTheme("system")
    }
  } else {
    applyTheme("system")
  }

  // Listen for system theme changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const { theme } = useThemeStore.getState()
    if (theme === "system") {
      const resolved = applyTheme("system")
      useThemeStore.setState({ resolvedTheme: resolved })
    }
  })
}

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useTheme = () => useThemeStore((s) => s.theme)
export const useResolvedTheme = () => useThemeStore((s) => s.resolvedTheme)
export const useSetTheme = () => useThemeStore((s) => s.setTheme)
