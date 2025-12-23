/**
 * Edge Detection Hook - CADHY
 *
 * Detects and selects edges from 3D geometry for CAD operations.
 * Provides raycasting, edge highlighting, and selection state.
 */

import { useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useState } from "react"
import * as THREE from "three"
import { useSelectedObjects } from "@/stores/modeller"

export interface DetectedEdge {
  /** Start point of the edge */
  start: THREE.Vector3
  /** End point of the edge */
  end: THREE.Vector3
  /** Midpoint of the edge */
  midpoint: THREE.Vector3
  /** Direction vector (normalized) */
  direction: THREE.Vector3
  /** Length of the edge */
  length: number
  /** Index in the edges array */
  index: number
  /** Object ID this edge belongs to */
  objectId: string
}

/**
 * Extract edges from a BufferGeometry
 * Edges are defined as unique line segments from triangles
 */
function extractEdges(geometry: THREE.BufferGeometry): Array<[THREE.Vector3, THREE.Vector3]> {
  const edges: Array<[THREE.Vector3, THREE.Vector3]> = []
  const edgeSet = new Set<string>()

  const position = geometry.attributes.position
  const index = geometry.index

  if (!position) return edges

  const addEdge = (v1: THREE.Vector3, v2: THREE.Vector3) => {
    // Create a unique key for this edge (order-independent)
    const key1 = `${v1.x.toFixed(6)},${v1.y.toFixed(6)},${v1.z.toFixed(6)}-${v2.x.toFixed(6)},${v2.y.toFixed(6)},${v2.z.toFixed(6)}`
    const key2 = `${v2.x.toFixed(6)},${v2.y.toFixed(6)},${v2.z.toFixed(6)}-${v1.x.toFixed(6)},${v1.y.toFixed(6)},${v1.z.toFixed(6)}`

    if (!edgeSet.has(key1) && !edgeSet.has(key2)) {
      edgeSet.add(key1)
      edges.push([v1.clone(), v2.clone()])
    }
  }

  if (index) {
    // Indexed geometry
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i)
      const b = index.getX(i + 1)
      const c = index.getX(i + 2)

      const v1 = new THREE.Vector3().fromBufferAttribute(position, a)
      const v2 = new THREE.Vector3().fromBufferAttribute(position, b)
      const v3 = new THREE.Vector3().fromBufferAttribute(position, c)

      addEdge(v1, v2)
      addEdge(v2, v3)
      addEdge(v3, v1)
    }
  } else {
    // Non-indexed geometry
    for (let i = 0; i < position.count; i += 3) {
      const v1 = new THREE.Vector3().fromBufferAttribute(position, i)
      const v2 = new THREE.Vector3().fromBufferAttribute(position, i + 1)
      const v3 = new THREE.Vector3().fromBufferAttribute(position, i + 2)

      addEdge(v1, v2)
      addEdge(v2, v3)
      addEdge(v3, v1)
    }
  }

  return edges
}

/**
 * Find the closest edge to a ray
 */
function findClosestEdge(
  ray: THREE.Ray,
  edges: DetectedEdge[],
  maxDistance = 0.5
): DetectedEdge | null {
  let closest: DetectedEdge | null = null
  let minDistance = maxDistance

  for (const edge of edges) {
    // Create a line segment
    const line = new THREE.Line3(edge.start, edge.end)

    // Find closest point on line to ray
    const closestPointOnLine = new THREE.Vector3()
    const closestPointOnRay = new THREE.Vector3()

    line.closestPointToPoint(ray.origin, true, closestPointOnLine)

    // Project onto ray
    const t = ray.direction.dot(closestPointOnLine.clone().sub(ray.origin))
    if (t < 0) continue // Behind camera

    closestPointOnRay.copy(ray.origin).addScaledVector(ray.direction, t)

    // Calculate distance
    const distance = closestPointOnLine.distanceTo(closestPointOnRay)

    if (distance < minDistance) {
      minDistance = distance
      closest = edge
    }
  }

  return closest
}

export function useEdgeDetection() {
  const { camera, scene } = useThree()
  const selectedObjects = useSelectedObjects()
  const [selectedEdge, setSelectedEdge] = useState<DetectedEdge | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<DetectedEdge | null>(null)

  // Extract edges from selected objects
  const availableEdges = useMemo(() => {
    const edges: DetectedEdge[] = []

    for (const obj of selectedObjects) {
      // Find the mesh in the scene
      const mesh = scene.getObjectByName(obj.id) as THREE.Mesh | undefined

      if (!mesh || !mesh.geometry) continue

      // Extract edges from geometry
      const rawEdges = extractEdges(mesh.geometry)

      // Convert to DetectedEdge format (apply world transform)
      const worldMatrix = mesh.matrixWorld

      for (let i = 0; i < rawEdges.length; i++) {
        const [start, end] = rawEdges[i]

        // Transform to world space
        const worldStart = start.clone().applyMatrix4(worldMatrix)
        const worldEnd = end.clone().applyMatrix4(worldMatrix)

        const midpoint = new THREE.Vector3().lerpVectors(worldStart, worldEnd, 0.5)
        const direction = new THREE.Vector3().subVectors(worldEnd, worldStart).normalize()
        const length = worldStart.distanceTo(worldEnd)

        edges.push({
          start: worldStart,
          end: worldEnd,
          midpoint,
          direction,
          length,
          index: i,
          objectId: obj.id,
        })
      }
    }

    return edges
  }, [selectedObjects, scene])

  // Handle mouse move for edge detection
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (availableEdges.length === 0) {
        setHoveredEdge(null)
        return
      }

      // Get normalized device coordinates
      const canvas = event.target as HTMLCanvasElement
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      // Create raycaster
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)

      // Find closest edge
      const closest = findClosestEdge(raycaster.ray, availableEdges, 0.3)
      setHoveredEdge(closest)
    },
    [availableEdges, camera]
  )

  // Handle click to select edge
  const handlePointerClick = useCallback(() => {
    if (hoveredEdge) {
      setSelectedEdge(hoveredEdge)
    }
  }, [hoveredEdge])

  // Cleanup
  useEffect(() => {
    if (availableEdges.length === 0) {
      setSelectedEdge(null)
      setHoveredEdge(null)
    }
  }, [availableEdges])

  return {
    availableEdges,
    selectedEdge,
    hoveredEdge,
    selectEdge: setSelectedEdge,
    clearSelection: () => setSelectedEdge(null),
    handlePointerMove,
    handlePointerClick,
  }
}
