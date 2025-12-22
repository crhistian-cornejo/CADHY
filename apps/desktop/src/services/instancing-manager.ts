/**
 * Geometry Instancing Manager
 *
 * Optimizes rendering of repeated objects (baffle blocks, chute blocks, etc.)
 * by using GPU instancing instead of individual meshes.
 *
 * Performance benefits:
 * - 10-20x improvement for repeated structures
 * - Reduces draw calls from N to 1
 * - Lower CPU overhead
 * - Better memory usage
 */

import * as THREE from "three"

export interface InstanceData {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  color?: THREE.Color
}

export class InstancedMeshManager {
  private instancedMeshes = new Map<string, THREE.InstancedMesh>()
  private instanceCounts = new Map<string, number>()

  /**
   * Create or update an instanced mesh for repeated geometry
   *
   * @param key - Unique identifier for this instance group
   * @param geometry - The geometry to instance
   * @param material - The material to use
   * @param instances - Array of instance transformations
   * @returns The instanced mesh
   */
  createInstancedMesh(
    key: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    instances: InstanceData[]
  ): THREE.InstancedMesh {
    const count = instances.length

    // Get or create instanced mesh
    let instancedMesh = this.instancedMeshes.get(key)

    if (!instancedMesh || this.instanceCounts.get(key) !== count) {
      // Dispose old mesh if count changed
      if (instancedMesh) {
        instancedMesh.dispose()
      }

      // Create new instanced mesh
      instancedMesh = new THREE.InstancedMesh(geometry, material, count)
      instancedMesh.name = `Instanced_${key}`
      instancedMesh.castShadow = true
      instancedMesh.receiveShadow = true

      this.instancedMeshes.set(key, instancedMesh)
      this.instanceCounts.set(key, count)
    }

    // Update instance transformations
    const matrix = new THREE.Matrix4()
    const _color = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const instance = instances[i]

      // Create transformation matrix
      matrix.compose(
        instance.position,
        new THREE.Quaternion().setFromEuler(instance.rotation),
        instance.scale
      )

      instancedMesh.setMatrixAt(i, matrix)

      // Set color if provided
      if (instance.color) {
        instancedMesh.setColorAt(i, instance.color)
      }
    }

    // Mark instance matrix as needing update
    instancedMesh.instanceMatrix.needsUpdate = true
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true
    }

    return instancedMesh
  }

  /**
   * Get an existing instanced mesh
   */
  getInstancedMesh(key: string): THREE.InstancedMesh | undefined {
    return this.instancedMeshes.get(key)
  }

  /**
   * Remove and dispose an instanced mesh
   */
  removeInstancedMesh(key: string): void {
    const mesh = this.instancedMeshes.get(key)
    if (mesh) {
      mesh.dispose()
      this.instancedMeshes.delete(key)
      this.instanceCounts.delete(key)
    }
  }

  /**
   * Dispose all instanced meshes
   */
  dispose(): void {
    this.instancedMeshes.forEach((mesh) => {
      mesh.dispose()
    })
    this.instancedMeshes.clear()
    this.instanceCounts.clear()
  }

  /**
   * Get statistics
   */
  getStats(): {
    instancedMeshCount: number
    totalInstances: number
    memorySaved: string
  } {
    let totalInstances = 0
    this.instanceCounts.forEach((count) => {
      totalInstances += count
    })

    // Estimate memory saved (compared to individual meshes)
    // Each mesh has overhead of ~1KB, instances only need 16 floats (64 bytes) each
    const savedBytes = totalInstances * (1024 - 64)
    const savedMB = savedBytes / (1024 * 1024)

    return {
      instancedMeshCount: this.instancedMeshes.size,
      totalInstances,
      memorySaved: `${savedMB.toFixed(2)} MB`,
    }
  }
}

/**
 * Helper: Create baffle block instances for stilling basin
 */
export function createBaffleBlockInstances(
  spacing: number,
  width: number,
  length: number,
  blockWidth: number,
  blockHeight: number,
  rows: number,
  cols: number
): InstanceData[] {
  const instances: InstanceData[] = []

  const startX = -length / 2 + spacing
  const startZ = -width / 2 + spacing

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * spacing
      const z = startZ + row * spacing

      instances.push({
        position: new THREE.Vector3(x, blockHeight / 2, z),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(blockWidth, blockHeight, blockWidth),
      })
    }
  }

  return instances
}

/**
 * Helper: Create chute block instances for stepped chute
 */
export function createChuteBlockInstances(
  stepCount: number,
  stepLength: number,
  stepHeight: number,
  blockWidth: number,
  blockHeight: number,
  blocksPerStep: number
): InstanceData[] {
  const instances: InstanceData[] = []

  for (let step = 0; step < stepCount; step++) {
    const stepX = step * stepLength
    const stepY = -step * stepHeight

    for (let block = 0; block < blocksPerStep; block++) {
      const blockZ = (-blockWidth * blocksPerStep) / 2 + block * blockWidth

      instances.push({
        position: new THREE.Vector3(stepX + stepLength / 2, stepY + blockHeight / 2, blockZ),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(blockWidth, blockHeight, blockWidth),
      })
    }
  }

  return instances
}

/**
 * Helper: Create end sill blocks
 */
export function createEndSillInstances(
  width: number,
  sillHeight: number,
  sillThickness: number,
  blockCount: number
): InstanceData[] {
  const instances: InstanceData[] = []
  const blockWidth = width / blockCount

  for (let i = 0; i < blockCount; i++) {
    const z = -width / 2 + i * blockWidth + blockWidth / 2

    instances.push({
      position: new THREE.Vector3(0, sillHeight / 2, z),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(sillThickness, sillHeight, blockWidth),
    })
  }

  return instances
}

// Singleton instance
export const instancingManager = new InstancedMeshManager()
