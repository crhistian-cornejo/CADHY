"use client"

import { cn } from "@cadhy/ui/lib/utils"
import * as React from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

// ============================================================================
// ResizablePanelGroup
// ============================================================================

interface ResizablePanelGroupProps
  extends Omit<React.ComponentProps<typeof PanelGroup>, "direction"> {
  direction?: "horizontal" | "vertical"
}

function ResizablePanelGroup({
  className,
  direction = "horizontal",
  ...props
}: ResizablePanelGroupProps) {
  return (
    <PanelGroup
      data-slot="resizable-panel-group"
      direction={direction}
      className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
      {...props}
    />
  )
}

// ============================================================================
// ResizablePanel
// ============================================================================

const ResizablePanel = React.forwardRef<
  React.ElementRef<typeof Panel>,
  React.ComponentProps<typeof Panel>
>(({ className, ...props }, ref) => (
  <Panel ref={ref} data-slot="resizable-panel" className={cn("relative", className)} {...props} />
))
ResizablePanel.displayName = "ResizablePanel"

// ============================================================================
// ResizableHandle
// ============================================================================

interface ResizableHandleProps
  extends Omit<React.ComponentProps<typeof PanelResizeHandle>, "children"> {
  withHandle?: boolean
}

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof PanelResizeHandle>,
  ResizableHandleProps
>(({ className, withHandle = true, ...props }, _ref) => (
  <PanelResizeHandle
    data-slot="resizable-handle"
    className={cn(
      // Base styles - visible line with cursor
      "relative flex items-center justify-center",
      "bg-border transition-colors",
      // Horizontal handle (default)
      "w-px cursor-col-resize",
      // Hover/active states
      "hover:bg-accent",
      "data-[resize-handle-active]:bg-accent",
      // No focus ring - avoid visual noise
      "outline-none focus:outline-none focus-visible:outline-none",
      // Vertical direction overrides
      "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
      "data-[panel-group-direction=vertical]:cursor-row-resize",
      "[&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="pointer-events-none z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-2.5"
          role="img"
          aria-label="Resize handle"
        >
          <title>Resize handle</title>
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </div>
    )}
  </PanelResizeHandle>
))
ResizableHandle.displayName = "ResizableHandle"

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
