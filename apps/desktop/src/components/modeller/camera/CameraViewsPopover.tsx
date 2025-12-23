/**
 * Camera Views Popover - CADHY
 *
 * Popover for managing saved camera views:
 * - Save current camera view
 * - Load saved views
 * - Delete saved views
 * - Rename saved views
 */

import {
  Button,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from "@cadhy/ui"
import {
  Camera01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  TickDouble02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { type SavedCameraView, useModellerStore, useSavedCameraViews } from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface CameraViewsPopoverProps {
  className?: string
}

interface EditingState {
  id: string | null
  name: string
}

// ============================================================================
// SAVED VIEW ITEM
// ============================================================================

interface SavedViewItemProps {
  view: SavedCameraView
  isEditing: boolean
  editName: string
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onStartEdit: (id: string, name: string) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string, name: string) => void
  onEditNameChange: (name: string) => void
}

function SavedViewItem({
  view,
  isEditing,
  editName,
  onLoad,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditNameChange,
}: SavedViewItemProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-2xl p-2 hover:bg-accent/50 transition-colors",
        isEditing && "bg-accent/50"
      )}
    >
      {isEditing ? (
        <>
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSaveEdit(view.id, editName)
              } else if (e.key === "Escape") {
                onCancelEdit()
              }
            }}
            className="h-7 text-xs flex-1"
            autoFocus
          />
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={() => onSaveEdit(view.id, editName)}
                  >
                    <HugeiconsIcon icon={TickDouble02Icon} className="size-3" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">{t("common.save", "Save")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={onCancelEdit}>
                    <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">{t("common.cancel", "Cancel")}</TooltipContent>
            </Tooltip>
          </div>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start h-7 px-2 text-xs font-normal"
            onClick={() => onLoad(view.id)}
          >
            <HugeiconsIcon icon={Camera01Icon} className="mr-2 size-3" />
            {view.name}
          </Button>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartEdit(view.id, view.name)
                    }}
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} className="size-3" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">{t("common.rename", "Rename")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(view.id)
                    }}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">{t("common.delete", "Delete")}</TooltipContent>
            </Tooltip>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CameraViewsPopover({ className }: CameraViewsPopoverProps) {
  const { t } = useTranslation()
  const savedViews = useSavedCameraViews()
  const { saveCameraView, loadCameraView, deleteCameraView, renameCameraView } = useModellerStore()

  const [newViewName, setNewViewName] = useState("")
  const [editing, setEditing] = useState<EditingState>({ id: null, name: "" })

  const handleSaveView = useCallback(() => {
    const name = newViewName.trim()
    if (!name) {
      toast.error(t("camera.enterName", "Please enter a view name"))
      return
    }

    saveCameraView(name)
    setNewViewName("")
    toast.success(t("camera.viewSaved", `View "${name}" saved`))
  }, [newViewName, saveCameraView, t])

  const handleLoadView = useCallback(
    (id: string) => {
      const view = savedViews.find((v) => v.id === id)
      if (view) {
        loadCameraView(id)
        toast.success(t("camera.viewLoaded", `Loaded "${view.name}"`))
      }
    },
    [savedViews, loadCameraView, t]
  )

  const handleDeleteView = useCallback(
    (id: string) => {
      const view = savedViews.find((v) => v.id === id)
      if (view) {
        deleteCameraView(id)
        toast.success(t("camera.viewDeleted", `Deleted "${view.name}"`))
      }
    },
    [savedViews, deleteCameraView, t]
  )

  const handleStartEdit = useCallback((id: string, name: string) => {
    setEditing({ id, name })
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditing({ id: null, name: "" })
  }, [])

  const handleSaveEdit = useCallback(
    (id: string, name: string) => {
      const trimmedName = name.trim()
      if (!trimmedName) {
        toast.error(t("camera.enterName", "Please enter a view name"))
        return
      }

      renameCameraView(id, trimmedName)
      setEditing({ id: null, name: "" })
      toast.success(t("camera.viewRenamed", "View renamed"))
    },
    [renameCameraView, t]
  )

  return (
    <Popover>
      <Tooltip>
        <PopoverTrigger
          render={
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-sm" className={cn("h-7 w-7", className)}>
                  <HugeiconsIcon icon={Camera01Icon} className="size-4" />
                </Button>
              }
            />
          }
        />
        <TooltipContent side="bottom">{t("camera.savedViews", "Saved Views")}</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-64 p-2.5">
        <div className="space-y-2">
          {/* Header */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("camera.savedViews", "Saved Views")}
          </p>

          {/* Save New View */}
          <div className="space-y-1.5">
            <Input
              placeholder={t("camera.enterViewName", "Enter view name...")}
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveView()
                }
              }}
              className="h-7 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleSaveView}
              disabled={!newViewName.trim()}
            >
              <HugeiconsIcon icon={Camera01Icon} className="mr-2 size-3" />
              {t("camera.saveCurrentView", "Save Current View")}
            </Button>
          </div>

          {/* Saved Views List */}
          {savedViews.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="space-y-0.5 max-h-[240px] overflow-y-auto">
                {savedViews.map((view) => (
                  <SavedViewItem
                    key={view.id}
                    view={view}
                    isEditing={editing.id === view.id}
                    editName={editing.name}
                    onLoad={handleLoadView}
                    onDelete={handleDeleteView}
                    onStartEdit={handleStartEdit}
                    onCancelEdit={handleCancelEdit}
                    onSaveEdit={handleSaveEdit}
                    onEditNameChange={(name) => setEditing({ id: editing.id, name })}
                  />
                ))}
              </div>
            </>
          )}

          {/* Empty State */}
          {savedViews.length === 0 && (
            <>
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("camera.noSavedViews", "No saved views yet")}
              </p>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
