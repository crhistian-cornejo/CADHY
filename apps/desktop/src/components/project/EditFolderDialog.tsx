/**
 * Edit Folder Dialog - CADHY
 *
 * Dialog for editing folder name and color.
 */

import type { FolderColorPreset, ProjectFolder } from "@cadhy/types"
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
import { useCallback, useEffect, useState } from "react"

// ============================================================================
// TYPES
// ============================================================================

interface EditFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder: ProjectFolder | null
  onSave: (folderId: string, name: string, colorPreset: FolderColorPreset) => void
  onDelete?: (folderId: string) => void
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

export function EditFolderDialog({
  open,
  onOpenChange,
  folder,
  onSave,
  onDelete,
}: EditFolderDialogProps) {
  const [folderName, setFolderName] = useState("")
  const [selectedColor, setSelectedColor] = useState<FolderColorPreset>("blue")
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Sync state when folder changes
  useEffect(() => {
    if (folder) {
      setFolderName(folder.name)
      setSelectedColor(folder.colorPreset)
      setError(null)
      setShowDeleteConfirm(false)
    }
  }, [folder])

  const handleSave = useCallback(() => {
    if (!folder) return

    if (!folderName.trim()) {
      setError("Please enter a folder name")
      return
    }

    onSave(folder.id, folderName.trim(), selectedColor)
    onOpenChange(false)
    setError(null)
  }, [folder, folderName, selectedColor, onSave, onOpenChange])

  const handleDelete = useCallback(() => {
    if (!folder || !onDelete) return
    onDelete(folder.id)
    onOpenChange(false)
    setShowDeleteConfirm(false)
  }, [folder, onDelete, onOpenChange])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
    setError(null)
    setShowDeleteConfirm(false)
  }, [onOpenChange])

  if (!folder) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
          <DialogDescription>Change the folder name or color.</DialogDescription>
        </DialogHeader>

        {showDeleteConfirm ? (
          // Delete confirmation view
          <div className="py-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-2xl">🗑️</span>
              </div>
              <div>
                <h3 className="font-medium mb-1">Delete "{folder.name}"?</h3>
                <p className="text-sm text-muted-foreground">
                  Projects in this folder will be moved to the main view. This action cannot be
                  undone.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Edit form view
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
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {showDeleteConfirm ? (
            <>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete Folder
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditFolderDialog
