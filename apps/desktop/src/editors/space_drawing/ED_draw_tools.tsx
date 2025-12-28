/**
 * Drawing Tools Panel - CADHY
 *
 * Panel de herramientas para dibujos técnicos con diferentes categorías:
 * - Cotas (dimensiones)
 * - Geometrías
 * - Notas
 * - Imagen
 */

import {
  Button,
  cn,
  Input,
  Label,
  ScrollArea,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@cadhy/ui"
import {
  ArrowLeftRightIcon,
  CircleIcon,
  DrawingModeIcon,
  Image01Icon,
  LayersIcon,
  LineIcon,
  NoteIcon,
  PackageDimensions01Icon,
  PlusSignIcon,
  RulerIcon,
  Settings01Icon,
  SquareIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useDimensioningStore } from "@/core/stores/dimensioning-store"
import { useDrawingStore } from "@/core/stores/drawing-store"
import { SKETCH_PLANES, type SketchTool, useSketchStore } from "@/core/stores/ST_sketch"
import { shapeIdMap } from "@/lib/hooks/use-kernel"
import { getModelMetersToDrawingUnitsFactor } from "@/lib/utils/UT_drawing_units"

// ============================================================================
// TYPES
// ============================================================================

import type { IconType } from "@hugeicons/react"
import type { DimensionTool } from "@/editors/space_view3d/panels/ED_view3d_draw_tools"

// ============================================================================
// DIMENSION TOOLS
// ============================================================================

function DimensionsTab() {
  const { t } = useTranslation()
  const { activeTool, setActiveTool } = useDimensioningStore()

  const dimensionTools: Array<{
    tool: DimensionTool
    icon: IconType
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

  return (
    <div className="space-y-1 p-2">
      {dimensionTools.map(({ tool, icon, labelKey, descKey }) => {
        const isActive = activeTool === tool
        return (
          <button
            key={tool}
            type="button"
            onClick={() => setActiveTool(isActive ? null : tool)}
            className={cn(
              "flex flex-col w-full px-3 py-2.5 rounded-lg text-left transition-colors",
              "hover:bg-muted/50",
              isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={icon} className="size-4 flex-shrink-0" />
              <span className="text-sm font-medium">{t(labelKey)}</span>
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 ml-6">{t(descKey)}</span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// GEOMETRY TOOLS
// ============================================================================

function GeometriesTab() {
  const { t } = useTranslation()

  // Sketch store state
  const activeSketch = useSketchStore((s) => s.getActiveSketch())
  const activeTool = useSketchStore((s) => s.activeTool)
  const setTool = useSketchStore((s) => s.setTool)
  const createSketch = useSketchStore((s) => s.createSketch)
  const setActiveSketch = useSketchStore((s) => s.setActiveSketch)

  const geometryTools: Array<{
    tool: SketchTool
    icon: IconType
    labelKey: string
    descKey?: string
  }> = [
    {
      tool: "line",
      icon: LineIcon,
      labelKey: "drawings.geometries.line",
      descKey: "drawings.geometries.lineDesc",
    },
    {
      tool: "circle",
      icon: CircleIcon,
      labelKey: "drawings.geometries.circle",
      descKey: "drawings.geometries.circleDesc",
    },
    {
      tool: "arc",
      icon: CircleIcon,
      labelKey: "drawings.geometries.arc",
      descKey: "drawings.geometries.arcDesc",
    },
    {
      tool: "rectangle",
      icon: SquareIcon,
      labelKey: "drawings.geometries.rectangle",
      descKey: "drawings.geometries.rectangleDesc",
    },
    {
      tool: "polygon",
      icon: SquareIcon,
      labelKey: "drawings.geometries.polygon",
      descKey: "drawings.geometries.polygonDesc",
    },
    {
      tool: "spline",
      icon: LineIcon,
      labelKey: "drawings.geometries.spline",
      descKey: "drawings.geometries.splineDesc",
    },
  ]

  // Handle creating a new sketch
  const handleCreateSketch = () => {
    const sketchId = createSketch("New Sketch", SKETCH_PLANES.XY)
    setActiveSketch(sketchId)
    toast.success(t("drawings.geometries.sketchCreated", "Sketch created"))
  }

  // Handle tool selection
  const handleToolSelect = (tool: SketchTool) => {
    if (!activeSketch) {
      // Create a new sketch automatically
      handleCreateSketch()
    }
    setTool(activeTool === tool ? "select" : tool)
  }

  return (
    <div className="space-y-3 p-2">
      {/* Active Sketch Info */}
      {activeSketch ? (
        <div className="p-2 bg-muted/30 rounded-lg border border-border/40">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={LayersIcon} className="size-3.5 text-primary" />
            <span className="text-xs font-medium">{activeSketch.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {activeSketch.entities.length} {t("drawings.geometries.entities", "entities")}
          </p>
        </div>
      ) : (
        <div className="p-3 bg-muted/20 rounded-lg border border-dashed border-border/40 text-center">
          <HugeiconsIcon
            icon={LayersIcon}
            className="size-6 mx-auto mb-2 text-muted-foreground/50"
          />
          <p className="text-xs text-muted-foreground mb-2">
            {t("drawings.geometries.noActiveSketch", "No active sketch")}
          </p>
          <Button size="sm" variant="outline" onClick={handleCreateSketch} className="h-7 text-xs">
            <HugeiconsIcon icon={PlusSignIcon} className="size-3 mr-1" />
            {t("drawings.geometries.createSketch", "Create Sketch")}
          </Button>
        </div>
      )}

      {/* Geometry Tools */}
      <div className="space-y-1">
        {geometryTools.map(({ tool, icon, labelKey, descKey }) => {
          const isActive = activeTool === tool
          return (
            <button
              key={tool}
              type="button"
              onClick={() => handleToolSelect(tool)}
              className={cn(
                "flex flex-col w-full px-3 py-2 rounded-lg text-left transition-colors",
                "hover:bg-muted/50",
                isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={icon} className="size-4 flex-shrink-0" />
                <span className="text-sm font-medium">{t(labelKey)}</span>
              </div>
              {descKey && (
                <span className="text-xs text-muted-foreground mt-0.5 ml-6">{t(descKey)}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="pt-2 border-t border-border/40">
        <p className="text-xs text-muted-foreground px-2">
          <span className="font-medium">Esc</span>{" "}
          {t("drawings.geometries.cancelTool", "to cancel")} •{" "}
          <span className="font-medium">Enter</span>{" "}
          {t("drawings.geometries.finishPolygon", "to finish polygon")}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// NOTES TAB
// ============================================================================

function NotesTab() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 p-4">
      <div className="text-center text-muted-foreground">
        <HugeiconsIcon icon={NoteIcon} className="size-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t("drawings.notes.comingSoon")}</p>
      </div>
    </div>
  )
}

// ============================================================================
// IMAGE TAB
// ============================================================================

function ImageTab() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 p-4">
      <div className="text-center text-muted-foreground">
        <HugeiconsIcon icon={Image01Icon} className="size-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t("drawings.images.comingSoon")}</p>
      </div>
    </div>
  )
}

// ============================================================================
// SETTINGS TAB
// ============================================================================

function SettingsTab() {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())
  const { updateSheetConfig, updateView, generateProjection } = useDrawingStore()
  const [scale, setScale] = useState(activeDrawing?.sheetConfig.scale ?? 1)

  if (!activeDrawing) return null

  const handleScaleChange = async (newScale: number) => {
    setScale(newScale)
    updateSheetConfig(activeDrawing.id, { scale: newScale })

    // Regenerate all views with new scale
    if (activeDrawing.sourceShapeIds.length > 0 && activeDrawing.views.length > 0) {
      try {
        // sourceShapeIds contains stable sceneObjectIds (NOT ephemeral backendIds)
        const sceneObjectId = activeDrawing.sourceShapeIds[0]

        // Get the backend shape ID from the map (sceneObjectId -> backendShapeId)
        const backendId = shapeIdMap.get(sceneObjectId)
        if (!backendId) {
          console.error(
            "[DrawingToolsPanel] Backend shape ID not found for sceneObjectId:",
            sceneObjectId
          )
          return
        }

        const unitFactor = getModelMetersToDrawingUnitsFactor(activeDrawing.sheetConfig.units)

        // Regenerate each view
        for (const view of activeDrawing.views) {
          try {
            // Always use backendId for projection generation
            const projection = await generateProjection(
              backendId,
              view.projectionType,
              newScale * unitFactor
            )

            // Validate projection has lines before updating
            if (!projection.lines || projection.lines.length === 0) {
              console.warn(
                `[ScaleChange] Projection for view ${view.id} (${view.projectionType}) returned 0 lines - keeping old projection`
              )
              continue // Skip this view, keep old projection
            }

            updateView(activeDrawing.id, view.id, { projection })
          } catch (error) {
            console.error(`Error regenerating view ${view.id}:`, error)
            toast.error(
              `Error al regenerar vista: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }

        toast.success("Vistas regeneradas con la nueva escala")
      } catch (error) {
        console.error("Error regenerating views:", error)
        toast.error(
          `Error al regenerar vistas: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="scale" className="text-sm font-medium">
          {t("drawings.settings.scale")}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="scale"
            type="number"
            min="0.1"
            max="100"
            step="0.1"
            value={scale}
            onChange={(e) => {
              const value = parseFloat(e.target.value)
              if (!Number.isNaN(value) && value > 0) {
                handleScaleChange(value)
              }
            }}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground">1:{scale}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t("drawings.settings.scaleChangeInfo")}</p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("drawings.settings.units")}</Label>
        <p className="text-xs text-muted-foreground">{activeDrawing.sheetConfig.units}</p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("drawings.settings.paperSize")}</Label>
        <p className="text-xs text-muted-foreground">
          {typeof activeDrawing.sheetConfig.size === "string"
            ? activeDrawing.sheetConfig.size
            : t("drawings.settings.custom")}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface DrawingToolsPanelProps {
  className?: string
}

export function DrawingToolsPanel({ className }: DrawingToolsPanelProps) {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())

  if (!activeDrawing) {
    return (
      <div className={cn("flex h-full items-center justify-center p-4", className)}>
        <div className="text-center text-muted-foreground">
          <HugeiconsIcon icon={DrawingModeIcon} className="size-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("drawings.noActiveDrawing")}</p>
          <p className="text-xs mt-1">{t("drawings.createDrawingToStart")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={DrawingModeIcon} className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("drawings.tools.title")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{activeDrawing.name}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dimensions" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-5 w-full rounded-none border-b border-border/40">
          <TabsTrigger value="dimensions" className="text-xs">
            {t("drawings.tools.dimensions")}
          </TabsTrigger>
          <TabsTrigger value="geometries" className="text-xs">
            {t("drawings.tools.geometries")}
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">
            {t("drawings.tools.notes")}
          </TabsTrigger>
          <TabsTrigger value="image" className="text-xs">
            {t("drawings.tools.image")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            <HugeiconsIcon icon={Settings01Icon} className="size-3" />
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1" showFadeMasks>
          <TabsContent value="dimensions" className="m-0 data-[state=inactive]:hidden">
            <DimensionsTab />
          </TabsContent>
          <TabsContent value="geometries" className="m-0 data-[state=inactive]:hidden">
            <GeometriesTab />
          </TabsContent>
          <TabsContent value="notes" className="m-0 data-[state=inactive]:hidden">
            <NotesTab />
          </TabsContent>
          <TabsContent value="image" className="m-0 data-[state=inactive]:hidden">
            <ImageTab />
          </TabsContent>
          <TabsContent value="settings" className="m-0 data-[state=inactive]:hidden">
            <SettingsTab />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
