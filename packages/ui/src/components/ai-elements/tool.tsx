/**
 * AI Tool Components
 *
 * Components for displaying tool/function call invocations in AI chat.
 *
 * @package @cadhy/ui
 */

"use client"

import {
  ArrowDown01Icon,
  Cancel01Icon,
  CircleIcon,
  Loading01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { ComponentProps, ReactNode } from "react"
import { createContext, useContext, useState } from "react"

import { cn } from "../../lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../collapsible"

// ============================================================================
// TYPES
// ============================================================================

export type ToolStatus = "pending" | "running" | "completed" | "failed"

type ToolContextType = {
  status: ToolStatus
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const ToolContext = createContext<ToolContextType | null>(null)

function useToolContext() {
  const context = useContext(ToolContext)
  if (!context) {
    throw new Error("Tool components must be used within Tool")
  }
  return context
}

// ============================================================================
// TOOL
// ============================================================================

export type ToolProps = ComponentProps<typeof Collapsible> & {
  /** Current status of the tool execution */
  status?: ToolStatus
  /** Whether the tool content is expanded by default */
  defaultOpen?: boolean
}

/**
 * Collapsible container for displaying tool call information.
 */
export function Tool({
  status = "pending",
  defaultOpen = false,
  className,
  children,
  ...props
}: ToolProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <ToolContext.Provider value={{ status, isOpen, setIsOpen }}>
      <Collapsible
        data-slot="tool"
        data-status={status}
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
        {...props}
      >
        {children}
      </Collapsible>
    </ToolContext.Provider>
  )
}

// ============================================================================
// TOOL TRIGGER
// ============================================================================

export type ToolTriggerProps = ComponentProps<"button"> & {
  /** Custom icon to display */
  icon?: ReactNode
}

/**
 * Trigger button for expanding/collapsing tool details.
 * Shows status indicator by default.
 */
export function ToolTrigger({ children, icon, className, ...props }: ToolTriggerProps) {
  const { status, isOpen } = useToolContext()

  function StatusIcon() {
    switch (status) {
      case "running":
        return <HugeiconsIcon icon={Loading01Icon} className="size-4 animate-spin text-primary" />
      case "completed":
        return <HugeiconsIcon icon={Tick01Icon} className="size-4 text-green-500" />
      case "failed":
        return <HugeiconsIcon icon={Cancel01Icon} className="size-4 text-destructive" />
      default:
        return <HugeiconsIcon icon={CircleIcon} className="size-4 text-muted-foreground" />
    }
  }

  return (
    <CollapsibleTrigger
      data-slot="tool-trigger"
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors rounded-t-lg",
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-2">
        {icon ?? <StatusIcon />}
        <span className="text-sm font-medium">{children}</span>
      </span>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
      />
    </CollapsibleTrigger>
  )
}

// ============================================================================
// TOOL CONTENT
// ============================================================================

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>

/**
 * Collapsible content area for tool details.
 */
export function ToolContent({ children, className, ...props }: ToolContentProps) {
  return (
    <CollapsibleContent
      data-slot="tool-content"
      className={cn("border-t px-3 py-2", className)}
      {...props}
    >
      {children}
    </CollapsibleContent>
  )
}

// ============================================================================
// TOOL INPUT/OUTPUT
// ============================================================================

export type ToolInputProps = ComponentProps<"div">

/**
 * Display area for tool input parameters.
 */
export function ToolInput({ children, className, ...props }: ToolInputProps) {
  return (
    <div data-slot="tool-input" className={cn("space-y-1", className)} {...props}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Input</div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-xs">
        {children}
      </pre>
    </div>
  )
}

export type ToolOutputProps = ComponentProps<"div">

/**
 * Display area for tool output/result.
 */
export function ToolOutput({ children, className, ...props }: ToolOutputProps) {
  return (
    <div data-slot="tool-output" className={cn("mt-2 space-y-1", className)} {...props}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Output
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-xs">
        {children}
      </pre>
    </div>
  )
}

export type ToolErrorProps = ComponentProps<"div">

/**
 * Display area for tool errors.
 */
export function ToolError({ children, className, ...props }: ToolErrorProps) {
  return (
    <div data-slot="tool-error" className={cn("mt-2 space-y-1", className)} {...props}>
      <div className="text-xs font-medium uppercase tracking-wide text-destructive">Error</div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-destructive/10 p-2 text-xs text-destructive">
        {children}
      </pre>
    </div>
  )
}

// ============================================================================
// SIMPLE TOOL BADGE (for inline display)
// ============================================================================

export type ToolBadgeProps = ComponentProps<"div"> & {
  /** Tool name */
  name: string
  /** Current status */
  status: ToolStatus
  /** Result message */
  result?: string
}

/**
 * Simple inline badge for displaying tool status.
 * Use this for compact tool call displays within messages.
 */
export function ToolBadge({ name, status, result, className, ...props }: ToolBadgeProps) {
  return (
    <div
      data-slot="tool-badge"
      data-status={status}
      className={cn("flex items-center gap-2 text-xs", className)}
      {...props}
    >
      {status === "running" && (
        <>
          <HugeiconsIcon icon={Loading01Icon} className="size-3 animate-spin text-primary" />
          <span className="text-primary">{name}...</span>
        </>
      )}
      {status === "completed" && (
        <>
          <HugeiconsIcon icon={Tick01Icon} className="size-3 text-green-500" />
          <span className="text-green-500">{result || name}</span>
        </>
      )}
      {status === "failed" && (
        <>
          <HugeiconsIcon icon={Cancel01Icon} className="size-3 text-destructive" />
          <span className="text-destructive">Failed: {result || name}</span>
        </>
      )}
      {status === "pending" && <span className="text-muted-foreground">{name}</span>}
    </div>
  )
}
