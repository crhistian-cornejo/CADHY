/**
 * EmptyState Component - CADHY
 *
 * Reusable component for displaying empty states in lists, panels, and views.
 * Provides consistent styling and optional action buttons.
 */

import { Button, cn } from "@cadhy/ui"
import { HugeiconsIcon, type HugeiconsProps } from "@hugeicons/react"
import React from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface EmptyStateProps {
  /** Icon to display */
  icon: HugeiconsProps["icon"]
  /** Main title text */
  title: string
  /** Optional description text */
  description?: string
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "ghost"
  }
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Additional className */
  className?: string
}

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

const sizeConfig = {
  sm: {
    container: "py-6",
    iconWrapper: "size-10",
    icon: "size-5",
    title: "text-sm",
    description: "text-xs",
    button: "sm" as const,
  },
  md: {
    container: "py-8",
    iconWrapper: "size-12",
    icon: "size-6",
    title: "text-base",
    description: "text-sm",
    button: "sm" as const,
  },
  lg: {
    container: "py-12",
    iconWrapper: "size-16",
    icon: "size-8",
    title: "text-lg",
    description: "text-base",
    button: "default" as const,
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EmptyState = React.memo(function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  const config = sizeConfig[size]

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        config.container,
        className
      )}
      data-slot="empty-state"
    >
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center mb-3",
          config.iconWrapper
        )}
        data-slot="empty-state-icon"
      >
        <HugeiconsIcon icon={icon} className={cn("text-muted-foreground", config.icon)} />
      </div>

      <h3 className={cn("font-medium text-foreground", config.title)} data-slot="empty-state-title">
        {title}
      </h3>

      {description && (
        <p
          className={cn("text-muted-foreground mt-1 max-w-xs", config.description)}
          data-slot="empty-state-description"
        >
          {description}
        </p>
      )}

      {action && (
        <Button
          variant={action.variant ?? "outline"}
          size={config.button}
          className="mt-4"
          onClick={action.onClick}
          data-slot="empty-state-action"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
})

export default EmptyState
