/**
 * BVH (Bounding Volume Hierarchy) Setup
 *
 * Configures three-mesh-bvh for 10-100x faster raycasting performance.
 * This is critical for selection/picking in complex CAD models.
 *
 * @see https://github.com/gkjohnson/three-mesh-bvh
 */

import * as THREE from "three"
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh"

// Extend Three.js prototypes with BVH methods (run once at app startup)
let bvhInitialized = false

export function initializeBVH() {
  if (bvhInitialized) return

  // Extend BufferGeometry with BVH computation
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree

  // Extend Mesh with accelerated raycasting
  THREE.Mesh.prototype.raycast = acceleratedRaycast

  bvhInitialized = true
  console.log("[BVH] Initialized three-mesh-bvh for accelerated raycasting")
}

/**
 * Compute BVH for a geometry if not already computed
 */
export function ensureBVH(geometry: THREE.BufferGeometry) {
  if (!geometry.boundsTree && geometry.attributes.position) {
    geometry.computeBoundsTree()
  }
}

/**
 * Dispose BVH when geometry is no longer needed
 */
export function disposeBVH(geometry: THREE.BufferGeometry) {
  if (geometry.boundsTree) {
    geometry.disposeBoundsTree()
  }
}
