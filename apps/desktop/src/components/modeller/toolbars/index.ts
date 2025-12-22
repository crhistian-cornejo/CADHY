/**
 * Toolbar Components
 *
 * Reusable components for the ViewportToolbar.
 */

// Toolbar containers
export { default as CADToolbar } from "./CADToolbar"
export { default as Menubar } from "./Menubar"
// Toolbar buttons
export { MenuToolButton, type MenuToolButtonProps } from "./MenuToolButton"
export { ToolButton, type ToolButtonProps } from "./ToolButton"
// Utilities
export { useContainerWidth } from "./use-container-width"
export { default as VerticalToolbar } from "./VerticalToolbar"
export { ViewButton, type ViewButtonProps } from "./ViewButton"
export { default as ViewportBottomToolbar } from "./ViewportBottomToolbar"
export { default as ViewportToolbar } from "./ViewportToolbar"

// Responsive breakpoints for hiding toolbar groups (in pixels)
// Higher values = items hide sooner (more go to overflow menu)
export const TOOLBAR_BREAKPOINTS = {
  SHOW_ALL: 900, // Show everything (was 700)
  HIDE_CAMERA: 750, // Hide camera views - also hides undo/redo, export, settings (was 580)
  HIDE_VIEW_MODE: 600, // Hide view mode buttons (was 480)
  HIDE_SNAP: 480, // Hide snap/grid (was 380)
  MINIMUM: 300, // Minimum - only transform + overflow (was 200)
} as const
