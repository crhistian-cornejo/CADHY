// Annotation types - CADHY
// Types for notes, labels, and callouts in technical drawings

import type { Point2D } from "./drawing"

/**
 * Leader line style for annotations
 */
export type LeaderStyle = "straight" | "bent" | "spline"

/**
 * Arrow style for leader line end
 */
export type LeaderArrowStyle = "filled" | "open" | "dot" | "none"

/**
 * Text alignment within annotation box
 */
export type TextAlignment = "left" | "center" | "right"

/**
 * Annotation/Note attached to geometry
 */
export interface Annotation {
  /** Unique identifier */
  id: string
  /** The text content of the annotation */
  text: string
  /** Position of the annotation box (in view-relative coordinates) */
  position: Point2D
  /** Anchor point on geometry where leader line connects (in view-relative coordinates) */
  anchorPoint: Point2D
  /** ID of the view this annotation is attached to */
  viewId?: string
  /** Style configuration */
  style: AnnotationStyle
  /** Whether the annotation is currently being edited */
  isEditing?: boolean
}

/**
 * Style configuration for annotations
 */
export interface AnnotationStyle {
  /** Background color of the annotation box */
  backgroundColor: string
  /** Border color of the annotation box */
  borderColor: string
  /** Border width in mm */
  borderWidth: number
  /** Border radius for rounded corners in mm */
  borderRadius: number
  /** Text color */
  textColor: string
  /** Font size in mm */
  fontSize: number
  /** Padding inside the box in mm */
  padding: number
  /** Text alignment */
  textAlign: TextAlignment
  /** Leader line style */
  leaderStyle: LeaderStyle
  /** Leader arrow style */
  leaderArrow: LeaderArrowStyle
  /** Leader line color */
  leaderColor: string
  /** Leader line width in mm */
  leaderWidth: number
}

/**
 * Default annotation style
 */
export const DEFAULT_ANNOTATION_STYLE: AnnotationStyle = {
  backgroundColor: "transparent",
  borderColor: "#ffffff",
  borderWidth: 0.35,
  borderRadius: 2,
  textColor: "#ffffff",
  fontSize: 3.5,
  padding: 2,
  textAlign: "left",
  leaderStyle: "bent",
  leaderArrow: "filled",
  leaderColor: "#ffffff",
  leaderWidth: 0.25,
}

/**
 * Set of annotations for a drawing
 */
export interface AnnotationSet {
  annotations: Annotation[]
  defaultStyle: AnnotationStyle
}

/**
 * Create default annotation set
 */
export function createDefaultAnnotationSet(): AnnotationSet {
  return {
    annotations: [],
    defaultStyle: { ...DEFAULT_ANNOTATION_STYLE },
  }
}
