import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "@cadhy/ui/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("gap-2 group/tabs flex data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "rounded-2xl p-[3px] group-data-horizontal/tabs:h-9 data-[variant=line]:rounded-none group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted dark:bg-muted/40",
        line: "gap-1 bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // Base styles - alignment and layout
        "gap-1.5 rounded-2xl border border-transparent px-3 text-sm font-medium",
        "relative inline-flex h-full flex-1 items-center justify-center whitespace-nowrap",
        "transition-all duration-200",
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
        "group-data-[variant=line]/tabs-list:py-2",

        // Icon styles
        "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",

        // Focus styles
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:outline-1",

        // Disabled styles
        "disabled:pointer-events-none disabled:opacity-50",

        // Default variant - inactive state
        "group-data-[variant=default]/tabs-list:text-foreground/60",
        "dark:group-data-[variant=default]/tabs-list:text-muted-foreground",
        "group-data-[variant=default]/tabs-list:hover:text-foreground",
        "dark:group-data-[variant=default]/tabs-list:hover:text-foreground",
        "group-data-[variant=default]/tabs-list:hover:bg-accent/40",
        "dark:group-data-[variant=default]/tabs-list:hover:bg-accent/30",

        // Default variant - active/selected state
        // We use both data-active and data-selected to ensure persistence and responsiveness
        "group-data-[variant=default]/tabs-list:data-active:bg-background",
        "group-data-[variant=default]/tabs-list:data-selected:bg-background",
        "group-data-[variant=default]/tabs-list:data-active:text-foreground",
        "group-data-[variant=default]/tabs-list:data-selected:text-foreground",
        "group-data-[variant=default]/tabs-list:data-active:shadow-sm",
        "group-data-[variant=default]/tabs-list:data-selected:shadow-sm",

        // Dark mode active state - SOLID PRIMARY PILL
        "dark:group-data-[variant=default]/tabs-list:data-active:bg-primary",
        "dark:group-data-[variant=default]/tabs-list:data-selected:bg-primary",
        "dark:group-data-[variant=default]/tabs-list:data-active:text-primary-foreground",
        "dark:group-data-[variant=default]/tabs-list:data-selected:text-primary-foreground",
        "dark:group-data-[variant=default]/tabs-list:data-active:shadow-[0_0_15px_rgba(0,0,0,0.3)]",
        "dark:group-data-[variant=default]/tabs-list:data-selected:shadow-[0_0_15px_rgba(0,0,0,0.3)]",
        "dark:group-data-[variant=default]/tabs-list:data-active:border-primary/20",
        "dark:group-data-[variant=default]/tabs-list:data-selected:border-primary/20",

        // Line variant - inactive state
        "group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:text-foreground/60",
        "dark:group-data-[variant=line]/tabs-list:text-muted-foreground",
        "group-data-[variant=line]/tabs-list:hover:text-foreground",
        "dark:group-data-[variant=line]/tabs-list:hover:text-foreground",
        "group-data-[variant=line]/tabs-list:hover:bg-accent/30",
        "dark:group-data-[variant=line]/tabs-list:hover:bg-accent/20",

        // Line variant - active state
        "group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "group-data-[variant=line]/tabs-list:data-selected:bg-transparent",
        "dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "dark:group-data-[variant=line]/tabs-list:data-selected:bg-transparent",
        "group-data-[variant=line]/tabs-list:data-active:text-foreground",
        "group-data-[variant=line]/tabs-list:data-selected:text-foreground",
        "dark:group-data-[variant=line]/tabs-list:data-active:text-primary",
        "dark:group-data-[variant=line]/tabs-list:data-selected:text-primary",

        // Active indicator (underline for line variant)
        "after:bg-primary after:absolute after:opacity-0 after:transition-opacity after:duration-200",
        "group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-[2px]",
        "group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-[2px]",
        "group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        "group-data-[variant=line]/tabs-list:data-selected:after:opacity-100",
        "dark:group-data-[variant=line]/tabs-list:data-active:after:bg-primary",
        "dark:group-data-[variant=line]/tabs-list:data-selected:after:bg-primary",

        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("text-sm flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
