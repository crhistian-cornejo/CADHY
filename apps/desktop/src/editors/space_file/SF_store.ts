/**
 * @fileoverview Space File Store - File browser state management
 * @module editors/space_file
 *
 * Uses Tauri's filesystem plugin for native file operations.
 */

import { homeDir, join } from "@tauri-apps/api/path"
import { type DirEntry, mkdir, readDir, remove, rename } from "@tauri-apps/plugin-fs"
import { create } from "zustand"
import { persist } from "zustand/middleware"

import type {
  BrowserState,
  FileBrowserSettings,
  FileEntry,
  FileOperation,
  RecentFile,
  SortField,
  SortOrder,
  ViewMode,
} from "./SF_types"
import { DEFAULT_FILE_BROWSER_SETTINGS, getFileType } from "./SF_types"

// ============================================================================
// STORE STATE
// ============================================================================

interface FileBrowserStore extends BrowserState {
  settings: FileBrowserSettings
  operations: FileOperation[]

  // Navigation history
  historyStack: string[]
  historyIndex: number

  // Navigation
  navigateTo: (path: string) => Promise<void>
  navigateUp: () => Promise<void>
  navigateBack: () => void
  navigateForward: () => void
  refresh: () => Promise<void>

  // Selection
  select: (id: string, additive?: boolean) => void
  selectAll: () => void
  deselectAll: () => void
  toggleSelection: (id: string) => void

  // View
  setViewMode: (mode: ViewMode) => void
  setSort: (field: SortField, order?: SortOrder) => void
  setFilter: (text: string) => void
  toggleHiddenFiles: () => void

  // Bookmarks
  addBookmark: (path: string, name: string) => void
  removeBookmark: (id: string) => void

  // Recent files
  addRecentFile: (entry: FileEntry) => void
  clearRecentFiles: () => void

  // Operations
  deleteSelected: () => Promise<void>
  renameEntry: (id: string, newName: string) => Promise<void>
  createFolder: (name: string) => Promise<void>
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

const useFileBrowserStore = create<FileBrowserStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPath: "",
      entries: [],
      selectedIds: new Set(),
      viewMode: "grid",
      sortField: "name",
      sortOrder: "asc",
      showHiddenFiles: false,
      filterText: "",
      isLoading: false,
      settings: DEFAULT_FILE_BROWSER_SETTINGS,
      operations: [],
      historyStack: [],
      historyIndex: -1,

      // Navigation
      navigateTo: async (path: string) => {
        set({ isLoading: true, error: undefined })

        try {
          // Resolve the path - if empty or "/", go to home directory
          let resolvedPath = path
          if (!path || path === "/" || path === "") {
            resolvedPath = await homeDir()
          }

          // Read directory contents using Tauri FS plugin
          const dirEntries = await readDir(resolvedPath)

          // Convert DirEntry to FileEntry
          const entries: FileEntry[] = await Promise.all(
            dirEntries.map(async (entry: DirEntry) => {
              const entryPath = await join(resolvedPath, entry.name)
              const isDir = entry.isDirectory

              return {
                id: entryPath,
                name: entry.name,
                path: entryPath,
                type: isDir ? "folder" : getFileType(entry.name),
                size: 0, // Size not available in readDir, would need stat
                isDirectory: isDir,
                modifiedAt: new Date(), // Would need stat for actual date
                createdAt: new Date(),
              } as FileEntry
            })
          )

          // Filter hidden files if setting is disabled
          const { showHiddenFiles } = get()
          const filteredEntries = showHiddenFiles
            ? entries
            : entries.filter((e) => !e.name.startsWith("."))

          // Update history - add new path, truncating forward history
          const { historyStack, historyIndex } = get()
          const newHistory = [...historyStack.slice(0, historyIndex + 1), resolvedPath]

          set({
            currentPath: resolvedPath,
            entries: filteredEntries,
            selectedIds: new Set(),
            isLoading: false,
            historyStack: newHistory,
            historyIndex: newHistory.length - 1,
          })
        } catch (error) {
          console.error("[FileBrowser] Navigation failed:", error)
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Failed to navigate",
          })
        }
      },

      navigateUp: async () => {
        const { currentPath, navigateTo } = get()
        const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/"
        await navigateTo(parentPath)
      },

      navigateBack: async () => {
        const { historyStack, historyIndex, navigateTo } = get()
        if (historyIndex <= 0) return

        // Navigate to previous path without adding to history
        const prevPath = historyStack[historyIndex - 1]
        set({ historyIndex: historyIndex - 1 })

        // Reload the directory content for that path
        set({ isLoading: true, error: undefined })
        try {
          const dirEntries = await readDir(prevPath)
          const entries: FileEntry[] = await Promise.all(
            dirEntries.map(async (entry: DirEntry) => {
              const entryPath = await join(prevPath, entry.name)
              return {
                id: entryPath,
                name: entry.name,
                path: entryPath,
                type: entry.isDirectory ? "folder" : getFileType(entry.name),
                size: 0,
                isDirectory: entry.isDirectory,
                modifiedAt: new Date(),
                createdAt: new Date(),
              } as FileEntry
            })
          )

          const { showHiddenFiles } = get()
          const filteredEntries = showHiddenFiles
            ? entries
            : entries.filter((e) => !e.name.startsWith("."))

          set({
            currentPath: prevPath,
            entries: filteredEntries,
            selectedIds: new Set(),
            isLoading: false,
          })
        } catch (error) {
          console.error("[FileBrowser] Navigate back failed:", error)
          set({ isLoading: false })
        }
      },

      navigateForward: async () => {
        const { historyStack, historyIndex } = get()
        if (historyIndex >= historyStack.length - 1) return

        // Navigate to next path
        const nextPath = historyStack[historyIndex + 1]
        set({ historyIndex: historyIndex + 1 })

        // Reload the directory content
        set({ isLoading: true, error: undefined })
        try {
          const dirEntries = await readDir(nextPath)
          const entries: FileEntry[] = await Promise.all(
            dirEntries.map(async (entry: DirEntry) => {
              const entryPath = await join(nextPath, entry.name)
              return {
                id: entryPath,
                name: entry.name,
                path: entryPath,
                type: entry.isDirectory ? "folder" : getFileType(entry.name),
                size: 0,
                isDirectory: entry.isDirectory,
                modifiedAt: new Date(),
                createdAt: new Date(),
              } as FileEntry
            })
          )

          const { showHiddenFiles } = get()
          const filteredEntries = showHiddenFiles
            ? entries
            : entries.filter((e) => !e.name.startsWith("."))

          set({
            currentPath: nextPath,
            entries: filteredEntries,
            selectedIds: new Set(),
            isLoading: false,
          })
        } catch (error) {
          console.error("[FileBrowser] Navigate forward failed:", error)
          set({ isLoading: false })
        }
      },

      refresh: async () => {
        const { currentPath, navigateTo } = get()
        await navigateTo(currentPath)
      },

      // Selection
      select: (id: string, additive = false) => {
        set((state) => {
          const newSelection = additive ? new Set(state.selectedIds) : new Set<string>()
          newSelection.add(id)
          return { selectedIds: newSelection }
        })
      },

      selectAll: () => {
        set((state) => ({
          selectedIds: new Set(state.entries.map((e) => e.id)),
        }))
      },

      deselectAll: () => {
        set({ selectedIds: new Set() })
      },

      toggleSelection: (id: string) => {
        set((state) => {
          const newSelection = new Set(state.selectedIds)
          if (newSelection.has(id)) {
            newSelection.delete(id)
          } else {
            newSelection.add(id)
          }
          return { selectedIds: newSelection }
        })
      },

      // View
      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode })
      },

      setSort: (field: SortField, order?: SortOrder) => {
        set((state) => ({
          sortField: field,
          sortOrder:
            order ?? (state.sortField === field && state.sortOrder === "asc" ? "desc" : "asc"),
        }))
      },

      setFilter: (text: string) => {
        set({ filterText: text })
      },

      toggleHiddenFiles: () => {
        set((state) => ({ showHiddenFiles: !state.showHiddenFiles }))
      },

      // Bookmarks
      addBookmark: (path: string, name: string) => {
        set((state) => ({
          settings: {
            ...state.settings,
            bookmarks: [...state.settings.bookmarks, { id: crypto.randomUUID(), name, path }],
          },
        }))
      },

      removeBookmark: (id: string) => {
        set((state) => ({
          settings: {
            ...state.settings,
            bookmarks: state.settings.bookmarks.filter((b) => b.id !== id),
          },
        }))
      },

      // Recent files
      addRecentFile: (entry: FileEntry) => {
        set((state) => {
          const recentFile: RecentFile = {
            path: entry.path,
            name: entry.name,
            type: entry.type,
            accessedAt: new Date(),
          }

          const filtered = state.settings.recentFiles.filter((f) => f.path !== entry.path)

          return {
            settings: {
              ...state.settings,
              recentFiles: [recentFile, ...filtered].slice(0, state.settings.maxRecentFiles),
            },
          }
        })
      },

      clearRecentFiles: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            recentFiles: [],
          },
        }))
      },

      // Operations
      deleteSelected: async () => {
        const { selectedIds, entries, refresh } = get()
        if (selectedIds.size === 0) return

        try {
          // Delete all selected files/folders
          const selectedEntries = entries.filter((e) => selectedIds.has(e.id))

          for (const entry of selectedEntries) {
            await remove(entry.path, { recursive: entry.isDirectory })
          }

          // Refresh to update the view
          await refresh()
        } catch (error) {
          console.error("[FileBrowser] Delete failed:", error)
          set({
            error: error instanceof Error ? error.message : "Failed to delete files",
          })
        }
      },

      renameEntry: async (id: string, newName: string) => {
        const { entries, currentPath, refresh } = get()
        const entry = entries.find((e) => e.id === id)
        if (!entry) return

        try {
          const newPath = await join(currentPath, newName)
          await rename(entry.path, newPath)

          // Refresh to update the view
          await refresh()
        } catch (error) {
          console.error("[FileBrowser] Rename failed:", error)
          set({
            error: error instanceof Error ? error.message : "Failed to rename file",
          })
        }
      },

      createFolder: async (name: string) => {
        const { currentPath, refresh } = get()

        try {
          const newFolderPath = await join(currentPath, name)
          await mkdir(newFolderPath, { recursive: false })

          // Refresh to show the new folder
          await refresh()
        } catch (error) {
          console.error("[FileBrowser] Create folder failed:", error)
          set({
            error: error instanceof Error ? error.message : "Failed to create folder",
          })
        }
      },
    }),
    {
      name: "cadhy-file-browser",
      partialize: (state) => ({
        settings: state.settings,
        viewMode: state.viewMode,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
        showHiddenFiles: state.showHiddenFiles,
      }),
    }
  )
)

export { useFileBrowserStore }
