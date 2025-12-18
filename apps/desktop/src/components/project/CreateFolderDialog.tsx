/**
 * Create Folder Dialog - CADHY
 *
 * Dialog for creating new project folders with name and color selection.
 */

import type { FolderColorPreset } from "@cadhy/types"
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
} from "@cadhy/ui"
import { useCallback, useState } from "react"

// ============================================================================
// TYPES
// ============================================================================

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateFolder: (name: string, colorPreset: FolderColorPreset) => void
}

// ============================================================================
// COLOR OPTIONS
// ============================================================================

const FOLDER_COLORS: { id: FolderColorPreset; label: string }[] = [
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "orange", label: "Orange" },
  { id: "purple", label: "Purple" },
  { id: "red", label: "Red" },
  { id: "teal", label: "Teal" },
  { id: "yellow", label: "Yellow" },
  { id: "pink", label: "Pink" },
  { id: "gray", label: "Gray" },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreateFolder,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("New Folder")
  const [selectedColor, setSelectedColor] = useState<FolderColorPreset>("blue")
  const [error, setError] = useState<string | null>(null)

  const handleCreate = useCallback(() => {
    if (!folderName.trim()) {
      setError("Please enter a folder name")
      return
    }

    onCreateFolder(folderName.trim(), selectedColor)
    onOpenChange(false)

    // Reset form
    setFolderName("New Folder")
    setSelectedColor("blue")
    setError(null)
  }, [folderName, selectedColor, onCreateFolder, onOpenChange])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
    setError(null)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
          <DialogDescription>Create a new folder to organize your projects.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Folder Name */}
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name..."
              autoFocus
            />
          </div>

          {/* Color Selection */}
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.id)}
                  className={cn(
                    "size-8 rounded-lg transition-all",
                    "hover:scale-110 hover:shadow-md",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    selectedColor === color.id && "ring-2 ring-primary ring-offset-2"
                  )}
                  data-folder-color={color.id}
                  title={color.label}
                >
                  <div className="size-full rounded-lg bg-folder-front" />
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="grid gap-2">
            <Label>Preview</Label>
            <div
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              data-folder-color={selectedColor}
            >
              {/* Mini folder icon */}
              <div className="relative w-10 h-7">
                <div className="absolute w-full h-full bg-folder-back rounded" />
                <div className="absolute w-4 h-1.5 bg-folder-tab rounded-t top-[-4px] left-1" />
                <div className="absolute w-full h-full bg-folder-front rounded translate-y-0.5" />
              </div>
              <span className="text-sm font-medium">{folderName || "Folder Name"}</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Folder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateFolderDialog
