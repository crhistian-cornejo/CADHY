/**
 * CADPreviewMesh Component - CADHY
 *
 * Renders a preview mesh for CAD operations in semi-transparent style.
 * Used to show real-time feedback when adjusting fillet/chamfer/shell parameters.
 */

import { useMemo } from "react"
import * as THREE from "three"
import type { PreviewMesh } from "@/hooks/use-cad-preview"

export interface CADPreviewMeshProps {
  /** Preview mesh data */
  mesh: PreviewMesh
  /** Position */
  position?: [number, number, number]
  /** Rotation */
  rotation?: [number, number, number]
  /** Scale */
  scale?: [number, number, number]
  /** Preview color */
  color?: string
  /** Opacity */
  opacity?: number
}

export function CADPreviewMesh({
  mesh,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  color = "#10b981",
  opacity = 0.5,
}: CADPreviewMeshProps) {
  // Create BufferGeometry from mesh data
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()

    // Set vertices - swap Y and Z for Three.js coordinate system
    const positions = new Float32Array(mesh.vertices.length)
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const x = mesh.vertices[i] // X stays X
      const y = mesh.vertices[i + 1] // Backend Y (transverse)
      const z = mesh.vertices[i + 2] // Backend Z (vertical/up)

      positions[i] = x // Three.js X
      positions[i + 1] = z // Three.js Y = Backend Z
      positions[i + 2] = -y // Three.js Z = -Backend Y
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))

    // Set indices
    if (mesh.indices && mesh.indices.length > 0) {
      geo.setIndex(Array.from(mesh.indices))
    }

    // Set normals if available, otherwise compute them
    if (mesh.normals && mesh.normals.length > 0) {
      const normals = new Float32Array(mesh.normals.length)
      for (let i = 0; i < mesh.normals.length; i += 3) {
        const nx = mesh.normals[i]
        const ny = mesh.normals[i + 1]
        const nz = mesh.normals[i + 2]

        normals[i] = nx
        normals[i + 1] = nz
        normals[i + 2] = -ny
      }
      geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3))
    } else {
      geo.computeVertexNormals()
    }

    geo.computeBoundingBox()
    geo.computeBoundingSphere()

    return geo
  }, [mesh])

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={scale}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        emissive={color}
        emissiveIntensity={0.2}
        metalness={0.3}
        roughness={0.5}
        depthWrite={false} // Prevent z-fighting with original mesh
      />

      {/* Wireframe overlay for better visibility */}
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color={color} transparent opacity={opacity * 0.6} linewidth={1} />
      </lineSegments>
    </mesh>
  )
}
