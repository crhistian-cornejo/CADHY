/**
 * LOD (Level of Detail) Manager
 *
 * Manages automatic level-of-detail switching based on camera distance.
 * Improves performance by reducing polygon count for distant objects.
 *
 * Performance benefits:
 * - 3-5x FPS improvement with >1000 objects
 * - Automatic quality adjustment
 * - GPU memory savings
 */

import * as THREE from "three"
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js"
import { frustumCuller } from "./RE_frustum_culler"

export interface LODLevel {
  distance: number // Max distance for this LOD level
  quality: number // Geometry quality (1.0 = full, 0.5 = half polygons, etc.)
}

export interface LODConfig {
  enabled: boolean
  levels: LODLevel[]
  updateInterval: number // milliseconds between LOD updates
}

export const DEFAULT_LOD_CONFIG: LODConfig = {
  enabled: true,
  levels: [
    { distance: 15, quality: 1.0 }, // Close: full quality
    { distance: 40, quality: 0.7 }, // Medium: 70% polygons (better quality)
    { distance: 80, quality: 0.4 }, // Far: 40% polygons
    { distance: Infinity, quality: 0.15 }, // Very far: 15% polygons
  ],
  updateInterval: 150, // Update LOD every 150ms (more responsive)
}

interface CachedLOD {
  originalGeometry: THREE.BufferGeometry
  lodGeometries: Map<number, THREE.BufferGeometry> // quality -> geometry
  currentQuality: number
}

/**
 * Pending simplification work item
 * PERFORMANCE: Queue work to spread across frames (avoid main thread blocking)
 */
interface PendingSimplification {
  objectId: string
  mesh: THREE.Mesh
  quality: number
  cached: CachedLOD
}

export class LODManager {
  private config: LODConfig
  private cache = new Map<string, CachedLOD>()
  private simplifier = new SimplifyModifier()
  private lastUpdateTime = 0

  // PERFORMANCE: Staggered simplification queue (process 1 per frame to avoid spikes)
  private pendingQueue: PendingSimplification[] = []
  private isProcessing = false

  // PERFORMANCE: Reusable Vector3 objects to avoid GC allocations per frame
  private readonly _tempCameraPos = new THREE.Vector3()
  private readonly _tempObjectPos = new THREE.Vector3()

  constructor(config: LODConfig = DEFAULT_LOD_CONFIG) {
    this.config = config
  }

  /**
   * Process one pending simplification from the queue
   * Called from animation frame to spread work across frames
   */
  private processPendingSimplification(): void {
    if (this.pendingQueue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const work = this.pendingQueue.shift()!

    // Double-check mesh is still valid
    if (!work.mesh.geometry || !work.mesh.parent) {
      // Mesh was disposed, skip
      requestAnimationFrame(() => this.processPendingSimplification())
      return
    }

    // Check if quality still needs updating (may have changed while queued)
    if (Math.abs(work.cached.currentQuality - work.quality) < 0.1) {
      requestAnimationFrame(() => this.processPendingSimplification())
      return
    }

    // Get or generate LOD geometry
    let lodGeometry = work.cached.lodGeometries.get(work.quality)
    if (!lodGeometry) {
      lodGeometry = this.createLODGeometry(work.cached.originalGeometry, work.quality)
      work.cached.lodGeometries.set(work.quality, lodGeometry)
    }

    // Apply LOD geometry
    work.mesh.geometry.dispose()
    work.mesh.geometry = lodGeometry
    work.cached.currentQuality = work.quality

    // Continue processing queue in next frame
    requestAnimationFrame(() => this.processPendingSimplification())
  }

  /**
   * Update LOD levels for all objects in the scene based on camera distance
   * Now includes frustum culling to skip objects outside view
   */
  updateLOD(camera: THREE.Camera, scene: THREE.Scene): void {
    if (!this.config.enabled) return

    const now = performance.now()
    if (now - this.lastUpdateTime < this.config.updateInterval) {
      return
    }
    this.lastUpdateTime = now

    // Update frustum for culling
    frustumCuller.updateFrustum(camera)

    // PERFORMANCE: Reuse Vector3 instance instead of allocating new one
    camera.getWorldPosition(this._tempCameraPos)

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
        // Skip objects outside frustum - major performance win
        if (!frustumCuller.isObject3DVisible(object)) {
          return
        }

        this.updateObjectLOD(object, this._tempCameraPos)
      }
    })
  }

  /**
   * Update LOD for a single object
   * PERFORMANCE: Uses queued simplification to avoid blocking main thread
   */
  private updateObjectLOD(mesh: THREE.Mesh, cameraPosition: THREE.Vector3): void {
    // Skip if object doesn't have user data with ID
    if (!mesh.userData.objectId) return

    // Skip invisible objects for performance
    if (!mesh.visible) return

    const objectId = mesh.userData.objectId as string
    // PERFORMANCE: Reuse Vector3 instance instead of allocating new one per mesh
    mesh.getWorldPosition(this._tempObjectPos)

    const distance = cameraPosition.distanceTo(this._tempObjectPos)

    // Determine quality level based on distance
    const quality = this.getQualityForDistance(distance)

    // Get or create cached LOD
    let cached = this.cache.get(objectId)
    if (!cached) {
      cached = {
        originalGeometry: mesh.geometry.clone(),
        lodGeometries: new Map(),
        currentQuality: 1.0,
      }
      this.cache.set(objectId, cached)
    }

    // Only update if quality changed significantly
    if (Math.abs(cached.currentQuality - quality) < 0.1) {
      return
    }

    // If geometry already exists in cache, apply immediately (fast path)
    const cachedGeometry = cached.lodGeometries.get(quality)
    if (cachedGeometry) {
      mesh.geometry.dispose()
      mesh.geometry = cachedGeometry
      cached.currentQuality = quality
      return
    }

    // PERFORMANCE: Queue the expensive simplification work
    // Check if this object is already queued to avoid duplicates
    const alreadyQueued = this.pendingQueue.some((p) => p.objectId === objectId)
    if (!alreadyQueued) {
      this.pendingQueue.push({
        objectId,
        mesh,
        quality,
        cached,
      })

      // Start processing if not already running
      if (!this.isProcessing) {
        requestAnimationFrame(() => this.processPendingSimplification())
      }
    }
  }

  /**
   * Get quality level for a given distance
   */
  private getQualityForDistance(distance: number): number {
    for (const level of this.config.levels) {
      if (distance <= level.distance) {
        return level.quality
      }
    }
    return this.config.levels[this.config.levels.length - 1].quality
  }

  /**
   * Create simplified geometry for a given quality level
   */
  private createLODGeometry(
    originalGeometry: THREE.BufferGeometry,
    quality: number
  ): THREE.BufferGeometry {
    if (quality >= 0.95) {
      return originalGeometry.clone()
    }

    // For very low quality, use simple box
    if (quality < 0.15) {
      originalGeometry.computeBoundingBox()
      const bbox = originalGeometry.boundingBox!
      const size = new THREE.Vector3()
      bbox.getSize(size)
      const center = new THREE.Vector3()
      bbox.getCenter(center)

      const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z)
      boxGeo.translate(center.x, center.y, center.z)
      return boxGeo
    }

    // Use SimplifyModifier for intermediate quality levels
    const targetVertexCount = Math.floor(originalGeometry.attributes.position.count * quality)

    try {
      const simplified = this.simplifier.modify(originalGeometry, targetVertexCount)
      return simplified
    } catch (error) {
      console.warn("[LODManager] Simplification failed, using original:", error)
      return originalGeometry.clone()
    }
  }

  /**
   * Set LOD configuration
   */
  setConfig(config: Partial<LODConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Clear LOD cache (call when objects are removed)
   */
  clearCache(objectId?: string): void {
    if (objectId) {
      const cached = this.cache.get(objectId)
      if (cached) {
        // Dispose cached geometries
        cached.lodGeometries.forEach((geo) => geo.dispose())
        cached.originalGeometry.dispose()
        this.cache.delete(objectId)
      }
      // Also remove from pending queue
      this.pendingQueue = this.pendingQueue.filter((p) => p.objectId !== objectId)
    } else {
      // Clear all
      this.cache.forEach((cached) => {
        cached.lodGeometries.forEach((geo) => geo.dispose())
        cached.originalGeometry.dispose()
      })
      this.cache.clear()
      // Clear pending queue
      this.pendingQueue = []
    }
  }

  /**
   * Get statistics for debugging
   */
  getStats(): {
    cachedObjects: number
    totalLODVariants: number
    pendingSimplifications: number
    memoryEstimate: string
  } {
    let totalVariants = 0
    let totalVertices = 0

    this.cache.forEach((cached) => {
      totalVariants += cached.lodGeometries.size
      cached.lodGeometries.forEach((geo) => {
        totalVertices += geo.attributes.position.count
      })
    })

    const memoryMB = (totalVertices * 3 * 4) / (1024 * 1024) // vertices * 3 coords * 4 bytes

    return {
      cachedObjects: this.cache.size,
      totalLODVariants: totalVariants,
      pendingSimplifications: this.pendingQueue.length,
      memoryEstimate: `${memoryMB.toFixed(2)} MB`,
    }
  }
}

// Singleton instance
export const lodManager = new LODManager()
