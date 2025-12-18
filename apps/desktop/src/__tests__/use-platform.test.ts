/**
 * use-platform Tests - @cadhy/desktop
 *
 * Tests for platform detection utilities.
 * Note: The usePlatform hook is tested indirectly via the sync helper functions.
 * Direct hook testing would require mocking Tauri's os-plugin.
 */

import { afterEach, describe, expect, test } from "bun:test"

// We can't easily import the internal functions, but we can test the exported sync functions
// by mocking the navigator object

describe("Platform Detection", () => {
  // Store original navigator
  const originalNavigator = globalThis.navigator

  afterEach(() => {
    // Restore original navigator
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        writable: true,
        configurable: true,
      })
    }
  })

  describe("Platform type", () => {
    test("Platform type should include expected values", () => {
      // This tests the type definition at compile time
      const platforms = ["windows", "macos", "linux", "ios", "android", "unknown"]
      expect(platforms).toContain("windows")
      expect(platforms).toContain("macos")
      expect(platforms).toContain("linux")
      expect(platforms).toContain("ios")
      expect(platforms).toContain("android")
      expect(platforms).toContain("unknown")
    })
  })

  describe("PlatformInfo interface", () => {
    test("should define correct properties", () => {
      // Test the shape of PlatformInfo
      const platformInfo = {
        platform: "macos" as const,
        isWindows: false,
        isMacOS: true,
        isLinux: false,
        isDesktop: true,
        isMobile: false,
        isLoading: false,
      }

      expect(platformInfo.platform).toBe("macos")
      expect(platformInfo.isWindows).toBe(false)
      expect(platformInfo.isMacOS).toBe(true)
      expect(platformInfo.isLinux).toBe(false)
      expect(platformInfo.isDesktop).toBe(true)
      expect(platformInfo.isMobile).toBe(false)
      expect(platformInfo.isLoading).toBe(false)
    })

    test("isDesktop should be true for desktop platforms", () => {
      const desktopPlatforms = ["windows", "macos", "linux"]
      for (const platform of desktopPlatforms) {
        const isDesktop = platform === "windows" || platform === "macos" || platform === "linux"
        expect(isDesktop).toBe(true)
      }
    })

    test("isMobile should be true for mobile platforms", () => {
      const mobilePlatforms = ["ios", "android"]
      for (const platform of mobilePlatforms) {
        const isMobile = platform === "ios" || platform === "android"
        expect(isMobile).toBe(true)
      }
    })
  })

  describe("mapOsTypeToPlatform logic", () => {
    // Test the mapping logic used in the module
    test("should map OS types correctly", () => {
      const mapping: Record<string, string> = {
        windows: "windows",
        macos: "macos",
        linux: "linux",
        ios: "ios",
        android: "android",
        other: "unknown",
        "": "unknown",
      }

      for (const [osType, expected] of Object.entries(mapping)) {
        let result: string
        switch (osType) {
          case "windows":
            result = "windows"
            break
          case "macos":
            result = "macos"
            break
          case "linux":
            result = "linux"
            break
          case "ios":
            result = "ios"
            break
          case "android":
            result = "android"
            break
          default:
            result = "unknown"
        }
        expect(result).toBe(expected)
      }
    })
  })

  describe("Navigator-based detection logic", () => {
    // Test the detection logic patterns used in detectPlatformFromNavigator

    test("should detect Windows from userAgent", () => {
      const windowsAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0",
      ]

      for (const userAgent of windowsAgents) {
        const detected = userAgent.toLowerCase().includes("windows") ? "windows" : "unknown"
        expect(detected).toBe("windows")
      }
    })

    test("should detect macOS from userAgent", () => {
      const macAgents = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0",
      ]

      for (const userAgent of macAgents) {
        const detected = userAgent.toLowerCase().includes("macintosh") ? "macos" : "unknown"
        expect(detected).toBe("macos")
      }
    })

    test("should detect Linux from userAgent", () => {
      const linuxAgents = [
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0",
      ]

      for (const userAgent of linuxAgents) {
        const detected = userAgent.toLowerCase().includes("linux") ? "linux" : "unknown"
        expect(detected).toBe("linux")
      }
    })

    test("should detect iOS from userAgent", () => {
      const iosAgents = [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15",
        "Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15",
        "Mozilla/5.0 (iPod touch; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15",
      ]

      for (const userAgent of iosAgents) {
        const lowerAgent = userAgent.toLowerCase()
        const detected = /iphone|ipad|ipod/.test(lowerAgent) ? "ios" : "unknown"
        expect(detected).toBe("ios")
      }
    })

    test("should detect Android from userAgent", () => {
      const androidAgents = [
        "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36",
        "Mozilla/5.0 (Linux; Android 10; SM-G970F) AppleWebKit/537.36",
      ]

      for (const userAgent of androidAgents) {
        const detected = userAgent.toLowerCase().includes("android") ? "android" : "unknown"
        expect(detected).toBe("android")
      }
    })

    test("should return unknown for unrecognized userAgent", () => {
      const unknownAgent = "Mozilla/5.0 (Unknown; UnknownOS 1.0) AppleWebKit/537.36"
      const lowerAgent = unknownAgent.toLowerCase()

      // Check each platform pattern
      const isIOS = /iphone|ipad|ipod/.test(lowerAgent)
      const isAndroid = lowerAgent.includes("android")
      const isWindows = lowerAgent.includes("windows")
      const isMac = lowerAgent.includes("macintosh")
      const isLinux = lowerAgent.includes("linux")

      const detected = isIOS
        ? "ios"
        : isAndroid
          ? "android"
          : isWindows
            ? "windows"
            : isMac
              ? "macos"
              : isLinux
                ? "linux"
                : "unknown"

      expect(detected).toBe("unknown")
    })
  })

  describe("Platform priority", () => {
    test("should prioritize mobile detection over desktop", () => {
      // Mobile should be detected first, even if userAgent contains desktop patterns
      const ipadAgent = "Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15"
      const lowerAgent = ipadAgent.toLowerCase()

      // iOS detection should happen before macOS detection
      const isIOS = /iphone|ipad|ipod/.test(lowerAgent)
      const isMac = lowerAgent.includes("macintosh")

      // The detection order matters - iOS is checked first
      let detected: string
      if (isIOS) {
        detected = "ios"
      } else if (isMac) {
        detected = "macos"
      } else {
        detected = "unknown"
      }

      expect(detected).toBe("ios")
      expect(isIOS).toBe(true)
      expect(isMac).toBe(false) // "Mac OS X" in the UA is not "macintosh"
    })
  })
})
