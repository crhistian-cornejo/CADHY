/**
 * Material Pool Service
 *
 * Manages reusable Three.js materials to reduce memory allocation
 * and improve rendering performance. Supports both:
 * - Imperative usage (for services like measurement-tools)
 * - React hooks (for R3F components)
 *
 * Key features:
 * - Material caching by property hash
 * - Reference counting for automatic disposal
 * - Support for MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial
 * - PBR texture integration
 */

import { loggers } from "@cadhy/shared"
import * as THREE from "three"

const log = loggers.mesh

// ============================================================================
// TYPES
// ============================================================================

export interface StandardMaterialConfig {
  type: "standard"
  color?: string | number
  opacity?: number
  transparent?: boolean
  wireframe?: boolean
  side?: THREE.Side
  metalness?: number
  roughness?: number
  map?: THREE.Texture | null
  normalMap?: THREE.Texture | null
  roughnessMap?: THREE.Texture | null
  metalnessMap?: THREE.Texture | null
  aoMap?: THREE.Texture | null
  aoMapIntensity?: number
}

export interface BasicMaterialConfig {
  type: "basic"
  color?: string | number
  opacity?: number
  transparent?: boolean
  wireframe?: boolean
  side?: THREE.Side
}

export interface LineMaterialConfig {
  type: "line"
  color?: string | number
  opacity?: number
  transparent?: boolean
  linewidth?: number
}

export type MaterialConfig = StandardMaterialConfig | BasicMaterialConfig | LineMaterialConfig

interface PooledMaterial {
  material: THREE.Material
  refCount: number
  lastUsed: number
}

// ============================================================================
// MATERIAL KEY GENERATION
// ============================================================================

/**
 * Generate a unique key for a material configuration.
 * This key is used to cache and retrieve materials.
 */
function generateMaterialKey(config: MaterialConfig): string {
  const parts: string[] = [config.type]

  // Common properties
  if (config.color !== undefined) {
    parts.push(`c:${typeof config.color === "number" ? config.color.toString(16) : config.color}`)
  }
  if (config.opacity !== undefined) parts.push(`o:${config.opacity}`)
  if (config.transparent !== undefined) parts.push(`t:${config.transparent}`)

  // Type-specific properties
  if (config.type === "standard") {
    if (config.wireframe) parts.push("w:1")
    if (config.side !== undefined) parts.push(`s:${config.side}`)
    if (config.metalness !== undefined) parts.push(`m:${config.metalness}`)
    if (config.roughness !== undefined) parts.push(`r:${config.roughness}`)
    // Textures use their UUID for uniqueness
    if (config.map) parts.push(`map:${config.map.uuid}`)
    if (config.normalMap) parts.push(`nmap:${config.normalMap.uuid}`)
    if (config.roughnessMap) parts.push(`rmap:${config.roughnessMap.uuid}`)
    if (config.metalnessMap) parts.push(`mmap:${config.metalnessMap.uuid}`)
    if (config.aoMap) parts.push(`aomap:${config.aoMap.uuid}`)
    if (config.aoMapIntensity !== undefined) parts.push(`aoi:${config.aoMapIntensity}`)
  } else if (config.type === "basic") {
    if (config.wireframe) parts.push("w:1")
    if (config.side !== undefined) parts.push(`s:${config.side}`)
  } else if (config.type === "line") {
    if (config.linewidth !== undefined) parts.push(`lw:${config.linewidth}`)
  }

  return parts.join("|")
}

// ============================================================================
// MATERIAL POOL CLASS
// ============================================================================

class MaterialPoolManager {
  private pool: Map<string, PooledMaterial> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null
  private readonly MAX_IDLE_TIME = 60000 // 1 minute
  private readonly CLEANUP_INTERVAL = 30000 // 30 seconds

  constructor() {
    // Start cleanup timer
    this.startCleanupTimer()
  }

  /**
   * Get or create a material from the pool
   */
  getMaterial<T extends THREE.Material>(config: MaterialConfig): T {
    const key = generateMaterialKey(config)
    const existing = this.pool.get(key)

    if (existing) {
      existing.refCount++
      existing.lastUsed = Date.now()
      log.log("Material reused from pool:", key)
      return existing.material as T
    }

    // Create new material
    const material = this.createMaterial(config)
    this.pool.set(key, {
      material,
      refCount: 1,
      lastUsed: Date.now(),
    })

    log.log("Material created and pooled:", key)
    return material as T
  }

  /**
   * Release a material (decrease reference count)
   */
  releaseMaterial(config: MaterialConfig): void {
    const key = generateMaterialKey(config)
    const pooled = this.pool.get(key)

    if (pooled) {
      pooled.refCount--
      if (pooled.refCount <= 0) {
        // Don't dispose immediately - let cleanup handle it
        pooled.lastUsed = Date.now()
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): { totalMaterials: number; activeReferences: number } {
    let activeReferences = 0
    for (const pooled of this.pool.values()) {
      activeReferences += pooled.refCount
    }
    return {
      totalMaterials: this.pool.size,
      activeReferences,
    }
  }

  /**
   * Force cleanup of unused materials
   */
  cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, pooled] of this.pool.entries()) {
      if (pooled.refCount <= 0 && now - pooled.lastUsed > this.MAX_IDLE_TIME) {
        pooled.material.dispose()
        toDelete.push(key)
      }
    }

    for (const key of toDelete) {
      this.pool.delete(key)
    }

    if (toDelete.length > 0) {
      log.log(`Material pool cleanup: disposed ${toDelete.length} unused materials`)
    }
  }

  /**
   * Dispose all materials and clear the pool
   */
  dispose(): void {
    this.stopCleanupTimer()
    for (const pooled of this.pool.values()) {
      pooled.material.dispose()
    }
    this.pool.clear()
    log.log("Material pool disposed")
  }

  private createMaterial(config: MaterialConfig): THREE.Material {
    switch (config.type) {
      case "standard":
        return new THREE.MeshStandardMaterial({
          color: config.color ?? 0xffffff,
          opacity: config.opacity ?? 1,
          transparent: config.transparent ?? false,
          wireframe: config.wireframe ?? false,
          side: config.side ?? THREE.FrontSide,
          metalness: config.metalness ?? 0,
          roughness: config.roughness ?? 1,
          map: config.map ?? null,
          normalMap: config.normalMap ?? null,
          roughnessMap: config.roughnessMap ?? null,
          metalnessMap: config.metalnessMap ?? null,
          aoMap: config.aoMap ?? null,
          aoMapIntensity: config.aoMapIntensity ?? 1,
        })

      case "basic":
        return new THREE.MeshBasicMaterial({
          color: config.color ?? 0xffffff,
          opacity: config.opacity ?? 1,
          transparent: config.transparent ?? false,
          wireframe: config.wireframe ?? false,
          side: config.side ?? THREE.FrontSide,
        })

      case "line":
        return new THREE.LineBasicMaterial({
          color: config.color ?? 0xffffff,
          opacity: config.opacity ?? 1,
          transparent: config.transparent ?? false,
          linewidth: config.linewidth ?? 1,
        })

      default:
        throw new Error(`Unknown material type: ${(config as MaterialConfig).type}`)
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupInterval) return
    this.cleanupInterval = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL)
  }

  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const materialPool = new MaterialPoolManager()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get a MeshStandardMaterial from the pool
 */
export function getStandardMaterial(
  config: Omit<StandardMaterialConfig, "type">
): THREE.MeshStandardMaterial {
  return materialPool.getMaterial<THREE.MeshStandardMaterial>({ type: "standard", ...config })
}

/**
 * Get a MeshBasicMaterial from the pool
 */
export function getBasicMaterial(
  config: Omit<BasicMaterialConfig, "type">
): THREE.MeshBasicMaterial {
  return materialPool.getMaterial<THREE.MeshBasicMaterial>({ type: "basic", ...config })
}

/**
 * Get a LineBasicMaterial from the pool
 */
export function getLineMaterial(config: Omit<LineMaterialConfig, "type">): THREE.LineBasicMaterial {
  return materialPool.getMaterial<THREE.LineBasicMaterial>({ type: "line", ...config })
}

/**
 * Release a standard material back to the pool
 */
export function releaseStandardMaterial(config: Omit<StandardMaterialConfig, "type">): void {
  materialPool.releaseMaterial({ type: "standard", ...config })
}

/**
 * Release a basic material back to the pool
 */
export function releaseBasicMaterial(config: Omit<BasicMaterialConfig, "type">): void {
  materialPool.releaseMaterial({ type: "basic", ...config })
}

/**
 * Release a line material back to the pool
 */
export function releaseLineMaterial(config: Omit<LineMaterialConfig, "type">): void {
  materialPool.releaseMaterial({ type: "line", ...config })
}

// ============================================================================
// REACT HOOK FOR R3F
// ============================================================================

/**
 * React hook for using pooled materials in R3F components.
 * Automatically handles acquisition and release.
 *
 * @example
 * ```tsx
 * const material = usePooledMaterial({
 *   type: 'standard',
 *   color: '#ff0000',
 *   metalness: 0.5,
 *   roughness: 0.5
 * })
 *
 * return <mesh material={material}>...</mesh>
 * ```
 */
import { useEffect, useMemo } from "react"

export function usePooledMaterial<T extends THREE.Material>(config: MaterialConfig): T {
  // Memoize the config key to avoid unnecessary re-acquisitions
  const _configKey = useMemo(() => generateMaterialKey(config), [config])

  const material = useMemo(() => {
    return materialPool.getMaterial<T>(config)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  // Release on unmount or config change
  useEffect(() => {
    return () => {
      materialPool.releaseMaterial(config)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  return material
}

/**
 * Hook for standard PBR materials with texture support
 */
export function useStandardMaterial(
  config: Omit<StandardMaterialConfig, "type">
): THREE.MeshStandardMaterial {
  return usePooledMaterial<THREE.MeshStandardMaterial>({ type: "standard", ...config })
}

/**
 * Hook for basic unlit materials
 */
export function useBasicMaterial(
  config: Omit<BasicMaterialConfig, "type">
): THREE.MeshBasicMaterial {
  return usePooledMaterial<THREE.MeshBasicMaterial>({ type: "basic", ...config })
}

/**
 * Hook for line materials
 */
export function useLineMaterial(config: Omit<LineMaterialConfig, "type">): THREE.LineBasicMaterial {
  return usePooledMaterial<THREE.LineBasicMaterial>({ type: "line", ...config })
}
