/**
 * Camera Slice - CADHY Modeller Store
 *
 * Handles camera operations:
 * - setCameraView, setCameraPosition, setCameraTarget
 * - focusObject, clearFocus, fitToSelection, fitToAll
 */

import type { Vec3 } from "@cadhy/types"
import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { CameraView } from "./types"
import { calculateSceneBoundingBox, getCameraPositionForView } from "./types"

// ============================================================================
// SLICE STATE & ACTIONS
// ============================================================================

export interface CameraSliceState {
  cameraView: CameraView
  cameraPosition: Vec3
  cameraTarget: Vec3
  focusObjectId: string | null
}

export interface CameraSliceActions {
  setCameraView: (view: CameraView) => void
  setCameraPosition: (position: Vec3) => void
  setCameraTarget: (target: Vec3) => void
  focusObject: (id: string) => void
  clearFocus: () => void
  fitToSelection: () => void
  fitToAll: () => void
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
})
