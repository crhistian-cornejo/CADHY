/**
 * Drawing Tools Panel - CADHY
 *
 * Panel de herramientas para dibujos técnicos con diferentes categorías:
 * - Cotas (dimensiones)
 * - Geometrías
 * - Notas
 * - Imagen
 */

import { cn, ScrollArea, Tabs, TabsContent, TabsList, TabsTrigger } from "@cadhy/ui"
import {
  ArrowLeftRightIcon,
  CircleIcon,
  DrawingModeIcon,
  Image01Icon,
  LineIcon,
  NoteIcon,
  PackageDimensions01Icon,
  RulerIcon,
  SquareIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useDimensioningStore } from "@/stores/dimensioning-store"
import { useDrawingStore } from "@/stores/drawing-store"

// ============================================================================
// TYPES
// ============================================================================

export type DimensionTool = "auto" | "line-length" | "point-to-point" | "nota"

type GeometryTool = "line" | "circle" | "arc" | "rectangle" | "polygon" | "spline"

// ============================================================================
// DIMENSION TOOLS
// ============================================================================

function DimensionsTab() {
  const { t } = useTranslation()
  const { activeTool, setActiveTool } = useDimensioningStore()

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
      tool: "nota",
      icon: NoteIcon,
      labelKey: "drawings.dimensions.note",
      descKey: "drawings.dimensions.noteDesc",
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
  const [activeTool, setActiveTool] = useState<GeometryTool | null>(null)

  const geometryTools: Array<{ tool: GeometryTool; icon: any; labelKey: string }> = [
    { tool: "line", icon: LineIcon, labelKey: "drawings.geometries.line" },
    { tool: "circle", icon: CircleIcon, labelKey: "drawings.geometries.circle" },
    { tool: "arc", icon: CircleIcon, labelKey: "drawings.geometries.arc" },
    { tool: "rectangle", icon: SquareIcon, labelKey: "drawings.geometries.rectangle" },
    { tool: "polygon", icon: SquareIcon, labelKey: "drawings.geometries.polygon" },
    { tool: "spline", icon: LineIcon, labelKey: "drawings.geometries.spline" },
  ]

  return (
    <div className="space-y-2 p-2">
      {geometryTools.map(({ tool, icon, labelKey }) => {
        const isActive = activeTool === tool
        return (
          <button
            key={tool}
            type="button"
            onClick={() => setActiveTool(isActive ? tool : tool)}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left transition-colors",
              "hover:bg-muted/50",
              isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground"
            )}
          >
            <HugeiconsIcon icon={icon} className="size-4 flex-shrink-0" />
            <span className="text-sm">{t(labelKey)}</span>
          </button>
        )
      })}
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
        <TabsList className="grid grid-cols-4 w-full rounded-none border-b border-border/40">
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
        </TabsList>

        <ScrollArea className="flex-1">
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
        </ScrollArea>
      </Tabs>
    </div>
  )
}
