/**
 * Open Project Dialog - CADHY
 *
 * Dialog for opening existing projects, showing recent projects
 * and allowing browse for project files. Follows the consistent
 * dialog pattern used across the application.
 */

import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from "@cadhy/ui"
import {
  AlertCircleIcon,
  Clock01Icon,
  Delete02Icon,
  File01Icon,
  FolderOpenIcon,
  Loading01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { openProjectDialog } from "@/services/project-service"
import { useNavigationStore } from "@/stores/navigation-store"
import { type RecentProject, useProjectStore, useRecentProjects } from "@/stores/project-store"

// ============================================================================
// TYPES
// ============================================================================

interface OpenProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OpenProjectDialog({ open, onOpenChange }: OpenProjectDialogProps) {
  const { t } = useTranslation()
  const [isOpening, setIsOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recentProjects = useRecentProjects()
  const openExistingProject = useProjectStore((s) => s.openExistingProject)
  const removeRecentProject = useProjectStore((s) => s.removeRecentProject)
  const clearRecentProjects = useProjectStore((s) => s.clearRecentProjects)
  const isLoading = useProjectStore((s) => s.isLoading)
  const { setView } = useNavigationStore()

  // Handle open project from path
  const handleOpenProject = useCallback(
    (path: string) => {
      setIsOpening(true)
      setError(null)

      // Close dialog and navigate to modeller first so user sees loading state
      onOpenChange(false)
      useProjectStore.getState().setLoading(true)
      setView("modeller")

      // Then open the project asynchronously
      openExistingProject(path)
        .catch((err) => {
          setError(err instanceof Error ? err.message : t("openProject.errorFailed"))
          // Navigate back to projects on error
          setView("projects")
        })
        .finally(() => {
          setIsOpening(false)
        })
    },
    [openExistingProject, setView, onOpenChange, t]
  )

  // Handle browse for project file
  const handleBrowse = useCallback(async () => {
    const path = await openProjectDialog()
    if (path) {
      await handleOpenProject(path)
    }
  }, [handleOpenProject])

  // Handle open recent project
  const handleOpenRecent = useCallback(
    (project: RecentProject) => {
      handleOpenProject(project.path)
    },
    [handleOpenProject]
  )

  // Handle remove recent project
  const handleRemoveRecent = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      removeRecentProject(id)
    },
    [removeRecentProject]
  )

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return t("openProject.today")
    if (days === 1) return t("openProject.yesterday")
    if (days < 7) return t("openProject.daysAgo", { count: days })
    return date.toLocaleDateString()
  }

  const isBusy = isOpening || isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="w-[95vw] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-2xl bg-primary/10">
              <HugeiconsIcon icon={FolderOpenIcon} className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{t("openProject.title")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("openProject.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Browse Button */}
          <button
            type="button"
            onClick={handleBrowse}
            disabled={isBusy}
            className={cn(
              "flex items-center gap-3 p-3 rounded-2xl text-left w-full",
              "bg-muted/40 hover:bg-muted/60 transition-colors border border-border/50",
              "group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-center size-8 rounded-2xl bg-background border border-border/50 shrink-0 group-hover:border-primary/50 transition-colors">
              {isBusy ? (
                <HugeiconsIcon icon={Loading01Icon} className="size-4 animate-spin text-primary" />
              ) : (
                <HugeiconsIcon icon={FolderOpenIcon} className="size-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{t("openProject.browse")}</span>
              <p className="text-xs text-muted-foreground">{t("openProject.browseDesc")}</p>
            </div>
          </button>

          {/* Recent Projects Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                {t("openProject.recentProjects")}
              </h3>
              {recentProjects.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-0.5 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                  onClick={clearRecentProjects}
                >
                  {t("openProject.clearAll")}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[180px] rounded-2xl border border-border/50">
              {recentProjects.length > 0 ? (
                <div className="p-1.5 space-y-0.5">
                  {recentProjects.map((project) => (
                    <RecentProjectRow
                      key={project.id}
                      project={project}
                      disabled={isBusy}
                      formatDate={formatDate}
                      onOpen={handleOpenRecent}
                      onRemove={handleRemoveRecent}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-6 text-center">
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    className="size-8 text-muted-foreground/50 mb-2"
                  />
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("openProject.noRecent")}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {t("openProject.noRecentDesc")}
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-2">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="size-4 text-destructive shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-destructive">
                  {t("openProject.errorTitle")}
                </p>
                <p className="text-xs text-destructive/80">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/50 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isBusy}>
            {t("common.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function RecentProjectRow({
  project,
  disabled,
  formatDate,
  onOpen,
  onRemove,
}: {
  project: RecentProject
  disabled: boolean
  formatDate: (date: string) => string
  onOpen: (project: RecentProject) => void
  onRemove: (e: React.MouseEvent, id: string) => void
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onOpen(project)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onOpen(project)
        }
      }}
      className={cn(
        "flex items-center gap-2.5 p-2 rounded-2xl text-left w-full",
        "hover:bg-muted/50 transition-colors",
        "group cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Icon */}
      <div className="flex items-center justify-center size-7 rounded-2xl bg-muted shrink-0">
        <HugeiconsIcon icon={File01Icon} className="size-3.5 text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{project.name}</span>
          <span className="text-xs text-muted-foreground/70 shrink-0">
            {formatDate(project.lastOpened)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground/70 truncate">{project.path}</p>
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={(e) => onRemove(e, project.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded-2xl shrink-0"
        title="Remove from recent"
      >
        <HugeiconsIcon
          icon={Delete02Icon}
          className="size-3.5 text-muted-foreground hover:text-destructive"
        />
      </button>
    </div>
  )
}

export default OpenProjectDialog
