/**
 * Credits System - CADHY
 *
 * Local credits system for AI Gateway usage without requiring authentication.
 * Credits are calculated based on actual token usage (input + output).
 * Credits are stored locally and regenerate daily.
 */

/** Credit tier configuration */
export type CreditTier = "free" | "pro" | "enterprise"

/** Token usage information */
export interface TokenUsage {
  /** Input tokens used */
  inputTokens: number
  /** Output tokens generated */
  outputTokens: number
  /** Reasoning tokens (if applicable) */
  reasoningTokens?: number
  /** Cached input tokens (if applicable) */
  cachedInputTokens?: number
}

/** Model pricing per token (in USD) */
export interface ModelPricing {
  /** Cost per input token */
  input: number
  /** Cost per output token */
  output: number
  /** Cost per cached input token (optional) */
  cachedInput?: number
  /** Cost per reasoning token (optional) */
  reasoning?: number
}

/** Credits configuration per tier */
export interface CreditsConfig {
  /** Daily credit limit (in credits) */
  dailyLimit: number
  /** Credit value in USD (1 credit = X USD) */
  creditValueUSD: number
  /** Regeneration interval in milliseconds (24 hours) */
  regenerationInterval: number
}

/**
 * Credit conversion rate:
 * 1 crédito = $0.01 USD
 * Esto permite calcular créditos basado en costo real de tokens
 */
export const CREDIT_VALUE_USD = 0.01

/**
 * Calculate USD cost from token usage and pricing
 */
export function calculateUSDCost(usage: TokenUsage, pricing: ModelPricing): number {
  let cost = 0

  // Input tokens
  cost += usage.inputTokens * pricing.input

  // Output tokens
  cost += usage.outputTokens * pricing.output

  // Cached input tokens (cheaper)
  if (usage.cachedInputTokens && pricing.cachedInput) {
    cost += usage.cachedInputTokens * pricing.cachedInput
  } else if (usage.cachedInputTokens) {
    // Fallback to regular input price if cached price not available
    cost += usage.cachedInputTokens * pricing.input
  }

  // Reasoning tokens (if applicable)
  if (usage.reasoningTokens && pricing.reasoning) {
    cost += usage.reasoningTokens * pricing.reasoning
  }

  return cost
}

/**
 * Convert USD cost to credits
 * Uses CREDIT_VALUE_USD as conversion rate
 */
export function usdToCredits(usdCost: number, creditValueUSD: number = CREDIT_VALUE_USD): number {
  // Round up to nearest credit (always charge at least 1 credit)
  return Math.max(1, Math.ceil(usdCost / creditValueUSD))
}

/**
 * Calculate credits needed for a request based on token usage
 */
export function calculateCreditsFromTokens(
  usage: TokenUsage,
  pricing: ModelPricing,
  creditValueUSD: number = CREDIT_VALUE_USD
): number {
  const usdCost = calculateUSDCost(usage, pricing)
  return usdToCredits(usdCost, creditValueUSD)
}

/** Default credits configuration */
export const CREDITS_CONFIG: Record<CreditTier, CreditsConfig> = {
  free: {
    // Free tier: $0.50 USD per day = 50 créditos
    // Equivale a ~50,000 tokens de Gemini Flash o ~5,000 tokens de GPT-4o
    dailyLimit: 50, // 50 créditos = $0.50 USD
    creditValueUSD: CREDIT_VALUE_USD,
    regenerationInterval: 24 * 60 * 60 * 1000, // 24 hours
  },
  pro: {
    // Pro tier: $5 USD per day = 500 créditos
    // Equivale a ~500,000 tokens de Gemini Flash o ~50,000 tokens de GPT-4o
    dailyLimit: 500, // 500 créditos = $5 USD
    creditValueUSD: CREDIT_VALUE_USD,
    regenerationInterval: 24 * 60 * 60 * 1000,
  },
  enterprise: {
    // Enterprise: Unlimited
    dailyLimit: -1, // Unlimited
    creditValueUSD: CREDIT_VALUE_USD,
    regenerationInterval: 24 * 60 * 60 * 1000,
  },
}

/** Credits state stored locally */
export interface CreditsState {
  /** Current available credits */
  available: number
  /** Last regeneration timestamp */
  lastRegenerated: number
  /** Total credits used today */
  usedToday: number
  /** Current tier */
  tier: CreditTier
  /** Device ID (for rate limiting) */
  deviceId: string
}

/**
 * Estimate credits needed BEFORE making a request
 * Uses average token counts based on model and message length
 */
export function estimateCreditsBeforeRequest(
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  pricing: ModelPricing,
  tier: CreditTier = "free"
): number {
  const usage: TokenUsage = {
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
  }

  const config = CREDITS_CONFIG[tier]
  return calculateCreditsFromTokens(usage, pricing, config.creditValueUSD)
}

/**
 * Calculate actual credits consumed AFTER a request completes
 * Uses real token usage from the API response
 */
export function calculateCreditsAfterRequest(
  usage: TokenUsage,
  pricing: ModelPricing,
  tier: CreditTier = "free"
): number {
  const config = CREDITS_CONFIG[tier]
  return calculateCreditsFromTokens(usage, pricing, config.creditValueUSD)
}

/**
 * Check if credits are available for estimated token usage
 */
export function hasCreditsForTokens(state: CreditsState, estimatedCredits: number): boolean {
  if (state.tier === "enterprise") return true
  if (state.tier === "pro" && state.available === -1) return true

  return state.available >= estimatedCredits
}

/**
 * Consume credits based on actual token usage
 */
export function consumeCreditsFromTokens(
  state: CreditsState,
  usage: TokenUsage,
  pricing: ModelPricing
): CreditsState | null {
  const cost = calculateCreditsAfterRequest(usage, pricing, state.tier)

  if (!hasCreditsForTokens(state, cost)) {
    return null
  }

  const newAvailable = state.tier === "enterprise" ? -1 : state.available - cost

  return {
    ...state,
    available: newAvailable,
    usedToday: state.usedToday + cost,
  }
}

/** Regenerate credits if needed */
export function regenerateCreditsIfNeeded(state: CreditsState): CreditsState {
  const now = Date.now()
  const timeSinceRegeneration = now - state.lastRegenerated
  const config = CREDITS_CONFIG[state.tier]

  // Check if regeneration interval has passed
  if (timeSinceRegeneration >= config.regenerationInterval) {
    return {
      ...state,
      available: config.dailyLimit,
      lastRegenerated: now,
      usedToday: 0,
    }
  }

  return state
}

/** Initialize credits state for a device */
export function initializeCredits(deviceId: string, tier: CreditTier = "free"): CreditsState {
  const config = CREDITS_CONFIG[tier]
  return {
    available: config.dailyLimit,
    lastRegenerated: Date.now(),
    usedToday: 0,
    tier,
    deviceId,
  }
}
