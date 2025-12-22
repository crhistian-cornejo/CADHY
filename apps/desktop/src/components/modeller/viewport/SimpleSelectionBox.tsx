/**
 * SimpleSelectionBox Component
 *
 * Visual overlay for drag-to-select functionality.
 * Activates when user holds Shift + drags on the viewport.
 * Works without R3F hooks by using DOM events directly.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { getCamera } from "@/services/viewport-registry"
import { useModellerStore, useObjects } from "@/stores/modeller"

export function SimpleSelectionBox() {
  const [isSelecting, setIsSelecting] = useState(false)
  const [renderTrigger, setRenderTrigger] = useState(0)

  // Use refs for positions to avoid stale closure issues
  const startPosRef = useRef({ x: 0, y: 0 })
  const endPosRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const isShiftHeldRef = useRef(false)

  const objects = useObjects()
  const { selectMultiple, setBoxSelectMode } = useModellerStore()

  // Track Shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" && !isShiftHeldRef.current) {
        isShiftHeldRef.current = true
        setBoxSelectMode(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        isShiftHeldRef.current = false
        // Only disable box select mode if not currently dragging
        if (!isDraggingRef.current) {
          setBoxSelectMode(false)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [setBoxSelectMode])

  // Handle mouse move - update selection rectangle
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Must have started with Shift held (startPos won't be 0,0)
    if (startPosRef.current.x === 0 && startPosRef.current.y === 0) return

    const canvas = document.querySelector("canvas")
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Only start showing selection box if moved more than 5px
    const dx = Math.abs(x - startPosRef.current.x)
    const dy = Math.abs(y - startPosRef.current.y)

    if (dx > 5 || dy > 5) {
      isDraggingRef.current = true
      endPosRef.current = { x, y }
      setIsSelecting(true)
      // Force re-render to update the visual box
      setRenderTrigger((prev) => prev + 1)
    }
  }, [])

  // Handle mouse up - complete selection
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const wasDragging = isDraggingRef.current
      const start = { ...startPosRef.current }
      const end = { ...endPosRef.current }

      // Reset state first
      setIsSelecting(false)
      isDraggingRef.current = false
      startPosRef.current = { x: 0, y: 0 }
      endPosRef.current = { x: 0, y: 0 }

      if (!isShiftHeldRef.current) {
        setBoxSelectMode(false)
      }

      if (!wasDragging) {
        return
      }

      // Get canvas for dimensions
      const canvas = document.querySelector("canvas")
      if (!canvas) return

      // Get camera from viewport registry (set by SceneContent)
      const camera = getCamera()
      if (!camera) {
        console.warn("[SelectionBox] Camera not available from viewport registry")
        return
      }

      console.log("[SelectionBox] Camera found:", camera.type)

      const canvasRect = canvas.getBoundingClientRect()
      const selectionBox = {
        minX: Math.min(start.x, end.x),
        maxX: Math.max(start.x, end.x),
        minY: Math.min(start.y, end.y),
        maxY: Math.max(start.y, end.y),
      }

      // Project 3D objects to 2D screen space
      const selectedObjectIds: string[] = []
      const tempVector = new THREE.Vector3()

      console.log("[SelectionBox] Selection box:", selectionBox)
      console.log("[SelectionBox] Canvas size:", canvasRect.width, "x", canvasRect.height)
      console.log("[SelectionBox] Objects to check:", objects.length)

      for (const obj of objects) {
        if (!obj.visible) continue

        // Get object position from transform
        const pos = obj.transform.position
        tempVector.set(pos.x, pos.y, pos.z)

        // For channels/transitions/chutes, adjust X to use startStation
        if ("startStation" in obj) {
          const hydraulicObj = obj as any
          const length = hydraulicObj.length ?? 0
          tempVector.x = (hydraulicObj.startStation ?? 0) + length / 2
        }

        const worldPos = tempVector.clone()

        // Project to screen space
        tempVector.project(camera)

        // Convert from NDC (-1 to 1) to screen coordinates
        const screenX = ((tempVector.x + 1) / 2) * canvasRect.width
        const screenY = ((1 - tempVector.y) / 2) * canvasRect.height

        console.log(
          `[SelectionBox] Object "${obj.name}": world(${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}, ${worldPos.z.toFixed(1)}) -> screen(${screenX.toFixed(0)}, ${screenY.toFixed(0)})`
        )

        // Check if point is within selection box
        if (
          screenX >= selectionBox.minX &&
          screenX <= selectionBox.maxX &&
          screenY >= selectionBox.minY &&
          screenY <= selectionBox.maxY
        ) {
          selectedObjectIds.push(obj.id)
          console.log(`[SelectionBox] -> SELECTED!`)
        }
      }

      console.log("[SelectionBox] Total selected:", selectedObjectIds.length)
      console.log("[SelectionBox] Object IDs to select:", selectedObjectIds)
      console.log("[SelectionBox] selectMultiple function:", typeof selectMultiple)

      // Update selection based on Ctrl/Cmd key for additive
      const additive = e.ctrlKey || e.metaKey
      console.log("[SelectionBox] Calling selectMultiple with additive:", additive)

      // Call the store action directly to ensure it works
      useModellerStore.getState().selectMultiple(selectedObjectIds, additive)

      console.log(
        "[SelectionBox] After selection, selectedIds:",
        useModellerStore.getState().selectedIds
      )
    },
    [objects, selectMultiple, setBoxSelectMode]
  )

  // Attach event listeners with capture phase
  useEffect(() => {
    const canvas = document.querySelector("canvas")
    if (!canvas) return

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !e.shiftKey) return

      // Stop OrbitControls from receiving this event
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      startPosRef.current = { x, y }
      endPosRef.current = { x, y }
      isDraggingRef.current = false
    }

    canvas.addEventListener("pointerdown", handlePointerDown, { capture: true })
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown, { capture: true })
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  if (!isSelecting) return null

  // Use refs for rendering (they have the current values)
  const rect = {
    left: Math.min(startPosRef.current.x, endPosRef.current.x),
    top: Math.min(startPosRef.current.y, endPosRef.current.y),
    width: Math.abs(endPosRef.current.x - startPosRef.current.x),
    height: Math.abs(endPosRef.current.y - startPosRef.current.y),
  }

  return (
    <div
      key={renderTrigger}
      className="absolute pointer-events-none border-2 border-primary bg-primary/10 z-50"
      style={{
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }}
    />
  )
}

export default SimpleSelectionBox
