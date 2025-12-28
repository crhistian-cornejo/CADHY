/**
 * AI Service - CADHY
 *
 * Handles AI chat streaming directly from the frontend using Vercel AI SDK.
 * Supports multiple providers:
 * 1. Ollama Local (user's own machine - free, private)
 * 2. AI Gateway (CADHY managed, with rate limiting)
 *
 * This service manages:
 * - API key storage/retrieval via OS keyring
 * - Direct streaming without API routes (works in Tauri)
 * - Tool execution for CAD/hydraulic operations
 * - Provider selection based on settings-store
 */

import {
  AVAILABLE_MODELS,
  type CoreMessage,
  cadTools,
  DEFAULT_CHAT_MODEL,
  getGateway,
  getOllamaProvider,
  HYDRAULIC_SYSTEM_PROMPT,
  hydraulicTools,
  type ModelConfig,
  renderTools,
  sceneTools,
  // Re-exported from ai package via @cadhy/ai
  streamText,
  type ToolSet,
} from "@cadhy/ai"
import { logger } from "@cadhy/shared/logger"
import { calculateCreditsAfterRequest, type TokenUsage } from "@cadhy/types/credits"
import { invoke } from "@tauri-apps/api/core"
import { useCreditsStore } from "@/stores/credits-store"
import { useSettingsStore } from "@/stores/settings-store"

// =============================================================================
// TYPES
// =============================================================================

/** Provider for API key storage */
export type AIProvider = "ai_gateway" | "openai" | "anthropic" | "google"

/** Chat message for the AI service */
export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

/** Tool call result from AI */
export interface ToolCallResult {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  result: unknown
}

/** Token usage data */
export interface TokenUsageData {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  cachedInputTokens?: number
}

/** Tool category names */
export type ToolCategory = "cad" | "hydraulic" | "scene" | "render"

/** Tool categories configuration */
export interface ToolCategoryConfig {
  id: ToolCategory
  name: string
  description: string
  enabled: boolean
}

/** Default tool categories */
export const DEFAULT_TOOL_CATEGORIES: ToolCategoryConfig[] = [
  {
    id: "cad",
    name: "CAD Tools",
    description: "Create and modify 3D shapes",
    enabled: true,
  },
  {
    id: "hydraulic",
    name: "Hydraulic Tools",
    description: "Channels, chutes, and analysis",
    enabled: true,
  },
  {
    id: "scene",
    name: "Scene Tools",
    description: "Transform, camera, undo/redo",
    enabled: true,
  },
  {
    id: "render",
    name: "Render Tools",
    description: "Generate visualizations and images",
    enabled: true,
  },
]

/** Streaming callback types */
export interface StreamCallbacks {
  onText?: (text: string) => void
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void
  onToolResult?: (result: ToolCallResult) => void
  onFinish?: (fullText: string, toolResults: ToolCallResult[], usage?: TokenUsageData) => void
  onError?: (error: Error) => void
}

// =============================================================================
// CREDENTIAL MANAGEMENT
// =============================================================================

/**
 * Check if Tauri is available
 */
export function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

/**
 * Get API key (from env first, then keyring)
 */
export async function getApiKey(provider: AIProvider = "ai_gateway"): Promise<string | null> {
  // First check env variable (works everywhere)
  const envKey = import.meta.env.VITE_AI_GATEWAY_API_KEY
  if (envKey) return envKey

  // Then check keyring if in Tauri
  if (isTauriAvailable()) {
    try {
      const key = await invoke<string | null>("auth_get_credential", {
        provider,
      })
      return key
    } catch (error) {
      console.error("[AI Service] Failed to get API key:", error)
      return null
    }
  }

  return null
}

/**
 * Save API key to OS keyring
 */
export async function saveApiKey(provider: AIProvider, value: string): Promise<boolean> {
  if (!isTauriAvailable()) {
    return false
  }

  try {
    await invoke("auth_save_credential", { provider, value })
    return true
  } catch (error) {
    console.error("[AI Service] Failed to save API key:", error)
    return false
  }
}

/**
 * Delete API key from OS keyring
 */
export async function deleteApiKey(provider: AIProvider): Promise<boolean> {
  if (!isTauriAvailable()) {
    return false
  }

  try {
    await invoke("auth_delete_credential", { provider })
    return true
  } catch (error) {
    console.error("[AI Service] Failed to delete API key:", error)
    return false
  }
}

/**
 * Check if API key exists (from env or keyring)
 */
export async function hasApiKey(provider: AIProvider = "ai_gateway"): Promise<boolean> {
  // First check env variable (works everywhere)
  if (import.meta.env.VITE_AI_GATEWAY_API_KEY) {
    return true
  }

  // Then check keyring if in Tauri
  if (isTauriAvailable()) {
    try {
      const hasKey = await invoke<boolean>("auth_has_credential", { provider })
      return hasKey
    } catch (error) {
      console.error("[AI Service] Failed to check API key:", error)
      return false
    }
  }

  return false
}

// =============================================================================
// AI CHAT SERVICE
// =============================================================================

/** All available tools combined */
const allTools: ToolSet = {
  ...cadTools,
  ...hydraulicTools,
  ...sceneTools,
  ...renderTools,
}

/**
 * Get tools filtered by enabled categories
 */
export function getFilteredTools(enabledCategories: ToolCategory[]): ToolSet {
  const tools: ToolSet = {}

  if (enabledCategories.includes("cad")) {
    Object.assign(tools, cadTools)
  }
  if (enabledCategories.includes("hydraulic")) {
    Object.assign(tools, hydraulicTools)
  }
  if (enabledCategories.includes("scene")) {
    Object.assign(tools, sceneTools)
  }
  if (enabledCategories.includes("render")) {
    Object.assign(tools, renderTools)
  }

  return tools
}

/**
 * Get the AI model based on the active provider
 *
 * Provider priority:
 * 1. Ollama Local (free, private, runs on user's machine)
 * 2. Gateway (CADHY managed fallback)
 */
async function getModel(modelId: string, apiKey?: string) {
  // Get the active provider from the store
  const activeProvider = useSettingsStore.getState().ai.activeProvider

  logger.log("[AI Service] getModel called:", { activeProvider, modelId })

  // ============================================================================
  // OLLAMA LOCAL - User's own machine (free, private)
  // ============================================================================
  if (activeProvider === "ollama-local") {
    logger.log("[AI Service] Using Ollama Local...")
    try {
      const ollamaProvider = await getOllamaProvider({ mode: "local" })

      // Extract model ID from the provided modelId (remove "ollama/" prefix if present)
      // modelId format: "ollama/devstral-small-2:24b" or "devstral-small-2:24b"
      // Always use the modelId provided - never hardcode defaults
      let ollamaModelId: string

      if (modelId.startsWith("ollama/")) {
        // Remove "ollama/" prefix: "ollama/devstral-small-2:24b" -> "devstral-small-2:24b"
        ollamaModelId = modelId.slice(7)
      } else if (modelId.includes("/")) {
        // Model ID is a gateway model (e.g., "google/gemini-2.5-flash")
        // This shouldn't happen when activeProvider is "ollama-local", but handle gracefully
        const preferredModel = useSettingsStore.getState().ai.preferredOllamaModel
        if (preferredModel) {
          ollamaModelId = preferredModel
          logger.log(
            "[AI Service] ⚠ Gateway model detected in Ollama context, using preferred:",
            ollamaModelId
          )
        } else {
          throw new Error(
            `Invalid model for Ollama Local. Please select an Ollama model from the selector. ` +
              `Received: ${modelId}`
          )
        }
      } else {
        // Already in correct format: "devstral-small-2:24b"
        ollamaModelId = modelId
      }

      logger.log("[AI Service] ✓ Using Ollama Local with model:", ollamaModelId)
      return ollamaProvider(ollamaModelId)
    } catch (error) {
      console.error("[AI Service] ✗ Ollama Local failed:", error)
      throw new Error(
        `Ollama Local is configured but failed to initialize. ` +
          `Please make sure Ollama is running (ollama serve). ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // ============================================================================
  // GATEWAY - CADHY managed fallback
  // ============================================================================
  logger.log("[AI Service] Using Gateway for provider:", activeProvider)

  // Check if user has their own API key (BYOK - Bring Your Own Key)
  const userApiKey = apiKey ?? (await getApiKey()) ?? undefined

  if (userApiKey) {
    // User has their own API key - no credits needed
    logger.log("[AI Service] ✓ Using Gateway with user's API key (BYOK):", modelId)
    const gateway = getGateway({ apiKey: userApiKey })
    return gateway(modelId)
  }

  // No user API key - check credits for free tier
  const creditsStore = useCreditsStore.getState()

  // Ensure credits are loaded
  if (!creditsStore.state) {
    await creditsStore.loadCredits()
  }

  // Regenerate if needed
  await creditsStore.regenerateIfNeeded()

  // Check if credits are available
  if (!creditsStore.checkCredits(modelId)) {
    const info = creditsStore.getCreditsInfo()
    throw new Error(
      `No credits available. You have ${info.available}/${info.dailyLimit} credits remaining. ` +
        `Credits regenerate daily. ` +
        `Options: 1) Use Ollama Local (free), 2) Add your own API key (BYOK), or 3) Upgrade to Pro.`
    )
  }

  // Use CADHY's gateway API key (from env)
  const gatewayKey = import.meta.env.VITE_AI_GATEWAY_API_KEY
  if (!gatewayKey) {
    throw new Error(
      "Gateway API key not configured. Please set up Ollama Local or add your own API key."
    )
  }

  logger.log("[AI Service] ✓ Using Gateway with CADHY credits:", modelId)
  const gateway = getGateway({ apiKey: gatewayKey })
  return gateway(modelId)
}

/**
 * Stream a chat response from the AI
 *
 * This function handles streaming directly from the frontend without
 * needing an API route. It works in Tauri because the AI Gateway
 * handles CORS properly.
 *
 * Automatically selects the appropriate provider based on settings:
 * - Ollama Local: Runs on user's machine (free, private)
 * - Gateway: CADHY managed with rate limiting
 *
 * @param messages - Chat history
 * @param callbacks - Streaming callbacks
 * @param options - Additional options
 * @returns AbortController to cancel the stream
 */
export async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: {
    modelId?: string
    systemPrompt?: string
    apiKey?: string
    /** Enabled tool categories (defaults to all) */
    enabledCategories?: ToolCategory[]
  }
): Promise<AbortController> {
  const abortController = new AbortController()

  try {
    const modelId = options?.modelId ?? DEFAULT_CHAT_MODEL
    const model = await getModel(modelId, options?.apiKey)

    // Get tools based on enabled categories
    const enabledCategories = options?.enabledCategories ?? ["cad", "hydraulic", "scene", "render"]
    const tools = enabledCategories.length === 4 ? allTools : getFilteredTools(enabledCategories)

    // Convert messages to CoreMessage format
    const coreMessages: CoreMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // Stream the response
    // Note: In AI SDK 5.0+, maxSteps was replaced with stopWhen: stepCountIs(n)
    const activeProvider = useSettingsStore.getState().ai.activeProvider
    const isOllamaLocal = activeProvider === "ollama-local"

    // For Ollama models on Mac M4, optimize performance
    // The ollama-ai-provider-v2 passes options through experimental_providerOptions
    const streamOptions: Parameters<typeof streamText>[0] = {
      model,
      system: options?.systemPrompt ?? HYDRAULIC_SYSTEM_PROMPT,
      messages: coreMessages,
      tools,
      abortSignal: abortController.signal,
    }

    // Add Ollama-specific optimizations for Mac M4 with 24GB RAM
    if (isOllamaLocal) {
      // Pass options directly to Ollama API
      // These optimize GPU usage and memory management
      ;(streamOptions as any).experimental_providerOptions = {
        ollama: {
          options: {
            num_gpu: -1, // Use all GPU layers (Metal acceleration on Mac M4)
            num_ctx: 4096, // Context window (balance between performance and memory)
            num_thread: 0, // Auto-detect optimal CPU threads
            use_mmap: true, // Memory mapping for faster model loading
            use_mlock: true, // Lock memory to prevent swapping (keeps model in RAM)
          },
        },
      }
    }

    const result = streamText(streamOptions)

    // Process the full stream to get text, tool calls, tool results, and usage
    let fullText = ""
    const toolResults: ToolCallResult[] = []
    let finalUsage: TokenUsageData | undefined
    // Cache tool-call args by toolCallId so we can use them in tool-result
    // (SDK sometimes doesn't pass args in tool-result event)
    const toolCallArgsCache: Map<string, Record<string, unknown>> = new Map()

    // Use fullStream to get all events including tool calls/results
    const processStream = async () => {
      try {
        for await (const part of result.fullStream) {
          if (abortController.signal.aborted) break

          switch (part.type) {
            case "text-delta":
              fullText += part.text
              callbacks.onText?.(part.text)
              break

            case "tool-call": {
              // Note: SDK uses 'input' not 'args' for tool-call events
              const toolInput = (part as { input?: unknown }).input as
                | Record<string, unknown>
                | undefined
              logger.log(
                "[AI Service] tool-call:",
                part.toolName,
                toolInput,
                "toolCallId:",
                part.toolCallId
              )
              // Cache the input/args for later use in tool-result
              if (toolInput) {
                toolCallArgsCache.set(part.toolCallId, toolInput)
              }
              callbacks.onToolCall?.(part.toolName, toolInput ?? {})
              break
            }

            case "tool-result": {
              // Note: SDK uses 'input' for args and 'output' for result
              const toolOutput = (part as { output?: unknown }).output
              const toolInput = (part as { input?: unknown }).input as
                | Record<string, unknown>
                | undefined
              // Try to get args from the event input, fallback to cached args from tool-call
              const cachedArgs = toolCallArgsCache.get(part.toolCallId)
              const args = toolInput ?? cachedArgs
              logger.log("[AI Service] tool-result:", part.toolName, {
                output: toolOutput,
                input: toolInput,
                cachedArgs,
                finalArgs: args,
              })
              const toolResult: ToolCallResult = {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args: args ?? {},
                result: toolOutput,
              }
              toolResults.push(toolResult)
              callbacks.onToolResult?.(toolResult)
              break
            }

            case "finish":
              // Capture the final usage from the stream
              if (part.totalUsage) {
                finalUsage = {
                  inputTokens: part.totalUsage.inputTokens,
                  outputTokens: part.totalUsage.outputTokens,
                  totalTokens: part.totalUsage.totalTokens,
                  reasoningTokens: part.totalUsage.reasoningTokens,
                  cachedInputTokens: part.totalUsage.cachedInputTokens,
                }
              }
              break

            case "error":
              console.error("[AI Service] Stream error part:", part)
              callbacks.onError?.(
                new Error(typeof part.error === "string" ? part.error : "Stream error occurred")
              )
              break
          }
        }

        logger.log(
          "[AI Service] Stream finished, fullText length:",
          fullText.length,
          "toolResults:",
          toolResults.length,
          "usage:",
          finalUsage
        )

        // Consume credits if using CADHY gateway (not BYOK)
        const activeProvider = useSettingsStore.getState().ai.activeProvider
        const userApiKey = await getApiKey()
        if (activeProvider === "gateway" && !userApiKey && finalUsage) {
          const creditsStore = useCreditsStore.getState()
          const usage: TokenUsage = {
            inputTokens: finalUsage.inputTokens || 0,
            outputTokens: finalUsage.outputTokens || 0,
            reasoningTokens: finalUsage.reasoningTokens,
            cachedInputTokens: finalUsage.cachedInputTokens,
          }
          const consumed = await creditsStore.consumeCreditsFromTokens(usage, modelId)
          if (!consumed) {
            logger.warn("[AI Service] Failed to consume credits after request")
          } else {
            const creditsUsed = calculateCreditsAfterRequest(
              usage,
              creditsStore.getModelPricing(modelId) || { input: 0, output: 0 },
              creditsStore.state?.tier || "free"
            )
            logger.log(`[AI Service] Consumed ${creditsUsed} credits for ${modelId}`)
          }
        }

        callbacks.onFinish?.(fullText, toolResults, finalUsage)
      } catch (error) {
        console.error("[AI Service] Stream processing error:", error)
        if (!abortController.signal.aborted) {
          callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
        }
      }
    }

    // Start processing (don't await to allow cancellation)
    processStream()

    return abortController
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
    return abortController
  }
}

/**
 * Get available models
 */
export function getAvailableModels(): ModelConfig[] {
  return AVAILABLE_MODELS
}

/**
 * Get default model ID
 */
export function getDefaultModelId(): string {
  return DEFAULT_CHAT_MODEL
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { ModelConfig }
