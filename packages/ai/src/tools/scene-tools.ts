/**
 * Scene Tools for AI - CADHY
 *
 * General scene manipulation tools that work on any object type.
 * These tools handle transformations, visibility, selection, grouping,
 * and material properties.
 */

import { tool } from "ai"
import { z } from "zod"

// =============================================================================
// SHARED SCHEMAS
// =============================================================================

/** Position/Vector schema */
const vec3Schema = z.object({
  x: z.number().describe("X coordinate"),
  y: z.number().describe("Y coordinate"),
  z: z.number().describe("Z coordinate"),
})

/** Object ID(s) - single or array */
const objectIdsSchema = z
  .union([
    z.string().describe("Single object ID"),
    z.array(z.string()).describe("Array of object IDs"),
  ])
  .describe("Object ID(s) to operate on")

// =============================================================================
// CONTEXT & INFORMATION TOOLS
// =============================================================================

export const getSceneInfoTool = tool({
  description:
    "Get information about the current scene: list of all objects with their IDs, names, types, and basic properties. Also returns selection state, total object count, and scene bounding box. Use this to understand what's in the scene before performing operations.",
  inputSchema: z.object({
    includeDetails: z
      .boolean()
      .default(false)
      .describe("Include detailed properties for each object (dimensions, material, etc.)"),
    filterType: z
      .enum(["all", "shape", "channel", "transition"])
      .default("all")
      .describe("Filter objects by type"),
  }),
  execute: async (input) => {
    return {
      action: "getSceneInfo" as const,
      includeDetails: input.includeDetails,
      filterType: input.filterType,
    }
  },
})

export const getObjectInfoTool = tool({
  description:
    "Get detailed information about a specific object: dimensions, position, rotation, scale, material properties, and type-specific data. For channels, includes hydraulic properties. For shapes, includes geometry parameters.",
  inputSchema: z.object({
    objectId: z.string().describe("ID of the object to get information about"),
  }),
  execute: async (input) => {
    return {
      action: "getObjectInfo" as const,
      objectId: input.objectId,
    }
  },
})

export const measureDistanceTool = tool({
  description:
    "Measure the distance between two points or two objects. For objects, measures center-to-center distance. Returns the distance in meters and the vector between the points.",
  inputSchema: z.object({
    from: z
      .union([
        z.string().describe("Object ID to measure from"),
        vec3Schema.describe("Point coordinates to measure from"),
      ])
      .describe("Starting point or object"),
    to: z
      .union([
        z.string().describe("Object ID to measure to"),
        vec3Schema.describe("Point coordinates to measure to"),
      ])
      .describe("Ending point or object"),
    measureType: z
      .enum(["center", "closest", "furthest"])
      .default("center")
      .describe(
        "How to measure between objects: center-to-center, closest points, or furthest points"
      ),
  }),
  execute: async (input) => {
    return {
      action: "measureDistance" as const,
      from: input.from,
      to: input.to,
      measureType: input.measureType,
    }
  },
})

// =============================================================================
// MATERIAL TOOL
// =============================================================================

export const setMaterialTool = tool({
  description:
    "Set the material properties (color, opacity, metalness, roughness) of any object in the scene. Works on shapes, channels, and transitions. You can set multiple objects at once by passing an array of IDs.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    color: z
      .string()
      .optional()
      .describe(
        "Color in hex format (e.g., '#ff0000' for red, '#00ff00' for green, '#0000ff' for blue, '#ffff00' for yellow, '#ff00ff' for magenta, '#00ffff' for cyan)"
      ),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Opacity from 0 (fully transparent) to 1 (fully opaque)"),
    metalness: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Metalness from 0 (non-metallic like plastic) to 1 (fully metallic like chrome)"),
    roughness: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Roughness from 0 (smooth/glossy like glass) to 1 (rough/matte like concrete)"),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "setMaterial" as const,
      objectIds: ids,
      material: {
        color: input.color,
        opacity: input.opacity,
        metalness: input.metalness,
        roughness: input.roughness,
      },
    }
  },
})

// =============================================================================
// TRANSFORM TOOLS
// =============================================================================

export const transformObjectTool = tool({
  description:
    "Transform objects by setting their position, rotation, and/or scale. Can move, rotate, or scale one or multiple objects at once. Use absolute values (not relative offsets).",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    position: vec3Schema.optional().describe("New absolute position in meters"),
    rotation: vec3Schema.optional().describe("New rotation in degrees (Euler angles X, Y, Z)"),
    scale: vec3Schema.optional().describe("New scale factors (1 = original size)"),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "transformObject" as const,
      objectIds: ids,
      transform: {
        position: input.position,
        rotation: input.rotation,
        scale: input.scale,
      },
    }
  },
})

export const moveObjectTool = tool({
  description:
    "Move objects by a relative offset (delta). Adds the offset to the current position. Use this when you want to shift objects by a certain amount rather than setting an absolute position.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    offset: vec3Schema.describe(
      "Offset to add to current position in meters (e.g., {x: 0, y: -1, z: 0} moves down 1 meter)"
    ),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "moveObject" as const,
      objectIds: ids,
      offset: input.offset,
    }
  },
})

export const rotateObjectTool = tool({
  description:
    "Rotate objects by a relative angle (delta). Adds the rotation to the current rotation. Use this when you want to rotate objects by a certain amount.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    angle: vec3Schema.describe(
      "Rotation to add in degrees (e.g., {x: 0, y: 90, z: 0} rotates 90 degrees around Y axis)"
    ),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "rotateObject" as const,
      objectIds: ids,
      angle: input.angle,
    }
  },
})

export const scaleObjectTool = tool({
  description:
    "Scale objects by a factor. Multiplies the current scale. Use uniform scaling (same factor for all axes) or non-uniform scaling.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    factor: z
      .union([
        z.number().positive().describe("Uniform scale factor (applies to all axes)"),
        vec3Schema.describe("Non-uniform scale factors per axis"),
      ])
      .describe("Scale factor(s) to multiply current scale by"),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    const factor =
      typeof input.factor === "number"
        ? { x: input.factor, y: input.factor, z: input.factor }
        : input.factor
    return {
      action: "scaleObject" as const,
      objectIds: ids,
      factor,
    }
  },
})

export const alignObjectsTool = tool({
  description:
    "Align multiple objects along an axis. Can align by their centers, min bounds, or max bounds.",
  inputSchema: z.object({
    objectIds: z.array(z.string()).min(2).describe("At least 2 object IDs to align"),
    axis: z.enum(["x", "y", "z"]).describe("Axis to align along"),
    alignTo: z
      .enum(["min", "center", "max", "first", "last"])
      .default("center")
      .describe("Alignment target: min/max bounds, center, or match first/last object"),
  }),
  execute: async (input) => {
    return {
      action: "alignObjects" as const,
      objectIds: input.objectIds,
      axis: input.axis,
      alignTo: input.alignTo,
    }
  },
})

export const distributeObjectsTool = tool({
  description:
    "Distribute multiple objects evenly along an axis. Spaces objects with equal gaps between them.",
  inputSchema: z.object({
    objectIds: z.array(z.string()).min(3).describe("At least 3 object IDs to distribute"),
    axis: z.enum(["x", "y", "z"]).describe("Axis to distribute along"),
    spacing: z
      .number()
      .positive()
      .optional()
      .describe(
        "Fixed spacing between objects in meters (if not provided, distributes evenly between first and last)"
      ),
  }),
  execute: async (input) => {
    return {
      action: "distributeObjects" as const,
      objectIds: input.objectIds,
      axis: input.axis,
      spacing: input.spacing,
    }
  },
})

// =============================================================================
// VISIBILITY & SELECTION TOOLS
// =============================================================================

export const setVisibilityTool = tool({
  description:
    "Show or hide objects in the scene. Hidden objects are not rendered but still exist.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    visible: z.boolean().describe("True to show, false to hide"),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "setVisibility" as const,
      objectIds: ids,
      visible: input.visible,
    }
  },
})

export const setLockedTool = tool({
  description: "Lock or unlock objects. Locked objects cannot be selected or modified.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    locked: z.boolean().describe("True to lock, false to unlock"),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "setLocked" as const,
      objectIds: ids,
      locked: input.locked,
    }
  },
})

export const selectObjectsTool = tool({
  description:
    "Select objects in the scene. Can select by IDs, by type, by name pattern, or select all/none.",
  inputSchema: z.object({
    mode: z
      .enum(["set", "add", "remove", "toggle", "all", "none", "invert"])
      .default("set")
      .describe("Selection mode: set (replace), add, remove, toggle, all, none, or invert"),
    objectIds: z
      .array(z.string())
      .optional()
      .describe("Object IDs to select (for set/add/remove/toggle modes)"),
    objectType: z
      .enum(["shape", "channel", "transition", "all"])
      .optional()
      .describe("Filter by object type"),
    namePattern: z
      .string()
      .optional()
      .describe("Filter by name (supports * wildcard, e.g., 'Sphere*')"),
  }),
  execute: async (input) => {
    return {
      action: "selectObjects" as const,
      mode: input.mode,
      objectIds: input.objectIds,
      objectType: input.objectType,
      namePattern: input.namePattern,
    }
  },
})

// =============================================================================
// NAMING & ORGANIZATION TOOLS
// =============================================================================

export const renameObjectTool = tool({
  description: "Rename a single object or batch rename multiple objects with a pattern.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    name: z.string().optional().describe("New name (for single object)"),
    pattern: z
      .string()
      .optional()
      .describe(
        "Name pattern with {n} for number (e.g., 'Sphere {n}' produces 'Sphere 1', 'Sphere 2', etc.)"
      ),
    startNumber: z.number().int().default(1).describe("Starting number for pattern"),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "renameObject" as const,
      objectIds: ids,
      name: input.name,
      pattern: input.pattern,
      startNumber: input.startNumber,
    }
  },
})

export const setLayerTool = tool({
  description:
    "Move objects to a different layer. Layers help organize objects and control visibility/properties in bulk.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    layerId: z.string().describe("Target layer ID"),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "setLayer" as const,
      objectIds: ids,
      layerId: input.layerId,
    }
  },
})

// =============================================================================
// LEVEL OF DETAIL (LOD) / SEGMENTS TOOL
// =============================================================================

export const setLODTool = tool({
  description:
    "Set the level of detail (mesh segments) for shape objects. Higher segments means more triangles, smoother curves, and better quality, but slower performance. Only works on shape primitives (box, sphere, cylinder, cone, torus). For box: segments control subdivisions (1-10). For curved shapes: segments control smoothness (8-128).",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    level: z
      .enum(["low", "medium", "high", "ultra"])
      .optional()
      .describe(
        "LOD preset: low (8 segments), medium (32 segments, default), high (64 segments), ultra (128 segments)"
      ),
    segments: z
      .number()
      .int()
      .min(1)
      .max(128)
      .optional()
      .describe(
        "Custom segment count. For box: 1-10 subdivisions. For curves (sphere, cylinder, cone, torus): 8-128 segments."
      ),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]

    // Convert level to segments if no custom value provided
    let segments = input.segments
    if (!segments && input.level) {
      const levelToSegments: Record<string, number> = {
        low: 8,
        medium: 32,
        high: 64,
        ultra: 128,
      }
      segments = levelToSegments[input.level]
    }

    return {
      action: "setLOD" as const,
      objectIds: ids,
      level: input.level,
      segments: segments ?? 32,
    }
  },
})

// =============================================================================
// COPY & ARRAY TOOLS
// =============================================================================

export const copyObjectsTool = tool({
  description: "Create copies of objects. Can create single copy or multiple copies with offset.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    count: z.number().int().min(1).default(1).describe("Number of copies to create"),
    offset: vec3Schema
      .optional()
      .describe("Offset between copies in meters (default: {x: 0, y: 0, z: 2})"),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "copyObjects" as const,
      objectIds: ids,
      count: input.count,
      offset: input.offset ?? { x: 0, y: 0, z: 2 },
    }
  },
})

export const arrayObjectsTool = tool({
  description:
    "Create a linear or rectangular array of copies. Great for creating rows, grids, or patterns of objects.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    countX: z.number().int().min(1).default(1).describe("Number of copies along X axis"),
    countY: z.number().int().min(1).default(1).describe("Number of copies along Y axis"),
    countZ: z.number().int().min(1).default(1).describe("Number of copies along Z axis"),
    spacingX: z.number().default(2).describe("Spacing between copies along X in meters"),
    spacingY: z.number().default(2).describe("Spacing between copies along Y in meters"),
    spacingZ: z.number().default(2).describe("Spacing between copies along Z in meters"),
    includeOriginal: z.boolean().default(true).describe("Include the original object in the array"),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "arrayObjects" as const,
      objectIds: ids,
      count: { x: input.countX, y: input.countY, z: input.countZ },
      spacing: { x: input.spacingX, y: input.spacingY, z: input.spacingZ },
      includeOriginal: input.includeOriginal,
    }
  },
})

export const polarArrayTool = tool({
  description: "Create a polar (circular) array of copies around a center point and axis.",
  inputSchema: z.object({
    objectIds: objectIdsSchema,
    count: z.number().int().min(2).describe("Total number of copies including original"),
    center: vec3Schema.describe("Center point of rotation"),
    axis: z.enum(["x", "y", "z"]).default("y").describe("Axis of rotation"),
    angle: z
      .number()
      .default(360)
      .describe("Total angle to distribute over in degrees (360 for full circle)"),
    includeOriginal: z.boolean().default(true).describe("Include the original object"),
  }),
  execute: async (input) => {
    const ids = Array.isArray(input.objectIds) ? input.objectIds : [input.objectIds]
    return {
      action: "polarArray" as const,
      objectIds: ids,
      count: input.count,
      center: input.center,
      axis: input.axis,
      angle: input.angle,
      includeOriginal: input.includeOriginal,
    }
  },
})

// =============================================================================
// VIEWPORT TOOLS
// =============================================================================

export const focusObjectsTool = tool({
  description:
    "Focus the camera on specific objects or fit all objects in view. Useful after creating objects or to inspect specific items.",
  inputSchema: z.object({
    objectIds: z
      .array(z.string())
      .optional()
      .describe("Object IDs to focus on (if not provided, fits all visible objects)"),
    padding: z
      .number()
      .min(0)
      .default(0.2)
      .describe("Padding around objects (0.2 = 20% extra space)"),
  }),
  execute: async (input) => {
    return {
      action: "focusObjects" as const,
      objectIds: input.objectIds,
      padding: input.padding,
    }
  },
})

export const setCameraViewTool = tool({
  description: "Set the camera to a standard orthographic view or perspective view.",
  inputSchema: z.object({
    view: z
      .enum(["perspective", "top", "front", "right", "left", "back", "bottom"])
      .describe("Camera view preset"),
    fitToScene: z.boolean().default(true).describe("Fit all objects in view"),
  }),
  execute: async (input) => {
    return {
      action: "setCameraView" as const,
      view: input.view,
      fitToScene: input.fitToScene,
    }
  },
})

// =============================================================================
// HISTORY & SCENE MANAGEMENT TOOLS
// =============================================================================

export const undoTool = tool({
  description:
    "Undo the last action. Reverts the scene to the previous state. Use when the user wants to undo a mistake or go back to a previous state.",
  inputSchema: z.object({
    steps: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(1)
      .describe("Number of steps to undo (default: 1)"),
  }),
  execute: async (input) => {
    return {
      action: "undo" as const,
      steps: input.steps,
    }
  },
})

export const redoTool = tool({
  description:
    "Redo a previously undone action. Restores the scene to the state before the undo. Only works if there are actions to redo.",
  inputSchema: z.object({
    steps: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(1)
      .describe("Number of steps to redo (default: 1)"),
  }),
  execute: async (input) => {
    return {
      action: "redo" as const,
      steps: input.steps,
    }
  },
})

export const clearSceneTool = tool({
  description:
    "Clear all objects from the scene. This removes all shapes, channels, and transitions. Use with caution - this action can be undone but all current work will be removed.",
  inputSchema: z.object({
    confirm: z
      .boolean()
      .describe(
        "Must be true to confirm clearing the scene. Safety check to prevent accidental deletion."
      ),
    keepLayers: z.boolean().default(true).describe("Keep layer definitions (default: true)"),
  }),
  execute: async (input) => {
    return {
      action: "clearScene" as const,
      confirm: input.confirm,
      keepLayers: input.keepLayers,
    }
  },
})

export const getHistoryInfoTool = tool({
  description:
    "Get information about the undo/redo history: how many actions can be undone or redone, and a list of recent actions.",
  inputSchema: z.object({}),
  execute: async () => {
    return {
      action: "getHistoryInfo" as const,
    }
  },
})

// =============================================================================
// EXPORTS
// =============================================================================

export const sceneTools = {
  // Context & Information
  getSceneInfo: getSceneInfoTool,
  getObjectInfo: getObjectInfoTool,
  measureDistance: measureDistanceTool,
  // History & Scene Management
  undo: undoTool,
  redo: redoTool,
  clearScene: clearSceneTool,
  getHistoryInfo: getHistoryInfoTool,
  // Material
  setMaterial: setMaterialTool,
  // Transform
  transformObject: transformObjectTool,
  moveObject: moveObjectTool,
  rotateObject: rotateObjectTool,
  scaleObject: scaleObjectTool,
  alignObjects: alignObjectsTool,
  distributeObjects: distributeObjectsTool,
  // Visibility & Selection
  setVisibility: setVisibilityTool,
  setLocked: setLockedTool,
  selectObjects: selectObjectsTool,
  // Naming & Organization
  renameObject: renameObjectTool,
  setLayer: setLayerTool,
  // Level of Detail
  setLOD: setLODTool,
  // Copy & Array
  copyObjects: copyObjectsTool,
  arrayObjects: arrayObjectsTool,
  polarArray: polarArrayTool,
  // Viewport
  focusObjects: focusObjectsTool,
  setCameraView: setCameraViewTool,
}

// =============================================================================
// TYPES
// =============================================================================

export type Vec3 = { x: number; y: number; z: number }

export type SetMaterialResult = {
  action: "setMaterial"
  objectIds: string[]
  material: {
    color?: string
    opacity?: number
    metalness?: number
    roughness?: number
  }
}

export type TransformObjectResult = {
  action: "transformObject"
  objectIds: string[]
  transform: {
    position?: Vec3
    rotation?: Vec3
    scale?: Vec3
  }
}

export type MoveObjectResult = {
  action: "moveObject"
  objectIds: string[]
  offset: Vec3
}

export type RotateObjectResult = {
  action: "rotateObject"
  objectIds: string[]
  angle: Vec3
}

export type ScaleObjectResult = {
  action: "scaleObject"
  objectIds: string[]
  factor: Vec3
}

export type AlignObjectsResult = {
  action: "alignObjects"
  objectIds: string[]
  axis: "x" | "y" | "z"
  alignTo: "min" | "center" | "max" | "first" | "last"
}

export type DistributeObjectsResult = {
  action: "distributeObjects"
  objectIds: string[]
  axis: "x" | "y" | "z"
  spacing?: number
}

export type SetVisibilityResult = {
  action: "setVisibility"
  objectIds: string[]
  visible: boolean
}

export type SetLockedResult = {
  action: "setLocked"
  objectIds: string[]
  locked: boolean
}

export type SelectObjectsResult = {
  action: "selectObjects"
  mode: "set" | "add" | "remove" | "toggle" | "all" | "none" | "invert"
  objectIds?: string[]
  objectType?: "shape" | "channel" | "transition" | "all"
  namePattern?: string
}

export type RenameObjectResult = {
  action: "renameObject"
  objectIds: string[]
  name?: string
  pattern?: string
  startNumber: number
}

export type SetLayerResult = {
  action: "setLayer"
  objectIds: string[]
  layerId: string
}

export type SetLODResult = {
  action: "setLOD"
  objectIds: string[]
  level?: "low" | "medium" | "high" | "ultra"
  segments: number
}

export type CopyObjectsResult = {
  action: "copyObjects"
  objectIds: string[]
  count: number
  offset: Vec3
}

export type ArrayObjectsResult = {
  action: "arrayObjects"
  objectIds: string[]
  count: Vec3
  spacing: Vec3
  includeOriginal: boolean
}

export type PolarArrayResult = {
  action: "polarArray"
  objectIds: string[]
  count: number
  center: Vec3
  axis: "x" | "y" | "z"
  angle: number
  includeOriginal: boolean
}

export type FocusObjectsResult = {
  action: "focusObjects"
  objectIds?: string[]
  padding: number
}

export type SetCameraViewResult = {
  action: "setCameraView"
  view: "perspective" | "top" | "front" | "right" | "left" | "back" | "bottom"
  fitToScene: boolean
}

// History & Scene Management result types
export type UndoResult = {
  action: "undo"
  steps: number
}

export type RedoResult = {
  action: "redo"
  steps: number
}

export type ClearSceneResult = {
  action: "clearScene"
  confirm: boolean
  keepLayers: boolean
}

export type GetHistoryInfoResult = {
  action: "getHistoryInfo"
}

export type SceneToolResult =
  | GetSceneInfoResult
  | GetObjectInfoResult
  | MeasureDistanceResult
  | UndoResult
  | RedoResult
  | ClearSceneResult
  | GetHistoryInfoResult
  | SetMaterialResult
  | TransformObjectResult
  | MoveObjectResult
  | RotateObjectResult
  | ScaleObjectResult
  | AlignObjectsResult
  | DistributeObjectsResult
  | SetVisibilityResult
  | SetLockedResult
  | SelectObjectsResult
  | RenameObjectResult
  | SetLayerResult
  | SetLODResult
  | CopyObjectsResult
  | ArrayObjectsResult
  | PolarArrayResult
  | FocusObjectsResult
  | SetCameraViewResult

// Context tool results
export type GetSceneInfoResult = {
  action: "getSceneInfo"
  includeDetails: boolean
  filterType: "all" | "shape" | "channel" | "transition"
}

export type GetObjectInfoResult = {
  action: "getObjectInfo"
  objectId: string
}

export type MeasureDistanceResult = {
  action: "measureDistance"
  from: string | Vec3
  to: string | Vec3
  measureType: "center" | "closest" | "furthest"
}
