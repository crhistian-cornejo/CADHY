/**
 * ChuteCreator - CADHY
 *
 * Component for creating hydraulic chutes (rápidas).
 * Supports multiple chute types: smooth, stepped, baffled, ogee, converging.
 * Includes USBR stilling basin design with automatic dimensioning.
 */

import {
  Badge,
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
import {
  ArrowDown01Icon,
  Cancel01Icon,
  InformationCircleIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useUnits } from "@/hooks/use-units"
import {
  type ChannelObject,
  type ChuteObject,
  type ChuteType,
  STILLING_BASIN_TYPE_INFO,
  type StillingBasinConfig,
  type StillingBasinType,
  type TransitionObject,
  useModellerStore,
  useObjects,
} from "@/stores/modeller"
import {
  type BasinDesignInput,
  createSimpleBasinConfig,
  designStillingBasin,
} from "@/utils/stilling-basin-design"

// ============================================================================
// TYPES
// ============================================================================

interface ChuteCreatorProps {
  onClose: () => void
  onCreated: () => void
}

// ============================================================================
// CHUTE TYPE OPTIONS
// ============================================================================

const CHUTE_TYPES: { value: ChuteType; labelKey: string; descKey: string }[] = [
  { value: "smooth", labelKey: "createPanel.smooth", descKey: "createPanel.smoothDesc" },
  { value: "stepped", labelKey: "createPanel.stepped", descKey: "createPanel.steppedDesc" },
  { value: "baffled", labelKey: "createPanel.baffled", descKey: "createPanel.baffledDesc" },
  { value: "ogee", labelKey: "createPanel.ogee", descKey: "createPanel.ogeeDesc" },
  {
    value: "converging",
    labelKey: "createPanel.converging",
    descKey: "createPanel.convergingDesc",
  },
]

// ============================================================================
// STILLING BASIN OPTIONS
// ============================================================================

const STILLING_BASIN_TYPES: {
  value: StillingBasinType
  labelKey: string
  descKey: string
  froudeRange: string
}[] = [
  {
    value: "none",
    labelKey: "createPanel.none",
    descKey: "createPanel.noneDesc",
    froudeRange: "-",
  },
  {
    value: "type-i",
    labelKey: "createPanel.stillingBasinTypes.typeI",
    descKey: "createPanel.stillingBasinTypes.typeIDesc",
    froudeRange: "Fr < 1.7",
  },
  {
    value: "type-ii",
    labelKey: "createPanel.stillingBasinTypes.typeII",
    descKey: "createPanel.stillingBasinTypes.typeIIDesc",
    froudeRange: "Fr > 4.5, V > 15 m/s",
  },
  {
    value: "type-iii",
    labelKey: "createPanel.stillingBasinTypes.typeIII",
    descKey: "createPanel.stillingBasinTypes.typeIIIDesc",
    froudeRange: "Fr 4.5-17, V < 15 m/s",
  },
  {
    value: "type-iv",
    labelKey: "createPanel.stillingBasinTypes.typeIV",
    descKey: "createPanel.stillingBasinTypes.typeIVDesc",
    froudeRange: "Fr 2.5-4.5",
  },
  {
    value: "saf",
    labelKey: "createPanel.stillingBasinTypes.saf",
    descKey: "createPanel.stillingBasinTypes.safDesc",
    froudeRange: "Fr 1.7-17",
  },
]

// ============================================================================
// PARAM INPUT
// ============================================================================

type UnitType = "length" | "none"

interface ParamInputProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unitType?: UnitType
  customUnit?: string
  disabled?: boolean
}

function ParamInput({
  label,
  value,
  onChange,
  min = 0.01,
  max,
  step = 0.1,
  unitType,
  customUnit,
  disabled,
}: ParamInputProps) {
  const { lengthLabel, convertLengthToDisplay, parseLength } = useUnits()

  const unitLabel = customUnit ?? (unitType === "length" ? lengthLabel : undefined)
  // Fallback to 0 if value is undefined/null to prevent .toFixed() crash
  const safeValue = value ?? 0
  const displayValue = unitType === "length" ? convertLengthToDisplay(safeValue) : safeValue

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
          max={max}
          step={step}
          className="h-7 text-xs"
          disabled={disabled}
        />
        {unitLabel && <span className="text-xs text-muted-foreground w-6">{unitLabel}</span>}
      </div>
    </div>
  )
}

// ============================================================================
// CHUTE CREATOR
// ============================================================================

export function ChuteCreator({ onClose, onCreated }: ChuteCreatorProps) {
  const { t } = useTranslation()
  const { addObject, updateObject } = useModellerStore()
  const allObjects = useObjects()
  const { formatLength } = useUnits()
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Get existing elements for connection
  const existingChannels = useMemo(
    () =>
      (allObjects.filter((o) => o.type === "channel") as ChannelObject[]).sort(
        (a, b) => (b.endStation ?? 0) - (a.endStation ?? 0)
      ),
    [allObjects]
  )

  const existingTransitions = useMemo(
    () =>
      (allObjects.filter((o) => o.type === "transition") as TransitionObject[]).sort(
        (a, b) => (b.endStation ?? 0) - (a.endStation ?? 0)
      ),
    [allObjects]
  )

  const existingChutes = allObjects.filter((o) => o.type === "chute")

  const connectableUpstream = useMemo(() => {
    const channels = existingChannels.filter((c) => !c.downstreamChannelId)
    const transitions = existingTransitions.filter((t) => !t.downstreamChannelId)
    return [...channels, ...transitions].sort((a, b) => (b.endStation ?? 0) - (a.endStation ?? 0))
  }, [existingChannels, existingTransitions])

  // Form state
  const [name, setName] = useState(() => `Chute ${existingChutes.length + 1}`)
  const [upstreamId, setUpstreamId] = useState<string>(() => connectableUpstream[0]?.id ?? "none")

  // Chute type
  const [chuteType, setChuteType] = useState<ChuteType>("smooth")

  // Geometry
  const [length, setLength] = useState(20)
  const [drop, setDrop] = useState(10)
  const [width, setWidth] = useState(2)
  const [depth, setDepth] = useState(1.5)
  const [sideSlope, setSideSlope] = useState(0)
  const [manningN, setManningN] = useState(0.014)
  const [thickness, setThickness] = useState(0.2)

  // Inlet section (transition from upstream)
  const [inletLength, setInletLength] = useState(1)
  const [inletSlope, setInletSlope] = useState(0)

  // Stepped chute params
  const [stepHeight, setStepHeight] = useState(0.5)
  const [stepLength, setStepLength] = useState(1.0)

  // Baffled chute params
  const [baffleSpacing, setBaffleSpacing] = useState(2.0)
  const [baffleHeight, setBaffleHeight] = useState(0.3)

  // Stilling basin
  const [basinType, setBasinType] = useState<StillingBasinType>("none")
  const [basinLength, setBasinLength] = useState(5)
  const [basinDepth, setBasinDepth] = useState(1)
  const [endSillHeight, setEndSillHeight] = useState(0.3)
  const [useAutoDesign, setUseAutoDesign] = useState(true)
  const [designDischarge, setDesignDischarge] = useState(5.0)

  // Material
  const [chuteColor, setChuteColor] = useState("#f59e0b")

  // Get upstream element
  const upstreamElement = useMemo(
    () => connectableUpstream.find((e) => e.id === upstreamId),
    [connectableUpstream, upstreamId]
  )

  // Inherit properties from upstream element when selected
  useEffect(() => {
    if (!upstreamElement) return

    if (upstreamElement.type === "transition") {
      const transition = upstreamElement as TransitionObject
      // Inherit outlet properties for seamless connection
      setWidth(transition.outlet.width)
      setDepth(transition.outlet.depth)
      setSideSlope(transition.outlet.sideSlope)
      setThickness(transition.outlet.wallThickness)
    } else if (upstreamElement.type === "channel") {
      const channel = upstreamElement as ChannelObject
      const section = channel.section
      if (section.type === "rectangular") {
        setWidth((section as RectangularSection).width)
      } else if (section.type === "trapezoidal") {
        setWidth((section as TrapezoidalSection).bottomWidth)
      }
      setDepth(section.depth)
      if (section.type === "trapezoidal") {
        setSideSlope((section as TrapezoidalSection).sideSlope)
      } else if (section.type === "triangular") {
        setSideSlope((section as TriangularSection).sideSlope)
      }
      // Channels don't have explicit thickness, use default
    }
  }, [upstreamElement])

  // Start position from upstream
  const startStation = useMemo(() => upstreamElement?.endStation ?? 0, [upstreamElement])
  const startElevation = useMemo(() => upstreamElement?.endElevation ?? 0, [upstreamElement])

  // Computed values
  const slope = useMemo(() => (length > 0 ? drop / length : 0), [drop, length])
  const inletDrop = useMemo(() => inletLength * inletSlope, [inletLength, inletSlope])
  const totalHorizontalLength = useMemo(() => inletLength + length, [inletLength, length])
  const endStation = useMemo(
    () => startStation + totalHorizontalLength,
    [startStation, totalHorizontalLength]
  )
  const endElevation = useMemo(
    () => startElevation - inletDrop - drop,
    [startElevation, inletDrop, drop]
  )

  // Auto-design stilling basin
  const autoDesignResult = useMemo(() => {
    if (!useAutoDesign || basinType === "none") return null

    const input: BasinDesignInput = {
      discharge: designDischarge,
      width,
      drop,
      slope,
      manningN,
    }

    return designStillingBasin(input)
  }, [useAutoDesign, basinType, designDischarge, width, drop, slope, manningN])

  // Update width when upstream changes
  const handleUpstreamChange = (elementId: string) => {
    setUpstreamId(elementId)
    if (elementId !== "none") {
      const element = connectableUpstream.find((e) => e.id === elementId)
      if (element) {
        if (element.type === "channel") {
          const channel = element as ChannelObject
          const section = channel.section
          if (section.type === "rectangular") {
            setWidth((section as { width: number }).width)
          } else if (section.type === "trapezoidal") {
            setWidth((section as { bottomWidth: number }).bottomWidth)
          }
          setDepth(section.depth)
          // Copy thickness from channel
          if ("wallThickness" in section) {
            setThickness((section as { wallThickness: number }).wallThickness)
          }
        } else if (element.type === "transition") {
          const transition = element as TransitionObject
          setWidth(transition.outlet.width)
          setDepth(transition.outlet.depth)
          setSideSlope(transition.outlet.sideSlope)
          // Copy thickness from transition outlet
          setThickness(transition.outlet.wallThickness)
        }
      }
    }
  }

  const handleCreate = () => {
    // Build stilling basin config
    let stillingBasin: StillingBasinConfig | null = null

    if (basinType !== "none") {
      if (useAutoDesign && autoDesignResult) {
        stillingBasin = autoDesignResult.config
      } else {
        stillingBasin = createSimpleBasinConfig(basinType, basinLength, basinDepth, endSillHeight)
      }
    }

    const newChuteId = addObject({
      name,
      type: "chute",
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
      chuteType,
      inletLength,
      inletSlope,
      length,
      drop,
      width,
      depth,
      sideSlope,
      manningN,
      slope,
      startStation,
      startElevation,
      endStation,
      endElevation,
      upstreamChannelId: upstreamId !== "none" ? upstreamId : null,
      downstreamChannelId: null,
      stepHeight: chuteType === "stepped" ? stepHeight : 0.5,
      stepLength: chuteType === "stepped" ? stepLength : 1.0,
      baffleSpacing: chuteType === "baffled" ? baffleSpacing : 2.0,
      baffleHeight: chuteType === "baffled" ? baffleHeight : 0.3,
      stillingBasin,
      thickness,
      material: {
        color: chuteColor,
        opacity: 1,
        metalness: 0.1,
        roughness: 0.6,
      },
    } as Omit<ChuteObject, "id" | "createdAt" | "updatedAt">)

    // Update upstream connection
    if (upstreamId !== "none") {
      updateObject(upstreamId, { downstreamChannelId: newChuteId })
    }

    onCreated()
  }

  const slopePercent = (slope * 100).toFixed(2)
  const slopeRatio = slope > 0 ? `1:${(1 / slope).toFixed(1)}` : "-"

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  const submitShortcut = isMac ? "⌘↵" : "Ctrl+↵"

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleCreate()
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <Card
      className="mx-3 mb-3 p-3 space-y-3 border-amber-500/30 bg-amber-500/5 max-h-[80vh] overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-2xl bg-amber-500/20 flex items-center justify-center">
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 text-amber-500" />
          </div>
          <span className="text-xs font-medium">{t("createPanel.chute", "Chute")}</span>
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
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-xs"
            placeholder={t("createPanel.objectName")}
          />
        </div>

        <Separator className="my-2" />

        {/* Chute Type */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("createPanel.chuteType", "Chute Type")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.type", "Type")}
          </Label>
          <Select value={chuteType} onValueChange={(v) => setChuteType(v as ChuteType)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHUTE_TYPES.map((type) => (
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

        {/* Stepped chute params */}
        {chuteType === "stepped" && (
          <div className="space-y-2 pl-2 border-l-2 border-amber-500/20">
            <ParamInput
              label={t("createPanel.stepHeight")}
              value={stepHeight}
              onChange={setStepHeight}
              min={0.1}
              max={2}
              step={0.1}
              unitType="length"
            />
            <ParamInput
              label={t("createPanel.stepLength")}
              value={stepLength}
              onChange={setStepLength}
              min={0.3}
              max={5}
              step={0.1}
              unitType="length"
            />
          </div>
        )}

        {/* Baffled chute params */}
        {chuteType === "baffled" && (
          <div className="space-y-2 pl-2 border-l-2 border-amber-500/20">
            <ParamInput
              label={t("createPanel.baffleSpacing")}
              value={baffleSpacing}
              onChange={setBaffleSpacing}
              min={0.5}
              max={5}
              step={0.25}
              unitType="length"
            />
            <ParamInput
              label={t("createPanel.baffleHeight")}
              value={baffleHeight}
              onChange={setBaffleHeight}
              min={0.1}
              max={1}
              step={0.05}
              unitType="length"
            />
          </div>
        )}

        <Separator className="my-2" />

        {/* Upstream Connection */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("createPanel.connection", "Connection")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.upstream", "Upstream")}
          </Label>
          <Select value={upstreamId} onValueChange={(v) => handleUpstreamChange(v ?? "none")}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                {t("createPanel.noConnection", "No connection")}
              </SelectItem>
              {connectableUpstream.map((el) => (
                <SelectItem key={el.id} value={el.id} className="text-xs">
                  {el.name} ({el.type}) - Sta. {(el.endStation ?? 0).toFixed(0)}m
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-2" />

        {/* Geometry */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("createPanel.geometry", "Geometry")}
          </span>
        </div>

        {/* Inlet Section */}
        <div className="text-xs text-muted-foreground mb-1">{t("createPanel.inlet")}</div>
        <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-amber-500/20 mb-2">
          <ParamInput
            label={t("createPanel.inletL")}
            value={inletLength}
            onChange={setInletLength}
            min={0}
            max={20}
            step={0.5}
            unitType="length"
          />
          <ParamInput
            label={t("createPanel.inletSlope")}
            value={inletSlope}
            onChange={setInletSlope}
            min={0}
            max={0.1}
            step={0.01}
            customUnit="m/m"
          />
        </div>

        {/* Main Chute Section */}
        <div className="text-xs text-muted-foreground mb-1">{t("createPanel.mainChute")}</div>
        <div className="grid grid-cols-2 gap-2">
          <ParamInput
            label={t("createPanel.lengthSymbol")}
            value={length}
            onChange={setLength}
            min={1}
            step={1}
            unitType="length"
          />
          <ParamInput
            label={t("createPanel.dropH")}
            value={drop}
            onChange={setDrop}
            min={0.1}
            step={0.5}
            unitType="length"
          />
        </div>

        <ParamInput
          label={t("createPanel.widthSymbol")}
          value={width}
          onChange={setWidth}
          min={0.5}
          step={0.1}
          unitType="length"
        />
        <ParamInput
          label={t("createPanel.depthSymbol")}
          value={depth}
          onChange={setDepth}
          min={0.3}
          step={0.1}
          unitType="length"
        />
        <ParamInput
          label={t("createPanel.sideSlope")}
          value={sideSlope}
          onChange={setSideSlope}
          min={0}
          step={0.1}
          customUnit="H:V"
        />
        <ParamInput
          label={t("createPanel.wall")}
          value={thickness}
          onChange={setThickness}
          min={0.1}
          step={0.01}
          unitType="length"
        />

        <Separator className="my-2" />

        {/* Hydraulics */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("createPanel.hydraulics", "Hydraulics")}
          </span>
        </div>

        <ParamInput
          label="Manning n"
          value={manningN}
          onChange={setManningN}
          min={0.008}
          max={0.025}
          step={0.001}
        />

        <Separator className="my-2" />

        {/* Stilling Basin */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("createPanel.stillingBasin", "Stilling Basin")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.type", "Type")}
          </Label>
          <Select value={basinType} onValueChange={(v) => setBasinType(v as StillingBasinType)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STILLING_BASIN_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-xs">
                  <div className="flex flex-col">
                    <span>{t(type.labelKey)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t(type.descKey)} • {type.froudeRange}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {basinType !== "none" && (
          <div className="space-y-2 pl-2 border-l-2 border-amber-500/20">
            {/* Auto-design toggle */}
            <div className="flex items-center gap-2">
              <Label className="w-20 text-xs text-muted-foreground shrink-0">
                {t("createPanel.autoDesign")}
              </Label>
              <Switch checked={useAutoDesign} onCheckedChange={setUseAutoDesign} />
              <span className="text-xs text-muted-foreground">USBR EM-25</span>
            </div>

            {useAutoDesign && (
              <>
                <ParamInput
                  label={t("createPanel.discharge")}
                  value={designDischarge}
                  onChange={setDesignDischarge}
                  min={0.1}
                  step={0.5}
                  customUnit="m³/s"
                />

                {autoDesignResult && (
                  <div className="p-2 rounded-2xl bg-amber-500/10 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("createPanel.froudeNumber")}:
                      </span>
                      <span className="font-mono">{autoDesignResult.froudeNumber.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("createPanel.outletVelocity")}:
                      </span>
                      <span className="font-mono">
                        {autoDesignResult.outletVelocity.toFixed(2)} m/s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("createPanel.recommended")}:</span>
                      <Badge variant="outline" className="text-xs h-4">
                        {STILLING_BASIN_TYPE_INFO[autoDesignResult.recommendedType]?.label ??
                          autoDesignResult.recommendedType}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("createPanel.basinLength")}:</span>
                      <span className="font-mono">
                        {autoDesignResult.config.length.toFixed(2)} m
                      </span>
                    </div>
                    {autoDesignResult.warnings.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-amber-500/20">
                        {autoDesignResult.warnings.map((w, i) => (
                          <div key={i} className="flex gap-1 text-amber-500">
                            <HugeiconsIcon
                              icon={InformationCircleIcon}
                              className="size-3 shrink-0 mt-0.5"
                            />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {!useAutoDesign && (
              <>
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
                <ParamInput
                  label={t("createPanel.endSillHeight")}
                  value={endSillHeight}
                  onChange={setEndSillHeight}
                  min={0}
                  step={0.05}
                  unitType="length"
                />
              </>
            )}
          </div>
        )}

        {/* Material */}
        <Separator className="my-2" />
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("layersPanel.color", "Color")}
          </Label>
          <input
            type="color"
            value={chuteColor}
            onChange={(e) => setChuteColor(e.target.value)}
            className="w-8 h-7 rounded-2xl border border-border cursor-pointer"
          />
          <Input
            value={chuteColor}
            onChange={(e) => setChuteColor(e.target.value)}
            className="h-7 text-xs flex-1 font-mono"
          />
        </div>

        {/* Computed Values */}
        <div className="mt-2 p-2 rounded-2xl bg-muted/30 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Main Chute Slope:</span>
            <span className="font-mono">
              {slopePercent}% ({slopeRatio})
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Length:</span>
            <span className="font-mono">
              {formatLength(totalHorizontalLength)} (inlet {formatLength(inletLength)} + main{" "}
              {formatLength(length)})
            </span>
          </div>
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
            <span className="font-mono">{formatLength(endStation)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {t("createPanel.startElev", "Start Elev.")}:
            </span>
            <span className="font-mono">{formatLength(startElevation)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t("createPanel.endElev", "End Elev.")}:</span>
            <span className="font-mono">{formatLength(endElevation)}</span>
          </div>
          {basinType !== "none" && (
            <div className="flex justify-between text-xs text-amber-500">
              <span>+ Stilling Basin:</span>
              <span className="font-mono">
                {formatLength(
                  useAutoDesign && autoDesignResult ? autoDesignResult.config.length : basinLength
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose} className="flex-1 h-8">
          {t("createPanel.cancel")}
        </Button>
        <Button
          size="sm"
          onClick={handleCreate}
          className="flex-1 h-8 bg-amber-600 hover:bg-amber-700"
        >
          <HugeiconsIcon icon={Tick01Icon} className="size-3 mr-1" />
          {t("createPanel.create")}
          <span className="text-xs opacity-60 ml-1">{submitShortcut}</span>
        </Button>
      </div>
    </Card>
  )
}

export default ChuteCreator
