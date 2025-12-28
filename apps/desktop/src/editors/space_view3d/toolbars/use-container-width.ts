/**
 * useContainerWidth Hook
 *
 * Custom hook for tracking container width using ResizeObserver.
 * Used for responsive toolbar layouts.
 */

import { useEffect, useRef, useState } from "react"

/**
 * Breakpoints for responsive toolbar layouts
 */
export const TOOLBAR_BREAKPOINTS = {
  HIDE_CAMERA: 600,
  HIDE_VIEW_MODE: 500,
  HIDE_SNAP: 400,
} as const

export function useContainerWidth() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })

    observer.observe(container)
    // Initial measurement
    setWidth(container.offsetWidth)

    return () => observer.disconnect()
  }, [])

  return { containerRef, width }
}
