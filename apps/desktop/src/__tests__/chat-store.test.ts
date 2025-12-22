/**
 * Chat Store Tests - @cadhy/desktop
 *
 * Tests for the chat store synchronous operations:
 * - Session management
 * - Message management
 * - Model selection
 * - State clearing
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import type { Message } from "@/hooks/use-ai-chat"
import { useChatStore } from "../stores/chat-store"

// Mock external services to isolate store tests
mock.module("@/services/chat-persistence", () => ({
  ChatPersistenceService: class MockChatPersistenceService {
    init = mock(() => Promise.resolve())
    listSessions = mock(() => Promise.resolve([]))
    loadSession = mock(() => Promise.resolve([]))
    saveSession = mock(() => Promise.resolve())
    deleteSession = mock(() => Promise.resolve())
  },
  generateSessionId: () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
}))

mock.module("@/services/ai-service", () => ({
  getDefaultModelId: () => "claude-3-sonnet",
}))

// Mock project store (no project open for isolated tests)
mock.module("./project-store", () => ({
  useProjectStore: {
    getState: () => ({ currentProject: null }),
    subscribe: () => () => {},
  },
}))

describe("Chat Store", () => {
  beforeEach(() => {
    // Reset store to initial state
    useChatStore.setState({
      sessions: [],
      currentSessionId: null,
      currentMessages: [],
      selectedModelId: "claude-3-sonnet",
      isLoadingSessions: false,
      isLoadingMessages: false,
      isSaving: false,
      _messageCache: new Map(),
    })
  })

  // ============================================================
  // Initial State Tests
  // ============================================================

  describe("Initial State", () => {
    test("should have empty sessions", () => {
      const state = useChatStore.getState()
      expect(state.sessions).toEqual([])
    })

    test("should have no current session", () => {
      const state = useChatStore.getState()
      expect(state.currentSessionId).toBeNull()
    })

    test("should have empty messages", () => {
      const state = useChatStore.getState()
      expect(state.currentMessages).toEqual([])
    })

    test("should have default model selected", () => {
      const state = useChatStore.getState()
      expect(state.selectedModelId).toBe("claude-3-sonnet")
    })

    test("should not be loading", () => {
      const state = useChatStore.getState()
      expect(state.isLoadingSessions).toBe(false)
      expect(state.isLoadingMessages).toBe(false)
    })

    test("should not be saving", () => {
      const state = useChatStore.getState()
      expect(state.isSaving).toBe(false)
    })
  })

  // ============================================================
  // Model Selection Tests
  // ============================================================

  describe("Model Selection", () => {
    test("should set selected model", () => {
      const { setSelectedModelId } = useChatStore.getState()

      setSelectedModelId("claude-3-opus")

      expect(useChatStore.getState().selectedModelId).toBe("claude-3-opus")
    })

    test("should persist model selection across sessions", () => {
      const { setSelectedModelId } = useChatStore.getState()
      setSelectedModelId("gpt-4")

      // Simulate session change by clearing messages
      useChatStore.setState({ currentMessages: [] })

      // Model should still be selected
      expect(useChatStore.getState().selectedModelId).toBe("gpt-4")
    })
  })

  // ============================================================
  // Message Management Tests
  // ============================================================

  describe("Message Management", () => {
    const createTestMessage = (role: "user" | "assistant", content: string): Message => ({
      id: `msg-${Date.now()}`,
      role,
      content,
      createdAt: Date.now(),
    })

    test("should set messages directly", () => {
      const { setCurrentMessages } = useChatStore.getState()
      const messages: Message[] = [
        createTestMessage("user", "Hello"),
        createTestMessage("assistant", "Hi there!"),
      ]

      setCurrentMessages(messages)

      expect(useChatStore.getState().currentMessages).toHaveLength(2)
    })

    test("should set messages with updater function", () => {
      const { setCurrentMessages } = useChatStore.getState()
      setCurrentMessages([createTestMessage("user", "First")])

      setCurrentMessages((prev) => [...prev, createTestMessage("assistant", "Second")])

      expect(useChatStore.getState().currentMessages).toHaveLength(2)
    })

    test("should update session metadata when messages change", () => {
      // First set up a session
      useChatStore.setState({
        sessions: [
          {
            id: "test-session",
            title: "New Chat",
            preview: "Empty",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 0,
            modelId: "claude-3-sonnet",
          },
        ],
        currentSessionId: "test-session",
      })

      const { setCurrentMessages } = useChatStore.getState()
      setCurrentMessages([createTestMessage("user", "What is the weather today?")])

      const state = useChatStore.getState()
      const session = state.sessions.find((s) => s.id === "test-session")

      expect(session?.messageCount).toBe(1)
      expect(session?.title).toBe("What is the weather today?")
    })

    test("should update preview with last message", () => {
      useChatStore.setState({
        sessions: [
          {
            id: "test-session",
            title: "Test",
            preview: "Empty",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 0,
            modelId: "claude-3-sonnet",
          },
        ],
        currentSessionId: "test-session",
      })

      const { setCurrentMessages } = useChatStore.getState()
      setCurrentMessages([
        createTestMessage("user", "Question"),
        createTestMessage("assistant", "This is the answer to your question."),
      ])

      const session = useChatStore.getState().sessions[0]
      expect(session.preview).toContain("This is the answer")
    })

    test("should cache messages for session", () => {
      useChatStore.setState({
        currentSessionId: "cached-session",
      })

      const { setCurrentMessages } = useChatStore.getState()
      setCurrentMessages([createTestMessage("user", "Cached message")])

      const cache = useChatStore.getState()._messageCache
      expect(cache.get("cached-session")).toHaveLength(1)
    })
  })

  // ============================================================
  // Session Title Tests
  // ============================================================

  describe("Session Title", () => {
    test("should update session title", () => {
      useChatStore.setState({
        sessions: [
          {
            id: "test-session",
            title: "Original Title",
            preview: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 0,
            modelId: "claude-3-sonnet",
          },
        ],
      })

      const { updateSessionTitle } = useChatStore.getState()
      updateSessionTitle("test-session", "New Title")

      const session = useChatStore.getState().sessions[0]
      expect(session.title).toBe("New Title")
    })

    test("should not affect other sessions", () => {
      useChatStore.setState({
        sessions: [
          {
            id: "session-1",
            title: "Session 1",
            preview: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 0,
            modelId: "claude-3-sonnet",
          },
          {
            id: "session-2",
            title: "Session 2",
            preview: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 0,
            modelId: "claude-3-sonnet",
          },
        ],
      })

      const { updateSessionTitle } = useChatStore.getState()
      updateSessionTitle("session-1", "Updated Session 1")

      const sessions = useChatStore.getState().sessions
      expect(sessions.find((s) => s.id === "session-1")?.title).toBe("Updated Session 1")
      expect(sessions.find((s) => s.id === "session-2")?.title).toBe("Session 2")
    })
  })

  // ============================================================
  // Clear Sessions Tests
  // ============================================================

  describe("Clear Sessions", () => {
    test("should clear all sessions", () => {
      useChatStore.setState({
        sessions: [
          {
            id: "1",
            title: "Session 1",
            preview: "",
            createdAt: 0,
            updatedAt: 0,
            messageCount: 0,
            modelId: "",
          },
          {
            id: "2",
            title: "Session 2",
            preview: "",
            createdAt: 0,
            updatedAt: 0,
            messageCount: 0,
            modelId: "",
          },
        ],
        currentSessionId: "1",
        currentMessages: [{ id: "msg", role: "user", content: "test", createdAt: 0 }],
      })

      const { clearSessions } = useChatStore.getState()
      clearSessions()

      const state = useChatStore.getState()
      expect(state.sessions).toEqual([])
      expect(state.currentSessionId).toBeNull()
      expect(state.currentMessages).toEqual([])
    })

    test("should clear message cache", () => {
      const cache = useChatStore.getState()._messageCache
      cache.set("test", [{ id: "1", role: "user", content: "cached", createdAt: 0 }])

      const { clearSessions } = useChatStore.getState()
      clearSessions()

      expect(useChatStore.getState()._messageCache.size).toBe(0)
    })
  })

  // ============================================================
  // Session Creation Tests (Synchronous parts)
  // ============================================================

  describe("Session State", () => {
    test("should track loading state for sessions", () => {
      useChatStore.setState({ isLoadingSessions: true })
      expect(useChatStore.getState().isLoadingSessions).toBe(true)

      useChatStore.setState({ isLoadingSessions: false })
      expect(useChatStore.getState().isLoadingSessions).toBe(false)
    })

    test("should track loading state for messages", () => {
      useChatStore.setState({ isLoadingMessages: true })
      expect(useChatStore.getState().isLoadingMessages).toBe(true)

      useChatStore.setState({ isLoadingMessages: false })
      expect(useChatStore.getState().isLoadingMessages).toBe(false)
    })

    test("should track saving state", () => {
      useChatStore.setState({ isSaving: true })
      expect(useChatStore.getState().isSaving).toBe(true)

      useChatStore.setState({ isSaving: false })
      expect(useChatStore.getState().isSaving).toBe(false)
    })
  })

  // ============================================================
  // Multiple Sessions Tests
  // ============================================================

  describe("Multiple Sessions", () => {
    test("should maintain multiple sessions in state", () => {
      useChatStore.setState({
        sessions: [
          {
            id: "1",
            title: "Chat 1",
            preview: "",
            createdAt: 1000,
            updatedAt: 1000,
            messageCount: 0,
            modelId: "claude",
          },
          {
            id: "2",
            title: "Chat 2",
            preview: "",
            createdAt: 2000,
            updatedAt: 2000,
            messageCount: 0,
            modelId: "claude",
          },
          {
            id: "3",
            title: "Chat 3",
            preview: "",
            createdAt: 3000,
            updatedAt: 3000,
            messageCount: 0,
            modelId: "claude",
          },
        ],
      })

      expect(useChatStore.getState().sessions).toHaveLength(3)
    })

    test("should maintain session order by creation time", () => {
      const sessions = [
        {
          id: "3",
          title: "Newest",
          preview: "",
          createdAt: 3000,
          updatedAt: 3000,
          messageCount: 0,
          modelId: "claude",
        },
        {
          id: "1",
          title: "Oldest",
          preview: "",
          createdAt: 1000,
          updatedAt: 1000,
          messageCount: 0,
          modelId: "claude",
        },
        {
          id: "2",
          title: "Middle",
          preview: "",
          createdAt: 2000,
          updatedAt: 2000,
          messageCount: 0,
          modelId: "claude",
        },
      ]
      useChatStore.setState({ sessions })

      // Sessions should be in the order they were set
      const state = useChatStore.getState()
      expect(state.sessions[0].id).toBe("3")
    })
  })
})
