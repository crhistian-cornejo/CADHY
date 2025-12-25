/**
 * History Slice - CADHY Modeller Store
 *
 * Handles undo/redo operations:
 * - undo, redo
 * - saveToHistory, saveStateBeforeAction, commitToHistory
 * - clearPendingHistory, clearHistory
 */

import { loggers } from "@cadhy/shared"
import { nanoid } from "nanoid"
import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type {
  AnySceneObject,
  ChannelObject,
  ChuteObject,
  HistoryEntry,
  ShapeObject,
  TransitionObject,
} from "./types"

const log = loggers.store

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
        // Check if arrays are regular arrays (from JSON) and convert to TypedArrays
        // After JSON.parse(JSON.stringify()), TypedArrays become regular arrays
        const meshVertices = mesh.vertices as Float32Array | number[] | unknown
        const meshIndices = mesh.indices as Uint32Array | number[] | unknown
        const meshNormals = mesh.normals as Float32Array | number[] | unknown | undefined

        const restoredMesh = {
          ...mesh,
          vertices:
            meshVertices instanceof Float32Array
              ? meshVertices
              : Array.isArray(meshVertices)
                ? new Float32Array(meshVertices)
                : new Float32Array(0),
          indices:
            meshIndices instanceof Uint32Array
              ? meshIndices
              : Array.isArray(meshIndices)
                ? new Uint32Array(meshIndices)
                : new Uint32Array(0),
          normals: (() => {
            if (meshNormals instanceof Float32Array) {
              return meshNormals
            }
            if (Array.isArray(meshNormals)) {
              return new Float32Array(meshNormals)
            }
            // Fallback: create normals array matching vertices length
            if (meshVertices instanceof Float32Array) {
              return new Float32Array(meshVertices.length)
            }
            if (Array.isArray(meshVertices)) {
              return new Float32Array(meshVertices.length)
            }
            return new Float32Array(0)
          })(),
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

    // Add new entry with current state (after the action)
    newHistory.push({
      id: nanoid(),
      timestamp: Date.now(),
      action,
      objects: JSON.parse(JSON.stringify(objects)),
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
    const { objects, selectedIds, history, historyIndex, pendingHistoryState } = get()

    // Only save if we don't already have a pending state
    if (!pendingHistoryState) {
      log.log("saveStateBeforeAction - historyIndex:", historyIndex, "historyLen:", history.length)
      set({
        pendingHistoryState: {
          objects: JSON.parse(JSON.stringify(objects)),
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

    log.log(
      "commitToHistory -",
      action,
      "hasPending:",
      !!pendingHistoryState,
      "historyIndex:",
      historyIndex
    )

    if (!pendingHistoryState) {
      // No pending state - just save current state
      get().saveToHistory(action, undefined)
      return
    }

    // We have a "before" state saved - create proper history entry
    // Remove any redo history (actions after current position)
    const newHistory = history.slice(0, historyIndex + 1)

    // Add the current state (after the action) to history
    // The "before" state should already be represented by the previous history entry
    // or this is the first action
    newHistory.push({
      id: nanoid(),
      timestamp: Date.now(),
      action,
      objects: JSON.parse(JSON.stringify(objects)),
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

    // Restore TypedArrays in objects from history
    const restoredObjects = restoreHistoryObjects(previousEntry.objects)

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

    // Restore TypedArrays in objects from history
    const restoredObjects = restoreHistoryObjects(nextEntry.objects)

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

    // Restore TypedArrays in objects from history
    const restoredObjects = restoreHistoryObjects(mergedEntry.objects)

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
