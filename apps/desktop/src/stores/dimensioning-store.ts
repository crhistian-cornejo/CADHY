/**
 * Dimensioning Store - CADHY
 *
 * Shared store for dimensioning tool state
 */

import { create } from "zustand"
import type { DimensionTool } from "@/components/modeller/panels/DrawingToolsPanel"

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
