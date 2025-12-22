/**
 * DistanceGizmo - Interactive gizmo for measuring/editing distances
 *
 * Allows dragging along an axis to change a distance value.
 * Supports keyboard input for precise values.
 */

import { useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"

import { AbstractGizmo, GizmoColors, GizmoHandle } from "../base/AbstractGizmo"
import { AxisHelper } from "../helpers/AxisHelper"
import { NumberHelper } from "../helpers/NumberHelper"
import { useGizmoDrag } from "../hooks/use-gizmo-drag"
import { useGizmoState } from "../hooks/use-gizmo-state"
import type { DistanceGizmoProps, GizmoMovementInfo } from "../types"

/**
 * DistanceGizmo Component
 *
 * A linear gizmo that allows the user to drag along a direction
 * to change a distance value. Commonly used for extrusion depth,
 * offset distances, etc.
 *
 * Features:
 * - Drag along axis to change value
 * - Shows numeric value during drag
 * - Keyboard input for precise values
 * - Min/max constraints
 * - Visual feedback for state changes
 *
 * @example
 * ```tsx
 * <DistanceGizmo
 *   origin={[0, 0, 0]}
 *   direction={[0, 1, 0]}
 *   value={2.5}
 *   onChange={(v) => console.log('Distance:', v)}
 *   onCommit={(v) => console.log('Committed:', v)}
 *   unit="m"
 * />
 * ```
 */
export function DistanceGizmo({
  origin,
  direction,
  value,
  onChange,
  onCommit,
  onCancel,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  unit = "",
  precision = 3,
  color = GizmoColors.idle,
  handleSize = 0.08,
  showHelper = true,
  disabled = false,
  visible = true,
}: DistanceGizmoProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  // Convert origin and direction to Vector3
  const originVec = useMemo(() => {
    if (Array.isArray(origin)) {
      return new THREE.Vector3(...origin)
    }
    return origin.clone()
  }, [origin])

  const directionVec = useMemo(() => {
    if (Array.isArray(direction)) {
      return new THREE.Vector3(...direction).normalize()
    }
    return direction.clone().normalize()
  }, [direction])

  // State machine for value management
  const {
    value: currentValue,
    isInteracting,
    setValue: setCurrentValue,
    start,
    commit: commitValue,
    revert,
  } = useGizmoState({
    type: "magnitude",
    initialValue: value,
    min,
    max,
  })

  // Track if we're in keyboard input mode
  const [keyboardMode, setKeyboardMode] = useState(false)
  const [keyboardBuffer, setKeyboardBuffer] = useState("")

  // Sync external value changes
  useEffect(() => {
    if (!isInteracting) {
      setCurrentValue(value)
    }
  }, [value, isInteracting, setCurrentValue])

  // Calculate handle position based on current value
  const handlePosition = useMemo(() => {
    return originVec.clone().add(directionVec.clone().multiplyScalar(currentValue))
  }, [originVec, directionVec, currentValue])

  // Drag handlers
  const handleDragStart = useCallback(
    (_movement: GizmoMovementInfo) => {
      start()
      setKeyboardMode(false)
      setKeyboardBuffer("")
    },
    [start]
  )

  const handleDrag = useCallback(
    (movement: GizmoMovementInfo) => {
      if (keyboardMode) return

      // Calculate distance from movement using NDC
      const mouse = movement.currentNDC

      // Create a ray from the camera
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)

      // Project the ray onto the axis line (similar to projectMouseToAxis)
      const rayOrigin = raycaster.ray.origin
      const rayDir = raycaster.ray.direction
      const axisDir = directionVec.clone().normalize()

      // Find closest point on axis to ray
      const w = rayOrigin.clone().sub(originVec)
      const a = rayDir.dot(rayDir)
      const b = rayDir.dot(axisDir)
      const c = axisDir.dot(axisDir)
      const d = rayDir.dot(w)
      const e = axisDir.dot(w)
      const denom = a * c - b * b

      if (Math.abs(denom) < 0.0001) return

      const s = (a * e - b * d) / denom
      const newValue = Math.max(min, Math.min(max, s))

      setCurrentValue(newValue)
      onChange?.(newValue)
    },
    [keyboardMode, camera, originVec, directionVec, min, max, setCurrentValue, onChange]
  )

  const handleDragEnd = useCallback(() => {
    commitValue()
    onCommit?.(currentValue)
  }, [commitValue, onCommit, currentValue])

  const handleDragCancel = useCallback(() => {
    revert()
    onCancel?.()
  }, [revert, onCancel])

  // Use drag hook
  const { isDragging, bind } = useGizmoDrag({
    onDragStart: handleDragStart,
    onDrag: handleDrag,
    onDragEnd: (committed) => {
      if (committed) {
        handleDragEnd()
      } else {
        handleDragCancel()
      }
    },
    enabled: !disabled,
  })

  // Keyboard input handling
  useEffect(() => {
    if (!isDragging) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Number keys and decimal point
      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault()
        setKeyboardMode(true)
        setKeyboardBuffer((prev: string) => prev + e.key)
      }
      // Minus for negative (only at start)
      else if (e.key === "-" && keyboardBuffer === "") {
        e.preventDefault()
        setKeyboardMode(true)
        setKeyboardBuffer("-")
      }
      // Backspace to delete
      else if (e.key === "Backspace") {
        e.preventDefault()
        setKeyboardBuffer((prev: string) => prev.slice(0, -1))
        if (keyboardBuffer.length <= 1) {
          setKeyboardMode(false)
        }
      }
      // Enter to confirm keyboard value
      else if (e.key === "Enter" && keyboardBuffer) {
        e.preventDefault()
        const parsed = Number.parseFloat(keyboardBuffer)
        if (!Number.isNaN(parsed)) {
          const clamped = Math.max(min, Math.min(max, parsed))
          setCurrentValue(clamped)
          onChange?.(clamped)
        }
        setKeyboardMode(false)
        setKeyboardBuffer("")
      }
      // Escape to cancel
      else if (e.key === "Escape") {
        e.preventDefault()
        if (keyboardMode) {
          setKeyboardMode(false)
          setKeyboardBuffer("")
        } else {
          handleDragCancel()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    isDragging,
    keyboardMode,
    keyboardBuffer,
    min,
    max,
    setCurrentValue,
    onChange,
    handleDragCancel,
  ])

  // Update current value from keyboard buffer
  useEffect(() => {
    if (keyboardMode && keyboardBuffer) {
      const parsed = Number.parseFloat(keyboardBuffer)
      if (!Number.isNaN(parsed)) {
        const clamped = Math.max(min, Math.min(max, parsed))
        setCurrentValue(clamped)
        onChange?.(clamped)
      }
    }
  }, [keyboardBuffer, keyboardMode, min, max, setCurrentValue, onChange])

  // Calculate label position (midpoint of the line)
  const labelPosition = useMemo(() => {
    return originVec.clone().add(directionVec.clone().multiplyScalar(currentValue / 2))
  }, [originVec, directionVec, currentValue])

  if (!visible) {
    return null
  }

  return (
    <AbstractGizmo disabled={disabled} visible={visible}>
      <group ref={groupRef}>
        {/* Axis line from origin to handle */}
        {showHelper && currentValue > 0.001 && (
          <AxisHelper
            start={originVec}
            end={handlePosition}
            color={isDragging ? GizmoColors.active : color}
            lineWidth={isDragging ? 2 : 1}
            dashed={!isDragging}
            dashSize={0.05}
            gapSize={0.03}
          />
        )}

        {/* Draggable handle */}
        <group position={handlePosition.toArray()} {...bind}>
          <GizmoHandle geometry="sphere" size={handleSize} color={color} primary />
        </group>

        {/* Value label */}
        {showHelper && isDragging && (
          <NumberHelper
            value={currentValue}
            position={labelPosition}
            unit={unit}
            precision={precision}
            visible={isDragging}
          />
        )}
      </group>
    </AbstractGizmo>
  )
}

DistanceGizmo.displayName = "DistanceGizmo"
