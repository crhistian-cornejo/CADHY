/**
 * AbstractGizmo - Base component for all gizmos
 *
 * Provides common functionality:
 * - Hover detection with visual feedback
 * - Active state during interaction
 * - Disabled state
 * - Common materials and colors
 */

import type { ThreeEvent } from "@react-three/fiber"
import type * as React from "react"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type * as THREE from "three"

import type { GizmoState } from "../types"

// ============================================================================
// Gizmo Context
// ============================================================================

export interface GizmoContextValue {
  /** Current gizmo state */
  state: GizmoState

  /** Whether the gizmo is currently hovered */
  isHovered: boolean

  /** Whether the gizmo is currently active (being dragged) */
  isActive: boolean

  /** Whether the gizmo is disabled */
  isDisabled: boolean

  /** Set hover state */
  setHovered: (hovered: boolean) => void

  /** Set active state */
  setActive: (active: boolean) => void
}

const GizmoContext = createContext<GizmoContextValue | null>(null)

/**
 * Hook to access gizmo context from child components
 */
export function useGizmoContext(): GizmoContextValue {
  const context = useContext(GizmoContext)
  if (!context) {
    throw new Error("useGizmoContext must be used within an AbstractGizmo")
  }
  return context
}

// ============================================================================
// Gizmo Colors
// ============================================================================

export const GizmoColors = {
  // Axis colors
  x: "#ff4444",
  y: "#44ff44",
  z: "#4444ff",

  // State colors
  idle: "#ffff00",
  hover: "#ffffff",
  active: "#00ffff",
  disabled: "#666666",

  // Helper colors
  dimension: "#00ffff",
  constraint: "#ff00ff",
  snap: "#00ff00",
} as const

/**
 * Get the appropriate color based on gizmo state
 */
export function getGizmoColor(state: GizmoState, baseColor: string = GizmoColors.idle): string {
  switch (state) {
    case "active":
      return GizmoColors.active
    case "hover":
      return GizmoColors.hover
    case "disabled":
      return GizmoColors.disabled
    default:
      return baseColor
  }
}

// ============================================================================
// Abstract Gizmo Props
// ============================================================================

export interface AbstractGizmoProps {
  /** Children to render inside the gizmo group */
  children?: React.ReactNode

  /** Whether the gizmo is disabled */
  disabled?: boolean

  /** Position of the gizmo */
  position?: THREE.Vector3 | [number, number, number]

  /** Rotation of the gizmo */
  rotation?: THREE.Euler | [number, number, number]

  /** Scale of the gizmo */
  scale?: THREE.Vector3 | [number, number, number] | number

  /** Callback when gizmo is hovered */
  onHover?: (hovered: boolean) => void

  /** Callback when gizmo active state changes */
  onActiveChange?: (active: boolean) => void

  /** Whether to render the gizmo (visibility) */
  visible?: boolean

  /** Render order for z-sorting */
  renderOrder?: number
}

// ============================================================================
// Abstract Gizmo Component
// ============================================================================

/**
 * AbstractGizmo - Base wrapper for all gizmo components
 *
 * Provides:
 * - State management (idle, hover, active, disabled)
 * - Context for child components
 * - Pointer event handling
 * - Common positioning and visibility
 *
 * @example
 * ```tsx
 * <AbstractGizmo position={[0, 0, 0]} disabled={false}>
 *   <mesh onPointerDown={handleDrag}>
 *     <sphereGeometry args={[0.1]} />
 *     <meshStandardMaterial color={color} />
 *   </mesh>
 * </AbstractGizmo>
 * ```
 */
export function AbstractGizmo({
  children,
  disabled = false,
  position,
  rotation,
  scale,
  onHover,
  onActiveChange,
  visible = true,
  renderOrder = 999,
}: AbstractGizmoProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isActive, setIsActive] = useState(false)

  // Compute current state
  const state = useMemo((): GizmoState => {
    if (disabled) return "disabled"
    if (isActive) return "active"
    if (isHovered) return "hover"
    return "idle"
  }, [disabled, isActive, isHovered])

  // State setters with callbacks
  const setHovered = useCallback(
    (hovered: boolean) => {
      if (disabled) return
      setIsHovered(hovered)
      onHover?.(hovered)
    },
    [disabled, onHover]
  )

  const setActive = useCallback(
    (active: boolean) => {
      if (disabled) return
      setIsActive(active)
      onActiveChange?.(active)
    },
    [disabled, onActiveChange]
  )

  // Pointer event handlers
  const handlePointerEnter = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      setHovered(true)
    },
    [setHovered]
  )

  const handlePointerLeave = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      setHovered(false)
    },
    [setHovered]
  )

  // Context value
  const contextValue = useMemo(
    (): GizmoContextValue => ({
      state,
      isHovered,
      isActive,
      isDisabled: disabled,
      setHovered,
      setActive,
    }),
    [state, isHovered, isActive, disabled, setHovered, setActive]
  )

  if (!visible) {
    return null
  }

  return (
    <GizmoContext.Provider value={contextValue}>
      <group
        position={position}
        rotation={rotation}
        scale={scale}
        renderOrder={renderOrder}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {children}
      </group>
    </GizmoContext.Provider>
  )
}

AbstractGizmo.displayName = "AbstractGizmo"

// ============================================================================
// Gizmo Handle Component
// ============================================================================

export interface GizmoHandleProps {
  /** Geometry type for the handle */
  geometry?: "sphere" | "box" | "cylinder"

  /** Size of the handle */
  size?: number

  /** Base color (will change based on state) */
  color?: string

  /** Whether this handle is the primary interactive element */
  primary?: boolean

  /** Additional props passed to the mesh */
  meshProps?: React.ComponentProps<"mesh">

  /** Children to render instead of default geometry */
  children?: React.ReactNode
}

/**
 * GizmoHandle - A draggable handle within a gizmo
 *
 * Automatically changes appearance based on gizmo state.
 *
 * @example
 * ```tsx
 * <AbstractGizmo>
 *   <GizmoHandle
 *     geometry="sphere"
 *     size={0.1}
 *     color="#ff0000"
 *   />
 * </AbstractGizmo>
 * ```
 */
export function GizmoHandle({
  geometry = "sphere",
  size = 0.1,
  color = GizmoColors.idle,
  primary = true,
  meshProps,
  children,
}: GizmoHandleProps) {
  const { state } = useGizmoContext()

  // Compute color based on state
  const currentColor = useMemo(() => getGizmoColor(state, color), [state, color])

  // Create geometry based on type
  const geometryElement = useMemo(() => {
    switch (geometry) {
      case "box":
        return <boxGeometry args={[size, size, size]} />
      case "cylinder":
        return <cylinderGeometry args={[size / 2, size / 2, size, 16]} />
      default:
        return <sphereGeometry args={[size, 16, 16]} />
    }
  }, [geometry, size])

  // Material with state-based appearance
  const material = useMemo(
    () => (
      <meshStandardMaterial
        color={currentColor}
        emissive={state === "active" ? currentColor : "#000000"}
        emissiveIntensity={state === "active" ? 0.3 : 0}
        transparent={state === "disabled"}
        opacity={state === "disabled" ? 0.5 : 1}
        depthTest={!primary}
      />
    ),
    [currentColor, state, primary]
  )

  if (children) {
    return <mesh {...meshProps}>{children}</mesh>
  }

  return (
    <mesh {...meshProps}>
      {geometryElement}
      {material}
    </mesh>
  )
}

GizmoHandle.displayName = "GizmoHandle"
