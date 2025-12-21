/**
 * CADHY AI Generation Module
 *
 * Exports system prompts and generation utilities for hydraulic analysis.
 */

export {
  enhanceViewport,
  type GeneratedImage,
  generateConceptRender,
  generateRender,
  getImageDataUrl,
  IMAGE_GENERATION_MODEL,
  IMAGE_STYLE_DESCRIPTIONS,
  IMAGE_STYLE_LABELS,
  IMAGE_STYLES,
  type ImageGenerationOptions,
  type ImageGenerationResult,
  type ImageStyle,
  isImageGenerationAvailable,
  uint8ArrayToBase64,
  type ViewportEnhanceOptions,
} from "./image"

export {
  CAD_SYSTEM_PROMPT,
  createHydraulicPrompt,
  HYDRAULIC_SYSTEM_PROMPT,
  type HydraulicPromptContext,
} from "./prompts"
