/**
 * EdgeGizmo Component - CADHY
 *
 * Interactive 3D gizmo for edge-based CAD operations (fillet, chamfer).
 * Displays a draggable arrow handle at the edge midpoint.
 */

import { useThree } from "@react-three/fiber"
import { useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import type { DetectedEdge } from "@/hooks/use-edge-detection"

export interface EdgeGizmoProps {
  /** The edge to attach the gizmo to */
  edge: DetectedEdge
  /** Current value (radius/distance) */
  value: number
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Color of the gizmo */
  color?: string
  /** Callback when value changes */
  onValueChange: (value: number) => void
  /** Callback when drag starts */
  onDragStart?: () => void
  /** Callback when drag ends */
  onDragEnd?: () => void
}

export function EdgeGizmo({
  edge,
  value,
  min = 0.01,
  max = 10,
  color = "#3b82f6",
  onValueChange,
  onDragStart,
  onDragEnd,
}: EdgeGizmoProps) {
  const { camera, gl, raycaster } = useThree()
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const arrowGroupRef = useRef<THREE.Group>(null)
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane())
  const dragStartPointRef = useRef<THREE.Vector3>(new THREE.Vector3())
  const initialValueRef = useRef(value)

  // Calculate perpendicular vector to edge (for arrow direction)
  const perpendicular = useRef(new THREE.Vector3())

  useEffect(() => {
    // Find a perpendicular vector to the edge direction
    // Use camera up vector as reference
    const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)

    // Cross product to get perpendicular
    perpendicular.current.crossVectors(edge.direction, cameraUp).normalize()

    // If edge is parallel to camera up, use camera right instead
    if (perpendicular.current.length() < 0.1) {
      const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
      perpendicular.current.crossVectors(edge.direction, cameraRight).normalize()
    }
  }, [edge, camera])

  // Handle pointer down (start drag)
  const handlePointerDown = useCallback(
    (event: THREE.Event) => {
      event.stopPropagation()
      setIsDragging(true)
      onDragStart?.()

      // Create drag plane perpendicular to camera view
      const cameraDirection = new THREE.Vector3()
      camera.getWorldDirection(cameraDirection)

      dragPlaneRef.current.setFromNormalAndCoplanarPoint(cameraDirection, edge.midpoint)

      // Get intersection point
      raycaster.setFromCamera(
        new THREE.Vector2(
          (event.pointer.x / gl.domElement.clientWidth) * 2 - 1,
          -(event.pointer.y / gl.domElement.clientHeight) * 2 + 1
        ),
        camera
      )

      const intersection = new THREE.Vector3()
      raycaster.ray.intersectPlane(dragPlaneRef.current, intersection)

      if (intersection) {
        dragStartPointRef.current.copy(intersection)
        initialValueRef.current = value
      }

      // Prevent orbit controls
      gl.domElement.style.cursor = "grabbing"
    },
    [camera, edge.midpoint, gl, raycaster, value, onDragStart]
  )

  // Handle pointer move (drag)
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDragging) return

      // Get current pointer position in 3D
      const x = (event.clientX / gl.domElement.clientWidth) * 2 - 1
      const y = -(event.clientY / gl.domElement.clientHeight) * 2 + 1

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)

      const intersection = new THREE.Vector3()
      raycaster.ray.intersectPlane(dragPlaneRef.current, intersection)

      if (intersection) {
        // Calculate distance from start point along perpendicular direction
        const delta = intersection.clone().sub(dragStartPointRef.current)
        const distance = delta.dot(perpendicular.current)

        // Scale factor (adjust sensitivity)
        const scaleFactor = 5

        // Calculate new value
        let newValue = initialValueRef.current + distance * scaleFactor

        // Clamp to min/max
        newValue = Math.max(min, Math.min(max, newValue))

        onValueChange(newValue)
      }
    },
    [isDragging, gl, raycaster, camera, min, max, onValueChange]
  )

  // Handle pointer up (end drag)
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      onDragEnd?.()
      gl.domElement.style.cursor = isHovered ? "grab" : "auto"
    }
  }, [isDragging, isHovered, gl, onDragEnd])

  // Add global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", handlePointerUp)

      return () => {
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", handlePointerUp)
      }
    }
  }, [isDragging, handlePointerMove, handlePointerUp])

  // Arrow position (offset from edge midpoint)
  const arrowOffset = value * 0.5 // Arrow moves as value increases
  const arrowPosition = edge.midpoint
    .clone()
    .add(perpendicular.current.clone().multiplyScalar(arrowOffset))

  // Visual states
  const displayColor = isDragging ? "#10b981" : isHovered ? "#60a5fa" : color
  const arrowScale = isDragging ? 1.2 : isHovered ? 1.1 : 1

  return (
    <group ref={arrowGroupRef} position={arrowPosition}>
      {/* Arrow shaft */}
      <mesh
        onPointerDown={handlePointerDown as never}
        onPointerEnter={() => {
          setIsHovered(true)
          gl.domElement.style.cursor = "grab"
        }}
        onPointerLeave={() => {
          setIsHovered(false)
          if (!isDragging) {
            gl.domElement.style.cursor = "auto"
          }
        }}
        scale={arrowScale}
      >
        <cylinderGeometry args={[0.02, 0.02, value * 0.3, 8]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isDragging ? 0.5 : isHovered ? 0.3 : 0.1}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Arrow head */}
      <mesh
        position={[0, (value * 0.3) / 2 + 0.08, 0]}
        onPointerDown={handlePointerDown as never}
        scale={arrowScale}
      >
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isDragging ? 0.5 : isHovered ? 0.3 : 0.1}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Glow ring at base */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -(value * 0.3) / 2, 0]}>
        <ringGeometry args={[value * 0.8, value * 0.9, 32]} />
        <meshBasicMaterial
          color={displayColor}
          transparent
          opacity={isDragging ? 0.4 : isHovered ? 0.25 : 0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Edge highlight line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={
              new Float32Array([
                edge.start.x - edge.midpoint.x,
                edge.start.y - edge.midpoint.y,
                edge.start.z - edge.midpoint.z,
                edge.end.x - edge.midpoint.x,
                edge.end.y - edge.midpoint.y,
                edge.end.z - edge.midpoint.z,
              ])
            }
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={displayColor}
          linewidth={isDragging ? 4 : isHovered ? 3 : 2}
          transparent
          opacity={isDragging ? 0.8 : isHovered ? 0.6 : 0.4}
        />
      </line>
    </group>
  )
}
