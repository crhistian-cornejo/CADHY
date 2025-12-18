/**
 * Project Card Component - CADHY
 *
 * Displays a project with thumbnail, info, and actions.
 * Supports grid and list view modes.
 */

import type { ProjectFolder, RecentProject } from "@cadhy/types"
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@cadhy/ui"
import {
  Add01Icon,
  Clock01Icon,
  Delete02Icon,
  File01Icon,
  FolderAddIcon,
  FolderRemoveIcon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { memo } from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectCardProps {
  project: RecentProject
  viewMode: "grid" | "list"
  isSelected?: boolean
  isFlying?: boolean
  folders: ProjectFolder[]
  onSelect?: (id: string) => void
  onDoubleClick?: (project: RecentProject) => void
  onOpen?: (project: RecentProject) => void
  onRemove?: (id: string) => void
  onMoveToFolder?: (projectId: string, folderId: string) => void
  onRemoveFromFolder?: (projectId: string) => void
  onCreateNewFolder?: (projectId: string) => void
  canAddToFolder?: (folderId: string) => boolean
  /** Always show remove from folder option (when viewing inside a folder) */
  showRemoveFromFolder?: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
  }
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return "Just now"
}

function truncatePath(path: string, maxLength = 40): string {
  if (path.length <= maxLength) return path
  const parts = path.split("/")
  if (parts.length <= 3) return path
  return `.../${parts.slice(-2).join("/")}`
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ProjectCard = memo(function ProjectCard({
  project,
  viewMode,
  isSelected = false,
  isFlying = false,
  folders,
  onSelect,
  onDoubleClick,
  onOpen,
  onRemove,
  onMoveToFolder,
  onRemoveFromFolder,
  onCreateNewFolder,
  canAddToFolder,
  showRemoveFromFolder = false,
}: ProjectCardProps) {
  const handleClick = () => onSelect?.(project.id)
  const handleDoubleClick = () => onDoubleClick?.(project)

  const isInFolder = !!project.folderId || showRemoveFromFolder

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "group relative rounded-xl cursor-pointer transition-all duration-200",
        "border border-foreground/[0.06] hover:border-foreground/[0.12]",
        "bg-card hover:shadow-sm hover:-translate-y-0.5",
        isSelected && "ring-1 ring-primary/40 border-primary/20",
        viewMode === "grid" ? "flex flex-col p-4" : "flex items-center gap-4 p-3",
        isFlying && "animate-fly-to-folder pointer-events-none"
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-muted flex items-center justify-center",
          viewMode === "grid" ? "aspect-video w-full mb-3" : "size-14 shrink-0"
        )}
      >
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.name} className="h-full w-full object-cover" />
        ) : (
          <HugeiconsIcon
            icon={File01Icon}
            className={cn("text-muted-foreground", viewMode === "grid" ? "size-10" : "size-6")}
          />
        )}

        {/* Dirty indicator */}
        {project.isDirty && (
          <div className="absolute top-2 right-2">
            <div className="size-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className={cn("flex-1 min-w-0", viewMode === "grid" ? "" : "flex flex-col")}>
        <h3 className="text-sm font-medium truncate">{project.name}</h3>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {truncatePath(project.path)}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          <HugeiconsIcon icon={Clock01Icon} className="size-3" />
          <span>{formatRelativeTime(project.lastOpened)}</span>
          {project.openCount > 1 && (
            <span className="text-muted-foreground/60">({project.openCount} opens)</span>
          )}
        </div>
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(
                "absolute opacity-0 group-hover:opacity-100 transition-opacity",
                viewMode === "grid" ? "top-2 right-2" : "right-2"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <HugeiconsIcon icon={MoreVerticalIcon} className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onOpen?.(project)}>Open Project</DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Move to Folder */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <HugeiconsIcon icon={FolderAddIcon} className="size-4" />
              Move to Folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  disabled={canAddToFolder ? !canAddToFolder(folder.id) : false}
                  onClick={() => onMoveToFolder?.(project.id, folder.id)}
                >
                  <div
                    className="size-3 rounded-sm bg-folder-front"
                    data-folder-color={folder.colorPreset}
                  />
                  {folder.name}
                </DropdownMenuItem>
              ))}
              {folders.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => onCreateNewFolder?.(project.id)}>
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
                Create New Folder
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Remove from Folder */}
          {isInFolder && (
            <DropdownMenuItem onClick={() => onRemoveFromFolder?.(project.id)}>
              <HugeiconsIcon icon={FolderRemoveIcon} className="size-4" />
              Remove from Folder
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onRemove?.(project.id)}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            Remove from Recent
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

export default ProjectCard
