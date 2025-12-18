/**
 * Rate Limiter for AI SDK
 *
 * Implements in-memory rate limiting for desktop applications.
 * Uses a sliding window algorithm to prevent API abuse.
 *
 * @see AI SDK v5 rate limiting patterns
 */

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number
  /** Window size in milliseconds */
  windowMs: number
  /** Optional identifier for the rate limit bucket (default: 'default') */
  identifier?: string
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Remaining requests in the current window */
  remaining: number
  /** Milliseconds until the rate limit resets */
  resetInMs: number
  /** Total limit for the window */
  limit: number
}

interface RateLimitBucket {
  timestamps: number[]
  windowStart: number
}

/**
 * In-memory rate limiter using sliding window algorithm.
 *
 * Perfect for Tauri desktop apps where we don't have Redis/KV.
 * State is per-session, which is fine for desktop use.
 */
class InMemoryRateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map()

  /**
   * Check if a request is allowed and consume one token if so.
   */
  check(config: RateLimitConfig): RateLimitResult {
    const identifier = config.identifier ?? "default"
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Get or create bucket
    let bucket = this.buckets.get(identifier)
    if (!bucket) {
      bucket = { timestamps: [], windowStart: now }
      this.buckets.set(identifier, bucket)
    }

    // Remove timestamps outside the window (sliding window)
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart)

    // Check if we're over the limit
    if (bucket.timestamps.length >= config.maxRequests) {
      const oldestTimestamp = bucket.timestamps[0]
      const resetInMs = oldestTimestamp + config.windowMs - now

      return {
        success: false,
        remaining: 0,
        resetInMs: Math.max(0, resetInMs),
        limit: config.maxRequests,
      }
    }

    // Add current timestamp and allow request
    bucket.timestamps.push(now)

    return {
      success: true,
      remaining: config.maxRequests - bucket.timestamps.length,
      resetInMs: config.windowMs,
      limit: config.maxRequests,
    }
  }

  /**
   * Check without consuming a token (peek)
   */
  peek(config: RateLimitConfig): RateLimitResult {
    const identifier = config.identifier ?? "default"
    const now = Date.now()
    const windowStart = now - config.windowMs

    const bucket = this.buckets.get(identifier)
    if (!bucket) {
      return {
        success: true,
        remaining: config.maxRequests,
        resetInMs: config.windowMs,
        limit: config.maxRequests,
      }
    }

    const validTimestamps = bucket.timestamps.filter((ts) => ts > windowStart)
    const remaining = config.maxRequests - validTimestamps.length

    if (remaining <= 0) {
      const oldestTimestamp = validTimestamps[0]
      const resetInMs = oldestTimestamp + config.windowMs - now

      return {
        success: false,
        remaining: 0,
        resetInMs: Math.max(0, resetInMs),
        limit: config.maxRequests,
      }
    }

    return {
      success: true,
      remaining,
      resetInMs: config.windowMs,
      limit: config.maxRequests,
    }
  }

  /**
   * Reset a specific bucket
   */
  reset(identifier = "default"): void {
    this.buckets.delete(identifier)
  }

  /**
   * Clear all buckets
   */
  clearAll(): void {
    this.buckets.clear()
  }
}

// Singleton instance
const rateLimiter = new InMemoryRateLimiter()

/**
 * Default rate limit configurations for different use cases
 */
export const RATE_LIMIT_PRESETS = {
  /** Standard chat usage: 20 requests per minute */
  chat: {
    maxRequests: 20,
    windowMs: 60 * 1000,
    identifier: "chat",
  } satisfies RateLimitConfig,

  /** Streaming responses: 10 concurrent streams per minute */
  streaming: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    identifier: "streaming",
  } satisfies RateLimitConfig,

  /** Tool calls: 30 per minute (tools can be called multiple times per message) */
  toolCalls: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    identifier: "tools",
  } satisfies RateLimitConfig,

  /** Analysis operations: 5 per minute (heavier operations) */
  analysis: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    identifier: "analysis",
  } satisfies RateLimitConfig,

  /** Burst mode for testing: 100 requests per minute */
  burst: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    identifier: "burst",
  } satisfies RateLimitConfig,
} as const

/**
 * Check rate limit for a request
 *
 * @example
 * ```ts
 * import { checkRateLimit, RATE_LIMIT_PRESETS } from '@cadhy/ai/middleware';
 *
 * const result = checkRateLimit(RATE_LIMIT_PRESETS.chat);
 * if (!result.success) {
 *   throw new RateLimitError(`Rate limited. Try again in ${result.resetInMs}ms`);
 * }
 * ```
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  return rateLimiter.check(config)
}

/**
 * Peek at rate limit status without consuming a token
 */
export function peekRateLimit(config: RateLimitConfig): RateLimitResult {
  return rateLimiter.peek(config)
}

/**
 * Reset rate limit for a specific identifier
 */
export function resetRateLimit(identifier = "default"): void {
  rateLimiter.reset(identifier)
}

/**
 * Clear all rate limits
 */
export function clearAllRateLimits(): void {
  rateLimiter.clearAll()
}

/**
 * Custom error for rate limiting
 */
export class RateLimitError extends Error {
  readonly resetInMs: number
  readonly remaining: number
  readonly limit: number

  constructor(message: string, result: RateLimitResult) {
    super(message)
    this.name = "RateLimitError"
    this.resetInMs = result.resetInMs
    this.remaining = result.remaining
    this.limit = result.limit
  }

  /** Get human-readable time until reset */
  get resetInSeconds(): number {
    return Math.ceil(this.resetInMs / 1000)
  }
}

/**
 * Higher-order function to wrap any async function with rate limiting
 *
 * @example
 * ```ts
 * import { withRateLimit, RATE_LIMIT_PRESETS } from '@cadhy/ai/middleware';
 *
 * const rateLimitedChat = withRateLimit(
 *   async (prompt: string) => {
 *     return streamText({ model, prompt });
 *   },
 *   RATE_LIMIT_PRESETS.chat
 * );
 *
 * try {
 *   const result = await rateLimitedChat('Hello!');
 * } catch (error) {
 *   if (error instanceof RateLimitError) {
 *     console.log(`Wait ${error.resetInSeconds} seconds`);
 *   }
 * }
 * ```
 */
export function withRateLimit<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  config: RateLimitConfig
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const result = checkRateLimit(config)

    if (!result.success) {
      throw new RateLimitError(
        `Rate limit exceeded. ${result.remaining}/${result.limit} requests remaining. ` +
          `Try again in ${Math.ceil(result.resetInMs / 1000)} seconds.`,
        result
      )
    }

    return fn(...args)
  }
}
