/**
 * Drawing Store Tests - @cadhy/desktop
 *
 * Tests for the technical drawing store:
 * - Drawing CRUD operations
 * - View management
 * - Dimension management
 * - Annotation management
 * - Hatch management
 * - Persistence
 */

import { beforeEach, describe, expect, test } from "bun:test"
import type { Annotation, Dimension, Point2D, ProjectionResult, SheetConfig } from "@cadhy/types"
import { useDrawingStore } from "../core/stores/ST_drawing"

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  // Reset the store before each test
  useDrawingStore.getState().reset()
})

// Helper to create a sheet config
const createSheetConfig = (overrides?: Partial<SheetConfig>): SheetConfig => ({
  size: "A4",
  orientation: "landscape",
  units: "mm",
  scale: 1,
  margin: { top: 10, right: 10, bottom: 10, left: 10 },
  ...overrides,
})

// Helper to create a projection result
const createProjection = (overrides?: Partial<ProjectionResult>): ProjectionResult => ({
  lines: [{ start: { x: 0, y: 0 }, end: { x: 10, y: 10 }, line_type: "VisibleSharp" }],
  bounding_box: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } },
  view_type: "Front",
  label: "Front",
  ...overrides,
})

// ============================================================================
// INITIAL STATE
// ============================================================================

describe("Initial State", () => {
  test("starts with empty drawings", () => {
    const state = useDrawingStore.getState()
    expect(state.drawings).toEqual([])
    expect(state.activeDrawingId).toBeNull()
  })
})

// ============================================================================
// DRAWING CRUD
// ============================================================================

describe("Drawing CRUD", () => {
  test("createDrawing adds new drawing", () => {
    const sheetConfig = createSheetConfig()

    const id = useDrawingStore.getState().createDrawing("Test Drawing", sheetConfig, ["shape-1"])

    const state = useDrawingStore.getState()
    expect(id).toBeDefined()
    expect(state.drawings).toHaveLength(1)
    expect(state.drawings[0].name).toBe("Test Drawing")
    expect(state.drawings[0].sourceShapeIds).toEqual(["shape-1"])
  })

  test("createDrawing sets as active", () => {
    const id = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])

    expect(useDrawingStore.getState().activeDrawingId).toBe(id)
  })

  test("updateDrawing modifies drawing", () => {
    const id = useDrawingStore.getState().createDrawing("Original", createSheetConfig(), [])

    useDrawingStore.getState().updateDrawing(id, { name: "Updated" })

    expect(useDrawingStore.getState().drawings[0].name).toBe("Updated")
  })

  test("deleteDrawing removes drawing", () => {
    const id = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])

    useDrawingStore.getState().deleteDrawing(id)

    expect(useDrawingStore.getState().drawings).toHaveLength(0)
    expect(useDrawingStore.getState().activeDrawingId).toBeNull()
  })

  test("deleteDrawing sets next drawing as active", () => {
    const id1 = useDrawingStore.getState().createDrawing("First", createSheetConfig(), [])
    const id2 = useDrawingStore.getState().createDrawing("Second", createSheetConfig(), [])

    useDrawingStore.getState().setActiveDrawing(id1)
    useDrawingStore.getState().deleteDrawing(id1)

    expect(useDrawingStore.getState().activeDrawingId).toBe(id2)
  })

  test("getActiveDrawing returns correct drawing", () => {
    useDrawingStore.getState().createDrawing("First", createSheetConfig(), [])
    const id2 = useDrawingStore.getState().createDrawing("Second", createSheetConfig(), [])

    useDrawingStore.getState().setActiveDrawing(id2)

    const active = useDrawingStore.getState().getActiveDrawing()
    expect(active?.name).toBe("Second")
  })
})

// ============================================================================
// VIEW MANAGEMENT
// ============================================================================

describe("View Management", () => {
  test("addView adds view to drawing", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const projection = createProjection()

    const viewId = useDrawingStore.getState().addView(drawingId, "Front", projection, [100, 100])

    const state = useDrawingStore.getState()
    const drawing = state.drawings[0]
    expect(drawing.views).toHaveLength(1)
    expect(drawing.views[0].id).toBe(viewId)
    expect(drawing.views[0].projectionType).toBe("Front")
    expect(drawing.views[0].position).toEqual([100, 100])
  })

  test("removeView removes view from drawing", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const viewId = useDrawingStore.getState().addView(drawingId, "Front", createProjection())

    useDrawingStore.getState().removeView(drawingId, viewId)

    expect(useDrawingStore.getState().drawings[0].views).toHaveLength(0)
  })

  test("updateView modifies view properties", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const viewId = useDrawingStore.getState().addView(drawingId, "Front", createProjection())

    useDrawingStore.getState().updateView(drawingId, viewId, { visible: false })

    expect(useDrawingStore.getState().drawings[0].views[0].visible).toBe(false)
  })

  test("updateViewPosition updates position", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const viewId = useDrawingStore
      .getState()
      .addView(drawingId, "Front", createProjection(), [0, 0])

    useDrawingStore.getState().updateViewPosition(drawingId, viewId, [200, 150])

    expect(useDrawingStore.getState().drawings[0].views[0].position).toEqual([200, 150])
  })
})

// ============================================================================
// DIMENSION MANAGEMENT
// ============================================================================

describe("Dimension Management", () => {
  const createTestDimension = (overrides?: Partial<Dimension>): Dimension => ({
    type: "linear",
    point1: { x: 0, y: 0 },
    point2: { x: 10, y: 0 },
    textPosition: { x: 5, y: 5 },
    value: 10,
    dimensionLine: { start: { x: 0, y: 3 }, end: { x: 10, y: 3 } },
    extensionLines: [
      { start: { x: 0, y: 0 }, end: { x: 0, y: 3 } },
      { start: { x: 10, y: 0 }, end: { x: 10, y: 3 } },
    ],
    ...overrides,
  })

  test("addDimension adds dimension to drawing", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])

    useDrawingStore.getState().addDimension(drawingId, createTestDimension())

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.dimensions.dimensions).toHaveLength(1)
  })

  test("removeDimension removes dimension by index", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    useDrawingStore.getState().addDimension(drawingId, createTestDimension({ value: 10 }))
    useDrawingStore.getState().addDimension(drawingId, createTestDimension({ value: 20 }))

    useDrawingStore.getState().removeDimension(drawingId, 0)

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.dimensions.dimensions).toHaveLength(1)
    expect(drawing.dimensions.dimensions[0].value).toBe(20)
  })

  test("updateDimension modifies dimension", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    useDrawingStore.getState().addDimension(drawingId, createTestDimension({ value: 10 }))

    useDrawingStore.getState().updateDimension(drawingId, 0, { value: 25 })

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.dimensions.dimensions[0].value).toBe(25)
  })

  test("updateDimensionConfig updates config", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])

    useDrawingStore.getState().updateDimensionConfig(drawingId, { precision: 3, arrowSize: 5 })

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.dimensions.config.precision).toBe(3)
    expect(drawing.dimensions.config.arrowSize).toBe(5)
  })
})

// ============================================================================
// ANNOTATION MANAGEMENT
// ============================================================================

describe("Annotation Management", () => {
  const createTestAnnotation = (overrides?: Partial<Annotation>): Annotation => ({
    id: `ann-${Date.now()}`,
    type: "text",
    content: "Test annotation",
    position: { x: 50, y: 50 },
    style: { fontSize: 12, color: "#000000" },
    ...overrides,
  })

  test("addAnnotation adds annotation to drawing", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])

    useDrawingStore.getState().addAnnotation(drawingId, createTestAnnotation())

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.annotations.annotations).toHaveLength(1)
  })

  test("removeAnnotation removes annotation by id", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const ann = createTestAnnotation({ id: "ann-to-remove" })
    useDrawingStore.getState().addAnnotation(drawingId, ann)

    useDrawingStore.getState().removeAnnotation(drawingId, "ann-to-remove")

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.annotations.annotations).toHaveLength(0)
  })

  test("updateAnnotation modifies annotation", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const ann = createTestAnnotation({ id: "ann-1", content: "Original" })
    useDrawingStore.getState().addAnnotation(drawingId, ann)

    useDrawingStore.getState().updateAnnotation(drawingId, "ann-1", { content: "Updated" })

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.annotations.annotations[0].content).toBe("Updated")
  })
})

// ============================================================================
// HATCH MANAGEMENT
// ============================================================================

describe("Hatch Management", () => {
  const createBoundary = (): Point2D[] => [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ]

  test("addHatch adds hatch region", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])

    const hatchId = useDrawingStore.getState().addHatch(drawingId, createBoundary())

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.hatches).toHaveLength(1)
    expect(drawing.hatches[0].id).toBe(hatchId)
  })

  test("removeHatch removes hatch region", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const hatchId = useDrawingStore.getState().addHatch(drawingId, createBoundary())

    useDrawingStore.getState().removeHatch(drawingId, hatchId)

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.hatches).toHaveLength(0)
  })

  test("updateHatchConfig modifies hatch config", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const hatchId = useDrawingStore.getState().addHatch(drawingId, createBoundary())

    useDrawingStore.getState().updateHatchConfig(drawingId, hatchId, { angle: 90, spacing: 5 })

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.hatches[0].config.angle).toBe(90)
    expect(drawing.hatches[0].config.spacing).toBe(5)
  })
})

// ============================================================================
// SHEET CONFIGURATION
// ============================================================================

describe("Sheet Configuration", () => {
  test("updateSheetConfig modifies sheet config", () => {
    const drawingId = useDrawingStore
      .getState()
      .createDrawing("Test", createSheetConfig({ scale: 1 }), [])

    useDrawingStore.getState().updateSheetConfig(drawingId, { scale: 2, orientation: "portrait" })

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.sheetConfig.scale).toBe(2)
    expect(drawing.sheetConfig.orientation).toBe("portrait")
  })
})

// ============================================================================
// PERSISTENCE
// ============================================================================

describe("Persistence", () => {
  test("getDrawingsData returns serializable data", () => {
    useDrawingStore.getState().createDrawing("Test", createSheetConfig(), ["shape-1"])

    const data = useDrawingStore.getState().getDrawingsData()

    expect(data.drawings).toHaveLength(1)
    expect(data.activeDrawingId).toBeDefined()
  })

  test("loadDrawings restores state", () => {
    const id = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), ["shape-1"])
    const data = useDrawingStore.getState().getDrawingsData()

    // Reset and reload
    useDrawingStore.getState().reset()
    useDrawingStore.getState().loadDrawings(data)

    const state = useDrawingStore.getState()
    expect(state.drawings).toHaveLength(1)
    expect(state.drawings[0].name).toBe("Test")
    expect(state.activeDrawingId).toBe(id)
  })

  test("loadDrawings handles null data", () => {
    useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])

    useDrawingStore.getState().loadDrawings(null as any)

    expect(useDrawingStore.getState().drawings).toEqual([])
    expect(useDrawingStore.getState().activeDrawingId).toBeNull()
  })

  test("reset clears all state", () => {
    useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])

    useDrawingStore.getState().reset()

    expect(useDrawingStore.getState().drawings).toEqual([])
    expect(useDrawingStore.getState().activeDrawingId).toBeNull()
  })
})

// ============================================================================
// VIEW DEPENDENCIES
// ============================================================================

describe("View Dependencies", () => {
  test("addDependency creates dependency between views", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const view1 = useDrawingStore.getState().addView(drawingId, "Front", createProjection())
    const view2 = useDrawingStore.getState().addView(drawingId, "Top", createProjection())

    useDrawingStore.getState().addDependency(drawingId, view1, view2, "orthogonal")

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.dependencies).toHaveLength(1)
    expect(drawing.dependencies[0].sourceId).toBe(view1)
    expect(drawing.dependencies[0].derivedId).toBe(view2)
  })

  test("removeDependency removes dependency", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const view1 = useDrawingStore.getState().addView(drawingId, "Front", createProjection())
    const view2 = useDrawingStore.getState().addView(drawingId, "Top", createProjection())
    useDrawingStore.getState().addDependency(drawingId, view1, view2, "orthogonal")

    useDrawingStore.getState().removeDependency(drawingId, view1, view2)

    const drawing = useDrawingStore.getState().drawings[0]
    expect(drawing.dependencies).toHaveLength(0)
  })

  test("getDependentViews returns correct views", () => {
    const drawingId = useDrawingStore.getState().createDrawing("Test", createSheetConfig(), [])
    const view1 = useDrawingStore.getState().addView(drawingId, "Front", createProjection())
    const view2 = useDrawingStore.getState().addView(drawingId, "Top", createProjection())
    const view3 = useDrawingStore.getState().addView(drawingId, "Right", createProjection())
    useDrawingStore.getState().addDependency(drawingId, view1, view2, "orthogonal")
    useDrawingStore.getState().addDependency(drawingId, view1, view3, "orthogonal")

    const dependents = useDrawingStore.getState().getDependentViews(drawingId, view1)

    expect(dependents).toContain(view2)
    expect(dependents).toContain(view3)
    expect(dependents).toHaveLength(2)
  })
})
