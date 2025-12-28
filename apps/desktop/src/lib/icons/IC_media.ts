/**
 * @fileoverview Media icons - icons for media controls and camera
 * @module lib/icons/IC_media
 */

import { Camera01Icon, PauseIcon, PlayIcon, StopIcon } from "@hugeicons/core-free-icons"

/**
 * Media control and camera icons
 */
export const MediaIcons = {
  // Playback
  play: PlayIcon,
  pause: PauseIcon,
  stop: StopIcon,

  // Camera
  camera: Camera01Icon,
} as const

// Named exports for direct imports
export { Camera01Icon, PauseIcon, PlayIcon, StopIcon }
