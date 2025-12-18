/**
 * Recent Projects Store - CADHY
 *
 * Manages recent projects and folders with persistence.
 * Supports folder organization, thumbnails, and project stats.
 */

import type { FolderColorPreset, ProjectFolder, RecentProject } from "@cadhy/types"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useShallow } from "zustand/shallow"

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface RecentProjectsState {
  // State
  projects: RecentProject[]
  folders: ProjectFolder[]
  maxProjects: number
  maxProjectsPerFolder: number
  isLoadingThumbnails: boolean

  // Project actions
  addProject: (project: Omit<RecentProject, "lastOpened" | "openCount">) => void
  updateProject: (id: string, updates: Partial<RecentProject>) => void
  removeProject: (id: string) => void
  clearAllProjects: () => void
  getProjectById: (id: string) => RecentProject | undefined
  getProjectByPath: (path: string) => RecentProject | undefined
  incrementOpenCount: (id: string) => void
  setThumbnail: (id: string, thumbnail: string) => void

  // Folder actions
  createFolder: (name: string, colorPreset?: FolderColorPreset) => ProjectFolder
  updateFolder: (id: string, updates: Partial<ProjectFolder>) => void
  deleteFolder: (id: string) => void
  getFolderById: (id: string) => ProjectFolder | undefined

  // Folder-Project relationship
  assignProjectToFolder: (projectId: string, folderId: string | undefined) => boolean
  getProjectsInFolder: (folderId: string) => RecentProject[]
  getUnfolderedProjects: () => RecentProject[]
  canAddToFolder: (folderId: string) => boolean
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

const MAX_PROJECTS = 20
const MAX_PER_FOLDER = 10

export const useRecentProjectsStore = create<RecentProjectsState>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      folders: [],
      maxProjects: MAX_PROJECTS,
      maxProjectsPerFolder: MAX_PER_FOLDER,
      isLoadingThumbnails: false,

      // ========================================
      // PROJECT ACTIONS
      // ========================================

      addProject: (project) => {
        const now = Date.now()
        const { projects } = get()

        // Check if project already exists (preserve folderId and other data)
        const existingProject = projects.find((p) => p.id === project.id)

        const newProject: RecentProject = {
          ...project,
          // Preserve existing folderId and thumbnail if project exists
          folderId: existingProject?.folderId ?? project.folderId,
          thumbnail: existingProject?.thumbnail ?? project.thumbnail,
          openCount: existingProject ? existingProject.openCount + 1 : 1,
          lastOpened: now,
        }

        set((state) => {
          // Remove if already exists
          const filtered = state.projects.filter((p) => p.id !== project.id)
          // Add to beginning and limit
          const updated = [newProject, ...filtered].slice(0, state.maxProjects)
          return { projects: updated }
        })
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }))
      },

      removeProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }))
      },

      clearAllProjects: () => {
        set({ projects: [] })
      },

      getProjectById: (id) => {
        return get().projects.find((p) => p.id === id)
      },

      getProjectByPath: (path) => {
        return get().projects.find((p) => p.path === path)
      },

      incrementOpenCount: (id) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, openCount: p.openCount + 1, lastOpened: Date.now() } : p
          ),
        }))
      },

      setThumbnail: (id, thumbnail) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, thumbnail } : p)),
        }))
      },

      // ========================================
      // FOLDER ACTIONS
      // ========================================

      createFolder: (name, colorPreset = "blue") => {
        const { folders } = get()
        const newFolder: ProjectFolder = {
          id: crypto.randomUUID(),
          name,
          colorPreset,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          sortOrder: folders.length,
        }
        set({ folders: [...folders, newFolder] })
        return newFolder
      },

      updateFolder: (id, updates) => {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === id ? { ...f, ...updates, modifiedAt: Date.now() } : f
          ),
        }))
      },

      deleteFolder: (id) => {
        // Remove folder and unassign all projects from it
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          projects: state.projects.map((p) =>
            p.folderId === id ? { ...p, folderId: undefined } : p
          ),
        }))
      },

      getFolderById: (id) => {
        return get().folders.find((f) => f.id === id)
      },

      // ========================================
      // FOLDER-PROJECT RELATIONSHIP
      // ========================================

      assignProjectToFolder: (projectId, folderId) => {
        const { projects, maxProjectsPerFolder } = get()

        // Check if folder has space
        if (folderId) {
          const projectsInFolder = projects.filter((p) => p.folderId === folderId)
          if (projectsInFolder.length >= maxProjectsPerFolder) {
            return false
          }
        }

        set((state) => ({
          projects: state.projects.map((p) => (p.id === projectId ? { ...p, folderId } : p)),
        }))

        return true
      },

      getProjectsInFolder: (folderId) => {
        return get().projects.filter((p) => p.folderId === folderId)
      },

      getUnfolderedProjects: () => {
        return get().projects.filter((p) => !p.folderId)
      },

      canAddToFolder: (folderId) => {
        const { projects, maxProjectsPerFolder } = get()
        const count = projects.filter((p) => p.folderId === folderId).length
        return count < maxProjectsPerFolder
      },
    }),
    {
      name: "cadhy-recent-projects",
      version: 1,
      partialize: (state) => ({
        projects: state.projects,
        folders: state.folders,
        maxProjects: state.maxProjects,
      }),
    }
  )
)

// ============================================================================
// SELECTORS - Use raw state to avoid infinite loops
// ============================================================================

export const useProjects = () => useRecentProjectsStore((s) => s.projects)
export const useFolders = () => useRecentProjectsStore((s) => s.folders)

// For complex derived state, get raw data and compute in component with useMemo
export const useFoldersAndProjects = () =>
  useRecentProjectsStore(useShallow((s) => ({ folders: s.folders, projects: s.projects })))

// Actions selector - these are stable references so we use useShallow
export const useRecentProjectsActions = () =>
  useRecentProjectsStore(
    useShallow((s) => ({
      addProject: s.addProject,
      updateProject: s.updateProject,
      removeProject: s.removeProject,
      clearAllProjects: s.clearAllProjects,
      getProjectById: s.getProjectById,
      incrementOpenCount: s.incrementOpenCount,
      createFolder: s.createFolder,
      updateFolder: s.updateFolder,
      deleteFolder: s.deleteFolder,
      assignProjectToFolder: s.assignProjectToFolder,
      canAddToFolder: s.canAddToFolder,
    }))
  )
