/**
 * Available AI Models Configuration
 *
 * Defines the models available through Vercel AI Gateway.
 * Models are accessed via gateway format: provider/model-name
 */

/** Supported model providers */
export type ModelProvider = "openai" | "anthropic" | "google" | "xai" | "ollama"

/**
 * Model pricing information (per token in USD)
 * Compatible with AI Gateway pricing format
 */
export interface ModelPricing {
  /** Cost per input token in USD */
  input: number
  /** Cost per output token in USD */
  output: number
  /** Cost per cached input token (read) in USD */
  cachedInput?: number
}

/** Model configuration */
export interface ModelConfig {
  /** Display name */
  name: string
  /** Gateway model ID (provider/model) */
  id: string
  /** Provider */
  provider: ModelProvider
  /** Supports reasoning/thinking */
  supportsReasoning?: boolean
  /** Always use reasoning (for complex reasoning models) */
  alwaysReason?: boolean
  /** Supports structured output */
  supportsStructuredOutput?: boolean
  /** Supports vision/image input */
  supportsVision?: boolean
  /** Maximum context tokens */
  maxTokens?: number
  /** Model description */
  description?: string
  /** Pricing per token (USD) */
  pricing?: ModelPricing
  /** Whether this is a cloud model (Ollama Cloud) */
  isCloudModel?: boolean
  /** RAM requirements for local models */
  ramRequirement?: string
  /** Download size for local models */
  downloadSize?: string
}

/**
 * Available models through Vercel AI Gateway
 * Pricing is per token in USD (divide by 1M for per-million pricing)
 *
 * Pricing sources (as of 2025):
 * - OpenAI: https://openai.com/api/pricing/
 * - Anthropic: https://www.anthropic.com/pricing
 * - Google: https://ai.google.dev/pricing
 * - xAI: https://x.ai/api
 */
export const AVAILABLE_MODELS: ModelConfig[] = [
  // OpenAI Models
  {
    name: "GPT-4o",
    id: "openai/gpt-4o",
    provider: "openai",
    supportsReasoning: true,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxTokens: 128000,
    description: "GPT-4o - Most capable OpenAI model",
    // $2.50/1M input, $10/1M output
    pricing: { input: 0.0000025, output: 0.00001, cachedInput: 0.00000125 },
  },
  {
    name: "GPT-4o Mini",
    id: "openai/gpt-4o-mini",
    provider: "openai",
    supportsReasoning: false,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxTokens: 128000,
    description: "GPT-4o Mini - Fast and efficient",
    // $0.15/1M input, $0.60/1M output
    pricing: { input: 0.00000015, output: 0.0000006, cachedInput: 0.000000075 },
  },

  // Anthropic Models - Claude family
  {
    name: "Claude Opus 4.5",
    id: "anthropic/claude-opus-4.5",
    provider: "anthropic",
    supportsReasoning: true,
    alwaysReason: true,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxTokens: 200000,
    description: "Claude Opus 4.5 - Most capable, complex reasoning",
    // $15/1M input, $75/1M output (estimated based on Opus 4 pricing)
    pricing: { input: 0.000015, output: 0.000075, cachedInput: 0.0000015 },
  },
  {
    name: "Claude Sonnet 4.5",
    id: "anthropic/claude-sonnet-4.5",
    provider: "anthropic",
    supportsReasoning: true,
    alwaysReason: false,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxTokens: 200000,
    description: "Claude Sonnet 4.5 - Latest balanced performance",
    // $3/1M input, $15/1M output
    pricing: { input: 0.000003, output: 0.000015, cachedInput: 0.0000003 },
  },
  {
    name: "Claude Haiku 4.5",
    id: "anthropic/claude-haiku-4.5",
    provider: "anthropic",
    supportsReasoning: false,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxTokens: 200000,
    description: "Claude Haiku 4.5 - Fast and efficient",
    // $0.80/1M input, $4/1M output (estimated based on Haiku 3.5 pricing)
    pricing: { input: 0.0000008, output: 0.000004, cachedInput: 0.00000008 },
  },

  // Google Models - Gemini family
  {
    name: "Gemini 2.5 Flash",
    id: "google/gemini-2.5-flash",
    provider: "google",
    supportsReasoning: true,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxTokens: 1000000,
    description: "Gemini 2.5 Flash - Fast multimodal model (1M context)",
    // $0.075/1M input (<=128k), $0.30/1M output
    pricing: { input: 0.000000075, output: 0.0000003 },
  },
  {
    name: "Gemini 2.5 Pro",
    id: "google/gemini-2.5-pro",
    provider: "google",
    supportsReasoning: true,
    alwaysReason: true,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxTokens: 1000000,
    description: "Gemini 2.5 Pro - Most capable Google model (1M context)",
    // $1.25/1M input (<=128k), $10/1M output
    pricing: { input: 0.00000125, output: 0.00001 },
  },

  // xAI Models - Grok family
  {
    name: "Grok 3",
    id: "xai/grok-3",
    provider: "xai",
    supportsReasoning: true,
    supportsStructuredOutput: true,
    supportsVision: false,
    maxTokens: 131072,
    description: "Grok 3 - Fast and capable",
    // $3/1M input, $15/1M output (estimated)
    pricing: { input: 0.000003, output: 0.000015 },
  },

  // ==========================================================================
  // Ollama Local Models (run on user's machine)
  // ==========================================================================
  {
    name: "Qwen 3 8B",
    id: "ollama/qwen3:8b",
    provider: "ollama",
    supportsReasoning: true,
    supportsStructuredOutput: true,
    supportsVision: false,
    maxTokens: 32768,
    description: "Best for tool calling, supports thinking mode",
    downloadSize: "4.7 GB",
    ramRequirement: "8-12 GB",
  },
  {
    name: "Qwen 3 4B",
    id: "ollama/qwen3:4b",
    provider: "ollama",
    supportsReasoning: true,
    supportsStructuredOutput: true,
    supportsVision: false,
    maxTokens: 32768,
    description: "Good for 8GB RAM systems",
    downloadSize: "2.6 GB",
    ramRequirement: "6-8 GB",
  },
  {
    name: "Qwen 2.5 Coder 7B",
    id: "ollama/qwen2.5-coder:7b",
    provider: "ollama",
    supportsReasoning: false,
    supportsStructuredOutput: true,
    supportsVision: false,
    maxTokens: 32768,
    description: "Best for calculations and code",
    downloadSize: "4.2 GB",
    ramRequirement: "8-10 GB",
  },
  {
    name: "Llama 3.1 8B",
    id: "ollama/llama3.1:8b",
    provider: "ollama",
    supportsReasoning: false,
    supportsStructuredOutput: true,
    supportsVision: false,
    maxTokens: 128000,
    description: "Meta's model, good all-rounder",
    downloadSize: "4.7 GB",
    ramRequirement: "8-12 GB",
  },
  {
    name: "Mistral 7B",
    id: "ollama/mistral:7b",
    provider: "ollama",
    supportsReasoning: false,
    supportsStructuredOutput: true,
    supportsVision: false,
    maxTokens: 32768,
    description: "Fast and efficient open model",
    downloadSize: "4.1 GB",
    ramRequirement: "8-10 GB",
  },
]

/** Get model config by ID */
export function getModelById(id: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id)
}

/** Get models by provider */
export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === provider)
}

/** Get models that support structured output */
export function getStructuredOutputModels(): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => m.supportsStructuredOutput)
}

/** Get models that support reasoning */
export function getReasoningModels(): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => m.supportsReasoning)
}

/** Get models that support vision/image input */
export function getVisionModels(): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => m.supportsVision)
}

/** Check if a model supports vision */
export function modelSupportsVision(modelId: string): boolean {
  const model = getModelById(modelId)
  return model?.supportsVision ?? false
}

/** Check if a model supports reasoning */
export function modelSupportsReasoning(modelId: string): boolean {
  const model = getModelById(modelId)
  return model?.supportsReasoning ?? false
}

/** Check if a model should always use reasoning */
export function modelAlwaysReasons(modelId: string): boolean {
  const model = getModelById(modelId)
  return model?.alwaysReason ?? false
}

/** Get Ollama local models (can run on user's machine) */
export function getOllamaLocalModels(): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === "ollama")
}

/** Get all Ollama models (alias for getOllamaLocalModels after cleanup) */
export function getOllamaModels(): ModelConfig[] {
  return getOllamaLocalModels()
}

/** Default model for hydraulic analysis - Gemini 2.5 Flash for speed */
export const DEFAULT_ANALYSIS_MODEL = "google/gemini-2.5-flash"

/** Default model for chat - Gemini 2.5 Flash for fast responses */
export const DEFAULT_CHAT_MODEL = "google/gemini-2.5-flash"

// =============================================================================
// PROVIDER-BASED MODEL FILTERING
// =============================================================================

/**
 * AI Provider types - simplified to Gateway + Ollama Local only
 */
export type AIProviderType = "ollama-local" | "gateway" | null

/**
 * Provider availability status - simplified structure
 */
export interface ProviderAvailability {
  hasOllamaLocal: boolean
  ollamaModels: string[] // Installed local Ollama models
  activeProvider: AIProviderType
}

/**
 * Model group for UI display with separator support
 */
export interface ModelGroup {
  /** Group label (provider name) */
  label: string
  /** Provider identifier */
  provider: ModelProvider | "ollama-local" | "gateway"
  /** Models in this group */
  models: ModelConfig[]
  /** Whether this is the currently active provider */
  isActive: boolean
}

/**
 * Get available models filtered by the ACTIVE provider only.
 * Returns models grouped by provider for UI display.
 *
 * SIMPLIFIED: Only two providers
 * - Ollama Local active → Only installed Ollama models
 * - Gateway (fallback) → All cloud models via CADHY gateway
 */
export function getAvailableModelsForProvider(availability: ProviderAvailability): ModelGroup[] {
  const activeProvider = availability.activeProvider

  // ============================================================================
  // 1. Ollama Local - Models running on user's machine
  // ============================================================================
  if (activeProvider === "ollama-local" && availability.hasOllamaLocal) {
    const installedModels: ModelConfig[] = availability.ollamaModels.map((modelName) => {
      // Try to find a matching model in our predefined list
      const predefined = AVAILABLE_MODELS.find(
        (m) =>
          m.provider === "ollama" &&
          (m.id === `ollama/${modelName}` || m.id.includes(modelName.split(":")[0]))
      )

      if (predefined) {
        return predefined
      }

      // Create a dynamic config for unknown installed models
      return {
        name: modelName,
        id: `ollama/${modelName}`,
        provider: "ollama" as ModelProvider,
        supportsReasoning: false,
        supportsStructuredOutput: true,
        supportsVision: false,
        maxTokens: 32768,
        description: `Modelo instalado localmente`,
      }
    })

    return [
      {
        label: "Ollama (Local)",
        provider: "ollama-local",
        models: installedModels,
        isActive: true,
      },
    ]
  }

  // ============================================================================
  // 2. Gateway Fallback - All models through CADHY gateway (your service)
  // ============================================================================
  const gatewayGroups: ModelGroup[] = []

  // Group gateway models by provider for better organization
  const openaiGateway = AVAILABLE_MODELS.filter((m) => m.provider === "openai")
  const anthropicGateway = AVAILABLE_MODELS.filter((m) => m.provider === "anthropic")
  const googleGateway = AVAILABLE_MODELS.filter((m) => m.provider === "google")
  const xaiGateway = AVAILABLE_MODELS.filter((m) => m.provider === "xai")

  if (openaiGateway.length > 0) {
    gatewayGroups.push({
      label: "OpenAI",
      provider: "gateway",
      models: openaiGateway,
      isActive: true,
    })
  }
  if (anthropicGateway.length > 0) {
    gatewayGroups.push({
      label: "Anthropic",
      provider: "gateway",
      models: anthropicGateway,
      isActive: true,
    })
  }
  if (googleGateway.length > 0) {
    gatewayGroups.push({
      label: "Google",
      provider: "gateway",
      models: googleGateway,
      isActive: true,
    })
  }
  if (xaiGateway.length > 0) {
    gatewayGroups.push({
      label: "xAI",
      provider: "gateway",
      models: xaiGateway,
      isActive: true,
    })
  }

  return gatewayGroups
}

/**
 * Get a flat list of available models based on provider availability.
 * Useful when you don't need grouping.
 */
export function getFilteredModels(availability: ProviderAvailability): ModelConfig[] {
  const groups = getAvailableModelsForProvider(availability)
  return groups.flatMap((g) => g.models)
}

/**
 * Get the recommended default model based on available providers.
 */
export function getDefaultModelForProvider(availability: ProviderAvailability): string {
  // Ollama Local -> Use first installed model (with preference order)
  if (availability.hasOllamaLocal && availability.ollamaModels.length > 0) {
    const firstModel = availability.ollamaModels[0]
    // Prefer known good models if installed
    const preferredOrder = ["qwen3:8b", "qwen2.5-coder:7b", "llama3.1:8b"]
    for (const preferred of preferredOrder) {
      if (availability.ollamaModels.includes(preferred)) {
        return `ollama/${preferred}`
      }
    }
    return `ollama/${firstModel}`
  }

  // Gateway fallback -> Gemini Flash (cheapest for us)
  return DEFAULT_CHAT_MODEL
}
