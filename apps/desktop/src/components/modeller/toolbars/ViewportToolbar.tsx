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
 *
 * @see ./toolbar/ToolButton.tsx - Reusable tool button component
 * @see ./toolbar/MenuToolButton.tsx - Menu variant of tool button
 * @see ./toolbar/ViewButton.tsx - Camera view button
 * @see ./toolbar/use-container-width.ts - Responsive width hook
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Slider,
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
  Camera01Icon,
  CubeIcon,
  Cursor01Icon,
  Download01Icon,
  ViewIcon as EyeIcon,
  File01Icon,
  GridIcon,
  Magnet01Icon,
  MoreHorizontalIcon,
  Move01Icon,
  PencilEdit02Icon,
  PlayIcon,
  Resize01Icon,
  Rotate01Icon,
  RulerIcon,
  Settings01Icon,
  SidebarLeft01Icon,
  SquareIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { CameraViewsPopover } from "@/components/modeller/camera"
import { shapeIdMap, useCAD } from "@/hooks/use-cad"
import { usePlatform } from "@/hooks/use-platform"
import * as cadService from "@/services/cad-service"
import {
  EXPORT_FORMATS,
  type ExportFormat,
  exportScene,
  exportSelection,
  hasExportableObjects,
  isExportable,
} from "@/services/export-service"
import { isTauriAvailable } from "@/services/hydraulics-service"
import {
  type CameraView,
  type EnvironmentPreset,
  type TransformMode,
  useBoxSelectMode,
  useCameraView,
  useCanRedo,
  useCanUndo,
  useModellerStore,
  useObjects,
  useSavedCameraViews,
  useSelectedObjects,
  useSnapMode,
  useTransformMode,
  useViewportSettings,
} from "@/stores/modeller"
import {
  TOOLBAR_BREAKPOINTS as BREAKPOINTS,
  MenuToolButton,
  ToolButton,
  useContainerWidth,
  ViewButton,
} from "."

// ============================================================================
// CAD OPERATION TYPES
// ============================================================================

type ParameterOperation = "fillet" | "chamfer" | "shell" | null

// Environment presets with their display names and Poly Haven HDRI IDs for previews
// Drei preset → Poly Haven HDRI mapping
const ENVIRONMENT_PRESETS: { id: EnvironmentPreset; name: string; hdriId: string }[] = [
  { id: "apartment", name: "Apartment", hdriId: "lebombo" },
  { id: "city", name: "City", hdriId: "potsdamer_platz" },
  { id: "dawn", name: "Dawn", hdriId: "kiara_1_dawn" },
  { id: "forest", name: "Forest", hdriId: "forest_slope" },
  { id: "lobby", name: "Lobby", hdriId: "st_fagans_interior" },
  { id: "night", name: "Night", hdriId: "dikhololo_night" },
  { id: "park", name: "Park", hdriId: "rooitou_park" },
  { id: "studio", name: "Studio", hdriId: "studio_small_03" },
  { id: "sunset", name: "Sunset", hdriId: "venice_sunset" },
  { id: "warehouse", name: "Warehouse", hdriId: "empty_warehouse_01" },
]

// Get Poly Haven thumbnail URL for HDRI preview
const getHdriPreviewUrl = (hdriId: string) =>
  `https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${hdriId}.jpg`

// ============================================================================
// TYPES
// ============================================================================

interface ViewportToolbarProps {
  showLeftPanel?: boolean
  onToggleLeftPanel?: () => void
  showAnimationPanel?: boolean
  onToggleAnimationPanel?: () => void
  showRightPanel?: boolean
  onToggleRightPanel?: () => void
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ViewportToolbar({
  showLeftPanel = true,
  onToggleLeftPanel,
  showAnimationPanel = false,
  onToggleAnimationPanel,
  showRightPanel = true,
  onToggleRightPanel,
}: ViewportToolbarProps) {
  const { t } = useTranslation()
  const { isMacOS } = usePlatform()
  const { containerRef, width } = useContainerWidth()
  const transformMode = useTransformMode()
  const cameraView = useCameraView()
  const viewportSettings = useViewportSettings()
  const snapMode = useSnapMode()
  const isBoxSelectMode = useBoxSelectMode()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const selectedObjects = useSelectedObjects()
  const allObjects = useObjects()
  const savedViews = useSavedCameraViews()
  const [isExporting, setIsExporting] = useState(false)

  // CAD operations
  const { addObject, deleteObject } = useModellerStore()
  const { fuseShapes, cutShapes, intersectShapes } = useCAD()

  // Parameter dialog state (for Fillet, Chamfer, Shell)
  const [parameterDialog, setParameterDialog] = useState<{
    open: boolean
    operation: ParameterOperation
    value: string
  }>({
    open: false,
    operation: null,
    value: "",
  })

  // Measure results dialog state
  const [measureDialog, setMeasureDialog] = useState<{
    open: boolean
    title: string
    results: Array<{ label: string; value: string }>
  }>({
    open: false,
    title: "",
    results: [],
  })

  // Platform-specific modifier key for shortcuts
  const modKey = useMemo(() => (isMacOS ? "Cmd" : "Ctrl"), [isMacOS])

  // Determine which groups to show based on width
  const showCameraViews = width >= BREAKPOINTS.HIDE_CAMERA
  const showViewModes = width >= BREAKPOINTS.HIDE_VIEW_MODE
  const showSnapGrid = width >= BREAKPOINTS.HIDE_SNAP
  // Right-side tools hide together with camera views (first to go into overflow)
  const showRightTools = width >= BREAKPOINTS.HIDE_CAMERA
  const hasOverflow = !showCameraViews || !showViewModes || !showSnapGrid

  const {
    setTransformMode,
    setCameraView,
    setViewportSettings,
    setSnapMode,
    setBoxSelectMode,
    undo,
    redo,
    loadCameraView,
  } = useModellerStore()

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

  const handleToggleCameraType = useCallback(() => {
    const currentType = viewportSettings.cameraType ?? "perspective"
    setViewportSettings({
      cameraType: currentType === "perspective" ? "orthographic" : "perspective",
    })
  }, [setViewportSettings, viewportSettings.cameraType])

  const handleLoadCameraView = useCallback(
    (id: string) => {
      const view = savedViews.find((v) => v.id === id)
      if (view) {
        loadCameraView(id)
        toast.success(t("camera.viewLoaded", `Loaded "${view.name}"`))
      }
    },
    [savedViews, loadCameraView, t]
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

  const handleExportScene = useCallback(
    async (format: ExportFormat) => {
      if (!isTauriAvailable()) {
        toast.error("Export is only available in the desktop app")
        return
      }

      setIsExporting(true)
      try {
        const result = await exportScene(allObjects, format)
        if (result.success) {
          toast.success(`Scene exported to ${result.filePath}`)
        } else {
          toast.error(result.error ?? "Export failed")
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export failed")
      } finally {
        setIsExporting(false)
      }
    },
    [allObjects]
  )

  // Check if export is possible (channels, transitions, and shapes are exportable)
  const canExport =
    selectedObjects.length > 0 && selectedObjects.some(isExportable) && isTauriAvailable()

  // Check if scene export is possible (at least one exportable object exists)
  const canExportScene = hasExportableObjects(allObjects) && isTauriAvailable()

  // ============================================================================
  // CAD OPERATION HANDLERS
  // ============================================================================

  // Boolean operations require exactly 2 selected objects
  const canBooleanOp = selectedObjects.length === 2

  // Modify and measure operations require at least 1 selected shape
  const hasSelectedShapes =
    selectedObjects.length > 0 && selectedObjects.some((obj) => obj.type === "shape")

  const handleBooleanUnion = useCallback(async () => {
    if (selectedObjects.length !== 2) {
      toast.error("Select exactly 2 objects for Boolean Union")
      return
    }
    try {
      const result = await fuseShapes(selectedObjects[0].id, selectedObjects[1].id, "Union")
      if (result) {
        toast.success("Boolean Union completed")
      }
    } catch (error) {
      toast.error(`Boolean Union failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [selectedObjects, fuseShapes])

  const handleBooleanSubtract = useCallback(async () => {
    if (selectedObjects.length !== 2) {
      toast.error("Select exactly 2 objects for Boolean Subtract")
      return
    }
    try {
      const result = await cutShapes(selectedObjects[0].id, selectedObjects[1].id, "Subtract")
      if (result) {
        toast.success("Boolean Subtract completed")
      }
    } catch (error) {
      toast.error(
        `Boolean Subtract failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }, [selectedObjects, cutShapes])

  const handleBooleanIntersect = useCallback(async () => {
    if (selectedObjects.length !== 2) {
      toast.error("Select exactly 2 objects for Boolean Intersect")
      return
    }
    try {
      const result = await intersectShapes(
        selectedObjects[0].id,
        selectedObjects[1].id,
        "Intersect"
      )
      if (result) {
        toast.success("Boolean Intersect completed")
      }
    } catch (error) {
      toast.error(
        `Boolean Intersect failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }, [selectedObjects, intersectShapes])

  // Modify operations
  const handleFillet = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    setParameterDialog({ open: true, operation: "fillet", value: "1.0" })
  }, [selectedObjects])

  const handleChamfer = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    setParameterDialog({ open: true, operation: "chamfer", value: "0.5" })
  }, [selectedObjects])

  const handleShell = useCallback(() => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }
    setParameterDialog({ open: true, operation: "shell", value: "0.5" })
  }, [selectedObjects])

  // Apply parameter operation
  const handleApplyParameterOperation = useCallback(async () => {
    if (!parameterDialog.operation || selectedObjects.length === 0) return

    const value = parseFloat(parameterDialog.value)
    if (Number.isNaN(value) || value <= 0) {
      toast.error("Please enter a valid positive number")
      return
    }

    const selectedObject = selectedObjects[0]
    const backendId = shapeIdMap.get(selectedObject.id)

    if (!backendId) {
      toast.error("Shape not found in backend")
      return
    }

    try {
      let result: { id: string } | undefined
      let operationName = ""

      switch (parameterDialog.operation) {
        case "fillet":
          result = await cadService.fillet(backendId, value)
          operationName = "Fillet"
          break
        case "chamfer":
          result = await cadService.chamfer(backendId, value)
          operationName = "Chamfer"
          break
        case "shell":
          result = await cadService.shell(backendId, value)
          operationName = "Shell"
          break
      }

      if (result) {
        const meshData = await cadService.tessellate(result.id, 0.1)
        const newObject = {
          type: "shape" as const,
          mesh: {
            vertices: new Float32Array(meshData.vertices),
            indices: new Uint32Array(meshData.indices),
            normals: new Float32Array(meshData.normals),
          },
          metadata: {
            backendShapeId: result.id,
            operation: parameterDialog.operation,
            sourceId: selectedObject.id,
            parameter: value,
          },
          position: selectedObject.position,
          rotation: selectedObject.rotation,
          scale: selectedObject.scale,
          visible: true,
          name: `${operationName} ${value}`,
        }

        deleteObject(selectedObject.id)
        const newId = addObject(newObject)
        shapeIdMap.set(newId, result.id)

        toast.success(`${operationName} applied successfully`)
        setParameterDialog({ open: false, operation: null, value: "" })
      }
    } catch (error) {
      toast.error(
        `${parameterDialog.operation} failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }, [parameterDialog, selectedObjects, addObject, deleteObject])

  // Measure handlers
  const handleMeasureDistance = useCallback(async () => {
    if (selectedObjects.length !== 2) {
      toast.error("Select exactly 2 objects to measure distance")
      return
    }

    const backendId1 = shapeIdMap.get(selectedObjects[0].id)
    const backendId2 = shapeIdMap.get(selectedObjects[1].id)

    if (!backendId1 || !backendId2) {
      toast.error("Shapes not found in backend")
      return
    }

    try {
      const distance = await cadService.measureDistance(backendId1, backendId2)
      setMeasureDialog({
        open: true,
        title: "Distance Measurement",
        results: [
          { label: "Distance", value: `${distance.toFixed(3)} units` },
          { label: "Object 1", value: selectedObjects[0].name || "Unnamed" },
          { label: "Object 2", value: selectedObjects[1].name || "Unnamed" },
        ],
      })
    } catch (error) {
      toast.error(`Measurement failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [selectedObjects])

  const handleMeasureProperties = useCallback(async () => {
    if (selectedObjects.length === 0) {
      toast.error("No objects selected")
      return
    }

    const selectedObject = selectedObjects[0]
    const backendId = shapeIdMap.get(selectedObject.id)

    if (!backendId) {
      toast.error("Shape not found in backend")
      return
    }

    try {
      const analysis = await cadService.analyze(backendId)
      const results = [
        { label: "Valid", value: analysis.is_valid ? "Yes" : "No" },
        { label: "Vertices", value: analysis.num_vertices.toString() },
        { label: "Edges", value: analysis.num_edges.toString() },
        { label: "Faces", value: analysis.num_faces.toString() },
        { label: "Solids", value: analysis.num_solids.toString() },
        { label: "Surface Area", value: `${analysis.surface_area.toFixed(3)} units²` },
        { label: "Volume", value: `${analysis.volume.toFixed(3)} units³` },
      ]

      if (analysis.bounding_box) {
        const bbox = analysis.bounding_box
        results.push(
          {
            label: "Bounding Box Min",
            value: `(${bbox.min_x.toFixed(2)}, ${bbox.min_y.toFixed(2)}, ${bbox.min_z.toFixed(2)})`,
          },
          {
            label: "Bounding Box Max",
            value: `(${bbox.max_x.toFixed(2)}, ${bbox.max_y.toFixed(2)}, ${bbox.max_z.toFixed(2)})`,
          }
        )
      }

      setMeasureDialog({
        open: true,
        title: `Properties: ${selectedObject.name || "Unnamed"}`,
        results,
      })
    } catch (error) {
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [selectedObjects])

  return (
    <>
      <div
        ref={containerRef}
        className="flex items-center gap-1 border-b border-border/40 bg-background/95 dark:bg-toolbar-bg px-2 py-1 backdrop-blur-sm"
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
          <TooltipContent side="bottom">
            {showLeftPanel ? t("toolbar.hidePanel") : t("toolbar.showPanel")}
            <span className="ml-1.5 opacity-70">(P)</span>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

        {/* Transform Tools - Always visible */}
        <div className="flex items-center gap-0.5 rounded-2xl border bg-muted/30 p-0.5 shrink-0">
          <ToolButton
            icon={Cursor01Icon}
            label={t("toolbar.select")}
            shortcut="V"
            active={transformMode === "none" && !isBoxSelectMode}
            onClick={() => {
              handleTransformMode("none")
              setBoxSelectMode(false)
            }}
          />
          <ToolButton
            icon={SquareIcon}
            label={t("toolbar.boxSelect", "Box Select")}
            shortcut="B"
            active={isBoxSelectMode}
            onClick={() => setBoxSelectMode(!isBoxSelectMode)}
          />
          <ToolButton
            icon={Move01Icon}
            label={t("toolbar.move")}
            shortcut="G"
            active={transformMode === "translate"}
            onClick={() => {
              handleTransformMode("translate")
              setBoxSelectMode(false)
            }}
          />
          <ToolButton
            icon={Rotate01Icon}
            label={t("toolbar.rotate")}
            shortcut="R"
            active={transformMode === "rotate"}
            onClick={() => {
              handleTransformMode("rotate")
              setBoxSelectMode(false)
            }}
          />
          <ToolButton
            icon={Resize01Icon}
            label={t("toolbar.scale")}
            shortcut="S"
            active={transformMode === "scale"}
            onClick={() => {
              handleTransformMode("scale")
              setBoxSelectMode(false)
            }}
          />
        </div>

        {/* CAD Operations - Boolean, Modify, Measure */}
        <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />
        <div className="flex items-center gap-0.5 rounded-2xl border bg-muted/30 p-0.5 shrink-0">
          {/* Boolean Operations */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    disabled={!canBooleanOp}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-2xl text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      "disabled:pointer-events-none disabled:opacity-50"
                    )}
                  >
                    <HugeiconsIcon icon={CubeIcon} className="size-4" />
                  </DropdownMenuTrigger>
                }
              />
              <TooltipContent side="bottom">
                {canBooleanOp
                  ? t("toolbar.booleanOps", "Boolean Operations")
                  : t("toolbar.selectTwoObjects", "Select 2 objects for boolean ops")}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {t("toolbar.booleanOps", "Boolean Operations")}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={handleBooleanUnion}>
                  <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
                  {t("toolbar.union", "Union (Fuse)")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBooleanSubtract}>
                  <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
                  {t("toolbar.subtract", "Subtract (Cut)")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBooleanIntersect}>
                  <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
                  {t("toolbar.intersect", "Intersect (Common)")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Modify Operations */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    disabled={!hasSelectedShapes}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-2xl text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      "disabled:pointer-events-none disabled:opacity-50"
                    )}
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
                  </DropdownMenuTrigger>
                }
              />
              <TooltipContent side="bottom">
                {t("toolbar.modifyOps", "Modify Operations")}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("toolbar.modifyOps", "Modify Operations")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleFillet}>
                  <HugeiconsIcon icon={PencilEdit02Icon} className="mr-2 size-4" />
                  {t("toolbar.fillet", "Fillet (Round)")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleChamfer}>
                  <HugeiconsIcon icon={PencilEdit02Icon} className="mr-2 size-4" />
                  {t("toolbar.chamfer", "Chamfer (Bevel)")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShell}>
                  <HugeiconsIcon icon={CubeIcon} className="mr-2 size-4" />
                  {t("toolbar.shell", "Shell (Hollow)")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Measure */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    disabled={!hasSelectedShapes}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-2xl text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      "disabled:pointer-events-none disabled:opacity-50"
                    )}
                  >
                    <HugeiconsIcon icon={RulerIcon} className="size-4" />
                  </DropdownMenuTrigger>
                }
              />
              <TooltipContent side="bottom">{t("toolbar.measure", "Measure")}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("toolbar.measurements", "Measurements")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleMeasureDistance} disabled={!canBooleanOp}>
                  <HugeiconsIcon icon={RulerIcon} className="mr-2 size-4" />
                  {t("toolbar.distance", "Distance")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMeasureProperties}>
                  <HugeiconsIcon icon={RulerIcon} className="mr-2 size-4" />
                  {t("toolbar.properties", "Properties")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Snap & Grid - Hideable */}
        {showSnapGrid && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />
            <div className="flex items-center gap-0.5 rounded-2xl border bg-muted/30 p-0.5 shrink-0">
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
            <div className="flex items-center gap-0.5 rounded-2xl border bg-muted/30 p-0.5 shrink-0">
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

        {/* Camera Projection Toggle */}
        {showViewModes && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />
            <ToolButton
              icon={Camera01Icon}
              label={
                (viewportSettings.cameraType ?? "perspective") === "orthographic"
                  ? t("toolbar.orthographicProjection")
                  : t("toolbar.perspectiveProjection")
              }
              active={(viewportSettings.cameraType ?? "perspective") === "orthographic"}
              onClick={handleToggleCameraType}
            />
          </>
        )}

        {/* Camera Views - Hideable */}
        {showCameraViews && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />
            <div className="flex items-center gap-0.5 rounded-2xl border bg-muted/30 p-0.5 shrink-0">
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
                  <DropdownMenuTrigger className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
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

              {/* Camera Projection in overflow */}
              {!showViewModes && (
                <DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <MenuToolButton
                    icon={Camera01Icon}
                    label={
                      (viewportSettings.cameraType ?? "perspective") === "orthographic"
                        ? t("toolbar.orthographicProjection")
                        : t("toolbar.perspectiveProjection")
                    }
                    active={(viewportSettings.cameraType ?? "perspective") === "orthographic"}
                    onClick={handleToggleCameraType}
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
                    <DropdownMenuLabel>{t("camera.savedViews", "Saved Views")}</DropdownMenuLabel>
                    {savedViews.length === 0 ? (
                      <DropdownMenuItem disabled>
                        <span className="text-xs text-muted-foreground">
                          {t("camera.noSavedViews", "No saved views yet")}
                        </span>
                      </DropdownMenuItem>
                    ) : (
                      savedViews.map((view) => (
                        <DropdownMenuItem
                          key={view.id}
                          onClick={() => handleLoadCameraView(view.id)}
                        >
                          <HugeiconsIcon icon={Camera01Icon} className="mr-2 size-4" />
                          <span>{view.name}</span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      {t("animation.title", "Camera Animations")}
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={onToggleAnimationPanel}>
                      <HugeiconsIcon icon={PlayIcon} className="mr-2 size-4" />
                      <span>
                        {showAnimationPanel
                          ? t("animation.hidePanel", "Hide Animation Panel")
                          : t("animation.showPanel", "Show Animation Panel")}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      {t("toolbar.exportSelection", "Export Selection")}
                    </DropdownMenuLabel>
                    {EXPORT_FORMATS.map((format) => (
                      <DropdownMenuItem
                        key={`overflow-selection-${format.id}`}
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
                    <DropdownMenuLabel>
                      {t("toolbar.exportScene", "Export Entire Scene")}
                    </DropdownMenuLabel>
                    {EXPORT_FORMATS.map((format) => (
                      <DropdownMenuItem
                        key={`overflow-scene-${format.id}`}
                        onClick={() => handleExportScene(format.id)}
                        disabled={!canExportScene || isExporting}
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
            <div className="flex items-center gap-0.5 rounded-2xl border bg-muted/30 p-0.5 shrink-0">
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
                      disabled={(!canExport && !canExportScene) || isExporting}
                      className={cn(
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl text-sm font-medium transition-colors",
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
                  {canExport || canExportScene
                    ? t("toolbar.export", "Export")
                    : t("toolbar.noExportableObjects", "No exportable objects in scene")}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                {/* Export Selection */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    {t("toolbar.exportSelection", "Export Selection")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {EXPORT_FORMATS.map((format) => (
                    <DropdownMenuItem
                      key={`selection-${format.id}`}
                      onClick={() => handleExport(format.id)}
                      disabled={!canExport || isExporting}
                    >
                      <HugeiconsIcon icon={File01Icon} className="mr-2 size-4" />
                      <span>{format.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Export Scene */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    {t("toolbar.exportScene", "Export Entire Scene")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {EXPORT_FORMATS.map((format) => (
                    <DropdownMenuItem
                      key={`scene-${format.id}`}
                      onClick={() => handleExportScene(format.id)}
                      disabled={!canExportScene || isExporting}
                    >
                      <HugeiconsIcon icon={File01Icon} className="mr-2 size-4" />
                      <span>{format.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Camera Views */}
            <CameraViewsPopover className="shrink-0" />

            {/* Camera Animations */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant={showAnimationPanel ? "default" : "ghost"}
                    size="icon-sm"
                    className="h-7 w-7 shrink-0"
                    onClick={onToggleAnimationPanel}
                  >
                    <HugeiconsIcon icon={PlayIcon} className="size-4" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">
                {t("animation.title", "Camera Animations")}
              </TooltipContent>
            </Tooltip>

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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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

                  {/* PBR Textures Toggle - Simple on/off for post-processing + textures */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="postprocessing" className="text-xs font-normal">
                        {t("toolbar.pbrTextures", "Texturas PBR")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "toolbar.pbrTexturesDesc",
                          "Si está desactivado, solo se muestra el color del material"
                        )}
                      </p>
                    </div>
                    <Switch
                      id="postprocessing"
                      checked={viewportSettings.enablePostProcessing ?? false}
                      onCheckedChange={(checked) =>
                        setViewportSettings({ enablePostProcessing: checked })
                      }
                    />
                  </div>

                  <Separator className="my-2" />

                  {/* Environment Lighting */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("toolbar.environmentLighting", "Environment Lighting")}
                  </p>

                  {/* Environment Preset Grid with Previews */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t("toolbar.preset", "Preset")}
                    </Label>
                    <div className="grid grid-cols-5 gap-1">
                      {ENVIRONMENT_PRESETS.map((preset) => (
                        <Tooltip key={preset.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setViewportSettings({ environmentPreset: preset.id })}
                              className={cn(
                                "relative w-8 h-8 rounded-2xl overflow-hidden border-2 transition-all",
                                "hover:scale-110 hover:z-10",
                                (viewportSettings.environmentPreset ?? "apartment") === preset.id
                                  ? "border-primary ring-1 ring-primary/50"
                                  : "border-transparent hover:border-muted-foreground/30"
                              )}
                            >
                              <img
                                src={getHdriPreviewUrl(preset.hdriId)}
                                alt={preset.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {preset.name}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  {/* Environment Intensity Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        {t("toolbar.intensity", "Intensity")}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {(viewportSettings.environmentIntensity ?? 1).toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[viewportSettings.environmentIntensity ?? 1]}
                      onValueChange={([value]) =>
                        setViewportSettings({ environmentIntensity: value })
                      }
                      min={0}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Environment Background Toggle */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="envBackground" className="text-xs font-normal">
                      {t("toolbar.showAsBackground", "Show as Background")}
                    </Label>
                    <Switch
                      id="envBackground"
                      checked={viewportSettings.environmentBackground ?? false}
                      onCheckedChange={(checked) =>
                        setViewportSettings({ environmentBackground: checked })
                      }
                    />
                  </div>

                  {/* Background Blur Slider (only when background is enabled) */}
                  {(viewportSettings.environmentBackground ?? false) && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          {t("toolbar.backgroundBlur", "Background Blur")}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {(viewportSettings.backgroundBlurriness ?? 0.5).toFixed(1)}
                        </span>
                      </div>
                      <Slider
                        value={[viewportSettings.backgroundBlurriness ?? 0.5]}
                        onValueChange={([value]) =>
                          setViewportSettings({ backgroundBlurriness: value })
                        }
                        min={0}
                        max={1}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>

      {/* Parameter Dialog (Fillet, Chamfer, Shell) */}
      <Dialog
        open={parameterDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setParameterDialog({ open: false, operation: null, value: "" })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {parameterDialog.operation === "fillet" &&
                t("toolbar.filletTitle", "Fillet (Round Edges)")}
              {parameterDialog.operation === "chamfer" &&
                t("toolbar.chamferTitle", "Chamfer (Bevel Edges)")}
              {parameterDialog.operation === "shell" &&
                t("toolbar.shellTitle", "Shell (Hollow Out)")}
            </DialogTitle>
            <DialogDescription>
              {parameterDialog.operation === "fillet" &&
                t("toolbar.filletDesc", "Enter the radius for rounding edges")}
              {parameterDialog.operation === "chamfer" &&
                t("toolbar.chamferDesc", "Enter the distance for beveling edges")}
              {parameterDialog.operation === "shell" &&
                t("toolbar.shellDesc", "Enter the wall thickness")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="parameter-value">
                {parameterDialog.operation === "fillet" && t("toolbar.radius", "Radius")}
                {parameterDialog.operation === "chamfer" && t("toolbar.distance", "Distance")}
                {parameterDialog.operation === "shell" && t("toolbar.thickness", "Thickness")}
              </Label>
              <Input
                id="parameter-value"
                type="number"
                step="0.1"
                min="0.01"
                value={parameterDialog.value}
                onChange={(e) =>
                  setParameterDialog((prev) => ({
                    ...prev,
                    value: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleApplyParameterOperation()
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setParameterDialog({ open: false, operation: null, value: "" })}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleApplyParameterOperation}>{t("common.apply", "Apply")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Measure Results Dialog */}
      <Dialog
        open={measureDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setMeasureDialog({ open: false, title: "", results: [] })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{measureDialog.title}</DialogTitle>
            <DialogDescription>
              {t("toolbar.measureResults", "Measurement results")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {measureDialog.results.map((result, index) => (
              <div
                key={index}
                className="flex justify-between items-center border-b border-border/40 pb-2 last:border-0"
              >
                <span className="text-sm font-medium text-muted-foreground">{result.label}</span>
                <span className="text-sm font-mono">{result.value}</span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setMeasureDialog({ open: false, title: "", results: [] })}>
              {t("common.close", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ViewportToolbar
