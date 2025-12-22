/**
 * Areas Slice - CADHY Modeller Store
 *
 * Handles scene area management for hierarchical object organization:
 * - createArea, deleteArea, renameArea
 * - moveObjectToArea
 * - toggleAreaCollapsed
 */

import { nanoid } from "nanoid"
import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { SceneArea } from "./types"
import { DEFAULT_AREA } from "./types"

// ============================================================================
// SLICE STATE & ACTIONS
// ============================================================================

export interface AreasSliceState {
  areas: SceneArea[]
}

export interface AreasSliceActions {
  createArea: (name?: string) => string
  deleteArea: (areaId: string) => void
  renameArea: (areaId: string, name: string) => void
  updateArea: (areaId: string, updates: Partial<SceneArea>) => void
  moveObjectToArea: (objectId: string, areaId: string | undefined) => void
  moveObjectsToArea: (objectIds: string[], areaId: string | undefined) => void
  toggleAreaCollapsed: (areaId: string) => void
  reorderArea: (areaId: string, newIndex: number) => void
  getAreaById: (areaId: string) => SceneArea | undefined
  getObjectsByArea: (areaId: string) => string[]
}

export type AreasSlice = AreasSliceState & AreasSliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialAreasState: AreasSliceState = {
  areas: [DEFAULT_AREA],
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createAreasSlice: StateCreator<ModellerStore, [], [], AreasSlice> = (set, get) => ({
  ...initialAreasState,

  createArea: (name?: string) => {
    const id = nanoid()
    const currentAreas = get().areas
    const maxIndex = currentAreas.reduce((max, a) => Math.max(max, a.index), 0)
    const newIndex = maxIndex + 1

    const area: SceneArea = {
      id,
      name: name ?? "Area",
      index: newIndex,
      collapsed: false,
      color: getAreaColor(newIndex),
    }

    set((state) => ({
      areas: [...state.areas, area],
    }))

    return id
  },

  deleteArea: (areaId) => {
    // Can't delete if it's the last area
    if (get().areas.length <= 1) return

    // Move all objects from this area to "unassigned" (undefined)
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.areaId === areaId ? { ...obj, areaId: undefined } : obj
      ),
      areas: state.areas.filter((a) => a.id !== areaId),
    }))
  },

  renameArea: (areaId, name) => {
    set((state) => ({
      areas: state.areas.map((area) => (area.id === areaId ? { ...area, name } : area)),
    }))
  },

  updateArea: (areaId, updates) => {
    set((state) => ({
      areas: state.areas.map((area) => (area.id === areaId ? { ...area, ...updates } : area)),
    }))
  },

  moveObjectToArea: (objectId, areaId) => {
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === objectId ? { ...obj, areaId, updatedAt: Date.now() } : obj
      ),
    }))
  },

  moveObjectsToArea: (objectIds, areaId) => {
    const objectIdSet = new Set(objectIds)
    set((state) => ({
      objects: state.objects.map((obj) =>
        objectIdSet.has(obj.id) ? { ...obj, areaId, updatedAt: Date.now() } : obj
      ),
    }))
  },

  toggleAreaCollapsed: (areaId) => {
    set((state) => ({
      areas: state.areas.map((area) =>
        area.id === areaId ? { ...area, collapsed: !area.collapsed } : area
      ),
    }))
  },

  reorderArea: (areaId, newIndex) => {
    set((state) => {
      const sortedAreas = [...state.areas].sort((a, b) => a.index - b.index)
      const areaToMove = sortedAreas.find((a) => a.id === areaId)
      if (!areaToMove) return state

      // Remove the area from its current position
      const withoutArea = sortedAreas.filter((a) => a.id !== areaId)

      // Insert at new position
      withoutArea.splice(newIndex, 0, areaToMove)

      // Reassign indices
      const reindexed = withoutArea.map((area, idx) => ({
        ...area,
        index: idx + 1,
      }))

      return { areas: reindexed }
    })
  },

  getAreaById: (areaId) => {
    return get().areas.find((a) => a.id === areaId)
  },

  getObjectsByArea: (areaId) => {
    return get()
      .objects.filter((obj) => obj.areaId === areaId)
      .map((obj) => obj.id)
  },
})

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get a color for an area based on its index
 */
function getAreaColor(index: number): string {
  const colors = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
  ]
  return colors[(index - 1) % colors.length]
}
