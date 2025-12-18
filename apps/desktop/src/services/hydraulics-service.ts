/**
 * Hydraulics Service - CADHY
 *
 * Provides access to hydraulic analysis and 3D geometry generation
 * through Tauri commands connected to the Rust backend.
 */

import { invoke } from "@tauri-apps/api/core"

// ============================================================================
// TYPES - Channel Sections
// ============================================================================

export type ChannelSectionType = "rectangular" | "trapezoidal" | "triangular"

export interface RectangularSectionDef {
  type: "rectangular"
  width: number
  depth: number
}

export interface TrapezoidalSectionDef {
  type: "trapezoidal"
  bottom_width: number
  depth: number
  side_slope: number
}

export interface TriangularSectionDef {
  type: "triangular"
  depth: number
  side_slope: number
}

export type ChannelSectionDef = RectangularSectionDef | TrapezoidalSectionDef | TriangularSectionDef

// ============================================================================
// TYPES - Geometry
// ============================================================================

export interface ChannelGeometryInput {
  name: string
  section: ChannelSectionDef
  manning_n: number
  slope: number
  length: number
  start_elevation?: number
  resolution?: number
  wall_thickness?: number
  floor_thickness?: number
}

export interface MeshResult {
  vertices: number[]
  indices: number[]
  normals: number[] | null
  vertex_count: number
  triangle_count: number
}

export interface MeshStats {
  vertex_count: number
  triangle_count: number
  bounding_box_min: [number, number, number]
  bounding_box_max: [number, number, number]
  dimensions: [number, number, number]
}

export type ExportFormat = "stl" | "obj" | "step"

// ============================================================================
// TYPES - Transitions
// ============================================================================

export type TransitionType = "linear" | "warped" | "cylindrical" | "inlet" | "outlet"

export interface TransitionSectionDef {
  section_type: string
  width: number
  depth: number
  side_slope: number
  wall_thickness: number
  floor_thickness: number
}

export interface TransitionGeometryInput {
  name: string
  transition_type: TransitionType
  length: number
  resolution?: number
  start_station: number
  start_elevation: number
  end_elevation: number
  inlet: TransitionSectionDef
  outlet: TransitionSectionDef
}

// ============================================================================
// TYPES - Chutes
// ============================================================================

export type ChuteType = "smooth" | "stepped" | "baffled" | "ogee" | "converging"
export type StillingBasinType = "none" | "type-i" | "type-ii" | "type-iii" | "type-iv" | "saf"

export interface ChuteBlockDef {
  count: number
  width: number
  height: number
  thickness: number
  spacing: number
}

export interface BaffleBlockDef {
  rows: number
  blocksPerRow: number
  width: number
  height: number
  thickness: number
  distanceFromInlet: number
  rowSpacing: number
}

export interface EndSillDef {
  type: "solid" | "dentated"
  height: number
  toothWidth?: number
  toothSpacing?: number
}

export interface StillingBasinDef {
  type: StillingBasinType
  length: number
  depth: number
  floorThickness: number
  chuteBlocks: ChuteBlockDef | null
  baffleBlocks: BaffleBlockDef | null
  endSill: EndSillDef | null
  wingwallAngle: number
}

export interface ChuteGeometryInput {
  name: string
  chuteType: ChuteType
  inletLength: number
  inletSlope: number
  length: number
  drop: number
  width: number
  depth: number
  sideSlope: number
  thickness: number
  startStation: number
  startElevation: number
  resolution?: number
  stepHeight?: number
  stepLength?: number
  baffleSpacing?: number
  baffleHeight?: number
  stillingBasin?: StillingBasinDef | null
}

// ============================================================================
// TYPES - Flow Analysis
// ============================================================================

export interface ChannelParams {
  channel_type: ChannelSectionType
  width?: number
  side_slope?: number
  diameter?: number
  manning_n: number
  slope: number
}

export interface FlowAnalysis {
  depth: number
  area: number
  wetted_perimeter: number
  hydraulic_radius: number
  top_width: number
  hydraulic_depth: number
  velocity: number
  discharge: number
  froude_number: number
  flow_regime: string
  specific_energy: number
}

export interface WaterProfileResult {
  stations: number[]
  depths: number[]
  velocities: number[]
  froude_numbers: number[]
  profile_type: string
}

// ============================================================================
// GEOMETRY GENERATION
// ============================================================================

/**
 * Generate 3D mesh for a channel
 */
export async function generateChannelMesh(input: ChannelGeometryInput): Promise<MeshResult> {
  return invoke<MeshResult>("generate_channel_mesh", { input })
}

/**
 * Generate 3D mesh for a transition between channels
 */
export async function generateTransitionMesh(input: TransitionGeometryInput): Promise<MeshResult> {
  return invoke<MeshResult>("generate_transition_mesh", { input })
}

/**
 * Generate 3D mesh for a chute (rapida)
 */
export async function generateChuteMesh(input: ChuteGeometryInput): Promise<MeshResult> {
  return invoke<MeshResult>("generate_chute_mesh", { input })
}

/**
 * Export mesh to file
 */
export async function exportMeshToFile(
  mesh: MeshResult,
  filePath: string,
  format: ExportFormat
): Promise<string> {
  return invoke<string>("export_mesh_to_file", {
    mesh,
    file_path: filePath,
    format,
  })
}

/**
 * Get mesh statistics
 */
export async function getMeshStats(mesh: MeshResult): Promise<MeshStats> {
  return invoke<MeshStats>("get_mesh_stats", { mesh })
}

// ============================================================================
// FLOW ANALYSIS
// ============================================================================

/**
 * Analyze channel flow at given depth
 */
export async function analyzeChannel(params: ChannelParams, depth: number): Promise<FlowAnalysis> {
  return invoke<FlowAnalysis>("analyze_channel", { params, depth })
}

/**
 * Calculate normal depth for given discharge
 */
export async function calculateNormalDepth(
  params: ChannelParams,
  discharge: number
): Promise<number> {
  return invoke<number>("calculate_normal_depth", { params, discharge })
}

/**
 * Calculate critical depth for given discharge
 */
export async function calculateCriticalDepth(
  params: ChannelParams,
  discharge: number
): Promise<number> {
  return invoke<number>("calculate_critical_depth", { params, discharge })
}

/**
 * Analyze water surface profile
 */
export async function analyzeWaterProfile(
  params: ChannelParams,
  discharge: number,
  upstreamDepth: number,
  channelLength: number,
  numSteps: number
): Promise<WaterProfileResult> {
  return invoke<WaterProfileResult>("analyze_water_profile", {
    params,
    discharge,
    upstream_depth: upstreamDepth,
    channel_length: channelLength,
    num_steps: numSteps,
  })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert frontend section type to backend format
 */
export function convertSectionToBackend(
  sectionType: ChannelSectionType,
  params: Record<string, number>
): ChannelSectionDef {
  switch (sectionType) {
    case "rectangular":
      return {
        type: "rectangular",
        width: params.width ?? 2,
        depth: params.depth ?? 1,
      }
    case "trapezoidal":
      return {
        type: "trapezoidal",
        bottom_width: params.bottomWidth ?? 2,
        depth: params.depth ?? 1.5,
        side_slope: params.sideSlope ?? 1.5,
      }
    case "triangular":
      return {
        type: "triangular",
        depth: params.depth ?? 1,
        side_slope: params.sideSlope ?? 1,
      }
  }
}

/**
 * Convert frontend section to ChannelParams for analysis
 */
export function sectionToChannelParams(
  sectionType: ChannelSectionType,
  params: Record<string, number>,
  manningN: number,
  slope: number
): ChannelParams {
  const base: ChannelParams = {
    channel_type: sectionType,
    manning_n: manningN,
    slope,
  }

  switch (sectionType) {
    case "rectangular":
      return { ...base, width: params.width ?? 2 }
    case "trapezoidal":
      return {
        ...base,
        width: params.bottomWidth ?? 2,
        side_slope: params.sideSlope ?? 1.5,
      }
    case "triangular":
      return { ...base, side_slope: params.sideSlope ?? 1 }
  }
}

/**
 * Check if Tauri is available (running in desktop app)
 */
export function isTauriAvailable(): boolean {
  return "__TAURI_INTERNALS__" in window
}
