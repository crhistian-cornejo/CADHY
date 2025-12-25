/**
 * ToolButton Component
 *
 * Reusable button for toolbar tools with tooltip and optional shortcut display.
 */

import { Button, cn, formatKbd, Kbd, Tooltip, TooltipContent, TooltipTrigger } from "@cadhy/ui"
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
            aria-label={label}
            className={cn(
              "h-7 w-7",
              active && "bg-primary/20 text-primary hover:bg-primary/30",
              className
            )}
          >
            <HugeiconsIcon icon={icon} className="size-4" aria-hidden="true" />
          </Button>
        }
      />
      <TooltipContent side="bottom" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && <Kbd variant="inverted">{formatKbd(shortcut)}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
})

export default ToolButton
