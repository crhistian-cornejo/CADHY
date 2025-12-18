/**
 * Vercel AI Gateway Provider
 *
 * Uses Vercel AI Gateway for unified access to multiple AI providers.
 * The gateway routes requests to OpenAI, Anthropic, Google, etc.
 *
 * Supports BYOK (Bring Your Own Key) for users who want to use their own API keys.
 *
 * IMPORTANT: We use a custom fetch wrapper to fix WebKit CORS issues.
 * WebKit (Safari/WKWebView on macOS) blocks the `User-Agent` header in CORS requests
 * because it's not included in Vercel's `Access-Control-Allow-Headers` response.
 *
 * @see https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway
 */

import { createGateway } from "@ai-sdk/gateway"

/** Gateway configuration for BYOK (Bring Your Own Key) */
export interface GatewayProviderConfig {
  /** API key for Vercel AI Gateway (from env.AI_GATEWAY_API_KEY) */
  apiKey?: string
  /** Custom base URL for self-hosted gateway */
  baseURL?: string
  /** Custom headers to include in requests */
  headers?: Record<string, string>
}

/**
 * Headers that WebKit forbids in CORS requests.
 * These are stripped from requests to avoid CORS errors on macOS/Safari/WKWebView.
 */
const WEBKIT_FORBIDDEN_HEADERS = [
  "user-agent",
  "accept-encoding",
  "content-length",
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
]

/**
 * Custom fetch that strips WebKit-forbidden headers.
 *
 * WebKit (Safari, WKWebView on macOS/iOS) enforces stricter CORS rules than Chromium.
 * This wrapper removes problematic headers before making the request.
 */
function createWebKitSafeFetch(): typeof globalThis.fetch {
  const safeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const safeInit: RequestInit = { ...init }

    if (safeInit.headers) {
      let headers: Record<string, string>

      if (safeInit.headers instanceof Headers) {
        headers = {}
        safeInit.headers.forEach((value, key) => {
          headers[key] = value
        })
      } else if (Array.isArray(safeInit.headers)) {
        headers = {}
        for (const [key, value] of safeInit.headers) {
          headers[key] = value
        }
      } else {
        headers = { ...safeInit.headers }
      }

      // Remove forbidden headers (case-insensitive)
      for (const key of Object.keys(headers)) {
        if (WEBKIT_FORBIDDEN_HEADERS.includes(key.toLowerCase())) {
          delete headers[key]
        }
      }

      safeInit.headers = headers
    }

    return globalThis.fetch(input, safeInit)
  }

  return safeFetch as typeof globalThis.fetch
}

// Cache for gateway instances
const gatewayCache = new Map<string, ReturnType<typeof createGateway>>()

// Default gateway with WebKit-safe fetch (created lazily)
let defaultGateway: ReturnType<typeof createGateway> | null = null

/**
 * Simple hash function to create unique cache keys for API keys.
 * Uses djb2 algorithm - fast and produces good distribution.
 * We don't store the actual key, just a hash for cache lookup.
 */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  // Convert to unsigned 32-bit integer and then to hex
  return (hash >>> 0).toString(16)
}

/**
 * Get the default gateway with WebKit-safe fetch.
 */
function getDefaultGateway(): ReturnType<typeof createGateway> {
  if (!defaultGateway) {
    defaultGateway = createGateway({
      fetch: createWebKitSafeFetch(),
    })
  }
  return defaultGateway
}

/**
 * Creates the Vercel AI Gateway provider
 *
 * Uses the gateway from '@ai-sdk/gateway' which automatically handles routing
 * to different providers based on the model ID format: provider/model-name
 *
 * @example Default usage (uses AI_GATEWAY_API_KEY env var)
 * ```ts
 * import { streamText } from 'ai';
 * import { getGateway } from '@cadhy/ai/providers';
 *
 * const result = await streamText({
 *   model: getGateway()('google/gemini-2.5-flash'),
 *   prompt: 'Analyze this channel section',
 * });
 * ```
 *
 * @example BYOK with custom API key
 * ```ts
 * const gateway = getGateway({ apiKey: userProvidedApiKey });
 * const result = await streamText({
 *   model: gateway('google/gemini-2.5-flash'),
 *   prompt: 'Calculate flow velocity',
 * });
 * ```
 */
export function getGateway(config?: GatewayProviderConfig) {
  // If no config provided, use the default gateway
  if (!config || (!config.apiKey && !config.baseURL && !config.headers)) {
    return getDefaultGateway()
  }

  // Create a cache key from the config using hash for API key
  // This ensures different API keys get different cache entries
  const cacheKey = JSON.stringify({
    apiKeyHash: config.apiKey ? hashString(config.apiKey) : undefined,
    baseURL: config.baseURL,
    headers: config.headers,
  })

  // Check if we already have a gateway with this config
  let customGateway = gatewayCache.get(cacheKey)
  if (!customGateway) {
    customGateway = createGateway({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      headers: config.headers,
      fetch: createWebKitSafeFetch(),
    })
    gatewayCache.set(cacheKey, customGateway)
  }

  return customGateway
}

import type { LanguageModel } from "ai"

/**
 * Get a specific model from the gateway
 */
export function getGatewayModel(modelId: string, config?: GatewayProviderConfig): LanguageModel {
  return getGateway(config)(modelId)
}

/**
 * Clear the gateway cache
 * Useful when API keys change or for testing
 */
export function clearGatewayCache() {
  gatewayCache.clear()
  defaultGateway = null
}
