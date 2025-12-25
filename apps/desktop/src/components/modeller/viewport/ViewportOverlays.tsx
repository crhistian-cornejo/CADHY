/**
 * Viewport Overlays - CADHY
 *
 * Floating UI overlays inside the 3D viewport:
 * - Left vertical toolbar (comprehensive Create panel with all primitives, hydraulics, settings)
 * - Bottom toolbar (selection modes, view modes, operations)
 */

import type { ProjectionType, SheetConfig } from "@cadhy/types"
import {
  cn,
  formatKbd,
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
  Cursor01Icon,
  DrawingModeIcon,
  MoreHorizontalIcon,
  Move01Icon,
  Resize01Icon,
  Rotate01Icon,
  SquareIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { type ComponentType, useCallback, useEffect, useState } from "react"
import { DrawingConfigDialog, useCADOperationsContext } from "@/components/modeller/dialogs"
import { shapeIdMap } from "@/hooks/use-cad"
import * as cadService from "@/services/cad-service"
import { useDrawingStore } from "@/stores/drawing-store"
import type { AnySceneObject, ShapeObject } from "@/stores/modeller"
import {
  type TransformMode,
  useBoxSelectMode,
  useModellerStore,
  useSelectedObjects,
  useSelectionMode,
  useTransformMode,
  useViewportSettings,
} from "@/stores/modeller"
import { useNavigationStore } from "@/stores/navigation-store"
import { getModelMetersToDrawingUnitsFactor } from "@/utils/drawing-units"
import {
  BooleanIcon,
  ControlPointIcon,
  CutIcon,
  DeleteIcon,
  DifferenceIcon,
  DuplicateIcon,
  EdgeIcon,
  ExtrudeIcon,
  FaceIcon,
  FilletIcon,
  IntersectionIcon,
  MirrorIcon,
  PerspectiveViewIcon,
  PipeIcon,
  RenderModeIcon,
  SolidIcon,
  XRayIcon,
} from "./CadIcons"

// ============================================================================
// TYPES & HELPERS
// ============================================================================

interface ViewportOverlaysProps {
  className?: string
  onOpenSearch?: () => void
}

/** Icon type that can be a Hugeicons data object or a React component */
type IconType = IconSvgElement | ComponentType<{ className?: string }>

/**
 * SmartIcon - Renders either a Hugeicons data object or a React component
 */
function SmartIcon({
  icon,
  className,
  color,
}: {
  icon: IconType
  className?: string
  color?: string
}) {
  if (!icon) return null
  if (typeof icon === "function") {
    const IconComponent = icon as ComponentType<{ className?: string }>
    return <IconComponent className={cn(className, color)} />
  }

  return <HugeiconsIcon icon={icon as IconSvgElement} className={cn(className, color)} />
}

// ============================================================================
// SHARED UI COMPONENTS
// ============================================================================

interface ToolbarButtonProps {
  icon: IconType
  label: string
  shortcut?: string
  active?: boolean
  color?: string
  side?: "right" | "top" | "bottom" | "left"
  disabled?: boolean
  onClick?: () => void
}

/**
 * Toolbar Button - Ultra-compact (w-7 h-7) matching Plasticity Density
 */
function ToolbarButton({
  icon,
  label,
  shortcut,
  active,
  color,
  side = "right",
  disabled,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "w-7.5 h-7.5 flex items-center justify-center rounded-[10px] transition-all duration-200 outline-none",
            "text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 disabled:pointer-events-none",
            active && "bg-secondary text-secondary-foreground"
          )}
        >
          <SmartIcon icon={icon} className="size-3.5" color={color} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={8} className="flex items-center gap-2 px-2 py-1">
        <span className="text-xs">{label}</span>
        {shortcut && (
          <Kbd variant="inverted" className="h-4 min-w-4 text-xs">
            {formatKbd(shortcut)}
          </Kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// TOP LEFT - SELECTION MODES TOOLBAR (PLASTICITY STYLE)
// ============================================================================

function SelectionToolbar() {
  const selectionMode = useSelectionMode()
  const { setSelectionMode } = useModellerStore()

  return (
    <div className="absolute left-3 top-3 flex items-center gap-0.5 p-0.5 rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-xl pointer-events-auto">
      <ToolbarButton
        side="bottom"
        icon={ControlPointIcon}
        label="Vertex Selection"
        shortcut="1"
        active={selectionMode === "vertex"}
        onClick={() => setSelectionMode("vertex")}
      />
      <ToolbarButton
        side="bottom"
        icon={EdgeIcon}
        label="Edge Selection"
        shortcut="2"
        active={selectionMode === "edge"}
        onClick={() => setSelectionMode("edge")}
      />
      <ToolbarButton
        side="bottom"
        icon={FaceIcon}
        label="Face Selection"
        shortcut="3"
        active={selectionMode === "face"}
        onClick={() => setSelectionMode("face")}
      />
      <ToolbarButton
        side="bottom"
        icon={SolidIcon}
        label="Body Selection"
        shortcut="4"
        active={selectionMode === "body"}
        onClick={() => setSelectionMode("body")}
      />
    </div>
  )
}

// ============================================================================
// LEFT VERTICAL TOOLBAR - COMPREHENSIVE CREATE PANEL
// ============================================================================

function LeftToolbar() {
  const transformMode = useTransformMode()
  const isBoxSelectMode = useBoxSelectMode()
  const { setTransformMode, setBoxSelectMode } = useModellerStore()

  const handleTransformMode = useCallback(
    (mode: TransformMode) => {
      setTransformMode(mode)
    },
    [setTransformMode]
  )

  return (
    <div className="absolute left-3 top-[55%] -translate-y-1/2 flex flex-col items-center gap-0.5 p-1.5 rounded-2xl bg-background/95 backdrop-blur-md border border-border/50 shadow-xl pointer-events-auto">
      {/* Selection & Transformation Tools */}
      <div className="flex flex-col gap-0.5 items-center">
        <ToolbarButton
          side="right"
          icon={Cursor01Icon}
          label="Select"
          shortcut="Q"
          active={transformMode === "none" && !isBoxSelectMode}
          onClick={() => handleTransformMode("none")}
        />
        <ToolbarButton
          side="right"
          icon={SquareIcon}
          label="Box Select"
          shortcut="B"
          active={isBoxSelectMode}
          onClick={() => {
            setBoxSelectMode(!isBoxSelectMode)
            setTransformMode("none")
          }}
        />

        <Separator className="w-6 bg-border/50 my-1" />

        <ToolbarButton
          icon={Move01Icon}
          label="Move"
          shortcut="G"
          active={transformMode === "translate"}
          onClick={() => handleTransformMode("translate")}
        />
        <ToolbarButton
          icon={Rotate01Icon}
          label="Rotate"
          shortcut="R"
          active={transformMode === "rotate"}
          onClick={() => handleTransformMode("rotate")}
        />
        <ToolbarButton
          icon={Resize01Icon}
          label="Scale"
          shortcut="S"
          active={transformMode === "scale"}
          onClick={() => handleTransformMode("scale")}
        />
      </div>
    </div>
  )
}

// ============================================================================
// BOTTOM TOOLBAR - MODES & OPERATIONS
// ============================================================================

function BottomToolbar() {
  const [operationsOpen, setOperationsOpen] = useState(false)
  const [mirrorMenuOpen, setMirrorMenuOpen] = useState(false)
  const [mirrorKeepOriginal, setMirrorKeepOriginal] = useState(true)

  // CAD Operations context
  const {
    openOperationDialog,
    executeBooleanUnion,
    executeBooleanSubtract,
    executeBooleanIntersect,
    executeMirror,
  } = useCADOperationsContext()

  // Transform settings
  const viewportSettings = useViewportSettings()
  const { setViewportSettings, deleteObject } = useModellerStore()

  // Selection
  const selectedObjects = useSelectedObjects()

  const handleViewMode = (mode: string) => {
    if (mode === "xray") {
      setViewportSettings({
        viewMode: viewportSettings.viewMode === "xray" ? "solid" : "xray",
      })
    }
  }

  const handleDelete = () => {
    selectedObjects.forEach((obj) => {
      deleteObject(obj.id)
    })
    setOperationsOpen(false)
  }

  const handleOperation = useCallback(
    async (operationId: string) => {
      setOperationsOpen(false)

      // Boolean operations need at least 2 objects
      const minSelection = ["union", "subtract", "intersect"].includes(operationId) ? 2 : 1

      if (selectedObjects.length < minSelection) {
        if (minSelection === 2) {
          toast.error("Selecciona al menos 2 objetos para operaciones booleanas.")
        } else {
          toast.error("No objects selected. Select an object first.")
        }
        return
      }

      switch (operationId) {
        case "fillet":
          openOperationDialog("fillet")
          break
        case "chamfer":
          openOperationDialog("chamfer")
          break
        case "shell":
          openOperationDialog("shell")
          break
        case "union":
          await executeBooleanUnion()
          break
        case "subtract":
          await executeBooleanSubtract()
          break
        case "intersect":
          await executeBooleanIntersect()
          break
        case "mirror":
          // Mirror is handled by the submenu, this is fallback
          setMirrorMenuOpen(true)
          return // Don't close operations popover
        case "mirror-yz":
          await executeMirror("yz", mirrorKeepOriginal)
          setMirrorMenuOpen(false)
          break
        case "mirror-xz":
          await executeMirror("xz", mirrorKeepOriginal)
          setMirrorMenuOpen(false)
          break
        case "mirror-xy":
          await executeMirror("xy", mirrorKeepOriginal)
          setMirrorMenuOpen(false)
          break
        case "duplicate":
          toast.info("Duplicate operation - Coming soon!")
          break
        case "pipe":
          toast.info("Pipe operation - Coming soon!")
          break
        default:
          toast.error(`Unknown operation: ${operationId}`)
      }
    },
    [
      selectedObjects,
      openOperationDialog,
      executeBooleanUnion,
      executeBooleanSubtract,
      executeBooleanIntersect,
      executeMirror,
      mirrorKeepOriginal,
    ]
  )

  const operations = [
    // Boolean operations (Subtract & Intersect - Union is in toolbar)
    {
      id: "subtract",
      icon: DifferenceIcon,
      label: "Subtract",
      shortcut: "⇧S",
      onClick: () => handleOperation("subtract"),
    },
    {
      id: "intersect",
      icon: IntersectionIcon,
      label: "Intersect",
      shortcut: "I",
      onClick: () => handleOperation("intersect"),
    },
    // Modification operations
    {
      id: "fillet",
      icon: FilletIcon,
      label: "Fillet",
      shortcut: "F",
      onClick: () => handleOperation("fillet"),
    },
    {
      id: "mirror",
      icon: MirrorIcon,
      label: "Mirror",
      shortcut: "X",
      onClick: () => handleOperation("mirror"),
    },
    {
      id: "duplicate",
      icon: DuplicateIcon,
      label: "Duplicate",
      shortcut: "D",
      onClick: () => handleOperation("duplicate"),
    },
    {
      id: "pipe",
      icon: PipeIcon,
      label: "Pipe",
      shortcut: "P",
      onClick: () => handleOperation("pipe"),
    },
  ]

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-1 rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-xl pointer-events-auto">
      {/* View Display Modes */}
      <div className="flex items-center gap-0.5 px-1">
        <ToolbarButton
          side="top"
          icon={XRayIcon}
          label="Toggle X-Ray"
          shortcut="Alt+3"
          active={viewportSettings.viewMode === "xray"}
          onClick={() => handleViewMode("xray")}
        />
        <ToolbarButton
          side="top"
          icon={PerspectiveViewIcon}
          label="Switch View"
          shortcut="5"
          active={false}
          onClick={() => {}}
        />
      </div>

      <Separator orientation="vertical" className="h-6 bg-border/50 mx-1" />

      {/* Core Modeling Ops */}
      <div className="flex items-center gap-0.5 px-1">
        <ToolbarButton side="top" icon={ExtrudeIcon} label="Extrude" shortcut="E" />
        <ToolbarButton
          side="top"
          icon={BooleanIcon}
          label="Union"
          shortcut="U"
          disabled={selectedObjects.filter((o) => o.type === "shape").length < 2}
          onClick={() => handleOperation("union")}
        />
        <ToolbarButton side="top" icon={CutIcon} label="Cut / Split" shortcut="K" />
      </div>

      <Separator orientation="vertical" className="h-6 bg-border/50 mx-1" />

      {/* Overflow Operations */}
      <Popover open={operationsOpen} onOpenChange={setOperationsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-7.5 h-7.5 flex items-center justify-center rounded-[10px] transition-all duration-200 outline-none",
                  "text-muted-foreground hover:bg-muted hover:text-foreground",
                  operationsOpen && "bg-secondary text-secondary-foreground"
                )}
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} className="size-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <span className="text-xs">More Operations</span>
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          side="top"
          align="center"
          sideOffset={12}
          className="w-56 p-2 bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl rounded-2xl"
        >
          <div className="space-y-0.5 p-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-2">
              All Operations
            </p>
            {operations.map((op) =>
              op.id === "mirror" ? (
                // Mirror has a submenu for plane selection
                <Popover key={op.id} open={mirrorMenuOpen} onOpenChange={setMirrorMenuOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-muted transition-all text-left group",
                        mirrorMenuOpen && "bg-muted"
                      )}
                    >
                      <SmartIcon
                        icon={op.icon}
                        className="size-4 text-muted-foreground group-hover:text-foreground"
                      />
                      <span className="text-xs font-medium flex-1 text-muted-foreground group-hover:text-foreground">
                        {op.label}
                      </span>
                      <span className="text-muted-foreground/50">▸</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={4}
                    className="w-44 p-1.5 bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl"
                  >
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 py-1">
                        Mirror Plane
                      </p>
                      {[
                        { id: "mirror-yz", label: "YZ Plane", desc: "Flip X" },
                        { id: "mirror-xz", label: "XZ Plane", desc: "Flip Y" },
                        { id: "mirror-xy", label: "XY Plane", desc: "Flip Z" },
                      ].map((plane) => (
                        <button
                          key={plane.id}
                          type="button"
                          onClick={() => handleOperation(plane.id)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-muted transition-all text-left group"
                        >
                          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                            {plane.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">{plane.desc}</span>
                        </button>
                      ))}
                      <Separator className="my-1" />
                      <button
                        type="button"
                        onClick={() => setMirrorKeepOriginal(!mirrorKeepOriginal)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-muted transition-all text-left group"
                      >
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                          Keep Original
                        </span>
                        <span
                          className={cn(
                            "size-3.5 rounded border transition-all flex items-center justify-center",
                            mirrorKeepOriginal
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {mirrorKeepOriginal && <span className="text-[8px] font-bold">✓</span>}
                        </span>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <button
                  type="button"
                  key={op.id}
                  onClick={op.onClick}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-muted transition-all text-left group"
                >
                  <SmartIcon
                    icon={op.icon}
                    className="size-4 text-muted-foreground group-hover:text-foreground"
                  />
                  <span className="text-xs font-medium flex-1 text-muted-foreground group-hover:text-foreground">
                    {op.label}
                  </span>
                  {op.shortcut && (
                    <Kbd className="bg-muted border-border/50 text-muted-foreground group-hover:text-foreground">
                      {op.shortcut}
                    </Kbd>
                  )}
                </button>
              )
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 bg-border/50 mx-1" />

      {/* Render Mode Select (Plasticity-Style) */}
      <div className="flex items-center px-1">
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-7.5 h-7.5 flex items-center justify-center rounded-[10px] transition-all duration-200 outline-none",
                    "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <RenderModeIcon className="size-3.5" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              <span className="text-xs">Render Quality</span>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            side="top"
            align="center"
            sideOffset={12}
            className="w-44 p-1.5 bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl"
          >
            <div className="space-y-0.5">
              <p className="section-label px-2 py-1">Render Quality</p>
              {[
                { id: "low", name: "Draft", shortcut: "1" },
                { id: "medium", name: "Modeling", shortcut: "2" },
                { id: "high", name: "Real-time", shortcut: "3" },
                { id: "ultra", name: "Cinematic", shortcut: "4" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    setViewportSettings({
                      postProcessingQuality: mode.id as "low" | "medium" | "high" | "ultra",
                    })
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-2xl transition-all text-left group",
                    "hover:bg-accent text-muted-foreground hover:text-foreground",
                    viewportSettings.postProcessingQuality === mode.id &&
                      "bg-primary/15 text-primary ring-1 ring-primary/30"
                  )}
                >
                  <span className="text-xs font-medium">{mode.name}</span>
                  <span className="text-xs text-muted-foreground/50 font-mono">
                    {mode.shortcut}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Separator orientation="vertical" className="h-6 bg-border/50 mx-1" />

      {/* Delete - at the end */}
      <div className="flex items-center px-1">
        <ToolbarButton
          side="top"
          icon={DeleteIcon}
          label="Delete Selection"
          shortcut="Del"
          disabled={selectedObjects.length === 0}
          onClick={handleDelete}
        />
      </div>
    </div>
  )
}

// ============================================================================
// RIGHT VERTICAL TOOLBAR - DOCUMENTATION & DRAWINGS
// ============================================================================

interface RightToolbarProps {
  onOpenDialog: () => void
  isDialogOpen: boolean
  isDrawingSelectionPending: boolean
  onStartDrawingSelection: () => void
}

function RightToolbar({
  onOpenDialog,
  isDialogOpen,
  isDrawingSelectionPending,
  onStartDrawingSelection,
}: RightToolbarProps) {
  const selectedObjects = useSelectedObjects()

  const handleCreateDrawing = useCallback(() => {
    // Check if shapes are selected
    const shapeObjects = selectedObjects.filter((obj) => obj.type === "shape")

    if (shapeObjects.length === 0) {
      // No shapes selected - start selection mode
      onStartDrawingSelection()
      return
    }

    // Shapes are selected - open dialog directly
    onOpenDialog()
  }, [selectedObjects, onOpenDialog, onStartDrawingSelection])

  return (
    <div className="absolute right-3 top-[55%] -translate-y-1/2 flex flex-col items-center gap-0.5 p-1.5 rounded-2xl bg-background/95 backdrop-blur-md border border-border/50 shadow-xl pointer-events-auto">
      <ToolbarButton
        side="left"
        icon={DrawingModeIcon}
        label="Dibujos"
        shortcut="⌘D"
        active={isDialogOpen || isDrawingSelectionPending}
        onClick={handleCreateDrawing}
      />
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a shape in the backend from its parameters
 * ALWAYS creates a new shape to avoid sync issues between frontend/backend
 * Returns the backend shape ID if successful, null otherwise
 */
async function createShapeInBackend(obj: AnySceneObject): Promise<string | null> {
  if (obj.type !== "shape") return null

  const shape = obj as ShapeObject
  const shapeType = shape.shapeType
  const params = shape.parameters || {}

  if (!shapeType) {
    console.warn(`[Drawing] Cannot create shape "${obj.name}": missing shapeType`)
    return null
  }

  try {
    let result: cadService.ShapeResult | null = null
    const pos = shape.transform?.position || { x: 0, y: 0, z: 0 }

    switch (shapeType) {
      case "box":
        result = await cadService.createBoxAt(
          pos.x,
          pos.y,
          pos.z,
          params.width || 1,
          params.depth || 1,
          params.height || 1
        )
        break
      case "cylinder":
        result = await cadService.createCylinderAt(
          pos.x,
          pos.y,
          pos.z,
          params.radius || 0.5,
          params.height || 1,
          0,
          0,
          1 // Default axis (Z-up)
        )
        break
      case "sphere":
        result = await cadService.createSphereAt(pos.x, pos.y, pos.z, params.radius || 0.5)
        break
      case "cone":
        result = await cadService.createCone(params.radius || 0.5, params.height || 1)
        break
      case "torus":
        result = await cadService.createTorus(params.majorRadius || 1, params.minorRadius || 0.25)
        break
      case "wedge":
        result = await cadService.createWedge(
          params.width || 1,
          params.depth || 1,
          params.height || 1,
          params.ltx || 0
        )
        break
      case "pyramid":
        result = await cadService.createPyramid(
          params.sides || 4,
          params.radius || 0.5,
          params.height || 1
        )
        break
      case "ellipsoid":
        result = await cadService.createEllipsoid(
          params.radiusX || 1,
          params.radiusY || 0.75,
          params.radiusZ || 0.5
        )
        break
      default:
        console.warn(`[Drawing] Unsupported shape type for drawing: ${shapeType}`)
        return null
    }

    if (result) {
      console.log(`[Drawing] Created shape "${obj.name}" in backend with ID: ${result.id}`)
      // Update the mapping for future use
      shapeIdMap.set(obj.id, result.id)
      return result.id
    }
  } catch (error) {
    console.error(`[Drawing] Failed to create shape "${obj.name}" in backend:`, error)
    console.error(`[Drawing] Shape details:`, { shapeType, params, pos })
  }

  return null
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ViewportOverlays({ className }: ViewportOverlaysProps) {
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [isDrawingSelectionPending, setIsDrawingSelectionPending] = useState(false)
  const selectedObjects = useSelectedObjects()
  const createDrawing = useDrawingStore((s) => s.createDrawing)
  const generateStandardViews = useDrawingStore((s) => s.generateStandardViews)
  const generateProjection = useDrawingStore((s) => s.generateProjection)
  const setActiveDrawing = useDrawingStore((s) => s.setActiveDrawing)
  const addView = useDrawingStore((s) => s.addView)

  // Watch for shape selection when in drawing selection mode
  useEffect(() => {
    if (!isDrawingSelectionPending) return

    const shapeObjects = selectedObjects.filter((obj) => obj.type === "shape")
    if (shapeObjects.length > 0) {
      // User selected a shape - open dialog automatically
      setIsDrawingSelectionPending(false)
      setIsConfigDialogOpen(true)
    }
  }, [selectedObjects, isDrawingSelectionPending])

  const handleStartDrawingSelection = useCallback(() => {
    setIsDrawingSelectionPending(true)
    toast.info("Selecciona un sólido para crear el dibujo", {
      duration: 5000,
    })
  }, [])

  const handleCancelDrawingSelection = useCallback(() => {
    setIsDrawingSelectionPending(false)
  }, [])

  const handleConfigConfirm = useCallback(
    async (config: SheetConfig, drawingName: string, includeFourViews: boolean) => {
      // Filter to shape objects only (primitivas CAD)
      const shapeObjects = selectedObjects.filter((obj) => obj.type === "shape")

      if (shapeObjects.length === 0) {
        // Check if user selected hydraulic elements
        const hydraulicObjects = selectedObjects.filter(
          (obj) => obj.type === "channel" || obj.type === "transition" || obj.type === "chute"
        )
        if (hydraulicObjects.length > 0) {
          toast.error(
            "Los canales, transiciones y caídas aún no soportan dibujos técnicos. " +
              "Usa primitivas CAD (caja, cilindro, esfera, etc.)."
          )
        } else {
          toast.error("Selecciona un sólido CAD para crear el dibujo")
        }
        return
      }

      try {
        const backendShapeIds: string[] = []

        for (const obj of shapeObjects) {
          // First try to get existing backend ID
          let backendId = shapeIdMap.get(obj.id)
          if (!backendId && obj.metadata?.backendShapeId) {
            backendId = obj.metadata.backendShapeId as string
          }

          // If we have a backend ID, verify it exists or recreate
          if (backendId) {
            const exists = await cadService.shapeExists(backendId)
            if (exists) {
              backendShapeIds.push(backendId)
              continue
            }
          }

          // No valid backend ID - try to create shape from parameters
          const newId = await createShapeInBackend(obj)
          if (newId) {
            backendShapeIds.push(newId)
          } else {
            const shape = obj as ShapeObject
            toast.error(`No se pudo recrear "${obj.name}" (${shape.shapeType || "?"})`)
          }
        }

        if (backendShapeIds.length === 0) {
          toast.error("No hay sólidos válidos para crear el dibujo")
          return
        }

        // Create drawing with the provided name
        const finalName = drawingName || `Dibujo ${new Date().toLocaleDateString()}`
        const drawingId = createDrawing(finalName, config, backendShapeIds)

        // Unit factor for scale conversion
        const unitFactor = getModelMetersToDrawingUnitsFactor(config.units)

        if (includeFourViews) {
          // Generate standard 4 views (Front, Left, Top, Isometric)
          const projections = await generateStandardViews(
            backendShapeIds[0],
            config.scale * unitFactor
          )

          // Add views in 2x2 grid layout
          const viewTypes: ProjectionType[] = ["Front", "Left", "Top", "Isometric"]
          projections.forEach((projection, index) => {
            const col = index % 2
            const row = Math.floor(index / 2)
            const position: [number, number] = [col * 200 - 100, row * -200 + 100]
            addView(drawingId, viewTypes[index] as ProjectionType, projection, position)
          })
        } else {
          // Generate only front view
          const projection = await generateProjection(
            backendShapeIds[0],
            "Front",
            config.scale * unitFactor
          )
          addView(drawingId, "Front", projection, [0, 0])
        }

        setActiveDrawing(drawingId)
        setIsConfigDialogOpen(false)

        // Navigate to drawings view
        useNavigationStore.getState().setView("drawings")

        toast.success("Dibujo creado exitosamente")
      } catch (error) {
        toast.error(
          `Error al crear dibujo: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
    [
      selectedObjects,
      createDrawing,
      generateStandardViews,
      generateProjection,
      setActiveDrawing,
      addView,
    ]
  )

  return (
    <>
      <div className={cn("absolute inset-0 pointer-events-none", className)}>
        <SelectionToolbar />
        <LeftToolbar />
        <BottomToolbar />
        <RightToolbar
          onOpenDialog={() => setIsConfigDialogOpen(true)}
          isDialogOpen={isConfigDialogOpen}
          isDrawingSelectionPending={isDrawingSelectionPending}
          onStartDrawingSelection={handleStartDrawingSelection}
        />

        {/* Drawing Selection Mode Overlay */}
        {isDrawingSelectionPending && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-primary/95 backdrop-blur-md border border-primary/50 shadow-xl pointer-events-auto">
            <span className="text-sm font-medium text-primary-foreground">
              Selecciona cuerpos de referencia para incluirlos en el dibujo
            </span>
            <button
              type="button"
              onClick={handleCancelDrawingSelection}
              className="px-3 py-1 text-xs font-medium text-primary-foreground/80 hover:text-primary-foreground rounded-lg hover:bg-primary-foreground/10 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
      {/* Render dialogs outside pointer-events-none container */}
      <DrawingConfigDialog
        open={isConfigDialogOpen}
        onOpenChange={(open) => {
          setIsConfigDialogOpen(open)
          if (!open) setIsDrawingSelectionPending(false)
        }}
        onConfirm={handleConfigConfirm}
      />
    </>
  )
}

export default ViewportOverlays
