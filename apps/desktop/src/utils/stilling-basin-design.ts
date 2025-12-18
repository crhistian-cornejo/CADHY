/**
 * Stilling Basin Design Calculations - USBR EM-25
 *
 * Implements design equations for USBR stilling basin types I-IV and SAF.
 * Based on "Design of Small Dams" and USBR Engineering Monograph No. 25.
 */

import type {
  BaffleBlockConfig,
  ChuteBlockConfig,
  EndSillConfig,
  StillingBasinConfig,
  StillingBasinType,
} from "@/stores/modeller/types"

// ============================================================================
// HYDRAULIC CALCULATIONS
// ============================================================================

/**
 * Calculate conjugate (sequent) depth for hydraulic jump
 * Uses the Belanger equation: D2/D1 = 0.5 * (sqrt(1 + 8*Fr1²) - 1)
 */
export function calculateConjugateDepth(d1: number, froudeNumber: number): number {
  return (d1 / 2) * (Math.sqrt(1 + 8 * froudeNumber ** 2) - 1)
}

/**
 * Calculate Froude number
 * Fr = V / sqrt(g * y)
 */
export function calculateFroudeNumber(velocity: number, depth: number): number {
  const g = 9.81
  return velocity / Math.sqrt(g * depth)
}

/**
 * Calculate velocity at chute outlet
 * Using energy equation: V = sqrt(2 * g * (H - y))
 * where H is total head above outlet and y is flow depth
 */
export function calculateOutletVelocity(
  drop: number,
  inletDepth: number,
  outletDepth: number
): number {
  const g = 9.81
  // Energy at inlet = Energy at outlet + losses (assuming minimal losses for calculation)
  // V²/2g + y1 + z1 = V²/2g + y2 + z2
  // For supercritical flow on steep chute:
  return Math.sqrt(2 * g * (drop + inletDepth - outletDepth))
}

/**
 * Estimate outlet depth for supercritical flow on chute
 * Using Manning's equation for uniform flow
 */
export function estimateOutletDepth(
  discharge: number,
  width: number,
  slope: number,
  manningN: number
): number {
  const _g = 9.81
  // For rectangular channel: A = b*y, R = b*y/(b+2y) ≈ y for wide channels
  // Q = (1/n) * A * R^(2/3) * S^(1/2)
  // Simplified for wide rectangular: y = (Q*n / (b * sqrt(S)))^(3/5)

  // More accurate iteration
  let y = 0.5 // Initial guess
  for (let i = 0; i < 20; i++) {
    const A = width * y
    const P = width + 2 * y
    const R = A / P
    const Qcalc = (1 / manningN) * A * R ** (2 / 3) * Math.sqrt(slope)
    const error = Qcalc - discharge

    // Newton-Raphson adjustment
    const dQ_dy =
      (1 / manningN) *
      Math.sqrt(slope) *
      (width * R ** (2 / 3) + ((A * (2 / 3) * R ** (-1 / 3) * (P - 2 * y)) / (P * P)) * width)

    y = y - error / dQ_dy
    y = Math.max(0.01, y) // Prevent negative depth

    if (Math.abs(error) < 0.001) break
  }

  return y
}

// ============================================================================
// BASIN TYPE SELECTION
// ============================================================================

/**
 * Recommend stilling basin type based on hydraulic conditions
 */
export function recommendBasinType(
  froudeNumber: number,
  outletVelocity: number
): StillingBasinType {
  // USBR criteria (approximate)
  if (froudeNumber < 1.7) {
    return "type-i" // Undular jump - may not need a formal basin
  }

  if (froudeNumber >= 1.7 && froudeNumber <= 2.5) {
    // Transition zone - oscillating jump, difficult to control
    return "type-iv" // Wave suppression design
  }

  if (froudeNumber > 2.5 && froudeNumber <= 4.5) {
    // Oscillating jump - Type IV or SAF
    return outletVelocity > 15 ? "type-iv" : "saf"
  }

  if (froudeNumber > 4.5) {
    // Stable/strong jump - Type II or III
    if (outletVelocity > 15) {
      return "type-ii" // High velocity - needs robust design
    }
    return "type-iii" // Lower velocity - can use baffle blocks
  }

  return "saf" // Default to SAF for small structures
}

// ============================================================================
// USBR BASIN DESIGN FUNCTIONS
// ============================================================================

/**
 * Calculate USBR Type II basin dimensions
 * For high dam spillways: Fr > 4.5, V > 15 m/s
 * Features: Chute blocks at inlet, dentated end sill
 */
export function designTypeIIBasin(
  d1: number, // Inlet depth (supercritical)
  d2: number, // Conjugate depth
  _froudeNumber: number,
  width: number
): Partial<StillingBasinConfig> {
  // Basin length: L = 4.5 * D2 (from USBR charts for Fr > 4.5)
  const length = 4.5 * d2

  // Basin floor depression below tailwater
  const depth = 0.1 * d2 // Typically 10% of D2

  // Chute blocks: W1 = D1, h1 = D1, spacing = D1
  const chuteBlocks: ChuteBlockConfig = {
    count: Math.max(3, Math.floor(width / (2 * d1))),
    width: d1,
    height: d1,
    thickness: d1 * 0.8,
    spacing: d1,
  }

  // Dentated end sill: h2 = 0.2 * D2
  const endSill: EndSillConfig = {
    type: "dentated",
    height: 0.2 * d2,
    toothWidth: 0.15 * d2,
    toothSpacing: 0.15 * d2,
  }

  return {
    type: "type-ii",
    length,
    depth,
    floorThickness: 0.3,
    chuteBlocks,
    baffleBlocks: null, // Type II doesn't use baffle blocks
    endSill,
    wingwallAngle: 0,
  }
}

/**
 * Calculate USBR Type III basin dimensions
 * For small dams: Fr 4.5-17, V < 15 m/s
 * Features: Chute blocks, baffle blocks, solid end sill
 */
export function designTypeIIIBasin(
  d1: number,
  d2: number,
  _froudeNumber: number,
  width: number
): Partial<StillingBasinConfig> {
  // Basin length: L = 2.8 * D2 (shorter than Type II due to baffle blocks)
  const length = 2.8 * d2

  // Basin floor depression
  const depth = 0.1 * d2

  // Chute blocks: same as Type II
  const chuteBlocks: ChuteBlockConfig = {
    count: Math.max(3, Math.floor(width / (2 * d1))),
    width: d1,
    height: d1,
    thickness: d1 * 0.8,
    spacing: d1,
  }

  // Baffle blocks: h3 = 0.8 * D1 (lower than chute blocks to avoid cavitation)
  const baffleBlocks: BaffleBlockConfig = {
    rows: 1,
    blocksPerRow: Math.max(3, Math.floor(width / (2 * d1))),
    width: 0.75 * d1,
    height: 0.8 * d1,
    thickness: 0.5 * d1,
    distanceFromInlet: 0.8 * d2,
    rowSpacing: d2,
  }

  // Solid end sill: h4 = 0.2 * D2
  const endSill: EndSillConfig = {
    type: "solid",
    height: 0.2 * d2,
  }

  return {
    type: "type-iii",
    length,
    depth,
    floorThickness: 0.25,
    chuteBlocks,
    baffleBlocks,
    endSill,
    wingwallAngle: 0,
  }
}

/**
 * Calculate USBR Type IV basin dimensions
 * For oscillating jumps: Fr 2.5-4.5
 * Features: Deflector blocks for wave suppression
 */
export function designTypeIVBasin(
  d1: number,
  d2: number,
  _froudeNumber: number,
  width: number
): Partial<StillingBasinConfig> {
  // Basin length: L = 6 * D2 (longer to handle oscillations)
  const length = 6 * d2

  // Deeper basin to contain oscillations
  const depth = 0.15 * d2

  // Deflector blocks at inlet (smaller than chute blocks)
  const chuteBlocks: ChuteBlockConfig = {
    count: Math.max(4, Math.floor(width / (1.5 * d1))),
    width: 0.75 * d1,
    height: 0.75 * d1,
    thickness: 0.5 * d1,
    spacing: 1.5 * d1,
  }

  // Optional end sill (smaller)
  const endSill: EndSillConfig = {
    type: "solid",
    height: 0.1 * d2,
  }

  return {
    type: "type-iv",
    length,
    depth,
    floorThickness: 0.3,
    chuteBlocks,
    baffleBlocks: null,
    endSill,
    wingwallAngle: 0,
  }
}

/**
 * Calculate SAF (St. Anthony Falls) basin dimensions
 * Compact design for small structures: Fr 1.7-17
 * Features: All elements in shorter length
 */
export function designSAFBasin(
  d1: number,
  d2: number,
  froudeNumber: number,
  width: number
): Partial<StillingBasinConfig> {
  // SAF basin is significantly shorter
  // L = 4.5 * D2 / Fr^0.76 (empirical formula)
  const length = (4.5 * d2) / froudeNumber ** 0.76

  // Basin depression
  const depth = 0.07 * d2

  // Chute blocks: 2 * D1 wide, D1 high, spaced 2*D1
  const chuteBlocks: ChuteBlockConfig = {
    count: Math.max(2, Math.floor(width / (4 * d1))),
    width: 2 * d1,
    height: d1,
    thickness: d1,
    spacing: 2 * d1,
  }

  // Baffle blocks (staggered with chute blocks)
  const baffleBlocks: BaffleBlockConfig = {
    rows: 1,
    blocksPerRow: chuteBlocks.count + 1,
    width: 1.5 * d1,
    height: d1,
    thickness: 0.8 * d1,
    distanceFromInlet: length * 0.4,
    rowSpacing: 0,
  }

  // End sill
  const endSill: EndSillConfig = {
    type: "solid",
    height: 0.07 * d2,
  }

  return {
    type: "saf",
    length,
    depth,
    floorThickness: 0.2,
    chuteBlocks,
    baffleBlocks,
    endSill,
    wingwallAngle: 45, // SAF typically has 45° wingwalls
  }
}

/**
 * Calculate Type I basin (simple flat apron)
 * For undular jumps: Fr < 1.7
 */
export function designTypeIBasin(
  _d1: number,
  d2: number,
  _froudeNumber: number,
  _width: number
): Partial<StillingBasinConfig> {
  // Simple flat apron
  const length = 5 * d2

  return {
    type: "type-i",
    length,
    depth: 0,
    floorThickness: 0.25,
    chuteBlocks: null,
    baffleBlocks: null,
    endSill: null,
    wingwallAngle: 0,
  }
}

// ============================================================================
// MAIN DESIGN FUNCTION
// ============================================================================

export interface BasinDesignInput {
  /** Discharge (m³/s) */
  discharge: number
  /** Chute outlet width (m) */
  width: number
  /** Chute drop (m) */
  drop: number
  /** Chute slope (m/m) */
  slope: number
  /** Manning's n for chute */
  manningN: number
  /** Tailwater depth downstream (m) - if known */
  tailwaterDepth?: number
}

export interface BasinDesignResult {
  /** Recommended basin type */
  recommendedType: StillingBasinType
  /** Froude number at chute outlet */
  froudeNumber: number
  /** Outlet velocity (m/s) */
  outletVelocity: number
  /** Inlet depth D1 (m) */
  inletDepth: number
  /** Conjugate depth D2 (m) */
  conjugateDepth: number
  /** Full basin configuration */
  config: StillingBasinConfig
  /** Warnings or notes */
  warnings: string[]
}

/**
 * Design a complete stilling basin for given hydraulic conditions
 */
export function designStillingBasin(input: BasinDesignInput): BasinDesignResult {
  const warnings: string[] = []

  // Estimate outlet depth (D1) for supercritical flow
  const d1 = estimateOutletDepth(input.discharge, input.width, input.slope, input.manningN)

  // Calculate outlet velocity
  const velocity = input.discharge / (input.width * d1)
  const outletVelocity = Math.max(velocity, calculateOutletVelocity(input.drop, d1, d1))

  // Calculate Froude number
  const froudeNumber = calculateFroudeNumber(outletVelocity, d1)

  // Calculate conjugate depth (D2)
  const d2 = calculateConjugateDepth(d1, froudeNumber)

  // Recommend basin type
  const recommendedType = recommendBasinType(froudeNumber, outletVelocity)

  // Design the recommended basin
  let partialConfig: Partial<StillingBasinConfig>

  switch (recommendedType) {
    case "type-i":
      partialConfig = designTypeIBasin(d1, d2, froudeNumber, input.width)
      break
    case "type-ii":
      partialConfig = designTypeIIBasin(d1, d2, froudeNumber, input.width)
      break
    case "type-iii":
      partialConfig = designTypeIIIBasin(d1, d2, froudeNumber, input.width)
      break
    case "type-iv":
      partialConfig = designTypeIVBasin(d1, d2, froudeNumber, input.width)
      warnings.push("Type IV basins may have wave action issues. Consider downstream protection.")
      break
    default:
      partialConfig = designSAFBasin(d1, d2, froudeNumber, input.width)
      break
  }

  // Add warnings based on conditions
  if (outletVelocity > 20) {
    warnings.push(
      "Very high outlet velocity (>20 m/s). Consider aeration slots and erosion protection."
    )
  }

  if (froudeNumber > 12) {
    warnings.push("Very high Froude number. Verify design with physical model testing.")
  }

  if (input.tailwaterDepth && input.tailwaterDepth < d2 * 0.85) {
    warnings.push("Tailwater may be insufficient for stable jump. Consider deepening basin.")
  }

  const config: StillingBasinConfig = {
    type: partialConfig.type ?? recommendedType,
    length: partialConfig.length ?? 5,
    depth: partialConfig.depth ?? 0.5,
    floorThickness: partialConfig.floorThickness ?? 0.25,
    chuteBlocks: partialConfig.chuteBlocks ?? null,
    baffleBlocks: partialConfig.baffleBlocks ?? null,
    endSill: partialConfig.endSill ?? null,
    wingwallAngle: partialConfig.wingwallAngle ?? 0,
  }

  return {
    recommendedType,
    froudeNumber,
    outletVelocity,
    inletDepth: d1,
    conjugateDepth: d2,
    config,
    warnings,
  }
}

/**
 * Create a simple basin config from basic parameters (for legacy compatibility)
 */
export function createSimpleBasinConfig(
  type: StillingBasinType,
  length: number,
  depth: number,
  endSillHeight: number = 0.3
): StillingBasinConfig {
  return {
    type,
    length,
    depth,
    floorThickness: 0.25,
    chuteBlocks: null,
    baffleBlocks: null,
    endSill: endSillHeight > 0 ? { type: "solid", height: endSillHeight } : null,
    wingwallAngle: 0,
  }
}
