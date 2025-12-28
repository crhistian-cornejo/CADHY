/**
 * @fileoverview Node Graph Evaluation Engine
 * @module editors/space_node
 *
 * Evaluates node graphs by calling CAD backend commands.
 * Inspired by Blender's depsgraph evaluation system.
 */

import { invoke } from "@tauri-apps/api/core"

import type { Connection, Node, NodeGraph } from "./SN_types"

// ============================================================================
// TYPES
// ============================================================================

/** Result of evaluating a single node */
export interface NodeEvalResult {
  nodeId: string
  success: boolean
  outputs: Map<string, unknown>
  error?: string
  shapeId?: string // For nodes that produce shapes
}

/** Result of evaluating an entire graph */
export interface GraphEvalResult {
  success: boolean
  nodeResults: Map<string, NodeEvalResult>
  outputShapeIds: string[] // Final shape IDs from output nodes
  errors: string[]
  evalTimeMs: number
}

/** Context passed during evaluation */
interface EvalContext {
  nodeOutputs: Map<string, Map<string, unknown>> // nodeId -> socketName -> value
  shapeRegistry: Map<string, string> // nodeId -> shapeId (for cleanup)
}

// ============================================================================
// TOPOLOGICAL SORT
// ============================================================================

/**
 * Get nodes in topological order (dependencies first)
 * This ensures we evaluate input nodes before nodes that depend on them
 */
function getEvaluationOrder(graph: NodeGraph): string[] {
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const order: string[] = []

  // Build dependency map: nodeId -> nodes it depends on
  const dependsOn = new Map<string, Set<string>>()
  for (const node of graph.nodes) {
    dependsOn.set(node.id, new Set())
  }

  for (const conn of graph.connections) {
    const deps = dependsOn.get(conn.toNodeId)
    if (deps) {
      deps.add(conn.fromNodeId)
    }
  }

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) {
      console.warn(`[NodeEval] Cycle detected at node: ${nodeId}`)
      return false // Cycle detected
    }
    if (visited.has(nodeId)) {
      return true // Already processed
    }

    visiting.add(nodeId)

    // Visit dependencies first
    const deps = dependsOn.get(nodeId)
    if (deps) {
      for (const depId of deps) {
        if (!visit(depId)) {
          return false
        }
      }
    }

    visiting.delete(nodeId)
    visited.add(nodeId)
    order.push(nodeId)
    return true
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      visit(node.id)
    }
  }

  return order
}

// ============================================================================
// INPUT RESOLUTION
// ============================================================================

/**
 * Get the value of an input socket, either from a connection or default value
 */
function getInputValue(
  node: Node,
  socketName: string,
  graph: NodeGraph,
  ctx: EvalContext
): unknown {
  const socket = node.inputs.find((s) => s.name === socketName)
  if (!socket) {
    return undefined
  }

  // Check if there's a connection to this socket
  const connection = graph.connections.find(
    (c) => c.toNodeId === node.id && c.toSocketId === socket.id
  )

  if (connection) {
    // Get the output value from the connected node
    const sourceOutputs = ctx.nodeOutputs.get(connection.fromNodeId)
    if (sourceOutputs) {
      // Find the socket name from the source node
      const sourceNode = graph.nodes.find((n) => n.id === connection.fromNodeId)
      const sourceSocket = sourceNode?.outputs.find((s) => s.id === connection.fromSocketId)
      if (sourceSocket) {
        return sourceOutputs.get(sourceSocket.name)
      }
    }
  }

  // Use socket's current value or default value
  return socket.value ?? socket.defaultValue
}

// ============================================================================
// NODE EVALUATORS
// ============================================================================

type NodeEvaluator = (node: Node, graph: NodeGraph, ctx: EvalContext) => Promise<NodeEvalResult>

/**
 * Evaluate a primitive input node (box, cylinder, sphere, etc.)
 */
async function evalPrimitive(
  node: Node,
  graph: NodeGraph,
  ctx: EvalContext
): Promise<NodeEvalResult> {
  const outputs = new Map<string, unknown>()

  try {
    let result: { id: string }

    switch (node.typeId) {
      case "input.box": {
        const width = getInputValue(node, "Width", graph, ctx) as number
        const height = getInputValue(node, "Height", graph, ctx) as number
        const depth = getInputValue(node, "Depth", graph, ctx) as number
        result = await invoke<{ id: string }>("cad_create_box", {
          width: width ?? 1,
          depth: depth ?? 1,
          height: height ?? 1,
        })
        break
      }

      case "input.cylinder": {
        const radius = getInputValue(node, "Radius", graph, ctx) as number
        const height = getInputValue(node, "Height", graph, ctx) as number
        result = await invoke<{ id: string }>("cad_create_cylinder", {
          radius: radius ?? 0.5,
          height: height ?? 1,
        })
        break
      }

      case "input.sphere": {
        const radius = getInputValue(node, "Radius", graph, ctx) as number
        result = await invoke<{ id: string }>("cad_create_sphere", {
          radius: radius ?? 0.5,
        })
        break
      }

      default:
        throw new Error(`Unknown primitive type: ${node.typeId}`)
    }

    outputs.set("Shape", result.id)
    ctx.shapeRegistry.set(node.id, result.id)

    return { nodeId: node.id, success: true, outputs, shapeId: result.id }
  } catch (error) {
    return {
      nodeId: node.id,
      success: false,
      outputs,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Evaluate a value/vector input node
 */
async function evalValue(node: Node, graph: NodeGraph, ctx: EvalContext): Promise<NodeEvalResult> {
  const outputs = new Map<string, unknown>()

  switch (node.typeId) {
    case "input.value": {
      const value = (node.properties.value as number) ?? 0
      outputs.set("Value", value)
      break
    }

    case "input.vector": {
      const x = getInputValue(node, "X", graph, ctx) as number
      const y = getInputValue(node, "Y", graph, ctx) as number
      const z = getInputValue(node, "Z", graph, ctx) as number
      outputs.set("Vector", { x: x ?? 0, y: y ?? 0, z: z ?? 0 })
      break
    }
  }

  return { nodeId: node.id, success: true, outputs }
}

/**
 * Evaluate a boolean modifier node
 */
async function evalBoolean(
  node: Node,
  graph: NodeGraph,
  ctx: EvalContext
): Promise<NodeEvalResult> {
  const outputs = new Map<string, unknown>()

  try {
    const shapeAId = getInputValue(node, "Shape A", graph, ctx) as string
    const shapeBId = getInputValue(node, "Shape B", graph, ctx) as string
    // For boolean_cut, inputs are "Shape" and "Tool"
    const shapeId = getInputValue(node, "Shape", graph, ctx) as string
    const toolId = getInputValue(node, "Tool", graph, ctx) as string

    if (!shapeAId && !shapeId) {
      throw new Error("Missing input shape")
    }

    let result: { id: string }

    switch (node.typeId) {
      case "modifier.boolean_union":
        if (!shapeBId) throw new Error("Missing Shape B for union")
        result = await invoke<{ id: string }>("cad_boolean_fuse", {
          shape1Id: shapeAId,
          shape2Id: shapeBId,
        })
        break

      case "modifier.boolean_cut":
        if (!toolId) throw new Error("Missing Tool shape for cut")
        result = await invoke<{ id: string }>("cad_boolean_cut", {
          shape1Id: shapeId,
          shape2Id: toolId,
        })
        break

      case "modifier.boolean_intersect":
        if (!shapeBId) throw new Error("Missing Shape B for intersect")
        result = await invoke<{ id: string }>("cad_boolean_common", {
          shape1Id: shapeAId,
          shape2Id: shapeBId,
        })
        break

      default:
        throw new Error(`Unknown boolean type: ${node.typeId}`)
    }

    outputs.set("Shape", result.id)
    ctx.shapeRegistry.set(node.id, result.id)

    return { nodeId: node.id, success: true, outputs, shapeId: result.id }
  } catch (error) {
    return {
      nodeId: node.id,
      success: false,
      outputs,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Evaluate a modifier node (fillet, chamfer, shell)
 */
async function evalModifier(
  node: Node,
  graph: NodeGraph,
  ctx: EvalContext
): Promise<NodeEvalResult> {
  const outputs = new Map<string, unknown>()

  try {
    const shapeId = getInputValue(node, "Shape", graph, ctx) as string
    if (!shapeId) {
      throw new Error("Missing input shape")
    }

    let result: { id: string }

    switch (node.typeId) {
      case "modifier.fillet": {
        const radius = getInputValue(node, "Radius", graph, ctx) as number
        result = await invoke<{ id: string }>("cad_fillet", {
          shapeId,
          radius: radius ?? 0.1,
        })
        break
      }

      case "modifier.chamfer": {
        const distance = getInputValue(node, "Distance", graph, ctx) as number
        result = await invoke<{ id: string }>("cad_chamfer", {
          shapeId,
          distance: distance ?? 0.1,
        })
        break
      }

      case "modifier.shell": {
        const thickness = getInputValue(node, "Thickness", graph, ctx) as number
        result = await invoke<{ id: string }>("cad_shell", {
          shapeId,
          thickness: thickness ?? 0.1,
        })
        break
      }

      default:
        throw new Error(`Unknown modifier type: ${node.typeId}`)
    }

    outputs.set("Shape", result.id)
    ctx.shapeRegistry.set(node.id, result.id)

    return { nodeId: node.id, success: true, outputs, shapeId: result.id }
  } catch (error) {
    return {
      nodeId: node.id,
      success: false,
      outputs,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Evaluate a transform node
 */
async function evalTransform(
  node: Node,
  graph: NodeGraph,
  ctx: EvalContext
): Promise<NodeEvalResult> {
  const outputs = new Map<string, unknown>()

  try {
    const shapeId = getInputValue(node, "Shape", graph, ctx) as string
    if (!shapeId) {
      throw new Error("Missing input shape")
    }

    let result: { id: string }

    switch (node.typeId) {
      case "transform.translate": {
        const offset = getInputValue(node, "Offset", graph, ctx) as {
          x: number
          y: number
          z: number
        }
        result = await invoke<{ id: string }>("cad_translate", {
          shapeId,
          dx: offset?.x ?? 0,
          dy: offset?.y ?? 0,
          dz: offset?.z ?? 0,
        })
        break
      }

      case "transform.rotate": {
        const axis = getInputValue(node, "Axis", graph, ctx) as {
          x: number
          y: number
          z: number
        }
        const angle = getInputValue(node, "Angle", graph, ctx) as number
        result = await invoke<{ id: string }>("cad_rotate", {
          shapeId,
          originX: 0,
          originY: 0,
          originZ: 0,
          axisX: axis?.x ?? 0,
          axisY: axis?.y ?? 0,
          axisZ: axis?.z ?? 1,
          angleRadians: ((angle ?? 0) * Math.PI) / 180,
        })
        break
      }

      case "transform.scale": {
        const factor = getInputValue(node, "Factor", graph, ctx) as {
          x: number
          y: number
          z: number
        }
        // Use uniform scale with average of x, y, z
        const avgScale = ((factor?.x ?? 1) + (factor?.y ?? 1) + (factor?.z ?? 1)) / 3
        result = await invoke<{ id: string }>("cad_scale", {
          shapeId,
          centerX: 0,
          centerY: 0,
          centerZ: 0,
          factor: avgScale,
        })
        break
      }

      default:
        throw new Error(`Unknown transform type: ${node.typeId}`)
    }

    outputs.set("Shape", result.id)
    ctx.shapeRegistry.set(node.id, result.id)

    return { nodeId: node.id, success: true, outputs, shapeId: result.id }
  } catch (error) {
    return {
      nodeId: node.id,
      success: false,
      outputs,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Evaluate a geometry operation node (extrude, revolve, loft)
 */
async function evalGeometry(
  node: Node,
  graph: NodeGraph,
  ctx: EvalContext
): Promise<NodeEvalResult> {
  const outputs = new Map<string, unknown>()

  try {
    let result: { id: string }

    switch (node.typeId) {
      case "geometry.extrude": {
        const shapeId = getInputValue(node, "Shape", graph, ctx) as string
        const direction = getInputValue(node, "Direction", graph, ctx) as {
          x: number
          y: number
          z: number
        }
        const length = getInputValue(node, "Length", graph, ctx) as number
        if (!shapeId) throw new Error("Missing input shape")

        result = await invoke<{ id: string }>("cad_extrude", {
          shapeId,
          dx: (direction?.x ?? 0) * (length ?? 1),
          dy: (direction?.y ?? 0) * (length ?? 1),
          dz: (direction?.z ?? 1) * (length ?? 1),
        })
        break
      }

      case "geometry.revolve": {
        const profileId = getInputValue(node, "Profile", graph, ctx) as string
        const axis = getInputValue(node, "Axis", graph, ctx) as {
          x: number
          y: number
          z: number
        }
        const angle = getInputValue(node, "Angle", graph, ctx) as number
        if (!profileId) throw new Error("Missing profile shape")

        result = await invoke<{ id: string }>("cad_revolve", {
          shapeId: profileId,
          originX: 0,
          originY: 0,
          originZ: 0,
          axisX: axis?.x ?? 0,
          axisY: axis?.y ?? 0,
          axisZ: axis?.z ?? 1,
          angleRadians: ((angle ?? 360) * Math.PI) / 180,
        })
        break
      }

      case "geometry.loft": {
        // TODO: Implement loft with multiple profiles
        throw new Error("Loft node not yet implemented")
      }

      default:
        throw new Error(`Unknown geometry type: ${node.typeId}`)
    }

    outputs.set("Shape", result.id)
    ctx.shapeRegistry.set(node.id, result.id)

    return { nodeId: node.id, success: true, outputs, shapeId: result.id }
  } catch (error) {
    return {
      nodeId: node.id,
      success: false,
      outputs,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Evaluate a math node
 */
async function evalMath(node: Node, graph: NodeGraph, ctx: EvalContext): Promise<NodeEvalResult> {
  const outputs = new Map<string, unknown>()

  const a = getInputValue(node, "A", graph, ctx) as number
  const b = getInputValue(node, "B", graph, ctx) as number

  switch (node.typeId) {
    case "math.add":
      outputs.set("Result", (a ?? 0) + (b ?? 0))
      break
    case "math.multiply":
      outputs.set("Result", (a ?? 1) * (b ?? 1))
      break
  }

  return { nodeId: node.id, success: true, outputs }
}

/**
 * Evaluate an output node
 */
async function evalOutput(node: Node, graph: NodeGraph, ctx: EvalContext): Promise<NodeEvalResult> {
  const shapeId = getInputValue(node, "Shape", graph, ctx) as string
  const outputs = new Map<string, unknown>()

  if (shapeId) {
    outputs.set("Shape", shapeId)
  }

  return { nodeId: node.id, success: true, outputs, shapeId }
}

/**
 * Get the evaluator function for a node type
 */
function getEvaluator(typeId: string): NodeEvaluator | null {
  if (
    typeId.startsWith("input.box") ||
    typeId.startsWith("input.cylinder") ||
    typeId.startsWith("input.sphere")
  ) {
    return evalPrimitive
  }
  if (typeId === "input.value" || typeId === "input.vector") {
    return evalValue
  }
  if (typeId.startsWith("modifier.boolean")) {
    return evalBoolean
  }
  if (typeId.startsWith("modifier.")) {
    return evalModifier
  }
  if (typeId.startsWith("transform.")) {
    return evalTransform
  }
  if (typeId.startsWith("geometry.")) {
    return evalGeometry
  }
  if (typeId.startsWith("math.")) {
    return evalMath
  }
  if (typeId.startsWith("output.")) {
    return evalOutput
  }
  return null
}

// ============================================================================
// MAIN EVALUATION FUNCTION
// ============================================================================

/**
 * Evaluate a node graph
 *
 * @param graph - The node graph to evaluate
 * @returns Evaluation result with output shape IDs
 */
export async function evaluateGraph(graph: NodeGraph): Promise<GraphEvalResult> {
  const startTime = performance.now()
  const nodeResults = new Map<string, NodeEvalResult>()
  const errors: string[] = []
  const outputShapeIds: string[] = []

  const ctx: EvalContext = {
    nodeOutputs: new Map(),
    shapeRegistry: new Map(),
  }

  // Get nodes in evaluation order
  const order = getEvaluationOrder(graph)

  // Evaluate each node
  for (const nodeId of order) {
    const node = graph.nodes.find((n) => n.id === nodeId)
    if (!node) continue

    // Skip muted nodes
    if (node.muted) {
      continue
    }

    // Get the evaluator for this node type
    const evaluator = getEvaluator(node.typeId)
    if (!evaluator) {
      const error = `No evaluator for node type: ${node.typeId}`
      errors.push(error)
      nodeResults.set(nodeId, {
        nodeId,
        success: false,
        outputs: new Map(),
        error,
      })
      continue
    }

    // Evaluate the node
    const result = await evaluator(node, graph, ctx)
    nodeResults.set(nodeId, result)

    if (result.success) {
      ctx.nodeOutputs.set(nodeId, result.outputs)

      // Collect output shape IDs from output nodes
      if (node.typeId.startsWith("output.") && result.shapeId) {
        outputShapeIds.push(result.shapeId)
      }
    } else if (result.error) {
      errors.push(`Node "${node.label || node.typeId}": ${result.error}`)
    }
  }

  return {
    success: errors.length === 0,
    nodeResults,
    outputShapeIds,
    errors,
    evalTimeMs: performance.now() - startTime,
  }
}

/**
 * Clean up shapes created during evaluation
 */
export async function cleanupEvaluation(result: GraphEvalResult): Promise<void> {
  // Note: In a real implementation, we might want to clean up intermediate shapes
  // but keep the final output shapes. For now, we keep everything.
}
