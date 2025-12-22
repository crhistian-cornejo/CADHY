/**
 * PropertySection Component - CADHY
 *
 * Collapsible section wrapper for property panels.
 * Used throughout the Properties panel for organizing related controls.
 */

import { Badge, Collapsible, CollapsibleContent, CollapsibleTrigger } from "@cadhy/ui"
import { ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import React, { useState } from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface PropertySectionProps {
  title: string
  icon: typeof ArrowDown01Icon
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: string | number
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PropertySection = React.memo(function PropertySection({
  title,
  icon,
  defaultOpen = true,
  children,
  badge,
}: PropertySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon}
            className="size-3 text-muted-foreground"
          />
          <HugeiconsIcon icon={icon} className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">{title}</span>
        </div>
        {badge !== undefined && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            {badge}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 pt-1 space-y-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
})

// Alias for backwards compatibility
export const Section = PropertySection
