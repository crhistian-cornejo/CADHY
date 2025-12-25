/**
 * Drawing Toolbar - CADHY
 *
 * Vertical floating toolbar with drawing tools:
 * - Dimension tools (point-to-point, line length, angles, radius, etc.)
 * - Geometry tools (line, circle, rectangle, etc.)
 * - Notes and annotations
 * - Images
 */

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  ArrowLeftRightIcon,
  CircleIcon,
  Image01Icon,
  LineIcon,
  NoteIcon,
  PackageDimensions01Icon,
  RulerIcon,
  SquareIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTranslation } from "react-i18next"
import { useDimensioningStore } from "@/stores/dimensioning-store"
import { useDrawingStore } from "@/stores/drawing-store"

// ============================================================================
// TYPES
// ============================================================================

import type { DimensionTool } from "@/components/modeller/panels/DrawingToolsPanel"

type GeometryTool = "line" | "circle" | "arc" | "rectangle" | "polygon" | "spline"

// ============================================================================
// TOOL BUTTON COMPONENT
// ============================================================================

interface ToolButtonProps {
  icon: any
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}

function ToolButton({ icon, label, active, disabled, onClick }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "secondary" : "ghost"}
          size="icon-sm"
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "size-8",
            active && "bg-primary/20 text-primary",
            !disabled && "hover:bg-muted"
          )}
        >
          <HugeiconsIcon icon={icon} className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface DrawingToolbarProps {
  className?: string
}

export function DrawingToolbar({ className }: DrawingToolbarProps) {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())
  const { activeTool, setActiveTool } = useDimensioningStore()

  const isDisabled = !activeDrawing

  // Dimension tools configuration - simplified to 3 main tools
  const dimensionTools: Array<{
    tool: DimensionTool
    icon: any
    labelKey: string
    descKey: string
  }> = [
    {
      tool: "auto",
      icon: RulerIcon,
      labelKey: "drawings.dimensions.auto",
      descKey: "drawings.dimensions.autoDesc",
    },
    {
      tool: "line-length",
      icon: ArrowLeftRightIcon,
      labelKey: "drawings.dimensions.lineLength",
      descKey: "drawings.dimensions.lineLengthDesc",
    },
    {
      tool: "point-to-point",
      icon: PackageDimensions01Icon,
      labelKey: "drawings.dimensions.pointToPoint",
      descKey: "drawings.dimensions.pointToPointDesc",
    },
  ]

  // Geometry tools configuration
  const geometryTools: Array<{ tool: GeometryTool; icon: any; labelKey: string }> = [
    { tool: "line", icon: LineIcon, labelKey: "drawings.geometries.line" },
    { tool: "circle", icon: CircleIcon, labelKey: "drawings.geometries.circle" },
    { tool: "arc", icon: CircleIcon, labelKey: "drawings.geometries.arc" },
    { tool: "rectangle", icon: SquareIcon, labelKey: "drawings.geometries.rectangle" },
    { tool: "polygon", icon: SquareIcon, labelKey: "drawings.geometries.polygon" },
    { tool: "spline", icon: LineIcon, labelKey: "drawings.geometries.spline" },
  ]

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 p-1.5 rounded-lg",
        "bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg",
        className
      )}
    >
      {/* Dimension Tools Dropdown */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={activeTool ? "secondary" : "ghost"}
                size="icon-sm"
                disabled={isDisabled}
                className={cn("size-8", activeTool && "bg-primary/20 text-primary")}
              >
                <HugeiconsIcon icon={RulerIcon} className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{t("drawings.toolbar.dimensionsTooltip")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" side="right" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("drawings.dimensions.title")}</DropdownMenuLabel>
            {dimensionTools.map(({ tool, icon, labelKey, descKey }) => (
              <DropdownMenuItem
                key={tool}
                onClick={() => setActiveTool(activeTool === tool ? null : tool)}
                className={cn(
                  "flex flex-col items-start py-2",
                  activeTool === tool && "bg-primary/10 text-primary"
                )}
              >
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={icon} className="size-4" />
                  <span className="font-medium">{t(labelKey)}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-6">{t(descKey)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator className="w-6 my-1" />

      {/* Geometry Tools Dropdown */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={isDisabled} className="size-8">
                <HugeiconsIcon icon={SquareIcon} className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{t("drawings.toolbar.geometriesTooltip")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" side="right" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("drawings.geometries.title")}</DropdownMenuLabel>
            {geometryTools.map(({ tool, icon, labelKey }) => (
              <DropdownMenuItem key={tool} disabled>
                <HugeiconsIcon icon={icon} className="mr-2 size-4" />
                {t(labelKey)}
                <span className="ml-auto text-xs text-muted-foreground">
                  {t("drawings.geometries.comingSoon")}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator className="w-6 my-1" />

      {/* Notes */}
      <ToolButton
        icon={NoteIcon}
        label={t("drawings.toolbar.notesTooltip")}
        active={activeTool === "nota"}
        onClick={() => setActiveTool(activeTool === "nota" ? null : "nota")}
        disabled={isDisabled}
      />

      {/* Images */}
      <ToolButton
        icon={Image01Icon}
        label={t("drawings.toolbar.imageTooltip")}
        disabled={isDisabled}
      />
    </div>
  )
}
