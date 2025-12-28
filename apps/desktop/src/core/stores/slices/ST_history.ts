/**
 * History Slice - CADHY Modeller Store
 *
 * Handles undo/redo operations:
 * - undo, redo
 * - saveToHistory, saveStateBeforeAction, commitToHistory
 * - clearPendingHistory, clearHistory
 *
 * PERFORMANCE OPTIMIZATION (v1.3.1):
 * - Mesh data is stored in a separate immutable cache (ST_mesh_cache.ts)
 * - History entries only store lightweight object metadata
 * - This eliminates expensive structuredClone on TypedArrays
 * - Reduces memory from 50x scene size to 50x metadata size
 */

import { loggers } from "@cadhy/shared"
import { nanoid } from "nanoid"
import type { StateCreator } from "zustand"
import {
  cacheMesh,
  getCachedMesh,
  restoreMeshFromCache,
  stripMeshForHistory,
} from "../ST_mesh_cache"
import type { ModellerStore } from "../ST_store_types"
import type {
  AnySceneObject,
  ChannelObject,
  ChuteObject,
  HistoryEntry,
  ShapeObject,
  TransitionObject,
} from "../ST_types"

const log = loggers.store

/**
 * Convert a value to an array of numbers for TypedArray restoration.
 *
 * After JSON.parse(JSON.stringify()), TypedArrays become objects with numeric keys:
 *   JSON.stringify(new Float32Array([1,2,3])) → '{"0":1,"1":2,"2":3}'
 *   JSON.parse(...) → {0: 1, 1: 2, 2: 3} (NOT an array!)
 *
 * This function handles all cases:
 * - Already a TypedArray (return as array)
 * - Regular array (return as-is)
 * - Object with numeric keys from JSON serialization (convert to array)
 */
function toNumberArray(value: unknown): number[] | null {
  if (value == null) return null

  // Already a TypedArray - convert to regular array
  if (value instanceof Float32Array || value instanceof Uint32Array) {
    return Array.from(value)
  }

  // Already a regular array
  if (Array.isArray(value)) {
    return value
  }

  // Object with numeric keys (from JSON-serialized TypedArray)
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, number>
    const keys = Object.keys(obj)

    // Must have keys and all must be numeric
    if (keys.length === 0) return null

    // Check if all keys are numeric (strings that represent numbers)
    const allNumericKeys = keys.every((k) => /^\d+$/.test(k))
    if (!allNumericKeys) return null

    // Extract values in order (0, 1, 2, ...)
    const result: number[] = []
    for (let i = 0; i < keys.length; i++) {
      const val = obj[String(i)]
      if (val === undefined) break // Stop at first gap
      result.push(val)
    }

    return result.length > 0 ? result : null
  }

  return null
}

// Helper function to restore TypedArrays in mesh data after JSON deserialization
// Also ensures all object properties including transform are preserved
function restoreHistoryObjects(objects: AnySceneObject[]): AnySceneObject[] {
  return objects.map((obj) => {
    // Ensure transform is properly structured (preserve position, rotation, scale)
    const restoredObj = {
      ...obj,
      transform: {
        position: obj.transform?.position ?? { x: 0, y: 0, z: 0 },
        rotation: obj.transform?.rotation ?? { x: 0, y: 0, z: 0 },
        scale: obj.transform?.scale ?? { x: 1, y: 1, z: 1 },
      },
    }

    // Restore TypedArrays in mesh data if object has mesh
    if (
      restoredObj.type === "shape" ||
      restoredObj.type === "channel" ||
      restoredObj.type === "transition" ||
      restoredObj.type === "chute"
    ) {
      const objWithMesh = restoredObj as
        | ShapeObject
        | ChannelObject
        | TransitionObject
        | ChuteObject
      if (objWithMesh.mesh) {
        const mesh = objWithMesh.mesh

        // Convert mesh data to number arrays, handling JSON-serialized TypedArrays
        const verticesArray = toNumberArray(mesh.vertices)
        const indicesArray = toNumberArray(mesh.indices)
        const normalsArray = toNumberArray(mesh.normals)

        const restoredMesh = {
          ...mesh,
          vertices: verticesArray ? new Float32Array(verticesArray) : new Float32Array(0),
          indices: indicesArray ? new Uint32Array(indicesArray) : new Uint32Array(0),
          normals: normalsArray
            ? new Float32Array(normalsArray)
            : verticesArray
              ? new Float32Array(verticesArray.length) // Fallback: empty normals matching vertices
              : new Float32Array(0),
        }
        return { ...objWithMesh, mesh: restoredMesh }
      }
    }
    return restoredObj
  })
}

// ============================================================================
// SLICE STATE & ACTIONS
// ============================================================================

export interface HistorySliceState {
  history: HistoryEntry[]
  historyIndex: number
  pendingHistoryState: { objects: AnySceneObject[]; selection: string[] } | null
  /** Index of history entry being previewed on hover (null if none) */
  historyPreviewIndex: number | null
}

export interface MergeHistoryOptions {
  deleteSketches: boolean
  keepVariables: boolean
}

export interface HistorySliceActions {
  undo: () => void
  redo: () => void
  saveToHistory: (action: string, details?: HistoryEntry["details"]) => void
  saveStateBeforeAction: () => void
  commitToHistory: (action: string, details?: HistoryEntry["details"]) => void
  clearPendingHistory: () => void
  clearHistory: () => void
  setHistoryPreview: (index: number | null) => void
  mergeHistory: (index: number, options: MergeHistoryOptions) => void
}

export type HistorySlice = HistorySliceState & HistorySliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialHistoryState: HistorySliceState = {
  history: [],
  historyIndex: -1,
  pendingHistoryState: null,
  historyPreviewIndex: null,
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createHistorySlice: StateCreator<ModellerStore, [], [], HistorySlice> = (
  set,
  get
) => ({
  ...initialHistoryState,

  saveToHistory: (action, details) => {
    const { objects, selectedIds, history, historyIndex } = get()

    // Remove any redo history (actions after current position)
    const newHistory = history.slice(0, historyIndex + 1)

    // PERFORMANCE OPTIMIZATION: Strip mesh data before cloning
    // Mesh data is stored in immutable cache (ST_mesh_cache.ts)
    // This makes structuredClone extremely fast (no TypedArrays to copy)
    const strippedObjects = stripMeshForHistory(objects as AnySceneObject[])
    const clonedObjects = structuredClone(strippedObjects)

    // Add new entry with current state (after the action)
    newHistory.push({
      id: nanoid(),
      timestamp: Date.now(),
      action,
      objects: clonedObjects,
      selection: [...selectedIds],
      details,
    })

    // Keep max 50 history entries
    if (newHistory.length > 50) {
      newHistory.shift()
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    })
  },

  // Save state BEFORE an action (for proper undo)
  saveStateBeforeAction: () => {
    const { objects, selectedIds, pendingHistoryState } = get()

    // Only save if we don't already have a pending state
    if (!pendingHistoryState) {
      // PERFORMANCE OPTIMIZATION: Strip mesh data before cloning
      const strippedObjects = stripMeshForHistory(objects as AnySceneObject[])
      set({
        pendingHistoryState: {
          objects: structuredClone(strippedObjects),
          selection: [...selectedIds],
        },
      })
    }
  },

  // Commit to history after an action completes
  // Uses pendingHistoryState (the "before" state) saved by saveStateBeforeAction
  // The history stores snapshots: undo goes to previous snapshot, redo goes to next
  commitToHistory: (action, details) => {
    const { objects, selectedIds, history, historyIndex, pendingHistoryState } = get()

    if (!pendingHistoryState) {
      // No pending state - just save current state
      get().saveToHistory(action, undefined)
      return
    }

    // We have a "before" state saved - create proper history entry
    // Remove any redo history (actions after current position)
    const newHistory = history.slice(0, historyIndex + 1)

    // PERFORMANCE OPTIMIZATION: Strip mesh data before cloning
    const strippedObjects = stripMeshForHistory(objects as AnySceneObject[])
    const clonedObjects = structuredClone(strippedObjects)

    // Add the current state (after the action) to history
    newHistory.push({
      id: nanoid(),
      timestamp: Date.now(),
      action,
      objects: clonedObjects,
      selection: [...selectedIds],
      details,
    })

    // Keep max 50 history entries
    while (newHistory.length > 50) {
      newHistory.shift()
    }

    log.log("New historyIndex:", newHistory.length - 1, "historyLen:", newHistory.length)

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      pendingHistoryState: null,
      isDirty: true,
    })
  },

  clearPendingHistory: () => {
    set({ pendingHistoryState: null })
  },

  undo: () => {
    const { history, historyIndex } = get()
    log.log("undo - historyIndex:", historyIndex, "historyLen:", history.length)
    if (historyIndex <= 0) {
      log.log("undo - cannot undo, at beginning")
      return
    }

    const previousEntry = history[historyIndex - 1]
    log.log("undo - restoring entry:", previousEntry.action)

    // PERFORMANCE OPTIMIZATION: Restore mesh data from immutable cache
    // History entries only store metadata, mesh data is in ST_mesh_cache
    const restoredObjects = restoreMeshFromCache(restoreHistoryObjects(previousEntry.objects))

    set({
      objects: restoredObjects,
      selectedIds: previousEntry.selection,
      historyIndex: historyIndex - 1,
      historyPreviewIndex: null, // Clear preview when navigating
      isDirty: true,
    })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return

    const nextEntry = history[historyIndex + 1]

    // PERFORMANCE OPTIMIZATION: Restore mesh data from immutable cache
    const restoredObjects = restoreMeshFromCache(restoreHistoryObjects(nextEntry.objects))

    set({
      objects: restoredObjects,
      selectedIds: nextEntry.selection,
      historyIndex: historyIndex + 1,
      historyPreviewIndex: null, // Clear preview when navigating
      isDirty: true,
    })
  },

  clearHistory: () => {
    set({ history: [], historyIndex: -1, historyPreviewIndex: null })
  },

  setHistoryPreview: (index) => {
    set({ historyPreviewIndex: index })
  },

  mergeHistory: (index, options) => {
    const { history, historyIndex } = get()

    if (index < 0 || index >= history.length) {
      log.log("mergeHistory - invalid index:", index)
      return
    }

    // Combine all steps up to the merge index
    // Keep the state from the merge index point
    const mergedEntry = history[index]

    // Remove all entries after the merge index
    const newHistory = history.slice(0, index + 1)

    // PERFORMANCE OPTIMIZATION: Restore mesh data from immutable cache
    const restoredObjects = restoreMeshFromCache(restoreHistoryObjects(mergedEntry.objects))

    // Update current state to match merged entry
    set({
      history: newHistory,
      historyIndex: index,
      objects: restoredObjects,
      selectedIds: mergedEntry.selection,
      historyPreviewIndex: null,
      isDirty: true,
    })

    log.log("mergeHistory - merged at index:", index, "new history length:", newHistory.length)

    // TODO: Handle sketches and variables based on options
    // This would require additional logic to identify and handle sketches/variables
  },
})
