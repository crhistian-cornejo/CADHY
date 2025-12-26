"use client"

import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "@cadhy/ui/lib/utils"
import * as React from "react"

function ContextMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="context-menu" {...props} />
}

function ContextMenuTrigger({
  asChild,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  asChild?: boolean
  children: React.ReactNode
}) {
  if (asChild && React.isValidElement(children)) {
    return (
      <div
        data-slot="context-menu-trigger"
        onContextMenu={(e) => {
          e.preventDefault()
          props.onClick?.(e as any)
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
  return (
    <div
      data-slot="context-menu-trigger"
      onContextMenu={(e) => {
        e.preventDefault()
        props.onClick?.(e as any)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

const ContextMenuContent = React.forwardRef<HTMLDivElement, MenuPrimitive.Positioner.Props>(
  ({ className, ...props }, ref) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        ref={ref}
        data-slot="context-menu-content"
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95",
          className
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  )
)
ContextMenuContent.displayName = "ContextMenuContent"

const ContextMenuItem = React.forwardRef<HTMLDivElement, MenuPrimitive.Item.Props>(
  ({ className, ...props }, ref) => (
    <MenuPrimitive.Item
      ref={ref}
      data-slot="context-menu-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  )
)
ContextMenuItem.displayName = "ContextMenuItem"

const ContextMenuSeparator = React.forwardRef<HTMLDivElement, MenuPrimitive.Separator.Props>(
  ({ className, ...props }, ref) => (
    <MenuPrimitive.Separator
      ref={ref}
      data-slot="context-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  )
)
ContextMenuSeparator.displayName = "ContextMenuSeparator"

export {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
}
