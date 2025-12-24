/**
 * New Project Dialog - CADHY
 *
 * Dialog for creating new projects with template selection,
 * name input, location selection, and optional folder assignment.
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
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cadhy/ui"
import {
  CheckmarkSquare01Icon,
  File01Icon,
  FolderOpenIcon,
  NeuralNetworkIcon,
  PipelineIcon,
  WaveIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo, useState } from "react"
import {
  openDirectoryDialog,
  PROJECT_TEMPLATES,
  type TemplateInfo,
} from "@/services/project-service"
import { useNavigationStore } from "@/stores/navigation-store"
import { type ProjectTemplate, useProjectStore } from "@/stores/project-store"
import { useFolders, useRecentProjectsStore } from "@/stores/recent-projects-store"

// ============================================================================
// TYPES
// ============================================================================

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ============================================================================
// TEMPLATE ICONS
// ============================================================================

const templateIcons: Record<string, typeof File01Icon> = {
  file: File01Icon,
  wave: WaveIcon,
  pipe: PipelineIcon,
  network: NeuralNetworkIcon,
}

// ============================================================================
// FOLDER COLOR MAP
// ============================================================================

const folderColorMap: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  orange: "bg-orange-500",
  cyan: "bg-cyan-500",
}

// ============================================================================
// COMPONENT
// ============================================================================

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState("New Project")
  const [projectPath, setProjectPath] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate>("empty")
  const [selectedFolderId, setSelectedFolderId] = useState<string>("none")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createNewProject = useProjectStore((s) => s.createNewProject)
  const isLoading = useProjectStore((s) => s.isLoading)
  const { setView } = useNavigationStore()

  // Folders for assignment
  const folders = useFolders()
  const addProject = useRecentProjectsStore((s) => s.addProject)
  const assignProjectToFolder = useRecentProjectsStore((s) => s.assignProjectToFolder)
  const canAddToFolder = useRecentProjectsStore((s) => s.canAddToFolder)

  // Check if selected folder can accept more projects
  const canAssignToSelectedFolder = useMemo(() => {
    if (selectedFolderId === "none") return true
    return canAddToFolder(selectedFolderId)
  }, [selectedFolderId, canAddToFolder])

  // Handle browse for location
  const handleBrowse = useCallback(async () => {
    const path = await openDirectoryDialog()
    if (path) {
      setProjectPath(path)
    }
  }, [])

  // Handle create project
  const handleCreate = useCallback(async () => {
    if (!projectName.trim()) {
      setError("Please enter a project name")
      return
    }

    if (!projectPath.trim()) {
      setError("Please select a project location")
      return
    }

    if (selectedFolderId !== "none" && !canAssignToSelectedFolder) {
      setError("Selected folder is full. Please choose another folder or leave unassigned.")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const projectInfo = await createNewProject(projectName.trim(), projectPath, selectedTemplate)

      // Add to recent projects store with folder assignment
      const actualFolderId = selectedFolderId === "none" ? undefined : selectedFolderId
      addProject({
        id: projectInfo.id,
        name: projectInfo.name,
        path: projectInfo.path,
        folderId: actualFolderId,
      })

      // If folder is selected, explicitly assign (redundant but ensures consistency)
      if (actualFolderId) {
        assignProjectToFolder(projectInfo.id, actualFolderId)
      }

      onOpenChange(false)
      setView("modeller") // Navigate to modeller view after creation

      // Reset form
      setProjectName("New Project")
      setProjectPath("")
      setSelectedTemplate("empty")
      setSelectedFolderId("none")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
    } finally {
      setIsCreating(false)
    }
  }, [
    projectName,
    projectPath,
    selectedTemplate,
    selectedFolderId,
    canAssignToSelectedFolder,
    createNewProject,
    addProject,
    assignProjectToFolder,
    setView,
    onOpenChange,
  ])

  // Handle cancel
  const handleCancel = useCallback(() => {
    onOpenChange(false)
    setError(null)
  }, [onOpenChange])

  const isBusy = isCreating || isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Create a new CADHY project. Select a template and choose where to save your project.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3">
          {/* Project Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="project-name" className="text-xs">
              Project Name
            </Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="h-9"
            />
          </div>

          {/* Project Location */}
          <div className="grid gap-1.5">
            <Label className="text-xs">Location</Label>
            <div className="flex gap-2">
              <Input
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="Select project location..."
                className="flex-1 h-9"
                readOnly
              />
              <Button variant="outline" onClick={handleBrowse} size="sm" className="h-9">
                <HugeiconsIcon icon={FolderOpenIcon} className="size-4 mr-1.5" />
                Browse
              </Button>
            </div>
          </div>

          {/* Folder Assignment (optional) */}
          {folders.length > 0 && (
            <div className="grid gap-1.5">
              <Label className="text-xs">
                Assign to Folder <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="No folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-2xl bg-muted" />
                      <span>No folder</span>
                    </div>
                  </SelectItem>
                  {folders.map((folder) => {
                    const canAdd = canAddToFolder(folder.id)
                    return (
                      <SelectItem key={folder.id} value={folder.id} disabled={!canAdd}>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "size-3 rounded-2xl",
                              folderColorMap[folder.colorPreset] || "bg-blue-500"
                            )}
                          />
                          <span>{folder.name}</span>
                          {!canAdd && <span className="text-xs text-muted-foreground">(full)</span>}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Organize your project in a folder for easy access later.
              </p>
            </div>
          )}

          {/* Template Selection */}
          <div className="grid gap-1.5">
            <Label className="text-xs">Template</Label>
            <ScrollArea className="h-[160px] rounded-2xl border p-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                {PROJECT_TEMPLATES.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate === template.id}
                    onSelect={() => setSelectedTemplate(template.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isBusy}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={isBusy}>
            {isBusy ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

interface TemplateCardProps {
  template: TemplateInfo
  isSelected: boolean
  onSelect: () => void
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  const Icon = templateIcons[template.icon] || File01Icon

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-start gap-1.5 rounded-2xl border p-2 text-left transition-all hover:bg-accent/50",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5">
          <HugeiconsIcon icon={CheckmarkSquare01Icon} className="size-3.5 text-primary" />
        </div>
      )}

      {/* Icon */}
      <div className="flex size-7 items-center justify-center rounded-2xl bg-muted">
        <HugeiconsIcon icon={Icon} className="size-4 text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="space-y-0.5">
        <h4 className="text-xs font-medium leading-none">{template.name}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
      </div>
    </button>
  )
}

export default NewProjectDialog
