/**
 * History Slice - CADHY Modeller Store
 *
 * Handles undo/redo operations:
 * - undo, redo
 * - saveToHistory, saveStateBeforeAction, commitToHistory
 * - clearPendingHistory, clearHistory
 */

import { logger } from "@cadhy/shared/logger"
import { nanoid } from "nanoid"
import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { AnySceneObject, HistoryEntry } from "./types"

// ============================================================================
// SLICE STATE & ACTIONS
// ============================================================================

export interface HistorySliceState {
  history: HistoryEntry[]
  historyIndex: number
  pendingHistoryState: { objects: AnySceneObject[]; selection: string[] } | null
}

export interface HistorySliceActions {
  undo: () => void
  redo: () => void
  saveToHistory: (action: string) => void
  saveStateBeforeAction: () => void
  commitToHistory: (action: string) => void
  clearPendingHistory: () => void
  clearHistory: () => void
}

export type HistorySlice = HistorySliceState & HistorySliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialHistoryState: HistorySliceState = {
  history: [],
  historyIndex: -1,
  pendingHistoryState: null,
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createHistorySlice: StateCreator<ModellerStore, [], [], HistorySlice> = (
  set,
  get
) => ({
  ...initialHistoryState,

  saveToHistory: (action) => {
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
      logger.log(
        "[History] saveStateBeforeAction - historyIndex:",
        historyIndex,
        "historyLen:",
        history.length
      )
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
  commitToHistory: (action) => {
    const { objects, selectedIds, history, historyIndex, pendingHistoryState } = get()

    logger.log(
      "[History] commitToHistory -",
      action,
      "hasPending:",
      !!pendingHistoryState,
      "historyIndex:",
      historyIndex
    )

    if (!pendingHistoryState) {
      // No pending state - just save current state
      get().saveToHistory(action)
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
    })

    // Keep max 50 history entries
    while (newHistory.length > 50) {
      newHistory.shift()
    }

    logger.log(
      "[History] New historyIndex:",
      newHistory.length - 1,
      "historyLen:",
      newHistory.length
    )

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
    logger.log("[History] undo - historyIndex:", historyIndex, "historyLen:", history.length)
    if (historyIndex <= 0) {
      logger.log("[History] undo - cannot undo, at beginning")
      return
    }

    const previousEntry = history[historyIndex - 1]
    logger.log("[History] undo - restoring entry:", previousEntry.action)
    set({
      objects: previousEntry.objects,
      selectedIds: previousEntry.selection,
      historyIndex: historyIndex - 1,
      isDirty: true,
    })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return

    const nextEntry = history[historyIndex + 1]
    set({
      objects: nextEntry.objects,
      selectedIds: nextEntry.selection,
      historyIndex: historyIndex + 1,
      isDirty: true,
    })
  },

  clearHistory: () => {
    set({ history: [], historyIndex: -1 })
  },
})
