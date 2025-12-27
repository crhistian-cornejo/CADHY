/**
 * Drawing Properties Panel - CADHY
 *
 * Collapsible panel like Shapr3D with drawing configuration:
 * - Hoja (Sheet): Orientation, Size, Scale, Projection, Title Block
 * - Cotas (Dimensions): Units, Angle format, Precision
 * - Anchos de línea (Line widths): Visible, Hidden, Dimension lines
 */

import type { HatchPatternType, LayoutGridConfig } from "@cadhy/types"
import {
  DEFAULT_ALIGNMENT_GUIDES_CONFIG,
  DEFAULT_HATCH_CONFIG,
  DEFAULT_LAYOUT_GRID_CONFIG,
  MATERIAL_HATCH_PRESETS,
} from "@cadhy/types"
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
} from "@cadhy/ui"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Delete02Icon,
  FileEditIcon,
  GridIcon,
  RulerIcon,
  Settings01Icon,
  TextIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { invoke } from "@tauri-apps/api/core"
import { save } from "@tauri-apps/plugin-dialog"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { shapeIdMap } from "@/hooks/use-cad"
import { useDrawingStore } from "@/stores/drawing-store"
import { getModelMetersToDrawingUnitsFactor } from "@/utils/drawing-units"
import { getHatchPatternOptions } from "@/utils/hatch-patterns"

// ============================================================================
// TYPES
// ============================================================================

interface CollapsibleSectionProps {
  title: string
  icon: any
  children: React.ReactNode
  defaultOpen?: boolean
}

// ============================================================================
// NUMERIC INPUT COMPONENT
// ============================================================================

interface NumericInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
}

/**
 * Numeric input that allows free typing with "." as decimal separator.
 * Only applies changes on blur or Enter key.
 */
function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 0.1,
  className,
  disabled,
}: NumericInputProps) {
  const [localValue, setLocalValue] = useState(value.toString())

  // Sync local value when prop changes (from external source)
  useEffect(() => {
    setLocalValue(value.toString())
  }, [value])

  const applyValue = () => {
    const parsed = parseFloat(localValue)
    if (!Number.isNaN(parsed)) {
      let finalValue = parsed
      if (min !== undefined) finalValue = Math.max(min, finalValue)
      if (max !== undefined) finalValue = Math.min(max, finalValue)
      onChange(finalValue)
      setLocalValue(finalValue.toString())
    } else {
      // Reset to original value if invalid
      setLocalValue(value.toString())
    }
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={applyValue}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          applyValue()
          e.currentTarget.blur()
        }
      }}
      disabled={disabled}
      className={className}
    />
  )
}

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors">
        <HugeiconsIcon
          icon={open ? ArrowDown01Icon : ArrowRight01Icon}
          className="size-3 text-muted-foreground"
        />
        <HugeiconsIcon icon={icon} className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// PROPERTY ROW COMPONENT
// ============================================================================

interface PropertyRowProps {
  label: string
  children: React.ReactNode
}

function PropertyRow({ label, children }: PropertyRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs text-muted-foreground whitespace-nowrap">{label}</Label>
      <div className="flex-1 max-w-[140px]">{children}</div>
    </div>
  )
}

// ============================================================================
// SHEET SECTION (HOJA)
// ============================================================================

function SheetSection() {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())
  const { updateSheetConfig, updateView, generateProjection, scaleDimensions } = useDrawingStore()
  const [isRegenerating, setIsRegenerating] = useState(false)

  if (!activeDrawing) return null

  const { sheetConfig } = activeDrawing

  const handleScaleChange = async (newScale: number) => {
    if (Number.isNaN(newScale) || newScale <= 0) return

    const oldScale = sheetConfig.scale
    const scaleFactor = newScale / oldScale

    updateSheetConfig(activeDrawing.id, { scale: newScale })

    // Scale existing dimensions to match the new projection scale
    if (activeDrawing.dimensions?.dimensions.length > 0) {
      scaleDimensions(activeDrawing.id, scaleFactor)
    }

    // Regenerate all views with new scale
    if (activeDrawing.sourceShapeIds.length > 0 && activeDrawing.views.length > 0) {
      setIsRegenerating(true)
      try {
        // sourceShapeIds contains stable sceneObjectIds (NOT ephemeral backendIds)
        const sceneObjectId = activeDrawing.sourceShapeIds[0]

        // Get the backend shape ID from the map (sceneObjectId -> backendShapeId)
        const backendId = shapeIdMap.get(sceneObjectId)
        if (!backendId) {
          console.error(
            "[DrawingPropertiesPanel] Backend shape ID not found for sceneObjectId:",
            sceneObjectId
          )
          setIsRegenerating(false)
          return
        }

        const unitFactor = getModelMetersToDrawingUnitsFactor(sheetConfig.units)

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
          }
        }

        toast.success(t("drawings.properties.sheet.viewsUpdated"))
      } catch (error) {
        toast.error(t("drawings.properties.sheet.viewsError"))
      } finally {
        setIsRegenerating(false)
      }
    }
  }

  return (
    <CollapsibleSection title={t("drawings.properties.sheet.title")} icon={FileEditIcon}>
      <PropertyRow label={t("drawings.properties.sheet.orientation")}>
        <Select
          value={sheetConfig.orientation}
          onValueChange={(value) =>
            updateSheetConfig(activeDrawing.id, { orientation: value as "landscape" | "portrait" })
          }
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="landscape">{t("drawings.properties.sheet.landscape")}</SelectItem>
            <SelectItem value="portrait">{t("drawings.properties.sheet.portrait")}</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.sheet.size")}>
        <Select
          value={typeof sheetConfig.size === "string" ? sheetConfig.size : "custom"}
          onValueChange={(value) => updateSheetConfig(activeDrawing.id, { size: value as any })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A4">A4</SelectItem>
            <SelectItem value="A3">A3</SelectItem>
            <SelectItem value="A2">A2</SelectItem>
            <SelectItem value="A1">A1</SelectItem>
            <SelectItem value="A0">A0</SelectItem>
            <SelectItem value="Letter">Letter</SelectItem>
            <SelectItem value="Legal">Legal</SelectItem>
            <SelectItem value="Tabloid">Tabloid</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.sheet.scale")}>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">1:</span>
          <NumericInput
            value={Math.round(1 / sheetConfig.scale)}
            onChange={(ratio) => {
              if (ratio > 0) {
                handleScaleChange(1 / ratio)
              }
            }}
            min={1}
            max={1000}
            disabled={isRegenerating}
            className="h-7 text-xs w-16"
          />
        </div>
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.sheet.projection")}>
        <Select
          value={sheetConfig.projectionAngle}
          onValueChange={(value) =>
            updateSheetConfig(activeDrawing.id, { projectionAngle: value as "first" | "third" })
          }
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first">{t("drawings.properties.sheet.firstAngle")}</SelectItem>
            <SelectItem value="third">{t("drawings.properties.sheet.thirdAngle")}</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.sheet.sheetTitle")}>
        <Input
          value={sheetConfig.titleBlockInfo?.title || ""}
          onChange={(e) =>
            updateSheetConfig(activeDrawing.id, {
              titleBlockInfo: { ...sheetConfig.titleBlockInfo, title: e.target.value },
            })
          }
          placeholder={t("drawings.properties.sheet.untitled")}
          className="h-7 text-xs"
        />
      </PropertyRow>
    </CollapsibleSection>
  )
}

// ============================================================================
// DIMENSIONS SECTION (COTAS)
// ============================================================================

function DimensionsSection() {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())
  const { updateDimensionConfig } = useDrawingStore()

  if (!activeDrawing) return null

  const config = activeDrawing.dimensions?.config || {
    unit: "mm" as const,
    precision: 2,
    arrowSize: 2.5,
    textHeight: 3.5,
  }

  return (
    <CollapsibleSection title={t("drawings.properties.dimensions.title")} icon={RulerIcon}>
      <PropertyRow label={t("drawings.properties.dimensions.units")}>
        <Select
          value={config.unit}
          onValueChange={(value) => updateDimensionConfig(activeDrawing.id, { unit: value as any })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mm">{t("drawings.properties.dimensions.mm")}</SelectItem>
            <SelectItem value="cm">{t("drawings.properties.dimensions.cm")}</SelectItem>
            <SelectItem value="m">{t("drawings.properties.dimensions.m")}</SelectItem>
            <SelectItem value="in">{t("drawings.properties.dimensions.in")}</SelectItem>
            <SelectItem value="ft">{t("drawings.properties.dimensions.ft")}</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.dimensions.precision")}>
        <Select
          value={config.precision.toString()}
          onValueChange={(value) =>
            updateDimensionConfig(activeDrawing.id, { precision: parseInt(value) })
          }
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">{t("drawings.properties.dimensions.integers")}</SelectItem>
            <SelectItem value="1">0.0</SelectItem>
            <SelectItem value="2">0.00</SelectItem>
            <SelectItem value="3">0.000</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.dimensions.textSize")}>
        <NumericInput
          value={config.textHeight}
          onChange={(value) => updateDimensionConfig(activeDrawing.id, { textHeight: value })}
          min={1}
          max={20}
          className="h-7 text-xs"
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.dimensions.arrowSize")}>
        <NumericInput
          value={config.arrowSize}
          onChange={(value) => updateDimensionConfig(activeDrawing.id, { arrowSize: value })}
          min={0.5}
          max={10}
          className="h-7 text-xs"
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.dimensions.showUnit")}>
        <Switch
          checked={config.showUnit ?? false}
          onCheckedChange={(checked) =>
            updateDimensionConfig(activeDrawing.id, { showUnit: checked })
          }
        />
      </PropertyRow>
    </CollapsibleSection>
  )
}

// ============================================================================
// DISPLAY OPTIONS SECTION (VISUALIZACIÓN)
// ============================================================================

function ViewDisplaySection() {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())
  const { updateDrawing, regenerateAllViews } = useDrawingStore()
  const [isRegenerating, setIsRegenerating] = useState(false)

  if (!activeDrawing) return null

  const handleRegenerateViews = async () => {
    if (activeDrawing.views.length === 0) {
      toast.info(t("drawings.properties.display.noViewsToRegenerate"))
      return
    }

    setIsRegenerating(true)
    try {
      const count = await regenerateAllViews(activeDrawing.id)
      if (count > 0) {
        toast.success(
          t("drawings.properties.display.viewsRegenerated", {
            count,
            total: activeDrawing.views.length,
          })
        )
      } else {
        toast.warning(t("drawings.properties.display.regenerationFailed"))
      }
    } catch (error) {
      console.error("[ViewDisplaySection] Regeneration failed:", error)
      toast.error(t("drawings.properties.display.regenerationError"))
    } finally {
      setIsRegenerating(false)
    }
  }

  const displayOptions = activeDrawing.displayOptions || {
    showBoundingBoxes: true,
    showViewLabels: true,
    showGridReferences: true,
  }

  const handleToggle = (key: keyof typeof displayOptions, value: boolean) => {
    updateDrawing(activeDrawing.id, {
      displayOptions: {
        ...displayOptions,
        [key]: value,
      },
    })
  }

  return (
    <CollapsibleSection
      title={t("drawings.properties.display.title")}
      icon={ViewIcon}
      defaultOpen={true}
    >
      <PropertyRow label={t("drawings.properties.display.constructionLines")}>
        <Switch
          checked={displayOptions.showBoundingBoxes}
          onCheckedChange={(checked) => handleToggle("showBoundingBoxes", checked)}
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.display.viewLabels")}>
        <Switch
          checked={displayOptions.showViewLabels}
          onCheckedChange={(checked) => handleToggle("showViewLabels", checked)}
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.display.gridReferences")}>
        <Switch
          checked={displayOptions.showGridReferences}
          onCheckedChange={(checked) => handleToggle("showGridReferences", checked)}
        />
      </PropertyRow>

      {/* Regenerate Views Button */}
      {activeDrawing.views.length > 0 && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleRegenerateViews}
            disabled={isRegenerating}
          >
            {isRegenerating
              ? t("drawings.properties.display.regenerating")
              : t("drawings.properties.display.regenerateViews")}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            {t("drawings.properties.display.regenerateHint")}
          </p>
        </div>
      )}
    </CollapsibleSection>
  )
}

// ============================================================================
// VIEW LABELS SECTION (ETIQUETAS DE VISTA)
// ============================================================================

function ViewLabelsSection() {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())
  const { updateAllViewLabels } = useDrawingStore()

  if (!activeDrawing) return null

  // Get config from first view or use defaults
  const firstView = activeDrawing.views[0]
  const currentConfig = {
    showLabel: firstView?.labelConfig?.showLabel ?? true,
    showScale: firstView?.labelConfig?.showScale ?? true,
    showNumber: firstView?.labelConfig?.showNumber ?? false,
    position: firstView?.labelConfig?.position ?? "bottom",
    fontSize: firstView?.labelConfig?.fontSize ?? 3.5,
    numberStyle: firstView?.labelConfig?.numberStyle ?? "circle",
    offset: firstView?.labelConfig?.offset ?? 12,
    underline: firstView?.labelConfig?.underline ?? true,
    numberSize: firstView?.labelConfig?.numberSize ?? 0.7,
    numberGap: firstView?.labelConfig?.numberGap ?? 1.5,
  }

  const handleConfigChange = (key: string, value: any) => {
    // Update all views with the new config
    updateAllViewLabels(activeDrawing.id, { [key]: value })
  }

  return (
    <CollapsibleSection
      title={t("drawings.properties.viewLabels.title")}
      icon={TextIcon}
      defaultOpen={false}
    >
      <PropertyRow label={t("drawings.properties.viewLabels.showName")}>
        <Switch
          checked={currentConfig.showLabel}
          onCheckedChange={(checked) => handleConfigChange("showLabel", checked)}
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.viewLabels.showScale")}>
        <Switch
          checked={currentConfig.showScale}
          onCheckedChange={(checked) => handleConfigChange("showScale", checked)}
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.viewLabels.showNumber")}>
        <Switch
          checked={currentConfig.showNumber}
          onCheckedChange={(checked) => handleConfigChange("showNumber", checked)}
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.viewLabels.position")}>
        <Select
          value={currentConfig.position}
          onValueChange={(value) => handleConfigChange("position", value)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bottom">
              {t("drawings.properties.viewLabels.positionBottom")}
            </SelectItem>
            <SelectItem value="top">{t("drawings.properties.viewLabels.positionTop")}</SelectItem>
            <SelectItem value="left">{t("drawings.properties.viewLabels.positionLeft")}</SelectItem>
            <SelectItem value="right">
              {t("drawings.properties.viewLabels.positionRight")}
            </SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.viewLabels.numberStyle")}>
        <Select
          value={currentConfig.numberStyle}
          onValueChange={(value) => handleConfigChange("numberStyle", value)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="circle">
              {t("drawings.properties.viewLabels.numberCircle")}
            </SelectItem>
            <SelectItem value="square">
              {t("drawings.properties.viewLabels.numberSquare")}
            </SelectItem>
            <SelectItem value="plain">{t("drawings.properties.viewLabels.numberPlain")}</SelectItem>
            <SelectItem value="none">{t("drawings.properties.viewLabels.numberNone")}</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.viewLabels.numberSize")}>
        <NumericInput
          value={currentConfig.numberSize}
          onChange={(value) => handleConfigChange("numberSize", value)}
          min={0.3}
          max={1.5}
          step={0.1}
          className="h-7 text-xs"
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.viewLabels.numberGap")}>
        <NumericInput
          value={currentConfig.numberGap}
          onChange={(value) => handleConfigChange("numberGap", value)}
          min={0.5}
          max={5}
          step={0.5}
          className="h-7 text-xs"
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.viewLabels.fontSize")}>
        <NumericInput
          value={currentConfig.fontSize}
          onChange={(value) => handleConfigChange("fontSize", value)}
          min={1}
          max={10}
          step={0.5}
          className="h-7 text-xs"
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.viewLabels.offset")}>
        <NumericInput
          value={currentConfig.offset}
          onChange={(value) => handleConfigChange("offset", value)}
          min={2}
          max={50}
          step={1}
          className="h-7 text-xs"
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.viewLabels.underline")}>
        <Switch
          checked={currentConfig.underline}
          onCheckedChange={(checked) => handleConfigChange("underline", checked)}
        />
      </PropertyRow>
    </CollapsibleSection>
  )
}

// ============================================================================
// HATCH SECTION (RAYADO / HATCHING)
// ============================================================================

function HatchSection() {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())
  const { removeHatch, updateHatchConfig } = useDrawingStore()

  if (!activeDrawing) return null

  const hatches = activeDrawing.hatches || []
  const patternOptions = getHatchPatternOptions()

  if (hatches.length === 0) {
    return (
      <CollapsibleSection
        title={t("drawings.properties.hatching.title")}
        icon={GridIcon}
        defaultOpen={false}
      >
        <div className="text-xs text-muted-foreground text-center py-2">
          {t("drawings.properties.hatching.noHatches")}
        </div>
        <div className="text-xs text-muted-foreground text-center">
          {t("drawings.properties.hatching.hint")}
        </div>
      </CollapsibleSection>
    )
  }

  return (
    <CollapsibleSection
      title={t("drawings.properties.hatching.title")}
      icon={GridIcon}
      defaultOpen={false}
    >
      <div className="space-y-3">
        {hatches.map((hatch, index) => (
          <div key={hatch.id} className="space-y-2 pb-2 border-b border-border/30 last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {t("drawings.properties.hatching.region")} {index + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeHatch(activeDrawing.id, hatch.id)}
              >
                <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
              </Button>
            </div>

            <PropertyRow label={t("drawings.properties.hatching.pattern")}>
              <Select
                value={hatch.config.pattern}
                onValueChange={(value) =>
                  updateHatchConfig(activeDrawing.id, hatch.id, {
                    pattern: value as HatchPatternType,
                  })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {patternOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropertyRow>

            <PropertyRow label={t("drawings.properties.hatching.angle")}>
              <NumericInput
                value={hatch.config.angle}
                onChange={(value) =>
                  updateHatchConfig(activeDrawing.id, hatch.id, { angle: value })
                }
                min={0}
                max={360}
                step={15}
                className="h-7 text-xs"
              />
            </PropertyRow>

            <PropertyRow label={t("drawings.properties.hatching.spacing")}>
              <NumericInput
                value={hatch.config.spacing}
                onChange={(value) =>
                  updateHatchConfig(activeDrawing.id, hatch.id, { spacing: value })
                }
                min={0.5}
                max={10}
                step={0.5}
                className="h-7 text-xs"
              />
            </PropertyRow>

            <PropertyRow label={t("drawings.properties.hatching.scale")}>
              <NumericInput
                value={hatch.config.scale}
                onChange={(value) =>
                  updateHatchConfig(activeDrawing.id, hatch.id, { scale: value })
                }
                min={0.1}
                max={5}
                step={0.1}
                className="h-7 text-xs"
              />
            </PropertyRow>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  )
}

// ============================================================================
// LAYOUT GRID SECTION (GRID DE DISEÑO)
// ============================================================================

function LayoutGridSection() {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())
  const { updateDrawing } = useDrawingStore()

  if (!activeDrawing) return null

  const gridConfig = activeDrawing.displayOptions?.layoutGrid ?? DEFAULT_LAYOUT_GRID_CONFIG
  const guidesConfig =
    activeDrawing.displayOptions?.alignmentGuides ?? DEFAULT_ALIGNMENT_GUIDES_CONFIG

  const handleGridChange = (key: keyof LayoutGridConfig, value: LayoutGridConfig[typeof key]) => {
    updateDrawing(activeDrawing.id, {
      displayOptions: {
        ...activeDrawing.displayOptions,
        layoutGrid: {
          ...gridConfig,
          [key]: value,
        },
      },
    })
  }

  const handleGuidesChange = (key: string, value: boolean) => {
    updateDrawing(activeDrawing.id, {
      displayOptions: {
        ...activeDrawing.displayOptions,
        alignmentGuides: {
          ...guidesConfig,
          [key]: value,
        },
      },
    })
  }

  return (
    <CollapsibleSection
      title={t("drawings.properties.layoutGrid.title")}
      icon={GridIcon}
      defaultOpen={false}
    >
      <PropertyRow label={t("drawings.properties.layoutGrid.showGrid")}>
        <Switch
          checked={gridConfig.enabled}
          onCheckedChange={(checked) => handleGridChange("enabled", checked)}
        />
      </PropertyRow>

      {gridConfig.enabled && (
        <>
          <PropertyRow label={t("drawings.properties.layoutGrid.spacing")}>
            <NumericInput
              value={gridConfig.spacing}
              onChange={(value) => handleGridChange("spacing", value)}
              min={5}
              max={100}
              step={5}
              className="h-7 text-xs"
            />
          </PropertyRow>

          <PropertyRow label={t("drawings.properties.layoutGrid.showMinor")}>
            <Switch
              checked={gridConfig.showMinorGrid}
              onCheckedChange={(checked) => handleGridChange("showMinorGrid", checked)}
            />
          </PropertyRow>

          <PropertyRow label={t("drawings.properties.layoutGrid.snapToGrid")}>
            <Switch
              checked={gridConfig.snapToGrid}
              onCheckedChange={(checked) => handleGridChange("snapToGrid", checked)}
            />
          </PropertyRow>
        </>
      )}

      <Separator className="my-2" />

      <PropertyRow label={t("drawings.properties.layoutGrid.alignGuides")}>
        <Switch
          checked={guidesConfig.enabled}
          onCheckedChange={(checked) => handleGuidesChange("enabled", checked)}
        />
      </PropertyRow>

      {guidesConfig.enabled && (
        <>
          <PropertyRow label={t("drawings.properties.layoutGrid.centerGuides")}>
            <Switch
              checked={guidesConfig.showCenterGuides}
              onCheckedChange={(checked) => handleGuidesChange("showCenterGuides", checked)}
            />
          </PropertyRow>

          <PropertyRow label={t("drawings.properties.layoutGrid.spacingIndicators")}>
            <Switch
              checked={guidesConfig.showSpacingIndicators}
              onCheckedChange={(checked) => handleGuidesChange("showSpacingIndicators", checked)}
            />
          </PropertyRow>
        </>
      )}
    </CollapsibleSection>
  )
}

// ============================================================================
// LINE WIDTHS SECTION (ANCHOS DE LÍNEA)
// ============================================================================

function LineWidthsSection() {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())
  const { updateSheetConfig } = useDrawingStore()

  if (!activeDrawing) return null

  // Default line widths (these could be stored in sheetConfig)
  const lineWidths = activeDrawing.sheetConfig.lineWidths || {
    visible: 0.5,
    hidden: 0.25,
    dimension: 0.25,
    centerline: 0.18,
    section: 0.7,
  }

  const handleLineWidthChange = (key: string, value: number) => {
    updateSheetConfig(activeDrawing.id, {
      lineWidths: { ...lineWidths, [key]: value },
    })
  }

  return (
    <CollapsibleSection
      title={t("drawings.properties.lineWidths.title")}
      icon={TextIcon}
      defaultOpen={false}
    >
      <PropertyRow label={t("drawings.properties.lineWidths.visible")}>
        <NumericInput
          value={lineWidths.visible}
          onChange={(value) => handleLineWidthChange("visible", value)}
          min={0.1}
          max={2}
          className="h-7 text-xs"
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.lineWidths.hidden")}>
        <NumericInput
          value={lineWidths.hidden}
          onChange={(value) => handleLineWidthChange("hidden", value)}
          min={0.1}
          max={2}
          className="h-7 text-xs"
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.lineWidths.dimension")}>
        <NumericInput
          value={lineWidths.dimension}
          onChange={(value) => handleLineWidthChange("dimension", value)}
          min={0.1}
          max={2}
          className="h-7 text-xs"
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.lineWidths.centerline")}>
        <NumericInput
          value={lineWidths.centerline}
          onChange={(value) => handleLineWidthChange("centerline", value)}
          min={0.1}
          max={2}
          className="h-7 text-xs"
        />
      </PropertyRow>

      <PropertyRow label={t("drawings.properties.lineWidths.section")}>
        <NumericInput
          value={lineWidths.section}
          onChange={(value) => handleLineWidthChange("section", value)}
          min={0.1}
          max={2}
          className="h-7 text-xs"
        />
      </PropertyRow>
    </CollapsibleSection>
  )
}

// ============================================================================
// EXPORT SECTION (EXPORTAR)
// ============================================================================

function ExportSection() {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())

  if (!activeDrawing) return null

  const handleExport = async (format: "svg" | "dxf" | "pdf") => {
    try {
      const ext = format
      const path = await save({
        title: t("drawings.properties.export.dialogTitle", { format: format.toUpperCase() }),
        defaultPath: `${activeDrawing.name}.${ext}`,
        filters: [
          {
            name: format.toUpperCase(),
            extensions: [ext],
          },
        ],
      })

      if (!path) return

      // Use backend vector export for all formats (SVG, DXF, PDF)
      const cmd =
        format === "svg"
          ? "drawing_export_svg"
          : format === "dxf"
            ? "drawing_export_dxf"
            : "drawing_export_pdf"

      await invoke(cmd, { drawing: activeDrawing, path })
      toast.success(t("drawings.properties.export.success", { path }))
    } catch (error) {
      console.error("[drawing-export] Failed:", error)
      toast.error(
        t("drawings.properties.export.error", {
          error: error instanceof Error ? error.message : String(error),
        })
      )
    }
  }

  return (
    <CollapsibleSection
      title={t("drawings.properties.export.title")}
      icon={Settings01Icon}
      defaultOpen={false}
    >
      <div className="grid grid-cols-3 gap-2">
        <Button size="sm" variant="outline" onClick={() => handleExport("dxf")}>
          DXF
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleExport("svg")}>
          SVG
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleExport("pdf")}>
          PDF
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("drawings.properties.export.description")}</p>
    </CollapsibleSection>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface DrawingPropertiesPanelProps {
  className?: string
  onClose?: () => void
}

export function DrawingPropertiesPanel({ className, onClose }: DrawingPropertiesPanelProps) {
  const { t } = useTranslation()
  const activeDrawing = useDrawingStore((s) => s.getActiveDrawing())

  if (!activeDrawing) {
    return (
      <div className={cn("flex h-full items-center justify-center p-4", className)}>
        <div className="text-center text-muted-foreground">
          <HugeiconsIcon icon={Settings01Icon} className="size-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("drawings.properties.noActiveDrawing")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full overflow-hidden bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Settings01Icon} className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("drawings.properties.title")}</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="h-6 w-6">
            <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
          </Button>
        )}
      </div>

      {/* Drawing name */}
      <div className="px-3 py-2 border-b border-border/40">
        <p className="text-xs text-muted-foreground truncate">{activeDrawing.name}</p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0" showFadeMasks>
        <div className="divide-y divide-border/40">
          <SheetSection />
          <DimensionsSection />
          <ViewDisplaySection />
          <ViewLabelsSection />
          <HatchSection />
          <LayoutGridSection />
          <LineWidthsSection />
          <ExportSection />
        </div>
      </ScrollArea>
    </div>
  )
}
