/**
 * Auto-Save Store - CADHY
 *
 * Manages auto-save state for visual feedback:
 * - Saving status (idle, saving, saved, error)
 * - Countdown to next auto-save
 * - Last save timestamp
 */

import { create } from "zustand"

// ============================================================================
// TYPES
// ============================================================================

export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error"

interface AutoSaveState {
  /** Current auto-save status */
  status: AutoSaveStatus
  /** Seconds until next auto-save (null if not scheduled) */
  countdown: number | null
  /** Timestamp of last successful save */
  lastSavedAt: number | null
  /** Error message if status is 'error' */
  errorMessage: string | null
  /** Whether auto-save is currently enabled */
  isEnabled: boolean
  /** Configured interval in seconds */
  interval: number
}

interface AutoSaveActions {
  /** Set the auto-save status */
  setStatus: (status: AutoSaveStatus, errorMessage?: string) => void
  /** Update countdown value */
  setCountdown: (countdown: number | null) => void
  /** Mark as saved successfully */
  markSaved: () => void
  /** Mark as error */
  markError: (message: string) => void
  /** Update configuration */
  setConfig: (enabled: boolean, interval: number) => void
  /** Reset to idle state */
  reset: () => void
}

type AutoSaveStore = AutoSaveState & AutoSaveActions

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AutoSaveState = {
  status: "idle",
  countdown: null,
  lastSavedAt: null,
  errorMessage: null,
  isEnabled: true,
  interval: 30,
}

// ============================================================================
// STORE
// ============================================================================

export const useAutoSaveStore = create<AutoSaveStore>((set) => ({
  ...initialState,

  setStatus: (status, errorMessage) =>
    set({
      status,
      errorMessage: errorMessage ?? null,
    }),

  setCountdown: (countdown) => set({ countdown }),

  markSaved: () =>
    set({
      status: "saved",
      lastSavedAt: Date.now(),
      errorMessage: null,
      countdown: null,
    }),

  markError: (message) =>
    set({
      status: "error",
      errorMessage: message,
    }),

  setConfig: (isEnabled, interval) =>
    set({
      isEnabled,
      interval,
    }),

  reset: () => set(initialState),
}))

// ============================================================================
// SELECTORS
// ============================================================================

export const useAutoSaveStatus = () => useAutoSaveStore((s) => s.status)
export const useAutoSaveCountdown = () => useAutoSaveStore((s) => s.countdown)
export const useAutoSaveLastSaved = () => useAutoSaveStore((s) => s.lastSavedAt)
export const useAutoSaveError = () => useAutoSaveStore((s) => s.errorMessage)
export const useAutoSaveEnabled = () => useAutoSaveStore((s) => s.isEnabled)
export const useAutoSaveInterval = () => useAutoSaveStore((s) => s.interval)

/**
 * Get a formatted "time ago" string for last save
 */
export function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return ""

  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}
