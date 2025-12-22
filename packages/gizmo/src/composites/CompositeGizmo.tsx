/**
 * CompositeGizmo - Container for grouping multiple gizmos
 *
 * Provides:
 * - Shared positioning and rotation for all child gizmos
 * - Unified disabled/visible state
 * - Context for managing which child is active
 */

import * as React from "react"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type * as THREE from "three"

import type { CompositeGizmoProps } from "../types"

// ============================================================================
// Composite Gizmo Context
// ============================================================================

export interface CompositeGizmoContextValue {
  /** The currently active child gizmo key (only one can be active at a time) */
  activeChildKey: string | null

  /** Set the active child gizmo */
  setActiveChild: (key: string | null) => void

  /** Whether the composite gizmo is disabled */
  isDisabled: boolean

  /** Whether the composite gizmo is visible */
  isVisible: boolean
}

const CompositeGizmoContext = createContext<CompositeGizmoContextValue | null>(null)

/**
 * Hook to access composite gizmo context from child gizmos
 */
export function useCompositeGizmoContext(): CompositeGizmoContextValue | null {
  return useContext(CompositeGizmoContext)
}

/**
 * Hook for child gizmos to register with their parent composite
 *
 * @param key - Unique key for this child gizmo
 * @returns Object with isActive state and setActive function
 */
export function useCompositeChild(key: string): {
  isActive: boolean
  setActive: (active: boolean) => void
  canActivate: boolean
} {
  const context = useCompositeGizmoContext()

  const isActive = context?.activeChildKey === key
  const canActivate = context ? !context.isDisabled && context.isVisible : true

  const setActive = useCallback(
    (active: boolean) => {
      if (!context) return
      context.setActiveChild(active ? key : null)
    },
    [context, key]
  )

  return { isActive, setActive, canActivate }
}

// ============================================================================
// Composite Gizmo Component
// ============================================================================

/**
 * CompositeGizmo - Groups multiple gizmos together
 *
 * Use this to create complex gizmo tools that combine multiple
 * primitive gizmos (e.g., a box gizmo with width, height, depth handles).
 *
 * Features:
 * - Shared position/rotation for all children
 * - Only one child can be active at a time
 * - Unified disabled/visible state propagation
 *
 * @example
 * ```tsx
 * <CompositeGizmo position={[0, 0, 0]}>
 *   <DistanceGizmo
 *     origin={[0, 0, 0]}
 *     direction={[1, 0, 0]}
 *     value={width}
 *     onChange={setWidth}
 *   />
 *   <DistanceGizmo
 *     origin={[0, 0, 0]}
 *     direction={[0, 1, 0]}
 *     value={height}
 *     onChange={setHeight}
 *   />
 *   <DistanceGizmo
 *     origin={[0, 0, 0]}
 *     direction={[0, 0, 1]}
 *     value={depth}
 *     onChange={setDepth}
 *   />
 * </CompositeGizmo>
 * ```
 */
export function CompositeGizmo({
  children,
  position,
  rotation,
  disabled = false,
  visible = true,
}: CompositeGizmoProps) {
  const [activeChildKey, setActiveChildKey] = useState<string | null>(null)

  // Clear active child when disabled
  const setActiveChild = useCallback(
    (key: string | null) => {
      if (disabled) return
      setActiveChildKey(key)
    },
    [disabled]
  )

  // Reset active child when disabled changes
  React.useEffect(() => {
    if (disabled) {
      setActiveChildKey(null)
    }
  }, [disabled])

  // Context value
  const contextValue = useMemo(
    (): CompositeGizmoContextValue => ({
      activeChildKey,
      setActiveChild,
      isDisabled: disabled,
      isVisible: visible,
    }),
    [activeChildKey, setActiveChild, disabled, visible]
  )

  // Convert position to array if needed
  const positionArray = useMemo((): [number, number, number] | undefined => {
    if (!position) return undefined
    if (Array.isArray(position)) return position as [number, number, number]
    // THREE.Vector3
    const vec = position as THREE.Vector3
    return [vec.x, vec.y, vec.z]
  }, [position])

  // Convert rotation to array if needed
  const rotationArray = useMemo((): [number, number, number] | undefined => {
    if (!rotation) return undefined
    if (Array.isArray(rotation)) return rotation as [number, number, number]
    // THREE.Euler
    const euler = rotation as THREE.Euler
    return [euler.x, euler.y, euler.z]
  }, [rotation])

  if (!visible) {
    return null
  }

  return (
    <CompositeGizmoContext.Provider value={contextValue}>
      <group position={positionArray} rotation={rotationArray} visible={visible}>
        {children}
      </group>
    </CompositeGizmoContext.Provider>
  )
}

CompositeGizmo.displayName = "CompositeGizmo"

// ============================================================================
// Pre-built Composite Gizmos
// ============================================================================

/**
 * Props for BoxGizmo
 */
export interface BoxGizmoProps {
  /** Center position of the box */
  position?: [number, number, number] | THREE.Vector3
  /** Current dimensions [width, height, depth] */
  dimensions: [number, number, number]
  /** Callback when dimensions change */
  onChange?: (dimensions: [number, number, number]) => void
  /** Callback when dimensions are committed */
  onCommit?: (dimensions: [number, number, number]) => void
  /** Whether the gizmo is disabled */
  disabled?: boolean
  /** Whether the gizmo is visible */
  visible?: boolean
  /** Minimum dimension value */
  min?: number
  /** Maximum dimension value */
  max?: number
}

/**
 * BoxGizmo - Composite gizmo for editing box dimensions
 *
 * Provides handles on each axis to adjust width, height, and depth.
 *
 * NOTE: This is a placeholder implementation. In actual usage,
 * you would import and use DistanceGizmo components for each axis.
 *
 * @example
 * ```tsx
 * <BoxGizmo
 *   position={[0, 0, 0]}
 *   dimensions={[1, 2, 3]}
 *   onChange={setDimensions}
 *   onCommit={handleCommit}
 * />
 * ```
 */
export function BoxGizmo({
  position,
  dimensions,
  onChange: _onChange,
  onCommit: _onCommit,
  disabled = false,
  visible = true,
  min: _min = 0.001,
  max: _max = Infinity,
}: BoxGizmoProps) {
  // Destructure for documentation purposes
  const [_width, _height, _depth] = dimensions

  // In a real implementation, you would:
  // 1. Import DistanceGizmo from './primitives'
  // 2. Create handlers for each axis
  // 3. Render DistanceGizmo for X, Y, Z axes

  return (
    <CompositeGizmo position={position} disabled={disabled} visible={visible}>
      {/* 
        Placeholder - actual implementation would render DistanceGizmo components:
        
        <DistanceGizmo
          origin={[0, 0, 0]}
          direction={[1, 0, 0]}
          value={width}
          onChange={handleWidthChange}
          onCommit={(v) => handleCommit('x', v)}
          min={min}
          max={max}
          color="#ff4444"
        />
        ... etc for Y and Z axes
      */}
      <group />
    </CompositeGizmo>
  )
}

BoxGizmo.displayName = "BoxGizmo"
