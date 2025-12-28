/**
 * Selection Slice Tests - @cadhy/desktop
 *
 * Tests for the selection slice of the modeller store:
 * - Single and multiple selection
 * - Additive selection
 * - Toggle, invert, select all, deselect all
 * - Select by layer and type
 * - Hover state
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { useModellerStore } from "../core/stores"
import type { AnySceneObject } from "../core/stores/ST_types"

// Helper to create test objects
function createTestObject(
  overrides: Partial<AnySceneObject> = {}
): Omit<AnySceneObject, "id" | "createdAt" | "updatedAt"> {
  return {
    type: "shape",
    name: "Test Object",
    visible: true,
    locked: false,
    selected: false,
    layerId: "default",
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    material: { color: "#808080", opacity: 1, metalness: 0, roughness: 0.5 },
    shapeType: "box",
    ...overrides,
  } as Omit<AnySceneObject, "id" | "createdAt" | "updatedAt">
}

describe("Selection Slice", () => {
  beforeEach(() => {
    // Reset store to initial state
    useModellerStore.setState({
      objects: [],
      selectedIds: [],
      hoveredId: null,
      layers: [{ id: "default", name: "Default", visible: true, locked: false, color: "#808080" }],
      history: [],
      historyIndex: -1,
      pendingHistoryState: null,
      transformMode: "none",
    })
  })

  // ============================================================
  // Initial State Tests
  // ============================================================

  describe("Initial State", () => {
    test("should have empty selectedIds", () => {
      const state = useModellerStore.getState()
      expect(state.selectedIds).toEqual([])
    })

    test("should have null hoveredId", () => {
      const state = useModellerStore.getState()
      expect(state.hoveredId).toBeNull()
    })
  })

  // ============================================================
  // Single Selection Tests
  // ============================================================

  describe("Single Selection", () => {
    test("should select a single object", () => {
      const { addObject, select } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      select(id)

      const state = useModellerStore.getState()
      expect(state.selectedIds).toEqual([id])
    })

    test("should replace selection when selecting without additive", () => {
      const { addObject, select } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))

      select(id1)
      select(id2)

      const state = useModellerStore.getState()
      expect(state.selectedIds).toEqual([id2])
    })

    test("should add to selection when using additive mode", () => {
      const { addObject, select } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))

      select(id1)
      select(id2, true) // additive

      const state = useModellerStore.getState()
      expect(state.selectedIds).toContain(id1)
      expect(state.selectedIds).toContain(id2)
      expect(state.selectedIds).toHaveLength(2)
    })

    test("should not duplicate id when selecting already selected object additively", () => {
      const { addObject, select } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      select(id)
      select(id, true) // additive - same object

      const state = useModellerStore.getState()
      expect(state.selectedIds).toEqual([id])
    })

    test("should update object.selected property", () => {
      const { addObject, select } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      select(id)

      const state = useModellerStore.getState()
      const obj = state.objects.find((o) => o.id === id)
      expect(obj?.selected).toBe(true)
    })

    test("should auto-enable translate mode when selecting with no transform mode", () => {
      const { addObject, select } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      select(id)

      const state = useModellerStore.getState()
      expect(state.transformMode).toBe("translate")
    })
  })

  // ============================================================
  // Multiple Selection Tests
  // ============================================================

  describe("Multiple Selection", () => {
    test("should select multiple objects", () => {
      const { addObject, selectMultiple } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))
      const id3 = addObject(createTestObject({ name: "Box 3" }))

      selectMultiple([id1, id2, id3])

      const state = useModellerStore.getState()
      expect(state.selectedIds).toHaveLength(3)
      expect(state.selectedIds).toContain(id1)
      expect(state.selectedIds).toContain(id2)
      expect(state.selectedIds).toContain(id3)
    })

    test("should replace selection when not additive", () => {
      const { addObject, selectMultiple } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))
      const id3 = addObject(createTestObject({ name: "Box 3" }))

      selectMultiple([id1])
      selectMultiple([id2, id3])

      const state = useModellerStore.getState()
      expect(state.selectedIds).toHaveLength(2)
      expect(state.selectedIds).not.toContain(id1)
    })

    test("should add to selection when additive", () => {
      const { addObject, selectMultiple } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))
      const id3 = addObject(createTestObject({ name: "Box 3" }))

      selectMultiple([id1])
      selectMultiple([id2, id3], true)

      const state = useModellerStore.getState()
      expect(state.selectedIds).toHaveLength(3)
    })

    test("should deduplicate ids when additive", () => {
      const { addObject, selectMultiple } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))

      selectMultiple([id1, id2])
      selectMultiple([id1, id2], true) // Same ids again

      const state = useModellerStore.getState()
      expect(state.selectedIds).toHaveLength(2)
    })
  })

  // ============================================================
  // Select All Tests
  // ============================================================

  describe("Select All", () => {
    test("should select all visible unlocked objects", () => {
      const { addObject, selectAll } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))
      const id3 = addObject(createTestObject({ name: "Box 3" }))

      selectAll()

      const state = useModellerStore.getState()
      expect(state.selectedIds).toHaveLength(3)
      expect(state.selectedIds).toContain(id1)
      expect(state.selectedIds).toContain(id2)
      expect(state.selectedIds).toContain(id3)
    })

    test("should not select hidden objects", () => {
      const { addObject, selectAll } = useModellerStore.getState()
      addObject(createTestObject({ name: "Visible", visible: true }))
      addObject(createTestObject({ name: "Hidden", visible: false }))

      selectAll()

      const state = useModellerStore.getState()
      expect(state.selectedIds).toHaveLength(1)
    })

    test("should not select locked objects", () => {
      const { addObject, selectAll } = useModellerStore.getState()
      addObject(createTestObject({ name: "Unlocked", locked: false }))
      addObject(createTestObject({ name: "Locked", locked: true }))

      selectAll()

      const state = useModellerStore.getState()
      expect(state.selectedIds).toHaveLength(1)
    })
  })

  // ============================================================
  // Deselect All Tests
  // ============================================================

  describe("Deselect All", () => {
    test("should clear all selections", () => {
      const { addObject, selectMultiple, deselectAll } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))

      selectMultiple([id1, id2])
      deselectAll()

      const state = useModellerStore.getState()
      expect(state.selectedIds).toEqual([])
    })

    test("should update object.selected to false", () => {
      const { addObject, select, deselectAll } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      select(id)
      deselectAll()

      const state = useModellerStore.getState()
      const obj = state.objects.find((o) => o.id === id)
      expect(obj?.selected).toBe(false)
    })
  })

  // ============================================================
  // Toggle Selection Tests
  // ============================================================

  describe("Toggle Selection", () => {
    test("should add unselected object to selection", () => {
      const { addObject, toggleSelection } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      toggleSelection(id)

      const state = useModellerStore.getState()
      expect(state.selectedIds).toContain(id)
    })

    test("should remove selected object from selection", () => {
      const { addObject, select, toggleSelection } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      select(id)
      toggleSelection(id)

      const state = useModellerStore.getState()
      expect(state.selectedIds).not.toContain(id)
    })

    test("should preserve other selections when toggling", () => {
      const { addObject, selectMultiple, toggleSelection } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))

      selectMultiple([id1, id2])
      toggleSelection(id1)

      const state = useModellerStore.getState()
      expect(state.selectedIds).not.toContain(id1)
      expect(state.selectedIds).toContain(id2)
    })
  })

  // ============================================================
  // Hover State Tests
  // ============================================================

  describe("Hover State", () => {
    test("should set hovered id", () => {
      const { addObject, setHovered } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      setHovered(id)

      const state = useModellerStore.getState()
      expect(state.hoveredId).toBe(id)
    })

    test("should clear hovered id with null", () => {
      const { addObject, setHovered } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      setHovered(id)
      setHovered(null)

      const state = useModellerStore.getState()
      expect(state.hoveredId).toBeNull()
    })
  })

  // ============================================================
  // Invert Selection Tests
  // ============================================================

  describe("Invert Selection", () => {
    test("should invert selection among visible unlocked objects", () => {
      const { addObject, select, invertSelection } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))
      const id3 = addObject(createTestObject({ name: "Box 3" }))

      select(id1)
      invertSelection()

      const state = useModellerStore.getState()
      expect(state.selectedIds).not.toContain(id1)
      expect(state.selectedIds).toContain(id2)
      expect(state.selectedIds).toContain(id3)
    })

    test("should not include hidden or locked objects in inversion", () => {
      const { addObject, select, invertSelection } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Visible", visible: true }))
      addObject(createTestObject({ name: "Hidden", visible: false }))
      addObject(createTestObject({ name: "Locked", locked: true }))

      select(id1)
      invertSelection()

      const state = useModellerStore.getState()
      // Only the originally selected one is excluded, hidden/locked weren't selectable
      expect(state.selectedIds).toHaveLength(0)
    })
  })

  // ============================================================
  // Select By Layer Tests
  // ============================================================

  describe("Select By Layer", () => {
    test("should select all objects on a layer", () => {
      // Add a second layer
      useModellerStore.setState((state) => ({
        layers: [
          ...state.layers,
          { id: "layer-2", name: "Layer 2", visible: true, locked: false, color: "#FF0000" },
        ],
      }))

      const { addObject, selectByLayer } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1", layerId: "default" }))
      const id2 = addObject(createTestObject({ name: "Box 2", layerId: "layer-2" }))
      const id3 = addObject(createTestObject({ name: "Box 3", layerId: "layer-2" }))

      selectByLayer("layer-2")

      const state = useModellerStore.getState()
      expect(state.selectedIds).not.toContain(id1)
      expect(state.selectedIds).toContain(id2)
      expect(state.selectedIds).toContain(id3)
    })
  })

  // ============================================================
  // Select By Type Tests
  // ============================================================

  describe("Select By Type", () => {
    test("should select all objects of a type", () => {
      const { addObject, selectByType } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ type: "shape", name: "Shape 1" }))
      const id2 = addObject(
        createTestObject({
          type: "channel",
          name: "Channel 1",
          section: { type: "rectangular", width: 1, height: 1 },
          length: 10,
          slope: 0.01,
          startStation: 0,
          endStation: 10,
          startElevation: 100,
          endElevation: 99.9,
          manning: 0.015,
        } as Partial<AnySceneObject>)
      )
      const id3 = addObject(createTestObject({ type: "shape", name: "Shape 2" }))

      selectByType("shape")

      const state = useModellerStore.getState()
      expect(state.selectedIds).toContain(id1)
      expect(state.selectedIds).not.toContain(id2)
      expect(state.selectedIds).toContain(id3)
    })
  })
})
