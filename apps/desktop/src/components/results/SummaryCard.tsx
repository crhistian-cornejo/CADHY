/**
 * SummaryCard - Reusable stat card component
 *
 * Supports dynamic unit display based on global unit system.
 * Use unitType to specify the type of unit (length, velocity, flowRate)
 * and the component will automatically format and display the correct unit.
 */

import { cn } from "@cadhy/ui/lib/utils"
import { useUnits } from "@/hooks/use-units"

type UnitType = "length" | "velocity" | "flowRate" | "area" | "none"

interface SummaryCardProps {
  label: string
  /** Value in internal units (meters, m/s, m³/s) */
  value: string | number
  /** Type of unit for automatic conversion */
  unitType?: UnitType
  /** Custom unit label (overrides unitType) */
  customUnit?: string
  status?: "normal" | "warning" | "danger" | "success"
  className?: string
  /** Decimal precision (default: 3) */
  precision?: number
}

export function SummaryCard({
  label,
  value,
  unitType,
  customUnit,
  status = "normal",
  className,
  precision = 3,
}: SummaryCardProps) {
  const {
    lengthLabel,
    velocityLabel,
    flowRateLabel,
    areaLabel,
    convertLengthToDisplay,
    convertVelocityToDisplay,
    convertFlowRateToDisplay,
    convertAreaToDisplay,
  } = useUnits()

  const statusColors = {
    normal: "text-foreground",
    warning: "text-amber-500",
    danger: "text-red-500",
    success: "text-emerald-500",
  }

  // Get unit label and convert value based on unitType
  let displayValue: string | number = value
  let unitLabel = customUnit

  if (typeof value === "number" && unitType && unitType !== "none") {
    switch (unitType) {
      case "length":
        displayValue = convertLengthToDisplay(value)
        unitLabel = unitLabel ?? lengthLabel
        break
      case "velocity":
        displayValue = convertVelocityToDisplay(value)
        unitLabel = unitLabel ?? velocityLabel
        break
      case "flowRate":
        displayValue = convertFlowRateToDisplay(value)
        unitLabel = unitLabel ?? flowRateLabel
        break
      case "area":
        displayValue = convertAreaToDisplay(value)
        unitLabel = unitLabel ?? areaLabel
        break
    }
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3", className)}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("text-lg font-mono font-semibold mt-0.5", statusColors[status])}>
        {typeof displayValue === "number" ? displayValue.toFixed(precision) : displayValue}
        {unitLabel && <span className="text-xs text-muted-foreground ml-1">{unitLabel}</span>}
      </p>
    </div>
  )
}
