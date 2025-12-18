/**
 * Result Types - CADHY Results Panel
 *
 * Type definitions for hydraulic analysis results
 */

export interface GvfStation {
  /** Station/chainage (m) */
  station: number
  /** Bed elevation (m) */
  bedElevation: number
  /** Water depth (m) */
  waterDepth: number
  /** Water surface elevation (m) */
  wse: number
  /** Energy grade line elevation (m) */
  egl: number
  /** Velocity (m/s) */
  velocity: number
  /** Froude number */
  froude: number
  /** Flow regime: 'subcritical' | 'critical' | 'supercritical' */
  flowRegime: "subcritical" | "critical" | "supercritical"
  /** Specific energy (m) */
  specificEnergy: number
  /** Area (m²) */
  area: number
  /** Wetted perimeter (m) */
  wettedPerimeter: number
  /** Hydraulic radius (m) */
  hydraulicRadius: number
  /** Top width (m) */
  topWidth: number
}

export interface GvfSummary {
  /** Normal depth (m) */
  normalDepth: number
  /** Critical depth (m) */
  criticalDepth: number
  /** Total discharge (m³/s) */
  discharge: number
  /** Channel slope (m/m) */
  slope: number
  /** Manning's n */
  manningN: number
  /** Minimum velocity (m/s) */
  minVelocity: number
  /** Maximum velocity (m/s) */
  maxVelocity: number
  /** Average velocity (m/s) */
  avgVelocity: number
  /** Minimum Froude */
  minFroude: number
  /** Maximum Froude */
  maxFroude: number
  /** Hydraulic jump detected */
  hasHydraulicJump: boolean
  /** Jump location (station) */
  jumpStation?: number
  /** Profile type: M1, M2, M3, S1, S2, S3, C1, C3, H2, H3, A2, A3 */
  profileType?: string
}

export interface GvfResult {
  /** Profile stations */
  stations: GvfStation[]
  /** Summary statistics */
  summary: GvfSummary
  /** Channel ID this result belongs to */
  channelId: string
  /** Timestamp when analysis was run */
  timestamp: number
}

export type ResultTab = "profile" | "table" | "energy" | "summary"
