/**
 * Modeller Store Tests - @cadhy/desktop
 *
 * Tests for the modeller store including:
 * - Object management (add, update, delete, duplicate)
 * - Selection management
 * - Transform operations
 * - Layer management
 * - History (undo/redo)
 * - Scene management
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { type ChannelObject, type ShapeObject, useModellerStore } from "../stores/modeller"

// Helper to create a basic shape object
const createTestShape = (
  overrides?: Partial<Omit<ShapeObject, "id" | "createdAt" | "updatedAt">>
): Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> => ({
  name: "Test Shape",
  type: "shape",
  shapeType: "box",
  layerId: "default",
  transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  visible: true,
  locked: false,
  selected: false,
  metadata: {},
  parameters: { width: 1, height: 1, depth: 1 },
  material: {
    color: "#6366f1",
    opacity: 1,
    metalness: 0.1,
    roughness: 0.5,
  },
  ...overrides,
})

// Helper to create a basic channel object
const createTestChannel = (
  overrides?: Partial<Omit<ChannelObject, "id" | "createdAt" | "updatedAt">>
): Omit<ChannelObject, "id" | "createdAt" | "updatedAt"> => ({
  name: "Test Channel",
  type: "channel",
  layerId: "default",
  transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  visible: true,
  locked: false,
  selected: false,
  metadata: {},
  section: { type: "rectangular", width: 2, depth: 1.5 },
  alignment: [],
  manningN: 0.013,
  slope: 0.001,
  length: 10,
  thickness: 0.15,
  freeBoard: 0.3,
  startStation: 0,
  startElevation: 0,
  upstreamChannelId: null,
  downstreamChannelId: null,
  endStation: 10,
  endElevation: -0.01,
  material: {
    color: "#3b82f6",
    opacity: 1,
    metalness: 0.2,
    roughness: 0.4,
  },
  ...overrides,
})

describe("Modeller Store", () => {
  beforeEach(() => {
    // Reset store before each test
    useModellerStore.getState().reset()
  })

  // ============================================================
  // Initial State Tests
  // ============================================================

  describe("Initial State", () => {
    test("should have empty objects array", () => {
      const state = useModellerStore.getState()
      expect(state.objects).toEqual([])
    })

    test("should have default layer", () => {
      const state = useModellerStore.getState()
      expect(state.layers).toHaveLength(1)
      expect(state.layers[0].id).toBe("default")
      expect(state.layers[0].name).toBe("Default")
    })

    test("should have translate as default transform mode", () => {
      const state = useModellerStore.getState()
      expect(state.transformMode).toBe("translate")
    })

    test("should have world as default transform space", () => {
      const state = useModellerStore.getState()
      expect(state.transformSpace).toBe("world")
    })

    test("should have perspective as default camera view", () => {
      const state = useModellerStore.getState()
      expect(state.cameraView).toBe("perspective")
    })

    test("should not be dirty initially", () => {
      const state = useModellerStore.getState()
      expect(state.isDirty).toBe(false)
    })
  })

  // ============================================================
  // Object Management Tests
  // ============================================================

  describe("Object Management", () => {
    describe("addObject", () => {
      test("should add a shape object", () => {
        const { addObject } = useModellerStore.getState()
        const shape = createTestShape()

        const id = addObject(shape)

        expect(id).toBeDefined()
        expect(useModellerStore.getState().objects).toHaveLength(1)
        expect(useModellerStore.getState().objects[0].name).toBe("Test Shape")
      })

      test("should add a channel object", () => {
        const { addObject } = useModellerStore.getState()
        const channel = createTestChannel()

        const _id = addObject(channel)

        const state = useModellerStore.getState()
        expect(state.objects).toHaveLength(1)
        expect(state.objects[0].type).toBe("channel")
      })

      test("should generate unique IDs", () => {
        const { addObject } = useModellerStore.getState()

        const id1 = addObject(createTestShape({ name: "Shape 1" }))
        const id2 = addObject(createTestShape({ name: "Shape 2" }))

        expect(id1).not.toBe(id2)
      })

      test("should set timestamps", () => {
        const { addObject } = useModellerStore.getState()
        const before = Date.now()

        addObject(createTestShape())

        const obj = useModellerStore.getState().objects[0]
        expect(obj.createdAt).toBeGreaterThanOrEqual(before)
        expect(obj.updatedAt).toBeGreaterThanOrEqual(before)
      })

      test("should mark store as dirty", () => {
        const { addObject } = useModellerStore.getState()

        addObject(createTestShape())

        expect(useModellerStore.getState().isDirty).toBe(true)
      })
    })

    describe("updateObject", () => {
      test("should update object properties", () => {
        const { addObject, updateObject } = useModellerStore.getState()
        const id = addObject(createTestShape())

        updateObject(id, { name: "Updated Name" })

        const obj = useModellerStore.getState().objects[0]
        expect(obj.name).toBe("Updated Name")
      })

      test("should update timestamp", () => {
        const { addObject, updateObject } = useModellerStore.getState()
        const id = addObject(createTestShape())
        const originalTimestamp = useModellerStore.getState().objects[0].updatedAt

        // Wait a bit to ensure different timestamp
        updateObject(id, { name: "Updated" })

        const obj = useModellerStore.getState().objects[0]
        expect(obj.updatedAt).toBeGreaterThanOrEqual(originalTimestamp)
      })

      test("should not affect other objects", () => {
        const { addObject, updateObject } = useModellerStore.getState()
        const id1 = addObject(createTestShape({ name: "Shape 1" }))
        const id2 = addObject(createTestShape({ name: "Shape 2" }))

        updateObject(id1, { name: "Updated Shape 1" })

        const objects = useModellerStore.getState().objects
        expect(objects.find((o) => o.id === id2)?.name).toBe("Shape 2")
      })
    })

    describe("deleteObject", () => {
      test("should remove object from store", () => {
        const { addObject, deleteObject } = useModellerStore.getState()
        const id = addObject(createTestShape())

        deleteObject(id)

        expect(useModellerStore.getState().objects).toHaveLength(0)
      })

      test("should remove from selection", () => {
        const { addObject, select, deleteObject } = useModellerStore.getState()
        const id = addObject(createTestShape())
        select(id)

        deleteObject(id)

        expect(useModellerStore.getState().selectedIds).not.toContain(id)
      })
    })

    describe("deleteSelected", () => {
      test("should delete all selected objects", () => {
        const { addObject, selectMultiple, deleteSelected } = useModellerStore.getState()
        const id1 = addObject(createTestShape({ name: "Shape 1" }))
        const id2 = addObject(createTestShape({ name: "Shape 2" }))
        addObject(createTestShape({ name: "Shape 3" }))

        selectMultiple([id1, id2])
        deleteSelected()

        const state = useModellerStore.getState()
        expect(state.objects).toHaveLength(1)
        expect(state.objects[0].name).toBe("Shape 3")
      })

      test("should clear selection", () => {
        const { addObject, selectMultiple, deleteSelected } = useModellerStore.getState()
        const id1 = addObject(createTestShape())
        const id2 = addObject(createTestShape())

        selectMultiple([id1, id2])
        deleteSelected()

        expect(useModellerStore.getState().selectedIds).toEqual([])
      })
    })

    describe("duplicateObject", () => {
      test("should create copy with new ID", () => {
        const { addObject, duplicateObject } = useModellerStore.getState()
        const id = addObject(createTestShape())

        const newId = duplicateObject(id)

        expect(newId).toBeDefined()
        expect(newId).not.toBe(id)
        expect(useModellerStore.getState().objects).toHaveLength(2)
      })

      test("should append (copy) to name", () => {
        const { addObject, duplicateObject } = useModellerStore.getState()
        const id = addObject(createTestShape({ name: "Original" }))

        const newId = duplicateObject(id)

        const duplicate = useModellerStore.getState().objects.find((o) => o.id === newId)
        expect(duplicate?.name).toBe("Original (copy)")
      })

      test("should offset position", () => {
        const { addObject, duplicateObject } = useModellerStore.getState()
        const id = addObject(
          createTestShape({
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
          })
        )

        const newId = duplicateObject(id)

        const duplicate = useModellerStore.getState().objects.find((o) => o.id === newId)
        expect(duplicate?.transform.position.x).toBe(1)
        expect(duplicate?.transform.position.z).toBe(1)
      })
    })
  })

  // ============================================================
  // Selection Tests
  // ============================================================

  describe("Selection", () => {
    describe("select", () => {
      test("should select single object", () => {
        const { addObject, select } = useModellerStore.getState()
        const id = addObject(createTestShape())

        select(id)

        expect(useModellerStore.getState().selectedIds).toEqual([id])
      })

      test("should replace selection without additive flag", () => {
        const { addObject, select } = useModellerStore.getState()
        const id1 = addObject(createTestShape())
        const id2 = addObject(createTestShape())

        select(id1)
        select(id2) // Not additive

        expect(useModellerStore.getState().selectedIds).toEqual([id2])
      })

      test("should add to selection with additive flag", () => {
        const { addObject, select } = useModellerStore.getState()
        const id1 = addObject(createTestShape())
        const id2 = addObject(createTestShape())

        select(id1)
        select(id2, true) // Additive

        const selectedIds = useModellerStore.getState().selectedIds
        expect(selectedIds).toContain(id1)
        expect(selectedIds).toContain(id2)
      })
    })

    describe("selectMultiple", () => {
      test("should select multiple objects", () => {
        const { addObject, selectMultiple } = useModellerStore.getState()
        const id1 = addObject(createTestShape())
        const id2 = addObject(createTestShape())

        selectMultiple([id1, id2])

        const selectedIds = useModellerStore.getState().selectedIds
        expect(selectedIds).toHaveLength(2)
      })
    })

    describe("selectAll", () => {
      test("should select all visible unlocked objects", () => {
        const { addObject, selectAll } = useModellerStore.getState()
        addObject(createTestShape())
        addObject(createTestShape())
        addObject(createTestShape({ locked: true }))

        selectAll()

        // Should select 2 (excluding locked)
        expect(useModellerStore.getState().selectedIds).toHaveLength(2)
      })
    })

    describe("deselectAll", () => {
      test("should clear selection", () => {
        const { addObject, selectMultiple, deselectAll } = useModellerStore.getState()
        const id1 = addObject(createTestShape())
        const id2 = addObject(createTestShape())
        selectMultiple([id1, id2])

        deselectAll()

        expect(useModellerStore.getState().selectedIds).toEqual([])
      })
    })

    describe("toggleSelection", () => {
      test("should toggle object selection", () => {
        const { addObject, toggleSelection } = useModellerStore.getState()
        const id = addObject(createTestShape())

        toggleSelection(id)
        expect(useModellerStore.getState().selectedIds).toContain(id)

        toggleSelection(id)
        expect(useModellerStore.getState().selectedIds).not.toContain(id)
      })
    })

    describe("selectByType", () => {
      test("should select all objects of given type", () => {
        const { addObject, selectByType } = useModellerStore.getState()
        addObject(createTestShape())
        addObject(createTestShape())
        addObject(createTestChannel())

        selectByType("shape")

        expect(useModellerStore.getState().selectedIds).toHaveLength(2)
      })
    })
  })

  // ============================================================
  // Transform Tests
  // ============================================================

  describe("Transform", () => {
    test("should set transform mode", () => {
      const { setTransformMode } = useModellerStore.getState()

      setTransformMode("rotate")

      expect(useModellerStore.getState().transformMode).toBe("rotate")
    })

    test("should set transform space", () => {
      const { setTransformSpace } = useModellerStore.getState()

      setTransformSpace("local")

      expect(useModellerStore.getState().transformSpace).toBe("local")
    })

    test("should set snap mode", () => {
      const { setSnapMode } = useModellerStore.getState()

      setSnapMode("vertex")

      expect(useModellerStore.getState().snapMode).toBe("vertex")
    })

    test("should transform selected objects", () => {
      const { addObject, select, transformSelected } = useModellerStore.getState()
      const id = addObject(createTestShape())
      select(id)

      transformSelected({ position: { x: 5, y: 10, z: 15 } })

      const obj = useModellerStore.getState().objects[0]
      expect(obj.transform.position).toEqual({ x: 5, y: 10, z: 15 })
    })
  })

  // ============================================================
  // Layer Tests
  // ============================================================

  describe("Layers", () => {
    test("should add new layer", () => {
      const { addLayer } = useModellerStore.getState()

      const id = addLayer("New Layer", "#ff0000")

      const state = useModellerStore.getState()
      expect(state.layers).toHaveLength(2)
      expect(state.layers.find((l) => l.id === id)?.name).toBe("New Layer")
    })

    test("should toggle layer visibility", () => {
      const { toggleLayerVisibility } = useModellerStore.getState()

      expect(useModellerStore.getState().layers[0].visible).toBe(true)

      toggleLayerVisibility("default")

      expect(useModellerStore.getState().layers[0].visible).toBe(false)
    })

    test("should not delete default layer", () => {
      const { deleteLayer } = useModellerStore.getState()

      deleteLayer("default")

      expect(useModellerStore.getState().layers).toHaveLength(1)
    })

    test("should move objects to default layer when layer deleted", () => {
      const { addLayer, addObject, deleteLayer } = useModellerStore.getState()
      const layerId = addLayer("Custom Layer")
      addObject(createTestShape({ layerId }))

      deleteLayer(layerId)

      const obj = useModellerStore.getState().objects[0]
      expect(obj.layerId).toBe("default")
    })
  })

  // ============================================================
  // Camera Tests
  // ============================================================

  describe("Camera", () => {
    test("should set camera view", () => {
      const { setCameraView } = useModellerStore.getState()

      setCameraView("top")

      const state = useModellerStore.getState()
      expect(state.cameraView).toBe("top")
      expect(state.cameraPosition.y).toBe(20)
    })

    test("should focus object", () => {
      const { addObject, focusObject } = useModellerStore.getState()
      const id = addObject(createTestShape())

      focusObject(id)

      const state = useModellerStore.getState()
      expect(state.focusObjectId).toBe(id)
      expect(state.selectedIds).toContain(id)
    })

    test("should clear focus", () => {
      const { addObject, focusObject, clearFocus } = useModellerStore.getState()
      const id = addObject(createTestShape())
      focusObject(id)

      clearFocus()

      expect(useModellerStore.getState().focusObjectId).toBeNull()
    })
  })

  // ============================================================
  // History Tests
  // ============================================================

  describe("History", () => {
    test("should save to history on add", () => {
      const { addObject } = useModellerStore.getState()

      addObject(createTestShape())

      const state = useModellerStore.getState()
      expect(state.history.length).toBeGreaterThan(0)
      expect(state.historyIndex).toBeGreaterThanOrEqual(0)
    })

    test("should undo last action", () => {
      const { addObject, undo } = useModellerStore.getState()

      // Add initial state to history
      useModellerStore.getState().saveToHistory("Initial")
      addObject(createTestShape())

      expect(useModellerStore.getState().objects).toHaveLength(1)

      undo()

      expect(useModellerStore.getState().objects).toHaveLength(0)
    })

    test("should redo undone action", () => {
      const { addObject, undo, redo } = useModellerStore.getState()

      useModellerStore.getState().saveToHistory("Initial")
      addObject(createTestShape())
      undo()

      expect(useModellerStore.getState().objects).toHaveLength(0)

      redo()

      expect(useModellerStore.getState().objects).toHaveLength(1)
    })

    test("should clear history", () => {
      const { addObject, clearHistory } = useModellerStore.getState()
      addObject(createTestShape())

      clearHistory()

      const state = useModellerStore.getState()
      expect(state.history).toEqual([])
      expect(state.historyIndex).toBe(-1)
    })
  })

  // ============================================================
  // Scene Management Tests
  // ============================================================

  describe("Scene Management", () => {
    test("should load scene data", () => {
      const { loadScene } = useModellerStore.getState()

      loadScene({
        objects: [
          { ...createTestShape(), id: "test-id", createdAt: 1000, updatedAt: 1000 } as ShapeObject,
        ],
        layers: [
          {
            id: "default",
            name: "Default",
            color: "#000",
            visible: true,
            locked: false,
            frozen: false,
            printable: true,
            order: 0,
          },
        ],
      })

      const state = useModellerStore.getState()
      expect(state.objects).toHaveLength(1)
      expect(state.isDirty).toBe(false)
    })

    test("should get scene data", () => {
      const { addObject, getSceneData } = useModellerStore.getState()
      addObject(createTestShape())

      const sceneData = getSceneData()

      expect(sceneData.objects).toHaveLength(1)
      expect(sceneData.layers).toHaveLength(1)
    })

    test("should mark clean", () => {
      const { addObject, markClean } = useModellerStore.getState()
      addObject(createTestShape())
      expect(useModellerStore.getState().isDirty).toBe(true)

      markClean()

      expect(useModellerStore.getState().isDirty).toBe(false)
      expect(useModellerStore.getState().lastSavedAt).toBeDefined()
    })

    test("should mark dirty", () => {
      const { markDirty } = useModellerStore.getState()

      markDirty()

      expect(useModellerStore.getState().isDirty).toBe(true)
    })
  })

  // ============================================================
  // Utility Tests
  // ============================================================

  describe("Utility", () => {
    test("should get object by ID", () => {
      const { addObject, getObjectById } = useModellerStore.getState()
      const id = addObject(createTestShape({ name: "Find Me" }))

      const obj = getObjectById(id)

      expect(obj?.name).toBe("Find Me")
    })

    test("should return undefined for invalid ID", () => {
      const { getObjectById } = useModellerStore.getState()

      const obj = getObjectById("nonexistent")

      expect(obj).toBeUndefined()
    })

    test("should get selected objects", () => {
      const { addObject, selectMultiple, getSelectedObjects } = useModellerStore.getState()
      const id1 = addObject(createTestShape({ name: "Selected 1" }))
      const id2 = addObject(createTestShape({ name: "Selected 2" }))
      addObject(createTestShape({ name: "Not Selected" }))
      selectMultiple([id1, id2])

      const selected = getSelectedObjects()

      expect(selected).toHaveLength(2)
    })

    test("should get objects by type", () => {
      const { addObject, getObjectsByType } = useModellerStore.getState()
      addObject(createTestShape())
      addObject(createTestShape())
      addObject(createTestChannel())

      const channels = getObjectsByType("channel")

      expect(channels).toHaveLength(1)
    })
  })

  // ============================================================
  // Reset Tests
  // ============================================================

  describe("Reset", () => {
    test("should reset to initial state", () => {
      const { addObject, select, setTransformMode, reset } = useModellerStore.getState()

      // Modify state
      const id = addObject(createTestShape())
      select(id)
      setTransformMode("rotate")

      // Reset
      reset()

      // Verify reset
      const state = useModellerStore.getState()
      expect(state.objects).toEqual([])
      expect(state.selectedIds).toEqual([])
      expect(state.transformMode).toBe("translate")
      expect(state.isDirty).toBe(false)
    })
  })
})
