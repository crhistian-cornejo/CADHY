/**
 * CursorTracker Component
 *
 * Three.js component that tracks cursor position in 3D world space
 * and updates the viewport coordinates store.
 *
 * Following Autodesk AutoCAD conventions:
 * - Projects mouse position onto the XZ ground plane (Y=0 for CAD)
 * - When objects are selected, shows their centroid instead
 * - Updates in real-time as cursor moves
 */

import { useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { useSelectedObjects } from "@/stores/modeller"
import { type AnySceneObject, calculateSceneBoundingBox } from "@/stores/modeller/types"
import { useViewportCoordinates } from "@/stores/viewport-coordinates-store"

export function CursorTracker() {
  const { camera, gl, invalidate } = useThree()
  const selectedObjects = useSelectedObjects()
  const setSelectionCenter = useViewportCoordinates((s) => s.setSelectionCenter)
  const setCursorPosition = useViewportCoordinates((s) => s.setCursorPosition)
  const setIsOverViewport = useViewportCoordinates((s) => s.setIsOverViewport)

  // Reusable objects to avoid GC pressure
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const mouse = useMemo(() => new THREE.Vector2(), [])
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const intersectionPoint = useMemo(() => new THREE.Vector3(), [])

  // Ref to track if we should track cursor (no selection)
  const hasSelectionRef = useRef(selectedObjects.length > 0)

  // Update ref when selection changes
  useEffect(() => {
    hasSelectionRef.current = selectedObjects.length > 0
  }, [selectedObjects.length])

  // Update selection center when selection changes
  useEffect(() => {
    if (selectedObjects.length > 0) {
      const bbox = calculateSceneBoundingBox(selectedObjects as AnySceneObject[])
      if (bbox) {
        setSelectionCenter({
          x: Number.isFinite(bbox.center.x) ? bbox.center.x : 0,
          y: Number.isFinite(bbox.center.y) ? bbox.center.y : 0,
          z: Number.isFinite(bbox.center.z) ? bbox.center.z : 0,
        })
      }
    }
  }, [selectedObjects, setSelectionCenter])

  // Handle mouse movement - update cursor position in real-time
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      // Only track cursor when no objects are selected
      if (hasSelectionRef.current) return

      const rect = gl.domElement.getBoundingClientRect()

      // Calculate normalized device coordinates (-1 to 1)
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      // Set up raycaster
      mouse.set(x, y)
      raycaster.setFromCamera(mouse, camera)

      // Intersect with XZ ground plane (Y=0)
      const intersected = raycaster.ray.intersectPlane(groundPlane, intersectionPoint)

      if (intersected) {
        setCursorPosition({
          x: Number.isFinite(intersectionPoint.x) ? Math.round(intersectionPoint.x * 100) / 100 : 0,
          y: Number.isFinite(intersectionPoint.y) ? Math.round(intersectionPoint.y * 100) / 100 : 0,
          z: Number.isFinite(intersectionPoint.z) ? Math.round(intersectionPoint.z * 100) / 100 : 0,
        })
      }
    },
    [gl.domElement, mouse, raycaster, camera, groundPlane, intersectionPoint, setCursorPosition]
  )

  // Handle mouse enter
  const handleMouseEnter = useCallback(() => {
    setIsOverViewport(true)
  }, [setIsOverViewport])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsOverViewport(false)
  }, [setIsOverViewport])

  // Set up event listeners
  useEffect(() => {
    const canvas = gl.domElement

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseenter", handleMouseEnter)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseenter", handleMouseEnter)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [gl.domElement, handleMouseMove, handleMouseEnter, handleMouseLeave])

  // This component doesn't render anything
  return null
}

export default CursorTracker
