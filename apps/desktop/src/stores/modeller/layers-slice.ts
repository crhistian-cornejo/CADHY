/**
 * Layers Slice - CADHY Modeller Store
 *
 * Handles layer management:
 * - addLayer, updateLayer, deleteLayer
 * - setActiveLayer, toggleLayerVisibility, toggleLayerLock
 * - moveObjectToLayer
 */

import { nanoid } from "nanoid"
import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { Layer } from "./types"
import { DEFAULT_LAYER } from "./types"

// ============================================================================
// SLICE STATE & ACTIONS
// ============================================================================

export interface LayersSliceState {
  layers: Layer[]
}

export interface LayersSliceActions {
  addLayer: (name: string, color?: string) => string
  updateLayer: (id: string, updates: Partial<Layer>) => void
  deleteLayer: (id: string) => void
  setActiveLayer: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  moveObjectToLayer: (objectId: string, layerId: string) => void
  // Batch actions for performance
  setAllLayersVisibility: (visible: boolean) => void
  setAllLayersLock: (locked: boolean) => void
  setMultipleLayersVisibility: (layerIds: string[], visible: boolean) => void
  setMultipleLayersLock: (layerIds: string[], locked: boolean) => void
}

export type LayersSlice = LayersSliceState & LayersSliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialLayersState: LayersSliceState = {
  layers: [DEFAULT_LAYER],
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createLayersSlice: StateCreator<ModellerStore, [], [], LayersSlice> = (set, get) => ({
  ...initialLayersState,

  addLayer: (name, color = "#6366f1") => {
    const id = nanoid()
    const order = get().layers.length

    set((state) => ({
      layers: [
        ...state.layers,
        {
          id,
          name,
          color,
          visible: true,
          locked: false,
          frozen: false,
          printable: true,
          order,
        },
      ],
    }))

    return id
  },

  updateLayer: (id, updates) => {
    set((state) => ({
      layers: state.layers.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer)),
    }))
  },

  deleteLayer: (id) => {
    if (id === "default") return // Can't delete default layer

    // Move objects to default layer
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.layerId === id ? { ...obj, layerId: "default" } : obj
      ),
      layers: state.layers.filter((l) => l.id !== id),
    }))
  },

  setActiveLayer: (_id) => {
    // Just update visibility for now, could add activeLayerId to state
    set((state) => ({
      layers: state.layers.map((layer) => ({
        ...layer,
        // Could mark as active here
      })),
    }))
  },

  toggleLayerVisibility: (id) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      ),
      // Also update objects visibility based on layer
      objects: state.objects.map((obj) => {
        if (obj.layerId !== id) return obj
        const layer = state.layers.find((l) => l.id === id)
        return layer ? { ...obj, visible: !layer.visible } : obj
      }),
    }))
  },

  toggleLayerLock: (id) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, locked: !layer.locked } : layer
      ),
      objects: state.objects.map((obj) => {
        if (obj.layerId !== id) return obj
        const layer = state.layers.find((l) => l.id === id)
        return layer ? { ...obj, locked: !layer.locked } : obj
      }),
    }))
  },

  moveObjectToLayer: (objectId, layerId) => {
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === objectId ? { ...obj, layerId, updatedAt: Date.now() } : obj
      ),
    }))
  },

  // ============================================================================
  // BATCH ACTIONS (Performance optimized)
  // ============================================================================

  setAllLayersVisibility: (visible) => {
    set(
      (state) => ({
        layers: state.layers.map((layer) => ({ ...layer, visible })),
        objects: state.objects.map((obj) => ({ ...obj, visible })),
      }),
      false,
      "setAllLayersVisibility"
    )
  },

  setAllLayersLock: (locked) => {
    set(
      (state) => ({
        layers: state.layers.map((layer) => ({ ...layer, locked })),
        objects: state.objects.map((obj) => ({ ...obj, locked })),
      }),
      false,
      "setAllLayersLock"
    )
  },

  setMultipleLayersVisibility: (layerIds, visible) => {
    const layerIdSet = new Set(layerIds)
    set(
      (state) => ({
        layers: state.layers.map((layer) =>
          layerIdSet.has(layer.id) ? { ...layer, visible } : layer
        ),
        objects: state.objects.map((obj) =>
          layerIdSet.has(obj.layerId) ? { ...obj, visible } : obj
        ),
      }),
      false,
      "setMultipleLayersVisibility"
    )
  },

  setMultipleLayersLock: (layerIds, locked) => {
    const layerIdSet = new Set(layerIds)
    set(
      (state) => ({
        layers: state.layers.map((layer) =>
          layerIdSet.has(layer.id) ? { ...layer, locked } : layer
        ),
        objects: state.objects.map((obj) =>
          layerIdSet.has(obj.layerId) ? { ...obj, locked } : obj
        ),
      }),
      false,
      "setMultipleLayersLock"
    )
  },
})
