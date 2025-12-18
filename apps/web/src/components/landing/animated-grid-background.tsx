/**
 * Animated Grid Background Component
 *
 * Interactive grid background with mouse-following mask effect.
 * Ported from desktop modeler view.
 */

import {
  type MotionValue,
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
} from "motion/react"
import { useRef } from "react"

function GridPattern({
  offsetX,
  offsetY,
}: {
  offsetX: MotionValue<number>
  offsetY: MotionValue<number>
}) {
  return (
    <svg className="w-full h-full">
      <defs>
        <motion.pattern
          id="hero-grid-pattern"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-grid-pattern)" />
    </svg>
  )
}

export function AnimatedGridBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - left)
    mouseY.set(e.clientY - top)
  }

  const gridOffsetX = useMotionValue(0)
  const gridOffsetY = useMotionValue(0)

  const speedX = 0.3
  const speedY = 0.3

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get()
    const currentY = gridOffsetY.get()
    gridOffsetX.set((currentX + speedX) % 40)
    gridOffsetY.set((currentY + speedY) % 40)
  })

  const maskImage = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, black, transparent)`

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="absolute inset-0 overflow-hidden"
    >
      {/* Base grid - very subtle */}
      <div className="absolute inset-0 opacity-[0.03]">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>

      {/* Interactive grid - follows mouse */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>

      {/* Ambient glow effects - very subtle */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-[-15%] top-[-15%] w-[35%] h-[35%] rounded-full bg-primary/5 dark:bg-primary/3 blur-[100px]" />
        <div className="absolute left-[-10%] bottom-[-15%] w-[35%] h-[35%] rounded-full bg-blue-500/5 dark:bg-blue-600/3 blur-[100px]" />
      </div>
    </div>
  )
}
