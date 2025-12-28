/**
 * @fileoverview Render caches
 * @module render/cache
 *
 * LRU caches for:
 * - Geometry: Tessellated mesh data from C++ backend
 * - Mesh: Three.js BufferGeometry objects
 * - Texture: Three.js Texture objects
 */

// Geometry cache (tessellation results from C++)
export {
  GeometryCache,
  type GeometryCacheConfig,
  type GeometryCacheEntry,
  type GeometryCacheKey,
  type GeometryCacheStats,
  geometryCache,
  getOrComputeGeometry,
  prefetchGeometry,
} from "./RE_geometry_cache"

// Mesh cache (Three.js geometry)
export { MeshCache, meshCache } from "./RE_mesh_cache"

// Texture cache
export { TextureCache, textureCache } from "./RE_texture_cache"
