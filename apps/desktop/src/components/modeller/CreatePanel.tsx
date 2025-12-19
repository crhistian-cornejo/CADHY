/**
 * Create Panel Component - CADHY
 *
 * Panel for creating new objects with improved UX:
 * - Visual primitive buttons with quick-create (Shift+Click or DoubleClick)
 * - Keyboard shortcuts with subtle visual hints
 * - Inline parameter editing directly below each item
 * - Hydraulic Channels with section preview
 * - Full accessibility support (ARIA, focus management)
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
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@cadhy/ui"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Building01Icon,
  CircleIcon,
  CubeIcon,
  Cylinder01Icon,
  Tick01Icon,
  TriangleIcon,
  WaterEnergyIcon,
  WaterfallDown01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useHotkey } from "@/hooks/use-hotkey"
import { useUnits } from "@/hooks/use-units"
import { useCAD } from "@/hooks/useCAD"
import { useHotkeyStore } from "@/stores/hotkey-store"
import {
  type ChannelObject,
  type ChannelSection,
  type RectangularSection,
  type ShapeObject,
  type TrapezoidalSection,
  type TriangularSection,
  useModellerStore,
  useObjects,
} from "@/stores/modeller-store"
import { ChuteCreator } from "./ChuteCreator"
import { TransitionCreator } from "./TransitionCreator"

// ============================================================================
// TYPES
// ============================================================================

interface CreatePanelProps {
  className?: string
}

type PrimitiveType = "box" | "cylinder" | "sphere" | "cone" | "torus"
type SectionType = "rectangular" | "trapezoidal" | "triangular"

// ============================================================================
// CONSTANTS - Primitive Configuration
// ============================================================================

interface PrimitiveConfig {
  type: PrimitiveType
  icon: typeof CubeIcon
  labelKey: string
  descKey: string
  /** Single letter shortcut (used with Shift) */
  shortcutKey: string
  hotkeyId: string
  defaultParams: Record<string, number>
}

// Default segment counts for different detail levels
// Low: 8-16, Medium: 32, High: 64, Ultra: 128
const DEFAULT_SEGMENTS = 32

const PRIMITIVES: PrimitiveConfig[] = [
  {
    type: "box",
    icon: CubeIcon,
    labelKey: "createPanel.box",
    descKey: "createPanel.boxDesc",
    shortcutKey: "B",
    hotkeyId: "tools.createBox",
    defaultParams: { width: 1, height: 1, depth: 1, segments: 1 }, // Box uses segments for subdivisions
  },
  {
    type: "cylinder",
    icon: Cylinder01Icon,
    labelKey: "createPanel.cylinder",
    descKey: "createPanel.cylinderDesc",
    shortcutKey: "Y",
    hotkeyId: "tools.createCylinder",
    defaultParams: { radius: 0.5, height: 1, segments: DEFAULT_SEGMENTS },
  },
  {
    type: "sphere",
    icon: CircleIcon,
    labelKey: "createPanel.sphere",
    descKey: "createPanel.sphereDesc",
    shortcutKey: "P",
    hotkeyId: "tools.createSphere",
    defaultParams: { radius: 0.5, segments: DEFAULT_SEGMENTS },
  },
  {
    type: "cone",
    icon: TriangleIcon,
    labelKey: "createPanel.cone",
    descKey: "createPanel.coneDesc",
    shortcutKey: "O",
    hotkeyId: "tools.createCone",
    defaultParams: { bottomRadius: 0.5, topRadius: 0, height: 1, segments: DEFAULT_SEGMENTS },
  },
  {
    type: "torus",
    icon: CircleIcon,
    labelKey: "createPanel.torus",
    descKey: "createPanel.torusDesc",
    shortcutKey: "U",
    hotkeyId: "tools.createTorus",
    defaultParams: { majorRadius: 1, minorRadius: 0.3, segments: DEFAULT_SEGMENTS },
  },
]

// unitType: 'length' means this parameter uses length units (m/ft) from the global unit system
type UnitType = "length" | "none"

const PARAM_CONFIGS: Record<
  PrimitiveType,
  {
    key: string
    label: string
    unitType?: UnitType
    isDetail?: boolean
    min?: number
    max?: number
    step?: number
  }[]
> = {
  box: [
    { key: "width", label: "Width", unitType: "length" },
    { key: "height", label: "Height", unitType: "length" },
    { key: "depth", label: "Depth", unitType: "length" },
    { key: "segments", label: "Subdivisions", isDetail: true, min: 1, max: 10, step: 1 },
  ],
  cylinder: [
    { key: "radius", label: "Radius", unitType: "length" },
    { key: "height", label: "Height", unitType: "length" },
    { key: "segments", label: "Detail", isDetail: true, min: 8, max: 128, step: 8 },
  ],
  sphere: [
    { key: "radius", label: "Radius", unitType: "length" },
    { key: "segments", label: "Detail", isDetail: true, min: 8, max: 128, step: 8 },
  ],
  cone: [
    { key: "bottomRadius", label: "Bottom R", unitType: "length" },
    { key: "topRadius", label: "Top R", unitType: "length" },
    { key: "height", label: "Height", unitType: "length" },
    { key: "segments", label: "Detail", isDetail: true, min: 8, max: 128, step: 8 },
  ],
  torus: [
    { key: "majorRadius", label: "Major R", unitType: "length" },
    { key: "minorRadius", label: "Minor R", unitType: "length" },
    { key: "segments", label: "Detail", isDetail: true, min: 8, max: 128, step: 8 },
  ],
}

// ============================================================================
// INLINE PARAMETER EDITOR
// ============================================================================

interface ParamInputProps {
  label: string
  /** Value in internal units (meters for length) */
  value: number
  /** Callback receives value in internal units (meters for length) */
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  /** Type of unit: 'length' for length params, 'none' or undefined for dimensionless */
  unitType?: UnitType
  /** Override unit label (for custom units like H:V) */
  customUnit?: string
  id?: string
  isDetail?: boolean
}

/**
 * ParamInput - Smart parameter input that handles unit conversions
 *
 * For 'length' unitType:
 * - Displays value in current display unit (m or ft)
 * - Converts user input back to internal units (meters)
 * - Shows dynamic unit label based on global settings
 */
function ParamInput({
  label,
  value,
  onChange,
  min = 0.01,
  max,
  step = 0.1,
  unitType,
  customUnit,
  id,
  isDetail,
}: ParamInputProps) {
  const inputId = id || `param-${label.toLowerCase().replace(/\s/g, "-")}`
  const { lengthLabel, convertLengthToDisplay, parseLength } = useUnits()

  // Determine unit label
  const unitLabel = customUnit ?? (unitType === "length" ? lengthLabel : undefined)

  // Convert value for display (internal -> display)
  const displayValue = unitType === "length" ? convertLengthToDisplay(value) : value

  // Handle change with conversion (display -> internal)
  const handleChange = (newDisplayValue: number) => {
    const internalValue = unitType === "length" ? parseLength(newDisplayValue) : newDisplayValue
    onChange(internalValue)
  }

  // Detail parameter gets a special slider UI
  if (isDetail) {
    return (
      <div className="flex items-center gap-2">
        <Label htmlFor={inputId} className="w-16 text-[10px] text-muted-foreground shrink-0">
          {label}
        </Label>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            id={inputId}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
            aria-label={`${label} value`}
          />
          <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
            {value}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={inputId} className="w-16 text-[10px] text-muted-foreground shrink-0">
        {label}
      </Label>
      <div className="flex-1 flex items-center gap-1">
        <NumberInput
          id={inputId}
          value={Number(displayValue.toFixed(4))}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          className="h-7 text-xs"
          aria-label={`${label} value`}
        />
        {unitLabel && <span className="text-[10px] text-muted-foreground w-6">{unitLabel}</span>}
      </div>
    </div>
  )
}

// ============================================================================
// PRIMITIVE INLINE FORM - Appears directly below each button
// ============================================================================

interface PrimitiveInlineFormProps {
  config: PrimitiveConfig
  onClose: () => void
  onCreated: () => void
}

function PrimitiveInlineForm({ config, onClose, onCreated }: PrimitiveInlineFormProps) {
  const { t } = useTranslation()
  const { addObject } = useModellerStore()
  const cad = useCAD()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(`${config.type.charAt(0).toUpperCase() + config.type.slice(1)}`)
  const [params, setParams] = useState<Record<string, number>>(() => ({ ...config.defaultParams }))

  // Focus name input when form opens
  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const handleCreate = async () => {
    try {
      let _sceneId: string | null = null

      // Call appropriate CAD function based on shape type
      switch (config.type) {
        case "box":
          _sceneId = await cad.createBoxShape(
            params.width || 2,
            params.depth || 2,
            params.height || 2,
            name
          )
          break
        case "cylinder":
          _sceneId = await cad.createCylinderShape(params.radius || 1, params.height || 2, name)
          break
        case "sphere":
          _sceneId = await cad.createSphereShape(params.radius || 1, name)
          break
        case "cone":
          _sceneId = await cad.createConeShape(
            params.baseRadius || 1,
            params.topRadius || 0,
            params.height || 2,
            name
          )
          break
        case "torus":
          _sceneId = await cad.createTorusShape(
            params.majorRadius || 2,
            params.minorRadius || 0.5,
            name
          )
          break
        default: {
          console.warn(`Unsupported shape type: ${config.type}`)
          // Fallback to old method for unsupported shapes
          const shapeData: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
            name,
            type: "shape",
            shapeType: config.type,
            layerId: "default",
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            visible: true,
            locked: false,
            selected: false,
            metadata: {},
            parameters: params,
            material: {
              color: "#6366f1",
              opacity: 1,
              metalness: 0.1,
              roughness: 0.6,
            },
          }
          addObject(shapeData)
        }
      }

      onCreated()
    } catch (error) {
      console.error("Failed to create shape:", error)
      toast.error(
        `Failed to create ${config.type}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleCreate()
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  const updateParam = (key: string, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  const submitShortcut = isMac ? "⌘↵" : "Ctrl+↵"

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="overflow-hidden"
    >
      <div
        className="mx-1 mt-1 mb-2 p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-3"
        role="form"
        aria-label={`Create ${config.type} form`}
        onKeyDown={handleKeyDown}
      >
        {/* Name input */}
        <div className="flex items-center gap-2">
          <Label
            htmlFor={`${config.type}-name`}
            className="w-16 text-[10px] text-muted-foreground shrink-0"
          >
            {t("createPanel.name")}
          </Label>
          <Input
            ref={nameInputRef}
            id={`${config.type}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-xs flex-1"
            placeholder={t("createPanel.objectName")}
          />
        </div>

        {/* Parameters */}
        {PARAM_CONFIGS[config.type].map(({ key, label, unitType, isDetail, min, max, step }) => (
          <ParamInput
            key={key}
            id={`${config.type}-${key}`}
            label={label}
            value={params[key]}
            onChange={(v) => updateParam(key, v)}
            unitType={unitType}
            min={min}
            max={max}
            step={step}
            isDetail={isDetail}
          />
        ))}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1 h-7 text-xs">
            {t("createPanel.cancel")}
          </Button>
          <Button size="sm" onClick={handleCreate} className="flex-1 h-7 text-xs gap-1">
            <HugeiconsIcon icon={Tick01Icon} className="size-3" />
            {t("createPanel.create")}
            <span className="text-[9px] opacity-60 ml-1">{submitShortcut}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// PRIMITIVE ITEM WITH INLINE FORM
// ============================================================================

interface PrimitiveItemWithFormProps {
  config: PrimitiveConfig
  isActive: boolean
  onToggle: () => void
  onQuickCreate: () => void
  onCreated: () => void
  showHints: boolean
}

function PrimitiveItemWithForm({
  config,
  isActive,
  onToggle,
  onQuickCreate,
  onCreated,
  showHints,
}: PrimitiveItemWithFormProps) {
  const { t } = useTranslation()

  const handleClick = (e: React.MouseEvent) => {
    // Quick create on Shift+Click or Double Click
    if (e.shiftKey || e.detail === 2) {
      e.preventDefault()
      onQuickCreate()
    } else {
      onToggle()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault()
      onQuickCreate()
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <div className="relative">
      <TooltipProvider delay={700}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              type="button"
              aria-expanded={isActive}
              aria-label={`${t(config.labelKey)}. ${t(config.descKey)}`}
              className={cn(
                "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150",
                "hover:border-primary/40 hover:bg-primary/5",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                isActive ? "border-primary/50 bg-primary/10" : "border-border/40 bg-card/30"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "size-8 rounded-md flex items-center justify-center shrink-0 transition-colors",
                  isActive ? "bg-primary/20" : "bg-muted/40 group-hover:bg-primary/10"
                )}
              >
                <HugeiconsIcon
                  icon={config.icon}
                  className={cn(
                    "size-4",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )}
                />
              </div>

              {/* Text */}
              <div className="flex-1 text-left min-w-0">
                <div
                  className={cn(
                    "text-xs font-medium truncate leading-tight",
                    isActive && "text-primary"
                  )}
                >
                  {t(config.labelKey)}
                </div>
                <div className="text-[10px] text-muted-foreground/70 truncate leading-tight">
                  {t(config.descKey)}
                </div>
              </div>

              {/* Shortcut - minimal, professional style */}
              {showHints && (
                <span
                  className={cn(
                    "text-[10px] font-medium shrink-0 transition-colors",
                    isActive
                      ? "text-primary/70"
                      : "text-muted-foreground/40 group-hover:text-muted-foreground/60"
                  )}
                >
                  ⇧{config.shortcutKey}
                </span>
              )}

              {/* Expand indicator */}
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className={cn(
                  "size-3.5 shrink-0 transition-transform duration-150",
                  isActive
                    ? "rotate-180 text-primary"
                    : "text-muted-foreground/40 group-hover:text-muted-foreground"
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[180px]">
            <p className="text-xs">{t(config.descKey)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Shift+Click for quick create</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Inline Form - appears directly below this button */}
      <AnimatePresence>
        {isActive && (
          <PrimitiveInlineForm config={config} onClose={onToggle} onCreated={onCreated} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// CHANNEL CREATOR
// ============================================================================

interface ChannelCreatorProps {
  onClose: () => void
  onCreated: () => void
}

function ChannelCreator({ onClose, onCreated }: ChannelCreatorProps) {
  const { t } = useTranslation()
  const { addObject, updateObject } = useModellerStore()
  const allObjects = useObjects()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { formatLength } = useUnits()

  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const existingChannels = (allObjects.filter((o) => o.type === "channel") as ChannelObject[]).sort(
    (a, b) => (b.endStation ?? 0) - (a.endStation ?? 0)
  )

  const lastChannel = existingChannels.find((c) => !c.downstreamChannelId) ?? existingChannels[0]

  const [name, setName] = useState(() => `Channel ${existingChannels.length + 1}`)
  const [sectionType, setSectionType] = useState<SectionType>(
    () => (lastChannel?.section?.type as SectionType) ?? "trapezoidal"
  )
  const [manningN, setManningN] = useState(() => lastChannel?.manningN ?? 0.013)
  const [slope, setSlope] = useState(() => lastChannel?.slope ?? 0.001)
  const [length, setLength] = useState(100)

  const [rectWidth, setRectWidth] = useState(() => {
    if (lastChannel?.section?.type === "rectangular") {
      return (lastChannel.section as RectangularSection).width ?? 2
    }
    return 2
  })
  const [depth, setDepth] = useState(() => lastChannel?.section?.depth ?? 1.5)
  const [trapBottom, setTrapBottom] = useState(() => {
    if (lastChannel?.section?.type === "trapezoidal") {
      return (lastChannel.section as TrapezoidalSection).bottomWidth ?? 2
    }
    return 2
  })
  const [trapSlope, setTrapSlope] = useState(() => {
    if (lastChannel?.section?.type === "trapezoidal") {
      return (lastChannel.section as TrapezoidalSection).sideSlope ?? 1.5
    }
    return 1.5
  })
  const [triSlope, setTriSlope] = useState(() => {
    if (lastChannel?.section?.type === "triangular") {
      return (lastChannel.section as TriangularSection).sideSlope ?? 1
    }
    return 1
  })

  const [thickness, setThickness] = useState(() => lastChannel?.thickness ?? 0.15)
  const [freeBoard, setFreeBoard] = useState(() => lastChannel?.freeBoard ?? 0.3)
  const [channelColor] = useState(() => lastChannel?.material?.color ?? "#0ea5e9")
  const [connectTo, setConnectTo] = useState<string>(() => lastChannel?.id ?? "none")

  const [startStation, setStartStation] = useState(() => {
    if (lastChannel) {
      return lastChannel.endStation ?? (lastChannel.startStation ?? 0) + lastChannel.length
    }
    return 0
  })
  const [startElevation, setStartElevation] = useState(() => {
    if (lastChannel) {
      return (
        lastChannel.endElevation ??
        (lastChannel.startElevation ?? 0) - lastChannel.length * lastChannel.slope
      )
    }
    return 0
  })

  const handleConnectionChange = (value: string | null) => {
    const channelId = value ?? "none"
    setConnectTo(channelId)
    if (channelId !== "none") {
      const upstreamChannel = existingChannels.find((c) => c.id === channelId)
      if (upstreamChannel) {
        const endStation =
          upstreamChannel.endStation ?? (upstreamChannel.startStation ?? 0) + upstreamChannel.length
        const endElevation =
          upstreamChannel.endElevation ??
          (upstreamChannel.startElevation ?? 0) - upstreamChannel.length * upstreamChannel.slope
        setStartStation(endStation)
        setStartElevation(endElevation)
        setSlope(upstreamChannel.slope)
      }
    }
  }

  const getSection = (): ChannelSection => {
    switch (sectionType) {
      case "rectangular":
        return { type: "rectangular", width: rectWidth, depth } as RectangularSection
      case "trapezoidal":
        return {
          type: "trapezoidal",
          bottomWidth: trapBottom,
          depth,
          sideSlope: trapSlope,
        } as TrapezoidalSection
      case "triangular":
        return { type: "triangular", depth, sideSlope: triSlope } as TriangularSection
    }
  }

  const handleCreate = () => {
    const endStation = startStation + length
    const endElevation = startElevation - length * slope

    const channelData: Omit<ChannelObject, "id" | "createdAt" | "updatedAt"> = {
      name,
      type: "channel",
      layerId: "default",
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      visible: true,
      locked: false,
      selected: false,
      metadata: {},
      section: getSection(),
      alignment: [
        { station: startStation, position: { x: 0, y: 0, z: startElevation } },
        { station: endStation, position: { x: length, y: 0, z: endElevation } },
      ],
      manningN,
      slope,
      length,
      thickness,
      freeBoard,
      startStation,
      startElevation,
      endStation,
      endElevation,
      upstreamChannelId: connectTo !== "none" ? connectTo : null,
      downstreamChannelId: null,
      material: {
        color: channelColor,
        opacity: 1,
        metalness: 0.1,
        roughness: 0.6,
      },
    }

    const newChannelId = addObject(channelData)
    if (connectTo !== "none") {
      updateObject(connectTo, { downstreamChannelId: newChannelId })
    }
    onCreated()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleCreate()
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  const SectionMiniPreview = ({ type }: { type: SectionType }) => {
    // Open channels have the opening at the TOP (free water surface)
    // and the base/floor at the BOTTOM
    const paths: Record<SectionType, string> = {
      rectangular: "M4 4 L4 18 L36 18 L36 4", // U shape: opening UP
      trapezoidal: "M2 4 L10 18 L30 18 L38 4", // Trapezoid: wider at top, narrow base
      triangular: "M4 4 L20 18 L36 4", // V shape: opening UP, vertex at bottom
    }
    return (
      <svg viewBox="0 0 40 24" className="w-full h-5">
        <path
          d={paths[type]}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cyan-500"
        />
      </svg>
    )
  }

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  const submitShortcut = isMac ? "⌘↵" : "Ctrl+↵"

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="overflow-hidden"
    >
      <div
        className="mx-1 mt-1 mb-2 p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 space-y-3"
        role="form"
        aria-label="Create channel form"
        onKeyDown={handleKeyDown}
      >
        {/* Section Type Selector */}
        <fieldset className="grid grid-cols-3 gap-1" aria-label="Section type">
          {(["rectangular", "trapezoidal", "triangular"] as SectionType[]).map((st) => (
            <button
              key={st}
              type="button"
              role="radio"
              aria-checked={sectionType === st}
              onClick={() => setSectionType(st)}
              className={cn(
                "flex flex-col items-center p-1.5 rounded border transition-all",
                "focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500",
                sectionType === st
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : "border-border/30 hover:border-cyan-500/30"
              )}
            >
              <SectionMiniPreview type={st} />
              <span className="text-[8px] text-muted-foreground mt-0.5 capitalize">
                {st.slice(0, 4)}
              </span>
            </button>
          ))}
        </fieldset>

        {/* Name */}
        <div className="flex items-center gap-2">
          <Label htmlFor="channel-name" className="w-16 text-[10px] text-muted-foreground shrink-0">
            {t("createPanel.name")}
          </Label>
          <Input
            ref={nameInputRef}
            id="channel-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-xs"
          />
        </div>

        {/* Connection */}
        {existingChannels.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="w-16 text-[10px] text-muted-foreground shrink-0">
              {t("createPanel.connectTo")}
            </Label>
            <Select value={connectTo} onValueChange={handleConnectionChange}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">
                  {t("createPanel.noConnection")}
                </SelectItem>
                {existingChannels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id} className="text-xs">
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Section params */}
        {sectionType === "rectangular" && (
          <>
            <ParamInput
              label="Width (b)"
              value={rectWidth}
              onChange={setRectWidth}
              unitType="length"
            />
            <ParamInput label="Depth (y)" value={depth} onChange={setDepth} unitType="length" />
          </>
        )}
        {sectionType === "trapezoidal" && (
          <>
            <ParamInput
              label="Bottom (b)"
              value={trapBottom}
              onChange={setTrapBottom}
              unitType="length"
            />
            <ParamInput label="Depth (y)" value={depth} onChange={setDepth} unitType="length" />
            <ParamInput
              label="Slope (z)"
              value={trapSlope}
              onChange={setTrapSlope}
              step={0.1}
              customUnit="H:V"
            />
          </>
        )}
        {sectionType === "triangular" && (
          <>
            <ParamInput label="Depth (y)" value={depth} onChange={setDepth} unitType="length" />
            <ParamInput
              label="Slope (z)"
              value={triSlope}
              onChange={setTriSlope}
              step={0.1}
              customUnit="H:V"
            />
          </>
        )}

        {/* Structure */}
        <div className="grid grid-cols-2 gap-2">
          <ParamInput
            label="Wall (e)"
            value={thickness}
            onChange={setThickness}
            min={0.05}
            step={0.01}
            unitType="length"
          />
          <ParamInput
            label="Freeboard"
            value={freeBoard}
            onChange={setFreeBoard}
            min={0.1}
            step={0.05}
            unitType="length"
          />
        </div>

        {/* Hydraulics */}
        <ParamInput
          label="Manning n"
          value={manningN}
          onChange={setManningN}
          min={0.001}
          step={0.001}
        />
        <ParamInput label="Slope (S₀)" value={slope} onChange={setSlope} min={0} step={0.0001} />
        <ParamInput
          label="Length (L)"
          value={length}
          onChange={setLength}
          min={1}
          step={1}
          unitType="length"
        />

        {/* Start position */}
        {connectTo === "none" && (
          <>
            <div className="text-[9px] text-muted-foreground font-medium pt-1">Start Position</div>
            <div className="grid grid-cols-2 gap-2">
              <ParamInput
                label="Station"
                value={startStation}
                onChange={setStartStation}
                min={0}
                step={1}
                unitType="length"
              />
              <ParamInput
                label="Elev."
                value={startElevation}
                onChange={setStartElevation}
                step={0.1}
                unitType="length"
              />
            </div>
          </>
        )}

        {/* Computed values */}
        <div className="p-2 rounded bg-muted/20 text-[9px] space-y-0.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">End Station:</span>
            <span className="font-mono">{formatLength(startStation + length)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">End Elevation:</span>
            <span className="font-mono">{formatLength(startElevation - length * slope)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1 h-7 text-xs">
            {t("createPanel.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            className="flex-1 h-7 text-xs bg-cyan-600 hover:bg-cyan-700 gap-1"
          >
            <HugeiconsIcon icon={Tick01Icon} className="size-3" />
            {t("createPanel.create")}
            <span className="text-[9px] opacity-60 ml-1">{submitShortcut}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// HYDRAULIC ELEMENT BUTTON WITH INLINE FORM
// ============================================================================

// Color configuration for hydraulic elements
// Using explicit class names for Tailwind JIT compiler
const HYDRAULIC_COLORS = {
  cyan: {
    icon: "text-cyan-500",
    label: "text-cyan-400",
    hint: "text-cyan-400/70",
    border: "border-cyan-500/50",
    bg: "bg-cyan-500/10",
    iconBg: "bg-cyan-500/20",
  },
  green: {
    icon: "text-green-500",
    label: "text-green-400",
    hint: "text-green-400/70",
    border: "border-green-500/50",
    bg: "bg-green-500/10",
    iconBg: "bg-green-500/20",
  },
  amber: {
    icon: "text-amber-500",
    label: "text-amber-400",
    hint: "text-amber-400/70",
    border: "border-amber-500/50",
    bg: "bg-amber-500/10",
    iconBg: "bg-amber-500/20",
  },
} as const

type HydraulicColor = keyof typeof HYDRAULIC_COLORS

interface HydraulicButtonProps {
  icon: typeof WaterEnergyIcon
  label: string
  description: string
  shortcut: string
  isActive: boolean
  onToggle: () => void
  showHints: boolean
  colorClass: HydraulicColor
  children?: React.ReactNode
}

function HydraulicButton({
  icon,
  label,
  description,
  shortcut,
  isActive,
  onToggle,
  showHints,
  colorClass,
  children,
}: HydraulicButtonProps) {
  const colors = HYDRAULIC_COLORS[colorClass]

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isActive}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          isActive
            ? cn(colors.border, colors.bg, "focus-visible:ring-primary")
            : "border-border/40 bg-card/30 hover:border-border/60 focus-visible:ring-primary"
        )}
      >
        <div
          className={cn(
            "size-8 rounded-md flex items-center justify-center shrink-0",
            isActive ? colors.iconBg : "bg-muted/40"
          )}
        >
          <HugeiconsIcon icon={icon} className={cn("size-4", colors.icon)} />
        </div>

        <div className="flex-1 text-left min-w-0">
          <div
            className={cn("text-xs font-medium truncate leading-tight", isActive && colors.label)}
          >
            {label}
          </div>
          <div className="text-[10px] text-muted-foreground/70 truncate leading-tight">
            {description}
          </div>
        </div>

        {showHints && (
          <span
            className={cn(
              "text-[10px] font-medium shrink-0",
              isActive ? colors.hint : "text-muted-foreground/40"
            )}
          >
            ⇧{shortcut}
          </span>
        )}

        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-150",
            isActive ? cn("rotate-180", colors.label) : "text-muted-foreground/40"
          )}
        />
      </button>

      <AnimatePresence>{isActive && children}</AnimatePresence>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreatePanel({ className }: CreatePanelProps) {
  const { t } = useTranslation()
  const [activePrimitive, setActivePrimitive] = useState<PrimitiveType | null>(null)
  const [showChannelCreator, setShowChannelCreator] = useState(false)
  const [showTransitionCreator, setShowTransitionCreator] = useState(false)
  const [showChuteCreator, setShowChuteCreator] = useState(false)
  const showHotkeyHints = useHotkeyStore((s) => s.showHotkeyHints)
  const { addObject } = useModellerStore()

  // Collapsible section states (all expanded by default)
  const [primitivesOpen, setPrimitivesOpen] = useState(true)
  const [hydraulicsOpen, setHydraulicsOpen] = useState(true)
  const [structuresOpen, setStructuresOpen] = useState(true)

  // Quick create handler
  const quickCreatePrimitive = useCallback(
    (type: PrimitiveType) => {
      const config = PRIMITIVES.find((p) => p.type === type)
      if (!config) return

      const shapeData: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
        name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type: "shape",
        shapeType: type,
        layerId: "default",
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        visible: true,
        locked: false,
        selected: false,
        metadata: {},
        parameters: { ...config.defaultParams },
        material: {
          color: "#6366f1",
          opacity: 1,
          metalness: 0.1,
          roughness: 0.6,
        },
      }
      addObject(shapeData)
    },
    [addObject]
  )

  // Register hotkeys
  useHotkey(
    {
      id: "tools.createBox",
      name: "Create Box",
      description: "Create a box primitive",
      category: "tools",
      keys: ["Shift+B"],
      context: "modeller",
    },
    useCallback(() => quickCreatePrimitive("box"), [quickCreatePrimitive])
  )
  useHotkey(
    {
      id: "tools.createCylinder",
      name: "Create Cylinder",
      description: "Create a cylinder primitive",
      category: "tools",
      keys: ["Shift+Y"],
      context: "modeller",
    },
    useCallback(() => quickCreatePrimitive("cylinder"), [quickCreatePrimitive])
  )
  useHotkey(
    {
      id: "tools.createSphere",
      name: "Create Sphere",
      description: "Create a sphere primitive",
      category: "tools",
      keys: ["Shift+P"],
      context: "modeller",
    },
    useCallback(() => quickCreatePrimitive("sphere"), [quickCreatePrimitive])
  )
  useHotkey(
    {
      id: "tools.createCone",
      name: "Create Cone",
      description: "Create a cone primitive",
      category: "tools",
      keys: ["Shift+O"],
      context: "modeller",
    },
    useCallback(() => quickCreatePrimitive("cone"), [quickCreatePrimitive])
  )
  useHotkey(
    {
      id: "tools.createTorus",
      name: "Create Torus",
      description: "Create a torus primitive",
      category: "tools",
      keys: ["Shift+U"],
      context: "modeller",
    },
    useCallback(() => quickCreatePrimitive("torus"), [quickCreatePrimitive])
  )
  useHotkey(
    {
      id: "tools.createChannel",
      name: "Create Channel",
      description: "Open channel creation panel",
      category: "tools",
      keys: ["Shift+C"],
      context: "modeller",
    },
    useCallback(() => {
      setShowChannelCreator(true)
      setShowTransitionCreator(false)
      setActivePrimitive(null)
    }, [])
  )
  useHotkey(
    {
      id: "tools.createTransition",
      name: "Create Transition",
      description: "Open transition creation panel",
      category: "tools",
      keys: ["Shift+T"],
      context: "modeller",
    },
    useCallback(() => {
      setShowTransitionCreator(true)
      setShowChannelCreator(false)
      setShowChuteCreator(false)
      setActivePrimitive(null)
    }, [])
  )
  useHotkey(
    {
      id: "tools.createChute",
      name: "Create Chute",
      description: "Open chute creation panel",
      category: "tools",
      keys: ["Shift+R"],
      context: "modeller",
    },
    useCallback(() => {
      setShowChuteCreator(true)
      setShowChannelCreator(false)
      setShowTransitionCreator(false)
      setActivePrimitive(null)
    }, [])
  )

  const handlePrimitiveToggle = (type: PrimitiveType) => {
    if (activePrimitive === type) {
      setActivePrimitive(null)
    } else {
      setActivePrimitive(type)
      setShowChannelCreator(false)
      setShowTransitionCreator(false)
    }
  }

  const handleCreated = () => {
    setActivePrimitive(null)
    setShowChannelCreator(false)
    setShowTransitionCreator(false)
    setShowChuteCreator(false)
  }

  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden", className)}
      role="region"
      aria-label={t("createPanel.title", "Create Objects")}
    >
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {/* PRIMITIVES SECTION */}
          <Collapsible open={primitivesOpen} onOpenChange={setPrimitivesOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 py-1.5 group hover:bg-muted/30 rounded-md px-1 -mx-1 transition-colors"
                  >
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className={cn(
                        "size-3 text-muted-foreground transition-transform duration-200",
                        primitivesOpen && "rotate-90"
                      )}
                    />
                    <div className="size-4 rounded bg-muted/50 flex items-center justify-center">
                      <HugeiconsIcon icon={CubeIcon} className="size-2.5 text-muted-foreground" />
                    </div>
                    <h3 className="text-[11px] font-medium text-muted-foreground">
                      {t("createPanel.primitives")}
                    </h3>
                  </button>
                </CollapsibleTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                {primitivesOpen
                  ? t("createPanel.collapseSection", "Click to collapse")
                  : t("createPanel.expandSection", "Click to expand")}
              </TooltipContent>
            </Tooltip>
            <CollapsibleContent>
              <div className="space-y-1 mt-2" role="group" aria-label="Primitive shapes">
                {PRIMITIVES.map((config) => (
                  <PrimitiveItemWithForm
                    key={config.type}
                    config={config}
                    isActive={activePrimitive === config.type}
                    onToggle={() => handlePrimitiveToggle(config.type)}
                    onQuickCreate={() => quickCreatePrimitive(config.type)}
                    onCreated={handleCreated}
                    showHints={showHotkeyHints}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-2" />

          {/* HYDRAULIC ELEMENTS SECTION */}
          <Collapsible open={hydraulicsOpen} onOpenChange={setHydraulicsOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 py-1.5 group hover:bg-muted/30 rounded-md px-1 -mx-1 transition-colors"
                  >
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className={cn(
                        "size-3 text-muted-foreground transition-transform duration-200",
                        hydraulicsOpen && "rotate-90"
                      )}
                    />
                    <div className="size-4 rounded bg-cyan-500/20 flex items-center justify-center">
                      <HugeiconsIcon icon={WaterEnergyIcon} className="size-2.5 text-cyan-500" />
                    </div>
                    <h3 className="text-[11px] font-medium text-muted-foreground">
                      {t("createPanel.hydraulicElements")}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-[8px] ml-auto text-cyan-500 border-cyan-500/30 h-4 px-1"
                    >
                      CAD
                    </Badge>
                  </button>
                </CollapsibleTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                {hydraulicsOpen
                  ? t("createPanel.collapseSection", "Click to collapse")
                  : t("createPanel.expandSection", "Click to expand")}
              </TooltipContent>
            </Tooltip>
            <CollapsibleContent>
              <div className="space-y-1 mt-2">
                {/* Channel */}
                <HydraulicButton
                  icon={WaterEnergyIcon}
                  label={t("createPanel.openChannel")}
                  description={t("createPanel.openChannelDesc")}
                  shortcut="C"
                  isActive={showChannelCreator}
                  onToggle={() => {
                    setShowChannelCreator(!showChannelCreator)
                    setShowTransitionCreator(false)
                    setShowChuteCreator(false)
                    setActivePrimitive(null)
                  }}
                  showHints={showHotkeyHints}
                  colorClass="cyan"
                >
                  <ChannelCreator
                    onClose={() => setShowChannelCreator(false)}
                    onCreated={handleCreated}
                  />
                </HydraulicButton>

                {/* Transition */}
                <HydraulicButton
                  icon={WaterfallDown01Icon}
                  label={t("createPanel.transition", "Transition")}
                  description={t("createPanel.transitionDesc", "Connect channels")}
                  shortcut="T"
                  isActive={showTransitionCreator}
                  onToggle={() => {
                    setShowTransitionCreator(!showTransitionCreator)
                    setShowChannelCreator(false)
                    setShowChuteCreator(false)
                    setActivePrimitive(null)
                  }}
                  showHints={showHotkeyHints}
                  colorClass="green"
                >
                  <TransitionCreator
                    onClose={() => setShowTransitionCreator(false)}
                    onCreated={handleCreated}
                  />
                </HydraulicButton>

                {/* Chute */}
                <HydraulicButton
                  icon={ArrowDown01Icon}
                  label={t("createPanel.chute", "Chute")}
                  description={t("createPanel.chuteDesc", "High-slope channel")}
                  shortcut="R"
                  isActive={showChuteCreator}
                  onToggle={() => {
                    setShowChuteCreator(!showChuteCreator)
                    setShowChannelCreator(false)
                    setShowTransitionCreator(false)
                    setActivePrimitive(null)
                  }}
                  showHints={showHotkeyHints}
                  colorClass="amber"
                >
                  <ChuteCreator
                    onClose={() => setShowChuteCreator(false)}
                    onCreated={handleCreated}
                  />
                </HydraulicButton>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-2" />

          {/* STRUCTURES (Coming Soon) */}
          <Collapsible open={structuresOpen} onOpenChange={setStructuresOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 py-1.5 group hover:bg-muted/30 rounded-md px-1 -mx-1 transition-colors"
                  >
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className={cn(
                        "size-3 text-muted-foreground/50 transition-transform duration-200",
                        structuresOpen && "rotate-90"
                      )}
                    />
                    <div className="size-4 rounded bg-muted/30 flex items-center justify-center">
                      <HugeiconsIcon
                        icon={Building01Icon}
                        className="size-2.5 text-muted-foreground/50"
                      />
                    </div>
                    <h3 className="text-[11px] font-medium text-muted-foreground/50">
                      {t("createPanel.structures")}
                    </h3>
                    <Badge variant="outline" className="text-[8px] ml-auto h-4 px-1 opacity-50">
                      {t("createPanel.soon")}
                    </Badge>
                  </button>
                </CollapsibleTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                {structuresOpen
                  ? t("createPanel.collapseSection", "Click to collapse")
                  : t("createPanel.expandSection", "Click to expand")}
              </TooltipContent>
            </Tooltip>
            <CollapsibleContent>
              <div className="space-y-1 mt-2 opacity-40 pointer-events-none">
                {[
                  {
                    name: t("createPanel.dropStructure"),
                    desc: t("createPanel.dropStructureDesc"),
                  },
                  { name: t("createPanel.weir"), desc: t("createPanel.weirDesc") },
                  { name: t("createPanel.junction"), desc: t("createPanel.junctionDesc") },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/20 bg-muted/10"
                  >
                    <div className="size-8 rounded-md bg-muted/20 flex items-center justify-center">
                      <HugeiconsIcon
                        icon={Building01Icon}
                        className="size-4 text-muted-foreground/40"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground/60 truncate">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground/40 truncate">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  )
}

export default CreatePanel
