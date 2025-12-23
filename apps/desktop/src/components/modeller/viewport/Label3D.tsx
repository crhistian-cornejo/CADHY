/**
 * Label3D Component - CADHY
 *
 * Displays a value label in 3D space (converted to screen space).
 * Used for showing fillet/chamfer radius values on edges.
 */

import { useThree } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import type * as THREE from "three"

export interface Label3DProps {
  /** 3D position of the label */
  position: THREE.Vector3
  /** Value to display */
  value: number
  /** Unit to display (default: "mm") */
  unit?: string
  /** Prefix (e.g., "R" for radius) */
  prefix?: string
  /** Background color */
  backgroundColor?: string
  /** Text color */
  textColor?: string
  /** Show label */
  visible?: boolean
}

export function Label3D({
  position,
  value,
  unit = "mm",
  prefix = "R",
  backgroundColor = "#3b82f6",
  textColor = "#ffffff",
  visible = true,
}: Label3DProps) {
  const { camera, gl, size } = useThree()
  const [screenPosition, setScreenPosition] = useState({ x: 0, y: 0, visible: false })
  const labelRef = useRef<HTMLDivElement>(null)

  // Convert 3D position to screen space
  useEffect(() => {
    if (!visible) {
      setScreenPosition({ x: 0, y: 0, visible: false })
      return
    }

    const updatePosition = () => {
      // Clone position to avoid modifying the original
      const pos = position.clone()

      // Project to screen space
      pos.project(camera)

      // Check if behind camera
      if (pos.z > 1) {
        setScreenPosition({ x: 0, y: 0, visible: false })
        return
      }

      // Convert to pixel coordinates
      const x = ((pos.x + 1) / 2) * size.width
      const y = ((-pos.y + 1) / 2) * size.height

      // Check if within viewport bounds (with margin)
      const margin = 100
      const isVisible =
        x >= -margin && x <= size.width + margin && y >= -margin && y <= size.height + margin

      setScreenPosition({ x, y, visible: isVisible })
    }

    updatePosition()

    // Update on camera change
    const canvas = gl.domElement
    const observer = new MutationObserver(updatePosition)
    observer.observe(canvas, { attributes: true, childList: false, subtree: false })

    return () => observer.disconnect()
  }, [position, camera, size, gl, visible])

  // Update position on every frame (for smooth movement)
  useEffect(() => {
    if (!visible) return

    const interval = setInterval(() => {
      const pos = position.clone()
      pos.project(camera)

      if (pos.z > 1) {
        setScreenPosition((prev) => ({ ...prev, visible: false }))
        return
      }

      const x = ((pos.x + 1) / 2) * size.width
      const y = ((-pos.y + 1) / 2) * size.height

      const margin = 100
      const isVisible =
        x >= -margin && x <= size.width + margin && y >= -margin && y <= size.height + margin

      setScreenPosition({ x, y, visible: isVisible })
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [position, camera, size, visible])

  if (!screenPosition.visible) return null

  return (
    <div
      ref={labelRef}
      style={{
        position: "absolute",
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 1000,
        userSelect: "none",
      }}
    >
      <div
        style={{
          backgroundColor,
          color: textColor,
          padding: "4px 10px",
          borderRadius: "16px",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "Inter, system-ui, sans-serif",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span style={{ opacity: 0.9 }}>{prefix}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {value.toFixed(2)}
          <span style={{ fontSize: "11px", marginLeft: "2px", opacity: 0.8 }}>{unit}</span>
        </span>
      </div>

      {/* Connector line (optional - pointing to the position) */}
      <div
        style={{
          position: "absolute",
          bottom: "-6px",
          left: "50%",
          width: "2px",
          height: "6px",
          backgroundColor,
          opacity: 0.4,
          transform: "translateX(-50%)",
        }}
      />
    </div>
  )
}

/**
 * HTML Container for 3D Labels
 * Place this in your viewport to render HTML labels
 */
export function Label3DContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      {children}
    </div>
  )
}
