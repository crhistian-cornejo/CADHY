/**
 * Settings Store - CADHY
 *
 * Centralized store for all user settings including privacy, notifications, profile, and AI.
 * Persists to localStorage for session continuity.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useShallow } from "zustand/shallow"

// ============================================================================
// TYPES
// ============================================================================

export interface PrivacySettings {
  analytics: boolean
  crashReports: boolean
  usageData: boolean
  rememberProjects: boolean
  autoLock: boolean
}

export interface NotificationSettings {
  projectUpdates: boolean
  analysisComplete: boolean
  errors: boolean
  emailNotifications: boolean
  desktopNotifications: boolean
  soundEnabled: boolean
}

export interface UserProfile {
  name: string
  email: string
  avatar: string
  company: string
  role: string
}

// ============================================================================
// AI PROVIDER TYPES
// ============================================================================

/** Supported AI providers - simplified to just Gateway and Ollama Local */
export type AIProviderType = "ollama-local" | "gateway"

/** Status of Ollama availability */
export interface OllamaLocalStatus {
  /** Whether Ollama is available locally */
  available: boolean
  /** List of installed model names */
  models: string[]
  /** Ollama version */
  version?: string
  /** Error message if not available */
  error?: string
  /** When this status was last checked */
  lastChecked: number
}

/** AI provider configuration */
export interface AISettings {
  /** Preferred provider: 'auto' uses priority detection */
  preferredProvider: "auto" | AIProviderType

  /** Cached Ollama local status */
  ollamaLocalStatus: OllamaLocalStatus | null

  /** Preferred Ollama model for local */
  preferredOllamaModel: string | null

  /** Currently active provider (determined by auto-detection or user preference) */
  activeProvider: AIProviderType | null
}

export interface AppSettings {
  privacy: PrivacySettings
  notifications: NotificationSettings
  profile: UserProfile
  ai: AISettings
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_PRIVACY: PrivacySettings = {
  analytics: true,
  crashReports: true,
  usageData: false,
  rememberProjects: true,
  autoLock: false,
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  projectUpdates: true,
  analysisComplete: true,
  errors: true,
  emailNotifications: false,
  desktopNotifications: true,
  soundEnabled: true,
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Usuario",
  email: "usuario@cadhy.app",
  avatar: "",
  company: "",
  role: "Civil Engineer",
}

const DEFAULT_AI: AISettings = {
  preferredProvider: "auto",
  ollamaLocalStatus: null,
  preferredOllamaModel: null,
  activeProvider: null,
}

// ============================================================================
// STORE
// ============================================================================

interface SettingsStore {
  // State
  privacy: PrivacySettings
  notifications: NotificationSettings
  profile: UserProfile
  ai: AISettings

  // Actions
  setPrivacy: (settings: Partial<PrivacySettings>) => void
  setNotifications: (settings: Partial<NotificationSettings>) => void
  setProfile: (profile: Partial<UserProfile>) => void
  setAI: (settings: Partial<AISettings>) => void

  // Bulk updates
  updatePrivacySetting: <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => void
  updateNotificationSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void

  // AI-specific actions
  setOllamaLocalStatus: (status: OllamaLocalStatus | null) => void
  setActiveProvider: (provider: AIProviderType | null) => void
  setPreferredOllamaModel: (model: string | null) => void

  // Clear data
  clearAllData: () => void

  // Reset
  reset: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Initial state
      privacy: DEFAULT_PRIVACY,
      notifications: DEFAULT_NOTIFICATIONS,
      profile: DEFAULT_PROFILE,
      ai: DEFAULT_AI,

      // Set privacy settings (partial update)
      setPrivacy: (settings) => {
        set((state) => ({
          privacy: { ...state.privacy, ...settings },
        }))
      },

      // Set notification settings (partial update)
      setNotifications: (settings) => {
        set((state) => ({
          notifications: { ...state.notifications, ...settings },
        }))
      },

      // Set profile (partial update)
      setProfile: (profile) => {
        set((state) => ({
          profile: { ...state.profile, ...profile },
        }))
      },

      // Set AI settings (partial update)
      setAI: (settings) => {
        set((state) => ({
          ai: { ...state.ai, ...settings },
        }))
      },

      // Update single privacy setting
      updatePrivacySetting: (key, value) => {
        set((state) => ({
          privacy: { ...state.privacy, [key]: value },
        }))
      },

      // Update single notification setting
      updateNotificationSetting: (key, value) => {
        set((state) => ({
          notifications: { ...state.notifications, [key]: value },
        }))
      },

      // Set active AI provider
      setActiveProvider: (provider) => {
        set((state) => ({
          ai: { ...state.ai, activeProvider: provider },
        }))
      },

      // Set Ollama local status (cached from local detection)
      setOllamaLocalStatus: (status) => {
        set((state) => ({
          ai: { ...state.ai, ollamaLocalStatus: status },
        }))
      },

      // Set preferred Ollama model
      setPreferredOllamaModel: (model) => {
        set((state) => ({
          ai: { ...state.ai, preferredOllamaModel: model },
        }))
      },

      // Clear all stored data (for privacy "clear data" feature)
      clearAllData: () => {
        // Clear other stores too
        localStorage.removeItem("cadhy-layout")
        localStorage.removeItem("cadhy-navigation")
        localStorage.removeItem("cadhy-chat")
        localStorage.removeItem("cadhy-project")

        // Reset this store to defaults
        set({
          privacy: DEFAULT_PRIVACY,
          notifications: DEFAULT_NOTIFICATIONS,
          profile: DEFAULT_PROFILE,
          ai: DEFAULT_AI,
        })
      },

      // Reset to defaults
      reset: () => {
        set({
          privacy: DEFAULT_PRIVACY,
          notifications: DEFAULT_NOTIFICATIONS,
          profile: DEFAULT_PROFILE,
          ai: DEFAULT_AI,
        })
      },
    }),
    {
      name: "cadhy-settings",
      version: 4,
      migrate: (persistedState, _version) => {
        const state = persistedState as Partial<SettingsStore>

        // Migration to version 4: Simplified AI providers (only Gateway + Ollama Local)
        // Remove all deprecated fields
        return {
          privacy: state.privacy ?? DEFAULT_PRIVACY,
          notifications: state.notifications ?? DEFAULT_NOTIFICATIONS,
          profile: state.profile ?? DEFAULT_PROFILE,
          ai: {
            preferredProvider: "auto",
            ollamaLocalStatus: null,
            preferredOllamaModel:
              ((state.ai as Record<string, unknown>)?.preferredOllamaModel as string | null) ??
              null,
            activeProvider: null,
          },
        }
      },
    }
  )
)

// ============================================================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================================================

export const usePrivacySettings = () => useSettingsStore((s) => s.privacy)
export const useNotificationSettings = () => useSettingsStore((s) => s.notifications)
export const useUserProfile = () => useSettingsStore((s) => s.profile)
export const useAISettings = () => useSettingsStore((s) => s.ai)
export const useActiveProvider = () => useSettingsStore((s) => s.ai.activeProvider)
export const useOllamaLocalStatus = () => useSettingsStore((s) => s.ai.ollamaLocalStatus)

export const useSettingsActions = () =>
  useSettingsStore(
    useShallow((s) => ({
      setPrivacy: s.setPrivacy,
      setNotifications: s.setNotifications,
      setProfile: s.setProfile,
      setAI: s.setAI,
      updatePrivacySetting: s.updatePrivacySetting,
      updateNotificationSetting: s.updateNotificationSetting,
      setOllamaLocalStatus: s.setOllamaLocalStatus,
      setActiveProvider: s.setActiveProvider,
      setPreferredOllamaModel: s.setPreferredOllamaModel,
      clearAllData: s.clearAllData,
      reset: s.reset,
    }))
  )
