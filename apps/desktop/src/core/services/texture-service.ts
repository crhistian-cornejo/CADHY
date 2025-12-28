/**
 * Texture Service Re-export
 *
 * Re-exports the texture service from render module for convenience.
 * This allows importing from @/core/services/texture-service
 *
 * @module core/services/texture-service
 */

export {
  // Functions
  applyPBRTextures,
  clearTextureCache,
  fetchPolyHavenTextures,
  getAvailableTextures,
  getCategories,
  getTextureStats,
  loadPBRTexturesFromPolyHaven,
  loadTextures,
  // Types
  type PBRMapType,
  type PBRTextureMaps,
  type PBRTextureOptions,
  preloadTextures,
  // Constants
  TEXTURE_CATEGORIES,
  type TextureCategory,
  type TextureInfo,
  type TextureLoadState,
  // Singleton
  textureManager,
} from "@/render/RE_texture_service"
