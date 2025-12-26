"use client"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@cadhy/ui/lib/utils"
import * as React from "react"

function HoverCard({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="hover-card" {...props} />
}

function HoverCardTrigger({
  asChild,
  children,
  ...props
}: PopoverPrimitive.Trigger.Props & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return <PopoverPrimitive.Trigger data-slot="hover-card-trigger" render={children} {...props} />
  }
  return (
    <PopoverPrimitive.Trigger data-slot="hover-card-trigger" {...props}>
      {children}
    </PopoverPrimitive.Trigger>
  )
}

const HoverCardContent = React.forwardRef<
  HTMLDivElement,
  PopoverPrimitive.Popup.Props &
    Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">
>(
  (
    { className, align = "center", alignOffset = 0, side = "bottom", sideOffset = 4, ...props },
    ref
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          ref={ref}
          data-slot="hover-card-content"
          className={cn(
            "w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
)
HoverCardContent.displayName = "HoverCardContent"

export { HoverCard, HoverCardContent, HoverCardTrigger }
