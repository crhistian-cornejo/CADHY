/**
 * Topology Hook - CADHY
 *
 * Hook for managing B-Rep topology data from OpenCASCADE.
 * Loads and caches topology for shapes to enable topological selection.
 */

import { useEffect, useState } from "react"
import type { TopologyData } from "@/services/cad-service"
import * as cadService from "@/services/cad-service"

interface UseTopologyOptions {
  /** Backend shape ID to load topology from */
  backendShapeId: string | null
  /** Edge tessellation quality (smaller = more points, default 0.1) */
  edgeDeflection?: number
  /** Whether to load topology automatically */
  enabled?: boolean
}

interface UseTopologyReturn {
  /** Complete topology data */
  topology: TopologyData | null
  /** Loading state */
  isLoading: boolean
  /** Error message if topology failed to load */
  error: string | null
  /** Manually reload topology */
  reload: () => Promise<void>
}

/**
 * Hook to load and manage B-Rep topology data for a shape
 *
 * @example
 * ```tsx
 * const { topology, isLoading } = useTopology({
 *   backendShapeId: selectedObject.metadata?.backendShapeId,
 *   enabled: selectionMode === "edge",
 * })
 *
 * if (topology) {
 *   console.log("Shape has", topology.edges.length, "edges")
 * }
 * ```
 */
export function useTopology({
  backendShapeId,
  edgeDeflection = 0.1,
  enabled = true,
}: UseTopologyOptions): UseTopologyReturn {
  const [topology, setTopology] = useState<TopologyData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load topology from backend
  const loadTopology = async () => {
    if (!backendShapeId || !enabled) {
      setTopology(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await cadService.getTopology(backendShapeId, edgeDeflection)
      setTopology(data)
    } catch (err) {
      console.error("[useTopology] Failed to load topology:", err)
      setError(err instanceof Error ? err.message : String(err))
      setTopology(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Load topology when shape ID or settings change
  useEffect(() => {
    loadTopology()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendShapeId, edgeDeflection, enabled])

  return {
    topology,
    isLoading,
    error,
    reload: loadTopology,
  }
}

/**
 * Helper function to get edges connected to a vertex
 */
export function getEdgesForVertex(topology: TopologyData, vertexIndex: number): number[] {
  if (vertexIndex >= topology.vertex_to_edges_offset.length - 1) {
    return []
  }
  const start = topology.vertex_to_edges_offset[vertexIndex]
  const end = topology.vertex_to_edges_offset[vertexIndex + 1]
  return topology.vertex_to_edges.slice(start, end)
}

/**
 * Helper function to get faces adjacent to an edge
 */
export function getFacesForEdge(topology: TopologyData, edgeIndex: number): number[] {
  if (edgeIndex >= topology.edge_to_faces_offset.length - 1) {
    return []
  }
  const start = topology.edge_to_faces_offset[edgeIndex]
  const end = topology.edge_to_faces_offset[edgeIndex + 1]
  return topology.edge_to_faces.slice(start, end)
}
