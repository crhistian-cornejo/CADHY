/**
 * AI Chat Panel Component
 *
 * Chat interface for CADHY's AI assistant.
 * Uses Vercel AI SDK v5 with streaming support and Streamdown for Markdown.
 */

import { getModelById } from "@cadhy/ai"
import {
  Button,
  // Context components for token usage
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
  // AI Elements
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  cn,
  // Provider Icons
  getProviderIcon,
  // Input Group
  InputGroup,
  InputGroupAddon,
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Textarea,
  // Tool components (full version)
  Tool,
  ToolContent,
  ToolError,
  ToolInput,
  ToolOutput,
  type ToolStatus,
  ToolTrigger,
  // Tooltip
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  Add01Icon,
  Cancel01Icon,
  Clock01Icon,
  Copy01Icon,
  Delete01Icon,
  FolderOpenIcon,
  MessageMultiple01Icon,
  Search01Icon,
  SentIcon,
  SparklesIcon,
  StopIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "motion/react"
import {
  type FormEvent,
  Fragment,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { type AIChatMessage, type ToolCallInfo, useAIChat } from "@/hooks"
import type { ChatSessionMeta } from "@/services/chat-persistence"
import { useChatStore, useSessionUsage } from "@/stores/chat-store"
import { useProjectStore } from "@/stores/project-store"

// ============================================================================
// CADHY LOGO COMPONENT
// ============================================================================

/** CADHY Logo - Three Isometric Hexagonal Cubes */
function CadhyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Top hexagon/cube */}
      <g transform="translate(16, 11.25)">
        <path
          d="M 0 -8 L 6.93 -4 L 6.93 4 L 0 8 L -6.93 4 L -6.93 -4 Z"
          stroke="currentColor"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <path
          d="M 0 0 L 0 8 M 0 0 L 6.93 -4 M 0 0 L -6.93 -4"
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.6"
        />
      </g>
      {/* Bottom-left hexagon/cube */}
      <g transform="translate(10.5, 20.75)">
        <path
          d="M 0 -8 L 6.93 -4 L 6.93 4 L 0 8 L -6.93 4 L -6.93 -4 Z"
          stroke="currentColor"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <path
          d="M 0 0 L 0 8 M 0 0 L 6.93 -4 M 0 0 L -6.93 -4"
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.6"
        />
      </g>
      {/* Bottom-right hexagon/cube */}
      <g transform="translate(21.5, 20.75)">
        <path
          d="M 0 -8 L 6.93 -4 L 6.93 4 L 0 8 L -6.93 4 L -6.93 -4 Z"
          stroke="currentColor"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <path
          d="M 0 0 L 0 8 M 0 0 L 6.93 -4 M 0 0 L -6.93 -4"
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.6"
        />
      </g>
    </svg>
  )
}

// ============================================================================
// TYPES
// ============================================================================

interface AIChatPanelProps {
  className?: string
  onClose?: () => void
  onOpenProject?: () => void
  onNewProject?: () => void
}

/** Extract provider from model ID (e.g., "anthropic/claude-sonnet-4.5" -> "anthropic") */
function getProviderFromModelId(modelId: string): string {
  const parts = modelId.split("/")
  return parts[0] || "openai"
}

// ============================================================================
// CHAT MESSAGE COMPONENT
// ============================================================================

interface ChatMessageProps {
  message: AIChatMessage
  isStreaming?: boolean
  /** Fallback provider if message doesn't have one */
  fallbackProvider: string
}

function ChatMessage({ message, isStreaming = false, fallbackProvider }: ChatMessageProps) {
  const { t } = useTranslation()
  const [isCopied, setIsCopied] = useState(false)
  const isUser = message.role === "user"

  // Use the provider stored in the message, fallback to current if not available
  const messageProvider = message.provider ?? fallbackProvider
  const ProviderIcon = getProviderIcon(messageProvider)

  const handleCopyMessage = useCallback(async () => {
    if (!message.content) return
    try {
      await navigator.clipboard.writeText(message.content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy message:", err)
    }
  }, [message.content])

  // User messages: aligned to the right (WhatsApp style)
  if (isUser) {
    return (
      <motion.div
        data-slot="chat-message"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex flex-col items-end gap-1 px-4 py-3"
      >
        {/* Header: time + name */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {message.createdAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="text-xs font-medium">{t("ai.you")}</span>
        </div>

        {/* Message bubble */}
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground">
          <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
        </div>

        {/* Copy action - visible on hover */}
        {message.content && (
          <MessageActions className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MessageAction
              tooltip={isCopied ? t("ai.copied") : t("ai.copyMessage")}
              onClick={handleCopyMessage}
              className={cn("h-6 w-6", isCopied && "text-green-500")}
            >
              <HugeiconsIcon icon={isCopied ? Tick01Icon : Copy01Icon} className="size-3.5" />
            </MessageAction>
          </MessageActions>
        )}
      </motion.div>
    )
  }

  // Assistant messages: aligned to the left with avatar
  return (
    <motion.div
      data-slot="chat-message"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-3 px-4 py-3 bg-background"
    >
      {/* Avatar */}
      <div
        data-slot="message-avatar"
        className="size-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-muted/50 p-1"
      >
        <ProviderIcon className="size-5" />
      </div>

      {/* Content */}
      <Message from="assistant" className="flex-1 min-w-0 max-w-full">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">{t("ai.assistant")}</span>
          <span className="text-[10px] text-muted-foreground">
            {message.createdAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {message.isStreaming && (
            <span className="size-1.5 bg-violet-500 rounded-full animate-pulse" />
          )}
        </div>

        {/* Tool calls - shown BEFORE the response text */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 space-y-2">
            {message.toolCalls.map((tool, idx) => (
              <ToolCallDisplay key={`${tool.name}-${idx}`} tool={tool} />
            ))}
          </div>
        )}

        <MessageContent>
          {message.content ? (
            <MessageResponse
              isAnimating={message.isStreaming}
              parseIncompleteMarkdown={message.isStreaming}
            >
              {message.content}
            </MessageResponse>
          ) : message.isStreaming ? (
            <span className="text-muted-foreground italic">{t("ai.thinking")}</span>
          ) : null}
        </MessageContent>

        {/* Copy action - visible on hover */}
        {message.content && !message.isStreaming && (
          <MessageActions className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <MessageAction
              tooltip={isCopied ? t("ai.copied") : t("ai.copyMessage")}
              onClick={handleCopyMessage}
              className={cn("h-6 w-6", isCopied && "text-green-500")}
            >
              <HugeiconsIcon icon={isCopied ? Tick01Icon : Copy01Icon} className="size-3.5" />
            </MessageAction>
          </MessageActions>
        )}
      </Message>
    </motion.div>
  )
}

// ============================================================================
// TOOL CALL COMPONENT (Full version with input/output)
// ============================================================================

/** Human-readable names for tools */
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  // CAD tools
  createBox: "Create Box",
  createCylinder: "Create Cylinder",
  createSphere: "Create Sphere",
  createCone: "Create Cone",
  createTorus: "Create Torus",
  modifyShape: "Modify Shape",
  // Channel tools
  createRectangularChannel: "Create Rectangular Channel",
  createTrapezoidalChannel: "Create Trapezoidal Channel",
  createTriangularChannel: "Create Triangular Channel",
  createTransition: "Create Transition",
  // Analysis tools
  analyzeNormalFlow: "Analyze Normal Flow",
  calculateDischargeDepth: "Calculate Normal Depth",
  calculateCriticalDepth: "Calculate Critical Depth",
  analyzeGVF: "Analyze GVF Profile",
  // Modification tools
  modifyChannel: "Modify Channel",
  deleteObject: "Delete Object",
  duplicateObject: "Duplicate Object",
  // Boolean operations
  booleanUnion: "Boolean Union",
  booleanSubtract: "Boolean Subtract",
  booleanIntersect: "Boolean Intersect",
  // Context & Information
  getSceneInfo: "Get Scene Info",
  getObjectInfo: "Get Object Info",
  measureDistance: "Measure Distance",
  // History & UX tools
  undo: "Undo",
  redo: "Redo",
  clearScene: "Clear Scene",
  getHistoryInfo: "History Info",
  // Scene tools
  setMaterial: "Set Material",
  moveObject: "Move Object",
  rotateObject: "Rotate Object",
  scaleObject: "Scale Object",
  transformObject: "Transform Object",
  setVisibility: "Set Visibility",
  setLocked: "Lock/Unlock",
  selectObjects: "Select Objects",
  renameObject: "Rename Object",
  copyObjects: "Copy Objects",
  focusObjects: "Focus Camera",
  setCameraView: "Set Camera View",
  alignObjects: "Align Objects",
  distributeObjects: "Distribute Objects",
  arrayObjects: "Array Objects",
  polarArray: "Polar Array",
  setLayer: "Set Layer",
  setLOD: "Set Detail Level",
  // Export tools
  exportScene: "Export Scene",
}

/** Format tool arguments for display */
function formatToolArgs(args: Record<string, unknown> | undefined): string {
  if (!args || Object.keys(args).length === 0) return "No parameters"

  const formatValue = (value: unknown): string => {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return Object.entries(args)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join("\n")
}

function ToolCallDisplay({ tool }: { tool: ToolCallInfo }) {
  const displayName = TOOL_DISPLAY_NAMES[tool.name] || tool.name

  // Map status
  const status: ToolStatus =
    tool.status === "running"
      ? "running"
      : tool.status === "completed"
        ? "completed"
        : tool.status === "failed"
          ? "failed"
          : "pending"

  // For running state, show simple indicator
  if (status === "running") {
    return (
      <Tool status={status} className="my-2">
        <ToolTrigger>{displayName}</ToolTrigger>
      </Tool>
    )
  }

  // For completed/failed, show full details
  const hasError = status === "failed"

  return (
    <Tool status={status} defaultOpen={hasError} className="my-2">
      <ToolTrigger>{displayName}</ToolTrigger>
      <ToolContent className="space-y-2">
        {tool.args && Object.keys(tool.args).length > 0 && (
          <ToolInput>{formatToolArgs(tool.args)}</ToolInput>
        )}
        {hasError && tool.result ? (
          <ToolError>{tool.result}</ToolError>
        ) : tool.result ? (
          <ToolOutput>{tool.result}</ToolOutput>
        ) : null}
      </ToolContent>
    </Tool>
  )
}

// ============================================================================
// WELCOME SCREEN
// ============================================================================

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void
}

function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  const { t } = useTranslation()

  const suggestions = [
    { text: "Create a box 2m x 1m x 0.5m", category: t("ai.suggestions.cad") },
    { text: "Create a 2m wide rectangular channel", category: t("ai.suggestions.channel") },
    { text: "Analyze flow for Q=5 m3/s", category: t("ai.suggestions.analysis") },
    { text: "What is the Manning coefficient for concrete?", category: t("ai.suggestions.info") },
  ]

  return (
    <ConversationEmptyState
      icon={
        <div data-slot="welcome-icon" className="relative">
          {/* Main logo container */}
          <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <CadhyLogo className="size-9 text-white" />
          </div>
          {/* AI Badge */}
          <div className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md ring-2 ring-background">
            <HugeiconsIcon icon={SparklesIcon} className="size-3.5 text-white" />
          </div>
        </div>
      }
      title={t("ai.welcome.title")}
      description={t("ai.welcome.description")}
    >
      {/* Suggestions */}
      <div className="w-full max-w-sm space-y-2 mt-4">
        <p className="text-xs text-muted-foreground mb-2">{t("ai.welcome.trySaying")}</p>
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSuggestionClick(suggestion.text)}
            className="w-full text-left px-3 py-2 text-xs rounded-lg border border-border/50 hover:bg-muted/50 hover:border-border transition-colors group"
          >
            <span className="text-muted-foreground text-[10px] uppercase tracking-wide mr-2 group-hover:text-foreground/70">
              {suggestion.category}
            </span>
            <span className="text-foreground/80 group-hover:text-foreground">
              {suggestion.text}
            </span>
          </button>
        ))}
      </div>
    </ConversationEmptyState>
  )
}

// ============================================================================
// PROJECT REQUIRED EMPTY STATE
// ============================================================================

interface ProjectRequiredEmptyStateProps {
  onOpenProject?: () => void
  onNewProject?: () => void
}

function ProjectRequiredEmptyState({
  onOpenProject,
  onNewProject,
}: ProjectRequiredEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <ConversationEmptyState
      icon={
        <div data-slot="project-required-icon" className="relative">
          {/* Main logo container - muted/grayed out */}
          <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center shadow-md border border-border/50">
            <CadhyLogo className="size-9 text-muted-foreground/50" />
          </div>
          {/* Lock/Warning Badge */}
          <div className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-muted flex items-center justify-center shadow-md ring-2 ring-background">
            <HugeiconsIcon icon={FolderOpenIcon} className="size-3.5 text-muted-foreground" />
          </div>
        </div>
      }
      title={t("ai.projectRequired.title")}
      description={t("ai.projectRequired.description")}
    >
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full max-w-xs">
        {onOpenProject && (
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={onOpenProject}>
            <HugeiconsIcon icon={FolderOpenIcon} className="size-4" />
            {t("ai.projectRequired.openProject")}
          </Button>
        )}
        {onNewProject && (
          <Button variant="default" size="sm" className="flex-1 gap-2" onClick={onNewProject}>
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
            {t("ai.projectRequired.newProject")}
          </Button>
        )}
      </div>
    </ConversationEmptyState>
  )
}

// ============================================================================
// CHAT HISTORY SHEET (iOS-style bottom sheet)
// ============================================================================

interface SessionGroup {
  label: string
  sessions: ChatSessionMeta[]
}

/** Group sessions by date (Today, Yesterday, This Week, Older) */
function groupSessionsByDate(
  sessions: ChatSessionMeta[],
  t: (key: string) => string
): SessionGroup[] {
  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const groups = {
    today: [] as ChatSessionMeta[],
    yesterday: [] as ChatSessionMeta[],
    thisWeek: [] as ChatSessionMeta[],
    older: [] as ChatSessionMeta[],
  }

  for (const session of sortedSessions) {
    const sessionDate = new Date(session.updatedAt)
    if (sessionDate >= today) {
      groups.today.push(session)
    } else if (sessionDate >= yesterday) {
      groups.yesterday.push(session)
    } else if (sessionDate >= weekAgo) {
      groups.thisWeek.push(session)
    } else {
      groups.older.push(session)
    }
  }

  const result: SessionGroup[] = []
  if (groups.today.length > 0) result.push({ label: t("ai.history.today"), sessions: groups.today })
  if (groups.yesterday.length > 0)
    result.push({ label: t("ai.history.yesterday"), sessions: groups.yesterday })
  if (groups.thisWeek.length > 0)
    result.push({ label: t("ai.history.thisWeek"), sessions: groups.thisWeek })
  if (groups.older.length > 0) result.push({ label: t("ai.history.older"), sessions: groups.older })

  return result
}

interface ChatHistorySheetProps {
  isOpen: boolean
  onClose: () => void
  sessions: ChatSessionMeta[]
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onNewChat: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

function ChatHistorySheet({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  containerRef,
}: ChatHistorySheetProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")

  // Filter sessions by search
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const q = searchQuery.toLowerCase()
    return sessions.filter(
      (s) => s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q)
    )
  }, [sessions, searchQuery])

  // Group by date
  const groupedSessions = useMemo(
    () => groupSessionsByDate(filteredSessions, t),
    [filteredSessions, t]
  )

  const handleNewChat = () => {
    onNewChat()
    onClose()
  }

  if (!isOpen || !containerRef.current) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 h-[60%] bg-background border-t border-border rounded-t-xl z-50 flex flex-col shadow-lg"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="px-3 pb-2 space-y-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{t("ai.history.title")}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-foreground"
                onClick={handleNewChat}
              >
                <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                {t("ai.newChat")}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("common.close")}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Search */}
          <InputGroup className="border-border/50 h-8 rounded-lg shadow-none bg-transparent dark:bg-transparent focus-within:border-primary/50">
            <InputGroupAddon align="inline-start">
              <HugeiconsIcon icon={Search01Icon} className="size-4 opacity-50" />
            </InputGroupAddon>
            <input
              data-slot="input-group-control"
              type="text"
              placeholder={t("ai.history.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none ring-0 focus:ring-0 focus:outline-none"
            />
          </InputGroup>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filteredSessions.length === 0 ? (
            <div className="py-8 text-center">
              <HugeiconsIcon
                icon={MessageMultiple01Icon}
                className="size-8 mx-auto text-muted-foreground/50 mb-2"
              />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? t("ai.history.noResults") : t("ai.history.empty")}
              </p>
            </div>
          ) : (
            groupedSessions.map((group) => (
              <div key={group.label} className="mb-3">
                <div className="px-2 py-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                {group.sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={cn(
                      "group relative flex flex-col gap-1 p-3 rounded-lg cursor-pointer transition-colors",
                      "hover:bg-accent/80",
                      session.id === currentSessionId && "bg-primary/10 ring-1 ring-primary/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground line-clamp-1 flex-1">
                        {session.title}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onDeleteSession(session.id)
                            }}
                            className="shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                          >
                            <HugeiconsIcon
                              icon={Delete01Icon}
                              className="size-3.5 text-destructive"
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">{t("common.delete")}</TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {session.preview || t("ai.history.noMessages")}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </>,
    containerRef.current
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIChatPanel({ className, onClose, onOpenProject, onNewProject }: AIChatPanelProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Check if a project is open
  const currentProject = useProjectStore((s) => s.currentProject)
  const hasProject = currentProject !== null

  // Chat store for session management
  const { createSession, sessions, currentSessionId, switchSession, deleteSession, loadSessions } =
    useChatStore()

  // State for history sheet
  const [showHistory, setShowHistory] = useState(false)

  // Load sessions when project changes or on mount
  useEffect(() => {
    console.log(
      "[AIChatPanel] Project/session effect - project:",
      currentProject?.name,
      "sessionId:",
      currentSessionId
    )
    // Always try to load sessions when we have a project but no session
    if (currentProject && !currentSessionId) {
      console.log("[AIChatPanel] Loading sessions for project:", currentProject.name)
      loadSessions()
    }
  }, [currentProject?.id, currentSessionId, loadSessions, currentProject?.name, currentProject])

  // Use the AI chat hook
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    stop,
    clear,
    modelId,
    setModelId,
    modelGroups,
    availableModels,
  } = useAIChat()

  // Get current provider from model ID
  const currentProvider = getProviderFromModelId(modelId)
  const CurrentProviderIcon = getProviderIcon(currentProvider)

  // Get session usage for token display
  const sessionUsage = useSessionUsage()
  const currentModel = getModelById(modelId)
  const maxTokens = currentModel?.maxTokens ?? 128000

  // Handle new chat
  const handleNewChat = useCallback(async () => {
    await createSession()
    clear()
  }, [createSession, clear])

  // Handle session select from history
  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      await switchSession(sessionId)
      setShowHistory(false)
    },
    [switchSession]
  )

  // Handle session delete from history
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId)
    },
    [deleteSession]
  )

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    await sendMessage()
  }

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (text: string) => {
      setInput(text)
      textareaRef.current?.focus()
    },
    [setInput]
  )

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div
      ref={panelRef}
      data-slot="ai-chat-panel"
      className={cn("relative flex h-full flex-col overflow-hidden bg-background", className)}
    >
      {/* Header */}
      <div
        data-slot="chat-header"
        className="flex h-10 shrink-0 items-center justify-between border-b border-border/40 bg-muted/30 px-3"
      >
        <div className="flex items-center gap-2">
          <div className="size-5 rounded flex items-center justify-center">
            <CadhyLogo className="size-4 text-foreground" />
          </div>
          <span className="text-xs font-medium">{t("ai.title")}</span>
          {isLoading && <span className="size-1.5 bg-violet-500 rounded-full animate-pulse" />}
        </div>
        <div className="flex items-center gap-1">
          {/* Token usage indicator */}
          {sessionUsage.totalTokens > 0 && (
            <Context
              usedTokens={sessionUsage.totalTokens}
              maxTokens={maxTokens}
              modelId={modelId}
              modelName={currentModel?.name}
              usage={{
                inputTokens: sessionUsage.inputTokens,
                outputTokens: sessionUsage.outputTokens,
                totalTokens: sessionUsage.totalTokens,
                reasoningTokens: sessionUsage.reasoningTokens,
                cachedInputTokens: sessionUsage.cachedInputTokens,
              }}
              pricing={
                currentModel?.pricing
                  ? {
                      input: currentModel.pricing.input,
                      output: currentModel.pricing.output,
                      cachedInputTokens: currentModel.pricing.cachedInput,
                    }
                  : undefined
              }
            >
              <ContextTrigger />
              <ContextContent>
                <ContextContentHeader />
                <ContextContentBody>
                  <ContextInputUsage />
                  <ContextOutputUsage />
                  <ContextReasoningUsage />
                  <ContextCacheUsage />
                </ContextContentBody>
                <ContextContentFooter />
              </ContextContent>
            </Context>
          )}

          {/* Model selector with provider icons - grouped by provider */}
          <Select value={modelId} onValueChange={(value) => value && setModelId(value)}>
            <SelectTrigger className="h-6 w-auto max-w-[180px] text-[10px] border-none bg-transparent hover:bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              side="bottom"
              align="end"
              alignItemWithTrigger={false}
              className="min-w-[220px]"
            >
              {modelGroups.length > 0
                ? modelGroups.map((group, groupIndex) => (
                    <Fragment key={group.provider}>
                      {groupIndex > 0 && <SelectSeparator />}
                      <SelectGroup>
                        <SelectLabel className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground px-2 py-1">
                          {group.isActive && (
                            <span className="size-1.5 rounded-full bg-green-500" />
                          )}
                          {group.label}
                        </SelectLabel>
                        {group.models.map((model) => {
                          const ModelIcon = getProviderIcon(model.provider)
                          return (
                            <SelectItem key={model.id} value={model.id} className="text-xs">
                              <div className="flex items-center gap-2">
                                <ModelIcon className="size-3.5 shrink-0" />
                                <span>{model.name}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectGroup>
                    </Fragment>
                  ))
                : // Fallback to flat list if no groups (shouldn't happen)
                  availableModels.map((model) => {
                    const ModelIcon = getProviderIcon(model.provider)
                    return (
                      <SelectItem key={model.id} value={model.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <ModelIcon className="size-3.5 shrink-0" />
                          <span>{model.name}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
            </SelectContent>
          </Select>

          {/* New Chat button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" onClick={handleNewChat}>
                <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("ai.newChat")}</TooltipContent>
          </Tooltip>

          {/* History button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" onClick={() => setShowHistory(true)}>
                <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("ai.history.title")}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Messages, Welcome, or Project Required */}
      <div className="flex-1 min-h-0 relative">
        {!hasProject ? (
          <ProjectRequiredEmptyState onOpenProject={onOpenProject} onNewProject={onNewProject} />
        ) : hasMessages ? (
          <Conversation autoScroll>
            <ConversationContent className="divide-y divide-border/20 p-0">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={message.isStreaming}
                  fallbackProvider={currentProvider}
                />
              ))}
              {/* Loading indicator when waiting for response */}
              {isLoading && messages.length > 0 && !messages[messages.length - 1]?.isStreaming && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 px-4 py-3"
                >
                  <div className="size-7 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden p-1">
                    <CurrentProviderIcon className="size-5 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="size-2 bg-muted-foreground/50 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="size-2 bg-muted-foreground/50 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="size-2 bg-muted-foreground/50 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </motion.div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        ) : (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        )}
      </div>

      {/* Input */}
      <div data-slot="chat-input" className="shrink-0 border-t border-border/40 p-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasProject ? t("ai.placeholder") : t("ai.projectRequired.title")}
            className="min-h-[36px] max-h-[120px] resize-none text-sm"
            rows={1}
            disabled={isLoading || !hasProject}
          />
          {isLoading ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="icon" variant="destructive" onClick={stop}>
                  <HugeiconsIcon icon={StopIcon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t("ai.stop")}</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" size="icon" disabled={!input.trim() || !hasProject}>
                  <HugeiconsIcon icon={SentIcon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t("ai.send")}</TooltipContent>
            </Tooltip>
          )}
        </form>
      </div>

      {/* History Sheet */}
      <ChatHistorySheet
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
        containerRef={panelRef}
      />
    </div>
  )
}

export default AIChatPanel
