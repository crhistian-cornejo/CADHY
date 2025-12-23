/**
 * VectorInput Component - CADHY
 *
 * 3D Vector input with X/Y/Z number inputs.
 * Used for position, rotation, and scale transforms.
 */

import { NumberInput } from "@cadhy/ui"
import React, { useCallback } from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface VectorInputProps {
  value: Vector3
  onChange: (value: Vector3) => void
  step?: number
  precision?: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export const VectorInput = React.memo(function VectorInput({
  value,
  onChange,
  step = 0.1,
  precision = 2,
}: VectorInputProps) {
  const handleChange = useCallback(
    (axis: "x" | "y" | "z", newValue: number) => {
      onChange({ ...value, [axis]: newValue })
    },
    [value, onChange]
  )

  return (
    <div className="flex gap-1.5">
      <div className="flex-1 flex items-center min-w-0">
        <span className="text-xs font-black text-red-500/90 w-2.5 text-center mr-0.5">X</span>
        <NumberInput
          value={value.x}
          onChange={(v) => handleChange("x", v)}
          step={step}
          precision={precision}
          className="h-6 text-xs px-1 bg-muted/20 border-none hover:bg-muted/40 focus:bg-background/50 transition-colors min-w-0 flex-1 tabular-nums"
        />
      </div>
      <div className="flex-1 flex items-center min-w-0">
        <span className="text-xs font-black text-green-500/90 w-2.5 text-center mr-0.5">Y</span>
        <NumberInput
          value={value.y}
          onChange={(v) => handleChange("y", v)}
          step={step}
          precision={precision}
          className="h-6 text-xs px-1 bg-muted/20 border-none hover:bg-muted/40 focus:bg-background/50 transition-colors min-w-0 flex-1 tabular-nums"
        />
      </div>
      <div className="flex-1 flex items-center min-w-0">
        <span className="text-xs font-black text-blue-500/90 w-2.5 text-center mr-0.5">Z</span>
        <NumberInput
          value={value.z}
          onChange={(v) => handleChange("z", v)}
          step={step}
          precision={precision}
          className="h-6 text-xs px-1 bg-muted/20 border-none hover:bg-muted/40 focus:bg-background/50 transition-colors min-w-0 flex-1 tabular-nums"
        />
      </div>
    </div>
  )
})
