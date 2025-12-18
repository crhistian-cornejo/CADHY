/**
 * Retry Middleware Tests
 *
 * Tests for exponential backoff retry logic.
 */

import { describe, expect, mock, test } from "bun:test"
import {
  createRetryWrapper,
  defaultIsRetryable,
  parseRetryAfter,
  RetryExhaustedError,
  withRetry,
} from "../middleware/retry"

describe("Retry Middleware", () => {
  describe("defaultIsRetryable", () => {
    test("returns true for network errors", () => {
      expect(defaultIsRetryable(new Error("Network error"))).toBe(true)
      expect(defaultIsRetryable(new Error("ECONNREFUSED"))).toBe(true)
      expect(defaultIsRetryable(new Error("ECONNRESET"))).toBe(true)
      expect(defaultIsRetryable(new Error("socket hang up"))).toBe(true)
      expect(defaultIsRetryable(new Error("Request timeout"))).toBe(true)
    })

    test("returns true for rate limit errors", () => {
      expect(defaultIsRetryable(new Error("Rate limit exceeded"))).toBe(true)
      expect(defaultIsRetryable(new Error("Too many requests"))).toBe(true)
      expect(defaultIsRetryable(new Error("Error 429"))).toBe(true)
    })

    test("returns true for server errors (5xx)", () => {
      expect(defaultIsRetryable(new Error("500 Internal Server Error"))).toBe(true)
      expect(defaultIsRetryable(new Error("502 Bad Gateway"))).toBe(true)
      expect(defaultIsRetryable(new Error("503 Service Unavailable"))).toBe(true)
      expect(defaultIsRetryable(new Error("504 Gateway Timeout"))).toBe(true)
    })

    test("returns false for client errors (4xx)", () => {
      expect(defaultIsRetryable(new Error("400 Bad Request"))).toBe(false)
      expect(defaultIsRetryable(new Error("401 Unauthorized"))).toBe(false)
      expect(defaultIsRetryable(new Error("403 Forbidden"))).toBe(false)
      expect(defaultIsRetryable(new Error("404 Not Found"))).toBe(false)
    })

    test("returns true for TooManyRequestsError", () => {
      const error = new Error("Rate limited")
      error.name = "TooManyRequestsError"
      expect(defaultIsRetryable(error)).toBe(true)
    })

    test("respects isRetryable property on error", () => {
      const retryableError = Object.assign(new Error("Custom"), { isRetryable: true })
      const nonRetryableError = Object.assign(new Error("Custom"), { isRetryable: false })

      expect(defaultIsRetryable(retryableError)).toBe(true)
      expect(defaultIsRetryable(nonRetryableError)).toBe(false)
    })

    test("handles Response objects", () => {
      expect(defaultIsRetryable(new Response(null, { status: 500 }))).toBe(true)
      expect(defaultIsRetryable(new Response(null, { status: 429 }))).toBe(true)
      expect(defaultIsRetryable(new Response(null, { status: 400 }))).toBe(false)
      expect(defaultIsRetryable(new Response(null, { status: 200 }))).toBe(false)
    })

    test("handles objects with statusCode", () => {
      expect(defaultIsRetryable({ statusCode: 500 })).toBe(true)
      expect(defaultIsRetryable({ statusCode: 429 })).toBe(true)
      expect(defaultIsRetryable({ statusCode: 400 })).toBe(false)
    })

    test("returns false for non-errors", () => {
      expect(defaultIsRetryable(null)).toBe(false)
      expect(defaultIsRetryable(undefined)).toBe(false)
      expect(defaultIsRetryable("string error")).toBe(false)
      expect(defaultIsRetryable(123)).toBe(false)
    })
  })

  describe("withRetry", () => {
    test("returns result on first success", async () => {
      const fn = mock(() => Promise.resolve("success"))

      const result = await withRetry(fn)

      expect(result).toBe("success")
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test("retries on retryable error and succeeds", async () => {
      let attempts = 0
      const fn = mock(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error("Network error"))
        }
        return Promise.resolve("success after retry")
      })

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        jitter: false,
      })

      expect(result).toBe("success after retry")
      expect(fn).toHaveBeenCalledTimes(3)
    })

    test("throws immediately on non-retryable error", async () => {
      const fn = mock(() => Promise.reject(new Error("400 Bad Request")))

      await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow("400 Bad Request")
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test("throws after exhausting retries", async () => {
      const fn = mock(() => Promise.reject(new Error("Network error")))

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          initialDelayMs: 10,
          jitter: false,
        })
      ).rejects.toThrow("Network error")

      expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
    })

    test("calls onRetry callback", async () => {
      let retryCallCount = 0
      const onRetry = mock((attempt: number, _error: unknown, delayMs: number) => {
        retryCallCount++
        expect(attempt).toBe(retryCallCount)
        expect(delayMs).toBeGreaterThan(0)
      })

      let attempts = 0
      const fn = () => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error("Network error"))
        }
        return Promise.resolve("success")
      }

      await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        jitter: false,
        onRetry,
      })

      expect(onRetry).toHaveBeenCalledTimes(2)
    })

    test("uses custom isRetryable function", async () => {
      const customIsRetryable = (error: unknown) => {
        return error instanceof Error && error.message === "retry me"
      }

      const fn = mock(() => Promise.reject(new Error("retry me")))

      await expect(
        withRetry(fn, {
          maxRetries: 1,
          initialDelayMs: 10,
          isRetryable: customIsRetryable,
        })
      ).rejects.toThrow("retry me")

      expect(fn).toHaveBeenCalledTimes(2) // 1 initial + 1 retry
    })

    test("does not retry with custom isRetryable returning false", async () => {
      const customIsRetryable = () => false

      const fn = mock(() => Promise.reject(new Error("any error")))

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          isRetryable: customIsRetryable,
        })
      ).rejects.toThrow()

      expect(fn).toHaveBeenCalledTimes(1)
    })

    test("respects maxDelayMs cap", async () => {
      const delays: number[] = []
      const onRetry = (_attempt: number, _error: unknown, delayMs: number) => {
        delays.push(delayMs)
      }

      const fn = mock(() => Promise.reject(new Error("Network error")))

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          initialDelayMs: 100,
          maxDelayMs: 200,
          backoffMultiplier: 10,
          jitter: false,
          onRetry,
        })
      ).rejects.toThrow()

      // All delays should be capped at maxDelayMs
      expect(delays.every((d) => d <= 200)).toBe(true)
    })
  })

  describe("createRetryWrapper", () => {
    test("creates reusable retry wrapper", async () => {
      const retryable = createRetryWrapper({
        maxRetries: 2,
        initialDelayMs: 10,
        jitter: false,
      })

      const result = await retryable(() => Promise.resolve("wrapped"))
      expect(result).toBe("wrapped")
    })

    test("wrapper applies config to all calls", async () => {
      let callCount = 0
      const retryable = createRetryWrapper({
        maxRetries: 2,
        initialDelayMs: 10,
        jitter: false,
      })

      const fn = () => {
        callCount++
        if (callCount < 2) {
          return Promise.reject(new Error("Network error"))
        }
        return Promise.resolve("success")
      }

      const result = await retryable(fn)
      expect(result).toBe("success")
      expect(callCount).toBe(2)
    })
  })

  describe("parseRetryAfter", () => {
    test("parses numeric seconds", () => {
      const headers = new Headers({ "retry-after": "30" })
      expect(parseRetryAfter(headers)).toBe(30000)
    })

    test("parses from Response object", () => {
      const response = new Response(null, {
        headers: { "retry-after": "60" },
      })
      expect(parseRetryAfter(response)).toBe(60000)
    })

    test("parses from plain object", () => {
      expect(parseRetryAfter({ "retry-after": "10" })).toBe(10000)
      expect(parseRetryAfter({ "Retry-After": "20" })).toBe(20000)
    })

    test("parses HTTP date format", () => {
      const futureDate = new Date(Date.now() + 5000)
      const headers = new Headers({
        "retry-after": futureDate.toUTCString(),
      })
      const result = parseRetryAfter(headers)
      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThan(0)
      expect(result!).toBeLessThanOrEqual(5100) // Allow some tolerance
    })

    test("returns null when header is missing", () => {
      expect(parseRetryAfter(new Headers())).toBeNull()
      expect(parseRetryAfter({})).toBeNull()
    })

    test("returns null for invalid values", () => {
      expect(parseRetryAfter({ "retry-after": "invalid" })).toBeNull()
    })

    test("returns 0 for past dates", () => {
      const pastDate = new Date(Date.now() - 10000)
      const headers = new Headers({
        "retry-after": pastDate.toUTCString(),
      })
      expect(parseRetryAfter(headers)).toBe(0)
    })
  })

  describe("RetryExhaustedError", () => {
    test("creates error with correct properties", () => {
      const lastError = new Error("Original error")
      const error = new RetryExhaustedError("Retries exhausted", 3, lastError)

      expect(error.name).toBe("RetryExhaustedError")
      expect(error.message).toBe("Retries exhausted")
      expect(error.attempts).toBe(3)
      expect(error.lastError).toBe(lastError)
    })
  })
})
