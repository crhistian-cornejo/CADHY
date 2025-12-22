/**
 * Chat Persistence Service - CADHY
 *
 * Handles chat session storage via Tauri IPC commands.
 * Sessions are stored in the project directory: ProjectDir/.chat/sessions/
 */

import { invoke } from "@tauri-apps/api/core"
import type { Message } from "@/hooks/use-ai-chat"

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert Uint8Array to base64 string for JSON storage
 */
function uint8ArrayToBase64(uint8Array: Uint8Array | undefined): string {
  if (!uint8Array) return ""
  let binary = ""
  const len = uint8Array.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string back to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array | undefined {
  if (!base64) return undefined
  try {
    const binary = atob(base64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return undefined
  }
}

// ============================================================================
// TYPES
// ============================================================================

/** Metadata for a chat session (lightweight, for listing) */
export interface ChatSessionMeta {
  id: string
  title: string
  preview: string
  createdAt: number
  updatedAt: number
  messageCount: number
  modelId: string
}

/** Stored image format (base64 for JSON serialization) */
export interface StoredMessageImage {
  /** Base64 encoded image data */
  base64: string
  /** MIME type of the image */
  mediaType: string
}

/** Message format for storage */
export interface StoredChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string // ISO string
  modelId?: string
  provider?: string
  toolCalls?: {
    name: string
    status: string
    result?: string
  }[]
  /** Generated images (stored as base64 for JSON compatibility) */
  images?: StoredMessageImage[]
}

/** Full chat session (stored in JSON) */
export interface StoredChatSession {
  id: string
  title: string
  messages: StoredChatMessage[]
  createdAt: number
  updatedAt: number
  modelId: string
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * Service to handle chat persistence within the project folder.
 * Uses Rust commands for filesystem operations.
 */
export class ChatPersistenceService {
  private projectPath: string

  constructor(projectPath: string) {
    this.projectPath = projectPath
  }

  /**
   * Initialize the chat directory structure
   */
  async init(): Promise<void> {
    await invoke("chat_init", { projectPath: this.projectPath })
  }

  /**
   * Save a chat session
   */
  async saveSession(
    sessionId: string,
    messages: Message[],
    modelId: string,
    title?: string,
    existingCreatedAt?: number
  ): Promise<void> {
    // Convert messages to storage format
    const storedMessages: StoredChatMessage[] = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      modelId: msg.modelId,
      provider: msg.provider,
      toolCalls: msg.toolCalls?.map((tc) => ({
        name: tc.name,
        status: tc.status,
        result: tc.result,
      })),
      // Serialize images: convert Uint8Array to base64 for JSON storage
      images: msg.images?.map((img) => ({
        base64: img.base64 ?? uint8ArrayToBase64(img.uint8Array),
        mediaType: img.mediaType,
      })),
    }))

    // Determine title from first user message or use provided
    const sessionTitle =
      title ?? messages.find((m) => m.role === "user")?.content.slice(0, 50) ?? "New Chat"

    const now = Date.now()
    const session: StoredChatSession = {
      id: sessionId,
      title: sessionTitle,
      messages: storedMessages,
      createdAt: existingCreatedAt ?? now,
      updatedAt: now,
      modelId,
    }

    await invoke("chat_save_session", {
      projectPath: this.projectPath,
      session,
    })
  }

  /**
   * Load a session and hydrate messages
   */
  async loadSession(sessionId: string): Promise<Message[]> {
    const session = await invoke<StoredChatSession>("chat_load_session", {
      projectPath: this.projectPath,
      sessionId,
    })

    // Convert stored messages back to Message format
    return session.messages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content: msg.content,
      createdAt: new Date(msg.createdAt),
      modelId: msg.modelId,
      provider: msg.provider,
      toolCalls: msg.toolCalls?.map((tc) => ({
        name: tc.name,
        status: tc.status as "pending" | "running" | "completed" | "failed",
        result: tc.result,
      })),
      // Deserialize images: base64 back to both formats for flexibility
      images: msg.images?.map((img) => ({
        base64: img.base64,
        uint8Array: base64ToUint8Array(img.base64),
        mediaType: img.mediaType,
      })),
    }))
  }

  /**
   * List all sessions (metadata only)
   */
  async listSessions(): Promise<ChatSessionMeta[]> {
    const sessions = await invoke<ChatSessionMeta[]>("chat_list_sessions", {
      projectPath: this.projectPath,
    })
    return sessions
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await invoke("chat_delete_session", {
      projectPath: this.projectPath,
      sessionId,
    })
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
