/**
 * CADHY Chat Hook
 *
 * Enhanced useChat hook with rate limiting, retry logic, and error handling.
 * Built on top of AI SDK v5 useChat.
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
 */

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useCallback, useRef, useState } from "react"
import { type AIError, AIRateLimitError, toAIError } from "../middleware/errors"
import {
  checkRateLimit,
  peekRateLimit,
  RATE_LIMIT_PRESETS,
  type RateLimitConfig,
  RateLimitError,
  type RateLimitResult,
} from "../middleware/rate-limiter"
import { type RetryConfig, withRetry } from "../middleware/retry"

export interface UseCadhyChatOptions {
  /** Unique chat ID for persistence */
  id?: string

  /** API endpoint for chat (default: '/api/chat') */
  api?: string

  /** Custom headers for requests */
  headers?: Record<string, string>

  /** Rate limit configuration (default: RATE_LIMIT_PRESETS.chat) */
  rateLimit?: RateLimitConfig | false

  /** Retry configuration (default: { maxRetries: 2 }) */
  retry?: RetryConfig | false

  /** Callback when rate limit is exceeded */
  onRateLimitExceeded?: (result: RateLimitResult) => void

  /** Callback for retry attempts */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void

  /** Callback for any AI error */
  onAIError?: (error: AIError) => void

  /** Callback when an error occurs */
  onError?: (error: Error) => void

  /** Callback when stream finishes */
  onFinish?: (message: unknown) => void
}

/**
 * Enhanced chat hook for CADHY with rate limiting, retry, and error handling.
 *
 * @example
 * ```tsx
 * import { useCadhyChat } from '@cadhy/ai/hooks';
 *
 * function ChatComponent() {
 *   const {
 *     messages,
 *     sendMessageSafe,
 *     isRateLimited,
 *     rateLimitResetIn,
 *     lastError,
 *     status,
 *   } = useCadhyChat({
 *     id: 'hydraulic-chat',
 *     onRateLimitExceeded: (result) => {
 *       toast.warning(`Rate limited. Try again in ${result.resetInMs / 1000}s`);
 *     },
 *     onAIError: (error) => {
 *       toast.error(error.message);
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       {messages.map(m => (
 *         <div key={m.id}>
 *           {m.parts.map((part, i) =>
 *             part.type === 'text' ? <span key={i}>{part.text}</span> : null
 *           )}
 *         </div>
 *       ))}
 *
 *       {isRateLimited && (
 *         <div>Rate limited. Wait {rateLimitResetIn} seconds.</div>
 *       )}
 *
 *       {lastError && <div className="error">{lastError.message}</div>}
 *
 *       <input
 *         onKeyDown={(e) => {
 *           if (e.key === 'Enter' && !isRateLimited) {
 *             sendMessageSafe(e.currentTarget.value);
 *           }
 *         }}
 *         disabled={status !== 'ready' || isRateLimited}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useCadhyChat(options: UseCadhyChatOptions = {}) {
  const {
    id,
    api = "/api/chat",
    headers,
    rateLimit = RATE_LIMIT_PRESETS.chat,
    retry = { maxRetries: 2 },
    onRateLimitExceeded,
    onRetry,
    onAIError,
    onError,
    onFinish,
  } = options

  // State
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitResult | null>(null)
  const [lastError, setLastError] = useState<AIError | null>(null)

  // Refs for callbacks to avoid stale closures
  const onRateLimitExceededRef = useRef(onRateLimitExceeded)
  const onRetryRef = useRef(onRetry)
  const onAIErrorRef = useRef(onAIError)

  onRateLimitExceededRef.current = onRateLimitExceeded
  onRetryRef.current = onRetry
  onAIErrorRef.current = onAIError

  // Handle errors from useChat
  const handleError = useCallback(
    (error: Error) => {
      const aiError = toAIError(error)
      setLastError(aiError)
      onAIErrorRef.current?.(aiError)
      onError?.(error)
    },
    [onError]
  )

  // Base useChat hook with transport
  const chat = useChat({
    id,
    transport: new DefaultChatTransport({
      api,
      headers,
    }),
    onError: handleError,
    onFinish,
  })

  // Update rate limit status
  const updateRateLimitStatus = useCallback(() => {
    if (rateLimit === false) {
      setRateLimitStatus(null)
      return
    }
    const status = peekRateLimit(rateLimit)
    setRateLimitStatus(status)
  }, [rateLimit])

  // Send message with rate limiting and retry
  const sendMessageSafe = useCallback(
    async (content: string) => {
      // Check rate limit first
      if (rateLimit !== false) {
        const result = checkRateLimit(rateLimit)
        setRateLimitStatus(result)

        if (!result.success) {
          const error = new AIRateLimitError(
            `Rate limit exceeded. Try again in ${Math.ceil(result.resetInMs / 1000)} seconds.`,
            {
              retryAfterMs: result.resetInMs,
              remaining: result.remaining,
              limit: result.limit,
            }
          )
          setLastError(error)
          onRateLimitExceededRef.current?.(result)
          onAIErrorRef.current?.(error)
          throw new RateLimitError(error.message, result)
        }
      }

      // Clear previous error
      setLastError(null)

      // Send with retry if enabled
      const sendFn = async () => {
        chat.sendMessage({ text: content })
      }

      if (retry !== false) {
        await withRetry(sendFn, {
          ...retry,
          onRetry: (attempt, error, delayMs) => {
            onRetryRef.current?.(attempt, error, delayMs)
          },
        })
      } else {
        await sendFn()
      }

      // Update rate limit status after sending
      updateRateLimitStatus()
    },
    [chat, rateLimit, retry, updateRateLimitStatus]
  )

  // Clear error
  const clearError = useCallback(() => {
    setLastError(null)
  }, [])

  // Computed values
  const isRateLimited = rateLimitStatus?.success === false
  const rateLimitResetIn =
    isRateLimited && rateLimitStatus ? Math.ceil(rateLimitStatus.resetInMs / 1000) : null

  return {
    // Pass through all chat properties
    ...chat,
    // Additional state
    rateLimitStatus,
    isRateLimited,
    rateLimitResetIn,
    lastError,
    clearError,
    sendMessageSafe,
    // Convenience alias
    isLoading: chat.status === "streaming",
  }
}

/**
 * Hook for tracking rate limit status without sending messages.
 * Useful for displaying rate limit info in UI.
 */
export function useRateLimitStatus(config: RateLimitConfig = RATE_LIMIT_PRESETS.chat) {
  const [status, setStatus] = useState<RateLimitResult>(() => peekRateLimit(config))

  const refresh = useCallback(() => {
    setStatus(peekRateLimit(config))
  }, [config])

  return {
    status,
    refresh,
    isLimited: !status.success,
    remaining: status.remaining,
    resetInSeconds: Math.ceil(status.resetInMs / 1000),
  }
}
