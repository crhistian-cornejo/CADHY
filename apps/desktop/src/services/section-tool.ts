/**
 * Section/Clipping Planes Tool
 *
 * Allows cutting through 3D models to see interior details.
 * Essential for hydraulic structure analysis (see flow paths, wall thickness, etc.)
 */

import * as THREE from "three"

export type SectionOrientation = "xy" | "xz" | "yz" | "custom"

export interface SectionPlaneConfig {
  orientation: SectionOrientation
  position: number
  normal?: THREE.Vector3
  enabled: boolean
  showHelper: boolean
}

export class SectionTool {
  private planes: Map<string, THREE.Plane> = new Map()
  private helpers: Map<string, THREE.PlaneHelper> = new Map()
  private scene: THREE.Scene | null = null

  constructor() {}

  /**
   * Initialize with scene reference
   */
  init(scene: THREE.Scene): void {
    this.scene = scene
  }

  /**
   * Create or update a section plane
   */
  createSection(id: string, config: SectionPlaneConfig): THREE.Plane {
    let plane = this.planes.get(id)

    if (!plane) {
      plane = new THREE.Plane()
      this.planes.set(id, plane)
    }

    // Set plane based on orientation
    switch (config.orientation) {
      case "xy":
        plane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, config.position)
        )
        break
      case "xz":
        plane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, config.position, 0)
        )
        break
      case "yz":
        plane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(config.position, 0, 0)
        )
        break
      case "custom":
        if (config.normal) {
          plane.setFromNormalAndCoplanarPoint(
            config.normal.normalize(),
            config.normal.clone().multiplyScalar(config.position)
          )
        }
        break
    }

    // Apply to scene materials
    this.applyToScene(config.enabled)

    // Update helper
    if (config.showHelper) {
      this.showHelper(id, plane)
    } else {
      this.hideHelper(id)
    }

    return plane
  }

  /**
   * Apply clipping planes to all materials in scene
   */
  private applyToScene(enabled: boolean): void {
    if (!this.scene) return

    const clippingPlanes = enabled ? Array.from(this.planes.values()) : []

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material]

        materials.forEach((material) => {
          if (material instanceof THREE.Material) {
            material.clippingPlanes = clippingPlanes
            material.clipShadows = true
            material.needsUpdate = true
          }
        })
      }
    })
  }

  /**
   * Show visual helper for a plane
   */
  private showHelper(id: string, plane: THREE.Plane): void {
    if (!this.scene) return

    let helper = this.helpers.get(id)

    if (!helper) {
      helper = new THREE.PlaneHelper(plane, 10, 0xff0000)
      this.helpers.set(id, helper)
      this.scene.add(helper)
    } else {
      // Update existing helper
      helper.plane = plane
    }

    helper.visible = true
  }

  /**
   * Hide visual helper
   */
  private hideHelper(id: string): void {
    const helper = this.helpers.get(id)
    if (helper) {
      helper.visible = false
    }
  }

  /**
   * Remove a section plane
   */
  removeSection(id: string): void {
    this.planes.delete(id)

    const helper = this.helpers.get(id)
    if (helper && this.scene) {
      this.scene.remove(helper)
      this.helpers.delete(id)
    }

    this.applyToScene(this.planes.size > 0)
  }

  /**
   * Remove all sections
   */
  clearAll(): void {
    this.planes.clear()

    this.helpers.forEach((helper) => {
      if (this.scene) {
        this.scene.remove(helper)
      }
    })
    this.helpers.clear()

    this.applyToScene(false)
  }

  /**
   * Get active planes
   */
  getPlanes(): THREE.Plane[] {
    return Array.from(this.planes.values())
  }

  /**
   * Enable/disable clipping globally
   */
  setEnabled(enabled: boolean): void {
    this.applyToScene(enabled)
  }
}

// Singleton instance
export const sectionTool = new SectionTool()
