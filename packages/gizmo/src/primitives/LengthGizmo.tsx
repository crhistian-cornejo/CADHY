/**
 * LengthGizmo - Interactive gizmo for measuring/editing lengths
 *
 * Similar to DistanceGizmo but simpler - measures length from origin.
 * The handle can be dragged to change the length value.
 */

import { useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"

import { AbstractGizmo, GizmoColors, GizmoHandle } from "../base/AbstractGizmo"
import { AxisHelper } from "../helpers/AxisHelper"
import { NumberHelper } from "../helpers/NumberHelper"
import { useGizmoDrag } from "../hooks/use-gizmo-drag"
import { useGizmoState } from "../hooks/use-gizmo-state"
import type { GizmoMovementInfo, MagnitudeGizmoProps } from "../types"

/**
 * LengthGizmo Component
 *
 * A linear gizmo that allows the user to drag along a direction
 * to change a length value from a fixed origin point.
 *
 * Features:
 * - Drag along direction to change value
 * - Shows numeric value during drag
 * - Keyboard input for precise values
 * - Min/max constraints
 * - Visual line from origin to handle
 *
 * @example
 * ```tsx
 * <LengthGizmo
 *   position={[0, 0, 0]}
 *   direction={[1, 0, 0]}
 *   value={2.5}
 *   onChange={(v) => console.log('Length:', v)}
 *   onCommit={(v) => console.log('Committed:', v)}
 *   unit="m"
 * />
 * ```
 */
export function LengthGizmo({
  id,
  position,
  rotation,
  value,
  onChange,
  onCommit,
  onCancel,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 0.1,
  direction = [1, 0, 0],
  showLabel = true,
  formatLabel,
  unit = "",
  disabled = false,
  visible = true,
  style,
}: MagnitudeGizmoProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  // Convert direction to Vector3
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
    return directionVec.clone().multiplyScalar(currentValue)
  }, [directionVec, currentValue])

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

      // Get mouse position from movement info
      const mouse = movement.currentNDC

      // Create a ray from the camera
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)

      // Get the gizmo's world position (origin)
      const worldOrigin = new THREE.Vector3()
      if (groupRef.current) {
        groupRef.current.getWorldPosition(worldOrigin)
      }

      // Get world direction
      const worldDirection = directionVec.clone()
      if (groupRef.current) {
        worldDirection.applyQuaternion(groupRef.current.getWorldQuaternion(new THREE.Quaternion()))
      }

      // Line-line closest point calculation
      const rayOrigin = raycaster.ray.origin
      const rayDir = raycaster.ray.direction

      const w0 = rayOrigin.clone().sub(worldOrigin)
      const a = rayDir.dot(rayDir)
      const b = rayDir.dot(worldDirection)
      const c = worldDirection.dot(worldDirection)
      const d = rayDir.dot(w0)
      const e = worldDirection.dot(w0)

      const denom = a * c - b * b
      if (Math.abs(denom) < 0.0001) return

      const s = (a * e - b * d) / denom
      const newValue = Math.max(min, Math.min(max, s))

      setCurrentValue(newValue)
      onChange?.(newValue, undefined as any)
    },
    [keyboardMode, camera, directionVec, min, max, setCurrentValue, onChange]
  )

  const handleDragEnd = useCallback(() => {
    commitValue()
    onCommit?.(currentValue)
  }, [commitValue, onCommit, currentValue])

  const handleDragCancel = useCallback(() => {
    revert()
    onCancel?.(value)
  }, [revert, onCancel, value])

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
      // Minus for negative (only at start, if min allows)
      else if (e.key === "-" && keyboardBuffer === "" && min < 0) {
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
          onChange?.(clamped, undefined as any)
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
        onChange?.(clamped, undefined as any)
      }
    }
  }, [keyboardBuffer, keyboardMode, min, max, setCurrentValue, onChange])

  // Calculate label position (midpoint of the line)
  const labelPosition = useMemo(() => {
    return directionVec.clone().multiplyScalar(currentValue / 2)
  }, [directionVec, currentValue])

  // Format label
  const _labelText = formatLabel
    ? formatLabel(currentValue)
    : `${currentValue.toFixed(3)}${unit ? ` ${unit}` : ""}`

  if (!visible) {
    return null
  }

  const handleColor = style?.color ?? GizmoColors.idle

  return (
    <AbstractGizmo disabled={disabled} visible={visible} position={position} rotation={rotation}>
      <group ref={groupRef}>
        {/* Axis line from origin to handle */}
        {currentValue > 0.001 && (
          <AxisHelper
            start={[0, 0, 0]}
            end={handlePosition.toArray() as [number, number, number]}
            color={isDragging ? GizmoColors.active : handleColor}
            lineWidth={isDragging ? 2 : 1}
            dashed={!isDragging}
            dashSize={0.05}
            gapSize={0.03}
          />
        )}

        {/* Draggable handle */}
        <group position={handlePosition.toArray()} {...bind}>
          <GizmoHandle geometry="sphere" size={0.08} color={handleColor} primary />
        </group>

        {/* Value label */}
        {showLabel && isDragging && (
          <NumberHelper
            value={currentValue}
            position={labelPosition}
            unit={unit}
            precision={3}
            visible={isDragging}
          />
        )}
      </group>
    </AbstractGizmo>
  )
}

LengthGizmo.displayName = "LengthGizmo"
