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
  onValueChange: (value: string) => void
  onApply: () => void
  onCancel: () => void
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
  onValueChange,
  onApply,
  onCancel,
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
          className="absolute bottom-3 left-[280px] w-[280px] rounded-lg bg-background/95 backdrop-blur-md border border-border/40 shadow-2xl pointer-events-auto z-[100] overflow-hidden"
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
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
                  {/* Description */}
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{description}</p>

                  {/* Slider + Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-medium text-foreground/90">{label}</Label>
                      <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleKeyDown}
                        className="w-16 h-6 px-2 text-[11px] text-right bg-muted/30 border border-border/40 rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
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

                    <div className="flex justify-between text-[9px] text-muted-foreground/60">
                      <span>{min}</span>
                      <span>{max}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancel}
                      className="flex-1 h-7 text-[10px]"
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={onApply} className="flex-1 h-7 text-[10px]">
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
