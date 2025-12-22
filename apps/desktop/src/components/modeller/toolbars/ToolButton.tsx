/**
 * ToolButton Component
 *
 * Reusable button for toolbar tools with tooltip and optional shortcut display.
 */

import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from "@cadhy/ui"
import type { Cursor01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import React from "react"

export interface ToolButtonProps {
  icon: typeof Cursor01Icon
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  shortcut?: string
  className?: string
}

export const ToolButton = React.memo(function ToolButton({
  icon,
  label,
  active,
  disabled,
  onClick,
  shortcut,
  className,
}: ToolButtonProps) {
  // Guard against undefined/invalid icons to prevent HugeiconsIcon crashes
  if (!icon) {
    console.warn(`ToolButton: Missing icon for "${label}"`)
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "secondary" : "ghost"}
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
            className={cn(
              "h-7 w-7",
              active && "bg-primary/20 text-primary hover:bg-primary/30",
              className
            )}
          >
            <HugeiconsIcon icon={icon} className="size-4" />
          </Button>
        }
      />
      <TooltipContent side="bottom" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="rounded bg-background/20 px-1.5 py-0.5 text-[10px] font-mono text-inherit">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
})

export default ToolButton
