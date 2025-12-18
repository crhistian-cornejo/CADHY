/**
 * CAD Tools for AI - CADHY
 *
 * AI tool definitions for creating CAD primitives.
 * These match the actual ShapeObject types in modeller-store.ts
 */

import { tool } from "ai"
import { z } from "zod"

// =============================================================================
// POSITION SCHEMA (shared)
// =============================================================================

const positionSchema = z
  .object({
    x: z.number().default(0).describe("X position in meters"),
    y: z.number().default(0).describe("Y position in meters"),
    z: z.number().default(0).describe("Z position in meters"),
  })
  .optional()
  .describe("Optional position for the shape")

// =============================================================================
// BOX PRIMITIVE
// =============================================================================

export const createBoxTool = tool({
  description:
    "Create a box (rectangular prism) with specified dimensions. Use for structural elements, building blocks, or any rectangular geometry.",
  inputSchema: z.object({
    width: z.number().positive().describe("Width of the box in meters (X axis)"),
    height: z.number().positive().describe("Height of the box in meters (Y axis)"),
    depth: z.number().positive().describe("Depth of the box in meters (Z axis)"),
    name: z.string().optional().describe("Name for the shape"),
    position: positionSchema,
  }),
  execute: async (input) => {
    return {
      action: "createShape" as const,
      shapeType: "box" as const,
      parameters: { width: input.width, height: input.height, depth: input.depth },
      name: input.name ?? `Box`,
      position: input.position ?? { x: 0, y: 0, z: 0 },
    }
  },
})

// =============================================================================
// CYLINDER PRIMITIVE
// =============================================================================

export const createCylinderTool = tool({
  description:
    "Create a cylinder with specified radius and height. Use for pipes, columns, tanks, or circular structural elements.",
  inputSchema: z.object({
    radius: z.number().positive().describe("Radius of the cylinder in meters"),
    height: z.number().positive().describe("Height of the cylinder in meters"),
    name: z.string().optional().describe("Name for the shape"),
    position: positionSchema,
  }),
  execute: async (input) => {
    return {
      action: "createShape" as const,
      shapeType: "cylinder" as const,
      parameters: { radius: input.radius, height: input.height },
      name: input.name ?? `Cylinder`,
      position: input.position ?? { x: 0, y: 0, z: 0 },
    }
  },
})

// =============================================================================
// SPHERE PRIMITIVE
// =============================================================================

export const createSphereTool = tool({
  description:
    "Create a sphere with specified radius. Use for tanks, domes, or spherical geometry.",
  inputSchema: z.object({
    radius: z.number().positive().describe("Radius of the sphere in meters"),
    name: z.string().optional().describe("Name for the shape"),
    position: positionSchema,
  }),
  execute: async (input) => {
    return {
      action: "createShape" as const,
      shapeType: "sphere" as const,
      parameters: { radius: input.radius },
      name: input.name ?? `Sphere`,
      position: input.position ?? { x: 0, y: 0, z: 0 },
    }
  },
})

// =============================================================================
// CONE PRIMITIVE
// =============================================================================

export const createConeTool = tool({
  description:
    "Create a cone or truncated cone (frustum) with specified radii and height. Use for inlet/outlet structures, funnels, or tapered elements.",
  inputSchema: z.object({
    bottomRadius: z
      .number()
      .min(0)
      .describe("Bottom radius of the cone in meters (can be 0 for a point)"),
    topRadius: z
      .number()
      .min(0)
      .describe("Top radius of the cone in meters (0 for a sharp cone, >0 for truncated)"),
    height: z.number().positive().describe("Height of the cone in meters"),
    name: z.string().optional().describe("Name for the shape"),
    position: positionSchema,
  }),
  execute: async (input) => {
    return {
      action: "createShape" as const,
      shapeType: "cone" as const,
      parameters: {
        bottomRadius: input.bottomRadius,
        topRadius: input.topRadius,
        height: input.height,
      },
      name: input.name ?? `Cone`,
      position: input.position ?? { x: 0, y: 0, z: 0 },
    }
  },
})

// =============================================================================
// TORUS PRIMITIVE
// =============================================================================

export const createTorusTool = tool({
  description:
    "Create a torus (donut shape) with specified major and minor radii. Use for pipe bends, seals, or ring structures.",
  inputSchema: z.object({
    majorRadius: z
      .number()
      .positive()
      .describe("Major radius (distance from center of torus to center of tube) in meters"),
    minorRadius: z.number().positive().describe("Minor radius (radius of the tube) in meters"),
    name: z.string().optional().describe("Name for the shape"),
    position: positionSchema,
  }),
  execute: async (input) => {
    return {
      action: "createShape" as const,
      shapeType: "torus" as const,
      parameters: { majorRadius: input.majorRadius, minorRadius: input.minorRadius },
      name: input.name ?? `Torus`,
      position: input.position ?? { x: 0, y: 0, z: 0 },
    }
  },
})

// =============================================================================
// MODIFY SHAPE
// =============================================================================

export const modifyShapeTool = tool({
  description:
    "Modify properties of an existing shape (box, cylinder, sphere, cone, torus). You can change dimensions, position, or name. Use the shape ID from the scene context.",
  inputSchema: z.object({
    shapeId: z.string().describe("ID of the shape to modify"),
    // Dimension updates (shape-specific, all optional)
    width: z.number().positive().optional().describe("New width (for box) in meters"),
    height: z
      .number()
      .positive()
      .optional()
      .describe("New height (for box, cylinder, cone) in meters"),
    depth: z.number().positive().optional().describe("New depth (for box) in meters"),
    radius: z
      .number()
      .positive()
      .optional()
      .describe("New radius (for cylinder, sphere) in meters"),
    bottomRadius: z.number().min(0).optional().describe("New bottom radius (for cone) in meters"),
    topRadius: z.number().min(0).optional().describe("New top radius (for cone) in meters"),
    majorRadius: z
      .number()
      .positive()
      .optional()
      .describe("New major radius (for torus) in meters"),
    minorRadius: z
      .number()
      .positive()
      .optional()
      .describe("New minor radius (for torus) in meters"),
    // Position update
    position: positionSchema.describe("New position for the shape"),
    // Name update
    name: z.string().optional().describe("New name for the shape"),
  }),
  execute: async (input) => {
    return {
      action: "modifyShape" as const,
      shapeId: input.shapeId,
      updates: {
        width: input.width,
        height: input.height,
        depth: input.depth,
        radius: input.radius,
        bottomRadius: input.bottomRadius,
        topRadius: input.topRadius,
        majorRadius: input.majorRadius,
        minorRadius: input.minorRadius,
        position: input.position,
        name: input.name,
      },
    }
  },
})

// =============================================================================
// BOOLEAN OPERATIONS
// =============================================================================

export const booleanUnionTool = tool({
  description:
    "Combine two or more shapes into a single shape using boolean union (fusion). The resulting shape contains the volume of all input shapes. Useful for creating complex shapes from simpler primitives.",
  inputSchema: z.object({
    shapeIds: z.array(z.string()).min(2).describe("IDs of shapes to combine (minimum 2)"),
    name: z.string().optional().describe("Name for the resulting shape"),
    keepOriginals: z
      .boolean()
      .default(false)
      .describe("Keep the original shapes after the operation"),
  }),
  execute: async (input) => {
    return {
      action: "booleanUnion" as const,
      shapeIds: input.shapeIds,
      name: input.name ?? "Union Result",
      keepOriginals: input.keepOriginals,
    }
  },
})

export const booleanSubtractTool = tool({
  description:
    "Subtract one or more shapes from a base shape using boolean difference (cut). The tool shapes are removed from the base shape. Useful for creating holes, cutouts, or carving shapes.",
  inputSchema: z.object({
    baseShapeId: z.string().describe("ID of the base shape to subtract from"),
    toolShapeIds: z.array(z.string()).min(1).describe("IDs of shapes to subtract (tools)"),
    name: z.string().optional().describe("Name for the resulting shape"),
    keepOriginals: z
      .boolean()
      .default(false)
      .describe("Keep the original shapes after the operation"),
  }),
  execute: async (input) => {
    return {
      action: "booleanSubtract" as const,
      baseShapeId: input.baseShapeId,
      toolShapeIds: input.toolShapeIds,
      name: input.name ?? "Subtraction Result",
      keepOriginals: input.keepOriginals,
    }
  },
})

export const booleanIntersectTool = tool({
  description:
    "Create a shape from the intersection (common volume) of two or more shapes. The result contains only the volume that exists in ALL input shapes. Useful for finding overlapping regions.",
  inputSchema: z.object({
    shapeIds: z.array(z.string()).min(2).describe("IDs of shapes to intersect (minimum 2)"),
    name: z.string().optional().describe("Name for the resulting shape"),
    keepOriginals: z
      .boolean()
      .default(false)
      .describe("Keep the original shapes after the operation"),
  }),
  execute: async (input) => {
    return {
      action: "booleanIntersect" as const,
      shapeIds: input.shapeIds,
      name: input.name ?? "Intersection Result",
      keepOriginals: input.keepOriginals,
    }
  },
})

// =============================================================================
// EXPORTS
// =============================================================================

export const cadTools = {
  createBox: createBoxTool,
  createCylinder: createCylinderTool,
  createSphere: createSphereTool,
  createCone: createConeTool,
  createTorus: createTorusTool,
  modifyShape: modifyShapeTool,
  booleanUnion: booleanUnionTool,
  booleanSubtract: booleanSubtractTool,
  booleanIntersect: booleanIntersectTool,
}

/** Type for CAD tool results */
export type CadToolResult = {
  action: "createShape"
  shapeType: "box" | "cylinder" | "sphere" | "cone" | "torus"
  parameters: Record<string, number>
  name: string
  position: { x: number; y: number; z: number }
}

/** Type for modify shape result */
export type ModifyShapeResult = {
  action: "modifyShape"
  shapeId: string
  updates: {
    width?: number
    height?: number
    depth?: number
    radius?: number
    bottomRadius?: number
    topRadius?: number
    majorRadius?: number
    minorRadius?: number
    position?: { x: number; y: number; z: number }
    name?: string
  }
}

/** Type for boolean union result */
export type BooleanUnionResult = {
  action: "booleanUnion"
  shapeIds: string[]
  name: string
  keepOriginals: boolean
}

/** Type for boolean subtract result */
export type BooleanSubtractResult = {
  action: "booleanSubtract"
  baseShapeId: string
  toolShapeIds: string[]
  name: string
  keepOriginals: boolean
}

/** Type for boolean intersect result */
export type BooleanIntersectResult = {
  action: "booleanIntersect"
  shapeIds: string[]
  name: string
  keepOriginals: boolean
}
