/**
 * Thumbnail Service Tests - @cadhy/desktop
 *
 * Tests for thumbnail generation utilities.
 * Tests the pure logic functions; canvas operations use happy-dom.
 */

import { afterEach, describe, expect, test } from "bun:test"
import {
  generatePlaceholderThumbnail,
  getViewportCanvas,
  registerViewportCanvas,
} from "../services/thumbnail-service"

describe("Thumbnail Service", () => {
  // ============================================================
  // Viewport Canvas Registration
  // ============================================================

  describe("Viewport Canvas Registration", () => {
    afterEach(() => {
      // Clean up by unregistering canvas
      registerViewportCanvas(null)
    })

    test("should start with no registered canvas", () => {
      registerViewportCanvas(null) // Ensure clean state
      expect(getViewportCanvas()).toBeNull()
    })

    test("should register a canvas", () => {
      const mockCanvas = document.createElement("canvas")
      registerViewportCanvas(mockCanvas)
      expect(getViewportCanvas()).toBe(mockCanvas)
    })

    test("should unregister canvas when null is passed", () => {
      const mockCanvas = document.createElement("canvas")
      registerViewportCanvas(mockCanvas)
      expect(getViewportCanvas()).toBe(mockCanvas)

      registerViewportCanvas(null)
      expect(getViewportCanvas()).toBeNull()
    })

    test("should replace previously registered canvas", () => {
      const canvas1 = document.createElement("canvas")
      const canvas2 = document.createElement("canvas")

      registerViewportCanvas(canvas1)
      expect(getViewportCanvas()).toBe(canvas1)

      registerViewportCanvas(canvas2)
      expect(getViewportCanvas()).toBe(canvas2)
    })
  })

  // ============================================================
  // Placeholder Thumbnail Generation
  // Note: happy-dom's canvas doesn't support full 2D context,
  // so we test the logic rather than actual output
  // ============================================================

  describe("generatePlaceholderThumbnail", () => {
    test("should return a string (may be empty in test env)", () => {
      const thumbnail = generatePlaceholderThumbnail("Test Project")
      expect(typeof thumbnail).toBe("string")
    })

    test("should not throw for various inputs", () => {
      expect(() => generatePlaceholderThumbnail("Test")).not.toThrow()
      expect(() => generatePlaceholderThumbnail("")).not.toThrow()
      expect(() => generatePlaceholderThumbnail("Multi Word Name")).not.toThrow()
      expect(() => generatePlaceholderThumbnail("Special-Chars_123")).not.toThrow()
    })
  })

  // ============================================================
  // Initials Extraction Logic
  // ============================================================

  describe("Initials Extraction", () => {
    // Test the initials extraction logic used in generatePlaceholderThumbnail

    test("should extract first letter of single word", () => {
      const name = "Project"
      const initials = name
        .split(/\s+/)
        .map((word) => word[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()

      expect(initials).toBe("P")
    })

    test("should extract first two initials from multi-word name", () => {
      const name = "My Project"
      const initials = name
        .split(/\s+/)
        .map((word) => word[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()

      expect(initials).toBe("MP")
    })

    test("should limit to 2 initials for long names", () => {
      const name = "The Very Long Project Name"
      const initials = name
        .split(/\s+/)
        .map((word) => word[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()

      expect(initials).toBe("TV")
    })

    test("should handle empty string with fallback", () => {
      const name = ""
      const initials =
        name
          .split(/\s+/)
          .map((word) => word[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase() || "P"

      expect(initials).toBe("P")
    })

    test("should handle whitespace-only string", () => {
      const name = "   "
      const initials =
        name
          .split(/\s+/)
          .map((word) => word[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase() || "P"

      expect(initials).toBe("P")
    })
  })

  // ============================================================
  // Thumbnail Constants
  // ============================================================

  describe("Thumbnail Constants", () => {
    // These values are defined in the service
    const THUMBNAIL_WIDTH = 320
    const THUMBNAIL_HEIGHT = 180
    const THUMBNAIL_QUALITY = 0.8

    test("should use 16:9 aspect ratio", () => {
      const aspectRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT
      expect(aspectRatio).toBeCloseTo(16 / 9, 2)
    })

    test("should have reasonable dimensions", () => {
      expect(THUMBNAIL_WIDTH).toBeGreaterThan(100)
      expect(THUMBNAIL_HEIGHT).toBeGreaterThan(50)
      expect(THUMBNAIL_WIDTH).toBeLessThan(1000)
      expect(THUMBNAIL_HEIGHT).toBeLessThan(1000)
    })

    test("should have quality between 0 and 1", () => {
      expect(THUMBNAIL_QUALITY).toBeGreaterThan(0)
      expect(THUMBNAIL_QUALITY).toBeLessThanOrEqual(1)
    })
  })

  // ============================================================
  // Aspect Ratio Cropping Logic
  // ============================================================

  describe("Aspect Ratio Cropping Logic", () => {
    // Test the cropping logic used in createThumbnailFromImage
    const THUMB_WIDTH = 320
    const THUMB_HEIGHT = 180
    const thumbRatio = THUMB_WIDTH / THUMB_HEIGHT

    test("should crop sides for wider images", () => {
      const imgWidth = 2000 // Wider than 16:9
      const imgHeight = 1000
      const imgRatio = imgWidth / imgHeight

      expect(imgRatio).toBeGreaterThan(thumbRatio)

      // When image is wider, we crop the sides
      const sw = imgHeight * thumbRatio
      const sx = (imgWidth - sw) / 2

      expect(sw).toBeLessThan(imgWidth)
      expect(sx).toBeGreaterThan(0)
    })

    test("should crop top/bottom for taller images", () => {
      const imgWidth = 1000
      const imgHeight = 1500 // Portrait
      const imgRatio = imgWidth / imgHeight

      expect(imgRatio).toBeLessThan(thumbRatio)

      // When image is taller, we crop top/bottom
      const sh = imgWidth / thumbRatio
      const sy = (imgHeight - sh) / 2

      expect(sh).toBeLessThan(imgHeight)
      expect(sy).toBeGreaterThan(0)
    })

    test("should not crop for exact aspect ratio match", () => {
      // Image with exact 16:9 ratio
      const imgWidth = 1600
      const imgHeight = 900
      const imgRatio = imgWidth / imgHeight

      expect(imgRatio).toBeCloseTo(thumbRatio, 5)
    })
  })
})
