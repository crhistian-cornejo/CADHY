/**
 * TopologicalWireframe Component - CADHY
 *
 * Renders B-Rep topology wireframe for topological selection.
 * Displays real edges from OpenCASCADE, not mesh triangulation.
 */

import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { TopologyData } from "@/services/cad-service"

export interface TopologicalWireframeProps {
  /** Topology data from OpenCASCADE */
  topology: TopologyData | null
  /** Object transform */
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  /** Edge color */
  color?: string
  /** Edge thickness */
  lineWidth?: number
  /** Selected edge indices */
  selectedEdges?: number[]
  /** Hovered edge index */
  hoveredEdge?: number | null
  /** Callback when edge is clicked */
  onEdgeClick?: (edgeIndex: number) => void
  /** Callback when edge is hovered */
  onEdgeHover?: (edgeIndex: number | null) => void
  /** Whether to show edges */
  visible?: boolean
}

/**
 * Renders topological wireframe from B-Rep edges
 */
export function TopologicalWireframe({
  topology,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  color = "#2dd4bf",
  lineWidth = 2,
  selectedEdges = [],
  hoveredEdge = null,
  onEdgeClick,
  onEdgeHover,
  visible = true,
}: TopologicalWireframeProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Convert topology edges to Three.js line segments
  const edgeGeometries = useMemo(() => {
    if (!topology) return []

    return topology.edges
      .map((edge) => {
        if (edge.is_degenerated || edge.points.length < 2) {
          return null
        }

        // Create BufferGeometry for this edge
        const positions: number[] = []
        for (const point of edge.points) {
          positions.push(point.x, point.y, point.z)
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))

        return {
          index: edge.index,
          geometry,
          curveType: edge.curve_type,
          length: edge.length,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [topology])

  // Create line materials with different colors for states
  // NOTE: LineBasicMaterial linewidth is clamped to 1 on most platforms
  // For thick lines, we'd need to use Line2/LineMaterial from three/examples
  const normalMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        linewidth: 2,
        transparent: true,
        opacity: 0.6,
        depthTest: true,
        depthWrite: false,
      }),
    [color]
  )

  const hoveredMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#ff6b00"), // Bright orange for hover
        linewidth: 3,
        transparent: true,
        opacity: 1,
        depthTest: false, // Render on top when hovered
        depthWrite: false,
      }),
    []
  )

  const selectedMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#00d4ff"), // Cyan for selection
        linewidth: 3,
        transparent: true,
        opacity: 1,
        depthTest: false, // Render on top when selected
        depthWrite: false,
      }),
    []
  )

  // Cleanup geometries on unmount
  useEffect(() => {
    return () => {
      for (const item of edgeGeometries) {
        item.geometry.dispose()
      }
      normalMaterial.dispose()
      hoveredMaterial.dispose()
      selectedMaterial.dispose()
    }
  }, [edgeGeometries, normalMaterial, hoveredMaterial, selectedMaterial])

  // Handle pointer events for edge selection
  const handlePointerMove = (event: THREE.Event) => {
    if (!onEdgeHover) return

    const intersect = event as unknown as { object: THREE.Line }
    if (intersect.object && intersect.object.userData?.edgeIndex !== undefined) {
      onEdgeHover(intersect.object.userData.edgeIndex as number)
    }
  }

  const handlePointerOut = () => {
    if (onEdgeHover) {
      onEdgeHover(null)
    }
  }

  const handleClick = (event: THREE.Event) => {
    if (!onEdgeClick) return

    const intersect = event as unknown as { object: THREE.Line }
    if (intersect.object && intersect.object.userData?.edgeIndex !== undefined) {
      onEdgeClick(intersect.object.userData.edgeIndex as number)
      event.stopPropagation()
    }
  }

  if (!topology || !visible) {
    return null
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {edgeGeometries.map((item) => {
        const isSelected = selectedEdges.includes(item.index)
        const isHovered = hoveredEdge === item.index

        // Choose material based on state
        let material = normalMaterial
        let renderOrder = 1 // Normal edges render above mesh

        if (isHovered) {
          material = hoveredMaterial
          renderOrder = 999 // Hovered edges render on top of everything
        } else if (isSelected) {
          material = selectedMaterial
          renderOrder = 998 // Selected edges render below hovered but above normal
        }

        return (
          <line
            key={item.index}
            geometry={item.geometry}
            material={material}
            renderOrder={renderOrder}
            userData={{ edgeIndex: item.index, curveType: item.curveType }}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          />
        )
      })}
    </group>
  )
}
