/**
 * PointPicker - CADHY
 *
 * Interactive point picking system inspired by Plasticity.
 * Captures 3D points from viewport clicks with raycasting and snapping.
 *
 * Features:
 * - Raycasting to find 3D coordinates
 * - Grid snapping
 * - Object snapping (faces, edges, vertices)
 * - Visual feedback (cursor, snap points)
 * - Async/Promise-based API
 */

import * as THREE from "three"

// ============================================================================
// TYPES
// ============================================================================

export interface PointResult {
  /** 3D point coordinates */
  point: THREE.Vector3
  /** Additional picking information */
  info: PointInfo
}

export interface PointInfo {
  /** Normal vector at picked point (if on surface) */
  normal?: THREE.Vector3
  /** Snapped to grid? */
  snappedToGrid: boolean
  /** Snapped to object? */
  snappedToObject: boolean
  /** Object that was clicked (if any) */
  object?: THREE.Object3D
  /** Face index (if clicked on mesh) */
  faceIndex?: number
  /** UV coordinates (if on surface) */
  uv?: THREE.Vector2
}

export interface PointPickerOptions {
  /** Camera for raycasting */
  camera: THREE.Camera
  /** Scene to raycast against */
  scene: THREE.Scene
  /** DOM element for mouse events */
  domElement: HTMLElement
  /** Enable grid snapping */
  gridSnap?: boolean
  /** Grid size for snapping */
  gridSize?: number
  /** Enable object snapping */
  objectSnap?: boolean
  /** Maximum snap distance in pixels */
  snapDistance?: number
}

export type PickUpdateCallback = (partial: Partial<PointResult>) => void

// ============================================================================
// POINT PICKER
// ============================================================================

export class PointPicker {
  private camera: THREE.Camera
  private scene: THREE.Scene
  private domElement: HTMLElement
  private raycaster: THREE.Raycaster

  // Options
  private gridSnap: boolean
  private gridSize: number
  private objectSnap: boolean
  private snapDistance: number

  // State
  private isActive = false
  private resolvePromise: ((result: PointResult) => void) | null = null
  private updateCallback: PickUpdateCallback | null = null
  private abortController: AbortController | null = null

  // Helpers
  private gridHelper: THREE.GridHelper | null = null
  private cursorSphere: THREE.Mesh | null = null

  constructor(options: PointPickerOptions) {
    this.camera = options.camera
    this.scene = options.scene
    this.domElement = options.domElement
    this.raycaster = new THREE.Raycaster()

    this.gridSnap = options.gridSnap ?? true
    this.gridSize = options.gridSize ?? 1
    this.objectSnap = options.objectSnap ?? true
    this.snapDistance = options.snapDistance ?? 10

    this.setupHelpers()
  }

  private setupHelpers() {
    // Create cursor sphere for visual feedback
    const cursorGeometry = new THREE.SphereGeometry(0.05, 16, 16)
    const cursorMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
    })
    this.cursorSphere = new THREE.Mesh(cursorGeometry, cursorMaterial)
    this.cursorSphere.visible = false
  }

  /**
   * Execute point picking
   * Returns a promise that resolves when user clicks
   */
  execute(updateCallback?: PickUpdateCallback): Promise<PointResult> {
    return new Promise((resolve) => {
      this.isActive = true
      this.resolvePromise = resolve
      this.updateCallback = updateCallback || null
      this.abortController = new AbortController()

      // Show cursor
      if (this.cursorSphere && !this.scene.children.includes(this.cursorSphere)) {
        this.scene.add(this.cursorSphere)
      }
      if (this.cursorSphere) {
        this.cursorSphere.visible = true
      }

      // Add event listeners
      const { signal } = this.abortController
      this.domElement.addEventListener("mousemove", this.onMouseMove, { signal })
      this.domElement.addEventListener("click", this.onClick, { signal })
      this.domElement.addEventListener("contextmenu", this.onCancel, { signal })

      // Change cursor style
      this.domElement.style.cursor = "crosshair"
    })
  }

  /**
   * Cancel current picking operation
   */
  cancel() {
    this.cleanup()
    // Reject or resolve with null point
    if (this.resolvePromise) {
      this.resolvePromise({
        point: new THREE.Vector3(),
        info: {
          snappedToGrid: false,
          snappedToObject: false,
        },
      })
      this.resolvePromise = null
    }
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isActive) return

    const point = this.getPointFromMouse(event)
    if (point && this.cursorSphere) {
      this.cursorSphere.position.copy(point.point)
    }

    // Call update callback if provided
    if (this.updateCallback && point) {
      this.updateCallback(point)
    }
  }

  private onClick = (event: MouseEvent) => {
    if (!this.isActive) return

    const result = this.getPointFromMouse(event)
    if (result && this.resolvePromise) {
      this.resolvePromise(result)
      this.cleanup()
    }
  }

  private onCancel = (event: Event) => {
    event.preventDefault()
    this.cancel()
  }

  private getPointFromMouse(event: MouseEvent): PointResult | null {
    // Get normalized device coordinates
    const rect = this.domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Raycast
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera)
    const intersects = this.raycaster.intersectObjects(this.scene.children, true)

    let point: THREE.Vector3
    const info: PointInfo = {
      snappedToGrid: false,
      snappedToObject: false,
    }

    if (intersects.length > 0) {
      // Found intersection with object
      const intersect = intersects[0]
      point = intersect.point.clone()

      info.snappedToObject = true
      info.object = intersect.object
      info.normal = intersect.face?.normal.clone()
      info.faceIndex = intersect.faceIndex
      info.uv = intersect.uv

      // Apply grid snap if enabled
      if (this.gridSnap) {
        point = this.snapToGrid(point)
        info.snappedToGrid = true
      }
    } else {
      // No object intersection, project onto ground plane (z=0)
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
      const intersectPoint = new THREE.Vector3()
      this.raycaster.ray.intersectPlane(groundPlane, intersectPoint)

      if (intersectPoint) {
        point = intersectPoint

        // Apply grid snap
        if (this.gridSnap) {
          point = this.snapToGrid(point)
          info.snappedToGrid = true
        }
      } else {
        return null
      }
    }

    return { point, info }
  }

  private snapToGrid(point: THREE.Vector3): THREE.Vector3 {
    const snapped = point.clone()
    snapped.x = Math.round(snapped.x / this.gridSize) * this.gridSize
    snapped.y = Math.round(snapped.y / this.gridSize) * this.gridSize
    snapped.z = Math.round(snapped.z / this.gridSize) * this.gridSize
    return snapped
  }

  private cleanup() {
    this.isActive = false

    // Remove event listeners
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    // Hide cursor
    if (this.cursorSphere) {
      this.cursorSphere.visible = false
    }

    // Reset cursor style
    this.domElement.style.cursor = "default"

    this.updateCallback = null
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.cleanup()
    if (this.cursorSphere) {
      this.scene.remove(this.cursorSphere)
      this.cursorSphere.geometry.dispose()
      ;(this.cursorSphere.material as THREE.Material).dispose()
      this.cursorSphere = null
    }
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper)
      this.gridHelper.dispose()
      this.gridHelper = null
    }
  }
}

export default PointPicker
