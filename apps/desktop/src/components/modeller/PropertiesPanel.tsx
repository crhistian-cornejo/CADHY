/**
 * Properties Panel Component - CADHY
 *
 * CAD-like properties panel with:
 * - Object properties (name, type, transform)
 * - Material properties
 * - Geometry parameters
 * - Layer assignment
 * - IFC/BIM-style information
 */

import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
  Input,
  Label,
  NumberInput,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "@cadhy/ui"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  CubeIcon,
  Delete01Icon,
  GridIcon,
  InformationCircleIcon,
  Layers01Icon,
  LockIcon,
  Move01Icon,
  PaintBrush01Icon,
  Settings01Icon,
  SquareUnlock02Icon,
  ViewIcon,
  ViewOffIcon,
  WaterEnergyIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import React, { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  type AnySceneObject,
  CHUTE_TYPE_INFO,
  type ChannelObject,
  type ChannelSection,
  type ChuteObject,
  type ChuteType,
  type Layer,
  type RectangularSection,
  type ShapeObject,
  STILLING_BASIN_TYPE_INFO,
  type StillingBasinConfig,
  type StillingBasinType,
  type TransitionObject,
  type TransitionSection,
  type TransitionTypeEnum,
  type TrapezoidalSection,
  type TriangularSection,
  useLayers,
  useModellerStore,
  useSelectedIds,
  useViewportSettings,
} from "@/stores/modeller-store"
import { TextureMaterialPanel } from "./properties/TextureMaterialPanelSimple"

// ============================================================================
// TYPES
// ============================================================================

interface PropertiesPanelProps {
  className?: string
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

interface SectionProps {
  title: string
  icon: typeof CubeIcon
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: string | number
}

const Section = React.memo(function Section({
  title,
  icon,
  defaultOpen = true,
  children,
  badge,
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon}
            className="size-3 text-muted-foreground"
          />
          <HugeiconsIcon icon={icon} className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">{title}</span>
        </div>
        {badge !== undefined && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            {badge}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 pt-1 space-y-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
})

// ============================================================================
// PROPERTY ROW
// ============================================================================

interface PropertyRowProps {
  label: string
  children: React.ReactNode
}

const PropertyRow = React.memo(function PropertyRow({ label, children }: PropertyRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-20 shrink-0 text-[10px] text-muted-foreground">{label}</Label>
      <div className="flex-1">{children}</div>
    </div>
  )
})

// ============================================================================
// VECTOR INPUT
// ============================================================================

interface VectorInputProps {
  value: { x: number; y: number; z: number }
  onChange: (value: { x: number; y: number; z: number }) => void
  step?: number
  precision?: number
}

const VectorInput = React.memo(function VectorInput({
  value,
  onChange,
  step = 0.1,
  precision = 2,
}: VectorInputProps) {
  const handleChange = (axis: "x" | "y" | "z", newValue: number) => {
    onChange({ ...value, [axis]: newValue })
  }

  return (
    <div className="flex gap-1">
      <div className="flex-1">
        <div className="flex items-center">
          <span className="text-[10px] text-red-500 mr-1">X</span>
          <NumberInput
            value={value.x}
            onChange={(v) => handleChange("x", v)}
            step={step}
            precision={precision}
            className="h-6 text-[10px] px-1.5"
          />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center">
          <span className="text-[10px] text-green-500 mr-1">Y</span>
          <NumberInput
            value={value.y}
            onChange={(v) => handleChange("y", v)}
            step={step}
            precision={precision}
            className="h-6 text-[10px] px-1.5"
          />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center">
          <span className="text-[10px] text-blue-500 mr-1">Z</span>
          <NumberInput
            value={value.z}
            onChange={(v) => handleChange("z", v)}
            step={step}
            precision={precision}
            className="h-6 text-[10px] px-1.5"
          />
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// TRANSFORM SECTION
// ============================================================================

interface TransformSectionProps {
  object: AnySceneObject
  onUpdate: (updates: Partial<AnySceneObject>) => void
}

function TransformSection({ object, onUpdate }: TransformSectionProps) {
  const { t } = useTranslation()

  const handlePositionChange = (position: { x: number; y: number; z: number }) => {
    onUpdate({ transform: { ...object.transform, position } })
  }

  const handleRotationChange = (rotation: { x: number; y: number; z: number }) => {
    onUpdate({ transform: { ...object.transform, rotation } })
  }

  const handleScaleChange = (scale: { x: number; y: number; z: number }) => {
    onUpdate({ transform: { ...object.transform, scale } })
  }

  return (
    <Section title={t("properties.transform")} icon={Move01Icon}>
      <PropertyRow label={t("properties.position")}>
        <VectorInput value={object.transform.position} onChange={handlePositionChange} step={0.1} />
      </PropertyRow>
      <PropertyRow label={t("properties.rotation")}>
        <VectorInput value={object.transform.rotation} onChange={handleRotationChange} step={1} />
      </PropertyRow>
      <PropertyRow label={t("properties.scale")}>
        <VectorInput value={object.transform.scale} onChange={handleScaleChange} step={0.1} />
      </PropertyRow>
    </Section>
  )
}

// ============================================================================
// GEOMETRY SECTION (FOR SHAPES)
// ============================================================================

interface GeometrySectionProps {
  object: ShapeObject
  onUpdate: (updates: Partial<ShapeObject>) => void
}

function GeometrySection({ object, onUpdate }: GeometrySectionProps) {
  const { t } = useTranslation()

  const handleParamChange = (param: string, value: number) => {
    onUpdate({
      parameters: { ...object.parameters, [param]: value },
    })
  }

  const renderParams = () => {
    switch (object.shapeType) {
      case "box":
        return (
          <>
            <PropertyRow label={t("properties.width")}>
              <NumberInput
                value={object.parameters.width ?? 1}
                onChange={(v) => handleParamChange("width", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.height")}>
              <NumberInput
                value={object.parameters.height ?? 1}
                onChange={(v) => handleParamChange("height", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.depth")}>
              <NumberInput
                value={object.parameters.depth ?? 1}
                onChange={(v) => handleParamChange("depth", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )
      case "cylinder":
        return (
          <>
            <PropertyRow label={t("properties.radius")}>
              <NumberInput
                value={object.parameters.radius ?? 0.5}
                onChange={(v) => handleParamChange("radius", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.height")}>
              <NumberInput
                value={object.parameters.height ?? 1}
                onChange={(v) => handleParamChange("height", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )
      case "sphere":
        return (
          <PropertyRow label={t("properties.radius")}>
            <NumberInput
              value={object.parameters.radius ?? 0.5}
              onChange={(v) => handleParamChange("radius", v)}
              step={0.1}
              min={0.01}
              className="h-6 text-[10px]"
            />
          </PropertyRow>
        )
      case "cone":
        return (
          <>
            <PropertyRow label={t("properties.bottomRadius")}>
              <NumberInput
                value={object.parameters.bottomRadius ?? 0.5}
                onChange={(v) => handleParamChange("bottomRadius", v)}
                step={0.1}
                min={0}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.topRadius")}>
              <NumberInput
                value={object.parameters.topRadius ?? 0}
                onChange={(v) => handleParamChange("topRadius", v)}
                step={0.1}
                min={0}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.height")}>
              <NumberInput
                value={object.parameters.height ?? 1}
                onChange={(v) => handleParamChange("height", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )
      case "torus":
        return (
          <>
            <PropertyRow label={t("properties.majorRadius")}>
              <NumberInput
                value={object.parameters.majorRadius ?? 1}
                onChange={(v) => handleParamChange("majorRadius", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.minorRadius")}>
              <NumberInput
                value={object.parameters.minorRadius ?? 0.3}
                onChange={(v) => handleParamChange("minorRadius", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )
      default:
        return null
    }
  }

  // Get segment limits based on shape type
  const getSegmentLimits = () => {
    if (object.shapeType === "box") {
      return { min: 1, max: 10, step: 1, label: t("createPanel.subdivisions", "Subdivisions") }
    }
    return { min: 8, max: 128, step: 8, label: t("createPanel.detail", "Detail") }
  }

  const segmentLimits = getSegmentLimits()
  const currentSegments = object.parameters.segments ?? 32

  return (
    <Section title={t("properties.geometry")} icon={CubeIcon}>
      <PropertyRow label={t("properties.type")}>
        <Badge variant="outline" className="text-[10px] capitalize">
          {object.shapeType}
        </Badge>
      </PropertyRow>
      {renderParams()}
      {/* Mesh Detail/Segments Control */}
      <div className="pt-2 mt-2 border-t border-border/30">
        <PropertyRow label={segmentLimits.label}>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={currentSegments}
              onChange={(e) => handleParamChange("segments", Number(e.target.value))}
              min={segmentLimits.min}
              max={segmentLimits.max}
              step={segmentLimits.step}
              className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
            />
            <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
              {currentSegments}
            </span>
          </div>
        </PropertyRow>
      </div>
    </Section>
  )
}

// ============================================================================
// CHANNEL SECTION PREVIEW SVG
// ============================================================================

interface ChannelSectionPreviewProps {
  section: ChannelSection
  thickness?: number
  showDimensions?: boolean
}

function ChannelSectionPreview({
  section,
  thickness = 0.15,
  showDimensions = true,
}: ChannelSectionPreviewProps) {
  const viewBox = "0 0 100 60"

  const renderSection = () => {
    switch (section.type) {
      case "rectangular": {
        const s = section as RectangularSection
        const w = 60 // visual width
        const h = 35 // visual height
        const x = 20
        const y = 10 // top of channel (opening)
        const wt = 4 // visual wall thickness
        const ft = 4 // visual floor thickness

        // Open channel: opening at TOP (y), floor at BOTTOM (y + h)
        return (
          <g>
            {/* Left wall */}
            <rect
              x={x - wt}
              y={y}
              width={wt}
              height={h + ft}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Right wall */}
            <rect
              x={x + w}
              y={y}
              width={wt}
              height={h + ft}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Floor at BOTTOM */}
            <rect
              x={x - wt}
              y={y + h}
              width={w + wt * 2}
              height={ft}
              fill="#64748b"
              fillOpacity="0.4"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Inner section (water area) - U shape OPEN at top */}
            <polyline
              points={`${x},${y} ${x},${y + h} ${x + w},${y + h} ${x + w},${y}`}
              fill="#0ea5e9"
              fillOpacity="0.2"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Water surface indicator (dashed line at water level) */}
            <line
              x1={x + 5}
              y1={y + 8}
              x2={x + w - 5}
              y2={y + 8}
              stroke="#0ea5e9"
              strokeWidth="1"
              strokeDasharray="3,2"
              opacity="0.6"
            />
            {/* Dimensions */}
            {showDimensions && (
              <>
                <text
                  x={50}
                  y={58}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px]"
                >
                  b={s.width?.toFixed(2)}m
                </text>
                <text x={92} y={30} textAnchor="start" className="fill-muted-foreground text-[8px]">
                  y={s.depth?.toFixed(2)}m
                </text>
              </>
            )}
          </g>
        )
      }

      case "trapezoidal": {
        const s = section as TrapezoidalSection
        const bw = 40 // visual bottom width
        const h = 35
        const y = 10 // top of channel (opening)
        const slope = Math.min(s.sideSlope || 1.5, 2) // cap visual slope
        const slopeOffset = (h / 35) * 15 * (slope / 1.5)
        const wt = 4 // wall thickness

        // Trapezoidal open channel: WIDER at TOP (opening), NARROWER at BOTTOM (floor)
        // Use path instead of polygon to keep top OPEN (no closing line at top)
        const innerLeft = 50 - bw / 2
        const innerRight = 50 + bw / 2
        const outerLeft = 50 - bw / 2 - slopeOffset
        const outerRight = 50 + bw / 2 + slopeOffset

        return (
          <g>
            {/* Left wall - open channel, no top cap */}
            <path
              d={`M ${outerLeft - wt} ${y} L ${innerLeft - wt} ${y + h} L ${innerLeft - wt} ${y + h + wt} L ${outerLeft - wt} ${y + h + wt} L ${outerLeft - wt} ${y}`}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Right wall */}
            <path
              d={`M ${outerRight + wt} ${y} L ${innerRight + wt} ${y + h} L ${innerRight + wt} ${y + h + wt} L ${outerRight + wt} ${y + h + wt} L ${outerRight + wt} ${y}`}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Floor at bottom */}
            <path
              d={`M ${innerLeft - wt} ${y + h} L ${innerRight + wt} ${y + h} L ${innerRight + wt} ${y + h + wt} L ${innerLeft - wt} ${y + h + wt} Z`}
              fill="#64748b"
              fillOpacity="0.4"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Inner section (water area) - OPEN at top, use polyline not polygon */}
            <polyline
              points={`${outerLeft},${y} ${innerLeft},${y + h} ${innerRight},${y + h} ${outerRight},${y}`}
              fill="#0ea5e9"
              fillOpacity="0.2"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Water surface indicator (dashed line at water level) */}
            <line
              x1={outerLeft + 5}
              y1={y + 8}
              x2={outerRight - 5}
              y2={y + 8}
              stroke="#0ea5e9"
              strokeWidth="1"
              strokeDasharray="3,2"
              opacity="0.6"
            />
            {/* Dimensions */}
            {showDimensions && (
              <>
                <text
                  x={50}
                  y={58}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px]"
                >
                  b={s.bottomWidth?.toFixed(2)}m, z={s.sideSlope}
                </text>
                <text x={95} y={30} textAnchor="start" className="fill-muted-foreground text-[8px]">
                  y={s.depth?.toFixed(2)}m
                </text>
              </>
            )}
          </g>
        )
      }

      case "triangular": {
        const s = section as TriangularSection
        const h = 35
        const y = 10 // top of channel (opening)
        const slope = Math.min(s.sideSlope || 1, 2)
        const halfW = h * slope
        const wt = 4 // wall thickness

        // Triangular open channel: V shape with opening at TOP, vertex at BOTTOM
        // Use polyline to keep TOP OPEN (no closing line)
        return (
          <g>
            {/* Left wall */}
            <path
              d={`M ${50 - halfW - wt} ${y} L 50 ${y + h + wt} L ${50 - wt / 2} ${y + h + wt} L ${50 - halfW} ${y} Z`}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Right wall */}
            <path
              d={`M ${50 + halfW + wt} ${y} L 50 ${y + h + wt} L ${50 + wt / 2} ${y + h + wt} L ${50 + halfW} ${y} Z`}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Inner V (water area) - OPEN at top, use polyline */}
            <polyline
              points={`${50 - halfW},${y} 50,${y + h} ${50 + halfW},${y}`}
              fill="#0ea5e9"
              fillOpacity="0.2"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Water surface indicator (dashed line at water level) */}
            <line
              x1={50 - halfW + 8}
              y1={y + 8}
              x2={50 + halfW - 8}
              y2={y + 8}
              stroke="#0ea5e9"
              strokeWidth="1"
              strokeDasharray="3,2"
              opacity="0.6"
            />
            {/* Dimensions */}
            {showDimensions && (
              <>
                <text
                  x={50}
                  y={58}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px]"
                >
                  z={s.sideSlope}
                </text>
                <text x={95} y={30} textAnchor="start" className="fill-muted-foreground text-[8px]">
                  y={s.depth?.toFixed(2)}m
                </text>
              </>
            )}
          </g>
        )
      }

      default:
        return null
    }
  }

  return (
    <svg viewBox={viewBox} className="w-full h-16 mb-2">
      {renderSection()}
    </svg>
  )
}

// ============================================================================
// CHANNEL SECTION (FOR HYDRAULIC CHANNELS) - FULLY EDITABLE
// ============================================================================

interface ChannelSectionProps {
  object: ChannelObject
  onUpdate: (updates: Partial<ChannelObject>) => void
}

function ChannelPropertiesSection({ object, onUpdate }: ChannelSectionProps) {
  const { t } = useTranslation()

  // Handler for simple channel properties
  const handleChange = (field: keyof ChannelObject, value: number) => {
    const updates: Partial<ChannelObject> = { [field]: value }

    // Auto-calculate end station and elevation when length or slope changes
    if (field === "length" || field === "slope") {
      const length = field === "length" ? value : object.length
      const slope = field === "slope" ? value : object.slope
      updates.endStation = object.startStation + length
      updates.endElevation = object.startElevation - length * slope

      // Also update alignment endpoints
      updates.alignment = [
        { station: object.startStation, position: { x: 0, y: 0, z: object.startElevation } },
        {
          station: object.startStation + length,
          position: { x: length, y: 0, z: object.startElevation - length * slope },
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
          position: { x: object.length, y: 0, z: startElevation - object.length * object.slope },
        },
      ]
    }

    onUpdate(updates)
  }

  // Handler for section-specific properties
  const handleSectionChange = (field: string, value: number) => {
    const updatedSection = { ...object.section, [field]: value } as ChannelSection
    onUpdate({ section: updatedSection })
  }

  // Handler for changing section type
  const handleSectionTypeChange = (newType: string) => {
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
  }

  // Computed values
  const startStation = object.startStation ?? 0
  const endStation = object.endStation ?? startStation + object.length
  const startElevation = object.startElevation ?? 0
  const endElevation = object.endElevation ?? startElevation - object.length * object.slope

  return (
    <>
      {/* Section Geometry */}
      <Section title={t("properties.crossSection")} icon={GridIcon}>
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
      </Section>

      {/* Structural Properties */}
      <Section title={t("properties.structure")} icon={CubeIcon} defaultOpen={false}>
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
      </Section>

      {/* Hydraulic Properties */}
      <Section title={t("properties.hydraulics")} icon={WaterEnergyIcon}>
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
      </Section>

      {/* Alignment / Station Data */}
      <Section title={t("properties.alignment")} icon={Move01Icon} defaultOpen={false}>
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
      </Section>
    </>
  )
}

// ============================================================================
// TRANSITION SECTION PREVIEW SVG
// ============================================================================

interface TransitionSectionPreviewProps {
  inlet: TransitionSection
  outlet: TransitionSection
}

function TransitionSectionPreview({ inlet, outlet }: TransitionSectionPreviewProps) {
  const viewBox = "0 0 120 60"

  const renderSection = (section: TransitionSection, x: number, label: string) => {
    const w = 35
    const h = 30
    const y = 10

    if (section.sectionType === "rectangular") {
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            fill="#0ea5e9"
            fillOpacity="0.2"
            stroke="#0ea5e9"
            strokeWidth="1.5"
          />
          <text
            x={x + w / 2}
            y={y + h + 12}
            textAnchor="middle"
            className="fill-muted-foreground text-[7px]"
          >
            {label}
          </text>
        </g>
      )
    } else if (section.sectionType === "trapezoidal") {
      const slope = Math.min(section.sideSlope || 1.5, 2)
      const slopeOffset = (h / 30) * 10 * (slope / 1.5)
      const points = `
        ${x},${y + h}
        ${x - slopeOffset},${y}
        ${x + w + slopeOffset},${y}
        ${x + w},${y + h}
      `
      return (
        <g>
          <polygon
            points={points}
            fill="#0ea5e9"
            fillOpacity="0.2"
            stroke="#0ea5e9"
            strokeWidth="1.5"
          />
          <text
            x={x + w / 2}
            y={y + h + 12}
            textAnchor="middle"
            className="fill-muted-foreground text-[7px]"
          >
            {label}
          </text>
        </g>
      )
    } else {
      // triangular
      const slope = Math.min(section.sideSlope || 1, 2)
      const halfW = h * slope * 0.5
      return (
        <g>
          <polygon
            points={`${x + w / 2},${y + h} ${x + w / 2 - halfW},${y} ${x + w / 2 + halfW},${y}`}
            fill="#0ea5e9"
            fillOpacity="0.2"
            stroke="#0ea5e9"
            strokeWidth="1.5"
          />
          <text
            x={x + w / 2}
            y={y + h + 12}
            textAnchor="middle"
            className="fill-muted-foreground text-[7px]"
          >
            {label}
          </text>
        </g>
      )
    }
  }

  return (
    <svg viewBox={viewBox} className="w-full h-14 mb-2">
      {renderSection(inlet, 10, "Inlet")}
      {/* Arrow */}
      <path
        d="M 52 25 L 68 25 M 64 20 L 68 25 L 64 30"
        stroke="#64748b"
        strokeWidth="1.5"
        fill="none"
      />
      {renderSection(outlet, 75, "Outlet")}
    </svg>
  )
}

// ============================================================================
// TRANSITION PROPERTIES SECTION
// ============================================================================

interface TransitionPropertiesSectionProps {
  object: TransitionObject
  onUpdate: (updates: Partial<TransitionObject>) => void
}

function TransitionPropertiesSection({ object, onUpdate }: TransitionPropertiesSectionProps) {
  const { t } = useTranslation()
  const objects = useModellerStore((s) => s.objects)

  // Get connected channel names
  const upstreamName = object.upstreamChannelId
    ? (objects.find((o) => o.id === object.upstreamChannelId)?.name ?? "Unknown")
    : null
  const downstreamName = object.downstreamChannelId
    ? (objects.find((o) => o.id === object.downstreamChannelId)?.name ?? "Unknown")
    : null

  // Handler for transition type change
  const handleTypeChange = (newType: TransitionTypeEnum) => {
    onUpdate({ transitionType: newType })
  }

  // Handler for length change
  const handleLengthChange = (newLength: number) => {
    const slope = (object.startElevation - object.endElevation) / object.length || 0.005
    onUpdate({
      length: newLength,
      endStation: object.startStation + newLength,
      endElevation: object.startElevation - newLength * slope,
    })
  }

  // Handler for elevation changes
  const handleStartElevationChange = (value: number) => {
    onUpdate({
      startElevation: value,
      endElevation:
        value -
        object.length * ((object.startElevation - object.endElevation) / object.length || 0.005),
    })
  }

  const handleEndElevationChange = (value: number) => {
    onUpdate({ endElevation: value })
  }

  // Handler for inlet section changes
  const handleInletChange = (field: keyof TransitionSection, value: number | string) => {
    onUpdate({
      inlet: { ...object.inlet, [field]: value },
    })
  }

  // Handler for outlet section changes
  const handleOutletChange = (field: keyof TransitionSection, value: number | string) => {
    onUpdate({
      outlet: { ...object.outlet, [field]: value },
    })
  }

  return (
    <>
      {/* Transition Type & Geometry */}
      <Section title={t("properties.transitionGeometry", "Transition Geometry")} icon={GridIcon}>
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
      </Section>

      {/* Elevations */}
      <Section
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
      </Section>

      {/* Inlet Section */}
      <Section
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
      </Section>

      {/* Outlet Section */}
      <Section
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
      </Section>

      {/* Connections */}
      <Section
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
      </Section>
    </>
  )
}

// ============================================================================
// CHUTE SECTION PREVIEW SVG
// ============================================================================

interface ChuteSectionPreviewProps {
  width: number
  depth: number
  sideSlope: number
  chuteType: ChuteType
  stillingBasin: boolean
}

function ChuteSectionPreview({
  width,
  depth,
  sideSlope,
  chuteType,
  stillingBasin,
}: ChuteSectionPreviewProps) {
  const viewBox = "0 0 140 60"

  // Simplified side view of chute showing slope and basin
  const chuteStartX = 10
  const chuteStartY = 12
  const chuteEndX = 70
  const chuteEndY = 40
  const basinLength = 35

  // Chute type indicator
  const renderChutePattern = () => {
    if (chuteType === "stepped") {
      // Show steps
      const steps = 4
      const stepDx = (chuteEndX - chuteStartX) / steps
      const stepDy = (chuteEndY - chuteStartY) / steps
      return Array.from({ length: steps }, (_, i) => (
        <path
          key={i}
          d={`M ${chuteStartX + i * stepDx} ${chuteStartY + i * stepDy} 
              L ${chuteStartX + i * stepDx} ${chuteStartY + (i + 1) * stepDy}
              L ${chuteStartX + (i + 1) * stepDx} ${chuteStartY + (i + 1) * stepDy}`}
          stroke="#0ea5e9"
          strokeWidth="1.5"
          fill="none"
        />
      ))
    } else if (chuteType === "baffled") {
      // Show baffles as small blocks
      return (
        <>
          <line
            x1={chuteStartX}
            y1={chuteStartY}
            x2={chuteEndX}
            y2={chuteEndY}
            stroke="#0ea5e9"
            strokeWidth="2"
          />
          {[0.25, 0.5, 0.75].map((t, i) => {
            const bx = chuteStartX + t * (chuteEndX - chuteStartX)
            const by = chuteStartY + t * (chuteEndY - chuteStartY)
            return (
              <rect
                key={i}
                x={bx - 2}
                y={by - 4}
                width={4}
                height={4}
                fill="#64748b"
                stroke="#64748b"
              />
            )
          })}
        </>
      )
    } else {
      // Smooth chute - just a line
      return (
        <line
          x1={chuteStartX}
          y1={chuteStartY}
          x2={chuteEndX}
          y2={chuteEndY}
          stroke="#0ea5e9"
          strokeWidth="2"
        />
      )
    }
  }

  return (
    <svg viewBox={viewBox} className="w-full h-16 mb-2">
      {/* Upstream channel */}
      <rect
        x={2}
        y={8}
        width={10}
        height={8}
        fill="#64748b"
        fillOpacity="0.3"
        stroke="#64748b"
        strokeWidth="1"
      />

      {/* Chute */}
      {renderChutePattern()}

      {/* Stilling basin (if present) */}
      {stillingBasin && (
        <g>
          {/* Basin floor */}
          <rect
            x={chuteEndX}
            y={chuteEndY}
            width={basinLength}
            height={6}
            fill="#64748b"
            fillOpacity="0.4"
            stroke="#64748b"
            strokeWidth="1"
          />
          {/* Basin depth */}
          <rect
            x={chuteEndX}
            y={chuteEndY - 8}
            width={basinLength}
            height={8}
            fill="#0ea5e9"
            fillOpacity="0.2"
            stroke="#0ea5e9"
            strokeWidth="1"
          />
          {/* End sill */}
          <rect
            x={chuteEndX + basinLength - 3}
            y={chuteEndY - 10}
            width={3}
            height={10}
            fill="#64748b"
            fillOpacity="0.6"
            stroke="#64748b"
            strokeWidth="1"
          />
        </g>
      )}

      {/* Downstream channel */}
      <rect
        x={chuteEndX + basinLength + 2}
        y={chuteEndY - 4}
        width={20}
        height={8}
        fill="#64748b"
        fillOpacity="0.3"
        stroke="#64748b"
        strokeWidth="1"
      />

      {/* Labels */}
      <text x={40} y={58} textAnchor="middle" className="fill-muted-foreground text-[7px]">
        Chute
      </text>
      {stillingBasin && (
        <text
          x={chuteEndX + basinLength / 2}
          y={58}
          textAnchor="middle"
          className="fill-muted-foreground text-[7px]"
        >
          Basin
        </text>
      )}
    </svg>
  )
}

// ============================================================================
// CHUTE PROPERTIES SECTION
// ============================================================================

interface ChutePropertiesSectionProps {
  object: ChuteObject
  onUpdate: (updates: Partial<ChuteObject>) => void
}

function ChutePropertiesSection({ object, onUpdate }: ChutePropertiesSectionProps) {
  const { t } = useTranslation()
  const objects = useModellerStore((s) => s.objects)

  // Get connected element names
  const upstreamName = object.upstreamChannelId
    ? (objects.find((o) => o.id === object.upstreamChannelId)?.name ?? "Unknown")
    : null
  const downstreamName = object.downstreamChannelId
    ? (objects.find((o) => o.id === object.downstreamChannelId)?.name ?? "Unknown")
    : null

  // Handler for simple chute properties
  const handleChange = (field: keyof ChuteObject, value: number) => {
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
  }

  // Handler for chute type change
  const handleTypeChange = (newType: ChuteType) => {
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
  }

  // Handler for stilling basin toggle
  const handleBasinToggle = (enabled: boolean) => {
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
  }

  // Handler for stilling basin type change
  const handleBasinTypeChange = (newType: StillingBasinType) => {
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
        updates.endSill = { type: "dentated", height: 0.3, toothWidth: 0.2, toothSpacing: 0.2 }
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
  }

  // Handler for basin property change
  const handleBasinChange = (field: keyof StillingBasinConfig, value: number) => {
    if (!object.stillingBasin) return
    onUpdate({
      stillingBasin: { ...object.stillingBasin, [field]: value },
    })
  }

  // Computed values
  const slopePercent = object.slope * 100
  const slopeAngle = Math.atan(object.slope) * (180 / Math.PI)

  return (
    <>
      {/* Chute Type & Geometry */}
      <Section title={t("properties.chuteGeometry", "Chute Geometry")} icon={GridIcon}>
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
        {/* Length & Drop */}
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
      </Section>

      {/* Cross Section */}
      <Section
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
      </Section>

      {/* Type-specific Parameters */}
      {object.chuteType === "stepped" && (
        <Section
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
        </Section>
      )}

      {object.chuteType === "baffled" && (
        <Section
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
        </Section>
      )}

      {/* Alignment / Station Data */}
      <Section title={t("properties.alignment", "Alignment")} icon={Move01Icon} defaultOpen={false}>
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
      </Section>

      {/* Stilling Basin */}
      <Section
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
                    .filter((t) => t !== "none")
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
      </Section>

      {/* Connections */}
      <Section
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
      </Section>
    </>
  )
}

// ============================================================================
// MATERIAL SECTION
// ============================================================================

interface MaterialSectionProps {
  object: ShapeObject
  onUpdate: (updates: Partial<ShapeObject>) => void
}

function MaterialSection({ object, onUpdate }: MaterialSectionProps) {
  const { t } = useTranslation()

  const handleColorChange = (color: string) => {
    onUpdate({
      material: { ...object.material, color },
    })
  }

  const handleOpacityChange = (opacity: number[]) => {
    onUpdate({
      material: { ...object.material, opacity: opacity[0] },
    })
  }

  const handleMetalnessChange = (metalness: number[]) => {
    onUpdate({
      material: { ...object.material, metalness: metalness[0] },
    })
  }

  const handleRoughnessChange = (roughness: number[]) => {
    onUpdate({
      material: { ...object.material, roughness: roughness[0] },
    })
  }

  const presetColors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#6b7280",
    "#1f2937",
  ]

  return (
    <Section title={t("properties.material")} icon={PaintBrush01Icon}>
      <PropertyRow label={t("properties.color")}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={object.material.color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-6 w-10 cursor-pointer rounded border bg-transparent"
          />
          <div className="flex gap-0.5">
            {presetColors.slice(0, 6).map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => handleColorChange(color)}
                className={cn(
                  "size-4 rounded-sm border transition-transform hover:scale-110",
                  object.material.color === color && "ring-1 ring-primary ring-offset-1"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </PropertyRow>
      <PropertyRow label={t("properties.opacity")}>
        <div className="flex items-center gap-2">
          <Slider
            value={[object.material.opacity]}
            onValueChange={handleOpacityChange}
            min={0}
            max={1}
            step={0.1}
            className="flex-1"
          />
          <span className="w-8 text-[10px] text-muted-foreground text-right">
            {Math.round(object.material.opacity * 100)}%
          </span>
        </div>
      </PropertyRow>
      <PropertyRow label={t("properties.metalness")}>
        <div className="flex items-center gap-2">
          <Slider
            value={[object.material.metalness]}
            onValueChange={handleMetalnessChange}
            min={0}
            max={1}
            step={0.1}
            className="flex-1"
          />
          <span className="w-8 text-[10px] text-muted-foreground text-right">
            {Math.round(object.material.metalness * 100)}%
          </span>
        </div>
      </PropertyRow>
      <PropertyRow label={t("properties.roughness")}>
        <div className="flex items-center gap-2">
          <Slider
            value={[object.material.roughness]}
            onValueChange={handleRoughnessChange}
            min={0}
            max={1}
            step={0.1}
            className="flex-1"
          />
          <span className="w-8 text-[10px] text-muted-foreground text-right">
            {Math.round(object.material.roughness * 100)}%
          </span>
        </div>
      </PropertyRow>
    </Section>
  )
}

// ============================================================================
// LAYER & STATE SECTION
// ============================================================================

interface LayerStateSectionProps {
  object: AnySceneObject
  layers: Layer[]
  onUpdate: (updates: Partial<AnySceneObject>) => void
}

function LayerStateSection({ object, layers, onUpdate }: LayerStateSectionProps) {
  const { t } = useTranslation()
  const currentLayer = layers.find((l) => l.id === object.layerId)

  return (
    <Section title={t("properties.layerState")} icon={Layers01Icon}>
      {/* Layer selector */}
      <PropertyRow label={t("properties.layer")}>
        <Select value={object.layerId} onValueChange={(value) => onUpdate({ layerId: value })}>
          <SelectTrigger className="h-6 text-[10px]">
            <SelectValue>
              <div className="flex items-center gap-2">
                <div
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: currentLayer?.color ?? "#6366f1" }}
                />
                <span className="truncate">{currentLayer?.name ?? "Default"}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {layers.map((layer) => (
              <SelectItem key={layer.id} value={layer.id} className="text-[10px]">
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span>{layer.name}</span>
                  {layer.id === object.layerId && (
                    <Badge variant="secondary" className="ml-auto h-4 px-1 text-[8px]">
                      {t("properties.current")}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>

      {/* Visibility & Lock */}
      <div className="flex gap-1 mt-2">
        <Button
          variant={object.visible ? "secondary" : "outline"}
          size="sm"
          className="flex-1 h-7 text-[10px] gap-1.5"
          onClick={() => onUpdate({ visible: !object.visible })}
        >
          <HugeiconsIcon icon={object.visible ? ViewIcon : ViewOffIcon} className="size-3" />
          {object.visible ? t("properties.visible") : t("properties.hidden")}
        </Button>
        <Button
          variant={object.locked ? "secondary" : "outline"}
          size="sm"
          className="flex-1 h-7 text-[10px] gap-1.5"
          onClick={() => onUpdate({ locked: !object.locked })}
        >
          <HugeiconsIcon icon={object.locked ? LockIcon : SquareUnlock02Icon} className="size-3" />
          {object.locked ? t("properties.locked") : t("properties.unlocked")}
        </Button>
      </div>
    </Section>
  )
}

// ============================================================================
// INFO SECTION (IFC/BIM STYLE)
// ============================================================================

interface InfoSectionProps {
  object: AnySceneObject
}

function InfoSection({ object }: InfoSectionProps) {
  const { t } = useTranslation()
  const createdDate = new Date(object.createdAt).toLocaleString()
  const updatedDate = new Date(object.updatedAt).toLocaleString()

  // Calculate volume/area for shapes (includes scale factor)
  const getVolume = (obj: AnySceneObject): string => {
    if (obj.type !== "shape") return "N/A"
    const shape = obj as ShapeObject
    const params = shape.parameters
    const scale = shape.transform.scale
    const scaleFactor = scale.x * scale.y * scale.z

    let baseVolume = 0

    switch (shape.shapeType) {
      case "box":
        baseVolume = (params.width ?? 1) * (params.height ?? 1) * (params.depth ?? 1)
        break
      case "cylinder":
        baseVolume = Math.PI * (params.radius ?? 0.5) ** 2 * (params.height ?? 1)
        break
      case "sphere":
        baseVolume = (4 / 3) * Math.PI * (params.radius ?? 0.5) ** 3
        break
      case "cone":
        baseVolume =
          (1 / 3) *
          Math.PI *
          (params.height ?? 1) *
          ((params.bottomRadius ?? 0.5) ** 2 +
            (params.bottomRadius ?? 0.5) * (params.topRadius ?? 0) +
            (params.topRadius ?? 0) ** 2)
        break
      case "torus":
        baseVolume =
          2 * Math.PI * Math.PI * (params.majorRadius ?? 1) * (params.minorRadius ?? 0.3) ** 2
        break
      default:
        return "N/A"
    }

    return (baseVolume * scaleFactor).toFixed(3)
  }

  return (
    <Section title={t("properties.information")} icon={InformationCircleIcon} defaultOpen={false}>
      <PropertyRow label={t("properties.id")}>
        <code className="text-[10px] text-muted-foreground font-mono">
          {object.id.slice(0, 12)}...
        </code>
      </PropertyRow>
      <PropertyRow label={t("properties.type")}>
        <Badge variant="outline" className="text-[10px] capitalize">
          {object.type}
        </Badge>
      </PropertyRow>
      {object.type === "shape" && (
        <PropertyRow label={t("properties.volume")}>
          <span className="text-[10px]">{getVolume(object)} m³</span>
        </PropertyRow>
      )}
      <PropertyRow label={t("properties.created")}>
        <span className="text-[10px] text-muted-foreground">{createdDate}</span>
      </PropertyRow>
      <PropertyRow label={t("properties.modified")}>
        <span className="text-[10px] text-muted-foreground">{updatedDate}</span>
      </PropertyRow>
    </Section>
  )
}

// ============================================================================
// NO SELECTION STATE
// ============================================================================

function NoSelection() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <HugeiconsIcon icon={CubeIcon} className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">{t("properties.noSelection")}</h3>
      <p className="text-xs text-muted-foreground">{t("properties.noSelectionDesc")}</p>
    </div>
  )
}

// ============================================================================
// MULTIPLE SELECTION STATE
// ============================================================================

interface MultipleSelectionProps {
  count: number
  onDelete: () => void
  onDuplicate: () => void
}

function MultipleSelection({ count, onDelete, onDuplicate }: MultipleSelectionProps) {
  const { t } = useTranslation()

  return (
    <div className="px-3 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium">{t("properties.multipleSelected", { count })}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-xs" onClick={onDuplicate} className="h-6 w-6">
            <HugeiconsIcon icon={Copy01Icon} className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDelete}
            className="h-6 w-6 text-destructive hover:text-destructive"
          >
            <HugeiconsIcon icon={Delete01Icon} className="size-3" />
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">{t("properties.selectSingleToEdit")}</p>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  const { t } = useTranslation()
  const selectedIds = useSelectedIds()
  const objects = useModellerStore((s) => s.objects)
  const layers = useLayers()
  const viewportSettings = useViewportSettings()
  const updateObject = useModellerStore((s) => s.updateObject)
  const deleteSelected = useModellerStore((s) => s.deleteSelected)
  const duplicateSelected = useModellerStore((s) => s.duplicateSelected)

  // Get the selected object directly from objects array
  // This avoids the getObjectById function reference changing
  const selectedObject = useMemo(() => {
    if (selectedIds.length === 1) {
      return objects.find((o) => o.id === selectedIds[0]) ?? null
    }
    return null
  }, [selectedIds, objects])

  // Stable reference to the selected object ID
  const selectedObjectId = selectedObject?.id

  const handleUpdate = useCallback(
    (updates: Partial<AnySceneObject>) => {
      if (selectedObjectId) {
        updateObject(selectedObjectId, updates)
      }
    },
    [selectedObjectId, updateObject]
  )

  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden border-l border-border/40", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Settings01Icon} className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">{t("properties.title")}</span>
        </div>
        {selectedObject && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => duplicateSelected()}
              className="h-6 w-6"
            >
              <HugeiconsIcon icon={Copy01Icon} className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => deleteSelected()}
              className="h-6 w-6 text-destructive hover:text-destructive"
            >
              <HugeiconsIcon icon={Delete01Icon} className="size-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        {selectedIds.length === 0 && <NoSelection />}

        {selectedIds.length > 1 && (
          <MultipleSelection
            count={selectedIds.length}
            onDelete={deleteSelected}
            onDuplicate={duplicateSelected}
          />
        )}

        {selectedObject && (
          <div className="divide-y divide-border/40">
            {/* Name */}
            <div className="px-3 py-3">
              <PropertyRow label={t("properties.name")}>
                <Input
                  value={selectedObject.name}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                  className="h-6 text-[10px]"
                />
              </PropertyRow>
            </div>

            {/* Transform */}
            <TransformSection object={selectedObject} onUpdate={handleUpdate} />

            {/* Geometry (for shapes) */}
            {selectedObject.type === "shape" && (
              <GeometrySection
                object={selectedObject as ShapeObject}
                onUpdate={handleUpdate as (updates: Partial<ShapeObject>) => void}
              />
            )}

            {/* Channel Properties */}
            {selectedObject.type === "channel" && (
              <ChannelPropertiesSection
                object={selectedObject as ChannelObject}
                onUpdate={handleUpdate as (updates: Partial<ChannelObject>) => void}
              />
            )}

            {/* Transition Properties */}
            {selectedObject.type === "transition" && (
              <TransitionPropertiesSection
                object={selectedObject as TransitionObject}
                onUpdate={handleUpdate as (updates: Partial<TransitionObject>) => void}
              />
            )}

            {/* Chute Properties */}
            {selectedObject.type === "chute" && (
              <ChutePropertiesSection
                object={selectedObject as ChuteObject}
                onUpdate={handleUpdate as (updates: Partial<ChuteObject>) => void}
              />
            )}

            {/* Material (for shapes) */}
            {selectedObject.type === "shape" && (
              <MaterialSection
                object={selectedObject as ShapeObject}
                onUpdate={handleUpdate as (updates: Partial<ShapeObject>) => void}
              />
            )}

            {/* PBR Textures (for all objects when post-processing is enabled) */}
            <TextureMaterialPanel
              postProcessingEnabled={viewportSettings.enablePostProcessing ?? false}
            />

            {/* Layer & State */}
            <LayerStateSection object={selectedObject} layers={layers} onUpdate={handleUpdate} />

            {/* Info */}
            <InfoSection object={selectedObject} />
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export default PropertiesPanel
