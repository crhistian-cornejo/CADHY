/**
 * Texture Service - PBR Texture Management
 *
 * Manages PBR textures with:
 * - Intelligent caching (LRU with memory limits)
 * - Optimal format selection (PNG for normal/displacement, JPG for albedo)
 * - Correct color space handling (sRGB for albedo, Linear for data maps)
 * - Local-first loading with Poly Haven fallback
 *
 * @module render/RE_texture_service
 */

import { loggers } from "@cadhy/shared"
import * as THREE from "three"

const log = loggers.texture

// =============================================================================
// TYPES
// =============================================================================

/** PBR Texture map types */
export type PBRMapType = "albedo" | "normal" | "roughness" | "metalness" | "ao" | "displacement"

/** Complete PBR texture set */
export interface PBRTextureMaps {
  albedo?: THREE.Texture
  normal?: THREE.Texture
  roughness?: THREE.Texture
  metalness?: THREE.Texture
  ao?: THREE.Texture
  displacement?: THREE.Texture
}

/** Texture metadata for UI */
export interface TextureInfo {
  id: string
  name: string
  category: string
  previewUrl: string
  resolution: string
  isLocal: boolean
}

/** Options for applying textures to materials */
export interface PBRTextureOptions {
  repeatX?: number
  repeatY?: number
  normalScale?: number
  flipNormalY?: boolean
  enableDisplacement?: boolean
  displacementScale?: number
  displacementBias?: number
  aoIntensity?: number
}

/** Loading state for a texture set */
export type TextureLoadState = "idle" | "loading" | "loaded" | "error"

// =============================================================================
// CONSTANTS
// =============================================================================

const LOCAL_TEXTURES_PATH = "/textures"
const POLY_HAVEN_API = "https://api.polyhaven.com"
const POLY_HAVEN_CDN = "https://cdn.polyhaven.com"

/**
 * Available texture categories for CAD/Architecture
 * These match the downloaded texture library organization
 */
export const TEXTURE_CATEGORIES = [
  // Structural
  "concrete",
  "metal",
  "wood",
  "brick",
  "stone",
  // Ground & Terrain
  "asphalt",
  "gravel",
  "sand",
  "rock",
  // Finishes
  "tiles",
  "plaster",
  // Interior
  "fabric",
  "leather",
  "carpet",
] as const

export type TextureCategory = (typeof TEXTURE_CATEGORIES)[number]

/** Format preferences per map type (order matters - first available is used) */
const FORMAT_PRIORITY: Record<PBRMapType, string[]> = {
  albedo: ["jpg", "png"],
  normal: ["png", "exr", "jpg"],
  roughness: ["png", "jpg"],
  metalness: ["png", "jpg"],
  ao: ["png", "jpg"],
  displacement: ["exr", "png", "jpg"],
}

/** All PBR map types in loading order */
const ALL_MAP_TYPES: PBRMapType[] = [
  "albedo",
  "normal",
  "roughness",
  "metalness",
  "ao",
  "displacement",
]

// =============================================================================
// TEXTURE CACHE (Singleton)
// =============================================================================

interface CacheEntry {
  textures: PBRTextureMaps
  lastUsed: number
  size: number // bytes
}

class TextureManager {
  private cache = new Map<string, CacheEntry>()
  private loadingPromises = new Map<string, Promise<PBRTextureMaps>>()
  private loader = new THREE.TextureLoader()
  private manifest: TextureManifest | null = null
  private manifestPromise: Promise<TextureManifest | null> | null = null

  private maxCacheSize = 512 * 1024 * 1024 // 512 MB
  private currentCacheSize = 0

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Load PBR textures for a texture ID
   * Uses cache if available, otherwise loads from local/remote
   */
  async loadTextures(textureId: string): Promise<PBRTextureMaps> {
    // Check cache
    const cached = this.cache.get(textureId)
    if (cached) {
      cached.lastUsed = Date.now()
      // Only log in dev to avoid console spam
      if (process.env.NODE_ENV === "development") {
        log.log(`Cache hit: ${textureId}`)
      }
      return cached.textures
    }

    // Check if already loading
    const loading = this.loadingPromises.get(textureId)
    if (loading) {
      return loading
    }

    // Start loading - only log once
    log.log(`Loading textures: ${textureId}`)
    const promise = this.loadTexturesInternal(textureId)
    this.loadingPromises.set(textureId, promise)

    try {
      const textures = await promise
      this.cacheTextures(textureId, textures)
      return textures
    } finally {
      this.loadingPromises.delete(textureId)
    }
  }

  /**
   * Get list of available textures (local first)
   */
  async getAvailableTextures(category?: string): Promise<TextureInfo[]> {
    const manifest = await this.loadManifest()
    if (!manifest) return []

    const textures: TextureInfo[] = []

    for (const [cat, ids] of Object.entries(manifest.categories)) {
      if (category && cat !== category) continue

      for (const id of ids) {
        textures.push({
          id,
          name: this.formatTextureName(id),
          category: cat,
          previewUrl: `${LOCAL_TEXTURES_PATH}/${id}/albedo.jpg`,
          resolution: manifest.resolution,
          isLocal: true,
        })
      }
    }

    return textures
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<string[]> {
    const manifest = await this.loadManifest()
    if (!manifest) return []
    return Object.keys(manifest.categories).filter((cat) => manifest.categories[cat].length > 0)
  }

  /**
   * Preload textures for given IDs
   */
  async preload(textureIds: string[]): Promise<void> {
    await Promise.all(textureIds.map((id) => this.loadTextures(id)))
  }

  /**
   * Clear all cached textures
   */
  clearCache(): void {
    for (const entry of this.cache.values()) {
      this.disposeTextures(entry.textures)
    }
    this.cache.clear()
    this.currentCacheSize = 0
    log.log("Texture cache cleared")
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: string; count: number; loading: number } {
    return {
      size: `${(this.currentCacheSize / 1024 / 1024).toFixed(2)} MB`,
      count: this.cache.size,
      loading: this.loadingPromises.size,
    }
  }

  // ---------------------------------------------------------------------------
  // Internal Methods
  // ---------------------------------------------------------------------------

  private async loadTexturesInternal(textureId: string): Promise<PBRTextureMaps> {
    const basePath = `${LOCAL_TEXTURES_PATH}/${textureId}`
    const textures: PBRTextureMaps = {}

    // Load all map types in parallel
    const loadPromises = ALL_MAP_TYPES.map(async (mapType) => {
      const texture = await this.loadMapWithFallback(basePath, mapType)
      if (texture) {
        textures[mapType] = texture
      }
    })

    await Promise.all(loadPromises)
    return textures
  }

  private async loadMapWithFallback(
    basePath: string,
    mapType: PBRMapType
  ): Promise<THREE.Texture | null> {
    const formats = FORMAT_PRIORITY[mapType]

    for (const format of formats) {
      const url = `${basePath}/${mapType}.${format}`
      try {
        const texture = await this.loadSingleTexture(url)
        this.configureTexture(texture, mapType)
        return texture
      } catch {}
    }

    return null
  }

  private async loadSingleTexture(url: string): Promise<THREE.Texture> {
    // Use fetch + createImageBitmap for off-thread image decoding
    // This prevents the main thread from blocking during image decode
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${url}`)
      }

      const blob = await response.blob()

      // createImageBitmap decodes the image OFF the main thread
      // This is the key to avoiding frame spikes during texture loading
      const imageBitmap = await createImageBitmap(blob, {
        // Optimize for WebGL texture upload
        premultiplyAlpha: "none",
        colorSpaceConversion: "none",
      })

      // Create texture from ImageBitmap
      const texture = new THREE.Texture(imageBitmap as unknown as HTMLImageElement)

      // STAGGERED UPLOAD: Don't set needsUpdate immediately.
      // GPU upload is expensive and blocks the main thread.
      // Staggering ensures we don't upload many large textures in a single frame.
      this.queueTextureForUpload(texture)

      return texture
    } catch {
      // Fallback to traditional loader if createImageBitmap fails
      return new Promise((resolve, reject) => {
        this.loader.load(
          url,
          (texture) => {
            this.queueTextureForUpload(texture)
            resolve(texture)
          },
          undefined,
          () => reject(new Error(`Failed to load: ${url}`))
        )
      })
    }
  }

  /**
   * Queue a texture for GPU upload to avoid frame spikes.
   * Processes globally to ensure only X textures are uploaded per frame.
   */
  private uploadQueue: THREE.Texture[] = []
  private isProcessingQueue = false

  private queueTextureForUpload(texture: THREE.Texture): void {
    this.uploadQueue.push(texture)
    if (!this.isProcessingQueue) {
      this.processUploadQueue()
    }
  }

  private processUploadQueue(): void {
    if (this.uploadQueue.length === 0) {
      this.isProcessingQueue = false
      return
    }

    this.isProcessingQueue = true

    // Process only 1 texture per frame to maintain 60FPS
    // Texture upload is the single most common cause of "SEVERE SPIKE" warnings in Three.js
    const texture = this.uploadQueue.shift()
    if (texture) {
      texture.needsUpdate = true
    }

    // Continue on next frame
    requestAnimationFrame(() => this.processUploadQueue())
  }

  private configureTexture(texture: THREE.Texture, mapType: PBRMapType): void {
    // Wrapping
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping

    // Filtering - optimize based on map type
    // Albedo (color) benefits from mipmaps for smooth distant rendering
    // Data maps (normal, roughness, etc.) don't need mipmaps and save GPU memory
    const isColorMap = mapType === "albedo"

    texture.generateMipmaps = isColorMap
    texture.minFilter = isColorMap ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter

    // Anisotropy: 4x is a good balance between quality and performance
    // Higher values (8x, 16x) have diminishing returns but increase GPU load
    texture.anisotropy = isColorMap ? 4 : 1

    // Color space: sRGB for albedo, Linear for all other maps
    texture.colorSpace = isColorMap ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace
  }

  private cacheTextures(textureId: string, textures: PBRTextureMaps): void {
    const size = this.estimateSize(textures)

    // Evict if needed
    while (this.currentCacheSize + size > this.maxCacheSize && this.cache.size > 0) {
      this.evictOldest()
    }

    this.cache.set(textureId, {
      textures,
      lastUsed: Date.now(),
      size,
    })
    this.currentCacheSize += size
  }

  private evictOldest(): void {
    let oldest: [string, CacheEntry] | null = null

    for (const entry of this.cache.entries()) {
      if (!oldest || entry[1].lastUsed < oldest[1].lastUsed) {
        oldest = entry
      }
    }

    if (oldest) {
      this.disposeTextures(oldest[1].textures)
      this.currentCacheSize -= oldest[1].size
      this.cache.delete(oldest[0])
      log.log(`Evicted: ${oldest[0]}`)
    }
  }

  private estimateSize(textures: PBRTextureMaps): number {
    let size = 0
    for (const tex of Object.values(textures)) {
      if (tex?.image) {
        const img = tex.image as HTMLImageElement
        // 4 bytes per pixel * 1.33 for mipmaps
        size += (img.width || 1024) * (img.height || 1024) * 4 * 1.33
      }
    }
    return size
  }

  private disposeTextures(textures: PBRTextureMaps): void {
    for (const tex of Object.values(textures)) {
      tex?.dispose()
    }
  }

  private async loadManifest(): Promise<TextureManifest | null> {
    if (this.manifest) return this.manifest

    if (this.manifestPromise) return this.manifestPromise

    this.manifestPromise = fetch(`${LOCAL_TEXTURES_PATH}/manifest.json`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)

    this.manifest = await this.manifestPromise
    return this.manifest
  }

  private formatTextureName(id: string): string {
    return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

interface TextureManifest {
  version: string
  resolution: string
  categories: Record<string, string[]>
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const textureManager = new TextureManager()

// =============================================================================
// MATERIAL APPLICATION
// =============================================================================

/**
 * Apply PBR textures to a Three.js material
 */
export function applyPBRTextures(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  textures: PBRTextureMaps,
  options: PBRTextureOptions = {}
): void {
  const {
    repeatX = 1,
    repeatY = 1,
    normalScale = 1.0,
    flipNormalY = false,
    enableDisplacement = false,
    displacementScale = 0.1,
    displacementBias = 0,
    aoIntensity = 1.0,
  } = options

  // Albedo
  if (textures.albedo) {
    material.map = textures.albedo
    material.map.repeat.set(repeatX, repeatY)
  }

  // Normal
  if (textures.normal) {
    material.normalMap = textures.normal
    material.normalMap.repeat.set(repeatX, repeatY)
    material.normalScale = new THREE.Vector2(normalScale, flipNormalY ? -normalScale : normalScale)
  }

  // Roughness
  if (textures.roughness) {
    material.roughnessMap = textures.roughness
    material.roughnessMap.repeat.set(repeatX, repeatY)
    material.roughness = 1.0
  }

  // Metalness
  if (textures.metalness) {
    material.metalnessMap = textures.metalness
    material.metalnessMap.repeat.set(repeatX, repeatY)
    material.metalness = 1.0
  }

  // AO
  if (textures.ao) {
    material.aoMap = textures.ao
    material.aoMap.repeat.set(repeatX, repeatY)
    material.aoMapIntensity = aoIntensity
  }

  // Displacement
  if (textures.displacement && enableDisplacement) {
    material.displacementMap = textures.displacement
    material.displacementMap.repeat.set(repeatX, repeatY)
    material.displacementScale = displacementScale
    material.displacementBias = displacementBias
  }

  material.needsUpdate = true
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const loadTextures = textureManager.loadTextures.bind(textureManager)
export const getAvailableTextures = textureManager.getAvailableTextures.bind(textureManager)
export const getCategories = textureManager.getCategories.bind(textureManager)
export const preloadTextures = textureManager.preload.bind(textureManager)
export const clearTextureCache = textureManager.clearCache.bind(textureManager)
export const getTextureStats = textureManager.getStats.bind(textureManager)

// =============================================================================
// POLY HAVEN API (Remote fallback)
// =============================================================================

interface PolyHavenAsset {
  name: string
  categories: string[]
  tags: string[]
}

/**
 * Fetch textures from Poly Haven API
 * Used when local textures aren't available or for browsing
 */
export async function fetchPolyHavenTextures(category: string, limit = 24): Promise<TextureInfo[]> {
  // First, try local manifest
  const localTextures = await textureManager.getAvailableTextures(category)
  if (localTextures.length > 0) {
    return localTextures.slice(0, limit)
  }

  // Fallback to Poly Haven API
  try {
    const response = await fetch(`${POLY_HAVEN_API}/assets?t=textures`)
    if (!response.ok) return []

    const data = (await response.json()) as Record<string, PolyHavenAsset>
    const textures: TextureInfo[] = []

    for (const [id, info] of Object.entries(data)) {
      if (category && !info.categories?.includes(category)) continue

      textures.push({
        id,
        name: info.name || id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        category: info.categories?.[0] || category,
        previewUrl: `${POLY_HAVEN_CDN}/asset_img/primary/${id}.png?height=256`,
        resolution: "2k",
        isLocal: false,
      })

      if (textures.length >= limit) break
    }

    return textures
  } catch (error) {
    log.warn("Failed to fetch from Poly Haven:", error)
    return []
  }
}

/**
 * Load PBR textures from Poly Haven (remote)
 * Downloads textures directly from CDN
 */
export async function loadPBRTexturesFromPolyHaven(
  textureId: string,
  resolution: "1k" | "2k" | "4k" = "1k"
): Promise<PBRTextureMaps> {
  // First check if we have it locally
  try {
    const localTextures = await textureManager.loadTextures(textureId)
    if (Object.keys(localTextures).length > 0) {
      return localTextures
    }
  } catch {
    // Not found locally, try remote
  }

  // Fetch from Poly Haven
  const response = await fetch(`${POLY_HAVEN_API}/files/${textureId}`)
  if (!response.ok) {
    throw new Error(`Texture not found: ${textureId}`)
  }

  const fileData = await response.json()
  const textures: PBRTextureMaps = {}
  const loader = new THREE.TextureLoader()

  // Map Poly Haven naming to our naming
  const mapMapping: Record<string, PBRMapType> = {
    Diffuse: "albedo",
    Color: "albedo",
    nor_gl: "normal",
    Rough: "roughness",
    rough: "roughness",
    AO: "ao",
    ao: "ao",
    Displacement: "displacement",
    disp: "displacement",
    Metal: "metalness",
    metal: "metalness",
  }

  const loadPromises = Object.entries(mapMapping).map(async ([polyName, mapType]) => {
    const mapData = fileData[polyName]?.[resolution]
    if (!mapData) return

    // Prefer PNG, then JPG
    const format = mapData.png ? "png" : mapData.jpg ? "jpg" : null
    if (!format) return

    const url = mapData[format]?.url
    if (!url) return

    try {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject)
      })

      // Configure texture
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.generateMipmaps = true
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.colorSpace = mapType === "albedo" ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace

      textures[mapType] = texture
    } catch {
      // Map not available
    }
  })

  await Promise.all(loadPromises)
  return textures
}
