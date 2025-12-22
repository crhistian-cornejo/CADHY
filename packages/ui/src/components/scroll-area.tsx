"use client"

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { cn } from "@cadhy/ui/lib/utils"
import * as React from "react"

interface ScrollAreaProps extends ScrollAreaPrimitive.Root.Props {
  /** Show fade masks at top/bottom when content overflows */
  showFadeMasks?: boolean
  /** Height of the fade mask gradient */
  fadeMaskHeight?: string
}

function ScrollArea({
  className,
  children,
  showFadeMasks = false,
  fadeMaskHeight = "2rem",
  ...props
}: ScrollAreaProps) {
  const [canScrollUp, setCanScrollUp] = React.useState(false)
  const [canScrollDown, setCanScrollDown] = React.useState(false)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!showFadeMasks) return

    const viewport = viewportRef.current
    if (!viewport) return

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport
      setCanScrollUp(scrollTop > 1)
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1)
    }

    checkScroll()
    viewport.addEventListener("scroll", checkScroll, { passive: true })

    // ResizeObserver to handle content size changes
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(viewport)

    return () => {
      viewport.removeEventListener("scroll", checkScroll)
      resizeObserver.disconnect()
    }
  }, [showFadeMasks])

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full overflow-auto rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>

      {/* Fade masks */}
      {showFadeMasks && (
        <>
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-popover to-transparent transition-opacity duration-150",
              canScrollUp ? "opacity-100" : "opacity-0"
            )}
            style={{ height: fadeMaskHeight }}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-popover to-transparent transition-opacity duration-150",
              canScrollDown ? "opacity-100" : "opacity-0"
            )}
            style={{ height: fadeMaskHeight }}
          />
        </>
      )}

      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "data-horizontal:h-1.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-1.5 data-vertical:border-l data-vertical:border-l-transparent flex touch-none p-px transition-colors select-none",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="rounded-full bg-border relative flex-1"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
