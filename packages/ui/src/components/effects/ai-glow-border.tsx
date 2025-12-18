"use client"

import { cn } from "../../lib/utils"
import { GlowEffect } from "./glow-effect"

export interface AIGlowBorderProps {
  /** Controls gradient visibility */
  active?: boolean
  /** Border width in pixels (how far the glow extends inward) */
  borderWidth?: number
  /** Animation duration in seconds */
  duration?: number
  /** Additional CSS classes */
  className?: string
  /** Children to wrap */
  children?: React.ReactNode
}

// Gradient colors inspired by Apple Intelligence
const GRADIENT_COLORS = [
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Purple (loop back)
]

/**
 * AIGlowBorder - Animated gradient border effect for AI interactions
 *
 * Creates a soft, diffused glow on all 4 edges that fades toward the center.
 * Uses 4 separate gradient overlays (top, right, bottom, left) for full coverage.
 *
 * Inspired by Apple Intelligence visual effects.
 */
export function AIGlowBorder({
  active = false,
  borderWidth = 80,
  duration = 4,
  className,
  children,
}: AIGlowBorderProps) {
  return (
    <div className={cn("relative h-full w-full", className)}>
      {/* Top edge glow */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-10 pointer-events-none transition-opacity duration-500",
          active ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: `${borderWidth}px`,
          maskImage: `linear-gradient(to bottom, black 0%, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, black 0%, transparent 100%)`,
        }}
      >
        <GlowEffect
          colors={GRADIENT_COLORS}
          mode="colorShift"
          blur="stronger"
          duration={duration}
          scale={1.2}
        />
      </div>

      {/* Bottom edge glow */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 pointer-events-none transition-opacity duration-500",
          active ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: `${borderWidth}px`,
          maskImage: `linear-gradient(to top, black 0%, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to top, black 0%, transparent 100%)`,
        }}
      >
        <GlowEffect
          colors={GRADIENT_COLORS}
          mode="colorShift"
          blur="stronger"
          duration={duration}
          scale={1.2}
        />
      </div>

      {/* Left edge glow */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-10 pointer-events-none transition-opacity duration-500",
          active ? "opacity-100" : "opacity-0"
        )}
        style={{
          width: `${borderWidth}px`,
          maskImage: `linear-gradient(to right, black 0%, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to right, black 0%, transparent 100%)`,
        }}
      >
        <GlowEffect
          colors={GRADIENT_COLORS}
          mode="colorShift"
          blur="stronger"
          duration={duration}
          scale={1.2}
        />
      </div>

      {/* Right edge glow */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 z-10 pointer-events-none transition-opacity duration-500",
          active ? "opacity-100" : "opacity-0"
        )}
        style={{
          width: `${borderWidth}px`,
          maskImage: `linear-gradient(to left, black 0%, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to left, black 0%, transparent 100%)`,
        }}
      >
        <GlowEffect
          colors={GRADIENT_COLORS}
          mode="colorShift"
          blur="stronger"
          duration={duration}
          scale={1.2}
        />
      </div>

      {/* Content */}
      <div className="relative z-0 h-full w-full">{children}</div>
    </div>
  )
}

export default AIGlowBorder
