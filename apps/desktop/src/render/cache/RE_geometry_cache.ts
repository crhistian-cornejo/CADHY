/**
 * @fileoverview Geometry Cache - High-performance caching for tessellated meshes
 * @module render/cache
 *
 * Provides a LRU cache for tessellated geometry to avoid expensive
 * re-tessellation calls to the C++ backend.
 *
 * Features:
 * - LRU eviction policy
 * - Memory size tracking
 * - Automatic invalidation on shape changes
 * - Multi-level caching (different deflection levels)
 * - Statistics for monitoring
 */

import type { MeshData } from "@cadhy/types"

// ============================================================================
// TYPES
// ============================================================================

/**
 * Cache key combining shape ID and tessellation parameters
 */
export interface GeometryCacheKey {
  shapeId: string
  deflection: number
  angle?: number
}

/**
 * Cached geometry entry
 */
export interface GeometryCacheEntry {
  mesh: MeshData
  createdAt: number
  lastAccessedAt: number
  accessCount: number
  /** Approximate memory size in bytes */
  memorySize: number
  /** Version of the shape when cached */
  shapeVersion: number
}

/**
 * Cache statistics
 */
export interface GeometryCacheStats {
  /** Total entries in cache */
  entryCount: number
  /** Total memory usage in bytes */
  memoryUsage: number
  /** Cache hit count */
  hits: number
  /** Cache miss count */
  misses: number
  /** Hit rate (0-1) */
  hitRate: number
  /** Eviction count */
  evictions: number
  /** Average access count per entry */
  avgAccessCount: number
}

/**
 * Cache configuration
 */
export interface GeometryCacheConfig {
  /** Maximum number of entries */
  maxEntries: number
  /** Maximum memory usage in bytes (default 500MB) */
  maxMemoryBytes: number
  /** Time-to-live in milliseconds (0 = no expiry) */
  ttlMs: number
  /** Enable automatic cleanup */
  autoCleanup: boolean
  /** Cleanup interval in ms */
  cleanupIntervalMs: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a cache key string from key object
 */
function createKeyString(key: GeometryCacheKey): string {
  return `${key.shapeId}:${key.deflection}:${key.angle ?? 0}`
}

/**
 * Estimate memory size of mesh data in bytes
 */
function estimateMeshMemory(mesh: MeshData): number {
  // Float32 = 4 bytes per value
  const vertexBytes = mesh.vertices.length * 4
  const indexBytes = mesh.indices.length * 4
  const normalBytes = (mesh.normals?.length ?? 0) * 4

  // Add overhead for object structure (~100 bytes)
  return vertexBytes + indexBytes + normalBytes + 100
}

// ============================================================================
// GEOMETRY CACHE CLASS
// ============================================================================

export class GeometryCache {
  private cache: Map<string, GeometryCacheEntry> = new Map()
  private shapeVersions: Map<string, number> = new Map()
  private config: GeometryCacheConfig
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  }
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private totalMemory = 0

  constructor(config?: Partial<GeometryCacheConfig>) {
    this.config = {
      maxEntries: 1000,
      maxMemoryBytes: 500 * 1024 * 1024, // 500MB
      ttlMs: 0, // No expiry by default
      autoCleanup: true,
      cleanupIntervalMs: 60000, // 1 minute
      ...config,
    }

    if (this.config.autoCleanup) {
      this.startCleanupTimer()
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get cached geometry if available
   */
  get(key: GeometryCacheKey): MeshData | null {
    const keyStr = createKeyString(key)
    const entry = this.cache.get(keyStr)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if shape version matches
    const currentVersion = this.shapeVersions.get(key.shapeId) ?? 0
    if (entry.shapeVersion !== currentVersion) {
      this.delete(key)
      this.stats.misses++
      return null
    }

    // Check TTL
    if (this.config.ttlMs > 0) {
      const age = Date.now() - entry.createdAt
      if (age > this.config.ttlMs) {
        this.delete(key)
        this.stats.misses++
        return null
      }
    }

    // Update access info
    entry.lastAccessedAt = Date.now()
    entry.accessCount++
    this.stats.hits++

    return entry.mesh
  }

  /**
   * Store geometry in cache
   */
  set(key: GeometryCacheKey, mesh: MeshData): void {
    const keyStr = createKeyString(key)
    const memorySize = estimateMeshMemory(mesh)

    // Check if we need to evict
    while (this.shouldEvict(memorySize)) {
      this.evictLRU()
    }

    const entry: GeometryCacheEntry = {
      mesh,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      memorySize,
      shapeVersion: this.shapeVersions.get(key.shapeId) ?? 0,
    }

    // Remove old entry if exists
    const oldEntry = this.cache.get(keyStr)
    if (oldEntry) {
      this.totalMemory -= oldEntry.memorySize
    }

    this.cache.set(keyStr, entry)
    this.totalMemory += memorySize
  }

  /**
   * Delete specific entry
   */
  delete(key: GeometryCacheKey): boolean {
    const keyStr = createKeyString(key)
    const entry = this.cache.get(keyStr)

    if (entry) {
      this.totalMemory -= entry.memorySize
      return this.cache.delete(keyStr)
    }

    return false
  }

  /**
   * Check if key exists and is valid
   */
  has(key: GeometryCacheKey): boolean {
    const keyStr = createKeyString(key)
    const entry = this.cache.get(keyStr)

    if (!entry) return false

    // Check version
    const currentVersion = this.shapeVersions.get(key.shapeId) ?? 0
    if (entry.shapeVersion !== currentVersion) {
      return false
    }

    // Check TTL
    if (this.config.ttlMs > 0) {
      const age = Date.now() - entry.createdAt
      if (age > this.config.ttlMs) {
        return false
      }
    }

    return true
  }

  /**
   * Invalidate all cache entries for a shape
   */
  invalidateShape(shapeId: string): void {
    const currentVersion = this.shapeVersions.get(shapeId) ?? 0
    this.shapeVersions.set(shapeId, currentVersion + 1)

    // Optionally delete entries immediately
    for (const [keyStr, entry] of this.cache.entries()) {
      if (keyStr.startsWith(shapeId + ":")) {
        this.totalMemory -= entry.memorySize
        this.cache.delete(keyStr)
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.totalMemory = 0
    this.stats.hits = 0
    this.stats.misses = 0
    this.stats.evictions = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): GeometryCacheStats {
    const total = this.stats.hits + this.stats.misses

    let totalAccessCount = 0
    for (const entry of this.cache.values()) {
      totalAccessCount += entry.accessCount
    }

    return {
      entryCount: this.cache.size,
      memoryUsage: this.totalMemory,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      evictions: this.stats.evictions,
      avgAccessCount: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.stopCleanupTimer()
    this.clear()
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private shouldEvict(newEntrySize: number): boolean {
    // Check entry count
    if (this.cache.size >= this.config.maxEntries) {
      return true
    }

    // Check memory
    if (this.totalMemory + newEntrySize > this.config.maxMemoryBytes) {
      return true
    }

    return false
  }

  private evictLRU(): void {
    if (this.cache.size === 0) return

    // Find least recently used entry
    let lruKey: string | null = null
    let lruTime = Number.POSITIVE_INFINITY

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt
        lruKey = key
      }
    }

    if (lruKey) {
      const entry = this.cache.get(lruKey)
      if (entry) {
        this.totalMemory -= entry.memorySize
      }
      this.cache.delete(lruKey)
      this.stats.evictions++
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupIntervalMs)
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      // Check TTL
      if (this.config.ttlMs > 0) {
        const age = now - entry.createdAt
        if (age > this.config.ttlMs) {
          toDelete.push(key)
        }
      }
    }

    for (const key of toDelete) {
      const entry = this.cache.get(key)
      if (entry) {
        this.totalMemory -= entry.memorySize
      }
      this.cache.delete(key)
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const geometryCache = new GeometryCache()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get or compute geometry with caching
 */
export async function getOrComputeGeometry(
  key: GeometryCacheKey,
  compute: () => Promise<MeshData>
): Promise<MeshData> {
  // Try cache first
  const cached = geometryCache.get(key)
  if (cached) {
    return cached
  }

  // Compute and cache
  const mesh = await compute()
  geometryCache.set(key, mesh)
  return mesh
}

/**
 * Prefetch geometry into cache
 */
export async function prefetchGeometry(
  keys: GeometryCacheKey[],
  compute: (key: GeometryCacheKey) => Promise<MeshData>
): Promise<void> {
  const toFetch = keys.filter((k) => !geometryCache.has(k))

  await Promise.all(
    toFetch.map(async (key) => {
      try {
        const mesh = await compute(key)
        geometryCache.set(key, mesh)
      } catch (error) {
        console.warn(`[GeometryCache] Failed to prefetch ${key.shapeId}:`, error)
      }
    })
  )
}
