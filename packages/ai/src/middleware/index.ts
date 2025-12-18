/**
 * AI Middleware
 *
 * Provides rate limiting, retry logic, and error handling for AI operations.
 */

// Error types
export {
  AIAPIError,
  AIAuthenticationError,
  AICancelledError,
  AIContentFilterError,
  AIContextLimitError,
  AIError,
  AIModelError,
  AIRateLimitError,
  AIStreamError,
  AIToolError,
  isAIError,
  isRetryableAIError,
  toAIError,
} from "./errors"
// Rate limiting
export {
  checkRateLimit,
  clearAllRateLimits,
  peekRateLimit,
  RATE_LIMIT_PRESETS,
  type RateLimitConfig,
  RateLimitError,
  type RateLimitResult,
  resetRateLimit,
  withRateLimit,
} from "./rate-limiter"
// Retry logic
export {
  createRetryWrapper,
  defaultIsRetryable,
  parseRetryAfter,
  type RetryConfig,
  RetryExhaustedError,
  withRetry,
} from "./retry"
