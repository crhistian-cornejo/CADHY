/**
 * Geometry Utilities for Viewport3D
 *
 * Helper functions for coordinate conversion and geometry manipulation.
 */

import * as THREE from "three"
import type { MeshResult } from "@/services/hydraulics-service"
import type { ChannelObject, ChannelSection } from "@/stores/modeller"

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
  const positions = new Float32Array(meshResult.vertices.length)
  for (let i = 0; i < meshResult.vertices.length; i += 3) {
    const x = meshResult.vertices[i] // X stays X (flow direction)
    const y = meshResult.vertices[i + 1] // Backend Y (transverse)
    const z = meshResult.vertices[i + 2] // Backend Z (vertical/up)

    positions[i] = x // Three.js X = Backend X
    positions[i + 1] = z // Three.js Y = Backend Z (vertical becomes up)
    positions[i + 2] = -y // Three.js Z = -Backend Y (transverse, negated for correct orientation)
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

  // Set indices
  if (meshResult.indices.length > 0) {
    geometry.setIndex(meshResult.indices)
  }

  // Transform normals the same way
  if (meshResult.normals && meshResult.normals.length > 0) {
    const normals = new Float32Array(meshResult.normals.length)
    for (let i = 0; i < meshResult.normals.length; i += 3) {
      const nx = meshResult.normals[i]
      const ny = meshResult.normals[i + 1]
      const nz = meshResult.normals[i + 2]

      normals[i] = nx // Three.js X = Backend X
      normals[i + 1] = nz // Three.js Y = Backend Z
      normals[i + 2] = -ny // Three.js Z = -Backend Y
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

  const uvs = new Float32Array(positions.count * 2)
  const indices = geometry.getIndex()

  // Helper vectors
  const v0 = new THREE.Vector3()
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const edge1 = new THREE.Vector3()
  const edge2 = new THREE.Vector3()
  const faceNormal = new THREE.Vector3()

  /**
   * Compute UV for a vertex based on the face's dominant axis
   */
  function computeUV(pos: THREE.Vector3, dominantAxis: "x" | "y" | "z"): [number, number] {
    switch (dominantAxis) {
      case "x":
        // X-dominant: project onto YZ plane
        return [pos.z * baseScale, pos.y * baseScale]
      case "y":
        // Y-dominant: project onto XZ plane (floor/ceiling)
        return [pos.x * baseScale, pos.z * baseScale]
      case "z":
        // Z-dominant: project onto XY plane
        return [pos.x * baseScale, pos.y * baseScale]
    }
  }

  /**
   * Get dominant axis from face normal
   */
  function getDominantAxis(normal: THREE.Vector3): "x" | "y" | "z" {
    const absX = Math.abs(normal.x)
    const absY = Math.abs(normal.y)
    const absZ = Math.abs(normal.z)

    if (absX >= absY && absX >= absZ) return "x"
    if (absY >= absX && absY >= absZ) return "y"
    return "z"
  }

  // Process triangles
  const triangleCount = indices ? indices.count / 3 : positions.count / 3

  for (let t = 0; t < triangleCount; t++) {
    // Get vertex indices for this triangle
    let i0: number, i1: number, i2: number

    if (indices) {
      i0 = indices.getX(t * 3)
      i1 = indices.getX(t * 3 + 1)
      i2 = indices.getX(t * 3 + 2)
    } else {
      i0 = t * 3
      i1 = t * 3 + 1
      i2 = t * 3 + 2
    }

    // Get vertex positions
    v0.fromBufferAttribute(positions, i0)
    v1.fromBufferAttribute(positions, i1)
    v2.fromBufferAttribute(positions, i2)

    // Compute face normal from cross product of edges
    edge1.subVectors(v1, v0)
    edge2.subVectors(v2, v0)
    faceNormal.crossVectors(edge1, edge2).normalize()

    // Handle degenerate triangles
    if (faceNormal.lengthSq() < 0.0001) {
      // Fallback: use Y-axis projection for degenerate triangles
      faceNormal.set(0, 1, 0)
    }

    // Get dominant axis for this face
    const dominantAxis = getDominantAxis(faceNormal)

    // Compute UVs for all 3 vertices using the SAME projection plane
    const [u0, uv0] = computeUV(v0, dominantAxis)
    const [u1, uv1] = computeUV(v1, dominantAxis)
    const [u2, uv2] = computeUV(v2, dominantAxis)

    // Store UVs
    uvs[i0 * 2] = u0
    uvs[i0 * 2 + 1] = uv0
    uvs[i1 * 2] = u1
    uvs[i1 * 2 + 1] = uv1
    uvs[i2 * 2] = u2
    uvs[i2 * 2 + 1] = uv2
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
