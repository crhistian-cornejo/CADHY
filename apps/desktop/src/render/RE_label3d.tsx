/**
 * Label3D Component - CADHY
 *
 * Displays a value label in 3D space (converted to screen space).
 * Used for showing fillet/chamfer radius values on edges.
 */

import { useFrame, useThree } from "@react-three/fiber"
import { useRef } from "react"
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
  const { camera, size } = useThree()
  const labelRef = useRef<HTMLDivElement>(null)

  // Convert 3D position to screen space on every frame
  // This is much more efficient than React state re-renders for every position change
  // especially when moving the camera.
  useFrame(() => {
    if (!visible || !labelRef.current) return

    // Clone position to avoid modifying the original
    const pos = position.clone()

    // Project to screen space
    pos.project(camera)

    // Check if behind camera
    if (pos.z > 1) {
      labelRef.current.style.display = "none"
      return
    }

    // Convert to pixel coordinates
    const x = ((pos.x + 1) / 2) * size.width
    const y = ((-pos.y + 1) / 2) * size.height

    // Check if within viewport bounds (with margin)
    const margin = 100
    const isInBounds =
      x >= -margin && x <= size.width + margin && y >= -margin && y <= size.height + margin

    if (!isInBounds) {
      labelRef.current.style.display = "none"
      return
    }

    // Update DOM directly for maximum performance (no React re-render)
    labelRef.current.style.display = "block"
    labelRef.current.style.left = `${x}px`
    labelRef.current.style.top = `${y}px`
    labelRef.current.style.transform = "translate(-50%, -50%)"
  })

  if (!visible) return null

  return (
    <div
      ref={labelRef}
      style={{
        position: "absolute",
        // Initial hidden state to prevent flash
        display: "none",
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
export function Label3DContainer({ children }: { children?: React.ReactNode }) {
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
