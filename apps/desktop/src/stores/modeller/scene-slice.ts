/**
 * Scene Slice - CADHY Modeller Store
 *
 * Handles scene management:
 * - loadScene, getSceneData
 * - markClean, markDirty
 * - reset
 */

import { nanoid } from "nanoid"
import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type { AnySceneObject, HistoryEntry, SceneData, TransitionObject } from "./types"
import {
  calculateSceneBoundingBox,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_LAYER,
  DEFAULT_VIEWPORT_SETTINGS,
  getCameraPositionForView,
} from "./types"

// ============================================================================
// SLICE STATE & ACTIONS
// ============================================================================

export interface SceneSliceState {
  isDirty: boolean
  lastSavedAt: number | null
}

export interface SceneSliceActions {
  loadScene: (scene: SceneData) => void
  getSceneData: () => SceneData
  markClean: () => void
  markDirty: () => void
  reset: () => void
}

export type SceneSlice = SceneSliceState & SceneSliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialSceneState: SceneSliceState = {
  isDirty: false,
  lastSavedAt: null,
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createSceneSlice: StateCreator<ModellerStore, [], [], SceneSlice> = (set, get) => ({
  ...initialSceneState,

  loadScene: (scene) => {
    // Migrate transition objects to ensure they have all required fields
    const migratedObjects = (scene.objects || []).map((obj) => {
      if (obj.type === "transition") {
        const transition = obj as TransitionObject
        return {
          ...transition,
          inlet: {
            sectionType: transition.inlet?.sectionType || "trapezoidal",
            width: transition.inlet?.width ?? 2,
            depth: transition.inlet?.depth ?? 1.5,
            sideSlope: transition.inlet?.sideSlope ?? 1.5,
            wallThickness: transition.inlet?.wallThickness ?? 0.15,
            floorThickness: transition.inlet?.floorThickness ?? 0.15,
          },
          outlet: {
            sectionType: transition.outlet?.sectionType || "trapezoidal",
            width: transition.outlet?.width ?? 2,
            depth: transition.outlet?.depth ?? 1.5,
            sideSlope: transition.outlet?.sideSlope ?? 1.5,
            wallThickness: transition.outlet?.wallThickness ?? 0.15,
            floorThickness: transition.outlet?.floorThickness ?? 0.15,
          },
        }
      }
      return obj
    })

    // Calculate camera position based on scene content if not provided
    let cameraPosition = scene.cameraPosition
    let cameraTarget = scene.cameraTarget

    // If no camera position saved OR if it's the default origin position,
    // calculate position based on scene content
    if (
      !cameraPosition ||
      !cameraTarget ||
      (cameraTarget.x === 0 &&
        cameraTarget.y === 0 &&
        cameraTarget.z === 0 &&
        migratedObjects.length > 0)
    ) {
      const bbox = calculateSceneBoundingBox(migratedObjects as AnySceneObject[])
      const computed = getCameraPositionForView("perspective", bbox)
      cameraPosition = computed.position
      cameraTarget = computed.target
    }

    // Create initial history entry so undo works from the first action
    const initialHistory: HistoryEntry[] = [
      {
        id: nanoid(),
        timestamp: Date.now(),
        action: "Load Scene",
        objects: JSON.parse(JSON.stringify(migratedObjects)),
        selection: [],
      },
    ]

    set({
      objects: migratedObjects,
      layers: scene.layers?.length ? scene.layers : [DEFAULT_LAYER],
      viewportSettings: scene.viewportSettings ?? DEFAULT_VIEWPORT_SETTINGS,
      gridSettings: scene.gridSettings ?? DEFAULT_GRID_SETTINGS,
      cameraPosition,
      cameraTarget,
      selectedIds: [],
      hoveredId: null,
      history: initialHistory,
      historyIndex: 0,
      isDirty: false,
      lastSavedAt: Date.now(),
    })
  },

  getSceneData: () => {
    const state = get()
    return {
      objects: state.objects,
      layers: state.layers,
      viewportSettings: state.viewportSettings,
      gridSettings: state.gridSettings,
      cameraPosition: state.cameraPosition,
      cameraTarget: state.cameraTarget,
    }
  },

  markClean: () => {
    set({ isDirty: false, lastSavedAt: Date.now() })
  },

  markDirty: () => {
    set({ isDirty: true })
  },

  reset: () => {
    // Create initial history entry for empty scene
    const initialHistory: HistoryEntry[] = [
      {
        id: nanoid(),
        timestamp: Date.now(),
        action: "New Scene",
        objects: [],
        selection: [],
      },
    ]

    set({
      objects: [],
      layers: [DEFAULT_LAYER],
      isDirty: false,
      lastSavedAt: null,
      selectedIds: [],
      hoveredId: null,
      transformMode: "translate",
      transformSpace: "world",
      snapMode: "grid",
      cameraView: "perspective",
      cameraPosition: { x: 10, y: 10, z: 10 },
      cameraTarget: { x: 0, y: 0, z: 0 },
      focusObjectId: null,
      gridSettings: DEFAULT_GRID_SETTINGS,
      viewportSettings: DEFAULT_VIEWPORT_SETTINGS,
      history: initialHistory,
      historyIndex: 0,
      activeTool: null,
    })
  },
})
