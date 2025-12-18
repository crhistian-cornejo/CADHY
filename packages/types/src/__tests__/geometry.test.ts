/**
 * Geometry Types Tests - @cadhy/types
 */

import { describe, expect, test } from "bun:test"
import type { BBox, Plane, Transform, Vec2, Vec3 } from "../geometry"

describe("Vec2 type", () => {
  test("should create valid Vec2", () => {
    const vec: Vec2 = { x: 1, y: 2 }
    expect(vec.x).toBe(1)
    expect(vec.y).toBe(2)
  })

  test("should handle negative values", () => {
    const vec: Vec2 = { x: -5.5, y: -10.25 }
    expect(vec.x).toBe(-5.5)
    expect(vec.y).toBe(-10.25)
  })

  test("should handle zero values", () => {
    const vec: Vec2 = { x: 0, y: 0 }
    expect(vec.x).toBe(0)
    expect(vec.y).toBe(0)
  })
})

describe("Vec3 type", () => {
  test("should create valid Vec3", () => {
    const vec: Vec3 = { x: 1, y: 2, z: 3 }
    expect(vec.x).toBe(1)
    expect(vec.y).toBe(2)
    expect(vec.z).toBe(3)
  })

  test("should handle floating point values", () => {
    const vec: Vec3 = { x: 1.5, y: 2.75, z: 3.125 }
    expect(vec.x).toBe(1.5)
    expect(vec.y).toBe(2.75)
    expect(vec.z).toBe(3.125)
  })
})

describe("Plane type", () => {
  test("should create valid Plane", () => {
    const plane: Plane = {
      origin: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
    }
    expect(plane.origin).toEqual({ x: 0, y: 0, z: 0 })
    expect(plane.normal).toEqual({ x: 0, y: 0, z: 1 })
  })

  test("should create XY plane", () => {
    const xyPlane: Plane = {
      origin: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
    }
    expect(xyPlane.normal.z).toBe(1)
  })

  test("should create XZ plane", () => {
    const xzPlane: Plane = {
      origin: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 1, z: 0 },
    }
    expect(xzPlane.normal.y).toBe(1)
  })
})

describe("BBox type", () => {
  test("should create valid BBox", () => {
    const bbox: BBox = {
      min: { x: -1, y: -1, z: -1 },
      max: { x: 1, y: 1, z: 1 },
    }
    expect(bbox.min).toEqual({ x: -1, y: -1, z: -1 })
    expect(bbox.max).toEqual({ x: 1, y: 1, z: 1 })
  })

  test("should calculate dimensions from BBox", () => {
    const bbox: BBox = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 10, y: 5, z: 3 },
    }
    const width = bbox.max.x - bbox.min.x
    const height = bbox.max.y - bbox.min.y
    const depth = bbox.max.z - bbox.min.z
    expect(width).toBe(10)
    expect(height).toBe(5)
    expect(depth).toBe(3)
  })
})

describe("Transform type", () => {
  test("should create identity transform", () => {
    const transform: Transform = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    }
    expect(transform.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(transform.rotation).toEqual({ x: 0, y: 0, z: 0 })
    expect(transform.scale).toEqual({ x: 1, y: 1, z: 1 })
  })

  test("should create translated transform", () => {
    const transform: Transform = {
      position: { x: 10, y: 20, z: 30 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    }
    expect(transform.position).toEqual({ x: 10, y: 20, z: 30 })
  })

  test("should create scaled transform", () => {
    const transform: Transform = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 2, y: 2, z: 2 },
    }
    expect(transform.scale).toEqual({ x: 2, y: 2, z: 2 })
  })
})
