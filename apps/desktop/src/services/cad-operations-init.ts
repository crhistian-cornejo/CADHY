/**
 * CAD Operations Initializer - Bridge between cad-service (Tauri) and @cadhy/factory
 *
 * This module MUST be called at app startup to enable factory pattern usage.
 * It bridges the Tauri-based CAD service (which uses number[] arrays) with
 * the factory system (which uses TypedArrays for performance).
 *
 * @example
 * ```typescript
 * // In main.tsx (before rendering)
 * import { initializeCadOperations } from './services/cad-operations-init';
 * initializeCadOperations();
 * ```
 */

import { type CadOperations, setCadOperations } from "@cadhy/factory"
import { logger } from "@cadhy/shared/logger"
import type { MeshData } from "@cadhy/types"
import type { CadMeshData } from "./cad-service"
import * as cadService from "./cad-service"

// =============================================================================
// TYPE CONVERSION UTILITIES
// =============================================================================

/**
 * Convert CadMeshData (number[] arrays from Tauri) to MeshData (TypedArrays for Three.js)
 *
 * CadMeshData comes from Rust backend with plain number arrays for JSON serialization.
 * MeshData uses TypedArrays for optimal Three.js buffer attribute performance.
 */
function convertMeshData(cadMesh: CadMeshData): MeshData {
  return {
    vertices: new Float32Array(cadMesh.vertices),
    indices: new Uint32Array(cadMesh.indices),
    normals: cadMesh.normals
      ? new Float32Array(cadMesh.normals)
      : new Float32Array(cadMesh.vertices.length), // Same length as vertices, zeroed if null
  }
}

// =============================================================================
// CAD OPERATIONS IMPLEMENTATION
// =============================================================================

/**
 * Implementation of CadOperations interface that bridges to cad-service.ts
 *
 * This adapter:
 * 1. Maps factory method signatures to cad-service functions
 * 2. Handles primitives that don't have positioned variants (cone, torus)
 * 3. Converts CadMeshData to MeshData (number[] -> TypedArrays)
 */
const cadOperations: CadOperations = {
  /**
   * Create a box at position (x, y, z)
   */
  createBox: async (x, y, z, width, depth, height) => {
    logger.debug("[CAD-Ops] createBox", { x, y, z, width, depth, height })
    const result = await cadService.createBoxAt(x, y, z, width, depth, height)
    return { id: result.id, analysis: result.analysis }
  },

  /**
   * Create a cylinder at position (x, y, z) with default Z-axis orientation
   */
  createCylinder: async (x, y, z, radius, height) => {
    logger.debug("[CAD-Ops] createCylinder", { x, y, z, radius, height })
    // Use Z-axis (0, 0, 1) as default cylinder axis
    const result = await cadService.createCylinderAt(x, y, z, 0, 0, 1, radius, height)
    return { id: result.id, analysis: result.analysis }
  },

  /**
   * Create a sphere at position (x, y, z)
   */
  createSphere: async (x, y, z, radius) => {
    logger.debug("[CAD-Ops] createSphere", { x, y, z, radius })
    const result = await cadService.createSphereAt(x, y, z, radius)
    return { id: result.id, analysis: result.analysis }
  },

  /**
   * Create a cone at position (x, y, z)
   *
   * Note: cad-service.createCone() creates at origin, so we create and translate if needed
   */
  createCone: async (x, y, z, baseRadius, topRadius, height) => {
    logger.debug("[CAD-Ops] createCone", { x, y, z, baseRadius, topRadius, height })

    // Create cone at origin
    const result = await cadService.createCone(baseRadius, topRadius, height)

    // If position is not origin, translate the shape
    if (x !== 0 || y !== 0 || z !== 0) {
      const translated = await cadService.translate(result.id, x, y, z)
      // Delete the original shape at origin
      await cadService.deleteShape(result.id).catch(() => {
        // Ignore deletion errors
      })
      return { id: translated.id, analysis: translated.analysis }
    }

    return { id: result.id, analysis: result.analysis }
  },

  /**
   * Create a torus at position (x, y, z)
   *
   * Note: cad-service.createTorus() creates at origin, so we create and translate if needed
   */
  createTorus: async (x, y, z, majorRadius, minorRadius) => {
    logger.debug("[CAD-Ops] createTorus", { x, y, z, majorRadius, minorRadius })

    // Create torus at origin
    const result = await cadService.createTorus(majorRadius, minorRadius)

    // If position is not origin, translate the shape
    if (x !== 0 || y !== 0 || z !== 0) {
      const translated = await cadService.translate(result.id, x, y, z)
      // Delete the original shape at origin
      await cadService.deleteShape(result.id).catch(() => {
        // Ignore deletion errors
      })
      return { id: translated.id, analysis: translated.analysis }
    }

    return { id: result.id, analysis: result.analysis }
  },

  /**
   * Tessellate a shape to get mesh data for rendering
   * Converts Tauri's number[] to TypedArrays for Three.js
   */
  tessellate: async (shapeId, deflection = 0.1): Promise<MeshData> => {
    logger.debug("[CAD-Ops] tessellate", { shapeId, deflection })
    const result = await cadService.tessellate(shapeId, deflection)
    return convertMeshData(result)
  },

  /**
   * Delete a shape from the CAD registry
   */
  deleteShape: async (shapeId) => {
    logger.debug("[CAD-Ops] deleteShape", { shapeId })
    await cadService.deleteShape(shapeId)
  },
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/** Track initialization state */
let initialized = false

/**
 * Initialize the CAD operations bridge.
 *
 * This MUST be called once at app startup, before any factory usage.
 * Calling multiple times is safe (will just log a warning).
 *
 * @example
 * ```typescript
 * // In main.tsx
 * import { initializeCadOperations } from './services/cad-operations-init';
 *
 * // Initialize before rendering
 * initializeCadOperations();
 *
 * createRoot(document.getElementById("root")!).render(
 *   <StrictMode>
 *     <App />
 *   </StrictMode>
 * );
 * ```
 */
export function initializeCadOperations(): void {
  if (initialized) {
    logger.warn("[CAD-Ops] Already initialized, skipping")
    return
  }

  setCadOperations(cadOperations)
  initialized = true
  logger.info("[CAD-Ops] CAD operations bridge initialized successfully")
}

/**
 * Check if CAD operations have been initialized
 */
export function isCadOperationsInitialized(): boolean {
  return initialized
}
