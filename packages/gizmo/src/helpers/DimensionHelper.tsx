/**
 * DimensionHelper - CAD-style dimension line with value label
 *
 * Renders a dimension annotation between two points, similar to
 * technical drawing dimension lines.
 */

import { useMemo } from "react"
import * as THREE from "three"

import { AxisHelper } from "./AxisHelper"
import { NumberHelper } from "./NumberHelper"

export interface DimensionHelperProps {
  /** Start point of the dimension */
  start: THREE.Vector3 | [number, number, number]

  /** End point of the dimension */
  end: THREE.Vector3 | [number, number, number]

  /** Offset distance for extension lines (perpendicular to dimension) */
  offset?: number

  /** The value to display (if not provided, calculates distance) */
  value?: number

  /** Unit suffix for the value */
  unit?: string

  /** Number of decimal places */
  precision?: number

  /** Line color */
  color?: string

  /** Line width */
  lineWidth?: number

  /** Whether the helper is visible */
  visible?: boolean

  /** Whether to show extension lines */
  showExtensions?: boolean

  /** Extension line overshoot beyond dimension line */
  extensionOvershoot?: number
}

/**
 * DimensionHelper Component
 *
 * Renders a complete CAD-style dimension annotation with:
 * - Main dimension line with arrows
 * - Optional extension lines
 * - Centered value label
 *
 * @example
 * ```tsx
 * <DimensionHelper
 *   start={[0, 0, 0]}
 *   end={[2, 0, 0]}
 *   offset={0.5}
 *   unit="m"
 * />
 * ```
 */
export function DimensionHelper({
  start,
  end,
  offset = 0.3,
  value,
  unit = "",
  precision = 2,
  color = "#00ffff",
  lineWidth = 1,
  visible = true,
  showExtensions = true,
  extensionOvershoot = 0.1,
}: DimensionHelperProps) {
  // Convert to Vector3
  const startVec = useMemo(() => {
    if (Array.isArray(start)) {
      return new THREE.Vector3(...start)
    }
    return start.clone()
  }, [start])

  const endVec = useMemo(() => {
    if (Array.isArray(end)) {
      return new THREE.Vector3(...end)
    }
    return end.clone()
  }, [end])

  // Calculate dimension geometry
  const geometry = useMemo(() => {
    const direction = endVec.clone().sub(startVec)
    const length = direction.length()
    direction.normalize()

    // Calculate perpendicular direction for offset
    // Try to use world up, fall back to another axis if parallel
    const perpendicular = new THREE.Vector3()
    const worldUp = new THREE.Vector3(0, 1, 0)

    if (Math.abs(direction.dot(worldUp)) > 0.99) {
      // Direction is nearly vertical, use X axis
      perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0))
    } else {
      perpendicular.crossVectors(direction, worldUp)
    }
    perpendicular.normalize()

    // Offset points for dimension line
    const offsetVec = perpendicular.clone().multiplyScalar(offset)
    const dimStart = startVec.clone().add(offsetVec)
    const dimEnd = endVec.clone().add(offsetVec)

    // Center point for label
    const center = dimStart.clone().add(dimEnd).multiplyScalar(0.5)

    // Extension line points
    const extStartBottom = startVec.clone()
    const extStartTop = dimStart
      .clone()
      .add(perpendicular.clone().multiplyScalar(extensionOvershoot))
    const extEndBottom = endVec.clone()
    const extEndTop = dimEnd.clone().add(perpendicular.clone().multiplyScalar(extensionOvershoot))

    return {
      dimStart,
      dimEnd,
      center,
      length,
      extStartBottom,
      extStartTop,
      extEndBottom,
      extEndTop,
    }
  }, [startVec, endVec, offset, extensionOvershoot])

  // Calculate or use provided value
  const displayValue = value ?? geometry.length

  if (!visible) {
    return null
  }

  return (
    <group>
      {/* Main dimension line with arrows */}
      <AxisHelper
        start={geometry.dimStart}
        end={geometry.dimEnd}
        color={color}
        lineWidth={lineWidth}
        arrowStart
        arrowEnd
        arrowSize={0.08}
      />

      {/* Extension lines */}
      {showExtensions && (
        <>
          <AxisHelper
            start={geometry.extStartBottom}
            end={geometry.extStartTop}
            color={color}
            lineWidth={lineWidth * 0.5}
          />
          <AxisHelper
            start={geometry.extEndBottom}
            end={geometry.extEndTop}
            color={color}
            lineWidth={lineWidth * 0.5}
          />
        </>
      )}

      {/* Value label */}
      <NumberHelper
        value={displayValue}
        position={geometry.center}
        unit={unit}
        precision={precision}
        backgroundColor="rgba(0, 40, 60, 0.9)"
        textColor={color}
      />
    </group>
  )
}

DimensionHelper.displayName = "DimensionHelper"
