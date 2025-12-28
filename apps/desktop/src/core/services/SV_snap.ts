/**
 * Smart Snapping System
 *
 * Provides intelligent snapping to vertices, edges, faces, and grid points.
 * Makes precise modeling 10x faster.
 *
 * Features:
 * - Vertex snapping (exact geometry points)
 * - Edge snapping with closest point detection (not just midpoints)
 * - Face normal snapping (perpendicular to surface)
 * - Grid snapping with configurable size
 * - Center snapping (bounding box centers)
 *
 * Uses Material Pool for efficient material reuse.
 */

import * as THREE from "three"
import { getBasicMaterial } from "../../render/pool/RE_material_pool"

// =============================================================================
// TYPES
// =============================================================================

export type SnapType =
  | "vertex"
  | "edge"
  | "edge_closest" // Closest point on edge (not just midpoint)
  | "face"
  | "face_normal" // Perpendicular to face surface
  | "grid"
  | "center"
  | "none"

/**
 * Priority values for snap types.
 * Lower = higher priority (wins when multiple snaps are within tolerance).
 */
export const SNAP_PRIORITY: Record<SnapType, number> = {
  vertex: 0, // Highest priority - exact geometry points
  edge: 1,
  edge_closest: 2,
  face_normal: 3,
  face: 4,
  center: 5,
  grid: 10, // Lowest priority - fallback
  none: 100,
}

export interface SnapPoint {
  position: THREE.Vector3
  type: SnapType
  /** Surface normal at snap point (for face/face_normal snaps) */
  normal?: THREE.Vector3
  /** Distance from cursor to snap point */
  distance: number
  /** Priority for sorting (lower = higher priority) */
  priority?: number
  /** Source mesh for debugging */
  sourceMesh?: THREE.Mesh
}

export interface SnapConfig {
  enabled: boolean
  /** Max snap distance in world units */
  distance: number
  snapToVertices: boolean
  /** Snap to edge midpoints */
  snapToEdges: boolean
  /** Snap to closest point on any edge (Blender-style) */
  snapToEdgeClosest: boolean
  /** Snap perpendicular to faces (aligns object to surface) */
  snapToFaceNormal: boolean
  snapToFaces: boolean
  snapToGrid: boolean
  snapToCenters: boolean
  gridSize: number
  /** Show visual indicator of snap normal direction */
  showNormalIndicator: boolean
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  distance: 0.5,
  snapToVertices: true,
  snapToEdges: true,
  snapToEdgeClosest: true,
  snapToFaceNormal: true,
  snapToFaces: false,
  snapToGrid: true,
  snapToCenters: true,
  gridSize: 0.5,
  showNormalIndicator: true,
}

// =============================================================================
// GEOMETRY HELPERS (3D)
// =============================================================================

/**
 * Find the closest point on a 3D line segment to a given point.
 * This is essential for proper edge snapping - not just midpoints.
 *
 * @param point - The query point
 * @param lineStart - Start of the line segment
 * @param lineEnd - End of the line segment
 * @returns Object with closest point, distance, and parameter t (0=start, 1=end)
 */
export function closestPointOnEdge3D(
  point: THREE.Vector3,
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3
): { point: THREE.Vector3; distance: number; t: number } {
  const lineDir = new THREE.Vector3().subVectors(lineEnd, lineStart)
  const lengthSq = lineDir.lengthSq()

  if (lengthSq < 1e-10) {
    // Degenerate edge (zero length)
    return {
      point: lineStart.clone(),
      distance: point.distanceTo(lineStart),
      t: 0,
    }
  }

  // Calculate parameter t (0 = start, 1 = end)
  const toPoint = new THREE.Vector3().subVectors(point, lineStart)
  const t = Math.max(0, Math.min(1, toPoint.dot(lineDir) / lengthSq))

  const closest = new THREE.Vector3().copy(lineStart).addScaledVector(lineDir, t)

  return {
    point: closest,
    distance: point.distanceTo(closest),
    t,
  }
}

/**
 * Compute face normal from three vertices using cross product.
 * Follows the pattern from RE_geometry_utils.ts
 */
export function computeFaceNormal(
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3
): THREE.Vector3 {
  const edge1 = new THREE.Vector3().subVectors(v1, v0)
  const edge2 = new THREE.Vector3().subVectors(v2, v0)
  const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize()

  // Handle degenerate triangles
  if (normal.lengthSq() < 0.0001) {
    return new THREE.Vector3(0, 1, 0) // Default to Y-up
  }

  return normal
}

/**
 * Check if a point lies within a triangle (in 3D space).
 * Uses barycentric coordinates for robust detection.
 */
export function pointInTriangle3D(
  point: THREE.Vector3,
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3
): boolean {
  const v0v1 = new THREE.Vector3().subVectors(v1, v0)
  const v0v2 = new THREE.Vector3().subVectors(v2, v0)
  const v0p = new THREE.Vector3().subVectors(point, v0)

  const dot00 = v0v2.dot(v0v2)
  const dot01 = v0v2.dot(v0v1)
  const dot02 = v0v2.dot(v0p)
  const dot11 = v0v1.dot(v0v1)
  const dot12 = v0v1.dot(v0p)

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01)
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom

  return u >= 0 && v >= 0 && u + v <= 1
}

// =============================================================================
// SNAP MANAGER
// =============================================================================

export class SnapManager {
  private config: SnapConfig
  private snapIndicator: THREE.Mesh | null = null
  private normalIndicator: THREE.ArrowHelper | null = null

  constructor(config: SnapConfig = DEFAULT_SNAP_CONFIG) {
    this.config = config
    this.createSnapIndicator()
    this.createNormalIndicator()
  }

  /**
   * Find nearest snap point from a given position.
   * Uses priority-based sorting: vertex > edge > face_normal > center > grid
   */
  findSnapPoint(
    position: THREE.Vector3,
    scene: THREE.Scene,
    _camera: THREE.Camera,
    excludeObjects: THREE.Object3D[] = []
  ): SnapPoint | null {
    if (!this.config.enabled) return null

    const candidates: SnapPoint[] = []

    // Collect all meshes in scene (done once for efficiency)
    const meshes: THREE.Mesh[] = []
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !excludeObjects.includes(obj)) {
        meshes.push(obj)
      }
    })

    // 1. Snap to vertices (highest priority)
    if (this.config.snapToVertices) {
      for (const mesh of meshes) {
        const vertexSnaps = this.snapToVertices(position, mesh)
        for (const snap of vertexSnaps) {
          if (snap.distance < this.config.distance) {
            snap.priority = SNAP_PRIORITY.vertex
            candidates.push(snap)
          }
        }
      }
    }

    // 2. Snap to edge midpoints
    if (this.config.snapToEdges) {
      for (const mesh of meshes) {
        const edgeSnaps = this.snapToEdges(position, mesh)
        for (const snap of edgeSnaps) {
          if (snap.distance < this.config.distance) {
            snap.priority = SNAP_PRIORITY.edge
            candidates.push(snap)
          }
        }
      }
    }

    // 3. Snap to closest point on edges (Blender-style)
    if (this.config.snapToEdgeClosest) {
      for (const mesh of meshes) {
        const edgeClosestSnaps = this.snapToEdgeClosest(position, mesh)
        for (const snap of edgeClosestSnaps) {
          if (snap.distance < this.config.distance) {
            snap.priority = SNAP_PRIORITY.edge_closest
            candidates.push(snap)
          }
        }
      }
    }

    // 4. Snap to face normals (perpendicular to surface)
    if (this.config.snapToFaceNormal) {
      for (const mesh of meshes) {
        const faceSnap = this.snapToFaceNormal(position, mesh)
        if (faceSnap && faceSnap.distance < this.config.distance) {
          faceSnap.priority = SNAP_PRIORITY.face_normal
          candidates.push(faceSnap)
        }
      }
    }

    // 5. Snap to centers (bounding box center)
    if (this.config.snapToCenters) {
      for (const mesh of meshes) {
        const centerSnap = this.snapToCenter(position, mesh)
        if (centerSnap && centerSnap.distance < this.config.distance) {
          centerSnap.priority = SNAP_PRIORITY.center
          candidates.push(centerSnap)
        }
      }
    }

    // 6. Snap to grid (lowest priority - fallback)
    if (this.config.snapToGrid) {
      const gridSnap = this.snapToGrid(position)
      if (gridSnap.distance < this.config.distance) {
        gridSnap.priority = SNAP_PRIORITY.grid
        candidates.push(gridSnap)
      }
    }

    // No candidates found
    if (candidates.length === 0) return null

    // Sort by: 1) priority (lower = better), 2) distance (closer = better)
    candidates.sort((a, b) => {
      const priorityA = a.priority ?? SNAP_PRIORITY.none
      const priorityB = b.priority ?? SNAP_PRIORITY.none
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      return a.distance - b.distance
    })

    return candidates[0]
  }

  /**
   * Snap to grid
   */
  private snapToGrid(position: THREE.Vector3): SnapPoint {
    const gridSize = this.config.gridSize
    const snapped = new THREE.Vector3(
      Math.round(position.x / gridSize) * gridSize,
      Math.round(position.y / gridSize) * gridSize,
      Math.round(position.z / gridSize) * gridSize
    )

    return {
      position: snapped,
      type: "grid",
      distance: position.distanceTo(snapped),
    }
  }

  /**
   * Snap to mesh vertices
   */
  private snapToVertices(position: THREE.Vector3, mesh: THREE.Mesh): SnapPoint[] {
    const snapPoints: SnapPoint[] = []
    const geometry = mesh.geometry

    if (!geometry.attributes.position) return snapPoints

    const positionAttr = geometry.attributes.position
    const worldPosition = new THREE.Vector3()

    for (let i = 0; i < positionAttr.count; i++) {
      worldPosition.fromBufferAttribute(positionAttr, i)
      worldPosition.applyMatrix4(mesh.matrixWorld)

      const distance = position.distanceTo(worldPosition)

      snapPoints.push({
        position: worldPosition.clone(),
        type: "vertex",
        distance,
      })
    }

    return snapPoints
  }

  /**
   * Snap to edge midpoints
   */
  private snapToEdges(position: THREE.Vector3, mesh: THREE.Mesh): SnapPoint[] {
    const snapPoints: SnapPoint[] = []
    const geometry = mesh.geometry

    if (!geometry.index || !geometry.attributes.position) return snapPoints

    const positionAttr = geometry.attributes.position
    const index = geometry.index
    const worldPosition1 = new THREE.Vector3()
    const worldPosition2 = new THREE.Vector3()
    const midpoint = new THREE.Vector3()

    // Process triangles
    for (let i = 0; i < index.count; i += 3) {
      const edges = [
        [index.getX(i), index.getX(i + 1)],
        [index.getX(i + 1), index.getX(i + 2)],
        [index.getX(i + 2), index.getX(i)],
      ]

      for (const [idx1, idx2] of edges) {
        worldPosition1.fromBufferAttribute(positionAttr, idx1)
        worldPosition1.applyMatrix4(mesh.matrixWorld)

        worldPosition2.fromBufferAttribute(positionAttr, idx2)
        worldPosition2.applyMatrix4(mesh.matrixWorld)

        midpoint.lerpVectors(worldPosition1, worldPosition2, 0.5)

        const distance = position.distanceTo(midpoint)

        snapPoints.push({
          position: midpoint.clone(),
          type: "edge",
          distance,
        })
      }
    }

    return snapPoints
  }

  /**
   * Snap to closest point on any edge (Blender-style).
   * Unlike snapToEdges which only returns midpoints, this returns
   * the actual closest point on the edge segment.
   */
  private snapToEdgeClosest(position: THREE.Vector3, mesh: THREE.Mesh): SnapPoint[] {
    const snapPoints: SnapPoint[] = []
    const geometry = mesh.geometry

    if (!geometry.index || !geometry.attributes.position) return snapPoints

    const positionAttr = geometry.attributes.position
    const index = geometry.index
    const worldPosition1 = new THREE.Vector3()
    const worldPosition2 = new THREE.Vector3()

    // Track processed edges to avoid duplicates (edge shared by two triangles)
    const processedEdges = new Set<string>()

    // Process triangles
    for (let i = 0; i < index.count; i += 3) {
      const edges = [
        [index.getX(i), index.getX(i + 1)],
        [index.getX(i + 1), index.getX(i + 2)],
        [index.getX(i + 2), index.getX(i)],
      ]

      for (const [idx1, idx2] of edges) {
        // Create unique edge key (smaller index first for consistency)
        const edgeKey = idx1 < idx2 ? `${idx1}-${idx2}` : `${idx2}-${idx1}`
        if (processedEdges.has(edgeKey)) continue
        processedEdges.add(edgeKey)

        worldPosition1.fromBufferAttribute(positionAttr, idx1)
        worldPosition1.applyMatrix4(mesh.matrixWorld)

        worldPosition2.fromBufferAttribute(positionAttr, idx2)
        worldPosition2.applyMatrix4(mesh.matrixWorld)

        // Find closest point on this edge
        const result = closestPointOnEdge3D(position, worldPosition1, worldPosition2)

        // Skip if we're at an endpoint (those are handled by vertex snap)
        // or at midpoint (handled by edge snap)
        const isEndpoint = result.t < 0.01 || result.t > 0.99
        const isMidpoint = Math.abs(result.t - 0.5) < 0.05
        if (isEndpoint || isMidpoint) continue

        snapPoints.push({
          position: result.point,
          type: "edge_closest",
          distance: result.distance,
          sourceMesh: mesh,
        })
      }
    }

    return snapPoints
  }

  /**
   * Snap to face with normal detection.
   * Returns the closest point on any face surface, along with the face normal.
   * This enables "face normal snapping" - aligning objects perpendicular to surfaces.
   */
  private snapToFaceNormal(position: THREE.Vector3, mesh: THREE.Mesh): SnapPoint | null {
    const geometry = mesh.geometry

    if (!geometry.index || !geometry.attributes.position) return null

    const positionAttr = geometry.attributes.position
    const index = geometry.index
    const v0 = new THREE.Vector3()
    const v1 = new THREE.Vector3()
    const v2 = new THREE.Vector3()

    let closestSnap: SnapPoint | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    // Process each triangle
    for (let i = 0; i < index.count; i += 3) {
      const idx0 = index.getX(i)
      const idx1 = index.getX(i + 1)
      const idx2 = index.getX(i + 2)

      // Get world-space vertices
      v0.fromBufferAttribute(positionAttr, idx0).applyMatrix4(mesh.matrixWorld)
      v1.fromBufferAttribute(positionAttr, idx1).applyMatrix4(mesh.matrixWorld)
      v2.fromBufferAttribute(positionAttr, idx2).applyMatrix4(mesh.matrixWorld)

      // Compute face normal
      const faceNormal = computeFaceNormal(v0, v1, v2)

      // Transform normal to world space (only rotation, no translation)
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
      faceNormal.applyMatrix3(normalMatrix).normalize()

      // Project position onto the plane of the triangle
      const planeNormal = faceNormal.clone()
      const planePoint = v0.clone()
      const toPosition = new THREE.Vector3().subVectors(position, planePoint)
      const signedDistance = toPosition.dot(planeNormal)
      const projectedPoint = new THREE.Vector3()
        .copy(position)
        .addScaledVector(planeNormal, -signedDistance)

      // Check if projected point is within the triangle
      if (!pointInTriangle3D(projectedPoint, v0, v1, v2)) continue

      const distance = Math.abs(signedDistance)

      if (distance < closestDistance) {
        closestDistance = distance
        closestSnap = {
          position: projectedPoint,
          type: "face_normal",
          normal: faceNormal.clone(),
          distance,
          sourceMesh: mesh,
        }
      }
    }

    return closestSnap
  }

  /**
   * Snap to mesh center (bounding box center)
   */
  private snapToCenter(position: THREE.Vector3, mesh: THREE.Mesh): SnapPoint | null {
    mesh.geometry.computeBoundingBox()
    const bbox = mesh.geometry.boundingBox
    if (!bbox) return null

    const center = new THREE.Vector3()
    bbox.getCenter(center)
    center.applyMatrix4(mesh.matrixWorld)

    return {
      position: center,
      type: "center",
      distance: position.distanceTo(center),
    }
  }

  /**
   * Create visual indicator for snap points
   */
  private createSnapIndicator(): void {
    const geometry = new THREE.SphereGeometry(0.1, 16, 16)
    const material = getBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
    })
    this.snapIndicator = new THREE.Mesh(geometry, material)
    this.snapIndicator.visible = false
  }

  /**
   * Create arrow helper for visualizing face normals.
   * Shows direction perpendicular to surface when face_normal snapping.
   */
  private createNormalIndicator(): void {
    const direction = new THREE.Vector3(0, 1, 0)
    const origin = new THREE.Vector3(0, 0, 0)
    const length = 0.5
    const hexColor = 0x00ffff // Cyan - distinct from green snap indicator

    this.normalIndicator = new THREE.ArrowHelper(direction, origin, length, hexColor, 0.1, 0.05)
    this.normalIndicator.visible = false
  }

  /**
   * Show snap indicator at position with optional normal direction.
   * For face_normal snaps, also displays an arrow showing the surface normal.
   */
  showSnapIndicator(position: THREE.Vector3, scene: THREE.Scene, snap?: SnapPoint): void {
    if (!this.snapIndicator) return

    this.snapIndicator.position.copy(position)
    this.snapIndicator.visible = true

    if (!this.snapIndicator.parent) {
      scene.add(this.snapIndicator)
    }

    // Update indicator color based on snap type
    const material = this.snapIndicator.material as THREE.MeshBasicMaterial
    if (snap) {
      switch (snap.type) {
        case "vertex":
          material.color.setHex(0x00ff00) // Green
          break
        case "edge":
        case "edge_closest":
          material.color.setHex(0xffff00) // Yellow
          break
        case "face_normal":
          material.color.setHex(0x00ffff) // Cyan
          break
        case "center":
          material.color.setHex(0xff00ff) // Magenta
          break
        case "grid":
          material.color.setHex(0x8888ff) // Light blue
          break
        default:
          material.color.setHex(0x00ff00) // Default green
      }
    }

    // Show normal indicator for face_normal snaps
    if (this.normalIndicator && this.config.showNormalIndicator) {
      if (snap?.type === "face_normal" && snap.normal) {
        this.normalIndicator.position.copy(position)
        this.normalIndicator.setDirection(snap.normal)
        this.normalIndicator.visible = true

        if (!this.normalIndicator.parent) {
          scene.add(this.normalIndicator)
        }
      } else {
        this.normalIndicator.visible = false
      }
    }
  }

  /**
   * Hide snap indicator and normal arrow
   */
  hideSnapIndicator(): void {
    if (this.snapIndicator) {
      this.snapIndicator.visible = false
    }
    if (this.normalIndicator) {
      this.normalIndicator.visible = false
    }
  }

  /**
   * Clean up resources when no longer needed
   */
  dispose(): void {
    if (this.snapIndicator) {
      this.snapIndicator.geometry.dispose()
      if (this.snapIndicator.material instanceof THREE.Material) {
        this.snapIndicator.material.dispose()
      }
      this.snapIndicator.removeFromParent()
      this.snapIndicator = null
    }
    if (this.normalIndicator) {
      this.normalIndicator.removeFromParent()
      this.normalIndicator = null
    }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<SnapConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): SnapConfig {
    return { ...this.config }
  }
}

// Singleton instance
export const snapManager = new SnapManager()
