/**
 * Geometry Utilities for Viewport3D
 *
 * Helper functions for coordinate conversion and geometry manipulation.
 */

import * as THREE from "three"
import type { MeshResult } from "@/core/services/hydraulics-service"
import type { ChannelObject, ChannelSection } from "@/core/stores/modeller"

/**
 * Ensure a value is a valid finite number, otherwise return the default.
 * This handles: null, undefined, NaN, Infinity, -Infinity
 */
export function safeNumber(value: number | null | undefined, defaultValue: number): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return defaultValue
  }
  return value
}

/**
 * Extract section parameters from ChannelSection for backend conversion
 */
export function getSectionParams(section: ChannelSection): Record<string, number> {
  if (section.type === "rectangular") {
    return {
      width: section.width,
      depth: section.depth,
    }
  }
  if (section.type === "trapezoidal") {
    return {
      bottomWidth: section.bottomWidth,
      depth: section.depth,
      sideSlope: section.sideSlope,
    }
  }
  // triangular
  return {
    depth: section.depth,
    sideSlope: section.sideSlope,
  }
}

/**
 * Convert MeshResult from Rust backend to Three.js BufferGeometry
 *
 * The backend uses engineering convention (Z-up) while Three.js uses graphics convention (Y-up).
 * We manually transform coordinates:
 * - Backend X (flow direction) -> Three.js X (unchanged)
 * - Backend Y (transverse) -> Three.js Z (depth into screen)
 * - Backend Z (up/vertical) -> Three.js Y (up)
 *
 * The channel floor is at Z=0 in backend, which becomes Y=0 in Three.js (on the grid).
 *
 * IMPORTANT: Generates UV coordinates using box projection mapping since the Rust backend
 * doesn't provide UVs. This is essential for texture mapping to work correctly.
 *
 * @param meshResult - The mesh data from Rust backend
 * @param textureScale - Global UV scale for consistent texture density (default: 1.0)
 */
export function meshResultToBufferGeometry(
  meshResult: MeshResult,
  textureScale = 1.0
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()

  // Transform vertices: swap Y and Z axes
  const vertices = meshResult.vertices
  const positions = new Float32Array(vertices.length)
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]!
    const y = vertices[i + 1]!
    const z = vertices[i + 2]!

    positions[i] = x
    positions[i + 1] = z
    positions[i + 2] = -y
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

  // Set indices
  if (meshResult.indices.length > 0) {
    geometry.setIndex(meshResult.indices)
  }

  // Transform normals the same way
  const meshResultNormals = meshResult.normals
  if (meshResultNormals && meshResultNormals.length > 0) {
    const normals = new Float32Array(meshResultNormals.length)
    for (let i = 0; i < meshResultNormals.length; i += 3) {
      const nx = meshResultNormals[i]!
      const ny = meshResultNormals[i + 1]!
      const nz = meshResultNormals[i + 2]!

      normals[i] = nx
      normals[i + 1] = nz
      normals[i + 2] = -ny
    }
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3))
  } else {
    geometry.computeVertexNormals()
  }

  // Generate UV coordinates using box projection with global texture scale
  // This ensures consistent texture density across all geometry
  generateBoxProjectionUVs(geometry, textureScale)

  // Compute bounding box/sphere for culling
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}

/**
 * Generate UV coordinates using PER-FACE box projection mapping
 *
 * This function projects UVs based on the FACE NORMAL (computed from triangle vertices),
 * NOT the vertex normal. This ensures all vertices of a triangle use the same projection plane,
 * eliminating seam artifacts that occur when adjacent vertices have slightly different normals.
 *
 * The algorithm:
 * 1. For each triangle, compute the face normal from the 3 vertex positions
 * 2. Determine the dominant axis of the face normal
 * 3. Project all 3 vertices using the same plane (XY, XZ, or YZ)
 *
 * @param geometry - The geometry to generate UVs for (must have indices or be non-indexed triangles)
 * @param baseScale - Optional scale multiplier (default: 1.0 = 1 world unit = 1 texture unit)
 */
export function generateBoxProjectionUVs(geometry: THREE.BufferGeometry, baseScale = 1.0): void {
  const positions = geometry.getAttribute("position")

  if (!positions) {
    console.warn("[generateBoxProjectionUVs] Missing positions, cannot generate UVs")
    return
  }

  // Check if we already have valid UVs to avoid redundant work
  const existingUvs = geometry.getAttribute("uv")
  if (existingUvs && existingUvs.count === positions.count) {
    // If we have UVs, only regenerate if explicitly forced (logic omitted here for brevity)
    // Most meshes from backend won't have UVs initially
  }

  const uvs = new Float32Array(positions.count * 2)
  const indices = geometry.getIndex()

  // Helper vectors (pre-allocated to avoid GC pressure)
  const v0 = new THREE.Vector3()
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const edge1 = new THREE.Vector3()
  const edge2 = new THREE.Vector3()

  // Process triangles
  const triangleCount = indices ? indices.count / 3 : positions.count / 3

  // For very large meshes, consider using a faster approximation or skip if performance is critical
  // But for CAD, accurate UVs are important for materials.

  // Optimization: use raw array access instead of getX/getY/getZ when possible
  const posArray = positions.array as Float32Array
  const idxArray = indices ? (indices.array as Uint32Array | Uint16Array) : null

  for (let t = 0; t < triangleCount; t++) {
    // Get vertex indices for this triangle
    let i0: number, i1: number, i2: number

    if (idxArray) {
      i0 = idxArray[t * 3] as number
      i1 = idxArray[t * 3 + 1] as number
      i2 = idxArray[t * 3 + 2] as number
    } else {
      i0 = t * 3
      i1 = t * 3 + 1
      i2 = t * 3 + 2
    }

    // Get vertex positions using raw array access for speed
    v0.set(posArray[i0 * 3] || 0, posArray[i0 * 3 + 1] || 0, posArray[i0 * 3 + 2] || 0)
    v1.set(posArray[i1 * 3] || 0, posArray[i1 * 3 + 1] || 0, posArray[i1 * 3 + 2] || 0)
    v2.set(posArray[i2 * 3] || 0, posArray[i2 * 3 + 1] || 0, posArray[i2 * 3 + 2] || 0)

    // Compute face normal from cross product of edges
    edge1.set(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z)
    edge2.set(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z)

    // Inline cross product for maximum speed
    const nx = edge1.y * edge2.z - edge1.z * edge2.y
    const ny = edge1.z * edge2.x - edge1.x * edge2.z
    const nz = edge1.x * edge2.y - edge1.y * edge2.x

    // Determine dominant axis without full normalization if not needed
    const absX = Math.abs(nx)
    const absY = Math.abs(ny)
    const absZ = Math.abs(nz)

    // Store UVs based on dominant axis
    if (absX >= absY && absX >= absZ) {
      // X-dominant: project onto YZ plane
      uvs[i0 * 2] = v0.z * baseScale
      uvs[i0 * 2 + 1] = v0.y * baseScale
      uvs[i1 * 2] = v1.z * baseScale
      uvs[i1 * 2 + 1] = v1.y * baseScale
      uvs[i2 * 2] = v2.z * baseScale
      uvs[i2 * 2 + 1] = v2.y * baseScale
    } else if (absY >= absX && absY >= absZ) {
      // Y-dominant: project onto XZ plane
      uvs[i0 * 2] = v0.x * baseScale
      uvs[i0 * 2 + 1] = v0.z * baseScale
      uvs[i1 * 2] = v1.x * baseScale
      uvs[i1 * 2 + 1] = v1.z * baseScale
      uvs[i2 * 2] = v2.x * baseScale
      uvs[i2 * 2 + 1] = v2.z * baseScale
    } else {
      // Z-dominant: project onto XY plane
      uvs[i0 * 2] = v0.x * baseScale
      uvs[i0 * 2 + 1] = v0.y * baseScale
      uvs[i1 * 2] = v1.x * baseScale
      uvs[i1 * 2 + 1] = v1.y * baseScale
      uvs[i2 * 2] = v2.x * baseScale
      uvs[i2 * 2 + 1] = v2.y * baseScale
    }
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2))
}

/**
 * Merge multiple BufferGeometries into one
 */
export function mergeBufferGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null
  if (geometries.length === 1) return geometries[0].clone()

  // Calculate total vertex count
  let totalVertices = 0
  let _totalIndices = 0

  for (const geo of geometries) {
    const pos = geo.getAttribute("position")
    if (pos) totalVertices += pos.count
    const idx = geo.getIndex()
    if (idx) _totalIndices += idx.count
  }

  // Create merged arrays
  const positions = new Float32Array(totalVertices * 3)
  const normals = new Float32Array(totalVertices * 3)
  const indices: number[] = []

  let vertexOffset = 0

  for (const geo of geometries) {
    const pos = geo.getAttribute("position") as THREE.BufferAttribute
    const norm = geo.getAttribute("normal") as THREE.BufferAttribute
    const idx = geo.getIndex()

    if (pos) {
      positions.set(pos.array, vertexOffset * 3)
      if (norm) {
        normals.set(norm.array, vertexOffset * 3)
      }

      if (idx) {
        for (let i = 0; i < idx.count; i++) {
          indices.push(idx.getX(i) + vertexOffset)
        }
      }

      vertexOffset += pos.count
    }
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3))
  if (indices.length > 0) {
    merged.setIndex(indices)
  }
  merged.computeVertexNormals()

  return merged
}

/**
 * Create fallback geometry for channels when Tauri is not available
 * Generates an OPEN channel shape using Three.js (no top cap - water flows openly)
 *
 * For open channels, we create the walls and floor as separate geometries
 * and merge them, avoiding any "cap" on top since water surface is free.
 *
 * @param channel - The channel object with dimensions
 * @param textureScale - Global UV texture scale for consistent density (default: 1.0)
 */
export function createChannelFallbackGeometry(
  channel: ChannelObject,
  textureScale = 1.0
): THREE.BufferGeometry {
  const { section, length } = channel
  const wallThickness = 0.1
  const geometries: THREE.BufferGeometry[] = []

  switch (section.type) {
    case "rectangular": {
      const sec = section as { width: number; depth: number }
      const width = sec.width ?? 2
      const height = sec.depth ?? 1

      // Left wall
      const leftWall = new THREE.BoxGeometry(wallThickness, height, length)
      leftWall.translate(-width / 2 - wallThickness / 2, height / 2, length / 2)
      geometries.push(leftWall)

      // Right wall
      const rightWall = new THREE.BoxGeometry(wallThickness, height, length)
      rightWall.translate(width / 2 + wallThickness / 2, height / 2, length / 2)
      geometries.push(rightWall)

      // Floor
      const floor = new THREE.BoxGeometry(width + wallThickness * 2, wallThickness, length)
      floor.translate(0, -wallThickness / 2, length / 2)
      geometries.push(floor)

      break
    }
    case "trapezoidal": {
      const sec = section as { bottomWidth: number; depth: number; sideSlope: number }
      const bottomWidth = sec.bottomWidth ?? 2
      const sideSlope = sec.sideSlope ?? 1.5
      const height = sec.depth ?? 1.5
      const topWidth = bottomWidth + 2 * sideSlope * height

      // Create OPEN channel using separate wall and floor geometries
      // This avoids ExtrudeGeometry's automatic caps

      // Left wall as a sloped box (using BufferGeometry for custom shape)
      const leftWallShape = new THREE.Shape()
      leftWallShape.moveTo(-bottomWidth / 2 - wallThickness, 0)
      leftWallShape.lineTo(-topWidth / 2 - wallThickness, height)
      leftWallShape.lineTo(-topWidth / 2, height)
      leftWallShape.lineTo(-bottomWidth / 2, wallThickness)
      leftWallShape.lineTo(-bottomWidth / 2 - wallThickness, 0)

      const leftWallGeo = new THREE.ExtrudeGeometry(leftWallShape, {
        depth: length,
        bevelEnabled: false,
      })
      leftWallGeo.rotateX(-Math.PI / 2)
      geometries.push(leftWallGeo)

      // Right wall
      const rightWallShape = new THREE.Shape()
      rightWallShape.moveTo(bottomWidth / 2 + wallThickness, 0)
      rightWallShape.lineTo(bottomWidth / 2, wallThickness)
      rightWallShape.lineTo(topWidth / 2, height)
      rightWallShape.lineTo(topWidth / 2 + wallThickness, height)
      rightWallShape.lineTo(bottomWidth / 2 + wallThickness, 0)

      const rightWallGeo = new THREE.ExtrudeGeometry(rightWallShape, {
        depth: length,
        bevelEnabled: false,
      })
      rightWallGeo.rotateX(-Math.PI / 2)
      geometries.push(rightWallGeo)

      // Floor (flat bottom between walls)
      const floorShape = new THREE.Shape()
      floorShape.moveTo(-bottomWidth / 2 - wallThickness, 0)
      floorShape.lineTo(bottomWidth / 2 + wallThickness, 0)
      floorShape.lineTo(bottomWidth / 2, wallThickness)
      floorShape.lineTo(-bottomWidth / 2, wallThickness)
      floorShape.lineTo(-bottomWidth / 2 - wallThickness, 0)

      const floorGeo = new THREE.ExtrudeGeometry(floorShape, {
        depth: length,
        bevelEnabled: false,
      })
      floorGeo.rotateX(-Math.PI / 2)
      geometries.push(floorGeo)

      break
    }
    case "triangular": {
      const sec = section as { depth: number; sideSlope: number }
      const sideSlope = sec.sideSlope ?? 1
      const height = sec.depth ?? 1
      const topWidth = 2 * sideSlope * height

      // Create OPEN V-shaped channel with separate walls (no top cap)

      // Left wall (from vertex at bottom to top-left)
      const leftWallShape = new THREE.Shape()
      leftWallShape.moveTo(-wallThickness, 0)
      leftWallShape.lineTo(-topWidth / 2 - wallThickness, height)
      leftWallShape.lineTo(-topWidth / 2, height)
      leftWallShape.lineTo(0, wallThickness)
      leftWallShape.lineTo(-wallThickness, 0)

      const leftWallGeo = new THREE.ExtrudeGeometry(leftWallShape, {
        depth: length,
        bevelEnabled: false,
      })
      leftWallGeo.rotateX(-Math.PI / 2)
      geometries.push(leftWallGeo)

      // Right wall (from vertex at bottom to top-right)
      const rightWallShape = new THREE.Shape()
      rightWallShape.moveTo(wallThickness, 0)
      rightWallShape.lineTo(0, wallThickness)
      rightWallShape.lineTo(topWidth / 2, height)
      rightWallShape.lineTo(topWidth / 2 + wallThickness, height)
      rightWallShape.lineTo(wallThickness, 0)

      const rightWallGeo = new THREE.ExtrudeGeometry(rightWallShape, {
        depth: length,
        bevelEnabled: false,
      })
      rightWallGeo.rotateX(-Math.PI / 2)
      geometries.push(rightWallGeo)

      break
    }
    default: {
      // Simple box fallback
      return new THREE.BoxGeometry(length, 1, 2)
    }
  }

  // Merge all geometries into one
  const mergedGeometry = mergeBufferGeometries(geometries)

  // Clean up individual geometries
  for (const g of geometries) {
    g.dispose()
  }

  // Rotate so channel extends along X axis (length direction)
  if (mergedGeometry) {
    mergedGeometry.rotateY(Math.PI / 2)

    // Generate UV coordinates with triplanar mapping for consistent textures
    generateBoxProjectionUVs(mergedGeometry, textureScale)

    return mergedGeometry
  }

  // Fallback if merge fails
  const fallbackGeo = new THREE.BoxGeometry(length, 1, 2)
  generateBoxProjectionUVs(fallbackGeo, textureScale)
  return fallbackGeo
}
