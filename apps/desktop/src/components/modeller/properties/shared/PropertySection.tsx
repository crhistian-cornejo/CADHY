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
  action?: React.ReactNode
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
  action,
}: PropertySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} data-slot="property-section">
      <div
        className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
        data-slot="property-section-header"
      >
        <CollapsibleTrigger className="flex items-center gap-2 flex-1">
          <HugeiconsIcon
            icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon}
            className="size-3 text-muted-foreground"
          />
          <HugeiconsIcon icon={icon} className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">{title}</span>
        </CollapsibleTrigger>
        <div className="flex items-center gap-1">
          {action}
          {badge !== undefined && (
            <Badge variant="secondary" className="h-4 px-1.5 text-xs">
              {badge}
            </Badge>
          )}
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-3 pb-3 pt-1 space-y-2" data-slot="property-section-content">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})

// Alias for backwards compatibility
export const Section = PropertySection
