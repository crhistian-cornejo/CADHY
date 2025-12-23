/**
 * Floating CAD Operations Panel - CADHY
 *
 * A Plasticity-inspired floating panel for CAD operations (Fillet, Chamfer, Shell).
 * Appears in the bottom-left corner when an operation is active.
 */

import { Button, cn, Label, Slider } from "@cadhy/ui"
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
  onValueChange: (value: string) => void
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
  onValueChange,
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
      const newValue = values[0].toFixed(2)
      setInputValue(newValue)
      onValueChange(newValue)
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
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-600 dark:text-blue-400">
                      <div className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground/90">{label}</Label>
                        <input
                          type="text"
                          value={inputValue}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          onKeyDown={handleKeyDown}
                          className="w-16 h-6 px-2 text-xs text-right bg-muted/30 border border-border/40 rounded-2xl focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="0.00"
                        />
                      </div>

                      <Slider
                        value={[numValue]}
                        onValueChange={handleSliderChange}
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
