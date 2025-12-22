/**
 * Settings Slice - CADHY Modeller Store
 *
 * Handles viewport and grid settings:
 * - setGridSettings, setViewportSettings
 * - setActiveTool
 */

import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { GridSettings, ViewportSettings } from "./types"
import { DEFAULT_GRID_SETTINGS, DEFAULT_VIEWPORT_SETTINGS } from "./types"

// ============================================================================
// SLICE STATE & ACTIONS
// ============================================================================

export interface SettingsSliceState {
  gridSettings: GridSettings
  viewportSettings: ViewportSettings
  activeTool: string | null
  isCreatePanelOpen: boolean
  isChuteCreatorOpen: boolean
  isTransitionCreatorOpen: boolean
}

export interface SettingsSliceActions {
  setGridSettings: (settings: Partial<GridSettings>) => void
  setViewportSettings: (settings: Partial<ViewportSettings>) => void
  setActiveTool: (tool: string | null) => void
  toggleCreatePanel: () => void
  openCreatePanel: () => void
  closeCreatePanel: () => void
  openChuteCreator: () => void
  closeChuteCreator: () => void
  openTransitionCreator: () => void
  closeTransitionCreator: () => void
}

export type SettingsSlice = SettingsSliceState & SettingsSliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialSettingsState: SettingsSliceState = {
  gridSettings: DEFAULT_GRID_SETTINGS,
  viewportSettings: DEFAULT_VIEWPORT_SETTINGS,
  activeTool: null,
  isCreatePanelOpen: false,
  isChuteCreatorOpen: false,
  isTransitionCreatorOpen: false,
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createSettingsSlice: StateCreator<ModellerStore, [], [], SettingsSlice> = (
  set,
  _get
) => ({
  ...initialSettingsState,

  setGridSettings: (settings) => {
    set((state) => ({
      gridSettings: { ...state.gridSettings, ...settings },
    }))
  },

  setViewportSettings: (settings) => {
    set((state) => ({
      viewportSettings: { ...state.viewportSettings, ...settings },
    }))
  },

  setActiveTool: (tool) => {
    set({ activeTool: tool })
  },

  toggleCreatePanel: () => {
    set((state) => ({ isCreatePanelOpen: !state.isCreatePanelOpen }))
  },

  openCreatePanel: () => {
    set({ isCreatePanelOpen: true })
  },

  closeCreatePanel: () => {
    set({ isCreatePanelOpen: false })
  },

  openChuteCreator: () => {
    set({ isChuteCreatorOpen: true, isCreatePanelOpen: false })
  },

  closeChuteCreator: () => {
    set({ isChuteCreatorOpen: false })
  },

  openTransitionCreator: () => {
    set({ isTransitionCreatorOpen: true, isCreatePanelOpen: false })
  },

  closeTransitionCreator: () => {
    set({ isTransitionCreatorOpen: false })
  },
})
