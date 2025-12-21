/**
 * Toolbar Components
 *
 * Reusable components for the ViewportToolbar.
 */

export { MenuToolButton, type MenuToolButtonProps } from "./MenuToolButton"
export { ToolButton, type ToolButtonProps } from "./ToolButton"
export { useContainerWidth } from "./use-container-width"
export { ViewButton, type ViewButtonProps } from "./ViewButton"

// Responsive breakpoints for hiding toolbar groups (in pixels)
export const TOOLBAR_BREAKPOINTS = {
  SHOW_ALL: 700, // Show everything
  HIDE_CAMERA: 580, // Hide camera views - also hides undo/redo, export, settings
  HIDE_VIEW_MODE: 480, // Hide view mode buttons
  HIDE_SNAP: 380, // Hide snap/grid
  MINIMUM: 200, // Minimum - only transform + overflow
} as const
