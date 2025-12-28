/**
 * @fileoverview Dependency Graph Types
 * @module core/depsgraph
 *
 * Blender-inspired dependency graph for managing update propagation.
 * Ensures correct evaluation order when objects or their data change.
 */

// ============================================================================
// NODE TYPES
// ============================================================================

/**
 * Type of dependency node
 */
export type DepNodeType =
  | "object" // Scene object node
  | "object_transform" // Object transform component
  | "object_geometry" // Object geometry component
  | "object_modifier" // Object modifier component
  | "object_material" // Object material component
  | "scene" // Scene data
  | "layer" // Layer data
  | "camera" // Camera parameters
  | "light" // Light parameters
  | "parameter" // Generic parameter

/**
 * Update tags for dependency nodes
 */
export enum DepTag {
  NONE = 0,
  /** Transform changed */
  TRANSFORM = 1 << 0,
  /** Geometry changed */
  GEOMETRY = 1 << 1,
  /** Modifier stack changed */
  MODIFIERS = 1 << 2,
  /** Material changed */
  MATERIAL = 1 << 3,
  /** Visibility changed */
  VISIBILITY = 1 << 4,
  /** Selection changed */
  SELECTION = 1 << 5,
  /** Any change */
  ALL = 0xff,
}

/**
 * Evaluation state of a node
 */
export type DepNodeState = "valid" | "dirty" | "evaluating" | "error"

/**
 * Priority for evaluation order
 */
export type DepPriority = "low" | "normal" | "high" | "critical"

// ============================================================================
// NODES
// ============================================================================

/**
 * Base dependency node
 */
export interface DepNodeBase {
  /** Unique node ID */
  id: string
  /** Node type */
  type: DepNodeType
  /** Owner ID (object, scene, etc.) */
  ownerId: string
  /** Current state */
  state: DepNodeState
  /** Pending update tags */
  pendingTags: DepTag
  /** Evaluation priority */
  priority: DepPriority
  /** Time of last evaluation (ms) */
  lastEvalTime?: number
  /** Error message if state is 'error' */
  error?: string
}

/**
 * Object node - represents a scene object
 */
export interface DepNodeObject extends DepNodeBase {
  type: "object"
  /** Child component nodes */
  components: {
    transform?: string
    geometry?: string
    modifiers?: string
    material?: string
  }
}

/**
 * Transform component node
 */
export interface DepNodeTransform extends DepNodeBase {
  type: "object_transform"
  /** Parent object node ID */
  objectNodeId: string
}

/**
 * Geometry component node
 */
export interface DepNodeGeometry extends DepNodeBase {
  type: "object_geometry"
  /** Parent object node ID */
  objectNodeId: string
  /** Base shape ID */
  baseShapeId?: string
  /** Evaluated shape ID (after modifiers) */
  evaluatedShapeId?: string
}

/**
 * Modifier component node
 */
export interface DepNodeModifier extends DepNodeBase {
  type: "object_modifier"
  /** Parent object node ID */
  objectNodeId: string
  /** Modifier stack hash for change detection */
  stackHash?: string
}

/**
 * Union type for all node types
 */
export type DepNode = DepNodeObject | DepNodeTransform | DepNodeGeometry | DepNodeModifier

// ============================================================================
// RELATIONS
// ============================================================================

/**
 * Type of relation between nodes
 */
export type DepRelationType =
  | "component_of" // Child is component of parent
  | "depends_on" // Child depends on parent's output
  | "transform_source" // Transform inheritance
  | "modifier_target" // Boolean modifier target
  | "reference" // General reference

/**
 * Relation between two nodes
 */
export interface DepRelation {
  /** Relation ID */
  id: string
  /** Source node ID (dependency provider) */
  fromId: string
  /** Target node ID (depends on source) */
  toId: string
  /** Relation type */
  type: DepRelationType
  /** Which tags propagate through this relation */
  tagMask: DepTag
  /** Description for debugging */
  description?: string
}

// ============================================================================
// GRAPH
// ============================================================================

/**
 * The dependency graph
 */
export interface DepGraph {
  /** All nodes by ID */
  nodes: Map<string, DepNode>
  /** All relations by ID */
  relations: Map<string, DepRelation>
  /** Outgoing relations by node ID */
  outgoing: Map<string, Set<string>>
  /** Incoming relations by node ID */
  incoming: Map<string, Set<string>>
  /** Nodes marked dirty for evaluation */
  dirtyNodes: Set<string>
  /** Evaluation in progress */
  isEvaluating: boolean
  /** Graph version (increments on structural changes) */
  version: number
}

// ============================================================================
// EVALUATION
// ============================================================================

/**
 * Evaluation context for the graph
 */
export interface DepEvalContext {
  /** Scene time (for animation) */
  time: number
  /** Is this for viewport or render */
  forRender: boolean
  /** Maximum nodes to evaluate per frame */
  maxNodesPerFrame: number
  /** Callback when node evaluation starts */
  onNodeStart?: (nodeId: string) => void
  /** Callback when node evaluation completes */
  onNodeComplete?: (nodeId: string, success: boolean, timeMs: number) => void
}

/**
 * Result of graph evaluation
 */
export interface DepEvalResult {
  /** Evaluation completed */
  complete: boolean
  /** Nodes evaluated */
  nodesEvaluated: number
  /** Nodes remaining (if not complete) */
  nodesRemaining: number
  /** Total time in ms */
  totalTimeMs: number
  /** Per-node timing */
  nodeTiming: Map<string, number>
  /** Errors encountered */
  errors: Map<string, string>
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an empty dependency graph
 */
export function createDepGraph(): DepGraph {
  return {
    nodes: new Map(),
    relations: new Map(),
    outgoing: new Map(),
    incoming: new Map(),
    dirtyNodes: new Set(),
    isEvaluating: false,
    version: 0,
  }
}

/**
 * Create a node ID from type and owner
 */
export function createNodeId(type: DepNodeType, ownerId: string): string {
  return `${type}:${ownerId}`
}

/**
 * Create a relation ID from source and target
 */
export function createRelationId(fromId: string, toId: string): string {
  return `${fromId}->${toId}`
}
