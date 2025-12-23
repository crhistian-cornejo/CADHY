/**
 * Topological Selection Hook - CADHY
 *
 * Manages interactive selection of topological elements (vertices, edges, faces).
 * Uses B-Rep topology from OpenCASCADE for accurate CAD operations.
 */

import { useThree } from "@react-three/fiber"
import { useCallback, useEffect, useState } from "react"
import * as THREE from "three"
import type { EdgeTessellation, FaceInfo, TopologyData, VertexInfo } from "@/services/cad-service"
import type { SelectionMode } from "@/stores/modeller"

export interface SelectedEdge extends EdgeTessellation {
  /** Type discriminator */
  type: "edge"
}

export interface SelectedFace extends FaceInfo {
  /** Type discriminator */
  type: "face"
}

export interface SelectedVertex extends VertexInfo {
  /** Type discriminator */
  type: "vertex"
}

export type SelectedTopologyElement = SelectedEdge | SelectedFace | SelectedVertex

export interface UseTopologicalSelectionOptions {
  /** Topology data */
  topology: TopologyData | null
  /** Selection mode */
  selectionMode: SelectionMode
  /** Object transform */
  objectTransform?: THREE.Matrix4
  /** Enable selection */
  enabled?: boolean
}

export interface UseTopologicalSelectionReturn {
  /** Currently selected element */
  selectedElement: SelectedTopologyElement | null
  /** Currently hovered element */
  hoveredElement: SelectedTopologyElement | null
  /** Select an element by index */
  selectElement: (element: SelectedTopologyElement | null) => void
  /** Clear selection */
  clearSelection: () => void
  /** Event handlers */
  handlePointerMove: (event: PointerEvent) => void
  handlePointerClick: (event: PointerEvent) => void
}

/**
 * Hook for topological selection (edges, faces, vertices)
 */
export function useTopologicalSelection({
  topology,
  selectionMode,
  objectTransform,
  enabled = true,
}: UseTopologicalSelectionOptions): UseTopologicalSelectionReturn {
  const { camera, gl } = useThree()
  const [selectedElement, setSelectedElement] = useState<SelectedTopologyElement | null>(null)
  const [hoveredElement, setHoveredElement] = useState<SelectedTopologyElement | null>(null)

  // Find closest edge to a ray
  const findClosestEdge = useCallback(
    (ray: THREE.Ray, maxDistance = 0.3): SelectedEdge | null => {
      if (!topology) return null

      let closest: SelectedEdge | null = null
      let minDistance = maxDistance

      for (const edge of topology.edges) {
        if (edge.is_degenerated || edge.points.length < 2) continue

        // Check each segment of the edge
        for (let i = 0; i < edge.points.length - 1; i++) {
          const p1 = new THREE.Vector3(edge.points[i].x, edge.points[i].y, edge.points[i].z)
          const p2 = new THREE.Vector3(
            edge.points[i + 1].x,
            edge.points[i + 1].y,
            edge.points[i + 1].z
          )

          // Apply object transform if provided
          if (objectTransform) {
            p1.applyMatrix4(objectTransform)
            p2.applyMatrix4(objectTransform)
          }

          // Create line segment
          const line = new THREE.Line3(p1, p2)

          // Find closest points
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
            closest = { ...edge, type: "edge" }
          }
        }
      }

      return closest
    },
    [topology, objectTransform]
  )

  // Find closest vertex to a ray
  const findClosestVertex = useCallback(
    (ray: THREE.Ray, maxDistance = 0.5): SelectedVertex | null => {
      if (!topology) return null

      let closest: SelectedVertex | null = null
      let minDistance = maxDistance

      for (const vertex of topology.vertices) {
        const point = new THREE.Vector3(vertex.x, vertex.y, vertex.z)

        // Apply object transform if provided
        if (objectTransform) {
          point.applyMatrix4(objectTransform)
        }

        // Project onto ray
        const t = ray.direction.dot(point.clone().sub(ray.origin))
        if (t < 0) continue // Behind camera

        const closestPointOnRay = new THREE.Vector3()
          .copy(ray.origin)
          .addScaledVector(ray.direction, t)

        const distance = point.distanceTo(closestPointOnRay)

        if (distance < minDistance) {
          minDistance = distance
          closest = { ...vertex, type: "vertex" }
        }
      }

      return closest
    },
    [topology, objectTransform]
  )

  // Find closest face to a ray
  const findClosestFace = useCallback(
    (ray: THREE.Ray): SelectedFace | null => {
      if (!topology) return null

      // For faces, we check if the ray intersects the face center plane
      // This is a simplified approach - for production you'd want to check
      // if the ray actually hits the face geometry

      let closest: SelectedFace | null = null
      let minDistance = Number.POSITIVE_INFINITY

      for (const face of topology.faces) {
        const center = new THREE.Vector3(face.center[0], face.center[1], face.center[2])
        const normal = new THREE.Vector3(face.normal[0], face.normal[1], face.normal[2])

        // Apply object transform if provided
        if (objectTransform) {
          center.applyMatrix4(objectTransform)
          normal.transformDirection(objectTransform).normalize()
        }

        // Create a plane at the face center
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center)

        // Intersect ray with plane
        const intersection = new THREE.Vector3()
        if (ray.intersectPlane(plane, intersection)) {
          const distance = ray.origin.distanceTo(intersection)

          // Check if intersection is reasonably close to face center
          // (simplified check - in production you'd check if point is inside face boundary)
          const distanceToCenter = intersection.distanceTo(center)
          if (distanceToCenter < Math.sqrt(face.area) && distance < minDistance) {
            minDistance = distance
            closest = { ...face, type: "face" }
          }
        }
      }

      return closest
    },
    [topology, objectTransform]
  )

  // Handle pointer move for hover
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!enabled || !topology) {
        setHoveredElement(null)
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

      // Find element based on selection mode
      let element: SelectedTopologyElement | null = null

      switch (selectionMode) {
        case "edge":
          element = findClosestEdge(raycaster.ray)
          break
        case "vertex":
          element = findClosestVertex(raycaster.ray)
          break
        case "face":
          element = findClosestFace(raycaster.ray)
          break
        case "body":
          // Body mode doesn't use topological selection
          element = null
          break
      }

      setHoveredElement(element)
    },
    [enabled, topology, selectionMode, camera, findClosestEdge, findClosestVertex, findClosestFace]
  )

  // Handle click to select
  const handlePointerClick = useCallback(() => {
    if (hoveredElement) {
      setSelectedElement(hoveredElement)
    }
  }, [hoveredElement])

  // Clear selection when disabled or mode changes
  useEffect(() => {
    if (!enabled || selectionMode === "body") {
      setSelectedElement(null)
      setHoveredElement(null)
    }
  }, [enabled, selectionMode])

  return {
    selectedElement,
    hoveredElement,
    selectElement: setSelectedElement,
    clearSelection: () => setSelectedElement(null),
    handlePointerMove,
    handlePointerClick,
  }
}
