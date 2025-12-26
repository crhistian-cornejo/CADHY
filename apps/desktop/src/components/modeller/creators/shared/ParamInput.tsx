/**
 * ParamInput - Shared Component - CADHY
 *
 * Reusable parameter input component for creator forms.
 * Handles unit conversion and consistent styling across all creators.
 */

import { Label, NumberInput } from "@cadhy/ui"
import { useUnits } from "@/hooks/use-units"

// ============================================================================
// TYPES
// ============================================================================

export type UnitType = "length" | "none"

export interface ParamInputProps {
  /** Label to display */
  label: string
  /** Value in internal units (meters for length) */
  value: number
  /** Callback receives value in internal units */
  onChange: (v: number) => void
  /** Minimum value allowed */
  min?: number
  /** Maximum value allowed */
  max?: number
  /** Step increment for the input */
  step?: number
  /** Type of unit: 'length' for length params, 'none' for raw values */
  unitType?: UnitType
  /** Override unit label (for custom units like H:V, m/m, m³/s) */
  customUnit?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Custom label width class */
  labelWidth?: string
  /** Custom input height class */
  inputHeight?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ParamInput({
  label,
  value,
  onChange,
  min = 0.01,
  max,
  step = 0.1,
  unitType,
  customUnit,
  disabled = false,
  labelWidth = "w-20",
  inputHeight = "h-7",
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
      <Label className={`${labelWidth} text-xs text-muted-foreground shrink-0`}>{label}</Label>
      <div className="flex-1 flex items-center gap-1">
        <NumberInput
          value={Number(displayValue.toFixed(4))}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          className={`${inputHeight} text-xs`}
          disabled={disabled}
        />
        {unitLabel && <span className="text-xs text-muted-foreground w-6">{unitLabel}</span>}
      </div>
    </div>
  )
}

export default ParamInput
