/**
 * Rendering Toolbar - CADHY
 *
 * Floating toolbar for rendering and camera tools.
 * Only visible when post-processing is enabled.
 *
 * Contains:
 * - Camera Views (saved camera positions)
 * - Camera Animations (animation panel toggle)
 * - Post-processing quality controls
 */

import {
  Button,
  cn,
  formatKbd,
  Input,
  Kbd,
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
  Image01Icon,
  PencilEdit02Icon,
  PlayIcon,
  TickDouble02Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  type SavedCameraView,
  useModellerStore,
  useSavedCameraViews,
  useViewportSettings,
} from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

export interface RenderingToolbarProps {
  className?: string
  showAnimationPanel?: boolean
  onToggleAnimationPanel?: () => void
}

interface EditingState {
  id: string | null
  name: string
}

// ============================================================================
// CAMERA VIEWS SECTION
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
        "group flex items-center gap-2 rounded-2xl p-1.5 hover:bg-accent/50 transition-colors",
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
            className="h-6 text-xs flex-1"
            autoFocus
          />
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-5 w-5"
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
                  <Button variant="ghost" size="icon-sm" className="h-5 w-5" onClick={onCancelEdit}>
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
            className="flex-1 justify-start h-6 px-1.5 text-xs font-normal"
            onClick={() => onLoad(view.id)}
          >
            <HugeiconsIcon icon={Camera01Icon} className="mr-1.5 size-3" />
            {view.name}
          </Button>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-5 w-5"
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
                    className="h-5 w-5 hover:text-destructive"
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

function CameraViewsSection() {
  const { t } = useTranslation()
  const savedViews = useSavedCameraViews()
  const { saveCameraView, loadCameraView, deleteCameraView, renameCameraView } = useModellerStore()

  const [newViewName, setNewViewName] = useState("")
  const [editing, setEditing] = useState<EditingState>({ id: null, name: "" })
  const [isOpen, setIsOpen] = useState(false)

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
        setIsOpen(false)
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <PopoverTrigger
          render={
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-2xl transition-colors",
                    "text-muted-foreground hover:text-foreground hover:bg-muted",
                    isOpen && "bg-primary/20 text-primary"
                  )}
                >
                  <HugeiconsIcon icon={Camera01Icon} className="size-4" />
                </button>
              }
            />
          }
        />
        <TooltipContent side="left">{t("camera.savedViews", "Camera Views")}</TooltipContent>
      </Tooltip>

      <PopoverContent
        side="left"
        align="start"
        className="w-52 p-2 bg-background/95 backdrop-blur-md border-border/50"
      >
        <div className="space-y-2">
          {/* Header */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("camera.savedViews", "Saved Views")}
          </p>

          {/* Save New View */}
          <div className="space-y-1">
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
              className="w-full h-6 text-xs"
              onClick={handleSaveView}
              disabled={!newViewName.trim()}
            >
              <HugeiconsIcon icon={Camera01Icon} className="mr-1.5 size-3" />
              {t("camera.saveCurrentView", "Save Current View")}
            </Button>
          </div>

          {/* Saved Views List */}
          {savedViews.length > 0 && (
            <>
              <Separator className="bg-border/50" />
              <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
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
              <Separator className="bg-border/50" />
              <p className="text-xs text-muted-foreground text-center py-3">
                {t("camera.noSavedViews", "No saved views yet")}
              </p>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// ============================================================================
// TOOLBAR BUTTON COMPONENT
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut?: string
  active?: boolean
  onClick?: () => void
}

function ToolbarButton({ icon: Icon, label, shortcut, active, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-2xl transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            active && "bg-primary/20 text-primary"
          )}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && <Kbd>{formatKbd(shortcut)}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RenderingToolbar({
  className,
  showAnimationPanel = false,
  onToggleAnimationPanel,
}: RenderingToolbarProps) {
  const { t } = useTranslation()
  const viewportSettings = useViewportSettings()

  // Only show when post-processing is enabled
  if (!viewportSettings.enablePostProcessing) {
    return null
  }

  return (
    <div
      className={cn(
        "absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 p-1.5 rounded-2xl",
        "bg-background/95 dark:bg-toolbar-bg backdrop-blur-md border border-border/50 shadow-xl pointer-events-auto",
        "animate-in fade-in slide-in-from-right-2 duration-300",
        className
      )}
    >
      {/* Rendering Label */}
      <div className="px-1.5 py-1">
        <HugeiconsIcon icon={Image01Icon} className="size-4 text-primary" />
      </div>

      <Separator className="w-6 bg-border/50" />

      {/* Camera Views */}
      <CameraViewsSection />

      {/* Camera Animations */}
      <ToolbarButton
        icon={({ className: iconClass }) => (
          <HugeiconsIcon
            icon={showAnimationPanel ? Video01Icon : PlayIcon}
            className={cn(iconClass, showAnimationPanel && "text-primary")}
          />
        )}
        label={t("animation.title", "Camera Animations")}
        shortcut="⇧A"
        active={showAnimationPanel}
        onClick={onToggleAnimationPanel}
      />
    </div>
  )
}

export default RenderingToolbar
