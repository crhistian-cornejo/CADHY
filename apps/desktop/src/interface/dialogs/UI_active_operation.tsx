/**
 * Active Operation Dialog - CADHY
 *
 * Floating dialog for active CAD operations, inspired by Plasticity.
 * Shows operation parameters with real-time preview.
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
  Separator,
} from "@cadhy/ui"
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
  type?: "number" | "text" | "select" | "radio"
  options?: { value: string | number; label: string }[]
}

export interface ActiveOperationDialogProps {
  open: boolean
  operation: OperationType
  title: string
  status?: string
  statusType?: "info" | "warning" | "error" | "success"
  parameters: OperationParameter[]
  growMode?: GrowMode
  showGrowMode?: boolean
  onParameterChange?: (id: string, value: number | string) => void
  onGrowModeChange?: (mode: GrowMode) => void
  onConfirm?: () => void
  onCancel?: () => void
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

  if (param.type === "radio") {
    return (
      <div className="space-y-1.5 pt-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {param.label}
        </Label>
        <RadioGroup
          value={param.value.toString()}
          onValueChange={(v) =>
            onChange(param.id === "continuity" ? parseInt(v as string) : (v as string))
          }
          className="flex gap-1"
        >
          {param.options?.map((opt) => (
            <div key={opt.value} className="flex-1">
              <RadioGroupItem
                value={opt.value.toString()}
                id={`${param.id}-${opt.value}`}
                className="sr-only"
              />
              <Label
                htmlFor={`${param.id}-${opt.value}`}
                className={cn(
                  "flex items-center justify-center h-6 text-[10px] rounded-2xl cursor-pointer transition-colors border",
                  param.value.toString() === opt.value.toString()
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/50"
                )}
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    )
  }

  if (param.type === "select") {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[80px]">{param.label}</Label>
        <Select value={param.value.toString()} onValueChange={(v) => onChange(v as string)}>
          <SelectTrigger className="h-7 text-xs bg-muted/30 border-border/40 rounded-2xl flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/40 bg-background/95 backdrop-blur-md">
            {param.options?.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value.toString()}
                className="text-xs rounded-xl"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
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
