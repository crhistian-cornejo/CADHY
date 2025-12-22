/**
 * MenuToolButton Component
 *
 * Dropdown menu item variant of ToolButton for overflow menus.
 */

import { cn, DropdownMenuItem } from "@cadhy/ui"
import type { Cursor01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import React from "react"

export interface MenuToolButtonProps {
  icon: typeof Cursor01Icon
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  shortcut?: string
}

export const MenuToolButton = React.memo(function MenuToolButton({
  icon,
  label,
  active,
  disabled,
  onClick,
  shortcut,
}: MenuToolButtonProps) {
  // Guard against undefined/invalid icons to prevent HugeiconsIcon crashes
  if (!icon) {
    console.warn(`MenuToolButton: Missing icon for "${label}"`)
    return null
  }

  return (
    <DropdownMenuItem
      disabled={disabled}
      onClick={onClick}
      className={cn(active && "bg-primary/20 text-primary")}
    >
      <HugeiconsIcon icon={icon} className="mr-2 size-4" />
      <span className="flex-1">{label}</span>
      {shortcut && <kbd className="ml-auto text-[10px] text-muted-foreground">{shortcut}</kbd>}
    </DropdownMenuItem>
  )
})

export default MenuToolButton
