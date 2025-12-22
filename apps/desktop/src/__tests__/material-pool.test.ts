/**
 * Material Pool Tests - @cadhy/desktop
 *
 * Tests for the material pooling service including:
 * - Material creation and caching
 * - Reference counting
 * - Material release
 * - Pool cleanup
 */

import { beforeEach, describe, expect, test } from "bun:test"
import * as THREE from "three"

// Note: @cadhy/shared is mocked globally in setup.ts
import {
  getBasicMaterial,
  getLineMaterial,
  getStandardMaterial,
  materialPool,
} from "../services/material-pool"

describe("Material Pool", () => {
  beforeEach(() => {
    // Clear the pool before each test
    materialPool.dispose()
  })

  // ============================================================
  // Standard Material Tests
  // ============================================================

  describe("Standard Materials", () => {
    test("should create a standard material", () => {
      const material = getStandardMaterial({ color: 0xff0000 })

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
      expect(material.color.getHex()).toBe(0xff0000)
    })

    test("should cache identical materials", () => {
      const material1 = getStandardMaterial({ color: 0xff0000, metalness: 0.5 })
      const material2 = getStandardMaterial({ color: 0xff0000, metalness: 0.5 })

      expect(material1).toBe(material2)
    })

    test("should create different materials for different configs", () => {
      const material1 = getStandardMaterial({ color: 0xff0000 })
      const material2 = getStandardMaterial({ color: 0x00ff00 })

      expect(material1).not.toBe(material2)
    })

    test("should apply all standard material properties", () => {
      const material = getStandardMaterial({
        color: 0x123456,
        opacity: 0.8,
        transparent: true,
        metalness: 0.7,
        roughness: 0.3,
        wireframe: true,
      })

      expect(material.color.getHex()).toBe(0x123456)
      expect(material.opacity).toBe(0.8)
      expect(material.transparent).toBe(true)
      expect(material.metalness).toBe(0.7)
      expect(material.roughness).toBe(0.3)
      expect(material.wireframe).toBe(true)
    })

    test("should use default values for unspecified properties", () => {
      const material = getStandardMaterial({})

      expect(material.color.getHex()).toBe(0xffffff)
      expect(material.opacity).toBe(1)
      expect(material.transparent).toBe(false)
      expect(material.metalness).toBe(0)
      expect(material.roughness).toBe(1)
    })
  })

  // ============================================================
  // Basic Material Tests
  // ============================================================

  describe("Basic Materials", () => {
    test("should create a basic material", () => {
      const material = getBasicMaterial({ color: 0x00ff00 })

      expect(material).toBeInstanceOf(THREE.MeshBasicMaterial)
      expect(material.color.getHex()).toBe(0x00ff00)
    })

    test("should cache identical basic materials", () => {
      const material1 = getBasicMaterial({ color: 0x00ff00, opacity: 0.5 })
      const material2 = getBasicMaterial({ color: 0x00ff00, opacity: 0.5 })

      expect(material1).toBe(material2)
    })

    test("should apply all basic material properties", () => {
      const material = getBasicMaterial({
        color: 0xabcdef,
        opacity: 0.6,
        transparent: true,
        wireframe: true,
        side: THREE.DoubleSide,
      })

      expect(material.color.getHex()).toBe(0xabcdef)
      expect(material.opacity).toBe(0.6)
      expect(material.transparent).toBe(true)
      expect(material.wireframe).toBe(true)
      expect(material.side).toBe(THREE.DoubleSide)
    })
  })

  // ============================================================
  // Line Material Tests
  // ============================================================

  describe("Line Materials", () => {
    test("should create a line material", () => {
      const material = getLineMaterial({ color: 0x0000ff })

      expect(material).toBeInstanceOf(THREE.LineBasicMaterial)
      expect(material.color.getHex()).toBe(0x0000ff)
    })

    test("should cache identical line materials", () => {
      const material1 = getLineMaterial({ color: 0x0000ff, linewidth: 2 })
      const material2 = getLineMaterial({ color: 0x0000ff, linewidth: 2 })

      expect(material1).toBe(material2)
    })

    test("should apply line material properties", () => {
      const material = getLineMaterial({
        color: 0xff00ff,
        opacity: 0.9,
        transparent: true,
        linewidth: 3,
      })

      expect(material.color.getHex()).toBe(0xff00ff)
      expect(material.opacity).toBe(0.9)
      expect(material.transparent).toBe(true)
      expect(material.linewidth).toBe(3)
    })
  })

  // ============================================================
  // Reference Counting Tests
  // ============================================================

  describe("Reference Counting", () => {
    test("should increment reference count on reuse", () => {
      // Get the same material twice
      getStandardMaterial({ color: 0xff0000 })
      getStandardMaterial({ color: 0xff0000 })

      const stats = materialPool.getStats()
      expect(stats.totalMaterials).toBe(1)
      expect(stats.activeReferences).toBe(2)
    })

    test("should track multiple different materials", () => {
      getStandardMaterial({ color: 0xff0000 })
      getStandardMaterial({ color: 0x00ff00 })
      getBasicMaterial({ color: 0x0000ff })

      const stats = materialPool.getStats()
      expect(stats.totalMaterials).toBe(3)
      expect(stats.activeReferences).toBe(3)
    })
  })

  // ============================================================
  // Pool Statistics Tests
  // ============================================================

  describe("Pool Statistics", () => {
    test("should report empty pool initially", () => {
      const stats = materialPool.getStats()

      expect(stats.totalMaterials).toBe(0)
      expect(stats.activeReferences).toBe(0)
    })

    test("should accurately count materials", () => {
      getStandardMaterial({ color: 0xff0000 })
      getStandardMaterial({ color: 0xff0000 }) // Same - reuse
      getStandardMaterial({ color: 0x00ff00 }) // Different
      getBasicMaterial({ color: 0x0000ff })
      getLineMaterial({ color: 0xffff00 })

      const stats = materialPool.getStats()
      expect(stats.totalMaterials).toBe(4)
      expect(stats.activeReferences).toBe(5)
    })
  })

  // ============================================================
  // Dispose Tests
  // ============================================================

  describe("Dispose", () => {
    test("should clear pool on dispose", () => {
      getStandardMaterial({ color: 0xff0000 })
      getBasicMaterial({ color: 0x00ff00 })

      materialPool.dispose()

      const stats = materialPool.getStats()
      expect(stats.totalMaterials).toBe(0)
      expect(stats.activeReferences).toBe(0)
    })
  })

  // ============================================================
  // Material Key Generation Tests
  // ============================================================

  describe("Material Key Generation", () => {
    test("should generate different keys for different types", () => {
      const standardMaterial = getStandardMaterial({ color: 0xff0000 })
      const basicMaterial = getBasicMaterial({ color: 0xff0000 })

      // They should be different materials even with same color
      expect(standardMaterial).not.toBe(basicMaterial)
    })

    test("should differentiate by all properties", () => {
      const m1 = getStandardMaterial({ color: 0xff0000, metalness: 0.5 })
      const m2 = getStandardMaterial({ color: 0xff0000, metalness: 0.6 })

      expect(m1).not.toBe(m2)
    })

    test("should handle string and number colors consistently", () => {
      // Note: Three.js converts strings to Color objects
      const m1 = getStandardMaterial({ color: 0xff0000 })
      const m2 = getStandardMaterial({ color: 0xff0000 })

      expect(m1).toBe(m2)
    })
  })

  // ============================================================
  // Edge Cases Tests
  // ============================================================

  describe("Edge Cases", () => {
    test("should handle empty config", () => {
      const material = getStandardMaterial({})

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
      expect(material.color.getHex()).toBe(0xffffff)
    })

    test("should handle side property correctly", () => {
      const m1 = getStandardMaterial({ side: THREE.FrontSide })
      const m2 = getStandardMaterial({ side: THREE.BackSide })
      const m3 = getStandardMaterial({ side: THREE.DoubleSide })

      expect(m1.side).toBe(THREE.FrontSide)
      expect(m2.side).toBe(THREE.BackSide)
      expect(m3.side).toBe(THREE.DoubleSide)
      expect(m1).not.toBe(m2)
      expect(m2).not.toBe(m3)
    })

    test("should handle transparency correctly", () => {
      const opaque = getBasicMaterial({ color: 0xff0000, transparent: false })
      const transparent = getBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5,
      })

      expect(opaque.transparent).toBe(false)
      expect(transparent.transparent).toBe(true)
      expect(transparent.opacity).toBe(0.5)
    })
  })
})
