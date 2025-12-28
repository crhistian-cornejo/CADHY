/**
 * Sketch Store - CADHY
 *
 * Manages 2D sketch entities for parametric modeling:
 * - Sketch creation and management
 * - 2D geometry entities (lines, arcs, circles, rectangles, splines)
 * - Constraints (horizontal, vertical, coincident, tangent, etc.)
 * - Sketch planes (XY, XZ, YZ, or custom)
 * - Conversion to CAD backend shapes for extrusion/revolution
 *
 * This bridges the gap between interactive 2D drawing and 3D solid modeling.
 */

import { invoke } from "@tauri-apps/api/core"
import { nanoid } from "nanoid"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import * as CadService from "@/core/services/cad-service"

// =============================================================================
// TYPES - Sketch Geometry
// =============================================================================

/** 2D point in sketch coordinate system */
export interface SketchPoint {
  x: number
  y: number
}

/** Sketch plane orientation */
export type SketchPlaneType = "XY" | "XZ" | "YZ" | "custom"

/** Sketch plane definition */
export interface SketchPlane {
  type: SketchPlaneType
  /** Origin point in 3D space */
  origin: { x: number; y: number; z: number }
  /** Normal vector (for custom planes) */
  normal: { x: number; y: number; z: number }
  /** Up vector (for custom planes) */
  up: { x: number; y: number; z: number }
}

/** Entity types available in sketches */
export type SketchEntityType =
  | "line"
  | "arc"
  | "circle"
  | "rectangle"
  | "polygon"
  | "spline"
  | "point"
  | "ellipse"

/** Base sketch entity */
interface SketchEntityBase {
  id: string
  type: SketchEntityType
  /** Construction geometry (doesn't form solid profile) */
  isConstruction: boolean
  /** Locked from editing */
  isLocked: boolean
  /** Visual state */
  isSelected: boolean
  isHovered: boolean
}

/** Line entity - defined by start and end points */
export interface SketchLine extends SketchEntityBase {
  type: "line"
  start: SketchPoint
  end: SketchPoint
}

/** Arc entity - defined by center, radius, and angles */
export interface SketchArc extends SketchEntityBase {
  type: "arc"
  center: SketchPoint
  radius: number
  startAngle: number // radians
  endAngle: number // radians
}

/** Circle entity - defined by center and radius */
export interface SketchCircle extends SketchEntityBase {
  type: "circle"
  center: SketchPoint
  radius: number
}

/** Rectangle entity - defined by corner and dimensions */
export interface SketchRectangle extends SketchEntityBase {
  type: "rectangle"
  corner: SketchPoint
  width: number
  height: number
}

/** Polygon entity - defined by vertices */
export interface SketchPolygon extends SketchEntityBase {
  type: "polygon"
  points: SketchPoint[]
  isClosed: boolean
}

/** Spline entity - defined by control points */
export interface SketchSpline extends SketchEntityBase {
  type: "spline"
  controlPoints: SketchPoint[]
  degree: number
  isClosed: boolean
}

/** Point entity - for construction/reference */
export interface SketchPointEntity extends SketchEntityBase {
  type: "point"
  position: SketchPoint
}

/** Ellipse entity */
export interface SketchEllipse extends SketchEntityBase {
  type: "ellipse"
  center: SketchPoint
  majorRadius: number
  minorRadius: number
  rotation: number // radians
}

/** Union of all sketch entity types */
export type SketchEntity =
  | SketchLine
  | SketchArc
  | SketchCircle
  | SketchRectangle
  | SketchPolygon
  | SketchSpline
  | SketchPointEntity
  | SketchEllipse

// =============================================================================
// TYPES - Constraints
// =============================================================================

export type ConstraintType =
  | "horizontal"
  | "vertical"
  | "coincident"
  | "tangent"
  | "perpendicular"
  | "parallel"
  | "equal"
  | "concentric"
  | "fixed"
  | "distance"
  | "angle"
  | "radius"

export interface SketchConstraint {
  id: string
  type: ConstraintType
  entityIds: string[]
  /** Value for dimensional constraints */
  value?: number
  /** Is the constraint satisfied? */
  isSatisfied: boolean
}

// =============================================================================
// TYPES - Sketch
// =============================================================================

export type SketchTool =
  | "select"
  | "line"
  | "arc"
  | "circle"
  | "rectangle"
  | "polygon"
  | "spline"
  | "point"
  | "ellipse"
  | "trim"
  | "extend"
  | "offset"
  | "mirror"
  | "dimension"

export interface Sketch {
  id: string
  name: string
  /** The plane this sketch is drawn on */
  plane: SketchPlane
  /** All geometry entities in the sketch */
  entities: SketchEntity[]
  /** Geometric constraints */
  constraints: SketchConstraint[]
  /** Is the sketch currently being edited? */
  isActive: boolean
  /** Is the sketch fully constrained? */
  isFullyConstrained: boolean
  /** Backend shape ID if converted */
  backendShapeId: string | null
  /** Associated 3D object ID if extruded */
  parentObjectId: string | null
  /** Creation timestamp */
  createdAt: Date
  /** Last modification timestamp */
  updatedAt: Date
}

// =============================================================================
// TYPES - Store State
// =============================================================================

interface SketchStoreState {
  // Sketch collection
  sketches: Sketch[]
  activeSketchId: string | null

  // Tool state
  activeTool: SketchTool
  toolOptions: Record<string, unknown>

  // Selection
  selectedEntityIds: Set<string>

  // Grid and snapping
  gridSize: number
  snapToGrid: boolean
  snapToEndpoints: boolean
  snapToMidpoints: boolean
  snapToCenter: boolean
  snapToIntersections: boolean

  // View state
  viewOffset: SketchPoint
  viewZoom: number

  // Pending geometry (during creation)
  pendingPoints: SketchPoint[]
  isPendingClosed: boolean
}

interface SketchStoreActions {
  // Sketch management
  createSketch: (name: string, plane: SketchPlane) => string
  deleteSketch: (id: string) => void
  setActiveSketch: (id: string | null) => void
  getActiveSketch: () => Sketch | null
  updateSketch: (id: string, updates: Partial<Sketch>) => void

  // Entity management
  addEntity: (
    sketchId: string,
    entity: Omit<SketchEntity, "id" | "isSelected" | "isHovered">
  ) => string
  updateEntity: (sketchId: string, entityId: string, updates: Partial<SketchEntity>) => void
  deleteEntity: (sketchId: string, entityId: string) => void
  deleteSelectedEntities: (sketchId: string) => void

  // Selection
  selectEntity: (entityId: string, additive?: boolean) => void
  deselectEntity: (entityId: string) => void
  deselectAll: () => void
  setHovered: (entityId: string | null) => void

  // Tool management
  setTool: (tool: SketchTool) => void
  setToolOption: (key: string, value: unknown) => void

  // Grid and snapping
  setGridSize: (size: number) => void
  toggleSnapToGrid: () => void
  toggleSnapToEndpoints: () => void
  toggleSnapToMidpoints: () => void
  toggleSnapToCenter: () => void
  toggleSnapToIntersections: () => void

  // View
  setViewOffset: (offset: SketchPoint) => void
  setViewZoom: (zoom: number) => void

  // Pending geometry
  addPendingPoint: (point: SketchPoint) => void
  clearPendingPoints: () => void
  finalizePending: (closed: boolean) => void

  // Conversion to CAD backend
  convertToCurves: (sketchId: string) => Promise<string[]>
  createProfile: (sketchId: string) => Promise<string | null>
  extrudeSketch: (
    sketchId: string,
    height: number,
    direction?: { x: number; y: number; z: number }
  ) => Promise<string | null>
  revolveSketch: (
    sketchId: string,
    angle: number,
    axisOrigin: SketchPoint,
    axisDirection: { x: number; y: number; z: number }
  ) => Promise<string | null>

  // Persistence
  getSketchesData: () => { sketches: Sketch[]; activeSketchId: string | null }
  loadSketches: (data: { sketches: Sketch[]; activeSketchId: string | null }) => void
  reset: () => void
}

type SketchStore = SketchStoreState & SketchStoreActions

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_PLANE_XY: SketchPlane = {
  type: "XY",
  origin: { x: 0, y: 0, z: 0 },
  normal: { x: 0, y: 0, z: 1 },
  up: { x: 0, y: 1, z: 0 },
}

const DEFAULT_PLANE_XZ: SketchPlane = {
  type: "XZ",
  origin: { x: 0, y: 0, z: 0 },
  normal: { x: 0, y: 1, z: 0 },
  up: { x: 0, y: 0, z: 1 },
}

const DEFAULT_PLANE_YZ: SketchPlane = {
  type: "YZ",
  origin: { x: 0, y: 0, z: 0 },
  normal: { x: 1, y: 0, z: 0 },
  up: { x: 0, y: 0, z: 1 },
}

export const SKETCH_PLANES = {
  XY: DEFAULT_PLANE_XY,
  XZ: DEFAULT_PLANE_XZ,
  YZ: DEFAULT_PLANE_YZ,
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert sketch 2D point to 3D world coordinates based on plane
 */
export function sketchToWorld(
  point: SketchPoint,
  plane: SketchPlane
): { x: number; y: number; z: number } {
  const { origin, normal, up } = plane

  // Calculate right vector (cross product of up and normal)
  const right = {
    x: up.y * normal.z - up.z * normal.y,
    y: up.z * normal.x - up.x * normal.z,
    z: up.x * normal.y - up.y * normal.x,
  }

  // Transform 2D to 3D: origin + x*right + y*up
  return {
    x: origin.x + point.x * right.x + point.y * up.x,
    y: origin.y + point.x * right.y + point.y * up.y,
    z: origin.z + point.x * right.z + point.y * up.z,
  }
}

/**
 * Convert 3D world point to sketch 2D coordinates based on plane
 */
export function worldToSketch(
  worldPoint: { x: number; y: number; z: number },
  plane: SketchPlane
): SketchPoint {
  const { origin, normal, up } = plane

  // Calculate right vector
  const right = {
    x: up.y * normal.z - up.z * normal.y,
    y: up.z * normal.x - up.x * normal.z,
    z: up.x * normal.y - up.y * normal.x,
  }

  // Vector from origin to point
  const v = {
    x: worldPoint.x - origin.x,
    y: worldPoint.y - origin.y,
    z: worldPoint.z - origin.z,
  }

  // Project onto right and up vectors (dot products)
  return {
    x: v.x * right.x + v.y * right.y + v.z * right.z,
    y: v.x * up.x + v.y * up.y + v.z * up.z,
  }
}

/**
 * Snap a point to grid
 */
export function snapToGridPoint(point: SketchPoint, gridSize: number): SketchPoint {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  }
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useSketchStore = create<SketchStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    sketches: [],
    activeSketchId: null,
    activeTool: "select",
    toolOptions: {},
    selectedEntityIds: new Set(),
    gridSize: 10,
    snapToGrid: true,
    snapToEndpoints: true,
    snapToMidpoints: true,
    snapToCenter: true,
    snapToIntersections: true,
    viewOffset: { x: 0, y: 0 },
    viewZoom: 1,
    pendingPoints: [],
    isPendingClosed: false,

    // ========== SKETCH MANAGEMENT ==========

    createSketch: (name, plane) => {
      const id = nanoid()
      const sketch: Sketch = {
        id,
        name,
        plane,
        entities: [],
        constraints: [],
        isActive: true,
        isFullyConstrained: false,
        backendShapeId: null,
        parentObjectId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      set((state) => ({
        sketches: [...state.sketches, sketch],
        activeSketchId: id,
      }))

      return id
    },

    deleteSketch: (id) => {
      set((state) => ({
        sketches: state.sketches.filter((s) => s.id !== id),
        activeSketchId: state.activeSketchId === id ? null : state.activeSketchId,
      }))
    },

    setActiveSketch: (id) => {
      set((state) => ({
        sketches: state.sketches.map((s) => ({
          ...s,
          isActive: s.id === id,
        })),
        activeSketchId: id,
        selectedEntityIds: new Set(),
        pendingPoints: [],
      }))
    },

    getActiveSketch: () => {
      const { sketches, activeSketchId } = get()
      return sketches.find((s) => s.id === activeSketchId) ?? null
    },

    updateSketch: (id, updates) => {
      set((state) => ({
        sketches: state.sketches.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
        ),
      }))
    },

    // ========== ENTITY MANAGEMENT ==========

    addEntity: (sketchId, entityData) => {
      const id = nanoid()
      const entity = {
        ...entityData,
        id,
        isSelected: false,
        isHovered: false,
      } as SketchEntity

      set((state) => ({
        sketches: state.sketches.map((s) =>
          s.id === sketchId ? { ...s, entities: [...s.entities, entity], updatedAt: new Date() } : s
        ),
      }))

      return id
    },

    updateEntity: (sketchId, entityId, updates) => {
      set((state) => ({
        sketches: state.sketches.map((s) =>
          s.id === sketchId
            ? {
                ...s,
                entities: s.entities.map((e) => (e.id === entityId ? { ...e, ...updates } : e)),
                updatedAt: new Date(),
              }
            : s
        ),
      }))
    },

    deleteEntity: (sketchId, entityId) => {
      set((state) => ({
        sketches: state.sketches.map((s) =>
          s.id === sketchId
            ? {
                ...s,
                entities: s.entities.filter((e) => e.id !== entityId),
                updatedAt: new Date(),
              }
            : s
        ),
        selectedEntityIds: new Set([...state.selectedEntityIds].filter((id) => id !== entityId)),
      }))
    },

    deleteSelectedEntities: (sketchId) => {
      const { selectedEntityIds } = get()
      set((state) => ({
        sketches: state.sketches.map((s) =>
          s.id === sketchId
            ? {
                ...s,
                entities: s.entities.filter((e) => !selectedEntityIds.has(e.id)),
                updatedAt: new Date(),
              }
            : s
        ),
        selectedEntityIds: new Set(),
      }))
    },

    // ========== SELECTION ==========

    selectEntity: (entityId, additive = false) => {
      set((state) => {
        const newSelection = additive ? new Set(state.selectedEntityIds) : new Set<string>()
        newSelection.add(entityId)
        return { selectedEntityIds: newSelection }
      })
    },

    deselectEntity: (entityId) => {
      set((state) => {
        const newSelection = new Set(state.selectedEntityIds)
        newSelection.delete(entityId)
        return { selectedEntityIds: newSelection }
      })
    },

    deselectAll: () => {
      set({ selectedEntityIds: new Set() })
    },

    setHovered: (entityId) => {
      const { activeSketchId } = get()
      if (!activeSketchId) return

      set((state) => ({
        sketches: state.sketches.map((s) =>
          s.id === activeSketchId
            ? {
                ...s,
                entities: s.entities.map((e) => ({
                  ...e,
                  isHovered: e.id === entityId,
                })),
              }
            : s
        ),
      }))
    },

    // ========== TOOL MANAGEMENT ==========

    setTool: (tool) => {
      set({ activeTool: tool, pendingPoints: [] })
    },

    setToolOption: (key, value) => {
      set((state) => ({
        toolOptions: { ...state.toolOptions, [key]: value },
      }))
    },

    // ========== GRID AND SNAPPING ==========

    setGridSize: (size) => set({ gridSize: size }),
    toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
    toggleSnapToEndpoints: () => set((s) => ({ snapToEndpoints: !s.snapToEndpoints })),
    toggleSnapToMidpoints: () => set((s) => ({ snapToMidpoints: !s.snapToMidpoints })),
    toggleSnapToCenter: () => set((s) => ({ snapToCenter: !s.snapToCenter })),
    toggleSnapToIntersections: () => set((s) => ({ snapToIntersections: !s.snapToIntersections })),

    // ========== VIEW ==========

    setViewOffset: (offset) => set({ viewOffset: offset }),
    setViewZoom: (zoom) => set({ viewZoom: Math.max(0.1, Math.min(10, zoom)) }),

    // ========== PENDING GEOMETRY ==========

    addPendingPoint: (point) => {
      set((state) => ({
        pendingPoints: [...state.pendingPoints, point],
      }))
    },

    clearPendingPoints: () => {
      set({ pendingPoints: [], isPendingClosed: false })
    },

    finalizePending: (closed) => {
      const { pendingPoints, activeTool, activeSketchId, addEntity, clearPendingPoints } = get()
      if (!activeSketchId || pendingPoints.length < 2) {
        clearPendingPoints()
        return
      }

      // Create entity based on active tool
      if (activeTool === "line" && pendingPoints.length >= 2) {
        // Create line from first two points
        addEntity(activeSketchId, {
          type: "line",
          start: pendingPoints[0],
          end: pendingPoints[1],
          isConstruction: false,
          isLocked: false,
        })
      } else if (activeTool === "polygon" && pendingPoints.length >= 3) {
        addEntity(activeSketchId, {
          type: "polygon",
          points: [...pendingPoints],
          isClosed: closed,
          isConstruction: false,
          isLocked: false,
        })
      } else if (activeTool === "spline" && pendingPoints.length >= 2) {
        addEntity(activeSketchId, {
          type: "spline",
          controlPoints: [...pendingPoints],
          degree: Math.min(3, pendingPoints.length - 1),
          isClosed: closed,
          isConstruction: false,
          isLocked: false,
        })
      }

      clearPendingPoints()
    },

    // ========== CONVERSION TO CAD BACKEND ==========

    /**
     * Convert all sketch entities to CAD backend curves
     * Returns array of shape IDs
     */
    convertToCurves: async (sketchId) => {
      const sketch = get().sketches.find((s) => s.id === sketchId)
      if (!sketch) return []

      const shapeIds: string[] = []
      const plane = sketch.plane

      for (const entity of sketch.entities) {
        if (entity.isConstruction) continue

        try {
          let result: CadService.ShapeResult | null = null

          switch (entity.type) {
            case "line": {
              const start = sketchToWorld(entity.start, plane)
              const end = sketchToWorld(entity.end, plane)
              result = await CadService.createLine(start.x, start.y, start.z, end.x, end.y, end.z)
              break
            }
            case "circle": {
              const center = sketchToWorld(entity.center, plane)
              result = await CadService.createCircle(
                center.x,
                center.y,
                center.z,
                plane.normal.x,
                plane.normal.y,
                plane.normal.z,
                entity.radius
              )
              break
            }
            case "arc": {
              const center = sketchToWorld(entity.center, plane)
              result = await CadService.createArc(
                center.x,
                center.y,
                center.z,
                plane.normal.x,
                plane.normal.y,
                plane.normal.z,
                entity.radius,
                entity.startAngle,
                entity.endAngle
              )
              break
            }
            case "rectangle": {
              // Create rectangle as polygon with 4 points
              const p1 = entity.corner
              const p2 = { x: entity.corner.x + entity.width, y: entity.corner.y }
              const p3 = { x: entity.corner.x + entity.width, y: entity.corner.y + entity.height }
              const p4 = { x: entity.corner.x, y: entity.corner.y + entity.height }
              const points = [p1, p2, p3, p4].map((p) => sketchToWorld(p, plane))
              result = await CadService.createPolygon3D(points)
              break
            }
            case "polygon": {
              if (entity.points.length >= 3) {
                const points = entity.points.map((p) => sketchToWorld(p, plane))
                if (entity.isClosed) {
                  result = await CadService.createPolygon3D(points)
                } else {
                  result = await CadService.createPolyline3D(points)
                }
              }
              break
            }
            // Add more entity types as needed
          }

          if (result?.id) {
            shapeIds.push(result.id)
          }
        } catch (error) {
          console.error(`[SketchStore] Failed to convert entity ${entity.id}:`, error)
        }
      }

      return shapeIds
    },

    /**
     * Create a closed profile (face) from sketch entities
     * The sketch must form a closed loop
     */
    createProfile: async (sketchId) => {
      const curveIds = await get().convertToCurves(sketchId)
      if (curveIds.length === 0) return null

      try {
        // Make wire from curves
        const wireResult = await invoke<{ id: string }>("cad_make_wire", { shapeIds: curveIds })
        if (!wireResult?.id) return null

        // Make face from wire
        const faceResult = await invoke<{ id: string }>("cad_make_face", { wireId: wireResult.id })

        if (faceResult?.id) {
          get().updateSketch(sketchId, { backendShapeId: faceResult.id })
          return faceResult.id
        }

        return null
      } catch (error) {
        console.error("[SketchStore] Failed to create profile:", error)
        return null
      }
    },

    /**
     * Extrude sketch to create a 3D solid
     */
    extrudeSketch: async (sketchId, height, direction) => {
      const sketch = get().sketches.find((s) => s.id === sketchId)
      if (!sketch) return null

      try {
        // First create the profile
        const profileId = await get().createProfile(sketchId)
        if (!profileId) {
          console.error("[SketchStore] Failed to create profile for extrusion")
          return null
        }

        // Calculate extrusion direction
        const dir = direction ?? sketch.plane.normal
        const dx = dir.x * height
        const dy = dir.y * height
        const dz = dir.z * height

        // Extrude the profile
        const result = await CadService.extrude(profileId, dx, dy, dz)

        if (result?.id) {
          return result.id
        }

        return null
      } catch (error) {
        console.error("[SketchStore] Failed to extrude sketch:", error)
        return null
      }
    },

    /**
     * Revolve sketch around an axis
     */
    revolveSketch: async (sketchId, angle, axisOrigin, axisDirection) => {
      const sketch = get().sketches.find((s) => s.id === sketchId)
      if (!sketch) return null

      try {
        const profileId = await get().createProfile(sketchId)
        if (!profileId) return null

        const origin = sketchToWorld(axisOrigin, sketch.plane)

        const result = await CadService.revolve(
          profileId,
          origin.x,
          origin.y,
          origin.z,
          axisDirection.x,
          axisDirection.y,
          axisDirection.z,
          angle
        )

        return result?.id ?? null
      } catch (error) {
        console.error("[SketchStore] Failed to revolve sketch:", error)
        return null
      }
    },

    // ========== PERSISTENCE ==========

    getSketchesData: () => {
      const { sketches, activeSketchId } = get()
      return { sketches, activeSketchId }
    },

    loadSketches: (data) => {
      if (!data) {
        set({ sketches: [], activeSketchId: null })
        return
      }
      set({
        sketches: data.sketches ?? [],
        activeSketchId: data.activeSketchId ?? null,
      })
    },

    reset: () => {
      set({
        sketches: [],
        activeSketchId: null,
        selectedEntityIds: new Set(),
        pendingPoints: [],
        activeTool: "select",
      })
    },
  }))
)

// =============================================================================
// SELECTORS
// =============================================================================

export const useActiveSketch = () => useSketchStore((s) => s.getActiveSketch())
export const useSketchTool = () => useSketchStore((s) => s.activeTool)
export const useSelectedEntities = () => useSketchStore((s) => s.selectedEntityIds)
export const usePendingPoints = () => useSketchStore((s) => s.pendingPoints)
