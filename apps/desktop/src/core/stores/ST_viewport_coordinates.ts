/**
 * Viewport Coordinates Store
 *
 * Manages the display coordinates shown in the StatusBar.
 * Follows Autodesk/CAD conventions:
 * - When no object is selected: Shows cursor position (3D world coordinates from raycasting)
 * - When object(s) selected: Shows centroid/center of bounding box
 *
 * This is a lightweight store separate from the main modeller store
 * to avoid re-renders of the entire scene on cursor movement.
 */

import { create } from "zustand"

export interface Vec3 {
  x: number
  y: number
  z: number
}

export type CoordinateSource = "cursor" | "selection" | "none"

interface ViewportCoordinatesState {
  /** Current displayed coordinates */
  coordinates: Vec3
  /** Source of the coordinates */
  source: CoordinateSource
  /** Whether the cursor is over the viewport */
  isOverViewport: boolean
}

interface ViewportCoordinatesActions {
  /** Update cursor position from raycasting */
  setCursorPosition: (position: Vec3) => void
  /** Update selection center from bounding box */
  setSelectionCenter: (center: Vec3) => void
  /** Clear coordinates (no selection, cursor outside viewport) */
  clearCoordinates: () => void
  /** Set viewport hover state */
  setIsOverViewport: (isOver: boolean) => void
}

type ViewportCoordinatesStore = ViewportCoordinatesState & ViewportCoordinatesActions

const INITIAL_COORDINATES: Vec3 = { x: 0, y: 0, z: 0 }

export const useViewportCoordinates = create<ViewportCoordinatesStore>((set) => ({
  // Initial state
  coordinates: INITIAL_COORDINATES,
  source: "none",
  isOverViewport: false,

  // Actions
  setCursorPosition: (position) =>
    set({
      coordinates: position,
      source: "cursor",
    }),

  setSelectionCenter: (center) =>
    set({
      coordinates: center,
      source: "selection",
    }),

  clearCoordinates: () =>
    set({
      coordinates: INITIAL_COORDINATES,
      source: "none",
    }),

  setIsOverViewport: (isOver) =>
    set({
      isOverViewport: isOver,
    }),
}))

// Selectors for optimized re-renders
export const useCoordinates = () => useViewportCoordinates((state) => state.coordinates)
export const useCoordinateSource = () => useViewportCoordinates((state) => state.source)
export const useIsOverViewport = () => useViewportCoordinates((state) => state.isOverViewport)
