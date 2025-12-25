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
  tolerance: 8, // mm
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
 * Extract all snap points from a set of lines
 */
export function extractSnapPoints(
  lines: Line2D[],
  config: SnapConfig = DEFAULT_SNAP_CONFIG
): SnapPoint[] {
  const snapPoints: SnapPoint[] = []
  const addedPoints = new Set<string>() // To avoid duplicates

  const pointKey = (p: Point2D): string => `${p.x.toFixed(4)},${p.y.toFixed(4)}`

  // Extract endpoints and midpoints
  lines.forEach((line, index) => {
    // Only process visible lines for snapping
    const isVisible =
      line.line_type === "VisibleSharp" ||
      line.line_type === "VisibleSmooth" ||
      line.line_type === "VisibleOutline"

    if (!isVisible) return

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
  if (config.intersections) {
    for (let i = 0; i < lines.length; i++) {
      const line1 = lines[i]
      const isVisible1 =
        line1.line_type === "VisibleSharp" ||
        line1.line_type === "VisibleSmooth" ||
        line1.line_type === "VisibleOutline"
      if (!isVisible1) continue

      for (let j = i + 1; j < lines.length; j++) {
        const line2 = lines[j]
        const isVisible2 =
          line2.line_type === "VisibleSharp" ||
          line2.line_type === "VisibleSmooth" ||
          line2.line_type === "VisibleOutline"
        if (!isVisible2) continue

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
 */
export function findNearestSnapPoint(
  cursorPoint: Point2D,
  snapPoints: SnapPoint[],
  lines: Line2D[],
  config: SnapConfig = DEFAULT_SNAP_CONFIG
): SnapPoint | null {
  let nearestSnap: SnapPoint | null = null
  let nearestDistance = config.tolerance

  // First, check predefined snap points (endpoints, midpoints, intersections)
  for (const snap of snapPoints) {
    const dist = distance(cursorPoint, snap.point)
    if (dist < nearestDistance) {
      nearestDistance = dist
      nearestSnap = snap
    }
  }

  // If no predefined snap found, check for nearest point on any line
  if (!nearestSnap && config.nearest) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const isVisible =
        line.line_type === "VisibleSharp" ||
        line.line_type === "VisibleSmooth" ||
        line.line_type === "VisibleOutline"
      if (!isVisible) continue

      const closest = closestPointOnLine(cursorPoint, line.start, line.end)

      if (closest.distance < nearestDistance) {
        nearestDistance = closest.distance
        nearestSnap = {
          point: closest.point,
          type: "nearest",
          priority: 10,
          sourceLineIndex: i,
        }
      }
    }
  }

  return nearestSnap
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
 */
export function drawSnapIndicator(
  ctx: CanvasRenderingContext2D,
  snap: SnapPoint,
  size: number = 6,
  style: SnapIndicatorStyle = DEFAULT_SNAP_STYLE
): void {
  const { point, type } = snap
  const { color, symbol } = style[type]

  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = "transparent"
  ctx.lineWidth = 1.5

  const x = point.x
  const y = -point.y // Canvas Y is inverted

  switch (symbol) {
    case "square":
      // Endpoint: hollow square
      ctx.strokeRect(x - size / 2, y - size / 2, size, size)
      break

    case "triangle":
      // Midpoint: hollow triangle
      ctx.beginPath()
      ctx.moveTo(x, y - size / 2)
      ctx.lineTo(x - size / 2, y + size / 2)
      ctx.lineTo(x + size / 2, y + size / 2)
      ctx.closePath()
      ctx.stroke()
      break

    case "x":
      // Intersection: X mark
      ctx.beginPath()
      ctx.moveTo(x - size / 2, y - size / 2)
      ctx.lineTo(x + size / 2, y + size / 2)
      ctx.moveTo(x + size / 2, y - size / 2)
      ctx.lineTo(x - size / 2, y + size / 2)
      ctx.stroke()
      break

    case "circle":
      // Nearest/Center: hollow circle
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.stroke()
      break
  }

  // Draw tooltip label
  ctx.fillStyle = color
  ctx.font = "10px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "bottom"

  const labels: Record<SnapType, string> = {
    endpoint: "Extremo",
    midpoint: "Medio",
    intersection: "Intersección",
    nearest: "Cercano",
    center: "Centro",
  }

  ctx.fillText(labels[type], x, y - size - 2)

  ctx.restore()
}
