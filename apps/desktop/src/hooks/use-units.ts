/**
 * useUnits Hook - CADHY
 *
 * Global unit system hook that provides:
 * - Current unit settings from project store
 * - Conversion utilities for display and input
 * - Reactive updates when unit system changes
 *
 * Architecture:
 * - All internal values are stored in SI base units (meters, radians, etc.)
 * - Conversion happens at the UI boundary (display/input)
 * - This ensures consistent calculations regardless of display units
 */

import { useCallback, useMemo } from "react"
import { useProjectActions, useProjectSettings } from "@/stores/project-store"

// ============================================================================
// TYPES
// ============================================================================

export type LengthUnit = "m" | "ft" | "mm" | "in" | "cm"
export type AngleUnit = "deg" | "rad"
export type VelocityUnit = "m/s" | "ft/s"
export type AreaUnit = "m²" | "ft²" | "mm²" | "in²"
export type VolumeUnit = "m³" | "ft³" | "L" | "gal"
export type FlowRateUnit = "m³/s" | "ft³/s" | "L/s" | "gal/min"
export type SlopeUnit = "m/m" | "ft/ft" | "%" | "‰"

export type UnitSystem = "metric" | "imperial"

export interface UnitConfig {
  length: LengthUnit
  angle: AngleUnit
  velocity: VelocityUnit
  area: AreaUnit
  volume: VolumeUnit
  flowRate: FlowRateUnit
  slope: SlopeUnit
}

// ============================================================================
// CONVERSION FACTORS (to SI base units)
// All factors convert FROM the unit TO SI base (meters, radians, etc.)
// ============================================================================

const LENGTH_TO_METERS: Record<LengthUnit, number> = {
  m: 1,
  ft: 0.3048,
  mm: 0.001,
  in: 0.0254,
  cm: 0.01,
}

const ANGLE_TO_RADIANS: Record<AngleUnit, number> = {
  rad: 1,
  deg: Math.PI / 180,
}

const VELOCITY_TO_MPS: Record<VelocityUnit, number> = {
  "m/s": 1,
  "ft/s": 0.3048,
}

const AREA_TO_SQM: Record<AreaUnit, number> = {
  "m²": 1,
  "ft²": 0.092903,
  "mm²": 0.000001,
  "in²": 0.00064516,
}

const VOLUME_TO_CUM: Record<VolumeUnit, number> = {
  "m³": 1,
  "ft³": 0.0283168,
  L: 0.001,
  gal: 0.00378541,
}

const FLOWRATE_TO_CUMPS: Record<FlowRateUnit, number> = {
  "m³/s": 1,
  "ft³/s": 0.0283168,
  "L/s": 0.001,
  "gal/min": 0.0000630902,
}

// ============================================================================
// UNIT SYSTEM PRESETS
// ============================================================================

const METRIC_UNITS: UnitConfig = {
  length: "m",
  angle: "deg",
  velocity: "m/s",
  area: "m²",
  volume: "m³",
  flowRate: "m³/s",
  slope: "m/m",
}

const IMPERIAL_UNITS: UnitConfig = {
  length: "ft",
  angle: "deg",
  velocity: "ft/s",
  area: "ft²",
  volume: "ft³",
  flowRate: "ft³/s",
  slope: "ft/ft",
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert length from internal (meters) to display unit
 */
export function lengthToDisplay(valueInMeters: number, toUnit: LengthUnit): number {
  return valueInMeters / LENGTH_TO_METERS[toUnit]
}

/**
 * Convert length from display unit to internal (meters)
 */
export function lengthToInternal(valueInUnit: number, fromUnit: LengthUnit): number {
  return valueInUnit * LENGTH_TO_METERS[fromUnit]
}

/**
 * Convert angle from internal (radians) to display unit
 */
export function angleToDisplay(valueInRadians: number, toUnit: AngleUnit): number {
  return valueInRadians / ANGLE_TO_RADIANS[toUnit]
}

/**
 * Convert angle from display unit to internal (radians)
 */
export function angleToInternal(valueInUnit: number, fromUnit: AngleUnit): number {
  return valueInUnit * ANGLE_TO_RADIANS[fromUnit]
}

/**
 * Convert velocity from internal (m/s) to display unit
 */
export function velocityToDisplay(valueInMps: number, toUnit: VelocityUnit): number {
  return valueInMps / VELOCITY_TO_MPS[toUnit]
}

/**
 * Convert velocity from display unit to internal (m/s)
 */
export function velocityToInternal(valueInUnit: number, fromUnit: VelocityUnit): number {
  return valueInUnit * VELOCITY_TO_MPS[fromUnit]
}

/**
 * Convert area from internal (m²) to display unit
 */
export function areaToDisplay(valueInSqm: number, toUnit: AreaUnit): number {
  return valueInSqm / AREA_TO_SQM[toUnit]
}

/**
 * Convert area from display unit to internal (m²)
 */
export function areaToInternal(valueInUnit: number, fromUnit: AreaUnit): number {
  return valueInUnit * AREA_TO_SQM[fromUnit]
}

/**
 * Convert volume from internal (m³) to display unit
 */
export function volumeToDisplay(valueInCum: number, toUnit: VolumeUnit): number {
  return valueInCum / VOLUME_TO_CUM[toUnit]
}

/**
 * Convert volume from display unit to internal (m³)
 */
export function volumeToInternal(valueInUnit: number, fromUnit: VolumeUnit): number {
  return valueInUnit * VOLUME_TO_CUM[fromUnit]
}

/**
 * Convert flow rate from internal (m³/s) to display unit
 */
export function flowRateToDisplay(valueInCumps: number, toUnit: FlowRateUnit): number {
  return valueInCumps / FLOWRATE_TO_CUMPS[toUnit]
}

/**
 * Convert flow rate from display unit to internal (m³/s)
 */
export function flowRateToInternal(valueInUnit: number, fromUnit: FlowRateUnit): number {
  return valueInUnit * FLOWRATE_TO_CUMPS[fromUnit]
}

// ============================================================================
// UNIT LABELS (for display)
// ============================================================================

export const UNIT_LABELS = {
  length: {
    m: "m",
    ft: "ft",
    mm: "mm",
    in: "in",
    cm: "cm",
  },
  angle: {
    deg: "°",
    rad: "rad",
  },
  velocity: {
    "m/s": "m/s",
    "ft/s": "ft/s",
  },
  area: {
    "m²": "m²",
    "ft²": "ft²",
    "mm²": "mm²",
    "in²": "in²",
  },
  volume: {
    "m³": "m³",
    "ft³": "ft³",
    L: "L",
    gal: "gal",
  },
  flowRate: {
    "m³/s": "m³/s",
    "ft³/s": "ft³/s",
    "L/s": "L/s",
    "gal/min": "gal/min",
  },
  slope: {
    "m/m": "m/m",
    "ft/ft": "ft/ft",
    "%": "%",
    "‰": "‰",
  },
} as const

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useUnits() {
  const settings = useProjectSettings()
  const { updateSettings } = useProjectActions()

  // Determine unit system from length unit
  const unitSystem: UnitSystem =
    settings.units.length === "ft" || settings.units.length === "in" ? "imperial" : "metric"

  // Get full unit config based on system
  const units: UnitConfig = useMemo(() => {
    const baseUnits = unitSystem === "imperial" ? IMPERIAL_UNITS : METRIC_UNITS
    return {
      ...baseUnits,
      length: settings.units.length as LengthUnit,
      angle: settings.units.angle as AngleUnit,
    }
  }, [unitSystem, settings.units.length, settings.units.angle])

  // Precision from project settings
  const precision = settings.precision

  // ============================================================================
  // CONVERSION UTILITIES (memoized)
  // ============================================================================

  /**
   * Format a length value for display
   * @param valueInMeters - Value in internal units (meters)
   * @param includeSuffix - Whether to include the unit suffix
   */
  const formatLength = useCallback(
    (valueInMeters: number, includeSuffix = true): string => {
      const converted = lengthToDisplay(valueInMeters, units.length)
      const formatted = converted.toFixed(precision)
      return includeSuffix ? `${formatted} ${UNIT_LABELS.length[units.length]}` : formatted
    },
    [units.length, precision]
  )

  /**
   * Parse a length input and convert to internal units (meters)
   */
  const parseLength = useCallback(
    (valueInDisplayUnit: number): number => {
      return lengthToInternal(valueInDisplayUnit, units.length)
    },
    [units.length]
  )

  /**
   * Convert length from internal to display unit (number only)
   */
  const convertLengthToDisplay = useCallback(
    (valueInMeters: number): number => {
      return lengthToDisplay(valueInMeters, units.length)
    },
    [units.length]
  )

  /**
   * Format an angle value for display
   */
  const formatAngle = useCallback(
    (valueInRadians: number, includeSuffix = true): string => {
      const converted = angleToDisplay(valueInRadians, units.angle)
      const formatted = converted.toFixed(precision)
      return includeSuffix ? `${formatted}${UNIT_LABELS.angle[units.angle]}` : formatted
    },
    [units.angle, precision]
  )

  /**
   * Parse an angle input and convert to internal units (radians)
   */
  const parseAngle = useCallback(
    (valueInDisplayUnit: number): number => {
      return angleToInternal(valueInDisplayUnit, units.angle)
    },
    [units.angle]
  )

  /**
   * Convert angle from internal to display unit (number only)
   */
  const convertAngleToDisplay = useCallback(
    (valueInRadians: number): number => {
      return angleToDisplay(valueInRadians, units.angle)
    },
    [units.angle]
  )

  /**
   * Format a velocity value for display
   */
  const formatVelocity = useCallback(
    (valueInMps: number, includeSuffix = true): string => {
      const converted = velocityToDisplay(valueInMps, units.velocity)
      const formatted = converted.toFixed(precision)
      return includeSuffix ? `${formatted} ${UNIT_LABELS.velocity[units.velocity]}` : formatted
    },
    [units.velocity, precision]
  )

  /**
   * Convert velocity from internal to display unit (number only)
   */
  const convertVelocityToDisplay = useCallback(
    (valueInMps: number): number => {
      return velocityToDisplay(valueInMps, units.velocity)
    },
    [units.velocity]
  )

  /**
   * Format an area value for display
   */
  const formatArea = useCallback(
    (valueInSqm: number, includeSuffix = true): string => {
      const converted = areaToDisplay(valueInSqm, units.area)
      const formatted = converted.toFixed(precision)
      return includeSuffix ? `${formatted} ${UNIT_LABELS.area[units.area]}` : formatted
    },
    [units.area, precision]
  )

  /**
   * Convert area from internal to display unit (number only)
   */
  const convertAreaToDisplay = useCallback(
    (valueInSqm: number): number => {
      return areaToDisplay(valueInSqm, units.area)
    },
    [units.area]
  )

  /**
   * Format a volume value for display
   */
  const formatVolume = useCallback(
    (valueInCum: number, includeSuffix = true): string => {
      const converted = volumeToDisplay(valueInCum, units.volume)
      const formatted = converted.toFixed(precision)
      return includeSuffix ? `${formatted} ${UNIT_LABELS.volume[units.volume]}` : formatted
    },
    [units.volume, precision]
  )

  /**
   * Convert volume from internal to display unit (number only)
   */
  const convertVolumeToDisplay = useCallback(
    (valueInCum: number): number => {
      return volumeToDisplay(valueInCum, units.volume)
    },
    [units.volume]
  )

  /**
   * Format a flow rate value for display
   */
  const formatFlowRate = useCallback(
    (valueInCumps: number, includeSuffix = true): string => {
      const converted = flowRateToDisplay(valueInCumps, units.flowRate)
      const formatted = converted.toFixed(precision)
      return includeSuffix ? `${formatted} ${UNIT_LABELS.flowRate[units.flowRate]}` : formatted
    },
    [units.flowRate, precision]
  )

  /**
   * Convert flow rate from internal to display unit (number only)
   */
  const convertFlowRateToDisplay = useCallback(
    (valueInCumps: number): number => {
      return flowRateToDisplay(valueInCumps, units.flowRate)
    },
    [units.flowRate]
  )

  // ============================================================================
  // UNIT SYSTEM ACTIONS
  // ============================================================================

  /**
   * Toggle between metric and imperial systems
   */
  const toggleUnitSystem = useCallback(() => {
    const newSystem = unitSystem === "metric" ? "imperial" : "metric"
    const newUnits = newSystem === "imperial" ? IMPERIAL_UNITS : METRIC_UNITS
    updateSettings({
      units: {
        length: newUnits.length,
        angle: newUnits.angle,
      },
    })
  }, [unitSystem, updateSettings])

  /**
   * Set a specific length unit
   */
  const setLengthUnit = useCallback(
    (unit: LengthUnit) => {
      updateSettings({
        units: {
          ...settings.units,
          length: unit,
        },
      })
    },
    [settings.units, updateSettings]
  )

  /**
   * Set a specific angle unit
   */
  const setAngleUnit = useCallback(
    (unit: AngleUnit) => {
      updateSettings({
        units: {
          ...settings.units,
          angle: unit,
        },
      })
    },
    [settings.units, updateSettings]
  )

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Current units
    unitSystem,
    units,
    precision,

    // Unit labels for display
    lengthLabel: UNIT_LABELS.length[units.length],
    angleLabel: UNIT_LABELS.angle[units.angle],
    velocityLabel: UNIT_LABELS.velocity[units.velocity],
    areaLabel: UNIT_LABELS.area[units.area],
    volumeLabel: UNIT_LABELS.volume[units.volume],
    flowRateLabel: UNIT_LABELS.flowRate[units.flowRate],

    // Format functions (internal -> display string)
    formatLength,
    formatAngle,
    formatVelocity,
    formatArea,
    formatVolume,
    formatFlowRate,

    // Parse functions (display -> internal)
    parseLength,
    parseAngle,

    // Convert functions (internal -> display number)
    convertLengthToDisplay,
    convertAngleToDisplay,
    convertVelocityToDisplay,
    convertAreaToDisplay,
    convertVolumeToDisplay,
    convertFlowRateToDisplay,

    // Actions
    toggleUnitSystem,
    setLengthUnit,
    setAngleUnit,
  }
}

// ============================================================================
// STANDALONE UTILITIES (for use outside React components)
// ============================================================================

export const UnitConversions = {
  length: {
    toDisplay: lengthToDisplay,
    toInternal: lengthToInternal,
    factors: LENGTH_TO_METERS,
  },
  angle: {
    toDisplay: angleToDisplay,
    toInternal: angleToInternal,
    factors: ANGLE_TO_RADIANS,
  },
  velocity: {
    toDisplay: velocityToDisplay,
    toInternal: velocityToInternal,
    factors: VELOCITY_TO_MPS,
  },
  area: {
    toDisplay: areaToDisplay,
    toInternal: areaToInternal,
    factors: AREA_TO_SQM,
  },
  volume: {
    toDisplay: volumeToDisplay,
    toInternal: volumeToInternal,
    factors: VOLUME_TO_CUM,
  },
  flowRate: {
    toDisplay: flowRateToDisplay,
    toInternal: flowRateToInternal,
    factors: FLOWRATE_TO_CUMPS,
  },
}

export default useUnits
