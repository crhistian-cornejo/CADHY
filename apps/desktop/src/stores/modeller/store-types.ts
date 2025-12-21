/**
 * Store Types - CADHY Modeller Store
 *
 * Central type definitions for the complete modeller store.
 * This file defines the combined store interface that all slices reference.
 */

import type { Transform } from "@cadhy/types"
import type {
  AnySceneObject,
  CameraView,
  DesignNotification,
  GridSettings,
  HistoryEntry,
  Layer,
  NotificationSummary,
  ObjectType,
  SceneArea,
  SceneData,
  SnapMode,
  TransformMode,
  TransformSpace,
  ViewportSettings,
} from "./types"

// Re-export Vec3 from @cadhy/types for convenience
export type { Vec3 } from "@cadhy/types"

/**
 * Complete Modeller Store Interface
 *
 * This interface combines all slice states and actions.
 * Each slice uses this type to access other slices' state/actions.
 */
export interface ModellerStore {
  // ========== STATE ==========

  // Objects (objects-slice)
  objects: AnySceneObject[]

  // Selection (selection-slice)
  selectedIds: string[]
  hoveredId: string | null

  // Transform (transform-slice)
  transformMode: TransformMode
  transformSpace: TransformSpace
  snapMode: SnapMode

  // Layers (layers-slice)
  layers: Layer[]

  // Areas (areas-slice)
  areas: SceneArea[]

  // Camera (camera-slice)
  cameraView: CameraView
  cameraPosition: { x: number; y: number; z: number }
  cameraTarget: { x: number; y: number; z: number }
  focusObjectId: string | null

  // Settings (settings-slice)
  gridSettings: GridSettings
  viewportSettings: ViewportSettings
  activeTool: string | null

  // History (history-slice)
  history: HistoryEntry[]
  historyIndex: number
  pendingHistoryState: { objects: AnySceneObject[]; selection: string[] } | null

  // Scene (scene-slice)
  isDirty: boolean
  lastSavedAt: number | null

  // ========== ACTIONS ==========

  // Object management (objects-slice)
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

  // Selection (selection-slice)
  select: (id: string, additive?: boolean) => void
  selectMultiple: (ids: string[], additive?: boolean) => void
  selectAll: () => void
  deselectAll: () => void
  toggleSelection: (id: string) => void
  setHovered: (id: string | null) => void
  invertSelection: () => void
  selectByLayer: (layerId: string) => void
  selectByType: (type: ObjectType) => void

  // Transform (transform-slice)
  setTransformMode: (mode: TransformMode) => void
  setTransformSpace: (space: TransformSpace) => void
  setSnapMode: (mode: SnapMode) => void
  transformSelected: (transform: Partial<Transform>) => void

  // Layers (layers-slice)
  addLayer: (name: string, color?: string) => string
  updateLayer: (id: string, updates: Partial<Layer>) => void
  deleteLayer: (id: string) => void
  setActiveLayer: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  moveObjectToLayer: (objectId: string, layerId: string) => void

  // Areas (areas-slice)
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

  // Camera (camera-slice)
  setCameraView: (view: CameraView) => void
  setCameraPosition: (position: { x: number; y: number; z: number }) => void
  setCameraTarget: (target: { x: number; y: number; z: number }) => void
  focusObject: (id: string) => void
  clearFocus: () => void
  fitToSelection: () => void
  fitToAll: () => void

  // Settings (settings-slice)
  setGridSettings: (settings: Partial<GridSettings>) => void
  setViewportSettings: (settings: Partial<ViewportSettings>) => void
  setActiveTool: (tool: string | null) => void

  // History (history-slice)
  undo: () => void
  redo: () => void
  saveToHistory: (action: string) => void
  saveStateBeforeAction: () => void
  commitToHistory: (action: string) => void
  clearPendingHistory: () => void
  clearHistory: () => void

  // Scene management (scene-slice)
  loadScene: (scene: SceneData) => void
  getSceneData: () => SceneData
  markClean: () => void
  markDirty: () => void

  // Hydraulic connections (hydraulics-slice)
  connectElements: (upstreamId: string, downstreamId: string) => void
  disconnectElement: (id: string, direction: "upstream" | "downstream") => void
  propagatePositions: (startId: string) => void
  propagatePositionsUpstream: (startId: string) => void
  recalculateHydraulicChain: () => void
  syncTransitionsWithChannel: (channelId: string) => void
  syncTransitionElevationsFromDownstream: (channelId: string) => void

  // Notifications (notifications-slice)
  notifications: DesignNotification[]
  showNotificationsPanel: boolean
  analyzeScene: () => void
  dismissNotification: (id: string) => void
  dismissAllNotifications: () => void
  clearNotifications: () => void
  toggleNotificationsPanel: () => void
  setShowNotificationsPanel: (show: boolean) => void
  getNotificationSummary: () => NotificationSummary
  getNotificationsForObject: (objectId: string) => DesignNotification[]
  getActiveNotifications: () => DesignNotification[]

  // Reset
  reset: () => void
}
