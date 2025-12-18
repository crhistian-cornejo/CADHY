/**
 * Viewport3D Component - Re-export
 *
 * This file re-exports from the refactored viewport module.
 * The component has been split into smaller, maintainable files:
 *
 * - viewport/Viewport3D.tsx - Main Canvas wrapper
 * - viewport/SceneContent.tsx - Scene elements (camera, controls, objects)
 * - viewport/meshes/ChannelMesh.tsx - Channel rendering
 * - viewport/meshes/TransitionMesh.tsx - Transition rendering
 * - viewport/meshes/SceneObjectMesh.tsx - Object router
 * - viewport/geometry-utils.ts - Coordinate conversion utilities
 */

// Re-export from refactored module
import { Viewport3D } from "./viewport"

export { Viewport3D, type Viewport3DProps } from "./viewport"
export default Viewport3D
