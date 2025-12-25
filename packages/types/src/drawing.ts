/**
 * Drawing Types - CADHY
 *
 * TypeScript types for technical drawings, matching Rust structures
 */

// =============================================================================
// PROJECTION TYPES (from cadhy-cad projection module)
// =============================================================================

export type ProjectionType =
  | "Top"
  | "Bottom"
  | "Front"
  | "Back"
  | "Right"
  | "Left"
  | "Isometric"
  | { type: "Custom"; direction: [number, number, number]; up: [number, number, number] }

export type LineType =
  | "VisibleSharp"
  | "HiddenSharp"
  | "VisibleSmooth"
  | "HiddenSmooth"
  | "VisibleOutline"
  | "HiddenOutline"
  | "SectionCut"
  | "Centerline"

export interface Point2D {
  x: number
  y: number
}

export interface Line2D {
  start: Point2D
  end: Point2D
  line_type: LineType
}

export interface BoundingBox2D {
  min: Point2D
  max: Point2D
}

export interface ProjectionResult {
  lines: Line2D[]
  bounding_box: BoundingBox2D
  scale: number
  view_type: ProjectionType
  label: string
}

// =============================================================================
// SHEET CONFIGURATION
// =============================================================================

export type Orientation = "portrait" | "landscape"

export type PaperSize =
  | "A0"
  | "A1"
  | "A2"
  | "A3"
  | "A4"
  | { type: "custom"; width: number; height: number }

export type ProjectionAngle = "first" | "third"

export type TitleBlockStyle = "simple" | "standard" | "custom"

/** Title block information for technical drawings */
export interface TitleBlockInfo {
  /** Drawing title */
  title: string
  /** Company or author name */
  author?: string
  /** Revision number/letter */
  revision?: string
  /** Sheet number (e.g., "1/1", "2/3") */
  sheetNumber?: string
  /** Custom fields */
  customFields?: Record<string, string>
}

/** Line widths (in mm on paper) for technical drawings */
export interface LineWidthsConfig {
  /** Visible outlines/edges */
  visible: number
  /** Hidden lines */
  hidden: number
  /** Dimension lines (including extension lines) */
  dimension: number
  /** Center/axis lines */
  centerline: number
  /** Section cut / cutting plane lines */
  section: number
}

export interface SheetConfig {
  orientation: Orientation
  size: PaperSize
  scale: number
  projectionAngle: ProjectionAngle
  units: string
  titleBlock: TitleBlockStyle
  /** Title block information */
  titleBlockInfo?: TitleBlockInfo
  /** Optional line width overrides (mm on paper) */
  lineWidths?: LineWidthsConfig
}

/** Paper size dimensions in mm */
export const PAPER_SIZES_MM: Record<string, { width: number; height: number }> = {
  A0: { width: 841, height: 1189 },
  A1: { width: 594, height: 841 },
  A2: { width: 420, height: 594 },
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
}

/** Get paper dimensions in mm for a given paper size and orientation */
export function getPaperDimensions(
  size: PaperSize,
  orientation: Orientation
): { width: number; height: number } {
  let dims: { width: number; height: number }

  if (typeof size === "string") {
    dims = PAPER_SIZES_MM[size] || PAPER_SIZES_MM.A3
  } else {
    dims = { width: size.width, height: size.height }
  }

  // Swap for landscape orientation (horizontal)
  if (orientation === "landscape") {
    return { width: dims.height, height: dims.width }
  }

  return dims
}

// =============================================================================
// DRAWING VIEW
// =============================================================================

export interface DrawingView {
  id: string
  projectionType: ProjectionType
  projection: ProjectionResult
  position: [number, number]
  visible: boolean
  label?: string
}

// =============================================================================
// DISPLAY OPTIONS
// =============================================================================

export interface DisplayOptions {
  /** Show view bounding boxes (defpoints layer) */
  showBoundingBoxes: boolean
  /** Show view labels */
  showViewLabels: boolean
  /** Show grid references */
  showGridReferences: boolean
}

// =============================================================================
// TECHNICAL DRAWING
// =============================================================================

import type { AnnotationSet } from "./annotations"
import type { DimensionSet } from "./dimensions"

export interface Drawing {
  id: string
  name: string
  sheetConfig: SheetConfig
  views: DrawingView[]
  dimensions: DimensionSet
  annotations: AnnotationSet
  sourceShapeIds: string[]
  displayOptions?: DisplayOptions
  createdAt: number
  updatedAt: number
}
