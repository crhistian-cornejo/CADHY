import { cn } from "@cadhy/ui/lib/utils"
import type * as React from "react"

/**
 * macOS-style keyboard symbols
 */
export const KbdSymbols = {
  command: "⌘",
  shift: "⇧",
  option: "⌥",
  control: "⌃",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  enter: "↵",
  delete: "⌫",
  escape: "⎋",
  tab: "⇥",
  capslock: "⇪",
} as const

/**
 * Helper to format keyboard shortcuts with macOS-style symbols.
 * Replaces 'Shift+', 'Ctrl+', 'Cmd+', 'Opt+', 'Alt+' with their respective symbols.
 */
export function formatKbd(kbd: string): string {
  if (!kbd) return ""
  return kbd
    .replace(/Shift\+/g, KbdSymbols.shift)
    .replace(/Ctrl\+/g, KbdSymbols.control)
    .replace(/Cmd\+/g, KbdSymbols.command)
    .replace(/Opt\+/g, KbdSymbols.option)
    .replace(/Alt\+/g, KbdSymbols.option)
    .replace(/Return|Enter/g, KbdSymbols.enter)
    .replace(/Esc/g, KbdSymbols.escape)
    .replace(/Tab/g, KbdSymbols.tab)
}

interface KbdProps extends React.ComponentProps<"kbd"> {
  /** Use inverted colors for dark backgrounds (e.g., inside tooltips) */
  variant?: "default" | "inverted"
}

function Kbd({ className, variant = "default", ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-[20px] select-none items-center justify-center gap-1 rounded-md px-1.5 font-medium font-sans text-[10px] transition-colors [&_svg:not([class*='size-'])]:size-3",
        variant === "default" &&
          "border border-border/50 bg-muted/50 text-muted-foreground shadow-[0_1px_0_rgba(0,0,0,0.1)] group-hover:bg-muted group-hover:text-foreground",
        variant === "inverted" && "bg-background/25 text-background font-semibold",
        className
      )}
      data-slot="kbd"
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      data-slot="kbd-group"
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
