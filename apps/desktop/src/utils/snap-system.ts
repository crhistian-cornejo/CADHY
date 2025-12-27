/**
 * Snap System - CADHY
 *
 * Professional CAD-style snap point detection system.
 * Supports: Endpoints, Midpoints, Intersections, Nearest point on line.
 *
 * Based on AutoCAD Object Snap (OSNAP) concepts.
 * @see https://www.mycadsite.com/tutorials/level_4/autocad-osnaps-4-2.html
 */

import type { Line2D, Point2D } from "@cadhy/types"

// =============================================================================
// TYPES
// =============================================================================

export type SnapType = "endpoint" | "midpoint" | "intersection" | "nearest" | "center"

export interface SnapPoint {
  /** The snap point coordinates (in view-local space) */
  point: Point2D
  /** Type of snap */
  type: SnapType
  /** Priority (lower = higher priority) */
  priority: number
  /** Source line index (for debugging) */
  sourceLineIndex?: number
  /** Second source line index (for intersections) */
  secondLineIndex?: number
}

export interface SnapConfig {
  /** Enable endpoint snapping */
  endpoints: boolean
  /** Enable midpoint snapping */
  midpoints: boolean
  /** Enable intersection snapping */
  intersections: boolean
  /** Enable nearest point on line */
  nearest: boolean
  /** Snap tolerance in mm */
  tolerance: number
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  endpoints: true,
  midpoints: true,
  intersections: true,
  nearest: true,
  tolerance: 8, // mm (fallback, prefer using screen-space tolerance)
}

// =============================================================================
// CONTEXTUAL SNAP CONFIGURATION
// =============================================================================

/**
 * Dimension tool types (matches DrawingToolsPanel.tsx)
 * Used for contextual snap filtering
 */
export type DimensionToolType = "auto" | "line-length" | "point-to-point" | "angle" | "nota"

/**
 * Contextual snap configurations for each dimension tool.
 *
 * Based on AutoCAD OSNAP behavior:
 * - Each tool only enables snaps that make sense for its purpose
 * - Reduces visual clutter and improves precision
 *
 * @see https://knowledge.autodesk.com/support/autocad/learn-explore/caas/CloudHelp/cloudhelp/2023/ENU/AutoCAD-Core/files/GUID-A0B0C82B-C0E8-4D59-8A76-9B7B6B4C5D2D-htm.html
 */
export const TOOL_SNAP_CONFIGS: Record<DimensionToolType, Partial<SnapConfig>> = {
  /**
   * Auto dimension: All snaps enabled for intelligent detection.
   * The algorithm detects what type of dimension makes sense based on context.
   */
  auto: {
    endpoints: true,
    midpoints: true,
    intersections: true,
    nearest: true,
  },

  /**
   * Line length: Only endpoints and nearest.
   * - Endpoints: To select line termination points
   * - Nearest: To select any point along the line for partial measurement
   * - No midpoints/intersections: Not needed for line length
   */
  "line-length": {
    endpoints: true,
    midpoints: false,
    intersections: false,
    nearest: true,
  },

  /**
   * Point-to-point: Distance between two arbitrary points.
   * - Endpoints: Common for measuring between corners
   * - Midpoints: Useful for center-to-center measurements
   * - Intersections: Where lines cross
   * - No nearest: Would be confusing for point-to-point
   */
  "point-to-point": {
    endpoints: true,
    midpoints: true,
    intersections: true,
    nearest: false,
  },

  /**
   * Angle measurement: Requires 3 points to form an angle.
   * - Endpoints: Vertex and angle arms endpoints
   * - Intersections: Where lines meet to form vertex
   * - No midpoints: Not typically used for angles
   * - No nearest: Would cause imprecise angle measurements
   */
  angle: {
    endpoints: true,
    midpoints: false,
    intersections: true,
    nearest: false,
  },

  /**
   * Annotation/Note: All snaps - notes can anchor anywhere.
   */
  nota: {
    endpoints: true,
    midpoints: true,
    intersections: true,
    nearest: true,
  },
}

/**
 * Get a snap configuration tailored for a specific dimension tool.
 * This enables contextual snapping - the system only shows relevant snaps
 * for the current operation, reducing clutter and improving precision.
 *
 * @param tool - The active dimension tool
 * @param baseConfig - Optional base configuration to merge with
 * @returns Merged snap configuration for the tool
 *
 * @example
 * // When using the angle tool:
 * const snapConfig = getSnapConfigForTool("angle")
 * // Returns: { endpoints: true, midpoints: false, intersections: true, nearest: false, tolerance: 8 }
 */
export function getSnapConfigForTool(
  tool: DimensionToolType | null,
  baseConfig: SnapConfig = DEFAULT_SNAP_CONFIG
): SnapConfig {
  if (!tool) {
    return baseConfig
  }

  const toolConfig = TOOL_SNAP_CONFIGS[tool]
  if (!toolConfig) {
    return baseConfig
  }

  return {
    ...baseConfig,
    ...toolConfig,
  }
}

/**
 * Default snap tolerance in screen pixels.
 * This provides consistent snap behavior regardless of zoom level.
 * A value of 15-20px works well for professional CAD interaction.
 */
export const SCREEN_SNAP_TOLERANCE_PX = 18

/**
 * Calculate zoom-aware tolerance in paper space (mm)
 * @param screenTolerance - Tolerance in screen pixels
 * @param paperToScreenScale - Conversion factor (screen pixels per mm)
 * @returns Tolerance in paper space (mm)
 */
export function calculatePaperTolerance(
  screenTolerance: number,
  paperToScreenScale: number
): number {
  // Convert screen pixels to paper mm
  // When zoomed in (high scale), tolerance gets smaller (more precise)
  // When zoomed out (low scale), tolerance gets larger (easier to hit)
  return screenTolerance / paperToScreenScale
}

// =============================================================================
// GEOMETRY HELPERS
// =============================================================================

/**
 * Calculate distance between two points
 */
export function distance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
}

/**
 * Calculate midpoint of a line segment
 */
export function midpoint(start: Point2D, end: Point2D): Point2D {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  }
}

/**
 * Find intersection point of two line segments
 * Returns null if lines don't intersect or are parallel
 * @see https://www.sunshine2k.de/coding/javascript/lineintersection2d/LineIntersect2D.html
 */
export function lineIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): Point2D | null {
  const x1 = p1.x,
    y1 = p1.y
  const x2 = p2.x,
    y2 = p2.y
  const x3 = p3.x,
    y3 = p3.y
  const x4 = p4.x,
    y4 = p4.y

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)

  // Lines are parallel or coincident
  if (Math.abs(denom) < 1e-10) {
    return null
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  // Check if intersection is within both line segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    }
  }

  return null
}

/**
 * Find the closest point on a line segment to a given point
 */
export function closestPointOnLine(
  point: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D
): { point: Point2D; distance: number; t: number } {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const lengthSq = dx * dx + dy * dy

  if (lengthSq === 0) {
    // Line is a point
    return {
      point: lineStart,
      distance: distance(point, lineStart),
      t: 0,
    }
  }

  // Calculate parameter t (0 = start, 1 = end)
  const t = Math.max(
    0,
    Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq)
  )

  const closest: Point2D = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  }

  return {
    point: closest,
    distance: distance(point, closest),
    t,
  }
}

// =============================================================================
// SNAP POINT EXTRACTION
// =============================================================================

/**
 * Check if a line type is snappable (visible or hidden, but not construction/auxiliary)
 */
function isSnappableLineType(lineType: string): boolean {
  return (
    // Visible lines
    lineType === "VisibleSharp" ||
    lineType === "VisibleSmooth" ||
    lineType === "VisibleOutline" ||
    // Hidden/dashed lines
    lineType === "HiddenSharp" ||
    lineType === "HiddenSmooth" ||
    lineType === "HiddenOutline"
  )
}

/**
 * Extract all snap points from a set of lines
 * Includes both visible and hidden (dashed) lines for complete snapping
 */
export function extractSnapPoints(
  lines: Line2D[],
  config: SnapConfig = DEFAULT_SNAP_CONFIG
): SnapPoint[] {
  const snapPoints: SnapPoint[] = []
  const addedPoints = new Set<string>() // To avoid duplicates

  const pointKey = (p: Point2D): string => `${p.x.toFixed(4)},${p.y.toFixed(4)}`

  // Extract endpoints and midpoints from all snappable lines
  lines.forEach((line, index) => {
    if (!isSnappableLineType(line.line_type)) return

    // Endpoints
    if (config.endpoints) {
      const startKey = pointKey(line.start)
      if (!addedPoints.has(startKey)) {
        addedPoints.add(startKey)
        snapPoints.push({
          point: { ...line.start },
          type: "endpoint",
          priority: 1,
          sourceLineIndex: index,
        })
      }

      const endKey = pointKey(line.end)
      if (!addedPoints.has(endKey)) {
        addedPoints.add(endKey)
        snapPoints.push({
          point: { ...line.end },
          type: "endpoint",
          priority: 1,
          sourceLineIndex: index,
        })
      }
    }

    // Midpoints
    if (config.midpoints) {
      const mid = midpoint(line.start, line.end)
      const midKey = `mid_${pointKey(mid)}`
      if (!addedPoints.has(midKey)) {
        addedPoints.add(midKey)
        snapPoints.push({
          point: mid,
          type: "midpoint",
          priority: 2,
          sourceLineIndex: index,
        })
      }
    }
  })

  // Extract intersections (O(n²) but necessary for accuracy)
  // Includes intersections between visible-visible, visible-hidden, and hidden-hidden lines
  if (config.intersections) {
    for (let i = 0; i < lines.length; i++) {
      const line1 = lines[i]
      if (!isSnappableLineType(line1.line_type)) continue

      for (let j = i + 1; j < lines.length; j++) {
        const line2 = lines[j]
        if (!isSnappableLineType(line2.line_type)) continue

        const intersection = lineIntersection(line1.start, line1.end, line2.start, line2.end)

        if (intersection) {
          const intKey = `int_${pointKey(intersection)}`
          if (!addedPoints.has(intKey)) {
            addedPoints.add(intKey)
            snapPoints.push({
              point: intersection,
              type: "intersection",
              priority: 0, // Highest priority
              sourceLineIndex: i,
              secondLineIndex: j,
            })
          }
        }
      }
    }
  }

  return snapPoints
}

/**
 * Find the nearest snap point to a given cursor position
 * Uses a priority system where high-priority snaps (intersections, endpoints, midpoints)
 * always win over low-priority snaps (nearest on line) when within tolerance.
 *
 * @param cursorPoint - Cursor position in paper coordinates
 * @param snapPoints - Pre-extracted snap points
 * @param lines - All lines in the view
 * @param config - Snap configuration
 * @param toleranceOverride - Optional tolerance in paper space (use for zoom-aware snapping)
 */
export function findNearestSnapPoint(
  cursorPoint: Point2D,
  snapPoints: SnapPoint[],
  lines: Line2D[],
  config: SnapConfig = DEFAULT_SNAP_CONFIG,
  toleranceOverride?: number
): SnapPoint | null {
  // Use tolerance override if provided, otherwise fall back to config
  const tolerance = toleranceOverride ?? config.tolerance

  // Collect all candidate snaps with their distances
  const candidates: Array<{ snap: SnapPoint; dist: number }> = []

  // Check predefined snap points (endpoints, midpoints, intersections)
  for (const snap of snapPoints) {
    const dist = distance(cursorPoint, snap.point)
    if (dist < tolerance) {
      candidates.push({ snap, dist })
    }
  }

  // Check for nearest point on any snappable line (visible or hidden)
  if (config.nearest) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!isSnappableLineType(line.line_type)) continue

      const closest = closestPointOnLine(cursorPoint, line.start, line.end)

      if (closest.distance < tolerance) {
        candidates.push({
          snap: {
            point: closest.point,
            type: "nearest",
            priority: 10,
            sourceLineIndex: i,
          },
          dist: closest.distance,
        })
      }
    }
  }

  if (candidates.length === 0) {
    return null
  }

  // Sort candidates by: 1) priority (lower = better), 2) distance (closer = better)
  candidates.sort((a, b) => {
    // First compare by priority - lower priority wins
    if (a.snap.priority !== b.snap.priority) {
      return a.snap.priority - b.snap.priority
    }
    // Same priority - closer distance wins
    return a.dist - b.dist
  })

  // Return the best candidate (lowest priority, closest distance)
  return candidates[0].snap
}

// =============================================================================
// SNAP INDICATOR RENDERING
// =============================================================================

export interface SnapIndicatorStyle {
  endpoint: { color: string; symbol: "square" }
  midpoint: { color: string; symbol: "triangle" }
  intersection: { color: string; symbol: "x" }
  nearest: { color: string; symbol: "circle" }
  center: { color: string; symbol: "circle" }
}

export const DEFAULT_SNAP_STYLE: SnapIndicatorStyle = {
  endpoint: { color: "#22c55e", symbol: "square" },
  midpoint: { color: "#3b82f6", symbol: "triangle" },
  intersection: { color: "#f59e0b", symbol: "x" },
  nearest: { color: "#8b5cf6", symbol: "circle" },
  center: { color: "#ec4899", symbol: "circle" },
}

/**
 * Draw a snap indicator at the given position
 * Enhanced for better CAD-like visibility
 */
export function drawSnapIndicator(
  ctx: CanvasRenderingContext2D,
  snap: SnapPoint,
  size: number = 8,
  style: SnapIndicatorStyle = DEFAULT_SNAP_STYLE
): void {
  const { point, type } = snap
  const { color, symbol } = style[type]

  ctx.save()

  const x = point.x
  const y = -point.y // Canvas Y is inverted

  // Draw subtle glow/background for better visibility
  ctx.shadowColor = color
  ctx.shadowBlur = size * 0.5
  ctx.strokeStyle = color
  ctx.fillStyle = "transparent"
  // Line width proportional to size for consistent appearance at any zoom
  ctx.lineWidth = size * 0.25

  switch (symbol) {
    case "square":
      // Endpoint: hollow square with crosshairs
      ctx.strokeRect(x - size / 2, y - size / 2, size, size)
      // Add small crosshairs inside
      ctx.beginPath()
      ctx.moveTo(x - size * 0.2, y)
      ctx.lineTo(x + size * 0.2, y)
      ctx.moveTo(x, y - size * 0.2)
      ctx.lineTo(x, y + size * 0.2)
      ctx.stroke()
      break

    case "triangle":
      // Midpoint: hollow triangle pointing down
      ctx.beginPath()
      ctx.moveTo(x, y + size / 2)
      ctx.lineTo(x - size / 2, y - size / 2)
      ctx.lineTo(x + size / 2, y - size / 2)
      ctx.closePath()
      ctx.stroke()
      break

    case "x":
      // Intersection: X mark inside a circle for visibility
      ctx.beginPath()
      ctx.arc(x, y, size * 0.6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x - size * 0.35, y - size * 0.35)
      ctx.lineTo(x + size * 0.35, y + size * 0.35)
      ctx.moveTo(x + size * 0.35, y - size * 0.35)
      ctx.lineTo(x - size * 0.35, y + size * 0.35)
      ctx.stroke()
      break

    case "circle":
      // Nearest/Center: hollow circle with dot
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.stroke()
      // Add center dot for precision
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, size * 0.15, 0, Math.PI * 2)
      ctx.fill()
      break
  }

  // Remove shadow for text
  ctx.shadowBlur = 0

  // Draw tooltip label with background
  const labels: Record<SnapType, string> = {
    endpoint: "Extremo",
    midpoint: "Medio",
    intersection: "Intersección",
    nearest: "Cercano",
    center: "Centro",
  }

  const labelText = labels[type]
  // Font size proportional to indicator size for consistent appearance at any zoom
  const fontSize = size * 1.1 // Slightly larger than indicator for readability
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "bottom"

  // Measure text for background
  const textMetrics = ctx.measureText(labelText)
  const textWidth = textMetrics.width
  const textHeight = fontSize
  const padding = size * 0.25 // Proportional padding
  const labelY = y - size - size * 0.5 // Proportional offset

  // Draw label background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
  ctx.fillRect(
    x - textWidth / 2 - padding,
    labelY - textHeight - padding,
    textWidth + padding * 2,
    textHeight + padding * 2
  )

  // Draw label text
  ctx.fillStyle = color
  ctx.fillText(labelText, x, labelY)

  ctx.restore()
}
