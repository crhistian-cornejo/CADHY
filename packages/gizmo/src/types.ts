/**
 * CADHY Gizmo Types
 *
 * Core types and interfaces for the gizmo system.
 * Based on Plasticity's gizmo architecture adapted for React Three Fiber.
 */

import type { ThreeEvent } from "@react-three/fiber"
import type * as React from "react"
import type * as THREE from "three"

// ============================================================================
// Core Gizmo Types
// ============================================================================

/**
 * Gizmo interaction state
 */
export type GizmoState = "idle" | "hover" | "active" | "disabled"

/**
 * Input mode for gizmo values
 */
export type GizmoInputMode = "pointer" | "keyboard"

/**
 * Axis constraint for gizmo movement
 */
export type GizmoAxis = "x" | "y" | "z" | "xy" | "xz" | "yz" | "xyz"

/**
 * Gizmo visual style
 */
export interface GizmoStyle {
  /** Handle color (idle state) */
  color: string
  /** Handle color (hover state) */
  hoverColor: string
  /** Handle color (active/dragging state) */
  activeColor: string
  /** Handle color (disabled state) */
  disabledColor: string
  /** Handle opacity */
  opacity: number
  /** Handle scale */
  scale: number
}

/**
 * Default gizmo style
 */
export const defaultGizmoStyle: GizmoStyle = {
  color: "#ffcc00",
  hoverColor: "#ffff00",
  activeColor: "#ffffff",
  disabledColor: "#666666",
  opacity: 1,
  scale: 1,
}

// ============================================================================
// Movement & Interaction Info
// ============================================================================

/**
 * Information about pointer movement during gizmo interaction
 */
export interface GizmoMovementInfo {
  /** Start position in normalized device coordinates */
  startNDC: THREE.Vector2
  /** Current position in normalized device coordinates */
  currentNDC: THREE.Vector2
  /** Delta from start in NDC */
  deltaNDC: THREE.Vector2
  /** Start position in screen pixels */
  startScreen: THREE.Vector2
  /** Current position in screen pixels */
  currentScreen: THREE.Vector2
  /** Delta from start in pixels */
  deltaScreen: THREE.Vector2
  /** Start position in world space (if available) */
  startWorld?: THREE.Vector3
  /** Current position in world space (if available) */
  currentWorld?: THREE.Vector3
  /** Delta from start in world space */
  deltaWorld?: THREE.Vector3
  /** Whether shift key is pressed */
  shiftKey: boolean
  /** Whether ctrl/cmd key is pressed */
  ctrlKey: boolean
  /** Whether alt key is pressed */
  altKey: boolean
}

/**
 * Information about a raycast intersection with a gizmo
 */
export interface GizmoIntersection {
  /** The Three.js intersection object */
  intersection: THREE.Intersection
  /** The gizmo component that was hit */
  gizmoId: string
  /** The specific part of the gizmo (e.g., "handle", "axis", "plane") */
  part?: string
}

// ============================================================================
// Gizmo Events
// ============================================================================

/**
 * Base event payload for gizmo interactions
 */
export interface GizmoEventBase {
  /** The gizmo's unique identifier */
  gizmoId: string
  /** Current gizmo state */
  state: GizmoState
  /** The Three.js event */
  event: ThreeEvent<PointerEvent>
}

/**
 * Event fired when a gizmo value changes
 */
export interface GizmoChangeEvent<T> extends GizmoEventBase {
  /** The new value */
  value: T
  /** The previous value */
  previousValue: T
  /** Movement information */
  movement: GizmoMovementInfo
}

/**
 * Event fired when a gizmo interaction starts
 */
export interface GizmoStartEvent<T> extends GizmoEventBase {
  /** The initial value */
  value: T
}

/**
 * Event fired when a gizmo interaction ends
 */
export interface GizmoEndEvent<T> extends GizmoEventBase {
  /** The final value */
  value: T
  /** Whether the interaction was committed (true) or cancelled (false) */
  committed: boolean
}

// ============================================================================
// Gizmo Props
// ============================================================================

/**
 * Base props for all gizmos
 */
export interface GizmoBaseProps<T> {
  /** Unique identifier for the gizmo */
  id?: string
  /** Whether the gizmo is disabled */
  disabled?: boolean
  /** Whether the gizmo is visible */
  visible?: boolean
  /** Position of the gizmo in world space */
  position?: [number, number, number] | THREE.Vector3
  /** Rotation of the gizmo (Euler angles only - use normalizeRotation() to convert Quaternion) */
  rotation?: [number, number, number] | THREE.Euler
  /** Scale of the gizmo */
  scale?: number | [number, number, number]
  /** Visual style overrides */
  style?: Partial<GizmoStyle>
  /** Current value */
  value: T
  /** Callback when value changes during interaction */
  onChange?: (value: T, event: GizmoChangeEvent<T>) => void
  /** Callback when interaction starts */
  onStart?: (value: T, event: GizmoStartEvent<T>) => void
  /** Callback when interaction ends (committed or cancelled) */
  onEnd?: (value: T, event: GizmoEndEvent<T>) => void
  /** Callback when interaction is committed */
  onCommit?: (value: T) => void
  /** Callback when interaction is cancelled */
  onCancel?: (previousValue: T) => void
}

/**
 * Props for magnitude/distance gizmos
 */
export interface MagnitudeGizmoProps extends GizmoBaseProps<number> {
  /** Minimum allowed value */
  min?: number
  /** Maximum allowed value */
  max?: number
  /** Step size for keyboard input */
  step?: number
  /** Direction of the gizmo (normalized) */
  direction?: [number, number, number] | THREE.Vector3
  /** Whether to show the value label */
  showLabel?: boolean
  /** Label format function */
  formatLabel?: (value: number) => string
  /** Unit suffix for the label (e.g., "m", "mm") */
  unit?: string
}

/**
 * Props for distance gizmos (linear distance along an axis)
 */
export interface DistanceGizmoProps {
  /** Origin point of the gizmo */
  origin: [number, number, number] | THREE.Vector3
  /** Direction of the distance (normalized) */
  direction: [number, number, number] | THREE.Vector3
  /** Current distance value */
  value: number
  /** Callback when value changes during drag */
  onChange?: (value: number) => void
  /** Callback when value is committed */
  onCommit?: (value: number) => void
  /** Callback when interaction is cancelled */
  onCancel?: () => void
  /** Minimum allowed value */
  min?: number
  /** Maximum allowed value */
  max?: number
  /** Unit suffix for display */
  unit?: string
  /** Decimal precision for display */
  precision?: number
  /** Handle color */
  color?: string
  /** Handle size */
  handleSize?: number
  /** Whether to show helper line and label */
  showHelper?: boolean
  /** Whether the gizmo is disabled */
  disabled?: boolean
  /** Whether the gizmo is visible */
  visible?: boolean
}

/**
 * Props for angle gizmos
 */
export interface AngleGizmoProps extends GizmoBaseProps<number> {
  /** Minimum angle in radians */
  min?: number
  /** Maximum angle in radians */
  max?: number
  /** Step size in radians for keyboard input */
  step?: number
  /** Radius of the angle arc */
  radius?: number
  /** Plane normal for the angle (default: Z-up) */
  planeNormal?: [number, number, number] | THREE.Vector3
  /** Start direction for 0 degrees (default: X-axis) */
  startDirection?: [number, number, number] | THREE.Vector3
  /** Whether to display in degrees instead of radians */
  displayDegrees?: boolean
  /** Whether to show the arc helper */
  showArc?: boolean
  /** Whether to show the value label */
  showLabel?: boolean
}

/**
 * Props for point/position gizmos
 */
export interface PointGizmoProps extends GizmoBaseProps<THREE.Vector3> {
  /** Axis constraint (defaults to "xyz" - free movement) */
  axis?: GizmoAxis
  /** Snap grid size (0 = no snapping) */
  snapSize?: number
  /** Whether to show axis lines */
  showAxes?: boolean
  /** Whether to show the position label */
  showLabel?: boolean
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Props for number display helper
 */
export interface NumberHelperProps {
  /** The value to display */
  value: number
  /** Position in world space */
  position: [number, number, number] | THREE.Vector3
  /** Format function */
  format?: (value: number) => string
  /** Font size in pixels */
  fontSize?: number
  /** Text color */
  color?: string
  /** Background color */
  backgroundColor?: string
  /** Whether the helper is visible */
  visible?: boolean
}

/**
 * Props for axis line helper
 */
export interface AxisHelperProps {
  /** Start point */
  start: [number, number, number] | THREE.Vector3
  /** End point */
  end: [number, number, number] | THREE.Vector3
  /** Line color */
  color?: string
  /** Line width */
  lineWidth?: number
  /** Whether to show arrow heads */
  showArrows?: boolean
  /** Whether the helper is visible */
  visible?: boolean
  /** Whether to use dashed line */
  dashed?: boolean
}

/**
 * Props for dimension line helper (CAD-style dimension)
 */
export interface DimensionHelperProps {
  /** Start point of the dimension */
  start: [number, number, number] | THREE.Vector3
  /** End point of the dimension */
  end: [number, number, number] | THREE.Vector3
  /** Offset distance for the dimension line */
  offset?: number
  /** The value to display */
  value: number
  /** Format function */
  format?: (value: number) => string
  /** Line color */
  color?: string
  /** Text color */
  textColor?: string
  /** Whether the helper is visible */
  visible?: boolean
}

// ============================================================================
// Composite Gizmo Types
// ============================================================================

/**
 * Configuration for a gizmo within a composite
 */
export interface CompositeGizmoChild<T = unknown> {
  /** Unique key for the child */
  key: string
  /** Type of gizmo */
  type: "distance" | "angle" | "length" | "point"
  /** Props for the gizmo (type-specific) */
  props: T
  /** Whether this child is currently active */
  active?: boolean
}

/**
 * Props for composite gizmo
 */
export interface CompositeGizmoProps {
  /** Child gizmos */
  children: React.ReactNode
  /** Position of the composite gizmo */
  position?: [number, number, number] | THREE.Vector3
  /** Rotation of the composite gizmo */
  rotation?: [number, number, number] | THREE.Euler
  /** Whether the composite gizmo is disabled */
  disabled?: boolean
  /** Whether the composite gizmo is visible */
  visible?: boolean
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Options for useGizmoState hook
 */
export interface UseGizmoStateOptions<T> {
  /** Initial value */
  initialValue: T
  /** Callback when value changes */
  onChange?: (value: T) => void
  /** Callback when value is committed */
  onCommit?: (value: T) => void
  /** Callback when value is reverted */
  onRevert?: (value: T) => void
}

/**
 * Return type for useGizmoState hook
 */
export interface UseGizmoStateReturn<T> {
  /** Current value */
  value: T
  /** Original value (before interaction) */
  originalValue: T
  /** Whether currently interacting */
  isInteracting: boolean
  /** Whether value has changed from original */
  hasChanged: boolean
  /** Set the current value */
  setValue: (value: T) => void
  /** Start interaction */
  start: () => void
  /** Commit the current value */
  commit: () => void
  /** Revert to original value */
  revert: () => void
  /** Reset to a new value */
  reset: (value: T) => void
}

/**
 * Options for useGizmoDrag hook
 */
export interface UseGizmoDragOptions<T> {
  /** Whether dragging is enabled */
  enabled?: boolean
  /** Calculate new value from movement info */
  calculateValue: (movement: GizmoMovementInfo, currentValue: T) => T
  /** Callback when drag starts */
  onStart?: () => void
  /** Callback when drag moves */
  onMove?: (value: T) => void
  /** Callback when drag ends */
  onEnd?: (committed: boolean) => void
}

/**
 * Return type for useGizmoDrag hook
 */
export interface UseGizmoDragReturn {
  /** Whether currently dragging */
  isDragging: boolean
  /** Bind props for the draggable element */
  bind: {
    onPointerDown: (event: ThreeEvent<PointerEvent>) => void
    onPointerMove: (event: ThreeEvent<PointerEvent>) => void
    onPointerUp: (event: ThreeEvent<PointerEvent>) => void
    onPointerCancel: (event: ThreeEvent<PointerEvent>) => void
  }
}
