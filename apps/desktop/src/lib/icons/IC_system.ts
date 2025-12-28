/**
 * @fileoverview System icons - icons for system and hardware
 * @module lib/icons/IC_system
 */

import { Analytics02Icon, ComputerIcon, CpuIcon } from "@hugeicons/core-free-icons"

/**
 * System and hardware icons
 */
export const SystemIcons = {
  computer: ComputerIcon,
  cpu: CpuIcon,
  analytics: Analytics02Icon,
} as const

// Named exports for direct imports
export { Analytics02Icon, ComputerIcon, CpuIcon }
