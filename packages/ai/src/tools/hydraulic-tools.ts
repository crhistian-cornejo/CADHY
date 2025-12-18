/**
 * Hydraulic Tools for AI - CADHY
 *
 * AI tool definitions for creating and analyzing hydraulic elements.
 * These match the actual ChannelObject and TransitionObject types in modeller-store.ts
 */

import { tool } from "ai"
import { z } from "zod"

// =============================================================================
// SHARED SCHEMAS
// =============================================================================

/** Material/roughness options */
const manningNSchema = z
  .number()
  .min(0.008)
  .max(0.1)
  .default(0.013)
  .describe("Manning's roughness coefficient (0.012-0.014 for concrete)")

// =============================================================================
// CREATE CHANNEL TOOLS
// =============================================================================

/**
 * Create a rectangular channel
 */
export const createRectangularChannelTool = tool({
  description:
    "Create a rectangular (box-shaped) open channel. Best for: concrete-lined channels, urban drainage, industrial flumes. Has vertical walls and constant width.",
  inputSchema: z.object({
    width: z.number().positive().describe("Channel width (b) in meters"),
    depth: z.number().positive().describe("Channel depth (y) in meters"),
    length: z.number().positive().describe("Channel length (L) in meters"),
    slope: z.number().min(0).describe("Channel bed slope (S0) in m/m (e.g., 0.001 = 0.1%)"),
    manningN: manningNSchema,
    thickness: z.number().positive().default(0.15).describe("Wall/floor thickness in meters"),
    freeBoard: z
      .number()
      .positive()
      .default(0.3)
      .describe("Freeboard height above design water level in meters"),
    name: z
      .string()
      .optional()
      .describe(
        "Name for the channel. IMPORTANT: Use predictable names like 'Canal 1', 'Canal 2' when creating multiple elements."
      ),
    connectToUpstream: z
      .string()
      .optional()
      .describe("ID of upstream element to connect to (use if you know the ID from scene context)"),
    connectToUpstreamByName: z
      .string()
      .optional()
      .describe(
        "NAME of upstream element to connect to. Use this when creating multiple elements in sequence - reference by the name you assigned."
      ),
  }),
  execute: async (input) => {
    return {
      action: "createChannel" as const,
      section: {
        type: "rectangular" as const,
        width: input.width,
        depth: input.depth,
      },
      length: input.length,
      slope: input.slope,
      manningN: input.manningN,
      thickness: input.thickness,
      freeBoard: input.freeBoard,
      name: input.name ?? `Rectangular Channel`,
      upstreamChannelId: input.connectToUpstream ?? null,
      upstreamChannelName: input.connectToUpstreamByName ?? null,
    }
  },
})

/**
 * Create a trapezoidal channel
 */
export const createTrapezoidalChannelTool = tool({
  description:
    "Create a trapezoidal open channel with sloped sides. Best for: irrigation canals, earth channels, flood control. Wider at top than bottom.",
  inputSchema: z.object({
    bottomWidth: z.number().positive().describe("Bottom width (b) in meters"),
    depth: z.number().positive().describe("Channel depth (y) in meters"),
    sideSlope: z
      .number()
      .min(0)
      .default(1.5)
      .describe(
        "Side slope z (horizontal:vertical). Common values: 0 for vertical, 1:1 for 45deg, 1.5:1 for earth channels"
      ),
    length: z.number().positive().describe("Channel length (L) in meters"),
    slope: z.number().min(0).describe("Channel bed slope (S0) in m/m"),
    manningN: manningNSchema,
    thickness: z.number().positive().default(0.15).describe("Lining thickness in meters"),
    freeBoard: z.number().positive().default(0.3).describe("Freeboard height in meters"),
    name: z
      .string()
      .optional()
      .describe(
        "Name for the channel. IMPORTANT: Use predictable names like 'Canal 1', 'Canal 2' when creating multiple elements."
      ),
    connectToUpstream: z
      .string()
      .optional()
      .describe("ID of upstream element to connect to (use if you know the ID from scene context)"),
    connectToUpstreamByName: z
      .string()
      .optional()
      .describe(
        "NAME of upstream element to connect to. Use this when creating multiple elements in sequence - reference by the name you assigned."
      ),
  }),
  execute: async (input) => {
    return {
      action: "createChannel" as const,
      section: {
        type: "trapezoidal" as const,
        bottomWidth: input.bottomWidth,
        depth: input.depth,
        sideSlope: input.sideSlope,
      },
      length: input.length,
      slope: input.slope,
      manningN: input.manningN,
      thickness: input.thickness,
      freeBoard: input.freeBoard,
      name: input.name ?? `Trapezoidal Channel`,
      upstreamChannelId: input.connectToUpstream ?? null,
      upstreamChannelName: input.connectToUpstreamByName ?? null,
    }
  },
})

/**
 * Create a triangular channel
 */
export const createTriangularChannelTool = tool({
  description:
    "Create a V-shaped (triangular) open channel. Best for: roadside gutters, small drainage channels, swales. No flat bottom, just sloped sides meeting at a point.",
  inputSchema: z.object({
    depth: z.number().positive().describe("Channel depth (y) in meters"),
    sideSlope: z.number().min(0.1).default(1).describe("Side slope z (horizontal:vertical)"),
    length: z.number().positive().describe("Channel length (L) in meters"),
    slope: z.number().min(0).describe("Channel bed slope (S0) in m/m"),
    manningN: manningNSchema,
    thickness: z.number().positive().default(0.15).describe("Lining thickness in meters"),
    freeBoard: z.number().positive().default(0.3).describe("Freeboard height in meters"),
    name: z
      .string()
      .optional()
      .describe(
        "Name for the channel. IMPORTANT: Use predictable names like 'Canal 1', 'Canal 2' when creating multiple elements."
      ),
    connectToUpstream: z
      .string()
      .optional()
      .describe("ID of upstream element to connect to (use if you know the ID from scene context)"),
    connectToUpstreamByName: z
      .string()
      .optional()
      .describe(
        "NAME of upstream element to connect to. Use this when creating multiple elements in sequence - reference by the name you assigned."
      ),
  }),
  execute: async (input) => {
    return {
      action: "createChannel" as const,
      section: {
        type: "triangular" as const,
        depth: input.depth,
        sideSlope: input.sideSlope,
      },
      length: input.length,
      slope: input.slope,
      manningN: input.manningN,
      thickness: input.thickness,
      freeBoard: input.freeBoard,
      name: input.name ?? `Triangular Channel`,
      upstreamChannelId: input.connectToUpstream ?? null,
      upstreamChannelName: input.connectToUpstreamByName ?? null,
    }
  },
})

// =============================================================================
// CREATE CHUTE TOOLS
// =============================================================================

/** Chute type schema */
const chuteTypeSchema = z
  .enum(["smooth", "stepped", "baffled", "ogee", "converging"])
  .default("smooth")
  .describe(
    "Chute surface type: 'smooth' (highest velocity), 'stepped' (energy dissipation), 'baffled' (maximum dissipation), 'ogee' (spillway crests), 'converging' (side-channel spillways)"
  )

/** Stilling basin type schema */
const stillingBasinTypeSchema = z
  .enum(["none", "type-i", "type-ii", "type-iii", "type-iv", "saf"])
  .default("none")
  .describe(
    "Stilling basin type (USBR): 'none', 'type-i' (Fr<1.7), 'type-ii' (Fr>4.5, high dams), 'type-iii' (Fr 4.5-17, small dams), 'type-iv' (Fr 2.5-4.5), 'saf' (compact, Fr 1.7-17)"
  )

/**
 * Create a hydraulic chute (rápida)
 * A steep channel used to convey water down slopes with controlled energy dissipation
 */
export const createChuteTool = tool({
  description:
    "Create a hydraulic chute (rápida) - a steep channel for conveying water down slopes. Chutes connect upstream/downstream channels and can include stilling basins for energy dissipation. Use for: dam spillways, canal drops, drainage outfalls. Types: 'smooth' (fast), 'stepped' (energy dissipation), 'baffled' (max dissipation).",
  inputSchema: z.object({
    // Inlet section (transition from upstream)
    inletLength: z
      .number()
      .min(0)
      .default(1)
      .describe(
        "Inlet section length in meters - horizontal/low-slope transition from upstream channel. Default 1m. Use 0 for no inlet."
      ),
    inletSlope: z
      .number()
      .min(0)
      .max(0.1)
      .default(0)
      .describe(
        "Inlet section slope (m/m) - typically 0 (horizontal) or small positive value. Default 0."
      ),

    // Main chute geometry
    length: z
      .number()
      .positive()
      .describe("Horizontal length of MAIN chute section in meters (not including inlet)"),
    drop: z
      .number()
      .positive()
      .describe("Elevation drop of MAIN chute section in meters (positive = going downhill)"),
    width: z.number().positive().describe("Channel width at bottom in meters"),
    depth: z.number().positive().describe("Channel depth in meters"),
    sideSlope: z.number().min(0).default(0).describe("Side slope (H:V) - 0 for rectangular"),
    thickness: z.number().positive().default(0.2).describe("Wall/floor thickness in meters"),
    manningN: manningNSchema,

    // Chute type
    chuteType: chuteTypeSchema,

    // For stepped chutes
    stepHeight: z
      .number()
      .positive()
      .default(0.5)
      .optional()
      .describe("Step height for 'stepped' type in meters (typical: 0.3-1.0m)"),
    stepLength: z
      .number()
      .positive()
      .default(1.0)
      .optional()
      .describe("Step length for 'stepped' type in meters"),

    // For baffled chutes
    baffleSpacing: z
      .number()
      .positive()
      .default(2.0)
      .optional()
      .describe("Baffle block spacing for 'baffled' type in meters"),
    baffleHeight: z
      .number()
      .positive()
      .default(0.3)
      .optional()
      .describe("Baffle block height for 'baffled' type in meters"),

    // Stilling basin
    stillingBasinType: stillingBasinTypeSchema,

    // Naming and connections
    name: z
      .string()
      .optional()
      .describe("Name for the chute. Use predictable names like 'Rápida 1', 'Chute A'."),
    connectToUpstream: z.string().optional().describe("ID of upstream element to connect to"),
    connectToUpstreamByName: z
      .string()
      .optional()
      .describe("NAME of upstream element to connect to"),
    connectToDownstream: z.string().optional().describe("ID of downstream element to connect to"),
    connectToDownstreamByName: z
      .string()
      .optional()
      .describe("NAME of downstream element to connect to"),
  }),
  execute: async (input) => {
    return {
      action: "createChute" as const,
      inletLength: input.inletLength,
      inletSlope: input.inletSlope,
      length: input.length,
      drop: input.drop,
      width: input.width,
      depth: input.depth,
      sideSlope: input.sideSlope,
      thickness: input.thickness,
      manningN: input.manningN,
      chuteType: input.chuteType,
      stepHeight: input.stepHeight ?? 0.5,
      stepLength: input.stepLength ?? 1.0,
      baffleSpacing: input.baffleSpacing ?? 2.0,
      baffleHeight: input.baffleHeight ?? 0.3,
      stillingBasinType: input.stillingBasinType,
      name:
        input.name ?? `${input.chuteType.charAt(0).toUpperCase() + input.chuteType.slice(1)} Chute`,
      upstreamChannelId: input.connectToUpstream ?? null,
      upstreamChannelName: input.connectToUpstreamByName ?? null,
      downstreamChannelId: input.connectToDownstream ?? null,
      downstreamChannelName: input.connectToDownstreamByName ?? null,
    }
  },
})

/**
 * Add or modify stilling basin on an existing chute
 */
export const addStillingBasinTool = tool({
  description:
    "Add or modify a stilling basin on an existing chute. The basin type is automatically selected based on Froude number and velocity if you specify 'auto', or you can force a specific USBR type. IMPORTANT: Requires discharge to calculate proper basin dimensions.",
  inputSchema: z.object({
    chuteId: z.string().optional().describe("ID of the chute to modify"),
    chuteName: z.string().optional().describe("Name of the chute to modify"),
    discharge: z
      .number()
      .positive()
      .describe("Design discharge Q in m³/s - needed for basin sizing"),
    tailwaterDepth: z.number().positive().describe("Downstream tailwater depth in meters"),
    basinType: z
      .enum(["auto", "none", "type-i", "type-ii", "type-iii", "type-iv", "saf"])
      .default("auto")
      .describe("Basin type - use 'auto' to select based on Froude number, or specify a USBR type"),
  }),
  execute: async (input) => {
    if (!input.chuteId && !input.chuteName) {
      return {
        action: "error" as const,
        message: "Either chuteId or chuteName must be provided",
      }
    }
    return {
      action: "addStillingBasin" as const,
      chuteId: input.chuteId,
      chuteName: input.chuteName,
      discharge: input.discharge,
      tailwaterDepth: input.tailwaterDepth,
      basinType: input.basinType,
    }
  },
})

// =============================================================================
// CREATE TRANSITION TOOL
// =============================================================================

const transitionSectionSchema = z.object({
  sectionType: z
    .enum(["rectangular", "trapezoidal", "triangular"])
    .describe("Type of channel cross-section"),
  width: z.number().positive().describe("Section width in meters"),
  depth: z.number().positive().describe("Section depth in meters"),
  sideSlope: z.number().min(0).default(0).describe("Side slope (0 for rectangular)"),
  wallThickness: z.number().positive().default(0.15).describe("Wall thickness in meters"),
  floorThickness: z.number().positive().default(0.2).describe("Floor thickness in meters"),
})

export const createTransitionTool = tool({
  description:
    "Create a transition structure to connect two channels with different cross-sections. Transitions smoothly change channel geometry over a specified length. Types: 'linear' (straight walls), 'warped' (curved surface), 'cylindrical' (curved walls), 'inlet' (entrance), 'outlet' (exit). IMPORTANT: A transition goes BETWEEN two channels - it has an upstream channel and a downstream channel.",
  inputSchema: z.object({
    transitionType: z
      .enum(["linear", "warped", "cylindrical", "inlet", "outlet"])
      .default("linear")
      .describe("Type of transition geometry"),
    length: z
      .number()
      .positive()
      .describe("Transition length in meters (typically 4-6x width change)"),
    inlet: transitionSectionSchema.describe(
      "Inlet (upstream) section geometry - should match the upstream channel"
    ),
    outlet: transitionSectionSchema.describe(
      "Outlet (downstream) section geometry - should match the downstream channel"
    ),
    dropHeight: z
      .number()
      .min(0)
      .default(0)
      .describe("Elevation drop across the transition in meters (e.g., 1.0 for a 1m drop)"),
    name: z
      .string()
      .optional()
      .describe(
        "Name for the transition. Use predictable names like 'Transición 1', 'Transition A-B'."
      ),
    upstreamChannelId: z
      .string()
      .optional()
      .describe("ID of upstream channel (use if known from scene context)"),
    upstreamChannelName: z
      .string()
      .optional()
      .describe(
        "NAME of upstream channel to connect. Use when referencing elements you just created."
      ),
    downstreamChannelId: z
      .string()
      .optional()
      .describe("ID of downstream channel (use if known from scene context)"),
    downstreamChannelName: z
      .string()
      .optional()
      .describe(
        "NAME of downstream channel to connect. Use when referencing elements you just created."
      ),
  }),
  execute: async (input) => {
    return {
      action: "createTransition" as const,
      transitionType: input.transitionType,
      length: input.length,
      inlet: input.inlet,
      outlet: input.outlet,
      dropHeight: input.dropHeight,
      name:
        input.name ??
        `${input.transitionType.charAt(0).toUpperCase() + input.transitionType.slice(1)} Transition`,
      upstreamChannelId: input.upstreamChannelId ?? null,
      upstreamChannelName: input.upstreamChannelName ?? null,
      downstreamChannelId: input.downstreamChannelId ?? null,
      downstreamChannelName: input.downstreamChannelName ?? null,
    }
  },
})

// =============================================================================
// FLOW ANALYSIS TOOLS
// =============================================================================

export const analyzeNormalFlowTool = tool({
  description:
    "Calculate normal (uniform) flow properties for a channel using Manning's equation. Returns: discharge, velocity, area, wetted perimeter, hydraulic radius, Froude number, and flow classification (subcritical/critical/supercritical).",
  inputSchema: z.object({
    channelId: z.string().describe("ID of the channel to analyze"),
    flowDepth: z
      .number()
      .positive()
      .optional()
      .describe("Water depth for analysis (if not provided, uses design depth)"),
  }),
  execute: async (input) => {
    return {
      action: "analyzeNormalFlow" as const,
      channelId: input.channelId,
      flowDepth: input.flowDepth,
    }
  },
})

export const calculateDischargeDepthTool = tool({
  description:
    "Calculate the normal depth required for a given discharge (Q) in a channel. Uses iterative solution of Manning's equation.",
  inputSchema: z.object({
    channelId: z.string().describe("ID of the channel to analyze"),
    discharge: z
      .number()
      .positive()
      .describe("Target discharge Q in cubic meters per second (m3/s)"),
  }),
  execute: async (input) => {
    return {
      action: "calculateNormalDepth" as const,
      channelId: input.channelId,
      discharge: input.discharge,
    }
  },
})

export const calculateCriticalDepthTool = tool({
  description:
    "Calculate the critical depth for a given discharge in a channel. Critical depth occurs when Froude number = 1 (minimum specific energy).",
  inputSchema: z.object({
    channelId: z.string().describe("ID of the channel to analyze"),
    discharge: z.number().positive().describe("Discharge Q in cubic meters per second (m3/s)"),
  }),
  execute: async (input) => {
    return {
      action: "calculateCriticalDepth" as const,
      channelId: input.channelId,
      discharge: input.discharge,
    }
  },
})

export const analyzeGVFTool = tool({
  description:
    "Analyze Gradually Varied Flow (GVF) profile along a channel. Computes water surface profile using standard step method. Identifies backwater curves (M1, M2, S1, S2, etc.).",
  inputSchema: z.object({
    channelId: z.string().describe("ID of the channel to analyze"),
    discharge: z.number().positive().describe("Discharge Q in m3/s"),
    boundaryDepth: z
      .number()
      .positive()
      .describe("Known depth at boundary condition (downstream or upstream)"),
    boundaryLocation: z
      .enum(["upstream", "downstream"])
      .default("downstream")
      .describe("Location of the known boundary depth"),
    stepSize: z.number().positive().default(1).describe("Computation step size in meters"),
  }),
  execute: async (input) => {
    return {
      action: "analyzeGVF" as const,
      channelId: input.channelId,
      discharge: input.discharge,
      boundaryDepth: input.boundaryDepth,
      boundaryLocation: input.boundaryLocation,
      stepSize: input.stepSize,
    }
  },
})

// =============================================================================
// MODIFICATION TOOLS
// =============================================================================

export const modifyChannelTool = tool({
  description:
    "Modify properties of an existing channel. You can change dimensions, slope, Manning's n, or other parameters. Use the channel ID from the scene context.",
  inputSchema: z.object({
    channelId: z.string().describe("ID of the channel to modify"),
    // Optional properties to update
    width: z.number().positive().optional().describe("New width (for rectangular) in meters"),
    bottomWidth: z
      .number()
      .positive()
      .optional()
      .describe("New bottom width (for trapezoidal) in meters"),
    depth: z.number().positive().optional().describe("New depth in meters"),
    sideSlope: z.number().min(0).optional().describe("New side slope (for trapezoidal/triangular)"),
    length: z.number().positive().optional().describe("New length in meters"),
    slope: z.number().min(0).optional().describe("New bed slope in m/m"),
    manningN: z.number().min(0.008).max(0.1).optional().describe("New Manning's n coefficient"),
    thickness: z.number().positive().optional().describe("New wall thickness in meters"),
    freeBoard: z.number().positive().optional().describe("New freeboard in meters"),
    name: z.string().optional().describe("New name for the channel"),
  }),
  execute: async (input) => {
    return {
      action: "modifyChannel" as const,
      channelId: input.channelId,
      updates: {
        width: input.width,
        bottomWidth: input.bottomWidth,
        depth: input.depth,
        sideSlope: input.sideSlope,
        length: input.length,
        slope: input.slope,
        manningN: input.manningN,
        thickness: input.thickness,
        freeBoard: input.freeBoard,
        name: input.name,
      },
    }
  },
})

export const deleteObjectTool = tool({
  description:
    "Delete an object from the scene by its ID or name. Use the scene context to find the correct ID. Can delete channels, transitions, or shapes.",
  inputSchema: z.object({
    objectId: z.string().optional().describe("ID of the object to delete"),
    objectName: z.string().optional().describe("Name of the object to delete (if ID not known)"),
    confirm: z.boolean().default(true).describe("Confirm deletion (safety check)"),
  }),
  execute: async (input) => {
    if (!input.objectId && !input.objectName) {
      return {
        action: "error" as const,
        message: "Either objectId or objectName must be provided",
      }
    }
    return {
      action: "deleteObject" as const,
      objectId: input.objectId,
      objectName: input.objectName,
      confirm: input.confirm,
    }
  },
})

export const duplicateObjectTool = tool({
  description:
    "Create a copy of an existing object. The duplicate will be placed at the same position with ' (copy)' appended to the name.",
  inputSchema: z.object({
    objectId: z.string().describe("ID of the object to duplicate"),
    newName: z.string().optional().describe("Optional new name for the copy"),
    offset: z
      .object({
        x: z.number().default(0),
        y: z.number().default(0),
        z: z.number().default(2),
      })
      .optional()
      .describe("Position offset for the copy in meters"),
  }),
  execute: async (input) => {
    return {
      action: "duplicateObject" as const,
      objectId: input.objectId,
      newName: input.newName,
      offset: input.offset ?? { x: 0, y: 0, z: 2 },
    }
  },
})

export const exportSceneTool = tool({
  description:
    "Export the current scene or selected objects to a file format. Supports STL and OBJ for 3D meshes. The file will be saved to the user's downloads folder.",
  inputSchema: z.object({
    format: z.enum(["stl", "obj"]).describe("Export file format"),
    selection: z
      .enum(["all", "selected"])
      .default("all")
      .describe("Export all objects or only selected"),
    filename: z.string().optional().describe("Custom filename (without extension)"),
  }),
  execute: async (input) => {
    return {
      action: "exportScene" as const,
      format: input.format,
      selection: input.selection,
      filename: input.filename,
    }
  },
})

// =============================================================================
// EXPORTS
// =============================================================================

export const hydraulicTools = {
  // Channel creation
  createRectangularChannel: createRectangularChannelTool,
  createTrapezoidalChannel: createTrapezoidalChannelTool,
  createTriangularChannel: createTriangularChannelTool,
  // Chutes
  createChute: createChuteTool,
  addStillingBasin: addStillingBasinTool,
  // Transitions
  createTransition: createTransitionTool,
  // Analysis
  analyzeNormalFlow: analyzeNormalFlowTool,
  calculateDischargeDepth: calculateDischargeDepthTool,
  calculateCriticalDepth: calculateCriticalDepthTool,
  analyzeGVF: analyzeGVFTool,
  // Modification
  modifyChannel: modifyChannelTool,
  deleteObject: deleteObjectTool,
  duplicateObject: duplicateObjectTool,
  // Export
  exportScene: exportSceneTool,
}

// Legacy exports for backwards compatibility
export const createChannelTool = createTrapezoidalChannelTool
export const analyzeFlowTool = analyzeNormalFlowTool

// =============================================================================
// TYPES
// =============================================================================

export type ChannelSectionResult =
  | { type: "rectangular"; width: number; depth: number }
  | { type: "trapezoidal"; bottomWidth: number; depth: number; sideSlope: number }
  | { type: "triangular"; depth: number; sideSlope: number }

export type CreateChannelResult = {
  action: "createChannel"
  section: ChannelSectionResult
  length: number
  slope: number
  manningN: number
  thickness: number
  freeBoard: number
  name: string
  upstreamChannelId: string | null
  upstreamChannelName: string | null
}

export type CreateTransitionResult = {
  action: "createTransition"
  transitionType: "linear" | "warped" | "cylindrical" | "inlet" | "outlet"
  length: number
  inlet: {
    sectionType: "rectangular" | "trapezoidal" | "triangular"
    width: number
    depth: number
    sideSlope: number
    wallThickness: number
    floorThickness: number
  }
  outlet: {
    sectionType: "rectangular" | "trapezoidal" | "triangular"
    width: number
    depth: number
    sideSlope: number
    wallThickness: number
    floorThickness: number
  }
  dropHeight: number
  name: string
  upstreamChannelId: string | null
  upstreamChannelName: string | null
  downstreamChannelId: string | null
  downstreamChannelName: string | null
}

export type CreateChuteResult = {
  action: "createChute"
  inletLength: number
  inletSlope: number
  length: number
  drop: number
  width: number
  depth: number
  sideSlope: number
  thickness: number
  manningN: number
  chuteType: "smooth" | "stepped" | "baffled" | "ogee" | "converging"
  stepHeight: number
  stepLength: number
  baffleSpacing: number
  baffleHeight: number
  stillingBasinType: "none" | "type-i" | "type-ii" | "type-iii" | "type-iv" | "saf"
  name: string
  upstreamChannelId: string | null
  upstreamChannelName: string | null
  downstreamChannelId: string | null
  downstreamChannelName: string | null
}

export type AddStillingBasinResult = {
  action: "addStillingBasin"
  chuteId?: string
  chuteName?: string
  discharge: number
  tailwaterDepth: number
  basinType: "auto" | "none" | "type-i" | "type-ii" | "type-iii" | "type-iv" | "saf"
}

export type AnalysisResult = {
  action: "analyzeNormalFlow" | "calculateNormalDepth" | "calculateCriticalDepth" | "analyzeGVF"
  channelId: string
  discharge?: number
  flowDepth?: number
  boundaryDepth?: number
  boundaryLocation?: "upstream" | "downstream"
  stepSize?: number
}

export type ModifyChannelResult = {
  action: "modifyChannel"
  channelId: string
  updates: {
    width?: number
    bottomWidth?: number
    depth?: number
    sideSlope?: number
    length?: number
    slope?: number
    manningN?: number
    thickness?: number
    freeBoard?: number
    name?: string
  }
}

export type DeleteObjectResult = {
  action: "deleteObject"
  objectId?: string
  objectName?: string
  confirm: boolean
}

export type DuplicateObjectResult = {
  action: "duplicateObject"
  objectId: string
  newName?: string
  offset: { x: number; y: number; z: number }
}

export type ExportSceneResult = {
  action: "exportScene"
  format: "stl" | "obj"
  selection: "all" | "selected"
  filename?: string
}

export type HydraulicToolResult =
  | CreateChannelResult
  | CreateTransitionResult
  | CreateChuteResult
  | AddStillingBasinResult
  | AnalysisResult
  | ModifyChannelResult
  | DeleteObjectResult
  | DuplicateObjectResult
  | ExportSceneResult
