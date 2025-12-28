/**
 * GD&T Rendering Utilities - CADHY
 *
 * Canvas rendering functions for Geometric Dimensioning & Tolerancing symbols.
 * Renders Feature Control Frames (FCFs), datum symbols, and related annotations
 * following ASME Y14.5-2018 and ISO 1101:2017 standards.
 *
 * @module lib/utils/UT_gdt
 */

import type {
  CompositeFeatureControlFrame,
  DatumFeatureSymbol,
  DatumReference,
  DatumTarget,
  FeatureControlFrame,
  GDTDisplayConfig,
  GDTSymbol,
  MaterialCondition,
  Point2D,
  ToleranceValue,
} from "@cadhy/types"
import { GDT_SYMBOL_CHARS, MATERIAL_CONDITION_CHARS } from "@cadhy/types"

// =============================================================================
// CONSTANTS
// =============================================================================

/** Standard compartment widths in FCF (relative to frame height) */
const FCF_COMPARTMENT = {
  symbolWidth: 1.2,
  toleranceMinWidth: 1.5,
  datumWidth: 1.0,
  padding: 0.15,
}

/** Datum triangle dimensions (relative to height) */
const DATUM_TRIANGLE = {
  width: 0.6,
  height: 1.0,
}

// =============================================================================
// GD&T SYMBOL RENDERING
// =============================================================================

/**
 * Render a GD&T characteristic symbol on canvas.
 * Uses Unicode characters with proper sizing.
 */
export function renderGDTSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: GDTSymbol,
  x: number,
  y: number,
  height: number,
  color: string
): void {
  const char = GDT_SYMBOL_CHARS[symbol]

  ctx.save()
  ctx.font = `${height}px "Arial Unicode MS", Arial, sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(char, x, y)
  ctx.restore()
}

/**
 * Render a material condition modifier symbol.
 */
export function renderModifierSymbol(
  ctx: CanvasRenderingContext2D,
  modifier: MaterialCondition,
  x: number,
  y: number,
  height: number,
  color: string
): void {
  const char = MATERIAL_CONDITION_CHARS[modifier]

  ctx.save()
  ctx.font = `${height * 0.8}px "Arial Unicode MS", Arial, sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(char, x, y)
  ctx.restore()
}

// =============================================================================
// FEATURE CONTROL FRAME RENDERING
// =============================================================================

/**
 * Calculate the width of a Feature Control Frame.
 */
export function calculateFCFWidth(fcf: FeatureControlFrame, config: GDTDisplayConfig): number {
  const h = config.frameHeight
  let width = FCF_COMPARTMENT.symbolWidth * h // Symbol compartment

  // Tolerance compartment
  const tolWidth = measureToleranceWidth(fcf.tolerance, config)
  width += tolWidth + FCF_COMPARTMENT.padding * 2 * h

  // Datum compartments
  for (const _datum of fcf.datumReferences) {
    width += FCF_COMPARTMENT.datumWidth * h
  }

  return width
}

/**
 * Measure the width needed for a tolerance value.
 */
function measureToleranceWidth(tolerance: ToleranceValue, config: GDTDisplayConfig): number {
  const h = config.frameHeight
  let width = 0

  if (tolerance.isDiameter) {
    width += h * 0.6 // Diameter symbol
  }

  // Approximate text width based on digits
  const valueText = tolerance.value.toFixed(config.precision)
  width += valueText.length * h * 0.5

  if (tolerance.modifier) {
    width += h * 0.8 // Modifier symbol
  }

  return Math.max(width, FCF_COMPARTMENT.toleranceMinWidth * h)
}

/**
 * Render a Feature Control Frame (FCF) on canvas.
 *
 * Structure: [Symbol | Tolerance | Datum A | Datum B | Datum C]
 */
export function renderFeatureControlFrame(
  ctx: CanvasRenderingContext2D,
  fcf: FeatureControlFrame,
  config: GDTDisplayConfig,
  offsetX: number,
  offsetY: number,
  scale: number = 1
): void {
  if (!fcf.visible) return

  const h = config.frameHeight * scale
  const lw = config.lineWidth * scale
  const fontSize = config.fontSize * scale

  // Position (flip Y for canvas)
  const x = offsetX + fcf.position[0] * scale
  const y = offsetY - fcf.position[1] * scale

  ctx.save()
  ctx.strokeStyle = config.color
  ctx.fillStyle = config.color
  ctx.lineWidth = lw

  // Calculate total width
  const totalWidth = calculateFCFWidth(fcf, config) * scale

  // Draw outer frame
  ctx.strokeRect(x, y - h / 2, totalWidth, h)

  // Track current X position for compartments
  let currentX = x

  // 1. Symbol compartment
  const symbolWidth = FCF_COMPARTMENT.symbolWidth * h
  renderGDTSymbol(ctx, fcf.symbol, currentX + symbolWidth / 2, y, fontSize, config.color)
  currentX += symbolWidth

  // Vertical divider
  ctx.beginPath()
  ctx.moveTo(currentX, y - h / 2)
  ctx.lineTo(currentX, y + h / 2)
  ctx.stroke()

  // 2. Tolerance compartment
  const tolWidth = measureToleranceWidth(fcf.tolerance, config) * scale
  const tolPadding = FCF_COMPARTMENT.padding * h

  let tolX = currentX + tolPadding

  // Diameter symbol if needed
  if (fcf.tolerance.isDiameter) {
    ctx.font = `${fontSize}px "Arial Unicode MS", Arial, sans-serif`
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText("\u2300", tolX, y) // ⌀
    tolX += h * 0.6
  }

  // Tolerance value
  ctx.font = `${fontSize}px sans-serif`
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  const tolText = fcf.tolerance.value.toFixed(config.precision)
  ctx.fillText(tolText, tolX, y)
  tolX += tolText.length * h * 0.5

  // Modifier if present
  if (fcf.tolerance.modifier) {
    renderModifierSymbol(ctx, fcf.tolerance.modifier, tolX + h * 0.4, y, fontSize, config.color)
  }

  currentX += tolWidth + tolPadding * 2

  // Vertical divider
  ctx.beginPath()
  ctx.moveTo(currentX, y - h / 2)
  ctx.lineTo(currentX, y + h / 2)
  ctx.stroke()

  // 3. Datum compartments
  for (const datum of fcf.datumReferences) {
    const datumWidth = FCF_COMPARTMENT.datumWidth * h
    renderDatumReference(ctx, datum, currentX + datumWidth / 2, y, fontSize, config.color)
    currentX += datumWidth

    // Vertical divider (except after last)
    if (datum !== fcf.datumReferences[fcf.datumReferences.length - 1]) {
      ctx.beginPath()
      ctx.moveTo(currentX, y - h / 2)
      ctx.lineTo(currentX, y + h / 2)
      ctx.stroke()
    }
  }

  // All around symbol (circle at leader elbow)
  if (fcf.allAround) {
    const circleRadius = h * 0.25
    ctx.beginPath()
    ctx.arc(x - circleRadius * 2, y, circleRadius, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Render a datum reference (letter + optional modifier).
 */
function renderDatumReference(
  ctx: CanvasRenderingContext2D,
  datum: DatumReference,
  x: number,
  y: number,
  fontSize: number,
  color: string
): void {
  ctx.save()
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  if (datum.modifier) {
    // Letter + modifier side by side
    ctx.textAlign = "right"
    ctx.fillText(datum.letter, x, y)
    renderModifierSymbol(ctx, datum.modifier, x + fontSize * 0.5, y, fontSize, color)
  } else {
    ctx.fillText(datum.letter, x, y)
  }

  ctx.restore()
}

/**
 * Render a composite Feature Control Frame.
 * Two FCFs stacked vertically.
 */
export function renderCompositeFeatureControlFrame(
  ctx: CanvasRenderingContext2D,
  composite: CompositeFeatureControlFrame,
  config: GDTDisplayConfig,
  offsetX: number,
  offsetY: number,
  scale: number = 1
): void {
  if (!composite.visible) return

  const h = config.frameHeight * scale
  const spacing = 0 // Stacked with no gap

  // Upper FCF (pattern locating)
  const upperFcf = {
    ...composite.patternLocating,
    position: composite.position,
  }
  renderFeatureControlFrame(ctx, upperFcf, config, offsetX, offsetY, scale)

  // Lower FCF (feature relating) - positioned below
  const lowerPosition: Point2D = [
    composite.position[0],
    composite.position[1] - h / scale - spacing,
  ]
  const lowerFcf = {
    ...composite.featureRelating,
    position: lowerPosition,
  }
  renderFeatureControlFrame(ctx, lowerFcf, config, offsetX, offsetY, scale)
}

// =============================================================================
// DATUM SYMBOL RENDERING
// =============================================================================

/**
 * Render a datum feature symbol (triangle with letter).
 */
export function renderDatumFeatureSymbol(
  ctx: CanvasRenderingContext2D,
  datum: DatumFeatureSymbol,
  config: GDTDisplayConfig,
  offsetX: number,
  offsetY: number,
  scale: number = 1
): void {
  if (!datum.visible) return

  const h = config.frameHeight * scale
  const lw = config.lineWidth * scale
  const fontSize = config.fontSize * scale

  const x = offsetX + datum.position[0] * scale
  const y = offsetY - datum.position[1] * scale

  const triWidth = DATUM_TRIANGLE.width * h
  const triHeight = DATUM_TRIANGLE.height * h

  ctx.save()
  ctx.strokeStyle = config.color
  ctx.fillStyle = config.color
  ctx.lineWidth = lw

  // Draw filled triangle (pointing up)
  ctx.beginPath()
  ctx.moveTo(x, y - triHeight) // Top point
  ctx.lineTo(x - triWidth / 2, y) // Bottom left
  ctx.lineTo(x + triWidth / 2, y) // Bottom right
  ctx.closePath()
  ctx.fill()

  // Draw box around letter
  const boxWidth = h * 1.2
  const boxHeight = h
  const boxY = y - triHeight - boxHeight - lw

  ctx.fillStyle = "#ffffff" // White background for letter box
  ctx.fillRect(x - boxWidth / 2, boxY, boxWidth, boxHeight)
  ctx.strokeRect(x - boxWidth / 2, boxY, boxWidth, boxHeight)

  // Draw datum letter
  ctx.fillStyle = config.color
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(datum.letter, x, boxY + boxHeight / 2)

  ctx.restore()
}

/**
 * Render a datum target symbol.
 */
export function renderDatumTarget(
  ctx: CanvasRenderingContext2D,
  target: DatumTarget,
  config: GDTDisplayConfig,
  offsetX: number,
  offsetY: number,
  scale: number = 1
): void {
  if (!target.visible) return

  const h = config.frameHeight * scale
  const lw = config.lineWidth * scale
  const fontSize = config.fontSize * scale * 0.8

  const x = offsetX + target.position[0] * scale
  const y = offsetY - target.position[1] * scale

  ctx.save()
  ctx.strokeStyle = config.color
  ctx.fillStyle = config.color
  ctx.lineWidth = lw

  const radius = h * 0.5

  // Draw circle (half filled for datum target)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()

  // Fill bottom half
  ctx.beginPath()
  ctx.moveTo(x - radius, y)
  ctx.arc(x, y, radius, Math.PI, 0, true)
  ctx.closePath()
  ctx.fill()

  // Horizontal line through center
  ctx.beginPath()
  ctx.moveTo(x - radius, y)
  ctx.lineTo(x + radius, y)
  ctx.stroke()

  // Draw identifier (e.g., "A1")
  const identifier = `${target.letter}${target.number}`
  ctx.fillStyle = "#ffffff"
  ctx.font = `${fontSize}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(identifier, x, y - radius * 0.5)

  ctx.fillStyle = config.color
  ctx.fillText(identifier, x, y + radius * 0.5)

  // For area targets, show size
  if (target.type === "area" && target.size) {
    const sizeText = `\u2300${target.size.toFixed(1)}`
    ctx.fillText(sizeText, x, y + radius * 1.5)
  }

  ctx.restore()
}

// =============================================================================
// LEADER LINE RENDERING
// =============================================================================

/**
 * Render a leader line from FCF to feature.
 */
export function renderFCFLeader(
  ctx: CanvasRenderingContext2D,
  fcf: FeatureControlFrame,
  featurePoint: Point2D,
  config: GDTDisplayConfig,
  offsetX: number,
  offsetY: number,
  scale: number = 1
): void {
  const lw = config.lineWidth * scale
  const h = config.frameHeight * scale

  // FCF position
  const fcfX = offsetX + fcf.position[0] * scale
  const fcfY = offsetY - fcf.position[1] * scale

  // Feature position
  const featX = offsetX + featurePoint[0] * scale
  const featY = offsetY - featurePoint[1] * scale

  ctx.save()
  ctx.strokeStyle = config.color
  ctx.lineWidth = lw

  // Draw leader line
  ctx.beginPath()
  ctx.moveTo(fcfX, fcfY)
  ctx.lineTo(featX, featY)
  ctx.stroke()

  // Draw arrow at feature end
  const arrowSize = h * 0.4
  const angle = Math.atan2(fcfY - featY, fcfX - featX)

  ctx.beginPath()
  ctx.moveTo(featX, featY)
  ctx.lineTo(
    featX + arrowSize * Math.cos(angle + Math.PI / 6),
    featY + arrowSize * Math.sin(angle + Math.PI / 6)
  )
  ctx.moveTo(featX, featY)
  ctx.lineTo(
    featX + arrowSize * Math.cos(angle - Math.PI / 6),
    featY + arrowSize * Math.sin(angle - Math.PI / 6)
  )
  ctx.stroke()

  ctx.restore()
}

// =============================================================================
// EXPORTED UTILITIES
// =============================================================================

/**
 * Configuration for rendering GD&T elements in a specific theme.
 */
export interface GDTRenderConfig {
  display: GDTDisplayConfig
  theme: "light" | "dark" | "blueprint"
}

/**
 * Get default GDT render config for a theme.
 */
export function getGDTRenderConfig(theme: "light" | "dark" | "blueprint"): GDTRenderConfig {
  const colors = {
    light: "#000000",
    dark: "#ffffff",
    blueprint: "#ffffff",
  }

  return {
    display: {
      fontSize: 3.5,
      frameHeight: 6,
      lineWidth: 0.35,
      color: colors[theme],
      showUnits: false,
      precision: 3,
    },
    theme,
  }
}
