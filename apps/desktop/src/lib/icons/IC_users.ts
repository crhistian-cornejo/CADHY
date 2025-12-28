/**
 * @fileoverview User icons - icons for users and communication
 * @module lib/icons/IC_users
 */

import { Mail01Icon, UserIcon } from "@hugeicons/core-free-icons"

/**
 * User and communication icons
 */
export const UserIcons = {
  user: UserIcon,
  mail: Mail01Icon,
} as const

// Named exports for direct imports
export { Mail01Icon, UserIcon }
