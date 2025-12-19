import { describe, expect, it } from "bun:test"
import { renderHook } from "@testing-library/react"
import { useVirtualList } from "../useVirtualList"

describe("useVirtualList", () => {
  const createMockItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }))

  describe("basic functionality", () => {
    it("should return virtualizer instance", () => {
      const items = createMockItems(100)
      const { result } = renderHook(() => useVirtualList({ items }))

      expect(result.current.virtualizer).toBeDefined()
    })

    it("should return parentRef", () => {
      const items = createMockItems(100)
      const { result } = renderHook(() => useVirtualList({ items }))

      expect(result.current.parentRef).toBeDefined()
      expect(result.current.parentRef.current).toBeNull() // Not attached to DOM in test
    })

    it("should return virtualItems array", () => {
      const items = createMockItems(100)
      const { result } = renderHook(() => useVirtualList({ items }))

      expect(Array.isArray(result.current.virtualItems)).toBe(true)
    })

    it("should return totalSize number", () => {
      const items = createMockItems(100)
      const { result } = renderHook(() => useVirtualList({ items }))

      expect(typeof result.current.totalSize).toBe("number")
      expect(result.current.totalSize).toBeGreaterThan(0)
    })
  })

  describe("estimateSize option", () => {
    it("should use default estimateSize of 50", () => {
      const items = createMockItems(100)
      const { result } = renderHook(() => useVirtualList({ items }))

      // With 100 items and 50px each, total should be 5000
      expect(result.current.totalSize).toBe(5000)
    })

    it("should use custom estimateSize", () => {
      const items = createMockItems(100)
      const { result } = renderHook(() => useVirtualList({ items, estimateSize: 100 }))

      // With 100 items and 100px each, total should be 10000
      expect(result.current.totalSize).toBe(10000)
    })
  })

  describe("empty lists", () => {
    it("should handle empty items array", () => {
      const { result } = renderHook(() => useVirtualList({ items: [] }))

      expect(result.current.virtualItems).toHaveLength(0)
      expect(result.current.totalSize).toBe(0)
    })
  })

  describe("large lists", () => {
    it("should handle 10,000 items without error", () => {
      const items = createMockItems(10000)
      const { result } = renderHook(() => useVirtualList({ items }))

      expect(result.current.totalSize).toBe(500000) // 10000 * 50
    })

    it("should only render a subset of items (virtualization)", () => {
      const items = createMockItems(10000)
      const { result } = renderHook(() => useVirtualList({ items }))

      // Virtual items should be much less than total items
      // (depends on viewport size, but in test should be small)
      expect(result.current.virtualItems.length).toBeLessThan(100)
    })
  })

  describe("overscan option", () => {
    it("should use default overscan of 5", () => {
      const items = createMockItems(100)
      const { result } = renderHook(() => useVirtualList({ items }))

      // Should not throw
      expect(result.current.virtualizer).toBeDefined()
    })

    it("should accept custom overscan", () => {
      const items = createMockItems(100)
      const { result } = renderHook(() => useVirtualList({ items, overscan: 10 }))

      expect(result.current.virtualizer).toBeDefined()
    })
  })

  describe("updates and re-renders", () => {
    it("should update when items change", () => {
      const items1 = createMockItems(100)
      const { result, rerender } = renderHook(({ items }) => useVirtualList({ items }), {
        initialProps: { items: items1 },
      })

      const totalSize1 = result.current.totalSize

      // Update to different number of items
      const items2 = createMockItems(200)
      rerender({ items: items2 })

      const totalSize2 = result.current.totalSize

      expect(totalSize2).toBeGreaterThan(totalSize1)
      expect(totalSize2).toBe(10000) // 200 * 50
    })

    it("should keep stable totalSize with same inputs", () => {
      const items = createMockItems(100)
      const { result, rerender } = renderHook(
        ({ estimateSize }) => useVirtualList({ items, estimateSize }),
        { initialProps: { estimateSize: 50 } }
      )

      const totalSize1 = result.current.totalSize

      // Rerender with same estimateSize
      rerender({ estimateSize: 50 })

      const totalSize2 = result.current.totalSize

      // Should remain the same
      expect(totalSize2).toBe(totalSize1)
      expect(totalSize2).toBe(5000) // 100 * 50
    })
  })

  describe("type safety", () => {
    it("should work with custom item types", () => {
      interface CustomItem {
        id: string
        value: number
        metadata: { createdAt: Date }
      }

      const items: CustomItem[] = [
        { id: "1", value: 100, metadata: { createdAt: new Date() } },
        { id: "2", value: 200, metadata: { createdAt: new Date() } },
      ]

      const { result } = renderHook(() => useVirtualList<CustomItem>({ items }))

      expect(result.current.virtualItems).toBeDefined()
    })
  })
})
