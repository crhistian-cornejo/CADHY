/**
 * StatusBar Notification Store
 *
 * Manages temporary notifications shown in the status bar.
 * Used for subtle, non-intrusive feedback like "Project saved".
 */

import { create } from "zustand"

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType = "success" | "info" | "warning" | "error"

export interface StatusNotification {
  id: string
  messageKey: string // i18n translation key (e.g., 'statusBar.saved')
  type: NotificationType
  timestamp: number
}

interface StatusNotificationStore {
  // State
  notification: StatusNotification | null

  // Actions
  showNotification: (messageKey: string, type?: NotificationType) => void
  clearNotification: () => void
}

// ============================================================================
// STORE
// ============================================================================

const NOTIFICATION_DURATION = 3000 // 3 seconds

export const useStatusNotificationStore = create<StatusNotificationStore>((set) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return {
    notification: null,

    showNotification: (messageKey, type = "success") => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      const notification: StatusNotification = {
        id: crypto.randomUUID(),
        messageKey,
        type,
        timestamp: Date.now(),
      }

      set({ notification })

      // Auto-clear after duration
      timeoutId = setTimeout(() => {
        set({ notification: null })
        timeoutId = null
      }, NOTIFICATION_DURATION)
    },

    clearNotification: () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      set({ notification: null })
    },
  }
})

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useStatusNotification = () => useStatusNotificationStore((s) => s.notification)

export const useShowStatusNotification = () => useStatusNotificationStore((s) => s.showNotification)
