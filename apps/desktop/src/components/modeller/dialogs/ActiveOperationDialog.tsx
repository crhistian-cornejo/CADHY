/**
 * Active Operation Dialog - CADHY
 *
 * Floating dialog for active CAD operations, inspired by Plasticity.
 * Shows operation parameters with real-time preview.
 *
 * Features:
 * - Floating position (bottom-left of viewport)
 * - Operation name and status
 * - Parameter inputs with keyboard shortcuts
 * - Grow mode selector
 * - OK/Cancel actions with Esc/Enter hints
 */

import { Button, cn, Input, Label, RadioGroup, RadioGroupItem, Separator } from "@cadhy/ui"
import {
  AlertCircleIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"

// ============================================================================
// TYPES
// ============================================================================

export type OperationType =
  | "push-face"
  | "extrude"
  | "fillet"
  | "chamfer"
  | "shell"
  | "offset"
  | "boolean"
  | "move"
  | "rotate"
  | "scale"

export type GrowMode = "moving" | "fixed" | "none"

export interface OperationParameter {
  id: string
  label: string
  value: number | string
  unit?: string
  shortcut?: string
  min?: number
  max?: number
  step?: number
  type?: "number" | "text"
}

export interface ActiveOperationDialogProps {
  /** Whether the dialog is visible */
  open: boolean
  /** Operation type (determines icon and behavior) */
  operation: OperationType
  /** Operation display name */
  title: string
  /** Current status message */
  status?: string
  /** Status type for styling */
  statusType?: "info" | "warning" | "error" | "success"
  /** Operation parameters */
  parameters: OperationParameter[]
  /** Current grow mode */
  growMode?: GrowMode
  /** Whether grow mode selector is shown */
  showGrowMode?: boolean
  /** Called when a parameter value changes */
  onParameterChange?: (id: string, value: number | string) => void
  /** Called when grow mode changes */
  onGrowModeChange?: (mode: GrowMode) => void
  /** Called when OK is clicked or Enter is pressed */
  onConfirm?: () => void
  /** Called when Cancel is clicked or Escape is pressed */
  onCancel?: () => void
  /** Additional class name */
  className?: string
}

// ============================================================================
// STATUS INDICATOR
// ============================================================================

function StatusIndicator({
  message,
  type = "info",
}: {
  message: string
  type?: "info" | "warning" | "error" | "success"
}) {
  const icons = {
    info: InformationCircleIcon,
    warning: AlertCircleIcon,
    error: Cancel01Icon,
    success: CheckmarkCircle01Icon,
  }

  const colors = {
    info: "text-blue-500",
    warning: "text-amber-500",
    error: "text-red-500",
    success: "text-green-500",
  }

  const Icon = icons[type]

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-2xl">
      <HugeiconsIcon icon={Icon} className={cn("size-4", colors[type])} />
      <span className="text-xs text-muted-foreground">{message}</span>
    </div>
  )
}

// ============================================================================
// PARAMETER INPUT
// ============================================================================

interface ParameterInputProps {
  param: OperationParameter
  onChange: (value: number | string) => void
}

function ParameterInput({ param, onChange }: ParameterInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (param.type === "number") {
      const value = parseFloat(e.target.value)
      if (!Number.isNaN(value)) {
        onChange(value)
      }
    } else {
      onChange(e.target.value)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 min-w-[80px]">
        {param.shortcut && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-2xl">
            {param.shortcut}
          </span>
        )}
        <Label className="text-xs text-muted-foreground">{param.label}</Label>
      </div>
      <div className="flex items-center gap-1 flex-1">
        <Input
          type={param.type === "number" ? "number" : "text"}
          value={param.value}
          onChange={handleChange}
          min={param.min}
          max={param.max}
          step={param.step ?? 0.01}
          className="h-7 text-xs text-center"
        />
        {param.unit && <span className="text-xs text-muted-foreground w-6">{param.unit}</span>}
      </div>
    </div>
  )
}

// ============================================================================
// GROW MODE SELECTOR
// ============================================================================

interface GrowModeSelectorProps {
  value: GrowMode
  onChange: (mode: GrowMode) => void
}

function GrowModeSelector({ value, onChange }: GrowModeSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {t("operation.growMode", "Grow mode")}
        <HugeiconsIcon icon={InformationCircleIcon} className="size-3" />
      </Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as GrowMode)}
        className="flex gap-1"
      >
        {(["moving", "fixed", "none"] as GrowMode[]).map((mode) => (
          <div key={mode} className="flex items-center">
            <RadioGroupItem value={mode} id={`grow-${mode}`} className="sr-only" />
            <Label
              htmlFor={`grow-${mode}`}
              className={cn(
                "px-3 py-1.5 text-xs rounded-2xl cursor-pointer transition-colors border",
                value === mode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/50"
              )}
            >
              {t(`operation.growMode.${mode}`, mode.charAt(0).toUpperCase() + mode.slice(1))}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActiveOperationDialog({
  open,
  operation,
  title,
  status,
  statusType = "info",
  parameters,
  growMode = "moving",
  showGrowMode = true,
  onParameterChange,
  onGrowModeChange,
  onConfirm,
  onCancel,
  className,
}: ActiveOperationDialogProps) {
  const { t } = useTranslation()

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onCancel?.()
      } else if (e.key === "Enter") {
        e.preventDefault()
        onConfirm?.()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onConfirm, onCancel])

  const handleParameterChange = useCallback(
    (id: string, value: number | string) => {
      onParameterChange?.(id, value)
    },
    [onParameterChange]
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute bottom-4 left-16 w-72 rounded-2xl bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl overflow-hidden z-50",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                className="size-4 text-muted-foreground"
              />
              <span className="text-sm font-medium uppercase tracking-wider">{title}</span>
            </div>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={onCancel}>
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
            </Button>
          </div>

          {/* Status (if any) */}
          {status && (
            <div className="px-4 pt-3">
              <StatusIndicator message={status} type={statusType} />
            </div>
          )}

          {/* Parameters */}
          <div className="px-4 py-3 space-y-3">
            {parameters.map((param) => (
              <ParameterInput
                key={param.id}
                param={param}
                onChange={(value) => handleParameterChange(param.id, value)}
              />
            ))}

            {showGrowMode && (
              <>
                <Separator className="my-2" />
                <GrowModeSelector value={growMode} onChange={onGrowModeChange ?? (() => {})} />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-muted/20">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="px-1.5 py-0.5 bg-muted rounded-2xl text-xs">Esc</span>
              <span>{t("operation.cancel", "Cancel")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>
                {t("operation.cancel", "Cancel")}
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={onConfirm}>
                {t("operation.ok", "OK")}
                <span className="text-xs opacity-70">↵</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ActiveOperationDialog
