/**
 * Detail View Rendering Utilities - CADHY
 *
 * Canvas rendering functions for detail views, callouts, and cutting lines.
 * Implements standard technical drawing practices for enlarged views
 * with proper labeling and leader line conventions.
 *
 * @module lib/utils/UT_detail_view
 */

import type {
  Callout,
  CuttingLine,
  DetailView,
  DetailViewConfig,
  LeaderLine,
  Point2D,
} from "@cadhy/types"

// =============================================================================
// TYPES
// =============================================================================

/** Theme colors for detail view rendering */
export interface DetailViewColors {
  stroke: string
  fill: string
  text: string
  background: string
}

/** Rendering context for detail views */
export interface DetailViewRenderContext {
  ctx: CanvasRenderingContext2D
  offsetX: number
  offsetY: number
  scale: number
  colors: DetailViewColors
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Standard arrow dimensions */
const ARROW = {
  length: 8,
  width: 3,
}

/** Balloon (callout) defaults */
const BALLOON = {
  circleRadius: 12,
  hexRadius: 14,
  squareSize: 22,
  diamondSize: 16,
}

// =============================================================================
// DETAIL VIEW BOUNDARY RENDERING
// =============================================================================

/**
 * Render the detail area boundary (circle/rectangle showing what's enlarged).
 */
export function renderDetailBoundary(rctx: DetailViewRenderContext, detail: DetailView): void {
  const { ctx, offsetX, offsetY, scale, colors } = rctx
  const config = detail.config

  ctx.save()
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = config.lineWeight * scale
  ctx.setLineDash([4 * scale, 2 * scale]) // Phantom line style

  const cx = offsetX + config.center[0] * scale
  const cy = offsetY - config.center[1] * scale

  if (config.boundaryShape === "circle") {
    const radius = config.radius * scale
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    // Rectangle boundary
    const halfSize = config.radius * scale
    ctx.strokeRect(cx - halfSize, cy - halfSize, halfSize * 2, halfSize * 2)
  }

  ctx.setLineDash([])
  ctx.restore()
}

/**
 * Render the detail view label (e.g., "A", "DETAIL A", "DETAIL A SCALE 2:1").
 */
export function renderDetailLabel(
  rctx: DetailViewRenderContext,
  detail: DetailView,
  labelPosition: Point2D
): void {
  const { ctx, offsetX, offsetY, scale, colors } = rctx
  const config = detail.config

  const x = offsetX + labelPosition[0] * scale
  const y = offsetY - labelPosition[1] * scale

  ctx.save()
  ctx.fillStyle = colors.text
  ctx.font = `bold ${12 * scale}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "top"

  // Build label text
  let labelText = config.label
  if (config.showScale) {
    labelText = `DETAIL ${config.label} (SCALE ${config.scale}:1)`
  } else {
    labelText = `DETAIL ${config.label}`
  }

  ctx.fillText(labelText, x, y)
  ctx.restore()
}

/**
 * Render the connection line from detail boundary to enlarged view.
 * This is the leader/pointer showing where the detail came from.
 */
export function renderDetailConnection(
  rctx: DetailViewRenderContext,
  boundaryCenter: Point2D,
  enlargedViewCenter: Point2D
): void {
  const { ctx, offsetX, offsetY, scale, colors } = rctx

  const x1 = offsetX + boundaryCenter[0] * scale
  const y1 = offsetY - boundaryCenter[1] * scale
  const x2 = offsetX + enlargedViewCenter[0] * scale
  const y2 = offsetY - enlargedViewCenter[1] * scale

  ctx.save()
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 0.5 * scale
  ctx.setLineDash([6 * scale, 3 * scale])

  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.restore()
}

// =============================================================================
// CALLOUT RENDERING
// =============================================================================

/**
 * Render a callout balloon with leader line.
 */
export function renderCallout(rctx: DetailViewRenderContext, callout: Callout): void {
  if (!callout.visible) return

  const { ctx, offsetX, offsetY, scale, colors } = rctx

  // Render leader line first
  renderLeaderLine(rctx, callout.leader, callout.anchor)

  // Calculate balloon position (end of leader)
  const leaderEnd = getLeaderEndPoint(callout.leader, callout.anchor)
  const bx = offsetX + leaderEnd[0] * scale
  const by = offsetY - leaderEnd[1] * scale

  ctx.save()
  ctx.strokeStyle = colors.stroke
  ctx.fillStyle = colors.background
  ctx.lineWidth = 1 * scale

  const size = callout.balloonSize * scale
  const shape = callout.balloonShape || "circle"

  // Draw balloon shape
  ctx.beginPath()
  switch (shape) {
    case "circle":
      ctx.arc(bx, by, size / 2, 0, Math.PI * 2)
      break
    case "hexagon":
      drawHexagon(ctx, bx, by, size / 2)
      break
    case "square":
      ctx.rect(bx - size / 2, by - size / 2, size, size)
      break
    case "diamond":
      drawDiamond(ctx, bx, by, size / 2)
      break
    case "triangle":
      drawTriangle(ctx, bx, by, size / 2)
      break
    default:
      ctx.arc(bx, by, size / 2, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.stroke()

  // Draw text inside balloon
  ctx.fillStyle = colors.text
  ctx.font = `bold ${size * 0.6}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  const text = callout.bomItemNumber?.toString() || callout.text
  ctx.fillText(text, bx, by)

  ctx.restore()
}

/**
 * Helper to draw hexagon shape.
 */
function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  ctx.moveTo(cx + radius, cy)
  for (let i = 1; i <= 6; i++) {
    const angle = (i * Math.PI) / 3
    ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
  }
  ctx.closePath()
}

/**
 * Helper to draw diamond shape.
 */
function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  ctx.moveTo(cx, cy - radius)
  ctx.lineTo(cx + radius, cy)
  ctx.lineTo(cx, cy + radius)
  ctx.lineTo(cx - radius, cy)
  ctx.closePath()
}

/**
 * Helper to draw triangle shape.
 */
function drawTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  ctx.moveTo(cx, cy - radius)
  ctx.lineTo(cx + radius * 0.866, cy + radius * 0.5)
  ctx.lineTo(cx - radius * 0.866, cy + radius * 0.5)
  ctx.closePath()
}

// =============================================================================
// LEADER LINE RENDERING
// =============================================================================

/**
 * Render a leader line from anchor point.
 */
export function renderLeaderLine(
  rctx: DetailViewRenderContext,
  leader: LeaderLine,
  anchor: Point2D
): void {
  const { ctx, offsetX, offsetY, scale, colors } = rctx

  ctx.save()
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = leader.lineWidth * scale

  const ax = offsetX + anchor[0] * scale
  const ay = offsetY - anchor[1] * scale

  ctx.beginPath()
  ctx.moveTo(ax, ay)

  // Draw through all waypoints
  for (const wp of leader.waypoints) {
    const wx = offsetX + wp[0] * scale
    const wy = offsetY - wp[1] * scale
    ctx.lineTo(wx, wy)
  }

  ctx.stroke()

  // Draw arrow at anchor if specified
  if (leader.arrowType !== "none") {
    const firstWp = leader.waypoints[0] || anchor
    renderArrow(
      ctx,
      offsetX + firstWp[0] * scale,
      offsetY - firstWp[1] * scale,
      ax,
      ay,
      leader.arrowType,
      scale
    )
  }

  ctx.restore()
}

/**
 * Get the end point of a leader line (where balloon attaches).
 */
function getLeaderEndPoint(leader: LeaderLine, anchor: Point2D): Point2D {
  if (leader.waypoints.length > 0) {
    return leader.waypoints[leader.waypoints.length - 1]
  }
  return anchor
}

/**
 * Render an arrow head.
 */
function renderArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  arrowType: LeaderLine["arrowType"],
  scale: number
): void {
  const angle = Math.atan2(toY - fromY, toX - fromX)
  const arrowLength = ARROW.length * scale
  const arrowWidth = ARROW.width * scale

  ctx.save()

  switch (arrowType) {
    case "closed":
      ctx.fillStyle = ctx.strokeStyle
      ctx.beginPath()
      ctx.moveTo(toX, toY)
      ctx.lineTo(
        toX - arrowLength * Math.cos(angle - Math.PI / 8),
        toY - arrowLength * Math.sin(angle - Math.PI / 8)
      )
      ctx.lineTo(
        toX - arrowLength * Math.cos(angle + Math.PI / 8),
        toY - arrowLength * Math.sin(angle + Math.PI / 8)
      )
      ctx.closePath()
      ctx.fill()
      break

    case "open":
      ctx.beginPath()
      ctx.moveTo(
        toX - arrowLength * Math.cos(angle - Math.PI / 6),
        toY - arrowLength * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(toX, toY)
      ctx.lineTo(
        toX - arrowLength * Math.cos(angle + Math.PI / 6),
        toY - arrowLength * Math.sin(angle + Math.PI / 6)
      )
      ctx.stroke()
      break

    case "dot":
      ctx.fillStyle = ctx.strokeStyle
      ctx.beginPath()
      ctx.arc(toX, toY, arrowWidth, 0, Math.PI * 2)
      ctx.fill()
      break

    case "none":
    default:
      break
  }

  ctx.restore()
}

// =============================================================================
// CUTTING LINE / SECTION LINE RENDERING
// =============================================================================

/**
 * Render a cutting line (section line) for section views.
 */
export function renderCuttingLine(rctx: DetailViewRenderContext, cuttingLine: CuttingLine): void {
  if (!cuttingLine.visible) return

  const { ctx, offsetX, offsetY, scale, colors } = rctx

  ctx.save()
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = cuttingLine.lineWeight * scale

  // Set line dash pattern based on style
  switch (cuttingLine.lineStyle) {
    case "chain":
      ctx.setLineDash([12 * scale, 3 * scale, 3 * scale, 3 * scale])
      break
    case "phantom":
      ctx.setLineDash([12 * scale, 3 * scale, 3 * scale, 3 * scale, 3 * scale, 3 * scale])
      break
    case "dashed":
      ctx.setLineDash([8 * scale, 4 * scale])
      break
    default:
      ctx.setLineDash([])
  }

  // Draw the cutting line path
  ctx.beginPath()
  const firstPt = cuttingLine.points[0]
  if (firstPt) {
    ctx.moveTo(offsetX + firstPt[0] * scale, offsetY - firstPt[1] * scale)

    for (let i = 1; i < cuttingLine.points.length; i++) {
      const pt = cuttingLine.points[i]
      ctx.lineTo(offsetX + pt[0] * scale, offsetY - pt[1] * scale)
    }
  }
  ctx.stroke()

  ctx.setLineDash([])

  // Draw section arrows at ends
  if (cuttingLine.points.length >= 2) {
    const startPt = cuttingLine.points[0]
    const secondPt = cuttingLine.points[1]
    const endPt = cuttingLine.points[cuttingLine.points.length - 1]
    const secondLastPt = cuttingLine.points[cuttingLine.points.length - 2]

    // Start arrow
    renderSectionArrow(rctx, startPt, secondPt, cuttingLine.label, cuttingLine.viewingDirection)

    // End arrow
    renderSectionArrow(rctx, endPt, secondLastPt, cuttingLine.label, cuttingLine.viewingDirection)
  }

  ctx.restore()
}

/**
 * Render section arrow with label.
 * The arrow shows the viewing direction.
 */
function renderSectionArrow(
  rctx: DetailViewRenderContext,
  tipPoint: Point2D,
  refPoint: Point2D,
  label: string,
  _viewingDirection: "left" | "right" | "both"
): void {
  const { ctx, offsetX, offsetY, scale, colors } = rctx

  const tx = offsetX + tipPoint[0] * scale
  const ty = offsetY - tipPoint[1] * scale
  const rx = offsetX + refPoint[0] * scale
  const ry = offsetY - refPoint[1] * scale

  // Calculate perpendicular direction for arrow
  const dx = tx - rx
  const dy = ty - ry
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return

  // Perpendicular unit vector
  const perpX = -dy / len
  const perpY = dx / len

  const arrowOffset = 20 * scale

  ctx.save()
  ctx.fillStyle = colors.stroke
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 2 * scale

  // Draw arrow head
  const arrowTipX = tx + perpX * arrowOffset
  const arrowTipY = ty + perpY * arrowOffset
  const arrowSize = 12 * scale

  ctx.beginPath()
  ctx.moveTo(arrowTipX, arrowTipY)
  ctx.lineTo(
    arrowTipX - perpX * arrowSize - (dx / len) * arrowSize * 0.5,
    arrowTipY - perpY * arrowSize - (dy / len) * arrowSize * 0.5
  )
  ctx.lineTo(
    arrowTipX - perpX * arrowSize + (dx / len) * arrowSize * 0.5,
    arrowTipY - perpY * arrowSize + (dy / len) * arrowSize * 0.5
  )
  ctx.closePath()
  ctx.fill()

  // Draw label
  ctx.font = `bold ${14 * scale}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, arrowTipX + perpX * arrowSize * 2, arrowTipY + perpY * arrowSize * 2)

  ctx.restore()
}

// =============================================================================
// COMPLETE DETAIL VIEW RENDERING
// =============================================================================

/**
 * Render a complete detail view with boundary, label, and connection.
 */
export function renderCompleteDetailView(
  rctx: DetailViewRenderContext,
  detail: DetailView,
  enlargedViewPosition: Point2D
): void {
  // Render boundary in parent view
  renderDetailBoundary(rctx, detail)

  // Render label below the detail boundary
  const labelPosition: Point2D = [
    detail.config.center[0],
    detail.config.center[1] - detail.config.radius - 10,
  ]
  renderDetailLabel(rctx, detail, labelPosition)

  // Render connection line to enlarged view
  renderDetailConnection(rctx, detail.config.center, enlargedViewPosition)
}

// =============================================================================
// THEME HELPERS
// =============================================================================

/**
 * Get colors for detail view rendering based on theme.
 */
export function getDetailViewColors(theme: "light" | "dark" | "blueprint"): DetailViewColors {
  switch (theme) {
    case "light":
      return {
        stroke: "#000000",
        fill: "#000000",
        text: "#000000",
        background: "#ffffff",
      }
    case "dark":
      return {
        stroke: "#ffffff",
        fill: "#ffffff",
        text: "#ffffff",
        background: "#1a1a1a",
      }
    case "blueprint":
      return {
        stroke: "#ffffff",
        fill: "#ffffff",
        text: "#ffffff",
        background: "#00293F",
      }
  }
}

/**
 * Create a render context for detail views.
 */
export function createDetailViewRenderContext(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  scale: number,
  theme: "light" | "dark" | "blueprint" = "blueprint"
): DetailViewRenderContext {
  return {
    ctx,
    offsetX,
    offsetY,
    scale,
    colors: getDetailViewColors(theme),
  }
}
