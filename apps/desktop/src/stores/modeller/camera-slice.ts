/**
 * Camera Slice - CADHY Modeller Store
 *
 * Handles camera operations:
 * - setCameraView, setCameraPosition, setCameraTarget
 * - focusObject, clearFocus, fitToSelection, fitToAll
 * - Saved camera views for quick navigation
 */

import type { Vec3 } from "@cadhy/types"
import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { CameraView } from "./types"
import { calculateSceneBoundingBox, getCameraPositionForView } from "./types"

// ============================================================================
// SAVED CAMERA VIEWS
// ============================================================================

export interface SavedCameraView {
  id: string
  name: string
  position: Vec3
  target: Vec3
  fov: number
  createdAt: number
}

// ============================================================================
// CAMERA ANIMATIONS
// ============================================================================

export type EasingType = "linear" | "ease-in" | "ease-out" | "ease-in-out"

export interface CameraKeyframe {
  id: string
  time: number // seconds
  position: Vec3
  target: Vec3
  fov: number
  name: string
}

export interface CameraAnimation {
  id: string
  name: string
  duration: number // total duration in seconds
  keyframes: CameraKeyframe[]
  easing: EasingType
  createdAt: number
}

export type PlaybackState = "stopped" | "playing" | "paused"

// ============================================================================
// SLICE STATE & ACTIONS
// ============================================================================

export interface CameraSliceState {
  cameraView: CameraView
  cameraPosition: Vec3
  cameraTarget: Vec3
  focusObjectId: string | null
  savedViews: SavedCameraView[]
  // Animations
  animations: CameraAnimation[]
  currentAnimation: string | null
  playbackState: PlaybackState
  playbackTime: number // current time in seconds
}

export interface CameraSliceActions {
  setCameraView: (view: CameraView) => void
  setCameraPosition: (position: Vec3) => void
  setCameraTarget: (target: Vec3) => void
  focusObject: (id: string) => void
  clearFocus: () => void
  fitToSelection: () => void
  fitToAll: () => void
  // Saved views management
  saveCameraView: (name: string, fov?: number) => void
  loadCameraView: (id: string) => void
  deleteCameraView: (id: string) => void
  renameCameraView: (id: string, name: string) => void
  // Animation management
  createAnimation: (name: string) => void
  deleteAnimation: (id: string) => void
  renameAnimation: (id: string, name: string) => void
  setCurrentAnimation: (id: string | null) => void
  addKeyframe: (animationId: string, time?: number) => void
  updateKeyframe: (animationId: string, keyframeId: string, data: Partial<CameraKeyframe>) => void
  deleteKeyframe: (animationId: string, keyframeId: string) => void
  setAnimationDuration: (animationId: string, duration: number) => void
  setAnimationEasing: (animationId: string, easing: EasingType) => void
  // Playback controls
  play: () => void
  pause: () => void
  stop: () => void
  setPlaybackTime: (time: number) => void
  // Example animations
  createExampleAnimations: () => void
}

export type CameraSlice = CameraSliceState & CameraSliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialCameraState: CameraSliceState = {
  cameraView: "perspective",
  cameraPosition: { x: 10, y: 10, z: 10 },
  cameraTarget: { x: 0, y: 0, z: 0 },
  focusObjectId: null,
  savedViews: [],
  animations: [],
  currentAnimation: null,
  playbackState: "stopped",
  playbackTime: 0,
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createCameraSlice: StateCreator<ModellerStore, [], [], CameraSlice> = (set, get) => ({
  ...initialCameraState,

  setCameraView: (view) => {
    const { objects } = get()
    const bbox = calculateSceneBoundingBox(objects)
    const { position, target } = getCameraPositionForView(view, bbox)

    set({
      cameraView: view,
      cameraPosition: position,
      cameraTarget: target,
    })
  },

  setCameraPosition: (position) => {
    set({ cameraPosition: position })
  },

  setCameraTarget: (target) => {
    set({ cameraTarget: target })
  },

  focusObject: (id) => {
    const obj = get().getObjectById(id)
    if (obj) {
      // Select the object and set it as focus target
      set({
        selectedIds: [id],
        focusObjectId: id,
      })
    }
  },

  clearFocus: () => {
    set({ focusObjectId: null })
  },

  fitToSelection: () => {
    const { objects, selectedIds, cameraView } = get()
    const selectedObjects = objects.filter((o) => selectedIds.includes(o.id))

    if (selectedObjects.length === 0) return

    const bbox = calculateSceneBoundingBox(selectedObjects)
    const { position, target } = getCameraPositionForView(cameraView, bbox)

    set({
      cameraPosition: position,
      cameraTarget: target,
    })
  },

  fitToAll: () => {
    const { objects, cameraView } = get()

    if (objects.length === 0) return

    const bbox = calculateSceneBoundingBox(objects)
    const { position, target } = getCameraPositionForView(cameraView, bbox)

    set({
      cameraPosition: position,
      cameraTarget: target,
    })
  },

  // ============================================================================
  // SAVED VIEWS MANAGEMENT
  // ============================================================================

  saveCameraView: (name, fov = 50) => {
    const { cameraPosition, cameraTarget, savedViews } = get()

    const newView: SavedCameraView = {
      id: `view-${Date.now()}`,
      name,
      position: { ...cameraPosition },
      target: { ...cameraTarget },
      fov,
      createdAt: Date.now(),
    }

    set({ savedViews: [...savedViews, newView] })
  },

  loadCameraView: (id) => {
    const { savedViews } = get()
    const view = savedViews.find((v) => v.id === id)

    if (view) {
      set({
        cameraPosition: { ...view.position },
        cameraTarget: { ...view.target },
      })
    }
  },

  deleteCameraView: (id) => {
    const { savedViews } = get()
    set({ savedViews: savedViews.filter((v) => v.id !== id) })
  },

  renameCameraView: (id, name) => {
    const { savedViews } = get()
    set({
      savedViews: savedViews.map((v) => (v.id === id ? { ...v, name } : v)),
    })
  },

  // ============================================================================
  // CAMERA ANIMATIONS
  // ============================================================================

  createAnimation: (name) => {
    const { cameraPosition, cameraTarget, animations } = get()

    const newAnimation: CameraAnimation = {
      id: `anim-${Date.now()}`,
      name,
      duration: 10, // default 10 seconds
      easing: "ease-in-out",
      createdAt: Date.now(),
      keyframes: [
        {
          id: `keyframe-${Date.now()}`,
          time: 0,
          position: { ...cameraPosition },
          target: { ...cameraTarget },
          fov: 50,
          name: "Start",
        },
      ],
    }

    set({
      animations: [...animations, newAnimation],
      currentAnimation: newAnimation.id,
    })
  },

  deleteAnimation: (id) => {
    const { animations, currentAnimation } = get()
    set({
      animations: animations.filter((a) => a.id !== id),
      currentAnimation: currentAnimation === id ? null : currentAnimation,
    })
  },

  renameAnimation: (id, name) => {
    const { animations } = get()
    set({
      animations: animations.map((a) => (a.id === id ? { ...a, name } : a)),
    })
  },

  setCurrentAnimation: (id) => {
    set({ currentAnimation: id, playbackState: "stopped", playbackTime: 0 })
  },

  addKeyframe: (animationId, time) => {
    const { animations, cameraPosition, cameraTarget, playbackTime } = get()
    const animation = animations.find((a) => a.id === animationId)
    if (!animation) return

    const keyframeTime = time ?? playbackTime
    const newKeyframe: CameraKeyframe = {
      id: `keyframe-${Date.now()}`,
      time: keyframeTime,
      position: { ...cameraPosition },
      target: { ...cameraTarget },
      fov: 50,
      name: `Keyframe ${animation.keyframes.length + 1}`,
    }

    // Debug: Log keyframe creation
    console.log(`[Keyframe Added] at ${keyframeTime.toFixed(1)}s`)
    console.log(
      `  Position: (${cameraPosition.x.toFixed(2)}, ${cameraPosition.y.toFixed(2)}, ${cameraPosition.z.toFixed(2)})`
    )
    console.log(
      `  Target: (${cameraTarget.x.toFixed(2)}, ${cameraTarget.y.toFixed(2)}, ${cameraTarget.z.toFixed(2)})`
    )

    const updatedKeyframes = [...animation.keyframes, newKeyframe].sort((a, b) => a.time - b.time)

    set({
      animations: animations.map((a) =>
        a.id === animationId ? { ...a, keyframes: updatedKeyframes } : a
      ),
    })
  },

  updateKeyframe: (animationId, keyframeId, data) => {
    const { animations } = get()
    set({
      animations: animations.map((a) =>
        a.id === animationId
          ? {
              ...a,
              keyframes: a.keyframes.map((k) => (k.id === keyframeId ? { ...k, ...data } : k)),
            }
          : a
      ),
    })
  },

  deleteKeyframe: (animationId, keyframeId) => {
    const { animations } = get()
    set({
      animations: animations.map((a) =>
        a.id === animationId
          ? { ...a, keyframes: a.keyframes.filter((k) => k.id !== keyframeId) }
          : a
      ),
    })
  },

  setAnimationDuration: (animationId, duration) => {
    const { animations } = get()
    set({
      animations: animations.map((a) => (a.id === animationId ? { ...a, duration } : a)),
    })
  },

  setAnimationEasing: (animationId, easing) => {
    const { animations } = get()
    set({
      animations: animations.map((a) => (a.id === animationId ? { ...a, easing } : a)),
    })
  },

  // Playback controls
  play: () => {
    set({ playbackState: "playing" })
  },

  pause: () => {
    set({ playbackState: "paused" })
  },

  stop: () => {
    set({ playbackState: "stopped", playbackTime: 0 })
  },

  setPlaybackTime: (time) => {
    set({ playbackTime: time })
  },

  // Create example animations to help users understand how it works
  createExampleAnimations: () => {
    const now = Date.now()
    const { objects } = get()

    // Calculate scene center and size from all objects
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity

    // Get bounds from all visible objects
    if (objects.length > 0) {
      for (const obj of objects) {
        const pos = obj.transform.position
        minX = Math.min(minX, pos.x)
        minY = Math.min(minY, pos.y)
        minZ = Math.min(minZ, pos.z)
        maxX = Math.max(maxX, pos.x)
        maxY = Math.max(maxY, pos.y)
        maxZ = Math.max(maxZ, pos.z)
      }
    } else {
      // No objects, use default origin
      minX = minY = minZ = -5
      maxX = maxY = maxZ = 5
    }

    // Calculate center and size
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const centerZ = (minZ + maxZ) / 2
    const sizeX = maxX - minX
    const sizeY = maxY - minY
    const sizeZ = maxZ - minZ
    const maxSize = Math.max(sizeX, sizeY, sizeZ, 10) // Minimum size of 10

    // Calculate camera distance based on scene size
    const distance = maxSize * 1.5
    const closeDistance = maxSize * 0.3

    console.log(
      `[Example Animations] Scene center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)}, ${centerZ.toFixed(1)})`
    )
    console.log(
      `[Example Animations] Scene size: ${maxSize.toFixed(1)}, Camera distance: ${distance.toFixed(1)}`
    )

    // Target point (center of scene)
    const target = { x: centerX, y: centerY, z: centerZ }

    // Example 1: Orbital rotation around center
    const orbitAnimation: CameraAnimation = {
      id: `anim-orbit-${now}`,
      name: "Orbit 360°",
      duration: 12,
      easing: "linear",
      createdAt: now,
      keyframes: [
        {
          id: `kf-orbit-1-${now}`,
          time: 0,
          position: { x: centerX + distance, y: centerY + distance * 0.7, z: centerZ },
          target: { ...target },
          fov: 50,
          name: "Front",
        },
        {
          id: `kf-orbit-2-${now}`,
          time: 3,
          position: { x: centerX, y: centerY + distance * 0.7, z: centerZ + distance },
          target: { ...target },
          fov: 50,
          name: "Right",
        },
        {
          id: `kf-orbit-3-${now}`,
          time: 6,
          position: { x: centerX - distance, y: centerY + distance * 0.7, z: centerZ },
          target: { ...target },
          fov: 50,
          name: "Back",
        },
        {
          id: `kf-orbit-4-${now}`,
          time: 9,
          position: { x: centerX, y: centerY + distance * 0.7, z: centerZ - distance },
          target: { ...target },
          fov: 50,
          name: "Left",
        },
        {
          id: `kf-orbit-5-${now}`,
          time: 12,
          position: { x: centerX + distance, y: centerY + distance * 0.7, z: centerZ },
          target: { ...target },
          fov: 50,
          name: "Front Again",
        },
      ],
    }

    // Example 2: Zoom in and out
    const zoomAnimation: CameraAnimation = {
      id: `anim-zoom-${now + 1}`,
      name: "Zoom In/Out",
      duration: 8,
      easing: "ease-in-out",
      createdAt: now + 1,
      keyframes: [
        {
          id: `kf-zoom-1-${now}`,
          time: 0,
          position: {
            x: centerX + distance * 1.2,
            y: centerY + distance,
            z: centerZ + distance * 1.2,
          },
          target: { ...target },
          fov: 50,
          name: "Far",
        },
        {
          id: `kf-zoom-2-${now}`,
          time: 4,
          position: {
            x: centerX + closeDistance,
            y: centerY + closeDistance,
            z: centerZ + closeDistance,
          },
          target: { ...target },
          fov: 50,
          name: "Close",
        },
        {
          id: `kf-zoom-3-${now}`,
          time: 8,
          position: {
            x: centerX + distance * 1.2,
            y: centerY + distance,
            z: centerZ + distance * 1.2,
          },
          target: { ...target },
          fov: 50,
          name: "Far Again",
        },
      ],
    }

    // Example 3: Cinematic tour
    const tourAnimation: CameraAnimation = {
      id: `anim-tour-${now + 2}`,
      name: "Cinematic Tour",
      duration: 15,
      easing: "ease-in-out",
      createdAt: now + 2,
      keyframes: [
        {
          id: `kf-tour-1-${now}`,
          time: 0,
          position: {
            x: centerX + distance,
            y: centerY + distance * 1.3,
            z: centerZ + distance,
          },
          target: { ...target },
          fov: 50,
          name: "Aerial View",
        },
        {
          id: `kf-tour-2-${now}`,
          time: 4,
          position: {
            x: centerX + distance * 0.8,
            y: centerY + distance * 0.3,
            z: centerZ,
          },
          target: { ...target },
          fov: 50,
          name: "Eye Level",
        },
        {
          id: `kf-tour-3-${now}`,
          time: 8,
          position: {
            x: centerX - distance * 0.5,
            y: centerY + distance * 0.2,
            z: centerZ + distance * 0.5,
          },
          target: { x: centerX, y: centerY + distance * 0.1, z: centerZ },
          fov: 50,
          name: "Low Angle",
        },
        {
          id: `kf-tour-4-${now}`,
          time: 12,
          position: { x: centerX, y: centerY + distance * 1.5, z: centerZ - distance },
          target: { ...target },
          fov: 50,
          name: "Top View",
        },
        {
          id: `kf-tour-5-${now}`,
          time: 15,
          position: {
            x: centerX + distance,
            y: centerY + distance * 1.3,
            z: centerZ + distance,
          },
          target: { ...target },
          fov: 50,
          name: "Back to Start",
        },
      ],
    }

    const { animations } = get()
    set({
      animations: [...animations, orbitAnimation, zoomAnimation, tourAnimation],
      currentAnimation: orbitAnimation.id,
    })
  },
})
