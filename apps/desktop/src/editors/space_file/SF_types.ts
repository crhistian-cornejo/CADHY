/**
 * @fileoverview Space File Types
 * @module editors/space_file
 */

// ============================================================================
// FILE TYPES
// ============================================================================

export type FileType =
  | "folder"
  | "cad_project" // .cadhy
  | "step" // .step, .stp
  | "iges" // .iges, .igs
  | "brep" // .brep
  | "stl" // .stl
  | "obj" // .obj
  | "gltf" // .gltf, .glb
  | "image" // .png, .jpg
  | "pdf" // .pdf
  | "unknown"

export interface FileEntry {
  id: string
  name: string
  path: string
  type: FileType
  size: number
  modifiedAt: Date
  createdAt: Date
  isDirectory: boolean
  extension?: string
  thumbnailUrl?: string
  metadata?: FileMetadata
}

export interface FileMetadata {
  // CAD-specific metadata
  shapeCount?: number
  volume?: number
  surfaceArea?: number
  boundingBox?: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
  // Image metadata
  dimensions?: { width: number; height: number }
}

// ============================================================================
// BROWSER STATE
// ============================================================================

export type ViewMode = "list" | "grid" | "details"
export type SortField = "name" | "type" | "size" | "modified"
export type SortOrder = "asc" | "desc"

export interface BrowserState {
  currentPath: string
  entries: FileEntry[]
  selectedIds: Set<string>
  viewMode: ViewMode
  sortField: SortField
  sortOrder: SortOrder
  showHiddenFiles: boolean
  filterText: string
  isLoading: boolean
  error?: string
}

export interface Bookmark {
  id: string
  name: string
  path: string
  icon?: string
}

export interface RecentFile {
  path: string
  name: string
  type: FileType
  accessedAt: Date
}

// ============================================================================
// BROWSER SETTINGS
// ============================================================================

export interface FileBrowserSettings {
  defaultViewMode: ViewMode
  defaultSortField: SortField
  defaultSortOrder: SortOrder
  showThumbnails: boolean
  thumbnailSize: "small" | "medium" | "large"
  showFileSizes: boolean
  showModifiedDates: boolean
  autoGeneratePreviews: boolean
  bookmarks: Bookmark[]
  recentFiles: RecentFile[]
  maxRecentFiles: number
}

export const DEFAULT_FILE_BROWSER_SETTINGS: FileBrowserSettings = {
  defaultViewMode: "grid",
  defaultSortField: "name",
  defaultSortOrder: "asc",
  showThumbnails: true,
  thumbnailSize: "medium",
  showFileSizes: true,
  showModifiedDates: true,
  autoGeneratePreviews: true,
  bookmarks: [],
  recentFiles: [],
  maxRecentFiles: 20,
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

export interface FileOperation {
  type: "copy" | "move" | "delete" | "rename"
  sourceIds: string[]
  targetPath?: string
  newName?: string
  status: "pending" | "in_progress" | "completed" | "failed"
  progress?: number
  error?: string
}

// ============================================================================
// HELPERS
// ============================================================================

export function getFileType(filename: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""

  const typeMap: Record<string, FileType> = {
    cadhy: "cad_project",
    step: "step",
    stp: "step",
    iges: "iges",
    igs: "iges",
    brep: "brep",
    stl: "stl",
    obj: "obj",
    gltf: "gltf",
    glb: "gltf",
    png: "image",
    jpg: "image",
    jpeg: "image",
    webp: "image",
    pdf: "pdf",
  }

  return typeMap[ext] ?? "unknown"
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"

  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

export function isCADFile(type: FileType): boolean {
  return ["cad_project", "step", "iges", "brep", "stl", "obj", "gltf"].includes(type)
}
