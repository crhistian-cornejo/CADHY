/**
 * Primitive Factories - CADHY Factory Infrastructure
 *
 * Concrete factory implementations for primitive CAD shapes.
 * Each factory encapsulates the parameters and CAD operations for a specific primitive.
 *
 * These factories define abstract CAD operations that must be implemented
 * by the application layer (desktop app) which has access to Tauri.
 *
 * @example
 * ```typescript
 * // Create a box factory
 * const factory = new BoxFactory();
 * factory.width = 10;
 * factory.height = 20;
 * factory.depth = 30;
 *
 * // Get preview mesh
 * const preview = await factory.update();
 *
 * // Commit to CAD engine
 * const result = await factory.commit();
 * console.log('Created shape:', result.shapeId);
 * ```
 */

import type { MeshData } from "@cadhy/types"
import {
  type FactoryOptions,
  type FactoryResult,
  PositionedGeometryFactory,
} from "./geometry-factory"

// =============================================================================
// CAD OPERATIONS INTERFACE
// =============================================================================

/**
 * Interface for CAD operations that factories depend on.
 * This is implemented by the desktop app which has access to Tauri commands.
 *
 * Factories call these methods; the actual Tauri invoke() calls happen in the app.
 */
export interface CadOperations {
  // Primitive creation
  createBox(
    x: number,
    y: number,
    z: number,
    width: number,
    depth: number,
    height: number
  ): Promise<{ id: string; analysis: unknown }>
  createCylinder(
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number
  ): Promise<{ id: string; analysis: unknown }>
  createSphere(
    x: number,
    y: number,
    z: number,
    radius: number
  ): Promise<{ id: string; analysis: unknown }>
  createCone(
    x: number,
    y: number,
    z: number,
    baseRadius: number,
    topRadius: number,
    height: number
  ): Promise<{ id: string; analysis: unknown }>
  createTorus(
    x: number,
    y: number,
    z: number,
    majorRadius: number,
    minorRadius: number
  ): Promise<{ id: string; analysis: unknown }>

  // Tessellation
  tessellate(shapeId: string, deflection?: number): Promise<MeshData>

  // Cleanup
  deleteShape(shapeId: string): Promise<void>
}

/**
 * Global CAD operations instance.
 * Must be set by the application before using factories.
 */
let cadOps: CadOperations | null = null

/**
 * Set the CAD operations implementation.
 * Call this once at app initialization.
 *
 * @example
 * ```typescript
 * import { setCadOperations } from '@cadhy/factory';
 * import * as cadService from '@/services/cad-service';
 *
 * setCadOperations({
 *   createBox: (x, y, z, w, d, h) => cadService.createBoxAt(x, y, z, w, d, h),
 *   createCylinder: (x, y, z, r, h) => cadService.createCylinderAt(x, y, z, 0, 0, 1, r, h),
 *   // ... other operations
 * });
 * ```
 */
export function setCadOperations(ops: CadOperations): void {
  cadOps = ops
}

/**
 * Get the CAD operations implementation.
 * Throws if not set.
 */
export function getCadOperations(): CadOperations {
  if (!cadOps) {
    throw new Error("CAD operations not initialized. Call setCadOperations() at app startup.")
  }
  return cadOps
}

// =============================================================================
// BOX FACTORY
// =============================================================================

/**
 * Factory for creating box primitives.
 *
 * Parameters:
 * - width: Size along X axis
 * - depth: Size along Y axis
 * - height: Size along Z axis
 * - x, y, z: Position (from PositionedGeometryFactory)
 */
export class BoxFactory extends PositionedGeometryFactory {
  private _width = 1
  private _height = 1
  private _depth = 1

  /** Preview shape ID (for cleanup) */
  private _previewShapeId: string | null = null

  get name(): string {
    return "Box"
  }

  // Width property
  get width(): number {
    return this._width
  }
  set width(value: number) {
    if (value > 0) {
      this._width = value
      this.notifyParameterChange()
    }
  }

  // Height property
  get height(): number {
    return this._height
  }
  set height(value: number) {
    if (value > 0) {
      this._height = value
      this.notifyParameterChange()
    }
  }

  // Depth property
  get depth(): number {
    return this._depth
  }
  set depth(value: number) {
    if (value > 0) {
      this._depth = value
      this.notifyParameterChange()
    }
  }

  isValid(): boolean {
    return this._width > 0 && this._height > 0 && this._depth > 0
  }

  override toParams(): Record<string, unknown> {
    return {
      ...super.toParams(),
      width: this._width,
      height: this._height,
      depth: this._depth,
    }
  }

  protected async generatePreview(_options: FactoryOptions): Promise<MeshData> {
    const ops = getCadOperations()

    // Clean up previous preview shape
    if (this._previewShapeId) {
      await ops.deleteShape(this._previewShapeId).catch(() => {})
      this._previewShapeId = null
    }

    // Create the shape
    const result = await ops.createBox(
      this.x,
      this.y,
      this.z,
      this._width,
      this._depth,
      this._height
    )
    this._previewShapeId = result.id

    // Tessellate for preview
    const mesh = await ops.tessellate(result.id)

    return mesh
  }

  protected async executeCommit(_options: FactoryOptions): Promise<FactoryResult> {
    const ops = getCadOperations()

    // If we have a preview shape, just return it (already created)
    if (this._previewShapeId) {
      const mesh = await ops.tessellate(this._previewShapeId)
      const shapeId = this._previewShapeId
      this._previewShapeId = null // Don't clean up on dispose
      return { shapeId, mesh, success: true }
    }

    // Otherwise create the shape fresh
    const result = await ops.createBox(
      this.x,
      this.y,
      this.z,
      this._width,
      this._depth,
      this._height
    )
    const mesh = await ops.tessellate(result.id)

    return { shapeId: result.id, mesh, success: true }
  }

  override dispose(): void {
    // Clean up preview shape if not committed
    if (this._previewShapeId) {
      getCadOperations()
        .deleteShape(this._previewShapeId)
        .catch(() => {})
      this._previewShapeId = null
    }
    super.dispose()
  }
}

// =============================================================================
// CYLINDER FACTORY
// =============================================================================

/**
 * Factory for creating cylinder primitives.
 *
 * Parameters:
 * - radius: Radius of the cylinder
 * - height: Height along Z axis
 * - x, y, z: Position (from PositionedGeometryFactory)
 */
export class CylinderFactory extends PositionedGeometryFactory {
  private _radius = 0.5
  private _height = 1

  private _previewShapeId: string | null = null

  get name(): string {
    return "Cylinder"
  }

  get radius(): number {
    return this._radius
  }
  set radius(value: number) {
    if (value > 0) {
      this._radius = value
      this.notifyParameterChange()
    }
  }

  get height(): number {
    return this._height
  }
  set height(value: number) {
    if (value > 0) {
      this._height = value
      this.notifyParameterChange()
    }
  }

  isValid(): boolean {
    return this._radius > 0 && this._height > 0
  }

  override toParams(): Record<string, unknown> {
    return {
      ...super.toParams(),
      radius: this._radius,
      height: this._height,
    }
  }

  protected async generatePreview(_options: FactoryOptions): Promise<MeshData> {
    const ops = getCadOperations()

    if (this._previewShapeId) {
      await ops.deleteShape(this._previewShapeId).catch(() => {})
      this._previewShapeId = null
    }

    const result = await ops.createCylinder(this.x, this.y, this.z, this._radius, this._height)
    this._previewShapeId = result.id

    return ops.tessellate(result.id)
  }

  protected async executeCommit(_options: FactoryOptions): Promise<FactoryResult> {
    const ops = getCadOperations()

    if (this._previewShapeId) {
      const mesh = await ops.tessellate(this._previewShapeId)
      const shapeId = this._previewShapeId
      this._previewShapeId = null
      return { shapeId, mesh, success: true }
    }

    const result = await ops.createCylinder(this.x, this.y, this.z, this._radius, this._height)
    const mesh = await ops.tessellate(result.id)
    return { shapeId: result.id, mesh, success: true }
  }

  override dispose(): void {
    if (this._previewShapeId) {
      getCadOperations()
        .deleteShape(this._previewShapeId)
        .catch(() => {})
      this._previewShapeId = null
    }
    super.dispose()
  }
}

// =============================================================================
// SPHERE FACTORY
// =============================================================================

/**
 * Factory for creating sphere primitives.
 *
 * Parameters:
 * - radius: Radius of the sphere
 * - x, y, z: Position (from PositionedGeometryFactory)
 */
export class SphereFactory extends PositionedGeometryFactory {
  private _radius = 0.5

  private _previewShapeId: string | null = null

  get name(): string {
    return "Sphere"
  }

  get radius(): number {
    return this._radius
  }
  set radius(value: number) {
    if (value > 0) {
      this._radius = value
      this.notifyParameterChange()
    }
  }

  isValid(): boolean {
    return this._radius > 0
  }

  override toParams(): Record<string, unknown> {
    return {
      ...super.toParams(),
      radius: this._radius,
    }
  }

  protected async generatePreview(_options: FactoryOptions): Promise<MeshData> {
    const ops = getCadOperations()

    if (this._previewShapeId) {
      await ops.deleteShape(this._previewShapeId).catch(() => {})
      this._previewShapeId = null
    }

    const result = await ops.createSphere(this.x, this.y, this.z, this._radius)
    this._previewShapeId = result.id

    return ops.tessellate(result.id)
  }

  protected async executeCommit(_options: FactoryOptions): Promise<FactoryResult> {
    const ops = getCadOperations()

    if (this._previewShapeId) {
      const mesh = await ops.tessellate(this._previewShapeId)
      const shapeId = this._previewShapeId
      this._previewShapeId = null
      return { shapeId, mesh, success: true }
    }

    const result = await ops.createSphere(this.x, this.y, this.z, this._radius)
    const mesh = await ops.tessellate(result.id)
    return { shapeId: result.id, mesh, success: true }
  }

  override dispose(): void {
    if (this._previewShapeId) {
      getCadOperations()
        .deleteShape(this._previewShapeId)
        .catch(() => {})
      this._previewShapeId = null
    }
    super.dispose()
  }
}

// =============================================================================
// CONE FACTORY
// =============================================================================

/**
 * Factory for creating cone primitives.
 *
 * Parameters:
 * - baseRadius: Radius at the base (bottom)
 * - topRadius: Radius at the top (0 for a point)
 * - height: Height along Z axis
 * - x, y, z: Position (from PositionedGeometryFactory)
 */
export class ConeFactory extends PositionedGeometryFactory {
  private _baseRadius = 0.5
  private _topRadius = 0
  private _height = 1

  private _previewShapeId: string | null = null

  get name(): string {
    return "Cone"
  }

  get baseRadius(): number {
    return this._baseRadius
  }
  set baseRadius(value: number) {
    if (value >= 0) {
      this._baseRadius = value
      this.notifyParameterChange()
    }
  }

  get topRadius(): number {
    return this._topRadius
  }
  set topRadius(value: number) {
    if (value >= 0) {
      this._topRadius = value
      this.notifyParameterChange()
    }
  }

  get height(): number {
    return this._height
  }
  set height(value: number) {
    if (value > 0) {
      this._height = value
      this.notifyParameterChange()
    }
  }

  isValid(): boolean {
    // At least one radius must be positive
    return (this._baseRadius > 0 || this._topRadius > 0) && this._height > 0
  }

  override toParams(): Record<string, unknown> {
    return {
      ...super.toParams(),
      baseRadius: this._baseRadius,
      topRadius: this._topRadius,
      height: this._height,
    }
  }

  protected async generatePreview(_options: FactoryOptions): Promise<MeshData> {
    const ops = getCadOperations()

    if (this._previewShapeId) {
      await ops.deleteShape(this._previewShapeId).catch(() => {})
      this._previewShapeId = null
    }

    const result = await ops.createCone(
      this.x,
      this.y,
      this.z,
      this._baseRadius,
      this._topRadius,
      this._height
    )
    this._previewShapeId = result.id

    return ops.tessellate(result.id)
  }

  protected async executeCommit(_options: FactoryOptions): Promise<FactoryResult> {
    const ops = getCadOperations()

    if (this._previewShapeId) {
      const mesh = await ops.tessellate(this._previewShapeId)
      const shapeId = this._previewShapeId
      this._previewShapeId = null
      return { shapeId, mesh, success: true }
    }

    const result = await ops.createCone(
      this.x,
      this.y,
      this.z,
      this._baseRadius,
      this._topRadius,
      this._height
    )
    const mesh = await ops.tessellate(result.id)
    return { shapeId: result.id, mesh, success: true }
  }

  override dispose(): void {
    if (this._previewShapeId) {
      getCadOperations()
        .deleteShape(this._previewShapeId)
        .catch(() => {})
      this._previewShapeId = null
    }
    super.dispose()
  }
}

// =============================================================================
// TORUS FACTORY
// =============================================================================

/**
 * Factory for creating torus (donut) primitives.
 *
 * Parameters:
 * - majorRadius: Distance from center of tube to center of torus
 * - minorRadius: Radius of the tube
 * - x, y, z: Position (from PositionedGeometryFactory)
 */
export class TorusFactory extends PositionedGeometryFactory {
  private _majorRadius = 1
  private _minorRadius = 0.25

  private _previewShapeId: string | null = null

  get name(): string {
    return "Torus"
  }

  get majorRadius(): number {
    return this._majorRadius
  }
  set majorRadius(value: number) {
    if (value > 0) {
      this._majorRadius = value
      this.notifyParameterChange()
    }
  }

  get minorRadius(): number {
    return this._minorRadius
  }
  set minorRadius(value: number) {
    if (value > 0) {
      this._minorRadius = value
      this.notifyParameterChange()
    }
  }

  isValid(): boolean {
    // Minor radius must be less than major radius
    return this._majorRadius > 0 && this._minorRadius > 0 && this._minorRadius < this._majorRadius
  }

  override toParams(): Record<string, unknown> {
    return {
      ...super.toParams(),
      majorRadius: this._majorRadius,
      minorRadius: this._minorRadius,
    }
  }

  protected async generatePreview(_options: FactoryOptions): Promise<MeshData> {
    const ops = getCadOperations()

    if (this._previewShapeId) {
      await ops.deleteShape(this._previewShapeId).catch(() => {})
      this._previewShapeId = null
    }

    const result = await ops.createTorus(
      this.x,
      this.y,
      this.z,
      this._majorRadius,
      this._minorRadius
    )
    this._previewShapeId = result.id

    return ops.tessellate(result.id)
  }

  protected async executeCommit(_options: FactoryOptions): Promise<FactoryResult> {
    const ops = getCadOperations()

    if (this._previewShapeId) {
      const mesh = await ops.tessellate(this._previewShapeId)
      const shapeId = this._previewShapeId
      this._previewShapeId = null
      return { shapeId, mesh, success: true }
    }

    const result = await ops.createTorus(
      this.x,
      this.y,
      this.z,
      this._majorRadius,
      this._minorRadius
    )
    const mesh = await ops.tessellate(result.id)
    return { shapeId: result.id, mesh, success: true }
  }

  override dispose(): void {
    if (this._previewShapeId) {
      getCadOperations()
        .deleteShape(this._previewShapeId)
        .catch(() => {})
      this._previewShapeId = null
    }
    super.dispose()
  }
}

// =============================================================================
// FACTORY REGISTRY
// =============================================================================

/**
 * Type of primitive shape
 */
export type PrimitiveType = "box" | "cylinder" | "sphere" | "cone" | "torus"

/**
 * Create a factory for the given primitive type
 */
export function createPrimitiveFactory(type: PrimitiveType): PositionedGeometryFactory {
  switch (type) {
    case "box":
      return new BoxFactory()
    case "cylinder":
      return new CylinderFactory()
    case "sphere":
      return new SphereFactory()
    case "cone":
      return new ConeFactory()
    case "torus":
      return new TorusFactory()
    default:
      throw new Error(`Unknown primitive type: ${type}`)
  }
}
