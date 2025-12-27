/**
 * Drawing Toolbar - CADHY
 *
 * Vertical floating toolbar with drawing tools:
 * - Dimension tools (point-to-point, line length, angles, radius, etc.)
 * - Geometry tools (line, circle, rectangle, etc.)
 * - Notes and annotations
 * - Images
 */

import type { IsometricVariant, ProjectionType } from "@cadhy/types"
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  Add01Icon,
  AngleIcon,
  ArrowLeftRightIcon,
  CheckmarkCircle01Icon,
  CircleIcon,
  Image01Icon,
  LineIcon,
  NoteIcon,
  PackageDimensions01Icon,
  RulerIcon,
  SquareIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { shapeIdMap } from "@/hooks/use-cad"
import { useDimensioningStore } from "@/stores/dimensioning-store"
import { useDrawingStore } from "@/stores/drawing-store"
import { getModelMetersToDrawingUnitsFactor } from "@/utils/drawing-units"

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

type StandardViewKey =
  | "Top"
  | "Front"
  | "Right"
  | "Left"
  | "Bottom"
  | "Back"
  | "Isometric"
  | "IsometricSW"
  | "IsometricSE"
  | "IsometricNE"
  | "IsometricNW"

export function DrawingToolbar({ className }: DrawingToolbarProps) {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())
  const { generateProjection, addView } = useDrawingStore()
  const { activeTool, setActiveTool } = useDimensioningStore()

  const isDisabled = !activeDrawing
  const hasSourceShape = activeDrawing && activeDrawing.sourceShapeIds.length > 0

  // Available projection types for add view dropdown (orthogonal views only)
  const orthogonalViews: Array<{
    type: ProjectionType
    label: string
    key: StandardViewKey
  }> = useMemo(
    () => [
      { type: "Top", label: t("drawings.views.top"), key: "Top" },
      { type: "Front", label: t("drawings.views.front"), key: "Front" },
      { type: "Right", label: t("drawings.views.right"), key: "Right" },
      { type: "Left", label: t("drawings.views.left"), key: "Left" },
      { type: "Bottom", label: t("drawings.views.bottom"), key: "Bottom" },
      { type: "Back", label: t("drawings.views.back"), key: "Back" },
    ],
    [t]
  )

  // Isometric variants for sub-menu
  const isometricVariants: Array<{
    type: IsometricVariant
    label: string
    key: StandardViewKey
  }> = useMemo(
    () => [
      {
        type: "IsometricSW",
        label: t("drawings.views.isometricSW", "SW (Front-Right)"),
        key: "IsometricSW",
      },
      {
        type: "IsometricSE",
        label: t("drawings.views.isometricSE", "SE (Front-Left)"),
        key: "IsometricSE",
      },
      {
        type: "IsometricNE",
        label: t("drawings.views.isometricNE", "NE (Back-Left)"),
        key: "IsometricNE",
      },
      {
        type: "IsometricNW",
        label: t("drawings.views.isometricNW", "NW (Back-Right)"),
        key: "IsometricNW",
      },
    ],
    [t]
  )

  // Track which view types already exist (including all isometric variants)
  const existingViewTypes = useMemo(() => {
    return new Set<StandardViewKey>(
      activeDrawing?.views
        .map((v) => {
          if (typeof v.projectionType === "string") {
            // Map "Isometric" to "IsometricSW" for backwards compatibility
            if (v.projectionType === "Isometric") return "IsometricSW" as StandardViewKey
            return v.projectionType as StandardViewKey
          }
          return null
        })
        .filter((k): k is StandardViewKey => k !== null) ?? []
    )
  }, [activeDrawing])

  // Check if any isometric variant exists
  const hasAnyIsometric = useMemo(() => {
    return (
      existingViewTypes.has("Isometric") ||
      existingViewTypes.has("IsometricSW") ||
      existingViewTypes.has("IsometricSE") ||
      existingViewTypes.has("IsometricNE") ||
      existingViewTypes.has("IsometricNW")
    )
  }, [existingViewTypes])

  // Handle adding a new view
  const handleAddView = useCallback(
    async (projectionType: ProjectionType) => {
      if (!activeDrawing || !activeDrawing.sourceShapeIds.length) return

      try {
        // sourceShapeIds contains stable sceneObjectIds (NOT ephemeral backendIds)
        const sceneObjectId = activeDrawing.sourceShapeIds[0]

        // Get the backend shape ID from the map (sceneObjectId -> backendShapeId)
        const backendId = shapeIdMap.get(sceneObjectId)
        if (!backendId) {
          console.error(
            "[DrawingToolbar] Backend shape ID not found for sceneObjectId:",
            sceneObjectId,
            "Available mappings:",
            Array.from(shapeIdMap.entries())
          )
          return
        }

        // Apply unit factor for correct scaling (model is in meters, drawing may be in mm/cm/etc)
        const unitFactor = getModelMetersToDrawingUnitsFactor(activeDrawing.sheetConfig.units)
        const projection = await generateProjection(
          backendId,
          projectionType,
          activeDrawing.sheetConfig.scale * unitFactor
        )

        // DEBUG: Log projection before adding view
        console.log("[DrawingToolbar] handleAddView - projection received:", {
          projectionType,
          lineCount: projection.lines?.length ?? 0,
          hasLines: !!projection.lines,
          bbox: projection.bounding_box,
          label: projection.label,
          firstLine: projection.lines?.[0],
        })

        // Calculate position for the new view (place it to the right of existing views)
        const existingViews = activeDrawing.views
        let newPosition: [number, number] = [0, 0]

        if (existingViews.length > 0) {
          const lastView = existingViews[existingViews.length - 1]
          const bbox = lastView.projection.bounding_box
          const lastWidth = bbox.max.x - bbox.min.x
          const newBbox = projection.bounding_box
          const newWidth = newBbox.max.x - newBbox.min.x
          const spacing = 15 // mm between views

          newPosition = [
            lastView.position[0] + lastWidth / 2 + spacing + newWidth / 2,
            lastView.position[1],
          ]
        }

        addView(activeDrawing.id, projectionType, projection, newPosition)
      } catch (error) {
        console.error("Failed to add view:", error)
      }
    },
    [activeDrawing, generateProjection, addView]
  )

  // Dimension tools configuration
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
    {
      tool: "angle",
      icon: AngleIcon,
      labelKey: "drawings.dimensions.angle",
      descKey: "drawings.dimensions.angleDesc",
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

      <Separator className="w-6 my-1" />

      {/* Add View Dropdown */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={!hasSourceShape} className="size-8">
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{t("drawings.toolbar.addViewTooltip")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" side="right" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("drawings.views.addView")}</DropdownMenuLabel>
            {/* Orthogonal views */}
            {orthogonalViews.map(({ type, label, key }) => {
              const isAdded = existingViewTypes.has(key)
              return (
                <DropdownMenuItem
                  key={key}
                  disabled={isAdded}
                  onClick={() => !isAdded && handleAddView(type)}
                  className={cn(isAdded && "text-muted-foreground")}
                >
                  {isAdded && (
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      className="mr-2 size-4 text-green-500"
                    />
                  )}
                  {!isAdded && <span className="mr-6" />}
                  {label}
                </DropdownMenuItem>
              )
            })}
            {/* Isometric sub-menu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={cn(hasAnyIsometric && "text-muted-foreground")}>
                {hasAnyIsometric && (
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    className="mr-2 size-4 text-green-500"
                  />
                )}
                {!hasAnyIsometric && <span className="mr-6" />}
                {t("drawings.views.isometric")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                {isometricVariants.map(({ type, label, key }) => {
                  const isAdded = existingViewTypes.has(key)
                  return (
                    <DropdownMenuItem
                      key={key}
                      disabled={isAdded}
                      onClick={() => !isAdded && handleAddView(type)}
                      className={cn(isAdded && "text-muted-foreground")}
                    >
                      {isAdded && (
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          className="mr-2 size-4 text-green-500"
                        />
                      )}
                      {!isAdded && <span className="mr-6" />}
                      {label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
