/**
 * BoxFactory - CADHY
 *
 * Factory for creating box primitives with interactive preview.
 * Inspired by Plasticity's BoxFactory.
 *
 * Supports:
 * - Corner mode (diagonal corners)
 * - Center mode (center point + dimensions)
 * - Real-time preview mesh
 * - Parameter updates
 */

import * as THREE from "three"
import { createBox } from "@/services/cad-service"

// ============================================================================
// TYPES
// ============================================================================

export interface BoxParams {
  /** First corner point */
  p1: THREE.Vector3
  /** Second corner point (diagonal) */
  p2: THREE.Vector3
  /** Third point for height */
  p3: THREE.Vector3
}

export interface BoxDimensions {
  width: number
  length: number
  height: number
}

// ============================================================================
// BOX FACTORY
// ============================================================================

export class BoxFactory {
  // Points
  private _p1: THREE.Vector3 | null = null
  private _p2: THREE.Vector3 | null = null
  private _p3: THREE.Vector3 | null = null

  // Dimensions (can be set explicitly)
  private _width: number | null = null
  private _length: number | null = null
  private _height: number | null = null

  // Preview mesh
  private previewMesh: THREE.Mesh | null = null
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.createPreviewMesh()
  }

  // ==========================================================================
  // POINT SETTERS/GETTERS
  // ==========================================================================

  set p1(point: THREE.Vector3) {
    this._p1 = point.clone()
  }

  get p1(): THREE.Vector3 {
    return this._p1 || new THREE.Vector3()
  }

  set p2(point: THREE.Vector3) {
    this._p2 = point.clone()
  }

  get p2(): THREE.Vector3 {
    return this._p2 || new THREE.Vector3()
  }

  set p3(point: THREE.Vector3) {
    this._p3 = point.clone()
  }

  get p3(): THREE.Vector3 {
    return this._p3 || new THREE.Vector3()
  }

  // ==========================================================================
  // DIMENSION SETTERS/GETTERS
  // ==========================================================================

  set width(value: number) {
    this._width = value
    this.update()
  }

  get width(): number {
    if (this._width !== null) return this._width
    if (this._p1 && this._p2) {
      return Math.abs(this._p2.x - this._p1.x)
    }
    return 1
  }

  set length(value: number) {
    this._length = value
    this.update()
  }

  get length(): number {
    if (this._length !== null) return this._length
    if (this._p1 && this._p2) {
      return Math.abs(this._p2.y - this._p1.y)
    }
    return 1
  }

  set height(value: number) {
    this._height = value
    this.update()
  }

  get height(): number {
    if (this._height !== null) return this._height
    if (this._p3 && this._p2) {
      return Math.abs(this._p3.z - this._p2.z)
    }
    return 1
  }

  // ==========================================================================
  // PREVIEW MESH
  // ==========================================================================

  private createPreviewMesh() {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.3,
      wireframe: false,
      side: THREE.DoubleSide,
    })
    this.previewMesh = new THREE.Mesh(geometry, material)
    this.previewMesh.visible = false
  }

  /**
   * Update preview mesh based on current parameters
   */
  update() {
    if (!this.previewMesh) return

    const { p1, p2, p3 } = this

    if (p1 && p2) {
      // Calculate center and dimensions
      const center = new THREE.Vector3()
      center.x = (p1.x + p2.x) / 2
      center.y = (p1.y + p2.y) / 2
      center.z = p1.z + this.height / 2

      this.previewMesh.position.copy(center)
      this.previewMesh.scale.set(this.width, this.length, this.height)

      // Show preview
      if (!this.previewMesh.visible) {
        this.scene.add(this.previewMesh)
        this.previewMesh.visible = true
      }
    }
  }

  /**
   * Hide and remove preview mesh
   */
  hidePreview() {
    if (this.previewMesh) {
      this.previewMesh.visible = false
      this.scene.remove(this.previewMesh)
    }
  }

  // ==========================================================================
  // COMMIT
  // ==========================================================================

  /**
   * Create the final box shape
   * Returns the shape ID from the backend
   */
  async commit(): Promise<string | null> {
    try {
      const result = await createBox(this.width, this.length, this.height)
      this.hidePreview()
      return result.id
    } catch (error) {
      console.error("[BoxFactory] Failed to create box:", error)
      throw error
    }
  }

  /**
   * Cancel and cleanup
   */
  cancel() {
    this.hidePreview()
  }

  /**
   * Dispose resources
   */
  dispose() {
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh)
      this.previewMesh.geometry.dispose()
      ;(this.previewMesh.material as THREE.Material).dispose()
      this.previewMesh = null
    }
  }
}

export default BoxFactory
