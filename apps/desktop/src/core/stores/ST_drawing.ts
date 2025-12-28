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
  AutoRegenerateConfig,
  Dimension,
  DimensionSet,
  Drawing,
  DrawingView,
  HatchConfig,
  HatchRegion,
  Point2D,
  ProjectionResult,
  ProjectionType,
  SectionView,
  SectionViewConfig,
  SectionViewResult,
  SheetConfig,
  ViewDependency,
  ViewLabelConfig,
  ViewRelationship,
} from "@cadhy/types"
import {
  createDefaultAnnotationSet,
  DEFAULT_AUTO_REGENERATE_CONFIG,
  DEFAULT_HATCH_CONFIG,
} from "@cadhy/types"
import { invoke } from "@tauri-apps/api/core"
import { nanoid } from "nanoid"
import { create } from "zustand"
import { analyze as analyzeShape, shapeExists } from "@/core/services/cad-service"
import { shapeIdMap } from "@/lib/hooks/use-kernel"
import { getModelMetersToDrawingUnitsFactor } from "@/lib/utils/UT_drawing_units"

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
  regenerateView: (drawingId: string, viewId: string) => Promise<boolean>
  regenerateAllViews: (drawingId: string) => Promise<number>
  updateAllViewLabels: (drawingId: string, labelConfig: Partial<ViewLabelConfig>) => void

  // Actions - Sheet configuration
  updateSheetConfig: (drawingId: string, config: Partial<SheetConfig>) => void

  // Actions - Dimension management
  addDimension: (drawingId: string, dimension: Dimension) => void
  removeDimension: (drawingId: string, dimensionIndex: number) => void
  updateDimension: (drawingId: string, dimensionIndex: number, updates: Partial<Dimension>) => void
  updateDimensionConfig: (drawingId: string, config: Partial<DimensionSet["config"]>) => void
  scaleDimensions: (drawingId: string, scaleFactor: number) => void

  // Actions - Annotation management
  addAnnotation: (drawingId: string, annotation: Annotation) => void
  removeAnnotation: (drawingId: string, annotationId: string) => void
  updateAnnotation: (drawingId: string, annotationId: string, updates: Partial<Annotation>) => void
  updateAnnotationStyle: (drawingId: string, style: Partial<AnnotationSet["defaultStyle"]>) => void

  // Actions - Hatch management
  addHatch: (
    drawingId: string,
    boundary: Point2D[],
    config?: Partial<HatchConfig>,
    viewId?: string
  ) => string
  removeHatch: (drawingId: string, hatchId: string) => void
  updateHatch: (drawingId: string, hatchId: string, updates: Partial<HatchRegion>) => void
  updateHatchConfig: (drawingId: string, hatchId: string, config: Partial<HatchConfig>) => void

  // Actions - Section view management
  addSectionView: (
    drawingId: string,
    config: SectionViewConfig,
    result: SectionViewResult,
    position?: [number, number]
  ) => string
  removeSectionView: (drawingId: string, sectionId: string) => void
  updateSectionView: (drawingId: string, sectionId: string, updates: Partial<SectionView>) => void
  updateSectionViewPosition: (
    drawingId: string,
    sectionId: string,
    position: [number, number]
  ) => void

  // Actions - View dependencies
  addDependency: (
    drawingId: string,
    sourceId: string,
    derivedId: string,
    relationship: ViewRelationship
  ) => void
  removeDependency: (drawingId: string, sourceId: string, derivedId: string) => void
  getDependentViews: (drawingId: string, sourceId: string) => string[]
  setAutoRegenerate: (drawingId: string, config: Partial<AutoRegenerateConfig>) => void
  getAutoRegenerateConfig: (drawingId: string) => AutoRegenerateConfig

  // Actions - Model change handling (for auto-update)
  /**
   * Called when a 3D model changes. Regenerates all dependent views.
   * @param shapeId - The backend shape ID that changed
   * @returns Number of views regenerated
   */
  onModelChanged: (shapeId: string) => Promise<number>

  // Actions - Tauri commands (async)
  generateProjection: (
    shapeId: string,
    viewType: ProjectionType,
    scale: number
  ) => Promise<ProjectionResult>
  generateStandardViews: (shapeId: string, scale: number) => Promise<ProjectionResult[]>
  generateSectionView: (shapeId: string, config: SectionViewConfig) => Promise<SectionViewResult>
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
      hatches: [],
      sectionViews: [],
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

    // DEBUG: Log projection being stored
    /* PERF: console.log("[drawing-store] addView - storing projection:", {
      viewId,
      projectionType,
      lineCount: projection?.lines?.length ?? 0,
      hasLines: !!projection?.lines,
      isLinesArray: Array.isArray(projection?.lines),
      label: projection?.label,
      bbox: projection?.bounding_box,
    }) */

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
    // DEBUG: Log when projection is being updated
    if (updates.projection) {
      const proj = updates.projection
      /* PERF: console.log("[drawing-store] updateView - updating projection:", {
        viewId,
        lineCount: proj?.lines?.length ?? 0,
        hasLines: !!proj?.lines,
        isLinesArray: Array.isArray(proj?.lines),
        label: proj?.label,
        bbox: proj?.bounding_box,
      }) */
    }

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

  // Regenerate a view's projection using the current backend shape
  // This is useful when the projection was generated with an outdated/wrong shape
  regenerateView: async (drawingId, viewId) => {
    const drawing = get().drawings.find((d) => d.id === drawingId)
    if (!drawing) {
      console.error("[drawing-store] Drawing not found:", drawingId)
      return false
    }

    const view = drawing.views.find((v) => v.id === viewId)
    if (!view) {
      console.error("[drawing-store] View not found:", viewId)
      return false
    }

    // Get the source shape ID (scene object ID)
    const sourceShapeId = drawing.sourceShapeIds[0]
    if (!sourceShapeId) {
      console.error("[drawing-store] No source shape ID for drawing:", drawingId)
      return false
    }

    // Get the backend shape ID from the map
    const backendId = shapeIdMap.get(sourceShapeId)
    if (!backendId) {
      console.error(
        "[drawing-store] Backend shape ID not found for:",
        sourceShapeId,
        "Available mappings:",
        Array.from(shapeIdMap.entries())
      )
      return false
    }

    /* PERF: console.log("[drawing-store] Regenerating view:", {
      drawingId,
      viewId,
      projectionType: view.projectionType,
      sourceShapeId,
      backendId,
    }) */

    try {
      // IMPORTANT: Validate the shape exists and has valid geometry before projecting
      const exists = await shapeExists(backendId)
      if (!exists) {
        console.error(
          "[drawing-store] Shape does not exist in backend registry:",
          backendId,
          "- The shape may have been deleted or the BREP deserialization failed"
        )
        return false
      }

      // Analyze the shape to ensure it has valid geometry
      const analysis = await analyzeShape(backendId)
      /* PERF: console.log("[drawing-store] Shape analysis for projection:", {
        backendId,
        isValid: analysis.is_valid,
        faces: analysis.num_faces,
        edges: analysis.num_edges,
        solids: analysis.num_solids,
        volume: analysis.volume,
      }) */

      if (!analysis.is_valid || analysis.num_faces === 0 || analysis.num_edges === 0) {
        console.error("[drawing-store] Shape has invalid or empty geometry - cannot project:", {
          isValid: analysis.is_valid,
          faces: analysis.num_faces,
          edges: analysis.num_edges,
        })
        return false
      }

      // Generate new projection with current backend shape
      // Apply unit factor for correct scaling (model is in meters, drawing may be in mm/cm/etc)
      const unitFactor = getModelMetersToDrawingUnitsFactor(drawing.sheetConfig.units)
      let projection
      try {
        projection = await get().generateProjection(
          backendId,
          view.projectionType,
          drawing.sheetConfig.scale * unitFactor
        )
      } catch (projError) {
        // Handle projection generation errors more gracefully
        const errorMsg = projError instanceof Error ? projError.message : String(projError)
        console.error(
          `[drawing-store] Projection generation failed for view ${viewId} (${view.projectionType}):`,
          {
            error: errorMsg,
            backendId,
            sourceShapeId,
            drawingId,
            scale: drawing.sheetConfig.scale,
            unitFactor,
            shapeAnalysis: {
              isValid: analysis.is_valid,
              faces: analysis.num_faces,
              edges: analysis.num_edges,
              volume: analysis.volume,
            },
          }
        )
        // Don't update the view - keep the old projection
        return false
      }

      // Validate the projection has content
      if (!projection.lines || projection.lines.length === 0) {
        console.error("[drawing-store] Projection returned 0 lines - HLR may have failed:", {
          viewId,
          projectionType: view.projectionType,
          boundingBox: projection.bounding_box,
          backendId,
          sourceShapeId,
          shapeAnalysis: {
            isValid: analysis.is_valid,
            faces: analysis.num_faces,
            edges: analysis.num_edges,
            volume: analysis.volume,
          },
        })
        // Don't update the view with empty projection - keep the old one
        return false
      }

      // Validate the projection bounding box is reasonable
      // A degenerate projection (like the bounding box fallback) may have a very small area
      const bbox = projection.bounding_box
      const bboxWidth = bbox.max.x - bbox.min.x
      const bboxHeight = bbox.max.y - bbox.min.y
      const bboxArea = bboxWidth * bboxHeight

      // Compare with the shape's volume to detect degenerate projections
      // A proper projection should have a bounding box proportional to the shape
      const expectedMinArea = analysis.volume ** (2 / 3) * drawing.sheetConfig.scale * 0.01 // 1% of expected
      if (bboxArea < expectedMinArea && analysis.volume > 0.001) {
        console.warn(
          "[drawing-store] Projection bounding box seems too small - may be degenerate:",
          {
            viewId,
            projectionType: view.projectionType,
            bboxArea,
            expectedMinArea,
            shapeVolume: analysis.volume,
            lineCount: projection.lines.length,
          }
        )
        // Still update but warn - some views legitimately have small projections
      }

      // Update the view with new projection, keeping position and other settings
      get().updateView(drawingId, viewId, { projection })

      /* PERF: console.log("[drawing-store] View regenerated successfully:", {
        viewId,
        lineCount: projection.lines.length,
        boundingBox: projection.bounding_box,
      }) */

      return true
    } catch (error) {
      // Enhanced error logging with more context
      const errorMsg = error instanceof Error ? error.message : String(error)
      const isHLRError = errorMsg.includes("HLR projection produced no lines")
      const isShapeError =
        errorMsg.includes("shape") || errorMsg.includes("empty") || errorMsg.includes("invalid")

      console.error("[drawing-store] Failed to regenerate view:", {
        error: errorMsg,
        viewId,
        drawingId,
        projectionType: view?.projectionType,
        sourceShapeId,
        backendId: shapeIdMap.get(sourceShapeId || ""),
        errorType: isHLRError
          ? "HLR_PROJECTION_FAILED"
          : isShapeError
            ? "SHAPE_INVALID"
            : "UNKNOWN",
      })

      // If it's an HLR error, it means the shape exists but can't be projected
      // This could happen if:
      // - The shape is degenerate (zero volume, invalid geometry)
      // - The HLR algorithm failed for this specific view direction
      // - The shape was modified in a way that breaks projection
      if (isHLRError) {
        console.warn(
          `[drawing-store] HLR projection failed for view ${viewId}. ` +
            `The shape may be degenerate or the view direction may be problematic. ` +
            `Keeping existing projection if available.`
        )
      }

      return false
    }
  },

  // Regenerate all views in a drawing with updated projections
  // Returns the number of views successfully regenerated
  regenerateAllViews: async (drawingId) => {
    const drawing = get().drawings.find((d) => d.id === drawingId)
    if (!drawing) {
      console.error("[drawing-store] Drawing not found for regeneration:", drawingId)
      return 0
    }

    if (drawing.views.length === 0) {
      // PERF: console.log("[drawing-store] No views to regenerate in drawing:", drawingId)
      return 0
    }

    /* PERF: console.log("[drawing-store] Regenerating all views for drawing:", {
      drawingId,
      viewCount: drawing.views.length,
    }) */

    let successCount = 0
    for (const view of drawing.views) {
      const success = await get().regenerateView(drawingId, view.id)
      if (success) {
        successCount++
      }
    }

    /* PERF: console.log("[drawing-store] Regeneration complete:", {
      drawingId,
      successCount,
      totalViews: drawing.views.length,
    }) */

    return successCount
  },

  // Update all view labels with the same configuration
  updateAllViewLabels: (drawingId, labelConfig) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              views: d.views.map((v, index) => ({
                ...v,
                labelConfig: {
                  ...v.labelConfig,
                  ...labelConfig,
                  // Auto-assign numbers based on view order
                  number: labelConfig.showNumber !== false ? index + 1 : v.labelConfig?.number,
                },
              })),
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
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

  // Scale all dimensions by a factor (used when drawing scale changes)
  // Dimensions are stored in VIEW-LOCAL coordinates (relative to view center),
  // so we scale around (0,0) which is the projection center in local coords.
  // For dimensions without a viewId, we scale each one around its own view's
  // bounding box center if available.
  scaleDimensions: (drawingId, scaleFactor) => {
    const drawing = get().drawings.find((d) => d.id === drawingId)
    if (!drawing) return

    // Helper to scale a point around a center
    const scalePointAround = (p: { x: number; y: number }, cx: number, cy: number) => ({
      x: cx + (p.x - cx) * scaleFactor,
      y: cy + (p.y - cy) * scaleFactor,
    })

    // For dimensions in view-local coords, scale around the view's bounding box center
    // (which accounts for non-symmetric geometry)
    const getViewCenter = (viewId: string | undefined): { x: number; y: number } => {
      if (!viewId) return { x: 0, y: 0 }
      const view = drawing.views.find((v) => v.id === viewId)
      if (!view?.projection?.bounding_box) return { x: 0, y: 0 }
      const bb = view.projection.bounding_box
      return {
        x: (bb.min.x + bb.max.x) / 2,
        y: (bb.min.y + bb.max.y) / 2,
      }
    }

    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              dimensions: {
                ...d.dimensions,
                dimensions: d.dimensions.dimensions.map((dim) => {
                  // Get the center of the view this dimension belongs to
                  const center = getViewCenter(dim.viewId)
                  const scalePoint = (p: { x: number; y: number }) =>
                    scalePointAround(p, center.x, center.y)

                  return {
                    ...dim,
                    // Scale anchor points around view center
                    point1: scalePoint(dim.point1),
                    point2: dim.point2 ? scalePoint(dim.point2) : dim.point2,
                    point3: dim.point3 ? scalePoint(dim.point3) : dim.point3,
                    // Scale text position
                    textPosition: scalePoint(dim.textPosition),
                    // Scale dimension line
                    dimensionLine: {
                      ...dim.dimensionLine,
                      start: scalePoint(dim.dimensionLine.start),
                      end: scalePoint(dim.dimensionLine.end),
                    },
                    // Scale extension lines
                    extensionLines: dim.extensionLines.map((ext) => ({
                      start: scalePoint(ext.start),
                      end: scalePoint(ext.end),
                    })),
                    // Scale arc radius for angular dimensions
                    arcRadius: dim.arcRadius ? dim.arcRadius * scaleFactor : dim.arcRadius,
                    // Note: dimension value stays the same (it's the real-world measurement)
                  }
                }),
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

  // ========== HATCH MANAGEMENT ==========

  addHatch: (drawingId, boundary, config, viewId) => {
    const hatchId = nanoid()

    const hatch: HatchRegion = {
      id: hatchId,
      boundary,
      config: {
        ...DEFAULT_HATCH_CONFIG,
        ...config,
      },
      viewId,
      layer: "hatches",
      visible: true,
    }

    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              hatches: [...(d.hatches || []), hatch],
              updatedAt: Date.now(),
            }
          : d
      ),
    }))

    return hatchId
  },

  removeHatch: (drawingId, hatchId) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              hatches: (d.hatches || []).filter((h) => h.id !== hatchId),
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  updateHatch: (drawingId, hatchId, updates) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              hatches: (d.hatches || []).map((h) => (h.id === hatchId ? { ...h, ...updates } : h)),
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  updateHatchConfig: (drawingId, hatchId, config) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              hatches: (d.hatches || []).map((h) =>
                h.id === hatchId ? { ...h, config: { ...h.config, ...config } } : h
              ),
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Generate a projection via Tauri command
  generateProjection: async (shapeId, viewType, scale) => {
    /* PERF: console.log("[drawing-store] generateProjection calling backend:", {
      shapeId,
      viewType,
      scale,
    }) */

    const result = await invoke<{
      projection: ProjectionResult
      shape_id: string
    }>("drawing_create_projection", {
      shapeId,
      viewType,
      scale,
    })

    /* PERF: console.log("[drawing-store] generateProjection result:", {
      shape_id: result.shape_id,
      lineCount: result.projection?.lines?.length ?? 0,
      boundingBox: result.projection?.bounding_box,
      viewType: result.projection?.view_type,
      label: result.projection?.label,
    }) */

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

  // ========== SECTION VIEW MANAGEMENT ==========

  // Add a section view to a drawing
  addSectionView: (drawingId, config, result, position = [0, 0]) => {
    const sectionId = nanoid()

    const sectionView: SectionView = {
      id: sectionId,
      config,
      result,
      position,
      visible: true,
      sourceShapeId: result.shapeId,
    }

    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              sectionViews: [...(d.sectionViews || []), sectionView],
              updatedAt: Date.now(),
            }
          : d
      ),
    }))

    /* PERF: console.log("[drawing-store] Section view added:", {
      sectionId,
      label: result.label,
      numRegions: result.numRegions,
      totalHatchLines: result.totalHatchLines,
    }) */

    return sectionId
  },

  // Remove a section view from a drawing
  removeSectionView: (drawingId, sectionId) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              sectionViews: (d.sectionViews || []).filter((s) => s.id !== sectionId),
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Update a section view
  updateSectionView: (drawingId, sectionId, updates) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              sectionViews: (d.sectionViews || []).map((s) =>
                s.id === sectionId ? { ...s, ...updates } : s
              ),
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Update section view position
  updateSectionViewPosition: (drawingId, sectionId, position) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              sectionViews: (d.sectionViews || []).map((s) =>
                s.id === sectionId ? { ...s, position } : s
              ),
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // ========== VIEW DEPENDENCIES ==========

  // Add a dependency between views
  addDependency: (drawingId, sourceId, derivedId, relationship) => {
    set((state) => ({
      drawings: state.drawings.map((d) => {
        if (d.id !== drawingId) return d

        const dependencies = d.dependencies || []
        // Check if dependency already exists
        const exists = dependencies.some(
          (dep) => dep.sourceId === sourceId && dep.derivedId === derivedId
        )
        if (exists) return d

        const newDep: ViewDependency = {
          sourceId,
          derivedId,
          relationship,
          autoUpdate: true,
        }

        return {
          ...d,
          dependencies: [...dependencies, newDep],
          updatedAt: Date.now(),
        }
      }),
    }))
  },

  // Remove a dependency between views
  removeDependency: (drawingId, sourceId, derivedId) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              dependencies: (d.dependencies || []).filter(
                (dep) => !(dep.sourceId === sourceId && dep.derivedId === derivedId)
              ),
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Get all views that depend on a source (for cascade updates)
  getDependentViews: (drawingId, sourceId) => {
    const drawing = get().drawings.find((d) => d.id === drawingId)
    if (!drawing?.dependencies) return []

    return drawing.dependencies
      .filter((dep) => dep.sourceId === sourceId && dep.autoUpdate)
      .map((dep) => dep.derivedId)
  },

  // Configure auto-regeneration for a drawing
  setAutoRegenerate: (drawingId, config) => {
    set((state) => ({
      drawings: state.drawings.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              autoRegenerate: {
                ...(d.autoRegenerate || DEFAULT_AUTO_REGENERATE_CONFIG),
                ...config,
              },
              updatedAt: Date.now(),
            }
          : d
      ),
    }))
  },

  // Get auto-regenerate config for a drawing
  getAutoRegenerateConfig: (drawingId) => {
    const drawing = get().drawings.find((d) => d.id === drawingId)
    return drawing?.autoRegenerate || DEFAULT_AUTO_REGENERATE_CONFIG
  },

  // ========== MODEL CHANGE HANDLING ==========

  /**
   * Handle 3D model changes - regenerate all affected views.
   * This should be called when a shape in the modeller changes.
   */
  onModelChanged: async (shapeId) => {
    const state = get()
    let totalRegenerated = 0

    // Find all drawings that use this shape
    const affectedDrawings = state.drawings.filter((d) => d.sourceShapeIds.includes(shapeId))

    /* PERF: console.log("[drawing-store] Model changed, checking affected drawings:", {
      shapeId,
      affectedCount: affectedDrawings.length,
    }) */

    for (const drawing of affectedDrawings) {
      const config = drawing.autoRegenerate || DEFAULT_AUTO_REGENERATE_CONFIG

      if (!config.enabled) {
        // PERF: console.log("[drawing-store] Auto-regenerate disabled for drawing:", drawing.id)
        continue
      }

      // Determine which views to regenerate
      const viewsToRegenerate = config.onlyVisibleViews
        ? drawing.views.filter((v) => v.visible)
        : drawing.views

      /* PERF: console.log("[drawing-store] Regenerating views for drawing:", {
        drawingId: drawing.id,
        viewCount: viewsToRegenerate.length,
        onlyVisible: config.onlyVisibleViews,
      }) */

      // Regenerate each view
      for (const view of viewsToRegenerate) {
        const success = await state.regenerateView(drawing.id, view.id)
        if (success) {
          totalRegenerated++
        }
      }

      // Also regenerate section views
      for (const section of drawing.sectionViews || []) {
        if (config.onlyVisibleViews && !section.visible) continue

        try {
          const result = await state.generateSectionView(shapeId, section.config)
          state.updateSectionView(drawing.id, section.id, { result })
          totalRegenerated++
        } catch (error) {
          console.error("[drawing-store] Failed to regenerate section view:", error)
        }
      }
    }

    if (totalRegenerated > 0) {
      /* PERF: console.log("[drawing-store] Model change regeneration complete:", {
        shapeId,
        totalRegenerated,
      }) */
    }

    return totalRegenerated
  },

  // Generate section view via Tauri command
  generateSectionView: async (shapeId, config) => {
    /* PERF: console.log("[drawing-store] generateSectionView calling backend:", {
      shapeId,
      config,
    }) */

    // Convert frontend config to backend format
    const input = {
      shapeId,
      planeType: config.planeType,
      position: config.position,
      label: config.label,
      hatchAngle: config.hatchAngle ?? 45,
      hatchSpacing: config.hatchSpacing ?? 2.0,
    }

    const result = await invoke<SectionViewResult>("drawing_create_section_view", {
      input,
    })

    /* PERF: console.log("[drawing-store] generateSectionView result:", {
      label: result.label,
      numRegions: result.numRegions,
      totalHatchLines: result.totalHatchLines,
      boundingBox: result.boundingBox,
    }) */

    return result
  },
}))
