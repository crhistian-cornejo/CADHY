/**
 * TransitionPropertiesPanel Component - CADHY
 *
 * Properties panel for hydraulic transition objects.
 * Connects channels with different cross-sections.
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
import { GridIcon, Layers01Icon, Move01Icon, WaterEnergyIcon } from "@hugeicons/core-free-icons"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  type TransitionObject,
  type TransitionSection,
  type TransitionTypeEnum,
  useModellerStore,
} from "@/stores/modeller"
import { TransitionSectionPreview } from "../previews/TransitionSectionPreview"
import { PropertyRow } from "../shared/PropertyRow"
import { PropertySection } from "../shared/PropertySection"

// ============================================================================
// TYPES
// ============================================================================

export interface TransitionPropertiesPanelProps {
  object: TransitionObject
  onUpdate: (updates: Partial<TransitionObject>) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TransitionPropertiesPanel({ object, onUpdate }: TransitionPropertiesPanelProps) {
  const { t } = useTranslation()
  const objects = useModellerStore((s) => s.objects)

  // Get connected channel names
  const upstreamName = useMemo(() => {
    if (!object.upstreamChannelId) return null
    return objects.find((o) => o.id === object.upstreamChannelId)?.name ?? "Unknown"
  }, [objects, object.upstreamChannelId])

  const downstreamName = useMemo(() => {
    if (!object.downstreamChannelId) return null
    return objects.find((o) => o.id === object.downstreamChannelId)?.name ?? "Unknown"
  }, [objects, object.downstreamChannelId])

  // Handler for transition type change
  const handleTypeChange = useCallback(
    (newType: TransitionTypeEnum) => {
      onUpdate({ transitionType: newType })
    },
    [onUpdate]
  )

  // Handler for length change
  const handleLengthChange = useCallback(
    (newLength: number) => {
      const slope = (object.startElevation - object.endElevation) / object.length || 0.005
      onUpdate({
        length: newLength,
        endStation: object.startStation + newLength,
        endElevation: object.startElevation - newLength * slope,
      })
    },
    [object, onUpdate]
  )

  // Handler for elevation changes
  const handleStartElevationChange = useCallback(
    (value: number) => {
      const slope = (object.startElevation - object.endElevation) / object.length || 0.005
      onUpdate({
        startElevation: value,
        endElevation: value - object.length * slope,
      })
    },
    [object, onUpdate]
  )

  const handleEndElevationChange = useCallback(
    (value: number) => {
      onUpdate({ endElevation: value })
    },
    [onUpdate]
  )

  // Handler for inlet section changes
  const handleInletChange = useCallback(
    (field: keyof TransitionSection, value: number | string) => {
      onUpdate({
        inlet: { ...object.inlet, [field]: value },
      })
    },
    [object.inlet, onUpdate]
  )

  // Handler for outlet section changes
  const handleOutletChange = useCallback(
    (field: keyof TransitionSection, value: number | string) => {
      onUpdate({
        outlet: { ...object.outlet, [field]: value },
      })
    },
    [object.outlet, onUpdate]
  )

  return (
    <>
      {/* Transition Type & Geometry */}
      <PropertySection
        title={t("properties.transitionGeometry", "Transition Geometry")}
        icon={GridIcon}
      >
        {/* Preview */}
        <TransitionSectionPreview inlet={object.inlet} outlet={object.outlet} />

        {/* Transition Type */}
        <PropertyRow label={t("properties.transitionType", "Type")}>
          <Select
            value={object.transitionType}
            onValueChange={(v) => handleTypeChange(v as TransitionTypeEnum)}
          >
            <SelectTrigger className="h-6 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear" className="text-[10px]">
                {t("properties.transitionTypes.linear", "Linear")}
              </SelectItem>
              <SelectItem value="warped" className="text-[10px]">
                {t("properties.transitionTypes.warped", "Warped")}
              </SelectItem>
              <SelectItem value="cylindrical" className="text-[10px]">
                {t("properties.transitionTypes.cylindrical", "Cylindrical")}
              </SelectItem>
              <SelectItem value="inlet" className="text-[10px]">
                {t("properties.transitionTypes.inlet", "Inlet")}
              </SelectItem>
              <SelectItem value="outlet" className="text-[10px]">
                {t("properties.transitionTypes.outlet", "Outlet")}
              </SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>

        {/* Length */}
        <PropertyRow label={t("properties.length", "Length")}>
          <NumberInput
            value={object.length}
            onChange={handleLengthChange}
            step={0.5}
            min={0.5}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>

        {/* Stations */}
        <PropertyRow label={t("properties.startStation", "Start St.")}>
          <div className="h-6 flex items-center text-[10px] text-muted-foreground px-2 bg-muted/30 rounded">
            {object.startStation?.toFixed(2)} m
          </div>
        </PropertyRow>
        <PropertyRow label={t("properties.endStation", "End St.")}>
          <div className="h-6 flex items-center text-[10px] text-muted-foreground px-2 bg-muted/30 rounded">
            {object.endStation?.toFixed(2)} m
          </div>
        </PropertyRow>
      </PropertySection>

      {/* Elevations */}
      <PropertySection
        title={t("properties.elevations", "Elevations")}
        icon={Move01Icon}
        defaultOpen={false}
      >
        <PropertyRow label={t("properties.startElevation", "Start Elev.")}>
          <NumberInput
            value={object.startElevation ?? 0}
            onChange={handleStartElevationChange}
            step={0.1}
            precision={3}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.endElevation", "End Elev.")}>
          <NumberInput
            value={object.endElevation ?? 0}
            onChange={handleEndElevationChange}
            step={0.1}
            precision={3}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.slope", "Slope")}>
          <div className="h-6 flex items-center text-[10px] text-muted-foreground px-2 bg-muted/30 rounded">
            {object.length > 0
              ? ((object.startElevation - object.endElevation) / object.length).toFixed(5)
              : "0.00000"}
          </div>
        </PropertyRow>
      </PropertySection>

      {/* Inlet Section */}
      <PropertySection
        title={t("properties.inletSection", "Inlet Section")}
        icon={WaterEnergyIcon}
        defaultOpen={false}
      >
        <PropertyRow label={t("properties.type", "Type")}>
          <Select
            value={object.inlet.sectionType}
            onValueChange={(v) => handleInletChange("sectionType", v)}
            disabled={!!object.upstreamChannelId}
          >
            <SelectTrigger className="h-6 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rectangular" className="text-[10px]">
                Rectangular
              </SelectItem>
              <SelectItem value="trapezoidal" className="text-[10px]">
                Trapezoidal
              </SelectItem>
              <SelectItem value="triangular" className="text-[10px]">
                Triangular
              </SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>
        <PropertyRow label={t("properties.width", "Width")}>
          <NumberInput
            value={object.inlet.width}
            onChange={(v) => handleInletChange("width", v)}
            step={0.1}
            min={0}
            precision={2}
            className="h-6 text-[10px]"
            disabled={!!object.upstreamChannelId}
          />
        </PropertyRow>
        <PropertyRow label={t("properties.depth", "Depth")}>
          <NumberInput
            value={object.inlet.depth}
            onChange={(v) => handleInletChange("depth", v)}
            step={0.1}
            min={0.1}
            precision={2}
            className="h-6 text-[10px]"
            disabled={!!object.upstreamChannelId}
          />
        </PropertyRow>
        {object.inlet.sectionType !== "rectangular" && (
          <PropertyRow label={t("properties.sideSlope", "Side Slope")}>
            <NumberInput
              value={object.inlet.sideSlope}
              onChange={(v) => handleInletChange("sideSlope", v)}
              step={0.1}
              min={0}
              precision={2}
              className="h-6 text-[10px]"
              disabled={!!object.upstreamChannelId}
            />
          </PropertyRow>
        )}
        {object.upstreamChannelId && (
          <div className="text-[9px] text-muted-foreground mt-1 px-1">
            Linked to: {upstreamName}
          </div>
        )}
      </PropertySection>

      {/* Outlet Section */}
      <PropertySection
        title={t("properties.outletSection", "Outlet Section")}
        icon={WaterEnergyIcon}
        defaultOpen={false}
      >
        <PropertyRow label={t("properties.type", "Type")}>
          <Select
            value={object.outlet.sectionType}
            onValueChange={(v) => handleOutletChange("sectionType", v)}
            disabled={!!object.downstreamChannelId}
          >
            <SelectTrigger className="h-6 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rectangular" className="text-[10px]">
                Rectangular
              </SelectItem>
              <SelectItem value="trapezoidal" className="text-[10px]">
                Trapezoidal
              </SelectItem>
              <SelectItem value="triangular" className="text-[10px]">
                Triangular
              </SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>
        <PropertyRow label={t("properties.width", "Width")}>
          <NumberInput
            value={object.outlet.width}
            onChange={(v) => handleOutletChange("width", v)}
            step={0.1}
            min={0}
            precision={2}
            className="h-6 text-[10px]"
            disabled={!!object.downstreamChannelId}
          />
        </PropertyRow>
        <PropertyRow label={t("properties.depth", "Depth")}>
          <NumberInput
            value={object.outlet.depth}
            onChange={(v) => handleOutletChange("depth", v)}
            step={0.1}
            min={0.1}
            precision={2}
            className="h-6 text-[10px]"
            disabled={!!object.downstreamChannelId}
          />
        </PropertyRow>
        {object.outlet.sectionType !== "rectangular" && (
          <PropertyRow label={t("properties.sideSlope", "Side Slope")}>
            <NumberInput
              value={object.outlet.sideSlope}
              onChange={(v) => handleOutletChange("sideSlope", v)}
              step={0.1}
              min={0}
              precision={2}
              className="h-6 text-[10px]"
              disabled={!!object.downstreamChannelId}
            />
          </PropertyRow>
        )}
        {object.downstreamChannelId && (
          <div className="text-[9px] text-muted-foreground mt-1 px-1">
            Linked to: {downstreamName}
          </div>
        )}
      </PropertySection>

      {/* Connections */}
      <PropertySection
        title={t("properties.connections", "Connections")}
        icon={Layers01Icon}
        defaultOpen={false}
      >
        <PropertyRow label={t("properties.upstream", "Upstream")}>
          {upstreamName ? (
            <Badge variant="outline" className="text-[9px]">
              {upstreamName}
            </Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground">None</span>
          )}
        </PropertyRow>
        <PropertyRow label={t("properties.downstream", "Downstream")}>
          {downstreamName ? (
            <Badge variant="outline" className="text-[9px]">
              {downstreamName}
            </Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground">None</span>
          )}
        </PropertyRow>
      </PropertySection>
    </>
  )
}
