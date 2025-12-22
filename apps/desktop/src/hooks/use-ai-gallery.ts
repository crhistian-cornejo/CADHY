/**
 * useAIGallery - Hook to fetch AI-generated images from chat sessions
 *
 * Aggregates images from all chat sessions within a project for display
 * in the home gallery section.
 */

import { logger } from "@cadhy/shared"
import { useCallback, useEffect, useState } from "react"
import { ChatPersistenceService } from "@/services/chat-persistence"

// ============================================================================
// TYPES
// ============================================================================

export interface GalleryImage {
  /** Unique identifier for the image */
  id: string
  /** Base64 encoded image data */
  base64: string
  /** MIME type (e.g., "image/png") */
  mediaType: string
  /** Session ID this image came from */
  sessionId: string
  /** Session title for display */
  sessionTitle: string
  /** Message ID containing this image */
  messageId: string
  /** When the image was generated */
  createdAt: Date
  /** Bento grid span (1-3), calculated based on position */
  span: number
}

export interface UseAIGalleryOptions {
  /** Project path to fetch images from */
  projectPath: string | null
  /** Maximum number of images to fetch (default: 12) */
  limit?: number
  /** Whether to auto-refresh when project changes */
  autoRefresh?: boolean
}

export interface UseAIGalleryReturn {
  /** Array of gallery images */
  images: GalleryImage[]
  /** Whether images are being loaded */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually refresh images */
  refresh: () => Promise<void>
  /** Total count of images (before limit) */
  totalCount: number
}

// ============================================================================
// BENTO LAYOUT HELPER
// ============================================================================

/**
 * Assigns span values to create a visually interesting bento grid layout.
 * Uses a repeating pattern with some randomization for variety.
 */
function assignBentoSpans(count: number): number[] {
  // Pattern: Large, Small, Small, Medium, Small, Large...
  const patterns = [
    [2, 1, 1, 1, 2, 1], // Pattern A
    [1, 2, 1, 1, 1, 2], // Pattern B
    [2, 1, 2, 1, 1, 1], // Pattern C
  ]

  const spans: number[] = []
  // Use a deterministic pattern based on count to avoid layout shifts
  const patternIndex = count % patterns.length
  const pattern = patterns[patternIndex]

  for (let i = 0; i < count; i++) {
    spans.push(pattern[i % pattern.length])
  }

  return spans
}

// ============================================================================
// HOOK
// ============================================================================

export function useAIGallery(options: UseAIGalleryOptions): UseAIGalleryReturn {
  const { projectPath, limit = 12, autoRefresh = true } = options

  const [images, setImages] = useState<GalleryImage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const fetchImages = useCallback(async () => {
    if (!projectPath) {
      setImages([])
      setTotalCount(0)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const service = new ChatPersistenceService(projectPath)

      // Get all sessions
      const sessions = await service.listSessions()
      logger.log(`[AIGallery] Found ${sessions.length} sessions`)

      // Collect all images from all sessions
      const allImages: GalleryImage[] = []

      for (const sessionMeta of sessions) {
        try {
          const messages = await service.loadSession(sessionMeta.id)

          for (const message of messages) {
            if (message.images && message.images.length > 0) {
              for (let i = 0; i < message.images.length; i++) {
                const img = message.images[i]
                if (img.base64) {
                  allImages.push({
                    id: `${sessionMeta.id}-${message.id}-${i}`,
                    base64: img.base64,
                    mediaType: img.mediaType,
                    sessionId: sessionMeta.id,
                    sessionTitle: sessionMeta.title,
                    messageId: message.id,
                    createdAt: message.createdAt,
                    span: 1, // Will be assigned later
                  })
                }
              }
            }
          }
        } catch (sessionError) {
          logger.warn(`[AIGallery] Failed to load session ${sessionMeta.id}:`, sessionError)
        }
      }

      // Sort by creation date (newest first)
      allImages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      // Store total before limiting
      setTotalCount(allImages.length)

      // Limit and assign bento spans
      const limitedImages = allImages.slice(0, limit)
      const spans = assignBentoSpans(limitedImages.length)

      const imagesWithSpans = limitedImages.map((img, index) => ({
        ...img,
        span: spans[index],
      }))

      logger.log(`[AIGallery] Loaded ${imagesWithSpans.length} images (total: ${allImages.length})`)
      setImages(imagesWithSpans)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load gallery images"
      logger.error("[AIGallery] Error:", err)
      setError(message)
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }, [projectPath, limit])

  // Auto-fetch when project path changes
  useEffect(() => {
    if (autoRefresh) {
      fetchImages()
    }
  }, [fetchImages, autoRefresh])

  return {
    images,
    isLoading,
    error,
    refresh: fetchImages,
    totalCount,
  }
}
