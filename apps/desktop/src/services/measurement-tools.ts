/**
 * Measurement Tools
 *
 * Provides measurement utilities for distance, area, volume, and angle.
 * Essential for design validation and quality control.
 *
 * Uses Material Pool for efficient material reuse.
 */

import * as THREE from "three"
import { getBasicMaterial, getLineMaterial } from "./material-pool"

export interface MeasurementResult {
  value: number
  unit: string
  label: THREE.Object3D | null
  visual: THREE.Object3D | null
}

export class MeasurementTools {
  private measurements: THREE.Group
  private font: Font | null = null

  constructor() {
    this.measurements = new THREE.Group()
    this.measurements.name = "Measurements"
  }

  /**
   * Measure distance between two points
   */
  measureDistance(pointA: THREE.Vector3, pointB: THREE.Vector3): MeasurementResult {
    const distance = pointA.distanceTo(pointB)

    // Create line visual using pooled material
    const geometry = new THREE.BufferGeometry().setFromPoints([pointA, pointB])
    const material = getLineMaterial({ color: 0x00ff00, linewidth: 2 })
    const line = new THREE.Line(geometry, material)

    // Create endpoints markers using pooled material
    const markerGeo = new THREE.SphereGeometry(0.1)
    const markerMat = getBasicMaterial({ color: 0x00ff00 })

    const markerA = new THREE.Mesh(markerGeo, markerMat)
    markerA.position.copy(pointA)

    const markerB = new THREE.Mesh(markerGeo, markerMat)
    markerB.position.copy(pointB)

    // Group all visuals
    const visual = new THREE.Group()
    visual.add(line, markerA, markerB)

    // Create label
    const midpoint = new THREE.Vector3().lerpVectors(pointA, pointB, 0.5)
    const label = this.createTextLabel(`${distance.toFixed(3)} m`, midpoint)

    if (label) {
      visual.add(label)
    }

    this.measurements.add(visual)

    return {
      value: distance,
      unit: "m",
      label,
      visual,
    }
  }

  /**
   * Measure area of a polygon defined by points
   */
  measureArea(points: THREE.Vector3[]): MeasurementResult {
    if (points.length < 3) {
      throw new Error("Area measurement requires at least 3 points")
    }

    // Calculate area using Shoelace formula (2D projection on XZ plane)
    let area = 0
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      area += points[i].x * points[j].z
      area -= points[j].x * points[i].z
    }
    area = Math.abs(area / 2)

    // Create polygon visual
    const shape = new THREE.Shape()
    shape.moveTo(points[0].x, points[0].z)
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].z)
    }

    const geometry = new THREE.ShapeGeometry(shape)
    const material = getBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    })
    const polygon = new THREE.Mesh(geometry, material)
    polygon.rotation.x = -Math.PI / 2 // Rotate to lie flat on XZ plane

    // Create edge lines using pooled material
    const edgePoints = [...points, points[0]] // Close the loop
    const lineGeo = new THREE.BufferGeometry().setFromPoints(edgePoints)
    const lineMat = getLineMaterial({ color: 0x00ff00, linewidth: 2 })
    const edges = new THREE.Line(lineGeo, lineMat)

    const visual = new THREE.Group()
    visual.add(polygon, edges)

    // Calculate centroid for label
    const centroid = new THREE.Vector3()
    for (const point of points) {
      centroid.add(point)
    }
    centroid.divideScalar(points.length)

    const label = this.createTextLabel(`${area.toFixed(3)} m²`, centroid)
    if (label) {
      visual.add(label)
    }

    this.measurements.add(visual)

    return {
      value: area,
      unit: "m²",
      label,
      visual,
    }
  }

  /**
   * Measure volume of a bounding box
   */
  measureVolume(min: THREE.Vector3, max: THREE.Vector3): MeasurementResult {
    const size = new THREE.Vector3().subVectors(max, min)
    const volume = size.x * size.y * size.z

    // Create bounding box visual using pooled material
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
    const material = getBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
    })
    const box = new THREE.Mesh(geometry, material)

    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5)
    box.position.copy(center)

    // Add wireframe using pooled material
    const edgesGeo = new THREE.EdgesGeometry(geometry)
    const edgesMat = getLineMaterial({ color: 0x00ff00 })
    const edges = new THREE.LineSegments(edgesGeo, edgesMat)
    box.add(edges)

    const label = this.createTextLabel(`${volume.toFixed(3)} m³`, center)
    if (label) {
      box.add(label)
    }

    this.measurements.add(box)

    return {
      value: volume,
      unit: "m³",
      label,
      visual: box,
    }
  }

  /**
   * Measure angle between three points (vertex at pointB)
   */
  measureAngle(
    pointA: THREE.Vector3,
    pointB: THREE.Vector3,
    pointC: THREE.Vector3
  ): MeasurementResult {
    const vecBA = new THREE.Vector3().subVectors(pointA, pointB).normalize()
    const vecBC = new THREE.Vector3().subVectors(pointC, pointB).normalize()

    const angle = vecBA.angleTo(vecBC)
    const angleDeg = THREE.MathUtils.radToDeg(angle)

    // Create arc visual
    const radius = 1
    const curve = new THREE.EllipseCurve(
      0,
      0, // center
      radius,
      radius, // x and y radius
      0,
      angle, // start and end angle
      false, // clockwise
      0 // rotation
    )

    const points = curve.getPoints(50)
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = getLineMaterial({ color: 0x00ff00 })
    const arc = new THREE.Line(geometry, material)

    // Position and orient arc
    arc.position.copy(pointB)

    const visual = new THREE.Group()
    visual.add(arc)

    const label = this.createTextLabel(
      `${angleDeg.toFixed(1)}°`,
      pointB.clone().add(vecBA.clone().multiplyScalar(radius * 1.5))
    )
    if (label) {
      visual.add(label)
    }

    this.measurements.add(visual)

    return {
      value: angleDeg,
      unit: "°",
      label,
      visual,
    }
  }

  /**
   * Create a text label (sprite-based for now, can upgrade to TextGeometry later)
   */
  private createTextLabel(text: string, position: THREE.Vector3): THREE.Sprite | null {
    // Create canvas for text
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) return null

    canvas.width = 256
    canvas.height = 64

    context.fillStyle = "rgba(0, 0, 0, 0.7)"
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.font = "24px Arial"
    context.fillStyle = "#00ff00"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText(text, canvas.width / 2, canvas.height / 2)

    // Create sprite
    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture })
    const sprite = new THREE.Sprite(material)

    sprite.position.copy(position)
    sprite.scale.set(2, 0.5, 1)

    return sprite
  }

  /**
   * Clear all measurements
   */
  clearAll(): void {
    this.measurements.clear()
  }

  /**
   * Remove a specific measurement
   */
  remove(visual: THREE.Object3D): void {
    this.measurements.remove(visual)
  }

  /**
   * Get measurements group (add to scene)
   */
  getMeasurementsGroup(): THREE.Group {
    return this.measurements
  }
}

// Singleton instance
export const measurementTools = new MeasurementTools()
