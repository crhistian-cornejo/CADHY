/**
 * Objects Slice - CADHY Modeller Store
 *
 * Handles scene object management:
 * - addObject, updateObject, deleteObject
 * - duplicateObject, deleteSelected, duplicateSelected
 */

import { nanoid } from "nanoid"
import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { AnySceneObject, ChannelObject, ChuteObject, TransitionObject } from "./types"

// ============================================================================
// SLICE STATE
// ============================================================================

export interface ObjectsSliceState {
  objects: AnySceneObject[]
}

export interface ObjectsSliceActions {
  addObject: (object: Omit<AnySceneObject, "id" | "createdAt" | "updatedAt">) => string
  updateObject: (id: string, updates: Partial<AnySceneObject>, saveHistory?: boolean) => void
  deleteObject: (id: string) => void
  deleteSelected: () => void
  duplicateObject: (id: string) => string | null
  duplicateSelected: () => string[]
  getObjectById: (id: string) => AnySceneObject | undefined
  getSelectedObjects: () => AnySceneObject[]
  getVisibleObjects: () => AnySceneObject[]
  getObjectsByLayer: (layerId: string) => AnySceneObject[]
  getObjectsByType: (type: string) => AnySceneObject[]
  // Batch actions for performance
  deleteMultiple: (ids: string[], saveHistory?: boolean) => void
  updateMultiple: (
    updates: Array<{ id: string; changes: Partial<AnySceneObject> }>,
    saveHistory?: boolean
  ) => void
  setMultipleObjectsVisibility: (ids: string[], visible: boolean) => void
  setMultipleObjectsLock: (ids: string[], locked: boolean) => void
}

export type ObjectsSlice = ObjectsSliceState & ObjectsSliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialObjectsState: ObjectsSliceState = {
  objects: [],
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createObjectsSlice: StateCreator<ModellerStore, [], [], ObjectsSlice> = (
  set,
  get
) => ({
  ...initialObjectsState,

  addObject: (objectData) => {
    const id = nanoid()
    const now = Date.now()
    const object = {
      ...objectData,
      id,
      createdAt: now,
      updatedAt: now,
    } as AnySceneObject

    set((state) => ({
      objects: [...state.objects, object],
    }))

    // Generate descriptive history name based on object type
    const historyName =
      object.type === "shape"
        ? `Crear ${object.name}`
        : object.type === "channel"
          ? `Crear Canal: ${object.name}`
          : object.type === "chute"
            ? `Crear Tolva: ${object.name}`
            : object.type === "transition"
              ? `Crear Transición: ${object.name}`
              : `Crear ${object.type}: ${object.name}`
    get().saveToHistory(historyName)
    return id
  },

  updateObject: (id, updates, saveHistory = false) => {
    const currentObj = get().objects.find((o) => o.id === id)

    // If this is a significant change and saveHistory is true, save state before
    if (saveHistory && !get().pendingHistoryState) {
      get().saveStateBeforeAction()
    }

    // For channels, automatically recalculate derived values when relevant properties change
    let finalUpdates = { ...updates }
    if (currentObj?.type === "channel") {
      const channel = currentObj as ChannelObject
      const channelUpdates = updates as Partial<ChannelObject>

      // Get current or updated values
      const length = channelUpdates.length ?? channel.length
      const slope = channelUpdates.slope ?? channel.slope
      const startStation = channelUpdates.startStation ?? channel.startStation
      const startElevation = channelUpdates.startElevation ?? channel.startElevation

      // Recalculate end values if any relevant property changed
      if (
        "length" in channelUpdates ||
        "slope" in channelUpdates ||
        "startStation" in channelUpdates ||
        "startElevation" in channelUpdates
      ) {
        finalUpdates = {
          ...finalUpdates,
          endStation: startStation + length,
          endElevation: startElevation - length * slope,
        }
      }
    }

    // For transitions, automatically recalculate endStation when relevant properties change
    if (currentObj?.type === "transition") {
      const transition = currentObj as TransitionObject
      const transitionUpdates = updates as Partial<TransitionObject>

      const length = transitionUpdates.length ?? transition.length
      const startStation = transitionUpdates.startStation ?? transition.startStation

      if ("length" in transitionUpdates || "startStation" in transitionUpdates) {
        finalUpdates = {
          ...finalUpdates,
          endStation: startStation + length,
        }
      }
    }

    // For chutes, automatically recalculate derived values
    if (currentObj?.type === "chute") {
      const chute = currentObj as ChuteObject
      const chuteUpdates = updates as Partial<ChuteObject>

      // Get current or updated values, including inlet
      const inletLength = chuteUpdates.inletLength ?? chute.inletLength ?? 1
      const inletSlope = chuteUpdates.inletSlope ?? chute.inletSlope ?? 0
      const length = chuteUpdates.length ?? chute.length
      const drop = chuteUpdates.drop ?? chute.drop
      const startStation = chuteUpdates.startStation ?? chute.startStation
      const startElevation = chuteUpdates.startElevation ?? chute.startElevation

      // Check if any position-related property changed
      if (
        "length" in chuteUpdates ||
        "drop" in chuteUpdates ||
        "startStation" in chuteUpdates ||
        "startElevation" in chuteUpdates ||
        "inletLength" in chuteUpdates ||
        "inletSlope" in chuteUpdates
      ) {
        const inletDrop = inletLength * inletSlope
        const totalHorizontalLength = inletLength + length

        finalUpdates = {
          ...finalUpdates,
          slope: drop / length,
          endStation: startStation + totalHorizontalLength,
          endElevation: startElevation - inletDrop - drop,
        }
      }
    }

    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? ({ ...obj, ...finalUpdates, updatedAt: Date.now() } as AnySceneObject) : obj
      ),
    }))

    // If saveHistory is true, commit to history
    if (saveHistory && currentObj) {
      get().commitToHistory(`Actualizar: ${currentObj.name}`)
    }

    // Check if we need to propagate position changes to connected elements
    if (
      currentObj &&
      (currentObj.type === "channel" ||
        currentObj.type === "transition" ||
        currentObj.type === "chute")
    ) {
      const relevantUpdates = updates as Partial<ChannelObject | TransitionObject | ChuteObject>

      // If any positioning property changed, propagate DOWNSTREAM
      if (
        "length" in relevantUpdates ||
        "slope" in relevantUpdates ||
        "drop" in relevantUpdates ||
        "inletLength" in relevantUpdates ||
        "inletSlope" in relevantUpdates ||
        "startStation" in relevantUpdates ||
        "startElevation" in relevantUpdates ||
        "endStation" in relevantUpdates ||
        "endElevation" in relevantUpdates
      ) {
        // Use setTimeout to avoid infinite loops and allow state to settle
        setTimeout(() => {
          get().propagatePositions(id)
        }, 0)
      }

      // If channel's startElevation changed, sync upstream transition's endElevation
      // This handles the case where user edits the downstream channel
      if (currentObj.type === "channel" && "startElevation" in relevantUpdates) {
        const channel = currentObj as ChannelObject
        if (channel.upstreamChannelId) {
          setTimeout(() => {
            get().syncTransitionElevationsFromDownstream(id)
          }, 0)
        }
      }

      // If channel section changed, update connected transitions
      if (currentObj.type === "channel" && "section" in relevantUpdates) {
        setTimeout(() => {
          get().syncTransitionsWithChannel(id)
        }, 0)
      }

      // If channel thickness changed, update connected transitions
      if (currentObj.type === "channel" && "thickness" in relevantUpdates) {
        setTimeout(() => {
          get().syncTransitionsWithChannel(id)
        }, 0)
      }
    }
  },

  deleteObject: (id) => {
    const obj = get().getObjectById(id)
    if (obj) {
      // Cleanup backend shape if it exists
      const backendShapeId = obj.metadata?.backendShapeId
      if (backendShapeId) {
        import("@tauri-apps/api/core").then(({ invoke }) => {
          invoke("cad_delete_shape", { shapeId: backendShapeId }).catch((err) => {
            console.warn(`[cad-store] Failed to delete backend shape ${backendShapeId}:`, err)
          })
        })
      }

      set((state) => ({
        objects: state.objects.filter((o) => o.id !== id),
        selectedIds: state.selectedIds.filter((sid) => sid !== id),
      }))
      get().saveToHistory(`Eliminar: ${obj.name}`)
    }
  },

  deleteSelected: () => {
    const selected = get().selectedIds
    if (selected.length > 0) {
      // Cleanup backend shapes
      selected.forEach((id) => {
        const obj = get().getObjectById(id)
        const backendShapeId = obj?.metadata?.backendShapeId
        if (backendShapeId) {
          import("@tauri-apps/api/core").then(({ invoke }) => {
            invoke("cad_delete_shape", { shapeId: backendShapeId }).catch(() => {})
          })
        }
      })

      set((state) => ({
        objects: state.objects.filter((o) => !selected.includes(o.id)),
        selectedIds: [],
      }))
      get().saveToHistory(`Eliminar ${selected.length} objeto${selected.length > 1 ? "s" : ""}`)
    }
  },

  duplicateObject: (id) => {
    const obj = get().getObjectById(id)
    if (!obj) return null

    const newId = nanoid()
    const now = Date.now()
    const duplicate = {
      ...obj,
      id: newId,
      name: `${obj.name} (copy)`,
      selected: false,
      transform: {
        ...obj.transform,
        position: {
          x: obj.transform.position.x + 1,
          y: obj.transform.position.y,
          z: obj.transform.position.z + 1,
        },
      },
      createdAt: now,
      updatedAt: now,
    }

    set((state) => ({
      objects: [...state.objects, duplicate],
    }))

    get().saveToHistory(`Duplicar: ${obj.name}`)
    return newId
  },

  duplicateSelected: () => {
    const selected = get().selectedIds
    const newIds: string[] = []

    selected.forEach((id) => {
      const newId = get().duplicateObject(id)
      if (newId) newIds.push(newId)
    })

    // Select duplicates
    set({ selectedIds: newIds })
    return newIds
  },

  getObjectById: (id) => {
    return get().objects.find((o) => o.id === id)
  },

  getSelectedObjects: () => {
    const { objects, selectedIds } = get()
    return objects.filter((o) => selectedIds.includes(o.id))
  },

  getVisibleObjects: () => {
    const { objects, layers } = get()
    const visibleLayerIds = layers.filter((l) => l.visible).map((l) => l.id)
    return objects.filter((o) => o.visible && visibleLayerIds.includes(o.layerId))
  },

  getObjectsByLayer: (layerId) => {
    return get().objects.filter((o) => o.layerId === layerId)
  },

  getObjectsByType: (type) => {
    return get().objects.filter((o) => o.type === type)
  },

  // ============================================================================
  // BATCH ACTIONS (Performance optimized)
  // ============================================================================

  deleteMultiple: (ids, saveHistory = true) => {
    const idsSet = new Set(ids)
    const objectsToDelete = get().objects.filter((o) => idsSet.has(o.id))

    if (objectsToDelete.length === 0) return

    set(
      (state) => ({
        objects: state.objects.filter((o) => !idsSet.has(o.id)),
        selectedIds: state.selectedIds.filter((id) => !idsSet.has(id)),
      }),
      false,
      "deleteMultiple"
    )

    if (saveHistory) {
      get().saveToHistory(`Delete ${objectsToDelete.length} objects`)
    }
  },

  updateMultiple: (updates, saveHistory = false) => {
    if (updates.length === 0) return

    if (saveHistory && !get().pendingHistoryState) {
      get().saveStateBeforeAction()
    }

    const updatesMap = new Map(updates.map((u) => [u.id, u.changes]))
    const now = Date.now()

    set(
      (state) => ({
        objects: state.objects.map((obj) => {
          const changes = updatesMap.get(obj.id)
          return changes ? { ...obj, ...changes, updatedAt: now } : obj
        }),
      }),
      false,
      "updateMultiple"
    )

    if (saveHistory) {
      get().saveToHistory(`Update ${updates.length} objects`)
    }
  },

  setMultipleObjectsVisibility: (ids, visible) => {
    const idsSet = new Set(ids)
    set(
      (state) => ({
        objects: state.objects.map((obj) =>
          idsSet.has(obj.id) ? { ...obj, visible, updatedAt: Date.now() } : obj
        ),
      }),
      false,
      "setMultipleObjectsVisibility"
    )
  },

  setMultipleObjectsLock: (ids, locked) => {
    const idsSet = new Set(ids)
    set(
      (state) => ({
        objects: state.objects.map((obj) =>
          idsSet.has(obj.id) ? { ...obj, locked, updatedAt: Date.now() } : obj
        ),
      }),
      false,
      "setMultipleObjectsLock"
    )
  },
})
