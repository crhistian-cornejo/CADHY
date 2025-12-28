/**
 * History Slice Tests - @cadhy/desktop
 *
 * Tests for the undo/redo functionality:
 * - saveToHistory, commitToHistory
 * - undo, redo
 * - clearHistory
 * - History preview
 * - TypedArray restoration after JSON serialization
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { useModellerStore } from "../core/stores"
import type { AnySceneObject, ShapeObject } from "../core/stores/ST_types"

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

// Helper to create a shape with mesh data
function createShapeWithMesh(): Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> {
  return {
    type: "shape",
    name: "Mesh Shape",
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
    mesh: {
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]),
      indices: new Uint32Array([0, 1, 2]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    },
  }
}

describe("History Slice", () => {
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
      historyPreviewIndex: null,
      isDirty: false,
      transformMode: "none",
    })
  })

  // ============================================================
  // Initial State Tests
  // ============================================================

  describe("Initial State", () => {
    test("should have empty history", () => {
      const state = useModellerStore.getState()
      expect(state.history).toEqual([])
    })

    test("should have historyIndex at -1", () => {
      const state = useModellerStore.getState()
      expect(state.historyIndex).toBe(-1)
    })

    test("should have null pendingHistoryState", () => {
      const state = useModellerStore.getState()
      expect(state.pendingHistoryState).toBeNull()
    })

    test("should have null historyPreviewIndex", () => {
      const state = useModellerStore.getState()
      expect(state.historyPreviewIndex).toBeNull()
    })
  })

  // ============================================================
  // Save To History Tests
  // ============================================================

  describe("Save To History", () => {
    test("should save state to history", () => {
      const { addObject } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      // addObject internally calls saveToHistory
      const state = useModellerStore.getState()
      expect(state.history.length).toBeGreaterThan(0)
    })

    test("should increment historyIndex", () => {
      const { addObject } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      const state = useModellerStore.getState()
      expect(state.historyIndex).toBe(0)
    })

    test("should store action name in history entry", () => {
      const { addObject } = useModellerStore.getState()
      addObject(createTestObject({ name: "My Box" }))

      const state = useModellerStore.getState()
      expect(state.history[0].action).toContain("My Box")
    })

    test("should mark store as dirty", () => {
      const { addObject } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      const state = useModellerStore.getState()
      expect(state.isDirty).toBe(true)
    })

    test("should limit history to 50 entries", () => {
      const { saveToHistory } = useModellerStore.getState()

      // Add 60 history entries
      for (let i = 0; i < 60; i++) {
        saveToHistory(`Action ${i}`)
      }

      const state = useModellerStore.getState()
      expect(state.history.length).toBeLessThanOrEqual(50)
    })
  })

  // ============================================================
  // Undo Tests
  // ============================================================

  describe("Undo", () => {
    test("should not undo when at beginning", () => {
      const { undo } = useModellerStore.getState()

      undo()

      const state = useModellerStore.getState()
      expect(state.historyIndex).toBe(-1)
    })

    test("should restore previous state on undo", () => {
      const { addObject, undo } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      const stateAfterAdd = useModellerStore.getState()
      expect(stateAfterAdd.objects.length).toBe(1)

      addObject(createTestObject({ name: "Box 2" }))
      expect(useModellerStore.getState().objects.length).toBe(2)

      undo()

      const stateAfterUndo = useModellerStore.getState()
      expect(stateAfterUndo.objects.length).toBe(1)
      expect(stateAfterUndo.objects[0].name).toBe("Box 1")
    })

    test("should decrement historyIndex on undo", () => {
      const { addObject, undo } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      addObject(createTestObject({ name: "Box 2" }))

      const indexBeforeUndo = useModellerStore.getState().historyIndex
      undo()

      const state = useModellerStore.getState()
      expect(state.historyIndex).toBe(indexBeforeUndo - 1)
    })

    test("should clear historyPreviewIndex on undo", () => {
      const { addObject, setHistoryPreview, undo } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      addObject(createTestObject({ name: "Box 2" }))

      setHistoryPreview(0)
      undo()

      const state = useModellerStore.getState()
      expect(state.historyPreviewIndex).toBeNull()
    })
  })

  // ============================================================
  // Redo Tests
  // ============================================================

  describe("Redo", () => {
    test("should not redo when at end of history", () => {
      const { addObject, redo } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      const indexBefore = useModellerStore.getState().historyIndex
      redo()

      const state = useModellerStore.getState()
      expect(state.historyIndex).toBe(indexBefore)
    })

    test("should restore next state on redo", () => {
      const { addObject, undo, redo } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      addObject(createTestObject({ name: "Box 2" }))

      undo()
      expect(useModellerStore.getState().objects.length).toBe(1)

      redo()

      const state = useModellerStore.getState()
      expect(state.objects.length).toBe(2)
    })

    test("should increment historyIndex on redo", () => {
      const { addObject, undo, redo } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      addObject(createTestObject({ name: "Box 2" }))

      undo()
      const indexAfterUndo = useModellerStore.getState().historyIndex

      redo()

      const state = useModellerStore.getState()
      expect(state.historyIndex).toBe(indexAfterUndo + 1)
    })
  })

  // ============================================================
  // Clear History Tests
  // ============================================================

  describe("Clear History", () => {
    test("should clear all history", () => {
      const { addObject, clearHistory } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      addObject(createTestObject({ name: "Box 2" }))

      clearHistory()

      const state = useModellerStore.getState()
      expect(state.history).toEqual([])
      expect(state.historyIndex).toBe(-1)
    })

    test("should clear historyPreviewIndex", () => {
      const { addObject, setHistoryPreview, clearHistory } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      setHistoryPreview(0)

      clearHistory()

      const state = useModellerStore.getState()
      expect(state.historyPreviewIndex).toBeNull()
    })
  })

  // ============================================================
  // History Preview Tests
  // ============================================================

  describe("History Preview", () => {
    test("should set historyPreviewIndex", () => {
      const { addObject, setHistoryPreview } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      addObject(createTestObject({ name: "Box 2" }))

      setHistoryPreview(0)

      const state = useModellerStore.getState()
      expect(state.historyPreviewIndex).toBe(0)
    })

    test("should clear historyPreviewIndex with null", () => {
      const { addObject, setHistoryPreview } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      setHistoryPreview(0)
      setHistoryPreview(null)

      const state = useModellerStore.getState()
      expect(state.historyPreviewIndex).toBeNull()
    })
  })

  // ============================================================
  // Pending History State Tests
  // ============================================================

  describe("Pending History State", () => {
    test("should save state before action", () => {
      const { addObject, saveStateBeforeAction } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      saveStateBeforeAction()

      const state = useModellerStore.getState()
      expect(state.pendingHistoryState).not.toBeNull()
      expect(state.pendingHistoryState?.objects).toHaveLength(1)
    })

    test("should not overwrite existing pending state", () => {
      const { addObject, saveStateBeforeAction } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      saveStateBeforeAction()
      const firstPending = useModellerStore.getState().pendingHistoryState

      addObject(createTestObject({ name: "Box 2" }))
      saveStateBeforeAction()

      const state = useModellerStore.getState()
      // Should still have the first pending state (1 object, not 2)
      expect(state.pendingHistoryState?.objects).toHaveLength(firstPending?.objects.length ?? 0)
    })

    test("should clear pending state", () => {
      const { saveStateBeforeAction, clearPendingHistory } = useModellerStore.getState()
      saveStateBeforeAction()

      clearPendingHistory()

      const state = useModellerStore.getState()
      expect(state.pendingHistoryState).toBeNull()
    })

    test("commitToHistory should clear pending state", () => {
      const { addObject, saveStateBeforeAction, commitToHistory } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      saveStateBeforeAction()

      commitToHistory("Test Action")

      const state = useModellerStore.getState()
      expect(state.pendingHistoryState).toBeNull()
    })
  })

  // ============================================================
  // TypedArray Restoration Tests
  // ============================================================

  describe("TypedArray Restoration", () => {
    test("should restore Float32Array vertices after undo", () => {
      const { addObject, undo } = useModellerStore.getState()
      const id = addObject(createShapeWithMesh())

      // Add another object to create history
      addObject(createTestObject({ name: "Box 2" }))

      // Undo to restore the mesh shape state
      undo()

      const state = useModellerStore.getState()
      const shape = state.objects.find((o) => o.id === id) as ShapeObject

      expect(shape.mesh).toBeDefined()
      expect(shape.mesh?.vertices).toBeInstanceOf(Float32Array)
      expect(shape.mesh?.vertices.length).toBe(9)
    })

    test("should restore Uint32Array indices after undo", () => {
      const { addObject, undo } = useModellerStore.getState()
      const id = addObject(createShapeWithMesh())

      addObject(createTestObject({ name: "Box 2" }))
      undo()

      const state = useModellerStore.getState()
      const shape = state.objects.find((o) => o.id === id) as ShapeObject

      expect(shape.mesh?.indices).toBeInstanceOf(Uint32Array)
      expect(shape.mesh?.indices.length).toBe(3)
    })

    test("should restore Float32Array normals after undo", () => {
      const { addObject, undo } = useModellerStore.getState()
      const id = addObject(createShapeWithMesh())

      addObject(createTestObject({ name: "Box 2" }))
      undo()

      const state = useModellerStore.getState()
      const shape = state.objects.find((o) => o.id === id) as ShapeObject

      expect(shape.mesh?.normals).toBeInstanceOf(Float32Array)
      expect(shape.mesh?.normals?.length).toBe(9)
    })

    test("should preserve transform data after undo", () => {
      const { addObject, updateObject, undo } = useModellerStore.getState()
      const id = addObject(
        createTestObject({
          name: "Box 1",
          transform: {
            position: { x: 5, y: 10, z: 15 },
            rotation: { x: 0.1, y: 0.2, z: 0.3 },
            scale: { x: 2, y: 2, z: 2 },
          },
        })
      )

      // Update transform
      updateObject(
        id,
        {
          transform: {
            position: { x: 100, y: 100, z: 100 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
        },
        true
      ) // saveHistory = true

      undo()

      const state = useModellerStore.getState()
      const obj = state.objects.find((o) => o.id === id)

      expect(obj?.transform.position.x).toBe(5)
      expect(obj?.transform.position.y).toBe(10)
      expect(obj?.transform.position.z).toBe(15)
    })
  })

  // ============================================================
  // Redo History Truncation Tests
  // ============================================================

  describe("Redo History Truncation", () => {
    test("should remove redo history when new action is performed", () => {
      const { addObject, undo } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      addObject(createTestObject({ name: "Box 2" }))
      addObject(createTestObject({ name: "Box 3" }))

      // Undo twice
      undo()
      undo()

      // Perform new action
      addObject(createTestObject({ name: "New Box" }))

      const state = useModellerStore.getState()
      // Should only have history up to the new action, not Box 2 and Box 3
      expect(state.historyIndex).toBe(state.history.length - 1)
    })
  })

  // ============================================================
  // Merge History Tests
  // ============================================================

  describe("Merge History", () => {
    test("should merge history up to index", () => {
      const { addObject, mergeHistory } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      addObject(createTestObject({ name: "Box 2" }))
      addObject(createTestObject({ name: "Box 3" }))

      mergeHistory(1, { deleteSketches: false, keepVariables: true })

      const state = useModellerStore.getState()
      expect(state.history.length).toBe(2)
      expect(state.historyIndex).toBe(1)
    })

    test("should restore state from merge point", () => {
      const { addObject, mergeHistory } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))
      addObject(createTestObject({ name: "Box 2" }))
      addObject(createTestObject({ name: "Box 3" }))

      mergeHistory(0, { deleteSketches: false, keepVariables: true })

      const state = useModellerStore.getState()
      expect(state.objects.length).toBe(1)
      expect(state.objects[0].name).toBe("Box 1")
    })

    test("should not merge with invalid index", () => {
      const { addObject, mergeHistory } = useModellerStore.getState()
      addObject(createTestObject({ name: "Box 1" }))

      const historyLengthBefore = useModellerStore.getState().history.length

      mergeHistory(-1, { deleteSketches: false, keepVariables: true })
      mergeHistory(100, { deleteSketches: false, keepVariables: true })

      const state = useModellerStore.getState()
      expect(state.history.length).toBe(historyLengthBefore)
    })
  })
})
