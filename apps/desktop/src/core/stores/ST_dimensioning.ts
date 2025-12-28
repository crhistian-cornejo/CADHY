/**
 * Dimensioning Store - CADHY
 *
 * Shared store for dimensioning tool state
 */

import { create } from "zustand"
import type { DimensionTool } from "@/editors/space_view3d/panels/ED_view3d_draw_tools"

interface DimensioningStore {
  activeTool: DimensionTool | null
  setActiveTool: (tool: DimensionTool | null) => void

  // Selected dimension for editing/deletion
  selectedDimensionIndex: number | null
  setSelectedDimensionIndex: (index: number | null) => void
  clearSelection: () => void
}

export const useDimensioningStore = create<DimensioningStore>((set) => ({
  activeTool: null,
  setActiveTool: (tool) =>
    set({
      activeTool: tool,
      // Clear dimension selection when changing tools
      selectedDimensionIndex: null,
    }),

  selectedDimensionIndex: null,
  setSelectedDimensionIndex: (index) => set({ selectedDimensionIndex: index }),
  clearSelection: () => set({ selectedDimensionIndex: null }),
}))
