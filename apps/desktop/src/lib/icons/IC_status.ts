/**
 * @fileoverview Status icons - icons for status indicators and alerts
 * @module lib/icons/IC_status
 */

import {
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  Rocket01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

/**
 * Status indicator icons for alerts and feedback
 */
export const StatusIcons = {
  // Alerts
  alert: AlertCircleIcon,
  success: CheckmarkCircle01Icon,

  // Features
  rocket: Rocket01Icon,
  sparkles: SparklesIcon,
} as const

// Named exports for direct imports
export { AlertCircleIcon, CheckmarkCircle01Icon, Rocket01Icon, SparklesIcon }
