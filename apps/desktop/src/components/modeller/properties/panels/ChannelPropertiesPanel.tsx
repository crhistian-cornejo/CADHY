/**
 * ChannelPropertiesPanel Component - CADHY
 *
 * Properties panel for hydraulic channel objects.
 * Includes section preview, cross-section type, hydraulics, and alignment.
 */

import {
  Badge,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cadhy/ui"
import { CubeIcon, GridIcon, Move01Icon, WaterEnergyIcon } from "@hugeicons/core-free-icons"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import type {
  ChannelObject,
  ChannelSection,
  RectangularSection,
  TrapezoidalSection,
  TriangularSection,
} from "@/stores/modeller"
import { ChannelSectionPreview } from "../previews/ChannelSectionPreview"
import { PropertyRow } from "../shared/PropertyRow"
import { PropertySection } from "../shared/PropertySection"

// ============================================================================
// TYPES
// ============================================================================

export interface ChannelPropertiesPanelProps {
  object: ChannelObject
  onUpdate: (updates: Partial<ChannelObject>) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChannelPropertiesPanel({ object, onUpdate }: ChannelPropertiesPanelProps) {
  const { t } = useTranslation()

  // Handler for simple channel properties
  const handleChange = useCallback(
    (field: keyof ChannelObject, value: number) => {
      const updates: Partial<ChannelObject> = { [field]: value }

      // Auto-calculate end station and elevation when length or slope changes
      if (field === "length" || field === "slope") {
        const length = field === "length" ? value : object.length
        const slope = field === "slope" ? value : object.slope
        updates.endStation = object.startStation + length
        updates.endElevation = object.startElevation - length * slope

        // Also update alignment endpoints
        updates.alignment = [
          {
            station: object.startStation,
            position: { x: 0, y: 0, z: object.startElevation },
          },
          {
            station: object.startStation + length,
            position: {
              x: length,
              y: 0,
              z: object.startElevation - length * slope,
            },
          },
        ]
      }

      if (field === "startStation" || field === "startElevation") {
        const startStation = field === "startStation" ? value : object.startStation
        const startElevation = field === "startElevation" ? value : object.startElevation
        updates.endStation = startStation + object.length
        updates.endElevation = startElevation - object.length * object.slope
        updates.alignment = [
          { station: startStation, position: { x: 0, y: 0, z: startElevation } },
          {
            station: startStation + object.length,
            position: {
              x: object.length,
              y: 0,
              z: startElevation - object.length * object.slope,
            },
          },
        ]
      }

      onUpdate(updates)
    },
    [object, onUpdate]
  )

  // Handler for section-specific properties
  const handleSectionChange = useCallback(
    (field: string, value: number) => {
      const updatedSection = { ...object.section, [field]: value } as ChannelSection
      onUpdate({ section: updatedSection })
    },
    [object.section, onUpdate]
  )

  // Handler for changing section type
  const handleSectionTypeChange = useCallback(
    (newType: string) => {
      let newSection: ChannelSection
      const currentDepth =
        (object.section as TrapezoidalSection).depth ??
        (object.section as RectangularSection).depth ??
        1.5

      switch (newType) {
        case "rectangular":
          newSection = {
            type: "rectangular",
            width: (object.section as RectangularSection).width ?? 2,
            depth: currentDepth,
          }
          break
        case "trapezoidal":
          newSection = {
            type: "trapezoidal",
            bottomWidth: (object.section as TrapezoidalSection).bottomWidth ?? 2,
            depth: currentDepth,
            sideSlope: (object.section as TrapezoidalSection).sideSlope ?? 1.5,
          }
          break
        case "triangular":
          newSection = {
            type: "triangular",
            depth: currentDepth,
            sideSlope: (object.section as TriangularSection).sideSlope ?? 1,
          }
          break
        default:
          return
      }
      onUpdate({ section: newSection })
    },
    [object.section, onUpdate]
  )

  // Computed values
  const startStation = object.startStation ?? 0
  const endStation = object.endStation ?? startStation + object.length
  const startElevation = object.startElevation ?? 0
  const endElevation = object.endElevation ?? startElevation - object.length * object.slope

  return (
    <>
      {/* Section Geometry */}
      <PropertySection title={t("properties.crossSection")} icon={GridIcon}>
        {/* Section Preview */}
        <ChannelSectionPreview section={object.section} thickness={object.thickness} />

        {/* Section Type Selector */}
        <PropertyRow label={t("properties.type")}>
          <Select value={object.section.type} onValueChange={handleSectionTypeChange}>
            <SelectTrigger className="h-6 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rectangular" className="text-[10px]">
                {t("properties.sectionTypes.rectangular")}
              </SelectItem>
              <SelectItem value="trapezoidal" className="text-[10px]">
                {t("properties.sectionTypes.trapezoidal")}
              </SelectItem>
              <SelectItem value="triangular" className="text-[10px]">
                {t("properties.sectionTypes.triangular")}
              </SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>

        {/* Section-specific parameters */}
        {object.section.type === "rectangular" && (
          <>
            <PropertyRow label={t("properties.sectionParams.widthB")}>
              <NumberInput
                value={(object.section as RectangularSection).width ?? 2}
                onChange={(v) => handleSectionChange("width", v)}
                step={0.1}
                min={0.1}
                precision={2}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.sectionParams.depthY")}>
              <NumberInput
                value={(object.section as RectangularSection).depth ?? 1.5}
                onChange={(v) => handleSectionChange("depth", v)}
                step={0.1}
                min={0.1}
                precision={2}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )}

        {object.section.type === "trapezoidal" && (
          <>
            <PropertyRow label={t("properties.sectionParams.bottomB")}>
              <NumberInput
                value={(object.section as TrapezoidalSection).bottomWidth ?? 2}
                onChange={(v) => handleSectionChange("bottomWidth", v)}
                step={0.1}
                min={0.1}
                precision={2}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.sectionParams.depthY")}>
              <NumberInput
                value={(object.section as TrapezoidalSection).depth ?? 1.5}
                onChange={(v) => handleSectionChange("depth", v)}
                step={0.1}
                min={0.1}
                precision={2}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.sectionParams.sideSlope")}>
              <NumberInput
                value={(object.section as TrapezoidalSection).sideSlope ?? 1.5}
                onChange={(v) => handleSectionChange("sideSlope", v)}
                step={0.1}
                min={0}
                precision={2}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )}

        {object.section.type === "triangular" && (
          <>
            <PropertyRow label={t("properties.sectionParams.depthY")}>
              <NumberInput
                value={(object.section as TriangularSection).depth ?? 1.5}
                onChange={(v) => handleSectionChange("depth", v)}
                step={0.1}
                min={0.1}
                precision={2}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.sectionParams.sideSlope")}>
              <NumberInput
                value={(object.section as TriangularSection).sideSlope ?? 1}
                onChange={(v) => handleSectionChange("sideSlope", v)}
                step={0.1}
                min={0.1}
                precision={2}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )}
      </PropertySection>

      {/* Structural Properties */}
      <PropertySection title={t("properties.structure")} icon={CubeIcon} defaultOpen={false}>
        <PropertyRow label={t("properties.thickness")}>
          <NumberInput
            value={object.thickness ?? 0.15}
            onChange={(v) => handleChange("thickness", v)}
            step={0.01}
            min={0.05}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.freeboard")}>
          <NumberInput
            value={object.freeBoard ?? 0.3}
            onChange={(v) => handleChange("freeBoard", v)}
            step={0.05}
            min={0.1}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
      </PropertySection>

      {/* Hydraulic Properties */}
      <PropertySection title={t("properties.hydraulics")} icon={WaterEnergyIcon}>
        <PropertyRow label={t("properties.manningN")}>
          <NumberInput
            value={object.manningN}
            onChange={(v) => handleChange("manningN", v)}
            step={0.001}
            min={0.001}
            precision={4}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.slope")}>
          <NumberInput
            value={object.slope}
            onChange={(v) => handleChange("slope", v)}
            step={0.0001}
            min={0}
            precision={5}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.length")}>
          <NumberInput
            value={object.length}
            onChange={(v) => handleChange("length", v)}
            step={1}
            min={0.1}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
      </PropertySection>

      {/* Alignment / Station Data */}
      <PropertySection title={t("properties.alignment")} icon={Move01Icon} defaultOpen={false}>
        <PropertyRow label={t("properties.startStation")}>
          <NumberInput
            value={startStation}
            onChange={(v) => handleChange("startStation", v)}
            step={1}
            min={0}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.endStation")}>
          <div className="h-6 flex items-center text-[10px] text-muted-foreground px-2 bg-muted/30 rounded">
            {endStation.toFixed(2)} m
          </div>
        </PropertyRow>
        <PropertyRow label={t("properties.startElevation")}>
          <NumberInput
            value={startElevation}
            onChange={(v) => handleChange("startElevation", v)}
            step={0.1}
            precision={3}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.endElevation")}>
          <div className="h-6 flex items-center text-[10px] text-muted-foreground px-2 bg-muted/30 rounded">
            {endElevation.toFixed(3)} m
          </div>
        </PropertyRow>
        {/* Connection info */}
        {(object.upstreamChannelId || object.downstreamChannelId) && (
          <>
            {object.upstreamChannelId && (
              <PropertyRow label={t("properties.upstream")}>
                <Badge variant="outline" className="text-[9px]">
                  {t("properties.connected")}
                </Badge>
              </PropertyRow>
            )}
            {object.downstreamChannelId && (
              <PropertyRow label={t("properties.downstream")}>
                <Badge variant="outline" className="text-[9px]">
                  {t("properties.connected")}
                </Badge>
              </PropertyRow>
            )}
          </>
        )}
      </PropertySection>
    </>
  )
}
