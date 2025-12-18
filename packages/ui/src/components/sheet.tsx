"use client"

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { Button } from "@cadhy/ui/components/button"

import { cn } from "@cadhy/ui/lib/utils"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  asChild,
  children,
  ...props
}: SheetPrimitive.Trigger.Props & { asChild?: boolean }) {
  // Base UI 1.0 uses render prop instead of asChild
  // If asChild is true, we use render prop to merge props with the child
  if (asChild && React.isValidElement(children)) {
    return (
      <SheetPrimitive.Trigger
        data-slot="sheet-trigger"
        render={(triggerProps) => React.cloneElement(children, triggerProps)}
        {...props}
      />
    )
  }
  return (
    <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props}>
      {children}
    </SheetPrimitive.Trigger>
  )
}

function SheetClose({
  asChild,
  children,
  ...props
}: SheetPrimitive.Close.Props & { asChild?: boolean }) {
  // Base UI 1.0 uses render prop instead of asChild
  // If asChild is true, we use render prop to merge props with the child
  if (asChild && React.isValidElement(children)) {
    return (
      <SheetPrimitive.Close
        data-slot="sheet-close"
        render={(closeProps) => React.cloneElement(children, closeProps)}
        {...props}
      />
    )
  }
  return (
    <SheetPrimitive.Close data-slot="sheet-close" {...props}>
      {children}
    </SheetPrimitive.Close>
  )
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const sideClasses = {
    top: "inset-x-0 top-0 border-b",
    bottom: "inset-x-0 bottom-0 border-t",
    left: "inset-y-0 left-0 top-0 w-3/4 border-r sm:max-w-sm",
    right: "inset-y-0 right-0 top-0 w-3/4 border-l sm:max-w-sm",
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "bg-background fixed z-50 flex flex-col gap-4 bg-clip-padding text-sm shadow-lg transition duration-200 ease-in-out",
          "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0",
          side === "right" && "data-closed:slide-out-to-right-10 data-open:slide-in-from-right-10",
          side === "left" && "data-closed:slide-out-to-left-10 data-open:slide-in-from-left-10",
          side === "top" && "data-closed:slide-out-to-top-10 data-open:slide-in-from-top-10",
          side === "bottom" &&
            "data-closed:slide-out-to-bottom-10 data-open:slide-in-from-bottom-10",
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4 rounded-full"
                size="icon"
                aria-label="Close menu"
                title="Close menu"
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-5" />
            <span className="sr-only">Close menu</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("gap-1.5 p-4 flex flex-col", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("gap-2 p-4 mt-auto flex flex-col", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-medium", className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
