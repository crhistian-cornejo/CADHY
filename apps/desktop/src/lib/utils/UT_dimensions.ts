/**
 * Dimension Helpers - CADHY
 *
 * Utility functions for creating and manipulating dimensions in 2D drawings
 */

import type { Dimension, DimensionConfig, Point2D } from "@cadhy/types"

/**
 * Calculate distance from a point to a line segment
 */
export function pointToLineDistance(
  point: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D
): { distance: number; closestPoint: Point2D; t: number } {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const lengthSq = dx * dx + dy * dy

  if (lengthSq === 0) {
    // Line is a point
    const dist = Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2)
    return { distance: dist, closestPoint: lineStart, t: 0 }
  }

  // Calculate t (parameter along line segment)
  const t = Math.max(
    0,
    Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq)
  )

  // Closest point on line segment
  const closestPoint: Point2D = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  }

  // Distance
  const distance = Math.sqrt((point.x - closestPoint.x) ** 2 + (point.y - closestPoint.y) ** 2)

  return { distance, closestPoint, t }
}

/**
 * Create a horizontal dimension from two points
 */
export function createHorizontalDimension(
  p1: Point2D,
  p2: Point2D,
  config: DimensionConfig,
  offset: number = config.offset
): Dimension {
  const value = Math.abs(p2.x - p1.x)
  const yPos = offset < 0 ? Math.min(p1.y, p2.y) + offset : Math.max(p1.y, p2.y) + offset
  const textPos: Point2D = { x: (p1.x + p2.x) / 2, y: yPos }

  const sign = offset < 0 ? -1 : 1

  return {
    dimType: "Horizontal",
    value,
    unit: config.unit,
    textPosition: textPos,
    point1: p1,
    point2: p2,
    extensionLines: [
      {
        start: { x: p1.x, y: p1.y + config.extensionGap * sign },
        end: { x: p1.x, y: yPos + config.extensionOvershoot * sign },
      },
      {
        start: { x: p2.x, y: p2.y + config.extensionGap * sign },
        end: { x: p2.x, y: yPos + config.extensionOvershoot * sign },
      },
    ],
    dimensionLine: {
      start: { x: p1.x, y: yPos },
      end: { x: p2.x, y: yPos },
      startArrow: config.arrowStyle,
      endArrow: config.arrowStyle,
    },
    prefix: null,
    suffix: null,
    labelOverride: null,
  }
}

/**
 * Create a vertical dimension from two points
 */
export function createVerticalDimension(
  p1: Point2D,
  p2: Point2D,
  config: DimensionConfig,
  offset: number = config.offset
): Dimension {
  const value = Math.abs(p2.y - p1.y)
  const xPos = offset < 0 ? Math.min(p1.x, p2.x) + offset : Math.max(p1.x, p2.x) + offset
  const textPos: Point2D = { x: xPos, y: (p1.y + p2.y) / 2 }

  const sign = offset < 0 ? -1 : 1

  return {
    dimType: "Vertical",
    value,
    unit: config.unit,
    textPosition: textPos,
    point1: p1,
    point2: p2,
    extensionLines: [
      {
        start: { x: p1.x + config.extensionGap * sign, y: p1.y },
        end: { x: xPos + config.extensionOvershoot * sign, y: p1.y },
      },
      {
        start: { x: p2.x + config.extensionGap * sign, y: p2.y },
        end: { x: xPos + config.extensionOvershoot * sign, y: p2.y },
      },
    ],
    dimensionLine: {
      start: { x: xPos, y: p1.y },
      end: { x: xPos, y: p2.y },
      startArrow: config.arrowStyle,
      endArrow: config.arrowStyle,
    },
    prefix: null,
    suffix: null,
    labelOverride: null,
  }
}

/**
 * Create an aligned dimension from two points
 */
export function createAlignedDimension(
  p1: Point2D,
  p2: Point2D,
  config: DimensionConfig,
  offset: number = config.offset
): Dimension {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)

  // Perpendicular offset
  const perpX = -Math.sin(angle) * offset
  const perpY = Math.cos(angle) * offset

  const textPos: Point2D = {
    x: (p1.x + p2.x) / 2 + perpX,
    y: (p1.y + p2.y) / 2 + perpY,
  }

  const dimLineStart: Point2D = {
    x: p1.x + perpX,
    y: p1.y + perpY,
  }
  const dimLineEnd: Point2D = {
    x: p2.x + perpX,
    y: p2.y + perpY,
  }

  return {
    dimType: "Aligned",
    value: length,
    unit: config.unit,
    textPosition: textPos,
    point1: p1,
    point2: p2,
    extensionLines: [
      {
        start: p1,
        end: dimLineStart,
      },
      {
        start: p2,
        end: dimLineEnd,
      },
    ],
    dimensionLine: {
      start: dimLineStart,
      end: dimLineEnd,
      startArrow: config.arrowStyle,
      endArrow: config.arrowStyle,
    },
    prefix: null,
    suffix: null,
    labelOverride: null,
  }
}

/**
 * Recalculate a dimension's geometry with a new offset
 * This updates extensionLines, dimensionLine, and textPosition while preserving the original points
 */
export function recalculateDimensionWithOffset(
  dimension: Dimension,
  newOffset: number
): Partial<Dimension> {
  const p1 = dimension.point1
  const p2 = dimension.point2

  if (!p2) {
    // Radial or single-point dimensions - not supported for offset adjustment
    return {}
  }

  const dimType = dimension.dimType

  if (dimType === "Aligned") {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const angle = Math.atan2(dy, dx)

    // Perpendicular offset
    const perpX = -Math.sin(angle) * newOffset
    const perpY = Math.cos(angle) * newOffset

    const textPos: Point2D = {
      x: (p1.x + p2.x) / 2 + perpX,
      y: (p1.y + p2.y) / 2 + perpY,
    }

    const dimLineStart: Point2D = {
      x: p1.x + perpX,
      y: p1.y + perpY,
    }
    const dimLineEnd: Point2D = {
      x: p2.x + perpX,
      y: p2.y + perpY,
    }

    return {
      textPosition: textPos,
      extensionLines: [
        { start: p1, end: dimLineStart },
        { start: p2, end: dimLineEnd },
      ],
      dimensionLine: {
        ...dimension.dimensionLine,
        start: dimLineStart,
        end: dimLineEnd,
      },
    }
  } else if (dimType === "Horizontal") {
    const yPos = newOffset < 0 ? Math.min(p1.y, p2.y) + newOffset : Math.max(p1.y, p2.y) + newOffset
    const sign = newOffset < 0 ? -1 : 1
    const gap = 2 // extensionGap
    const overshoot = 2 // extensionOvershoot

    return {
      textPosition: { x: (p1.x + p2.x) / 2, y: yPos },
      extensionLines: [
        {
          start: { x: p1.x, y: p1.y + gap * sign },
          end: { x: p1.x, y: yPos + overshoot * sign },
        },
        {
          start: { x: p2.x, y: p2.y + gap * sign },
          end: { x: p2.x, y: yPos + overshoot * sign },
        },
      ],
      dimensionLine: {
        ...dimension.dimensionLine,
        start: { x: p1.x, y: yPos },
        end: { x: p2.x, y: yPos },
      },
    }
  } else if (dimType === "Vertical") {
    const xPos = newOffset < 0 ? Math.min(p1.x, p2.x) + newOffset : Math.max(p1.x, p2.x) + newOffset
    const sign = newOffset < 0 ? -1 : 1
    const gap = 2
    const overshoot = 2

    return {
      textPosition: { x: xPos, y: (p1.y + p2.y) / 2 },
      extensionLines: [
        {
          start: { x: p1.x + gap * sign, y: p1.y },
          end: { x: xPos + overshoot * sign, y: p1.y },
        },
        {
          start: { x: p2.x + gap * sign, y: p2.y },
          end: { x: xPos + overshoot * sign, y: p2.y },
        },
      ],
      dimensionLine: {
        ...dimension.dimensionLine,
        start: { x: xPos, y: p1.y },
        end: { x: xPos, y: p2.y },
      },
    }
  }

  return {}
}

/**
 * Create an angular dimension from three points
 * @param p1 - First point on leg A
 * @param vertex - Vertex (center of angle)
 * @param p3 - First point on leg B
 * @param config - Dimension configuration
 * @param radius - Arc radius (defaults to config.offset * 2)
 * @param measureReflex - If true, measure the exterior/reflex angle instead of interior
 */
export function createAngularDimension(
  p1: Point2D,
  vertex: Point2D,
  p3: Point2D,
  config: DimensionConfig,
  radius: number = config.offset * 2,
  measureReflex: boolean = false
): Dimension {
  // Calculate angles from vertex to each point
  const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
  const angle2 = Math.atan2(p3.y - vertex.y, p3.x - vertex.x)

  // Calculate the angle between the two legs
  let angleDiff = angle2 - angle1

  // Normalize to [0, 2π)
  while (angleDiff < 0) angleDiff += 2 * Math.PI
  while (angleDiff >= 2 * Math.PI) angleDiff -= 2 * Math.PI

  // Determine which angle to measure based on measureReflex flag
  const naturallyReflex = angleDiff > Math.PI
  const shouldDrawReflex = measureReflex ? !naturallyReflex : naturallyReflex

  // Calculate the angle value to display
  let angleValue: number
  if (measureReflex) {
    // User wants the exterior/reflex angle
    angleValue = naturallyReflex ? angleDiff : 2 * Math.PI - angleDiff
  } else {
    // User wants the interior angle (default)
    angleValue = naturallyReflex ? 2 * Math.PI - angleDiff : angleDiff
  }

  // Start and end angles for the arc
  let startAngle = angle1
  let endAngle = angle2
  if (shouldDrawReflex) {
    // Swap to draw the opposite arc
    startAngle = angle2
    endAngle = angle1
  }

  // Normalize angles for consistent arc drawing
  while (endAngle < startAngle) endAngle += 2 * Math.PI

  // Calculate midpoint angle for text position
  const midAngle = (startAngle + endAngle) / 2

  // Arc endpoints (on the dimension arc)
  const arcStart: Point2D = {
    x: vertex.x + Math.cos(startAngle) * radius,
    y: vertex.y + Math.sin(startAngle) * radius,
  }
  const arcEnd: Point2D = {
    x: vertex.x + Math.cos(endAngle) * radius,
    y: vertex.y + Math.sin(endAngle) * radius,
  }

  // Text position at the midpoint of the arc
  const textRadius = radius + config.textHeight * 0.5
  const textPos: Point2D = {
    x: vertex.x + Math.cos(midAngle) * textRadius,
    y: vertex.y + Math.sin(midAngle) * textRadius,
  }

  // Extension lines from vertex towards the leg points
  const extLen = radius + config.extensionOvershoot
  const ext1End: Point2D = {
    x: vertex.x + Math.cos(startAngle) * extLen,
    y: vertex.y + Math.sin(startAngle) * extLen,
  }
  const ext2End: Point2D = {
    x: vertex.x + Math.cos(endAngle) * extLen,
    y: vertex.y + Math.sin(endAngle) * extLen,
  }

  // Convert angle to degrees
  const angleDegrees = (angleValue * 180) / Math.PI

  return {
    dimType: "Angular",
    value: angleDegrees,
    unit: "°", // Angles always use degrees
    textPosition: textPos,
    point1: p1,
    point2: vertex,
    point3: p3,
    arcRadius: radius,
    extensionLines: [
      {
        start: vertex,
        end: ext1End,
      },
      {
        start: vertex,
        end: ext2End,
      },
    ],
    dimensionLine: {
      start: arcStart,
      end: arcEnd,
      startArrow: config.arrowStyle,
      endArrow: config.arrowStyle,
    },
    prefix: null,
    suffix: null,
    labelOverride: null,
  }
}

/**
 * Recalculate an angular dimension's geometry with a new arc radius
 */
export function recalculateAngularDimensionWithRadius(
  dimension: Dimension,
  newRadius: number,
  config: DimensionConfig
): Partial<Dimension> {
  if (dimension.dimType !== "Angular" || !dimension.point2 || !dimension.point3) {
    return {}
  }

  const p1 = dimension.point1
  const vertex = dimension.point2
  const p3 = dimension.point3

  // Calculate angles from vertex to each point
  const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
  const angle2 = Math.atan2(p3.y - vertex.y, p3.x - vertex.x)

  // Calculate the angle between the two legs
  let angleDiff = angle2 - angle1
  while (angleDiff < 0) angleDiff += 2 * Math.PI
  while (angleDiff >= 2 * Math.PI) angleDiff -= 2 * Math.PI

  const isReflex = angleDiff > Math.PI
  let startAngle = angle1
  let endAngle = angle2
  if (isReflex) {
    startAngle = angle2
    endAngle = angle1
  }
  while (endAngle < startAngle) endAngle += 2 * Math.PI

  const midAngle = (startAngle + endAngle) / 2

  const arcStart: Point2D = {
    x: vertex.x + Math.cos(startAngle) * newRadius,
    y: vertex.y + Math.sin(startAngle) * newRadius,
  }
  const arcEnd: Point2D = {
    x: vertex.x + Math.cos(endAngle) * newRadius,
    y: vertex.y + Math.sin(endAngle) * newRadius,
  }

  const textRadius = newRadius + config.textHeight * 0.5
  const textPos: Point2D = {
    x: vertex.x + Math.cos(midAngle) * textRadius,
    y: vertex.y + Math.sin(midAngle) * textRadius,
  }

  const extLen = newRadius + config.extensionOvershoot
  const ext1End: Point2D = {
    x: vertex.x + Math.cos(startAngle) * extLen,
    y: vertex.y + Math.sin(startAngle) * extLen,
  }
  const ext2End: Point2D = {
    x: vertex.x + Math.cos(endAngle) * extLen,
    y: vertex.y + Math.sin(endAngle) * extLen,
  }

  return {
    textPosition: textPos,
    arcRadius: newRadius,
    extensionLines: [
      { start: vertex, end: ext1End },
      { start: vertex, end: ext2End },
    ],
    dimensionLine: {
      ...dimension.dimensionLine,
      start: arcStart,
      end: arcEnd,
    },
  }
}

/**
 * Calculate the perpendicular distance from a point to the line defined by two points
 * Returns positive if on one side, negative if on the other
 */
export function calculatePerpendicularOffset(
  point: Point2D,
  lineP1: Point2D,
  lineP2: Point2D
): number {
  const dx = lineP2.x - lineP1.x
  const dy = lineP2.y - lineP1.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return 0

  // Vector from lineP1 to point
  const px = point.x - lineP1.x
  const py = point.y - lineP1.y

  // Cross product gives signed perpendicular distance * length
  const cross = dx * py - dy * px

  return cross / length
}

/**
 * Unit conversion factors to mm (millimeters)
 */
const UNIT_TO_MM: Record<string, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
}

/**
 * Format dimension value with unit conversion and formatting
 * @param value - Value in dimension.unit (from sheetConfig)
 * @param config - Dimension configuration (target display units)
 * @param sourceUnit - Optional source unit (defaults to config.unit)
 */
export function formatDimensionValue(
  value: number,
  config: DimensionConfig,
  sourceUnit?: string
): string {
  const precision = config.precision || 2

  // Convert value if source and target units differ
  let convertedValue = value
  const source = sourceUnit || config.unit
  const target = config.unit

  if (source !== target) {
    // Convert to mm first, then to target unit
    const valueInMm = value * (UNIT_TO_MM[source] || 1)
    convertedValue = valueInMm / (UNIT_TO_MM[target] || 1)
  }

  const formatted = convertedValue.toFixed(precision)
  return config.showUnit ? `${formatted} ${config.unit}` : formatted
}
