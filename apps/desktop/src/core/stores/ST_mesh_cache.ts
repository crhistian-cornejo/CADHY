/**
 * Mesh Cache - Immutable mesh data storage
 *
 * This cache stores mesh data (Float32Array, Uint32Array) separately from objects.
 * History entries only store object metadata + mesh references, not actual mesh data.
 *
 * Benefits:
 * - structuredClone on history entries is fast (no TypedArrays)
 * - Memory efficient (mesh data stored once, not 50 times per history)
 * - Mesh data is immutable once cached
 *
 * Architecture:
 * - Key: objectId (stable across history)
 * - Value: MeshData with TypedArrays
 * - On undo/redo: restore object metadata + re-link mesh from cache
 */

import type { MeshData } from "@cadhy/types"

// Singleton mesh cache
const meshCache = new Map<string, MeshData>()

/**
 * Store mesh data for an object (immutable once stored)
 */
export function cacheMesh(objectId: string, mesh: MeshData): void {
  // Store a reference - mesh data should not be mutated after creation
  meshCache.set(objectId, mesh)
}

/**
 * Get cached mesh data for an object
 */
export function getCachedMesh(objectId: string): MeshData | undefined {
  return meshCache.get(objectId)
}

/**
 * Check if mesh is cached for an object
 */
export function hasCachedMesh(objectId: string): boolean {
  return meshCache.has(objectId)
}

/**
 * Remove mesh from cache (when object is permanently deleted)
 */
export function removeCachedMesh(objectId: string): void {
  meshCache.delete(objectId)
}

/**
 * Clear all cached meshes (on project close)
 */
export function clearMeshCache(): void {
  meshCache.clear()
}

/**
 * Get cache stats for debugging
 */
export function getMeshCacheStats(): { count: number; memoryEstimate: number } {
  let memoryEstimate = 0
  for (const mesh of meshCache.values()) {
    if (mesh.vertices) memoryEstimate += mesh.vertices.byteLength
    if (mesh.normals) memoryEstimate += mesh.normals.byteLength
    if (mesh.indices) memoryEstimate += mesh.indices.byteLength
  }
  return {
    count: meshCache.size,
    memoryEstimate,
  }
}

/**
 * Strip mesh data from objects for history storage
 * Returns lightweight objects without TypedArrays
 */
export function stripMeshForHistory<T extends { id: string; mesh?: MeshData }>(objects: T[]): T[] {
  return objects.map((obj) => {
    if (obj.mesh) {
      // Cache the mesh before stripping
      cacheMesh(obj.id, obj.mesh)
      // Return object without mesh (or with a placeholder)
      const { mesh: _, ...rest } = obj
      return { ...rest, mesh: undefined } as T
    }
    return obj
  })
}

/**
 * Restore mesh data from cache to objects after history restore
 */
export function restoreMeshFromCache<T extends { id: string; mesh?: MeshData }>(objects: T[]): T[] {
  return objects.map((obj) => {
    const cachedMesh = getCachedMesh(obj.id)
    if (cachedMesh) {
      return { ...obj, mesh: cachedMesh }
    }
    return obj
  })
}
