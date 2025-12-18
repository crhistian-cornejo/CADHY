/**
 * useAIProvider Hook - CADHY
 *
 * Handles automatic detection and caching of AI provider availability.
 * Priority: Ollama Local -> Gateway (fallback)
 *
 * This hook checks for available providers on startup and caches the result
 * in the settings store to avoid repeated filesystem/network checks.
 */

import { checkOllamaLocal } from "@cadhy/ai/providers"
import { useCallback, useEffect } from "react"
import {
  type AIProviderType,
  type OllamaLocalStatus,
  useSettingsStore,
} from "@/stores/settings-store"

// ============================================================================
// CONSTANTS
// ============================================================================

/** How often to re-check Ollama status (2 minutes) */
const OLLAMA_CHECK_INTERVAL_MS = 2 * 60 * 1000

// ============================================================================
// TYPES
// ============================================================================

interface AIProviderStatus {
  /** Currently active provider */
  activeProvider: AIProviderType | null
  /** Whether Ollama is running locally */
  hasOllamaLocal: boolean
  /** List of installed Ollama models */
  ollamaModels: string[]
  /** Whether we're using the gateway fallback */
  usingGateway: boolean
  /** Human-readable status message */
  statusMessage: string
  /** Whether provider detection is in progress */
  isDetecting: boolean
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to detect and manage AI providers.
 *
 * @example
 * ```tsx
 * function ChatPanel() {
 *   const { activeProvider, hasOllamaLocal, statusMessage } = useAIProvider();
 *
 *   return (
 *     <div>
 *       <span>Provider: {activeProvider}</span>
 *       <span>{statusMessage}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIProvider(): AIProviderStatus & {
  /** Force re-detection of providers */
  refreshProviders: () => Promise<void>
} {
  const ai = useSettingsStore((s) => s.ai)
  const setOllamaLocalStatus = useSettingsStore((s) => s.setOllamaLocalStatus)
  const setActiveProvider = useSettingsStore((s) => s.setActiveProvider)

  /**
   * Check if Ollama is running locally
   */
  const checkOllama = useCallback(async (): Promise<OllamaLocalStatus | null> => {
    try {
      const status = await checkOllamaLocal()

      return {
        available: status.available,
        models: status.models,
        version: status.version,
        error: status.error,
        lastChecked: Date.now(),
      }
    } catch (error) {
      console.error("[useAIProvider] Failed to check Ollama:", error)
      return null
    }
  }, [])

  /**
   * Determine the active provider based on availability
   */
  const determineActiveProvider = useCallback(
    (ollamaStatus: OllamaLocalStatus | null): AIProviderType => {
      const preferred = ai.preferredProvider

      // If user has a specific preference (not 'auto'), try to use it
      if (preferred !== "auto") {
        // Validate that the preferred provider is available
        if (preferred === "ollama-local" && ollamaStatus?.available) {
          return "ollama-local"
        }
        // Preferred not available, fall through to auto-detection
      }

      // Auto-detection priority:
      // 1. Ollama Local (free, private, runs on user's machine)
      if (ollamaStatus?.available && ollamaStatus.models.length > 0) {
        return "ollama-local"
      }

      // 2. Gateway fallback (uses CADHY backend)
      return "gateway"
    },
    [ai.preferredProvider]
  )

  /**
   * Full provider detection and update
   */
  const refreshProviders = useCallback(async () => {
    // Check Ollama status
    const ollamaStatus = await checkOllama()

    // Update cached status
    if (ollamaStatus) {
      setOllamaLocalStatus(ollamaStatus)
    }

    // Determine active provider
    const active = determineActiveProvider(ollamaStatus)
    setActiveProvider(active)
  }, [checkOllama, determineActiveProvider, setOllamaLocalStatus, setActiveProvider])

  /**
   * Check if we should re-check provider status
   */
  const shouldRecheckProviders = useCallback((): boolean => {
    const ollamaStatus = ai.ollamaLocalStatus

    // Recheck if we don't have status
    if (!ollamaStatus) return true

    const now = Date.now()
    const ollamaElapsed = now - ollamaStatus.lastChecked

    return ollamaElapsed > OLLAMA_CHECK_INTERVAL_MS
  }, [ai.ollamaLocalStatus])

  // Initial detection on mount
  useEffect(() => {
    if (shouldRecheckProviders() || !ai.activeProvider) {
      refreshProviders()
    }
  }, [ai.activeProvider, refreshProviders, shouldRecheckProviders]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute derived status
  const ollamaStatus = ai.ollamaLocalStatus
  const hasOllamaLocal = ollamaStatus?.available ?? false
  const ollamaModels = ollamaStatus?.models ?? []
  const usingGateway = ai.activeProvider === "gateway"

  // Generate status message
  let statusMessage: string
  if (ai.activeProvider === "ollama-local") {
    const modelCount = ollamaModels.length
    statusMessage = `Using Ollama locally (${modelCount} model${modelCount !== 1 ? "s" : ""})`
  } else if (ai.activeProvider === "gateway") {
    statusMessage = "Using CADHY AI Gateway"
  } else {
    statusMessage = "Detecting providers..."
  }

  return {
    activeProvider: ai.activeProvider,
    hasOllamaLocal,
    ollamaModels,
    usingGateway,
    statusMessage,
    isDetecting: !ai.activeProvider,
    refreshProviders,
  }
}
