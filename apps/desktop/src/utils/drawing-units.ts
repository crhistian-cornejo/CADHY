/**
 * Drawing units helpers - CADHY
 *
 * Assumption (current app): model space is in meters (see viewport showing "100m").
 * For technical drawings we often want mm/cm/m outputs.
 *
 * This helper converts "output units" into a scale multiplier applied to projection results.
 */

export type DrawingUnits = "mm" | "cm" | "m"

export function getModelMetersToDrawingUnitsFactor(units: string): number {
  switch (units) {
    case "mm":
      return 1000
    case "cm":
      return 100
    case "m":
    default:
      return 1
  }
}
