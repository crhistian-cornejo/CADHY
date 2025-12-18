/**
 * Rate Limiter Tests
 *
 * Tests for the sliding window rate limiter implementation.
 */

import { beforeEach, describe, expect, test } from "bun:test"
import {
  checkRateLimit,
  clearAllRateLimits,
  peekRateLimit,
  RATE_LIMIT_PRESETS,
  type RateLimitConfig,
  RateLimitError,
  resetRateLimit,
  withRateLimit,
} from "../middleware/rate-limiter"

describe("Rate Limiter", () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits()
  })

  describe("checkRateLimit", () => {
    test("allows requests under the limit", () => {
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowMs: 60000,
        identifier: "test-under-limit",
      }

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(config)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(4 - i)
        expect(result.limit).toBe(5)
      }
    })

    test("blocks requests over the limit", () => {
      const config: RateLimitConfig = {
        maxRequests: 3,
        windowMs: 60000,
        identifier: "test-over-limit",
      }

      // Use up all requests
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(config)
        expect(result.success).toBe(true)
      }

      // Next request should be blocked
      const blockedResult = checkRateLimit(config)
      expect(blockedResult.success).toBe(false)
      expect(blockedResult.remaining).toBe(0)
      expect(blockedResult.resetInMs).toBeGreaterThan(0)
    })

    test("uses default identifier when not specified", () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 60000,
      }

      const result1 = checkRateLimit(config)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(1)

      const result2 = checkRateLimit(config)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(0)
    })

    test("different identifiers have separate limits", () => {
      const configA: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 60000,
        identifier: "bucket-a",
      }
      const configB: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 60000,
        identifier: "bucket-b",
      }

      // Use up bucket A
      const resultA1 = checkRateLimit(configA)
      expect(resultA1.success).toBe(true)

      const resultA2 = checkRateLimit(configA)
      expect(resultA2.success).toBe(false)

      // Bucket B should still have capacity
      const resultB1 = checkRateLimit(configB)
      expect(resultB1.success).toBe(true)
    })
  })

  describe("peekRateLimit", () => {
    test("does not consume a token", () => {
      const config: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 60000,
        identifier: "test-peek",
      }

      // Peek multiple times
      for (let i = 0; i < 5; i++) {
        const result = peekRateLimit(config)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(2)
      }

      // Now actually consume one
      checkRateLimit(config)

      // Peek should show 1 remaining
      const afterConsume = peekRateLimit(config)
      expect(afterConsume.remaining).toBe(1)
    })

    test("returns correct status when bucket is empty", () => {
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 60000,
        identifier: "test-peek-empty",
      }

      // Use up the limit
      checkRateLimit(config)

      // Peek should show blocked
      const result = peekRateLimit(config)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    test("returns full capacity for new bucket", () => {
      const config: RateLimitConfig = {
        maxRequests: 10,
        windowMs: 60000,
        identifier: "test-peek-new",
      }

      const result = peekRateLimit(config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(10)
    })
  })

  describe("resetRateLimit", () => {
    test("resets a specific bucket", () => {
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 60000,
        identifier: "test-reset",
      }

      // Use up the limit
      checkRateLimit(config)
      expect(checkRateLimit(config).success).toBe(false)

      // Reset
      resetRateLimit("test-reset")

      // Should be allowed again
      expect(checkRateLimit(config).success).toBe(true)
    })

    test("does not affect other buckets", () => {
      const configA: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 60000,
        identifier: "bucket-reset-a",
      }
      const configB: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 60000,
        identifier: "bucket-reset-b",
      }

      // Use up both buckets
      checkRateLimit(configA)
      checkRateLimit(configB)

      // Reset only A
      resetRateLimit("bucket-reset-a")

      // A should be allowed, B should still be blocked
      expect(checkRateLimit(configA).success).toBe(true)
      expect(checkRateLimit(configB).success).toBe(false)
    })
  })

  describe("clearAllRateLimits", () => {
    test("clears all buckets", () => {
      const configs = [
        { maxRequests: 1, windowMs: 60000, identifier: "clear-1" },
        { maxRequests: 1, windowMs: 60000, identifier: "clear-2" },
        { maxRequests: 1, windowMs: 60000, identifier: "clear-3" },
      ]

      // Use up all buckets
      configs.forEach((config) => {
        checkRateLimit(config)
        expect(checkRateLimit(config).success).toBe(false)
      })

      // Clear all
      clearAllRateLimits()

      // All should be allowed again
      configs.forEach((config) => {
        expect(checkRateLimit(config).success).toBe(true)
      })
    })
  })

  describe("RateLimitError", () => {
    test("creates error with correct properties", () => {
      const result = {
        success: false,
        remaining: 0,
        resetInMs: 30000,
        limit: 10,
      }

      const error = new RateLimitError("Rate limit exceeded", result)

      expect(error.name).toBe("RateLimitError")
      expect(error.message).toBe("Rate limit exceeded")
      expect(error.remaining).toBe(0)
      expect(error.resetInMs).toBe(30000)
      expect(error.limit).toBe(10)
    })

    test("calculates resetInSeconds correctly", () => {
      const error = new RateLimitError("Test", {
        success: false,
        remaining: 0,
        resetInMs: 45000,
        limit: 5,
      })

      expect(error.resetInSeconds).toBe(45)
    })
  })

  describe("withRateLimit", () => {
    test("allows function execution when under limit", async () => {
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowMs: 60000,
        identifier: "test-hof",
      }

      const fn = async (x: number) => x * 2
      const rateLimitedFn = withRateLimit(fn, config)

      const result = await rateLimitedFn(5)
      expect(result).toBe(10)
    })

    test("throws RateLimitError when limit exceeded", async () => {
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 60000,
        identifier: "test-hof-blocked",
      }

      const fn = async () => "success"
      const rateLimitedFn = withRateLimit(fn, config)

      // First call succeeds
      await rateLimitedFn()

      // Second call should throw
      try {
        await rateLimitedFn()
        expect.unreachable("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError)
        if (error instanceof RateLimitError) {
          expect(error.remaining).toBe(0)
        }
      }
    })

    test("preserves function arguments", async () => {
      const config: RateLimitConfig = {
        maxRequests: 10,
        windowMs: 60000,
        identifier: "test-args",
      }

      const fn = async (a: string, b: number, c: boolean) => ({ a, b, c })
      const rateLimitedFn = withRateLimit(fn, config)

      const result = await rateLimitedFn("hello", 42, true)
      expect(result).toEqual({ a: "hello", b: 42, c: true })
    })
  })

  describe("RATE_LIMIT_PRESETS", () => {
    test("chat preset has expected values", () => {
      expect(RATE_LIMIT_PRESETS.chat.maxRequests).toBe(20)
      expect(RATE_LIMIT_PRESETS.chat.windowMs).toBe(60000)
      expect(RATE_LIMIT_PRESETS.chat.identifier).toBe("chat")
    })

    test("streaming preset has expected values", () => {
      expect(RATE_LIMIT_PRESETS.streaming.maxRequests).toBe(10)
      expect(RATE_LIMIT_PRESETS.streaming.windowMs).toBe(60000)
    })

    test("toolCalls preset has expected values", () => {
      expect(RATE_LIMIT_PRESETS.toolCalls.maxRequests).toBe(30)
    })

    test("analysis preset has expected values", () => {
      expect(RATE_LIMIT_PRESETS.analysis.maxRequests).toBe(5)
    })

    test("burst preset has expected values", () => {
      expect(RATE_LIMIT_PRESETS.burst.maxRequests).toBe(100)
    })
  })
})
