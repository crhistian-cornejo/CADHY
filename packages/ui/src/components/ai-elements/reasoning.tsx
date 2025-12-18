/**
 * AI Reasoning Components
 *
 * Components for displaying AI thinking/reasoning process.
 *
 * @package @cadhy/ui
 */

"use client"

import { ArrowDown01Icon, Idea01Icon, Loading01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { ComponentProps } from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"

import { cn } from "../../lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../collapsible"

// ============================================================================
// CONTEXT
// ============================================================================

type ReasoningContextType = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isStreaming: boolean
  duration: number | null
}

const ReasoningContext = createContext<ReasoningContextType | null>(null)

function useReasoningContext() {
  const context = useContext(ReasoningContext)
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning")
  }
  return context
}

// ============================================================================
// REASONING
// ============================================================================

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  /** Whether the reasoning is currently streaming */
  isStreaming?: boolean
  /** Duration in seconds (null while streaming) */
  duration?: number | null
}

/**
 * Collapsible container for AI reasoning/thinking process.
 * Automatically opens during streaming and tracks duration.
 */
export function Reasoning({
  isStreaming = false,
  duration = null,
  className,
  children,
  ...props
}: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(isStreaming)
  const startTimeRef = useRef<number | null>(null)
  const [calculatedDuration, setCalculatedDuration] = useState<number | null>(duration)

  // Auto-open when streaming starts
  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true)
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now()
      }
    } else if (startTimeRef.current && !duration) {
      // Calculate duration when streaming ends
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000)
      setCalculatedDuration(elapsed)
    }
  }, [isStreaming, duration])

  const finalDuration = duration ?? calculatedDuration

  return (
    <ReasoningContext.Provider value={{ isOpen, setIsOpen, isStreaming, duration: finalDuration }}>
      <Collapsible
        data-slot="reasoning"
        data-streaming={isStreaming}
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn("rounded-lg border border-primary/20 bg-primary/5", className)}
        {...props}
      >
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  )
}

// ============================================================================
// REASONING TRIGGER
// ============================================================================

export type ReasoningTriggerProps = ComponentProps<"button">

/**
 * Trigger button for expanding/collapsing reasoning content.
 * Shows streaming indicator and duration.
 */
export function ReasoningTrigger({ children, className, ...props }: ReasoningTriggerProps) {
  const { isOpen, isStreaming, duration } = useReasoningContext()

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10 rounded-t-lg",
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-2">
        {isStreaming ? (
          <HugeiconsIcon icon={Loading01Icon} className="size-4 animate-spin text-primary" />
        ) : (
          <HugeiconsIcon icon={Idea01Icon} className="size-4 text-primary" />
        )}
        <span className="font-medium text-primary">
          {children ?? (isStreaming ? "Thinking..." : "Thought process")}
        </span>
        {!isStreaming && duration !== null && duration > 0 && (
          <span className="text-xs text-muted-foreground">({formatDuration(duration)})</span>
        )}
      </span>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        className={cn(
          "size-4 text-primary transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </CollapsibleTrigger>
  )
}

// ============================================================================
// REASONING CONTENT
// ============================================================================

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent>

/**
 * Content area for reasoning text.
 * Auto-scrolls during streaming.
 */
export function ReasoningContent({ children, className, ...props }: ReasoningContentProps) {
  const { isStreaming } = useReasoningContext()
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  })

  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn("border-t border-primary/20", className)}
      {...props}
    >
      <div
        ref={contentRef}
        className={cn(
          "max-h-48 overflow-y-auto whitespace-pre-wrap px-3 py-2 text-sm text-muted-foreground"
        )}
      >
        {children}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary/60" />
        )}
      </div>
    </CollapsibleContent>
  )
}
