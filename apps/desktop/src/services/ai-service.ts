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
  sceneTools,
  // Re-exported from ai package via @cadhy/ai
  streamText,
  type ToolSet,
} from "@cadhy/ai"
import { invoke } from "@tauri-apps/api/core"
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

  console.log("[AI Service] getModel called:", { activeProvider, modelId })

  // ============================================================================
  // OLLAMA LOCAL - User's own machine (free, private)
  // ============================================================================
  if (activeProvider === "ollama-local") {
    console.log("[AI Service] Using Ollama Local...")
    try {
      const ollamaProvider = getOllamaProvider({ mode: "local" })
      // Use preferred Ollama model or default
      const ollamaModelId = useSettingsStore.getState().ai.preferredOllamaModel || "qwen3:8b"
      console.log("[AI Service] ✓ Using Ollama Local with model:", ollamaModelId)
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
  console.log("[AI Service] Using Gateway for provider:", activeProvider)

  const key = apiKey ?? (await getApiKey()) ?? undefined
  if (!key) {
    throw new Error(
      "No API key configured. Please add your API key in Settings or set up Ollama Local."
    )
  }

  console.log("[AI Service] ✓ Using Gateway with model:", modelId)
  const gateway = getGateway({ apiKey: key })
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
  }
): Promise<AbortController> {
  const abortController = new AbortController()

  try {
    const modelId = options?.modelId ?? DEFAULT_CHAT_MODEL
    const model = await getModel(modelId, options?.apiKey)

    // Convert messages to CoreMessage format
    const coreMessages: CoreMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // Stream the response
    // Note: In AI SDK 5.0+, maxSteps was replaced with stopWhen: stepCountIs(n)
    const result = streamText({
      model,
      system: options?.systemPrompt ?? HYDRAULIC_SYSTEM_PROMPT,
      messages: coreMessages,
      tools: allTools,
      abortSignal: abortController.signal,
    })

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
              console.log(
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
              console.log("[AI Service] tool-result:", part.toolName, {
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

        console.log(
          "[AI Service] Stream finished, fullText length:",
          fullText.length,
          "toolResults:",
          toolResults.length,
          "usage:",
          finalUsage
        )
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
