/**
 * Credits Store - CADHY
 *
 * Manages local credits for AI Gateway usage without authentication.
 * Credits regenerate daily and are stored locally.
 */

import { AVAILABLE_MODELS, type ModelConfig } from "@cadhy/ai"
import {
  CREDITS_CONFIG,
  type CreditsState,
  type CreditTier,
  calculateCreditsAfterRequest,
  calculateCreditsFromTokens,
  consumeCreditsFromTokens,
  hasCreditsForTokens,
  type ModelPricing,
  regenerateCreditsIfNeeded,
  type TokenUsage,
} from "@cadhy/types/credits"
import { invoke } from "@tauri-apps/api/core"
import { create } from "zustand"
import { persist } from "zustand/middleware"

// ============================================================================
// TYPES
// ============================================================================

interface CreditsStoreState {
  /** Current credits state */
  state: CreditsState | null

  /** Whether credits are being loaded */
  isLoading: boolean

  /** Last error message */
  error: string | null
}

interface CreditsStoreActions {
  /** Load credits state from disk */
  loadCredits: () => Promise<void>

  /** Regenerate credits if needed */
  regenerateIfNeeded: () => Promise<void>

  /** Estimate credits needed for a request (before making it) */
  estimateCredits: (
    modelId: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number
  ) => number

  /** Check if credits are available for estimated usage */
  checkCreditsForTokens: (estimatedCredits: number) => boolean

  /** Consume credits based on actual token usage (after request completes) */
  consumeCreditsFromTokens: (usage: TokenUsage, modelId: string) => Promise<boolean>

  /** Update tier (for premium users) */
  updateTier: (tier: CreditTier) => Promise<void>

  /** Get credits info for display */
  getCreditsInfo: () => {
    available: number
    usedToday: number
    dailyLimit: number
    tier: CreditTier
    nextRegeneration: Date | null
    creditValueUSD: number
  }

  /** Get model pricing for a model ID */
  getModelPricing: (modelId: string) => ModelPricing | null
}

type CreditsStore = CreditsStoreState & CreditsStoreActions

// ============================================================================
// STORE
// ============================================================================

export const useCreditsStore = create<CreditsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      state: null,
      isLoading: false,
      error: null,

      // Load credits from disk
      loadCredits: async () => {
        set({ isLoading: true, error: null })
        try {
          const state = await invoke<CreditsState>("credits_load_state")
          const regenerated = regenerateCreditsIfNeeded(state)
          set({ state: regenerated, isLoading: false })
        } catch (error) {
          console.error("[Credits Store] Failed to load credits:", error)
          set({
            error: error instanceof Error ? error.message : String(error),
            isLoading: false,
          })
        }
      },

      // Regenerate if needed
      regenerateIfNeeded: async () => {
        const { state } = get()
        if (!state) return

        try {
          const regenerated = await invoke<CreditsState>("credits_regenerate_if_needed")
          set({ state: regenerated })
        } catch (error) {
          console.error("[Credits Store] Failed to regenerate credits:", error)
        }
      },

      // Get model pricing
      getModelPricing: (modelId: string) => {
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId)
        return model?.pricing || null
      },

      // Estimate credits needed before request
      estimateCredits: (
        modelId: string,
        estimatedInputTokens: number,
        estimatedOutputTokens: number
      ) => {
        const { state, getModelPricing } = get()
        if (!state) return 0

        const pricing = getModelPricing(modelId)
        if (!pricing) {
          // Fallback: estimate 1 credit if pricing unknown
          return 1
        }

        const usage: TokenUsage = {
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
        }

        return calculateCreditsFromTokens(
          usage,
          pricing,
          CREDITS_CONFIG[state.tier as CreditTier].creditValueUSD
        )
      },

      // Check if credits are available for estimated usage
      checkCreditsForTokens: (estimatedCredits: number) => {
        const { state } = get()
        if (!state) return false
        return hasCreditsForTokens(state, estimatedCredits)
      },

      // Consume credits based on actual token usage
      consumeCreditsFromTokens: async (usage: TokenUsage, modelId: string) => {
        const { state, getModelPricing } = get()
        if (!state) return false

        const pricing = getModelPricing(modelId)
        if (!pricing) {
          console.warn("[Credits Store] No pricing found for model:", modelId)
          return false
        }

        // Calculate and consume credits
        const newState = consumeCreditsFromTokens(state, usage, pricing)
        if (!newState) {
          return false
        }

        // Save to disk
        try {
          await invoke("credits_save_state", { state: newState })
          set({ state: newState })
          return true
        } catch (error) {
          console.error("[Credits Store] Failed to save credits:", error)
          return false
        }
      },

      // Update tier
      updateTier: async (tier: CreditTier) => {
        const { state } = get()
        if (!state) return

        const config = CREDITS_CONFIG[tier]
        const newState: CreditsState = {
          ...state,
          tier,
          available: config.dailyLimit,
          lastRegenerated: Date.now(),
          usedToday: 0,
        }

        try {
          await invoke("credits_save_state", { state: newState })
          set({ state: newState })
        } catch (error) {
          console.error("[Credits Store] Failed to update tier:", error)
        }
      },

      // Get credits info for display
      getCreditsInfo: () => {
        const { state } = get()
        if (!state) {
          return {
            available: 0,
            usedToday: 0,
            dailyLimit: 50,
            tier: "free" as CreditTier,
            nextRegeneration: null,
          }
        }

        const config = CREDITS_CONFIG[state.tier as CreditTier]
        const regenerationInterval = config.regenerationInterval
        const nextRegeneration = new Date(state.lastRegenerated + regenerationInterval)

        return {
          available: state.available,
          usedToday: state.usedToday,
          dailyLimit: config.dailyLimit,
          tier: state.tier as CreditTier,
          nextRegeneration,
          creditValueUSD: config.creditValueUSD,
        }
      },
    }),
    {
      name: "cadhy-credits-store",
      partialize: (state) => ({ state: state.state }), // Only persist state
    }
  )
)
