/**
 * Measurement Tools Tests - @cadhy/desktop
 *
 * Tests for the measurement utilities including:
 * - Distance measurement
 * - Area measurement
 * - Volume measurement
 * - Angle measurement
 * - Visual creation and cleanup
 */

import { beforeEach, describe, expect, test } from "bun:test"
import * as THREE from "three"

// Note: @cadhy/shared is mocked globally in setup.ts
// Note: material-pool uses the real implementation (loggers are mocked)

import { MeasurementTools } from "../services/measurement-tools"

describe("Measurement Tools", () => {
  let measurementTools: MeasurementTools

  beforeEach(() => {
    measurementTools = new MeasurementTools()
  })

  // ============================================================
  // Distance Measurement Tests
  // ============================================================

  describe("Distance Measurement", () => {
    test("should measure distance between two points", () => {
      const pointA = new THREE.Vector3(0, 0, 0)
      const pointB = new THREE.Vector3(3, 4, 0) // Distance = 5 (3-4-5 triangle)

      const result = measurementTools.measureDistance(pointA, pointB)

      expect(result.value).toBeCloseTo(5, 5)
      expect(result.unit).toBe("m")
    })

    test("should measure distance in 3D", () => {
      const pointA = new THREE.Vector3(0, 0, 0)
      const pointB = new THREE.Vector3(1, 1, 1)

      const result = measurementTools.measureDistance(pointA, pointB)

      expect(result.value).toBeCloseTo(Math.sqrt(3), 5)
    })

    test("should return zero for same points", () => {
      const point = new THREE.Vector3(5, 5, 5)

      const result = measurementTools.measureDistance(point, point.clone())

      expect(result.value).toBe(0)
    })

    test("should create visual representation", () => {
      const pointA = new THREE.Vector3(0, 0, 0)
      const pointB = new THREE.Vector3(1, 0, 0)

      const result = measurementTools.measureDistance(pointA, pointB)

      expect(result.visual).not.toBeNull()
      expect(result.visual).toBeInstanceOf(THREE.Group)
    })

    test("should add measurement to group", () => {
      const pointA = new THREE.Vector3(0, 0, 0)
      const pointB = new THREE.Vector3(1, 0, 0)

      measurementTools.measureDistance(pointA, pointB)

      const group = measurementTools.getMeasurementsGroup()
      expect(group.children.length).toBe(1)
    })
  })

  // ============================================================
  // Area Measurement Tests
  // ============================================================

  describe("Area Measurement", () => {
    test("should measure area of square", () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 0, 0),
        new THREE.Vector3(2, 0, 2),
        new THREE.Vector3(0, 0, 2),
      ]

      const result = measurementTools.measureArea(points)

      expect(result.value).toBeCloseTo(4, 5) // 2x2 = 4
      expect(result.unit).toBe("m²")
    })

    test("should measure area of triangle", () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(4, 0, 0),
        new THREE.Vector3(0, 0, 3),
      ]

      const result = measurementTools.measureArea(points)

      expect(result.value).toBeCloseTo(6, 5) // (4*3)/2 = 6
    })

    test("should measure area of rectangle", () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(5, 0, 0),
        new THREE.Vector3(5, 0, 3),
        new THREE.Vector3(0, 0, 3),
      ]

      const result = measurementTools.measureArea(points)

      expect(result.value).toBeCloseTo(15, 5) // 5*3 = 15
    })

    test("should throw error for less than 3 points", () => {
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]

      expect(() => measurementTools.measureArea(points)).toThrow(
        "Area measurement requires at least 3 points"
      )
    })

    test("should create visual representation", () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(1, 0, 1),
      ]

      const result = measurementTools.measureArea(points)

      expect(result.visual).not.toBeNull()
      expect(result.visual).toBeInstanceOf(THREE.Group)
    })
  })

  // ============================================================
  // Volume Measurement Tests
  // ============================================================

  describe("Volume Measurement", () => {
    test("should measure volume of cube", () => {
      const min = new THREE.Vector3(0, 0, 0)
      const max = new THREE.Vector3(2, 2, 2)

      const result = measurementTools.measureVolume(min, max)

      expect(result.value).toBeCloseTo(8, 5) // 2*2*2 = 8
      expect(result.unit).toBe("m³")
    })

    test("should measure volume of rectangular box", () => {
      const min = new THREE.Vector3(0, 0, 0)
      const max = new THREE.Vector3(3, 4, 5)

      const result = measurementTools.measureVolume(min, max)

      expect(result.value).toBeCloseTo(60, 5) // 3*4*5 = 60
    })

    test("should handle negative coordinates", () => {
      const min = new THREE.Vector3(-1, -1, -1)
      const max = new THREE.Vector3(1, 1, 1)

      const result = measurementTools.measureVolume(min, max)

      expect(result.value).toBeCloseTo(8, 5) // 2*2*2 = 8
    })

    test("should create visual representation", () => {
      const min = new THREE.Vector3(0, 0, 0)
      const max = new THREE.Vector3(1, 1, 1)

      const result = measurementTools.measureVolume(min, max)

      expect(result.visual).not.toBeNull()
      expect(result.visual).toBeInstanceOf(THREE.Mesh)
    })
  })

  // ============================================================
  // Angle Measurement Tests
  // ============================================================

  describe("Angle Measurement", () => {
    test("should measure right angle (90 degrees)", () => {
      const pointA = new THREE.Vector3(1, 0, 0)
      const pointB = new THREE.Vector3(0, 0, 0) // Vertex
      const pointC = new THREE.Vector3(0, 1, 0)

      const result = measurementTools.measureAngle(pointA, pointB, pointC)

      expect(result.value).toBeCloseTo(90, 1)
      expect(result.unit).toBe("°")
    })

    test("should measure acute angle (45 degrees)", () => {
      const pointA = new THREE.Vector3(1, 0, 0)
      const pointB = new THREE.Vector3(0, 0, 0) // Vertex
      const pointC = new THREE.Vector3(1, 1, 0).normalize() // 45 degree direction

      const result = measurementTools.measureAngle(pointA, pointB, pointC)

      expect(result.value).toBeCloseTo(45, 0)
    })

    test("should measure straight angle (180 degrees)", () => {
      const pointA = new THREE.Vector3(1, 0, 0)
      const pointB = new THREE.Vector3(0, 0, 0) // Vertex
      const pointC = new THREE.Vector3(-1, 0, 0)

      const result = measurementTools.measureAngle(pointA, pointB, pointC)

      expect(result.value).toBeCloseTo(180, 1)
    })

    test("should measure zero angle", () => {
      const pointA = new THREE.Vector3(1, 0, 0)
      const pointB = new THREE.Vector3(0, 0, 0) // Vertex
      const pointC = new THREE.Vector3(2, 0, 0) // Same direction

      const result = measurementTools.measureAngle(pointA, pointB, pointC)

      expect(result.value).toBeCloseTo(0, 1)
    })

    test("should create visual representation", () => {
      const pointA = new THREE.Vector3(1, 0, 0)
      const pointB = new THREE.Vector3(0, 0, 0)
      const pointC = new THREE.Vector3(0, 1, 0)

      const result = measurementTools.measureAngle(pointA, pointB, pointC)

      expect(result.visual).not.toBeNull()
      expect(result.visual).toBeInstanceOf(THREE.Group)
    })
  })

  // ============================================================
  // Measurements Group Tests
  // ============================================================

  describe("Measurements Group", () => {
    test("should return measurements group", () => {
      const group = measurementTools.getMeasurementsGroup()

      expect(group).toBeInstanceOf(THREE.Group)
      expect(group.name).toBe("Measurements")
    })

    test("should accumulate measurements", () => {
      measurementTools.measureDistance(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0))

      measurementTools.measureDistance(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))

      const group = measurementTools.getMeasurementsGroup()
      expect(group.children.length).toBe(2)
    })
  })

  // ============================================================
  // Cleanup Tests
  // ============================================================

  describe("Cleanup", () => {
    test("should clear all measurements", () => {
      measurementTools.measureDistance(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0))

      measurementTools.measureDistance(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))

      measurementTools.clearAll()

      const group = measurementTools.getMeasurementsGroup()
      expect(group.children.length).toBe(0)
    })

    test("should remove specific measurement", () => {
      const result1 = measurementTools.measureDistance(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0)
      )

      measurementTools.measureDistance(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))

      measurementTools.remove(result1.visual!)

      const group = measurementTools.getMeasurementsGroup()
      expect(group.children.length).toBe(1)
    })
  })

  // ============================================================
  // Edge Cases Tests
  // ============================================================

  describe("Edge Cases", () => {
    test("should handle very small distances", () => {
      const pointA = new THREE.Vector3(0, 0, 0)
      const pointB = new THREE.Vector3(0.001, 0, 0)

      const result = measurementTools.measureDistance(pointA, pointB)

      expect(result.value).toBeCloseTo(0.001, 6)
    })

    test("should handle very large distances", () => {
      const pointA = new THREE.Vector3(0, 0, 0)
      const pointB = new THREE.Vector3(1000000, 0, 0)

      const result = measurementTools.measureDistance(pointA, pointB)

      expect(result.value).toBe(1000000)
    })

    test("should handle polygon with colinear points", () => {
      // A very thin triangle
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
        new THREE.Vector3(5, 0, 0.001),
      ]

      const result = measurementTools.measureArea(points)

      expect(result.value).toBeCloseTo(0.005, 5) // Very small area
    })
  })
})
