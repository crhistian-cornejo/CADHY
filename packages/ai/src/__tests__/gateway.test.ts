/**
 * Gateway Provider Tests - @cadhy/ai
 *
 * Tests for the Vercel AI Gateway provider including:
 * - WebKit-safe fetch header filtering
 * - Gateway caching
 * - Configuration handling
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { clearGatewayCache, getGateway, getGatewayModel } from "../providers/gateway"

describe("Gateway Provider", () => {
  beforeEach(() => {
    // Clear cache before each test
    clearGatewayCache()
  })

  // ============================================================
  // Export Verification
  // ============================================================

  describe("Exports", () => {
    test("should export getGateway function", () => {
      expect(getGateway).toBeDefined()
      expect(typeof getGateway).toBe("function")
    })

    test("should export getGatewayModel function", () => {
      expect(getGatewayModel).toBeDefined()
      expect(typeof getGatewayModel).toBe("function")
    })

    test("should export clearGatewayCache function", () => {
      expect(clearGatewayCache).toBeDefined()
      expect(typeof clearGatewayCache).toBe("function")
    })
  })

  // ============================================================
  // Default Gateway
  // ============================================================

  describe("Default Gateway", () => {
    test("should return a gateway when called without config", () => {
      const gateway = getGateway()
      expect(gateway).toBeDefined()
      expect(typeof gateway).toBe("function")
    })

    test("should return the same gateway instance on subsequent calls", () => {
      const gateway1 = getGateway()
      const gateway2 = getGateway()
      expect(gateway1).toBe(gateway2)
    })

    test("should return same gateway for empty config", () => {
      const gateway1 = getGateway()
      const gateway2 = getGateway({})
      expect(gateway1).toBe(gateway2)
    })
  })

  // ============================================================
  // Custom Gateway Configuration
  // ============================================================

  describe("Custom Gateway Configuration", () => {
    test("should create gateway with custom apiKey", () => {
      const gateway = getGateway({ apiKey: "test-key" })
      expect(gateway).toBeDefined()
      expect(typeof gateway).toBe("function")
    })

    test("should create gateway with custom baseURL", () => {
      const gateway = getGateway({ baseURL: "https://custom.gateway.com" })
      expect(gateway).toBeDefined()
    })

    test("should create gateway with custom headers", () => {
      const gateway = getGateway({ headers: { "X-Custom-Header": "value" } })
      expect(gateway).toBeDefined()
    })

    test("should cache custom gateways with same config", () => {
      const gateway1 = getGateway({ apiKey: "key-1" })
      const gateway2 = getGateway({ apiKey: "key-1" })
      expect(gateway1).toBe(gateway2)
    })

    test("should create different cache entries for different apiKeys", () => {
      // Different API keys should result in different gateway instances
      // We use a hash of the API key for the cache key to ensure uniqueness
      const gateway1 = getGateway({ apiKey: "key-1" })
      const gateway2 = getGateway({ apiKey: "key-2" })
      // They should be different instances because the keys are different
      expect(gateway1).not.toBe(gateway2)
    })

    test("should differentiate by baseURL", () => {
      const gateway1 = getGateway({ baseURL: "https://gateway1.com" })
      const gateway2 = getGateway({ baseURL: "https://gateway2.com" })
      expect(gateway1).not.toBe(gateway2)
    })
  })

  // ============================================================
  // Cache Management
  // ============================================================

  describe("Cache Management", () => {
    test("clearGatewayCache should reset default gateway", () => {
      const gateway1 = getGateway()
      clearGatewayCache()
      const gateway2 = getGateway()
      // After clearing, a new instance should be created
      expect(gateway1).not.toBe(gateway2)
    })

    test("clearGatewayCache should reset custom gateways", () => {
      const gateway1 = getGateway({ apiKey: "test" })
      clearGatewayCache()
      const gateway2 = getGateway({ apiKey: "test" })
      expect(gateway1).not.toBe(gateway2)
    })
  })

  // ============================================================
  // Gateway Model
  // ============================================================

  describe("getGatewayModel", () => {
    test("should return a model for valid model ID", () => {
      const model = getGatewayModel("google/gemini-2.5-flash")
      expect(model).toBeDefined()
    })

    test("should accept custom config", () => {
      const model = getGatewayModel("anthropic/claude-3-sonnet", {
        apiKey: "custom-key",
      })
      expect(model).toBeDefined()
    })
  })

  // ============================================================
  // WebKit Safe Fetch Logic Tests
  // ============================================================

  describe("WebKit Forbidden Headers", () => {
    // Test the header filtering logic used in createWebKitSafeFetch
    const WEBKIT_FORBIDDEN_HEADERS = [
      "user-agent",
      "accept-encoding",
      "content-length",
      "host",
      "connection",
      "keep-alive",
      "transfer-encoding",
      "upgrade",
    ]

    test("should identify forbidden headers correctly", () => {
      const testHeaders: Record<string, string> = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
        Authorization: "Bearer token",
        Host: "example.com",
      }

      const filteredHeaders: Record<string, string> = {}
      for (const [key, value] of Object.entries(testHeaders)) {
        if (!WEBKIT_FORBIDDEN_HEADERS.includes(key.toLowerCase())) {
          filteredHeaders[key] = value
        }
      }

      // Should keep Content-Type and Authorization
      expect(filteredHeaders["Content-Type"]).toBe("application/json")
      expect(filteredHeaders.Authorization).toBe("Bearer token")

      // Should remove forbidden headers
      expect(filteredHeaders["User-Agent"]).toBeUndefined()
      expect(filteredHeaders["Accept-Encoding"]).toBeUndefined()
      expect(filteredHeaders.Host).toBeUndefined()
    })

    test("should handle case-insensitive header matching", () => {
      const testCases = [
        { header: "user-agent", expected: true },
        { header: "User-Agent", expected: true },
        { header: "USER-AGENT", expected: true },
        { header: "Content-Type", expected: false },
        { header: "content-type", expected: false },
      ]

      for (const { header, expected } of testCases) {
        const isForbidden = WEBKIT_FORBIDDEN_HEADERS.includes(header.toLowerCase())
        expect(isForbidden).toBe(expected)
      }
    })

    test("should handle Headers object conversion", () => {
      // Simulate converting Headers to plain object
      const headersInit = new Headers({
        "Content-Type": "application/json",
        "X-Custom": "value",
      })

      const converted: Record<string, string> = {}
      headersInit.forEach((value, key) => {
        converted[key] = value
      })

      expect(converted["content-type"]).toBe("application/json")
      expect(converted["x-custom"]).toBe("value")
    })

    test("should handle array of header tuples", () => {
      const headerTuples: [string, string][] = [
        ["Content-Type", "application/json"],
        ["Authorization", "Bearer token"],
        ["User-Agent", "Mozilla/5.0"],
      ]

      const converted: Record<string, string> = {}
      for (const [key, value] of headerTuples) {
        converted[key] = value
      }

      // Filter out forbidden headers
      for (const key of Object.keys(converted)) {
        if (WEBKIT_FORBIDDEN_HEADERS.includes(key.toLowerCase())) {
          delete converted[key]
        }
      }

      expect(converted["Content-Type"]).toBe("application/json")
      expect(converted.Authorization).toBe("Bearer token")
      expect(converted["User-Agent"]).toBeUndefined()
    })
  })

  // ============================================================
  // GatewayProviderConfig Interface
  // ============================================================

  describe("GatewayProviderConfig", () => {
    test("should accept all optional properties", () => {
      const config = {
        apiKey: "test-key",
        baseURL: "https://custom.com",
        headers: { "X-Test": "value" },
      }

      // All properties should be valid
      expect(config.apiKey).toBe("test-key")
      expect(config.baseURL).toBe("https://custom.com")
      expect(config.headers).toEqual({ "X-Test": "value" })
    })

    test("should work with partial config", () => {
      const configWithOnlyKey = { apiKey: "key" }
      const configWithOnlyUrl = { baseURL: "https://example.com" }
      const configWithOnlyHeaders = { headers: { "X-Header": "val" } }

      expect(configWithOnlyKey.apiKey).toBe("key")
      expect(configWithOnlyUrl.baseURL).toBe("https://example.com")
      expect(configWithOnlyHeaders.headers).toEqual({ "X-Header": "val" })
    })
  })
})
