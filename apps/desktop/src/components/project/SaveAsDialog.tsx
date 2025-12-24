/**
 * Save As Dialog - CADHY
 *
 * Dialog for saving current project to a new location with a new name.
 * Triggered by Cmd/Ctrl+Shift+S hotkey.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@cadhy/ui"
import { File01Icon, FolderOpenIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { openDirectoryDialog } from "@/services/project-service"
import { useProjectStore } from "@/stores/project-store"

// ============================================================================
// TYPES
// ============================================================================

interface SaveAsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SaveAsDialog({ open, onOpenChange }: SaveAsDialogProps) {
  const { t } = useTranslation()
  const currentProject = useProjectStore((s) => s.currentProject)
  const saveCurrentProjectAs = useProjectStore((s) => s.saveCurrentProjectAs)

  const [projectName, setProjectName] = useState("")
  const [projectPath, setProjectPath] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize with current project name when dialog opens
  useEffect(() => {
    if (open && currentProject) {
      setProjectName(currentProject.name)
      setProjectPath("")
      setError(null)
    }
  }, [open, currentProject])

  // ========== HANDLERS ==========

  const handleSelectLocation = useCallback(async () => {
    try {
      const path = await openDirectoryDialog("Select Save Location")
      if (path) {
        setProjectPath(path)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open directory dialog")
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!projectName.trim()) {
      setError(t("project.errors.nameRequired", "Project name is required"))
      return
    }

    if (!projectPath) {
      setError(t("project.errors.pathRequired", "Project location is required"))
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await saveCurrentProjectAs(projectPath, projectName.trim())
      toast({
        title: t("project.saveAs.success", "Project saved"),
        description: t("project.saveAs.successDesc", "Project saved to {{path}}", {
          path: projectPath,
        }),
        variant: "default",
      })
      onOpenChange(false)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save project"
      setError(errorMsg)
      toast({
        title: t("project.saveAs.error", "Save failed"),
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [projectName, projectPath, saveCurrentProjectAs, t, onOpenChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isSaving) {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave, isSaving]
  )

  // ========== RENDER ==========

  if (!currentProject) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" data-slot="save-as-dialog">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-2xl bg-primary/10">
              <HugeiconsIcon icon={File01Icon} className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{t("project.saveAs.title", "Save Project As")}</DialogTitle>
              <DialogDescription>
                {t("project.saveAs.description", "Save a copy of your project to a new location")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">{t("project.saveAs.projectName", "Project Name")}</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("project.saveAs.namePlaceholder", "Enter project name")}
              disabled={isSaving}
              autoFocus
            />
          </div>

          {/* Project Location */}
          <div className="space-y-2">
            <Label htmlFor="project-path">{t("project.saveAs.location", "Save Location")}</Label>
            <div className="flex gap-2">
              <Input
                id="project-path"
                value={projectPath}
                readOnly
                placeholder={t("project.saveAs.selectLocation", "Select a location...")}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleSelectLocation}
                disabled={isSaving}
                className="shrink-0"
              >
                <HugeiconsIcon icon={FolderOpenIcon} className="size-4 mr-2" />
                {t("common.browse", "Browse")}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {/* Current Project Info */}
          <div className="text-xs text-muted-foreground">
            {t("project.saveAs.currentProject", "Current project")}: {currentProject.name}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !projectName.trim() || !projectPath}>
            {isSaving
              ? t("project.saveAs.saving", "Saving...")
              : t("project.saveAs.save", "Save As")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
