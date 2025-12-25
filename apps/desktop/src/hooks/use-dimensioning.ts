/**
 * useDimensioning Hook - CADHY
 *
 * Hook for managing dimensioning state and interactions in 2D drawings
 */

import type { Dimension, Point2D } from "@cadhy/types"
import { useCallback, useState } from "react"
import type { DimensionTool } from "@/components/modeller/panels/DrawingToolsPanel"

export interface DimensioningState {
  activeTool: DimensionTool | null
  selectedPoints: Point2D[]
  previewDimension: Dimension | null
}

export function useDimensioning() {
  const [state, setState] = useState<DimensioningState>({
    activeTool: null,
    selectedPoints: [],
    previewDimension: null,
  })

  const setActiveTool = useCallback((tool: DimensionTool | null) => {
    setState({
      activeTool: tool,
      selectedPoints: [],
      previewDimension: null,
    })
  }, [])

  const addPoint = useCallback((point: Point2D) => {
    setState((prev) => ({
      ...prev,
      selectedPoints: [...prev.selectedPoints, point],
    }))
  }, [])

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedPoints: [],
      previewDimension: null,
    }))
  }, [])

  const setPreviewDimension = useCallback((dimension: Dimension | null) => {
    setState((prev) => ({
      ...prev,
      previewDimension: dimension,
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      activeTool: null,
      selectedPoints: [],
      previewDimension: null,
    })
  }, [])

  return {
    state,
    setActiveTool,
    addPoint,
    clearSelection,
    setPreviewDimension,
    reset,
  }
}
