/**
 * Chat Store - CADHY
 *
 * Manages AI chat state: sessions, messages, and persistence.
 * Coordinates with project-store for project-scoped chat history.
 */

import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { Message } from "@/hooks/useAIChat"
import { getDefaultModelId } from "@/services/ai-service"
import {
  ChatPersistenceService,
  type ChatSessionMeta,
  generateSessionId,
} from "@/services/chat-persistence"
import { useProjectStore } from "./project-store"

// ============================================================================
// TYPES
// ============================================================================

/** Token usage data for a session */
export interface SessionUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  reasoningTokens: number
  cachedInputTokens: number
}

interface ChatStoreState {
  /** List of chat sessions for current project */
  sessions: ChatSessionMeta[]

  /** Currently active session ID */
  currentSessionId: string | null

  /** Messages for the current session */
  currentMessages: Message[]

  /** Selected model ID (persists across sessions) */
  selectedModelId: string

  /** Token usage for the current session */
  sessionUsage: SessionUsage

  /** Loading states */
  isLoadingSessions: boolean
  isLoadingMessages: boolean
  isSaving: boolean

  /** Whether the AI is currently analyzing the 3D scene */
  isAnalyzingScene: boolean

  /** In-memory message cache (for when no project is open) */
  _messageCache: Map<string, Message[]>
}

interface ChatStoreActions {
  /** Load sessions for current project */
  loadSessions: () => Promise<void>

  /** Create a new session */
  createSession: () => Promise<string>

  /** Switch to a different session */
  switchSession: (sessionId: string) => Promise<void>

  /** Delete a session */
  deleteSession: (sessionId: string) => Promise<void>

  /** Update messages for current session (called by useAIChat) */
  setCurrentMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void

  /** Save current session to disk */
  saveCurrentSession: () => Promise<void>

  /** Update session title */
  updateSessionTitle: (sessionId: string, title: string) => void

  /** Set selected model */
  setSelectedModelId: (modelId: string) => void

  /** Set whether AI is analyzing the 3D scene */
  setAnalyzingScene: (analyzing: boolean) => void

  /** Add token usage to the current session */
  addUsage: (usage: Partial<SessionUsage>) => void

  /** Reset session usage (e.g., when switching sessions) */
  resetSessionUsage: () => void

  /** Clear all sessions (when project closes) */
  clearSessions: () => void
}

type ChatStore = ChatStoreState & ChatStoreActions

// ============================================================================
// HELPERS
// ============================================================================

function getPersistenceService(): ChatPersistenceService | null {
  const project = useProjectStore.getState().currentProject
  console.log("[ChatStore] getPersistenceService - project:", project?.name, "path:", project?.path)
  if (!project?.path) return null
  return new ChatPersistenceService(project.path)
}

// ============================================================================
// STORE
// ============================================================================

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    sessions: [],
    currentSessionId: null,
    currentMessages: [],
    selectedModelId: getDefaultModelId(),
    sessionUsage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      reasoningTokens: 0,
      cachedInputTokens: 0,
    },
    isLoadingSessions: false,
    isLoadingMessages: false,
    isSaving: false,
    isAnalyzingScene: false,
    _messageCache: new Map<string, Message[]>(),

    // Actions
    loadSessions: async () => {
      console.log("[ChatStore] loadSessions called")
      const persistence = getPersistenceService()
      if (!persistence) {
        console.log(
          "[ChatStore] No persistence service (no project open) - creating in-memory session"
        )
        // No project open - create in-memory session
        if (get().sessions.length === 0) {
          await get().createSession()
        }
        return
      }

      set({ isLoadingSessions: true })

      try {
        console.log("[ChatStore] Initializing persistence...")
        await persistence.init()
        console.log("[ChatStore] Listing sessions...")
        const sessions = await persistence.listSessions()
        console.log("[ChatStore] Found sessions:", sessions.length, sessions)

        set({
          sessions,
          isLoadingSessions: false,
        })

        // If we have sessions but none selected, select the most recent
        if (sessions.length > 0 && !get().currentSessionId) {
          console.log("[ChatStore] Switching to most recent session:", sessions[0].id)
          await get().switchSession(sessions[0].id)
        } else if (sessions.length === 0) {
          // No sessions exist, create one
          console.log("[ChatStore] No sessions, creating new one")
          await get().createSession()
        }
      } catch (error) {
        console.error("[ChatStore] Failed to load sessions:", error)
        set({ isLoadingSessions: false })
        // Create in-memory session as fallback
        await get().createSession()
      }
    },

    createSession: async () => {
      const newId = generateSessionId()
      const { selectedModelId, _messageCache } = get()
      const now = Date.now()

      console.log("[ChatStore] createSession - newId:", newId)

      const newSession: ChatSessionMeta = {
        id: newId,
        title: "New Chat",
        preview: "Empty",
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        modelId: selectedModelId,
      }

      // Initialize empty cache for this session
      _messageCache.set(newId, [])

      set((state) => ({
        sessions: [newSession, ...state.sessions],
        currentSessionId: newId,
        currentMessages: [],
      }))

      // Try to persist if we have a project
      const persistence = getPersistenceService()
      if (persistence) {
        try {
          console.log("[ChatStore] Persisting new session to disk...")
          await persistence.saveSession(newId, [], selectedModelId, "New Chat", now)
          console.log("[ChatStore] New session persisted successfully")
        } catch (error) {
          console.error("[ChatStore] Failed to persist new session:", error)
        }
      } else {
        console.log("[ChatStore] No persistence service - session is in-memory only")
      }

      return newId
    },

    switchSession: async (sessionId: string) => {
      const { currentSessionId, currentMessages, _messageCache } = get()

      if (currentSessionId === sessionId) return

      // Save current messages to cache before switching
      if (currentSessionId && currentMessages.length > 0) {
        _messageCache.set(currentSessionId, currentMessages)
      }

      // Save current session before switching (for persistence)
      await get().saveCurrentSession()

      // Reset usage when switching sessions
      get().resetSessionUsage()

      set({ isLoadingMessages: true, currentSessionId: sessionId })

      const persistence = getPersistenceService()
      if (persistence) {
        try {
          const messages = await persistence.loadSession(sessionId)
          set({
            currentMessages: messages,
            isLoadingMessages: false,
          })
        } catch (error) {
          console.error("[ChatStore] Failed to load session:", error)
          // Try cache as fallback
          const cachedMessages = get()._messageCache.get(sessionId) ?? []
          set({ currentMessages: cachedMessages, isLoadingMessages: false })
        }
      } else {
        // In-memory only - load from cache
        const cachedMessages = get()._messageCache.get(sessionId) ?? []
        set({ currentMessages: cachedMessages, isLoadingMessages: false })
      }
    },

    deleteSession: async (sessionId: string) => {
      const { currentSessionId, sessions, _messageCache } = get()
      const persistence = getPersistenceService()

      // Delete from disk
      if (persistence) {
        try {
          await persistence.deleteSession(sessionId)
        } catch (error) {
          console.error("[ChatStore] Failed to delete session:", error)
        }
      }

      // Delete from cache
      _messageCache.delete(sessionId)

      // Update state
      const newSessions = sessions.filter((s) => s.id !== sessionId)
      set({ sessions: newSessions })

      // If deleted current session, switch to another or create new
      if (currentSessionId === sessionId) {
        if (newSessions.length > 0) {
          await get().switchSession(newSessions[0].id)
        } else {
          await get().createSession()
        }
      }
    },

    setCurrentMessages: (messagesOrUpdater: Message[] | ((prev: Message[]) => Message[])) => {
      // Support both direct value and updater function (like React's setState)
      const messages =
        typeof messagesOrUpdater === "function"
          ? messagesOrUpdater(get().currentMessages)
          : messagesOrUpdater

      set({ currentMessages: messages })

      // Update session metadata and cache
      const { currentSessionId, sessions, _messageCache } = get()
      if (!currentSessionId) return

      // Always update cache for in-memory fallback
      _messageCache.set(currentSessionId, messages)

      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")
      const lastMsg = messages[messages.length - 1]

      const updatedSessions = sessions.map((s) => {
        if (s.id !== currentSessionId) return s
        return {
          ...s,
          title: s.messageCount === 0 && lastUserMsg ? lastUserMsg.content.slice(0, 50) : s.title,
          preview: lastMsg?.content.slice(0, 100) ?? "Empty",
          updatedAt: Date.now(),
          messageCount: messages.length,
        }
      })

      set({ sessions: updatedSessions })
    },

    saveCurrentSession: async () => {
      const { currentSessionId, currentMessages, selectedModelId, sessions } = get()
      console.log(
        "[ChatStore] saveCurrentSession called - sessionId:",
        currentSessionId,
        "messages:",
        currentMessages.length
      )

      if (!currentSessionId || get().isSaving) {
        console.log("[ChatStore] Skip save - no session or already saving")
        return
      }

      const persistence = getPersistenceService()
      if (!persistence) {
        console.log("[ChatStore] Skip save - no persistence service")
        return
      }

      const session = sessions.find((s) => s.id === currentSessionId)
      if (!session) {
        console.log("[ChatStore] Skip save - session not found in sessions list")
        return
      }

      set({ isSaving: true })

      try {
        console.log("[ChatStore] Saving session to disk...")
        await persistence.saveSession(
          currentSessionId,
          currentMessages,
          selectedModelId,
          session.title,
          session.createdAt
        )
        console.log("[ChatStore] Session saved successfully")
      } catch (error) {
        console.error("[ChatStore] Failed to save session:", error)
      } finally {
        set({ isSaving: false })
      }
    },

    updateSessionTitle: (sessionId: string, title: string) => {
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, title } : s)),
      }))
    },

    setSelectedModelId: (modelId: string) => {
      set({ selectedModelId: modelId })
    },

    setAnalyzingScene: (analyzing: boolean) => {
      set({ isAnalyzingScene: analyzing })
    },

    addUsage: (usage: Partial<SessionUsage>) => {
      set((state) => ({
        sessionUsage: {
          inputTokens: state.sessionUsage.inputTokens + (usage.inputTokens ?? 0),
          outputTokens: state.sessionUsage.outputTokens + (usage.outputTokens ?? 0),
          totalTokens: state.sessionUsage.totalTokens + (usage.totalTokens ?? 0),
          reasoningTokens: state.sessionUsage.reasoningTokens + (usage.reasoningTokens ?? 0),
          cachedInputTokens: state.sessionUsage.cachedInputTokens + (usage.cachedInputTokens ?? 0),
        },
      }))
    },

    resetSessionUsage: () => {
      set({
        sessionUsage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          reasoningTokens: 0,
          cachedInputTokens: 0,
        },
      })
    },

    clearSessions: () => {
      get()._messageCache.clear()
      set({
        sessions: [],
        currentSessionId: null,
        currentMessages: [],
        sessionUsage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          reasoningTokens: 0,
          cachedInputTokens: 0,
        },
      })
    },
  }))
)

// ============================================================================
// PROJECT CHANGE LISTENER
// ============================================================================

// Track the last known project ID to detect changes
let lastKnownProjectId: string | null = null

// Flag to prevent concurrent loading operations
let isLoadingInProgress = false

/**
 * Handle project change - loads chat sessions for the new project
 * Can be called directly from project store or via subscription
 */
export async function handleProjectChange(
  newProjectId: string | null,
  newProjectPath: string | null
): Promise<void> {
  // Prevent concurrent loading
  if (isLoadingInProgress) {
    console.log("[ChatStore] Skipping - load already in progress")
    return
  }

  const previousProjectId = lastKnownProjectId

  // Skip if project hasn't actually changed
  if (newProjectId === previousProjectId) {
    console.log("[ChatStore] Skipping - same project ID")
    return
  }

  isLoadingInProgress = true
  lastKnownProjectId = newProjectId

  console.log("[ChatStore] Project changed:", {
    from: previousProjectId,
    to: newProjectId,
    path: newProjectPath,
  })

  const store = useChatStore.getState()

  try {
    // 1. Save current session before switching (if we had a project)
    if (previousProjectId && store.currentSessionId) {
      console.log("[ChatStore] Saving session before switching...")
      await store.saveCurrentSession()
    }

    // 2. Always clear sessions when project changes
    console.log("[ChatStore] Clearing sessions...")
    store.clearSessions()

    // 3. If new project opened, load its sessions
    if (newProjectId && newProjectPath) {
      console.log("[ChatStore] Loading sessions for new project...")
      await store.loadSessions()
    }
  } catch (error) {
    console.error("[ChatStore] Error handling project change:", error)
    // Ensure we still create an in-memory session on error
    if (store.sessions.length === 0) {
      await store.createSession()
    }
  } finally {
    isLoadingInProgress = false
  }
}

// Subscribe to project store changes
// Note: useProjectStore doesn't use subscribeWithSelector, so we subscribe to full state
useProjectStore.subscribe((state) => {
  const currentProjectId = state.currentProject?.id ?? null
  const currentProjectPath = state.currentProject?.path ?? null

  // Only react if project actually changed
  if (currentProjectId === lastKnownProjectId) return

  // Handle the change asynchronously
  handleProjectChange(currentProjectId, currentProjectPath)
})

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useChatSessions = () => useChatStore((s) => s.sessions)
export const useCurrentSessionId = () => useChatStore((s) => s.currentSessionId)
export const useCurrentMessages = () => useChatStore((s) => s.currentMessages)
export const useSelectedModelId = () => useChatStore((s) => s.selectedModelId)
export const useSessionUsage = () => useChatStore((s) => s.sessionUsage)
export const useIsSavingChat = () => useChatStore((s) => s.isSaving)
export const useIsAnalyzingScene = () => useChatStore((s) => s.isAnalyzingScene)
