/**
 * AxisHelper - Renders an axis line with optional arrows
 *
 * Used by gizmos to show constraint directions and measurement lines.
 */

import { Line } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"

export interface AxisHelperProps {
  /** Start point of the axis */
  start: THREE.Vector3 | [number, number, number]

  /** End point of the axis */
  end: THREE.Vector3 | [number, number, number]

  /** Line color */
  color?: string | THREE.Color

  /** Line width */
  lineWidth?: number

  /** Whether to show arrow at start */
  arrowStart?: boolean

  /** Whether to show arrow at end */
  arrowEnd?: boolean

  /** Arrow size as proportion of line length */
  arrowSize?: number

  /** Whether the line is dashed */
  dashed?: boolean

  /** Dash scale for dashed lines */
  dashScale?: number

  /** Dash size for dashed lines */
  dashSize?: number

  /** Gap size for dashed lines */
  gapSize?: number

  /** Whether the helper is visible */
  visible?: boolean

  /** Opacity of the line */
  opacity?: number
}

/**
 * AxisHelper Component
 *
 * Renders a line between two points with optional arrow heads.
 * Useful for showing axes, directions, and constraints.
 *
 * @example
 * ```tsx
 * <AxisHelper
 *   start={[0, 0, 0]}
 *   end={[1, 0, 0]}
 *   color="#ff0000"
 *   arrowEnd
 * />
 * ```
 */
export function AxisHelper({
  start,
  end,
  color = "#ffff00",
  lineWidth = 1,
  arrowStart = false,
  arrowEnd = false,
  arrowSize = 0.1,
  dashed = false,
  dashScale = 1,
  dashSize = 0.1,
  gapSize = 0.05,
  visible = true,
  opacity = 1,
}: AxisHelperProps) {
  // Convert to Vector3 if arrays
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

  // Calculate arrow geometry
  const arrows = useMemo(() => {
    const direction = endVec.clone().sub(startVec)
    const length = direction.length()
    direction.normalize()

    const actualArrowSize = length * arrowSize

    // Get perpendicular vectors for arrow wings
    const up = new THREE.Vector3(0, 1, 0)
    let perp = new THREE.Vector3().crossVectors(direction, up)
    if (perp.length() < 0.001) {
      perp = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(1, 0, 0))
    }
    perp.normalize().multiplyScalar(actualArrowSize * 0.4)

    const result: { start?: THREE.Vector3[][]; end?: THREE.Vector3[][] } = {}

    if (arrowEnd) {
      const arrowTip = endVec.clone()
      const arrowBase = endVec.clone().sub(direction.clone().multiplyScalar(actualArrowSize))
      result.end = [
        [arrowTip, arrowBase.clone().add(perp)],
        [arrowTip, arrowBase.clone().sub(perp)],
      ]
    }

    if (arrowStart) {
      const arrowTip = startVec.clone()
      const arrowBase = startVec.clone().add(direction.clone().multiplyScalar(actualArrowSize))
      result.start = [
        [arrowTip, arrowBase.clone().add(perp)],
        [arrowTip, arrowBase.clone().sub(perp)],
      ]
    }

    return result
  }, [startVec, endVec, arrowStart, arrowEnd, arrowSize])

  // Convert Vector3 to point arrays for Line component
  const mainLinePoints = useMemo(() => {
    return [
      [startVec.x, startVec.y, startVec.z],
      [endVec.x, endVec.y, endVec.z],
    ] as [number, number, number][]
  }, [startVec, endVec])

  if (!visible) {
    return null
  }

  return (
    <group>
      {/* Main line */}
      <Line
        points={mainLinePoints}
        color={color}
        lineWidth={lineWidth}
        dashed={dashed}
        dashScale={dashScale}
        dashSize={dashSize}
        gapSize={gapSize}
        transparent={opacity < 1}
        opacity={opacity}
      />

      {/* Start arrow */}
      {arrows.start?.map((points, i) => (
        <Line
          key={`start-arrow-${i}`}
          points={points.map((p) => [p.x, p.y, p.z] as [number, number, number])}
          color={color}
          lineWidth={lineWidth}
          transparent={opacity < 1}
          opacity={opacity}
        />
      ))}

      {/* End arrow */}
      {arrows.end?.map((points, i) => (
        <Line
          key={`end-arrow-${i}`}
          points={points.map((p) => [p.x, p.y, p.z] as [number, number, number])}
          color={color}
          lineWidth={lineWidth}
          transparent={opacity < 1}
          opacity={opacity}
        />
      ))}
    </group>
  )
}

AxisHelper.displayName = "AxisHelper"
