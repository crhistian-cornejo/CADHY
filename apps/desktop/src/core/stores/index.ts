/**
 * Modeller Store - CADHY
 *
 * Main entry point for the modeller store.
 * Combines all slices into a single Zustand store with persistence.
 *
 * This store manages the 3D scene state including:
 * - Objects (shapes, channels, structures)
 * - Layers with visibility and filtering
 * - Selection state
 * - Transform mode (translate, rotate, scale)
 * - Camera views
 * - Undo/redo history
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useShallow } from "zustand/shallow"
// AI Scene context helpers (pure functions)
import {
  formatSceneContextForPrompt as _formatSceneContextForPrompt,
  getSceneContextForAI as _getSceneContextForAI,
  type SceneContextForAI,
} from "./ST_scene_context"
// Types
import type { ModellerStore } from "./ST_store_types"
// Slice creators - from slices directory with ST_ prefix
import { createAreasSlice } from "./slices/ST_areas"
import { createCameraSlice } from "./slices/ST_camera"
import { createHelpersSlice } from "./slices/ST_helpers"
import { createHistorySlice } from "./slices/ST_history"
import { createHydraulicsSlice } from "./slices/ST_hydraulics"
import { createLayersSlice } from "./slices/ST_layers"
import { createSettingsSlice } from "./slices/ST_modeller_settings"
import { createNotificationsSlice } from "./slices/ST_notifications"
import { createObjectsSlice } from "./slices/ST_objects"
import { createSceneSlice } from "./slices/ST_scene"
import { createSelectionSlice } from "./slices/ST_selection"
import { createTemporarySlice } from "./slices/ST_temporary"
import { createTopologySlice } from "./slices/ST_topology"
import { createTransformSlice } from "./slices/ST_transform"

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Re-export types from @cadhy/types that were previously re-exported
export type {
  ChannelEndpoint,
  ChannelSection,
  ChannelStructure,
  RectangularSection,
  TrapezoidalSection,
  TriangularSection,
} from "@cadhy/types"
// Re-export all types for backward compatibility
export type {
  AlignmentPoint,
  AnnotationObject,
  AnySceneObject,
  BaffleBlockConfig,
  BoundingBox,
  CameraView,
  ChannelObject,
  ChuteBlockConfig,
  ChuteObject,
  ChuteType,
  DesignNotification,
  EndSillConfig,
  EnvironmentPreset,
  GridSettings,
  HistoryEntry,
  Layer,
  MaterialProperties,
  NotificationAction,
  NotificationCategory,
  // Notifications types
  NotificationSeverity,
  NotificationSummary,
  ObjectType,
  PBRTextureConfig,
  SceneArea,
  SceneData,
  SceneObject,
  SelectionMode,
  ShapeObject,
  SnapMode,
  StillingBasinConfig,
  StillingBasinType,
  StructureObject,
  TransformMode,
  TransformSpace,
  TransitionObject,
  TransitionSection,
  TransitionTypeEnum,
  ViewMode,
  ViewportSettings,
} from "./ST_types"
// Re-export const values
export {
  CHUTE_TYPE_INFO,
  STILLING_BASIN_TYPE_INFO,
} from "./ST_types"
// Re-export camera types
export type {
  CameraAnimation,
  CameraKeyframe,
  EasingType,
  PlaybackState,
  SavedCameraView,
} from "./slices/ST_camera"

// Re-export store type and SceneContextForAI type
export type { ModellerStore }
export type { SceneContextForAI }

// ============================================================================
// STORE CREATION
// ============================================================================

export const useModellerStore = create<ModellerStore>()(
  persist(
    (...args) => ({
      // Combine all slices
      ...createObjectsSlice(...args),
      ...createSelectionSlice(...args),
      ...createTransformSlice(...args),
      ...createLayersSlice(...args),
      ...createAreasSlice(...args),
      ...createCameraSlice(...args),
      ...createHistorySlice(...args),
      ...createSettingsSlice(...args),
      ...createSceneSlice(...args),
      ...createHydraulicsSlice(...args),
      ...createNotificationsSlice(...args),
      ...createTemporarySlice(...args),
      ...createHelpersSlice(...args),
      ...createTopologySlice(...args),
    }),
    {
      name: "cadhy-modeller",
      version: 1,
      partialize: (state) => ({
        // Only persist settings, not scene data
        gridSettings: state.gridSettings,
        viewportSettings: state.viewportSettings,
        transformMode: state.transformMode,
        transformSpace: state.transformSpace,
        snapMode: state.snapMode,
        savedViews: state.savedViews,
      }),
    }
  )
)

// ============================================================================
// AI SCENE CONTEXT WRAPPERS
// ============================================================================

/**
 * Get a structured summary of the scene for AI analysis.
 * This function extracts all relevant information from the modeller store
 * and formats it for the AI to understand and respond to queries about the scene.
 */
export function getSceneContextForAI(): SceneContextForAI {
  const state = useModellerStore.getState()
  return _getSceneContextForAI(state.objects, state.selectedIds)
}

/**
 * Format scene context as a human-readable string for AI prompt injection.
 * This creates a detailed description that the AI can understand and reference.
 */
export function formatSceneContextForPrompt(): string {
  const state = useModellerStore.getState()
  return _formatSceneContextForPrompt(state.objects, state.selectedIds)
}

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useObjects = () => useModellerStore((s) => s.objects)
export const useLayers = () => useModellerStore((s) => s.layers)
export const useAreas = () => useModellerStore((s) => s.areas)
export const useSelectedIds = () => useModellerStore((s) => s.selectedIds)

// These selectors use useShallow to prevent infinite re-renders when the
// derived array changes reference but not contents
export const useSelectedObjects = () =>
  useModellerStore(useShallow((s) => s.objects.filter((o) => s.selectedIds.includes(o.id))))
export const useVisibleObjects = () =>
  useModellerStore(
    useShallow((s) => {
      const visibleLayerIds = s.layers.filter((l) => l.visible).map((l) => l.id)
      return s.objects.filter((o) => o.visible && visibleLayerIds.includes(o.layerId))
    })
  )

export const useTransformMode = () => useModellerStore((s) => s.transformMode)
export const useTransformSpace = () => useModellerStore((s) => s.transformSpace)
export const useSnapMode = () => useModellerStore((s) => s.snapMode)
export const useBoxSelectMode = () => useModellerStore((s) => s.isBoxSelectMode)
export const useSelectionMode = () => useModellerStore((s) => s.selectionMode)
export const useCameraView = () => useModellerStore((s) => s.cameraView)
export const useFocusObjectId = () => useModellerStore((s) => s.focusObjectId)
export const useGridSettings = () => useModellerStore((s) => s.gridSettings)
export const useViewportSettings = () => useModellerStore((s) => s.viewportSettings)
export const useActiveTool = () => useModellerStore((s) => s.activeTool)
export const useCanUndo = () => useModellerStore((s) => s.historyIndex > 0)
export const useCanRedo = () => useModellerStore((s) => s.historyIndex < s.history.length - 1)
export const useIsDirty = () => useModellerStore((s) => s.isDirty)
export const useLastSavedAt = () => useModellerStore((s) => s.lastSavedAt)

// Notifications selectors
export const useNotifications = () => useModellerStore((s) => s.notifications)
export const useShowNotificationsPanel = () => useModellerStore((s) => s.showNotificationsPanel)
export const useActiveNotifications = () =>
  useModellerStore(useShallow((s) => s.notifications.filter((n) => !n.dismissed)))
export const useNotificationSummary = () =>
  useModellerStore(
    useShallow((s) => {
      const notifications = s.notifications.filter((n) => !n.dismissed)
      return {
        info: notifications.filter((n) => n.severity === "info").length,
        warning: notifications.filter((n) => n.severity === "warning").length,
        error: notifications.filter((n) => n.severity === "error").length,
        total: notifications.length,
      }
    })
  )

// Camera selectors
export const useSavedCameraViews = () => useModellerStore((s) => s.savedViews)
export const useCameraAnimations = () => useModellerStore((s) => s.animations)
export const useCurrentAnimation = () => useModellerStore((s) => s.currentAnimation)
export const usePlaybackState = () => useModellerStore((s) => s.playbackState)
export const usePlaybackTime = () => useModellerStore((s) => s.playbackTime)
