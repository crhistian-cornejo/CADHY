// Project types - Project, Settings

import type { Shape } from "./cad"
import type { Channel, WaterProfile } from "./hydraulics"

export interface ProjectMetadata {
  name: string
  description?: string
  author?: string
  createdAt: string
  updatedAt: string
  version: string
}

export interface ProjectSettings {
  units: {
    length: "m" | "ft" | "mm" | "in"
    angle: "deg" | "rad"
  }
  precision: number
  theme: "light" | "dark" | "system"
  autoSave: boolean
  autoSaveInterval: number // seconds
}

export interface Project {
  id: string
  metadata: ProjectMetadata
  settings: ProjectSettings
  shapes: Shape[]
  channels: Channel[]
  profiles: WaterProfile[]
}

// ============================================================================
// PROJECT FILE FORMAT (.cadhy)
// ============================================================================

export interface CadhyProjectFile {
  formatVersion: number
  appVersion: string
  id: string
  name: string
  description?: string
  author?: string
  createdAt: string
  updatedAt: string
  settings: ProjectSettings

  // Scene data
  scene: {
    objects: unknown[] // AnySceneObject[] - stored as JSON
    layers: unknown[] // Layer[] - stored as JSON
    viewportSettings?: unknown
    gridSettings?: unknown
    cameraPosition?: { x: number; y: number; z: number }
    cameraTarget?: { x: number; y: number; z: number }
  }

  // Analysis results (optional)
  results?: {
    profiles?: WaterProfile[]
    calculations?: unknown[]
  }
}

export const CADHY_FORMAT_VERSION = 1
export const CADHY_FILE_EXTENSION = "cadhy"

// ============================================================================
// FOLDER SYSTEM
// ============================================================================

export type FolderColorPreset =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "red"
  | "teal"
  | "yellow"
  | "pink"
  | "gray"

export interface FolderCustomColors {
  back: string
  front: string
  tab: string
}

export interface ProjectFolder {
  id: string
  name: string
  description?: string
  colorPreset: FolderColorPreset | "custom"
  customColors?: FolderCustomColors
  createdAt: number
  modifiedAt: number
  sortOrder: number
  isCollapsed?: boolean
}

export const MAX_PROJECTS_PER_FOLDER = 10

// ============================================================================
// RECENT PROJECTS
// ============================================================================

export interface RecentProject {
  id: string
  name: string
  path: string
  lastOpened: number
  openCount: number
  lastSaved?: number
  description?: string
  author?: string
  appVersion?: string
  thumbnail?: string
  isDirty?: boolean
  folderId?: string
  weeklyStats?: {
    opens: number[]
    saves: number[]
    dates: string[]
    weekStart: string
  }
}
