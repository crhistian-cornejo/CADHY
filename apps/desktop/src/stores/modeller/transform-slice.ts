/**
 * Transform Slice - CADHY Modeller Store
 *
 * Handles transform operations:
 * - setTransformMode, setTransformSpace, setSnapMode
 * - transformSelected
 */

import type { Transform } from "@cadhy/types"
import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { SelectionMode, SnapMode, TransformMode, TransformSpace } from "./types"

// ============================================================================
// SLICE STATE & ACTIONS
// ============================================================================

export interface TransformSliceState {
  transformMode: TransformMode
  transformSpace: TransformSpace
  snapMode: SnapMode
  /** Box selection mode - when true, camera controls are disabled and drag-to-select is enabled */
  isBoxSelectMode: boolean
  /** Selection mode - body/face/edge/vertex (Plasticity-style) */
  selectionMode: SelectionMode
}

export interface TransformSliceActions {
  setTransformMode: (mode: TransformMode) => void
  setTransformSpace: (space: TransformSpace) => void
  setSnapMode: (mode: SnapMode) => void
  setBoxSelectMode: (enabled: boolean) => void
  setSelectionMode: (mode: SelectionMode) => void
  transformSelected: (transform: Partial<Transform>) => void
}

export type TransformSlice = TransformSliceState & TransformSliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialTransformState: TransformSliceState = {
  transformMode: "translate",
  transformSpace: "world",
  snapMode: "grid",
  isBoxSelectMode: false,
  selectionMode: "body",
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createTransformSlice: StateCreator<ModellerStore, [], [], TransformSlice> = (
  set,
  _get
) => ({
  ...initialTransformState,

  setTransformMode: (mode) => {
    set({ transformMode: mode })
  },

  setTransformSpace: (space) => {
    set({ transformSpace: space })
  },

  setSnapMode: (mode) => {
    set({ snapMode: mode })
  },

  setBoxSelectMode: (enabled) => {
    set({ isBoxSelectMode: enabled })
  },

  setSelectionMode: (mode) => {
    set({ selectionMode: mode })
  },

  transformSelected: (transform) => {
    set((state) => ({
      objects: state.objects.map((obj) => {
        if (!state.selectedIds.includes(obj.id)) return obj

        return {
          ...obj,
          transform: {
            position: transform.position ?? obj.transform.position,
            rotation: transform.rotation ?? obj.transform.rotation,
            scale: transform.scale ?? obj.transform.scale,
          },
          updatedAt: Date.now(),
        }
      }),
    }))
  },
})
