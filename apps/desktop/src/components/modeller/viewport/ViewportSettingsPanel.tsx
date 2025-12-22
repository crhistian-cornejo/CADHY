/**
 * Viewport Settings Panel - CADHY
 *
 * Complete viewport settings with real functionality:
 * - Environment/Lighting presets with visual previews
 * - Display toggles (grid, axes, shadows, AO)
 * - Camera settings (FOV, perspective/ortho)
 * - Post-processing controls
 * - Snapping configuration
 */

import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  ArrowDown01Icon,
  Layers01Icon,
  Magnet01Icon,
  RefreshIcon,
  Settings01Icon,
  Sun01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import {
  type EnvironmentPreset,
  useGridSettings,
  useModellerStore,
  useSnapMode,
  useViewportSettings,
} from "@/stores/modeller"

// ============================================================================
// ENVIRONMENT PRESETS WITH REAL HDRI PREVIEWS
// ============================================================================

interface EnvironmentPresetInfo {
  id: EnvironmentPreset
  name: string
  description: string
  /** Poly Haven HDRI ID for preview image */
  hdriId: string
  intensity: number
}

// Drei preset → Poly Haven HDRI mapping (from @react-three/drei)
const ENVIRONMENT_PRESETS: EnvironmentPresetInfo[] = [
  {
    id: "studio",
    name: "Studio",
    description: "Clean studio lighting",
    hdriId: "studio_small_03",
    intensity: 1.0,
  },
  {
    id: "apartment",
    name: "Apartment",
    description: "Warm indoor lighting",
    hdriId: "lebombo",
    intensity: 0.8,
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Golden hour",
    hdriId: "venice_sunset",
    intensity: 1.2,
  },
  {
    id: "dawn",
    name: "Dawn",
    description: "Soft morning light",
    hdriId: "kiara_1_dawn",
    intensity: 0.9,
  },
  {
    id: "city",
    name: "City",
    description: "Urban environment",
    hdriId: "potsdamer_platz",
    intensity: 1.0,
  },
  {
    id: "warehouse",
    name: "Warehouse",
    description: "Industrial lighting",
    hdriId: "empty_warehouse_01",
    intensity: 0.7,
  },
  {
    id: "forest",
    name: "Forest",
    description: "Natural outdoor",
    hdriId: "forest_slope",
    intensity: 1.1,
  },
  {
    id: "park",
    name: "Park",
    description: "Open outdoors",
    hdriId: "rooitou_park",
    intensity: 1.3,
  },
  {
    id: "night",
    name: "Night",
    description: "Dark ambient",
    hdriId: "dikhololo_night",
    intensity: 0.3,
  },
  {
    id: "lobby",
    name: "Lobby",
    description: "Professional interior",
    hdriId: "st_fagans_interior",
    intensity: 0.9,
  },
]

// Get Poly Haven thumbnail URL for HDRI preview
const getHdriPreviewUrl = (hdriId: string) =>
  `https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${hdriId}.jpg`

// ============================================================================
// COMPACT UI COMPONENTS
// ============================================================================

function CompactNumberInput({
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}) {
  return (
    <div className="relative flex items-center">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="h-6 w-16 rounded bg-black/20 text-right text-xs pr-1 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-black/30 transition-colors"
      />
      {unit && (
        <span className="absolute right-6 text-[10px] text-muted-foreground pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// POST-PROCESSING QUALITY PRESETS
// ============================================================================

// ============================================================================
// SECTION COMPONENT
// ============================================================================

interface SectionProps {
  title: string
  icon: typeof ViewIcon
  defaultOpen?: boolean
  children: React.ReactNode
}

function Section({ title, icon, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border-b border-border/20 last:border-0"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/5 transition-colors group">
        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 group-hover:text-foreground transition-colors">
          {title}
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className={cn(
            "size-3.5 text-muted-foreground/50 transition-transform group-hover:text-foreground/80",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// SETTING ROW COMPONENTS
// ============================================================================

interface ToggleRowProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  description?: string
  disabled?: boolean
}

function ToggleRow({ label, checked, onCheckedChange, description, disabled }: ToggleRowProps) {
  return (
    <div className={cn("flex items-center justify-between group", disabled && "opacity-50")}>
      <div className="flex flex-col">
        <Label className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </Label>
        {description && <span className="text-[9px] text-muted-foreground/70">{description}</span>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-blue-600 scale-90 origin-right"
      />
    </div>
  )
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onValueChange: (value: number) => void
  unit?: string
  displayValue?: string
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onValueChange,
  unit,
  displayValue,
}: SliderRowProps) {
  const safeValue = value ?? min

  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-xs text-muted-foreground min-w-20">{label}</Label>
      <div className="flex items-center gap-2 flex-1">
        <Slider
          value={[safeValue]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => onValueChange(v)}
          className="flex-1 [&_.range-slider-thumb]:border-blue-500 [&_.range-slider-thumb]:focus:ring-blue-500/20 [&_.range-slider-track-active]:bg-blue-600"
        />
        <CompactNumberInput
          value={safeValue}
          onChange={onValueChange}
          min={min}
          max={max}
          step={step}
        />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ViewportSettingsPanelProps {
  className?: string
}

export function ViewportSettingsPanel({ className }: ViewportSettingsPanelProps) {
  const viewportSettings = useViewportSettings()
  const gridSettings = useGridSettings()
  const snapMode = useSnapMode()
  const { setViewportSettings, setGridSettings, setSnapMode } = useModellerStore()

  // Update viewport settings helper
  const updateViewport = useCallback(
    (updates: Partial<typeof viewportSettings>) => {
      setViewportSettings({ ...viewportSettings, ...updates })
    },
    [viewportSettings, setViewportSettings]
  )

  // Update grid settings helper
  const updateGrid = useCallback(
    (updates: Partial<typeof gridSettings>) => {
      setGridSettings({ ...gridSettings, ...updates })
    },
    [gridSettings, setGridSettings]
  )

  // Handle environment preset selection
  const handleEnvironmentChange = (preset: EnvironmentPresetInfo) => {
    updateViewport({
      environmentPreset: preset.id,
      environmentIntensity: preset.intensity,
    })
  }

  // Reset to defaults
  const handleResetToDefaults = () => {
    setViewportSettings({
      viewMode: "solid",
      showGrid: true,
      showAxes: true,
      showGizmo: true,
      backgroundColor: "#1a1a1a",
      ambientOcclusion: true,
      shadows: true,
      antialiasing: true,
      postProcessingQuality: "medium",
      enablePostProcessing: true,
      textureScale: 1.0,
      environmentEnabled: true,
      environmentPreset: "apartment",
      environmentIntensity: 1.0,
      environmentBackground: false,
      backgroundBlurriness: 0.5,
      cameraType: "perspective",
    })
  }

  return (
    <div className={cn("flex flex-col h-full bg-background overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Settings01Icon} className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">Viewport Settings</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6"
              onClick={handleResetToDefaults}
            >
              <HugeiconsIcon icon={RefreshIcon} className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Reset to defaults</TooltipContent>
        </Tooltip>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Render Mode Section - Removed as per user request (moved to bottom toolbar) */}

        {/* Environment/Lighting Section */}
        <Section title="Environment" icon={Sun01Icon}>
          <div className="space-y-3">
            {/* Enable/Disable Environment Lighting */}
            <ToggleRow
              label="Environment Lighting"
              checked={viewportSettings.environmentEnabled ?? true}
              onCheckedChange={(v) => updateViewport({ environmentEnabled: v })}
              description="HDRI-based realistic lighting"
            />

            {/* Environment Preset Grid with Real HDRI Previews */}
            {viewportSettings.environmentEnabled && (
              <div className="grid grid-cols-5 gap-2">
                {ENVIRONMENT_PRESETS.map((preset) => (
                  <Tooltip key={preset.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleEnvironmentChange(preset)}
                        className={cn(
                          "relative w-full aspect-square rounded-full transition-all overflow-hidden bg-muted shadow-sm",
                          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          (viewportSettings.environmentPreset ?? "apartment") === preset.id
                            ? "ring-2 ring-blue-500 ring-offset-2 scale-100"
                            : "hover:scale-105 hover:ring-1 hover:ring-white/20 opacity-70 hover:opacity-100"
                        )}
                      >
                        {/* Real HDRI Preview Image */}
                        <img
                          src={getHdriPreviewUrl(preset.hdriId)}
                          alt={preset.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                        {/* Dark overlay for better visibility */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-muted-foreground">{preset.description}</div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}

            {/* Environment Intensity */}
            {viewportSettings.environmentEnabled && (
              <SliderRow
                label="Intensity"
                value={viewportSettings.environmentIntensity ?? 1.0}
                min={0}
                max={2}
                step={0.1}
                onValueChange={(v) => updateViewport({ environmentIntensity: v })}
              />
            )}

            {/* Show Environment as Background */}
            {viewportSettings.environmentEnabled && (
              <ToggleRow
                label="Show as Background"
                checked={viewportSettings.environmentBackground ?? false}
                onCheckedChange={(v) => updateViewport({ environmentBackground: v })}
                description="Use HDRI as scene background"
              />
            )}

            {/* Background Blur */}
            {viewportSettings.environmentEnabled && viewportSettings.environmentBackground && (
              <SliderRow
                label="Background Blur"
                value={viewportSettings.backgroundBlurriness ?? 0.5}
                min={0}
                max={1}
                step={0.05}
                onValueChange={(v) => updateViewport({ backgroundBlurriness: v })}
                displayValue={`${Math.round((viewportSettings.backgroundBlurriness ?? 0.5) * 100)}%`}
              />
            )}
          </div>
        </Section>

        <Separator className="my-1" />

        {/* Background Color Section */}
        <Section title="Background" icon={ViewIcon} defaultOpen={false}>
          <div className="space-y-3">
            {/* Preset Colors */}
            <div className="space-y-1.5">
              <Label className="text-xs">Background Color</Label>
              <div className="grid grid-cols-6 gap-1.5">
                {[
                  { color: "#1a1a1a", name: "Dark" },
                  { color: "#2d2d2d", name: "Charcoal" },
                  { color: "#404040", name: "Gray" },
                  { color: "#0a0a14", name: "Navy Dark" },
                  { color: "#1a1a2e", name: "Deep Blue" },
                  { color: "#16213e", name: "Midnight" },
                  { color: "#0f3460", name: "Ocean" },
                  { color: "#1e3a5f", name: "Steel Blue" },
                  { color: "#2c3e50", name: "Wet Asphalt" },
                  { color: "#34495e", name: "Concrete" },
                  { color: "#f0f0f0", name: "Light" },
                  { color: "#ffffff", name: "White" },
                ].map((preset) => (
                  <Tooltip key={preset.color}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => updateViewport({ backgroundColor: preset.color })}
                        className={cn(
                          "w-6 h-6 rounded-md border transition-all",
                          (viewportSettings.backgroundColor ?? "#1a1a1a") === preset.color
                            ? "ring-2 ring-primary ring-offset-1 scale-110"
                            : "hover:scale-105 border-border/50"
                        )}
                        style={{ backgroundColor: preset.color }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {preset.name}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Custom</Label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">
                  {viewportSettings.backgroundColor ?? "#1a1a1a"}
                </span>
                <input
                  type="color"
                  value={viewportSettings.backgroundColor ?? "#1a1a1a"}
                  onChange={(e) => updateViewport({ backgroundColor: e.target.value })}
                  className="size-5 rounded overflow-hidden border-0 cursor-pointer p-0"
                />
              </div>
            </div>
          </div>
        </Section>

        <Separator className="my-1" />

        {/* Display Section */}
        <Section title="Display" icon={ViewIcon}>
          <div className="space-y-2">
            <ToggleRow
              label="Show Grid"
              checked={viewportSettings.showGrid ?? true}
              onCheckedChange={(v) => updateViewport({ showGrid: v })}
            />

            {/* Grid settings - shown when grid is enabled */}
            {viewportSettings.showGrid && (
              <div className="pl-3 border-l-2 border-border/50 space-y-2">
                <SliderRow
                  label="Grid Size"
                  value={gridSettings.size ?? 100}
                  min={10}
                  max={200}
                  step={10}
                  onValueChange={(v) => updateGrid({ size: v })}
                  unit="m"
                />
                <ToggleRow
                  label="Snap to Grid"
                  checked={gridSettings.snapEnabled ?? true}
                  onCheckedChange={(v) => updateGrid({ snapEnabled: v })}
                />
                {gridSettings.snapEnabled && (
                  <SliderRow
                    label="Snap Size"
                    value={gridSettings.snapSize ?? 0.5}
                    min={0.1}
                    max={5}
                    step={0.1}
                    onValueChange={(v) => updateGrid({ snapSize: v })}
                    unit="m"
                  />
                )}
              </div>
            )}

            <ToggleRow
              label="Show Axes"
              checked={viewportSettings.showAxes ?? true}
              onCheckedChange={(v) => updateViewport({ showAxes: v })}
            />
            <ToggleRow
              label="Show Gizmo"
              checked={viewportSettings.showGizmo ?? true}
              onCheckedChange={(v) => updateViewport({ showGizmo: v })}
              description="Navigation cube"
            />
            <ToggleRow
              label="Shadows"
              checked={viewportSettings.shadows ?? true}
              onCheckedChange={(v) => updateViewport({ shadows: v })}
            />
            <ToggleRow
              label="Ambient Occlusion"
              checked={viewportSettings.ambientOcclusion ?? false}
              onCheckedChange={(v) => updateViewport({ ambientOcclusion: v })}
              description={
                viewportSettings.enablePostProcessing
                  ? "Soft contact shadows (SSAO)"
                  : "Requires PBR Textures enabled"
              }
              disabled={!viewportSettings.enablePostProcessing}
            />
            <ToggleRow
              label="PBR Textures"
              checked={viewportSettings.enablePostProcessing ?? false}
              onCheckedChange={(v) => updateViewport({ enablePostProcessing: v })}
              description="If disabled, only material color is shown"
            />
          </div>
        </Section>

        <Separator className="my-1" />

        {/* Post-Processing Section - Removed as per user request (moved to bottom toolbar) */}

        {/* Snapping Section */}
        <Section title="Snapping" icon={Magnet01Icon}>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Snap Mode</Label>
              <Select
                value={snapMode ?? "grid"}
                onValueChange={(v) => setSnapMode(v as typeof snapMode)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    None
                  </SelectItem>
                  <SelectItem value="grid" className="text-xs">
                    Grid
                  </SelectItem>
                  <SelectItem value="vertex" className="text-xs">
                    Vertex
                  </SelectItem>
                  <SelectItem value="edge" className="text-xs">
                    Edge
                  </SelectItem>
                  <SelectItem value="face" className="text-xs">
                    Face
                  </SelectItem>
                  <SelectItem value="center" className="text-xs">
                    Center
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        <Separator className="my-1" />

        {/* Work Planes Section */}
        <Section title="Work Planes" icon={Layers01Icon} defaultOpen={false}>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-2 border-border/40 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500"
              >
                <div className="size-2 rounded-full bg-red-500" />
                XY
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-2 border-border/40 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500"
              >
                <div className="size-2 rounded-full bg-green-500" />
                YZ
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-2 border-border/40 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500"
              >
                <div className="size-2 rounded-full bg-blue-500" />
                XZ
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Select the active construction plane
            </p>
          </div>
        </Section>
      </div>
    </div>
  )
}

export default ViewportSettingsPanel
