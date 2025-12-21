/**
 * ChuteSectionPreview Component - CADHY
 *
 * SVG side-view preview of chute showing slope and optional stilling basin.
 */

import React from "react"
import type { ChuteType } from "@/stores/modeller-store"

// ============================================================================
// TYPES
// ============================================================================

export interface ChuteSectionPreviewProps {
  width: number
  depth: number
  sideSlope: number
  chuteType: ChuteType
  stillingBasin: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ChuteSectionPreview = React.memo(function ChuteSectionPreview({
  chuteType,
  stillingBasin,
}: ChuteSectionPreviewProps) {
  const viewBox = "0 0 140 60"

  // Simplified side view of chute showing slope and basin
  const chuteStartX = 10
  const chuteStartY = 12
  const chuteEndX = 70
  const chuteEndY = 40
  const basinLength = 35

  // Chute type indicator
  const renderChutePattern = () => {
    if (chuteType === "stepped") {
      // Show steps
      const steps = 4
      const stepDx = (chuteEndX - chuteStartX) / steps
      const stepDy = (chuteEndY - chuteStartY) / steps
      return Array.from({ length: steps }, (_, i) => (
        <path
          key={i}
          d={`M ${chuteStartX + i * stepDx} ${chuteStartY + i * stepDy}
              L ${chuteStartX + i * stepDx} ${chuteStartY + (i + 1) * stepDy}
              L ${chuteStartX + (i + 1) * stepDx} ${chuteStartY + (i + 1) * stepDy}`}
          stroke="#0ea5e9"
          strokeWidth="1.5"
          fill="none"
        />
      ))
    } else if (chuteType === "baffled") {
      // Show baffles as small blocks
      return (
        <>
          <line
            x1={chuteStartX}
            y1={chuteStartY}
            x2={chuteEndX}
            y2={chuteEndY}
            stroke="#0ea5e9"
            strokeWidth="2"
          />
          {[0.25, 0.5, 0.75].map((t, i) => {
            const bx = chuteStartX + t * (chuteEndX - chuteStartX)
            const by = chuteStartY + t * (chuteEndY - chuteStartY)
            return (
              <rect
                key={i}
                x={bx - 2}
                y={by - 4}
                width={4}
                height={4}
                fill="#64748b"
                stroke="#64748b"
              />
            )
          })}
        </>
      )
    } else {
      // Smooth chute - just a line
      return (
        <line
          x1={chuteStartX}
          y1={chuteStartY}
          x2={chuteEndX}
          y2={chuteEndY}
          stroke="#0ea5e9"
          strokeWidth="2"
        />
      )
    }
  }

  return (
    <svg viewBox={viewBox} className="w-full h-16 mb-2">
      {/* Upstream channel */}
      <rect
        x={2}
        y={8}
        width={10}
        height={8}
        fill="#64748b"
        fillOpacity="0.3"
        stroke="#64748b"
        strokeWidth="1"
      />

      {/* Chute */}
      {renderChutePattern()}

      {/* Stilling basin (if present) */}
      {stillingBasin && (
        <g>
          {/* Basin floor */}
          <rect
            x={chuteEndX}
            y={chuteEndY}
            width={basinLength}
            height={6}
            fill="#64748b"
            fillOpacity="0.4"
            stroke="#64748b"
            strokeWidth="1"
          />
          {/* Basin depth */}
          <rect
            x={chuteEndX}
            y={chuteEndY - 8}
            width={basinLength}
            height={8}
            fill="#0ea5e9"
            fillOpacity="0.2"
            stroke="#0ea5e9"
            strokeWidth="1"
          />
          {/* End sill */}
          <rect
            x={chuteEndX + basinLength - 3}
            y={chuteEndY - 10}
            width={3}
            height={10}
            fill="#64748b"
            fillOpacity="0.6"
            stroke="#64748b"
            strokeWidth="1"
          />
        </g>
      )}

      {/* Downstream channel */}
      <rect
        x={chuteEndX + basinLength + 2}
        y={chuteEndY - 4}
        width={20}
        height={8}
        fill="#64748b"
        fillOpacity="0.3"
        stroke="#64748b"
        strokeWidth="1"
      />

      {/* Labels */}
      <text x={40} y={58} textAnchor="middle" className="fill-muted-foreground text-[7px]">
        Chute
      </text>
      {stillingBasin && (
        <text
          x={chuteEndX + basinLength / 2}
          y={58}
          textAnchor="middle"
          className="fill-muted-foreground text-[7px]"
        >
          Basin
        </text>
      )}
    </svg>
  )
})
