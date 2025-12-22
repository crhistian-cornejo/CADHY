/**
 * Project Service - CADHY
 *
 * Handles project operations via Tauri IPC and native dialogs.
 *
 * Project Format v2: Folder-based .cadhy packages
 * Structure:
 *   ProjectName.cadhy/
 *   ├── manifest.json      # Metadata
 *   ├── project.json       # Scene and settings
 *   ├── .chat/             # Chat sessions
 *   └── thumbnails/        # Previews
 */

import { invoke } from "@tauri-apps/api/core"
import { open, save } from "@tauri-apps/plugin-dialog"
import { platform } from "@tauri-apps/plugin-os"
import type { SceneData } from "@/stores/modeller"

// ============================================================================
// TYPES (matching Rust structs)
// ============================================================================

export type ProjectTemplate = "empty" | "channel" | "pipe-network" | "open-channel"

/** Unit settings for project */
export interface UnitSettings {
  length: string
  angle: string
}

/** Project settings */
export interface ProjectSettings {
  units: UnitSettings
  precision: number
  theme: string
  autoSave: boolean
  autoSaveInterval: number
}

/** Basic project info (lightweight, returned by most operations) */
export interface ProjectInfo {
  id: string
  name: string
  path: string // Now points to .cadhy folder (v2) or file (v1 legacy)
  createdAt: string
  updatedAt: string
  isDirty: boolean
}

/** Full project data returned when opening a project */
export interface ProjectFullData {
  info: ProjectInfo
  settings: ProjectSettings
  scene: SceneData
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PROJECT_EXTENSION = "cadhy"
const PROJECT_FILTER = {
  name: "CADHY Project",
  extensions: [PROJECT_EXTENSION],
}

// ============================================================================
// NATIVE DIALOG OPERATIONS
// ============================================================================

/**
 * Opens a native dialog to select a project folder or file.
 * On macOS, .cadhy folders appear as single files (document packages).
 * On Windows/Linux, uses directory selection for folder-based projects.
 */
export async function openProjectDialog(): Promise<string | null> {
  const os = await platform()

  if (os === "macos") {
    // macOS: .cadhy folders appear as files due to UTType declaration
    const selected = await open({
      multiple: false,
      filters: [PROJECT_FILTER],
      title: "Open CADHY Project",
    })
    return selected as string | null
  }

  // Windows/Linux: Allow both directory and file selection
  // Try directory first (for v2 folder projects)
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open CADHY Project Folder",
  })

  // Validate it's a .cadhy folder
  if (selected && typeof selected === "string") {
    if (selected.endsWith(".cadhy")) {
      return selected
    }
    // Check if it contains a .cadhy subfolder
    // This is handled on backend
  }

  // Fallback: try file dialog for legacy .cadhy files
  const legacyFile = await open({
    multiple: false,
    filters: [PROJECT_FILTER],
    title: "Open CADHY Project (Legacy)",
  })

  return legacyFile as string | null
}

/**
 * Opens a native file dialog to select a directory for new project location
 */
export async function openDirectoryDialog(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select Project Location",
  })

  return selected as string | null
}

/**
 * Opens a native save dialog for Save As operation.
 * Returns the path where the new .cadhy folder should be created.
 */
export async function saveProjectDialog(defaultName?: string): Promise<string | null> {
  const os = await platform()

  if (os === "macos") {
    // macOS: Use save dialog, it will create a folder that appears as file
    const path = await save({
      filters: [PROJECT_FILTER],
      title: "Save CADHY Project",
      defaultPath: defaultName ? `${defaultName}.${PROJECT_EXTENSION}` : undefined,
    })
    return path
  }

  // Windows/Linux: Select directory, then append project name
  const directory = await open({
    directory: true,
    multiple: false,
    title: "Select Location for New Project",
  })

  if (!directory) return null

  // Return the full path including the .cadhy folder name
  const projectName = defaultName || "Untitled"
  return `${directory}/${projectName}.${PROJECT_EXTENSION}`
}

// ============================================================================
// PROJECT OPERATIONS (Tauri IPC)
// ============================================================================

export interface CreateProjectParams {
  name: string
  path: string
  template: ProjectTemplate
  settings?: ProjectSettings
}

/**
 * Creates a new project and returns project info
 */
export async function createProject(params: CreateProjectParams): Promise<ProjectInfo> {
  const project = await invoke<ProjectInfo>("create_project", {
    name: params.name,
    path: params.path,
    template: params.template,
    settings: params.settings,
  })

  return project
}

/**
 * Opens an existing project from path and returns full data (info + scene)
 */
export async function openProject(path: string): Promise<ProjectFullData> {
  const projectData = await invoke<ProjectFullData>("open_project", { path })
  return projectData
}

/**
 * Saves scene data to existing project file
 */
export async function saveProject(path: string, scene: SceneData): Promise<ProjectInfo> {
  const info = await invoke<ProjectInfo>("save_project", { path, scene })
  return info
}

/**
 * Saves project to a new location (Save As)
 */
export async function saveProjectAs(
  oldPath: string,
  newPath: string,
  newName: string,
  scene: SceneData
): Promise<ProjectInfo> {
  const info = await invoke<ProjectInfo>("save_project_as", {
    oldPath,
    newPath,
    newName,
    scene,
  })
  return info
}

/**
 * Updates project settings
 */
export async function updateProjectSettings(
  path: string,
  settings: ProjectSettings
): Promise<void> {
  await invoke("update_project_settings", { path, settings })
}

/**
 * Gets the default projects directory
 */
export async function getDefaultProjectsDir(): Promise<string> {
  try {
    const dir = await invoke<string>("get_default_projects_dir")
    return dir
  } catch {
    // Fallback to home directory
    return "~/Documents/CADHY Projects"
  }
}

/**
 * Checks if a project file exists at the given path
 */
export async function projectExists(path: string): Promise<boolean> {
  return await invoke<boolean>("project_exists", { path })
}

// ============================================================================
// TEMPLATE INFO
// ============================================================================

export interface TemplateInfo {
  id: ProjectTemplate
  name: string
  description: string
  icon: string
}

export const PROJECT_TEMPLATES: TemplateInfo[] = [
  {
    id: "empty",
    name: "Empty Project",
    description: "Start with a blank canvas",
    icon: "file",
  },
  {
    id: "channel",
    name: "Open Channel",
    description: "Basic open channel flow analysis",
    icon: "wave",
  },
  {
    id: "pipe-network",
    name: "Pipe Network",
    description: "Pressurized pipe system analysis",
    icon: "pipe",
  },
  {
    id: "open-channel",
    name: "Channel Network",
    description: "Open channel network with multiple reaches",
    icon: "network",
  },
]
