/**
 * AI Error Types
 *
 * Standardized error types for AI operations, following AI SDK v5 patterns.
 * These errors provide context and actionable information.
 */

/**
 * Base error for all AI-related errors
 */
export class AIError extends Error {
  readonly code: string
  readonly isRetryable: boolean
  readonly provider?: string
  readonly model?: string

  constructor(
    message: string,
    options: {
      code: string
      isRetryable?: boolean
      provider?: string
      model?: string
      cause?: Error
    }
  ) {
    super(message, { cause: options.cause })
    this.name = "AIError"
    this.code = options.code
    this.isRetryable = options.isRetryable ?? false
    this.provider = options.provider
    this.model = options.model
  }
}

/**
 * Error when rate limit is exceeded
 */
export class AIRateLimitError extends AIError {
  readonly retryAfterMs?: number
  readonly remaining: number
  readonly limit: number

  constructor(
    message: string,
    options: {
      retryAfterMs?: number
      remaining?: number
      limit?: number
      provider?: string
      model?: string
    } = {}
  ) {
    super(message, {
      code: "RATE_LIMIT_EXCEEDED",
      isRetryable: true,
      provider: options.provider,
      model: options.model,
    })
    this.name = "AIRateLimitError"
    this.retryAfterMs = options.retryAfterMs
    this.remaining = options.remaining ?? 0
    this.limit = options.limit ?? 0
  }

  /** Human-readable time until reset */
  get retryAfterSeconds(): number | undefined {
    return this.retryAfterMs ? Math.ceil(this.retryAfterMs / 1000) : undefined
  }
}

/**
 * Error when API call fails
 */
export class AIAPIError extends AIError {
  readonly statusCode?: number
  readonly response?: unknown

  constructor(
    message: string,
    options: {
      statusCode?: number
      response?: unknown
      isRetryable?: boolean
      provider?: string
      model?: string
      cause?: Error
    } = {}
  ) {
    super(message, {
      code: "API_ERROR",
      isRetryable: options.isRetryable ?? (options.statusCode ? options.statusCode >= 500 : false),
      provider: options.provider,
      model: options.model,
      cause: options.cause,
    })
    this.name = "AIAPIError"
    this.statusCode = options.statusCode
    this.response = options.response
  }
}

/**
 * Error when model is not available or invalid
 */
export class AIModelError extends AIError {
  readonly availableModels?: string[]

  constructor(
    message: string,
    options: {
      availableModels?: string[]
      provider?: string
      model?: string
    } = {}
  ) {
    super(message, {
      code: "MODEL_ERROR",
      isRetryable: false,
      provider: options.provider,
      model: options.model,
    })
    this.name = "AIModelError"
    this.availableModels = options.availableModels
  }
}

/**
 * Error when tool execution fails
 */
export class AIToolError extends AIError {
  readonly toolName: string
  readonly toolArgs?: unknown

  constructor(
    message: string,
    options: {
      toolName: string
      toolArgs?: unknown
      isRetryable?: boolean
      cause?: Error
    }
  ) {
    super(message, {
      code: "TOOL_ERROR",
      isRetryable: options.isRetryable ?? false,
      cause: options.cause,
    })
    this.name = "AIToolError"
    this.toolName = options.toolName
    this.toolArgs = options.toolArgs
  }
}

/**
 * Error when context/token limit is exceeded
 */
export class AIContextLimitError extends AIError {
  readonly tokenCount?: number
  readonly maxTokens?: number

  constructor(
    message: string,
    options: {
      tokenCount?: number
      maxTokens?: number
      provider?: string
      model?: string
    } = {}
  ) {
    super(message, {
      code: "CONTEXT_LIMIT_EXCEEDED",
      isRetryable: false,
      provider: options.provider,
      model: options.model,
    })
    this.name = "AIContextLimitError"
    this.tokenCount = options.tokenCount
    this.maxTokens = options.maxTokens
  }

  /** Percentage of context used */
  get usagePercentage(): number | undefined {
    if (this.tokenCount && this.maxTokens) {
      return Math.round((this.tokenCount / this.maxTokens) * 100)
    }
    return undefined
  }
}

/**
 * Error when content is blocked by safety filters
 */
export class AIContentFilterError extends AIError {
  readonly filterType?: string
  readonly categories?: string[]

  constructor(
    message: string,
    options: {
      filterType?: string
      categories?: string[]
      provider?: string
      model?: string
    } = {}
  ) {
    super(message, {
      code: "CONTENT_FILTERED",
      isRetryable: false,
      provider: options.provider,
      model: options.model,
    })
    this.name = "AIContentFilterError"
    this.filterType = options.filterType
    this.categories = options.categories
  }
}

/**
 * Error when streaming fails
 */
export class AIStreamError extends AIError {
  readonly partialResponse?: string

  constructor(
    message: string,
    options: {
      partialResponse?: string
      isRetryable?: boolean
      provider?: string
      model?: string
      cause?: Error
    } = {}
  ) {
    super(message, {
      code: "STREAM_ERROR",
      isRetryable: options.isRetryable ?? true,
      provider: options.provider,
      model: options.model,
      cause: options.cause,
    })
    this.name = "AIStreamError"
    this.partialResponse = options.partialResponse
  }
}

/**
 * Error when request is cancelled/aborted
 */
export class AICancelledError extends AIError {
  constructor(
    message = "Request was cancelled",
    options: {
      provider?: string
      model?: string
    } = {}
  ) {
    super(message, {
      code: "CANCELLED",
      isRetryable: false,
      provider: options.provider,
      model: options.model,
    })
    this.name = "AICancelledError"
  }
}

/**
 * Error when authentication fails
 */
export class AIAuthenticationError extends AIError {
  constructor(
    message: string,
    options: {
      provider?: string
    } = {}
  ) {
    super(message, {
      code: "AUTHENTICATION_ERROR",
      isRetryable: false,
      provider: options.provider,
    })
    this.name = "AIAuthenticationError"
  }
}

/**
 * Type guard for AI errors
 */
export function isAIError(error: unknown): error is AIError {
  return error instanceof AIError
}

/**
 * Type guard for retryable errors
 */
export function isRetryableAIError(error: unknown): boolean {
  if (isAIError(error)) {
    return error.isRetryable
  }
  return false
}

/**
 * Convert unknown error to AIError
 */
export function toAIError(
  error: unknown,
  context?: { provider?: string; model?: string }
): AIError {
  if (error instanceof AIError) {
    return error
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Detect rate limit errors
    if (
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("too many requests")
    ) {
      return new AIRateLimitError(error.message, context)
    }

    // Detect authentication errors
    if (
      message.includes("unauthorized") ||
      message.includes("401") ||
      message.includes("api key")
    ) {
      return new AIAuthenticationError(error.message, context)
    }

    // Detect content filter errors
    if (
      message.includes("content") &&
      (message.includes("filter") || message.includes("blocked"))
    ) {
      return new AIContentFilterError(error.message, context)
    }

    // Detect context limit errors
    if (message.includes("token") && (message.includes("limit") || message.includes("exceed"))) {
      return new AIContextLimitError(error.message, context)
    }

    // Default to API error
    return new AIAPIError(error.message, {
      ...context,
      cause: error,
      isRetryable: message.includes("network") || message.includes("timeout"),
    })
  }

  // Unknown error type
  return new AIAPIError(String(error), context)
}
