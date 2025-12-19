/**
 * Modeller Store Types - CADHY
 *
 * All type definitions for the modeller store slices.
 * Extracted from the monolithic modeller-store.ts for better modularity.
 */

import type { BBox, ChannelSection, MeshData, ShapeType, Transform, Vec3 } from "@cadhy/types"

// Re-export Vec3 for convenience
export type { Vec3 } from "@cadhy/types"

// ============================================================================
// ENUMS & LITERALS
// ============================================================================

export type TransformMode = "translate" | "rotate" | "scale" | "none"
export type TransformSpace = "world" | "local"
export type ViewMode = "solid" | "wireframe" | "xray" | "hidden-line"
export type CameraView = "perspective" | "top" | "front" | "right" | "left" | "back" | "bottom"
export type SnapMode = "none" | "grid" | "vertex" | "edge" | "face" | "center"
export type ObjectType =
  | "shape"
  | "channel"
  | "transition"
  | "chute"
  | "alignment"
  | "structure"
  | "annotation"

// ============================================================================
// LAYER
// ============================================================================

export interface Layer {
  id: string
  name: string
  color: string
  visible: boolean
  locked: boolean
  frozen: boolean
  printable: boolean
  order: number
}

// ============================================================================
// SCENE OBJECTS
// ============================================================================

/** Base object in scene */
export interface SceneObject {
  id: string
  name: string
  type: ObjectType
  layerId: string
  transform: Transform
  visible: boolean
  locked: boolean
  selected: boolean
  bbox?: BBox
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** 3D Shape object */
/**
 * PBR Texture configuration for materials
 * Textures are stored as IDs to be loaded from texture service
 */
export interface PBRTextureConfig {
  /** Albedo texture ID (from Poly Haven or local) */
  albedoTextureId?: string
  /** Normal map texture ID */
  normalTextureId?: string
  /** Roughness map texture ID */
  roughnessTextureId?: string
  /** Metalness map texture ID */
  metalnessTextureId?: string
  /** Ambient occlusion map texture ID */
  aoTextureId?: string
  /** UV repeat X */
  repeatX?: number
  /** UV repeat Y */
  repeatY?: number
}

/**
 * Material properties shared across all objects
 */
export interface MaterialProperties {
  color: string
  opacity: number
  metalness: number
  roughness: number
  /** PBR textures (only active when post-processing is enabled) */
  pbr?: PBRTextureConfig
}

export interface ShapeObject extends SceneObject {
  type: "shape"
  shapeType: ShapeType
  /**
   * Shape parameters including dimensions and detail level.
   * - `segments`: Level of detail (8-128 for curves, 1-10 for box subdivisions)
   */
  parameters: Record<string, number>
  mesh?: MeshData
  material: MaterialProperties
}

/** Alignment point for channel path */
export interface AlignmentPoint {
  station: number
  position: Vec3
  bankWidth?: { left: number; right: number }
  sectionOverride?: ChannelSection
}

/** Hydraulic Channel object */
export interface ChannelObject extends SceneObject {
  type: "channel"
  section: ChannelSection
  alignment: AlignmentPoint[]
  manningN: number
  slope: number
  length: number
  /** Uniform wall/floor thickness (m) */
  thickness: number
  freeBoard: number
  /** Connection/positioning */
  startStation: number
  startElevation: number
  upstreamChannelId: string | null
  downstreamChannelId: string | null
  /** Computed endpoint for chaining */
  endStation: number
  endElevation: number
  mesh?: MeshData
  material: MaterialProperties
}

/** Transition types */
export type TransitionTypeEnum = "linear" | "warped" | "cylindrical" | "inlet" | "outlet"

export interface TransitionSection {
  sectionType: "rectangular" | "trapezoidal" | "triangular"
  width: number
  depth: number
  sideSlope: number
  wallThickness: number
  floorThickness: number
}

/** Hydraulic Transition between channels */
export interface TransitionObject extends SceneObject {
  type: "transition"
  transitionType: TransitionTypeEnum
  length: number
  /** Connection/positioning */
  startStation: number
  startElevation: number
  endStation: number
  endElevation: number
  /** Connected channels */
  upstreamChannelId: string | null
  downstreamChannelId: string | null
  /** Inlet (upstream) section */
  inlet: TransitionSection
  /** Outlet (downstream) section */
  outlet: TransitionSection
  /** Optional stilling basin at outlet (for drop transitions) */
  stillingBasin?: StillingBasinConfig | null
  mesh?: MeshData
  material: MaterialProperties
}

// ============================================================================
// CHUTE (RAPIDA) - High-slope channel with dissipators
// ============================================================================

/** Chute surface types - determines energy dissipation along the chute body */
export type ChuteType =
  | "smooth" // Smooth concrete surface - highest velocity
  | "stepped" // Step drops for energy dissipation - lower velocity, aerated flow
  | "baffled" // Baffle blocks along the chute - maximum energy dissipation
  | "ogee" // Ogee crest profile - for spillway crests
  | "converging" // Converging walls - for side-channel spillways

/** Chute type descriptors for UI */
export const CHUTE_TYPE_INFO: Record<ChuteType, { label: string; description: string }> = {
  smooth: { label: "Smooth", description: "Standard concrete chute - highest velocity" },
  stepped: { label: "Stepped", description: "Step drops for energy dissipation, aerated flow" },
  baffled: { label: "Baffled", description: "Baffle blocks along flow - maximum dissipation" },
  ogee: { label: "Ogee Crest", description: "Ogee profile for spillway crests" },
  converging: { label: "Converging", description: "Converging walls for side-channel spillways" },
}

/** Stilling Basin types based on USBR EM-25 */
export type StillingBasinType = "none" | "type-i" | "type-ii" | "type-iii" | "type-iv" | "saf"

/** Stilling Basin type descriptors for UI */
export const STILLING_BASIN_TYPE_INFO: Record<
  StillingBasinType,
  {
    label: string
    description: string
    froudeRange: string
    features: string[]
  }
> = {
  none: { label: "None", description: "No stilling basin", froudeRange: "-", features: [] },
  "type-i": {
    label: "USBR Type I",
    description: "Undular jump basin",
    froudeRange: "Fr < 1.7",
    features: ["Flat apron only"],
  },
  "type-ii": {
    label: "USBR Type II",
    description: "High dam spillways",
    froudeRange: "Fr > 4.5, V > 15 m/s",
    features: ["Chute blocks", "Dentated sill"],
  },
  "type-iii": {
    label: "USBR Type III",
    description: "Small dams & canal structures",
    froudeRange: "Fr 4.5-17, V < 15 m/s",
    features: ["Chute blocks", "Baffle blocks", "Solid end sill"],
  },
  "type-iv": {
    label: "USBR Type IV",
    description: "Oscillating jump suppression",
    froudeRange: "Fr 2.5-4.5",
    features: ["Deflector blocks", "Optional end sill"],
  },
  saf: {
    label: "SAF Basin",
    description: "St. Anthony Falls - compact design",
    froudeRange: "Fr 1.7-17",
    features: ["Chute blocks", "Baffle blocks", "End sill", "Wingwalls"],
  },
}

/** Chute block configuration (used at basin inlet) */
export interface ChuteBlockConfig {
  /** Number of blocks across the width */
  count: number
  /** Block width (m) - typically W1 = D1 in USBR */
  width: number
  /** Block height (m) - typically h1 = D1 in USBR */
  height: number
  /** Block thickness along flow (m) */
  thickness: number
  /** Spacing between blocks (m) */
  spacing: number
}

/** Baffle block configuration (used in basin floor) */
export interface BaffleBlockConfig {
  /** Number of rows */
  rows: number
  /** Blocks per row */
  blocksPerRow: number
  /** Block width (m) */
  width: number
  /** Block height (m) - typically h3 = 0.8*D1 for Type III */
  height: number
  /** Block thickness along flow (m) */
  thickness: number
  /** Distance from basin start to first row (m) */
  distanceFromInlet: number
  /** Spacing between rows (m) */
  rowSpacing: number
}

/** End sill configuration */
export interface EndSillConfig {
  /** Sill type: solid or dentated */
  type: "solid" | "dentated"
  /** Sill height (m) */
  height: number
  /** For dentated sills: tooth width (m) */
  toothWidth?: number
  /** For dentated sills: tooth spacing (m) */
  toothSpacing?: number
}

/** Stilling Basin configuration */
export interface StillingBasinConfig {
  /** Basin type - auto-selected based on Froude number and velocity */
  type: StillingBasinType
  /** Basin length (m) - calculated from hydraulics */
  length: number
  /** Basin depth below outlet invert (m) */
  depth: number
  /** Basin floor thickness (m) */
  floorThickness: number
  /** Chute blocks at inlet (Type II, III, SAF) */
  chuteBlocks: ChuteBlockConfig | null
  /** Baffle blocks in basin (Type III, SAF) */
  baffleBlocks: BaffleBlockConfig | null
  /** End sill configuration */
  endSill: EndSillConfig | null
  /** Wingwall angle (degrees) - for SAF basins */
  wingwallAngle: number
}

/** Hydraulic Chute (Rapida) - High-slope channel */
export interface ChuteObject extends SceneObject {
  type: "chute"
  /** Chute surface type - determines energy dissipation method */
  chuteType: ChuteType
  /** Inlet section length (m) - horizontal/low-slope transition from upstream */
  inletLength: number
  /** Inlet section slope (m/m) - typically 0 or small positive value */
  inletSlope: number
  /** Horizontal length of main chute section (m) - not including inlet */
  length: number
  /** Elevation drop of main chute section (m) - positive value means dropping */
  drop: number
  /** Channel width at bottom (m) */
  width: number
  /** Channel depth (m) */
  depth: number
  /** Side slope (H:V) - 0 for rectangular */
  sideSlope: number
  /** Manning's roughness coefficient */
  manningN: number
  /** Calculated slope (m/m) = drop/length */
  slope: number
  /** Connection/positioning */
  startStation: number
  startElevation: number
  endStation: number
  endElevation: number
  /** Connected elements */
  upstreamChannelId: string | null
  downstreamChannelId: string | null
  /** For 'stepped' type: step height (m) */
  stepHeight: number
  /** For 'stepped' type: step length (m) - determines number of steps */
  stepLength: number
  /** For 'baffled' type: baffle block spacing along flow (m) */
  baffleSpacing: number
  /** For 'baffled' type: baffle block height (m) */
  baffleHeight: number
  /** Stilling basin at the end */
  stillingBasin: StillingBasinConfig | null
  /** Wall/floor thickness (m) */
  thickness: number
  mesh?: MeshData
  material: MaterialProperties
}

/** Hydraulic Structure */
export interface StructureObject extends SceneObject {
  type: "structure"
  structureType: "drop" | "weir" | "junction" | "culvert" | "inlet" | "outlet"
  parameters: Record<string, unknown>
  mesh?: MeshData
}

/** Annotation object */
export interface AnnotationObject extends SceneObject {
  type: "annotation"
  annotationType: "dimension" | "text" | "leader" | "symbol"
  content: string
  points: Vec3[]
  style: {
    fontSize: number
    color: string
    arrowStyle?: string
  }
}

/** Union of all object types */
export type AnySceneObject =
  | ShapeObject
  | ChannelObject
  | TransitionObject
  | ChuteObject
  | StructureObject
  | AnnotationObject

// ============================================================================
// SETTINGS
// ============================================================================

export interface GridSettings {
  visible: boolean
  size: number
  divisions: number
  snapEnabled: boolean
  snapSize: number
  showAxes: boolean
}

export interface ViewportSettings {
  viewMode: ViewMode
  showGrid: boolean
  showAxes: boolean
  showGizmo: boolean
  backgroundColor: string
  ambientOcclusion: boolean
  shadows: boolean
  antialiasing: boolean
  postProcessingQuality: "low" | "medium" | "high" | "ultra"
  enablePostProcessing: boolean
}

// ============================================================================
// HISTORY
// ============================================================================

export interface HistoryEntry {
  id: string
  timestamp: number
  action: string
  objects: AnySceneObject[]
  selection: string[]
}

// ============================================================================
// SCENE DATA (for save/load)
// ============================================================================

export interface SceneData {
  objects: AnySceneObject[]
  layers: Layer[]
  viewportSettings?: ViewportSettings
  gridSettings?: GridSettings
  cameraPosition?: Vec3
  cameraTarget?: Vec3
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_LAYER: Layer = {
  id: "default",
  name: "Default",
  color: "#6366f1",
  visible: true,
  locked: false,
  frozen: false,
  printable: true,
  order: 0,
}

export const DEFAULT_TRANSFORM: Transform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
}

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  visible: true,
  size: 100,
  divisions: 100,
  snapEnabled: true,
  snapSize: 0.5,
  showAxes: true,
}

export const DEFAULT_VIEWPORT_SETTINGS: ViewportSettings = {
  viewMode: "solid",
  showGrid: true,
  showAxes: true,
  showGizmo: true,
  backgroundColor: "#1a1a1a",
  ambientOcclusion: true,
  shadows: true,
  antialiasing: true,
  postProcessingQuality: "medium",
  enablePostProcessing: true,
}

// ============================================================================
// BOUNDING BOX HELPERS
// ============================================================================

export interface BoundingBox {
  min: Vec3
  max: Vec3
  center: Vec3
  size: Vec3
}

/**
 * Safely get a numeric value, returning default if NaN, undefined, or null
 */
export function safeNum(value: number | undefined | null, defaultVal: number): number {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return defaultVal
  }
  return value
}

/**
 * Calculate bounding box for a single object based on its type and properties
 */
export function getObjectBoundingBox(obj: AnySceneObject): BoundingBox {
  const pos = obj.transform?.position ?? { x: 0, y: 0, z: 0 }

  if (obj.type === "channel") {
    const channel = obj as ChannelObject
    const length = safeNum(channel.length, 10)
    const section = channel.section

    let width = 2
    let depth = 1.5

    if (section?.type === "rectangular") {
      const rect = section as { type: "rectangular"; width: number; depth: number }
      width = safeNum(rect.width, 2)
      depth = safeNum(rect.depth, 1.5)
    } else if (section?.type === "trapezoidal") {
      const trap = section as {
        type: "trapezoidal"
        bottomWidth: number
        depth: number
        sideSlope: number
      }
      const bw = safeNum(trap.bottomWidth, 2)
      const d = safeNum(trap.depth, 1.5)
      const ss = safeNum(trap.sideSlope, 1.5)
      width = bw + 2 * d * ss
      depth = d
    } else if (section?.type === "triangular") {
      const tri = section as { type: "triangular"; depth: number; sideSlope: number }
      const d = safeNum(tri.depth, 1.5)
      const ss = safeNum(tri.sideSlope, 1)
      width = 2 * d * ss
      depth = d
    }

    const startX = safeNum(channel.startStation, safeNum(pos.x, 0))
    const endX = safeNum(channel.endStation, startX + length)
    const slope = safeNum(channel.slope, 0.01)
    const startZ = safeNum(channel.startElevation, safeNum(pos.z, 0))
    const endZ = safeNum(channel.endElevation, startZ - length * slope)

    return {
      min: { x: startX, y: -width / 2, z: Math.min(startZ, endZ) - depth },
      max: { x: endX, y: width / 2, z: Math.max(startZ, endZ) },
      center: {
        x: (startX + endX) / 2,
        y: 0,
        z: (Math.min(startZ, endZ) - depth + Math.max(startZ, endZ)) / 2,
      },
      size: {
        x: Math.max(endX - startX, 1),
        y: Math.max(width, 1),
        z: Math.max(Math.abs(startZ - endZ) + depth, 1),
      },
    }
  } else if (obj.type === "transition") {
    const transition = obj as TransitionObject
    const length = safeNum(transition.length, 5)

    const inletWidth = safeNum(transition.inlet?.width, 2)
    const outletWidth = safeNum(transition.outlet?.width, 2)
    const inletDepth = safeNum(transition.inlet?.depth, 1.5)
    const outletDepth = safeNum(transition.outlet?.depth, 1.5)

    const maxWidth = Math.max(inletWidth, outletWidth)
    const maxDepth = Math.max(inletDepth, outletDepth)

    const startX = safeNum(transition.startStation, safeNum(pos.x, 0))
    const endX = safeNum(transition.endStation, startX + length)
    const startZ = safeNum(transition.startElevation, safeNum(pos.z, 0))
    const endZ = safeNum(transition.endElevation, startZ - length * 0.01)

    return {
      min: { x: startX, y: -maxWidth / 2, z: Math.min(startZ, endZ) - maxDepth },
      max: { x: endX, y: maxWidth / 2, z: Math.max(startZ, endZ) },
      center: {
        x: (startX + endX) / 2,
        y: 0,
        z: (Math.min(startZ, endZ) - maxDepth + Math.max(startZ, endZ)) / 2,
      },
      size: {
        x: Math.max(endX - startX, 1),
        y: Math.max(maxWidth, 1),
        z: Math.max(Math.abs(startZ - endZ) + maxDepth, 1),
      },
    }
  } else if (obj.type === "shape") {
    const shape = obj as ShapeObject
    const scale = obj.transform.scale

    let size = { x: 1, y: 1, z: 1 }
    if (shape.shapeType === "box") {
      size = { x: scale.x, y: scale.y, z: scale.z }
    } else if (shape.shapeType === "sphere") {
      const r = Math.max(scale.x, scale.y, scale.z)
      size = { x: r * 2, y: r * 2, z: r * 2 }
    } else if (shape.shapeType === "cylinder") {
      size = { x: scale.x * 2, y: scale.y, z: scale.z * 2 }
    }

    return {
      min: { x: pos.x - size.x / 2, y: pos.y - size.y / 2, z: pos.z - size.z / 2 },
      max: { x: pos.x + size.x / 2, y: pos.y + size.y / 2, z: pos.z + size.z / 2 },
      center: pos,
      size,
    }
  } else if (obj.type === "chute") {
    const chute = obj as ChuteObject
    const inletLength = safeNum(chute.inletLength, 1)
    const mainLength = safeNum(chute.length, 10)
    const totalLength = inletLength + mainLength
    const chuteWidth = safeNum(chute.width, 2)
    const chuteDepth = safeNum(chute.depth, 1.5)
    const sideSlope = safeNum(chute.sideSlope, 0)

    // Total width at top = bottom width + 2 * depth * side slope
    const totalWidth = chuteWidth + 2 * chuteDepth * sideSlope

    const startX = safeNum(chute.startStation, safeNum(pos.x, 0))
    const endX = safeNum(chute.endStation, startX + totalLength)
    const startZ = safeNum(chute.startElevation, safeNum(pos.z, 0))
    const endZ = safeNum(chute.endElevation, startZ - safeNum(chute.drop, mainLength * 0.1))

    return {
      min: { x: startX, y: -totalWidth / 2, z: Math.min(startZ, endZ) - chuteDepth },
      max: { x: endX, y: totalWidth / 2, z: Math.max(startZ, endZ) },
      center: {
        x: (startX + endX) / 2,
        y: 0,
        z: (Math.min(startZ, endZ) - chuteDepth + Math.max(startZ, endZ)) / 2,
      },
      size: {
        x: Math.max(endX - startX, 1),
        y: Math.max(totalWidth, 1),
        z: Math.max(Math.abs(startZ - endZ) + chuteDepth, 1),
      },
    }
  }

  // Default fallback
  return {
    min: { x: pos.x - 1, y: pos.y - 1, z: pos.z - 1 },
    max: { x: pos.x + 1, y: pos.y + 1, z: pos.z + 1 },
    center: pos,
    size: { x: 2, y: 2, z: 2 },
  }
}

/**
 * Calculate combined bounding box for multiple objects
 */
export function calculateSceneBoundingBox(objects: AnySceneObject[]): BoundingBox | null {
  if (objects.length === 0) return null

  const boxes = objects.map(getObjectBoundingBox)

  const min: Vec3 = {
    x: Math.min(...boxes.map((b) => b.min.x)),
    y: Math.min(...boxes.map((b) => b.min.y)),
    z: Math.min(...boxes.map((b) => b.min.z)),
  }

  const max: Vec3 = {
    x: Math.max(...boxes.map((b) => b.max.x)),
    y: Math.max(...boxes.map((b) => b.max.y)),
    z: Math.max(...boxes.map((b) => b.max.z)),
  }

  return {
    min,
    max,
    center: {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2,
    },
    size: {
      x: max.x - min.x,
      y: max.y - min.y,
      z: max.z - min.z,
    },
  }
}

/**
 * Calculate camera position for a given view that frames the bounding box
 */
export function getCameraPositionForView(
  view: CameraView,
  bbox: BoundingBox | null,
  defaultDistance: number = 20
): { position: Vec3; target: Vec3 } {
  const rawTarget = bbox?.center ?? { x: 0, y: 0, z: 0 }
  const target: Vec3 = {
    x: safeNum(rawTarget.x, 0),
    y: safeNum(rawTarget.y, 0),
    z: safeNum(rawTarget.z, 0),
  }

  const rawSize = bbox?.size ?? { x: 10, y: 10, z: 10 }
  const size: Vec3 = {
    x: safeNum(rawSize.x, 10),
    y: safeNum(rawSize.y, 10),
    z: safeNum(rawSize.z, 10),
  }
  const maxDim = Math.max(size.x, size.y, size.z, 1)
  const distance = Math.min(Math.max(maxDim * 1.5, defaultDistance), 1000)

  const positions: Record<CameraView, Vec3> = {
    perspective: {
      x: target.x + distance * 0.5,
      y: target.y + distance * 0.7,
      z: target.z + distance * 0.5,
    },
    top: { x: target.x, y: target.y + distance, z: target.z },
    bottom: { x: target.x, y: target.y - distance, z: target.z },
    front: { x: target.x, y: target.y, z: target.z + distance },
    back: { x: target.x, y: target.y, z: target.z - distance },
    right: { x: target.x + distance, y: target.y, z: target.z },
    left: { x: target.x - distance, y: target.y, z: target.z },
  }

  return {
    position: positions[view],
    target,
  }
}

// ============================================================================
// NOTIFICATIONS / WARNINGS SYSTEM
// ============================================================================

/** Severity levels for design notifications */
export type NotificationSeverity = "info" | "warning" | "error"

/** Categories for design notifications */
export type NotificationCategory =
  | "hydraulics" // Flow-related issues (Froude, velocity, depth)
  | "geometry" // Geometric issues (dimensions, slopes)
  | "connection" // Connection/continuity issues
  | "material" // Material/roughness issues
  | "stilling-basin" // Stilling basin design issues
  | "general" // General design notes

/** A single design notification/warning */
export interface DesignNotification {
  id: string
  /** Object ID this notification relates to (null for scene-wide) */
  objectId: string | null
  /** Object name for display */
  objectName: string | null
  /** Severity level */
  severity: NotificationSeverity
  /** Category for filtering */
  category: NotificationCategory
  /** Short title */
  title: string
  /** Detailed message */
  message: string
  /** Recommended action (optional) */
  recommendation?: string
  /** Action button configuration (optional) */
  action?: NotificationAction
  /** Timestamp when notification was generated */
  timestamp: number
  /** Whether the user has dismissed this notification */
  dismissed: boolean
}

/** Action that can be taken from a notification */
export interface NotificationAction {
  /** Action type identifier */
  type: "add-stilling-basin" | "adjust-dimensions" | "connect-elements" | "custom"
  /** Button label */
  label: string
  /** Action payload (type-specific data) */
  payload?: Record<string, unknown>
}

/** Summary counts by severity */
export interface NotificationSummary {
  info: number
  warning: number
  error: number
  total: number
}
