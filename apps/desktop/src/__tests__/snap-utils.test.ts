/**
 * Snap Utilities Tests - @cadhy/desktop
 *
 * Tests for the CAD snap system:
 * - Geometry helpers (distance, midpoint, intersection)
 * - Snap point extraction
 * - Snap configuration
 */

import { describe, expect, test } from "bun:test"
import type { Line2D, Point2D } from "@cadhy/types"
import {
  calculatePaperTolerance,
  closestPointOnLine,
  DEFAULT_SNAP_CONFIG,
  distance,
  extractSnapPoints,
  findNearestSnapPoint,
  getSnapConfigForTool,
  lineIntersection,
  midpoint,
  perpendicularFoot,
  quadrantPoints,
  TOOL_SNAP_CONFIGS,
} from "../lib/utils/UT_snap"

// ============================================================================
// GEOMETRY HELPERS
// ============================================================================

describe("distance", () => {
  test("returns 0 for same point", () => {
    const p = { x: 5, y: 5 }
    expect(distance(p, p)).toBe(0)
  })

  test("calculates horizontal distance", () => {
    const p1 = { x: 0, y: 0 }
    const p2 = { x: 10, y: 0 }
    expect(distance(p1, p2)).toBe(10)
  })

  test("calculates vertical distance", () => {
    const p1 = { x: 0, y: 0 }
    const p2 = { x: 0, y: 10 }
    expect(distance(p1, p2)).toBe(10)
  })

  test("calculates diagonal distance", () => {
    const p1 = { x: 0, y: 0 }
    const p2 = { x: 3, y: 4 }
    expect(distance(p1, p2)).toBe(5) // 3-4-5 triangle
  })
})

describe("midpoint", () => {
  test("returns midpoint between two points", () => {
    const start = { x: 0, y: 0 }
    const end = { x: 10, y: 10 }

    const result = midpoint(start, end)

    expect(result).toEqual({ x: 5, y: 5 })
  })

  test("handles negative coordinates", () => {
    const start = { x: -10, y: -10 }
    const end = { x: 10, y: 10 }

    const result = midpoint(start, end)

    expect(result).toEqual({ x: 0, y: 0 })
  })

  test("returns same point for zero-length line", () => {
    const point = { x: 5, y: 5 }

    const result = midpoint(point, point)

    expect(result).toEqual({ x: 5, y: 5 })
  })
})

describe("lineIntersection", () => {
  test("finds intersection of crossing lines", () => {
    // Line 1: (0,0) to (10,10)
    // Line 2: (0,10) to (10,0)
    // Should intersect at (5,5)
    const result = lineIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 10, y: 0 }
    )

    expect(result).not.toBeNull()
    expect(result!.x).toBeCloseTo(5, 5)
    expect(result!.y).toBeCloseTo(5, 5)
  })

  test("returns null for parallel lines", () => {
    const result = lineIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 5 },
      { x: 10, y: 5 }
    )

    expect(result).toBeNull()
  })

  test("returns null for non-intersecting segments", () => {
    // Lines would intersect if extended, but segments don't touch
    const result = lineIntersection({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 5, y: 5 }, { x: 6, y: 6 })

    expect(result).toBeNull()
  })

  test("finds intersection at segment endpoints", () => {
    const result = lineIntersection({ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 10, y: 0 })

    expect(result).not.toBeNull()
    expect(result!.x).toBeCloseTo(5, 5)
    expect(result!.y).toBeCloseTo(5, 5)
  })
})

describe("closestPointOnLine", () => {
  test("returns start point when closest", () => {
    const result = closestPointOnLine({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })

    expect(result.point).toEqual({ x: 0, y: 0 })
    expect(result.t).toBe(0)
  })

  test("returns end point when closest", () => {
    const result = closestPointOnLine({ x: 11, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })

    expect(result.point).toEqual({ x: 10, y: 0 })
    expect(result.t).toBe(1)
  })

  test("returns midpoint for perpendicular projection", () => {
    const result = closestPointOnLine({ x: 5, y: 10 }, { x: 0, y: 0 }, { x: 10, y: 0 })

    expect(result.point).toEqual({ x: 5, y: 0 })
    expect(result.t).toBe(0.5)
    expect(result.distance).toBe(10)
  })

  test("handles zero-length line", () => {
    const point = { x: 5, y: 5 }
    const result = closestPointOnLine({ x: 10, y: 10 }, point, point)

    expect(result.point).toEqual(point)
    expect(result.t).toBe(0)
  })
})

describe("perpendicularFoot", () => {
  test("finds foot on segment", () => {
    const result = perpendicularFoot({ x: 5, y: 10 }, { x: 0, y: 0 }, { x: 10, y: 0 })

    expect(result.point).toEqual({ x: 5, y: 0 })
    expect(result.onSegment).toBe(true)
    expect(result.t).toBe(0.5)
  })

  test("finds foot outside segment", () => {
    const result = perpendicularFoot({ x: 15, y: 10 }, { x: 0, y: 0 }, { x: 10, y: 0 })

    expect(result.point.x).toBe(15)
    expect(result.point.y).toBe(0)
    expect(result.onSegment).toBe(false)
    expect(result.t).toBe(1.5)
  })
})

describe("quadrantPoints", () => {
  test("returns four quadrant points", () => {
    const circle = { center: { x: 0, y: 0 }, radius: 10 }

    const points = quadrantPoints(circle)

    expect(points).toHaveLength(4)
    expect(points).toContainEqual({ x: 10, y: 0 }) // East
    expect(points).toContainEqual({ x: 0, y: 10 }) // North
    expect(points).toContainEqual({ x: -10, y: 0 }) // West
    expect(points).toContainEqual({ x: 0, y: -10 }) // South
  })

  test("handles offset center", () => {
    const circle = { center: { x: 5, y: 5 }, radius: 10 }

    const points = quadrantPoints(circle)

    expect(points).toContainEqual({ x: 15, y: 5 }) // East
    expect(points).toContainEqual({ x: 5, y: 15 }) // North
  })
})

// ============================================================================
// SNAP CONFIGURATION
// ============================================================================

describe("getSnapConfigForTool", () => {
  test("returns base config for null tool", () => {
    const config = getSnapConfigForTool(null)

    expect(config).toEqual(DEFAULT_SNAP_CONFIG)
  })

  test("returns auto config with all snaps enabled", () => {
    const config = getSnapConfigForTool("auto")

    expect(config.endpoints).toBe(true)
    expect(config.midpoints).toBe(true)
    expect(config.intersections).toBe(true)
    expect(config.nearest).toBe(true)
  })

  test("line-length disables midpoints and intersections", () => {
    const config = getSnapConfigForTool("line-length")

    expect(config.endpoints).toBe(true)
    expect(config.midpoints).toBe(false)
    expect(config.intersections).toBe(false)
    expect(config.nearest).toBe(true)
  })

  test("point-to-point disables nearest", () => {
    const config = getSnapConfigForTool("point-to-point")

    expect(config.endpoints).toBe(true)
    expect(config.midpoints).toBe(true)
    expect(config.intersections).toBe(true)
    expect(config.nearest).toBe(false)
  })

  test("angle disables midpoints and nearest", () => {
    const config = getSnapConfigForTool("angle")

    expect(config.endpoints).toBe(true)
    expect(config.midpoints).toBe(false)
    expect(config.nearest).toBe(false)
    expect(config.intersections).toBe(true)
  })
})

describe("calculatePaperTolerance", () => {
  test("smaller tolerance when zoomed in", () => {
    const screenTolerance = 15
    const zoomedIn = calculatePaperTolerance(screenTolerance, 100) // High scale = zoomed in
    const zoomedOut = calculatePaperTolerance(screenTolerance, 10) // Low scale = zoomed out

    expect(zoomedIn).toBeLessThan(zoomedOut)
  })

  test("calculates correct paper tolerance", () => {
    const result = calculatePaperTolerance(20, 2) // 20px at 2x scale
    expect(result).toBe(10) // 20 / 2 = 10mm
  })
})

// ============================================================================
// SNAP POINT EXTRACTION
// ============================================================================

describe("extractSnapPoints", () => {
  const createLine = (start: Point2D, end: Point2D, lineType: string = "VisibleSharp"): Line2D => ({
    start,
    end,
    line_type: lineType,
  })

  test("extracts endpoints from lines", () => {
    const lines = [createLine({ x: 0, y: 0 }, { x: 10, y: 0 })]

    const snaps = extractSnapPoints(lines, { ...DEFAULT_SNAP_CONFIG, midpoints: false })

    const endpoints = snaps.filter((s) => s.type === "endpoint")
    expect(endpoints).toHaveLength(2)
  })

  test("extracts midpoints from lines", () => {
    const lines = [createLine({ x: 0, y: 0 }, { x: 10, y: 0 })]

    const snaps = extractSnapPoints(lines, { ...DEFAULT_SNAP_CONFIG, endpoints: false })

    const midpoints = snaps.filter((s) => s.type === "midpoint")
    expect(midpoints).toHaveLength(1)
    expect(midpoints[0].point).toEqual({ x: 5, y: 0 })
  })

  test("extracts intersections from crossing lines", () => {
    const lines = [
      createLine({ x: 0, y: 0 }, { x: 10, y: 10 }),
      createLine({ x: 0, y: 10 }, { x: 10, y: 0 }),
    ]

    const snaps = extractSnapPoints(lines, {
      ...DEFAULT_SNAP_CONFIG,
      endpoints: false,
      midpoints: false,
    })

    const intersections = snaps.filter((s) => s.type === "intersection")
    expect(intersections).toHaveLength(1)
    expect(intersections[0].point.x).toBeCloseTo(5, 5)
    expect(intersections[0].point.y).toBeCloseTo(5, 5)
  })

  test("deduplicates coincident endpoints", () => {
    const lines = [
      createLine({ x: 0, y: 0 }, { x: 5, y: 0 }),
      createLine({ x: 5, y: 0 }, { x: 10, y: 0 }),
    ]

    const snaps = extractSnapPoints(lines, { ...DEFAULT_SNAP_CONFIG, midpoints: false })

    const endpoints = snaps.filter((s) => s.type === "endpoint")
    // Should have 3 unique points: (0,0), (5,0), (10,0)
    expect(endpoints).toHaveLength(3)
  })

  test("ignores non-snappable line types", () => {
    const lines = [
      createLine({ x: 0, y: 0 }, { x: 10, y: 0 }, "IsoParametric"), // Not snappable
    ]

    const snaps = extractSnapPoints(lines)

    expect(snaps).toHaveLength(0)
  })

  test("includes hidden lines", () => {
    const lines = [createLine({ x: 0, y: 0 }, { x: 10, y: 0 }, "HiddenSharp")]

    const snaps = extractSnapPoints(lines)

    expect(snaps.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// FIND NEAREST SNAP POINT
// ============================================================================

describe("findNearestSnapPoint", () => {
  const createLine = (start: Point2D, end: Point2D): Line2D => ({
    start,
    end,
    line_type: "VisibleSharp",
  })

  test("finds closest endpoint", () => {
    const lines = [createLine({ x: 0, y: 0 }, { x: 10, y: 0 })]
    const snapPoints = extractSnapPoints(lines)

    const result = findNearestSnapPoint({ x: 0.5, y: 0.5 }, snapPoints, lines, {
      ...DEFAULT_SNAP_CONFIG,
      tolerance: 5,
    })

    expect(result).not.toBeNull()
    expect(result!.type).toBe("endpoint")
    expect(result!.point).toEqual({ x: 0, y: 0 })
  })

  test("returns null when no snap within tolerance", () => {
    const lines = [createLine({ x: 0, y: 0 }, { x: 10, y: 0 })]
    const snapPoints = extractSnapPoints(lines)

    const result = findNearestSnapPoint({ x: 100, y: 100 }, snapPoints, lines, {
      ...DEFAULT_SNAP_CONFIG,
      tolerance: 5,
    })

    expect(result).toBeNull()
  })

  test("prefers intersection over endpoint when closer", () => {
    // Two lines crossing at (5,5)
    const lines = [
      createLine({ x: 0, y: 0 }, { x: 10, y: 10 }),
      createLine({ x: 0, y: 10 }, { x: 10, y: 0 }),
    ]
    const snapPoints = extractSnapPoints(lines)

    // Cursor near intersection
    const result = findNearestSnapPoint({ x: 5, y: 5 }, snapPoints, lines, {
      ...DEFAULT_SNAP_CONFIG,
      tolerance: 5,
    })

    expect(result).not.toBeNull()
    expect(result!.type).toBe("intersection")
  })

  test("finds nearest point on line", () => {
    const lines = [createLine({ x: 0, y: 0 }, { x: 10, y: 0 })]
    // Empty snap points to force nearest search
    const snapPoints: any[] = []

    const result = findNearestSnapPoint({ x: 5, y: 2 }, snapPoints, lines, {
      ...DEFAULT_SNAP_CONFIG,
      tolerance: 5,
      endpoints: false,
      midpoints: false,
      intersections: false,
      nearest: true,
    })

    expect(result).not.toBeNull()
    expect(result!.type).toBe("nearest")
    expect(result!.point.x).toBe(5)
    expect(result!.point.y).toBe(0)
  })
})
