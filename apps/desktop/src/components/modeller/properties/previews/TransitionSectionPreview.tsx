/**
 * TransitionSectionPreview Component - CADHY
 *
 * SVG preview showing inlet and outlet sections of a transition.
 */

import React from "react"
import type { TransitionSection } from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

export interface TransitionSectionPreviewProps {
  inlet: TransitionSection
  outlet: TransitionSection
}

// ============================================================================
// HELPERS
// ============================================================================

function renderSection(section: TransitionSection, x: number, label: string): React.ReactNode {
  const w = 35
  const h = 30
  const y = 10

  if (section.sectionType === "rectangular") {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="#0ea5e9"
          fillOpacity="0.2"
          stroke="#0ea5e9"
          strokeWidth="1.5"
        />
        <text
          x={x + w / 2}
          y={y + h + 12}
          textAnchor="middle"
          className="fill-muted-foreground text-[7px]"
        >
          {label}
        </text>
      </g>
    )
  } else if (section.sectionType === "trapezoidal") {
    const slope = Math.min(section.sideSlope || 1.5, 2)
    const slopeOffset = (h / 30) * 10 * (slope / 1.5)
    const points = `
      ${x},${y + h}
      ${x - slopeOffset},${y}
      ${x + w + slopeOffset},${y}
      ${x + w},${y + h}
    `
    return (
      <g>
        <polygon
          points={points}
          fill="#0ea5e9"
          fillOpacity="0.2"
          stroke="#0ea5e9"
          strokeWidth="1.5"
        />
        <text
          x={x + w / 2}
          y={y + h + 12}
          textAnchor="middle"
          className="fill-muted-foreground text-[7px]"
        >
          {label}
        </text>
      </g>
    )
  } else {
    // triangular
    const slope = Math.min(section.sideSlope || 1, 2)
    const halfW = h * slope * 0.5
    return (
      <g>
        <polygon
          points={`${x + w / 2},${y + h} ${x + w / 2 - halfW},${y} ${x + w / 2 + halfW},${y}`}
          fill="#0ea5e9"
          fillOpacity="0.2"
          stroke="#0ea5e9"
          strokeWidth="1.5"
        />
        <text
          x={x + w / 2}
          y={y + h + 12}
          textAnchor="middle"
          className="fill-muted-foreground text-[7px]"
        >
          {label}
        </text>
      </g>
    )
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TransitionSectionPreview = React.memo(function TransitionSectionPreview({
  inlet,
  outlet,
}: TransitionSectionPreviewProps) {
  const viewBox = "0 0 120 60"

  return (
    <svg viewBox={viewBox} className="w-full h-14 mb-2">
      {renderSection(inlet, 10, "Inlet")}
      {/* Arrow */}
      <path
        d="M 52 25 L 68 25 M 64 20 L 68 25 L 64 30"
        stroke="#64748b"
        strokeWidth="1.5"
        fill="none"
      />
      {renderSection(outlet, 75, "Outlet")}
    </svg>
  )
})
