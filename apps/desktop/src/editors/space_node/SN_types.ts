/**
 * @fileoverview Space Node Types
 * @module editors/space_node
 *
 * Blender-inspired node system for CAD operations.
 */

// ============================================================================
// SOCKET TYPES
// ============================================================================

export type SocketType =
  | "shape" // CAD shape (TopoDS_Shape)
  | "mesh" // Tessellated mesh
  | "curve" // 2D/3D curve
  | "number" // Float/Int
  | "vector" // Vector3D
  | "boolean" // Bool
  | "string" // Text
  | "color" // RGB/RGBA
  | "transform" // 4x4 matrix
  | "material" // Material reference

export interface Socket {
  id: string
  name: string
  type: SocketType
  isInput: boolean
  isMultiple?: boolean // Can accept multiple connections
  defaultValue?: unknown
  value?: unknown
  connections: string[] // Connected socket IDs
}

// ============================================================================
// NODE TYPES
// ============================================================================

export type NodeCategory =
  | "input" // Input nodes (primitives, parameters)
  | "geometry" // Geometry operations
  | "transform" // Transform operations
  | "modifier" // Modifiers (boolean, fillet, etc.)
  | "output" // Output nodes
  | "math" // Math operations
  | "utility" // Utility nodes

export interface NodeType {
  id: string
  category: NodeCategory
  name: string
  description: string
  inputs: Omit<Socket, "id" | "connections">[]
  outputs: Omit<Socket, "id" | "connections">[]
  color?: string
  icon?: string
}

export interface Node {
  id: string
  typeId: string
  position: { x: number; y: number }
  width?: number
  collapsed?: boolean
  inputs: Socket[]
  outputs: Socket[]
  properties: Record<string, unknown>
  label?: string
  muted?: boolean
}

// ============================================================================
// CONNECTION
// ============================================================================

export interface Connection {
  id: string
  fromNodeId: string
  fromSocketId: string
  toNodeId: string
  toSocketId: string
}

// ============================================================================
// NODE GRAPH
// ============================================================================

export interface NodeGraph {
  id: string
  name: string
  nodes: Node[]
  connections: Connection[]
  viewPosition: { x: number; y: number }
  viewZoom: number
}

// ============================================================================
// BUILT-IN NODE DEFINITIONS
// ============================================================================

export const NODE_DEFINITIONS: NodeType[] = [
  // ---- INPUT ----
  {
    id: "input.box",
    category: "input",
    name: "Box",
    description: "Create a box primitive",
    inputs: [
      { name: "Width", type: "number", isInput: true, defaultValue: 1 },
      { name: "Height", type: "number", isInput: true, defaultValue: 1 },
      { name: "Depth", type: "number", isInput: true, defaultValue: 1 },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#4CAF50",
  },
  {
    id: "input.cylinder",
    category: "input",
    name: "Cylinder",
    description: "Create a cylinder primitive",
    inputs: [
      { name: "Radius", type: "number", isInput: true, defaultValue: 0.5 },
      { name: "Height", type: "number", isInput: true, defaultValue: 1 },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#4CAF50",
  },
  {
    id: "input.sphere",
    category: "input",
    name: "Sphere",
    description: "Create a sphere primitive",
    inputs: [{ name: "Radius", type: "number", isInput: true, defaultValue: 0.5 }],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#4CAF50",
  },
  {
    id: "input.value",
    category: "input",
    name: "Value",
    description: "A numeric value",
    inputs: [],
    outputs: [{ name: "Value", type: "number", isInput: false }],
    color: "#9E9E9E",
  },
  {
    id: "input.vector",
    category: "input",
    name: "Vector",
    description: "A 3D vector",
    inputs: [
      { name: "X", type: "number", isInput: true, defaultValue: 0 },
      { name: "Y", type: "number", isInput: true, defaultValue: 0 },
      { name: "Z", type: "number", isInput: true, defaultValue: 0 },
    ],
    outputs: [{ name: "Vector", type: "vector", isInput: false }],
    color: "#9E9E9E",
  },

  // ---- GEOMETRY ----
  {
    id: "geometry.extrude",
    category: "geometry",
    name: "Extrude",
    description: "Extrude a shape along a direction",
    inputs: [
      { name: "Shape", type: "shape", isInput: true },
      { name: "Direction", type: "vector", isInput: true },
      { name: "Length", type: "number", isInput: true, defaultValue: 1 },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#2196F3",
  },
  {
    id: "geometry.revolve",
    category: "geometry",
    name: "Revolve",
    description: "Revolve a shape around an axis",
    inputs: [
      { name: "Profile", type: "shape", isInput: true },
      { name: "Axis", type: "vector", isInput: true },
      { name: "Angle", type: "number", isInput: true, defaultValue: 360 },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#2196F3",
  },
  {
    id: "geometry.loft",
    category: "geometry",
    name: "Loft",
    description: "Create a shape by lofting between profiles",
    inputs: [{ name: "Profiles", type: "shape", isInput: true, isMultiple: true }],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#2196F3",
  },

  // ---- TRANSFORM ----
  {
    id: "transform.translate",
    category: "transform",
    name: "Translate",
    description: "Move a shape",
    inputs: [
      { name: "Shape", type: "shape", isInput: true },
      { name: "Offset", type: "vector", isInput: true },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#FF9800",
  },
  {
    id: "transform.rotate",
    category: "transform",
    name: "Rotate",
    description: "Rotate a shape",
    inputs: [
      { name: "Shape", type: "shape", isInput: true },
      { name: "Axis", type: "vector", isInput: true },
      { name: "Angle", type: "number", isInput: true, defaultValue: 0 },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#FF9800",
  },
  {
    id: "transform.scale",
    category: "transform",
    name: "Scale",
    description: "Scale a shape",
    inputs: [
      { name: "Shape", type: "shape", isInput: true },
      { name: "Factor", type: "vector", isInput: true },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#FF9800",
  },

  // ---- MODIFIER ----
  {
    id: "modifier.boolean_union",
    category: "modifier",
    name: "Boolean Union",
    description: "Combine shapes with union",
    inputs: [
      { name: "Shape A", type: "shape", isInput: true },
      { name: "Shape B", type: "shape", isInput: true },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#E91E63",
  },
  {
    id: "modifier.boolean_cut",
    category: "modifier",
    name: "Boolean Cut",
    description: "Subtract one shape from another",
    inputs: [
      { name: "Shape", type: "shape", isInput: true },
      { name: "Tool", type: "shape", isInput: true },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#E91E63",
  },
  {
    id: "modifier.boolean_intersect",
    category: "modifier",
    name: "Boolean Intersect",
    description: "Keep intersection of shapes",
    inputs: [
      { name: "Shape A", type: "shape", isInput: true },
      { name: "Shape B", type: "shape", isInput: true },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#E91E63",
  },
  {
    id: "modifier.fillet",
    category: "modifier",
    name: "Fillet",
    description: "Round edges",
    inputs: [
      { name: "Shape", type: "shape", isInput: true },
      { name: "Radius", type: "number", isInput: true, defaultValue: 0.1 },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#E91E63",
  },
  {
    id: "modifier.chamfer",
    category: "modifier",
    name: "Chamfer",
    description: "Bevel edges",
    inputs: [
      { name: "Shape", type: "shape", isInput: true },
      { name: "Distance", type: "number", isInput: true, defaultValue: 0.1 },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#E91E63",
  },
  {
    id: "modifier.shell",
    category: "modifier",
    name: "Shell",
    description: "Hollow out a solid",
    inputs: [
      { name: "Shape", type: "shape", isInput: true },
      { name: "Thickness", type: "number", isInput: true, defaultValue: 0.1 },
    ],
    outputs: [{ name: "Shape", type: "shape", isInput: false }],
    color: "#E91E63",
  },

  // ---- MATH ----
  {
    id: "math.add",
    category: "math",
    name: "Add",
    description: "Add two numbers",
    inputs: [
      { name: "A", type: "number", isInput: true, defaultValue: 0 },
      { name: "B", type: "number", isInput: true, defaultValue: 0 },
    ],
    outputs: [{ name: "Result", type: "number", isInput: false }],
    color: "#607D8B",
  },
  {
    id: "math.multiply",
    category: "math",
    name: "Multiply",
    description: "Multiply two numbers",
    inputs: [
      { name: "A", type: "number", isInput: true, defaultValue: 1 },
      { name: "B", type: "number", isInput: true, defaultValue: 1 },
    ],
    outputs: [{ name: "Result", type: "number", isInput: false }],
    color: "#607D8B",
  },

  // ---- OUTPUT ----
  {
    id: "output.shape",
    category: "output",
    name: "Shape Output",
    description: "Output the final shape",
    inputs: [{ name: "Shape", type: "shape", isInput: true }],
    outputs: [],
    color: "#9C27B0",
  },
  {
    id: "output.viewer",
    category: "output",
    name: "Viewer",
    description: "Preview shape in viewport",
    inputs: [{ name: "Shape", type: "shape", isInput: true }],
    outputs: [],
    color: "#9C27B0",
  },
]

// ============================================================================
// HELPERS
// ============================================================================

export function getNodeDefinition(typeId: string): NodeType | undefined {
  return NODE_DEFINITIONS.find((d) => d.id === typeId)
}

export function createNode(typeId: string, position: { x: number; y: number }): Node {
  const definition = getNodeDefinition(typeId)
  if (!definition) {
    throw new Error(`Unknown node type: ${typeId}`)
  }

  const id = crypto.randomUUID()

  return {
    id,
    typeId,
    position,
    inputs: definition.inputs.map((input, i) => ({
      id: `${id}-in-${i}`,
      ...input,
      connections: [],
    })),
    outputs: definition.outputs.map((output, i) => ({
      id: `${id}-out-${i}`,
      ...output,
      connections: [],
    })),
    properties: {},
  }
}

export function getSocketColor(type: SocketType): string {
  const colors: Record<SocketType, string> = {
    shape: "#8BC34A",
    mesh: "#4CAF50",
    curve: "#00BCD4",
    number: "#9E9E9E",
    vector: "#AB47BC",
    boolean: "#FF5722",
    string: "#FFC107",
    color: "#E91E63",
    transform: "#FF9800",
    material: "#795548",
  }
  return colors[type]
}
