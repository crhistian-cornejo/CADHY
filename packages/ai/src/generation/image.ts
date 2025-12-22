/**
 * CADHY AI Image Generation
 *
 * Uses Vercel AI Gateway to route requests to Google's Gemini models for
 * image generation and enhancement. The gateway handles authentication
 * and provides a unified interface for multiple AI providers.
 *
 * Supported models (via gateway):
 * - google/gemini-2.0-flash-preview-image-generation (for image generation)
 * - google/gemini-2.0-flash-exp (for image editing/enhancement)
 */

import { generateText } from "ai"
import { getGateway } from "../providers/gateway"

// =============================================================================
// TYPES
// =============================================================================

/** Image generation options */
export interface ImageGenerationOptions {
  /** API key for AI Gateway */
  apiKey: string
  /** Style for the generated image */
  style?: ImageStyle
  /** Additional context for the image */
  context?: string
  /** Number of images to generate (1-4) */
  n?: number
  /** Aspect ratio hint in the prompt */
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
}

/** Available image styles */
export type ImageStyle =
  | "photorealistic"
  | "architectural"
  | "technical"
  | "artistic"
  | "blueprint"
  | "presentation"

/** Generated image result */
export interface GeneratedImage {
  /** Base64 encoded image data */
  base64?: string
  /** Raw binary data (Uint8Array) */
  uint8Array?: Uint8Array
  /** MIME type of the image */
  mediaType: string
}

/** Image generation result */
export interface ImageGenerationResult {
  /** Generated images */
  images: GeneratedImage[]
  /** Text response from the model (if any) */
  text?: string
  /** Whether generation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Generation warnings */
  warnings?: string[]
}

// =============================================================================
// STYLE PROMPTS
// =============================================================================

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  photorealistic: `
Create a photorealistic visualization of this hydraulic engineering structure.
Style requirements:
- Natural sunlight with soft shadows
- Realistic concrete, metal, and water textures
- Environmental context (sky, landscape, vegetation)
- Physically accurate reflections and refractions
- High detail and resolution
Keep the structural accuracy while creating stunning visual appeal.
  `.trim(),

  architectural: `
Create an architectural visualization of this hydraulic structure.
Style requirements:
- Clean, minimalist aesthetic
- Soft ambient lighting with subtle shadows
- Environment with grass, trees, or ground plane
- Professional presentation quality
- White/neutral background or subtle sky gradient
Maintain engineering accuracy while creating a polished, elegant presentation.
  `.trim(),

  technical: `
Create a technical illustration of this hydraulic structure.
Style requirements:
- Clean white or light gray background
- Sharp edges and clear geometry
- Technical illustration style with precise lines
- Dimensional accuracy preserved
- Professional documentation quality
- Subtle shading to show depth
Keep the technical focus while improving visual clarity.
  `.trim(),

  artistic: `
Create an artistic interpretation of this hydraulic engineering structure.
Style requirements:
- Dramatic lighting and deep shadows
- Vibrant or atmospheric colors
- Creative and dynamic perspective
- Artistic composition with visual interest
- Emotional impact and mood
Balance artistic expression with structural recognition.
  `.trim(),

  blueprint: `
Create a modern technical blueprint visualization.
Style requirements:
- Blue and white color scheme
- Clean line work and edges
- Subtle grid background
- Technical annotations aesthetic
- Engineering documentation style
- Professional and precise appearance
Maintain accuracy while creating a classic blueprint look.
  `.trim(),

  presentation: `
Create a professional presentation-quality render.
Style requirements:
- Clean, modern aesthetic
- Soft studio lighting setup
- Neutral background with subtle gradient
- High contrast for visibility
- Corporate/professional appearance
- Polished and refined look
Suitable for reports, proposals, and business presentations.
  `.trim(),
}

// =============================================================================
// IMAGE GENERATION
// =============================================================================

/**
 * Generate an image from a text prompt using Nano Banana Pro.
 *
 * Uses google/gemini-3-pro-image via AI SDK Gateway for state-of-the-art
 * image generation. Images are returned in result.files.
 *
 * @param prompt - Description of the structure to visualize
 * @param options - Generation options
 * @returns Generated images
 *
 * @example
 * ```typescript
 * const result = await generateRender(
 *   "A trapezoidal irrigation channel with flowing water",
 *   { apiKey: "your-api-key", style: "photorealistic" }
 * )
 *
 * if (result.success && result.images.length > 0) {
 *   // Use uint8Array or convert to base64
 *   const image = result.images[0]
 *   displayImage(image.uint8Array || image.base64)
 * }
 * ```
 */
export async function generateRender(
  prompt: string,
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const { apiKey, style = "photorealistic", context = "", n = 1, aspectRatio = "16:9" } = options

  if (!apiKey) {
    return {
      images: [],
      success: false,
      error: "API key is required. Please configure your API key in Settings.",
    }
  }

  try {
    // Create gateway provider
    const gateway = getGateway({ apiKey })

    // Build the prompt with style and context
    const stylePrompt = STYLE_PROMPTS[style]
    const contextInfo = context ? `\nProject context: ${context}` : ""
    const aspectInfo = aspectRatio ? `\nAspect ratio: ${aspectRatio}` : ""
    const countInfo = n > 1 ? `\nGenerate ${n} different variations.` : ""

    const fullPrompt = `${stylePrompt}${contextInfo}${aspectInfo}${countInfo}

Generate a high-quality image of: ${prompt}

This is a hydraulic engineering structure. Create a professional
visualization following the style guidelines above. Make it visually
impressive while maintaining technical accuracy.`

    // Use Nano Banana Pro for image generation
    const result = await generateText({
      model: gateway("google/gemini-3-pro-image"),
      prompt: fullPrompt,
    })

    // Extract images from result.files
    const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith("image/")) || []

    if (imageFiles.length === 0) {
      return {
        images: [],
        text: result.text,
        success: false,
        error: "No images were generated. The model returned text only.",
      }
    }

    // Convert to our format
    const images: GeneratedImage[] = imageFiles.map((file) => ({
      uint8Array: file.uint8Array,
      base64: file.base64,
      mediaType: file.mediaType || "image/png",
    }))

    return {
      images,
      text: result.text,
      success: true,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Check for common errors
    if (errorMessage.includes("API key") || errorMessage.includes("apiKey")) {
      return {
        images: [],
        success: false,
        error: "API key not configured or invalid. Please check your API key in Settings.",
      }
    }

    if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
      return {
        images: [],
        success: false,
        error: "API quota exceeded. Please try again later or check your billing.",
      }
    }

    if (errorMessage.includes("model") || errorMessage.includes("not found")) {
      return {
        images: [],
        success: false,
        error: "Image generation model not available. Please try again later.",
      }
    }

    return {
      images: [],
      success: false,
      error: `Image generation failed: ${errorMessage}`,
    }
  }
}

/**
 * Generate a concept render from a detailed description.
 *
 * @param description - Detailed description of the hydraulic structure
 * @param options - Generation options
 * @returns Generated images
 */
export async function generateConceptRender(
  description: string,
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  return generateRender(description, options)
}

/**
 * Check if image generation is available.
 * Returns true if API key is provided.
 */
export function isImageGenerationAvailable(apiKey?: string): boolean {
  return Boolean(apiKey)
}

/**
 * Convert Uint8Array to base64 string.
 * Useful for displaying images in img tags.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to Uint8Array.
 * Browser-native approach without Node.js Buffer.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * Get a data URL from a generated image.
 * Works with both base64 and uint8Array formats.
 */
export function getImageDataUrl(image: GeneratedImage): string {
  const base64 = image.base64 || (image.uint8Array ? uint8ArrayToBase64(image.uint8Array) : "")
  return `data:${image.mediaType};base64,${base64}`
}

// =============================================================================
// EXPORTS
// =============================================================================

export const IMAGE_STYLES: ImageStyle[] = [
  "photorealistic",
  "architectural",
  "technical",
  "artistic",
  "blueprint",
  "presentation",
]

export const IMAGE_STYLE_LABELS: Record<ImageStyle, string> = {
  photorealistic: "Photorealistic",
  architectural: "Architectural",
  technical: "Technical",
  artistic: "Artistic",
  blueprint: "Blueprint",
  presentation: "Presentation",
}

export const IMAGE_STYLE_DESCRIPTIONS: Record<ImageStyle, string> = {
  photorealistic: "Realistic lighting, materials, and environment",
  architectural: "Clean, minimalist visualization style",
  technical: "Sharp, documentation-quality render",
  artistic: "Creative, dramatic interpretation",
  blueprint: "Classic technical blueprint aesthetic",
  presentation: "Professional, report-ready quality",
}

/** Model ID for image generation */
export const IMAGE_GENERATION_MODEL = "google/gemini-3-pro-image"

// =============================================================================
// VIEWPORT ENHANCEMENT (Image-to-Image Editing)
// =============================================================================

/** Options for viewport enhancement */
export interface ViewportEnhanceOptions {
  /** API key for AI Gateway */
  apiKey: string
  /** The viewport screenshot as base64 string (without data: prefix) or Uint8Array */
  viewportImage: string | Uint8Array
  /** MIME type of the input image */
  mediaType?: string
  /** Style for the enhanced image */
  style?: ImageStyle
  /** Additional context about the scene/project */
  context?: string
  /** Custom enhancement instructions */
  customPrompt?: string
}

/** Enhancement prompts for each style */
const ENHANCEMENT_PROMPTS: Record<ImageStyle, string> = {
  photorealistic: `Transform this 3D CAD viewport into a photorealistic architectural visualization.
Apply these enhancements while keeping the EXACT same geometry, perspective, and composition:
- Add natural sunlight with realistic soft shadows
- Apply photorealistic materials: concrete texture, metal reflections, water with caustics
- Add environmental context: blue sky with clouds, ground plane with grass/gravel
- Include subtle atmospheric effects (ambient occlusion, depth fog)
- Add water reflections if water channels are present
- Make it look like a professional architectural render`,

  architectural: `Transform this 3D CAD viewport into a clean architectural visualization.
Apply these enhancements while keeping the EXACT same geometry, perspective, and composition:
- Add soft, diffused studio lighting with minimal shadows
- Apply clean material finishes: smooth concrete, brushed metal
- Add a subtle gradient sky or neutral background
- Include a simple ground plane with grass or paving
- Keep the aesthetic minimalist and elegant
- Suitable for architectural presentations`,

  technical: `Transform this 3D CAD viewport into a technical illustration.
Apply these enhancements while keeping the EXACT same geometry, perspective, and composition:
- Add clean, even lighting with soft shadows for depth
- Apply neutral gray/white materials to show form clearly
- Use a pure white or light gray background
- Add subtle edge highlights to define geometry
- Keep the focus on structural clarity
- Suitable for technical documentation`,

  artistic: `Transform this 3D CAD viewport into a dramatic artistic visualization.
Apply these enhancements while keeping the EXACT same geometry, perspective, and composition:
- Add dramatic golden hour or sunset lighting
- Apply rich, saturated materials with strong contrasts
- Include a dramatic sky with clouds or atmospheric effects
- Add environmental elements (trees, birds, reflections)
- Create visual drama and emotional impact
- Make it look like concept art or a movie scene`,

  blueprint: `Transform this 3D CAD viewport into a modern blueprint visualization.
Apply these enhancements while keeping the EXACT same geometry, perspective, and composition:
- Convert to blue and white color scheme
- Add technical grid lines in the background
- Apply edge detection to show clean geometry lines
- Add subtle dimension indicators aesthetic
- Include blueprint paper texture
- Classic engineering drawing style`,

  presentation: `Transform this 3D CAD viewport into a professional presentation render.
Apply these enhancements while keeping the EXACT same geometry, perspective, and composition:
- Add professional studio lighting setup
- Apply clean, corporate-friendly materials
- Use a subtle gradient background (gray to white)
- Add soft shadows and ambient occlusion
- High contrast for visibility on projectors
- Suitable for business presentations and reports`,
}

/**
 * Enhance a viewport screenshot using AI image editing.
 *
 * Uses Nano Banana Pro (google/gemini-3-pro-image) to transform a CAD viewport
 * capture into a professional render with realistic lighting, materials, and environment.
 *
 * @param options - Enhancement options including the viewport image and style
 * @returns Enhanced images
 *
 * @example
 * ```typescript
 * // Capture viewport and enhance
 * const screenshot = await captureViewportThumbnail() // base64 string
 *
 * const result = await enhanceViewport({
 *   apiKey: "your-api-key",
 *   viewportImage: screenshot,
 *   style: "photorealistic",
 *   context: "Trapezoidal irrigation channel with stilling basin"
 * })
 *
 * if (result.success && result.images.length > 0) {
 *   const enhancedImage = result.images[0]
 *   displayImage(getImageDataUrl(enhancedImage))
 * }
 * ```
 */
export async function enhanceViewport(
  options: ViewportEnhanceOptions
): Promise<ImageGenerationResult> {
  const { apiKey, viewportImage, style = "photorealistic", context = "", customPrompt } = options

  if (!apiKey) {
    return {
      images: [],
      success: false,
      error: "API key is required. Please configure your API key in Settings.",
    }
  }

  if (!viewportImage) {
    return {
      images: [],
      success: false,
      error: "Viewport image is required.",
    }
  }

  try {
    // Use AI Gateway which routes to Google internally
    // The gateway uses WebKit-safe fetch to avoid CORS issues
    const gateway = getGateway({ apiKey })

    // Convert input to Uint8Array for browser compatibility
    // AI SDK accepts Uint8Array directly without needing Node.js Buffer
    let imageBytes: Uint8Array

    if (typeof viewportImage === "string") {
      // Extract base64 data
      let base64Data: string
      if (viewportImage.startsWith("data:")) {
        // Parse data URL: data:image/png;base64,xxxxx
        const match = viewportImage.match(/^data:([^;]+);base64,(.+)$/)
        if (match) {
          base64Data = match[2]
        } else {
          return {
            images: [],
            success: false,
            error: "Invalid data URL format for viewport image.",
          }
        }
      } else {
        // It's raw base64
        base64Data = viewportImage
      }
      // Convert base64 to Uint8Array using browser-native approach
      imageBytes = base64ToUint8Array(base64Data)
    } else {
      // Already Uint8Array
      imageBytes = viewportImage
    }

    // Build the enhancement prompt
    const stylePrompt = customPrompt || ENHANCEMENT_PROMPTS[style]
    const contextInfo = context ? `\nProject context: ${context}` : ""

    const fullPrompt = `${stylePrompt}${contextInfo}

IMPORTANT: Maintain the exact same camera angle, geometry proportions, and structural layout.
This is a hydraulic engineering structure - preserve all engineering details accurately.`

    // Use Gemini image model via Gateway
    // Model format: provider/model-name (gateway routes to correct provider)
    const result = await generateText({
      model: gateway("google/gemini-2.0-flash-exp"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageBytes,
            },
            {
              type: "text",
              text: fullPrompt,
            },
          ],
        },
      ],
    })

    // Extract images from result.files
    const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith("image/")) || []

    if (imageFiles.length === 0) {
      return {
        images: [],
        text: result.text,
        success: false,
        error: "No enhanced image was generated. The model returned text only.",
      }
    }

    // Convert to our format
    const images: GeneratedImage[] = imageFiles.map((file) => ({
      uint8Array: file.uint8Array,
      base64: file.base64,
      mediaType: file.mediaType || "image/png",
    }))

    return {
      images,
      text: result.text,
      success: true,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Check for common errors
    if (errorMessage.includes("API key") || errorMessage.includes("apiKey")) {
      return {
        images: [],
        success: false,
        error: "API key not configured or invalid. Please check your API key in Settings.",
      }
    }

    if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
      return {
        images: [],
        success: false,
        error: "API quota exceeded. Please try again later or check your billing.",
      }
    }

    if (errorMessage.includes("model") || errorMessage.includes("not found")) {
      return {
        images: [],
        success: false,
        error: "Image enhancement model not available. Please try again later.",
      }
    }

    if (errorMessage.includes("image") || errorMessage.includes("format")) {
      return {
        images: [],
        success: false,
        error: "Invalid image format. Please ensure the viewport capture is a valid image.",
      }
    }

    return {
      images: [],
      success: false,
      error: `Image enhancement failed: ${errorMessage}`,
    }
  }
}
