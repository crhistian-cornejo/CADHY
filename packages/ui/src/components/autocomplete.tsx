"use client"

import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete"
import { Input } from "@cadhy/ui/components/input"
import { ScrollArea } from "@cadhy/ui/components/scroll-area"
import { cn } from "@cadhy/ui/lib/utils"
import { ArrowDown01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

const Autocomplete = AutocompletePrimitive.Root

type InputSize = "sm" | "md" | "lg"

type AutocompleteInputProps = Omit<AutocompletePrimitive.Input.Props, "size"> & {
  showTrigger?: boolean
  showClear?: boolean
  startAddon?: React.ReactNode
  size?: InputSize
}

const AutocompleteInput = React.forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ className, showTrigger = false, showClear = false, startAddon, size, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {startAddon && (
          <div
            aria-hidden="true"
            className="[&_svg]:-mx-0.5 pointer-events-none absolute inset-y-0 start-px z-10 flex items-center ps-3 opacity-80 [&_svg:not([class*='size-'])]:size-4"
            data-slot="autocomplete-start-addon"
          >
            {startAddon}
          </div>
        )}
        <AutocompletePrimitive.Input
          data-slot="autocomplete-input"
          ref={ref}
          render={<Input className={cn(startAddon && "ps-9!", className)} size={size} />}
          {...props}
        />
        {showTrigger && (
          <AutocompleteTrigger
            className={cn(
              "-translate-y-1/2 absolute top-1/2 end-0.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent opacity-80 outline-none transition-colors hover:opacity-100 has-[+[data-slot=autocomplete-clear]]:hidden [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
            )}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
          </AutocompleteTrigger>
        )}
        {showClear && (
          <AutocompleteClear
            className={cn(
              "-translate-y-1/2 absolute top-1/2 end-0.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent opacity-80 outline-none transition-colors hover:opacity-100 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
            )}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </AutocompleteClear>
        )}
      </div>
    )
  }
)

AutocompleteInput.displayName = "AutocompleteInput"

function AutocompletePopup({
  className,
  children,
  sideOffset = 4,
  ...props
}: AutocompletePrimitive.Popup.Props & {
  sideOffset?: number
}) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner
        className="z-50 select-none"
        data-slot="autocomplete-positioner"
        sideOffset={sideOffset}
      >
        <span
          className={cn(
            "relative flex max-h-full origin-(--transform-origin) rounded-lg border bg-popover bg-clip-padding transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-lg data-starting-style:scale-98 data-starting-style:opacity-0",
            className
          )}
        >
          <AutocompletePrimitive.Popup
            className="flex max-h-[min(var(--available-height),23rem)] w-(--anchor-width) max-w-(--available-width) flex-col"
            data-slot="autocomplete-popup"
            {...props}
          >
            {children}
          </AutocompletePrimitive.Popup>
        </span>
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  )
}

function AutocompleteItem({ className, children, ...props }: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      className={cn(
        "flex min-h-7 cursor-default select-none items-center rounded-sm px-2 py-1 text-sm outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50",
        className
      )}
      data-slot="autocomplete-item"
      {...props}
    >
      {children}
    </AutocompletePrimitive.Item>
  )
}

function AutocompleteSeparator({ className, ...props }: AutocompletePrimitive.Separator.Props) {
  return (
    <AutocompletePrimitive.Separator
      className={cn("mx-2 my-1 h-px bg-border last:hidden", className)}
      data-slot="autocomplete-separator"
      {...props}
    />
  )
}

function AutocompleteGroup({ className, ...props }: AutocompletePrimitive.Group.Props) {
  return (
    <AutocompletePrimitive.Group
      className={cn("[[role=group]+&]:mt-1.5", className)}
      data-slot="autocomplete-group"
      {...props}
    />
  )
}

function AutocompleteGroupLabel({ className, ...props }: AutocompletePrimitive.GroupLabel.Props) {
  return (
    <AutocompletePrimitive.GroupLabel
      className={cn("px-2 py-1.5 font-medium text-muted-foreground text-xs", className)}
      data-slot="autocomplete-group-label"
      {...props}
    />
  )
}

function AutocompleteEmpty({ className, ...props }: AutocompletePrimitive.Empty.Props) {
  return (
    <AutocompletePrimitive.Empty
      className={cn("not-empty:p-2 text-center text-sm text-muted-foreground", className)}
      data-slot="autocomplete-empty"
      {...props}
    />
  )
}

function AutocompleteRow({ className, ...props }: AutocompletePrimitive.Row.Props) {
  return <AutocompletePrimitive.Row className={className} data-slot="autocomplete-row" {...props} />
}

function AutocompleteValue({ ...props }: AutocompletePrimitive.Value.Props) {
  return <AutocompletePrimitive.Value data-slot="autocomplete-value" {...props} />
}

function AutocompleteList({
  className,
  scrollAreaClassName,
  showFadeMasks = false,
  ...props
}: AutocompletePrimitive.List.Props & {
  scrollAreaClassName?: string
  showFadeMasks?: boolean
}) {
  return (
    <ScrollArea className={cn("min-h-0 flex-1", scrollAreaClassName)} showFadeMasks={showFadeMasks}>
      <AutocompletePrimitive.List
        className={cn("not-empty:scroll-py-1 not-empty:p-1", className)}
        data-slot="autocomplete-list"
        {...props}
      />
    </ScrollArea>
  )
}

function AutocompleteClear({ className, children, ...props }: AutocompletePrimitive.Clear.Props) {
  return (
    <AutocompletePrimitive.Clear
      className={cn(
        "-translate-y-1/2 absolute end-0.5 top-1/2 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent opacity-80 outline-none transition-colors hover:opacity-100 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      data-slot="autocomplete-clear"
      {...props}
    >
      {children ?? <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />}
    </AutocompletePrimitive.Clear>
  )
}

function AutocompleteStatus({ className, ...props }: AutocompletePrimitive.Status.Props) {
  return (
    <AutocompletePrimitive.Status
      className={cn(
        "px-3 py-2 font-medium text-muted-foreground text-xs empty:m-0 empty:p-0",
        className
      )}
      data-slot="autocomplete-status"
      {...props}
    />
  )
}

function AutocompleteCollection({ ...props }: AutocompletePrimitive.Collection.Props) {
  return <AutocompletePrimitive.Collection data-slot="autocomplete-collection" {...props} />
}

function AutocompleteTrigger({ className, ...props }: AutocompletePrimitive.Trigger.Props) {
  return (
    <AutocompletePrimitive.Trigger
      className={className}
      data-slot="autocomplete-trigger"
      {...props}
    />
  )
}

export {
  Autocomplete,
  AutocompleteInput,
  AutocompleteTrigger,
  AutocompletePopup,
  AutocompleteItem,
  AutocompleteSeparator,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteEmpty,
  AutocompleteValue,
  AutocompleteList,
  AutocompleteClear,
  AutocompleteStatus,
  AutocompleteRow,
  AutocompleteCollection,
}
