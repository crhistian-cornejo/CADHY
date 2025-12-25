/**
 * Viewport2D Component - CADHY
 *
 * 2D technical drawing viewport for rendering projections and dimensions.
 * Uses HTML5 Canvas for rendering.
 */

import type {
  Dimension,
  DrawingView,
  Line2D,
  LineType,
  Point2D,
  ProjectionType,
} from "@cadhy/types"
import { Button, Popover, PopoverContent, PopoverTrigger } from "@cadhy/ui"
import { Add01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { shapeIdMap } from "@/hooks/use-cad"
import { useDimensioningStore } from "@/stores/dimensioning-store"
import { useDrawingStore } from "@/stores/drawing-store"
import {
  createAlignedDimension,
  createHorizontalDimension,
  createVerticalDimension,
  formatDimensionValue,
  pointToLineDistance,
} from "@/utils/dimension-helpers"
import { getModelMetersToDrawingUnitsFactor } from "@/utils/drawing-units"

// =============================================================================
// TYPES
// =============================================================================

interface Viewport2DProps {
  className?: string
  drawingId: string | null
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get color for a line type
 */
function getLineColor(lineType: LineType): string {
  switch (lineType) {
    case "VisibleSharp":
    case "VisibleOutline":
      return "#ffffff" // White for visible lines
    case "VisibleSmooth":
      return "#e0e0e0" // Light gray for smooth transitions
    case "HiddenSharp":
    case "HiddenSmooth":
    case "HiddenOutline":
      return "#666666" // Gray for hidden lines
    case "SectionCut":
      return "#ff6b6b" // Red for section cuts
    default:
      return "#ffffff"
  }
}

/**
 * Get dash array for a line type
 */
function getDashArray(lineType: LineType): number[] | null {
  switch (lineType) {
    case "HiddenSharp":
    case "HiddenSmooth":
    case "HiddenOutline":
      return [4, 2] // Dashed for hidden lines
    default:
      return null // Solid for visible lines
  }
}

/**
 * Get stroke width for a line type
 */
function getStrokeWidth(lineType: LineType): number {
  switch (lineType) {
    case "VisibleOutline":
      return 1.5
    case "VisibleSharp":
    case "SectionCut":
      return 1.0
    case "VisibleSmooth":
      return 0.8
    case "HiddenSharp":
    case "HiddenSmooth":
    case "HiddenOutline":
      return 0.5
    default:
      return 1.0
  }
}

/**
 * Draw an arrow on canvas
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Point2D,
  to: Point2D,
  size: number = 5
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(
    to.x - size * Math.cos(angle - Math.PI / 6),
    to.y - size * Math.sin(angle - Math.PI / 6)
  )
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(
    to.x - size * Math.cos(angle + Math.PI / 6),
    to.y - size * Math.sin(angle + Math.PI / 6)
  )
  ctx.stroke()
}

/**
 * Render a dimension on canvas
 */
function renderDimension(
  ctx: CanvasRenderingContext2D,
  dimension: Dimension,
  config: { arrowSize: number; textHeight: number }
): void {
  ctx.save()
  ctx.strokeStyle = "#4ade80" // Green for dimensions
  ctx.fillStyle = "#4ade80"
  ctx.lineWidth = 1
  ctx.setLineDash([])

  // Draw extension lines
  dimension.extensionLines.forEach((extLine) => {
    ctx.beginPath()
    ctx.moveTo(extLine.start.x, -extLine.start.y) // Flip Y
    ctx.lineTo(extLine.end.x, -extLine.end.y)
    ctx.stroke()
  })

  // Draw dimension line
  ctx.beginPath()
  ctx.moveTo(dimension.dimensionLine.start.x, -dimension.dimensionLine.start.y)
  ctx.lineTo(dimension.dimensionLine.end.x, -dimension.dimensionLine.end.y)
  ctx.stroke()

  // Draw arrows
  if (dimension.dimensionLine.startArrow !== "None") {
    drawArrow(ctx, dimension.dimensionLine.end, dimension.dimensionLine.start, config.arrowSize)
  }
  if (dimension.dimensionLine.endArrow !== "None") {
    drawArrow(ctx, dimension.dimensionLine.start, dimension.dimensionLine.end, config.arrowSize)
  }

  // Draw dimension text
  ctx.fillStyle = "#ffffff"
  ctx.font = `${config.textHeight}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const text = formatDimensionValue(dimension.value, {
    precision: 2,
    showUnit: false,
    unit: dimension.unit,
  } as any)
  ctx.fillText(text, dimension.textPosition.x, -dimension.textPosition.y)

  ctx.restore()
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Viewport2D({ className, drawingId }: Viewport2DProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState<[number, number]>([0, 0])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<[number, number] | null>(null)

  const drawing = useDrawingStore((s) =>
    drawingId ? s.drawings.find((d) => d.id === drawingId) : null
  )
  const { activeTool } = useDimensioningStore()
  const { addDimension } = useDrawingStore()

  // Dimensioning state
  const [selectedPoints, setSelectedPoints] = useState<Array<{ point: Point2D; viewId: string }>>(
    []
  )
  const [, setHoveredLine] = useState<{
    line: Line2D
    viewId: string
    viewX: number
    viewY: number
  } | null>(null)

  // Layout constants
  const viewSpacing = 150 // Space between views
  const margin = 50 // Margin from edges
  const hitTestTolerance = 5 / zoom // Pixel tolerance for hit-testing (scaled by zoom)

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !drawing) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas with dark blue background (blueprint style)
    ctx.fillStyle = "#1e3a5f"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Set up coordinate system
    ctx.save()
    ctx.translate(pan[0], pan[1])
    ctx.scale(zoom, zoom)

    // Draw grid
    const gridSize = 20
    ctx.strokeStyle = "#2a4a6f"
    ctx.lineWidth = 0.5

    const startX = Math.floor(-pan[0] / zoom / gridSize) * gridSize
    const endX = Math.ceil((canvas.width - pan[0]) / zoom / gridSize) * gridSize
    const startY = Math.floor(-pan[1] / zoom / gridSize) * gridSize
    const endY = Math.ceil((canvas.height - pan[1]) / zoom / gridSize) * gridSize

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
      ctx.stroke()
    }

    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
      ctx.stroke()
    }

    // Calculate automatic layout for views
    const viewsToRender = drawing.views.filter((v) => v.visible)

    // Render each view with automatic positioning
    viewsToRender.forEach((view, index) => {
      // Auto-position views in a grid if position is [0,0] (default)
      let viewX = view.position[0]
      let viewY = view.position[1]

      if (viewX === 0 && viewY === 0) {
        // Calculate grid position (2 columns)
        const col = index % 2
        const row = Math.floor(index / 2)
        viewX = margin + col * viewSpacing
        viewY = margin + row * viewSpacing
      }

      ctx.save()
      ctx.translate(viewX, viewY)

      // Draw view bounding box (subtle border)
      const bbox = view.projection.bounding_box
      const viewWidth = bbox.max.x - bbox.min.x
      const viewHeight = bbox.max.y - bbox.min.y

      // Draw view border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)"
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.strokeRect(bbox.min.x - 10, -bbox.max.y - 10, viewWidth + 20, viewHeight + 20)

      // Render projection lines
      view.projection.lines.forEach((line: Line2D) => {
        ctx.strokeStyle = getLineColor(line.line_type)
        ctx.lineWidth = getStrokeWidth(line.line_type)

        const dashArray = getDashArray(line.line_type)
        if (dashArray) {
          ctx.setLineDash(dashArray)
        } else {
          ctx.setLineDash([])
        }

        ctx.beginPath()
        ctx.moveTo(line.start.x, -line.start.y) // Flip Y axis (screen coordinates)
        ctx.lineTo(line.end.x, -line.end.y)
        ctx.stroke()
      })

      // Draw view label (+ debug line count)
      ctx.fillStyle = "#ffffff"
      ctx.font = "12px sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "top"
      const lineCount = view.projection.lines?.length ?? 0
      ctx.fillText(
        `${view.label || view.projection.label} (${lineCount})`,
        bbox.min.x - 10,
        -bbox.max.y - 25
      )

      ctx.restore()
    })

    // Render dimensions
    if (drawing.dimensions?.dimensions) {
      drawing.dimensions.dimensions.forEach((dim: Dimension) => {
        renderDimension(ctx, dim, {
          arrowSize: drawing.dimensions.config.arrowSize || 3,
          textHeight: drawing.dimensions.config.textHeight || 3.5,
        })
      })
    }

    // Render preview dimension if in dimensioning mode
    // (This will be handled separately)

    ctx.restore()
  }, [drawing, zoom, pan, margin, viewSpacing])

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      }

      render()
    }

    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [render])

  // Re-render when drawing changes
  useEffect(() => {
    render()
  }, [render])

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point2D => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const x = (screenX - rect.left - pan[0]) / zoom
      const y = (screenY - rect.top - pan[1]) / zoom
      return { x, y: -y } // Flip Y axis
    },
    [pan, zoom]
  )

  // Find line at point (hit-testing)
  const findLineAtPoint = useCallback(
    (
      worldPoint: Point2D
    ): {
      line: Line2D
      viewId: string
      viewX: number
      viewY: number
    } | null => {
      if (!drawing) return null

      const tolerance = hitTestTolerance

      for (const view of drawing.views) {
        if (!view.visible) continue

        // Calculate view position
        const viewIndex = drawing.views.indexOf(view)
        let viewX = view.position[0]
        let viewY = view.position[1]
        if (viewX === 0 && viewY === 0) {
          const col = viewIndex % 2
          const row = Math.floor(viewIndex / 2)
          viewX = margin + col * viewSpacing
          viewY = margin + row * viewSpacing
        }

        // Transform point to view-local coordinates
        const localPoint: Point2D = {
          x: worldPoint.x - viewX,
          y: worldPoint.y + viewY, // Flip Y
        }

        // Check each line in the view
        for (const line of view.projection.lines) {
          const { distance } = pointToLineDistance(localPoint, line.start, line.end)
          if (distance < tolerance) {
            return { line, viewId: view.id, viewX, viewY }
          }
        }
      }

      return null
    },
    [drawing, hitTestTolerance, margin, viewSpacing]
  )

  // Mouse handlers for pan and dimensioning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        // Middle mouse or Ctrl+Left for pan
        setIsDragging(true)
        setDragStart([e.clientX, e.clientY])
        e.preventDefault()
        return
      }

      // Handle dimensioning
      if (activeTool && e.button === 0 && !e.ctrlKey) {
        const worldPoint = screenToWorld(e.clientX, e.clientY)
        const hit = findLineAtPoint(worldPoint)

        if (hit && drawing) {
          // Get view-local point
          const localPoint: Point2D = {
            x: worldPoint.x - hit.viewX,
            y: worldPoint.y + hit.viewY,
          }

          // Add point to selection
          const newSelection = [...selectedPoints, { point: localPoint, viewId: hit.viewId }]

          setSelectedPoints(newSelection)

          // Create dimension based on tool and number of selected points
          if (newSelection.length >= 2 && newSelection[0].viewId === newSelection[1].viewId) {
            const p1 = newSelection[0].point
            const p2 = newSelection[1].point
            const config = drawing.dimensions.config

            let dimension: Dimension | null = null

            // Determine dimension type based on tool
            if (activeTool === "line-length" || activeTool === "point-to-point") {
              // Auto-detect horizontal/vertical/aligned
              const dx = Math.abs(p2.x - p1.x)
              const dy = Math.abs(p2.y - p1.y)

              if (dx > dy * 2) {
                dimension = createHorizontalDimension(p1, p2, config)
              } else if (dy > dx * 2) {
                dimension = createVerticalDimension(p1, p2, config)
              } else {
                dimension = createAlignedDimension(p1, p2, config)
              }
            } else if (activeTool === "point-to-line") {
              // For point-to-line, we'd need the line, but for now use aligned
              dimension = createAlignedDimension(p1, p2, config)
            }

            if (dimension) {
              addDimension(drawing.id, dimension)
              setSelectedPoints([]) // Reset selection
            }
          }
        }

        e.preventDefault()
      }
    },
    [
      activeTool,
      screenToWorld,
      findLineAtPoint,
      drawing,
      selectedPoints,
      addDimension,
      hitTestTolerance,
    ]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging && dragStart) {
        const dx = e.clientX - dragStart[0]
        const dy = e.clientY - dragStart[1]
        setPan([pan[0] + dx, pan[1] + dy])
        setDragStart([e.clientX, e.clientY])
        return
      }

      // Update hovered line for dimensioning
      if (activeTool) {
        const worldPoint = screenToWorld(e.clientX, e.clientY)
        const hit = findLineAtPoint(worldPoint)
        setHoveredLine(hit)
      } else {
        setHoveredLine(null)
      }
    },
    [isDragging, dragStart, pan, activeTool, screenToWorld, findLineAtPoint]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragStart(null)
  }, [])

  // Wheel handler for zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(10, zoom * delta))
      setZoom(newZoom)
    },
    [zoom]
  )

  // Always call hooks (move outside conditional)
  const { addView, generateProjection, updateDrawing } = useDrawingStore()
  const [showAddViewPopover, setShowAddViewPopover] = useState(false)
  const [selectedViewForAdd, setSelectedViewForAdd] = useState<DrawingView | null>(null)

  type StandardViewKey = "Top" | "Front" | "Right" | "Left" | "Bottom" | "Back" | "Isometric"

  // Available projection types
  const availableProjectionTypes: Array<{
    type: ProjectionType
    label: string
    key: StandardViewKey
  }> = [
    { type: "Top", label: t("drawings.views.top"), key: "Top" },
    { type: "Front", label: t("drawings.views.front"), key: "Front" },
    { type: "Right", label: t("drawings.views.right"), key: "Right" },
    { type: "Left", label: t("drawings.views.left"), key: "Left" },
    { type: "Bottom", label: t("drawings.views.bottom"), key: "Bottom" },
    { type: "Back", label: t("drawings.views.back"), key: "Back" },
    { type: "Isometric", label: t("drawings.views.isometric"), key: "Isometric" },
  ]

  // Get existing view types (only for standard types)
  const existingViewTypes = new Set<StandardViewKey>(
    drawing?.views
      .map((v) => {
        if (typeof v.projectionType === "string") {
          return v.projectionType as StandardViewKey
        }
        return null
      })
      .filter((v): v is StandardViewKey => v !== null) || []
  )

  const handleAddView = useCallback(
    async (projectionType: ProjectionType) => {
      if (!drawing || !drawing.sourceShapeIds.length) return

      try {
        // Generate projection for first source shape (backend id expected).
        // If we have an old drawing that stored a scene id, retry via shapeIdMap and migrate.
        const originalId = drawing.sourceShapeIds[0]
        const unitFactor = getModelMetersToDrawingUnitsFactor(drawing.sheetConfig.units)
        const projection = await generateProjection(
          originalId,
          projectionType,
          drawing.sheetConfig.scale * unitFactor
        ).catch(async (err) => {
          const mapped = shapeIdMap.get(originalId)
          if (!mapped) throw err
          const retry = await generateProjection(
            mapped,
            projectionType,
            drawing.sheetConfig.scale * unitFactor
          )
          // Migrate drawing to backend ids for future operations
          updateDrawing(drawing.id, {
            sourceShapeIds: [mapped, ...drawing.sourceShapeIds.slice(1)],
          })
          return retry
        })

        // Calculate position (grid layout)
        const viewCount = drawing.views.length
        const col = viewCount % 2
        const row = Math.floor(viewCount / 2)
        const spacing = 150
        const margin = 50
        const position: [number, number] = [margin + col * spacing, margin + row * spacing]

        addView(drawing.id, projectionType, projection, position)
        setShowAddViewPopover(false)
      } catch (error) {
        console.error("Error adding view:", error)
      }
    },
    [drawing, generateProjection, addView, updateDrawing]
  )

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Add View Button - appears on each view */}
      {drawing &&
        drawing.views.map((view, index) => {
          const bbox = view.projection.bounding_box
          // Calculate actual position (with auto-layout)
          let viewX = view.position[0]
          let viewY = view.position[1]
          if (viewX === 0 && viewY === 0) {
            const col = index % 2
            const row = Math.floor(index / 2)
            viewX = margin + col * viewSpacing
            viewY = margin + row * viewSpacing
          }
          const centerX = viewX + (bbox.max.x + bbox.min.x) / 2
          const centerY = viewY - (bbox.max.y + bbox.min.y) / 2

          return (
            <Popover
              key={view.id}
              open={selectedViewForAdd?.id === view.id && showAddViewPopover}
              onOpenChange={(open) => {
                if (!open) {
                  setShowAddViewPopover(false)
                  setSelectedViewForAdd(null)
                }
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="absolute rounded-full bg-primary p-1.5 shadow-lg transition-all hover:scale-110 hover:bg-primary/90"
                  style={{
                    left: `${centerX * zoom + pan[0]}px`,
                    top: `${centerY * zoom + pan[1]}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={() => {
                    setSelectedViewForAdd(view)
                    setShowAddViewPopover(true)
                  }}
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-4 text-primary-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="space-y-1">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Agregar vista
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {availableProjectionTypes.map(({ type, label, key }) => {
                      const isAdded = existingViewTypes.has(key)
                      return (
                        <Button
                          key={key}
                          variant={isAdded ? "outline" : "default"}
                          size="sm"
                          className="h-8 text-xs justify-start"
                          disabled={isAdded}
                          onClick={() => handleAddView(type)}
                        >
                          {isAdded && (
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3 mr-1" />
                          )}
                          {label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )
        })}

      {/* Add First View Button - if no views exist */}
      {drawing && drawing.views.length === 0 && (
        <Popover
          open={showAddViewPopover && !selectedViewForAdd}
          onOpenChange={setShowAddViewPopover}
        >
          <PopoverTrigger asChild>
            <Button
              className="absolute top-4 left-1/2 -translate-x-1/2"
              onClick={() => setShowAddViewPopover(true)}
            >
              <HugeiconsIcon icon={Add01Icon} className="size-4 mr-2" />
              Agregar Vista Base
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Selecciona la orientación para la vista base
              </div>
              <div className="grid grid-cols-2 gap-1">
                {availableProjectionTypes.map(({ type, label, key }) => (
                  <Button
                    key={key}
                    size="sm"
                    className="h-8 text-xs justify-start"
                    onClick={() => handleAddView(type)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 rounded-lg bg-background/80 p-2 shadow-lg">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(10, z * 1.2))}
          className="rounded px-2 py-1 text-sm hover:bg-muted"
        >
          +
        </button>
        <span className="text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}
          className="rounded px-2 py-1 text-sm hover:bg-muted"
        >
          −
        </button>
      </div>
    </div>
  )
}
