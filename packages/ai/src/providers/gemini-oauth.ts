/**
 * Gemini OAuth Provider
 *
 * Enables users to authenticate with their personal Google account
 * to use their own Gemini Pro quota. Uses @ai-sdk/google with OAuth
 * access token passed from the frontend.
 *
 * The frontend is responsible for reading credentials from
 * ~/.gemini/oauth_creds.json via Tauri IPC.
 *
 * Setup: npm install -g @google/gemini-cli && gemini
 *
 * @see https://ai.google.dev/gemini-api/docs/oauth
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { LanguageModel } from "ai"

/**
 * OAuth credentials structure from ~/.gemini/oauth_creds.json
 */
export interface GeminiOAuthCredentials {
  access_token: string
  refresh_token: string
  scope: string
  token_type: string
  id_token?: string
  expiry_date: number
}

/**
 * Status returned by the Rust auth_check_gemini_oauth command
 */
export interface GeminiOAuthStatus {
  /** Whether credentials file exists */
  hasCredentials: boolean
  /** Path to the credentials file */
  credentialsPath: string
  /** Whether the credentials appear valid (has required fields) */
  isValid: boolean
  /** Optional error message if something is wrong */
  error: string | null
  /** Expiry timestamp if available (Unix timestamp in milliseconds) */
  expiresAt: number | null
  /** Whether credentials are expired */
  isExpired: boolean
}

/**
 * Extended status with the actual credentials for token refresh
 */
export interface GeminiOAuthStatusWithCredentials extends GeminiOAuthStatus {
  /** The actual credentials if available */
  credentials?: GeminiOAuthCredentials
}

/**
 * Configuration for creating the Gemini OAuth provider
 */
export interface GeminiOAuthProviderConfig {
  /** OAuth access token from credentials file */
  accessToken: string
}

/**
 * Available Gemini models through OAuth
 */
export const GEMINI_OAUTH_MODELS = {
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-2.0-flash": "gemini-2.0-flash",
  "gemini-2.0-flash-lite": "gemini-2.0-flash-lite",
  "gemini-1.5-pro": "gemini-1.5-pro",
  "gemini-1.5-flash": "gemini-1.5-flash",
} as const

export type GeminiOAuthModelId = keyof typeof GEMINI_OAUTH_MODELS

// Cache for the Google provider instance
let cachedProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null
let cachedAccessToken: string | null = null

/**
 * Create a custom fetch that replaces API key auth with OAuth Bearer token
 *
 * The Gemini API accepts both:
 * - x-goog-api-key: API_KEY (API key auth)
 * - Authorization: Bearer ACCESS_TOKEN (OAuth auth)
 *
 * @ai-sdk/google always adds x-goog-api-key, so we need to:
 * 1. Remove the x-goog-api-key header
 * 2. Add Authorization: Bearer header with our OAuth token
 */
function createOAuthFetch(accessToken: string): typeof globalThis.fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers)

    // Remove the API key header that @ai-sdk/google adds
    headers.delete("x-goog-api-key")

    // Add OAuth Bearer token instead
    headers.set("Authorization", `Bearer ${accessToken}`)

    return globalThis.fetch(input, {
      ...init,
      headers,
    })
  }
}

/**
 * Create a Gemini OAuth provider instance
 *
 * Creates a provider that uses @ai-sdk/google with OAuth Bearer token
 * authentication instead of API key.
 *
 * @param config - Configuration with the OAuth access token
 * @returns A function that creates language models for Gemini
 *
 * @example
 * ```ts
 * import { createGeminiOAuthProvider } from '@cadhy/ai/providers';
 *
 * // Get credentials from Tauri IPC in the frontend
 * const creds = await invoke<GeminiOAuthCredentials>("auth_read_gemini_oauth_credentials");
 *
 * const gemini = createGeminiOAuthProvider({ accessToken: creds.access_token });
 * const model = gemini('gemini-2.5-flash');
 *
 * const result = await streamText({
 *   model,
 *   prompt: 'Analyze this channel section',
 * });
 * ```
 */
export function createGeminiOAuthProvider(
  config: GeminiOAuthProviderConfig
): (modelId: GeminiOAuthModelId | string) => LanguageModel {
  const { accessToken } = config

  if (!accessToken) {
    throw new Error("Access token is required for Gemini OAuth provider")
  }

  // Use cached provider if token hasn't changed
  if (cachedProvider && cachedAccessToken === accessToken) {
    const provider = cachedProvider // Capture in local const for TypeScript
    return (modelId: GeminiOAuthModelId | string) => {
      const resolvedModelId = GEMINI_OAUTH_MODELS[modelId as GeminiOAuthModelId] ?? modelId
      return provider(resolvedModelId)
    }
  }

  // Create provider with:
  // 1. A dummy API key (required by @ai-sdk/google validation)
  // 2. Custom fetch that replaces API key auth with OAuth Bearer token
  const provider = createGoogleGenerativeAI({
    // Dummy API key - will be removed by our custom fetch
    // This is required because @ai-sdk/google validates apiKey exists
    apiKey: "OAUTH_MODE",
    // Custom fetch that injects OAuth Bearer token
    fetch: createOAuthFetch(accessToken),
  })

  // Cache the provider
  cachedProvider = provider
  cachedAccessToken = accessToken

  return (modelId: GeminiOAuthModelId | string) => {
    const resolvedModelId = GEMINI_OAUTH_MODELS[modelId as GeminiOAuthModelId] ?? modelId
    return provider(resolvedModelId)
  }
}

/**
 * Clear the cached provider (for testing or when credentials change)
 */
export function clearGeminiOAuthCache(): void {
  cachedProvider = null
  cachedAccessToken = null
}

/**
 * Instructions for setting up Gemini OAuth
 */
export const GEMINI_OAUTH_SETUP_INSTRUCTIONS = `
## Set up Gemini with your Google Account

To use your personal Gemini Pro quota in CADHY:

1. **Install the Gemini CLI** (one-time setup):
   \`\`\`bash
   npm install -g @google/gemini-cli
   \`\`\`

2. **Authenticate with Google**:
   \`\`\`bash
   gemini
   \`\`\`
   This will open a browser window for you to log in with your Google account.

3. **Restart CADHY** to use your Gemini Pro account.

Your credentials are stored securely in \`~/.gemini/oauth_creds.json\`.
No API key management required!
`.trim()
