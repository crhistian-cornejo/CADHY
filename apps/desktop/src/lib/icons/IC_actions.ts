/**
 * @fileoverview Action icons - icons for user actions (add, delete, confirm, etc.)
 * @module lib/icons/IC_actions
 */

import {
  Add01Icon,
  Cancel01Icon,
  Copy01Icon,
  Delete01Icon,
  Download04Icon,
  Edit01Icon,
  RefreshIcon,
  Tick01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"

/**
 * Action icons for user interactions
 */
export const ActionIcons = {
  // CRUD operations
  add: Add01Icon,
  delete: Delete01Icon,
  edit: Edit01Icon,
  copy: Copy01Icon,

  // Confirmation
  confirm: Tick01Icon,
  cancel: Cancel01Icon,

  // Transfer
  upload: Upload01Icon,
  download: Download04Icon,
  refresh: RefreshIcon,
} as const

// Named exports for direct imports
export {
  Add01Icon,
  Cancel01Icon,
  Copy01Icon,
  Delete01Icon,
  Download04Icon,
  Edit01Icon,
  RefreshIcon,
  Tick01Icon,
  Upload01Icon,
}
