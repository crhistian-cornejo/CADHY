/**
 * usePBRTextures Hook
 *
 * Loads PBR textures for a material based on texture IDs stored in material.pbr
 * Only loads when post-processing is enabled.
 */

import { useEffect, useState } from "react"
import { loadPBRTexturesFromPolyHaven, type PBRTextureMaps } from "@/services/texture-service"
import type { MaterialProperties } from "@/stores/modeller/types"

// Re-export for convenience
export type { PBRTextureMaps }

export function usePBRTextures(
  material: MaterialProperties | undefined,
  postProcessingEnabled: boolean
): PBRTextureMaps | null {
  const [textures, setTextures] = useState<PBRTextureMaps | null>(null)

  useEffect(() => {
    // If post-processing is disabled, clear textures
    if (!postProcessingEnabled) {
      console.log("[usePBRTextures] Post-processing disabled, clearing textures")
      setTextures(null)
      return
    }

    // If no material or no pbr config, clear textures
    if (!material?.pbr?.albedoTextureId) {
      console.log("[usePBRTextures] No texture ID in material.pbr")
      setTextures(null)
      return
    }

    // Load textures from the stored texture ID
    const textureId = material.pbr.albedoTextureId
    console.log(
      "[usePBRTextures] Loading texture:",
      textureId,
      "Post-processing:",
      postProcessingEnabled
    )

    let cancelled = false

    loadPBRTexturesFromPolyHaven(textureId, "1k")
      .then((maps) => {
        if (!cancelled) {
          console.log("[usePBRTextures] Textures loaded successfully:", Object.keys(maps))
          setTextures(maps)
        }
      })
      .catch((error) => {
        console.error("[usePBRTextures] Failed to load textures:", error)
        if (!cancelled) {
          setTextures(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [material?.pbr?.albedoTextureId, postProcessingEnabled])

  return textures
}
