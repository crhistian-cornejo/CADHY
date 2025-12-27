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
  | "IsometricSW"
  | "IsometricSE"
  | "IsometricNE"
  | "IsometricNW"
  | { type: "Custom"; direction: [number, number, number]; up: [number, number, number] }

/** All isometric projection variants */
export const ISOMETRIC_VARIANTS = [
  "Isometric",
  "IsometricSW",
  "IsometricSE",
  "IsometricNE",
  "IsometricNW",
] as const

export type IsometricVariant = (typeof ISOMETRIC_VARIANTS)[number]

/** Check if a projection type is isometric */
export function isIsometricProjection(type: ProjectionType): type is IsometricVariant {
  if (typeof type === "string") {
    return ISOMETRIC_VARIANTS.includes(type as IsometricVariant)
  }
  return false
}

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
// VIEW LABEL CONFIGURATION
// =============================================================================

/** Position of the view label relative to the view */
export type ViewLabelPosition = "top" | "bottom" | "left" | "right"

/** Style for view numbering */
export type ViewNumberStyle = "circle" | "square" | "plain" | "none"

/** Configuration for view labels */
export interface ViewLabelConfig {
  /** Show the view label (name) */
  showLabel: boolean
  /** Show the scale (e.g., "1:25") */
  showScale: boolean
  /** Show view number */
  showNumber: boolean
  /** View number (1, 2, 3, etc.) */
  number?: number
  /** Position relative to view */
  position: ViewLabelPosition
  /** Font size in mm */
  fontSize: number
  /** Style for the number indicator */
  numberStyle: ViewNumberStyle
  /** Custom scale override (if different from sheet scale) */
  customScale?: number
  /** Distance from view bounding box in mm (default: 8mm to clear dimensions) */
  offset: number
  /** Draw underline under the label text */
  underline: boolean
  /** Number circle/square radius multiplier (default: 0.7 = 70% of fontSize) */
  numberSize: number
  /** Gap between number and label text in mm (default: 1.5mm) */
  numberGap: number
}

/** Default view label configuration */
export const DEFAULT_VIEW_LABEL_CONFIG: ViewLabelConfig = {
  showLabel: true,
  showScale: true,
  showNumber: false,
  position: "bottom",
  fontSize: 3.5,
  numberStyle: "circle",
  offset: 12, // 12mm default to clear most dimensions
  underline: true,
  numberSize: 0.7, // 70% of fontSize
  numberGap: 1.5, // 1.5mm gap between number and text
}

/** Standard CAD scales (denominator values) */
export const STANDARD_CAD_SCALES = [
  1, 2, 2.5, 5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000,
] as const

/**
 * Format a scale value to CAD standard format (e.g., "1:25")
 * Handles both ratio format (0.04) and denominator format (25)
 */
export function formatScaleForCAD(scale: number): string {
  // If scale is less than 1, it's a ratio (e.g., 0.04 = 1:25)
  // If scale is >= 1, it's already a denominator (e.g., 25 = 1:25)
  let denominator: number

  if (scale < 1 && scale > 0) {
    // Convert ratio to denominator: 0.04 -> 25, 0.05 -> 20
    denominator = Math.round(1 / scale)
  } else if (scale >= 1) {
    denominator = Math.round(scale)
  } else {
    denominator = 1
  }

  // Try to find closest standard scale
  const closest = STANDARD_CAD_SCALES.reduce((prev, curr) =>
    Math.abs(curr - denominator) < Math.abs(prev - denominator) ? curr : prev
  )

  // If very close to a standard scale (within 5%), use it
  if (Math.abs(closest - denominator) / denominator < 0.05) {
    denominator = closest
  }

  return `1:${denominator}`
}

// =============================================================================
// HATCHING CONFIGURATION
// =============================================================================

/** Predefined hatch patterns based on industry standards */
export type HatchPatternType =
  | "solid" // Solid fill
  | "ansi31" // 45° diagonal lines (general purpose)
  | "ansi32" // Steel/metal (parallel lines, different spacing)
  | "ansi33" // Brass/bronze
  | "ansi34" // Rubber/plastic
  | "ansi35" // Fire brick
  | "ansi36" // Marble/glass
  | "ansi37" // Concrete (random dots + lines)
  | "ansi38" // Earth/sand
  | "cross" // Cross-hatch (90° crossing)
  | "dots" // Dot pattern
  | "custom" // Custom angle and spacing

/** Configuration for hatch rendering */
export interface HatchConfig {
  /** Pattern type */
  pattern: HatchPatternType
  /** Primary line angle in degrees (default: 45) */
  angle: number
  /** Spacing between lines in mm (default: 2.0) */
  spacing: number
  /** Line weight in mm (default: 0.25) */
  lineWeight: number
  /** Color (CSS color string, default: "#000000") */
  color: string
  /** Opacity 0-1 (default: 1.0) */
  opacity: number
  /** For cross-hatch: secondary angle (default: angle + 90) */
  crossAngle?: number
  /** Scale factor for pattern (default: 1.0) */
  scale: number
}

/** Default hatch configuration */
export const DEFAULT_HATCH_CONFIG: HatchConfig = {
  pattern: "ansi31",
  angle: 45,
  spacing: 2.0,
  lineWeight: 0.25,
  color: "#000000",
  opacity: 1.0,
  scale: 1.0,
}

/** A region to be hatched, defined by a closed polygon */
export interface HatchRegion {
  /** Unique identifier */
  id: string
  /** Points defining the closed boundary (in paper coordinates) */
  boundary: Point2D[]
  /** Hatch configuration */
  config: HatchConfig
  /** Associated view ID (optional) */
  viewId?: string
  /** Layer for visibility control */
  layer: string
  /** Is this hatch visible */
  visible: boolean
}

/** Preset hatch configurations for common materials */
export const MATERIAL_HATCH_PRESETS: Record<string, Partial<HatchConfig>> = {
  concrete: { pattern: "ansi37", angle: 45, spacing: 3.0 },
  steel: { pattern: "ansi31", angle: 45, spacing: 1.5 },
  earth: { pattern: "ansi38", angle: 0, spacing: 2.5 },
  wood: { pattern: "ansi31", angle: 0, spacing: 1.0 },
  insulation: { pattern: "cross", angle: 45, spacing: 4.0 },
  water: { pattern: "ansi31", angle: 0, spacing: 0.8 },
  brick: { pattern: "ansi35", angle: 45, spacing: 2.0 },
  glass: { pattern: "ansi36", angle: 45, spacing: 1.5 },
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
  /** Label configuration - if not provided, uses defaults */
  labelConfig?: Partial<ViewLabelConfig>
}

// =============================================================================
// LAYOUT GRID CONFIGURATION
// =============================================================================

/** Configuration for layout grid (like Figma/CAD canvas guides) */
export interface LayoutGridConfig {
  /** Show the layout grid */
  enabled: boolean
  /** Grid spacing in mm */
  spacing: number
  /** Show minor grid lines (subdivisions) */
  showMinorGrid: boolean
  /** Minor grid subdivisions (e.g., 5 = divide each cell into 5) */
  minorDivisions: number
  /** Snap views to grid when moving */
  snapToGrid: boolean
  /** Snap tolerance in mm */
  snapTolerance: number
  /** Grid line color */
  color: string
  /** Grid line opacity (0-1) */
  opacity: number
}

/** Default layout grid configuration */
export const DEFAULT_LAYOUT_GRID_CONFIG: LayoutGridConfig = {
  enabled: false,
  spacing: 25, // 25mm grid (1 inch approx)
  showMinorGrid: true,
  minorDivisions: 5,
  snapToGrid: true,
  snapTolerance: 3,
  color: "#3b82f6",
  opacity: 0.3,
}

/** Configuration for alignment guides */
export interface AlignmentGuidesConfig {
  /** Show alignment guides when dragging views */
  enabled: boolean
  /** Show center alignment guides */
  showCenterGuides: boolean
  /** Show edge alignment guides */
  showEdgeGuides: boolean
  /** Show spacing indicators between views */
  showSpacingIndicators: boolean
  /** Guide color */
  color: string
}

/** Default alignment guides configuration */
export const DEFAULT_ALIGNMENT_GUIDES_CONFIG: AlignmentGuidesConfig = {
  enabled: true,
  showCenterGuides: true,
  showEdgeGuides: true,
  showSpacingIndicators: true,
  color: "#ec4899", // Pink like Figma
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
  /** Layout grid configuration */
  layoutGrid?: LayoutGridConfig
  /** Alignment guides configuration */
  alignmentGuides?: AlignmentGuidesConfig
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
  /** Hatch regions for sections */
  hatches: HatchRegion[]
  sourceShapeIds: string[]
  displayOptions?: DisplayOptions
  createdAt: number
  updatedAt: number
}
