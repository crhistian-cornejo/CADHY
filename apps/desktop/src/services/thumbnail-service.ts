/**
 * Thumbnail Service - CADHY
 *
 * Captures viewport screenshots for project thumbnails.
 * Uses Three.js canvas capture and resizes for optimal storage.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const THUMBNAIL_WIDTH = 320
const THUMBNAIL_HEIGHT = 180
const THUMBNAIL_QUALITY = 0.8

// ============================================================================
// CANVAS REFERENCE
// ============================================================================

let viewportCanvas: HTMLCanvasElement | null = null

/**
 * Register the viewport canvas for thumbnail capture.
 * Called by Viewport3D when mounted.
 */
export function registerViewportCanvas(canvas: HTMLCanvasElement | null): void {
  viewportCanvas = canvas
}

/**
 * Get the registered viewport canvas.
 */
export function getViewportCanvas(): HTMLCanvasElement | null {
  return viewportCanvas
}

// ============================================================================
// THUMBNAIL GENERATION
// ============================================================================

/**
 * Captures the current viewport as a thumbnail image.
 * Returns a data URL (base64 JPEG) or null if capture fails.
 */
export async function captureViewportThumbnail(): Promise<string | null> {
  if (!viewportCanvas) {
    console.warn("[Thumbnail] No viewport canvas registered")
    return null
  }

  try {
    // Create a temporary canvas for resizing
    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = THUMBNAIL_WIDTH
    tempCanvas.height = THUMBNAIL_HEIGHT

    const ctx = tempCanvas.getContext("2d")
    if (!ctx) {
      console.error("[Thumbnail] Failed to get 2D context")
      return null
    }

    // Draw the viewport canvas scaled to thumbnail size
    ctx.drawImage(
      viewportCanvas,
      0,
      0,
      viewportCanvas.width,
      viewportCanvas.height,
      0,
      0,
      THUMBNAIL_WIDTH,
      THUMBNAIL_HEIGHT
    )

    // Convert to JPEG data URL
    const dataUrl = tempCanvas.toDataURL("image/jpeg", THUMBNAIL_QUALITY)

    return dataUrl
  } catch (error) {
    console.error("[Thumbnail] Failed to capture viewport:", error)
    return null
  }
}

/**
 * Captures thumbnail with a slight delay to ensure render is complete.
 * Useful after scene changes.
 */
export async function captureViewportThumbnailDelayed(delayMs = 100): Promise<string | null> {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const thumbnail = await captureViewportThumbnail()
      resolve(thumbnail)
    }, delayMs)
  })
}

// ============================================================================
// THUMBNAIL FROM IMAGE FILE
// ============================================================================

/**
 * Creates a thumbnail from an image file path.
 * Used for importing existing project thumbnails.
 */
export async function createThumbnailFromImage(imagePath: string): Promise<string | null> {
  try {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = THUMBNAIL_WIDTH
        canvas.height = THUMBNAIL_HEIGHT

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get 2D context"))
          return
        }

        // Calculate aspect-ratio preserving dimensions
        const imgRatio = img.width / img.height
        const thumbRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT

        let sx = 0,
          sy = 0,
          sw = img.width,
          sh = img.height

        if (imgRatio > thumbRatio) {
          // Image is wider - crop sides
          sw = img.height * thumbRatio
          sx = (img.width - sw) / 2
        } else {
          // Image is taller - crop top/bottom
          sh = img.width / thumbRatio
          sy = (img.height - sh) / 2
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
        resolve(canvas.toDataURL("image/jpeg", THUMBNAIL_QUALITY))
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = imagePath
    })
  } catch (error) {
    console.error("[Thumbnail] Failed to create from image:", error)
    return null
  }
}

// ============================================================================
// PLACEHOLDER THUMBNAIL
// ============================================================================

/**
 * Generates a placeholder thumbnail with project initials.
 * Used when viewport capture is not available.
 */
export function generatePlaceholderThumbnail(projectName: string): string {
  const canvas = document.createElement("canvas")
  canvas.width = THUMBNAIL_WIDTH
  canvas.height = THUMBNAIL_HEIGHT

  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
  gradient.addColorStop(0, "#1e293b")
  gradient.addColorStop(1, "#0f172a")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)

  // Get initials (up to 2 characters)
  const initials =
    projectName
      .split(/\s+/)
      .map((word) => word[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "P"

  // Draw initials
  ctx.fillStyle = "#64748b"
  ctx.font = "bold 48px system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(initials, THUMBNAIL_WIDTH / 2, THUMBNAIL_HEIGHT / 2)

  return canvas.toDataURL("image/jpeg", THUMBNAIL_QUALITY)
}
