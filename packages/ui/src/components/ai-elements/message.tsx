/**
 * AI Message Components
 *
 * Message components for AI chat interfaces using Streamdown
 * for streaming Markdown rendering.
 *
 * @package @cadhy/ui
 */

import type React from "react"
import type { ComponentProps, ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from "react"
import { memo } from "react"
import { Streamdown } from "streamdown"

import { cn } from "../../lib/utils"
import { Button } from "../button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip"

// ============================================================================
// MESSAGE CONTAINER
// ============================================================================

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  /** Role of the message sender */
  from: "user" | "assistant" | "system"
}

/**
 * Container for a chat message.
 * Applies different styles based on the sender role.
 */
export function Message({ className, from, ...props }: MessageProps) {
  return (
    <div
      data-slot="message"
      data-from={from}
      className={cn(
        "group flex w-full max-w-[85%] flex-col gap-2",
        from === "user" ? "ml-auto justify-end" : "",
        className
      )}
      {...props}
    />
  )
}

// ============================================================================
// MESSAGE CONTENT
// ============================================================================

export type MessageContentProps = HTMLAttributes<HTMLDivElement>

/**
 * Content wrapper for message text.
 * Applies styling based on whether it's a user or assistant message.
 */
export function MessageContent({ children, className, ...props }: MessageContentProps) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex w-fit flex-col gap-2 overflow-hidden text-sm",
        // User messages get bubble style
        "group-[[data-from=user]]:ml-auto group-[[data-from=user]]:rounded-2xl group-[[data-from=user]]:bg-secondary group-[[data-from=user]]:px-4 group-[[data-from=user]]:py-3 group-[[data-from=user]]:text-foreground",
        // Assistant messages are plain
        "group-[[data-from=assistant]]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// MESSAGE RESPONSE (STREAMDOWN)
// ============================================================================

export type MessageResponseProps = ComponentProps<typeof Streamdown>

/**
 * Custom table wrapper component that enables horizontal scrolling.
 * Wraps the native table element in a scrollable container.
 */
function ScrollableTable({ children, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="my-3 overflow-x-auto rounded-2xl border border-border">
      <table {...props} className="min-w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  )
}

/** Custom components for Streamdown rendering */
const streamdownComponents = {
  table: ScrollableTable,
  th: ({ children, ...props }: ComponentPropsWithoutRef<"th">) => (
    <th
      {...props}
      className="border-b border-border bg-muted/50 px-3 py-2 text-left text-xs font-semibold whitespace-nowrap"
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: ComponentPropsWithoutRef<"td">) => (
    <td {...props} className="border-b border-border px-3 py-2 text-sm">
      {children}
    </td>
  ),
}

/**
 * Renders AI response content using Streamdown.
 * Handles streaming Markdown with proper incomplete syntax handling.
 *
 * Memoized to prevent unnecessary re-renders during streaming.
 */
export const MessageResponse: React.NamedExoticComponent<MessageResponseProps> = memo(
  function MessageResponse({
    className,
    components,
    controls = { code: true, table: true },
    ...props
  }: MessageResponseProps) {
    return (
      <Streamdown
        data-slot="message-response"
        controls={controls}
        className={cn(
          "size-full prose prose-sm dark:prose-invert max-w-none overflow-hidden",
          // Reset margins on first/last children
          "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          // Code block styling
          "[&_pre]:my-3 [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-border [&_pre]:overflow-x-auto",
          // Inline code styling
          "[&_code:not(pre_code)]:rounded-2xl [&_code:not(pre_code)]:bg-muted [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:text-foreground [&_code:not(pre_code)]:font-mono [&_code:not(pre_code)]:text-xs",
          // Remove last row bottom border
          "[&_tr:last-child_td]:border-b-0",
          // Blockquote styling
          "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
          // List styling
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1",
          // Link styling
          "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80",
          // Heading styling
          "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3",
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2",
          className
        )}
        components={{ ...streamdownComponents, ...components }}
        {...props}
      />
    )
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
)

// ============================================================================
// MESSAGE ACTIONS
// ============================================================================

export type MessageActionsProps = ComponentProps<"div">

/**
 * Container for message action buttons (copy, regenerate, etc.)
 */
export function MessageActions({ className, children, ...props }: MessageActionsProps) {
  return (
    <div
      data-slot="message-actions"
      className={cn("flex items-center gap-1", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export type MessageActionProps = Omit<ComponentProps<typeof Button>, "children"> & {
  /** Tooltip text */
  tooltip?: string
  /** Accessible label */
  label?: string
  /** Button content */
  children?: ReactNode
}

/**
 * Action button for messages with optional tooltip.
 */
export function MessageAction({
  tooltip,
  children,
  label,
  variant = "ghost",
  size = "icon-xs",
  ...props
}: MessageActionProps) {
  const button = (
    <Button data-slot="message-action" size={size} variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span />}>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}

// ============================================================================
// MESSAGE TOOLBAR
// ============================================================================

export type MessageToolbarProps = ComponentProps<"div">

/**
 * Toolbar container for message actions and metadata.
 */
export function MessageToolbar({ className, children, ...props }: MessageToolbarProps) {
  return (
    <div
      data-slot="message-toolbar"
      className={cn("mt-3 flex w-full items-center justify-between gap-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// MESSAGE ATTACHMENTS
// ============================================================================

export type MessageAttachmentsProps = ComponentProps<"div">

/**
 * Container for message attachments (images, files).
 */
export function MessageAttachments({ children, className, ...props }: MessageAttachmentsProps) {
  if (!children) {
    return null
  }

  return (
    <div
      data-slot="message-attachments"
      className={cn("ml-auto flex w-fit flex-wrap items-start gap-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export type MessageAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  /** Attachment data */
  data: {
    filename?: string
    mediaType?: string
    url?: string
  }
  /** Handler for removing attachment */
  onRemove?: () => void
}

/**
 * Individual attachment display (image or file).
 */
export function MessageAttachment({ data, className, onRemove, ...props }: MessageAttachmentProps) {
  const filename = data.filename || ""
  const mediaType = data.mediaType?.startsWith("image/") && data.url ? "image" : "file"
  const isImage = mediaType === "image"
  const attachmentLabel = filename || (isImage ? "Image" : "Attachment")

  return (
    <div
      data-slot="message-attachment"
      className={cn("group relative size-24 overflow-hidden rounded-2xl", className)}
      {...props}
    >
      {isImage && data.url ? (
        <img
          alt={filename || "attachment"}
          className="size-full object-cover"
          height={100}
          src={data.url}
          width={100}
        />
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex size-full shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground cursor-default">
                  <span className="text-xs">{filename || "File"}</span>
                </div>
              }
            />
            <TooltipContent>
              <p>{attachmentLabel}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {onRemove && (
        <Button
          data-slot="attachment-remove"
          aria-label="Remove attachment"
          className="absolute right-2 top-2 size-6 rounded-full bg-background/80 p-0 opacity-0 backdrop-blur-sm transition-opacity hover:bg-background group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          variant="ghost"
          size="icon-xs"
        >
          <span className="text-xs">×</span>
          <span className="sr-only">Remove</span>
        </Button>
      )}
    </div>
  )
}
