/**
 * Interactive Sketch Canvas - CADHY
 *
 * 2D canvas for creating and editing sketch geometry.
 * Supports drawing lines, arcs, circles, rectangles, and polygons
 * with real-time snapping to grid, endpoints, and intersections.
 *
 * This is the input side of sketching (creating geometry),
 * as opposed to ED_draw_viewport.tsx which displays projections.
 */

import { Button, cn } from "@cadhy/ui"
import {
  ArrowMoveUpLeftIcon,
  CircleIcon,
  CursorPointer01Icon,
  GridIcon,
  LineIcon,
  MagnetIcon,
  SquareIcon,
  Triangle01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  type Sketch,
  type SketchEntity,
  type SketchPoint,
  type SketchTool,
  snapToGridPoint,
  useSketchStore,
} from "@/core/stores/ST_sketch"

// =============================================================================
// TYPES
// =============================================================================

interface SketchCanvasProps {
  className?: string
  sketchId: string
}

interface CanvasState {
  isPanning: boolean
  lastMousePos: SketchPoint
  dragStartPos: SketchPoint | null
}

// =============================================================================
// CONSTANTS
// =============================================================================

const COLORS = {
  background: "#1a1a2e",
  grid: "#2d2d44",
  gridMajor: "#3d3d55",
  axis: {
    x: "#ff6b6b",
    y: "#4ecdc4",
  },
  entity: {
    default: "#ffffff",
    selected: "#ffd93d",
    hovered: "#6bcbff",
    construction: "#666666",
  },
  snap: {
    grid: "#4ecdc4",
    endpoint: "#ff6b6b",
    midpoint: "#ffd93d",
    center: "#9b59b6",
    intersection: "#e74c3c",
  },
  pending: "#6bcbff",
  cursor: "#ffffff",
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert screen coordinates to sketch coordinates
 */
function screenToSketch(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
  viewOffset: SketchPoint,
  viewZoom: number
): SketchPoint {
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  return {
    x: (screenX - centerX - viewOffset.x) / viewZoom,
    y: -(screenY - centerY - viewOffset.y) / viewZoom, // Flip Y axis
  }
}

/**
 * Convert sketch coordinates to screen coordinates
 */
function sketchToScreen(
  sketchX: number,
  sketchY: number,
  canvasWidth: number,
  canvasHeight: number,
  viewOffset: SketchPoint,
  viewZoom: number
): { x: number; y: number } {
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  return {
    x: sketchX * viewZoom + centerX + viewOffset.x,
    y: -sketchY * viewZoom + centerY + viewOffset.y, // Flip Y axis
  }
}

/**
 * Calculate distance between two points
 */
function distance(p1: SketchPoint, p2: SketchPoint): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

// =============================================================================
// DRAWING FUNCTIONS
// =============================================================================

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewOffset: SketchPoint,
  viewZoom: number,
  gridSize: number
) {
  const centerX = width / 2 + viewOffset.x
  const centerY = height / 2 + viewOffset.y

  // Calculate visible area in sketch coordinates
  const scaledGridSize = gridSize * viewZoom
  const majorGridSize = scaledGridSize * 5

  // Draw minor grid
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 0.5
  ctx.beginPath()

  // Vertical lines
  const startX = centerX % scaledGridSize
  for (let x = startX; x < width; x += scaledGridSize) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }

  // Horizontal lines
  const startY = centerY % scaledGridSize
  for (let y = startY; y < height; y += scaledGridSize) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }
  ctx.stroke()

  // Draw major grid
  ctx.strokeStyle = COLORS.gridMajor
  ctx.lineWidth = 1
  ctx.beginPath()

  const majorStartX = centerX % majorGridSize
  for (let x = majorStartX; x < width; x += majorGridSize) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }

  const majorStartY = centerY % majorGridSize
  for (let y = majorStartY; y < height; y += majorGridSize) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }
  ctx.stroke()

  // Draw axes
  ctx.lineWidth = 2

  // X axis (red)
  ctx.strokeStyle = COLORS.axis.x
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(width, centerY)
  ctx.stroke()

  // Y axis (teal)
  ctx.strokeStyle = COLORS.axis.y
  ctx.beginPath()
  ctx.moveTo(centerX, 0)
  ctx.lineTo(centerX, height)
  ctx.stroke()

  // Origin marker
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2)
  ctx.fill()
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: SketchEntity,
  width: number,
  height: number,
  viewOffset: SketchPoint,
  viewZoom: number,
  isSelected: boolean,
  isHovered: boolean
) {
  const toScreen = (p: SketchPoint) => sketchToScreen(p.x, p.y, width, height, viewOffset, viewZoom)

  // Determine color
  let color = COLORS.entity.default
  if (entity.isConstruction) color = COLORS.entity.construction
  if (isHovered) color = COLORS.entity.hovered
  if (isSelected) color = COLORS.entity.selected

  ctx.strokeStyle = color
  ctx.lineWidth = isSelected ? 2 : 1.5
  ctx.fillStyle = color

  switch (entity.type) {
    case "line": {
      const start = toScreen(entity.start)
      const end = toScreen(entity.end)
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()

      // Draw endpoints
      if (isSelected || isHovered) {
        ctx.beginPath()
        ctx.arc(start.x, start.y, 4, 0, Math.PI * 2)
        ctx.arc(end.x, end.y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case "circle": {
      const center = toScreen(entity.center)
      const radius = entity.radius * viewZoom
      ctx.beginPath()
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
      ctx.stroke()

      // Draw center
      if (isSelected || isHovered) {
        ctx.beginPath()
        ctx.arc(center.x, center.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case "arc": {
      const center = toScreen(entity.center)
      const radius = entity.radius * viewZoom
      ctx.beginPath()
      // Note: Canvas arcs go clockwise, sketch arcs are counter-clockwise
      ctx.arc(center.x, center.y, radius, -entity.endAngle, -entity.startAngle)
      ctx.stroke()
      break
    }

    case "rectangle": {
      const corner = toScreen(entity.corner)
      const w = entity.width * viewZoom
      const h = entity.height * viewZoom
      ctx.strokeRect(corner.x, corner.y - h, w, h) // Flip Y for screen coords
      break
    }

    case "polygon": {
      if (entity.points.length < 2) break
      ctx.beginPath()
      const first = toScreen(entity.points[0])
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < entity.points.length; i++) {
        const p = toScreen(entity.points[i])
        ctx.lineTo(p.x, p.y)
      }
      if (entity.isClosed) {
        ctx.closePath()
      }
      ctx.stroke()
      break
    }

    case "spline": {
      if (entity.controlPoints.length < 2) break
      ctx.beginPath()
      const points = entity.controlPoints.map(toScreen)
      ctx.moveTo(points[0].x, points[0].y)

      if (points.length === 2) {
        ctx.lineTo(points[1].x, points[1].y)
      } else {
        // Simple quadratic curve through control points
        for (let i = 1; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2
          const yc = (points[i].y + points[i + 1].y) / 2
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
      }
      ctx.stroke()
      break
    }

    case "point": {
      const pos = toScreen(entity.position)
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case "ellipse": {
      const center = toScreen(entity.center)
      const rx = entity.majorRadius * viewZoom
      const ry = entity.minorRadius * viewZoom
      ctx.beginPath()
      ctx.ellipse(center.x, center.y, rx, ry, -entity.rotation, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
  }
}

function drawPendingGeometry(
  ctx: CanvasRenderingContext2D,
  points: SketchPoint[],
  cursorPos: SketchPoint,
  tool: SketchTool,
  width: number,
  height: number,
  viewOffset: SketchPoint,
  viewZoom: number
) {
  if (points.length === 0) return

  const toScreen = (p: SketchPoint) => sketchToScreen(p.x, p.y, width, height, viewOffset, viewZoom)

  ctx.strokeStyle = COLORS.pending
  ctx.fillStyle = COLORS.pending
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])

  switch (tool) {
    case "line": {
      const start = toScreen(points[0])
      const end = toScreen(cursorPos)
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()

      // Draw length indicator
      const dist = distance(points[0], cursorPos)
      const midX = (start.x + end.x) / 2
      const midY = (start.y + end.y) / 2
      ctx.fillStyle = "#ffffff"
      ctx.font = "12px monospace"
      ctx.fillText(`${dist.toFixed(2)}`, midX + 10, midY - 10)
      break
    }

    case "circle": {
      const center = toScreen(points[0])
      const radius = distance(points[0], cursorPos) * viewZoom
      ctx.beginPath()
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
      ctx.stroke()

      // Draw radius line
      const cursorScreen = toScreen(cursorPos)
      ctx.beginPath()
      ctx.moveTo(center.x, center.y)
      ctx.lineTo(cursorScreen.x, cursorScreen.y)
      ctx.stroke()

      // Radius label
      ctx.fillStyle = "#ffffff"
      ctx.font = "12px monospace"
      ctx.fillText(`R: ${distance(points[0], cursorPos).toFixed(2)}`, center.x + 10, center.y - 10)
      break
    }

    case "rectangle": {
      const corner = toScreen(points[0])
      const current = toScreen(cursorPos)
      const w = current.x - corner.x
      const h = current.y - corner.y
      ctx.strokeRect(corner.x, corner.y, w, h)

      // Dimension labels
      ctx.fillStyle = "#ffffff"
      ctx.font = "12px monospace"
      const realW = Math.abs(cursorPos.x - points[0].x)
      const realH = Math.abs(cursorPos.y - points[0].y)
      ctx.fillText(`${realW.toFixed(2)} x ${realH.toFixed(2)}`, corner.x + w / 2, corner.y + h / 2)
      break
    }

    case "polygon":
    case "spline": {
      ctx.beginPath()
      const first = toScreen(points[0])
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < points.length; i++) {
        const p = toScreen(points[i])
        ctx.lineTo(p.x, p.y)
      }
      const cursor = toScreen(cursorPos)
      ctx.lineTo(cursor.x, cursor.y)
      ctx.stroke()

      // Draw points
      for (const pt of points) {
        const screenPt = toScreen(pt)
        ctx.beginPath()
        ctx.arc(screenPt.x, screenPt.y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
  }

  ctx.setLineDash([])
}

function drawSnapIndicator(
  ctx: CanvasRenderingContext2D,
  point: SketchPoint,
  type: "grid" | "endpoint" | "midpoint" | "center" | "intersection",
  width: number,
  height: number,
  viewOffset: SketchPoint,
  viewZoom: number
) {
  const screen = sketchToScreen(point.x, point.y, width, height, viewOffset, viewZoom)
  const color = COLORS.snap[type]
  const size = 8

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2

  switch (type) {
    case "grid":
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, size / 2, 0, Math.PI * 2)
      ctx.stroke()
      break
    case "endpoint":
      ctx.beginPath()
      ctx.moveTo(screen.x - size, screen.y - size)
      ctx.lineTo(screen.x + size, screen.y + size)
      ctx.moveTo(screen.x + size, screen.y - size)
      ctx.lineTo(screen.x - size, screen.y + size)
      ctx.stroke()
      break
    case "midpoint":
      ctx.beginPath()
      ctx.moveTo(screen.x, screen.y - size)
      ctx.lineTo(screen.x + size, screen.y + size)
      ctx.lineTo(screen.x - size, screen.y + size)
      ctx.closePath()
      ctx.stroke()
      break
    case "center":
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, size / 2, 0, Math.PI * 2)
      ctx.fill()
      break
    case "intersection":
      ctx.strokeRect(screen.x - size / 2, screen.y - size / 2, size, size)
      break
  }
}

// =============================================================================
// TOOLBAR COMPONENT
// =============================================================================

interface ToolbarButtonProps {
  icon: any
  label: string
  isActive: boolean
  onClick: () => void
}

function ToolbarButton({ icon, label, isActive, onClick }: ToolbarButtonProps) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={label}
    >
      <HugeiconsIcon icon={icon} className="size-4" />
    </Button>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SketchCanvas({ className, sketchId }: SketchCanvasProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Store state
  const sketch = useSketchStore((s) => s.sketches.find((sk) => sk.id === sketchId))
  const activeTool = useSketchStore((s) => s.activeTool)
  const pendingPoints = useSketchStore((s) => s.pendingPoints)
  const viewOffset = useSketchStore((s) => s.viewOffset)
  const viewZoom = useSketchStore((s) => s.viewZoom)
  const gridSize = useSketchStore((s) => s.gridSize)
  const snapToGrid = useSketchStore((s) => s.snapToGrid)
  const selectedEntityIds = useSketchStore((s) => s.selectedEntityIds)

  // Store actions
  const setTool = useSketchStore((s) => s.setTool)
  const setViewOffset = useSketchStore((s) => s.setViewOffset)
  const setViewZoom = useSketchStore((s) => s.setViewZoom)
  const addPendingPoint = useSketchStore((s) => s.addPendingPoint)
  const clearPendingPoints = useSketchStore((s) => s.clearPendingPoints)
  const addEntity = useSketchStore((s) => s.addEntity)
  const selectEntity = useSketchStore((s) => s.selectEntity)
  const deselectAll = useSketchStore((s) => s.deselectAll)
  const toggleSnapToGrid = useSketchStore((s) => s.toggleSnapToGrid)

  // Local state
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [cursorPos, setCursorPos] = useState<SketchPoint>({ x: 0, y: 0 })
  const [snapPoint, setSnapPoint] = useState<{ point: SketchPoint; type: string } | null>(null)
  const [canvasState, setCanvasState] = useState<CanvasState>({
    isPanning: false,
    lastMousePos: { x: 0, y: 0 },
    dragStartPos: null,
  })

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Draw grid and axes
    drawGrid(ctx, canvasSize.width, canvasSize.height, viewOffset, viewZoom, gridSize)

    // Draw entities
    if (sketch) {
      for (const entity of sketch.entities) {
        drawEntity(
          ctx,
          entity,
          canvasSize.width,
          canvasSize.height,
          viewOffset,
          viewZoom,
          selectedEntityIds.has(entity.id),
          entity.isHovered
        )
      }
    }

    // Draw pending geometry
    if (pendingPoints.length > 0 && activeTool !== "select") {
      drawPendingGeometry(
        ctx,
        pendingPoints,
        cursorPos,
        activeTool,
        canvasSize.width,
        canvasSize.height,
        viewOffset,
        viewZoom
      )
    }

    // Draw snap indicator
    if (snapPoint) {
      drawSnapIndicator(
        ctx,
        snapPoint.point,
        snapPoint.type as any,
        canvasSize.width,
        canvasSize.height,
        viewOffset,
        viewZoom
      )
    }

    // Draw cursor crosshair
    const cursorScreen = sketchToScreen(
      cursorPos.x,
      cursorPos.y,
      canvasSize.width,
      canvasSize.height,
      viewOffset,
      viewZoom
    )
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cursorScreen.x, 0)
    ctx.lineTo(cursorScreen.x, canvasSize.height)
    ctx.moveTo(0, cursorScreen.y)
    ctx.lineTo(canvasSize.width, cursorScreen.y)
    ctx.stroke()
  }, [
    sketch,
    canvasSize,
    viewOffset,
    viewZoom,
    gridSize,
    cursorPos,
    pendingPoints,
    activeTool,
    snapPoint,
    selectedEntityIds,
  ])

  // Mouse handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top

      // Handle panning
      if (canvasState.isPanning) {
        const dx = screenX - canvasState.lastMousePos.x
        const dy = screenY - canvasState.lastMousePos.y
        setViewOffset({
          x: viewOffset.x + dx,
          y: viewOffset.y + dy,
        })
        setCanvasState((s) => ({
          ...s,
          lastMousePos: { x: screenX, y: screenY },
        }))
        return
      }

      // Convert to sketch coordinates
      let sketchPoint = screenToSketch(
        screenX,
        screenY,
        canvasSize.width,
        canvasSize.height,
        viewOffset,
        viewZoom
      )

      // Apply snapping
      if (snapToGrid) {
        const snapped = snapToGridPoint(sketchPoint, gridSize)
        if (distance(sketchPoint, snapped) < gridSize / 2) {
          sketchPoint = snapped
          setSnapPoint({ point: snapped, type: "grid" })
        } else {
          setSnapPoint(null)
        }
      } else {
        setSnapPoint(null)
      }

      setCursorPos(sketchPoint)
    },
    [canvasState, viewOffset, viewZoom, canvasSize, snapToGrid, gridSize, setViewOffset]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top

      // Middle mouse button or Alt+Left click for panning
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setCanvasState({
          isPanning: true,
          lastMousePos: { x: screenX, y: screenY },
          dragStartPos: null,
        })
        return
      }

      // Left click
      if (e.button === 0 && !canvasState.isPanning) {
        if (activeTool === "select") {
          deselectAll()
          // TODO: Hit test entities for selection
        } else {
          // Add point for geometry creation
          addPendingPoint(cursorPos)

          // Handle tool-specific behavior
          switch (activeTool) {
            case "line":
              if (pendingPoints.length >= 1) {
                // Create line from pending point to current position
                if (sketch) {
                  addEntity(sketch.id, {
                    type: "line",
                    start: pendingPoints[0],
                    end: cursorPos,
                    isConstruction: false,
                    isLocked: false,
                  })
                }
                clearPendingPoints()
              }
              break

            case "circle":
              if (pendingPoints.length >= 1) {
                // Create circle from center to current position
                if (sketch) {
                  const radius = distance(pendingPoints[0], cursorPos)
                  addEntity(sketch.id, {
                    type: "circle",
                    center: pendingPoints[0],
                    radius,
                    isConstruction: false,
                    isLocked: false,
                  })
                }
                clearPendingPoints()
              }
              break

            case "rectangle":
              if (pendingPoints.length >= 1) {
                // Create rectangle from corner to current position
                if (sketch) {
                  const width = cursorPos.x - pendingPoints[0].x
                  const height = cursorPos.y - pendingPoints[0].y
                  addEntity(sketch.id, {
                    type: "rectangle",
                    corner: {
                      x: Math.min(pendingPoints[0].x, cursorPos.x),
                      y: Math.min(pendingPoints[0].y, cursorPos.y),
                    },
                    width: Math.abs(width),
                    height: Math.abs(height),
                    isConstruction: false,
                    isLocked: false,
                  })
                }
                clearPendingPoints()
              }
              break

            // Polygon and spline need double-click or Enter to finish
          }
        }
      }
    },
    [
      activeTool,
      cursorPos,
      pendingPoints,
      sketch,
      addPendingPoint,
      clearPendingPoints,
      addEntity,
      deselectAll,
      canvasState.isPanning,
    ]
  )

  const handleMouseUp = useCallback(() => {
    if (canvasState.isPanning) {
      setCanvasState((s) => ({ ...s, isPanning: false }))
    }
  }, [canvasState.isPanning])

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(10, viewZoom * factor))
      setViewZoom(newZoom)
    },
    [viewZoom, setViewZoom]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        clearPendingPoints()
        setTool("select")
      } else if (e.key === "Enter" && pendingPoints.length >= 3) {
        // Finalize polygon/spline
        if (sketch && (activeTool === "polygon" || activeTool === "spline")) {
          if (activeTool === "polygon") {
            addEntity(sketch.id, {
              type: "polygon",
              points: [...pendingPoints],
              isClosed: true,
              isConstruction: false,
              isLocked: false,
            })
          } else {
            addEntity(sketch.id, {
              type: "spline",
              controlPoints: [...pendingPoints],
              degree: Math.min(3, pendingPoints.length - 1),
              isClosed: false,
              isConstruction: false,
              isLocked: false,
            })
          }
          clearPendingPoints()
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (sketch) {
          const { deleteSelectedEntities } = useSketchStore.getState()
          deleteSelectedEntities(sketch.id)
        }
      }
    },
    [pendingPoints, activeTool, sketch, clearPendingPoints, setTool, addEntity]
  )

  if (!sketch) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/20", className)}>
        <p className="text-muted-foreground">{t("sketch.noActiveSketch", "No active sketch")}</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn("relative flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-10 flex gap-1 bg-background/90 backdrop-blur-sm rounded-lg p-1 border border-border/50 shadow-lg">
        <ToolbarButton
          icon={CursorPointer01Icon}
          label={t("sketch.tools.select", "Select")}
          isActive={activeTool === "select"}
          onClick={() => setTool("select")}
        />
        <div className="w-px h-6 bg-border/50 self-center mx-1" />
        <ToolbarButton
          icon={LineIcon}
          label={t("sketch.tools.line", "Line")}
          isActive={activeTool === "line"}
          onClick={() => setTool("line")}
        />
        <ToolbarButton
          icon={CircleIcon}
          label={t("sketch.tools.circle", "Circle")}
          isActive={activeTool === "circle"}
          onClick={() => setTool("circle")}
        />
        <ToolbarButton
          icon={SquareIcon}
          label={t("sketch.tools.rectangle", "Rectangle")}
          isActive={activeTool === "rectangle"}
          onClick={() => setTool("rectangle")}
        />
        <ToolbarButton
          icon={Triangle01Icon}
          label={t("sketch.tools.polygon", "Polygon")}
          isActive={activeTool === "polygon"}
          onClick={() => setTool("polygon")}
        />
        <div className="w-px h-6 bg-border/50 self-center mx-1" />
        <ToolbarButton
          icon={MagnetIcon}
          label={t("sketch.tools.snapToGrid", "Snap to Grid")}
          isActive={snapToGrid}
          onClick={toggleSnapToGrid}
        />
        <ToolbarButton
          icon={GridIcon}
          label={t("sketch.tools.showGrid", "Show Grid")}
          isActive={true}
          onClick={() => {}}
        />
      </div>

      {/* Coordinate display */}
      <div className="absolute bottom-2 left-2 z-10 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-mono text-muted-foreground border border-border/50">
        X: {cursorPos.x.toFixed(2)} Y: {cursorPos.y.toFixed(2)}
      </div>

      {/* Zoom display */}
      <div className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-mono text-muted-foreground border border-border/50">
        {(viewZoom * 100).toFixed(0)}%
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="flex-1 cursor-crosshair outline-none"
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}

export default SketchCanvas
