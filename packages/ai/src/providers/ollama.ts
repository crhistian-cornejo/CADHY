/**
 * Ollama Provider - CADHY
 *
 * Enables users to run AI models locally via Ollama, or use Ollama Cloud
 * for larger models (GPT-OSS, DeepSeek, Qwen 480B) that won't fit locally.
 *
 * Supports:
 * - Local models: Run on user's machine (requires Ollama installed)
 * - Cloud models: Run on Ollama's datacenter GPUs (requires ollama.com account)
 *
 * Both local and cloud use the same OpenAI-compatible API format, making
 * tool calling and structured outputs work seamlessly.
 *
 * @see https://ollama.com/blog/cloud-models
 * @see https://sdk.vercel.ai/providers/community-providers/ollama
 */

import type { LanguageModel } from "ai"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Ollama connection mode
 * - 'local': Connect to locally running Ollama (localhost:11434)
 * - 'cloud': Connect directly to ollama.com API (requires API key)
 * - 'hybrid': Local Ollama that can run cloud models (requires signin)
 */
export type OllamaMode = "local" | "cloud" | "hybrid"

/**
 * Configuration for the Ollama provider
 */
export interface OllamaProviderConfig {
  /**
   * Connection mode
   * @default 'local'
   */
  mode?: OllamaMode
  /**
   * Base URL for Ollama API
   * - Local: 'http://localhost:11434' (default)
   * - Cloud: 'https://ollama.com'
   */
  baseURL?: string
  /**
   * API key for cloud access (from ollama.com/settings/keys)
   * Only required for mode='cloud'
   */
  apiKey?: string
  /**
   * Custom headers to include in requests
   */
  headers?: Record<string, string>
}

/**
 * Status of Ollama availability
 */
export interface OllamaStatus {
  /** Whether Ollama is available (local or cloud) */
  available: boolean
  /** Connection mode being used */
  mode: OllamaMode
  /** List of available model names */
  models: string[]
  /** Ollama version (if local) */
  version?: string
  /** Whether user is signed in (for cloud models) */
  isSignedIn?: boolean
  /** Error message if not available */
  error?: string
}

/**
 * Model info from Ollama API
 */
export interface OllamaModelInfo {
  name: string
  /** Model size in bytes */
  size: number
  /** Last modified date */
  modified_at: string
  /** Model digest/hash */
  digest: string
  /** Model details */
  details?: {
    family: string
    parameter_size: string
    quantization_level: string
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default Ollama local server URL */
export const OLLAMA_LOCAL_URL = "http://localhost:11434"

/** Ollama cloud API URL */
export const OLLAMA_CLOUD_URL = "https://ollama.com"

/**
 * Recommended models for CADHY with tool calling support
 *
 * These models have been tested for reliable tool/function calling
 * which is essential for CADHY's hydraulic and CAD tools.
 */
export const OLLAMA_RECOMMENDED_MODELS = {
  // Local models (run on user's machine)
  local: {
    /** Best balance of size and capability for tool calling */
    "qwen3:8b": {
      name: "Qwen 3 8B",
      size: "4.7 GB",
      ram: "8-12 GB",
      description: "Best for tool calling, supports thinking mode",
      supportsTools: true,
      supportsThinking: true,
    },
    /** Smaller model for limited hardware */
    "qwen3:4b": {
      name: "Qwen 3 4B",
      size: "2.6 GB",
      ram: "6-8 GB",
      description: "Good for 8GB RAM systems",
      supportsTools: true,
      supportsThinking: true,
    },
    /** Code-focused model */
    "qwen2.5-coder:7b": {
      name: "Qwen 2.5 Coder 7B",
      size: "4.2 GB",
      ram: "8-10 GB",
      description: "Best for calculations and code",
      supportsTools: true,
      supportsThinking: false,
    },
    /** Llama alternative */
    "llama3.1:8b": {
      name: "Llama 3.1 8B",
      size: "4.7 GB",
      ram: "8-12 GB",
      description: "Meta's model, good all-rounder",
      supportsTools: true,
      supportsThinking: false,
    },
  },
  // Cloud models (run on Ollama's servers)
  cloud: {
    /** OpenAI's open-weight model - 20B */
    "gpt-oss:20b-cloud": {
      name: "GPT-OSS 20B",
      description: "OpenAI open-weight, fast local-grade performance",
      supportsTools: true,
      supportsThinking: true,
    },
    /** OpenAI's open-weight model - 120B */
    "gpt-oss:120b-cloud": {
      name: "GPT-OSS 120B",
      description: "OpenAI open-weight, production-grade reasoning",
      supportsTools: true,
      supportsThinking: true,
    },
    /** DeepSeek's massive model */
    "deepseek-v3.1:671b-cloud": {
      name: "DeepSeek V3.1 671B",
      description: "Massive reasoning model for complex analysis",
      supportsTools: true,
      supportsThinking: true,
    },
    /** Qwen's massive coding model */
    "qwen3-coder:480b-cloud": {
      name: "Qwen 3 Coder 480B",
      description: "Best for complex code and calculations",
      supportsTools: true,
      supportsThinking: true,
    },
  },
} as const

export type OllamaLocalModelId = keyof typeof OLLAMA_RECOMMENDED_MODELS.local
export type OllamaCloudModelId = keyof typeof OLLAMA_RECOMMENDED_MODELS.cloud
export type OllamaModelId = OllamaLocalModelId | OllamaCloudModelId

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Check if Ollama is available locally
 *
 * @param baseURL - Ollama server URL (default: localhost:11434)
 * @returns OllamaStatus with availability info
 */
export async function checkOllamaLocal(baseURL: string = OLLAMA_LOCAL_URL): Promise<OllamaStatus> {
  try {
    // Check version endpoint
    const versionResponse = await fetch(`${baseURL}/api/version`, {
      method: "GET",
      signal: AbortSignal.timeout(3000), // 3 second timeout
    })

    if (!versionResponse.ok) {
      return {
        available: false,
        mode: "local",
        models: [],
        error: `Ollama returned status ${versionResponse.status}`,
      }
    }

    const versionData = await versionResponse.json()

    // Get list of models
    const modelsResponse = await fetch(`${baseURL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    })

    let models: string[] = []
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json()
      models = (modelsData.models || []).map((m: OllamaModelInfo) => m.name)
    }

    return {
      available: true,
      mode: "local",
      models,
      version: versionData.version,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      available: false,
      mode: "local",
      models: [],
      error: message.includes("fetch")
        ? "Ollama is not running. Start it with: ollama serve"
        : message,
    }
  }
}

/**
 * Check if Ollama Cloud is available
 *
 * @param apiKey - Ollama API key from ollama.com/settings/keys
 * @returns OllamaStatus with cloud availability
 */
export async function checkOllamaCloud(apiKey?: string): Promise<OllamaStatus> {
  if (!apiKey) {
    return {
      available: false,
      mode: "cloud",
      models: [],
      error: "No Ollama API key configured",
    }
  }

  try {
    const response = await fetch(`${OLLAMA_CLOUD_URL}/api/tags`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return {
        available: false,
        mode: "cloud",
        models: [],
        error: response.status === 401 ? "Invalid API key" : `Status ${response.status}`,
      }
    }

    const data = await response.json()
    const models = (data.models || []).map((m: OllamaModelInfo) => m.name)

    return {
      available: true,
      mode: "cloud",
      models,
      isSignedIn: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      available: false,
      mode: "cloud",
      models: [],
      error: message,
    }
  }
}

/**
 * Pull (download) a model to local Ollama
 *
 * @param modelName - Model name to pull (e.g., 'qwen3:8b')
 * @param baseURL - Ollama server URL
 * @param onProgress - Progress callback (0-100)
 */
export async function pullOllamaModel(
  modelName: string,
  baseURL: string = OLLAMA_LOCAL_URL,
  onProgress?: (progress: number, status: string) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${baseURL}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName, stream: true }),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const reader = response.body?.getReader()
    if (!reader) {
      return { success: false, error: "No response body" }
    }

    const decoder = new TextDecoder()
    let lastProgress = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split("\n").filter(Boolean)

      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          if (data.total && data.completed) {
            const progress = Math.round((data.completed / data.total) * 100)
            if (progress !== lastProgress) {
              lastProgress = progress
              onProgress?.(progress, data.status || "Downloading...")
            }
          } else if (data.status) {
            onProgress?.(lastProgress, data.status)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: message }
  }
}

/**
 * Delete a model from local Ollama
 *
 * @param modelName - Model name to delete
 * @param baseURL - Ollama server URL
 */
export async function deleteOllamaModel(
  modelName: string,
  baseURL: string = OLLAMA_LOCAL_URL
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${baseURL}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName }),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: message }
  }
}

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

/**
 * Provider factory function type from ollama-ai-provider-v2
 */
type CreateOllamaFn = (config?: { baseURL?: string; headers?: Record<string, string> }) => {
  (modelId: string): LanguageModel
  textEmbeddingModel: (modelId: string) => unknown
}

/**
 * Get the Ollama provider instance for use with AI SDK
 *
 * Uses the ollama-ai-provider-v2 package which is OpenAI-compatible
 * and supports tool calling, streaming, and structured outputs.
 *
 * @example Local model
 * ```ts
 * import { getOllamaProvider } from '@cadhy/ai/providers';
 * import { streamText } from 'ai';
 *
 * const ollama = await getOllamaProvider({ mode: 'local' });
 * const result = await streamText({
 *   model: ollama('qwen3:8b'),
 *   tools: hydraulicTools,
 *   prompt: 'Create a trapezoidal channel',
 * });
 * ```
 *
 * @example Cloud model
 * ```ts
 * const ollama = await getOllamaProvider({
 *   mode: 'cloud',
 *   apiKey: process.env.OLLAMA_API_KEY,
 * });
 * const result = await streamText({
 *   model: ollama('gpt-oss:120b-cloud'),
 *   prompt: 'Analyze hydraulic jump',
 * });
 * ```
 */
export async function getOllamaProvider(
  config: OllamaProviderConfig = {}
): Promise<(modelId: string) => LanguageModel> {
  const mode = config.mode ?? "local"
  const baseURL =
    config.baseURL ?? (mode === "cloud" ? `${OLLAMA_CLOUD_URL}/api` : `${OLLAMA_LOCAL_URL}/api`)

  // Build headers
  const headers: Record<string, string> = { ...config.headers }
  if (mode === "cloud" && config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`
  }

  // Dynamic import to avoid bundling issues
  const importFn = new Function("specifier", "return import(specifier)")

  try {
    const module = (await importFn("ollama-ai-provider-v2")) as {
      createOllama: CreateOllamaFn
    }
    const createOllama = module.createOllama

    const provider = createOllama({
      baseURL,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    })

    return (modelId: string) => provider(modelId)
  } catch {
    // Fallback: Use OpenAI-compatible provider since Ollama is OpenAI-compatible
    const openaiModule = (await importFn("@ai-sdk/openai")) as {
      createOpenAI: (config: {
        baseURL: string
        apiKey: string
        headers?: Record<string, string>
      }) => (modelId: string) => LanguageModel
    }
    const createOpenAI = openaiModule.createOpenAI

    // Use the /v1 endpoint for OpenAI compatibility
    const v1BaseURL = baseURL.replace("/api", "/v1")

    const provider = createOpenAI({
      baseURL: v1BaseURL,
      apiKey: config.apiKey ?? "ollama", // Required but ignored for local
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    })

    return (modelId: string) => provider(modelId)
  }
}

// =============================================================================
// SETUP INSTRUCTIONS
// =============================================================================

/**
 * Instructions for setting up Ollama
 */
export const OLLAMA_SETUP_INSTRUCTIONS = `
## Run AI Models Locally with Ollama

Ollama lets you run powerful AI models on your own computer with complete privacy.

### 1. Install Ollama

**macOS:**
\`\`\`bash
brew install ollama
\`\`\`

**Windows/Linux:**
Download from [ollama.com/download](https://ollama.com/download)

### 2. Start Ollama

\`\`\`bash
ollama serve
\`\`\`

### 3. Download a Model

For CADHY, we recommend **qwen3:8b** for best tool calling:

\`\`\`bash
ollama pull qwen3:8b
\`\`\`

### 4. Restart CADHY

CADHY will automatically detect Ollama and use your local model.

---

## Ollama Cloud (Optional)

For larger models (GPT-OSS 120B, DeepSeek 671B) that won't fit locally:

1. Create account at [ollama.com](https://ollama.com)
2. Sign in: \`ollama signin\`
3. Run cloud models: \`ollama run gpt-oss:120b-cloud\`

**Pricing:** Free tier available, Pro $20/mo, Max $100/mo
`.trim()

/**
 * Short instructions for toast/dialog
 */
export const OLLAMA_QUICK_INSTRUCTIONS = `
1) Install: brew install ollama (macOS) or ollama.com/download
2) Start: ollama serve
3) Download model: ollama pull qwen3:8b
4) Restart CADHY
`.trim()
