"use client"

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@cadhy/ui/lib/utils"
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
        "fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-out",
        "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
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
          "bg-background fixed z-50 flex flex-col gap-4 shadow-2xl",
          "transition-transform duration-300 ease-out",
          side === "right" &&
            "data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
          side === "left" &&
            "data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
          side === "top" &&
            "data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
          side === "bottom" &&
            "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close menu"
            title="Close menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
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
