/**
 * SelectionBox Component
 *
 * Implements drag-to-select functionality (rectangular selection) like traditional CAD software.
 * Users can click and drag to create a selection rectangle that selects all objects within it.
 */

import { useThree } from "@react-three/fiber"
import { useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { useModellerStore } from "@/stores/modeller"

export function SelectionBox() {
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 })
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })

  const { camera, gl, scene } = useThree()
  const objects = useModellerStore((s) => s.objects)
  const setSelectedIds = useModellerStore((s) => s.setSelectedIds)
  const selectedIds = useModellerStore((s) => s.selectedIds)

  // Check if a 3D point is inside the 2D selection rectangle
  const isPointInSelection = useCallback(
    (
      point: THREE.Vector3,
      rect: { x: number; y: number; width: number; height: number }
    ): boolean => {
      const vector = point.clone()
      vector.project(camera)

      // Convert from NDC (-1 to 1) to screen coordinates (0 to canvas size)
      const canvas = gl.domElement
      const x = ((vector.x + 1) / 2) * canvas.clientWidth
      const y = ((-vector.y + 1) / 2) * canvas.clientHeight

      return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
    },
    [camera, gl]
  )

  // Handle mouse down - start selection
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only start selection on left click and not on UI elements
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.tagName !== "CANVAS") return

    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    startPosRef.current = { x, y }
    setSelectionStart({ x, y })
    setSelectionEnd({ x, y })
    isDraggingRef.current = false
  }, [])

  // Handle mouse move - update selection rectangle
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!startPosRef.current) return

      const rect = gl.domElement.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Only start showing selection box if moved more than 5px (avoid accidental drags)
      const dx = Math.abs(x - startPosRef.current.x)
      const dy = Math.abs(y - startPosRef.current.y)

      if (dx > 5 || dy > 5) {
        isDraggingRef.current = true
        setIsSelecting(true)
        setSelectionEnd({ x, y })
      }
    },
    [gl]
  )

  // Handle mouse up - complete selection
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) {
        // Reset selection state
        setIsSelecting(false)
        startPosRef.current = { x: 0, y: 0 }
        return
      }

      // Calculate selection rectangle
      const rect = {
        x: Math.min(selectionStart.x, selectionEnd.x),
        y: Math.min(selectionStart.y, selectionEnd.y),
        width: Math.abs(selectionEnd.x - selectionStart.x),
        height: Math.abs(selectionEnd.y - selectionStart.y),
      }

      // Find objects within selection
      const selectedObjectIds: string[] = []

      objects.forEach((obj) => {
        if (!obj.visible) return

        // Get object position (center point)
        const position = new THREE.Vector3(
          obj.transform.position.x,
          obj.transform.position.y,
          obj.transform.position.z
        )

        // For channels/transitions/chutes, use startStation
        if ("startStation" in obj) {
          const channelObj = obj as any
          position.x = channelObj.startStation ?? position.x
        }

        if (isPointInSelection(position, rect)) {
          selectedObjectIds.push(obj.id)
        }
      })

      // Update selection (append if Shift is held, replace otherwise)
      if (e.shiftKey) {
        const combined = [...new Set([...selectedIds, ...selectedObjectIds])]
        setSelectedIds(combined)
      } else {
        setSelectedIds(selectedObjectIds)
      }

      // Reset selection state
      setIsSelecting(false)
      isDraggingRef.current = false
      startPosRef.current = { x: 0, y: 0 }
    },
    [selectionStart, selectionEnd, objects, isPointInSelection, selectedIds, setSelectedIds]
  )

  // Attach event listeners
  useEffect(() => {
    const canvas = gl.domElement

    canvas.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [gl, handleMouseDown, handleMouseMove, handleMouseUp])

  if (!isSelecting) return null

  // Calculate rectangle dimensions
  const rect = {
    left: Math.min(selectionStart.x, selectionEnd.x),
    top: Math.min(selectionStart.y, selectionEnd.y),
    width: Math.abs(selectionEnd.x - selectionStart.x),
    height: Math.abs(selectionEnd.y - selectionStart.y),
  }

  return (
    <div
      className="absolute pointer-events-none border-2 border-primary bg-primary/10"
      style={{
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }}
    />
  )
}

export default SelectionBox
