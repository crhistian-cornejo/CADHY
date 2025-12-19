/**
 * Camera Interpolation Utilities - CADHY
 *
 * Utilities for interpolating camera position/target during animations
 */

import type { Vec3 } from "@cadhy/types"
import type { CameraAnimation, CameraKeyframe, EasingType } from "@/stores/modeller"

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

export function applyEasing(t: number, type: EasingType): number {
  switch (type) {
    case "linear":
      return t
    case "ease-in":
      return t * t
    case "ease-out":
      return t * (2 - t)
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    default:
      return t
  }
}

// ============================================================================
// VEC3 INTERPOLATION
// ============================================================================

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

// ============================================================================
// CAMERA INTERPOLATION
// ============================================================================

export interface InterpolatedCamera {
  position: Vec3
  target: Vec3
  fov: number
}

/**
 * Get camera state at a specific time in the animation
 */
export function getCameraAtTime(animation: CameraAnimation, time: number): InterpolatedCamera {
  // Clamp time to animation duration
  const clampedTime = Math.max(0, Math.min(time, animation.duration))

  // Sort keyframes by time
  const sortedKeyframes = [...animation.keyframes].sort((a, b) => a.time - b.time)

  // If no keyframes, return default
  if (sortedKeyframes.length === 0) {
    return {
      position: { x: 10, y: 10, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      fov: 50,
    }
  }

  // If only one keyframe, return it
  if (sortedKeyframes.length === 1) {
    return {
      position: sortedKeyframes[0].position,
      target: sortedKeyframes[0].target,
      fov: sortedKeyframes[0].fov,
    }
  }

  // Find the two keyframes to interpolate between
  let beforeKeyframe: CameraKeyframe = sortedKeyframes[0]
  let afterKeyframe: CameraKeyframe = sortedKeyframes[sortedKeyframes.length - 1]

  for (let i = 0; i < sortedKeyframes.length - 1; i++) {
    if (sortedKeyframes[i].time <= clampedTime && sortedKeyframes[i + 1].time >= clampedTime) {
      beforeKeyframe = sortedKeyframes[i]
      afterKeyframe = sortedKeyframes[i + 1]
      break
    }
  }

  // If time is before first keyframe, return first keyframe
  if (clampedTime <= sortedKeyframes[0].time) {
    return {
      position: sortedKeyframes[0].position,
      target: sortedKeyframes[0].target,
      fov: sortedKeyframes[0].fov,
    }
  }

  // If time is after last keyframe, return last keyframe
  if (clampedTime >= sortedKeyframes[sortedKeyframes.length - 1].time) {
    return {
      position: sortedKeyframes[sortedKeyframes.length - 1].position,
      target: sortedKeyframes[sortedKeyframes.length - 1].target,
      fov: sortedKeyframes[sortedKeyframes.length - 1].fov,
    }
  }

  // Calculate interpolation factor
  const timeDiff = afterKeyframe.time - beforeKeyframe.time
  const rawT = timeDiff === 0 ? 0 : (clampedTime - beforeKeyframe.time) / timeDiff
  const t = applyEasing(rawT, animation.easing)

  // Interpolate position, target, and fov
  return {
    position: lerpVec3(beforeKeyframe.position, afterKeyframe.position, t),
    target: lerpVec3(beforeKeyframe.target, afterKeyframe.target, t),
    fov: beforeKeyframe.fov + (afterKeyframe.fov - beforeKeyframe.fov) * t,
  }
}
