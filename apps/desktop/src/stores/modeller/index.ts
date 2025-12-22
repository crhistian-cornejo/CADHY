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
import { createAreasSlice } from "./areas-slice"
import { createCameraSlice } from "./camera-slice"
import { createHelpersSlice } from "./helpers-slice"
import { createHistorySlice } from "./history-slice"
import { createHydraulicsSlice } from "./hydraulics-slice"
import { createLayersSlice } from "./layers-slice"
import { createNotificationsSlice } from "./notifications-slice"
// Slice creators
import { createObjectsSlice } from "./objects-slice"
// AI Scene context helpers (pure functions)
import {
  formatSceneContextForPrompt as _formatSceneContextForPrompt,
  getSceneContextForAI as _getSceneContextForAI,
  type SceneContextForAI,
} from "./scene-context"
import { createSceneSlice } from "./scene-slice"
import { createSelectionSlice } from "./selection-slice"
import { createSettingsSlice } from "./settings-slice"
// Types
import type { ModellerStore } from "./store-types"
import { createTemporarySlice } from "./temporary-slice"
import { createTransformSlice } from "./transform-slice"

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
// Re-export camera types
export type {
  CameraAnimation,
  CameraKeyframe,
  EasingType,
  PlaybackState,
  SavedCameraView,
} from "./camera-slice"
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
} from "./types"
// Re-export const values
export {
  CHUTE_TYPE_INFO,
  STILLING_BASIN_TYPE_INFO,
} from "./types"

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
