/**
 * Google AI Provider (Direct)
 *
 * Uses @ai-sdk/google directly for API calls that need to bypass
 * the AI Gateway (which has CORS restrictions in browser environments).
 *
 * This is particularly useful for image generation with Gemini models
 * since Google's API allows CORS when using the API key directly.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google"

/**
 * Headers that WebKit forbids in CORS requests.
 * These are stripped from requests to avoid CORS errors on macOS/Safari/WKWebView.
 */
const WEBKIT_FORBIDDEN_HEADERS = new Set([
  "user-agent",
  "accept-encoding",
  "content-length",
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
])

/**
 * Extract headers as a plain object, filtering out forbidden headers.
 */
function extractSafeHeaders(headers: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {}

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      if (!WEBKIT_FORBIDDEN_HEADERS.has(key.toLowerCase())) {
        result[key] = value
      }
    })
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      if (!WEBKIT_FORBIDDEN_HEADERS.has(key.toLowerCase())) {
        result[key] = value
      }
    }
  } else {
    for (const key of Object.keys(headers)) {
      if (!WEBKIT_FORBIDDEN_HEADERS.has(key.toLowerCase())) {
        result[key] = headers[key]
      }
    }
  }

  return result
}

/**
 * Custom fetch that strips WebKit-forbidden headers.
 */
function createWebKitSafeFetch(): typeof globalThis.fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const safeInit: RequestInit = { ...init }
    if (safeInit.headers) {
      safeInit.headers = extractSafeHeaders(safeInit.headers)
    }
    return globalThis.fetch(input, safeInit)
  }
}

/** Configuration for Google AI provider */
export interface GoogleProviderConfig {
  /** Google AI API key */
  apiKey: string
}

// Cache for Google provider instances
const googleProviderCache = new Map<string, ReturnType<typeof createGoogleGenerativeAI>>()

/**
 * Simple hash function to create unique cache keys for API keys.
 */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

/**
 * Get a direct Google AI provider.
 *
 * This bypasses the AI Gateway and calls Google's API directly,
 * which is necessary for operations like image generation that
 * have CORS issues with the gateway.
 *
 * @example
 * ```ts
 * import { getGoogleProvider } from '@cadhy/ai/providers'
 *
 * const google = getGoogleProvider({ apiKey: 'your-api-key' })
 * const model = google('gemini-2.0-flash')
 * ```
 */
export function getGoogleProvider(config: GoogleProviderConfig) {
  const cacheKey = hashString(config.apiKey)

  let provider = googleProviderCache.get(cacheKey)
  if (!provider) {
    provider = createGoogleGenerativeAI({
      apiKey: config.apiKey,
      fetch: createWebKitSafeFetch(),
    })
    googleProviderCache.set(cacheKey, provider)
  }

  return provider
}

/**
 * Clear the Google provider cache.
 */
export function clearGoogleProviderCache() {
  googleProviderCache.clear()
}

/** Model IDs for Google's image-capable models */
export const GOOGLE_IMAGE_MODELS = {
  /** Gemini 2.0 Flash with image generation */
  GEMINI_2_FLASH_IMAGE: "gemini-2.0-flash-preview-image-generation",
  /** Gemini 2.0 Flash experimental with images */
  GEMINI_2_FLASH_EXP: "gemini-2.0-flash-exp",
} as const

export type GoogleImageModelId = (typeof GOOGLE_IMAGE_MODELS)[keyof typeof GOOGLE_IMAGE_MODELS]
