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

          // Load drawings into drawing store
          if (projectData.drawings) {
            useDrawingStore.getState().loadDrawings(projectData.drawings as any)
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

        set({ isLoading: true, error: null })
        try {
          const sceneData = useModellerStore.getState().getSceneData()
          const drawingsData = useDrawingStore.getState().getDrawingsData()
          const projectInfo = await saveProjectService(currentProject.path, sceneData, drawingsData)

          // Mark modeller as clean
          useModellerStore.getState().markClean()

          // Update project info
          set({
            currentProject: projectInfo,
            isLoading: false,
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
          set({ error, isLoading: false })
          throw new Error(error)
        }
      },

      saveCurrentProjectAs: async (newPath, newName) => {
        const { currentProject } = get()
        if (!currentProject) return null

        set({ isLoading: true, error: null })
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

          // Update to new project
          set({
            currentProject: projectInfo,
            isLoading: false,
          })

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
          set({ error, isLoading: false })
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
