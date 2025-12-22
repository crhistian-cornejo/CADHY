/**
 * Snap Manager Tests - @cadhy/desktop
 *
 * Tests for the smart snapping system including:
 * - Snap configuration
 * - Grid snapping
 * - Vertex snapping
 * - Edge snapping
 * - Center snapping
 * - Snap point finding
 */

import { beforeEach, describe, expect, test } from "bun:test"
import * as THREE from "three"

// Note: @cadhy/shared is mocked globally in setup.ts
// Note: material-pool uses the real implementation (loggers are mocked)

import { DEFAULT_SNAP_CONFIG, SnapManager } from "../services/snap-manager"

describe("Snap Manager", () => {
  let snapManager: SnapManager

  beforeEach(() => {
    snapManager = new SnapManager()
  })

  // ============================================================
  // Default Configuration Tests
  // ============================================================

  describe("Default Configuration", () => {
    test("should have correct default config values", () => {
      expect(DEFAULT_SNAP_CONFIG.enabled).toBe(true)
      expect(DEFAULT_SNAP_CONFIG.distance).toBe(0.5)
      expect(DEFAULT_SNAP_CONFIG.snapToVertices).toBe(true)
      expect(DEFAULT_SNAP_CONFIG.snapToEdges).toBe(true)
      expect(DEFAULT_SNAP_CONFIG.snapToFaces).toBe(false)
      expect(DEFAULT_SNAP_CONFIG.snapToGrid).toBe(true)
      expect(DEFAULT_SNAP_CONFIG.snapToCenters).toBe(true)
      expect(DEFAULT_SNAP_CONFIG.gridSize).toBe(0.5)
    })

    test("should initialize with default config", () => {
      const config = snapManager.getConfig()

      expect(config.enabled).toBe(true)
      expect(config.distance).toBe(0.5)
      expect(config.gridSize).toBe(0.5)
    })
  })

  // ============================================================
  // Configuration Update Tests
  // ============================================================

  describe("Configuration Updates", () => {
    test("should update partial config", () => {
      snapManager.setConfig({ distance: 1.0, gridSize: 1.0 })

      const config = snapManager.getConfig()
      expect(config.distance).toBe(1.0)
      expect(config.gridSize).toBe(1.0)
      expect(config.enabled).toBe(true) // Should preserve other values
    })

    test("should disable snapping", () => {
      snapManager.setConfig({ enabled: false })

      const config = snapManager.getConfig()
      expect(config.enabled).toBe(false)
    })

    test("should toggle individual snap types", () => {
      snapManager.setConfig({
        snapToVertices: false,
        snapToEdges: false,
        snapToGrid: false,
      })

      const config = snapManager.getConfig()
      expect(config.snapToVertices).toBe(false)
      expect(config.snapToEdges).toBe(false)
      expect(config.snapToGrid).toBe(false)
      expect(config.snapToCenters).toBe(true) // Unchanged
    })
  })

  // ============================================================
  // Grid Snapping Tests (Internal method tested via findSnapPoint)
  // ============================================================

  describe("Grid Snapping", () => {
    test("should not find snap point when disabled", () => {
      snapManager.setConfig({ enabled: false })
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera()
      const position = new THREE.Vector3(0.3, 0.3, 0.3)

      const result = snapManager.findSnapPoint(position, scene, camera)

      expect(result).toBeNull()
    })

    test("should find grid snap point when close", () => {
      // Disable all except grid snapping
      snapManager.setConfig({
        snapToVertices: false,
        snapToEdges: false,
        snapToCenters: false,
        snapToGrid: true,
        gridSize: 1.0,
        distance: 0.6,
      })

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera()
      const position = new THREE.Vector3(0.3, 0.3, 0.3) // Close to (0,0,0)

      const result = snapManager.findSnapPoint(position, scene, camera)

      expect(result).not.toBeNull()
      expect(result?.type).toBe("grid")
      expect(result?.position.x).toBe(0)
      expect(result?.position.y).toBe(0)
      expect(result?.position.z).toBe(0)
    })

    test("should snap to nearest grid point", () => {
      snapManager.setConfig({
        snapToVertices: false,
        snapToEdges: false,
        snapToCenters: false,
        snapToGrid: true,
        gridSize: 0.5,
        distance: 1.0,
      })

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera()
      const position = new THREE.Vector3(0.8, 1.3, 2.1)

      const result = snapManager.findSnapPoint(position, scene, camera)

      expect(result).not.toBeNull()
      expect(result?.position.x).toBe(1.0)
      expect(result?.position.y).toBe(1.5)
      expect(result?.position.z).toBe(2.0)
    })
  })

  // ============================================================
  // Vertex Snapping Tests
  // ============================================================

  describe("Vertex Snapping", () => {
    test("should find vertex snap point on mesh", () => {
      snapManager.setConfig({
        snapToVertices: true,
        snapToEdges: false,
        snapToCenters: false,
        snapToGrid: false,
        distance: 1.0,
      })

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera()

      // Create a simple box mesh
      const geometry = new THREE.BoxGeometry(2, 2, 2)
      const material = new THREE.MeshBasicMaterial()
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      // Position close to a vertex (box corner at 1,1,1)
      const position = new THREE.Vector3(0.9, 0.9, 0.9)

      const result = snapManager.findSnapPoint(position, scene, camera)

      expect(result).not.toBeNull()
      expect(result?.type).toBe("vertex")
    })
  })

  // ============================================================
  // Center Snapping Tests
  // ============================================================

  describe("Center Snapping", () => {
    test("should find center snap point on mesh", () => {
      snapManager.setConfig({
        snapToVertices: false,
        snapToEdges: false,
        snapToCenters: true,
        snapToGrid: false,
        distance: 1.0,
      })

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera()

      // Create a mesh at position (5, 5, 5)
      const geometry = new THREE.BoxGeometry(2, 2, 2)
      const material = new THREE.MeshBasicMaterial()
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(5, 5, 5)
      mesh.updateMatrixWorld()
      scene.add(mesh)

      // Position close to center
      const position = new THREE.Vector3(5.2, 4.9, 5.1)

      const result = snapManager.findSnapPoint(position, scene, camera)

      expect(result).not.toBeNull()
      expect(result?.type).toBe("center")
      expect(result?.position.x).toBeCloseTo(5, 1)
      expect(result?.position.y).toBeCloseTo(5, 1)
      expect(result?.position.z).toBeCloseTo(5, 1)
    })
  })

  // ============================================================
  // Exclusion Tests
  // ============================================================

  describe("Object Exclusion", () => {
    test("should exclude specified objects from snapping", () => {
      snapManager.setConfig({
        snapToVertices: false,
        snapToEdges: false,
        snapToCenters: true,
        snapToGrid: false,
        distance: 1.0,
      })

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera()

      // Create a mesh
      const geometry = new THREE.BoxGeometry(2, 2, 2)
      const material = new THREE.MeshBasicMaterial()
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      // Position close to center
      const position = new THREE.Vector3(0.2, 0.1, 0.15)

      // Exclude the mesh
      const result = snapManager.findSnapPoint(position, scene, camera, [mesh])

      expect(result).toBeNull()
    })
  })

  // ============================================================
  // Priority Tests
  // ============================================================

  describe("Snap Priority", () => {
    test("should return closest snap point when multiple candidates exist", () => {
      snapManager.setConfig({
        snapToVertices: true,
        snapToEdges: false,
        snapToCenters: true,
        snapToGrid: true,
        gridSize: 0.5,
        distance: 2.0,
      })

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera()

      // Create a mesh at origin
      const geometry = new THREE.BoxGeometry(2, 2, 2)
      const material = new THREE.MeshBasicMaterial()
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      // Position that could snap to multiple points
      const position = new THREE.Vector3(0.1, 0.1, 0.1)

      const result = snapManager.findSnapPoint(position, scene, camera)

      expect(result).not.toBeNull()
      // Should return the closest snap point
      expect(result?.distance).toBeLessThan(2.0)
    })
  })

  // ============================================================
  // Snap Indicator Tests
  // ============================================================

  describe("Snap Indicator", () => {
    test("should show snap indicator at position", () => {
      const scene = new THREE.Scene()
      const position = new THREE.Vector3(1, 2, 3)

      snapManager.showSnapIndicator(position, scene)

      // Should add indicator to scene
      expect(scene.children.length).toBeGreaterThan(0)
    })

    test("should hide snap indicator", () => {
      const scene = new THREE.Scene()
      const position = new THREE.Vector3(1, 2, 3)

      snapManager.showSnapIndicator(position, scene)
      snapManager.hideSnapIndicator()

      // Indicator should still be in scene but not visible
      // This is a basic test - the indicator is made invisible
    })
  })

  // ============================================================
  // Config Immutability Tests
  // ============================================================

  describe("Config Immutability", () => {
    test("should return a copy of config, not the original", () => {
      const config1 = snapManager.getConfig()
      const config2 = snapManager.getConfig()

      config1.distance = 999

      expect(config2.distance).not.toBe(999)
    })
  })
})
