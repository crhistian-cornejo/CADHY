/**
 * Properties Panel Component - CADHY
 *
 * Re-export from the refactored properties module.
 * The panel has been split into smaller, maintainable components.
 *
 * @see ./properties/PropertiesPanel.tsx - Main orchestrator
 * @see ./properties/shared/ - Common building blocks
 * @see ./properties/sections/ - Generic sections (Transform, Geometry, etc.)
 * @see ./properties/panels/ - Object-specific panels (Channel, Transition, Chute)
 * @see ./properties/previews/ - SVG previews for hydraulic objects
 * @see ./properties/states/ - Selection states (NoSelection, MultipleSelection)
 */

export { default, PropertiesPanel } from "./properties/PropertiesPanel"
