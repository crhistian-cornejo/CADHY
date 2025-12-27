/**
 * Hatch Pattern Utilities - CADHY
 *
 * Functions for rendering hatch patterns on canvas.
 * Supports ANSI standard patterns and custom configurations.
 */

import type { HatchConfig, HatchPatternType, HatchRegion, Point2D } from "@cadhy/types"

// =============================================================================
// PATTERN DEFINITIONS
// =============================================================================

interface PatternDefinition {
  /** Primary angle in degrees */
  angle: number
  /** Spacing between lines in mm */
  spacing: number
  /** Secondary angle for cross-hatch patterns (optional) */
  crossAngle?: number
  /** Whether this pattern includes a dot overlay */
  hasDots?: boolean
  /** Dot density (dots per mm^2) for dot patterns */
  dotDensity?: number
}

const PATTERN_DEFINITIONS: Record<HatchPatternType, PatternDefinition> = {
  solid: { angle: 0, spacing: 0 },
  ansi31: { angle: 45, spacing: 2.0 }, // General purpose diagonal
  ansi32: { angle: 45, spacing: 1.2 }, // Steel (tighter spacing)
  ansi33: { angle: 45, spacing: 1.5, crossAngle: -45 }, // Brass/bronze (cross-hatch)
  ansi34: { angle: 30, spacing: 2.5 }, // Rubber/plastic
  ansi35: { angle: 45, spacing: 1.8, crossAngle: 135 }, // Fire brick
  ansi36: { angle: 60, spacing: 3.0 }, // Marble/glass
  ansi37: { angle: 45, spacing: 3.0, hasDots: true, dotDensity: 0.3 }, // Concrete
  ansi38: { angle: 0, spacing: 1.5, hasDots: true, dotDensity: 0.5 }, // Earth/sand
  cross: { angle: 45, spacing: 2.5, crossAngle: -45 }, // Simple cross-hatch
  dots: { angle: 0, spacing: 0, hasDots: true, dotDensity: 0.8 }, // Dot pattern only
  custom: { angle: 45, spacing: 2.0 }, // Base for custom
}

// =============================================================================
// GEOMETRY HELPERS
// =============================================================================

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false

  let inside = false
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

/**
 * Calculate bounding box of a polygon
 */
function getPolygonBounds(polygon: Point2D[]): { min: Point2D; max: Point2D } {
  if (polygon.length === 0) {
    return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
  }

  let minX = polygon[0].x
  let minY = polygon[0].y
  let maxX = polygon[0].x
  let maxY = polygon[0].y

  for (const p of polygon) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } }
}

/**
 * Line segment intersection with polygon edges
 * Returns clipped line segments that are inside the polygon
 */
function clipLineToPolygon(
  start: Point2D,
  end: Point2D,
  polygon: Point2D[]
): Array<{ start: Point2D; end: Point2D }> {
  // For simplicity, we'll use a scanline approach
  // Generate points along the line and find segments inside the polygon
  const segments: Array<{ start: Point2D; end: Point2D }> = []

  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return segments

  const steps = Math.max(Math.ceil(length / 0.5), 2) // Sample every 0.5mm
  const stepX = dx / steps
  const stepY = dy / steps

  let segmentStart: Point2D | null = null

  for (let i = 0; i <= steps; i++) {
    const point: Point2D = {
      x: start.x + stepX * i,
      y: start.y + stepY * i,
    }

    const inside = pointInPolygon(point, polygon)

    if (inside && segmentStart === null) {
      segmentStart = point
    } else if (!inside && segmentStart !== null) {
      // Approximate the exit point as the previous point
      const prevPoint: Point2D = {
        x: start.x + stepX * (i - 1),
        y: start.y + stepY * (i - 1),
      }
      segments.push({ start: segmentStart, end: prevPoint })
      segmentStart = null
    }
  }

  // Close any open segment
  if (segmentStart !== null) {
    segments.push({ start: segmentStart, end })
  }

  return segments
}

// =============================================================================
// RENDERING FUNCTIONS
// =============================================================================

/**
 * Draw parallel lines at a given angle, clipped to a polygon boundary
 */
function drawParallelLines(
  ctx: CanvasRenderingContext2D,
  polygon: Point2D[],
  angle: number,
  spacing: number,
  lineWeight: number
): void {
  if (polygon.length < 3 || spacing <= 0) return

  const bounds = getPolygonBounds(polygon)
  const diagonal = Math.sqrt(
    (bounds.max.x - bounds.min.x) ** 2 + (bounds.max.y - bounds.min.y) ** 2
  )

  // Center of bounding box
  const centerX = (bounds.min.x + bounds.max.x) / 2
  const centerY = (bounds.min.y + bounds.max.y) / 2

  // Convert angle to radians
  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  // Direction perpendicular to lines (for spacing)
  const perpX = -sin
  const perpY = cos

  // Generate lines from -diagonal/2 to +diagonal/2 in the perpendicular direction
  const numLines = Math.ceil(diagonal / spacing)

  ctx.lineWidth = lineWeight
  ctx.beginPath()

  for (let i = -numLines; i <= numLines; i++) {
    const offset = i * spacing

    // Line passes through (centerX + offset*perpX, centerY + offset*perpY)
    // Line direction is (cos, sin)
    const lineStartX = centerX + offset * perpX - diagonal * cos
    const lineStartY = centerY + offset * perpY - diagonal * sin
    const lineEndX = centerX + offset * perpX + diagonal * cos
    const lineEndY = centerY + offset * perpY + diagonal * sin

    // Clip line to polygon
    const segments = clipLineToPolygon(
      { x: lineStartX, y: lineStartY },
      { x: lineEndX, y: lineEndY },
      polygon
    )

    for (const seg of segments) {
      ctx.moveTo(seg.start.x, -seg.start.y) // Flip Y for canvas
      ctx.lineTo(seg.end.x, -seg.end.y)
    }
  }

  ctx.stroke()
}

/**
 * Draw random dots within a polygon
 */
function drawDots(
  ctx: CanvasRenderingContext2D,
  polygon: Point2D[],
  density: number,
  dotRadius: number
): void {
  if (polygon.length < 3 || density <= 0) return

  const bounds = getPolygonBounds(polygon)
  const area = (bounds.max.x - bounds.min.x) * (bounds.max.y - bounds.min.y)
  const numDots = Math.floor(area * density)

  // Use deterministic random for consistency
  const seed = polygon.length + bounds.min.x * 1000 + bounds.min.y
  let random = seed

  const nextRandom = () => {
    random = (random * 1103515245 + 12345) & 0x7fffffff
    return random / 0x7fffffff
  }

  ctx.beginPath()

  for (let i = 0; i < numDots; i++) {
    const x = bounds.min.x + nextRandom() * (bounds.max.x - bounds.min.x)
    const y = bounds.min.y + nextRandom() * (bounds.max.y - bounds.min.y)

    if (pointInPolygon({ x, y }, polygon)) {
      ctx.moveTo(x + dotRadius, -y)
      ctx.arc(x, -y, dotRadius, 0, Math.PI * 2)
    }
  }

  ctx.fill()
}

/**
 * Render a hatch region on canvas
 *
 * @param ctx - Canvas 2D rendering context (should be in paper coordinate system)
 * @param hatch - The hatch region to render
 * @param offsetX - X offset for the hatch (e.g., view position)
 * @param offsetY - Y offset for the hatch
 */
export function renderHatchRegion(
  ctx: CanvasRenderingContext2D,
  hatch: HatchRegion,
  offsetX = 0,
  offsetY = 0
): void {
  if (!hatch.visible || hatch.boundary.length < 3) return

  const config = hatch.config

  // Apply offset to boundary points
  const polygon = hatch.boundary.map((p) => ({
    x: p.x + offsetX,
    y: p.y + offsetY,
  }))

  // Get pattern definition
  const patternDef = PATTERN_DEFINITIONS[config.pattern]

  // Apply configuration overrides
  const angle = config.angle ?? patternDef.angle
  const spacing = (config.spacing ?? patternDef.spacing) * config.scale
  const crossAngle = config.crossAngle ?? patternDef.crossAngle

  ctx.save()
  ctx.globalAlpha = config.opacity
  ctx.strokeStyle = config.color
  ctx.fillStyle = config.color

  // Handle solid fill
  if (config.pattern === "solid") {
    ctx.beginPath()
    ctx.moveTo(polygon[0].x, -polygon[0].y)
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i].x, -polygon[i].y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    return
  }

  // Draw primary hatch lines
  if (spacing > 0) {
    drawParallelLines(ctx, polygon, angle, spacing, config.lineWeight)

    // Draw cross-hatch lines if specified
    if (crossAngle !== undefined) {
      drawParallelLines(ctx, polygon, crossAngle, spacing, config.lineWeight)
    }
  }

  // Draw dots if pattern includes them
  if (patternDef.hasDots && patternDef.dotDensity) {
    const dotRadius = config.lineWeight * 0.8
    drawDots(ctx, polygon, patternDef.dotDensity * config.scale, dotRadius)
  }

  ctx.restore()
}

/**
 * Render all hatch regions for a drawing
 *
 * @param ctx - Canvas 2D rendering context
 * @param hatches - Array of hatch regions
 * @param viewId - Optional: only render hatches for a specific view
 */
export function renderHatches(
  ctx: CanvasRenderingContext2D,
  hatches: HatchRegion[],
  viewId?: string
): void {
  const filtered = viewId ? hatches.filter((h) => h.viewId === viewId) : hatches

  for (const hatch of filtered) {
    if (hatch.visible) {
      renderHatchRegion(ctx, hatch)
    }
  }
}

/**
 * Create a rectangular hatch region (helper for quick hatching)
 */
export function createRectHatchBoundary(
  centerX: number,
  centerY: number,
  width: number,
  height: number
): Point2D[] {
  const halfW = width / 2
  const halfH = height / 2

  return [
    { x: centerX - halfW, y: centerY - halfH },
    { x: centerX + halfW, y: centerY - halfH },
    { x: centerX + halfW, y: centerY + halfH },
    { x: centerX - halfW, y: centerY + halfH },
  ]
}

/**
 * Get available hatch pattern names for UI
 */
export function getHatchPatternOptions(): Array<{ value: HatchPatternType; label: string }> {
  return [
    { value: "ansi31", label: "Diagonal (ANSI31)" },
    { value: "ansi32", label: "Steel (ANSI32)" },
    { value: "ansi33", label: "Brass (ANSI33)" },
    { value: "ansi37", label: "Concrete (ANSI37)" },
    { value: "ansi38", label: "Earth (ANSI38)" },
    { value: "cross", label: "Cross-Hatch" },
    { value: "dots", label: "Dots" },
    { value: "solid", label: "Solid" },
    { value: "custom", label: "Custom" },
  ]
}
