/**
 * Animated 3D Folder Component - CADHY
 *
 * A 3D folder that expands on hover to show project thumbnails.
 * Based on GraphCAD's implementation.
 */

import type { FolderColorPreset } from "@cadhy/types"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  cn,
} from "@cadhy/ui"
import { Delete01Icon, Edit01Icon, PaintBrushIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { forwardRef, memo, useState } from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface FolderProject {
  id: string
  name: string
  thumbnail?: string
}

export interface AnimatedFolderProps {
  title: string
  projects: FolderProject[]
  colorPreset?: FolderColorPreset | "custom"
  customColors?: { back: string; front: string; tab: string }
  className?: string
  onProjectOpen?: (project: FolderProject) => void
  onFolderClick?: () => void
  onEditFolder?: () => void
  onDeleteFolder?: () => void
}

// ============================================================================
// FOLDER CARD (individual project preview)
// ============================================================================

interface FolderCardProps {
  project: FolderProject
  index: number
  isVisible: boolean
  onClick: () => void
}

const FolderCard = forwardRef<HTMLDivElement, FolderCardProps>(
  ({ project, index, isVisible, onClick }, ref) => {
    // Fan out positions
    const rotations = [-12, 0, 12]
    const translations = [-50, 0, 50]
    const rotation = rotations[index] ?? 0
    const translation = translations[index] ?? 0

    return (
      <div
        ref={ref}
        className={cn(
          "absolute w-16 h-24 rounded-lg overflow-hidden shadow-xl cursor-pointer",
          "bg-card border border-border/20 transition-all duration-500",
          "hover:ring-2 hover:ring-primary/50"
        )}
        style={{
          transform: isVisible
            ? `translateY(-80px) translateX(${translation}px) rotate(${rotation}deg) scale(1)`
            : "translateY(0px) scale(0.5)",
          opacity: isVisible ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          transitionDelay: `${index * 60}ms`,
          zIndex: 20 - index,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-2xl text-muted-foreground">
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
          <p className="text-[9px] text-white truncate font-medium">{project.name}</p>
        </div>
      </div>
    )
  }
)

FolderCard.displayName = "FolderCard"

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AnimatedFolder = memo(function AnimatedFolder({
  title,
  projects,
  colorPreset = "blue",
  customColors,
  className,
  onProjectOpen,
  onFolderClick,
  onEditFolder,
  onDeleteFolder,
}: AnimatedFolderProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Only show up to 3 projects in the preview
  const displayProjects = projects.slice(0, 3)

  const handleProjectClick = (project: FolderProject) => {
    onProjectOpen?.(project)
  }

  const colorStyle = customColors
    ? {
        "--folder-back": customColors.back,
        "--folder-front": customColors.front,
        "--folder-tab": customColors.tab,
      }
    : undefined

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "relative flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer",
            "bg-card border border-border/40 hover:border-border/60 transition-all duration-300",
            "hover:shadow-lg group",
            isHovered && "z-50", // Ensure folder is on top when hovered
            className
          )}
          style={{
            perspective: "1000px",
            minWidth: "180px",
            minHeight: "200px",
            ...colorStyle,
          }}
          data-folder-color={colorPreset !== "custom" ? colorPreset : undefined}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onFolderClick}
        >
          {/* Folder structure container */}
          <div className="relative w-32 h-24 flex items-center justify-center">
            {/* Back layer */}
            <div
              className="absolute w-full h-full bg-folder-back rounded-lg shadow-md"
              style={{
                transform: isHovered ? "rotateX(-15deg)" : "rotateX(0deg)",
                transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                transformOrigin: "bottom center",
                zIndex: 10,
              }}
            />

            {/* Tab */}
            <div
              className="absolute w-12 h-4 bg-folder-tab rounded-t-md"
              style={{
                top: "-10px",
                left: "10px",
                transform: isHovered ? "rotateX(-25deg) translateY(-2px)" : "rotateX(0deg)",
                transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                transformOrigin: "bottom center",
                zIndex: 10,
              }}
            />

            {/* Project cards that fan out */}
            {displayProjects.map((project, index) => (
              <FolderCard
                key={project.id}
                project={project}
                index={index}
                isVisible={isHovered}
                onClick={() => handleProjectClick(project)}
              />
            ))}

            {/* Front layer */}
            <div
              className="absolute w-full h-full bg-folder-front rounded-lg shadow-lg"
              style={{
                transform: isHovered ? "rotateX(25deg) translateY(8px)" : "rotateX(0deg)",
                transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                transformOrigin: "top center",
                zIndex: 30,
              }}
            />
          </div>

          {/* Folder info */}
          <div className="mt-4 text-center z-40">
            <h3 className="text-sm font-medium truncate max-w-[160px]">{title}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>

          {/* Hover hint */}
          {!isHovered && projects.length > 0 && (
            <div className="absolute bottom-1.5 left-0 right-0 text-center">
              <span className="text-[9px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
                Hover to preview
              </span>
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onEditFolder} className="gap-2">
          <HugeiconsIcon icon={Edit01Icon} className="size-4" />
          Rename Folder
        </ContextMenuItem>
        <ContextMenuItem onClick={onEditFolder} className="gap-2">
          <HugeiconsIcon icon={PaintBrushIcon} className="size-4" />
          Change Color
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDeleteFolder}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <HugeiconsIcon icon={Delete01Icon} className="size-4" />
          Delete Folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

export default AnimatedFolder
