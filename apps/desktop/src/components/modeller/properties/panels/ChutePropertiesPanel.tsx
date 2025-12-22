/**
 * ChutePropertiesPanel Component - CADHY
 *
 * Properties panel for hydraulic chute objects.
 * Includes chute geometry, cross-section, step/baffle params, and stilling basin.
 */

import {
  Badge,
  Button,
  Label,
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
  CHUTE_TYPE_INFO,
  type ChuteObject,
  type ChuteType,
  STILLING_BASIN_TYPE_INFO,
  type StillingBasinConfig,
  type StillingBasinType,
  useModellerStore,
} from "@/stores/modeller"
import { ChuteSectionPreview } from "../previews/ChuteSectionPreview"
import { PropertyRow } from "../shared/PropertyRow"
import { PropertySection } from "../shared/PropertySection"

// ============================================================================
// TYPES
// ============================================================================

export interface ChutePropertiesPanelProps {
  object: ChuteObject
  onUpdate: (updates: Partial<ChuteObject>) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChutePropertiesPanel({ object, onUpdate }: ChutePropertiesPanelProps) {
  const { t } = useTranslation()
  const objects = useModellerStore((s) => s.objects)

  // Get connected element names
  const upstreamName = useMemo(() => {
    if (!object.upstreamChannelId) return null
    return objects.find((o) => o.id === object.upstreamChannelId)?.name ?? "Unknown"
  }, [objects, object.upstreamChannelId])

  const downstreamName = useMemo(() => {
    if (!object.downstreamChannelId) return null
    return objects.find((o) => o.id === object.downstreamChannelId)?.name ?? "Unknown"
  }, [objects, object.downstreamChannelId])

  // Handler for simple chute properties
  const handleChange = useCallback(
    (field: keyof ChuteObject, value: number) => {
      const updates: Partial<ChuteObject> = { [field]: value }

      // Get current values
      const inletLength = field === "inletLength" ? value : (object.inletLength ?? 1)
      const inletSlope = field === "inletSlope" ? value : (object.inletSlope ?? 0)
      const length = field === "length" ? value : object.length
      const drop = field === "drop" ? value : object.drop
      const startStation = field === "startStation" ? value : object.startStation
      const startElevation = field === "startElevation" ? value : object.startElevation

      // Auto-calculate derived values when relevant fields change
      if (
        ["length", "drop", "inletLength", "inletSlope", "startStation", "startElevation"].includes(
          field
        )
      ) {
        const inletDrop = inletLength * inletSlope
        const totalHorizontalLength = inletLength + length

        updates.slope = length > 0 ? drop / length : 0
        updates.endStation = startStation + totalHorizontalLength
        updates.endElevation = startElevation - inletDrop - drop
      }

      onUpdate(updates)
    },
    [object, onUpdate]
  )

  // Handler for chute type change
  const handleTypeChange = useCallback(
    (newType: ChuteType) => {
      const updates: Partial<ChuteObject> = { chuteType: newType }

      // Set default parameters for type
      if (newType === "stepped") {
        if (!object.stepHeight || object.stepHeight <= 0) updates.stepHeight = 0.3
        if (!object.stepLength || object.stepLength <= 0) updates.stepLength = 0.5
      } else if (newType === "baffled") {
        if (!object.baffleSpacing || object.baffleSpacing <= 0) updates.baffleSpacing = 1.0
        if (!object.baffleHeight || object.baffleHeight <= 0) updates.baffleHeight = 0.2
      }

      onUpdate(updates)
    },
    [object, onUpdate]
  )

  // Handler for stilling basin toggle
  const handleBasinToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        // Create default basin config
        const defaultBasin: StillingBasinConfig = {
          type: "type-iii",
          length: object.length * 0.4,
          depth: object.depth * 0.5,
          floorThickness: 0.3,
          chuteBlocks: {
            count: 3,
            width: 0.3,
            height: 0.3,
            thickness: 0.3,
            spacing: 0.3,
          },
          baffleBlocks: null,
          endSill: {
            type: "solid",
            height: 0.3,
          },
          wingwallAngle: 0,
        }
        onUpdate({ stillingBasin: defaultBasin })
      } else {
        onUpdate({ stillingBasin: null })
      }
    },
    [object.length, object.depth, onUpdate]
  )

  // Handler for stilling basin type change
  const handleBasinTypeChange = useCallback(
    (newType: StillingBasinType) => {
      if (!object.stillingBasin) return

      const updates: StillingBasinConfig = { ...object.stillingBasin, type: newType }

      // Adjust features based on type
      switch (newType) {
        case "type-i":
          updates.chuteBlocks = null
          updates.baffleBlocks = null
          updates.endSill = null
          break
        case "type-ii":
          updates.chuteBlocks = updates.chuteBlocks ?? {
            count: 3,
            width: 0.3,
            height: 0.3,
            thickness: 0.3,
            spacing: 0.3,
          }
          updates.baffleBlocks = null
          updates.endSill = {
            type: "dentated",
            height: 0.3,
            toothWidth: 0.2,
            toothSpacing: 0.2,
          }
          break
        case "type-iii":
          updates.chuteBlocks = updates.chuteBlocks ?? {
            count: 3,
            width: 0.3,
            height: 0.3,
            thickness: 0.3,
            spacing: 0.3,
          }
          updates.baffleBlocks = updates.baffleBlocks ?? {
            rows: 1,
            blocksPerRow: 3,
            width: 0.3,
            height: 0.24,
            thickness: 0.3,
            distanceFromInlet: updates.length * 0.3,
            rowSpacing: 0.5,
          }
          updates.endSill = { type: "solid", height: 0.3 }
          break
        case "type-iv":
          updates.chuteBlocks = null
          updates.baffleBlocks = null
          updates.endSill = { type: "solid", height: 0.2 }
          break
        case "saf":
          updates.chuteBlocks = updates.chuteBlocks ?? {
            count: 3,
            width: 0.3,
            height: 0.3,
            thickness: 0.3,
            spacing: 0.3,
          }
          updates.baffleBlocks = updates.baffleBlocks ?? {
            rows: 1,
            blocksPerRow: 3,
            width: 0.3,
            height: 0.24,
            thickness: 0.3,
            distanceFromInlet: updates.length * 0.4,
            rowSpacing: 0.5,
          }
          updates.endSill = { type: "solid", height: 0.25 }
          updates.wingwallAngle = 45
          break
      }

      onUpdate({ stillingBasin: updates })
    },
    [object.stillingBasin, onUpdate]
  )

  // Handler for basin property change
  const handleBasinChange = useCallback(
    (field: keyof StillingBasinConfig, value: number) => {
      if (!object.stillingBasin) return
      onUpdate({
        stillingBasin: { ...object.stillingBasin, [field]: value },
      })
    },
    [object.stillingBasin, onUpdate]
  )

  // Computed values
  const slopePercent = object.slope * 100
  const slopeAngle = Math.atan(object.slope) * (180 / Math.PI)

  return (
    <>
      {/* Chute Type & Geometry */}
      <PropertySection title={t("properties.chuteGeometry", "Chute Geometry")} icon={GridIcon}>
        {/* Preview */}
        <ChuteSectionPreview
          width={object.width}
          depth={object.depth}
          sideSlope={object.sideSlope}
          chuteType={object.chuteType}
          stillingBasin={!!object.stillingBasin}
        />

        {/* Chute Type */}
        <PropertyRow label={t("properties.chuteType", "Type")}>
          <Select value={object.chuteType} onValueChange={(v) => handleTypeChange(v as ChuteType)}>
            <SelectTrigger className="h-6 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CHUTE_TYPE_INFO) as ChuteType[]).map((type) => (
                <SelectItem key={type} value={type} className="text-[10px]">
                  {CHUTE_TYPE_INFO[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>
        <div className="text-[9px] text-muted-foreground px-1 -mt-1 mb-2">
          {CHUTE_TYPE_INFO[object.chuteType ?? "smooth"]?.description ?? "Standard chute"}
        </div>

        {/* Inlet Section */}
        <div className="text-[9px] font-medium text-muted-foreground px-1 mt-2 mb-1">
          Inlet Section (transition from upstream)
        </div>
        <PropertyRow label="Inlet Length">
          <NumberInput
            value={object.inletLength ?? 1}
            onChange={(v) => handleChange("inletLength", v)}
            step={0.5}
            min={0}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label="Inlet Slope">
          <NumberInput
            value={object.inletSlope ?? 0}
            onChange={(v) => handleChange("inletSlope", v)}
            step={0.01}
            min={0}
            max={0.1}
            precision={3}
            className="h-6 text-[10px]"
          />
        </PropertyRow>

        {/* Main Chute Section */}
        <div className="text-[9px] font-medium text-muted-foreground px-1 mt-2 mb-1">
          Main Chute
        </div>
        <PropertyRow label={t("properties.length", "Length")}>
          <NumberInput
            value={object.length}
            onChange={(v) => handleChange("length", v)}
            step={1}
            min={0.5}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.drop", "Drop")}>
          <NumberInput
            value={object.drop}
            onChange={(v) => handleChange("drop", v)}
            step={0.5}
            min={0}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.slope", "Slope")}>
          <div className="h-6 flex items-center text-[10px] text-muted-foreground px-2 bg-muted/30 rounded">
            {slopePercent.toFixed(1)}% ({slopeAngle.toFixed(1)}°)
          </div>
        </PropertyRow>
      </PropertySection>

      {/* Cross Section */}
      <PropertySection
        title={t("properties.crossSection", "Cross Section")}
        icon={GridIcon}
        defaultOpen={false}
      >
        <PropertyRow label={t("properties.width", "Width")}>
          <NumberInput
            value={object.width}
            onChange={(v) => handleChange("width", v)}
            step={0.1}
            min={0.1}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.depth", "Depth")}>
          <NumberInput
            value={object.depth}
            onChange={(v) => handleChange("depth", v)}
            step={0.1}
            min={0.1}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.sideSlope", "Side Slope")}>
          <NumberInput
            value={object.sideSlope}
            onChange={(v) => handleChange("sideSlope", v)}
            step={0.1}
            min={0}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.thickness", "Thickness")}>
          <NumberInput
            value={object.thickness}
            onChange={(v) => handleChange("thickness", v)}
            step={0.05}
            min={0.05}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.manningN", "Manning's n")}>
          <NumberInput
            value={object.manningN}
            onChange={(v) => handleChange("manningN", v)}
            step={0.001}
            min={0.001}
            precision={4}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
      </PropertySection>

      {/* Type-specific Parameters - Stepped */}
      {object.chuteType === "stepped" && (
        <PropertySection
          title={t("properties.steppedParams", "Step Parameters")}
          icon={WaterEnergyIcon}
          defaultOpen
        >
          <PropertyRow label={t("properties.stepHeight", "Step Height")}>
            <NumberInput
              value={object.stepHeight}
              onChange={(v) => onUpdate({ stepHeight: v })}
              step={0.05}
              min={0.1}
              precision={2}
              className="h-6 text-[10px]"
            />
          </PropertyRow>
          <PropertyRow label={t("properties.stepLength", "Step Length")}>
            <NumberInput
              value={object.stepLength}
              onChange={(v) => onUpdate({ stepLength: v })}
              step={0.1}
              min={0.2}
              precision={2}
              className="h-6 text-[10px]"
            />
          </PropertyRow>
          <PropertyRow label={t("properties.numSteps", "Num. Steps")}>
            <div className="h-6 flex items-center text-[10px] text-muted-foreground px-2 bg-muted/30 rounded">
              {object.stepLength > 0 ? Math.ceil(object.length / object.stepLength) : 0}
            </div>
          </PropertyRow>
        </PropertySection>
      )}

      {/* Type-specific Parameters - Baffled */}
      {object.chuteType === "baffled" && (
        <PropertySection
          title={t("properties.baffledParams", "Baffle Parameters")}
          icon={WaterEnergyIcon}
          defaultOpen
        >
          <PropertyRow label={t("properties.baffleSpacing", "Spacing")}>
            <NumberInput
              value={object.baffleSpacing}
              onChange={(v) => onUpdate({ baffleSpacing: v })}
              step={0.1}
              min={0.3}
              precision={2}
              className="h-6 text-[10px]"
            />
          </PropertyRow>
          <PropertyRow label={t("properties.baffleHeight", "Height")}>
            <NumberInput
              value={object.baffleHeight}
              onChange={(v) => onUpdate({ baffleHeight: v })}
              step={0.05}
              min={0.1}
              precision={2}
              className="h-6 text-[10px]"
            />
          </PropertyRow>
          <PropertyRow label={t("properties.numBaffles", "Num. Rows")}>
            <div className="h-6 flex items-center text-[10px] text-muted-foreground px-2 bg-muted/30 rounded">
              {object.baffleSpacing > 0 ? Math.floor(object.length / object.baffleSpacing) : 0}
            </div>
          </PropertyRow>
        </PropertySection>
      )}

      {/* Alignment / Station Data */}
      <PropertySection
        title={t("properties.alignment", "Alignment")}
        icon={Move01Icon}
        defaultOpen={false}
      >
        <PropertyRow label={t("properties.startStation", "Start St.")}>
          <NumberInput
            value={object.startStation}
            onChange={(v) => handleChange("startStation", v)}
            step={1}
            min={0}
            precision={2}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.endStation", "End St.")}>
          <div className="h-6 flex items-center text-[10px] text-muted-foreground px-2 bg-muted/30 rounded">
            {object.endStation?.toFixed(2)} m
          </div>
        </PropertyRow>
        <PropertyRow label={t("properties.startElevation", "Start Elev.")}>
          <NumberInput
            value={object.startElevation}
            onChange={(v) => handleChange("startElevation", v)}
            step={0.1}
            precision={3}
            className="h-6 text-[10px]"
          />
        </PropertyRow>
        <PropertyRow label={t("properties.endElevation", "End Elev.")}>
          <div className="h-6 flex items-center text-[10px] text-muted-foreground px-2 bg-muted/30 rounded">
            {object.endElevation?.toFixed(3)} m
          </div>
        </PropertyRow>
      </PropertySection>

      {/* Stilling Basin */}
      <PropertySection
        title={t("properties.stillingBasin", "Stilling Basin")}
        icon={WaterEnergyIcon}
        defaultOpen
      >
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between mb-2">
          <Label className="text-[10px]">{t("properties.enabled", "Enabled")}</Label>
          <Button
            variant={object.stillingBasin ? "secondary" : "outline"}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => handleBasinToggle(!object.stillingBasin)}
          >
            {object.stillingBasin ? "Yes" : "No"}
          </Button>
        </div>

        {object.stillingBasin && (
          <>
            {/* Basin Type */}
            <PropertyRow label={t("properties.basinType", "Type")}>
              <Select
                value={object.stillingBasin.type}
                onValueChange={(v) => handleBasinTypeChange(v as StillingBasinType)}
              >
                <SelectTrigger className="h-6 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STILLING_BASIN_TYPE_INFO) as StillingBasinType[])
                    .filter((type) => type !== "none")
                    .map((type) => (
                      <SelectItem key={type} value={type} className="text-[10px]">
                        {STILLING_BASIN_TYPE_INFO[type].label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </PropertyRow>
            <div className="text-[9px] text-muted-foreground px-1 -mt-1 mb-2">
              {STILLING_BASIN_TYPE_INFO[object.stillingBasin.type].description}
              <span className="text-primary ml-1">
                ({STILLING_BASIN_TYPE_INFO[object.stillingBasin.type].froudeRange})
              </span>
            </div>

            {/* Basin Dimensions */}
            <PropertyRow label={t("properties.basinLength", "Length")}>
              <NumberInput
                value={object.stillingBasin.length}
                onChange={(v) => handleBasinChange("length", v)}
                step={0.5}
                min={0.5}
                precision={2}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.basinDepth", "Depth")}>
              <NumberInput
                value={object.stillingBasin.depth}
                onChange={(v) => handleBasinChange("depth", v)}
                step={0.1}
                min={0}
                precision={2}
                className="h-6 text-[10px]"
              />
            </PropertyRow>

            {/* Features list */}
            {STILLING_BASIN_TYPE_INFO[object.stillingBasin.type].features.length > 0 && (
              <div className="mt-2 px-1">
                <div className="text-[9px] text-muted-foreground mb-1">Features:</div>
                <div className="flex flex-wrap gap-1">
                  {STILLING_BASIN_TYPE_INFO[object.stillingBasin.type].features.map((f, i) => (
                    <Badge key={i} variant="outline" className="text-[8px] h-4">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
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
