/**
 * Floating CAD Operations Panel - CADHY
 *
 * A Plasticity-inspired floating panel for CAD operations (Fillet, Chamfer, Shell).
 * Appears in the bottom-left corner when an operation is active.
 */

import {
  Button,
  cn,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
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
  InformationCircleIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useState } from "react"

interface FloatingCADOperationsPanelProps {
  open: boolean
  operation: "fillet" | "chamfer" | "shell" | null
  title: string
  description: string
  label: string
  value: string
  min?: number
  max?: number
  step?: number
  interactiveMode?: boolean
  // Advanced parameters
  continuity?: number
  chamferMode?: "constant" | "two-distances" | "distance-angle"
  value2?: string
  angle?: string
  onValueChange: (value: string) => void
  onAdvancedValueChange?: (key: string, value: string | number | boolean) => void
  onApply: () => void
  onCancel: () => void
  onToggleInteractiveMode?: () => void
}

export function FloatingCADOperationsPanel({
  open,
  operation,
  title,
  description,
  label,
  value,
  min = 0.01,
  max = 10,
  step = 0.1,
  interactiveMode = true,
  continuity = 1,
  chamferMode = "constant",
  value2 = "0.5",
  angle = "45",
  onValueChange,
  onAdvancedValueChange,
  onApply,
  onCancel,
  onToggleInteractiveMode,
}: FloatingCADOperationsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  // Sync with prop value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleSliderChange = useCallback(
    (values: number[]) => {
      const val = values[0]
      if (val !== undefined) {
        const newValue = val.toFixed(2)
        setInputValue(newValue)
        onValueChange(newValue)
      }
    },
    [onValueChange]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      // Allow typing decimal point and numbers
      if (val === "" || /^\d*\.?\d*$/.test(val)) {
        setInputValue(val)
        if (val && !Number.isNaN(Number.parseFloat(val))) {
          onValueChange(val)
        }
      }
    },
    [onValueChange]
  )

  const handleInputBlur = useCallback(() => {
    // Ensure valid number on blur
    const num = Number.parseFloat(inputValue)
    if (Number.isNaN(num)) {
      setInputValue(value)
    } else {
      const clamped = Math.max(min, Math.min(max, num))
      const formatted = clamped.toFixed(2)
      setInputValue(formatted)
      onValueChange(formatted)
    }
  }, [inputValue, value, min, max, onValueChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        onApply()
      } else if (e.key === "Escape") {
        e.preventDefault()
        onCancel()
      }
    },
    [onApply, onCancel]
  )

  const numValue = Number.parseFloat(inputValue) || min

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-3 left-3 w-[280px] rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-2xl pointer-events-auto z-[100] overflow-hidden"
        >
          {/* Header */}
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 bg-muted/10 cursor-pointer select-none outline-none focus-visible:bg-muted/20 transition-colors",
              !isCollapsed && "border-b border-border/30"
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setIsCollapsed(!isCollapsed)
              }
            }}
          >
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Settings01Icon} className="size-3 text-primary/80" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
                {title}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                className="size-3.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              />
              <HugeiconsIcon
                icon={isCollapsed ? ArrowRight01Icon : ArrowDown01Icon}
                className="size-3 text-muted-foreground/60 transition-transform"
              />
            </div>
          </button>

          {/* Content */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-3">
                  {/* Mode indicator */}
                  {interactiveMode && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-status-info-bg border border-status-info-border rounded-2xl text-xs text-status-info">
                      <div className="size-1.5 rounded-full bg-status-info animate-pulse" />
                      <span>Interactive Mode: Select an edge in the 3D view</span>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {interactiveMode
                      ? "Click on an edge, then drag the gizmo to adjust the value. Preview updates in real-time."
                      : description}
                  </p>

                  {/* Slider + Input - Only show in manual mode */}
                  {!interactiveMode && (
                    <ManualControls
                      label={label}
                      inputValue={inputValue}
                      min={min}
                      max={max}
                      step={step}
                      numValue={numValue}
                      onInputChange={handleInputChange}
                      onInputBlur={handleInputBlur}
                      onKeyDown={handleKeyDown}
                      onSliderChange={handleSliderChange}
                    />
                  )}

                  {/* Value display in interactive mode */}
                  {interactiveMode && (
                    <div className="flex items-center justify-between px-2 py-1.5 bg-muted/20 rounded-2xl">
                      <span className="text-xs font-medium text-foreground/90">{label}</span>
                      <span className="text-sm font-semibold text-primary tabular-nums">
                        {value} mm
                      </span>
                    </div>
                  )}

                  {/* Advanced Fillet Parameters */}
                  {operation === "fillet" && (
                    <FilletParameters
                      continuity={continuity}
                      onAdvancedValueChange={onAdvancedValueChange}
                    />
                  )}

                  {/* Advanced Chamfer Parameters */}
                  {operation === "chamfer" && (
                    <ChamferParameters
                      chamferMode={chamferMode}
                      value2={value2}
                      angle={angle}
                      onAdvancedValueChange={onAdvancedValueChange}
                    />
                  )}

                  {/* Mode Toggle (optional) */}
                  {onToggleInteractiveMode && (
                    <button
                      type="button"
                      onClick={onToggleInteractiveMode}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/40 rounded-2xl hover:bg-muted/50"
                    >
                      <span>Switch to {interactiveMode ? "Manual" : "Interactive"} Mode</span>
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancel}
                      className="flex-1 h-7 text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={onApply} className="flex-1 h-7 text-xs">
                      Aplicar
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ManualControls({
  label,
  inputValue,
  min,
  max,
  step,
  numValue,
  onInputChange,
  onInputBlur,
  onKeyDown,
  onSliderChange,
}: {
  label: string
  inputValue: string
  min: number
  max: number
  step: number
  numValue: number
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onInputBlur: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onSliderChange: (values: number[]) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-foreground/90">{label}</Label>
        <input
          type="text"
          value={inputValue}
          onChange={onInputChange}
          onBlur={onInputBlur}
          onKeyDown={onKeyDown}
          className="w-16 h-6 px-2 text-xs text-right bg-muted/30 border border-border/40 rounded-2xl focus:outline-none focus:ring-1 focus:ring-primary/50"
          placeholder="0.00"
        />
      </div>

      <Slider
        value={[numValue]}
        onValueChange={onSliderChange}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />

      <div className="flex justify-between text-xs text-muted-foreground/60">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function FilletParameters({
  continuity,
  onAdvancedValueChange,
}: {
  continuity: number
  onAdvancedValueChange?: (key: string, value: string | number | boolean) => void
}) {
  return (
    <div className="space-y-2 border-t border-border/30 pt-2 mt-2">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Continuidad
      </Label>
      <RadioGroup
        value={(continuity ?? 1).toString()}
        onValueChange={(v) => onAdvancedValueChange?.("continuity", parseInt(v as string))}
        className="flex gap-1"
      >
        {[0, 1, 2].map((c) => (
          <div key={c} className="flex-1">
            <RadioGroupItem value={c.toString()} id={`cont-${c}`} className="sr-only" />
            <Label
              htmlFor={`cont-${c}`}
              className={cn(
                "flex items-center justify-center h-6 text-[10px] rounded-2xl cursor-pointer transition-colors border",
                continuity === c
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/50"
              )}
            >
              {c === 0 ? "C0" : c === 1 ? "G1" : "G2"}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

function ChamferParameters({
  chamferMode,
  value2,
  angle,
  onAdvancedValueChange,
}: {
  chamferMode: string
  value2: string
  angle: string
  onAdvancedValueChange?: (key: string, value: string | number | boolean) => void
}) {
  return (
    <div className="space-y-3 border-t border-border/30 pt-2 mt-2">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Modo de Chaflán
        </Label>
        <Select
          value={chamferMode || "constant"}
          onValueChange={(v) => onAdvancedValueChange?.("chamferMode", v as string)}
        >
          <SelectTrigger className="h-7 text-xs bg-muted/30 border-border/40 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/40 bg-background/95 backdrop-blur-md">
            <SelectItem value="constant" className="text-xs rounded-xl">
              Constante
            </SelectItem>
            <SelectItem value="two-distances" className="text-xs rounded-xl">
              Dos Distancias
            </SelectItem>
            <SelectItem value="distance-angle" className="text-xs rounded-xl">
              Distancia y Ángulo
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {chamferMode === "two-distances" && (
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Distancia 2</Label>
          <Input
            type="number"
            value={value2}
            onChange={(e) => onAdvancedValueChange?.("value2", e.target.value)}
            className="w-16 h-6 px-2 text-xs text-right bg-muted/30 border-border/40 rounded-2xl"
          />
        </div>
      )}

      {chamferMode === "distance-angle" && (
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Ángulo (º)</Label>
          <Input
            type="number"
            value={angle}
            onChange={(e) => onAdvancedValueChange?.("angle", e.target.value)}
            className="w-16 h-6 px-2 text-xs text-right bg-muted/30 border-border/40 rounded-2xl"
          />
        </div>
      )}
    </div>
  )
}
