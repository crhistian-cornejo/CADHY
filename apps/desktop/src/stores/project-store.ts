/**
 * Project Store - CADHY
 *
 * Manages project state: current project, settings, and operations.
 * Coordinates with modeller-store for scene data.
 *
 * NOTE: Recent projects are managed by recent-projects-store.
 * This store only manages the current project state.
 */

import { loggers } from "@cadhy/shared"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useShallow } from "zustand/shallow"
import { shapeIdMap } from "@/hooks/use-cad"
import * as cadService from "@/services/cad-service"
import {
  createProject as createProjectService,
  openProject as openProjectService,
  type ProjectFullData,
  type ProjectInfo,
  type ProjectSettings,
  type ProjectTemplate,
  saveProjectAs as saveProjectAsService,
  saveProject as saveProjectService,
  updateProjectSettings as updateProjectSettingsService,
} from "@/services/project-service"
import { captureViewportThumbnailDelayed } from "@/services/thumbnail-service"
import { useDrawingStore } from "./drawing-store"
import { useLayoutStore } from "./layout-store"
import { useModellerStore } from "./modeller"
import { useRecentProjectsStore } from "./recent-projects-store"
import { useStatusNotificationStore } from "./status-notification-store"

const log = loggers.project

// Lazy import to avoid circular dependency
let handleProjectChangeRef: ((id: string | null, path: string | null) => Promise<void>) | null =
  null
const getHandleProjectChange = async () => {
  if (!handleProjectChangeRef) {
    const { handleProjectChange } = await import("./chat-store")
    handleProjectChangeRef = handleProjectChange
  }
  return handleProjectChangeRef
}

// ============================================================================
// TYPES
// ============================================================================

// Re-export types for convenience
export type { ProjectInfo, ProjectSettings, ProjectFullData, ProjectTemplate }

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  units: { length: "m", angle: "deg" },
  precision: 4,
  theme: "system",
  autoSave: true,
  autoSaveInterval: 20, // Auto-save every 20 seconds
}

// ============================================================================
// STORE
// ============================================================================

interface ProjectStore {
  // State
  currentProject: ProjectInfo | null
  currentSettings: ProjectSettings
  isLoading: boolean
  error: string | null

  // Actions - Basic state
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Actions - Project operations (async)
  createNewProject: (name: string, path: string, template: ProjectTemplate) => Promise<ProjectInfo>
  openExistingProject: (path: string) => Promise<ProjectFullData>
  saveCurrentProject: () => Promise<ProjectInfo | null>
  saveCurrentProjectAs: (newPath: string, newName: string) => Promise<ProjectInfo | null>
  closeProject: () => Promise<void>

  // Actions - Settings
  updateSettings: (settings: Partial<ProjectSettings>) => Promise<void>
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      currentSettings: DEFAULT_PROJECT_SETTINGS,
      isLoading: false,
      error: null,

      // Basic state actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // ========== PROJECT OPERATIONS ==========

      createNewProject: async (name, path, template) => {
        set({ isLoading: true, error: null })
        try {
          const projectInfo = await createProjectService({ name, path, template })

          // Reset modeller store to clean state
          useModellerStore.getState().reset()

          // Reset drawings store
          useDrawingStore.getState().reset()

          // Update project state
          set({
            currentProject: projectInfo,
            currentSettings: DEFAULT_PROJECT_SETTINGS,
            isLoading: false,
          })

          // Add to recent projects store (single source of truth)
          useRecentProjectsStore.getState().addProject({
            id: projectInfo.id,
            name: projectInfo.name,
            path: projectInfo.path,
          })

          // Explicitly trigger chat session initialization
          try {
            const handleProjectChange = await getHandleProjectChange()
            await handleProjectChange(projectInfo.id, projectInfo.path)
          } catch (chatErr) {
            log.error("Failed to initialize chat sessions:", chatErr)
          }

          return projectInfo
        } catch (err) {
          const error = err instanceof Error ? err.message : "Failed to create project"
          set({ error, isLoading: false })
          throw new Error(error)
        }
      },

      openExistingProject: async (path) => {
        set({ isLoading: true, error: null })
        try {
          const projectData = await openProjectService(path)

          // Load scene into modeller store
          useModellerStore.getState().loadScene(projectData.scene)

          // Recreate backend shapes from BREP data or parameters for shapes
          // This allows ALL shapes (primitives and compounds) to have valid backend IDs after project load
          const objects = useModellerStore.getState().objects
          const oldToNewBackendIdMap = new Map<string, string>()

          log.info(
            `[Project Load] Recreating ${objects.filter((o) => o.type === "shape").length} shapes in backend...`
          )

          for (const obj of objects) {
            if (obj.type === "shape") {
              const shapeObj = obj as {
                shapeType?: string
                parameters?: Record<string, number>
                metadata?: { brepData?: string; backendShapeId?: string }
                id: string
              }

              // Try to recreate from BREP data first (for compound shapes)
              if (shapeObj.metadata?.brepData) {
                try {
                  const oldBackendId = shapeObj.metadata.backendShapeId
                  const result = await cadService.deserializeShape(shapeObj.metadata.brepData)
                  // Update the shapeIdMap with the new backend ID
                  shapeIdMap.set(obj.id, result.id)
                  // Track the old → new backend ID mapping for updating drawings
                  if (oldBackendId) {
                    oldToNewBackendIdMap.set(oldBackendId, result.id)
                  }

                  // Retessellate the shape to ensure mesh is fresh
                  // This is critical for compound shapes created by boolean operations
                  const meshData = await cadService.tessellate(result.id, 0.1)
                  const mesh = {
                    vertices: new Float32Array(meshData.vertices),
                    indices: new Uint32Array(meshData.indices),
                    normals: meshData.normals
                      ? new Float32Array(meshData.normals)
                      : new Float32Array(meshData.vertices.length),
                    vertexCount: meshData.vertex_count,
                    triangleCount: meshData.triangle_count,
                  }

                  // Update the object's metadata and mesh with fresh data
                  useModellerStore.getState().updateObject(obj.id, {
                    mesh,
                    metadata: {
                      ...shapeObj.metadata,
                      backendShapeId: result.id,
                      analysis: result.analysis, // Update BIM analysis data
                    },
                  })
                  log.info(
                    `Recreated compound shape ${obj.id} from BREP: ${oldBackendId} -> ${result.id}, mesh vertices: ${mesh.vertexCount}`
                  )
                } catch (deserializeError) {
                  log.error(`Failed to recreate shape ${obj.id} from BREP:`, deserializeError)
                }
              }
              // For primitives without BREP, recreate from parameters
              else if (shapeObj.shapeType && shapeObj.parameters) {
                try {
                  let result: { id: string; analysis?: unknown } | null = null
                  const params = shapeObj.parameters

                  switch (shapeObj.shapeType) {
                    case "box": {
                      const { width = 1, depth = 1, height = 1 } = params
                      result = await cadService.createBox(width, depth, height)
                      break
                    }
                    case "cylinder": {
                      const { radius = 0.5, height = 1 } = params
                      result = await cadService.createCylinder(radius, height)
                      break
                    }
                    case "sphere": {
                      const { radius = 0.5 } = params
                      result = await cadService.createSphere(radius)
                      break
                    }
                    case "cone": {
                      const { baseRadius = 0.5, topRadius = 0, height = 1 } = params
                      result = await cadService.createCone(baseRadius, topRadius, height)
                      break
                    }
                    case "torus": {
                      const { majorRadius = 1, minorRadius = 0.25 } = params
                      result = await cadService.createTorus(majorRadius, minorRadius)
                      break
                    }
                  }

                  if (result) {
                    shapeIdMap.set(obj.id, result.id)
                    log.info(
                      `Recreated primitive shape ${obj.id} (${shapeObj.shapeType}) -> backend ${result.id}`
                    )
                  }
                } catch (primitiveError) {
                  log.error(
                    `Failed to recreate primitive ${obj.id} (${shapeObj.shapeType}):`,
                    primitiveError
                  )
                }
              } else {
                log.warn(
                  `Shape ${obj.id} has no BREP data and no recreatable parameters - cannot recreate in backend`
                )
              }
            }
          }

          log.info(
            `[Project Load] shapeIdMap now has ${shapeIdMap.size} entries:`,
            Array.from(shapeIdMap.entries())
          )

          // Load drawings into drawing store
          if (projectData.drawings) {
            useDrawingStore.getState().loadDrawings(projectData.drawings as any)

            // Create reverse mapping: backendShapeId -> sceneObjectId
            // This is needed to migrate old drawings that stored backendShapeIds
            // to the new format that stores sceneObjectIds (stable across restarts)
            const backendIdToSceneIdMap = new Map<string, string>()
            for (const obj of objects) {
              if (obj.type === "shape") {
                const shapeObj = obj as { metadata?: { backendShapeId?: string }; id: string }
                // Map both old and new backend IDs to the scene object ID
                if (shapeObj.metadata?.backendShapeId) {
                  backendIdToSceneIdMap.set(shapeObj.metadata.backendShapeId, obj.id)
                }
                // Also map from shapeIdMap (which has the new backend ID)
                const newBackendId = shapeIdMap.get(obj.id)
                if (newBackendId) {
                  backendIdToSceneIdMap.set(newBackendId, obj.id)
                }
              }
            }
            // Also add entries from oldToNewBackendIdMap
            for (const [oldId, newId] of oldToNewBackendIdMap) {
              const sceneId = backendIdToSceneIdMap.get(newId)
              if (sceneId) {
                backendIdToSceneIdMap.set(oldId, sceneId)
              }
            }

            // Migrate drawings: convert backendShapeIds to sceneObjectIds
            // This handles the case where old drawings stored backendShapeIds instead of sceneObjectIds
            const drawings = useDrawingStore.getState().drawings
            const shapeObjects = objects.filter((obj) => obj.type === "shape")

            for (const drawing of drawings) {
              const updatedSourceShapeIds = drawing.sourceShapeIds.map((id: string) => {
                // Check if this ID is already a valid sceneObjectId
                const isValidSceneObjectId = shapeObjects.some((obj) => obj.id === id)
                if (isValidSceneObjectId) {
                  // Already a valid sceneObjectId - no migration needed
                  return id
                }

                // Check if this ID is a backendShapeId that needs migration
                const sceneId = backendIdToSceneIdMap.get(id)
                if (sceneId) {
                  log.info(
                    `Drawing ${drawing.id}: Migrated sourceShapeId from backendId ${id} -> sceneId ${sceneId}`
                  )
                  return sceneId
                }

                // ID is neither a valid sceneObjectId nor a known backendShapeId
                // This can happen with corrupted data or very old projects
                // Try to recover by using the first available shape if there's only one
                if (shapeObjects.length === 1) {
                  const fallbackSceneId = shapeObjects[0].id
                  log.warn(
                    `Drawing ${drawing.id}: sourceShapeId ${id} not found, falling back to only available shape: ${fallbackSceneId}`
                  )
                  return fallbackSceneId
                }

                // Cannot recover - log error and keep the invalid ID (will fail on view regeneration)
                log.error(
                  `Drawing ${drawing.id}: sourceShapeId ${id} not found and cannot be recovered. ` +
                    `Available sceneObjectIds: ${shapeObjects.map((o) => o.id).join(", ")}. ` +
                    `BackendId mappings: ${Array.from(backendIdToSceneIdMap.entries())
                      .map(([k, v]) => `${k}->${v}`)
                      .join(", ")}`
                )
                return id
              })

              if (
                JSON.stringify(updatedSourceShapeIds) !== JSON.stringify(drawing.sourceShapeIds)
              ) {
                useDrawingStore.getState().updateDrawing(drawing.id, {
                  sourceShapeIds: updatedSourceShapeIds,
                })
              }
            }

            // Regenerate all views in all drawings with fresh projections
            // This is necessary because views store projection data, which becomes stale
            // when shapes are recreated with new backend IDs after app restart
            const drawingsToRegenerate = useDrawingStore.getState().drawings
            for (const drawing of drawingsToRegenerate) {
              if (drawing.views.length > 0) {
                try {
                  const count = await useDrawingStore.getState().regenerateAllViews(drawing.id)
                  log.info(
                    `Regenerated ${count}/${drawing.views.length} views for drawing ${drawing.id}`
                  )
                } catch (regenErr) {
                  log.error(`Failed to regenerate views for drawing ${drawing.id}:`, regenErr)
                }
              }
            }
          } else {
            useDrawingStore.getState().reset()
          }

          // Update project state (force autoSaveInterval to 20 seconds)
          set({
            currentProject: projectData.info,
            currentSettings: {
              ...projectData.settings,
              autoSaveInterval: 20, // Always 20 seconds
            },
            isLoading: false,
          })

          // Add to recent projects store (single source of truth)
          useRecentProjectsStore.getState().addProject({
            id: projectData.info.id,
            name: projectData.info.name,
            path: projectData.info.path,
          })

          // Explicitly trigger chat session loading (backup to subscription)
          // This ensures sessions are loaded even if subscription timing is off
          try {
            const handleProjectChange = await getHandleProjectChange()
            await handleProjectChange(projectData.info.id, projectData.info.path)
          } catch (chatErr) {
            log.error("Failed to load chat sessions:", chatErr)
          }

          return projectData
        } catch (err) {
          const error = err instanceof Error ? err.message : "Failed to open project"
          set({ error, isLoading: false })
          throw new Error(error)
        }
      },

      saveCurrentProject: async () => {
        const { currentProject } = get()
        if (!currentProject) return null

        // Note: We don't set isLoading for saves to avoid UI disruption
        // The save happens silently in the background
        try {
          const sceneData = useModellerStore.getState().getSceneData()
          const drawingsData = useDrawingStore.getState().getDrawingsData()
          const projectInfo = await saveProjectService(currentProject.path, sceneData, drawingsData)

          // Mark modeller as clean
          useModellerStore.getState().markClean()

          // Update project info (no isLoading change to keep UI stable)
          set({ currentProject: projectInfo })

          // Capture and save thumbnail (async, non-blocking)
          // Uses requestAnimationFrame to ensure textures are rendered
          captureViewportThumbnailDelayed().then((thumbnail) => {
            if (thumbnail) {
              useRecentProjectsStore.getState().setThumbnail(projectInfo.id, thumbnail)
            }
          })

          // Show subtle save notification in status bar
          useStatusNotificationStore.getState().showNotification("statusBar.saved", "success")

          return projectInfo
        } catch (err) {
          const error = err instanceof Error ? err.message : "Failed to save project"
          set({ error })
          // Show error notification in status bar
          useStatusNotificationStore.getState().showNotification("statusBar.saveError", "error")
          throw new Error(error)
        }
      },

      saveCurrentProjectAs: async (newPath, newName) => {
        const { currentProject } = get()
        if (!currentProject) return null

        // Note: We don't set isLoading for saves to avoid UI disruption
        // The save happens silently in the background
        try {
          const sceneData = useModellerStore.getState().getSceneData()
          const drawingsData = useDrawingStore.getState().getDrawingsData()
          const projectInfo = await saveProjectAsService(
            currentProject.path,
            newPath,
            newName,
            sceneData,
            drawingsData
          )

          // Mark modeller as clean
          useModellerStore.getState().markClean()

          // Update to new project (no isLoading change to keep UI stable)
          set({ currentProject: projectInfo })

          // Add to recent projects store (single source of truth)
          useRecentProjectsStore.getState().addProject({
            id: projectInfo.id,
            name: projectInfo.name,
            path: projectInfo.path,
          })

          // Capture and save thumbnail (async, non-blocking)
          // Uses requestAnimationFrame to ensure textures are rendered
          captureViewportThumbnailDelayed().then((thumbnail) => {
            if (thumbnail) {
              useRecentProjectsStore.getState().setThumbnail(projectInfo.id, thumbnail)
            }
          })

          // Show subtle save notification in status bar
          useStatusNotificationStore.getState().showNotification("statusBar.saved", "success")

          return projectInfo
        } catch (err) {
          const error = err instanceof Error ? err.message : "Failed to save project"
          set({ error })
          // Show error notification in status bar
          useStatusNotificationStore.getState().showNotification("statusBar.saveError", "error")
          throw new Error(error)
        }
      },

      closeProject: async () => {
        // Reset modeller store
        useModellerStore.getState().reset()

        // Reset drawings store
        useDrawingStore.getState().reset()

        // Hide AI chat panel
        useLayoutStore.getState().setPanel("aiChat", false)

        // Clear chat sessions
        try {
          const handleProjectChange = await getHandleProjectChange()
          await handleProjectChange(null, null)
        } catch (chatErr) {
          log.error("Failed to clear chat sessions:", chatErr)
        }

        // Clear project state
        set({
          currentProject: null,
          currentSettings: DEFAULT_PROJECT_SETTINGS,
        })
      },

      // ========== SETTINGS ==========

      updateSettings: async (settings) => {
        const { currentProject, currentSettings } = get()
        const newSettings = { ...currentSettings, ...settings }

        // Update local state immediately
        set({ currentSettings: newSettings })

        // Persist to file if project is open
        if (currentProject) {
          try {
            await updateProjectSettingsService(currentProject.path, newSettings)
          } catch (err) {
            log.error("Failed to persist settings:", err)
          }
        }
      },
    }),
    {
      name: "cadhy-projects",
      version: 6, // Bump version to trigger migration
      partialize: (state) => ({
        // Only persist settings - recent projects are in recent-projects-store
        currentSettings: state.currentSettings,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>

        // v3: Remove old recentProjects data
        if (version < 3) {
          delete state.recentProjects
        }

        // v6: ALWAYS force autoSaveInterval to exactly 20 seconds
        const settings = state.currentSettings as Record<string, unknown> | undefined
        if (settings) {
          settings.autoSaveInterval = 20
        }

        return persistedState as ProjectStore
      },
    }
  )
)

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useCurrentProject = () => useProjectStore((s) => s.currentProject)
export const useProjectSettings = () => useProjectStore((s) => s.currentSettings)
export const useIsProjectLoading = () => useProjectStore((s) => s.isLoading)
export const useProjectError = () => useProjectStore((s) => s.error)
export const useIsProjectOpen = () => useProjectStore((s) => s.currentProject !== null)

// Re-export from recent-projects-store for backward compatibility
// Components that used useRecentProjects from project-store will still work
export { useProjects as useRecentProjects } from "./recent-projects-store"

export const useProjectActions = () =>
  useProjectStore(
    useShallow((s) => ({
      createNewProject: s.createNewProject,
      openExistingProject: s.openExistingProject,
      saveCurrentProject: s.saveCurrentProject,
      saveCurrentProjectAs: s.saveCurrentProjectAs,
      closeProject: s.closeProject,
      updateSettings: s.updateSettings,
      setError: s.setError,
      clearError: s.clearError,
    }))
  )
