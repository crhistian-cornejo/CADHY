/**
 * GD&T Types - CADHY
 *
 * Geometric Dimensioning and Tolerancing types.
 * Based on ASME Y14.5-2018 and ISO 1101:2017 standards.
 *
 * @see https://www.gdandtbasics.com/
 */

import type { Point2D } from "./drawing"

// =============================================================================
// GD&T SYMBOLS
// =============================================================================

/**
 * GD&T characteristic symbols.
 * These appear in the first compartment of a Feature Control Frame.
 */
export type GDTSymbol =
  // Form tolerances (no datum reference needed)
  | "flatness" // ⏥ - Surface must lie between two parallel planes
  | "straightness" // ⏤ - Element must lie between two parallel lines
  | "circularity" // ○ - Cross-section must be within two concentric circles
  | "cylindricity" // ⌭ - Surface must be within two coaxial cylinders
  // Orientation tolerances (require datum)
  | "perpendicularity" // ⟂ - Surface/axis must be perpendicular to datum
  | "parallelism" // ∥ - Surface/axis must be parallel to datum
  | "angularity" // ∠ - Surface/axis must be at specified angle to datum
  // Location tolerances (require datum)
  | "position" // ⌖ - Feature center must be within cylindrical/rectangular zone
  | "concentricity" // ◎ - Axis must be coaxial with datum axis
  | "symmetry" // ⌯ - Feature must be symmetric about datum plane
  // Profile tolerances (may or may not require datum)
  | "profile_line" // ⌒ - Line profile must be within tolerance zone
  | "profile_surface" // ⌓ - Surface profile must be within tolerance zone
  // Runout tolerances (require datum)
  | "circular_runout" // ↗ - Surface variation during one revolution
  | "total_runout" // ↗↗ - Surface variation during full axial travel

/**
 * Unicode/text representations of GD&T symbols.
 * Used for rendering in UI and exports.
 */
export const GDT_SYMBOL_CHARS: Record<GDTSymbol, string> = {
  flatness: "⏥",
  straightness: "⏤",
  circularity: "○",
  cylindricity: "⌭",
  perpendicularity: "⟂",
  parallelism: "∥",
  angularity: "∠",
  position: "⌖",
  concentricity: "◎",
  symmetry: "⌯",
  profile_line: "⌒",
  profile_surface: "⌓",
  circular_runout: "↗",
  total_runout: "↗↗",
}

/**
 * GD&T symbol categories for UI grouping.
 */
export const GDT_SYMBOL_CATEGORIES = {
  form: ["flatness", "straightness", "circularity", "cylindricity"] as GDTSymbol[],
  orientation: ["perpendicularity", "parallelism", "angularity"] as GDTSymbol[],
  location: ["position", "concentricity", "symmetry"] as GDTSymbol[],
  profile: ["profile_line", "profile_surface"] as GDTSymbol[],
  runout: ["circular_runout", "total_runout"] as GDTSymbol[],
}

// =============================================================================
// MODIFIERS
// =============================================================================

/**
 * Material condition modifiers.
 * Applied to tolerances or datum references.
 */
export type MaterialCondition =
  | "M" // Maximum Material Condition (MMC)
  | "L" // Least Material Condition (LMC)
  | "F" // Free state (for flexible parts)
  | "P" // Projected tolerance zone
  | "T" // Tangent plane
  | "U" // Unequally disposed profile
  | "S" // Regardless of Feature Size (implied, rarely shown)

/**
 * Unicode representations of material condition modifiers.
 */
export const MATERIAL_CONDITION_CHARS: Record<MaterialCondition, string> = {
  M: "Ⓜ",
  L: "Ⓛ",
  F: "Ⓕ",
  P: "Ⓟ",
  T: "Ⓣ",
  U: "Ⓤ",
  S: "Ⓢ",
}

// =============================================================================
// DATUM REFERENCES
// =============================================================================

/**
 * A datum reference in a Feature Control Frame.
 */
export interface DatumReference {
  /** Datum letter (A, B, C, etc.) */
  letter: string
  /** Material condition modifier (optional) */
  modifier?: MaterialCondition
}

/**
 * A datum feature symbol that identifies a datum on the drawing.
 * Appears as a filled or open triangle with a letter.
 */
export interface DatumFeatureSymbol {
  /** Unique identifier */
  id: string
  /** Datum letter (A, B, C, etc.) */
  letter: string
  /** Position on the drawing */
  position: Point2D
  /** View this datum belongs to */
  viewId?: string
  /** Attached to edge/feature ID (for snapping) */
  attachedToFeatureId?: string
  /** Is this datum visible */
  visible: boolean
}

/**
 * A datum target symbol.
 * Used to specify specific points, lines, or areas on a part.
 */
export interface DatumTarget {
  /** Unique identifier */
  id: string
  /** Datum letter */
  letter: string
  /** Target number (1, 2, 3, etc.) */
  number: number
  /** Target type */
  type: "point" | "line" | "area"
  /** Position on the drawing */
  position: Point2D
  /** For area targets: diameter or dimensions */
  size?: number
  /** View this target belongs to */
  viewId?: string
  /** Is this target visible */
  visible: boolean
}

// =============================================================================
// FEATURE CONTROL FRAME
// =============================================================================

/**
 * Tolerance value with optional diameter symbol and modifier.
 */
export interface ToleranceValue {
  /** Tolerance amount */
  value: number
  /** Show diameter symbol (⌀) before value */
  isDiameter: boolean
  /** Material condition modifier */
  modifier?: MaterialCondition
}

/**
 * A Feature Control Frame (FCF) - the main GD&T annotation.
 * Structured as: [Symbol | Tolerance | Datum A | Datum B | Datum C]
 */
export interface FeatureControlFrame {
  /** Unique identifier */
  id: string
  /** GD&T characteristic symbol */
  symbol: GDTSymbol
  /** Primary tolerance zone */
  tolerance: ToleranceValue
  /** Secondary/composite tolerance (for composite FCFs) */
  secondaryTolerance?: ToleranceValue
  /** Datum references (up to 3, order matters for primary/secondary/tertiary) */
  datumReferences: DatumReference[]
  /** Position on the drawing */
  position: Point2D
  /** View this FCF belongs to */
  viewId?: string
  /** Attached to dimension ID (for inline FCFs) */
  attachedToDimensionId?: string
  /** Attached to feature/edge ID */
  attachedToFeatureId?: string
  /** Is this FCF visible */
  visible: boolean
  /** All around symbol (circle at leader elbow) */
  allAround?: boolean
  /** Between symbol (arrow between two features) */
  between?: {
    startFeatureId: string
    endFeatureId: string
  }
}

/**
 * Composite Feature Control Frame.
 * Two or more FCFs stacked together for composite tolerancing.
 * Common for position tolerance with pattern location + feature location.
 */
export interface CompositeFeatureControlFrame {
  /** Unique identifier */
  id: string
  /** Upper (pattern locating) FCF */
  patternLocating: FeatureControlFrame
  /** Lower (feature relating) FCF */
  featureRelating: FeatureControlFrame
  /** Position on the drawing */
  position: Point2D
  /** View this composite FCF belongs to */
  viewId?: string
  /** Is this visible */
  visible: boolean
}

// =============================================================================
// GD&T SET (Collection in a drawing)
// =============================================================================

/**
 * Complete set of GD&T annotations in a drawing.
 */
export interface GDTSet {
  /** Feature Control Frames */
  featureControlFrames: FeatureControlFrame[]
  /** Composite FCFs */
  compositeFrames: CompositeFeatureControlFrame[]
  /** Datum feature symbols */
  datumSymbols: DatumFeatureSymbol[]
  /** Datum targets */
  datumTargets: DatumTarget[]
  /** Default display configuration */
  config: GDTDisplayConfig
}

/**
 * Display configuration for GD&T annotations.
 */
export interface GDTDisplayConfig {
  /** Font size for FCF text (mm) */
  fontSize: number
  /** Frame height (mm) */
  frameHeight: number
  /** Frame line width (mm) */
  lineWidth: number
  /** Color for GD&T elements */
  color: string
  /** Show tolerance values with units */
  showUnits: boolean
  /** Number of decimal places */
  precision: number
}

/** Default GD&T display configuration */
export const DEFAULT_GDT_CONFIG: GDTDisplayConfig = {
  fontSize: 3.5,
  frameHeight: 6,
  lineWidth: 0.35,
  color: "#000000",
  showUnits: false,
  precision: 3,
}

/**
 * Create an empty GD&T set.
 */
export function createEmptyGDTSet(): GDTSet {
  return {
    featureControlFrames: [],
    compositeFrames: [],
    datumSymbols: [],
    datumTargets: [],
    config: { ...DEFAULT_GDT_CONFIG },
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if a GD&T symbol requires datum references.
 */
export function requiresDatum(symbol: GDTSymbol): boolean {
  const noDatumRequired: GDTSymbol[] = ["flatness", "straightness", "circularity", "cylindricity"]
  return !noDatumRequired.includes(symbol)
}

/**
 * Get the category of a GD&T symbol.
 */
export function getSymbolCategory(
  symbol: GDTSymbol
): "form" | "orientation" | "location" | "profile" | "runout" {
  for (const [category, symbols] of Object.entries(GDT_SYMBOL_CATEGORIES)) {
    if ((symbols as GDTSymbol[]).includes(symbol)) {
      return category as "form" | "orientation" | "location" | "profile" | "runout"
    }
  }
  return "form" // fallback
}

/**
 * Format a Feature Control Frame as a string (for text export).
 * Example output: "⌖ ⌀0.05 Ⓜ A B C"
 */
export function formatFCFAsText(fcf: FeatureControlFrame): string {
  const parts: string[] = []

  // Symbol
  parts.push(GDT_SYMBOL_CHARS[fcf.symbol])

  // Tolerance
  let tolStr = ""
  if (fcf.tolerance.isDiameter) tolStr += "⌀"
  tolStr += fcf.tolerance.value.toString()
  if (fcf.tolerance.modifier) {
    tolStr += MATERIAL_CONDITION_CHARS[fcf.tolerance.modifier]
  }
  parts.push(tolStr)

  // Datum references
  for (const datum of fcf.datumReferences) {
    let datumStr = datum.letter
    if (datum.modifier) {
      datumStr += MATERIAL_CONDITION_CHARS[datum.modifier]
    }
    parts.push(datumStr)
  }

  return parts.join(" ")
}
