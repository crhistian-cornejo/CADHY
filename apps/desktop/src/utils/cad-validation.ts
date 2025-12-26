/**
 * CAD Validation Utilities - CADHY
 *
 * Centralized validation functions and error messages for CAD operations.
 * This eliminates code duplication across multiple components.
 */

import { toast } from "@cadhy/ui"
import type { ShapeObject } from "@/stores/modeller"
import { useModellerStore } from "@/stores/modeller"

// ============================================================================
// ERROR MESSAGES - Centralized for consistency and i18n support
// ============================================================================

export const CAD_MESSAGES = {
  // Selection errors
  noObjectsSelected: "No objects selected",
  noObjectsSelectedHint: "No objects selected. Select an object first.",
  noObjectsForExport: "No objects selected for export",

  // Backend errors
  shapeNotFound: "Shape not found in backend",
  shapeNotFoundHint: "Shape not found in backend. Try creating a new object.",

  // Boolean operation errors
  selectTwoForUnion: "Select exactly 2 objects for Boolean Union",
  selectTwoForSubtract: "Select exactly 2 objects for Boolean Subtract",
  selectTwoForIntersect: "Select exactly 2 objects for Boolean Intersect",
  selectTwoForDistance: "Select exactly 2 objects to measure distance",

  // Minimum selection errors (Spanish for hydraulics context)
  selectMinForUnion: "Selecciona al menos 2 sólidos para unir",
  selectMinForSubtract:
    "Selecciona al menos 2 sólidos: el primero es la base, los demás se restarán",
  selectMinForIntersect: "Selecciona al menos 2 sólidos para intersectar",
  selectMinForMirror: "Selecciona al menos un sólido para espejar",

  // Operation errors
  invalidPositiveNumber: "Please enter a valid positive number",
  exportNotImplemented: (format: string) => `${format} export not yet implemented`,
  operationFailed: (op: string, error: string) => `${op} failed: ${error}`,
} as const

// ============================================================================
// SELECTION HELPERS
// ============================================================================

/**
 * Get currently selected objects from the modeller store
 */
export function getSelectedObjects(): ShapeObject[] {
  const state = useModellerStore.getState()
  return state.objects.filter((o) => state.selectedIds.includes(o.id)) as ShapeObject[]
}

/**
 * Get currently selected shape objects (type === "shape")
 */
export function getSelectedShapes(): ShapeObject[] {
  const state = useModellerStore.getState()
  return state.objects.filter(
    (o) => state.selectedIds.includes(o.id) && o.type === "shape"
  ) as ShapeObject[]
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that at least one object is selected
 * @returns The selected objects if valid, null if validation failed
 */
export function requireSelection(
  options: { showToast?: boolean; message?: string; filterType?: "shape" | "all" } = {}
): ShapeObject[] | null {
  const { showToast = true, message, filterType = "all" } = options

  const objects = filterType === "shape" ? getSelectedShapes() : getSelectedObjects()

  if (objects.length === 0) {
    if (showToast) {
      toast.error(message ?? CAD_MESSAGES.noObjectsSelectedHint)
    }
    return null
  }

  return objects
}

/**
 * Validate that at least N objects are selected
 * @returns The selected objects if valid, null if validation failed
 */
export function requireMinSelection(
  minCount: number,
  options: {
    showToast?: boolean
    message?: string
    filterType?: "shape" | "all"
  } = {}
): ShapeObject[] | null {
  const { showToast = true, message, filterType = "all" } = options

  const objects = filterType === "shape" ? getSelectedShapes() : getSelectedObjects()

  if (objects.length < minCount) {
    if (showToast) {
      toast.error(message ?? `Select at least ${minCount} object${minCount > 1 ? "s" : ""}`)
    }
    return null
  }

  return objects
}

/**
 * Validate exactly N objects are selected (for boolean operations)
 * @returns The selected objects if valid, null if validation failed
 */
export function requireExactSelection(
  count: number,
  options: {
    showToast?: boolean
    message?: string
    filterType?: "shape" | "all"
  } = {}
): ShapeObject[] | null {
  const { showToast = true, message, filterType = "all" } = options

  const objects = filterType === "shape" ? getSelectedShapes() : getSelectedObjects()

  if (objects.length !== count) {
    if (showToast) {
      toast.error(message ?? `Select exactly ${count} object${count > 1 ? "s" : ""}`)
    }
    return null
  }

  return objects
}

// ============================================================================
// BOOLEAN OPERATION VALIDATORS
// ============================================================================

/**
 * Validate selection for Boolean Union (requires at least 2 shapes)
 */
export function validateBooleanUnion(useMinimum = false): ShapeObject[] | null {
  return requireMinSelection(2, {
    filterType: "shape",
    message: useMinimum ? CAD_MESSAGES.selectMinForUnion : CAD_MESSAGES.selectTwoForUnion,
  })
}

/**
 * Validate selection for Boolean Subtract (requires at least 2 shapes)
 */
export function validateBooleanSubtract(useMinimum = false): ShapeObject[] | null {
  return requireMinSelection(2, {
    filterType: "shape",
    message: useMinimum ? CAD_MESSAGES.selectMinForSubtract : CAD_MESSAGES.selectTwoForSubtract,
  })
}

/**
 * Validate selection for Boolean Intersect (requires at least 2 shapes)
 */
export function validateBooleanIntersect(useMinimum = false): ShapeObject[] | null {
  return requireMinSelection(2, {
    filterType: "shape",
    message: useMinimum ? CAD_MESSAGES.selectMinForIntersect : CAD_MESSAGES.selectTwoForIntersect,
  })
}

/**
 * Validate selection for distance measurement (requires exactly 2 objects)
 */
export function validateDistanceMeasurement(): ShapeObject[] | null {
  return requireExactSelection(2, {
    message: CAD_MESSAGES.selectTwoForDistance,
  })
}

// ============================================================================
// ERROR HELPERS
// ============================================================================

/**
 * Show toast for shape not found in backend
 */
export function showShapeNotFoundError(detailed = false): void {
  toast.error(detailed ? CAD_MESSAGES.shapeNotFoundHint : CAD_MESSAGES.shapeNotFound)
}

/**
 * Show toast for operation failure
 */
export function showOperationError(operation: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  toast.error(CAD_MESSAGES.operationFailed(operation, errorMessage))
}

/**
 * Show toast for no objects selected (for export)
 */
export function showNoSelectionForExport(): void {
  toast.error(CAD_MESSAGES.noObjectsForExport)
}
