/**
 * CADHY AI React Hooks
 *
 * React hooks for AI-powered hydraulic analysis.
 */

// Re-export base hooks from AI SDK
export { useChat, useCompletion } from "@ai-sdk/react"

// CADHY enhanced hooks with rate limiting and error handling
export {
  type UseCadhyChatOptions,
  useCadhyChat,
  useRateLimitStatus,
} from "./use-cadhy-chat"
