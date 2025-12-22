/**
 * useGizmoDrag Hook
 *
 * React hook for handling drag interactions in React Three Fiber gizmos.
 * Provides pointer tracking, coordinate conversion, and gesture handling.
 *
 * @example
 * ```tsx
 * const { isDragging, bind } = useGizmoDrag({
 *   onDragStart: () => gizmoState.start(),
 *   onDrag: (movement) => {
 *     const newValue = calculateValue(movement);
 *     gizmoState.setValue(newValue);
 *   },
 *   onDragEnd: (committed) => {
 *     if (committed) gizmoState.commit();
 *     else gizmoState.revert();
 *   },
 * });
 *
 * return <mesh {...bind}>...</mesh>;
 * ```
 */

import type { ThreeEvent } from "@react-three/fiber"
import { useThree } from "@react-three/fiber"
import { useCallback, useRef, useState } from "react"
import * as THREE from "three"

import type { GizmoMovementInfo } from "../types"

// ============================================================================
// Types
// ============================================================================

export interface UseGizmoDragOptions {
  /** Whether drag is enabled */
  enabled?: boolean
  /** Callback when drag starts */
  onDragStart?: (movement: GizmoMovementInfo) => void
  /** Callback during drag movement */
  onDrag?: (movement: GizmoMovementInfo) => void
  /** Callback when drag ends (true = committed, false = cancelled) */
  onDragEnd?: (committed: boolean, movement: GizmoMovementInfo) => void
  /** Plane for constraining movement in world space */
  constraintPlane?: THREE.Plane
  /** Axis for constraining movement (overrides plane) */
  constraintAxis?: THREE.Vector3
  /** Origin for constraints */
  constraintOrigin?: THREE.Vector3
}

export interface UseGizmoDragReturn {
  /** Whether currently dragging */
  isDragging: boolean
  /** Current movement info (null when not dragging) */
  movement: GizmoMovementInfo | null
  /** Bind props for the draggable mesh */
  bind: {
    onPointerDown: (event: ThreeEvent<PointerEvent>) => void
    onPointerMove: (event: ThreeEvent<PointerEvent>) => void
    onPointerUp: (event: ThreeEvent<PointerEvent>) => void
    onPointerCancel: (event: ThreeEvent<PointerEvent>) => void
    onPointerLeave: (event: ThreeEvent<PointerEvent>) => void
  }
  /** Manually cancel the current drag */
  cancel: () => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGizmoDrag(options: UseGizmoDragOptions = {}): UseGizmoDragReturn {
  const {
    enabled = true,
    onDragStart,
    onDrag,
    onDragEnd,
    constraintPlane,
    constraintAxis,
    constraintOrigin,
  } = options

  const { camera, gl, size } = useThree()

  const [isDragging, setIsDragging] = useState(false)
  const [movement, setMovement] = useState<GizmoMovementInfo | null>(null)

  // Refs for tracking drag state
  const startScreenRef = useRef(new THREE.Vector2())
  const startNDCRef = useRef(new THREE.Vector2())
  const startWorldRef = useRef<THREE.Vector3 | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  // Raycaster for world position calculation
  const raycasterRef = useRef(new THREE.Raycaster())

  /**
   * Convert screen coordinates to NDC
   */
  const screenToNDC = useCallback(
    (screenX: number, screenY: number): THREE.Vector2 => {
      const rect = gl.domElement.getBoundingClientRect()
      return new THREE.Vector2(
        ((screenX - rect.left) / rect.width) * 2 - 1,
        -((screenY - rect.top) / rect.height) * 2 + 1
      )
    },
    [gl]
  )

  /**
   * Get world position from NDC using constraint plane or default plane
   */
  const getWorldPosition = useCallback(
    (ndc: THREE.Vector2): THREE.Vector3 | undefined => {
      raycasterRef.current.setFromCamera(ndc, camera)

      // If we have a constraint axis, create a plane perpendicular to view
      if (constraintAxis && constraintOrigin) {
        // Project the ray onto the axis line
        const rayOrigin = raycasterRef.current.ray.origin
        const rayDir = raycasterRef.current.ray.direction

        // Find closest point on axis to ray
        const axisDir = constraintAxis.clone().normalize()
        const w = rayOrigin.clone().sub(constraintOrigin)
        const a = rayDir.dot(rayDir)
        const b = rayDir.dot(axisDir)
        const c = axisDir.dot(axisDir)
        const d = rayDir.dot(w)
        const e = axisDir.dot(w)
        const denom = a * c - b * b

        if (Math.abs(denom) > 0.0001) {
          const t = (b * e - c * d) / denom
          return rayOrigin.clone().add(rayDir.clone().multiplyScalar(t))
        }
      }

      // Use constraint plane if provided
      const plane = constraintPlane ?? new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
      const intersection = new THREE.Vector3()
      const hit = raycasterRef.current.ray.intersectPlane(plane, intersection)

      return hit ? intersection : undefined
    },
    [camera, constraintPlane, constraintAxis, constraintOrigin]
  )

  /**
   * Create movement info from current pointer state
   */
  const createMovementInfo = useCallback(
    (event: ThreeEvent<PointerEvent>): GizmoMovementInfo => {
      const currentScreen = new THREE.Vector2(event.clientX, event.clientY)
      const currentNDC = screenToNDC(event.clientX, event.clientY)
      const currentWorld = getWorldPosition(currentNDC)

      const startWorld = startWorldRef.current ?? undefined
      const deltaWorld =
        startWorld && currentWorld ? currentWorld.clone().sub(startWorld) : undefined

      return {
        startNDC: startNDCRef.current.clone(),
        currentNDC: currentNDC,
        deltaNDC: currentNDC.clone().sub(startNDCRef.current),
        startScreen: startScreenRef.current.clone(),
        currentScreen: currentScreen,
        deltaScreen: currentScreen.clone().sub(startScreenRef.current),
        startWorld: startWorld,
        currentWorld: currentWorld,
        deltaWorld: deltaWorld,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey || event.metaKey,
        altKey: event.altKey,
      }
    },
    [screenToNDC, getWorldPosition]
  )

  /**
   * Handle pointer down - start drag
   */
  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!enabled || isDragging) return

      // Capture this pointer
      event.stopPropagation()
      ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
      pointerIdRef.current = event.pointerId

      // Store start positions
      startScreenRef.current.set(event.clientX, event.clientY)
      startNDCRef.current = screenToNDC(event.clientX, event.clientY)
      startWorldRef.current = getWorldPosition(startNDCRef.current) ?? null

      setIsDragging(true)

      const movementInfo = createMovementInfo(event)
      setMovement(movementInfo)
      onDragStart?.(movementInfo)
    },
    [enabled, isDragging, screenToNDC, getWorldPosition, createMovementInfo, onDragStart]
  )

  /**
   * Handle pointer move - update drag
   */
  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!isDragging || event.pointerId !== pointerIdRef.current) return

      event.stopPropagation()

      const movementInfo = createMovementInfo(event)
      setMovement(movementInfo)
      onDrag?.(movementInfo)
    },
    [isDragging, createMovementInfo, onDrag]
  )

  /**
   * Handle pointer up - end drag (committed)
   */
  const handlePointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!isDragging || event.pointerId !== pointerIdRef.current) return

      event.stopPropagation()
      ;(event.target as HTMLElement).releasePointerCapture?.(event.pointerId)

      const finalMovement = createMovementInfo(event)

      setIsDragging(false)
      setMovement(null)
      pointerIdRef.current = null

      onDragEnd?.(true, finalMovement)
    },
    [isDragging, createMovementInfo, onDragEnd]
  )

  /**
   * Handle pointer cancel/leave - end drag (cancelled)
   */
  const handlePointerCancel = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!isDragging || event.pointerId !== pointerIdRef.current) return

      event.stopPropagation()
      ;(event.target as HTMLElement).releasePointerCapture?.(event.pointerId)

      const finalMovement = createMovementInfo(event)

      setIsDragging(false)
      setMovement(null)
      pointerIdRef.current = null

      onDragEnd?.(false, finalMovement)
    },
    [isDragging, createMovementInfo, onDragEnd]
  )

  /**
   * Manually cancel the drag
   */
  const cancel = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)
    setMovement(null)
    pointerIdRef.current = null

    // Create a synthetic movement info for cancellation
    const movementInfo: GizmoMovementInfo = {
      startNDC: startNDCRef.current.clone(),
      currentNDC: startNDCRef.current.clone(),
      deltaNDC: new THREE.Vector2(0, 0),
      startScreen: startScreenRef.current.clone(),
      currentScreen: startScreenRef.current.clone(),
      deltaScreen: new THREE.Vector2(0, 0),
      startWorld: startWorldRef.current ?? undefined,
      currentWorld: startWorldRef.current ?? undefined,
      deltaWorld: new THREE.Vector3(0, 0, 0),
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
    }

    onDragEnd?.(false, movementInfo)
  }, [isDragging, onDragEnd])

  return {
    isDragging,
    movement,
    bind: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerLeave: handlePointerCancel, // Treat leave as cancel
    },
    cancel,
  }
}
