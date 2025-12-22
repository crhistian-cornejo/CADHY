/**
 * PropertyRow Component - CADHY
 *
 * Horizontal layout for property label + input.
 * Standard building block for all property panels.
 */

import { Label } from "@cadhy/ui"
import React from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface PropertyRowProps {
  label: string
  children: React.ReactNode
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PropertyRow = React.memo(function PropertyRow({ label, children }: PropertyRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-20 shrink-0 text-[10px] text-muted-foreground">{label}</Label>
      <div className="flex-1">{children}</div>
    </div>
  )
})
