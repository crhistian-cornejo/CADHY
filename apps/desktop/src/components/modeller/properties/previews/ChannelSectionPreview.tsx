/**
 * ChannelSectionPreview Component - CADHY
 *
 * SVG preview of channel cross-section geometry.
 * Supports rectangular, trapezoidal, and triangular sections.
 */

import React from "react"
import type {
  ChannelSection,
  RectangularSection,
  TrapezoidalSection,
  TriangularSection,
} from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

export interface ChannelSectionPreviewProps {
  section: ChannelSection
  thickness?: number
  showDimensions?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ChannelSectionPreview = React.memo(function ChannelSectionPreview({
  section,
  showDimensions = true,
}: ChannelSectionPreviewProps) {
  const viewBox = "0 0 100 60"

  const renderSection = () => {
    switch (section.type) {
      case "rectangular": {
        const s = section as RectangularSection
        const w = 60 // visual width
        const h = 35 // visual height
        const x = 20
        const y = 10 // top of channel (opening)
        const wt = 4 // visual wall thickness
        const ft = 4 // visual floor thickness

        // Open channel: opening at TOP (y), floor at BOTTOM (y + h)
        return (
          <g>
            {/* Left wall */}
            <rect
              x={x - wt}
              y={y}
              width={wt}
              height={h + ft}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Right wall */}
            <rect
              x={x + w}
              y={y}
              width={wt}
              height={h + ft}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Floor at BOTTOM */}
            <rect
              x={x - wt}
              y={y + h}
              width={w + wt * 2}
              height={ft}
              fill="#64748b"
              fillOpacity="0.4"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Inner section (water area) - U shape OPEN at top */}
            <polyline
              points={`${x},${y} ${x},${y + h} ${x + w},${y + h} ${x + w},${y}`}
              fill="#0ea5e9"
              fillOpacity="0.2"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Water surface indicator (dashed line at water level) */}
            <line
              x1={x + 5}
              y1={y + 8}
              x2={x + w - 5}
              y2={y + 8}
              stroke="#0ea5e9"
              strokeWidth="1"
              strokeDasharray="3,2"
              opacity="0.6"
            />
            {/* Dimensions */}
            {showDimensions && (
              <>
                <text
                  x={50}
                  y={58}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px]"
                >
                  b={s.width?.toFixed(2)}m
                </text>
                <text x={92} y={30} textAnchor="start" className="fill-muted-foreground text-[8px]">
                  y={s.depth?.toFixed(2)}m
                </text>
              </>
            )}
          </g>
        )
      }

      case "trapezoidal": {
        const s = section as TrapezoidalSection
        const bw = 40 // visual bottom width
        const h = 35
        const y = 10 // top of channel (opening)
        const slope = Math.min(s.sideSlope || 1.5, 2) // cap visual slope
        const slopeOffset = (h / 35) * 15 * (slope / 1.5)
        const wt = 4 // wall thickness

        // Trapezoidal open channel
        const innerLeft = 50 - bw / 2
        const innerRight = 50 + bw / 2
        const outerLeft = 50 - bw / 2 - slopeOffset
        const outerRight = 50 + bw / 2 + slopeOffset

        return (
          <g>
            {/* Left wall */}
            <path
              d={`M ${outerLeft - wt} ${y} L ${innerLeft - wt} ${y + h} L ${innerLeft - wt} ${y + h + wt} L ${outerLeft - wt} ${y + h + wt} L ${outerLeft - wt} ${y}`}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Right wall */}
            <path
              d={`M ${outerRight + wt} ${y} L ${innerRight + wt} ${y + h} L ${innerRight + wt} ${y + h + wt} L ${outerRight + wt} ${y + h + wt} L ${outerRight + wt} ${y}`}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Floor at bottom */}
            <path
              d={`M ${innerLeft - wt} ${y + h} L ${innerRight + wt} ${y + h} L ${innerRight + wt} ${y + h + wt} L ${innerLeft - wt} ${y + h + wt} Z`}
              fill="#64748b"
              fillOpacity="0.4"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Inner section (water area) */}
            <polyline
              points={`${outerLeft},${y} ${innerLeft},${y + h} ${innerRight},${y + h} ${outerRight},${y}`}
              fill="#0ea5e9"
              fillOpacity="0.2"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Water surface indicator */}
            <line
              x1={outerLeft + 5}
              y1={y + 8}
              x2={outerRight - 5}
              y2={y + 8}
              stroke="#0ea5e9"
              strokeWidth="1"
              strokeDasharray="3,2"
              opacity="0.6"
            />
            {/* Dimensions */}
            {showDimensions && (
              <>
                <text
                  x={50}
                  y={58}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px]"
                >
                  b={s.bottomWidth?.toFixed(2)}m, z={s.sideSlope}
                </text>
                <text x={95} y={30} textAnchor="start" className="fill-muted-foreground text-[8px]">
                  y={s.depth?.toFixed(2)}m
                </text>
              </>
            )}
          </g>
        )
      }

      case "triangular": {
        const s = section as TriangularSection
        const h = 35
        const y = 10 // top of channel (opening)
        const slope = Math.min(s.sideSlope || 1, 2)
        const halfW = h * slope
        const wt = 4 // wall thickness

        // Triangular open channel: V shape with opening at TOP
        return (
          <g>
            {/* Left wall */}
            <path
              d={`M ${50 - halfW - wt} ${y} L 50 ${y + h + wt} L ${50 - wt / 2} ${y + h + wt} L ${50 - halfW} ${y} Z`}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Right wall */}
            <path
              d={`M ${50 + halfW + wt} ${y} L 50 ${y + h + wt} L ${50 + wt / 2} ${y + h + wt} L ${50 + halfW} ${y} Z`}
              fill="#64748b"
              fillOpacity="0.3"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* Inner V (water area) */}
            <polyline
              points={`${50 - halfW},${y} 50,${y + h} ${50 + halfW},${y}`}
              fill="#0ea5e9"
              fillOpacity="0.2"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Water surface indicator */}
            <line
              x1={50 - halfW + 8}
              y1={y + 8}
              x2={50 + halfW - 8}
              y2={y + 8}
              stroke="#0ea5e9"
              strokeWidth="1"
              strokeDasharray="3,2"
              opacity="0.6"
            />
            {/* Dimensions */}
            {showDimensions && (
              <>
                <text
                  x={50}
                  y={58}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px]"
                >
                  z={s.sideSlope}
                </text>
                <text x={95} y={30} textAnchor="start" className="fill-muted-foreground text-[8px]">
                  y={s.depth?.toFixed(2)}m
                </text>
              </>
            )}
          </g>
        )
      }

      default:
        return null
    }
  }

  return (
    <svg viewBox={viewBox} className="w-full h-16 mb-2">
      {renderSection()}
    </svg>
  )
})
