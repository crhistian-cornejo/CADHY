import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  type CubeIcon,
  Delete01Icon,
  GridIcon,
  Layers01Icon,
  MoreHorizontalIcon,
  Search01Icon,
  Settings01Icon,
  CubeIcon as SolidIcon,
  SquareIcon,
  Target01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { getPlatformSync } from "@/hooks/use-platform"
import {
  type SelectionMode,
  type TransformMode,
  useModellerStore,
  useSelectedObjects,
  useSelectionMode,
  useViewportSettings,
} from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface ViewportBottomToolbarProps {
  className?: string
  onOpenSearch?: () => void
  onToggleSettings?: () => void
  onFocusSelected?: () => void
  onTakeScreenshot?: () => void
}

// ============================================================================
// TOOL BUTTON
// ============================================================================

interface ToolButtonProps {
  icon: typeof CubeIcon
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick: (e: React.MouseEvent) => void
  variant?: "ghost" | "secondary" | "outline" | "default"
}

function ToolButton({
  icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
  variant = "ghost",
}: ToolButtonProps) {
  const isMac = getPlatformSync() === "macos"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon-sm"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "h-8 w-8 rounded-md transition-all duration-200",
            active && "bg-primary/20 text-primary ring-1 ring-primary/40 shadow-sm",
            !active && "hover:bg-muted/50"
          )}
        >
          <HugeiconsIcon icon={icon} className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex items-center gap-2">
        <span className="font-medium">{label}</span>
        {shortcut && (
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono opacity-80">
            {shortcut
              .replace("Alt+", isMac ? "\u2325" : "Alt+")
              .replace("Ctrl+", isMac ? "\u2318" : "Ctrl+")}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ViewportBottomToolbar({
  className,
  onOpenSearch,
  onToggleSettings,
  onFocusSelected,
}: ViewportBottomToolbarProps) {
  const { t } = useTranslation()
  const isMac = getPlatformSync() === "macos"
  const selectionMode = useSelectionMode()
  const viewportSettings = useViewportSettings()
  const selectedObjects = useSelectedObjects()

  const {
    setTransformMode,
    setBoxSelectMode,
    setSelectionMode,
    setViewportSettings,
    deleteObject,
  } = useModellerStore()

  // Handlers
  const handleSelectionMode = useCallback(
    (mode: SelectionMode) => {
      setSelectionMode(mode)
    },
    [setSelectionMode]
  )

  const _handleTransformMode = useCallback(
    (mode: TransformMode) => {
      setTransformMode(mode)
      setBoxSelectMode(false)
    },
    [setTransformMode, setBoxSelectMode]
  )

  const handleToggleGrid = useCallback(() => {
    setViewportSettings({ showGrid: !viewportSettings.showGrid })
  }, [setViewportSettings, viewportSettings.showGrid])

  const handleViewMode = useCallback(
    (mode: "solid" | "wireframe" | "xray") => {
      setViewportSettings({ viewMode: mode })
    },
    [setViewportSettings]
  )

  const handleDelete = useCallback(() => {
    selectedObjects.forEach((obj) => {
      deleteObject(obj.id)
    })
  }, [selectedObjects, deleteObject])

  const hasSelection = selectedObjects.length > 0

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 px-3 py-1.5",
        "bg-background/95 dark:bg-toolbar-bg",
        "backdrop-blur-md rounded-full border border-border/40 shadow-[0_8px_32px_rgba(0,0,0,0.15)]",
        className
      )}
    >
      {/* 1. Selection Filters */}
      <div className="flex items-center gap-0.5 rounded-lg bg-muted/20 p-0.5 border border-border/10">
        <ToolButton
          icon={SolidIcon}
          label={t("selection.body", "Body")}
          shortcut="4"
          active={selectionMode === "body"}
          onClick={() => handleSelectionMode("body")}
        />
        <ToolButton
          icon={SquareIcon}
          label={t("selection.face", "Face")}
          shortcut="3"
          active={selectionMode === "face"}
          onClick={() => handleSelectionMode("face")}
        />
        <ToolButton
          icon={Layers01Icon}
          label={t("selection.edge", "Edge")}
          shortcut="2"
          active={selectionMode === "edge"}
          onClick={() => handleSelectionMode("edge")}
        />
        <ToolButton
          icon={Target01Icon}
          label={t("selection.vertex", "Vertex")}
          shortcut="1"
          active={selectionMode === "vertex"}
          onClick={() => handleSelectionMode("vertex")}
        />
      </div>

      <Separator orientation="vertical" className="h-4 mx-0.5 opacity-50" />

      {/* 2. Visualisation Tools */}
      <div className="flex items-center gap-0.5 rounded-lg bg-muted/20 p-0.5 border border-border/10">
        <ToolButton
          icon={GridIcon}
          label={t("toolbar.toggleGrid", "Toggle Grid")}
          shortcut="Ctrl+G"
          active={viewportSettings.showGrid}
          onClick={handleToggleGrid}
        />
        <ToolButton
          icon={SolidIcon}
          label={t("toolbar.solidView", "Solid")}
          shortcut="Alt+1"
          active={viewportSettings.viewMode === "solid"}
          onClick={() => handleViewMode("solid")}
        />
        <ToolButton
          icon={GridIcon}
          label={t("toolbar.wireframeView", "Wireframe")}
          shortcut="Alt+2"
          active={viewportSettings.viewMode === "wireframe"}
          onClick={() => handleViewMode("wireframe")}
        />
        <ToolButton
          icon={ViewIcon}
          label={t("toolbar.xrayView", "X-Ray")}
          shortcut="Alt+3"
          active={viewportSettings.viewMode === "xray"}
          onClick={() => handleViewMode("xray")}
        />
      </div>

      <Separator orientation="vertical" className="h-4 mx-0.5 opacity-50" />

      {/* 3. Global Actions */}
      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={Delete01Icon}
          label={t("toolbar.delete", "Delete")}
          shortcut="Del"
          disabled={!hasSelection}
          onClick={handleDelete}
        />

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-8 w-8 rounded-md hover:bg-muted/50"
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">{t("toolbar.more", "More")}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onOpenSearch}>
                <HugeiconsIcon icon={Search01Icon} className="mr-2 size-4" />
                <span>{t("toolbar.search", "Search")}</span>
                <kbd className="ml-auto text-xs text-muted-foreground">
                  {isMac ? "\u2318K" : "Ctrl+K"}
                </kbd>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}}>
                <HugeiconsIcon icon={Settings01Icon} className="mr-2 size-4" />
                <span>{t("toolbar.settings", "Settings")}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default ViewportBottomToolbar
