import type { MeshData } from "@cadhy/types"
import { useEffect, useMemo } from "react"
import * as THREE from "three"

interface MeshProps {
  data: MeshData
  color?: string
  wireframe?: boolean
  selected?: boolean
}

export function Mesh({ data, color = "#6366f1", wireframe = false, selected = false }: MeshProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(data.vertices, 3))
    geo.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3))
    geo.setIndex(new THREE.BufferAttribute(data.indices, 1))
    if (data.uvs) {
      geo.setAttribute("uv", new THREE.BufferAttribute(data.uvs, 2))
    }
    // Compute bounding sphere for better frustum culling
    geo.computeBoundingSphere()
    return geo
  }, [data])

  // Cleanup geometry on unmount or when data changes
  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  return (
    <mesh>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={selected ? "#22c55e" : color}
        wireframe={wireframe}
        side={THREE.FrontSide}
        roughness={0.5}
        metalness={0.5}
      />
    </mesh>
  )
}
