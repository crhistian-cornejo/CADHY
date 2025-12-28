/**
 * @fileoverview Window icons - icons for window controls
 * @module lib/icons/IC_window
 */

import { MinusSignIcon, SquareIcon } from "@hugeicons/core-free-icons"

// Re-export Cancel01Icon from actions for window close
export { Cancel01Icon } from "./IC_actions"

/**
 * Window control icons
 */
export const WindowIcons = {
  minimize: MinusSignIcon,
  maximize: SquareIcon,
} as const

// Named exports for direct imports
export { MinusSignIcon, SquareIcon }
