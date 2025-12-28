/**
 * @fileoverview Depsgraph ↔ Modeller Store Integration
 * @module core/depsgraph
 *
 * Connects the dependency graph to the modeller store:
 * - Syncs objects from store to depsgraph
 * - Implements real evaluation with CAD backend
 * - Watches for object changes and propagates dirty flags
 */

import { invoke } from "@tauri-apps/api/core"
import type { AnySceneObject, ShapeObject, Transform } from "../stores/ST_types"
import {
  addObjectDependency,
  addObjectNode,
  clearNodeDirty,
  getDirtyNodesOrdered,
  removeObjectNode,
} from "./DEG_graph"
import { useDepGraphStore } from "./DEG_store"
import { createNodeId, type DepEvalContext, type DepEvalResult, DepTag } from "./DEG_types"

// ============================================================================
// SHALLOW COMPARISON HELPERS (Performance optimization - avoid JSON.stringify)
// ============================================================================

/**
 * Shallow compare two vec3-like objects {x, y, z}
 * ~100x faster than JSON.stringify comparison
 */
function vec3Equal(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z
}

/**
 * Shallow compare two Transform objects
 */
function transformEqual(a: Transform, b: Transform): boolean {
  return (
    vec3Equal(a.position, b.position) &&
    vec3Equal(a.rotation, b.rotation) &&
    vec3Equal(a.scale, b.scale)
  )
}

/**
 * Shallow compare two modifier arrays by length and reference equality
 * Falls back to JSON.stringify only when lengths match but references differ
 */
function modifiersEqual(
  a: ShapeObject["modifiers"] | undefined,
  b: ShapeObject["modifiers"] | undefined
): boolean {
  if (a === b) return true // Same reference or both undefined
  if (!a || !b) return false // One is undefined
  if (a.length !== b.length) return false // Different lengths

  // Compare each modifier by reference (cheap) - if all match, they're equal
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      // Modifiers differ - need deep comparison for this rare case
      // This is still called less often than comparing every frame
      return JSON.stringify(a) === JSON.stringify(b)
    }
  }
  return true
}

// ============================================================================
// TYPES
// ============================================================================

interface ObjectEvalContext {
  object: AnySceneObject
  graph: ReturnType<typeof useDepGraphStore.getState>["graph"]
  evalContext: DepEvalContext
}

type NodeEvaluator = (ctx: ObjectEvalContext) => Promise<void>

// ============================================================================
// EVALUATORS
// ============================================================================

/**
 * Evaluator registry - maps node types to their evaluation functions
 */
const evaluators: Record<string, NodeEvaluator> = {
  object_transform: evaluateTransform,
  object_geometry: evaluateGeometry,
  object_modifier: evaluateModifiers,
}

/**
 * Evaluate transform component - applies position/rotation/scale
 */
async function evaluateTransform(ctx: ObjectEvalContext): Promise<void> {
  const { object } = ctx
  const transform = object.transform

  // For objects with backend shapes, update the transform matrix
  const backendShapeId = object.metadata?.backendShapeId
  if (backendShapeId) {
    try {
      // Build transform matrix (4x4 row-major)
      const matrix = buildTransformMatrix(transform.position, transform.rotation, transform.scale)

      // Apply transform to backend shape
      await invoke("cad_transform_shape", {
        shapeId: backendShapeId,
        matrix,
      })
    } catch (error) {
      console.warn(`[DEG] Failed to transform shape ${backendShapeId}:`, error)
    }
  }
}

/**
 * Evaluate geometry component - regenerates mesh from CAD kernel
 */
async function evaluateGeometry(ctx: ObjectEvalContext): Promise<void> {
  const { object } = ctx

  // Only evaluate shapes with backend geometry
  if (object.type !== "shape") return

  const shapeObj = object as ShapeObject
  const backendShapeId = object.metadata?.backendShapeId

  if (!backendShapeId) return

  try {
    // Re-tessellate the shape to get updated mesh
    const meshData = await invoke<{
      vertices: number[]
      indices: number[]
      normals: number[]
    }>("cad_tessellate", {
      shapeId: backendShapeId,
      linearDeflection: shapeObj.tessellationQuality ?? 0.1,
      angularDeflection: 0.5,
    })

    // Update the object's mesh in the store
    // (This would normally be done via updateObject, but we're in evaluation context)
    if (meshData && meshData.vertices.length > 0) {
      shapeObj.mesh = {
        vertices: new Float32Array(meshData.vertices),
        indices: new Uint32Array(meshData.indices),
        normals: new Float32Array(meshData.normals),
      }
    }
  } catch (error) {
    console.warn(`[DEG] Failed to tessellate shape ${backendShapeId}:`, error)
  }
}

/**
 * Evaluate modifier component - applies modifiers in stack order
 */
async function evaluateModifiers(ctx: ObjectEvalContext): Promise<void> {
  const { object } = ctx

  // Only shapes can have modifiers
  if (object.type !== "shape") return

  const shapeObj = object as ShapeObject
  const modifiers = shapeObj.modifiers ?? []

  if (modifiers.length === 0) return

  // Get base shape ID
  let currentShapeId = object.metadata?.backendShapeId
  if (!currentShapeId) return

  try {
    // Apply each modifier in order
    for (const modifier of modifiers) {
      if (modifier.muted) continue

      switch (modifier.type) {
        case "boolean": {
          const targetShapeId = modifier.targetShapeId
          if (!targetShapeId) break

          const result = await invoke<{ shapeId: string }>("cad_boolean", {
            shapeId1: currentShapeId,
            shapeId2: targetShapeId,
            operation: modifier.operation ?? "union",
          })

          if (result?.shapeId) {
            currentShapeId = result.shapeId
          }
          break
        }

        case "fillet": {
          const radius = modifier.radius ?? 0.1
          const edges = modifier.edges ?? []

          const result = await invoke<{ shapeId: string }>("cad_fillet", {
            shapeId: currentShapeId,
            radius,
            edgeIndices: edges,
          })

          if (result?.shapeId) {
            currentShapeId = result.shapeId
          }
          break
        }

        case "chamfer": {
          const distance = modifier.distance ?? 0.1
          const edges = modifier.edges ?? []

          const result = await invoke<{ shapeId: string }>("cad_chamfer", {
            shapeId: currentShapeId,
            distance,
            edgeIndices: edges,
          })

          if (result?.shapeId) {
            currentShapeId = result.shapeId
          }
          break
        }

        case "shell": {
          const thickness = modifier.thickness ?? 0.1
          const faces = modifier.removeFaces ?? []

          const result = await invoke<{ shapeId: string }>("cad_shell", {
            shapeId: currentShapeId,
            thickness,
            removeFaceIndices: faces,
          })

          if (result?.shapeId) {
            currentShapeId = result.shapeId
          }
          break
        }
      }
    }

    // Store the evaluated shape ID
    if (currentShapeId !== object.metadata?.backendShapeId) {
      object.metadata = {
        ...object.metadata,
        evaluatedShapeId: currentShapeId,
      }
    }
  } catch (error) {
    console.warn(`[DEG] Failed to evaluate modifiers for ${object.id}:`, error)
  }
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Sync all objects from modeller store to depsgraph
 */
export function syncObjectsToDepgraph(objects: AnySceneObject[]): void {
  const store = useDepGraphStore.getState()
  const graph = store.graph

  // Track existing object IDs
  const existingIds = new Set<string>()
  for (const [id] of graph.nodes) {
    if (id.startsWith("object:")) {
      existingIds.add(id.replace("object:", ""))
    }
  }

  // Add new objects
  for (const obj of objects) {
    if (!existingIds.has(obj.id)) {
      // Determine if object has modifiers
      const hasModifiers = obj.type === "shape" && Array.isArray((obj as ShapeObject).modifiers)

      addObjectNode(graph, obj.id, {
        hasGeometry: true,
        hasModifiers,
        hasMaterial: true,
        priority: "normal",
      })
    }
    existingIds.delete(obj.id)
  }

  // Remove objects no longer in scene
  for (const id of existingIds) {
    removeObjectNode(graph, id)
  }

  // Update dependencies (e.g., for boolean modifiers)
  for (const obj of objects) {
    if (obj.type === "shape") {
      const shapeObj = obj as ShapeObject
      for (const modifier of shapeObj.modifiers ?? []) {
        if (modifier.type === "boolean" && modifier.targetObjectId) {
          addObjectDependency(
            graph,
            obj.id,
            modifier.targetObjectId,
            "modifier_target",
            DepTag.GEOMETRY,
            `Boolean ${modifier.operation}`
          )
        }
      }
    }
  }
}

/**
 * Mark object as dirty in depsgraph when it changes
 */
export function markObjectDirty(objectId: string, tags: DepTag): void {
  useDepGraphStore.getState().markDirty(objectId, tags)
}

// ============================================================================
// EVALUATION
// ============================================================================

/**
 * Evaluate dirty nodes in the depsgraph
 * This is the real evaluation that calls CAD backend
 */
export async function evaluateDepgraph(
  objects: AnySceneObject[],
  ctx: Partial<DepEvalContext> = {}
): Promise<DepEvalResult> {
  const store = useDepGraphStore.getState()
  const graph = store.graph
  const startTime = performance.now()

  const evalContext: DepEvalContext = {
    time: Date.now(),
    forRender: false,
    maxNodesPerFrame: 20,
    ...ctx,
  }

  // Get dirty nodes in topological order
  const dirtyNodes = getDirtyNodesOrdered(graph)

  if (dirtyNodes.length === 0) {
    return {
      complete: true,
      nodesEvaluated: 0,
      nodesRemaining: 0,
      totalTimeMs: 0,
      nodeTiming: new Map(),
      errors: new Map(),
    }
  }

  const nodeTiming = new Map<string, number>()
  const errors = new Map<string, string>()
  let nodesEvaluated = 0

  // Create object lookup
  const objectMap = new Map(objects.map((o) => [o.id, o]))

  // Evaluate nodes (limit per frame to avoid blocking)
  const nodesToEval = dirtyNodes.slice(0, evalContext.maxNodesPerFrame)

  for (const nodeId of nodesToEval) {
    const nodeStart = performance.now()
    const node = graph.nodes.get(nodeId)

    if (!node) continue

    evalContext.onNodeStart?.(nodeId)

    try {
      // Get the object for this node
      const object = objectMap.get(node.ownerId)
      if (!object) {
        clearNodeDirty(graph, nodeId)
        continue
      }

      // Get evaluator for this node type
      const evaluator = evaluators[node.type]
      if (evaluator) {
        await evaluator({ object, graph, evalContext })
      }

      clearNodeDirty(graph, nodeId)
      nodesEvaluated++

      const elapsed = performance.now() - nodeStart
      nodeTiming.set(nodeId, elapsed)
      evalContext.onNodeComplete?.(nodeId, true, elapsed)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.set(nodeId, errorMsg)

      node.state = "error"
      node.error = errorMsg

      const elapsed = performance.now() - nodeStart
      nodeTiming.set(nodeId, elapsed)
      evalContext.onNodeComplete?.(nodeId, false, elapsed)
    }
  }

  const result: DepEvalResult = {
    complete: dirtyNodes.length <= evalContext.maxNodesPerFrame,
    nodesEvaluated,
    nodesRemaining: Math.max(0, dirtyNodes.length - evalContext.maxNodesPerFrame),
    totalTimeMs: performance.now() - startTime,
    nodeTiming,
    errors,
  }

  return result
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Build a 4x4 transform matrix from position, rotation (Euler XYZ), and scale
 * Returns row-major array of 16 floats
 */
function buildTransformMatrix(
  position: { x: number; y: number; z: number },
  rotation: { x: number; y: number; z: number },
  scale: { x: number; y: number; z: number }
): number[] {
  const { x: rx, y: ry, z: rz } = rotation
  const { x: px, y: py, z: pz } = position
  const { x: sx, y: sy, z: sz } = scale

  // Convert to radians
  const toRad = Math.PI / 180
  const cx = Math.cos(rx * toRad)
  const sx1 = Math.sin(rx * toRad)
  const cy = Math.cos(ry * toRad)
  const sy1 = Math.sin(ry * toRad)
  const cz = Math.cos(rz * toRad)
  const sz1 = Math.sin(rz * toRad)

  // Build rotation matrix (XYZ Euler order)
  // Combined with scale and translation
  return [
    cy * cz * sx,
    cy * sz1 * sx,
    -sy1 * sx,
    0,
    (sx1 * sy1 * cz - cx * sz1) * sy,
    (sx1 * sy1 * sz1 + cx * cz) * sy,
    sx1 * cy * sy,
    0,
    (cx * sy1 * cz + sx1 * sz1) * sz,
    (cx * sy1 * sz1 - sx1 * cz) * sz,
    cx * cy * sz,
    0,
    px,
    py,
    pz,
    1,
  ]
}

// ============================================================================
// STORE SUBSCRIPTION
// ============================================================================

let unsubscribe: (() => void) | null = null

/**
 * Initialize depsgraph integration with modeller store
 * Call this once when the app starts
 */
export function initializeDepgraphIntegration(): () => void {
  // Import dynamically to avoid circular dependencies
  import("../stores").then(({ useModellerStore }) => {
    // Initial sync
    const initialObjects = useModellerStore.getState().objects
    syncObjectsToDepgraph(initialObjects)

    // Subscribe to object changes
    unsubscribe = useModellerStore.subscribe(
      (state) => state.objects,
      (objects, prevObjects) => {
        // Sync new/removed objects
        syncObjectsToDepgraph(objects)

        // Find changed objects and mark dirty
        const prevMap = new Map(prevObjects.map((o) => [o.id, o]))
        for (const obj of objects) {
          const prev = prevMap.get(obj.id)
          if (!prev) {
            // New object - fully dirty
            markObjectDirty(obj.id, DepTag.ALL)
          } else if (prev !== obj) {
            // Object changed - determine what changed
            // PERFORMANCE: Use shallow comparison instead of JSON.stringify (~100x faster)
            if (!transformEqual(prev.transform, obj.transform)) {
              markObjectDirty(obj.id, DepTag.TRANSFORM)
            }
            if (obj.type === "shape") {
              const prevShape = prev as ShapeObject
              const currShape = obj as ShapeObject
              if (!modifiersEqual(prevShape.modifiers, currShape.modifiers)) {
                markObjectDirty(obj.id, DepTag.MODIFIERS)
              }
            }
          }
        }

        // Trigger evaluation if continuous eval is enabled
        const { continuousEval } = useDepGraphStore.getState()
        if (continuousEval) {
          evaluateDepgraph(objects).catch(console.error)
        }
      },
      { equalityFn: Object.is }
    )
  })

  return () => {
    unsubscribe?.()
  }
}
