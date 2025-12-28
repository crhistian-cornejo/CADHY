/**
 * Dependency Graph Tests - @cadhy/desktop
 *
 * Tests for the depsgraph system including:
 * - Graph creation and node management
 * - Relation management
 * - Dirty propagation
 * - Topological ordering
 * - Cycle detection
 * - Object node operations
 */

import { beforeEach, describe, expect, test } from "bun:test"
import {
  addNode,
  addObjectDependency,
  addObjectNode,
  addRelation,
  clearNodeDirty,
  createDepGraph,
  createNodeId,
  createRelationId,
  type DepGraph,
  type DepNodeObject,
  type DepNodeTransform,
  DepTag,
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
} from "../core/depsgraph"

// ============================================================================
// SETUP
// ============================================================================

let graph: DepGraph

beforeEach(() => {
  graph = createDepGraph()
})

// ============================================================================
// GRAPH CREATION
// ============================================================================

describe("Graph Creation", () => {
  test("creates empty graph", () => {
    expect(graph.nodes.size).toBe(0)
    expect(graph.relations.size).toBe(0)
    expect(graph.dirtyNodes.size).toBe(0)
    expect(graph.isEvaluating).toBe(false)
    expect(graph.version).toBe(0)
  })

  test("createNodeId generates correct format", () => {
    const id = createNodeId("object", "obj-123")
    expect(id).toBe("object:obj-123")
  })

  test("createRelationId generates correct format", () => {
    const id = createRelationId("node-a", "node-b")
    expect(id).toBe("node-a->node-b")
  })
})

// ============================================================================
// NODE OPERATIONS
// ============================================================================

describe("Node Operations", () => {
  test("addNode adds node to graph", () => {
    const node: DepNodeTransform = {
      id: "object_transform:obj-1",
      type: "object_transform",
      ownerId: "obj-1",
      objectNodeId: "object:obj-1",
      state: "dirty",
      pendingTags: DepTag.TRANSFORM,
      priority: "normal",
    }

    addNode(graph, node)

    expect(graph.nodes.size).toBe(1)
    expect(graph.nodes.get(node.id)).toBe(node)
    expect(graph.version).toBe(1)
  })

  test("addNode initializes adjacency lists", () => {
    const node: DepNodeTransform = {
      id: "object_transform:obj-1",
      type: "object_transform",
      ownerId: "obj-1",
      objectNodeId: "object:obj-1",
      state: "dirty",
      pendingTags: DepTag.TRANSFORM,
      priority: "normal",
    }

    addNode(graph, node)

    expect(graph.outgoing.has(node.id)).toBe(true)
    expect(graph.incoming.has(node.id)).toBe(true)
    expect(graph.outgoing.get(node.id)?.size).toBe(0)
    expect(graph.incoming.get(node.id)?.size).toBe(0)
  })

  test("removeNode removes node and cleans up", () => {
    const node: DepNodeTransform = {
      id: "object_transform:obj-1",
      type: "object_transform",
      ownerId: "obj-1",
      objectNodeId: "object:obj-1",
      state: "dirty",
      pendingTags: DepTag.TRANSFORM,
      priority: "normal",
    }

    addNode(graph, node)
    graph.dirtyNodes.add(node.id)

    removeNode(graph, node.id)

    expect(graph.nodes.size).toBe(0)
    expect(graph.outgoing.has(node.id)).toBe(false)
    expect(graph.incoming.has(node.id)).toBe(false)
    expect(graph.dirtyNodes.has(node.id)).toBe(false)
  })

  test("removeNode removes associated relations", () => {
    // Create two nodes with a relation
    const nodeA: DepNodeTransform = {
      id: "object_transform:obj-a",
      type: "object_transform",
      ownerId: "obj-a",
      objectNodeId: "object:obj-a",
      state: "dirty",
      pendingTags: DepTag.TRANSFORM,
      priority: "normal",
    }
    const nodeB: DepNodeTransform = {
      id: "object_transform:obj-b",
      type: "object_transform",
      ownerId: "obj-b",
      objectNodeId: "object:obj-b",
      state: "dirty",
      pendingTags: DepTag.TRANSFORM,
      priority: "normal",
    }

    addNode(graph, nodeA)
    addNode(graph, nodeB)
    addRelation(graph, nodeA.id, nodeB.id, "depends_on", DepTag.ALL)

    expect(graph.relations.size).toBe(1)

    removeNode(graph, nodeA.id)

    expect(graph.relations.size).toBe(0)
    expect(graph.incoming.get(nodeB.id)?.size).toBe(0)
  })
})

// ============================================================================
// OBJECT NODE OPERATIONS
// ============================================================================

describe("Object Node Operations", () => {
  test("addObjectNode creates object with all components", () => {
    const objectNode = addObjectNode(graph, "obj-1", {
      hasGeometry: true,
      hasModifiers: true,
      hasMaterial: true,
    })

    expect(objectNode.id).toBe("object:obj-1")
    expect(objectNode.type).toBe("object")
    expect(objectNode.components.transform).toBe("object_transform:obj-1")
    expect(objectNode.components.geometry).toBe("object_geometry:obj-1")
    expect(objectNode.components.modifiers).toBe("object_modifier:obj-1")

    // Object + transform + geometry + modifier = 4 nodes
    expect(graph.nodes.size).toBe(4)
  })

  test("addObjectNode creates relations between components", () => {
    addObjectNode(graph, "obj-1", {
      hasGeometry: true,
      hasModifiers: true,
    })

    // Check that geometry -> modifier relation exists
    const geometryNodeId = "object_geometry:obj-1"
    const modifierNodeId = "object_modifier:obj-1"

    const outgoing = graph.outgoing.get(geometryNodeId)
    expect(outgoing).toBeDefined()
    expect(outgoing?.size).toBeGreaterThan(0)

    // Find the relation
    const hasGeometryToModifierRelation = Array.from(outgoing || []).some((relId) => {
      const rel = graph.relations.get(relId)
      return rel?.toId === modifierNodeId
    })
    expect(hasGeometryToModifierRelation).toBe(true)
  })

  test("addObjectNode marks object as dirty", () => {
    addObjectNode(graph, "obj-1")

    expect(graph.dirtyNodes.has("object:obj-1")).toBe(true)
  })

  test("addObjectNode respects options", () => {
    addObjectNode(graph, "obj-1", {
      hasGeometry: false,
      hasModifiers: false,
      hasMaterial: false,
    })

    // Only object + transform
    expect(graph.nodes.size).toBe(2)
    expect(graph.nodes.has("object:obj-1")).toBe(true)
    expect(graph.nodes.has("object_transform:obj-1")).toBe(true)
    expect(graph.nodes.has("object_geometry:obj-1")).toBe(false)
  })

  test("removeObjectNode removes object and all components", () => {
    addObjectNode(graph, "obj-1", {
      hasGeometry: true,
      hasModifiers: true,
    })

    expect(graph.nodes.size).toBe(4)

    removeObjectNode(graph, "obj-1")

    expect(graph.nodes.size).toBe(0)
  })
})

// ============================================================================
// RELATION OPERATIONS
// ============================================================================

describe("Relation Operations", () => {
  test("addRelation creates relation between nodes", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")

    const relation = addRelation(
      graph,
      "object:obj-a",
      "object:obj-b",
      "depends_on",
      DepTag.GEOMETRY,
      "Test dependency"
    )

    expect(relation.fromId).toBe("object:obj-a")
    expect(relation.toId).toBe("object:obj-b")
    expect(relation.type).toBe("depends_on")
    expect(relation.tagMask).toBe(DepTag.GEOMETRY)
    expect(relation.description).toBe("Test dependency")
  })

  test("addRelation updates adjacency lists", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")

    const relation = addRelation(graph, "object:obj-a", "object:obj-b", "depends_on")

    expect(graph.outgoing.get("object:obj-a")?.has(relation.id)).toBe(true)
    expect(graph.incoming.get("object:obj-b")?.has(relation.id)).toBe(true)
  })

  test("removeRelation cleans up properly", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")

    const relation = addRelation(graph, "object:obj-a", "object:obj-b", "depends_on")
    const relationId = relation.id

    removeRelation(graph, relationId)

    expect(graph.relations.has(relationId)).toBe(false)
    expect(graph.outgoing.get("object:obj-a")?.has(relationId)).toBe(false)
    expect(graph.incoming.get("object:obj-b")?.has(relationId)).toBe(false)
  })
})

// ============================================================================
// DIRTY PROPAGATION
// ============================================================================

describe("Dirty Propagation", () => {
  test("tagNodeDirty marks node as dirty", () => {
    addObjectNode(graph, "obj-1")
    const nodeId = "object:obj-1"

    // Clear initial dirty state
    clearNodeDirty(graph, nodeId)
    expect(graph.dirtyNodes.has(nodeId)).toBe(false)

    tagNodeDirty(graph, nodeId, DepTag.TRANSFORM)

    expect(graph.dirtyNodes.has(nodeId)).toBe(true)
    const node = graph.nodes.get(nodeId)
    expect(node?.state).toBe("dirty")
    expect((node?.pendingTags ?? 0) & DepTag.TRANSFORM).toBe(DepTag.TRANSFORM)
  })

  test("tagNodeDirty propagates to dependents", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")

    // B depends on A
    addRelation(graph, "object:obj-a", "object:obj-b", "depends_on", DepTag.GEOMETRY)

    // Clear initial dirty states
    clearNodeDirty(graph, "object:obj-a")
    clearNodeDirty(graph, "object:obj-b")

    // Tag A as dirty with GEOMETRY
    tagNodeDirty(graph, "object:obj-a", DepTag.GEOMETRY)

    // B should also be dirty (propagated through relation)
    expect(graph.dirtyNodes.has("object:obj-a")).toBe(true)
    expect(graph.dirtyNodes.has("object:obj-b")).toBe(true)
  })

  test("tagNodeDirty respects tag mask", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")

    // B depends on A but only for GEOMETRY changes
    addRelation(graph, "object:obj-a", "object:obj-b", "depends_on", DepTag.GEOMETRY)

    clearNodeDirty(graph, "object:obj-a")
    clearNodeDirty(graph, "object:obj-b")

    // Tag A with TRANSFORM (not in mask)
    tagNodeDirty(graph, "object:obj-a", DepTag.TRANSFORM)

    // A should be dirty, but B should NOT (tag not in mask)
    expect(graph.dirtyNodes.has("object:obj-a")).toBe(true)
    expect(graph.dirtyNodes.has("object:obj-b")).toBe(false)
  })

  test("tagObjectDirty tags appropriate components", () => {
    addObjectNode(graph, "obj-1", { hasGeometry: true, hasModifiers: true })

    // Clear all dirty
    for (const nodeId of graph.dirtyNodes) {
      clearNodeDirty(graph, nodeId)
    }

    tagObjectDirty(graph, "obj-1", DepTag.GEOMETRY)

    expect(graph.dirtyNodes.has("object_geometry:obj-1")).toBe(true)
  })

  test("clearNodeDirty resets node state", () => {
    addObjectNode(graph, "obj-1")
    const nodeId = "object:obj-1"

    expect(graph.dirtyNodes.has(nodeId)).toBe(true)

    clearNodeDirty(graph, nodeId)

    expect(graph.dirtyNodes.has(nodeId)).toBe(false)
    const node = graph.nodes.get(nodeId)
    expect(node?.state).toBe("valid")
    expect(node?.pendingTags).toBe(DepTag.NONE)
    expect(node?.lastEvalTime).toBeDefined()
  })
})

// ============================================================================
// TOPOLOGICAL ORDERING
// ============================================================================

describe("Topological Ordering", () => {
  test("getDirtyNodesOrdered returns empty for clean graph", () => {
    addObjectNode(graph, "obj-1")

    // Clear dirty
    for (const nodeId of [...graph.dirtyNodes]) {
      clearNodeDirty(graph, nodeId)
    }

    const order = getDirtyNodesOrdered(graph)
    expect(order.length).toBe(0)
  })

  test("getDirtyNodesOrdered returns nodes in dependency order", () => {
    // Create A -> B -> C dependency chain
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")
    addObjectNode(graph, "obj-c")

    addRelation(graph, "object:obj-a", "object:obj-b", "depends_on", DepTag.ALL)
    addRelation(graph, "object:obj-b", "object:obj-c", "depends_on", DepTag.ALL)

    const order = getDirtyNodesOrdered(graph)

    // Find positions of object nodes
    const posA = order.findIndex((id) => id === "object:obj-a")
    const posB = order.findIndex((id) => id === "object:obj-b")
    const posC = order.findIndex((id) => id === "object:obj-c")

    // A should come before B, B should come before C
    expect(posA).toBeLessThan(posB)
    expect(posB).toBeLessThan(posC)
  })

  test("getDirtyNodesOrdered handles complex graphs", () => {
    // Create diamond dependency: A -> B, A -> C, B -> D, C -> D
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")
    addObjectNode(graph, "obj-c")
    addObjectNode(graph, "obj-d")

    addRelation(graph, "object:obj-a", "object:obj-b", "depends_on", DepTag.ALL)
    addRelation(graph, "object:obj-a", "object:obj-c", "depends_on", DepTag.ALL)
    addRelation(graph, "object:obj-b", "object:obj-d", "depends_on", DepTag.ALL)
    addRelation(graph, "object:obj-c", "object:obj-d", "depends_on", DepTag.ALL)

    const order = getDirtyNodesOrdered(graph)

    const posA = order.findIndex((id) => id === "object:obj-a")
    const posB = order.findIndex((id) => id === "object:obj-b")
    const posC = order.findIndex((id) => id === "object:obj-c")
    const posD = order.findIndex((id) => id === "object:obj-d")

    // A should come before B and C
    expect(posA).toBeLessThan(posB)
    expect(posA).toBeLessThan(posC)
    // B and C should come before D
    expect(posB).toBeLessThan(posD)
    expect(posC).toBeLessThan(posD)
  })
})

// ============================================================================
// CYCLE DETECTION
// ============================================================================

describe("Cycle Detection", () => {
  test("hasCycles returns false for acyclic graph", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")
    addObjectNode(graph, "obj-c")

    addRelation(graph, "object:obj-a", "object:obj-b", "depends_on")
    addRelation(graph, "object:obj-b", "object:obj-c", "depends_on")

    expect(hasCycles(graph)).toBe(false)
  })

  test("hasCycles returns true for direct cycle", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")

    addRelation(graph, "object:obj-a", "object:obj-b", "depends_on")
    addRelation(graph, "object:obj-b", "object:obj-a", "depends_on")

    expect(hasCycles(graph)).toBe(true)
  })

  test("hasCycles returns true for indirect cycle", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")
    addObjectNode(graph, "obj-c")

    addRelation(graph, "object:obj-a", "object:obj-b", "depends_on")
    addRelation(graph, "object:obj-b", "object:obj-c", "depends_on")
    addRelation(graph, "object:obj-c", "object:obj-a", "depends_on")

    expect(hasCycles(graph)).toBe(true)
  })

  test("hasCycles returns false for empty graph", () => {
    expect(hasCycles(graph)).toBe(false)
  })
})

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

describe("Query Functions", () => {
  test("getDependents returns correct nodes", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")
    addObjectNode(graph, "obj-c")

    addRelation(graph, "object:obj-a", "object:obj-b", "depends_on")
    addRelation(graph, "object:obj-a", "object:obj-c", "depends_on")

    const dependents = getDependents(graph, "object:obj-a")

    expect(dependents).toContain("object:obj-b")
    expect(dependents).toContain("object:obj-c")
    expect(dependents.length).toBe(2)
  })

  test("getDependencies returns correct nodes", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")
    addObjectNode(graph, "obj-c")

    addRelation(graph, "object:obj-a", "object:obj-c", "depends_on")
    addRelation(graph, "object:obj-b", "object:obj-c", "depends_on")

    const dependencies = getDependencies(graph, "object:obj-c")

    // Should include the explicitly added dependencies
    expect(dependencies).toContain("object:obj-a")
    expect(dependencies).toContain("object:obj-b")
    // Also includes internal component relations (transform, geometry -> object)
    expect(dependencies.length).toBeGreaterThanOrEqual(2)
  })

  test("getGraphStats returns correct counts", () => {
    addObjectNode(graph, "obj-a")
    addObjectNode(graph, "obj-b")

    addRelation(graph, "object:obj-a", "object:obj-b", "depends_on")

    const stats = getGraphStats(graph)

    expect(stats.nodeCount).toBeGreaterThan(0)
    expect(stats.relationCount).toBeGreaterThan(0)
    expect(stats.dirtyCount).toBeGreaterThan(0)
    expect(stats.version).toBeGreaterThan(0)
  })
})

// ============================================================================
// OBJECT DEPENDENCY
// ============================================================================

describe("Object Dependency", () => {
  test("addObjectDependency creates relation between object geometries", () => {
    addObjectNode(graph, "obj-source", { hasGeometry: true, hasModifiers: true })
    addObjectNode(graph, "obj-target", { hasGeometry: true })

    const initialRelationCount = graph.relations.size

    addObjectDependency(graph, "obj-source", "obj-target", "modifier_target", DepTag.GEOMETRY)

    // Should have created a new relation
    expect(graph.relations.size).toBeGreaterThan(initialRelationCount)
  })
})

// ============================================================================
// DEP TAG BITWISE OPERATIONS
// ============================================================================

describe("DepTag Bitwise Operations", () => {
  test("DepTag values are distinct powers of 2", () => {
    expect(DepTag.TRANSFORM).toBe(1)
    expect(DepTag.GEOMETRY).toBe(2)
    expect(DepTag.MODIFIERS).toBe(4)
    expect(DepTag.MATERIAL).toBe(8)
    expect(DepTag.VISIBILITY).toBe(16)
    expect(DepTag.SELECTION).toBe(32)
  })

  test("DepTag.ALL includes all tags", () => {
    expect(DepTag.ALL & DepTag.TRANSFORM).toBe(DepTag.TRANSFORM)
    expect(DepTag.ALL & DepTag.GEOMETRY).toBe(DepTag.GEOMETRY)
    expect(DepTag.ALL & DepTag.MODIFIERS).toBe(DepTag.MODIFIERS)
    expect(DepTag.ALL & DepTag.MATERIAL).toBe(DepTag.MATERIAL)
    expect(DepTag.ALL & DepTag.VISIBILITY).toBe(DepTag.VISIBILITY)
    expect(DepTag.ALL & DepTag.SELECTION).toBe(DepTag.SELECTION)
  })

  test("tags can be combined with OR", () => {
    const combined = DepTag.TRANSFORM | DepTag.GEOMETRY
    expect(combined & DepTag.TRANSFORM).toBe(DepTag.TRANSFORM)
    expect(combined & DepTag.GEOMETRY).toBe(DepTag.GEOMETRY)
    expect(combined & DepTag.MATERIAL).toBe(0)
  })
})
