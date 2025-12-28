/**
 * @fileoverview Tool icons - icons for tools and operations
 * @module lib/icons/IC_tools
 */

import {
  KeyboardIcon,
  Move01Icon,
  PaintBrush01Icon,
  PaintBrushIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"

/**
 * Tool icons for CAD and modeling operations
 */
export const ToolIcons = {
  // Transform
  move: Move01Icon,

  // Painting/Materials
  paintBrush: PaintBrushIcon,
  paintBrush01: PaintBrush01Icon,

  // System
  keyboard: KeyboardIcon,
  wrench: Wrench01Icon,
} as const

// Named exports for direct imports
export { KeyboardIcon, Move01Icon, PaintBrush01Icon, PaintBrushIcon, Wrench01Icon }
