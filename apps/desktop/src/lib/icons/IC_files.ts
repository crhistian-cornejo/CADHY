/**
 * @fileoverview File icons - icons for files and folders
 * @module lib/icons/IC_files
 */

import { File01Icon, FolderOpenIcon } from "@hugeicons/core-free-icons"

/**
 * File and folder icons
 */
export const FileIcons = {
  file: File01Icon,
  folderOpen: FolderOpenIcon,
} as const

// Named exports for direct imports
export { File01Icon, FolderOpenIcon }
