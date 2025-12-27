/**
 * AI Conversation Components
 *
 * Container components for AI chat conversations with auto-scroll support.
 *
 * @package @cadhy/ui
 */

"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { ComponentProps, ReactNode, UIEvent } from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

import { cn } from "../../lib/utils"
import { Button } from "../button"

// ============================================================================
// CONVERSATION CONTEXT
// ============================================================================

type ConversationContextType = {
  scrollToBottom: (behavior?: ScrollBehavior) => void
  isAtBottom: boolean
  setIsAtBottom: (value: boolean) => void
  autoScrollEnabled: boolean
  setAutoScrollEnabled: (value: boolean) => void
}

const ConversationContext = createContext<ConversationContextType | null>(null)

/**
 * Hook to access conversation scroll context.
 * Use this to programmatically scroll to bottom or check scroll position.
 */
export function useConversation() {
  const context = useContext(ConversationContext)
  if (!context) {
    throw new Error("useConversation must be used within Conversation")
  }
  return context
}

// ============================================================================
// CONVERSATION
// ============================================================================

export type ConversationProps = ComponentProps<"div"> & {
  /** Enable auto-scroll when new content is added (default: true) */
  autoScroll?: boolean
  /** Show fade masks at top/bottom when content overflows */
  showFadeMasks?: boolean
  /** Height of the fade mask gradient */
  fadeMaskHeight?: string
}

/**
 * Main container for AI chat conversations.
 * Handles auto-scrolling and scroll state management.
 */
export function Conversation({
  children,
  className,
  autoScroll = true,
  showFadeMasks = false,
  fadeMaskHeight = "2rem",
  ...props
}: ConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(autoScroll)
  const lastScrollHeightRef = useRef(0)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      })
    }
  }, [])

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      const threshold = 100
      const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold
      setIsAtBottom(atBottom)

      // Track if we can scroll up (for fade mask)
      setCanScrollUp(target.scrollTop > 1)

      // Re-enable auto-scroll when user scrolls to bottom
      if (atBottom && !autoScrollEnabled) {
        setAutoScrollEnabled(true)
      } else if (!atBottom && autoScrollEnabled) {
        setAutoScrollEnabled(false)
      }
    },
    [autoScrollEnabled]
  )

  // Auto-scroll when content changes and user is at bottom
  useEffect(() => {
    if (!scrollRef.current) return

    const currentHeight = scrollRef.current.scrollHeight
    const hasNewContent = currentHeight > lastScrollHeightRef.current

    if (hasNewContent && (isAtBottom || autoScrollEnabled)) {
      // Use requestAnimationFrame for smoother scrolling during streaming
      requestAnimationFrame(() => {
        scrollToBottom("auto")
      })
    }

    lastScrollHeightRef.current = currentHeight
  })

  return (
    <ConversationContext.Provider
      value={{
        scrollToBottom,
        isAtBottom,
        setIsAtBottom,
        autoScrollEnabled,
        setAutoScrollEnabled,
      }}
    >
      <div
        data-slot="conversation"
        className={cn("relative flex h-full flex-col overflow-hidden", className)}
        {...props}
      >
        {/* Fade masks */}
        {showFadeMasks && (
          <>
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-background to-transparent transition-opacity duration-150",
                canScrollUp ? "opacity-100" : "opacity-0"
              )}
              style={{ height: fadeMaskHeight }}
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background to-transparent transition-opacity duration-150",
                !isAtBottom ? "opacity-100" : "opacity-0"
              )}
              style={{ height: fadeMaskHeight }}
            />
          </>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          data-slot="conversation-scroll"
          className="flex-1 overflow-y-auto overflow-x-hidden"
          onScroll={handleScroll}
        >
          {children}
        </div>
      </div>
    </ConversationContext.Provider>
  )
}

// ============================================================================
// CONVERSATION CONTENT
// ============================================================================

export type ConversationContentProps = ComponentProps<"div">

/**
 * Content wrapper for conversation messages.
 */
export function ConversationContent({ children, className, ...props }: ConversationContentProps) {
  return (
    <div
      data-slot="conversation-content"
      className={cn("flex flex-col gap-4 p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  /** Icon to display */
  icon?: ReactNode
  /** Title text */
  title?: string
  /** Description text */
  description?: string
}

/**
 * Empty state display for when there are no messages.
 */
export function ConversationEmptyState({
  icon,
  title,
  description,
  children,
  className,
  ...props
}: ConversationEmptyStateProps) {
  return (
    <div
      data-slot="conversation-empty-state"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">{icon}</div>
      )}
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  )
}

// ============================================================================
// SCROLL BUTTON
// ============================================================================

export type ConversationScrollButtonProps = ComponentProps<typeof Button>

/**
 * Floating button to scroll to the bottom of the conversation.
 * Only visible when user has scrolled up.
 */
export function ConversationScrollButton({ className, ...props }: ConversationScrollButtonProps) {
  const { scrollToBottom, isAtBottom } = useConversation()

  if (isAtBottom) return null

  return (
    <Button
      data-slot="conversation-scroll-button"
      variant="secondary"
      size="icon"
      className={cn(
        "absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-lg",
        "border border-border bg-background/80 backdrop-blur-sm",
        "hover:bg-background",
        className
      )}
      onClick={() => scrollToBottom("smooth")}
      {...props}
    >
      <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
      <span className="sr-only">Scroll to bottom</span>
    </Button>
  )
}
