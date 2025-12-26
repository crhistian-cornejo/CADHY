"use client"

import { cn } from "@cadhy/ui/lib/utils"
import * as React from "react"

interface FrameProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated"
  padding?: "none" | "sm" | "md" | "lg"
}

const Frame = React.forwardRef<HTMLDivElement, FrameProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    const variantClasses = {
      default: "bg-background",
      bordered: "border bg-background rounded-lg",
      elevated: "border bg-background rounded-lg shadow-md",
    }

    const paddingClasses = {
      none: "",
      sm: "p-2",
      md: "p-4",
      lg: "p-6",
    }

    return (
      <div
        ref={ref}
        data-slot="frame"
        className={cn(variantClasses[variant], paddingClasses[padding], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Frame.displayName = "Frame"

const FrameHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="frame-header"
      className={cn("mb-4 flex items-center justify-between", className)}
      {...props}
    />
  )
)
FrameHeader.displayName = "FrameHeader"

const FrameTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      data-slot="frame-title"
      className={cn("text-lg font-semibold leading-none", className)}
      {...props}
    />
  )
)
FrameTitle.displayName = "FrameTitle"

const FrameDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="frame-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
FrameDescription.displayName = "FrameDescription"

const FrameContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="frame-content" className={cn("", className)} {...props} />
  )
)
FrameContent.displayName = "FrameContent"

const FrameFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="frame-footer"
      className={cn("mt-4 flex items-center justify-end gap-2", className)}
      {...props}
    />
  )
)
FrameFooter.displayName = "FrameFooter"

export { Frame, FrameContent, FrameDescription, FrameFooter, FrameHeader, FrameTitle }
