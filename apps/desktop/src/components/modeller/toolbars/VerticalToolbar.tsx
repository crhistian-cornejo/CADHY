/**
 * Vertical Toolbar Component - CADHY
 *
 * Left-side vertical toolbar inspired by Plasticity with:
 * - Transform tools (Select, Move, Rotate, Scale)
 * - Creation tools (Primitives, Channels)
 * - Tool panels in popovers
 * - Keyboard shortcuts with Kbd hints
 *
 * This provides quick access to common tools without cluttering the viewport.
 */

import {
  Button,
  cn,
  Kbd,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  Add01Icon,
  ArrowDown01Icon,
  CircleIcon,
  CubeIcon,
  Cursor01Icon,
  Cylinder01Icon,
  Layers01Icon,
  Move01Icon,
  Resize01Icon,
  Rotate01Icon,
  RulerIcon,
  Settings01Icon,
  SquareIcon,
  TriangleIcon,
  WaterEnergyIcon,
  WaterfallDown01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { getPlatformSync } from "@/hooks/use-platform"
import {
  type TransformMode,
  useBoxSelectMode,
  useModellerStore,
  useTransformMode,
} from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface VerticalToolbarProps {
  className?: string
  onOpenCreatePanel?: () => void
  onOpenToolsPanel?: () => void
}

type PrimitiveType = "box" | "cylinder" | "sphere" | "cone" | "torus"
type HydraulicType = "channel" | "transition" | "chute"

// ============================================================================
// TOOL BUTTON
// ============================================================================

interface ToolButtonProps {
  icon: typeof CubeIcon
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  variant?: "default" | "primary" | "cyan" | "green" | "amber"
}

function ToolButton({
  icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
  variant = "default",
}: ToolButtonProps) {
  const variantClasses = {
    default: active ? "bg-primary/20 text-primary" : "",
    primary: active ? "bg-primary text-primary-foreground" : "",
    cyan: active ? "bg-cyan-500/20 text-cyan-500" : "hover:text-cyan-500",
    green: active ? "bg-green-500/20 text-green-500" : "hover:text-green-500",
    amber: active ? "bg-amber-500/20 text-amber-500" : "hover:text-amber-500",
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "h-8 w-8 transition-all",
            variantClasses[variant],
            active && "ring-1 ring-current/30"
          )}
        >
          <HugeiconsIcon icon={icon} className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <Kbd className="ml-1">
            {shortcut.replace("⇧", getPlatformSync() === "macos" ? "\u21E7" : "Shift+")}
          </Kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// CREATE POPOVER
// ============================================================================

interface CreatePopoverProps {
  onCreatePrimitive: (type: PrimitiveType) => void
  onCreateHydraulic: (type: HydraulicType) => void
}

function CreatePopover({ onCreatePrimitive, onCreateHydraulic }: CreatePopoverProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const primitives: {
    type: PrimitiveType
    icon: typeof CubeIcon
    label: string
    shortcut: string
  }[] = [
    { type: "box", icon: CubeIcon, label: t("createPanel.box"), shortcut: "⇧B" },
    { type: "cylinder", icon: Cylinder01Icon, label: t("createPanel.cylinder"), shortcut: "⇧Y" },
    { type: "sphere", icon: CircleIcon, label: t("createPanel.sphere"), shortcut: "⇧P" },
    { type: "cone", icon: TriangleIcon, label: t("createPanel.cone"), shortcut: "⇧O" },
    { type: "torus", icon: CircleIcon, label: t("createPanel.torus"), shortcut: "⇧U" },
  ]

  const hydraulics: {
    type: HydraulicType
    icon: typeof WaterEnergyIcon
    label: string
    shortcut: string
    color: string
  }[] = [
    {
      type: "channel",
      icon: WaterEnergyIcon,
      label: t("createPanel.openChannel"),
      shortcut: "⇧C",
      color: "text-cyan-500",
    },
    {
      type: "transition",
      icon: WaterfallDown01Icon,
      label: t("createPanel.transition", "Transition"),
      shortcut: "⇧T",
      color: "text-green-500",
    },
    {
      type: "chute",
      icon: ArrowDown01Icon,
      label: t("createPanel.chute", "Chute"),
      shortcut: "⇧R",
      color: "text-amber-500",
    },
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("h-8 w-8", open && "bg-primary/20 text-primary")}
        >
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-48 p-2">
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase px-2 py-1">
            {t("createPanel.primitives")}
          </p>
          {primitives.map((p) => (
            <button
              type="button"
              key={p.type}
              onClick={() => {
                onCreatePrimitive(p.type)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
            >
              <HugeiconsIcon icon={p.icon} className="size-4 text-muted-foreground" />
              <span className="text-xs flex-1">{p.label}</span>
              <Kbd className="text-[9px]">
                {p.shortcut.replace("⇧", getPlatformSync() === "macos" ? "\u21E7" : "Shift+")}
              </Kbd>
            </button>
          ))}

          <Separator className="my-2" />

          <p className="text-[10px] font-medium text-muted-foreground uppercase px-2 py-1">
            {t("createPanel.hydraulicElements")}
          </p>
          {hydraulics.map((h) => (
            <button
              type="button"
              key={h.type}
              onClick={() => {
                onCreateHydraulic(h.type)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
            >
              <HugeiconsIcon icon={h.icon} className={cn("size-4", h.color)} />
              <span className="text-xs flex-1">{h.label}</span>
              <Kbd className="text-[9px]">
                {h.shortcut.replace("⇧", getPlatformSync() === "macos" ? "\u21E7" : "Shift+")}
              </Kbd>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VerticalToolbar({
  className,
  onOpenCreatePanel,
  onOpenToolsPanel,
}: VerticalToolbarProps) {
  const { t } = useTranslation()
  const transformMode = useTransformMode()
  const isBoxSelectMode = useBoxSelectMode()
  const { setTransformMode, setBoxSelectMode, addObject } = useModellerStore()

  const handleTransformMode = useCallback(
    (mode: TransformMode) => {
      setTransformMode(mode)
      setBoxSelectMode(false)
    },
    [setTransformMode, setBoxSelectMode]
  )

  const handleBoxSelect = useCallback(() => {
    setBoxSelectMode(!isBoxSelectMode)
    if (!isBoxSelectMode) {
      setTransformMode("none")
    }
  }, [isBoxSelectMode, setBoxSelectMode, setTransformMode])

  const handleCreatePrimitive = useCallback(
    (type: PrimitiveType) => {
      const shapeData = {
        name: type.charAt(0).toUpperCase() + type.slice(1),
        type: "shape" as const,
        shapeType: type,
        layerId: "default",
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        visible: true,
        locked: false,
        selected: false,
        metadata: {},
        parameters: { width: 1, height: 1, depth: 1 },
        material: {
          color: "#6366f1",
          opacity: 1,
          metalness: 0.1,
          roughness: 0.6,
        },
      }
      addObject(shapeData)
    },
    [addObject]
  )

  const handleCreateHydraulic = useCallback(
    (_type: HydraulicType) => {
      // This would open the appropriate creator panel
      onOpenCreatePanel?.()
    },
    [onOpenCreatePanel]
  )

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 p-1.5",
        "bg-background/95 dark:bg-toolbar-bg",
        "backdrop-blur-md border-r border-border/40",
        className
      )}
    >
      {/* Transform Tools */}
      <div className="flex flex-col items-center gap-0.5 p-0.5 rounded-xl bg-muted/20 border border-border/10 shadow-sm">
        <ToolButton
          icon={Cursor01Icon}
          label={t("toolbar.select")}
          shortcut="V"
          active={transformMode === "none" && !isBoxSelectMode}
          onClick={() => handleTransformMode("none")}
        />
        <ToolButton
          icon={SquareIcon}
          label={t("toolbar.boxSelect", "Box Select")}
          shortcut="B"
          active={isBoxSelectMode}
          onClick={handleBoxSelect}
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

      <Separator className="my-1 w-6" />

      {/* Create Tools */}
      <div className="flex flex-col items-center gap-0.5 p-0.5 rounded-xl bg-muted/20 border border-border/10 shadow-sm">
        <CreatePopover
          onCreatePrimitive={handleCreatePrimitive}
          onCreateHydraulic={handleCreateHydraulic}
        />
        <ToolButton
          icon={WaterEnergyIcon}
          label={t("createPanel.openChannel")}
          shortcut="⇧C"
          onClick={() => handleCreateHydraulic("channel")}
          variant="cyan"
        />
        <ToolButton
          icon={WaterfallDown01Icon}
          label={t("createPanel.transition", "Transition")}
          shortcut="⇧T"
          onClick={() => handleCreateHydraulic("transition")}
          variant="green"
        />
      </div>

      <Separator className="my-1 w-6" />

      {/* Utility Tools */}
      <div className="flex flex-col items-center gap-0.5 p-0.5 rounded-xl bg-muted/20 border border-border/10 shadow-sm">
        <ToolButton icon={RulerIcon} label={t("toolbar.measure", "Measure")} onClick={() => {}} />
        <ToolButton icon={Layers01Icon} label={t("modeller.tabs.layers")} onClick={() => {}} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings at bottom */}
      <div className="flex flex-col items-center gap-0.5 p-0.5 rounded-xl bg-muted/20 border border-border/10 shadow-sm">
        <ToolButton
          icon={Settings01Icon}
          label={t("toolbar.viewportSettings")}
          onClick={onOpenToolsPanel ?? (() => {})}
        />
      </div>
    </div>
  )
}

export default VerticalToolbar
