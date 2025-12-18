/**
 * AI Scene Context - CADHY Modeller Store
 *
 * Provides scene context for AI analysis:
 * - getSceneContextForAI
 * - formatSceneContextForPrompt
 */

import type { Vec3 } from "@cadhy/types"
import type { AnySceneObject, ChannelObject, ShapeObject, TransitionObject } from "./types"

// Note: This module exports pure functions that accept state as a parameter
// to avoid circular dependencies. The store will call these functions
// and pass its own state.

// ============================================================================
// TYPES
// ============================================================================

/**
 * Scene context summary for AI analysis.
 * Provides detailed information about all objects in the scene.
 */
export interface SceneContextForAI {
  /** Total number of objects in the scene */
  totalObjects: number
  /** Number of objects by type */
  objectCounts: Record<string, number>
  /** Currently selected object IDs */
  selectedIds: string[]
  /** Detailed list of channels */
  channels: ChannelSummary[]
  /** Detailed list of transitions */
  transitions: TransitionSummary[]
  /** Detailed list of shapes */
  shapes: ShapeSummary[]
  /** Hydraulic system summary */
  hydraulicSystem: HydraulicSystemSummary
}

interface ChannelSummary {
  id: string
  name: string
  isSelected: boolean
  sectionType: string
  /** Section dimensions in meters */
  dimensions: {
    width?: number
    bottomWidth?: number
    depth: number
    sideSlope?: number
  }
  /** Channel length in meters */
  length: number
  /** Bed slope (m/m) */
  slope: number
  /** Manning's roughness coefficient */
  manningN: number
  /** Wall/floor thickness in meters */
  thickness: number
  /** Freeboard in meters */
  freeBoard: number
  /** Position in the hydraulic chain */
  station: {
    start: number
    end: number
  }
  /** Elevation at start and end */
  elevation: {
    start: number
    end: number
  }
  /** Connected element IDs */
  connections: {
    upstream: string | null
    downstream: string | null
  }
}

interface TransitionSummary {
  id: string
  name: string
  isSelected: boolean
  transitionType: string
  length: number
  /** Inlet section */
  inlet: {
    sectionType: string
    width: number
    depth: number
    sideSlope: number
  }
  /** Outlet section */
  outlet: {
    sectionType: string
    width: number
    depth: number
    sideSlope: number
  }
  station: {
    start: number
    end: number
  }
  elevation: {
    start: number
    end: number
  }
  connections: {
    upstream: string | null
    downstream: string | null
  }
}

interface ShapeSummary {
  id: string
  name: string
  isSelected: boolean
  shapeType: string
  /** Shape parameters (dimensions in meters) */
  parameters: Record<string, number>
  /** Position in 3D space */
  position: Vec3
}

interface HydraulicSystemSummary {
  /** Total length of the hydraulic system */
  totalLength: number
  /** Elevation drop from start to end */
  totalElevationDrop: number
  /** Average slope across the system */
  averageSlope: number
  /** Number of connected chains */
  chainCount: number
  /** IDs of root elements (no upstream connection) */
  rootElements: string[]
  /** IDs of terminal elements (no downstream connection) */
  terminalElements: string[]
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Get a structured summary of the scene for AI analysis.
 * This function extracts all relevant information from the modeller store
 * and formats it for the AI to understand and respond to queries about the scene.
 *
 * @param objects - Array of scene objects
 * @param selectedIds - Array of selected object IDs
 */
export function getSceneContextForAI(
  objects: AnySceneObject[],
  selectedIds: string[]
): SceneContextForAI {
  // Count objects by type
  const objectCounts: Record<string, number> = {}
  objects.forEach((obj) => {
    objectCounts[obj.type] = (objectCounts[obj.type] || 0) + 1
  })

  // Extract channels
  const channels: ChannelSummary[] = objects
    .filter((obj): obj is ChannelObject => obj.type === "channel")
    .map((ch) => {
      const section = ch.section
      const dimensions: ChannelSummary["dimensions"] = { depth: section.depth }

      if (section.type === "rectangular") {
        dimensions.width = (section as { width: number }).width
      } else if (section.type === "trapezoidal") {
        dimensions.bottomWidth = (section as { bottomWidth: number }).bottomWidth
        dimensions.sideSlope = (section as { sideSlope: number }).sideSlope
      } else if (section.type === "triangular") {
        dimensions.sideSlope = (section as { sideSlope: number }).sideSlope
      }

      return {
        id: ch.id,
        name: ch.name,
        isSelected: selectedIds.includes(ch.id),
        sectionType: section.type,
        dimensions,
        length: ch.length,
        slope: ch.slope,
        manningN: ch.manningN,
        thickness: ch.thickness,
        freeBoard: ch.freeBoard,
        station: {
          start: ch.startStation,
          end: ch.endStation,
        },
        elevation: {
          start: ch.startElevation,
          end: ch.endElevation,
        },
        connections: {
          upstream: ch.upstreamChannelId,
          downstream: ch.downstreamChannelId,
        },
      }
    })

  // Extract transitions
  const transitions: TransitionSummary[] = objects
    .filter((obj): obj is TransitionObject => obj.type === "transition")
    .map((tr) => ({
      id: tr.id,
      name: tr.name,
      isSelected: selectedIds.includes(tr.id),
      transitionType: tr.transitionType,
      length: tr.length,
      inlet: {
        sectionType: tr.inlet.sectionType,
        width: tr.inlet.width,
        depth: tr.inlet.depth,
        sideSlope: tr.inlet.sideSlope,
      },
      outlet: {
        sectionType: tr.outlet.sectionType,
        width: tr.outlet.width,
        depth: tr.outlet.depth,
        sideSlope: tr.outlet.sideSlope,
      },
      station: {
        start: tr.startStation,
        end: tr.endStation,
      },
      elevation: {
        start: tr.startElevation,
        end: tr.endElevation,
      },
      connections: {
        upstream: tr.upstreamChannelId,
        downstream: tr.downstreamChannelId,
      },
    }))

  // Extract shapes
  const shapes: ShapeSummary[] = objects
    .filter((obj): obj is ShapeObject => obj.type === "shape")
    .map((sh) => ({
      id: sh.id,
      name: sh.name,
      isSelected: selectedIds.includes(sh.id),
      shapeType: sh.shapeType,
      parameters: sh.parameters,
      position: sh.transform.position,
    }))

  // Calculate hydraulic system summary
  const hydraulicElements = [...channels, ...transitions]
  const rootElements = hydraulicElements.filter((el) => !el.connections.upstream).map((el) => el.id)
  const terminalElements = hydraulicElements
    .filter((el) => !el.connections.downstream)
    .map((el) => el.id)

  const totalLength = hydraulicElements.reduce((sum, el) => sum + el.length, 0)

  // Find elevation range
  let minElevation = Infinity
  let maxElevation = -Infinity
  hydraulicElements.forEach((el) => {
    minElevation = Math.min(minElevation, el.elevation.start, el.elevation.end)
    maxElevation = Math.max(maxElevation, el.elevation.start, el.elevation.end)
  })
  const totalElevationDrop = hydraulicElements.length > 0 ? maxElevation - minElevation : 0
  const averageSlope = totalLength > 0 ? totalElevationDrop / totalLength : 0

  // Count chains (number of root elements = number of independent chains)
  const chainCount = rootElements.length

  const hydraulicSystem: HydraulicSystemSummary = {
    totalLength,
    totalElevationDrop,
    averageSlope,
    chainCount,
    rootElements,
    terminalElements,
  }

  return {
    totalObjects: objects.length,
    objectCounts,
    selectedIds,
    channels,
    transitions,
    shapes,
    hydraulicSystem,
  }
}

/**
 * Format scene context as a human-readable string for AI prompt injection.
 * This creates a detailed description that the AI can understand and reference.
 *
 * @param objects - Array of scene objects
 * @param selectedIds - Array of selected object IDs
 */
export function formatSceneContextForPrompt(
  objects: AnySceneObject[],
  selectedIds: string[]
): string {
  const context = getSceneContextForAI(objects, selectedIds)

  if (context.totalObjects === 0) {
    return `
=== CURRENT 3D SCENE ===
The scene is empty. No objects have been created yet.
`
  }

  let prompt = `
=== CURRENT 3D SCENE ===
Total objects: ${context.totalObjects}
`

  // Object counts
  if (Object.keys(context.objectCounts).length > 0) {
    prompt += `Object breakdown: ${Object.entries(context.objectCounts)
      .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
      .join(", ")}\n`
  }

  // Selected objects
  if (context.selectedIds.length > 0) {
    prompt += `Currently selected: ${context.selectedIds.length} object(s)\n`
  }

  // Hydraulic system summary
  if (context.channels.length > 0 || context.transitions.length > 0) {
    prompt += `
--- HYDRAULIC SYSTEM ---
Total channel length: ${context.hydraulicSystem.totalLength.toFixed(2)} m
Elevation drop: ${context.hydraulicSystem.totalElevationDrop.toFixed(3)} m
Average slope: ${(context.hydraulicSystem.averageSlope * 100).toFixed(3)}%
Independent chains: ${context.hydraulicSystem.chainCount}
`

    // CRITICAL: Show terminal elements so AI knows which IDs to connect to
    if (context.hydraulicSystem.terminalElements.length > 0) {
      prompt += `\n*** AVAILABLE FOR DOWNSTREAM CONNECTION ***
The following elements have NO downstream connection yet.
To connect a new channel/transition to one of these, use its ID with "connectToUpstream" parameter:
${context.hydraulicSystem.terminalElements
  .map((id) => {
    const ch = context.channels.find((c) => c.id === id)
    const tr = context.transitions.find((t) => t.id === id)
    const name = ch?.name || tr?.name || "Unknown"
    return `  → "${name}" (ID: ${id})`
  })
  .join("\n")}
`
    }
  }

  // Detailed channel list
  if (context.channels.length > 0) {
    prompt += `\n--- CHANNELS (${context.channels.length}) ---\n`
    context.channels.forEach((ch, i) => {
      prompt += `\n[${i + 1}] "${ch.name}" (ID: ${ch.id})${ch.isSelected ? " [SELECTED]" : ""}
   • Section: ${ch.sectionType}`

      if (ch.dimensions.width !== undefined) {
        prompt += `, width=${ch.dimensions.width}m`
      }
      if (ch.dimensions.bottomWidth !== undefined) {
        prompt += `, bottomWidth=${ch.dimensions.bottomWidth}m`
      }
      prompt += `, depth=${ch.dimensions.depth}m`
      if (ch.dimensions.sideSlope !== undefined) {
        prompt += `, sideSlope=${ch.dimensions.sideSlope}:1`
      }

      prompt += `
   • Length: ${ch.length}m
   • Slope: ${(ch.slope * 100).toFixed(3)}% (${ch.slope} m/m)
   • Manning's n: ${ch.manningN}
   • Wall thickness: ${ch.thickness}m, Freeboard: ${ch.freeBoard}m
   • Station: ${(ch.station?.start ?? 0).toFixed(2)}m → ${(ch.station?.end ?? ch.length ?? 0).toFixed(2)}m
   • Elevation: ${(ch.elevation?.start ?? 0).toFixed(3)}m → ${(ch.elevation?.end ?? 0).toFixed(3)}m`

      if (ch.connections.upstream || ch.connections.downstream) {
        prompt += `\n   • Connected: `
        if (ch.connections.upstream) prompt += `upstream=${ch.connections.upstream} `
        if (ch.connections.downstream) prompt += `downstream=${ch.connections.downstream}`
      }
      prompt += "\n"
    })
  }

  // Detailed transition list
  if (context.transitions.length > 0) {
    prompt += `\n--- TRANSITIONS (${context.transitions.length}) ---\n`
    context.transitions.forEach((tr, i) => {
      prompt += `\n[${i + 1}] "${tr.name}" (ID: ${tr.id})${tr.isSelected ? " [SELECTED]" : ""}
   • Type: ${tr.transitionType}
   • Length: ${tr.length}m
   • Inlet: ${tr.inlet.sectionType}, width=${tr.inlet.width}m, depth=${tr.inlet.depth}m${tr.inlet.sideSlope > 0 ? `, slope=${tr.inlet.sideSlope}:1` : ""}
   • Outlet: ${tr.outlet.sectionType}, width=${tr.outlet.width}m, depth=${tr.outlet.depth}m${tr.outlet.sideSlope > 0 ? `, slope=${tr.outlet.sideSlope}:1` : ""}
   • Station: ${(tr.station?.start ?? 0).toFixed(2)}m → ${(tr.station?.end ?? tr.length ?? 0).toFixed(2)}m
   • Elevation: ${(tr.elevation?.start ?? 0).toFixed(3)}m → ${(tr.elevation?.end ?? 0).toFixed(3)}m`

      if (tr.connections.upstream || tr.connections.downstream) {
        prompt += `\n   • Connected: `
        if (tr.connections.upstream) prompt += `upstream=${tr.connections.upstream} `
        if (tr.connections.downstream) prompt += `downstream=${tr.connections.downstream}`
      }
      prompt += "\n"
    })
  }

  // Detailed shapes list
  if (context.shapes.length > 0) {
    prompt += `\n--- SHAPES (${context.shapes.length}) ---\n`
    context.shapes.forEach((sh, i) => {
      const params = Object.entries(sh.parameters)
        .map(([k, v]) => `${k}=${v}m`)
        .join(", ")
      prompt += `[${i + 1}] "${sh.name}" (ID: ${sh.id})${sh.isSelected ? " [SELECTED]" : ""}
   • Type: ${sh.shapeType}
   • Parameters: ${params}
   • Position: (${sh.position.x.toFixed(2)}, ${sh.position.y.toFixed(2)}, ${sh.position.z.toFixed(2)})\n`
    })
  }

  prompt += `\n=== END SCENE ===\n`

  return prompt
}
