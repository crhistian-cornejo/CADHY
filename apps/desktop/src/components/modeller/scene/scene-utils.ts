/**
 * Scene Utilities - CADHY
 *
 * Helper functions for the Scene Panel including:
 * - Object type icon mapping
 * - Object type label helpers
 */

import type { ShapeType } from "@cadhy/types"
import {
  CircleIcon,
  Cone01Icon,
  CubeIcon,
  Cylinder01Icon,
  type IconSvgElement,
  Layers01Icon,
  Location06Icon,
  MessageMultiple01Icon,
  SphereIcon,
  SquareIcon,
  Structure02Icon,
  WaterEnergyIcon,
} from "@hugeicons/core-free-icons"
import type { ObjectType } from "@/stores/modeller"

/**
 * Get the appropriate icon for an object type and optional shape type
 */
export function getObjectIcon(type: ObjectType, shapeType?: ShapeType): IconSvgElement {
  // For shapes, return type-specific icons
  if (type === "shape" && shapeType) {
    switch (shapeType) {
      case "sphere":
        return SphereIcon
      case "box":
        return CubeIcon
      case "cylinder":
        return Cylinder01Icon
      case "cone":
        return Cone01Icon
      case "torus":
        return CircleIcon
      case "plane":
        return SquareIcon
      default:
        return CubeIcon
    }
  }

  // For other object types
  switch (type) {
    case "shape":
      return CubeIcon
    case "channel":
      return WaterEnergyIcon
    case "transition":
      return Layers01Icon
    case "chute":
      return WaterEnergyIcon // Could use a slide/ramp icon when available
    case "structure":
      return Structure02Icon
    case "annotation":
      return MessageMultiple01Icon
    case "alignment":
      return Location06Icon
    default:
      return CubeIcon
  }
}

/**
 * Get a human-readable label for an object type
 */
export function getObjectTypeLabel(type: ObjectType): string {
  switch (type) {
    case "shape":
      return "Shape"
    case "channel":
      return "Channel"
    case "transition":
      return "Transition"
    case "chute":
      return "Chute"
    case "structure":
      return "Structure"
    case "annotation":
      return "Annotation"
    case "alignment":
      return "Alignment"
    default:
      return "Object"
  }
}

/**
 * Get a human-readable label for a shape type
 */
export function getShapeTypeLabel(shapeType: ShapeType): string {
  switch (shapeType) {
    case "sphere":
      return "Sphere"
    case "box":
      return "Box"
    case "cylinder":
      return "Cylinder"
    case "cone":
      return "Cone"
    case "torus":
      return "Torus"
    case "plane":
      return "Plane"
    default:
      return "Shape"
  }
}

/**
 * Get a color associated with an object type for visual consistency
 */
export function getObjectTypeColor(type: ObjectType): string {
  switch (type) {
    case "channel":
      return "#0ea5e9" // cyan-500
    case "transition":
      return "#f59e0b" // amber-500
    case "chute":
      return "#f97316" // orange-500
    case "shape":
      return "#6366f1" // indigo-500
    case "structure":
      return "#10b981" // emerald-500
    case "annotation":
      return "#a855f7" // purple-500
    case "alignment":
      return "#ec4899" // pink-500
    default:
      return "#64748b" // slate-500
  }
}
