/**
 * Retry Middleware for AI SDK
 *
 * Implements exponential backoff retry logic for AI operations.
 * Handles transient failures and rate limit responses from providers.
 *
 * @see AI SDK v5 error handling patterns
 */

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Add jitter to prevent thundering herd (default: true) */
  jitter?: boolean
  /** Function to determine if an error is retryable */
  isRetryable?: (error: unknown) => boolean
  /** Callback for each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void
}

const DEFAULT_CONFIG: Required<Omit<RetryConfig, "onRetry" | "isRetryable">> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
}

/**
 * Default function to determine if an error is retryable.
 * Based on AI SDK error types and common HTTP status codes.
 */
export function defaultIsRetryable(error: unknown): boolean {
  // Check for standard Error types
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors - always retry
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      message.includes("socket hang up")
    ) {
      return true
    }

    // Rate limit errors - retry with backoff
    if (
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("429")
    ) {
      return true
    }

    // Server errors (5xx) - retry
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    ) {
      return true
    }

    // AI SDK specific errors
    if (error.name === "TooManyRequestsError") {
      return true
    }

    // Check for isRetryable property (AI SDK pattern)
    if ("isRetryable" in error && typeof error.isRetryable === "boolean") {
      return error.isRetryable
    }
  }

  // Check for Response objects
  if (error instanceof Response) {
    const status = error.status
    // Retry on server errors and rate limits
    return status >= 500 || status === 429
  }

  // Check for objects with status code
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    const status = error.statusCode
    return status >= 500 || status === 429
  }

  return false
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  // Exponential backoff: delay = initial * multiplier^attempt
  const exponentialDelay = initialDelayMs * backoffMultiplier ** (attempt - 1)

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs)

  // Add jitter (±25% randomness) to prevent thundering herd
  if (jitter) {
    const jitterRange = cappedDelay * 0.25
    const jitterValue = Math.random() * jitterRange * 2 - jitterRange
    return Math.max(0, Math.round(cappedDelay + jitterValue))
  }

  return Math.round(cappedDelay)
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wrap an async function with retry logic
 *
 * @example
 * ```ts
 * import { withRetry } from '@cadhy/ai/middleware';
 * import { streamText } from 'ai';
 *
 * const result = await withRetry(
 *   () => streamText({ model, prompt }),
 *   {
 *     maxRetries: 3,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry ${attempt}, waiting ${delay}ms...`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig = {}): Promise<T> {
  const {
    maxRetries = DEFAULT_CONFIG.maxRetries,
    initialDelayMs = DEFAULT_CONFIG.initialDelayMs,
    maxDelayMs = DEFAULT_CONFIG.maxDelayMs,
    backoffMultiplier = DEFAULT_CONFIG.backoffMultiplier,
    jitter = DEFAULT_CONFIG.jitter,
    isRetryable = defaultIsRetryable,
    onRetry,
  } = config

  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we've exhausted retries
      if (attempt > maxRetries) {
        throw error
      }

      // Check if error is retryable
      if (!isRetryable(error)) {
        throw error
      }

      // Calculate delay for this attempt
      const delayMs = calculateDelay(attempt, initialDelayMs, maxDelayMs, backoffMultiplier, jitter)

      // Call onRetry callback if provided
      onRetry?.(attempt, error, delayMs)

      // Wait before retrying
      await sleep(delayMs)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Create a retry-wrapped version of a function
 *
 * @example
 * ```ts
 * import { createRetryWrapper } from '@cadhy/ai/middleware';
 *
 * const retryableStreamText = createRetryWrapper({
 *   maxRetries: 3,
 *   onRetry: (attempt) => console.log(`Attempt ${attempt}`)
 * });
 *
 * const result = await retryableStreamText(() => streamText({ model, prompt }));
 * ```
 */
export function createRetryWrapper(
  config: RetryConfig = {}
): <T>(fn: () => Promise<T>) => Promise<T> {
  return <T>(fn: () => Promise<T>) => withRetry(fn, config)
}

/**
 * Retry error with additional context
 */
export class RetryExhaustedError extends Error {
  readonly attempts: number
  readonly lastError: unknown

  constructor(message: string, attempts: number, lastError: unknown) {
    super(message)
    this.name = "RetryExhaustedError"
    this.attempts = attempts
    this.lastError = lastError
  }
}

/**
 * Parse retry-after header from provider responses
 *
 * @param response - Response object or headers
 * @returns Retry delay in milliseconds, or null if not present
 */
export function parseRetryAfter(
  response: Response | Headers | Record<string, string>
): number | null {
  let retryAfter: string | null = null

  if (response instanceof Response) {
    retryAfter = response.headers.get("retry-after")
  } else if (response instanceof Headers) {
    retryAfter = response.get("retry-after")
  } else if (typeof response === "object" && response !== null) {
    retryAfter = response["retry-after"] || response["Retry-After"] || null
  }

  if (!retryAfter) {
    return null
  }

  // Try to parse as number of seconds
  const seconds = parseInt(retryAfter, 10)
  if (!Number.isNaN(seconds)) {
    return seconds * 1000
  }

  // Try to parse as HTTP date
  const date = new Date(retryAfter)
  if (!Number.isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now()
    return Math.max(0, delayMs)
  }

  return null
}
