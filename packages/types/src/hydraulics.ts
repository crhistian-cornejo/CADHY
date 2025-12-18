// Hydraulics types - Channel, Flow, Profile

export type SectionType = "rectangular" | "trapezoidal" | "triangular"

export interface RectangularSection {
  type: "rectangular"
  width: number // b - bottom/internal width
  depth: number // y - total section depth
}

export interface TrapezoidalSection {
  type: "trapezoidal"
  bottomWidth: number // b - bottom width
  depth: number // y - total section depth
  sideSlope: number // z (horizontal:vertical) - also known as talud
  leftSlope?: number // Optional: different left slope (H:V)
  rightSlope?: number // Optional: different right slope (H:V)
}

export interface TriangularSection {
  type: "triangular"
  depth: number // y - total section depth
  sideSlope: number // z (horizontal:vertical)
  leftSlope?: number // Optional: different left slope
  rightSlope?: number // Optional: different right slope
}

export type ChannelSection = RectangularSection | TrapezoidalSection | TriangularSection

// Structural properties for channel sections
export interface ChannelStructure {
  thickness: number // e - uniform wall/floor thickness (m), default 0.15
  material: "concrete" | "masonry" | "steel" | "hdpe" | "other"
  freeBoard: number // libre bordo (m), default 0.30
}

// Connection point for channel chaining
export interface ChannelEndpoint {
  station: number // Progressive station (m)
  position: { x: number; y: number; z: number } // 3D coordinates
  invertElevation: number // Invert (bed) elevation
  sectionAtEnd: ChannelSection // Section at this endpoint
}

export interface Channel {
  id: string
  name: string
  section: ChannelSection
  structure?: ChannelStructure // Optional structural properties
  manningN: number // Manning's roughness coefficient
  slope: number // S0 - bed slope (m/m)
  length: number // L - channel length (m)
  startStation?: number // Starting station/chainage
  startElevation?: number // Starting invert elevation
  upstreamChannelId?: string | null // Connected upstream channel
  downstreamChannelId?: string | null // Connected downstream channel
}

export interface FlowConditions {
  discharge: number // Q - m³/s
  depth?: number // y - m (optional, calculated)
}

export interface FlowAnalysis {
  normalDepth: number // yn
  criticalDepth: number // yc
  velocity: number // V
  froudeNumber: number // Fr
  flowType: "subcritical" | "critical" | "supercritical"
  area: number // A
  wettedPerimeter: number // P
  hydraulicRadius: number // R
  topWidth: number // T
  specificEnergy: number // E
}

export interface ProfilePoint {
  station: number // x position along channel
  bedElevation: number
  waterSurfaceElevation: number
  depth: number
  velocity: number
  froudeNumber: number
  flowType: "subcritical" | "critical" | "supercritical"
}

export interface WaterProfile {
  channelId: string
  points: ProfilePoint[]
  profileType:
    | "M1"
    | "M2"
    | "M3"
    | "S1"
    | "S2"
    | "S3"
    | "C1"
    | "C2"
    | "C3"
    | "H2"
    | "H3"
    | "A2"
    | "A3"
}

export interface HydraulicJump {
  upstreamDepth: number // y1
  downstreamDepth: number // y2
  jumpLength: number
  energyLoss: number
  location: number // x position
}

// Structures
export interface WeirParams {
  type: "sharp-crested" | "broad-crested" | "ogee"
  crestLength: number // L
  crestElevation: number
  dischargeCoefficient: number // Cd
}

export interface CulvertParams {
  type: "circular" | "box"
  diameter?: number
  width?: number
  height?: number
  length: number
  manningN: number
  inletType: "projecting" | "headwall" | "mitered"
}
