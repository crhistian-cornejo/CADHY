/**
 * @fileoverview Dependency Graph System
 * @module core/depsgraph
 *
 * Blender-inspired dependency graph for CADHY.
 * Manages evaluation order and change propagation.
 *
 * Key concepts:
 * - DepNode: A node in the graph (object, component, etc.)
 * - DepRelation: A dependency between nodes
 * - DepTag: Update flags (transform, geometry, modifiers, etc.)
 * - Dirty propagation: When a node changes, dependents are marked dirty
 * - Topological evaluation: Evaluate in correct order (dependencies first)
 */

// Graph operations
export {
  addNode,
  addObjectDependency,
  addObjectNode,
  addRelation,
  clearNodeDirty,
  debugPrintGraph,
  getDependencies,
  getDependents,
  getDirtyNodesOrdered,
  getGraphStats,
  hasCycles,
  removeNode,
  removeObjectNode,
  removeRelation,
  tagNodeDirty,
  tagObjectDirty,
} from "./DEG_graph"
// Modeller Integration
export {
  evaluateDepgraph,
  initializeDepgraphIntegration,
  markObjectDirty,
  syncObjectsToDepgraph,
} from "./DEG_modeller"
// Store
export {
  useContinuousEval,
  useDepGraph,
  useDepGraphStats,
  useDepGraphStore,
  useLastEvalResult,
  useRegisterObject,
} from "./DEG_store"
// Types
export * from "./DEG_types"
