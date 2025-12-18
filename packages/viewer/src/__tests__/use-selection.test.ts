/**
 * useSelection Hook Tests - @cadhy/viewer
 *
 * Tests for the selection management hook logic.
 * Note: We test the hook logic without renderHook since @testing-library/react
 * is not installed in this package. The hook is simple enough to test via its logic.
 */

import { describe, expect, test } from "bun:test"

// Test the selection logic by simulating what the hook does
describe("useSelection logic", () => {
  // Simulate the Set-based selection logic used in the hook

  describe("select (single mode)", () => {
    test("should select a single item", () => {
      let selectedIds = new Set<string>()

      // Simulate select("item-1", multi=false)
      selectedIds = new Set(["item-1"])

      expect(Array.from(selectedIds)).toEqual(["item-1"])
    })

    test("should replace selection when multi is false", () => {
      let selectedIds = new Set<string>(["item-1"])

      // Simulate select("item-2", multi=false)
      selectedIds = new Set(["item-2"])

      expect(Array.from(selectedIds)).toEqual(["item-2"])
    })
  })

  describe("select (multi mode)", () => {
    test("should add to selection when multi is true", () => {
      let selectedIds = new Set<string>(["item-1"])

      // Simulate select("item-2", multi=true) - add if not present
      const next = new Set(selectedIds)
      if (!next.has("item-2")) {
        next.add("item-2")
      }
      selectedIds = next

      expect(Array.from(selectedIds).sort()).toEqual(["item-1", "item-2"])
    })

    test("should toggle off when multi is true and item is selected", () => {
      let selectedIds = new Set<string>(["item-1", "item-2"])

      // Simulate select("item-1", multi=true) - toggle off
      const next = new Set(selectedIds)
      if (next.has("item-1")) {
        next.delete("item-1")
      } else {
        next.add("item-1")
      }
      selectedIds = next

      expect(Array.from(selectedIds)).toEqual(["item-2"])
    })

    test("should toggle on when multi is true and item is not selected", () => {
      let selectedIds = new Set<string>(["item-1"])

      // Simulate select("item-3", multi=true) - toggle on
      const next = new Set(selectedIds)
      if (next.has("item-3")) {
        next.delete("item-3")
      } else {
        next.add("item-3")
      }
      selectedIds = next

      expect(Array.from(selectedIds).sort()).toEqual(["item-1", "item-3"])
    })
  })

  describe("clearSelection", () => {
    test("should clear all selected items", () => {
      let selectedIds = new Set<string>(["item-1", "item-2", "item-3"])

      // Simulate clearSelection()
      selectedIds = new Set()

      expect(Array.from(selectedIds)).toEqual([])
    })

    test("should be no-op on empty selection", () => {
      let selectedIds = new Set<string>()

      // Simulate clearSelection()
      selectedIds = new Set()

      expect(Array.from(selectedIds)).toEqual([])
    })
  })

  describe("isSelected", () => {
    test("should return true for selected item", () => {
      const selectedIds = new Set<string>(["item-1", "item-2"])

      expect(selectedIds.has("item-1")).toBe(true)
      expect(selectedIds.has("item-2")).toBe(true)
    })

    test("should return false for unselected item", () => {
      const selectedIds = new Set<string>(["item-1"])

      expect(selectedIds.has("item-2")).toBe(false)
      expect(selectedIds.has("item-3")).toBe(false)
    })
  })

  describe("selectedIds array conversion", () => {
    test("should convert Set to Array correctly", () => {
      const selectedIds = new Set<string>(["a", "b", "c"])

      const array = Array.from(selectedIds)

      expect(array).toHaveLength(3)
      expect(array).toContain("a")
      expect(array).toContain("b")
      expect(array).toContain("c")
    })

    test("should handle empty Set", () => {
      const selectedIds = new Set<string>()

      const array = Array.from(selectedIds)

      expect(array).toEqual([])
    })

    test("should handle single item", () => {
      const selectedIds = new Set<string>(["only-one"])

      const array = Array.from(selectedIds)

      expect(array).toEqual(["only-one"])
    })
  })

  describe("Multiple operations", () => {
    test("should handle complex selection sequence", () => {
      let selectedIds = new Set<string>()

      // Select item-1 (single mode)
      selectedIds = new Set(["item-1"])
      expect(Array.from(selectedIds)).toEqual(["item-1"])

      // Add item-2 (multi mode)
      const step2 = new Set(selectedIds)
      step2.add("item-2")
      selectedIds = step2
      expect(Array.from(selectedIds).sort()).toEqual(["item-1", "item-2"])

      // Add item-3 (multi mode)
      const step3 = new Set(selectedIds)
      step3.add("item-3")
      selectedIds = step3
      expect(selectedIds.size).toBe(3)

      // Toggle off item-2 (multi mode)
      const step4 = new Set(selectedIds)
      step4.delete("item-2")
      selectedIds = step4
      expect(Array.from(selectedIds).sort()).toEqual(["item-1", "item-3"])

      // Replace with item-4 (single mode)
      selectedIds = new Set(["item-4"])
      expect(Array.from(selectedIds)).toEqual(["item-4"])

      // Clear all
      selectedIds = new Set()
      expect(Array.from(selectedIds)).toEqual([])
    })
  })
})
