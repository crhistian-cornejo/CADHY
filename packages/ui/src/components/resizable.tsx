"use client"

import { cn } from "@cadhy/ui/lib/utils"
import * as React from "react"

const ResizableContext = React.createContext<{
  direction?: "horizontal" | "vertical"
}>({})

interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "horizontal" | "vertical"
  autoSaveId?: string
}

function ResizablePanelGroup({
  className,
  direction = "horizontal",
  autoSaveId,
  ...props
}: ResizablePanelGroupProps) {
  // Note: autoSaveId is accepted but not used in this simple implementation
  // Future: could implement localStorage persistence using this ID
  return (
    <ResizableContext.Provider value={{ direction }}>
      <div
        data-slot="resizable-panel-group"
        className={cn(
          "flex h-full w-full",
          direction === "horizontal" ? "flex-row" : "flex-col",
          className
        )}
        {...props}
      />
    </ResizableContext.Provider>
  )
}

interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultSize?: number
  minSize?: number
  maxSize?: number
}

const ResizablePanel = React.forwardRef<HTMLDivElement, ResizablePanelProps>(
  ({ className, defaultSize, minSize, maxSize, style, ...props }, ref) => {
    const { direction } = React.useContext(ResizableContext)
    const flexBasis = defaultSize ? `${defaultSize}%` : undefined

    return (
      <div
        ref={ref}
        data-slot="resizable-panel"
        className={cn("relative", className)}
        style={{
          flexBasis,
          flexGrow: 1,
          flexShrink: 1,
          minWidth: direction === "horizontal" && minSize ? `${minSize}%` : undefined,
          maxWidth: direction === "horizontal" && maxSize ? `${maxSize}%` : undefined,
          minHeight: direction === "vertical" && minSize ? `${minSize}%` : undefined,
          maxHeight: direction === "vertical" && maxSize ? `${maxSize}%` : undefined,
          ...style,
        }}
        {...props}
      />
    )
  }
)
ResizablePanel.displayName = "ResizablePanel"

const ResizableHandle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { direction } = React.useContext(ResizableContext)
    const isHorizontal = direction === "horizontal"

    return (
      <div
        ref={ref}
        data-slot="resizable-handle"
        className={cn(
          "relative flex items-center justify-center bg-border transition-colors hover:bg-accent",
          isHorizontal ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
          className
        )}
        {...props}
      >
        <div className={cn("z-10 rounded-sm bg-border", isHorizontal ? "h-4 w-1" : "h-1 w-4")} />
      </div>
    )
  }
)
ResizableHandle.displayName = "ResizableHandle"

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
