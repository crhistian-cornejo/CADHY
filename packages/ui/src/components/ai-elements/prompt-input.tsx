/**
 * AI Prompt Input Components
 *
 * A composable input system for AI chat with support for:
 * - Multi-line text input with auto-resize
 * - File attachments (images, documents)
 * - Tool selection menu
 * - Submit/stop buttons
 *
 * Based on AI Elements pattern for shadcn/ui.
 *
 * @package @cadhy/ui
 */

"use client"

import {
  Add01Icon,
  AiPhone01Icon,
  Cancel01Icon,
  Image01Icon,
  PenTool01Icon,
  SentIcon,
  StopIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { ClipboardEventHandler, ComponentProps, KeyboardEventHandler, ReactNode } from "react"
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { cn } from "../../lib/utils"
import { Button } from "../button"
import { Checkbox } from "../checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "../popover"

// ============================================================================
// TYPES
// ============================================================================

export type PromptInputStatus = "ready" | "submitted" | "streaming" | "error"

export interface AttachmentFile {
  id: string
  file: File
  url: string
  type: "image" | "document" | "other"
}

export interface AttachmentsContext {
  files: AttachmentFile[]
  add: (files: File[]) => void
  remove: (id: string) => void
  clear: () => void
  openFileDialog: () => void
}

export interface PromptInputTextInputContext {
  value: string
  setInput: (value: string) => void
  clear: () => void
}

export interface PromptInputControllerValue {
  textInput: PromptInputTextInputContext
  attachments: AttachmentsContext
}

export interface ToolOption {
  id: string
  name: string
  icon?: ReactNode
  description?: string
  enabled: boolean
}

// ============================================================================
// CONTEXT
// ============================================================================

const PromptInputControllerContext = createContext<PromptInputControllerValue | null>(null)

export function usePromptInputController() {
  const context = useContext(PromptInputControllerContext)
  if (!context) {
    throw new Error("usePromptInputController must be used within PromptInputProvider")
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

export interface PromptInputProviderProps {
  children: ReactNode
  /** Initial text value */
  defaultValue?: string
  /** Controlled text value */
  value?: string
  /** Called when text changes */
  onValueChange?: (value: string) => void
}

export function PromptInputProvider({
  children,
  defaultValue = "",
  value: controlledValue,
  onValueChange,
}: PromptInputProviderProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue

  const setInput = useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [isControlled, onValueChange]
  )

  const clearInput = useCallback(() => {
    setInput("")
  }, [setInput])

  const addFiles = useCallback((files: File[]) => {
    setAttachments((prev) => {
      const newFiles = files.map((file) => {
        const url = URL.createObjectURL(file)
        const type = file.type.startsWith("image/")
          ? "image"
          : file.type.includes("pdf") || file.type.includes("document")
            ? "document"
            : "other"
        return {
          id: Math.random().toString(36).substring(2, 11),
          file,
          url,
          type,
        } as AttachmentFile
      })
      return [...prev, ...newFiles]
    })
  }, [])

  const removeFile = useCallback((id: string) => {
    setAttachments((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.url)
      }
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const clearFiles = useCallback(() => {
    attachments.forEach((f) => URL.revokeObjectURL(f.url))
    setAttachments([])
  }, [attachments])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const controller = useMemo<PromptInputControllerValue>(
    () => ({
      textInput: { value, setInput, clear: clearInput },
      attachments: {
        files: attachments,
        add: addFiles,
        remove: removeFile,
        clear: clearFiles,
        openFileDialog,
      },
    }),
    [value, setInput, clearInput, attachments, addFiles, removeFile, clearFiles, openFileDialog]
  )

  return (
    <PromptInputControllerContext.Provider value={controller}>
      {children}
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            addFiles(Array.from(e.target.files))
          }
          e.target.value = "" // Reset for re-selection
        }}
      />
    </PromptInputControllerContext.Provider>
  )
}

// ============================================================================
// PROMPT INPUT (Main Container)
// ============================================================================

export interface PromptInputProps extends Omit<ComponentProps<"form">, "onSubmit"> {
  /** Handle form submission */
  onSubmit?: (data: { text: string; files: AttachmentFile[] }) => void
  /** Whether the input is disabled */
  disabled?: boolean
  /** Allow drag and drop files */
  globalDrop?: boolean
  /** Allow multiple file selection */
  multiple?: boolean
}

export function PromptInput({
  children,
  className,
  onSubmit,
  disabled,
  globalDrop = true,
  multiple = true,
  ...props
}: PromptInputProps) {
  const controller = usePromptInputController()
  const [isDragging, setIsDragging] = useState(false)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!controller.textInput.value.trim() && controller.attachments.files.length === 0) return

      onSubmit?.({
        text: controller.textInput.value,
        files: controller.attachments.files,
      })

      controller.textInput.clear()
      controller.attachments.clear()
    },
    [controller, onSubmit]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        controller.attachments.add(multiple ? files : [files[0]])
      }
    },
    [controller.attachments, multiple]
  )

  return (
    <form
      data-slot="prompt-input"
      onSubmit={handleSubmit}
      className={cn(
        "relative flex flex-col rounded-2xl border border-border/50",
        "transition-all duration-200",
        isDragging && "ring-2 ring-primary/50 border-primary",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      onDragOver={globalDrop ? handleDragOver : undefined}
      onDragLeave={globalDrop ? handleDragLeave : undefined}
      onDrop={globalDrop ? handleDrop : undefined}
      {...props}
    >
      {children}
    </form>
  )
}

// ============================================================================
// PROMPT INPUT BODY
// ============================================================================

export type PromptInputBodyProps = ComponentProps<"div">

export function PromptInputBody({ children, className, ...props }: PromptInputBodyProps) {
  return (
    <div data-slot="prompt-input-body" className={cn("relative flex-1", className)} {...props}>
      {children}
    </div>
  )
}

// ============================================================================
// PROMPT INPUT TEXTAREA
// ============================================================================

export interface PromptInputTextareaProps
  extends Omit<ComponentProps<"textarea">, "value" | "onChange"> {
  /** Placeholder text */
  placeholder?: string
  /** Maximum rows before scrolling */
  maxRows?: number
  /** Minimum rows */
  minRows?: number
}

export const PromptInputTextarea = forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  ({ className, placeholder = "Ask anything...", maxRows = 6, minRows = 1, ...props }, ref) => {
    const controller = usePromptInputController()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [isComposing, setIsComposing] = useState(false)

    // Merge refs
    const mergedRef = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    // Auto-resize textarea
    useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      textarea.style.height = "auto"
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10) || 24
      const minHeight = lineHeight * minRows
      const maxHeight = lineHeight * maxRows
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
    }, [maxRows, minRows])

    const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
      if (e.key === "Enter") {
        if (isComposing || e.nativeEvent.isComposing) return
        if (e.shiftKey) return // Allow Shift+Enter for new line

        e.preventDefault()
        const form = e.currentTarget.form
        form?.requestSubmit()
      }

      // Remove last attachment on Backspace when empty
      if (
        e.key === "Backspace" &&
        e.currentTarget.value === "" &&
        controller.attachments.files.length > 0
      ) {
        e.preventDefault()
        const files = controller.attachments.files
        const lastFile = files[files.length - 1]
        if (lastFile) {
          controller.attachments.remove(lastFile.id)
        }
      }
    }

    const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (e) => {
      const items = e.clipboardData?.items
      if (!items) return

      const files: File[] = []
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }

      if (files.length > 0) {
        e.preventDefault()
        controller.attachments.add(files)
      }
    }

    return (
      <textarea
        ref={mergedRef}
        data-slot="prompt-input-textarea"
        data-no-focus-ring
        value={controller.textInput.value}
        onChange={(e) => controller.textInput.setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder={placeholder}
        rows={minRows}
        className={cn(
          "w-full resize-none bg-transparent text-sm text-foreground",
          "placeholder:text-muted-foreground",
          "outline-none border-none ring-0 focus:ring-0 focus:outline-none focus:border-transparent",
          "overflow-y-auto scrollbar-thin scrollbar-thumb-muted",
          className
        )}
        {...props}
      />
    )
  }
)
PromptInputTextarea.displayName = "PromptInputTextarea"

// ============================================================================
// PROMPT INPUT FOOTER
// ============================================================================

export type PromptInputFooterProps = ComponentProps<"div">

export function PromptInputFooter({ children, className, ...props }: PromptInputFooterProps) {
  return (
    <div
      data-slot="prompt-input-footer"
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 border-t border-border/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// PROMPT INPUT TOOLS (Left side container)
// ============================================================================

export type PromptInputToolsProps = ComponentProps<"div">

export function PromptInputTools({ children, className, ...props }: PromptInputToolsProps) {
  return (
    <div
      data-slot="prompt-input-tools"
      className={cn("flex items-center gap-1", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// PROMPT INPUT ACTIONS (Right side container)
// ============================================================================

export type PromptInputActionsProps = ComponentProps<"div">

export function PromptInputActions({ children, className, ...props }: PromptInputActionsProps) {
  return (
    <div
      data-slot="prompt-input-actions"
      className={cn("flex items-center gap-1", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// PROMPT INPUT TOOL MENU
// ============================================================================

export interface PromptInputToolMenuProps extends ComponentProps<"div"> {
  /** Available tools to select from */
  tools: ToolOption[]
  /** Called when tool selection changes */
  onToolsChange?: (tools: ToolOption[]) => void
  /** Label for the trigger button */
  label?: string
}

export function PromptInputToolMenu({
  tools,
  onToolsChange,
  label,
  className,
  ...props
}: PromptInputToolMenuProps) {
  const enabledCount = tools.filter((t) => t.enabled).length

  const handleToggle = useCallback(
    (toolId: string, enabled: boolean) => {
      onToolsChange?.(tools.map((t) => (t.id === toolId ? { ...t, enabled } : t)))
    },
    [tools, onToolsChange]
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground",
            "rounded-lg hover:bg-muted/80",
            className
          )}
        >
          <HugeiconsIcon icon={PenTool01Icon} className="size-3.5" />
          {label && <span className="text-xs">{label}</span>}
          {enabledCount > 0 && (
            <span className="flex items-center justify-center size-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {enabledCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2" sideOffset={8}>
        <div className="space-y-1" {...props}>
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Available Tools
          </p>
          {tools.map((tool) => (
            <label
              key={tool.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 cursor-pointer",
                "hover:bg-accent transition-colors",
                tool.enabled && "bg-accent/50"
              )}
            >
              <Checkbox
                checked={tool.enabled}
                onCheckedChange={(checked) => handleToggle(tool.id, checked === true)}
              />
              {tool.icon && <span className="text-muted-foreground">{tool.icon}</span>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{tool.name}</p>
                {tool.description && (
                  <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// PROMPT INPUT ADD BUTTON
// ============================================================================

export interface PromptInputAddButtonProps extends ComponentProps<typeof Button> {
  /** Called when add action is triggered */
  onAdd?: () => void
}

export function PromptInputAddButton({ className, onAdd, ...props }: PromptInputAddButtonProps) {
  const controller = usePromptInputController()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={cn("size-8 rounded-full text-muted-foreground hover:text-foreground", className)}
      onClick={() => {
        onAdd?.()
        controller.attachments.openFileDialog()
      }}
      {...props}
    >
      <HugeiconsIcon icon={Add01Icon} className="size-4" />
      <span className="sr-only">Add attachment</span>
    </Button>
  )
}

// ============================================================================
// PROMPT INPUT IMAGE BUTTON
// ============================================================================

export interface PromptInputImageButtonProps extends ComponentProps<"button"> {}

export function PromptInputImageButton({ className, ...props }: PromptInputImageButtonProps) {
  const controller = usePromptInputController()

  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center size-7 rounded-full shrink-0",
        "text-muted-foreground hover:text-foreground hover:bg-muted/80",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50",
        className
      )}
      onClick={() => controller.attachments.openFileDialog()}
      {...props}
    >
      <HugeiconsIcon icon={Image01Icon} className="size-4" strokeWidth={2} />
      <span className="sr-only">Add image</span>
    </button>
  )
}

// ============================================================================
// PROMPT INPUT MICROPHONE BUTTON
// ============================================================================

export interface PromptInputMicButtonProps extends ComponentProps<typeof Button> {
  /** Whether currently recording */
  isRecording?: boolean
  /** Called when recording state changes */
  onRecordingChange?: (recording: boolean) => void
}

export function PromptInputMicButton({
  className,
  isRecording,
  onRecordingChange,
  ...props
}: PromptInputMicButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={cn(
        "size-8 rounded-full text-muted-foreground hover:text-foreground",
        isRecording && "text-red-500 animate-pulse",
        className
      )}
      onClick={() => onRecordingChange?.(!isRecording)}
      {...props}
    >
      <HugeiconsIcon icon={AiPhone01Icon} className="size-4" />
      <span className="sr-only">{isRecording ? "Stop recording" : "Start recording"}</span>
    </Button>
  )
}

// ============================================================================
// PROMPT INPUT SUBMIT BUTTON
// ============================================================================

export interface PromptInputSubmitProps extends ComponentProps<typeof Button> {
  /** Current status of the chat */
  status?: PromptInputStatus
  /** Called when stop is requested during streaming */
  onStop?: () => void
}

export function PromptInputSubmit({
  className,
  status = "ready",
  onStop,
  disabled,
  ...props
}: PromptInputSubmitProps) {
  const controller = usePromptInputController()
  const isStreaming = status === "streaming"
  const isSubmitting = status === "submitted"
  const hasContent =
    controller.textInput.value.trim() !== "" || controller.attachments.files.length > 0

  if (isStreaming) {
    return (
      <button
        type="button"
        className={cn(
          "flex items-center justify-center size-8 rounded-full shrink-0",
          "bg-destructive text-destructive-foreground",
          "hover:bg-destructive/90 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-destructive/50",
          className
        )}
        onClick={onStop}
        {...props}
      >
        <HugeiconsIcon icon={StopIcon} className="size-4" strokeWidth={2.5} />
        <span className="sr-only">Stop generating</span>
      </button>
    )
  }

  return (
    <button
      type="submit"
      className={cn(
        "flex items-center justify-center size-8 rounded-full shrink-0 transition-all",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        hasContent
          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          : "bg-muted text-muted-foreground cursor-not-allowed",
        (disabled || !hasContent || isSubmitting) && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled || !hasContent || isSubmitting}
      {...props}
    >
      <HugeiconsIcon icon={SentIcon} className="size-4" strokeWidth={2} />
      <span className="sr-only">Send message</span>
    </button>
  )
}

// ============================================================================
// PROMPT INPUT ATTACHMENTS
// ============================================================================

export interface PromptInputAttachmentsProps extends ComponentProps<"div"> {
  /** Custom render function for each attachment */
  renderItem?: (attachment: AttachmentFile) => ReactNode
}

export function PromptInputAttachments({
  renderItem,
  className,
  ...props
}: PromptInputAttachmentsProps) {
  const controller = usePromptInputController()

  if (controller.attachments.files.length === 0) return null

  return (
    <div
      data-slot="prompt-input-attachments"
      className={cn("flex flex-wrap gap-2 px-3 pt-3", className)}
      {...props}
    >
      {controller.attachments.files.map((file) =>
        renderItem ? renderItem(file) : <PromptInputAttachment key={file.id} data={file} />
      )}
    </div>
  )
}

// ============================================================================
// PROMPT INPUT ATTACHMENT
// ============================================================================

export interface PromptInputAttachmentProps extends ComponentProps<"div"> {
  data: AttachmentFile
}

export function PromptInputAttachment({ data, className, ...props }: PromptInputAttachmentProps) {
  const controller = usePromptInputController()

  return (
    <div
      data-slot="prompt-input-attachment"
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-lg bg-muted px-2 py-1",
        className
      )}
      {...props}
    >
      {data.type === "image" ? (
        <img src={data.url} alt={data.file.name} className="size-8 rounded object-cover" />
      ) : (
        <div className="flex size-8 items-center justify-center rounded bg-muted-foreground/10">
          <HugeiconsIcon icon={Image01Icon} className="size-4 text-muted-foreground" />
        </div>
      )}
      <span className="max-w-[100px] truncate text-xs text-muted-foreground">{data.file.name}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="size-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => controller.attachments.remove(data.id)}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
        <span className="sr-only">Remove</span>
      </Button>
    </div>
  )
}
