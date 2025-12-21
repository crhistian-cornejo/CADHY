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
    <div className="flex gap-1">
      <div className="flex-1">
        <div className="flex items-center">
          <span className="text-[10px] text-red-500 mr-1">X</span>
          <NumberInput
            value={value.x}
            onChange={(v) => handleChange("x", v)}
            step={step}
            precision={precision}
            className="h-6 text-[10px] px-1.5"
          />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center">
          <span className="text-[10px] text-green-500 mr-1">Y</span>
          <NumberInput
            value={value.y}
            onChange={(v) => handleChange("y", v)}
            step={step}
            precision={precision}
            className="h-6 text-[10px] px-1.5"
          />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center">
          <span className="text-[10px] text-blue-500 mr-1">Z</span>
          <NumberInput
            value={value.z}
            onChange={(v) => handleChange("z", v)}
            step={step}
            precision={precision}
            className="h-6 text-[10px] px-1.5"
          />
        </div>
      </div>
    </div>
  )
})
