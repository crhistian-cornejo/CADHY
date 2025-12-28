/**
 * Camera Utilities Tests - @cadhy/desktop
 *
 * Tests for camera interpolation and easing functions:
 * - Easing functions
 * - Vec3 interpolation
 * - Camera keyframe interpolation
 */

import { describe, expect, test } from "bun:test"
import type { CameraAnimation, CameraKeyframe } from "../core/stores/modeller"
import {
  applyEasing,
  getCameraAtTime,
  type InterpolatedCamera,
  lerpVec3,
} from "../lib/utils/UT_camera"

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

describe("applyEasing", () => {
  test("linear returns input unchanged", () => {
    expect(applyEasing(0, "linear")).toBe(0)
    expect(applyEasing(0.5, "linear")).toBe(0.5)
    expect(applyEasing(1, "linear")).toBe(1)
  })

  test("ease-in starts slow", () => {
    // At t=0.5, ease-in (t²) should be 0.25
    expect(applyEasing(0.5, "ease-in")).toBe(0.25)
    expect(applyEasing(0, "ease-in")).toBe(0)
    expect(applyEasing(1, "ease-in")).toBe(1)
  })

  test("ease-out ends slow", () => {
    // At t=0.5, ease-out (t*(2-t)) should be 0.75
    expect(applyEasing(0.5, "ease-out")).toBe(0.75)
    expect(applyEasing(0, "ease-out")).toBe(0)
    expect(applyEasing(1, "ease-out")).toBe(1)
  })

  test("ease-in-out is symmetric", () => {
    const t1 = applyEasing(0.25, "ease-in-out")
    const t2 = applyEasing(0.75, "ease-in-out")
    // The curve should be symmetric around 0.5
    expect(t1 + t2).toBeCloseTo(1, 5)
    expect(applyEasing(0.5, "ease-in-out")).toBe(0.5)
  })

  test("handles unknown easing type as linear", () => {
    expect(applyEasing(0.5, "unknown" as any)).toBe(0.5)
  })
})

// ============================================================================
// VEC3 INTERPOLATION
// ============================================================================

describe("lerpVec3", () => {
  test("returns first vector at t=0", () => {
    const a = { x: 0, y: 0, z: 0 }
    const b = { x: 10, y: 20, z: 30 }

    const result = lerpVec3(a, b, 0)

    expect(result).toEqual({ x: 0, y: 0, z: 0 })
  })

  test("returns second vector at t=1", () => {
    const a = { x: 0, y: 0, z: 0 }
    const b = { x: 10, y: 20, z: 30 }

    const result = lerpVec3(a, b, 1)

    expect(result).toEqual({ x: 10, y: 20, z: 30 })
  })

  test("returns midpoint at t=0.5", () => {
    const a = { x: 0, y: 0, z: 0 }
    const b = { x: 10, y: 20, z: 30 }

    const result = lerpVec3(a, b, 0.5)

    expect(result).toEqual({ x: 5, y: 10, z: 15 })
  })

  test("handles negative coordinates", () => {
    const a = { x: -10, y: -20, z: -30 }
    const b = { x: 10, y: 20, z: 30 }

    const result = lerpVec3(a, b, 0.5)

    expect(result).toEqual({ x: 0, y: 0, z: 0 })
  })
})

// ============================================================================
// CAMERA AT TIME
// ============================================================================

describe("getCameraAtTime", () => {
  const createKeyframe = (
    time: number,
    position: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number },
    fov: number
  ): CameraKeyframe => ({
    id: `kf-${time}`,
    time,
    position,
    target,
    fov,
  })

  const createAnimation = (keyframes: CameraKeyframe[]): CameraAnimation => ({
    id: "anim-1",
    name: "Test Animation",
    keyframes,
    duration: keyframes.length > 0 ? Math.max(...keyframes.map((k) => k.time)) : 0,
    easing: "linear",
    loop: false,
  })

  test("returns default camera for empty animation", () => {
    const animation = createAnimation([])

    const result = getCameraAtTime(animation, 0)

    expect(result.position).toEqual({ x: 10, y: 10, z: 10 })
    expect(result.target).toEqual({ x: 0, y: 0, z: 0 })
    expect(result.fov).toBe(50)
  })

  test("returns single keyframe for single-keyframe animation", () => {
    const keyframe = createKeyframe(0, { x: 5, y: 5, z: 5 }, { x: 1, y: 1, z: 1 }, 60)
    const animation = createAnimation([keyframe])

    const result = getCameraAtTime(animation, 0)

    expect(result.position).toEqual({ x: 5, y: 5, z: 5 })
    expect(result.target).toEqual({ x: 1, y: 1, z: 1 })
    expect(result.fov).toBe(60)
  })

  test("interpolates between two keyframes", () => {
    const kf1 = createKeyframe(0, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 50)
    const kf2 = createKeyframe(1, { x: 10, y: 10, z: 10 }, { x: 5, y: 5, z: 5 }, 70)
    const animation = createAnimation([kf1, kf2])

    const result = getCameraAtTime(animation, 0.5)

    expect(result.position).toEqual({ x: 5, y: 5, z: 5 })
    expect(result.target).toEqual({ x: 2.5, y: 2.5, z: 2.5 })
    expect(result.fov).toBe(60)
  })

  test("clamps time to animation duration", () => {
    const kf1 = createKeyframe(0, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 50)
    const kf2 = createKeyframe(1, { x: 10, y: 10, z: 10 }, { x: 5, y: 5, z: 5 }, 70)
    const animation = createAnimation([kf1, kf2])

    // Time beyond duration should return last keyframe
    const result = getCameraAtTime(animation, 100)

    expect(result.position).toEqual({ x: 10, y: 10, z: 10 })
    expect(result.target).toEqual({ x: 5, y: 5, z: 5 })
    expect(result.fov).toBe(70)
  })

  test("handles time before first keyframe", () => {
    const kf1 = createKeyframe(1, { x: 10, y: 10, z: 10 }, { x: 5, y: 5, z: 5 }, 60)
    const kf2 = createKeyframe(2, { x: 20, y: 20, z: 20 }, { x: 10, y: 10, z: 10 }, 70)
    const animation = createAnimation([kf1, kf2])

    const result = getCameraAtTime(animation, 0)

    expect(result.position).toEqual({ x: 10, y: 10, z: 10 })
    expect(result.fov).toBe(60)
  })

  test("handles unsorted keyframes", () => {
    const kf1 = createKeyframe(2, { x: 20, y: 20, z: 20 }, { x: 10, y: 10, z: 10 }, 70)
    const kf2 = createKeyframe(0, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 50)
    const animation = createAnimation([kf1, kf2])

    const result = getCameraAtTime(animation, 1)

    // Should interpolate correctly despite unsorted input
    expect(result.position).toEqual({ x: 10, y: 10, z: 10 })
    expect(result.fov).toBe(60)
  })

  test("handles negative time", () => {
    const kf1 = createKeyframe(0, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 50)
    const kf2 = createKeyframe(1, { x: 10, y: 10, z: 10 }, { x: 5, y: 5, z: 5 }, 70)
    const animation = createAnimation([kf1, kf2])

    const result = getCameraAtTime(animation, -5)

    expect(result.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(result.fov).toBe(50)
  })
})
