// Dimension types - CADHY
// Mirrors Rust types from cadhy-cad/src/dimensions.rs

export type DimensionType =
  | "Linear"
  | "Horizontal"
  | "Vertical"
  | "Aligned"
  | "Angular"
  | "Radial"
  | "Diameter"
  | "Ordinate"

export type ArrowStyle = "Filled" | "Open" | "Tick" | "Dot" | "None"

import type { Point2D } from "./drawing"

export interface ExtensionLine {
  start: Point2D
  end: Point2D
}

export interface DimensionLine {
  start: Point2D
  end: Point2D
  startArrow: ArrowStyle
  endArrow: ArrowStyle
}

export interface Dimension {
  dimType: DimensionType
  value: number
  unit: string
  textPosition: Point2D
  point1: Point2D
  point2: Point2D | null
  /** Third point for Angular dimensions (point1=leg1, point2=vertex, point3=leg2) */
  point3?: Point2D | null
  extensionLines: ExtensionLine[]
  dimensionLine: DimensionLine
  /** Arc radius for Angular dimensions */
  arcRadius?: number
  prefix: string | null
  suffix: string | null
  labelOverride: string | null
  /** ID of the view this dimension is attached to (for relative positioning) */
  viewId?: string
}

export interface DimensionConfig {
  offset: number
  extensionGap: number
  extensionOvershoot: number
  arrowSize: number
  textHeight: number
  precision: number
  unit: string
  showUnit: boolean
  arrowStyle: ArrowStyle
}

export interface DimensionSet {
  dimensions: Dimension[]
  config: DimensionConfig
}
