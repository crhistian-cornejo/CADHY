/**
 * @cadhy/factory - Geometry Factory Pattern for CADHY
 *
 * This package implements the factory pattern for CAD operations with a
 * preview/commit lifecycle. Based on Plasticity's GeometryFactory system.
 *
 * ## Core Concepts
 *
 * ### GeometryFactory
 * Base class for CAD operations. Each factory encapsulates:
 * - Parameters for the operation
 * - Preview generation (non-destructive)
 * - Commit to finalize changes
 * - Cancel to discard changes
 *
 * ### Primitive Factories
 * Concrete implementations for primitive shapes:
 * - `BoxFactory` - Create boxes with width, height, depth
 * - `CylinderFactory` - Create cylinders with radius, height
 * - `SphereFactory` - Create spheres with radius
 * - `ConeFactory` - Create cones with base/top radius, height
 * - `TorusFactory` - Create tori with major/minor radius
 *
 * ### MultiGeometryFactory
 * Base class for operations on multiple objects:
 * - Manages collection of sub-factories
 * - Delegates property changes to all sub-factories
 * - Commits/cancels all operations together
 *
 * ## Setup
 *
 * Before using factories, you must set the CAD operations implementation:
 *
 * ```typescript
 * import { setCadOperations } from '@cadhy/factory';
 * import * as cadService from '@/services/cad-service';
 *
 * setCadOperations({
 *   createBox: (x, y, z, w, d, h) => cadService.createBoxAt(x, y, z, w, d, h),
 *   createCylinder: (x, y, z, r, h) => cadService.createCylinderAt(x, y, z, 0, 0, 1, r, h),
 *   createSphere: (x, y, z, r) => cadService.createSphereAt(x, y, z, r),
 *   createCone: (x, y, z, br, tr, h) => cadService.createCone(br, tr, h), // TODO: positioned cone
 *   createTorus: (x, y, z, mr, nr) => cadService.createTorus(mr, nr), // TODO: positioned torus
 *   tessellate: (shapeId, deflection) => cadService.tessellate(shapeId, deflection),
 *   deleteShape: (shapeId) => cadService.deleteShape(shapeId),
 * });
 * ```
 *
 * ## Usage Example
 *
 * ```typescript
 * import { BoxFactory } from '@cadhy/factory';
 *
 * // Create factory
 * const factory = new BoxFactory();
 * factory.width = 10;
 * factory.height = 20;
 * factory.depth = 30;
 * factory.setPosition(5, 0, 0);
 *
 * // Set up event handlers
 * factory.setEvents({
 *   onPreviewUpdate: (mesh) => viewer.showPreview(mesh),
 *   onCommit: (result) => store.addShape(result.shapeId, result.mesh),
 *   onError: (error) => toast.error(error.message),
 * });
 *
 * // Generate preview
 * const preview = await factory.update();
 *
 * // User adjusts parameters...
 * factory.width = 15;
 * const newPreview = await factory.update();
 *
 * // Commit or cancel
 * if (userConfirmed) {
 *   const result = await factory.commit();
 *   console.log('Created shape:', result.shapeId);
 * } else {
 *   factory.cancel();
 * }
 *
 * // Clean up
 * factory.dispose();
 * ```
 *
 * @packageDocumentation
 */

// Geometry Factory base classes
export {
  type FactoryEvents,
  type FactoryOptions,
  type FactoryResult,
  type FactoryState,
  GeometryFactory,
  PositionedGeometryFactory,
} from "./geometry-factory"

// Multi-factory for composite operations
export {
  type CombinedMeshData,
  type ComposableFactory,
  type DelegationOptions,
  delegatedGetter,
  delegatedSetter,
  type MultiFactoryResult,
  MultiGeometryFactory,
  Reducers,
} from "./multi-factory"

// Primitive factories
export {
  BoxFactory,
  type CadOperations,
  ConeFactory,
  CylinderFactory,
  createPrimitiveFactory,
  getCadOperations,
  type PrimitiveType,
  SphereFactory,
  setCadOperations,
  TorusFactory,
} from "./primitive-factories"
