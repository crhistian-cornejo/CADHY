/**
 * Render Tools for AI - CADHY
 *
 * Tools for generating visualizations and renders of hydraulic structures.
 * Uses Gemini's Imagen model to create photorealistic and stylized images.
 */

import { tool } from "ai"
import { z } from "zod"
import { IMAGE_STYLES, type ImageStyle } from "../generation/image"

// =============================================================================
// RENDER GENERATION TOOL
// =============================================================================

export const generateRenderTool = tool({
  description: `Generate a professional visualization or render of a hydraulic structure.
Creates high-quality images from text descriptions using AI image generation.
Supports multiple styles: photorealistic, architectural, technical, artistic, blueprint, and presentation.
Use this when the user wants to visualize, render, or create an image of a design.`,
  inputSchema: z.object({
    description: z
      .string()
      .describe(
        "Detailed description of the hydraulic structure to visualize. Include materials, dimensions, and context."
      ),
    style: z
      .enum(IMAGE_STYLES as [ImageStyle, ...ImageStyle[]])
      .default("photorealistic")
      .describe(
        "Visual style for the render: photorealistic (realistic lighting/materials), architectural (clean/minimalist), technical (documentation quality), artistic (dramatic/creative), blueprint (classic technical), presentation (report-ready)"
      ),
    context: z.string().optional().describe("Additional context about the project or environment"),
    aspectRatio: z
      .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
      .default("16:9")
      .describe("Aspect ratio for the generated image"),
  }),
  execute: async (input) => {
    return {
      action: "generateRender" as const,
      description: input.description,
      style: input.style,
      context: input.context,
      aspectRatio: input.aspectRatio,
    }
  },
})

export const describeSceneForRenderTool = tool({
  description: `Analyze the current 3D scene and generate a detailed description suitable for image generation.
Use this as a first step before generating a render to understand what's in the scene.
Returns a textual description of all objects, their arrangement, materials, and suggested render styles.`,
  inputSchema: z.object({
    focusObjectId: z
      .string()
      .optional()
      .describe("Optional: ID of a specific object to focus the description on"),
    includeEnvironment: z
      .boolean()
      .default(true)
      .describe("Whether to suggest environmental context (sky, ground, vegetation)"),
  }),
  execute: async (input) => {
    return {
      action: "describeSceneForRender" as const,
      focusObjectId: input.focusObjectId,
      includeEnvironment: input.includeEnvironment,
    }
  },
})

// =============================================================================
// ENHANCE VIEWPORT TOOL
// =============================================================================

export const enhanceViewportTool = tool({
  description: `Enhance the current 3D viewport with AI-powered image editing.
Captures the current view and applies realistic materials, lighting, sky, water reflections, and environment.
PRESERVES the exact geometry, camera angle, and structure layout - only enhances the visual appearance.
Use this when the user wants to make the viewport look more realistic, add better lighting, or create a presentation image.
Keywords: enhance, beautify, realistic, render viewport, improve visuals, add lighting, add sky, add water.`,
  inputSchema: z.object({
    style: z
      .enum(IMAGE_STYLES as [ImageStyle, ...ImageStyle[]])
      .default("photorealistic")
      .describe(
        "Enhancement style: photorealistic (realistic materials/lighting), architectural (clean/professional), technical (documentation), artistic (dramatic/creative), blueprint (technical drawing), presentation (client-ready)"
      ),
    context: z
      .string()
      .optional()
      .describe(
        "Additional context about what's in the scene to help AI enhance it better (e.g., 'irrigation channel with flowing water')"
      ),
    customPrompt: z
      .string()
      .optional()
      .describe(
        "Custom enhancement instructions (e.g., 'add sunset lighting and mountain background')"
      ),
  }),
  execute: async (input) => {
    return {
      action: "enhanceViewport" as const,
      style: input.style,
      context: input.context,
      customPrompt: input.customPrompt,
    }
  },
})

// =============================================================================
// TOOL COLLECTIONS
// =============================================================================

/** All render tools as a ToolSet */
export const renderTools = {
  generateRender: generateRenderTool,
  describeSceneForRender: describeSceneForRenderTool,
  enhanceViewport: enhanceViewportTool,
}
