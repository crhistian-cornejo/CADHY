/**
 * Drawing Store - CADHY
 *
 * Manages technical drawings (planos técnicos) state:
 * - Create, update, delete drawings
 * - Manage views within drawings
 * - Handle sheet configuration
 */

import type {
  Annotation,
  AnnotationSet,
  Dimension,
  DimensionSet,
  Drawing,
  DrawingView,
  ProjectionResult,
  ProjectionType,
  SheetConfig,
} from "@cadhy/types"
import { createDefaultAnnotationSet } from "@cadhy/types"
import { invoke } from "@tauri-apps/api/core"
import { nanoid } from "nanoid"
import { create } from "zustand"

const DEFAULT_LINE_WIDTHS = {
  visible: 0.5,
  hidden: 0.25,
  dimension: 0.25,
  centerline: 0.18,
  section: 0.7,
} as const

// =============================================================================
// TYPES
// =============================================================================

/** Serialized drawings data for persistence */
export interface DrawingsData {
  drawings: Drawing[]
  activeDrawingId: string | null
}

interface DrawingStore {
  // State
  drawings: Drawing[]
  activeDrawingId: string | null

  // Actions - Persistence
  getDrawingsData: () => DrawingsData
  loadDrawings: (data: DrawingsData) => void
  reset: () => void

  // Actions - Drawing management
  createDrawing: (name: string, sheetConfig: SheetConfig, sourceShapeIds: string[]) => string
  updateDrawing: (id: string, updates: Partial<Drawing>) => void
  deleteDrawing: (id: string) => void
  setActiveDrawing: (id: string | null) => void
  getActiveDrawing: () => Drawing | null

  // Actions - View management
  addView: (
    drawingId: string,
    projectionType: ProjectionType,
    projection: ProjectionResult,
    position?: [number, number]
  ) => string
  removeView: (drawingId: string, viewId: string) => void
  updateView: (drawingId: string, viewId: string, updates: Partial<DrawingView>) => void
  updateViewPosition: (drawingId: string, viewId: string, position: [number, number]) => void

  // Actions - Sheet configuration
  updateSheetConfig: (drawingId: string, config: Partial<SheetConfig>) => void

  // Actions - Dimension management
  addDimension: (drawingId: string, dimension: Dimension) => void
  removeDimension: (drawingId: string, dimensionIndex: number) => void
  updateDimension: (drawingId: string, dimensionIndex: number, updates: Partial<Dimension>) => void
  updateDimensionConfig: (drawingId: string, config: Partial<DimensionSet["config"]>) => void

  // Actions - Annotation management
  addAnnotation: (drawingId: string, annotation: Annotation) => void
  removeAnnotation: (drawingId: string, annotationId: string) => void
  updateAnnotation: (drawingId: string, annotationId: string, updates: Partial<Annotation>) => void
  updateAnnotationStyle: (drawingId: string, style: Partial<AnnotationSet["defaultStyle"]>) => void

  // Actions - Tauri commands (async)
  generateProjection: (
    shapeId: string,
    viewType: ProjectionType,
    scale: number
  ) => Promise<ProjectionResult>
  generateStandardViews: (shapeId: string, scale: number) => Promise<ProjectionResult[]>
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  // Initial state
  drawings: [],
  activeDrawingId: null,

  // ========== PERSISTENCE ==========

  // Get drawings data for saving to project
  getDrawingsData: () => {
    const state = get()
    return {
      drawings: state.drawings,
      activeDrawingId: state.activeDrawingId,
    }
  },

  // Load drawings from project data
  loadDrawings: (data) => {
    if (!data) {
      set({ drawings: [], activeDrawingId: null })
      return
    }
    set({
      drawings: data.drawings || [],
      activeDrawingId: data.activeDrawingId || null,
    })
  },

  // Reset drawings (when closing project or creating new)
  reset: () => {
    set({ drawings: [], activeDrawingId: null })
  },

  // ========== DRAWING MANAGEMENT ==========

  // Create a new drawing
  createDrawing: (name, sheetConfig, sourceShapeIds) => {
    const id = nanoid()
    const now = Date.now()

    const drawing: Drawing = {
      id,
      name,
      sheetConfig: {
        ...sheetConfig,
        lineWidths: sheetConfig.lineWidths ?? DEFAULT_LINE_WIDTHS,
      },
      views: [],
      dimensions: {
        dimensions: [],
        config: {
          offset: 10.0,
          extensionGap: 2.0,
          extensionOvershoot: 2.0,
          arrowSize: 3.0,
          textHeight: 3.5,
          precision: 2,
          unit: sheetConfig.units || "mm",
          showUnit: false,
          arrowStyle: "Filled",
        },
      },
      annotations: createDefaultAnnotationSet(),
      sourceShapeIds,
      createdAt: now,
      updatedAt: now,
    }

    set((state) => ({
      drawings: [...state.drawings, drawing],
      activeDrawingId: id,
    }))

    return id
  },

  // Update a drawing
  updateDrawing: (id, updates) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === id
          ? {
              ...d,
              ...updates,
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Delete a drawing
  deleteDrawing: (id) => {
    set((state) => {
      const newDrawings = state.drawings.filter((d) => d.id !== id)
      const newActiveId =
        state.activeDrawingId === id
          ? newDrawings.length > 0
            ? newDrawings[0].id
            : null
          : state.activeDrawingId

      return {
        drawings: newDrawings,
        activeDrawingId: newActiveId,
      }
    })
  },

  // Set active drawing
  setActiveDrawing: (id) => {
    set({ activeDrawingId: id })
  },

  // Get active drawing
  getActiveDrawing: () => {
    const state = get()
    if (!state.activeDrawingId) return null
    return state.drawings.find((d) => d.id === state.activeDrawingId) ?? null
  },

  // Add a view to a drawing
  addView: (drawingId, projectionType, projection, position = [0, 0]) => {
    const viewId = nanoid()

    const view: DrawingView = {
      id: viewId,
      projectionType,
      projection,
      position,
      visible: true,
    }

    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              views: [...d.views, view],
              updatedAt: Date.now(),
            }
          : d
      ),
    }))

    return viewId
  },

  // Remove a view from a drawing
  removeView: (drawingId, viewId) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              views: d.views.filter((v) => v.id !== viewId),
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Update a view
  updateView: (drawingId, viewId, updates) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              views: d.views.map((v) => (v.id === viewId ? { ...v, ...updates } : v)),
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Update view position
  updateViewPosition: (drawingId, viewId, position) => {
    get().updateView(drawingId, viewId, { position })
  },

  // Update sheet configuration
  updateSheetConfig: (drawingId, config) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              sheetConfig: {
                ...d.sheetConfig,
                ...config,
              },
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Add a dimension to a drawing
  addDimension: (drawingId, dimension) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              dimensions: {
                ...d.dimensions,
                dimensions: [...d.dimensions.dimensions, dimension],
              },
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Remove a dimension from a drawing
  removeDimension: (drawingId, dimensionIndex) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              dimensions: {
                ...d.dimensions,
                dimensions: d.dimensions.dimensions.filter((_, i) => i !== dimensionIndex),
              },
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Update a dimension
  updateDimension: (drawingId, dimensionIndex, updates) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              dimensions: {
                ...d.dimensions,
                dimensions: d.dimensions.dimensions.map((dim, i) =>
                  i === dimensionIndex ? { ...dim, ...updates } : dim
                ),
              },
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Update dimension configuration
  updateDimensionConfig: (drawingId, config) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              dimensions: {
                ...d.dimensions,
                config: {
                  ...d.dimensions.config,
                  ...config,
                },
              },
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // ========== ANNOTATION MANAGEMENT ==========

  addAnnotation: (drawingId, annotation) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              annotations: {
                ...d.annotations,
                annotations: [...(d.annotations?.annotations || []), annotation],
              },
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  removeAnnotation: (drawingId, annotationId) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              annotations: {
                ...d.annotations,
                annotations: (d.annotations?.annotations || []).filter(
                  (a) => a.id !== annotationId
                ),
              },
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  updateAnnotation: (drawingId, annotationId, updates) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              annotations: {
                ...d.annotations,
                annotations: (d.annotations?.annotations || []).map((a) =>
                  a.id === annotationId ? { ...a, ...updates } : a
                ),
              },
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  updateAnnotationStyle: (drawingId, style) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              annotations: {
                ...d.annotations,
                defaultStyle: {
                  ...(d.annotations?.defaultStyle || {}),
                  ...style,
                },
              },
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Generate a projection via Tauri command
  generateProjection: async (shapeId, viewType, scale) => {
    const result = await invoke<{
      projection: ProjectionResult
      shape_id: string
    }>("drawing_create_projection", {
      shapeId,
      viewType,
      scale,
    })

    return result.projection
  },

  // Generate standard views via Tauri command
  generateStandardViews: async (shapeId, scale) => {
    const result = await invoke<{
      projections: ProjectionResult[]
      shape_id: string
    }>("drawing_generate_standard_views", {
      shapeId,
      scale,
    })

    return result.projections
  },
}))
