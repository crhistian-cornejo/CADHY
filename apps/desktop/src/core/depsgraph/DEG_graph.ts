/**
 * @fileoverview Dependency Graph Implementation
 * @module core/depsgraph
 *
 * Core graph operations: add/remove nodes, relations, and dirty propagation.
 */

import {
  createNodeId,
  createRelationId,
  type DepGraph,
  type DepNode,
  type DepNodeBase,
  type DepNodeGeometry,
  type DepNodeModifier,
  type DepNodeObject,
  type DepNodeTransform,
  type DepNodeType,
  type DepPriority,
  type DepRelation,
  type DepRelationType,
  DepTag,
} from "./DEG_types"

// ============================================================================
// NODE OPERATIONS
// ============================================================================

/**
 * Add a node to the graph
 */
export function addNode(graph: DepGraph, node: DepNode): void {
  graph.nodes.set(node.id, node)
  graph.outgoing.set(node.id, new Set())
  graph.incoming.set(node.id, new Set())
  graph.version++
}

/**
 * Remove a node and all its relations from the graph
 */
export function removeNode(graph: DepGraph, nodeId: string): void {
  // Remove all outgoing relations
  const outgoing = graph.outgoing.get(nodeId)
  if (outgoing) {
    for (const relId of outgoing) {
      const relation = graph.relations.get(relId)
      if (relation) {
        const targetIncoming = graph.incoming.get(relation.toId)
        targetIncoming?.delete(relId)
        graph.relations.delete(relId)
      }
    }
  }

  // Remove all incoming relations
  const incoming = graph.incoming.get(nodeId)
  if (incoming) {
    for (const relId of incoming) {
      const relation = graph.relations.get(relId)
      if (relation) {
        const sourceOutgoing = graph.outgoing.get(relation.fromId)
        sourceOutgoing?.delete(relId)
        graph.relations.delete(relId)
      }
    }
  }

  graph.nodes.delete(nodeId)
  graph.outgoing.delete(nodeId)
  graph.incoming.delete(nodeId)
  graph.dirtyNodes.delete(nodeId)
  graph.version++
}

/**
 * Create and add object node with all components
 */
export function addObjectNode(
  graph: DepGraph,
  objectId: string,
  options?: {
    hasGeometry?: boolean
    hasModifiers?: boolean
    hasMaterial?: boolean
    priority?: DepPriority
  }
): DepNodeObject {
  const opts = {
    hasGeometry: true,
    hasModifiers: false,
    hasMaterial: true,
    priority: "normal" as DepPriority,
    ...options,
  }

  const objectNodeId = createNodeId("object", objectId)

  // Create object node
  const objectNode: DepNodeObject = {
    id: objectNodeId,
    type: "object",
    ownerId: objectId,
    state: "dirty",
    pendingTags: DepTag.ALL,
    priority: opts.priority,
    components: {},
  }

  // Create transform component
  const transformNodeId = createNodeId("object_transform", objectId)
  const transformNode: DepNodeTransform = {
    id: transformNodeId,
    type: "object_transform",
    ownerId: objectId,
    objectNodeId,
    state: "dirty",
    pendingTags: DepTag.TRANSFORM,
    priority: opts.priority,
  }
  objectNode.components.transform = transformNodeId

  addNode(graph, objectNode)
  addNode(graph, transformNode)
  addRelation(graph, transformNodeId, objectNodeId, "component_of", DepTag.TRANSFORM)

  // Create geometry component if needed
  if (opts.hasGeometry) {
    const geometryNodeId = createNodeId("object_geometry", objectId)
    const geometryNode: DepNodeGeometry = {
      id: geometryNodeId,
      type: "object_geometry",
      ownerId: objectId,
      objectNodeId,
      state: "dirty",
      pendingTags: DepTag.GEOMETRY,
      priority: opts.priority,
    }
    objectNode.components.geometry = geometryNodeId

    addNode(graph, geometryNode)
    addRelation(graph, geometryNodeId, objectNodeId, "component_of", DepTag.GEOMETRY)
  }

  // Create modifier component if needed
  if (opts.hasModifiers) {
    const modifierNodeId = createNodeId("object_modifier", objectId)
    const modifierNode: DepNodeModifier = {
      id: modifierNodeId,
      type: "object_modifier",
      ownerId: objectId,
      objectNodeId,
      state: "dirty",
      pendingTags: DepTag.MODIFIERS,
      priority: opts.priority,
    }
    objectNode.components.modifiers = modifierNodeId

    addNode(graph, modifierNode)
    addRelation(graph, modifierNodeId, objectNodeId, "component_of", DepTag.MODIFIERS)

    // Modifier depends on geometry
    if (objectNode.components.geometry) {
      addRelation(
        graph,
        objectNode.components.geometry,
        modifierNodeId,
        "depends_on",
        DepTag.GEOMETRY
      )
    }
  }

  graph.dirtyNodes.add(objectNodeId)
  return objectNode
}

/**
 * Remove object node and all its components
 */
export function removeObjectNode(graph: DepGraph, objectId: string): void {
  const objectNodeId = createNodeId("object", objectId)
  const objectNode = graph.nodes.get(objectNodeId) as DepNodeObject | undefined

  if (objectNode) {
    // Remove component nodes
    if (objectNode.components.transform) {
      removeNode(graph, objectNode.components.transform)
    }
    if (objectNode.components.geometry) {
      removeNode(graph, objectNode.components.geometry)
    }
    if (objectNode.components.modifiers) {
      removeNode(graph, objectNode.components.modifiers)
    }
    if (objectNode.components.material) {
      removeNode(graph, objectNode.components.material)
    }
  }

  removeNode(graph, objectNodeId)
}

// ============================================================================
// RELATION OPERATIONS
// ============================================================================

/**
 * Add a relation between two nodes
 */
export function addRelation(
  graph: DepGraph,
  fromId: string,
  toId: string,
  type: DepRelationType,
  tagMask: DepTag = DepTag.ALL,
  description?: string
): DepRelation {
  const id = createRelationId(fromId, toId)

  const relation: DepRelation = {
    id,
    fromId,
    toId,
    type,
    tagMask,
    description,
  }

  graph.relations.set(id, relation)

  // Update adjacency lists
  let outgoing = graph.outgoing.get(fromId)
  if (!outgoing) {
    outgoing = new Set()
    graph.outgoing.set(fromId, outgoing)
  }
  outgoing.add(id)

  let incoming = graph.incoming.get(toId)
  if (!incoming) {
    incoming = new Set()
    graph.incoming.set(toId, incoming)
  }
  incoming.add(id)

  graph.version++
  return relation
}

/**
 * Remove a relation from the graph
 */
export function removeRelation(graph: DepGraph, relationId: string): void {
  const relation = graph.relations.get(relationId)
  if (!relation) return

  graph.outgoing.get(relation.fromId)?.delete(relationId)
  graph.incoming.get(relation.toId)?.delete(relationId)
  graph.relations.delete(relationId)
  graph.version++
}

/**
 * Add a dependency between two objects
 * Used for boolean modifiers, parenting, etc.
 */
export function addObjectDependency(
  graph: DepGraph,
  sourceObjectId: string,
  targetObjectId: string,
  type: DepRelationType = "depends_on",
  tagMask: DepTag = DepTag.GEOMETRY,
  description?: string
): void {
  // Get source geometry or modifier node
  const sourceNodeId =
    createNodeId("object_modifier", sourceObjectId) ||
    createNodeId("object_geometry", sourceObjectId)

  // Get target geometry node
  const targetNodeId = createNodeId("object_geometry", targetObjectId)

  // Only add if both nodes exist
  if (graph.nodes.has(sourceNodeId) && graph.nodes.has(targetNodeId)) {
    addRelation(graph, targetNodeId, sourceNodeId, type, tagMask, description)
  }
}

// ============================================================================
// DIRTY PROPAGATION
// ============================================================================

/**
 * Tag a node as dirty and propagate to dependents
 */
export function tagNodeDirty(graph: DepGraph, nodeId: string, tags: DepTag): void {
  const node = graph.nodes.get(nodeId)
  if (!node) return

  // Combine with existing pending tags
  node.pendingTags |= tags
  node.state = "dirty"
  graph.dirtyNodes.add(nodeId)

  // Propagate to nodes that depend on this one
  const outgoing = graph.outgoing.get(nodeId)
  if (outgoing) {
    for (const relId of outgoing) {
      const relation = graph.relations.get(relId)
      if (relation) {
        // Check if this relation propagates the given tags
        const propagatedTags = tags & relation.tagMask
        if (propagatedTags !== DepTag.NONE) {
          tagNodeDirty(graph, relation.toId, propagatedTags)
        }
      }
    }
  }
}

/**
 * Tag an object as dirty
 */
export function tagObjectDirty(graph: DepGraph, objectId: string, tags: DepTag): void {
  // Tag the appropriate component based on tags
  if (tags & DepTag.TRANSFORM) {
    const transformNodeId = createNodeId("object_transform", objectId)
    tagNodeDirty(graph, transformNodeId, DepTag.TRANSFORM)
  }

  if (tags & DepTag.GEOMETRY) {
    const geometryNodeId = createNodeId("object_geometry", objectId)
    tagNodeDirty(graph, geometryNodeId, DepTag.GEOMETRY)
  }

  if (tags & DepTag.MODIFIERS) {
    const modifierNodeId = createNodeId("object_modifier", objectId)
    tagNodeDirty(graph, modifierNodeId, DepTag.MODIFIERS)
  }

  if (tags & DepTag.MATERIAL) {
    const objectNodeId = createNodeId("object", objectId)
    tagNodeDirty(graph, objectNodeId, DepTag.MATERIAL)
  }

  if (tags & DepTag.VISIBILITY || tags & DepTag.SELECTION) {
    const objectNodeId = createNodeId("object", objectId)
    tagNodeDirty(graph, objectNodeId, tags & (DepTag.VISIBILITY | DepTag.SELECTION))
  }
}

/**
 * Clear dirty state after successful evaluation
 */
export function clearNodeDirty(graph: DepGraph, nodeId: string): void {
  const node = graph.nodes.get(nodeId)
  if (node) {
    node.pendingTags = DepTag.NONE
    node.state = "valid"
    node.lastEvalTime = Date.now()
  }
  graph.dirtyNodes.delete(nodeId)
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all dirty nodes in topological order (dependencies first)
 */
export function getDirtyNodesOrdered(graph: DepGraph): string[] {
  const result: string[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(nodeId: string): void {
    if (visited.has(nodeId)) return
    if (visiting.has(nodeId)) {
      console.warn(`[DEG] Cycle detected at node: ${nodeId}`)
      return
    }

    visiting.add(nodeId)

    // Visit dependencies first
    const incoming = graph.incoming.get(nodeId)
    if (incoming) {
      for (const relId of incoming) {
        const relation = graph.relations.get(relId)
        if (relation && graph.dirtyNodes.has(relation.fromId)) {
          visit(relation.fromId)
        }
      }
    }

    visiting.delete(nodeId)
    visited.add(nodeId)

    if (graph.dirtyNodes.has(nodeId)) {
      result.push(nodeId)
    }
  }

  for (const nodeId of graph.dirtyNodes) {
    visit(nodeId)
  }

  return result
}

/**
 * Get all nodes that depend on a given node
 */
export function getDependents(graph: DepGraph, nodeId: string): string[] {
  const result: string[] = []

  const outgoing = graph.outgoing.get(nodeId)
  if (outgoing) {
    for (const relId of outgoing) {
      const relation = graph.relations.get(relId)
      if (relation) {
        result.push(relation.toId)
      }
    }
  }

  return result
}

/**
 * Get all nodes that a given node depends on
 */
export function getDependencies(graph: DepGraph, nodeId: string): string[] {
  const result: string[] = []

  const incoming = graph.incoming.get(nodeId)
  if (incoming) {
    for (const relId of incoming) {
      const relation = graph.relations.get(relId)
      if (relation) {
        result.push(relation.fromId)
      }
    }
  }

  return result
}

/**
 * Check if graph has cycles
 */
export function hasCycles(graph: DepGraph): boolean {
  const visited = new Set<string>()
  const recStack = new Set<string>()

  function isCyclic(nodeId: string): boolean {
    if (recStack.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visited.add(nodeId)
    recStack.add(nodeId)

    const outgoing = graph.outgoing.get(nodeId)
    if (outgoing) {
      for (const relId of outgoing) {
        const relation = graph.relations.get(relId)
        if (relation && isCyclic(relation.toId)) {
          return true
        }
      }
    }

    recStack.delete(nodeId)
    return false
  }

  for (const nodeId of graph.nodes.keys()) {
    if (isCyclic(nodeId)) return true
  }

  return false
}

// ============================================================================
// DEBUG
// ============================================================================

/**
 * Get graph statistics
 */
export function getGraphStats(graph: DepGraph): {
  nodeCount: number
  relationCount: number
  dirtyCount: number
  version: number
} {
  return {
    nodeCount: graph.nodes.size,
    relationCount: graph.relations.size,
    dirtyCount: graph.dirtyNodes.size,
    version: graph.version,
  }
}

/**
 * Print graph for debugging
 */
export function debugPrintGraph(graph: DepGraph): void {
  // PERF: console.log("[DEG] Graph:", getGraphStats(graph))
  // PERF: console.log("[DEG] Nodes:")
  for (const [id, node] of graph.nodes) {
    // PERF: console.log(`  - ${id}: ${node.state} (tags: ${node.pendingTags})`)
  }
  // PERF: console.log("[DEG] Relations:")
  for (const [id, rel] of graph.relations) {
    // PERF: console.log(`  - ${rel.fromId} -> ${rel.toId} (${rel.type})`)
  }
  // PERF: console.log("[DEG] Dirty:", [...graph.dirtyNodes])
}
