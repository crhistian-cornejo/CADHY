/**
 * Selection Slice - CADHY Modeller Store
 *
 * Handles object selection:
 * - select, selectMultiple, selectAll, deselectAll
 * - toggleSelection, invertSelection
 * - selectByLayer, selectByType
 */

import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { ObjectType } from "./types"

// ============================================================================
// SLICE STATE & ACTIONS
// ============================================================================

export interface SelectionSliceState {
  selectedIds: string[]
  hoveredId: string | null
}

export interface SelectionSliceActions {
  select: (id: string, additive?: boolean) => void
  selectMultiple: (ids: string[], additive?: boolean) => void
  selectAll: () => void
  deselectAll: () => void
  toggleSelection: (id: string) => void
  setHovered: (id: string | null) => void
  invertSelection: () => void
  selectByLayer: (layerId: string) => void
  selectByType: (type: ObjectType) => void
}

export type SelectionSlice = SelectionSliceState & SelectionSliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialSelectionState: SelectionSliceState = {
  selectedIds: [],
  hoveredId: null,
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createSelectionSlice: StateCreator<ModellerStore, [], [], SelectionSlice> = (
  set,
  get
) => ({
  ...initialSelectionState,

  select: (id, additive = false) => {
    set((state) => {
      const newSelectedIds = additive
        ? state.selectedIds.includes(id)
          ? state.selectedIds
          : [...state.selectedIds, id]
        : [id]

      // Auto-enable translate mode when selecting an object so gizmo appears
      const newTransformMode =
        newSelectedIds.length > 0 && state.transformMode === "none"
          ? "translate"
          : state.transformMode

      return {
        selectedIds: newSelectedIds,
        transformMode: newTransformMode,
        objects: state.objects.map((obj) => ({
          ...obj,
          selected: newSelectedIds.includes(obj.id),
        })),
      }
    })
  },

  selectMultiple: (ids, additive = false) => {
    set((state) => {
      const newSelectedIds = additive ? [...new Set([...state.selectedIds, ...ids])] : ids

      return {
        selectedIds: newSelectedIds,
        objects: state.objects.map((obj) => ({
          ...obj,
          selected: newSelectedIds.includes(obj.id),
        })),
      }
    })
  },

  selectAll: () => {
    const allIds = get()
      .objects.filter((o) => o.visible && !o.locked)
      .map((o) => o.id)
    get().selectMultiple(allIds)
  },

  deselectAll: () => {
    set((state) => ({
      selectedIds: [],
      objects: state.objects.map((obj) => ({ ...obj, selected: false })),
    }))
  },

  toggleSelection: (id) => {
    set((state) => {
      const isSelected = state.selectedIds.includes(id)
      const newSelectedIds = isSelected
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id]

      return {
        selectedIds: newSelectedIds,
        objects: state.objects.map((obj) => ({
          ...obj,
          selected: newSelectedIds.includes(obj.id),
        })),
      }
    })
  },

  setHovered: (id) => {
    set({ hoveredId: id })
  },

  invertSelection: () => {
    const { objects, selectedIds } = get()
    const selectableIds = objects.filter((o) => o.visible && !o.locked).map((o) => o.id)
    const newSelectedIds = selectableIds.filter((id) => !selectedIds.includes(id))
    get().selectMultiple(newSelectedIds)
  },

  selectByLayer: (layerId) => {
    const ids = get()
      .objects.filter((o) => o.layerId === layerId)
      .map((o) => o.id)
    get().selectMultiple(ids)
  },

  selectByType: (type) => {
    const ids = get()
      .objects.filter((o) => o.type === type)
      .map((o) => o.id)
    get().selectMultiple(ids)
  },
})
