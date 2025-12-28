/**
 * @fileoverview UI icons - icons for interface elements
 * @module lib/icons/IC_ui
 */

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ClockIcon,
  Home01Icon,
  InformationCircleIcon,
  LockIcon,
  MoreHorizontalIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"

/**
 * UI element icons for interface components
 */
export const UIIcons = {
  // Navigation
  arrowDown: ArrowDown01Icon,
  arrowRight: ArrowRight01Icon,
  home: Home01Icon,

  // Actions
  settings: Settings01Icon,
  more: MoreHorizontalIcon,

  // Information
  info: InformationCircleIcon,
  clock: ClockIcon,
  lock: LockIcon,
} as const

// Named exports for direct imports
export {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ClockIcon,
  Home01Icon,
  InformationCircleIcon,
  LockIcon,
  MoreHorizontalIcon,
  Settings01Icon,
}
