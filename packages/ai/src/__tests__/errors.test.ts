/**
 * AI Error Types Tests
 *
 * Tests for standardized AI error types.
 */

import { describe, expect, test } from "bun:test"
import {
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
} from "../middleware/errors"

describe("AI Errors", () => {
  describe("AIError (base)", () => {
    test("creates error with required properties", () => {
      const error = new AIError("Test error", {
        code: "TEST_ERROR",
      })

      expect(error.name).toBe("AIError")
      expect(error.message).toBe("Test error")
      expect(error.code).toBe("TEST_ERROR")
      expect(error.isRetryable).toBe(false)
    })

    test("creates error with all properties", () => {
      const cause = new Error("Original")
      const error = new AIError("Test error", {
        code: "TEST_ERROR",
        isRetryable: true,
        provider: "openai",
        model: "gpt-4",
        cause,
      })

      expect(error.isRetryable).toBe(true)
      expect(error.provider).toBe("openai")
      expect(error.model).toBe("gpt-4")
      expect(error.cause).toBe(cause)
    })
  })

  describe("AIRateLimitError", () => {
    test("creates error with rate limit properties", () => {
      const error = new AIRateLimitError("Rate limit exceeded", {
        retryAfterMs: 30000,
        remaining: 0,
        limit: 100,
        provider: "anthropic",
        model: "claude-3",
      })

      expect(error.name).toBe("AIRateLimitError")
      expect(error.code).toBe("RATE_LIMIT_EXCEEDED")
      expect(error.isRetryable).toBe(true)
      expect(error.retryAfterMs).toBe(30000)
      expect(error.remaining).toBe(0)
      expect(error.limit).toBe(100)
    })

    test("calculates retryAfterSeconds", () => {
      const error = new AIRateLimitError("Test", { retryAfterMs: 45000 })
      expect(error.retryAfterSeconds).toBe(45)
    })

    test("returns undefined retryAfterSeconds when not set", () => {
      const error = new AIRateLimitError("Test")
      expect(error.retryAfterSeconds).toBeUndefined()
    })

    test("defaults remaining and limit to 0", () => {
      const error = new AIRateLimitError("Test")
      expect(error.remaining).toBe(0)
      expect(error.limit).toBe(0)
    })
  })

  describe("AIAPIError", () => {
    test("creates error with status code", () => {
      const error = new AIAPIError("Server error", {
        statusCode: 500,
        response: { error: "Internal error" },
      })

      expect(error.name).toBe("AIAPIError")
      expect(error.code).toBe("API_ERROR")
      expect(error.statusCode).toBe(500)
      expect(error.response).toEqual({ error: "Internal error" })
    })

    test("is retryable for 5xx errors", () => {
      expect(new AIAPIError("", { statusCode: 500 }).isRetryable).toBe(true)
      expect(new AIAPIError("", { statusCode: 502 }).isRetryable).toBe(true)
      expect(new AIAPIError("", { statusCode: 503 }).isRetryable).toBe(true)
    })

    test("is not retryable for 4xx errors", () => {
      expect(new AIAPIError("", { statusCode: 400 }).isRetryable).toBe(false)
      expect(new AIAPIError("", { statusCode: 404 }).isRetryable).toBe(false)
    })

    test("respects explicit isRetryable override", () => {
      expect(new AIAPIError("", { statusCode: 400, isRetryable: true }).isRetryable).toBe(true)
      expect(new AIAPIError("", { statusCode: 500, isRetryable: false }).isRetryable).toBe(false)
    })
  })

  describe("AIModelError", () => {
    test("creates error with available models", () => {
      const error = new AIModelError("Model not found", {
        availableModels: ["gpt-4", "gpt-3.5-turbo"],
        provider: "openai",
        model: "gpt-5",
      })

      expect(error.name).toBe("AIModelError")
      expect(error.code).toBe("MODEL_ERROR")
      expect(error.isRetryable).toBe(false)
      expect(error.availableModels).toEqual(["gpt-4", "gpt-3.5-turbo"])
    })
  })

  describe("AIToolError", () => {
    test("creates error with tool info", () => {
      const error = new AIToolError("Tool execution failed", {
        toolName: "createBox",
        toolArgs: { width: 10, height: 20 },
      })

      expect(error.name).toBe("AIToolError")
      expect(error.code).toBe("TOOL_ERROR")
      expect(error.toolName).toBe("createBox")
      expect(error.toolArgs).toEqual({ width: 10, height: 20 })
    })

    test("respects isRetryable option", () => {
      expect(new AIToolError("", { toolName: "test", isRetryable: true }).isRetryable).toBe(true)
      expect(new AIToolError("", { toolName: "test", isRetryable: false }).isRetryable).toBe(false)
    })
  })

  describe("AIContextLimitError", () => {
    test("creates error with token info", () => {
      const error = new AIContextLimitError("Context too long", {
        tokenCount: 150000,
        maxTokens: 128000,
        model: "gpt-4",
      })

      expect(error.name).toBe("AIContextLimitError")
      expect(error.code).toBe("CONTEXT_LIMIT_EXCEEDED")
      expect(error.isRetryable).toBe(false)
      expect(error.tokenCount).toBe(150000)
      expect(error.maxTokens).toBe(128000)
    })

    test("calculates usagePercentage", () => {
      const error = new AIContextLimitError("", {
        tokenCount: 64000,
        maxTokens: 128000,
      })
      expect(error.usagePercentage).toBe(50)
    })

    test("returns undefined usagePercentage when data missing", () => {
      expect(new AIContextLimitError("").usagePercentage).toBeUndefined()
      expect(new AIContextLimitError("", { tokenCount: 100 }).usagePercentage).toBeUndefined()
    })
  })

  describe("AIContentFilterError", () => {
    test("creates error with filter info", () => {
      const error = new AIContentFilterError("Content blocked", {
        filterType: "safety",
        categories: ["violence", "hate"],
      })

      expect(error.name).toBe("AIContentFilterError")
      expect(error.code).toBe("CONTENT_FILTERED")
      expect(error.isRetryable).toBe(false)
      expect(error.filterType).toBe("safety")
      expect(error.categories).toEqual(["violence", "hate"])
    })
  })

  describe("AIStreamError", () => {
    test("creates error with partial response", () => {
      const error = new AIStreamError("Stream interrupted", {
        partialResponse: "The answer is...",
      })

      expect(error.name).toBe("AIStreamError")
      expect(error.code).toBe("STREAM_ERROR")
      expect(error.isRetryable).toBe(true) // Default
      expect(error.partialResponse).toBe("The answer is...")
    })
  })

  describe("AICancelledError", () => {
    test("creates error with default message", () => {
      const error = new AICancelledError()

      expect(error.name).toBe("AICancelledError")
      expect(error.code).toBe("CANCELLED")
      expect(error.message).toBe("Request was cancelled")
      expect(error.isRetryable).toBe(false)
    })

    test("accepts custom message", () => {
      const error = new AICancelledError("User cancelled")
      expect(error.message).toBe("User cancelled")
    })
  })

  describe("AIAuthenticationError", () => {
    test("creates error with provider", () => {
      const error = new AIAuthenticationError("Invalid API key", {
        provider: "openai",
      })

      expect(error.name).toBe("AIAuthenticationError")
      expect(error.code).toBe("AUTHENTICATION_ERROR")
      expect(error.isRetryable).toBe(false)
      expect(error.provider).toBe("openai")
    })
  })

  describe("isAIError", () => {
    test("returns true for AIError instances", () => {
      expect(isAIError(new AIError("", { code: "TEST" }))).toBe(true)
      expect(isAIError(new AIRateLimitError(""))).toBe(true)
      expect(isAIError(new AIAPIError(""))).toBe(true)
      expect(isAIError(new AIModelError(""))).toBe(true)
      expect(isAIError(new AIToolError("", { toolName: "test" }))).toBe(true)
    })

    test("returns false for non-AIError", () => {
      expect(isAIError(new Error("Regular error"))).toBe(false)
      expect(isAIError("string")).toBe(false)
      expect(isAIError(null)).toBe(false)
      expect(isAIError(undefined)).toBe(false)
    })
  })

  describe("isRetryableAIError", () => {
    test("returns true for retryable AI errors", () => {
      expect(isRetryableAIError(new AIRateLimitError(""))).toBe(true)
      expect(isRetryableAIError(new AIStreamError(""))).toBe(true)
      expect(isRetryableAIError(new AIAPIError("", { statusCode: 500 }))).toBe(true)
    })

    test("returns false for non-retryable AI errors", () => {
      expect(isRetryableAIError(new AIModelError(""))).toBe(false)
      expect(isRetryableAIError(new AIContextLimitError(""))).toBe(false)
      expect(isRetryableAIError(new AICancelledError())).toBe(false)
    })

    test("returns false for non-AI errors", () => {
      expect(isRetryableAIError(new Error("Regular"))).toBe(false)
      expect(isRetryableAIError(null)).toBe(false)
    })
  })

  describe("toAIError", () => {
    test("returns same error if already AIError", () => {
      const original = new AIRateLimitError("Test")
      expect(toAIError(original)).toBe(original)
    })

    test("converts rate limit messages", () => {
      const error = toAIError(new Error("Rate limit exceeded"))
      expect(error).toBeInstanceOf(AIRateLimitError)
    })

    test("converts 429 errors", () => {
      const error = toAIError(new Error("Error 429: Too many requests"))
      expect(error).toBeInstanceOf(AIRateLimitError)
    })

    test("converts authentication errors", () => {
      const error = toAIError(new Error("Unauthorized - invalid API key"))
      expect(error).toBeInstanceOf(AIAuthenticationError)
    })

    test("converts 401 errors", () => {
      const error = toAIError(new Error("401 Unauthorized"))
      expect(error).toBeInstanceOf(AIAuthenticationError)
    })

    test("converts content filter errors", () => {
      const error = toAIError(new Error("Content blocked by filter"))
      expect(error).toBeInstanceOf(AIContentFilterError)
    })

    test("converts token limit errors", () => {
      const error = toAIError(new Error("Token limit exceeded"))
      expect(error).toBeInstanceOf(AIContextLimitError)
    })

    test("converts unknown errors to AIAPIError", () => {
      const error = toAIError(new Error("Unknown error"))
      expect(error).toBeInstanceOf(AIAPIError)
    })

    test("includes context in converted errors", () => {
      const error = toAIError(new Error("Rate limit exceeded"), {
        provider: "google",
        model: "gemini-pro",
      })

      expect(error.provider).toBe("google")
      expect(error.model).toBe("gemini-pro")
    })

    test("handles non-Error values", () => {
      expect(toAIError("string error")).toBeInstanceOf(AIAPIError)
      expect(toAIError(123)).toBeInstanceOf(AIAPIError)
      expect(toAIError({ message: "object" })).toBeInstanceOf(AIAPIError)
    })

    test("marks network errors as retryable", () => {
      const error = toAIError(new Error("Network timeout"))
      expect(error.isRetryable).toBe(true)
    })
  })
})
