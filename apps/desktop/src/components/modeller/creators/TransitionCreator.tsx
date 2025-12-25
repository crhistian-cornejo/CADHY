/**
 * TransitionCreator - CADHY
 *
 * Component for creating hydraulic transitions between channels.
 * Supports Linear, Warped, Cylindrical, Inlet, and Outlet transitions.
 */

import type { RectangularSection, TrapezoidalSection, TriangularSection } from "@cadhy/types"
import {
  Button,
  Card,
  Input,
  Label,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
} from "@cadhy/ui"
import { Cancel01Icon, Tick01Icon, WaterfallDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useUnits } from "@/hooks/use-units"
import {
  type ChannelObject,
  type StillingBasinConfig,
  type StillingBasinType,
  type TransitionSection,
  type TransitionTypeEnum,
  useModellerStore,
  useObjects,
} from "@/stores/modeller"

import { createSimpleBasinConfig } from "@/utils/stilling-basin-design"

interface TransitionCreatorProps {
  onClose: () => void
  onCreated: () => void
}

// type SectionType = "rectangular" | "trapezoidal" | "triangular"

// ============================================================================
// TRANSITION TYPE OPTIONS
// ============================================================================

const TRANSITION_TYPES: { value: TransitionTypeEnum; labelKey: string; descKey: string }[] = [
  {
    value: "linear",
    labelKey: "createPanel.transitionTypes.linear",
    descKey: "createPanel.transitionTypes.linearDesc",
  },
  {
    value: "warped",
    labelKey: "createPanel.transitionTypes.warped",
    descKey: "createPanel.transitionTypes.warpedDesc",
  },
  {
    value: "cylindrical",
    labelKey: "createPanel.transitionTypes.cylindrical",
    descKey: "createPanel.transitionTypes.cylindricalDesc",
  },
  {
    value: "inlet",
    labelKey: "createPanel.transitionTypes.inlet",
    descKey: "createPanel.transitionTypes.inletDesc",
  },
  {
    value: "outlet",
    labelKey: "createPanel.transitionTypes.outlet",
    descKey: "createPanel.transitionTypes.outletDesc",
  },
]

// ============================================================================
// STILLING BASIN OPTIONS
// ============================================================================

const STILLING_BASIN_TYPES: { value: StillingBasinType; labelKey: string; descKey: string }[] = [
  {
    value: "none",
    labelKey: "createPanel.stillingBasinTypes.none",
    descKey: "createPanel.stillingBasinTypes.noneDesc",
  },
  {
    value: "type-i",
    labelKey: "createPanel.stillingBasinTypes.typeI",
    descKey: "createPanel.stillingBasinTypes.typeIDesc",
  },
  {
    value: "type-ii",
    labelKey: "createPanel.stillingBasinTypes.typeII",
    descKey: "createPanel.stillingBasinTypes.typeIIDesc",
  },
  {
    value: "type-iii",
    labelKey: "createPanel.stillingBasinTypes.typeIII",
    descKey: "createPanel.stillingBasinTypes.typeIIIDesc",
  },
  {
    value: "type-iv",
    labelKey: "createPanel.stillingBasinTypes.typeIV",
    descKey: "createPanel.stillingBasinTypes.typeIVDesc",
  },
  {
    value: "saf",
    labelKey: "createPanel.stillingBasinTypes.saf",
    descKey: "createPanel.stillingBasinTypes.safDesc",
  },
]

// ============================================================================
// PARAM INPUT
// ============================================================================

type UnitType = "length" | "none"

interface ParamInputProps {
  label: string
  /** Value in internal units (meters for length) */
  value: number
  /** Callback receives value in internal units */
  onChange: (v: number) => void
  min?: number
  step?: number
  /** Type of unit: 'length' for length params */
  unitType?: UnitType
  /** Override unit label (for custom units like H:V) */
  customUnit?: string
}

function ParamInput({
  label,
  value,
  onChange,
  min = 0.01,
  step = 0.1,
  unitType,
  customUnit,
}: ParamInputProps) {
  const { lengthLabel, convertLengthToDisplay, parseLength } = useUnits()

  // Determine unit label
  const unitLabel = customUnit ?? (unitType === "length" ? lengthLabel : undefined)

  // Convert value for display (internal -> display)
  // Fallback to 0 if value is undefined/null to prevent .toFixed() crash
  const safeValue = value ?? 0
  const displayValue = unitType === "length" ? convertLengthToDisplay(safeValue) : safeValue

  // Handle change with conversion (display -> internal)
  const handleChange = (newDisplayValue: number) => {
    const internalValue = unitType === "length" ? parseLength(newDisplayValue) : newDisplayValue
    onChange(internalValue)
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="w-20 text-xs text-muted-foreground shrink-0">{label}</Label>
      <div className="flex-1 flex items-center gap-1">
        <NumberInput
          value={Number(displayValue.toFixed(4))}
          onChange={handleChange}
          min={min}
          step={step}
          className="h-7 text-xs"
        />
        {unitLabel && <span className="text-xs text-muted-foreground w-6">{unitLabel}</span>}
      </div>
    </div>
  )
}

// ============================================================================
// TRANSITION CREATOR
// ============================================================================

export function TransitionCreator({ onClose, onCreated }: TransitionCreatorProps) {
  const { t } = useTranslation()
  const { addObject, updateObject } = useModellerStore()
  const allObjects = useObjects()
  const { formatLength } = useUnits()

  // Get existing channels for connection
  const existingChannels = useMemo(
    () =>
      (allObjects.filter((o) => o.type === "channel") as ChannelObject[]).sort(
        (a, b) => (b.endStation ?? 0) - (a.endStation ?? 0)
      ),
    [allObjects]
  )

  // Count existing transitions
  const existingTransitions = allObjects.filter((o) => o.type === "transition")

  // Auto-increment name
  const [name, setName] = useState(() => `Transition ${existingTransitions.length + 1}`)

  // Transition type
  const [transitionType, setTransitionType] = useState<TransitionTypeEnum>("warped")

  // Connected channels
  const [upstreamChannelId, setUpstreamChannelId] = useState<string>(
    () => existingChannels[0]?.id ?? "none"
  )
  const [downstreamChannelId, setDownstreamChannelId] = useState<string>("none")

  // Length
  const [length, setLength] = useState(5)

  // Material
  const [transitionColor, setTransitionColor] = useState("#22c55e") // Green for transitions

  // Stilling basin (for drop transitions)
  const [enableStillingBasin, setEnableStillingBasin] = useState(false)
  const [basinType, setBasinType] = useState<StillingBasinType>("type-ii")
  const [basinLength, setBasinLength] = useState(5)
  const [basinDepth, setBasinDepth] = useState(1)
  const [baffleRows, setBaffleRows] = useState(1)
  const [hasEndSill, setHasEndSill] = useState(true)
  const [endSillHeight, setEndSillHeight] = useState(0.3)

  // Compute inlet/outlet from connected channels
  const upstreamChannel = existingChannels.find((c) => c.id === upstreamChannelId)
  const downstreamChannel = existingChannels.find((c) => c.id === downstreamChannelId)

  // Start position from upstream channel's end
  const startStation = useMemo(() => {
    if (upstreamChannel) {
      return (
        upstreamChannel.endStation ?? (upstreamChannel.startStation ?? 0) + upstreamChannel.length
      )
    }
    return 0
  }, [upstreamChannel])

  const startElevation = useMemo(() => {
    if (upstreamChannel) {
      return (
        upstreamChannel.endElevation ??
        (upstreamChannel.startElevation ?? 0) - upstreamChannel.length * upstreamChannel.slope
      )
    }
    return 0
  }, [upstreamChannel])

  // End elevation (linear drop or match downstream)
  const endElevation = useMemo(() => {
    if (downstreamChannel) {
      return downstreamChannel.startElevation ?? 0
    }
    // Default: 0.5% slope over transition length
    return startElevation - length * 0.005
  }, [downstreamChannel, startElevation, length])

  // Extract section from channel
  const getSectionFromChannel = (channel: ChannelObject | undefined): TransitionSection => {
    if (!channel) {
      return {
        sectionType: "trapezoidal",
        width: 2,
        depth: 1.5,
        sideSlope: 1.5,
        wallThickness: 0.15,
        floorThickness: 0.15,
      }
    }

    const section = channel.section
    const thickness = channel.thickness ?? 0.15

    switch (section.type) {
      case "rectangular":
        return {
          sectionType: "rectangular",
          width: (section as RectangularSection).width,
          depth: section.depth,
          sideSlope: 0,
          wallThickness: thickness,
          floorThickness: thickness,
        }
      case "trapezoidal":
        return {
          sectionType: "trapezoidal",
          width: (section as TrapezoidalSection).bottomWidth,
          depth: section.depth,
          sideSlope: (section as TrapezoidalSection).sideSlope,
          wallThickness: thickness,
          floorThickness: thickness,
        }
      case "triangular":
        return {
          sectionType: "triangular",
          width: 0,
          depth: section.depth,
          sideSlope: (section as TriangularSection).sideSlope,
          wallThickness: thickness,
          floorThickness: thickness,
        }
      default:
        return {
          sectionType: "trapezoidal",
          width: 2,
          depth: 1.5,
          sideSlope: 1.5,
          wallThickness: thickness,
          floorThickness: thickness,
        }
    }
  }

  // Inlet section from upstream
  const inletSection = useMemo(
    () => getSectionFromChannel(upstreamChannel),
    [upstreamChannel, getSectionFromChannel]
  )

  // Get outlet section from downstream channel (for thickness matching)
  const downstreamSection = useMemo(
    () => getSectionFromChannel(downstreamChannel),
    [downstreamChannel, getSectionFromChannel]
  )

  // Outlet section (from downstream or custom)
  const [outletWidth, setOutletWidth] = useState(() => {
    if (downstreamChannel) {
      return getSectionFromChannel(downstreamChannel).width
    }
    return inletSection.width * 1.5 // Default: 50% wider
  })
  const [outletDepth, setOutletDepth] = useState(() => {
    if (downstreamChannel) {
      return getSectionFromChannel(downstreamChannel).depth
    }
    return inletSection.depth
  })
  const [outletSideSlope, setOutletSideSlope] = useState(() => {
    if (downstreamChannel) {
      return getSectionFromChannel(downstreamChannel).sideSlope
    }
    return inletSection.sideSlope
  })

  // Update outlet when downstream channel changes
  const handleDownstreamChange = (channelId: string) => {
    setDownstreamChannelId(channelId)
    if (channelId !== "none") {
      const channel = existingChannels.find((c) => c.id === channelId)
      if (channel) {
        const section = getSectionFromChannel(channel)
        setOutletWidth(section.width)
        setOutletDepth(section.depth)
        setOutletSideSlope(section.sideSlope)
      }
    }
  }

  const handleCreate = () => {
    const endStation = startStation + length

    // Get outlet thickness from downstream channel if connected, otherwise use inlet thickness
    const outletWallThickness =
      downstreamChannelId !== "none" ? downstreamSection.wallThickness : inletSection.wallThickness
    const outletFloorThickness =
      downstreamChannelId !== "none"
        ? downstreamSection.floorThickness
        : inletSection.floorThickness

    // Get outlet section type from downstream channel if connected
    const outletSectionType =
      downstreamChannelId !== "none" ? downstreamSection.sectionType : inletSection.sectionType

    const outlet: TransitionSection = {
      sectionType: outletSectionType,
      width: outletWidth,
      depth: outletDepth,
      sideSlope: outletSideSlope,
      wallThickness: outletWallThickness,
      floorThickness: outletFloorThickness,
    }

    // Build stilling basin config if enabled
    const stillingBasin: StillingBasinConfig | null = enableStillingBasin
      ? createSimpleBasinConfig(basinType, basinLength, basinDepth, hasEndSill ? endSillHeight : 0)
      : null

    if (stillingBasin && basinType === "type-iii" && baffleRows > 0) {
      stillingBasin.baffleBlocks = {
        rows: baffleRows,
        blocksPerRow: 5, // Default
        width: 0.3,
        height: 0.3,
        thickness: 0.2,
        distanceFromInlet: basinLength / 3,
        rowSpacing: 1,
      }
    }

    const newTransitionId = addObject({
      name,
      type: "transition",
      layerId: "default",
      transform: {
        position: { x: startStation, y: 0, z: startElevation },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      visible: true,
      locked: false,
      selected: false,
      metadata: {},
      transitionType,
      length,
      startStation,
      startElevation,
      endStation,
      endElevation,
      upstreamChannelId: upstreamChannelId !== "none" ? upstreamChannelId : null,
      downstreamChannelId: downstreamChannelId !== "none" ? downstreamChannelId : null,
      inlet: inletSection,
      outlet,
      stillingBasin,
      material: {
        color: transitionColor,
        opacity: 1,
        metalness: 0.1,
        roughness: 0.6,
      },
    } as any)

    // Update channel connections and propagate positions
    if (upstreamChannelId !== "none") {
      updateObject(upstreamChannelId, { downstreamChannelId: newTransitionId })
    }

    // If there's a downstream channel, connect it and update its position
    if (downstreamChannelId !== "none") {
      const downstreamChannel = existingChannels.find((c) => c.id === downstreamChannelId)
      if (downstreamChannel) {
        // Calculate new positions for downstream channel
        const newDownstreamStartStation = endStation
        const newDownstreamStartElevation = endElevation
        const newDownstreamEndStation = newDownstreamStartStation + downstreamChannel.length
        const newDownstreamEndElevation =
          newDownstreamStartElevation - downstreamChannel.length * downstreamChannel.slope

        updateObject(downstreamChannelId, {
          upstreamChannelId: newTransitionId,
          startStation: newDownstreamStartStation,
          startElevation: newDownstreamStartElevation,
          endStation: newDownstreamEndStation,
          endElevation: newDownstreamEndElevation,
          transform: {
            ...downstreamChannel.transform,
            position: { x: newDownstreamStartStation, y: 0, z: newDownstreamStartElevation },
          },
        })

        // Propagate to any elements downstream of the connected channel
        useModellerStore.getState().propagatePositions(downstreamChannelId)
      }
    }

    onCreated()
  }

  return (
    <Card className="mx-3 mb-3 p-3 space-y-3 border-status-success-border bg-status-success-bg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-2xl bg-status-success-bg flex items-center justify-center">
            <HugeiconsIcon icon={WaterfallDown01Icon} className="size-3.5 text-status-success" />
          </div>
          <span className="text-xs font-medium">{t("createPanel.transition", "Transition")}</span>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose} className="h-5 w-5">
          <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
        </Button>
      </div>

      <div className="space-y-2">
        {/* Name */}
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.name")}
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-xs"
            placeholder={t("createPanel.objectName")}
          />
        </div>

        <Separator className="my-2" />

        {/* Transition Type */}
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.type", "Type")}
          </Label>
          <Select
            value={transitionType}
            onValueChange={(v) => setTransitionType(v as TransitionTypeEnum)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSITION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-xs">
                  <div className="flex flex-col">
                    <span>{t(type.labelKey)}</span>
                    <span className="text-xs text-muted-foreground">{t(type.descKey)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-2" />

        {/* Connections */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("createPanel.connections", "Connections")}
          </span>
        </div>

        {/* Upstream (Inlet) */}
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.upstream", "Upstream")}
          </Label>
          <Select
            value={upstreamChannelId}
            onValueChange={(v) => setUpstreamChannelId(v ?? "none")}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                {t("createPanel.noChannel", "No channel")}
              </SelectItem>
              {existingChannels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id} className="text-xs">
                  {ch.name} (Sta. {(ch.endStation ?? ch.length).toFixed(0)}m)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Downstream (Outlet) */}
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.downstream", "Downstream")}
          </Label>
          <Select
            value={downstreamChannelId}
            onValueChange={(v) => handleDownstreamChange(v ?? "none")}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                {t("createPanel.noChannel", "No channel")}
              </SelectItem>
              {existingChannels
                .filter((c) => c.id !== upstreamChannelId)
                .map((ch) => (
                  <SelectItem key={ch.id} value={ch.id} className="text-xs">
                    {ch.name} (Sta. {(ch.startStation ?? 0).toFixed(0)}m)
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-2" />

        {/* Geometry */}
        <ParamInput
          label={t("createPanel.height")}
          value={length}
          onChange={setLength}
          min={1}
          step={0.5}
          unitType="length"
        />

        {/* Outlet Section (if no downstream channel) */}
        {downstreamChannelId === "none" && (
          <>
            <Separator className="my-2" />
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t("createPanel.outletSection", "Outlet Section")}
              </span>
            </div>
            <ParamInput
              label={t("createPanel.width")}
              value={outletWidth}
              onChange={setOutletWidth}
              unitType="length"
            />
            <ParamInput
              label={t("createPanel.depth")}
              value={outletDepth}
              onChange={setOutletDepth}
              unitType="length"
            />
            {inletSection.sectionType !== "rectangular" && (
              <ParamInput
                label={t("createPanel.sideSlope")}
                value={outletSideSlope}
                onChange={setOutletSideSlope}
                step={0.1}
                customUnit="H:V"
              />
            )}
          </>
        )}

        {/* Stilling Basin (shown when there's a significant drop) */}
        {startElevation - endElevation > 0.3 && (
          <>
            <Separator className="my-2" />
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t("createPanel.stillingBasin", "Stilling Basin")}
              </span>
              <span className="text-xs text-amber-500 ml-auto">
                Drop: {formatLength(startElevation - endElevation)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Label className="w-20 text-xs text-muted-foreground shrink-0">
                {t("createPanel.enabled", "Enabled")}
              </Label>
              <Switch checked={enableStillingBasin} onCheckedChange={setEnableStillingBasin} />
            </div>

            {enableStillingBasin && (
              <div className="space-y-2 pl-2 border-l-2 border-green-500/20">
                <div className="flex items-center gap-2">
                  <Label className="w-20 text-xs text-muted-foreground shrink-0">
                    {t("createPanel.type", "Type")}
                  </Label>
                  <Select
                    value={basinType}
                    onValueChange={(v) => setBasinType((v as StillingBasinType) ?? "none")}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STILLING_BASIN_TYPES.filter((t_opt) => t_opt.value !== "none").map(
                        (type) => (
                          <SelectItem key={type.value} value={type.value} className="text-xs">
                            <div className="flex flex-col">
                              <span>{t(type.labelKey)}</span>
                              <span className="text-xs text-muted-foreground">
                                {t(type.descKey)}
                              </span>
                            </div>
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <ParamInput
                  label={t("createPanel.basinLength")}
                  value={basinLength}
                  onChange={setBasinLength}
                  min={2}
                  step={0.5}
                  unitType="length"
                />
                <ParamInput
                  label={t("createPanel.basinDepth")}
                  value={basinDepth}
                  onChange={setBasinDepth}
                  min={0.3}
                  step={0.1}
                  unitType="length"
                />

                {basinType === "type-iii" && (
                  <ParamInput
                    label="Baffle Rows"
                    value={baffleRows}
                    onChange={setBaffleRows}
                    min={1}
                    step={1}
                  />
                )}

                <div className="flex items-center gap-2">
                  <Label className="w-20 text-xs text-muted-foreground shrink-0">
                    {t("createPanel.endSill", "End Sill")}
                  </Label>
                  <Switch checked={hasEndSill} onCheckedChange={setHasEndSill} />
                </div>

                {hasEndSill && (
                  <ParamInput
                    label="Sill Height"
                    value={endSillHeight}
                    onChange={setEndSillHeight}
                    min={0.1}
                    step={0.05}
                    unitType="length"
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Material */}
        <Separator className="my-2" />
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("layersPanel.color", "Color")}
          </Label>
          <input
            type="color"
            value={transitionColor}
            onChange={(e) => setTransitionColor(e.target.value)}
            className="w-8 h-7 rounded-2xl border border-border cursor-pointer"
          />
          <Input
            value={transitionColor}
            onChange={(e) => setTransitionColor(e.target.value)}
            className="h-7 text-xs flex-1 font-mono"
          />
        </div>

        {/* Computed Values */}
        <div className="mt-2 p-2 rounded-2xl bg-muted/30 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {t("createPanel.startStation", "Start Station")}:
            </span>
            <span className="font-mono">{formatLength(startStation)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {t("createPanel.endStation", "End Station")}:
            </span>
            <span className="font-mono">{formatLength(startStation + length)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t("createPanel.invert")}:</span>
            <span className="font-mono">{formatLength(startElevation - endElevation)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {t("createPanel.widthChange", "Width Change")}:
            </span>
            <span className="font-mono">
              {formatLength(inletSection.width)} → {formatLength(outletWidth)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose} className="flex-1 h-8">
          {t("createPanel.cancel")}
        </Button>
        <Button
          size="sm"
          onClick={handleCreate}
          className="flex-1 h-8 bg-green-600 hover:bg-green-700"
          disabled={upstreamChannelId === "none"}
        >
          <HugeiconsIcon icon={Tick01Icon} className="size-3 mr-1" />
          {t("createPanel.create")}
        </Button>
      </div>
    </Card>
  )
}

export default TransitionCreator
