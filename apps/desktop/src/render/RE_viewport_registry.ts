/**
 * Viewport Registry - CADHY
 *
 * Module-level registry to share Three.js camera, scene, and renderer references
 * between components inside and outside the R3F Canvas.
 */

import type * as THREE from "three"

// Module-level storage for viewport references
let currentCamera: THREE.Camera | null = null
let currentScene: THREE.Scene | null = null
let currentRenderer: THREE.WebGLRenderer | null = null

/**
 * Register the current camera (called from SceneContent)
 */
export function registerCamera(camera: THREE.Camera | null): void {
  currentCamera = camera
}

/**
 * Get the current camera reference
 */
export function getCamera(): THREE.Camera | null {
  return currentCamera
}

/**
 * Register the current scene (called from SceneContent)
 */
export function registerScene(scene: THREE.Scene | null): void {
  currentScene = scene
}

/**
 * Get the current scene reference
 */
export function getScene(): THREE.Scene | null {
  return currentScene
}

/**
 * Register the current WebGL renderer (called from SceneContent)
 */
export function registerRenderer(renderer: THREE.WebGLRenderer | null): void {
  currentRenderer = renderer
}

/**
 * Get the current WebGL renderer reference
 */
export function getRenderer(): THREE.WebGLRenderer | null {
  return currentRenderer
}
