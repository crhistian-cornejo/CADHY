/**
 * Viewport Toolbar Component - CADHY
 *
 * Toolbar for the 3D viewport with:
 * - Transform tools (Select, Move, Rotate, Scale)
 * - View controls (Ortho views, Perspective)
 * - Display modes (Solid, Wireframe, X-Ray)
 * - Snap controls
 * - Undo/Redo
 * - Responsive overflow menu for small viewports
 */

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from "@cadhy/ui"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowTurnBackwardIcon,
  ArrowTurnForwardIcon,
  CubeIcon,
  Cursor01Icon,
  Download01Icon,
  ViewIcon as EyeIcon,
  File01Icon,
  GridIcon,
  Magnet01Icon,
  MoreHorizontalIcon,
  Move01Icon,
  Resize01Icon,
  Rotate01Icon,
  Settings01Icon,
  SidebarLeft01Icon,
  SquareIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePlatform } from "@/hooks/use-platform"
import { EXPORT_FORMATS, type ExportFormat, exportSelection } from "@/services/export-service"
import { isTauriAvailable } from "@/services/hydraulics-service"
import {
  type CameraView,
  type TransformMode,
  useCameraView,
  useCanRedo,
  useCanUndo,
  useModellerStore,
  useSelectedObjects,
  useSnapMode,
  useTransformMode,
  useViewportSettings,
} from "@/stores/modeller-store"

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================

// Breakpoints for hiding toolbar groups (in pixels)
// These are approximate widths where groups start getting hidden
const BREAKPOINTS = {
  SHOW_ALL: 700, // Show everything
  HIDE_CAMERA: 580, // Hide camera views - also hides undo/redo, export, settings
  HIDE_VIEW_MODE: 480, // Hide view mode buttons
  HIDE_SNAP: 380, // Hide snap/grid
  MINIMUM: 200, // Minimum - only transform + overflow
}

// ============================================================================
// TYPES
// ============================================================================

interface ToolButtonProps {
  icon: typeof Cursor01Icon
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  shortcut?: string
}

// ============================================================================
// TOOL BUTTON
// ============================================================================

function ToolButton({ icon, label, active, disabled, onClick, shortcut }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "secondary" : "ghost"}
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
            className={cn("h-7 w-7", active && "bg-primary/20 text-primary hover:bg-primary/30")}
          >
            <HugeiconsIcon icon={icon} className="size-4" />
          </Button>
        }
      />
      <TooltipContent side="bottom" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="rounded bg-background/20 px-1.5 py-0.5 text-[10px] font-mono text-inherit">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// VIEW BUTTON GROUP
// ============================================================================

interface ViewButtonProps {
  view: CameraView
  icon: typeof Home01Icon
  label: string
  currentView: CameraView
  onClick: (view: CameraView) => void
}

function ViewButton({ view, icon, label, currentView, onClick }: ViewButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={currentView === view ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => onClick(view)}
            className="h-7 w-7"
          >
            <HugeiconsIcon icon={icon} className="size-4" />
          </Button>
        }
      />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// MENU ITEM BUTTON (for dropdown menu)
// ============================================================================

interface MenuToolButtonProps {
  icon: typeof Cursor01Icon
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  shortcut?: string
}

function MenuToolButton({ icon, label, active, disabled, onClick, shortcut }: MenuToolButtonProps) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onClick={onClick}
      className={cn(active && "bg-primary/20 text-primary")}
    >
      <HugeiconsIcon icon={icon} className="mr-2 size-4" />
      <span className="flex-1">{label}</span>
      {shortcut && <kbd className="ml-auto text-[10px] text-muted-foreground">{shortcut}</kbd>}
    </DropdownMenuItem>
  )
}

// ============================================================================
// CUSTOM HOOK FOR CONTAINER WIDTH
// ============================================================================

function useContainerWidth() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })

    observer.observe(container)
    // Initial measurement
    setWidth(container.offsetWidth)

    return () => observer.disconnect()
  }, [])

  return { containerRef, width }
}

// ============================================================================
// TYPES
// ============================================================================

interface ViewportToolbarProps {
  showLeftPanel?: boolean
  onToggleLeftPanel?: () => void
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ViewportToolbar({ showLeftPanel = true, onToggleLeftPanel }: ViewportToolbarProps) {
  const { t } = useTranslation()
  const { isMacOS } = usePlatform()
  const { containerRef, width } = useContainerWidth()
  const transformMode = useTransformMode()
  const cameraView = useCameraView()
  const viewportSettings = useViewportSettings()
  const snapMode = useSnapMode()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const selectedObjects = useSelectedObjects()
  const [isExporting, setIsExporting] = useState(false)

  // Platform-specific modifier key for shortcuts
  const modKey = useMemo(() => (isMacOS ? "Cmd" : "Ctrl"), [isMacOS])

  // Determine which groups to show based on width
  const showCameraViews = width >= BREAKPOINTS.HIDE_CAMERA
  const showViewModes = width >= BREAKPOINTS.HIDE_VIEW_MODE
  const showSnapGrid = width >= BREAKPOINTS.HIDE_SNAP
  // Right-side tools hide together with camera views (first to go into overflow)
  const showRightTools = width >= BREAKPOINTS.HIDE_CAMERA
  const hasOverflow = !showCameraViews || !showViewModes || !showSnapGrid

  const { setTransformMode, setCameraView, setViewportSettings, setSnapMode, undo, redo } =
    useModellerStore()

  const handleTransformMode = useCallback(
    (mode: TransformMode) => {
      setTransformMode(mode)
    },
    [setTransformMode]
  )

  const handleCameraView = useCallback(
    (view: CameraView) => {
      setCameraView(view)
    },
    [setCameraView]
  )

  const handleToggleGrid = useCallback(() => {
    setViewportSettings({ showGrid: !viewportSettings.showGrid })
  }, [setViewportSettings, viewportSettings.showGrid])

  const handleToggleSnap = useCallback(() => {
    setSnapMode(snapMode === "none" ? "grid" : "none")
  }, [setSnapMode, snapMode])

  const handleViewMode = useCallback(
    (mode: "solid" | "wireframe" | "xray") => {
      setViewportSettings({ viewMode: mode })
    },
    [setViewportSettings]
  )

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!isTauriAvailable()) {
        toast.error("Export is only available in the desktop app")
        return
      }

      if (selectedObjects.length === 0) {
        toast.error("No objects selected for export")
        return
      }

      setIsExporting(true)
      try {
        const result = await exportSelection(selectedObjects, format)
        if (result.success) {
          toast.success(`Exported to ${result.filePath}`)
        } else {
          toast.error(result.error ?? "Export failed")
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export failed")
      } finally {
        setIsExporting(false)
      }
    },
    [selectedObjects]
  )

  // Check if export is possible
  const canExport =
    selectedObjects.length > 0 &&
    selectedObjects.some((obj) => obj.type === "channel") &&
    isTauriAvailable()

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1 border-b border-border/40 bg-background/95 px-2 py-1 backdrop-blur-sm"
    >
      {/* Toggle Left Panel */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={showLeftPanel ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={onToggleLeftPanel}
              className={cn(
                "h-7 w-7 shrink-0",
                showLeftPanel && "bg-primary/20 text-primary hover:bg-primary/30"
              )}
            >
              <HugeiconsIcon icon={SidebarLeft01Icon} className="size-4" />
            </Button>
          }
        />
        <TooltipContent side="bottom" className="flex items-center gap-2">
          <span>{showLeftPanel ? t("toolbar.hidePanel") : t("toolbar.showPanel")}</span>
          <kbd className="rounded bg-background/20 px-1.5 py-0.5 text-[10px] font-mono text-inherit">
            P
          </kbd>
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

      {/* Transform Tools - Always visible */}
      <div className="flex items-center gap-0.5 rounded-md border bg-muted/30 p-0.5 shrink-0">
        <ToolButton
          icon={Cursor01Icon}
          label={t("toolbar.select")}
          shortcut="V"
          active={transformMode === "none"}
          onClick={() => handleTransformMode("none")}
        />
        <ToolButton
          icon={Move01Icon}
          label={t("toolbar.move")}
          shortcut="G"
          active={transformMode === "translate"}
          onClick={() => handleTransformMode("translate")}
        />
        <ToolButton
          icon={Rotate01Icon}
          label={t("toolbar.rotate")}
          shortcut="R"
          active={transformMode === "rotate"}
          onClick={() => handleTransformMode("rotate")}
        />
        <ToolButton
          icon={Resize01Icon}
          label={t("toolbar.scale")}
          shortcut="S"
          active={transformMode === "scale"}
          onClick={() => handleTransformMode("scale")}
        />
      </div>

      {/* Snap & Grid - Hideable */}
      {showSnapGrid && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />
          <div className="flex items-center gap-0.5 rounded-md border bg-muted/30 p-0.5 shrink-0">
            <ToolButton
              icon={GridIcon}
              label={t("toolbar.toggleGrid")}
              shortcut={`${modKey}+G`}
              active={viewportSettings.showGrid}
              onClick={handleToggleGrid}
            />
            <ToolButton
              icon={Magnet01Icon}
              label={t("toolbar.snapToGrid")}
              shortcut={`${modKey}+Shift+S`}
              active={snapMode !== "none"}
              onClick={handleToggleSnap}
            />
          </div>
        </>
      )}

      {/* View Modes - Hideable */}
      {showViewModes && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />
          <div className="flex items-center gap-0.5 rounded-md border bg-muted/30 p-0.5 shrink-0">
            <ToolButton
              icon={CubeIcon}
              label={t("toolbar.solidView")}
              active={viewportSettings.viewMode === "solid"}
              onClick={() => handleViewMode("solid")}
            />
            <ToolButton
              icon={GridIcon}
              label={t("toolbar.wireframeView")}
              active={viewportSettings.viewMode === "wireframe"}
              onClick={() => handleViewMode("wireframe")}
            />
            <ToolButton
              icon={EyeIcon}
              label={t("toolbar.xrayView")}
              active={viewportSettings.viewMode === "xray"}
              onClick={() => handleViewMode("xray")}
            />
          </div>
        </>
      )}

      {/* Camera Views - Hideable */}
      {showCameraViews && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />
          <div className="flex items-center gap-0.5 rounded-md border bg-muted/30 p-0.5 shrink-0">
            <ViewButton
              view="perspective"
              icon={CubeIcon}
              label={t("toolbar.perspective")}
              currentView={cameraView}
              onClick={handleCameraView}
            />
            <ViewButton
              view="top"
              icon={ArrowDown01Icon}
              label={t("toolbar.planView")}
              currentView={cameraView}
              onClick={handleCameraView}
            />
            <ViewButton
              view="front"
              icon={ArrowRight01Icon}
              label={t("toolbar.profileView")}
              currentView={cameraView}
              onClick={handleCameraView}
            />
            <ViewButton
              view="right"
              icon={SquareIcon}
              label={t("toolbar.crossSection")}
              currentView={cameraView}
              onClick={handleCameraView}
            />
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1 min-w-2" />

      {/* Overflow Menu - Shows hidden items */}
      {hasOverflow && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
                </DropdownMenuTrigger>
              }
            />
            <TooltipContent side="bottom">{t("toolbar.moreTools")}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-56">
            {/* Snap & Grid in overflow */}
            {!showSnapGrid && (
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("toolbar.gridSnap")}</DropdownMenuLabel>
                <MenuToolButton
                  icon={GridIcon}
                  label={t("toolbar.toggleGrid")}
                  shortcut={`${modKey}+G`}
                  active={viewportSettings.showGrid}
                  onClick={handleToggleGrid}
                />
                <MenuToolButton
                  icon={Magnet01Icon}
                  label={t("toolbar.snapToGrid")}
                  shortcut={`${modKey}+Shift+S`}
                  active={snapMode !== "none"}
                  onClick={handleToggleSnap}
                />
              </DropdownMenuGroup>
            )}

            {/* View Modes in overflow */}
            {!showViewModes && (
              <DropdownMenuGroup>
                {!showSnapGrid && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{t("toolbar.viewMode")}</DropdownMenuLabel>
                <MenuToolButton
                  icon={CubeIcon}
                  label={t("toolbar.solidView")}
                  active={viewportSettings.viewMode === "solid"}
                  onClick={() => handleViewMode("solid")}
                />
                <MenuToolButton
                  icon={GridIcon}
                  label={t("toolbar.wireframeView")}
                  active={viewportSettings.viewMode === "wireframe"}
                  onClick={() => handleViewMode("wireframe")}
                />
                <MenuToolButton
                  icon={EyeIcon}
                  label={t("toolbar.xrayView")}
                  active={viewportSettings.viewMode === "xray"}
                  onClick={() => handleViewMode("xray")}
                />
              </DropdownMenuGroup>
            )}

            {/* Camera Views in overflow */}
            {!showCameraViews && (
              <DropdownMenuGroup>
                {(!showSnapGrid || !showViewModes) && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{t("toolbar.cameraView")}</DropdownMenuLabel>
                <MenuToolButton
                  icon={CubeIcon}
                  label={t("toolbar.perspective")}
                  active={cameraView === "perspective"}
                  onClick={() => handleCameraView("perspective")}
                />
                <MenuToolButton
                  icon={ArrowDown01Icon}
                  label={t("toolbar.planView")}
                  active={cameraView === "top"}
                  onClick={() => handleCameraView("top")}
                />
                <MenuToolButton
                  icon={ArrowRight01Icon}
                  label={t("toolbar.profileView")}
                  active={cameraView === "front"}
                  onClick={() => handleCameraView("front")}
                />
                <MenuToolButton
                  icon={SquareIcon}
                  label={t("toolbar.crossSection")}
                  active={cameraView === "right"}
                  onClick={() => handleCameraView("right")}
                />
              </DropdownMenuGroup>
            )}

            {/* Right-side tools in overflow (Undo/Redo, Export, Settings) */}
            {!showRightTools && (
              <>
                <DropdownMenuGroup>
                  {(!showSnapGrid || !showViewModes || !showCameraViews) && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuLabel>{t("toolbar.actions")}</DropdownMenuLabel>
                  <MenuToolButton
                    icon={ArrowTurnBackwardIcon}
                    label={t("toolbar.undo")}
                    shortcut={`${modKey}+Z`}
                    disabled={!canUndo}
                    onClick={undo}
                  />
                  <MenuToolButton
                    icon={ArrowTurnForwardIcon}
                    label={t("toolbar.redo")}
                    shortcut={isMacOS ? `${modKey}+Shift+Z` : `${modKey}+Y`}
                    disabled={!canRedo}
                    onClick={redo}
                  />
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("toolbar.exportFormat")}</DropdownMenuLabel>
                  {EXPORT_FORMATS.map((format) => (
                    <DropdownMenuItem
                      key={format.id}
                      onClick={() => handleExport(format.id)}
                      disabled={!canExport || isExporting}
                    >
                      <HugeiconsIcon icon={File01Icon} className="mr-2 size-4" />
                      <span>{format.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">
                    {t("toolbar.viewportSettings")}
                  </DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={
                      viewportSettings.backgroundColor === "#f5f5f5" ||
                      viewportSettings.backgroundColor === "#ffffff"
                    }
                    onCheckedChange={(checked) =>
                      setViewportSettings({ backgroundColor: checked ? "#f5f5f5" : "#1a1a1a" })
                    }
                  >
                    {t("toolbar.lightBackground")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={viewportSettings.shadows}
                    onCheckedChange={(checked) => setViewportSettings({ shadows: checked })}
                  >
                    {t("toolbar.shadows")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={viewportSettings.antialiasing}
                    onCheckedChange={(checked) => setViewportSettings({ antialiasing: checked })}
                  >
                    {t("toolbar.antialiasing")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={viewportSettings.ambientOcclusion}
                    onCheckedChange={(checked) =>
                      setViewportSettings({ ambientOcclusion: checked })
                    }
                  >
                    {t("toolbar.ambientOcclusion")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={viewportSettings.showAxes}
                    onCheckedChange={(checked) => setViewportSettings({ showAxes: checked })}
                  >
                    {t("toolbar.showAxes")}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Right-side tools - Hideable (Undo/Redo, Export, Settings) */}
      {showRightTools && (
        <>
          <div className="flex items-center gap-0.5 rounded-md border bg-muted/30 p-0.5 shrink-0">
            <ToolButton
              icon={ArrowTurnBackwardIcon}
              label={t("toolbar.undo")}
              shortcut={`${modKey}+Z`}
              disabled={!canUndo}
              onClick={undo}
            />
            <ToolButton
              icon={ArrowTurnForwardIcon}
              label={t("toolbar.redo")}
              shortcut={isMacOS ? `${modKey}+Shift+Z` : `${modKey}+Y`}
              disabled={!canRedo}
              onClick={redo}
            />
          </div>

          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

          {/* Export */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    disabled={!canExport || isExporting}
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      "disabled:pointer-events-none disabled:opacity-50",
                      isExporting && "animate-pulse"
                    )}
                  >
                    <HugeiconsIcon icon={Download01Icon} className="size-4" />
                  </DropdownMenuTrigger>
                }
              />
              <TooltipContent side="bottom">
                {canExport ? t("toolbar.exportSelection") : t("toolbar.selectChannelToExport")}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("toolbar.exportFormat")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {EXPORT_FORMATS.map((format) => (
                  <DropdownMenuItem
                    key={format.id}
                    onClick={() => handleExport(format.id)}
                    disabled={isExporting}
                  >
                    <HugeiconsIcon icon={File01Icon} className="mr-2 size-4" />
                    <span>{format.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Viewport Settings Popover */}
          <Popover>
            <Tooltip>
              <PopoverTrigger
                render={
                  <TooltipTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" className="h-7 w-7 shrink-0">
                        <HugeiconsIcon icon={Settings01Icon} className="size-4" />
                      </Button>
                    }
                  />
                }
              />
              <TooltipContent side="bottom">{t("toolbar.viewportSettings")}</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-52 p-2.5">
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {t("toolbar.viewportSettings")}
                </p>

                {/* Light Background Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="lightBg" className="text-xs font-normal">
                    {t("toolbar.lightBackground")}
                  </Label>
                  <Switch
                    id="lightBg"
                    checked={
                      viewportSettings.backgroundColor === "#f5f5f5" ||
                      viewportSettings.backgroundColor === "#ffffff"
                    }
                    onCheckedChange={(checked) =>
                      setViewportSettings({ backgroundColor: checked ? "#f5f5f5" : "#1a1a1a" })
                    }
                  />
                </div>

                {/* Shadows Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="shadows" className="text-xs font-normal">
                    {t("toolbar.shadows")}
                  </Label>
                  <Switch
                    id="shadows"
                    checked={viewportSettings.shadows}
                    onCheckedChange={(checked) => setViewportSettings({ shadows: checked })}
                  />
                </div>

                {/* Antialiasing Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="antialiasing" className="text-xs font-normal">
                    {t("toolbar.antialiasing")}
                  </Label>
                  <Switch
                    id="antialiasing"
                    checked={viewportSettings.antialiasing}
                    onCheckedChange={(checked) => setViewportSettings({ antialiasing: checked })}
                  />
                </div>

                {/* Ambient Occlusion Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="ao" className="text-xs font-normal">
                    {t("toolbar.ambientOcclusion")}
                  </Label>
                  <Switch
                    id="ao"
                    checked={viewportSettings.ambientOcclusion}
                    onCheckedChange={(checked) =>
                      setViewportSettings({ ambientOcclusion: checked })
                    }
                  />
                </div>

                {/* Show Axes Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="axes" className="text-xs font-normal">
                    {t("toolbar.showAxes")}
                  </Label>
                  <Switch
                    id="axes"
                    checked={viewportSettings.showAxes}
                    onCheckedChange={(checked) => setViewportSettings({ showAxes: checked })}
                  />
                </div>

                <Separator className="my-2" />

                {/* Post-Processing Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="postprocessing" className="text-xs font-normal">
                    {t("toolbar.postProcessing", "Post-Processing")}
                  </Label>
                  <Switch
                    id="postprocessing"
                    checked={viewportSettings.enablePostProcessing ?? false}
                    onCheckedChange={(checked) =>
                      setViewportSettings({ enablePostProcessing: checked })
                    }
                  />
                </div>

                {/* Post-Processing Quality Dropdown */}
                {(viewportSettings.enablePostProcessing ?? false) && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      {t("toolbar.quality", "Quality")}
                    </Label>
                    <div className="grid grid-cols-4 gap-1">
                      {(["low", "medium", "high", "ultra"] as const).map((quality) => (
                        <Button
                          key={quality}
                          variant={
                            (viewportSettings.postProcessingQuality ?? "medium") === quality
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className={cn(
                            "h-6 px-1 text-[10px] font-normal capitalize",
                            (viewportSettings.postProcessingQuality ?? "medium") === quality &&
                              "bg-primary text-primary-foreground"
                          )}
                          onClick={() => setViewportSettings({ postProcessingQuality: quality })}
                        >
                          {quality}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  )
}

export default ViewportToolbar
