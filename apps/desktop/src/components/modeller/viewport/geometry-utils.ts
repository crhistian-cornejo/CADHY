/**
 * Geometry Utilities for Viewport3D
 *
 * Helper functions for coordinate conversion and geometry manipulation.
 */

import * as THREE from "three"
import type { MeshResult } from "@/services/hydraulics-service"
import type { ChannelObject, ChannelSection } from "@/stores/modeller-store"

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
 * Generate UV coordinates using triplanar mapping
 *
 * Triplanar mapping projects textures from 3 axes and blends them based on surface normal.
 * This provides seamless texturing on all surfaces regardless of orientation,
 * which is ideal for hydraulic structures with vertical walls, floors, and sloped surfaces.
 *
 * The UVs are scaled to provide consistent texture density across ALL geometry.
 * IMPORTANT: Uses a FIXED scale to ensure 1 meter in 3D = 1 meter of texture everywhere.
 * This creates visual consistency - stairs, walls, and floors all show the same texture size.
 *
 * @param geometry - The geometry to generate UVs for
 * @param baseScale - Optional scale multiplier (default: 1.0 = 1 world unit = 1 texture unit)
 *                    - 0.5 = texture appears 2x larger (less tiling)
 *                    - 2.0 = texture appears 2x smaller (more tiling)
 */
function generateBoxProjectionUVs(geometry: THREE.BufferGeometry, baseScale = 1.0): void {
  const positions = geometry.getAttribute("position")
  const normals = geometry.getAttribute("normal")

  if (!positions || !normals) {
    console.warn("[generateBoxProjectionUVs] Missing positions or normals, cannot generate UVs")
    return
  }

  const uvs = new Float32Array(positions.count * 2)
  const tempNormal = new THREE.Vector3()
  const tempPos = new THREE.Vector3()

  // CRITICAL: Use FIXED scale for consistency across all objects
  // baseScale = 1.0 means 1 meter in world = 1 texture repeat
  // This ensures stairs, walls, floors all have the same texture density
  const textureScale = baseScale

  for (let i = 0; i < positions.count; i++) {
    // Get position and normal for this vertex
    tempPos.fromBufferAttribute(positions, i)
    tempNormal.fromBufferAttribute(normals, i)

    // Get absolute normal components
    const absX = Math.abs(tempNormal.x)
    const absY = Math.abs(tempNormal.y)
    const absZ = Math.abs(tempNormal.z)

    let u = 0
    let v = 0

    // Project based on dominant normal axis
    // Use world-space coordinates scaled by textureScale for consistent tiling
    if (absX >= absY && absX >= absZ) {
      // X-axis dominant (side walls parallel to flow direction)
      // Map Y (vertical) to V and Z (transverse) to U
      u = tempPos.z * textureScale
      v = tempPos.y * textureScale
    } else if (absY >= absX && absY >= absZ) {
      // Y-axis dominant (horizontal surfaces - floors/ceilings)
      // Map X (flow direction) to U and Z (transverse) to V
      u = tempPos.x * textureScale
      v = tempPos.z * textureScale
    } else {
      // Z-axis dominant (end walls perpendicular to flow)
      // Map X (flow direction) to U and Y (vertical) to V
      u = tempPos.x * textureScale
      v = tempPos.y * textureScale
    }

    uvs[i * 2] = u
    uvs[i * 2 + 1] = v
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2))
  console.log(
    `[generateBoxProjectionUVs] Generated UVs for ${positions.count} vertices | Scale: ${textureScale.toFixed(2)} (1m world = ${textureScale.toFixed(2)}m texture)`
  )
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
