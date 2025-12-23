/**
 * NumberHelper - Displays a numeric value in 3D space
 *
 * Used by gizmos to show current values during interaction.
 * Automatically faces the camera (billboard behavior).
 */

import { Html } from "@react-three/drei"
import { useMemo } from "react"
import type * as THREE from "three"

export interface NumberHelperProps {
  /** The numeric value to display */
  value: number

  /** Position in 3D space */
  position: THREE.Vector3 | [number, number, number]

  /** Unit suffix (e.g., "m", "°", "mm") */
  unit?: string

  /** Number of decimal places */
  precision?: number

  /** Whether the helper is currently active/visible */
  visible?: boolean

  /** Custom className for styling */
  className?: string

  /** Background color */
  backgroundColor?: string

  /** Text color */
  textColor?: string

  /** Font size in pixels */
  fontSize?: number
}

/**
 * NumberHelper Component
 *
 * Renders a floating number label in 3D space using HTML overlay.
 * Used by gizmos to show measurements during drag operations.
 *
 * @example
 * ```tsx
 * <NumberHelper
 *   value={2.5}
 *   position={[1, 0, 0]}
 *   unit="m"
 *   precision={2}
 * />
 * ```
 */
export function NumberHelper({
  value,
  position,
  unit = "",
  precision = 3,
  visible = true,
  className,
  backgroundColor = "rgba(0, 0, 0, 0.8)",
  textColor = "#ffffff",
  fontSize = 12,
}: NumberHelperProps) {
  // Format the value with precision
  const formattedValue = useMemo(() => {
    const formatted = value.toFixed(precision)
    // Remove trailing zeros after decimal
    const trimmed = formatted.replace(/\.?0+$/, "")
    return unit ? `${trimmed} ${unit}` : trimmed
  }, [value, precision, unit])

  // Convert position to array if needed
  const positionArray = useMemo(() => {
    if (Array.isArray(position)) {
      return position
    }
    return [position.x, position.y, position.z] as [number, number, number]
  }, [position])

  if (!visible) {
    return null
  }

  return (
    <Html
      position={positionArray}
      center
      sprite
      distanceFactor={10}
      style={{
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div
        className={className}
        style={{
          backgroundColor,
          color: textColor,
          fontSize: `${fontSize}px`,
          fontFamily: "monospace",
          fontWeight: 500,
          padding: "2px 6px",
          borderRadius: "16px",
          whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
        }}
      >
        {formattedValue}
      </div>
    </Html>
  )
}

NumberHelper.displayName = "NumberHelper"
