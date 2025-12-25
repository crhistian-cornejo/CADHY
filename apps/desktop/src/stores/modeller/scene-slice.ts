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
  DEFAULT_AREA,
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
    // Helper function to restore TypedArrays in mesh data after JSON deserialization
    // Also ensures all object properties including transform are preserved
    const restoreMeshTypedArrays = (obj: AnySceneObject): AnySceneObject => {
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
          const restoredMesh = {
            ...mesh,
            vertices:
              mesh.vertices instanceof Float32Array
                ? mesh.vertices
                : Array.isArray(mesh.vertices)
                  ? new Float32Array(mesh.vertices)
                  : new Float32Array(0),
            indices:
              mesh.indices instanceof Uint32Array
                ? mesh.indices
                : Array.isArray(mesh.indices)
                  ? new Uint32Array(mesh.indices)
                  : new Uint32Array(0),
            normals: (() => {
              if (mesh.normals instanceof Float32Array) {
                return mesh.normals
              }
              if (Array.isArray(mesh.normals)) {
                return new Float32Array(mesh.normals)
              }
              // Fallback: create normals array matching vertices length
              if (mesh.vertices instanceof Float32Array) {
                return new Float32Array(mesh.vertices.length)
              }
              if (Array.isArray(mesh.vertices)) {
                return new Float32Array(mesh.vertices.length)
              }
              return new Float32Array(0)
            })(),
          }
          return { ...objWithMesh, mesh: restoredMesh }
        }
      }
      return restoredObj
    }

    // Migrate transition objects to ensure they have all required fields
    // Also restore TypedArrays in mesh data
    const migratedObjects = (scene.objects || []).map((obj) => {
      let migrated = obj

      if (obj.type === "transition") {
        const transition = obj as TransitionObject
        migrated = {
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

      // Restore TypedArrays in mesh data
      return restoreMeshTypedArrays(migrated)
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

    // Helper function to restore TypedArrays in history objects
    const restoreHistoryObjects = (objects: AnySceneObject[]): AnySceneObject[] => {
      return objects.map((obj) => {
        if (
          obj.type === "shape" ||
          obj.type === "channel" ||
          obj.type === "transition" ||
          obj.type === "chute"
        ) {
          const objWithMesh = obj as ShapeObject | ChannelObject | TransitionObject | ChuteObject
          if (objWithMesh.mesh) {
            const mesh = objWithMesh.mesh
            // Check if arrays are regular arrays (from JSON) and convert to TypedArrays
            const restoredMesh = {
              ...mesh,
              vertices:
                mesh.vertices instanceof Float32Array
                  ? mesh.vertices
                  : Array.isArray(mesh.vertices)
                    ? new Float32Array(mesh.vertices)
                    : new Float32Array(0),
              indices:
                mesh.indices instanceof Uint32Array
                  ? mesh.indices
                  : Array.isArray(mesh.indices)
                    ? new Uint32Array(mesh.indices)
                    : new Uint32Array(0),
              normals:
                mesh.normals instanceof Float32Array
                  ? mesh.normals
                  : Array.isArray(mesh.normals)
                    ? new Float32Array(mesh.normals)
                    : mesh.vertices instanceof Float32Array
                      ? new Float32Array(mesh.vertices.length)
                      : Array.isArray(mesh.vertices)
                        ? new Float32Array(mesh.vertices.length)
                        : new Float32Array(0),
            }
            return { ...objWithMesh, mesh: restoredMesh }
          }
        }
        return obj
      })
    }

    // Use saved history if available, otherwise create initial entry
    const savedHistory = scene.history
    const savedHistoryIndex = scene.historyIndex ?? 0

    let history: HistoryEntry[]
    let historyIndex: number

    if (savedHistory && savedHistory.length > 0) {
      // Restore saved history and fix TypedArrays in objects
      history = savedHistory.map((entry) => ({
        ...entry,
        objects: restoreHistoryObjects(entry.objects),
      }))
      historyIndex = Math.min(savedHistoryIndex, history.length - 1)
    } else {
      // Create initial history entry so undo works from the first action
      history = [
        {
          id: nanoid(),
          timestamp: Date.now(),
          action: "Load Scene",
          objects: JSON.parse(JSON.stringify(migratedObjects)),
          selection: [],
        },
      ]
      historyIndex = 0
    }

    set({
      objects: migratedObjects,
      layers: scene.layers?.length ? scene.layers : [DEFAULT_LAYER],
      areas: scene.areas?.length ? scene.areas : [DEFAULT_AREA],
      viewportSettings: scene.viewportSettings ?? DEFAULT_VIEWPORT_SETTINGS,
      gridSettings: scene.gridSettings ?? DEFAULT_GRID_SETTINGS,
      cameraPosition,
      cameraTarget,
      selectedIds: [],
      hoveredId: null,
      history,
      historyIndex,
      historyPreviewIndex: null, // Clear preview when loading
      isDirty: false,
      lastSavedAt: Date.now(),
    })
  },

  getSceneData: () => {
    const state = get()
    // Limit history to last 50 entries to avoid very large project files
    // Keep the full history in memory, but only persist recent entries
    const MAX_HISTORY_TO_SAVE = 50
    const historyToSave =
      state.history.length > MAX_HISTORY_TO_SAVE
        ? state.history.slice(-MAX_HISTORY_TO_SAVE)
        : state.history

    // Adjust historyIndex if we're saving a truncated history
    let historyIndexToSave = state.historyIndex
    if (state.history.length > MAX_HISTORY_TO_SAVE) {
      // If current index is before the saved range, set to start of saved range
      const savedStartIndex = state.history.length - MAX_HISTORY_TO_SAVE
      historyIndexToSave = Math.max(savedStartIndex, state.historyIndex) - savedStartIndex
    }

    return {
      objects: state.objects,
      layers: state.layers,
      areas: state.areas,
      viewportSettings: state.viewportSettings,
      gridSettings: state.gridSettings,
      cameraPosition: state.cameraPosition,
      cameraTarget: state.cameraTarget,
      history: historyToSave,
      historyIndex: historyIndexToSave,
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
      areas: [DEFAULT_AREA],
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
