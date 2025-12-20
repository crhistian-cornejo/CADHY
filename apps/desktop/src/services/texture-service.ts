/**
 * Texture Service
 *
 * Manages PBR textures from open-source libraries like Poly Haven.
 * Provides texture loading, caching, and material application.
 */

import * as THREE from "three"

// ============================================================================
// TYPES
// ============================================================================

/**
 * PBR Texture Maps (Physically Based Rendering)
 */
export interface PBRTextureMaps {
  /** Albedo/Diffuse map - base color */
  albedo?: THREE.Texture
  /** Normal map - surface detail */
  normal?: THREE.Texture
  /** Roughness map - surface smoothness */
  roughness?: THREE.Texture
  /** Metalness map - metallic properties */
  metalness?: THREE.Texture
  /** Ambient Occlusion map - baked shadows */
  ao?: THREE.Texture
  /** Displacement/Height map - geometric detail */
  displacement?: THREE.Texture
}

/**
 * Texture metadata from Poly Haven API
 */
export interface TextureInfo {
  id: string
  name: string
  category: string
  tags: string[]
  downloadUrl: string
  previewUrl: string
  resolution: string
  format: string
}

/**
 * Texture library source
 */
export type TextureSource = "polyhaven" | "ambientcg" | "3dtextures" | "local"

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Poly Haven API base URL
 */
const POLY_HAVEN_API = "https://api.polyhaven.com"

/**
 * Default texture resolution
 */
const DEFAULT_RESOLUTION = "1k"

/**
 * Local textures base path (public folder)
 */
const LOCAL_TEXTURES_PATH = "/textures"

/**
 * Texture cache to avoid re-downloading
 */
const textureCache = new Map<string, PBRTextureMaps>()

/**
 * Local texture manifest (single category - legacy)
 */
interface LocalTextureManifestSingle {
  version: string
  category: string
  resolution: string
  textures: string[]
  generated: string
}

/**
 * Local texture manifest (multi-category)
 */
interface LocalTextureManifestMulti {
  version: string
  resolution: string
  categories: Record<string, string[]>
  generated: string
}

type LocalTextureManifest = LocalTextureManifestSingle | LocalTextureManifestMulti

let localManifest: LocalTextureManifest | null = null

// ============================================================================
// LOCAL TEXTURES
// ============================================================================

/**
 * Load local texture manifest
 */
async function loadLocalManifest(): Promise<LocalTextureManifest | null> {
  if (localManifest) return localManifest

  try {
    const response = await fetch(`${LOCAL_TEXTURES_PATH}/manifest.json`)
    if (!response.ok) return null

    localManifest = await response.json()
    return localManifest
  } catch (error) {
    console.warn("[TextureService] No local textures available:", error)
    return null
  }
}

/**
 * Get local textures as TextureInfo array
 */
async function getLocalTextures(filterCategory?: string): Promise<TextureInfo[]> {
  const manifest = await loadLocalManifest()
  if (!manifest) return []

  const textures: TextureInfo[] = []

  // Handle multi-category manifest
  if ("categories" in manifest) {
    for (const [category, textureIds] of Object.entries(manifest.categories)) {
      // Filter by category if specified
      if (filterCategory && category !== filterCategory) continue

      for (const id of textureIds) {
        textures.push({
          id,
          name: id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          category,
          tags: [],
          downloadUrl: "", // Not needed for local
          previewUrl: `${LOCAL_TEXTURES_PATH}/${id}/albedo.jpg`,
          resolution: manifest.resolution,
          format: "jpg",
        })
      }
    }
  }
  // Handle legacy single-category manifest
  else {
    if (filterCategory && manifest.category !== filterCategory) return []

    for (const id of manifest.textures) {
      textures.push({
        id,
        name: id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        category: manifest.category,
        tags: [],
        downloadUrl: "", // Not needed for local
        previewUrl: `${LOCAL_TEXTURES_PATH}/${id}/albedo.jpg`,
        resolution: manifest.resolution,
        format: "jpg",
      })
    }
  }

  return textures
}

/**
 * Check if a texture exists locally
 */
async function isTextureLocal(textureId: string): Promise<boolean> {
  const manifest = await loadLocalManifest()
  if (!manifest) return false

  // Handle multi-category manifest
  if ("categories" in manifest) {
    return Object.values(manifest.categories).some((textures) => textures.includes(textureId))
  }

  // Handle legacy single-category manifest
  return manifest.textures.includes(textureId)
}

/**
 * Load PBR texture maps from local assets
 */
async function loadLocalPBRTextures(textureId: string): Promise<PBRTextureMaps> {
  const basePath = `${LOCAL_TEXTURES_PATH}/${textureId}`
  const maps: PBRTextureMaps = {}
  const loadPromises: Promise<void>[] = []

  // Map types available locally
  const mapTypes = ["albedo", "normal", "roughness", "ao", "displacement"]

  for (const mapType of mapTypes) {
    const url = `${basePath}/${mapType}.jpg`

    loadPromises.push(
      loadTextureFromUrl(url)
        .then((tex) => {
          // Apply correct color space
          if (mapType === "albedo") {
            tex.colorSpace = THREE.SRGBColorSpace
          } else {
            tex.colorSpace = THREE.LinearSRGBColorSpace
          }

          maps[mapType as keyof PBRTextureMaps] = tex
        })
        .catch(() => {
          // Map might not exist, that's ok
        })
    )
  }

  await Promise.all(loadPromises)
  return maps
}

// ============================================================================
// POLY HAVEN API
// ============================================================================

/**
 * Fetch available textures (local first, then Poly Haven)
 */
export async function fetchPolyHavenTextures(
  category?: string,
  limit = 20
): Promise<TextureInfo[]> {
  // Try local textures first (with category filter)
  const localTextures = await getLocalTextures(category)
  if (localTextures.length > 0) {
    console.log(
      `[TextureService] Using ${localTextures.length} local textures${category ? ` (category: ${category})` : ""}`
    )
    return localTextures.slice(0, limit)
  }

  // Fallback to Poly Haven API
  try {
    console.log("[TextureService] Fetching textures from Poly Haven API")
    const response = await fetch(`${POLY_HAVEN_API}/assets?t=textures`)
    if (!response.ok) throw new Error("Failed to fetch textures")

    const data = await response.json()
    const textures: TextureInfo[] = []

    // Convert API response to TextureInfo array
    for (const [id, info] of Object.entries(data)) {
      const textureData = info as {
        name: string
        categories: string[]
        tags: string[]
      }

      if (category && !textureData.categories?.includes(category)) continue

      textures.push({
        id,
        name: textureData.name,
        category: textureData.categories?.[0] || "general",
        tags: textureData.tags || [],
        downloadUrl: `${POLY_HAVEN_API}/files/${id}`,
        previewUrl: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256`,
        resolution: DEFAULT_RESOLUTION,
        format: "jpg",
      })

      if (textures.length >= limit) break
    }

    return textures
  } catch (error) {
    console.error("[TextureService] Failed to fetch Poly Haven textures:", error)
    return []
  }
}

/**
 * Get download URLs for a specific texture from Poly Haven
 */
async function getPolyHavenTextureUrls(
  textureId: string,
  resolution = DEFAULT_RESOLUTION
): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${POLY_HAVEN_API}/files/textures/${textureId}`)
    if (!response.ok) throw new Error(`Failed to fetch texture files for ${textureId}`)

    const data = await response.json()

    // Get URLs for each map type at the specified resolution
    const urls: Record<string, string> = {}

    // Poly Haven structure: data[resolution][format][mapType]
    const resolutionData = data[resolution] || data["1k"] // Fallback to 1k

    if (resolutionData) {
      const jpgData = resolutionData.jpg || resolutionData.png
      if (jpgData) {
        urls.albedo = jpgData.diff?.url || jpgData.col?.url
        urls.normal = jpgData.nor?.url || jpgData.nor_gl?.url
        urls.roughness = jpgData.rough?.url
        urls.metalness = jpgData.metal?.url
        urls.ao = jpgData.ao?.url
        urls.displacement = jpgData.disp?.url || jpgData.height?.url
      }
    }

    return urls
  } catch (error) {
    console.error(`[TextureService] Failed to get texture URLs for ${textureId}:`, error)
    return {}
  }
}

// ============================================================================
// TEXTURE LOADING
// ============================================================================

/**
 * Load a texture from URL with Three.js TextureLoader
 */
function loadTextureFromUrl(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.load(
      url,
      (texture) => {
        // Configure texture for PBR
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.colorSpace = THREE.SRGBColorSpace
        resolve(texture)
      },
      undefined,
      (error) => reject(error)
    )
  })
}

/**
 * Load PBR texture maps (local first, then Poly Haven)
 */
export async function loadPBRTexturesFromPolyHaven(
  textureId: string,
  resolution = DEFAULT_RESOLUTION
): Promise<PBRTextureMaps> {
  // Check cache first
  const cacheKey = `${textureId}:${resolution}`
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!
  }

  // Try local textures first
  if (await isTextureLocal(textureId)) {
    console.log(`[TextureService] Loading texture from local assets: ${textureId}`)
    const maps = await loadLocalPBRTextures(textureId)
    textureCache.set(cacheKey, maps)
    return maps
  }

  // Fallback to Poly Haven API
  console.log(`[TextureService] Loading texture from Poly Haven: ${textureId}`)

  try {
    // Get download URLs
    const urls = await getPolyHavenTextureUrls(textureId, resolution)

    // Load textures in parallel
    const maps: PBRTextureMaps = {}
    const loadPromises: Promise<void>[] = []

    if (urls.albedo) {
      loadPromises.push(
        loadTextureFromUrl(urls.albedo).then((tex) => {
          maps.albedo = tex
        })
      )
    }

    if (urls.normal) {
      loadPromises.push(
        loadTextureFromUrl(urls.normal).then((tex) => {
          tex.colorSpace = THREE.LinearSRGBColorSpace // Normal maps are linear
          maps.normal = tex
        })
      )
    }

    if (urls.roughness) {
      loadPromises.push(
        loadTextureFromUrl(urls.roughness).then((tex) => {
          tex.colorSpace = THREE.LinearSRGBColorSpace
          maps.roughness = tex
        })
      )
    }

    if (urls.metalness) {
      loadPromises.push(
        loadTextureFromUrl(urls.metalness).then((tex) => {
          tex.colorSpace = THREE.LinearSRGBColorSpace
          maps.metalness = tex
        })
      )
    }

    if (urls.ao) {
      loadPromises.push(
        loadTextureFromUrl(urls.ao).then((tex) => {
          tex.colorSpace = THREE.LinearSRGBColorSpace
          maps.ao = tex
        })
      )
    }

    if (urls.displacement) {
      loadPromises.push(
        loadTextureFromUrl(urls.displacement).then((tex) => {
          tex.colorSpace = THREE.LinearSRGBColorSpace
          maps.displacement = tex
        })
      )
    }

    await Promise.all(loadPromises)

    // Cache the loaded textures
    textureCache.set(cacheKey, maps)

    return maps
  } catch (error) {
    console.error(`[TextureService] Failed to load PBR textures for ${textureId}:`, error)
    return {}
  }
}

/**
 * Apply PBR textures to a Three.js material
 */
export function applyPBRTexturesToMaterial(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  textures: PBRTextureMaps,
  options?: {
    /** UV repeat scale */
    repeatX?: number
    repeatY?: number
    /** Enable displacement */
    enableDisplacement?: boolean
  }
) {
  const repeatX = options?.repeatX ?? 1
  const repeatY = options?.repeatY ?? 1

  // Apply albedo/diffuse
  if (textures.albedo) {
    material.map = textures.albedo
    material.map.repeat.set(repeatX, repeatY)
  }

  // Apply normal map
  if (textures.normal) {
    material.normalMap = textures.normal
    material.normalMap.repeat.set(repeatX, repeatY)
    material.normalScale = new THREE.Vector2(1, 1)
  }

  // Apply roughness
  if (textures.roughness) {
    material.roughnessMap = textures.roughness
    material.roughnessMap.repeat.set(repeatX, repeatY)
  }

  // Apply metalness
  if (textures.metalness) {
    material.metalnessMap = textures.metalness
    material.metalnessMap.repeat.set(repeatX, repeatY)
  }

  // Apply ambient occlusion
  if (textures.ao) {
    material.aoMap = textures.ao
    material.aoMap.repeat.set(repeatX, repeatY)
    material.aoMapIntensity = 1
  }

  // Apply displacement (only for MeshPhysicalMaterial or if explicitly enabled)
  if (textures.displacement && options?.enableDisplacement) {
    material.displacementMap = textures.displacement
    material.displacementMap.repeat.set(repeatX, repeatY)
    material.displacementScale = 0.1
  }

  material.needsUpdate = true
}

/**
 * Clear texture cache to free memory
 */
export function clearTextureCache() {
  // Dispose all cached textures
  for (const maps of textureCache.values()) {
    maps.albedo?.dispose()
    maps.normal?.dispose()
    maps.roughness?.dispose()
    maps.metalness?.dispose()
    maps.ao?.dispose()
    maps.displacement?.dispose()
  }
  textureCache.clear()
}

// ============================================================================
// COMMON TEXTURE PRESETS
// ============================================================================

/**
 * Common texture categories from Poly Haven
 */
export const TEXTURE_CATEGORIES = [
  "concrete",
  "metal",
  "wood",
  "brick",
  "stone",
  "ground",
  "fabric",
  "tiles",
  "plaster",
  "paint",
]

/**
 * Default concrete texture for hydraulic structures
 */
export async function loadDefaultConcreteTexture(): Promise<PBRTextureMaps> {
  // Use a common concrete texture from Poly Haven
  // Replace with actual texture ID from Poly Haven
  return loadPBRTexturesFromPolyHaven("concrete_floor_worn_001", "1k")
}
