/**
 * React Hooks for PBR Textures
 *
 * Provides memoized texture loading with proper React lifecycle handling.
 * Uses the TextureManager singleton for caching.
 *
 * @module render/RE_textures_hook
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  getAvailableTextures,
  getCategories,
  loadTextures,
  type PBRTextureMaps,
  type TextureInfo,
  type TextureLoadState,
} from "./RE_texture_service"

// Re-export types
export type { PBRTextureMaps, TextureInfo, TextureLoadState }

// =============================================================================
// useTextures - Load PBR textures for a texture ID
// =============================================================================

interface UseTexturesResult {
  textures: PBRTextureMaps | null
  state: TextureLoadState
  error: Error | null
}

/**
 * Load PBR textures for a material
 *
 * @param textureId - The texture ID to load (e.g., "brushed_concrete")
 * @param enabled - Whether to load (default: true)
 * @returns Textures, loading state, and error
 *
 * @example
 * ```tsx
 * const { textures, state } = useTextures(material.textureId)
 *
 * if (state === 'loading') return <LoadingSpinner />
 * if (textures) applyPBRTextures(meshMaterial, textures)
 * ```
 */
export function useTextures(textureId: string | undefined, enabled = true): UseTexturesResult {
  const [textures, setTextures] = useState<PBRTextureMaps | null>(null)
  const [state, setState] = useState<TextureLoadState>("idle")
  const [error, setError] = useState<Error | null>(null)

  // Track current request to handle race conditions
  const requestIdRef = useRef(0)

  useEffect(() => {
    // Reset if disabled or no textureId
    if (!enabled || !textureId) {
      setTextures(null)
      setState("idle")
      setError(null)
      return
    }

    // Increment request ID to invalidate stale requests
    const requestId = ++requestIdRef.current

    setState("loading")
    setError(null)

    loadTextures(textureId)
      .then((result) => {
        // Only update if this is still the current request
        if (requestId === requestIdRef.current) {
          setTextures(result)
          setState("loaded")
        }
      })
      .catch((err) => {
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setState("error")
        }
      })
  }, [textureId, enabled])

  return { textures, state, error }
}

// =============================================================================
// useTextureList - Get available textures
// =============================================================================

interface UseTextureListResult {
  textures: TextureInfo[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Get list of available textures
 *
 * @param category - Filter by category (optional)
 * @returns Available textures and loading state
 *
 * @example
 * ```tsx
 * const { textures, loading } = useTextureList('concrete')
 *
 * return (
 *   <div>
 *     {textures.map(tex => (
 *       <TexturePreview key={tex.id} texture={tex} />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useTextureList(category?: string): UseTextureListResult {
  const [textures, setTextures] = useState<TextureInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getAvailableTextures(category)
      .then((result) => {
        if (!cancelled) {
          setTextures(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [category, fetchKey])

  return { textures, loading, error, refetch }
}

// =============================================================================
// useTextureCategories - Get available categories
// =============================================================================

interface UseTextureCategoriesResult {
  categories: string[]
  loading: boolean
}

/**
 * Get list of available texture categories
 *
 * @example
 * ```tsx
 * const { categories } = useTextureCategories()
 *
 * return (
 *   <Select>
 *     {categories.map(cat => (
 *       <Option key={cat} value={cat}>{cat}</Option>
 *     ))}
 *   </Select>
 * )
 * ```
 */
export function useTextureCategories(): UseTextureCategoriesResult {
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .finally(() => setLoading(false))
  }, [])

  return { categories, loading }
}

// =============================================================================
// useMemoizedTextures - Memoized texture lookup
// =============================================================================

/**
 * Memoized texture lookup that only reloads when textureId changes
 * Useful for components that re-render frequently
 *
 * @param textureId - The texture ID
 * @returns Stable reference to textures
 */
export function useMemoizedTextures(textureId: string | undefined): PBRTextureMaps | null {
  const { textures } = useTextures(textureId)

  // Memoize the result to provide stable reference
  return useMemo(() => textures, [textures])
}

// =============================================================================
// usePBRTextures - Load PBR textures for a material
// =============================================================================

interface MaterialWithPBR {
  pbr?: {
    albedoTextureId?: string
  }
}

/**
 * Load PBR textures for a material based on texture IDs stored in material.pbr
 * Only loads when post-processing is enabled.
 *
 * @param material - The material object with optional PBR config
 * @param postProcessingEnabled - Whether post-processing is enabled
 * @returns PBR texture maps or null
 */
export function usePBRTextures(
  material: MaterialWithPBR | undefined,
  postProcessingEnabled: boolean
): PBRTextureMaps | null {
  const textureId = material?.pbr?.albedoTextureId
  const enabled = postProcessingEnabled && !!textureId
  const { textures } = useTextures(textureId, enabled)
  return textures
}
