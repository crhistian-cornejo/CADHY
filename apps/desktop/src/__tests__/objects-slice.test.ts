/**
 * Objects Slice Tests - @cadhy/desktop
 *
 * Tests for the objects management slice:
 * - addObject, updateObject, deleteObject
 * - duplicateObject, deleteSelected, duplicateSelected
 * - getObjectById, getSelectedObjects, getVisibleObjects
 * - Batch operations
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { useModellerStore } from "../core/stores"
import type { AnySceneObject, ChannelObject, ChuteObject } from "../core/stores/ST_types"

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

// Helper to create a channel object
function createChannelObject(
  overrides: Partial<ChannelObject> = {}
): Omit<ChannelObject, "id" | "createdAt" | "updatedAt"> {
  return {
    type: "channel",
    name: "Test Channel",
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
    section: { type: "rectangular", width: 2, height: 1 },
    length: 10,
    slope: 0.01,
    startStation: 0,
    endStation: 10,
    startElevation: 100,
    endElevation: 99.9,
    manning: 0.015,
    thickness: 0.2,
    ...overrides,
  } as Omit<ChannelObject, "id" | "createdAt" | "updatedAt">
}

describe("Objects Slice", () => {
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
      isDirty: false,
      transformMode: "none",
    })
  })

  // ============================================================
  // Add Object Tests
  // ============================================================

  describe("Add Object", () => {
    test("should add an object and return its id", () => {
      const { addObject } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      expect(id).toBeDefined()
      expect(typeof id).toBe("string")
    })

    test("should add object to objects array", () => {
      const { addObject } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      const state = useModellerStore.getState()
      expect(state.objects).toHaveLength(1)
    })

    test("should set createdAt and updatedAt", () => {
      const { addObject } = useModellerStore.getState()
      const beforeAdd = Date.now()
      const id = addObject(createTestObject({ name: "Box 1" }))
      const afterAdd = Date.now()

      const state = useModellerStore.getState()
      const obj = state.objects.find((o) => o.id === id)

      expect(obj?.createdAt).toBeGreaterThanOrEqual(beforeAdd)
      expect(obj?.createdAt).toBeLessThanOrEqual(afterAdd)
      expect(obj?.updatedAt).toBeGreaterThanOrEqual(beforeAdd)
    })

    test("should save to history when adding object", () => {
      const { addObject } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      const state = useModellerStore.getState()
      expect(state.history.length).toBeGreaterThan(0)
    })
  })

  // ============================================================
  // Update Object Tests
  // ============================================================

  describe("Update Object", () => {
    test("should update object properties", () => {
      const { addObject, updateObject } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Original Name" }))

      updateObject(id, { name: "New Name" })

      const state = useModellerStore.getState()
      const obj = state.objects.find((o) => o.id === id)
      expect(obj?.name).toBe("New Name")
    })

    test("should update updatedAt timestamp", () => {
      const { addObject, updateObject } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      const stateBefore = useModellerStore.getState()
      const updatedAtBefore = stateBefore.objects.find((o) => o.id === id)?.updatedAt ?? 0

      // Small delay to ensure timestamp changes
      const beforeUpdate = Date.now()
      updateObject(id, { name: "Updated" })

      const stateAfter = useModellerStore.getState()
      const obj = stateAfter.objects.find((o) => o.id === id)

      expect(obj?.updatedAt).toBeGreaterThanOrEqual(beforeUpdate)
      expect(obj?.updatedAt).toBeGreaterThanOrEqual(updatedAtBefore)
    })

    test("should mark store as dirty", () => {
      const { addObject, updateObject } = useModellerStore.getState()
      useModellerStore.setState({ isDirty: false })

      const id = addObject(createTestObject({ name: "Box 1" }))
      useModellerStore.setState({ isDirty: false }) // Reset after add

      updateObject(id, { name: "Updated" })

      const state = useModellerStore.getState()
      expect(state.isDirty).toBe(true)
    })

    test("should save to history when saveHistory is true", () => {
      const { addObject, updateObject } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      const historyLengthBefore = useModellerStore.getState().history.length
      updateObject(id, { name: "Updated" }, true)

      const state = useModellerStore.getState()
      expect(state.history.length).toBeGreaterThan(historyLengthBefore)
    })

    test("should recalculate channel endStation when length changes", () => {
      const { addObject, updateObject } = useModellerStore.getState()
      const id = addObject(createChannelObject({ startStation: 100, length: 50 }))

      updateObject(id, { length: 75 })

      const state = useModellerStore.getState()
      const channel = state.objects.find((o) => o.id === id) as ChannelObject
      expect(channel.endStation).toBe(175) // 100 + 75
    })

    test("should recalculate channel endElevation when slope changes", () => {
      const { addObject, updateObject } = useModellerStore.getState()
      const id = addObject(
        createChannelObject({
          startElevation: 100,
          length: 100,
          slope: 0.01,
        })
      )

      updateObject(id, { slope: 0.02 })

      const state = useModellerStore.getState()
      const channel = state.objects.find((o) => o.id === id) as ChannelObject
      expect(channel.endElevation).toBe(98) // 100 - (100 * 0.02)
    })
  })

  // ============================================================
  // Delete Object Tests
  // ============================================================

  describe("Delete Object", () => {
    test("should remove object from objects array", () => {
      const { addObject, deleteObject } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      deleteObject(id)

      const state = useModellerStore.getState()
      expect(state.objects).toHaveLength(0)
    })

    test("should remove object from selectedIds", () => {
      const { addObject, select, deleteObject } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))
      select(id)

      deleteObject(id)

      const state = useModellerStore.getState()
      expect(state.selectedIds).not.toContain(id)
    })

    test("should save to history", () => {
      const { addObject, deleteObject } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      const historyLengthBefore = useModellerStore.getState().history.length
      deleteObject(id)

      const state = useModellerStore.getState()
      expect(state.history.length).toBeGreaterThan(historyLengthBefore)
    })
  })

  // ============================================================
  // Delete Selected Tests
  // ============================================================

  describe("Delete Selected", () => {
    test("should delete all selected objects", () => {
      const { addObject, selectMultiple, deleteSelected } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))
      addObject(createTestObject({ name: "Box 3" }))

      selectMultiple([id1, id2])
      deleteSelected()

      const state = useModellerStore.getState()
      expect(state.objects).toHaveLength(1)
      expect(state.objects[0].name).toBe("Box 3")
    })

    test("should clear selectedIds", () => {
      const { addObject, selectMultiple, deleteSelected } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))

      selectMultiple([id1, id2])
      deleteSelected()

      const state = useModellerStore.getState()
      expect(state.selectedIds).toEqual([])
    })

    test("should do nothing when no objects selected", () => {
      const { addObject, deleteSelected } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      const historyLengthBefore = useModellerStore.getState().history.length
      deleteSelected()

      const state = useModellerStore.getState()
      expect(state.objects).toHaveLength(1)
      expect(state.history.length).toBe(historyLengthBefore)
    })
  })

  // ============================================================
  // Duplicate Object Tests
  // ============================================================

  describe("Duplicate Object", () => {
    test("should create a copy of the object", () => {
      const { addObject, duplicateObject } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Original" }))

      const newId = duplicateObject(id)

      expect(newId).toBeDefined()
      expect(newId).not.toBe(id)

      const state = useModellerStore.getState()
      expect(state.objects).toHaveLength(2)
    })

    test("should add (copy) suffix to name", () => {
      const { addObject, duplicateObject } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Original" }))

      const newId = duplicateObject(id)

      const state = useModellerStore.getState()
      const copy = state.objects.find((o) => o.id === newId)
      expect(copy?.name).toBe("Original (copy)")
    })

    test("should offset position", () => {
      const { addObject, duplicateObject } = useModellerStore.getState()
      const id = addObject(
        createTestObject({
          name: "Original",
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
        })
      )

      const newId = duplicateObject(id)

      const state = useModellerStore.getState()
      const copy = state.objects.find((o) => o.id === newId)
      expect(copy?.transform.position.x).toBe(1)
      expect(copy?.transform.position.z).toBe(1)
    })

    test("should return null for non-existent object", () => {
      const { duplicateObject } = useModellerStore.getState()

      const result = duplicateObject("non-existent-id")

      expect(result).toBeNull()
    })

    test("should not select the duplicate", () => {
      const { addObject, duplicateObject } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Original" }))

      const newId = duplicateObject(id)

      const state = useModellerStore.getState()
      const copy = state.objects.find((o) => o.id === newId)
      expect(copy?.selected).toBe(false)
    })
  })

  // ============================================================
  // Duplicate Selected Tests
  // ============================================================

  describe("Duplicate Selected", () => {
    test("should duplicate all selected objects", () => {
      const { addObject, selectMultiple, duplicateSelected } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))

      selectMultiple([id1, id2])
      const newIds = duplicateSelected()

      expect(newIds).toHaveLength(2)

      const state = useModellerStore.getState()
      expect(state.objects).toHaveLength(4)
    })

    test("should select duplicated objects", () => {
      const { addObject, selectMultiple, duplicateSelected } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))

      selectMultiple([id1, id2])
      const newIds = duplicateSelected()

      const state = useModellerStore.getState()
      expect(state.selectedIds).toEqual(newIds)
    })
  })

  // ============================================================
  // Get Object By ID Tests
  // ============================================================

  describe("Get Object By ID", () => {
    test("should return object by id", () => {
      const { addObject, getObjectById } = useModellerStore.getState()
      const id = addObject(createTestObject({ name: "Box 1" }))

      const obj = getObjectById(id)

      expect(obj).toBeDefined()
      expect(obj?.name).toBe("Box 1")
    })

    test("should return undefined for non-existent id", () => {
      const { getObjectById } = useModellerStore.getState()

      const obj = getObjectById("non-existent")

      expect(obj).toBeUndefined()
    })
  })

  // ============================================================
  // Get Selected Objects Tests
  // ============================================================

  describe("Get Selected Objects", () => {
    test("should return all selected objects", () => {
      const { addObject, selectMultiple, getSelectedObjects } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))
      addObject(createTestObject({ name: "Box 3" }))

      selectMultiple([id1, id2])

      const selected = getSelectedObjects()
      expect(selected).toHaveLength(2)
    })

    test("should return empty array when nothing selected", () => {
      const { addObject, getSelectedObjects } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      const selected = getSelectedObjects()
      expect(selected).toEqual([])
    })
  })

  // ============================================================
  // Get Visible Objects Tests
  // ============================================================

  describe("Get Visible Objects", () => {
    test("should return only visible objects", () => {
      const { addObject, getVisibleObjects } = useModellerStore.getState()
      addObject(createTestObject({ name: "Visible", visible: true }))
      addObject(createTestObject({ name: "Hidden", visible: false }))

      const visible = getVisibleObjects()
      expect(visible).toHaveLength(1)
      expect(visible[0].name).toBe("Visible")
    })

    test("should respect layer visibility", () => {
      // Add hidden layer
      useModellerStore.setState((state) => ({
        layers: [
          ...state.layers,
          {
            id: "hidden-layer",
            name: "Hidden Layer",
            visible: false,
            locked: false,
            color: "#FF0000",
          },
        ],
      }))

      const { addObject, getVisibleObjects } = useModellerStore.getState()
      addObject(createTestObject({ name: "On Default", layerId: "default" }))
      addObject(createTestObject({ name: "On Hidden Layer", layerId: "hidden-layer" }))

      const visible = getVisibleObjects()
      expect(visible).toHaveLength(1)
      expect(visible[0].name).toBe("On Default")
    })
  })

  // ============================================================
  // Get Objects By Layer Tests
  // ============================================================

  describe("Get Objects By Layer", () => {
    test("should return objects on specified layer", () => {
      useModellerStore.setState((state) => ({
        layers: [
          ...state.layers,
          { id: "layer-2", name: "Layer 2", visible: true, locked: false, color: "#FF0000" },
        ],
      }))

      const { addObject, getObjectsByLayer } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1", layerId: "default" }))
      addObject(createTestObject({ name: "Box 2", layerId: "layer-2" }))
      addObject(createTestObject({ name: "Box 3", layerId: "layer-2" }))

      const layer2Objects = getObjectsByLayer("layer-2")
      expect(layer2Objects).toHaveLength(2)
    })
  })

  // ============================================================
  // Get Objects By Type Tests
  // ============================================================

  describe("Get Objects By Type", () => {
    test("should return objects of specified type", () => {
      const { addObject, getObjectsByType } = useModellerStore.getState()
      addObject(createTestObject({ type: "shape", name: "Shape 1" }))
      addObject(createChannelObject({ name: "Channel 1" }))
      addObject(createTestObject({ type: "shape", name: "Shape 2" }))

      const shapes = getObjectsByType("shape")
      expect(shapes).toHaveLength(2)
    })
  })

  // ============================================================
  // Batch Delete Tests
  // ============================================================

  describe("Batch Delete Multiple", () => {
    test("should delete multiple objects at once", () => {
      const { addObject, deleteMultiple } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))
      addObject(createTestObject({ name: "Box 3" }))

      deleteMultiple([id1, id2])

      const state = useModellerStore.getState()
      expect(state.objects).toHaveLength(1)
      expect(state.objects[0].name).toBe("Box 3")
    })

    test("should remove from selectedIds", () => {
      const { addObject, selectMultiple, deleteMultiple } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))

      selectMultiple([id1, id2])
      deleteMultiple([id1])

      const state = useModellerStore.getState()
      expect(state.selectedIds).not.toContain(id1)
      expect(state.selectedIds).toContain(id2)
    })
  })

  // ============================================================
  // Batch Update Tests
  // ============================================================

  describe("Batch Update Multiple", () => {
    test("should update multiple objects at once", () => {
      const { addObject, updateMultiple } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1" }))
      const id2 = addObject(createTestObject({ name: "Box 2" }))

      updateMultiple([
        { id: id1, changes: { name: "Updated 1" } },
        { id: id2, changes: { name: "Updated 2" } },
      ])

      const state = useModellerStore.getState()
      expect(state.objects.find((o) => o.id === id1)?.name).toBe("Updated 1")
      expect(state.objects.find((o) => o.id === id2)?.name).toBe("Updated 2")
    })
  })

  // ============================================================
  // Batch Visibility Tests
  // ============================================================

  describe("Set Multiple Objects Visibility", () => {
    test("should set visibility for multiple objects", () => {
      const { addObject, setMultipleObjectsVisibility } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1", visible: true }))
      const id2 = addObject(createTestObject({ name: "Box 2", visible: true }))

      setMultipleObjectsVisibility([id1, id2], false)

      const state = useModellerStore.getState()
      expect(state.objects.find((o) => o.id === id1)?.visible).toBe(false)
      expect(state.objects.find((o) => o.id === id2)?.visible).toBe(false)
    })
  })

  // ============================================================
  // Batch Lock Tests
  // ============================================================

  describe("Set Multiple Objects Lock", () => {
    test("should set lock for multiple objects", () => {
      const { addObject, setMultipleObjectsLock } = useModellerStore.getState()
      const id1 = addObject(createTestObject({ name: "Box 1", locked: false }))
      const id2 = addObject(createTestObject({ name: "Box 2", locked: false }))

      setMultipleObjectsLock([id1, id2], true)

      const state = useModellerStore.getState()
      expect(state.objects.find((o) => o.id === id1)?.locked).toBe(true)
      expect(state.objects.find((o) => o.id === id2)?.locked).toBe(true)
    })
  })
})
