/**
 * Topology Slice - CADHY
 *
 * Manages B-Rep topology data and topological selection state.
 */

import type { StateCreator } from "zustand"
import type { EdgeTessellation, FaceInfo, TopologyData, VertexInfo } from "@/services/cad-service"
import type { ModellerStore } from "./store-types"

// ============================================================================
// TYPES
// ============================================================================

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

export interface TopologySlice {
  // State
  /** Current topology data for the selected shape */
  currentTopology: TopologyData | null
  /** Currently selected topological element */
  selectedTopologyElement: SelectedTopologyElement | null
  /** Currently hovered topological element */
  hoveredTopologyElement: SelectedTopologyElement | null

  // Actions
  /** Set the current topology data */
  setCurrentTopology: (topology: TopologyData | null) => void
  /** Select a topological element */
  selectTopologyElement: (element: SelectedTopologyElement | null) => void
  /** Set hovered topological element */
  setHoveredTopologyElement: (element: SelectedTopologyElement | null) => void
  /** Clear topology selection */
  clearTopologySelection: () => void
  /** Clear all topology data */
  clearTopology: () => void
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createTopologySlice: StateCreator<ModellerStore, [], [], TopologySlice> = (set) => ({
  // State
  currentTopology: null,
  selectedTopologyElement: null,
  hoveredTopologyElement: null,

  // Actions
  setCurrentTopology: (topology) => set({ currentTopology: topology }),

  selectTopologyElement: (element) => set({ selectedTopologyElement: element }),

  setHoveredTopologyElement: (element) => set({ hoveredTopologyElement: element }),

  clearTopologySelection: () =>
    set({
      selectedTopologyElement: null,
      hoveredTopologyElement: null,
    }),

  clearTopology: () =>
    set({
      currentTopology: null,
      selectedTopologyElement: null,
      hoveredTopologyElement: null,
    }),
})
