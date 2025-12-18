/**
 * Gemini OAuth Provider
 *
 * Enables users to authenticate with their personal Google account
 * to use their own Gemini Pro quota. This allows a subscription-free
 * model where users pay Google directly.
 *
 * Requires: npm install -g @google/gemini-cli && gemini (for initial auth)
 *
 * @see https://github.com/ben-vargas/ai-sdk-provider-gemini-cli
 */

import type { LanguageModel } from "ai"

/**
 * Authentication types supported by Gemini CLI
 */
export type GeminiAuthType = "oauth-personal" | "api-key" | "vertex-ai"

/**
 * Configuration for the Gemini CLI provider
 */
export interface GeminiCliProviderConfig {
  /**
   * Authentication type:
   * - 'oauth-personal': Uses cached OAuth credentials from ~/.gemini/oauth_creds.json
   * - 'api-key': Uses GEMINI_API_KEY environment variable or provided apiKey
   * - 'vertex-ai': Uses Google Cloud Vertex AI
   */
  authType: GeminiAuthType
  /**
   * API key (only used when authType is 'api-key')
   */
  apiKey?: string
  /**
   * Google Cloud Project ID (only used when authType is 'vertex-ai')
   */
  projectId?: string
  /**
   * Google Cloud Location (only used when authType is 'vertex-ai')
   */
  location?: string
}

/**
 * Available Gemini models through CLI provider
 */
export const GEMINI_CLI_MODELS = {
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-2.0-flash": "gemini-2.0-flash",
  "gemini-2.0-flash-exp": "gemini-2.0-flash-exp",
  "gemini-1.5-pro": "gemini-1.5-pro",
  "gemini-1.5-flash": "gemini-1.5-flash",
} as const

export type GeminiCliModelId = keyof typeof GEMINI_CLI_MODELS

/**
 * Interface for the Tauri invoke function
 * This avoids importing @tauri-apps/api directly which may not be available
 */
interface TauriInvoke {
  invoke: <T>(cmd: string) => Promise<T>
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
  /** Expiry timestamp if available (Unix timestamp in seconds) */
  expiresAt: number | null
  /** Whether credentials are expired */
  isExpired: boolean
}

/**
 * Check if Gemini CLI OAuth credentials exist and are valid
 *
 * This checks for the presence of the OAuth credentials file that
 * the Gemini CLI creates after 'gemini' login.
 *
 * NOTE: This function should be called from the desktop app which has
 * access to the Tauri IPC. In the AI package, it attempts dynamic import.
 *
 * @returns GeminiOAuthStatus with detailed information about credentials
 */
export async function checkGeminiOAuthCredentials(): Promise<GeminiOAuthStatus> {
  try {
    // Attempt to dynamically import Tauri API
    // This will fail in non-Tauri environments
    // Using Function constructor to avoid static analysis of the import
    const importFn = new Function("specifier", "return import(specifier)")
    const tauriCore = (await importFn("@tauri-apps/api/core")) as TauriInvoke
    if (tauriCore?.invoke) {
      return await tauriCore.invoke<GeminiOAuthStatus>("auth_check_gemini_oauth")
    }
  } catch {
    // Not in Tauri context - that's expected in tests/web
  }

  return {
    hasCredentials: false,
    credentialsPath: "",
    isValid: false,
    error: "Not in Tauri context",
    expiresAt: null,
    isExpired: false,
  }
}

/**
 * Check if Gemini CLI OAuth credentials exist (simple boolean check)
 *
 * @deprecated Use checkGeminiOAuthCredentials() for detailed status
 * @returns true if OAuth credentials are available and valid
 */
export async function hasGeminiOAuthCredentials(): Promise<boolean> {
  const status = await checkGeminiOAuthCredentials()
  return status.hasCredentials && status.isValid
}

/**
 * Provider factory function type from ai-sdk-provider-gemini-cli
 */
type CreateGeminiProviderFn = (config: {
  authType: string
  apiKey?: string
}) => (modelId: string) => LanguageModel

/**
 * Get the Gemini CLI provider instance
 *
 * This creates a provider that uses the ai-sdk-provider-gemini-cli package
 * to authenticate with Gemini using OAuth or API key.
 *
 * @example OAuth authentication (recommended for users with Gemini Pro)
 * ```ts
 * import { getGeminiCliProvider } from '@cadhy/ai/providers';
 *
 * const gemini = await getGeminiCliProvider({ authType: 'oauth-personal' });
 * const model = gemini('gemini-2.5-flash');
 *
 * const result = await streamText({
 *   model,
 *   prompt: 'Analyze this channel section',
 * });
 * ```
 *
 * @example API key authentication
 * ```ts
 * const gemini = await getGeminiCliProvider({
 *   authType: 'api-key',
 *   apiKey: userProvidedKey,
 * });
 * ```
 */
export async function getGeminiCliProvider(
  config: GeminiCliProviderConfig
): Promise<(modelId: GeminiCliModelId | string) => LanguageModel> {
  // Dynamic import to avoid bundling issues if the package isn't installed
  // Using Function constructor to avoid static analysis
  const importFn = new Function("specifier", "return import(specifier)")
  const module = (await importFn("ai-sdk-provider-gemini-cli")) as {
    createGeminiProvider: CreateGeminiProviderFn
  }
  const createGeminiProvider = module.createGeminiProvider

  const provider = createGeminiProvider({
    authType: config.authType,
    apiKey: config.apiKey,
  })

  return (modelId: GeminiCliModelId | string) => {
    const resolvedModelId = GEMINI_CLI_MODELS[modelId as GeminiCliModelId] ?? modelId
    return provider(resolvedModelId)
  }
}

/**
 * Authentication status for Gemini
 */
export interface GeminiAuthStatus {
  /** Whether OAuth credentials are available and valid */
  hasOAuth: boolean
  /** Whether an API key is configured */
  hasApiKey: boolean
  /** Recommended auth type based on available credentials */
  recommendedAuthType: GeminiAuthType | null
  /** Detailed OAuth status (if in Tauri context) */
  oauthStatus: GeminiOAuthStatus | null
}

/**
 * Check Gemini authentication status
 *
 * Determines what authentication methods are available for the user.
 *
 * @param envApiKey - Optional API key to check (pass from env in calling context)
 */
export async function checkGeminiAuthStatus(envApiKey?: string): Promise<GeminiAuthStatus> {
  const oauthStatus = await checkGeminiOAuthCredentials()
  const hasOAuth = oauthStatus.hasCredentials && oauthStatus.isValid
  const hasApiKey = !!envApiKey

  let recommendedAuthType: GeminiAuthType | null = null
  if (hasOAuth) {
    recommendedAuthType = "oauth-personal"
  } else if (hasApiKey) {
    recommendedAuthType = "api-key"
  }

  return {
    hasOAuth,
    hasApiKey,
    recommendedAuthType,
    oauthStatus: oauthStatus.credentialsPath ? oauthStatus : null,
  }
}

/**
 * Instructions for setting up Gemini OAuth
 *
 * Returns user-friendly instructions for authenticating with Google.
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
