/**
 * Viewport Overlays - CADHY
 *
 * Floating UI overlays inside the 3D viewport:
 * - Left vertical toolbar (comprehensive Create panel with all primitives, hydraulics, settings)
 * - Bottom toolbar (selection modes, view modes, operations)
 */

import {
  cn,
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
  MoreHorizontalIcon,
  Move01Icon,
  Resize01Icon,
  Rotate01Icon,
  SquareIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import { useCADOperationsContext } from "@/components/modeller/dialogs"
import { getPlatformSync } from "@/hooks/use-platform"
import {
  type TransformMode,
  useBoxSelectMode,
  useModellerStore,
  useSelectedObjects,
  useSelectionMode,
  useTransformMode,
  useViewportSettings,
} from "@/stores/modeller"
import {
  BooleanIcon,
  ControlPointIcon,
  CutIcon,
  DeleteIcon,
  DuplicateIcon,
  EdgeIcon,
  ExtrudeIcon,
  FaceIcon,
  FilletIcon,
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

/**
 * SmartIcon - Renders either a Hugeicons data object or a React component
 */
function SmartIcon({ icon, className, color }: { icon: any; className?: string; color?: string }) {
  if (!icon) return null
  const isHugeiconData =
    typeof icon === "object" && icon !== null && !("$$typeof" in icon) && !("displayName" in icon)

  if (isHugeiconData) {
    return <HugeiconsIcon icon={icon} className={cn(className, color)} />
  }

  const IconComponent = icon
  return <IconComponent className={cn(className, color)} />
}

// ============================================================================
// SHARED UI COMPONENTS
// ============================================================================

interface ToolbarButtonProps {
  icon: any
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
  const isMac = getPlatformSync() === "macos"
  const formattedShortcut = shortcut
    ? shortcut.replace("⇧", isMac ? "\u21E7" : "Shift+").replace("Alt+", isMac ? "\u2325" : "Alt+")
    : null

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
        {formattedShortcut && <Kbd className="h-4 min-w-4 text-xs">{formattedShortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

function _CadIconButton({
  icon,
  label,
  shortcut,
  active,
  color,
  onClick,
}: {
  icon: any
  label: string
  shortcut?: string
  active?: boolean
  color?: string
  onClick?: () => void
}) {
  const isMac = getPlatformSync() === "macos"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[10px] transition-all duration-200 group text-left",
        "hover:bg-accent text-muted-foreground hover:text-foreground",
        active && "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40"
      )}
    >
      <SmartIcon
        icon={icon}
        className="size-4 group-hover:scale-110 transition-transform"
        color={color}
      />
      <span className="text-xs font-medium flex-1">{label}</span>
      {shortcut && (
        <span className="text-xs text-muted-foreground group-hover:text-foreground border border-border bg-muted px-1 rounded-2xl py-0.25">
          {shortcut.replace("⇧", isMac ? "\u21E7" : "Shift+")}
        </span>
      )}
    </button>
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
          label="Select (Q)"
          shortcut="Q"
          active={transformMode === "none" && !isBoxSelectMode}
          onClick={() => handleTransformMode("none")}
        />
        <ToolbarButton
          side="right"
          icon={SquareIcon}
          label="Box Select (B)"
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

  // CAD Operations context
  const { openOperationDialog } = useCADOperationsContext()

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
    selectedObjects.forEach((obj) => deleteObject(obj.id))
    setOperationsOpen(false)
  }

  const handleOperation = useCallback(
    (operationId: string) => {
      setOperationsOpen(false)

      if (selectedObjects.length === 0) {
        toast.error("No objects selected. Select an object first.")
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
        case "mirror":
          toast.info("Mirror operation - Coming soon!")
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
    [selectedObjects, openOperationDialog]
  )

  const operations = [
    {
      id: "mirror",
      icon: MirrorIcon,
      label: "Mirror",
      shortcut: "X",
      onClick: () => handleOperation("mirror"),
    },
    {
      id: "fillet",
      icon: FilletIcon,
      label: "Fillet",
      shortcut: "F",
      onClick: () => handleOperation("fillet"),
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
        <ToolbarButton side="top" icon={BooleanIcon} label="Boolean Ops" shortcut="B" />
        <ToolbarButton side="top" icon={CutIcon} label="Cut / Split" shortcut="K" />
      </div>

      <Separator orientation="vertical" className="h-6 bg-border/50 mx-1" />

      {/* Destructive Quick Action */}
      <div className="flex items-center px-1">
        <ToolbarButton
          side="top"
          icon={DeleteIcon}
          label="Delete Selection"
          shortcut="X"
          disabled={selectedObjects.length === 0}
          onClick={handleDelete}
        />
      </div>

      <Separator orientation="vertical" className="h-6 bg-border/50 mx-1" />

      {/* Overflow Operations */}
      <Popover open={operationsOpen} onOpenChange={setOperationsOpen}>
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
            {operations.map((op) => (
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
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 bg-border/50 mx-1" />

      {/* Render Mode Select (Plasticity-Style) */}
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
                <span className="text-xs text-muted-foreground/50 font-mono">{mode.shortcut}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function ViewportOverlays({ className }: ViewportOverlaysProps) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      <SelectionToolbar />
      <LeftToolbar />
      <BottomToolbar />
    </div>
  )
}

export default ViewportOverlays
