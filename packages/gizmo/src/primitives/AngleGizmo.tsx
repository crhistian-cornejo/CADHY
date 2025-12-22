/**
 * AngleGizmo - Interactive gizmo for measuring/editing angles
 *
 * Allows dragging around an arc to change an angle value.
 * Supports keyboard input for precise values.
 */

import { Line } from "@react-three/drei"
import type { ThreeEvent } from "@react-three/fiber"
import { useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"

import { AbstractGizmo, GizmoColors, GizmoHandle } from "../base/AbstractGizmo"
import { NumberHelper } from "../helpers/NumberHelper"
import { useGizmoDrag } from "../hooks/use-gizmo-drag"
import { useGizmoState } from "../hooks/use-gizmo-state"
import type { AngleGizmoProps, GizmoMovementInfo } from "../types"

/**
 * Convert rotation prop to Euler if it's a Quaternion
 */
function normalizeRotation(
  rotation?: [number, number, number] | THREE.Euler | THREE.Quaternion
): [number, number, number] | THREE.Euler | undefined {
  if (!rotation) return undefined
  if (rotation instanceof THREE.Quaternion) {
    return new THREE.Euler().setFromQuaternion(rotation)
  }
  return rotation
}

/**
 * Convert radians to degrees
 */
function radToDeg(rad: number): number {
  return rad * (180 / Math.PI)
}

/**
 * Convert degrees to radians
 */
function degToRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * AngleGizmo Component
 *
 * A circular gizmo that allows the user to drag around an arc
 * to change an angle value. Commonly used for rotation angles,
 * draft angles, etc.
 *
 * Features:
 * - Drag around arc to change value
 * - Shows angle value during drag
 * - Keyboard input for precise values
 * - Min/max constraints
 * - Visual arc showing the angle
 *
 * @example
 * ```tsx
 * <AngleGizmo
 *   position={[0, 0, 0]}
 *   value={Math.PI / 4}
 *   onChange={(v) => console.log('Angle:', v)}
 *   onCommit={(v) => console.log('Committed:', v)}
 *   displayDegrees
 * />
 * ```
 */
export function AngleGizmo({
  id,
  position,
  rotation,
  value,
  onChange,
  onCommit,
  onCancel,
  min = -Math.PI * 2,
  max = Math.PI * 2,
  step = degToRad(1),
  radius = 0.5,
  planeNormal = [0, 0, 1],
  startDirection = [1, 0, 0],
  displayDegrees = true,
  showArc = true,
  showLabel = true,
  disabled = false,
  visible = true,
  style,
}: AngleGizmoProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  // Convert props to Vector3
  const normalVec = useMemo(() => {
    if (Array.isArray(planeNormal)) {
      return new THREE.Vector3(...planeNormal).normalize()
    }
    return planeNormal.clone().normalize()
  }, [planeNormal])

  const startDirVec = useMemo(() => {
    if (Array.isArray(startDirection)) {
      return new THREE.Vector3(...startDirection).normalize()
    }
    return startDirection.clone().normalize()
  }, [startDirection])

  // State machine for value management
  const {
    value: currentValue,
    isInteracting,
    setValue: setCurrentValue,
    start,
    commit: commitValue,
    revert,
  } = useGizmoState({
    type: "angle",
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

  // Calculate handle position on the arc
  const handlePosition = useMemo(() => {
    // Rotate startDirection by currentValue around the normal
    const quaternion = new THREE.Quaternion().setFromAxisAngle(normalVec, currentValue)
    const handleDir = startDirVec.clone().applyQuaternion(quaternion)
    return handleDir.multiplyScalar(radius)
  }, [normalVec, startDirVec, currentValue, radius])

  // Calculate angle from mouse position
  const _projectMouseToAngle = useCallback(
    (event: ThreeEvent<PointerEvent>): number => {
      // Get mouse position in normalized device coordinates
      const mouse = new THREE.Vector2(
        (event.nativeEvent.clientX / window.innerWidth) * 2 - 1,
        -(event.nativeEvent.clientY / window.innerHeight) * 2 + 1
      )

      // Create a ray from the camera
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)

      // Get the gizmo's world position
      const worldPosition = new THREE.Vector3()
      if (groupRef.current) {
        groupRef.current.getWorldPosition(worldPosition)
      }

      // Create a plane at the gizmo position with the normal
      const plane = new THREE.Plane(normalVec, -worldPosition.dot(normalVec))

      // Intersect ray with plane
      const intersection = new THREE.Vector3()
      const hit = raycaster.ray.intersectPlane(plane, intersection)

      if (!hit) {
        return currentValue
      }

      // Get direction from center to intersection
      const localIntersection = intersection.sub(worldPosition)
      const direction = localIntersection.normalize()

      // Calculate angle from startDirection
      const angle = Math.atan2(
        direction.dot(new THREE.Vector3().crossVectors(normalVec, startDirVec)),
        direction.dot(startDirVec)
      )

      // Clamp to min/max
      return Math.max(min, Math.min(max, angle))
    },
    [camera, normalVec, startDirVec, currentValue, min, max]
  )

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

      // Calculate angle from movement NDC
      const mouse = movement.currentNDC

      // Create a ray from the camera
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)

      // Get the gizmo's world position
      const worldPosition = new THREE.Vector3()
      if (groupRef.current) {
        groupRef.current.getWorldPosition(worldPosition)
      }

      // Create a plane at the gizmo position with the normal
      const plane = new THREE.Plane(normalVec, -worldPosition.dot(normalVec))

      // Intersect ray with plane
      const intersection = new THREE.Vector3()
      const hit = raycaster.ray.intersectPlane(plane, intersection)

      if (!hit) return

      // Get direction from center to intersection
      const localIntersection = intersection.sub(worldPosition)
      const direction = localIntersection.normalize()

      // Calculate angle from startDirection
      let newValue = Math.atan2(
        direction.dot(new THREE.Vector3().crossVectors(normalVec, startDirVec)),
        direction.dot(startDirVec)
      )

      // Clamp to min/max
      newValue = Math.max(min, Math.min(max, newValue))

      setCurrentValue(newValue)
      onChange?.(newValue, undefined as any)
    },
    [keyboardMode, camera, normalVec, startDirVec, min, max, setCurrentValue, onChange]
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
          // If displaying degrees, convert input from degrees
          const radValue = displayDegrees ? degToRad(parsed) : parsed
          const clamped = Math.max(min, Math.min(max, radValue))
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
    displayDegrees,
    setCurrentValue,
    onChange,
    handleDragCancel,
  ])

  // Update current value from keyboard buffer
  useEffect(() => {
    if (keyboardMode && keyboardBuffer) {
      const parsed = Number.parseFloat(keyboardBuffer)
      if (!Number.isNaN(parsed)) {
        const radValue = displayDegrees ? degToRad(parsed) : parsed
        const clamped = Math.max(min, Math.min(max, radValue))
        setCurrentValue(clamped)
        onChange?.(clamped, undefined as any)
      }
    }
  }, [keyboardBuffer, keyboardMode, min, max, displayDegrees, setCurrentValue, onChange])

  // Generate arc points for visualization
  const arcPoints = useMemo(() => {
    const segments = Math.max(16, Math.abs(Math.round(currentValue / (Math.PI / 16))))
    const points: [number, number, number][] = []

    for (let i = 0; i <= segments; i++) {
      const angle = (currentValue * i) / segments
      const quaternion = new THREE.Quaternion().setFromAxisAngle(normalVec, angle)
      const point = startDirVec
        .clone()
        .applyQuaternion(quaternion)
        .multiplyScalar(radius * 0.8)
      points.push([point.x, point.y, point.z])
    }

    return points
  }, [currentValue, normalVec, startDirVec, radius])

  // Label position (at the midpoint of the arc)
  const labelPosition = useMemo(() => {
    const midAngle = currentValue / 2
    const quaternion = new THREE.Quaternion().setFromAxisAngle(normalVec, midAngle)
    const labelDir = startDirVec.clone().applyQuaternion(quaternion)
    return labelDir.multiplyScalar(radius * 1.2)
  }, [normalVec, startDirVec, currentValue, radius])

  // Display value
  const displayValue = displayDegrees ? radToDeg(currentValue) : currentValue
  const displayUnit = displayDegrees ? "°" : " rad"

  if (!visible) {
    return null
  }

  const handleColor = style?.color ?? GizmoColors.idle

  // Normalize rotation (Quaternion -> Euler if needed)
  const normalizedRotation = normalizeRotation(rotation)

  return (
    <AbstractGizmo
      disabled={disabled}
      visible={visible}
      position={position}
      rotation={normalizedRotation}
    >
      <group ref={groupRef}>
        {/* Reference line from center to start direction */}
        <Line
          points={[
            [0, 0, 0],
            [startDirVec.x * radius, startDirVec.y * radius, startDirVec.z * radius],
          ]}
          color={GizmoColors.disabled}
          lineWidth={1}
          dashed
          dashSize={0.03}
          gapSize={0.02}
        />

        {/* Arc showing the angle */}
        {showArc && arcPoints.length > 1 && (
          <Line
            points={arcPoints}
            color={isDragging ? GizmoColors.active : handleColor}
            lineWidth={isDragging ? 2 : 1}
          />
        )}

        {/* Line from center to current angle */}
        <Line
          points={[[0, 0, 0], handlePosition.toArray() as [number, number, number]]}
          color={isDragging ? GizmoColors.active : handleColor}
          lineWidth={isDragging ? 2 : 1}
        />

        {/* Draggable handle */}
        <group position={handlePosition.toArray()} {...bind}>
          <GizmoHandle geometry="sphere" size={0.06} color={handleColor} primary />
        </group>

        {/* Value label */}
        {showLabel && isDragging && (
          <NumberHelper
            value={displayValue}
            position={labelPosition}
            unit={displayUnit}
            precision={displayDegrees ? 1 : 3}
            visible={isDragging}
          />
        )}
      </group>
    </AbstractGizmo>
  )
}

AngleGizmo.displayName = "AngleGizmo"
