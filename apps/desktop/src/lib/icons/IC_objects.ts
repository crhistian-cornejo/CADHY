/**
 * @fileoverview Object icons - icons for scene objects and 3D elements
 * @module lib/icons/IC_objects
 */

import {
  CubeIcon,
  DrawingModeIcon,
  GridIcon,
  Layers01Icon,
  WaterEnergyIcon,
  WaterfallDown01Icon,
} from "@hugeicons/core-free-icons"

/**
 * Object type icons for 3D elements and scene objects
 */
export const ObjectIcons = {
  // Primitives
  cube: CubeIcon,
  grid: GridIcon,

  // Organization
  layers: Layers01Icon,
  drawing: DrawingModeIcon,

  // Hydraulic
  water: WaterEnergyIcon,
  waterfall: WaterfallDown01Icon,
} as const

// Named exports for direct imports
export { CubeIcon, DrawingModeIcon, GridIcon, Layers01Icon, WaterEnergyIcon, WaterfallDown01Icon }
