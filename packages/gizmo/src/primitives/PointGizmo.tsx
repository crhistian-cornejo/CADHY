/**
 * PointGizmo - Interactive gizmo for editing 3D positions
 *
 * Allows dragging a point in 3D space with optional axis constraints.
 * Supports keyboard input for precise coordinate values.
 */

import type { Vec3 } from "@cadhy/command/state-machine"
import { Html, Line } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { AbstractGizmo, GizmoColors, GizmoHandle } from "../base/AbstractGizmo"
import { useGizmoDrag } from "../hooks/use-gizmo-drag"
import { useGizmoState } from "../hooks/use-gizmo-state"
import type { GizmoAxis, GizmoMovementInfo, PointGizmoProps } from "../types"

/**
 * Get constraint plane based on axis
 */
function getConstraintPlane(
  axis: GizmoAxis,
  origin: THREE.Vector3,
  cameraDirection: THREE.Vector3
): THREE.Plane {
  switch (axis) {
    case "x":
      // Constrain to X axis - plane perpendicular to X containing origin
      return new THREE.Plane(new THREE.Vector3(1, 0, 0), -origin.x)
    case "y":
      return new THREE.Plane(new THREE.Vector3(0, 1, 0), -origin.y)
    case "z":
      return new THREE.Plane(new THREE.Vector3(0, 0, 1), -origin.z)
    case "xy":
      return new THREE.Plane(new THREE.Vector3(0, 0, 1), -origin.z)
    case "xz":
      return new THREE.Plane(new THREE.Vector3(0, 1, 0), -origin.y)
    case "yz":
      return new THREE.Plane(new THREE.Vector3(1, 0, 0), -origin.x)
    default:
      // Free movement - use plane facing camera
      return new THREE.Plane(cameraDirection.clone().normalize(), -origin.dot(cameraDirection))
  }
}

/**
 * Apply axis constraint to a position
 */
function applyAxisConstraint(
  newPos: THREE.Vector3,
  originalPos: THREE.Vector3,
  axis: GizmoAxis
): THREE.Vector3 {
  const result = newPos.clone()

  switch (axis) {
    case "x":
      result.y = originalPos.y
      result.z = originalPos.z
      break
    case "y":
      result.x = originalPos.x
      result.z = originalPos.z
      break
    case "z":
      result.x = originalPos.x
      result.y = originalPos.y
      break
    case "xy":
      result.z = originalPos.z
      break
    case "xz":
      result.y = originalPos.y
      break
    case "yz":
      result.x = originalPos.x
      break
    default:
      // No constraint
      break
  }

  return result
}

/**
 * PointGizmo Component
 *
 * A 3D point gizmo that allows the user to drag a point in space.
 * Supports axis constraints (X, Y, Z, XY, XZ, YZ, or free XYZ).
 *
 * Features:
 * - Drag point in 3D space
 * - Axis constraints for controlled movement
 * - Grid snapping
 * - Shows axis lines
 * - Keyboard input for precise coordinates
 *
 * @example
 * ```tsx
 * <PointGizmo
 *   value={new THREE.Vector3(1, 2, 3)}
 *   axis="xy"
 *   onChange={(v) => console.log('Position:', v)}
 *   onCommit={(v) => console.log('Committed:', v)}
 *   showAxes
 * />
 * ```
 */
export function PointGizmo({
  id,
  position,
  rotation,
  value,
  onChange,
  onCommit,
  onCancel,
  axis = "xyz",
  snapSize = 0,
  showAxes = true,
  showLabel = true,
  disabled = false,
  visible = true,
  style,
}: PointGizmoProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  // Convert value to Vec3 format
  const valueAsVec3 = useMemo((): Vec3 => {
    if (value instanceof THREE.Vector3) {
      return { x: value.x, y: value.y, z: value.z }
    }
    return value
  }, [value])

  // State machine for value management
  const {
    value: currentValue,
    isInteracting,
    setValue: setCurrentValue,
    start,
    commit: commitValue,
    revert,
  } = useGizmoState({
    type: "vector",
    initialValue: valueAsVec3,
  })

  // Track keyboard input mode and which axis is being edited
  const [keyboardMode, setKeyboardMode] = useState(false)
  const [keyboardAxis, setKeyboardAxis] = useState<"x" | "y" | "z">("x")
  const [keyboardBuffer, setKeyboardBuffer] = useState("")

  // Sync external value changes
  useEffect(() => {
    if (!isInteracting) {
      setCurrentValue(valueAsVec3)
    }
  }, [valueAsVec3, isInteracting, setCurrentValue])

  // Current position as Vector3
  const currentPosition = useMemo(() => {
    return new THREE.Vector3(currentValue.x, currentValue.y, currentValue.z)
  }, [currentValue])

  // Original position for constraints
  const originalPositionRef = useRef(currentPosition.clone())

  // Drag handlers
  const handleDragStart = useCallback(
    (_movement: GizmoMovementInfo) => {
      originalPositionRef.current = currentPosition.clone()
      start()
      setKeyboardMode(false)
      setKeyboardBuffer("")
    },
    [currentPosition, start]
  )

  const handleDrag = useCallback(
    (movement: GizmoMovementInfo) => {
      if (keyboardMode) return

      // Get mouse position from movement info
      const mouse = movement.currentNDC

      // Create a ray from the camera
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)

      // Get camera direction
      const cameraDir = new THREE.Vector3()
      camera.getWorldDirection(cameraDir)

      // Get constraint plane
      const plane = getConstraintPlane(axis, originalPositionRef.current, cameraDir)

      // Intersect ray with plane
      const intersection = new THREE.Vector3()
      const hit = raycaster.ray.intersectPlane(plane, intersection)

      if (!hit) return

      // Apply axis constraints
      let constrained = applyAxisConstraint(intersection, originalPositionRef.current, axis)

      // Apply snapping if enabled
      if (snapSize > 0) {
        constrained = new THREE.Vector3(
          Math.round(constrained.x / snapSize) * snapSize,
          Math.round(constrained.y / snapSize) * snapSize,
          Math.round(constrained.z / snapSize) * snapSize
        )
      }

      const newValue: Vec3 = { x: constrained.x, y: constrained.y, z: constrained.z }
      setCurrentValue(newValue)
      onChange?.(new THREE.Vector3(newValue.x, newValue.y, newValue.z), undefined as any)
    },
    [keyboardMode, camera, axis, snapSize, setCurrentValue, onChange]
  )

  const handleDragEnd = useCallback(() => {
    commitValue()
    onCommit?.(new THREE.Vector3(currentValue.x, currentValue.y, currentValue.z))
  }, [commitValue, onCommit, currentValue])

  const handleDragCancel = useCallback(() => {
    revert()
    // value is always THREE.Vector3 per PointGizmoProps, pass it directly
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
      // Switch axis with X, Y, Z keys
      if (e.key.toLowerCase() === "x") {
        e.preventDefault()
        setKeyboardAxis("x")
        setKeyboardMode(true)
        setKeyboardBuffer(currentValue.x.toFixed(3))
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault()
        setKeyboardAxis("y")
        setKeyboardMode(true)
        setKeyboardBuffer(currentValue.y.toFixed(3))
      } else if (e.key.toLowerCase() === "z") {
        e.preventDefault()
        setKeyboardAxis("z")
        setKeyboardMode(true)
        setKeyboardBuffer(currentValue.z.toFixed(3))
      }
      // Number keys and decimal point
      else if (/^[0-9.]$/.test(e.key) && keyboardMode) {
        e.preventDefault()
        setKeyboardBuffer((prev: string) => prev + e.key)
      }
      // Minus for negative
      else if (e.key === "-" && keyboardMode) {
        e.preventDefault()
        if (keyboardBuffer.startsWith("-")) {
          setKeyboardBuffer(keyboardBuffer.slice(1))
        } else {
          setKeyboardBuffer(`-${keyboardBuffer}`)
        }
      }
      // Backspace to delete
      else if (e.key === "Backspace" && keyboardMode) {
        e.preventDefault()
        setKeyboardBuffer((prev: string) => prev.slice(0, -1))
      }
      // Tab to switch axis
      else if (e.key === "Tab" && keyboardMode) {
        e.preventDefault()
        const axes: ("x" | "y" | "z")[] = ["x", "y", "z"]
        const currentIndex = axes.indexOf(keyboardAxis)
        const nextAxis = axes[(currentIndex + 1) % 3]
        setKeyboardAxis(nextAxis)
        setKeyboardBuffer(currentValue[nextAxis].toFixed(3))
      }
      // Enter to confirm keyboard value
      else if (e.key === "Enter" && keyboardMode && keyboardBuffer) {
        e.preventDefault()
        const parsed = Number.parseFloat(keyboardBuffer)
        if (!Number.isNaN(parsed)) {
          const newValue = { ...currentValue, [keyboardAxis]: parsed }
          setCurrentValue(newValue)
          onChange?.(new THREE.Vector3(newValue.x, newValue.y, newValue.z), undefined as any)
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
    keyboardAxis,
    keyboardBuffer,
    currentValue,
    setCurrentValue,
    onChange,
    handleDragCancel,
  ])

  // Update current value from keyboard buffer
  useEffect(() => {
    if (keyboardMode && keyboardBuffer) {
      const parsed = Number.parseFloat(keyboardBuffer)
      if (!Number.isNaN(parsed)) {
        const newValue = { ...currentValue, [keyboardAxis]: parsed }
        setCurrentValue(newValue)
        onChange?.(new THREE.Vector3(newValue.x, newValue.y, newValue.z), undefined as any)
      }
    }
  }, [keyboardBuffer, keyboardMode, keyboardAxis, currentValue, setCurrentValue, onChange])

  // Axis line length
  const axisLength = 0.5

  if (!visible) {
    return null
  }

  const handleColor = style?.color ?? GizmoColors.idle

  return (
    <AbstractGizmo disabled={disabled} visible={visible} position={position} rotation={rotation}>
      <group ref={groupRef}>
        {/* Axis lines */}
        {showAxes && (
          <>
            {/* X axis */}
            {(axis === "xyz" || axis === "x" || axis === "xy" || axis === "xz") && (
              <Line
                points={[
                  [currentValue.x - axisLength, currentValue.y, currentValue.z],
                  [currentValue.x + axisLength, currentValue.y, currentValue.z],
                ]}
                color={GizmoColors.x}
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
            )}

            {/* Y axis */}
            {(axis === "xyz" || axis === "y" || axis === "xy" || axis === "yz") && (
              <Line
                points={[
                  [currentValue.x, currentValue.y - axisLength, currentValue.z],
                  [currentValue.x, currentValue.y + axisLength, currentValue.z],
                ]}
                color={GizmoColors.y}
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
            )}

            {/* Z axis */}
            {(axis === "xyz" || axis === "z" || axis === "xz" || axis === "yz") && (
              <Line
                points={[
                  [currentValue.x, currentValue.y, currentValue.z - axisLength],
                  [currentValue.x, currentValue.y, currentValue.z + axisLength],
                ]}
                color={GizmoColors.z}
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
            )}
          </>
        )}

        {/* Draggable handle */}
        <group position={[currentValue.x, currentValue.y, currentValue.z]} {...bind}>
          <GizmoHandle geometry="sphere" size={0.08} color={handleColor} primary />
        </group>

        {/* Coordinate label */}
        {showLabel && isDragging && (
          <Html
            position={[currentValue.x, currentValue.y + 0.2, currentValue.z]}
            center
            sprite
            distanceFactor={10}
            style={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                color: "#ffffff",
                fontSize: "11px",
                fontFamily: "monospace",
                fontWeight: 500,
                padding: "3px 6px",
                borderRadius: "3px",
                whiteSpace: "nowrap",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
              }}
            >
              <span style={{ color: GizmoColors.x }}>X:</span> {currentValue.x.toFixed(2)}{" "}
              <span style={{ color: GizmoColors.y }}>Y:</span> {currentValue.y.toFixed(2)}{" "}
              <span style={{ color: GizmoColors.z }}>Z:</span> {currentValue.z.toFixed(2)}
              {keyboardMode && (
                <div style={{ marginTop: "2px", fontSize: "10px", opacity: 0.8 }}>
                  Editing {keyboardAxis.toUpperCase()}: {keyboardBuffer || "0"}
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </AbstractGizmo>
  )
}

PointGizmo.displayName = "PointGizmo"
