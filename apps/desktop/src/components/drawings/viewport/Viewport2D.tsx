/**
 * Viewport2D Component - CADHY
 *
 * 2D technical drawing viewport for rendering projections and dimensions.
 * Uses HTML5 Canvas for rendering with professional drawing frame,
 * grid references, and title block (membrete).
 */

import type {
  Annotation,
  Dimension,
  Drawing,
  DrawingView,
  Line2D,
  LineType,
  Point2D,
  ProjectionType,
  SheetConfig,
} from "@cadhy/types"
import { DEFAULT_ANNOTATION_STYLE, getPaperDimensions } from "@cadhy/types"
import { Button, cn, Popover, PopoverContent, PopoverTrigger } from "@cadhy/ui"
import {
  Add01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  SquareLock01Icon,
  SquareUnlock01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { shapeIdMap } from "@/hooks/use-cad"
import { useDimensioningStore } from "@/stores/dimensioning-store"
import { useDrawingStore } from "@/stores/drawing-store"
import { useNavigationStore } from "@/stores/navigation-store"
import {
  calculatePerpendicularOffset,
  createAlignedDimension,
  createHorizontalDimension,
  createVerticalDimension,
  formatDimensionValue,
  pointToLineDistance,
  recalculateDimensionWithOffset,
} from "@/utils/dimension-helpers"
import { getModelMetersToDrawingUnitsFactor } from "@/utils/drawing-units"
import {
  DEFAULT_SNAP_CONFIG,
  DEFAULT_SNAP_STYLE,
  drawSnapIndicator,
  extractSnapPoints,
  findNearestSnapPoint,
  type SnapConfig,
  type SnapPoint,
} from "@/utils/snap-system"

// =============================================================================
// TYPES
// =============================================================================

interface Viewport2DProps {
  className?: string
  drawingId: string | null
}

// Translations for canvas-rendered text (title block, labels)
interface TitleBlockLabels {
  title: string
  untitled: string
  units: string
  projAngle: string
  size: string
  scale: string
  lastUpdate: string
  sheet: string
  unitLabels: Record<string, string>
  viewFallback: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Canvas color themes
type CanvasTheme = "blueprint" | "white" | "black"

const CANVAS_THEMES = {
  blueprint: {
    background: "#00293F", // Shapr3D blue
    frameStroke: "#ffffff",
    gridLine: "#1a4a6f",
    gridText: "#7a9ab0",
    titleBlockBg: "#00293F",
    titleBlockBorder: "#ffffff",
    titleBlockText: "#ffffff",
    titleBlockLabel: "#7a9ab0",
    projectionLine: "#ffffff",
    hiddenLine: "#5a7a9a",
    dimensionLine: "#ffffff", // White dimensions by default
  },
  white: {
    background: "#ffffff",
    frameStroke: "#000000",
    gridLine: "#e0e0e0",
    gridText: "#666666",
    titleBlockBg: "#ffffff",
    titleBlockBorder: "#000000",
    titleBlockText: "#000000",
    titleBlockLabel: "#666666",
    projectionLine: "#000000",
    hiddenLine: "#888888",
    dimensionLine: "#000000", // Black dimensions on white background
  },
  black: {
    background: "#1a1a1a",
    frameStroke: "#ffffff",
    gridLine: "#333333",
    gridText: "#888888",
    titleBlockBg: "#1a1a1a",
    titleBlockBorder: "#ffffff",
    titleBlockText: "#ffffff",
    titleBlockLabel: "#888888",
    projectionLine: "#ffffff",
    hiddenLine: "#666666",
    dimensionLine: "#ffffff", // White dimensions on black background
  },
} as const

// Type for colors
type ThemeColors = (typeof CANVAS_THEMES)[CanvasTheme]

// Default colors (blueprint theme) for backwards compatibility
const COLORS = CANVAS_THEMES.blueprint

// Frame configuration
const FRAME_CONFIG = {
  outerMargin: 10, // Margin from canvas edge to outer frame
  innerMargin: 5, // Margin from outer frame to inner frame
  gridCellWidth: 50, // Width of each grid reference cell (will be calculated)
  gridCellHeight: 50, // Height of each grid reference cell (will be calculated)
  titleBlockWidth: 180, // Width of title block
  titleBlockHeight: 80, // Height of title block
} as const

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get color for a line type
 */
function getLineColor(lineType: LineType, colors: ThemeColors = COLORS): string {
  switch (lineType) {
    case "VisibleSharp":
    case "VisibleOutline":
      return colors.projectionLine
    case "VisibleSmooth":
      return colors.projectionLine // Same as visible
    case "HiddenSharp":
    case "HiddenSmooth":
    case "HiddenOutline":
      return colors.hiddenLine
    case "SectionCut":
      return "#ff6b6b"
    case "Centerline":
      return colors.projectionLine
    default:
      return colors.projectionLine
  }
}

/**
 * Get dash array for a line type
 */
function getDashArray(lineType: LineType): number[] | null {
  switch (lineType) {
    case "HiddenSharp":
    case "HiddenSmooth":
    case "HiddenOutline":
      return [4, 2]
    case "Centerline":
      // Dash-dot pattern
      return [6, 2, 1, 2]
    default:
      return null
  }
}

/**
 * Get stroke width (mm on paper) for a line type, using sheetConfig overrides when present.
 */
function getStrokeWidthMm(lineType: LineType, sheetConfig?: SheetConfig): number {
  const lw = sheetConfig?.lineWidths
  switch (lineType) {
    case "VisibleSharp":
    case "VisibleSmooth":
    case "VisibleOutline":
      return lw?.visible ?? 0.5
    case "SectionCut":
      return lw?.section ?? 0.7
    case "HiddenSharp":
    case "HiddenSmooth":
    case "HiddenOutline":
      return lw?.hidden ?? 0.25
    case "Centerline":
      return lw?.centerline ?? 0.18
    default:
      return lw?.visible ?? 0.5
  }
}

/**
 * Draw an arrow on canvas
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Point2D,
  to: Point2D,
  size: number = 5
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(
    to.x - size * Math.cos(angle - Math.PI / 6),
    to.y - size * Math.sin(angle - Math.PI / 6)
  )
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(
    to.x - size * Math.cos(angle + Math.PI / 6),
    to.y - size * Math.sin(angle + Math.PI / 6)
  )
  ctx.stroke()
}

/**
 * Render a dimension on canvas
 */
function renderDimension(
  ctx: CanvasRenderingContext2D,
  dimension: Dimension,
  config: {
    arrowSize: number
    textHeight: number
    precision: number
    showUnit: boolean
    unit: string
  },
  offsetX: number,
  offsetY: number,
  scale: number, // Drawing scale (e.g., 0.1 for 1:10)
  colors: ThemeColors = COLORS,
  sheetConfig?: SheetConfig,
  paperToScreenScale?: number,
  isSelected?: boolean,
  isIsometric?: boolean // Whether the dimension is on an isometric view
): void {
  ctx.save()

  // Use highlight color when selected, otherwise dimension line color
  const dimensionColor = isSelected ? "#22c55e" : colors.dimensionLine
  ctx.strokeStyle = dimensionColor
  ctx.fillStyle = dimensionColor

  // Line width from sheet config
  const dimWidthMm = sheetConfig?.lineWidths?.dimension ?? 0.25
  // Clamp to a minimum pixel width for readability at small scales
  const minPx = 0.35
  const minMm = paperToScreenScale ? minPx / paperToScreenScale : 0
  ctx.lineWidth = Math.max(dimWidthMm, minMm)
  ctx.setLineDash([])

  // Draw extension lines
  dimension.extensionLines.forEach((extLine) => {
    ctx.beginPath()
    ctx.moveTo(offsetX + extLine.start.x, offsetY - extLine.start.y)
    ctx.lineTo(offsetX + extLine.end.x, offsetY - extLine.end.y)
    ctx.stroke()
  })

  // Draw dimension line
  ctx.beginPath()
  ctx.moveTo(offsetX + dimension.dimensionLine.start.x, offsetY - dimension.dimensionLine.start.y)
  ctx.lineTo(offsetX + dimension.dimensionLine.end.x, offsetY - dimension.dimensionLine.end.y)
  ctx.stroke()

  // Draw arrows
  const startPt = {
    x: offsetX + dimension.dimensionLine.start.x,
    y: offsetY - dimension.dimensionLine.start.y,
  }
  const endPt = {
    x: offsetX + dimension.dimensionLine.end.x,
    y: offsetY - dimension.dimensionLine.end.y,
  }
  if (dimension.dimensionLine.startArrow !== "None") {
    drawArrow(ctx, endPt, startPt, config.arrowSize)
  }
  if (dimension.dimensionLine.endArrow !== "None") {
    drawArrow(ctx, startPt, endPt, config.arrowSize)
  }

  // Draw dimension text - use dimension line color (or highlight when selected)
  ctx.fillStyle = dimensionColor
  ctx.font = `${config.textHeight}px sans-serif`
  ctx.textAlign = "center"

  // Convert paper dimension to real-world dimension (in model units = meters)
  // dimension.value is in projection coordinates, which are scaled by (scale * unitFactor)
  // To get the real model value in meters, divide by both scale and unitFactor
  const unitFactor = sheetConfig ? getModelMetersToDrawingUnitsFactor(sheetConfig.units) : 1
  const totalScale = scale * unitFactor
  let realValue = dimension.value / totalScale

  // For isometric views, compensate for the projection foreshortening
  // In isometric projection, lines parallel to axes are scaled by √(2/3) ≈ 0.8165
  // To get the true 3D length, divide by this factor
  if (isIsometric) {
    const isometricFactor = Math.sqrt(2 / 3) // ≈ 0.8165
    realValue = realValue / isometricFactor
  }

  const text = formatDimensionValue(
    realValue,
    {
      precision: config.precision,
      showUnit: config.showUnit,
      unit: config.unit,
    } as Parameters<typeof formatDimensionValue>[1],
    "m" // Source is always meters (model units) after converting from projection coords
  )

  // Calculate text position and rotation to align parallel to the dimension line
  const dimLineStart = dimension.dimensionLine.start
  const dimLineEnd = dimension.dimensionLine.end
  const dx = dimLineEnd.x - dimLineStart.x
  const dy = dimLineEnd.y - dimLineStart.y
  let angle = Math.atan2(dy, dx) // Angle of the dimension line in paper space

  // Keep text readable (not upside down) - flip if necessary
  let flipText = false
  if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
    angle += Math.PI
    flipText = true
  }

  // Calculate perpendicular offset to position text above the line
  // Perpendicular direction (rotated 90° counterclockwise from line direction)
  const lineLength = Math.sqrt(dx * dx + dy * dy)
  const perpX = lineLength > 0 ? -dy / lineLength : 0
  const perpY = lineLength > 0 ? dx / lineLength : 1

  // Offset distance above the line (in paper units)
  const textOffsetDist = config.textHeight * 1.2

  // Text position - center of dimension line plus perpendicular offset
  const centerX = (dimLineStart.x + dimLineEnd.x) / 2
  const centerY = (dimLineStart.y + dimLineEnd.y) / 2

  // Apply perpendicular offset (in the correct direction based on canvas Y inversion)
  const textX = offsetX + centerX + perpX * textOffsetDist
  const textY = offsetY - centerY - perpY * textOffsetDist

  ctx.save()
  ctx.translate(textX, textY)
  ctx.rotate(-angle) // Rotate to align with dimension line (negate for canvas coords)
  ctx.textBaseline = "middle"
  ctx.fillText(text, 0, 0)
  ctx.restore()

  ctx.restore()
}

/**
 * Render an annotation (note/label) on canvas
 */
function renderAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: {
    text: string
    position: { x: number; y: number }
    anchorPoint: { x: number; y: number }
    style: {
      backgroundColor: string
      borderColor: string
      borderWidth: number
      borderRadius: number
      textColor: string
      fontSize: number
      padding: number
      leaderColor: string
      leaderWidth: number
    }
  },
  offsetX: number,
  offsetY: number,
  isSelected: boolean,
  colors: ThemeColors = COLORS
): { boxX: number; boxY: number; boxWidth: number; boxHeight: number } {
  ctx.save()

  const style = annotation.style
  const padding = style.padding
  const fontSize = style.fontSize

  // Calculate text dimensions
  ctx.font = `${fontSize}px sans-serif`
  const textMetrics = ctx.measureText(annotation.text || "Nota")
  const textWidth = textMetrics.width
  const textHeight = fontSize

  // Box dimensions
  const boxWidth = textWidth + padding * 2
  const boxHeight = textHeight + padding * 2

  // Box position (annotation.position is the center-left of the box)
  const boxX = offsetX + annotation.position.x
  const boxY = offsetY - annotation.position.y - boxHeight / 2

  // Anchor point (where the leader connects to geometry)
  const anchorX = offsetX + annotation.anchorPoint.x
  const anchorY = offsetY - annotation.anchorPoint.y

  // Draw leader line (bent style)
  const leaderColor = isSelected ? "#22c55e" : style.leaderColor || colors.dimensionLine
  ctx.strokeStyle = leaderColor
  ctx.lineWidth = style.leaderWidth
  ctx.setLineDash([])

  // Calculate bend point (horizontal from box, then diagonal to anchor)
  const bendX = boxX - 5 // Small gap from box
  const bendY = boxY + boxHeight / 2

  ctx.beginPath()
  ctx.moveTo(anchorX, anchorY)
  ctx.lineTo(bendX, bendY)
  ctx.lineTo(boxX, boxY + boxHeight / 2)
  ctx.stroke()

  // Draw small circle at anchor point
  ctx.beginPath()
  ctx.arc(anchorX, anchorY, 1.5, 0, Math.PI * 2)
  ctx.fillStyle = leaderColor
  ctx.fill()

  // Draw annotation box
  const borderColor = isSelected ? "#22c55e" : style.borderColor || colors.dimensionLine
  const bgColor = style.backgroundColor === "transparent" ? "rgba(0,0,0,0)" : style.backgroundColor

  ctx.fillStyle = bgColor
  ctx.strokeStyle = borderColor
  ctx.lineWidth = style.borderWidth

  // Draw rounded rectangle
  const radius = style.borderRadius
  ctx.beginPath()
  ctx.moveTo(boxX + radius, boxY)
  ctx.lineTo(boxX + boxWidth - radius, boxY)
  ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius)
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius)
  ctx.quadraticCurveTo(
    boxX + boxWidth,
    boxY + boxHeight,
    boxX + boxWidth - radius,
    boxY + boxHeight
  )
  ctx.lineTo(boxX + radius, boxY + boxHeight)
  ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius)
  ctx.lineTo(boxX, boxY + radius)
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY)
  ctx.closePath()

  if (bgColor !== "rgba(0,0,0,0)") {
    ctx.fill()
  }
  ctx.stroke()

  // Draw text
  ctx.fillStyle = isSelected ? "#22c55e" : style.textColor || colors.dimensionLine
  ctx.font = `${fontSize}px sans-serif`
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  ctx.fillText(annotation.text || "Nota", boxX + padding, boxY + boxHeight / 2)

  ctx.restore()

  return { boxX, boxY, boxWidth, boxHeight }
}

/**
 * Render the drawing frame with grid references
 */
function renderDrawingFrame(
  ctx: CanvasRenderingContext2D,
  sheetConfig: SheetConfig,
  canvasWidth: number,
  canvasHeight: number,
  _scale: number,
  colors: ThemeColors = COLORS
): {
  drawingAreaX: number
  drawingAreaY: number
  drawingAreaWidth: number
  drawingAreaHeight: number
} {
  // Get paper dimensions in mm
  const paperDims = getPaperDimensions(sheetConfig.size, sheetConfig.orientation)

  // Calculate scale to fit paper in canvas with margins
  const availableWidth = canvasWidth - FRAME_CONFIG.outerMargin * 2
  const availableHeight = canvasHeight - FRAME_CONFIG.outerMargin * 2
  const paperScale =
    Math.min(availableWidth / paperDims.width, availableHeight / paperDims.height) * 0.95

  // Calculate paper position (centered)
  const paperWidth = paperDims.width * paperScale
  const paperHeight = paperDims.height * paperScale
  const paperX = (canvasWidth - paperWidth) / 2
  const paperY = (canvasHeight - paperHeight) / 2

  // Grid reference configuration
  const numCols = 8
  const numRows = 6
  // Margin for grid labels - 5% of paper width for professional look
  const gridMargin = paperWidth * 0.04
  const gridCellWidth = (paperWidth - gridMargin * 2) / numCols
  const gridCellHeight = (paperHeight - gridMargin * 2) / numRows

  ctx.save()

  // Fill paper background with theme color
  ctx.fillStyle = colors.background
  ctx.fillRect(paperX, paperY, paperWidth, paperHeight)

  // Draw outer frame (thin line)
  ctx.strokeStyle = colors.frameStroke
  ctx.lineWidth = 0.5
  ctx.strokeRect(paperX, paperY, paperWidth, paperHeight)

  // Draw inner frame (thicker line)
  const innerX = paperX + gridMargin
  const innerY = paperY + gridMargin
  const innerWidth = paperWidth - gridMargin * 2
  const innerHeight = paperHeight - gridMargin * 2
  ctx.lineWidth = 1.5
  ctx.strokeRect(innerX, innerY, innerWidth, innerHeight)

  // Draw grid reference lines (vertical - columns)
  ctx.lineWidth = 0.3
  ctx.strokeStyle = colors.frameStroke
  ctx.setLineDash([])

  for (let i = 0; i <= numCols; i++) {
    const x = innerX + i * gridCellWidth
    // Top tick
    ctx.beginPath()
    ctx.moveTo(x, paperY)
    ctx.lineTo(x, innerY)
    ctx.stroke()
    // Bottom tick
    ctx.beginPath()
    ctx.moveTo(x, innerY + innerHeight)
    ctx.lineTo(x, paperY + paperHeight)
    ctx.stroke()
  }

  // Draw grid reference lines (horizontal - rows)
  for (let i = 0; i <= numRows; i++) {
    const y = innerY + i * gridCellHeight
    // Left tick
    ctx.beginPath()
    ctx.moveTo(paperX, y)
    ctx.lineTo(innerX, y)
    ctx.stroke()
    // Right tick
    ctx.beginPath()
    ctx.moveTo(innerX + innerWidth, y)
    ctx.lineTo(paperX + paperWidth, y)
    ctx.stroke()
  }

  // Draw column numbers (1-8)
  ctx.fillStyle = colors.gridText
  ctx.font = `${Math.max(10, (12 * paperScale) / 100)}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  for (let i = 0; i < numCols; i++) {
    const x = innerX + (i + 0.5) * gridCellWidth
    // Top numbers
    ctx.fillText(`${i + 1}`, x, paperY + gridMargin / 2)
    // Bottom numbers
    ctx.fillText(`${i + 1}`, x, paperY + paperHeight - gridMargin / 2)
  }

  // Draw row letters (A-F)
  const rowLabels = ["A", "B", "C", "D", "E", "F"]
  for (let i = 0; i < numRows; i++) {
    const y = innerY + (i + 0.5) * gridCellHeight
    // Left letters
    ctx.fillText(rowLabels[i], paperX + gridMargin / 2, y)
    // Right letters
    ctx.fillText(rowLabels[i], paperX + paperWidth - gridMargin / 2, y)
  }

  ctx.restore()

  return {
    drawingAreaX: innerX,
    drawingAreaY: innerY,
    drawingAreaWidth: innerWidth,
    drawingAreaHeight: innerHeight,
  }
}

/**
 * Render the title block (membrete) - Shapr3D Style
 *
 * Layout (3 rows):
 * ┌─────────────────────────────────────────────────────┐
 * │ TÍTULO                                              │
 * │ My Drawing Name                                     │
 * ├──────────────┬───────────────────┬─────────────────┤
 * │ UNIDADES     │    ÁNG. PROY.     │ TAMAÑO          │
 * │ m            │    [Symbol]       │ A3              │
 * ├──────────────┼───────────────────┼─────────────────┤
 * │ ESCALA       │ ÚLTIMA ACTUAL.    │ HOJA            │
 * │ 1:3          │ 12/24/25          │ 1/1             │
 * └──────────────┴───────────────────┴─────────────────┘
 */
function renderTitleBlock(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing,
  drawingAreaX: number,
  drawingAreaY: number,
  drawingAreaWidth: number,
  drawingAreaHeight: number,
  colors: ThemeColors = COLORS,
  labels: TitleBlockLabels
): void {
  const { sheetConfig } = drawing

  // Calculate block dimensions - Shapr3D style proportions
  const blockWidth = Math.min(200, drawingAreaWidth * 0.3)
  const rowHeight = Math.min(32, drawingAreaHeight * 0.05) // Taller rows to avoid overlap
  const titleRowHeight = rowHeight * 1.3
  const blockHeight = titleRowHeight + rowHeight * 2

  // Position in bottom-right corner - flush with the inner frame
  const blockX = drawingAreaX + drawingAreaWidth - blockWidth
  const blockY = drawingAreaY + drawingAreaHeight - blockHeight

  // Column widths (3 columns for rows 2 and 3)
  const col1Width = blockWidth * 0.27
  const col2Width = blockWidth * 0.42 // Middle column wider for projection symbol

  // Padding inside cells
  const cellPadding = 3

  ctx.save()

  // Draw outer border
  ctx.strokeStyle = colors.titleBlockBorder
  ctx.lineWidth = 1.5
  ctx.strokeRect(blockX, blockY, blockWidth, blockHeight)

  // Draw horizontal dividers
  ctx.lineWidth = 1
  // After title row
  ctx.beginPath()
  ctx.moveTo(blockX, blockY + titleRowHeight)
  ctx.lineTo(blockX + blockWidth, blockY + titleRowHeight)
  ctx.stroke()
  // After row 2
  ctx.beginPath()
  ctx.moveTo(blockX, blockY + titleRowHeight + rowHeight)
  ctx.lineTo(blockX + blockWidth, blockY + titleRowHeight + rowHeight)
  ctx.stroke()

  // Draw vertical dividers for rows 2 and 3
  // First divider
  ctx.beginPath()
  ctx.moveTo(blockX + col1Width, blockY + titleRowHeight)
  ctx.lineTo(blockX + col1Width, blockY + blockHeight)
  ctx.stroke()
  // Second divider
  ctx.beginPath()
  ctx.moveTo(blockX + col1Width + col2Width, blockY + titleRowHeight)
  ctx.lineTo(blockX + col1Width + col2Width, blockY + blockHeight)
  ctx.stroke()

  // Text sizes - proportional to block
  const labelSize = Math.max(7, blockWidth * 0.038)
  const valueSize = Math.max(10, blockWidth * 0.055)
  const titleValueSize = Math.max(12, blockWidth * 0.07)

  // ─── ROW 1: TÍTULO ───
  ctx.fillStyle = colors.titleBlockLabel
  ctx.font = `${labelSize}px monospace`
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.fillText(labels.title, blockX + cellPadding, blockY + cellPadding)

  ctx.fillStyle = colors.titleBlockText
  ctx.font = `${titleValueSize}px monospace`
  ctx.textBaseline = "middle"
  const title = sheetConfig.titleBlockInfo?.title || drawing.name || labels.untitled
  // Truncate if too long
  const maxTitleWidth = blockWidth - cellPadding * 2
  let displayTitle = title
  while (ctx.measureText(displayTitle).width > maxTitleWidth && displayTitle.length > 3) {
    displayTitle = displayTitle.slice(0, -1)
  }
  if (displayTitle !== title) displayTitle += "…"
  ctx.fillText(displayTitle, blockX + cellPadding, blockY + titleRowHeight * 0.62)

  // ─── ROW 2: UNIDADES | ÁNG. PROY. | TAMAÑO ───
  const row2Y = blockY + titleRowHeight

  // UNIDADES
  ctx.fillStyle = colors.titleBlockLabel
  ctx.font = `${labelSize}px monospace`
  ctx.textBaseline = "top"
  ctx.textAlign = "left"
  ctx.fillText(labels.units, blockX + cellPadding, row2Y + cellPadding)

  ctx.fillStyle = colors.titleBlockText
  ctx.font = `${valueSize}px monospace`
  ctx.textBaseline = "bottom"
  ctx.fillText(
    labels.unitLabels[sheetConfig.units] || sheetConfig.units,
    blockX + cellPadding,
    row2Y + rowHeight - cellPadding
  )

  // ÁNG. PROY. (centered)
  ctx.fillStyle = colors.titleBlockLabel
  ctx.font = `${labelSize}px monospace`
  ctx.textBaseline = "top"
  ctx.textAlign = "center"
  ctx.fillText(labels.projAngle, blockX + col1Width + col2Width / 2, row2Y + cellPadding)

  // Projection angle symbol (centered) - Shapr3D style
  const symbolX = blockX + col1Width + col2Width / 2
  const symbolY = row2Y + rowHeight * 0.62
  const symbolSize = Math.min(rowHeight * 0.32, valueSize * 0.9)
  drawProjectionAngleSymbol(ctx, symbolX, symbolY, sheetConfig.projectionAngle, symbolSize, colors)

  // TAMAÑO
  ctx.fillStyle = colors.titleBlockLabel
  ctx.font = `${labelSize}px monospace`
  ctx.textBaseline = "top"
  ctx.textAlign = "left"
  ctx.fillText(labels.size, blockX + col1Width + col2Width + cellPadding, row2Y + cellPadding)

  ctx.fillStyle = colors.titleBlockText
  ctx.font = `${valueSize}px monospace`
  ctx.textBaseline = "bottom"
  const sizeStr = typeof sheetConfig.size === "string" ? sheetConfig.size : "Custom"
  ctx.fillText(
    sizeStr,
    blockX + col1Width + col2Width + cellPadding,
    row2Y + rowHeight - cellPadding
  )

  // ─── ROW 3: ESCALA | ÚLTIMA ACTUALIZACIÓN | HOJA ───
  const row3Y = blockY + titleRowHeight + rowHeight

  // ESCALA
  ctx.fillStyle = colors.titleBlockLabel
  ctx.font = `${labelSize}px monospace`
  ctx.textBaseline = "top"
  ctx.textAlign = "left"
  ctx.fillText(labels.scale, blockX + cellPadding, row3Y + cellPadding)

  ctx.fillStyle = colors.titleBlockText
  ctx.font = `${valueSize}px monospace`
  ctx.textBaseline = "bottom"
  // Format scale properly (e.g., 0.25 -> 1:4)
  const scaleValue = sheetConfig.scale
  let scaleStr = `1:${Math.round(1 / scaleValue)}`
  if (scaleValue >= 1) {
    scaleStr = `${Math.round(scaleValue)}:1`
  }
  ctx.fillText(scaleStr, blockX + cellPadding, row3Y + rowHeight - cellPadding)

  // ÚLTIMA ACTUALIZACIÓN (centered)
  ctx.fillStyle = colors.titleBlockLabel
  ctx.font = `${labelSize}px monospace`
  ctx.textBaseline = "top"
  ctx.textAlign = "center"
  ctx.fillText(labels.lastUpdate, blockX + col1Width + col2Width / 2, row3Y + cellPadding)

  ctx.fillStyle = colors.titleBlockText
  ctx.font = `${valueSize}px monospace`
  ctx.textBaseline = "bottom"
  const updateDate = new Date(drawing.updatedAt).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
  ctx.fillText(updateDate, blockX + col1Width + col2Width / 2, row3Y + rowHeight - cellPadding)

  // HOJA
  ctx.fillStyle = colors.titleBlockLabel
  ctx.font = `${labelSize}px monospace`
  ctx.textBaseline = "top"
  ctx.textAlign = "left"
  ctx.fillText(labels.sheet, blockX + col1Width + col2Width + cellPadding, row3Y + cellPadding)

  ctx.fillStyle = colors.titleBlockText
  ctx.font = `${valueSize}px monospace`
  ctx.textBaseline = "bottom"
  const sheetNumber = sheetConfig.titleBlockInfo?.sheetNumber || "1/1"
  ctx.fillText(
    sheetNumber,
    blockX + col1Width + col2Width + cellPadding,
    row3Y + rowHeight - cellPadding
  )

  ctx.restore()
}

/**
 * Draw the projection angle symbol (first or third angle) - Shapr3D Style
 * Uses a truncated cone and a target/crosshair symbol
 */
function drawProjectionAngleSymbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: "first" | "third",
  size: number,
  colors: ThemeColors = COLORS
): void {
  ctx.save()
  ctx.strokeStyle = colors.titleBlockText
  ctx.lineWidth = 1.5

  const s = size

  // Helper to draw target/crosshair (circle with cross through it)
  const drawTarget = (cx: number, cy: number, r: number) => {
    // Outer circle
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    // Inner circle (smaller)
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2)
    ctx.stroke()
    // Horizontal crosshair
    ctx.beginPath()
    ctx.moveTo(cx - r * 1.4, cy)
    ctx.lineTo(cx + r * 1.4, cy)
    ctx.stroke()
    // Vertical crosshair
    ctx.beginPath()
    ctx.moveTo(cx, cy - r * 1.4)
    ctx.lineTo(cx, cy + r * 1.4)
    ctx.stroke()
  }

  // Helper to draw truncated cone (side view)
  const drawCone = (cx: number, cy: number, coneSize: number) => {
    const h = coneSize * 1.2 // Height of cone
    const wSmall = coneSize * 0.4 // Width at small end
    const wLarge = coneSize * 0.7 // Width at large end
    ctx.beginPath()
    // Draw as trapezoid pointing left (small end on left)
    ctx.moveTo(cx - h / 2, cy - wSmall / 2) // Top-left (small)
    ctx.lineTo(cx + h / 2, cy - wLarge / 2) // Top-right (large)
    ctx.lineTo(cx + h / 2, cy + wLarge / 2) // Bottom-right (large)
    ctx.lineTo(cx - h / 2, cy + wSmall / 2) // Bottom-left (small)
    ctx.closePath()
    ctx.stroke()
  }

  const spacing = s * 1.2 // Space between symbols

  if (angle === "first") {
    // First angle projection: cone on LEFT, target on RIGHT
    drawCone(x - spacing / 2, y, s)
    drawTarget(x + spacing / 2, y, s * 0.5)
  } else {
    // Third angle projection: target on LEFT, cone on RIGHT
    drawTarget(x - spacing / 2, y, s * 0.5)
    drawCone(x + spacing / 2, y, s)
  }

  ctx.restore()
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Viewport2D({ className, drawingId }: Viewport2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const annotationInputRef = useRef<HTMLInputElement>(null)
  // Pan and zoom for navigating (zoom is separate from drawing scale)
  const [pan, setPan] = useState<[number, number]>([0, 0])
  const [viewportZoom, setViewportZoom] = useState(1) // Zoom for navigation only
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<[number, number] | null>(null)
  const [panStartOffset, setPanStartOffset] = useState<[number, number]>([0, 0])
  // Lock views to prevent accidental movement (only locks position, not scale)
  const [viewsLocked, setViewsLocked] = useState(false)
  // Canvas theme
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>("blueprint")
  const colors = CANVAS_THEMES[canvasTheme]

  // i18n
  const { t } = useTranslation()

  const drawing = useDrawingStore((s) =>
    drawingId ? s.drawings.find((d) => d.id === drawingId) : null
  )
  const {
    activeTool,
    setActiveTool,
    selectedDimensionIndex,
    setSelectedDimensionIndex,
    clearSelection,
  } = useDimensioningStore()
  const setView = useNavigationStore((s) => s.setView)
  const {
    addDimension,
    updateViewPosition,
    removeDimension,
    updateDimension,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
  } = useDrawingStore()

  // Dimensioning state
  const [selectedPoints, setSelectedPoints] = useState<Array<{ point: Point2D; viewId: string }>>(
    []
  )
  const [, setHoveredLine] = useState<{
    line: Line2D
    viewId: string
    viewX: number
    viewY: number
  } | null>(null)

  // Hovered view for showing "+" button
  const [hoveredViewId, setHoveredViewId] = useState<string | null>(null)
  const [hoveredViewScreenPos, setHoveredViewScreenPos] = useState<{ x: number; y: number } | null>(
    null
  )

  // Hit test tolerance in drawing units (mm) - increased for easier selection
  const hitTestTolerance = 10

  // Drag state for moving views
  const [draggedView, setDraggedView] = useState<{
    viewId: string
    offset: [number, number]
  } | null>(null)

  // Drag state for moving dimensions (adjusting offset)
  const [draggedDimension, setDraggedDimension] = useState<{
    dimensionIndex: number
    viewId: string | undefined
  } | null>(null)

  // Annotation state
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)
  const [editingAnnotationText, setEditingAnnotationText] = useState<string>("")
  const [editingAnnotationPos, setEditingAnnotationPos] = useState<{ x: number; y: number } | null>(
    null
  )

  // Annotation dragging state
  const [draggedAnnotation, setDraggedAnnotation] = useState<{
    annotationId: string
    offset: { x: number; y: number }
    isAnchor: boolean // true = dragging anchor point, false = dragging box
  } | null>(null)

  // Snap system state
  const [activeSnap, setActiveSnap] = useState<{
    snap: SnapPoint
    viewId: string
    viewPosition: [number, number]
  } | null>(null)
  const snapConfig: SnapConfig = DEFAULT_SNAP_CONFIG

  // Render function - paper stays fixed, views are positioned within inner drawing area
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const canvasWidth = canvas.width / window.devicePixelRatio
    const canvasHeight = canvas.height / window.devicePixelRatio

    // Clear canvas with neutral background
    const computedStyle = getComputedStyle(canvas)
    const canvasBgColor = computedStyle.getPropertyValue("--canvas-bg").trim() || "#1e1e1e"
    ctx.fillStyle = canvasBgColor
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    if (!drawing) {
      ctx.fillStyle = "#888888"
      ctx.font = "16px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(t("drawings.selectOrCreate"), canvasWidth / 2, canvasHeight / 2)
      return
    }

    // Apply global viewport transformation (zoom and pan)
    ctx.save()
    ctx.translate(canvasWidth / 2 + pan[0], canvasHeight / 2 + pan[1])
    ctx.scale(viewportZoom, viewportZoom)
    ctx.translate(-canvasWidth / 2, -canvasHeight / 2)

    // Render drawing frame with grid references (paper stays fixed and centered)
    const { drawingAreaX, drawingAreaY, drawingAreaWidth, drawingAreaHeight } = renderDrawingFrame(
      ctx,
      drawing.sheetConfig,
      canvasWidth,
      canvasHeight,
      1,
      colors
    )

    // Render title block with translations
    const titleBlockLabels: TitleBlockLabels = {
      title: t("drawings.titleBlock.title", "TITLE"),
      untitled: t("drawings.titleBlock.untitled", "Untitled"),
      units: t("drawings.titleBlock.units", "UNITS"),
      projAngle: t("drawings.titleBlock.projectionAngle", "PROJ. ANGLE"),
      size: t("drawings.titleBlock.size", "SIZE"),
      scale: t("drawings.titleBlock.scale", "SCALE"),
      lastUpdate: t("drawings.titleBlock.lastUpdate", "LAST UPDATE"),
      sheet: t("drawings.titleBlock.sheet", "SHEET"),
      unitLabels: {
        mm: t("drawings.unitLabels.mm", "mm"),
        cm: t("drawings.unitLabels.cm", "cm"),
        m: t("drawings.unitLabels.m", "m"),
        in: t("drawings.unitLabels.in", "in"),
        ft: t("drawings.unitLabels.ft", "ft"),
      },
      viewFallback: t("drawings.views.fallback", "View"),
    }
    renderTitleBlock(
      ctx,
      drawing,
      drawingAreaX,
      drawingAreaY,
      drawingAreaWidth,
      drawingAreaHeight,
      colors,
      titleBlockLabels
    )

    // Get paper dimensions for coordinate conversion
    const paperDims = getPaperDimensions(drawing.sheetConfig.size, drawing.sheetConfig.orientation)
    // Inner drawing area in mm (92% of paper, accounting for grid margins)
    const innerWidthMm = paperDims.width * 0.92
    const innerHeightMm = paperDims.height * 0.92

    // Scale factor: convert mm to screen pixels within the inner drawing area
    const paperToScreenScale = drawingAreaWidth / innerWidthMm

    // Set up coordinate system for views - clip to inner drawing area
    ctx.save()
    ctx.beginPath()
    ctx.rect(drawingAreaX, drawingAreaY, drawingAreaWidth, drawingAreaHeight)
    ctx.clip()

    // Calculate the center of the drawing area
    const drawingCenterX = drawingAreaX + drawingAreaWidth / 2
    const drawingCenterY = drawingAreaY + drawingAreaHeight / 2

    // Render each visible view
    const viewsToRender = drawing.views.filter((v) => v.visible)

    viewsToRender.forEach((view) => {
      const bbox = view.projection.bounding_box
      if (!bbox) return

      const viewWidth = bbox.max.x - bbox.min.x
      const viewHeight = bbox.max.y - bbox.min.y
      const viewCenterX = (bbox.min.x + bbox.max.x) / 2
      const viewCenterY = (bbox.min.y + bbox.max.y) / 2

      // View position is in mm relative to paper center
      const posX = view.position[0]
      const posY = view.position[1]

      // Convert view center position from mm to screen coordinates
      const screenX = drawingCenterX + posX * paperToScreenScale
      const screenY = drawingCenterY - posY * paperToScreenScale

      ctx.save()
      ctx.translate(screenX, screenY)
      ctx.scale(paperToScreenScale, paperToScreenScale)

      // Draw view bounding box (only if showBoundingBoxes is true)
      const showBoundingBoxes = drawing.displayOptions?.showBoundingBoxes ?? true
      if (showBoundingBoxes) {
        const isHovered = hoveredViewId === view.id
        const isDragging = draggedView?.viewId === view.id
        ctx.strokeStyle = isDragging
          ? "rgba(74, 222, 128, 0.8)"
          : isHovered
            ? "rgba(255, 255, 255, 0.6)"
            : "rgba(255, 255, 255, 0.3)"
        ctx.lineWidth = Math.max(0.5, (isDragging ? 1.5 : 0.8) / paperToScreenScale)
        ctx.setLineDash([])

        // Bounding box centered on view
        const halfW = viewWidth / 2
        const halfH = viewHeight / 2
        ctx.strokeRect(-halfW - 3, -halfH - 3, viewWidth + 6, viewHeight + 6)
      }

      // Render projection lines (centered on origin)
      const lines = view.projection.lines || []
      lines.forEach((line: Line2D) => {
        ctx.strokeStyle = getLineColor(line.line_type, colors)
        const widthMm = getStrokeWidthMm(line.line_type, drawing.sheetConfig)
        // Clamp to a minimum pixel width for readability at small scales
        const minPx = 0.35
        const minMm = minPx / paperToScreenScale
        ctx.lineWidth = Math.max(widthMm, minMm)

        const dashArray = getDashArray(line.line_type)
        if (dashArray) {
          // Dash pattern in mm on paper (will scale with paperToScreenScale automatically)
          ctx.setLineDash(dashArray)
        } else {
          ctx.setLineDash([])
        }

        ctx.beginPath()
        // Offset lines to center them (subtract viewCenter)
        ctx.moveTo(line.start.x - viewCenterX, -(line.start.y - viewCenterY))
        ctx.lineTo(line.end.x - viewCenterX, -(line.end.y - viewCenterY))
        ctx.stroke()
      })

      // Draw view label (below the view) - only if showViewLabels is true
      const showViewLabels = drawing.displayOptions?.showViewLabels ?? true
      if (showViewLabels) {
        const halfH = viewHeight / 2
        ctx.fillStyle = colors.projectionLine
        const fontSize = Math.max(6, 8 / paperToScreenScale)
        ctx.font = `${fontSize}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        ctx.fillText(view.label || view.projection.label || "Vista", 0, halfH + 5)
      }

      ctx.restore()
    })

    // Render dimensions
    if (drawing.dimensions?.dimensions) {
      ctx.save()
      ctx.translate(drawingCenterX, drawingCenterY)
      ctx.scale(paperToScreenScale, paperToScreenScale)

      drawing.dimensions.dimensions.forEach((dim: Dimension, dimIndex: number) => {
        // Config values are in mm on paper, canvas is already scaled
        const dimConfig = drawing.dimensions.config
        const isSelected = selectedDimensionIndex === dimIndex

        // Get the view offset and check if it's an isometric view
        let viewOffsetX = 0
        let viewOffsetY = 0
        let isIsometric = false
        if (dim.viewId) {
          const view = drawing.views.find((v) => v.id === dim.viewId)
          if (view) {
            viewOffsetX = view.position[0]
            viewOffsetY = view.position[1]
            // Check if this is an isometric projection
            isIsometric = view.projectionType === "Isometric"
          }
        }

        renderDimension(
          ctx,
          dim,
          {
            arrowSize: dimConfig.arrowSize || 3, // mm
            textHeight: dimConfig.textHeight || 3.5, // mm
            precision: dimConfig.precision || 2,
            showUnit: dimConfig.showUnit ?? false,
            unit: dimConfig.unit || "mm",
          },
          viewOffsetX,
          -viewOffsetY, // Negate Y offset for canvas coordinate system (Y grows downward)
          drawing.sheetConfig.scale, // Scale factor (e.g., 0.1 for 1:10)
          colors,
          drawing.sheetConfig,
          paperToScreenScale,
          isSelected,
          isIsometric // Pass whether this is an isometric view
        )
      })

      ctx.restore()
    }

    // Render annotations
    if (drawing.annotations?.annotations) {
      ctx.save()
      ctx.translate(drawingCenterX, drawingCenterY)
      ctx.scale(paperToScreenScale, paperToScreenScale)

      drawing.annotations.annotations.forEach((annotation) => {
        // Get the view offset if annotation is attached to a view
        let viewOffsetX = 0
        let viewOffsetY = 0
        if (annotation.viewId) {
          const view = drawing.views.find((v) => v.id === annotation.viewId)
          if (view) {
            viewOffsetX = view.position[0]
            viewOffsetY = view.position[1]
          }
        }

        const defaultStyle = drawing.annotations?.defaultStyle
        // Use the same text height as dimensions for consistent sizing
        const dimConfig = drawing.dimensions.config
        const baseFontSize = defaultStyle?.fontSize ?? 3.5
        const annotationFontSize = dimConfig.textHeight || baseFontSize
        // Scale other elements proportionally to text size
        const sizeRatio = annotationFontSize / baseFontSize
        // Use dimension line width from sheet config
        const dimLineWidth = drawing.sheetConfig.lineWidths?.dimension ?? 0.25

        renderAnnotation(
          ctx,
          {
            text: annotation.text,
            position: annotation.position,
            anchorPoint: annotation.anchorPoint,
            style: {
              backgroundColor:
                annotation.style?.backgroundColor ?? defaultStyle?.backgroundColor ?? "transparent",
              borderColor: annotation.style?.borderColor ?? defaultStyle?.borderColor ?? "#ffffff",
              borderWidth: dimLineWidth,
              borderRadius:
                (annotation.style?.borderRadius ?? defaultStyle?.borderRadius ?? 2) * sizeRatio,
              textColor: annotation.style?.textColor ?? defaultStyle?.textColor ?? "#ffffff",
              fontSize: annotationFontSize,
              padding: (annotation.style?.padding ?? defaultStyle?.padding ?? 2) * sizeRatio,
              leaderColor: annotation.style?.leaderColor ?? defaultStyle?.leaderColor ?? "#ffffff",
              leaderWidth: dimLineWidth,
            },
          },
          viewOffsetX,
          -viewOffsetY,
          selectedAnnotationId === annotation.id,
          colors
        )
      })

      ctx.restore()
    }

    // Render selected points for dimensioning (visual feedback)
    if (selectedPoints.length > 0) {
      ctx.save()
      ctx.translate(drawingCenterX, drawingCenterY)
      ctx.scale(paperToScreenScale, paperToScreenScale)

      selectedPoints.forEach((sp, index) => {
        // sp.point is already in paper coordinates (mm relative to paper center)
        const paperX = sp.point.x
        const paperY = sp.point.y

        // Draw circle
        ctx.beginPath()
        ctx.arc(paperX, -paperY, 3 / paperToScreenScale, 0, Math.PI * 2)
        ctx.fillStyle = index === 0 ? "#4ade80" : "#22c55e"
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 1.5 / paperToScreenScale
        ctx.stroke()
      })

      ctx.restore()
    }

    // Render active snap indicator (when dimensioning tool is active)
    if (activeSnap && activeTool) {
      ctx.save()
      ctx.translate(drawingCenterX, drawingCenterY)
      ctx.scale(paperToScreenScale, paperToScreenScale)

      // Convert snap point from view-local to paper coordinates
      const snapPaperX = activeSnap.viewPosition[0] + activeSnap.snap.point.x
      const snapPaperY = activeSnap.viewPosition[1] + activeSnap.snap.point.y

      // Create a temporary snap point with paper coordinates for drawing
      const snapForDrawing: SnapPoint = {
        ...activeSnap.snap,
        point: { x: snapPaperX, y: snapPaperY },
      }

      drawSnapIndicator(ctx, snapForDrawing, 8 / paperToScreenScale, DEFAULT_SNAP_STYLE)

      ctx.restore()
    }

    ctx.restore() // clip region
    ctx.restore() // global viewport transformation (zoom/pan)
  }, [
    drawing,
    draggedView,
    hoveredViewId,
    colors,
    selectedPoints,
    selectedDimensionIndex,
    selectedAnnotationId,
    activeSnap,
    activeTool,
    viewportZoom,
    pan,
    t,
  ])

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      }

      render()
    }

    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [render])

  // Re-render when drawing changes
  useEffect(() => {
    render()
  }, [render])

  // Focus annotation input when editing starts
  useEffect(() => {
    if (editingAnnotationId && annotationInputRef.current) {
      annotationInputRef.current.focus()
    }
  }, [editingAnnotationId])

  // Helper: Calculate drawing area info (same logic as render)
  const getDrawingAreaInfo = useCallback((): {
    centerX: number
    centerY: number
    paperToScreenScale: number
    innerWidthMm: number
    innerHeightMm: number
  } | null => {
    if (!drawing || !canvasRef.current) return null

    const canvas = canvasRef.current
    const canvasWidth = canvas.width / window.devicePixelRatio
    const canvasHeight = canvas.height / window.devicePixelRatio

    // Get paper dimensions in mm
    const paperDims = getPaperDimensions(drawing.sheetConfig.size, drawing.sheetConfig.orientation)

    // Calculate scale to fit paper in canvas with margins
    const availableWidth = canvasWidth - FRAME_CONFIG.outerMargin * 2
    const availableHeight = canvasHeight - FRAME_CONFIG.outerMargin * 2
    const paperScale =
      Math.min(availableWidth / paperDims.width, availableHeight / paperDims.height) * 0.95

    // Calculate paper position (centered)
    const paperWidth = paperDims.width * paperScale
    const paperHeight = paperDims.height * paperScale
    const paperX = (canvasWidth - paperWidth) / 2
    const paperY = (canvasHeight - paperHeight) / 2

    // Grid reference configuration (must match renderDrawingFrame)
    const gridMargin = paperWidth * 0.04
    const innerX = paperX + gridMargin
    const innerWidth = paperWidth - gridMargin * 2
    const innerY = paperY + gridMargin
    const innerHeight = paperHeight - gridMargin * 2

    const drawingCenterX = innerX + innerWidth / 2
    const drawingCenterY = innerY + innerHeight / 2

    // Inner area in mm (92% of paper)
    const innerWidthMm = paperDims.width * 0.92
    const innerHeightMm = paperDims.height * 0.92

    // Scale: screen pixels per mm
    const paperToScreenScale = innerWidth / innerWidthMm

    return {
      centerX: drawingCenterX,
      centerY: drawingCenterY,
      paperToScreenScale,
      innerWidthMm,
      innerHeightMm,
    }
  }, [drawing])

  // Convert screen coordinates to paper coordinates (in mm, relative to paper center)
  const screenToPaper = useCallback(
    (screenX: number, screenY: number): Point2D => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const areaInfo = getDrawingAreaInfo()
      if (!areaInfo) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const canvasX = screenX - rect.left
      const canvasY = screenY - rect.top

      // Convert screen coords to mm (relative to drawing center)
      const paperX = (canvasX - areaInfo.centerX) / areaInfo.paperToScreenScale
      const paperY = -(canvasY - areaInfo.centerY) / areaInfo.paperToScreenScale

      return { x: paperX, y: paperY }
    },
    [getDrawingAreaInfo]
  )

  // Convert paper coordinates (mm) to screen coordinates
  const paperToScreen = useCallback(
    (paperX: number, paperY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const areaInfo = getDrawingAreaInfo()
      if (!areaInfo) return null

      const rect = canvas.getBoundingClientRect()
      const screenX = rect.left + areaInfo.centerX + paperX * areaInfo.paperToScreenScale
      const screenY = rect.top + areaInfo.centerY - paperY * areaInfo.paperToScreenScale

      return { x: screenX, y: screenY }
    },
    [getDrawingAreaInfo]
  )

  // Auto-fit: reposition all views to fit within the inner drawing area
  const fitAllViews = useCallback(() => {
    if (!drawing) return

    const areaInfo = getDrawingAreaInfo()
    if (!areaInfo) return

    const visibleViews = drawing.views.filter((v) => v.visible)
    if (visibleViews.length === 0) return

    // Gap between views in mm (tight layout like Shapr3D)
    const gap = 8

    // Calculate actual view sizes
    const viewSizes = visibleViews.map((view) => {
      const bbox = view.projection.bounding_box
      return {
        view,
        width: bbox.max.x - bbox.min.x,
        height: bbox.max.y - bbox.min.y,
      }
    })

    // Determine grid layout based on number of views
    const numViews = visibleViews.length
    let cols = 1,
      rows = 1
    if (numViews === 2) {
      cols = 2
      rows = 1
    } else if (numViews <= 4) {
      cols = 2
      rows = 2
    } else if (numViews <= 6) {
      cols = 3
      rows = 2
    } else {
      cols = Math.ceil(Math.sqrt(numViews))
      rows = Math.ceil(numViews / cols)
    }

    // Calculate max width per column and max height per row
    const colWidths: number[] = Array(cols).fill(0)
    const rowHeights: number[] = Array(rows).fill(0)

    viewSizes.forEach((vs, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      colWidths[col] = Math.max(colWidths[col], vs.width)
      rowHeights[row] = Math.max(rowHeights[row], vs.height)
    })

    // Calculate total dimensions of the grid
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0) + gap * (cols - 1)
    const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0) + gap * (rows - 1)

    // Calculate starting position to center the grid (offset up-left for title block)
    const startX = -totalWidth / 2 - areaInfo.innerWidthMm * 0.05
    const startY = totalHeight / 2 + areaInfo.innerHeightMm * 0.08

    // Position each view
    let currentY = startY
    for (let row = 0; row < rows; row++) {
      let currentX = startX
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col
        if (index >= viewSizes.length) break

        const vs = viewSizes[index]
        // Position view at center of its cell
        const posX = currentX + colWidths[col] / 2
        const posY = currentY - rowHeights[row] / 2

        updateViewPosition(drawing.id, vs.view.id, [posX, posY])

        currentX += colWidths[col] + gap
      }
      currentY -= rowHeights[row] + gap
    }
  }, [drawing, getDrawingAreaInfo, updateViewPosition])

  // Helper: Get view position (stored position in paper coordinates)
  const getViewPosition = useCallback(
    (view: DrawingView): { x: number; y: number; centerX: number; centerY: number } => {
      const bbox = view.projection.bounding_box
      const viewCenterX = (bbox.min.x + bbox.max.x) / 2
      const viewCenterY = (bbox.min.y + bbox.max.y) / 2

      // Position is stored in paper coordinates (mm)
      const posX = view.position[0]
      const posY = view.position[1]

      return {
        x: posX - viewCenterX,
        y: posY + viewCenterY,
        centerX: posX,
        centerY: posY,
      }
    },
    []
  )

  // Find view at point (for drag detection and hover)
  const findViewAtPoint = useCallback(
    (
      paperPoint: Point2D
    ): {
      view: DrawingView
      viewX: number
      viewY: number
      centerX: number
      centerY: number
    } | null => {
      if (!drawing) return null

      for (const view of drawing.views) {
        if (!view.visible) continue

        const bbox = view.projection.bounding_box
        const viewWidth = bbox.max.x - bbox.min.x
        const viewHeight = bbox.max.y - bbox.min.y

        // View position is the center in paper coordinates
        const centerX = view.position[0]
        const centerY = view.position[1]

        // Calculate view bounds in paper coordinates (with padding)
        const padding = 15 // mm padding for easier selection
        const minX = centerX - viewWidth / 2 - padding
        const maxX = centerX + viewWidth / 2 + padding
        const minY = centerY - viewHeight / 2 - padding
        const maxY = centerY + viewHeight / 2 + padding

        // Check if paper point is within view bounds
        if (
          paperPoint.x >= minX &&
          paperPoint.x <= maxX &&
          paperPoint.y >= minY &&
          paperPoint.y <= maxY
        ) {
          return { view, viewX: centerX, viewY: centerY, centerX, centerY }
        }
      }

      return null
    },
    [drawing]
  )

  // Find line at point (hit-testing)
  const findLineAtPoint = useCallback(
    (
      paperPoint: Point2D
    ): {
      line: Line2D
      viewId: string
      viewX: number
      viewY: number
      closestPoint: Point2D
      snapToStart: boolean
      snapToEnd: boolean
    } | null => {
      if (!drawing) return null

      let bestHit: {
        line: Line2D
        viewId: string
        viewX: number
        viewY: number
        distance: number
        closestPoint: Point2D
        snapToStart: boolean
        snapToEnd: boolean
      } | null = null

      for (const view of drawing.views) {
        if (!view.visible) continue

        const bbox = view.projection.bounding_box
        const viewCenterX = (bbox.min.x + bbox.max.x) / 2
        const viewCenterY = (bbox.min.y + bbox.max.y) / 2

        // View position is the center in paper coordinates
        const centerX = view.position[0]
        const centerY = view.position[1]

        // Convert paper point to local view coordinates
        // (same transformation as rendering)
        const localPoint: Point2D = {
          x: paperPoint.x - centerX,
          y: -(paperPoint.y - centerY),
        }

        // Check each line in the view
        for (const line of view.projection.lines) {
          // Lines are offset by viewCenter (same as rendering)
          const lineStart: Point2D = {
            x: line.start.x - viewCenterX,
            y: -(line.start.y - viewCenterY),
          }
          const lineEnd: Point2D = {
            x: line.end.x - viewCenterX,
            y: -(line.end.y - viewCenterY),
          }

          const { distance, closestPoint } = pointToLineDistance(localPoint, lineStart, lineEnd)

          // Check if we should snap to start or end point
          const distToStart = Math.hypot(localPoint.x - lineStart.x, localPoint.y - lineStart.y)
          const distToEnd = Math.hypot(localPoint.x - lineEnd.x, localPoint.y - lineEnd.y)
          const snapTolerance = hitTestTolerance * 1.5

          const snapToStart = distToStart < snapTolerance
          const snapToEnd = distToEnd < snapTolerance

          if (distance < hitTestTolerance) {
            if (!bestHit || distance < bestHit.distance) {
              bestHit = {
                line,
                viewId: view.id,
                viewX: centerX,
                viewY: centerY,
                distance,
                closestPoint,
                snapToStart,
                snapToEnd,
              }
            }
          }
        }
      }

      if (bestHit) {
        return {
          line: bestHit.line,
          viewId: bestHit.viewId,
          viewX: bestHit.viewX,
          viewY: bestHit.viewY,
          closestPoint: bestHit.closestPoint,
          snapToStart: bestHit.snapToStart,
          snapToEnd: bestHit.snapToEnd,
        }
      }

      return null
    },
    [drawing, hitTestTolerance]
  )

  // Find dimension at point (hit-testing for dimension selection)
  const findDimensionAtPoint = useCallback(
    (paperPoint: Point2D): number | null => {
      if (!drawing?.dimensions?.dimensions) return null

      const dimensions = drawing.dimensions.dimensions
      const tolerance = 8 // mm tolerance for clicking on dimension elements

      for (let i = 0; i < dimensions.length; i++) {
        const dim = dimensions[i]

        // Get the view offset if dimension is attached to a view
        let viewOffsetX = 0
        let viewOffsetY = 0
        if (dim.viewId) {
          const view = drawing.views.find((v) => v.id === dim.viewId)
          if (view) {
            viewOffsetX = view.position[0]
            viewOffsetY = view.position[1]
          }
        }

        // Convert paper point to dimension-relative coordinates
        const relativePoint: Point2D = {
          x: paperPoint.x - viewOffsetX,
          y: paperPoint.y - viewOffsetY,
        }

        // Check dimension line
        const dimLine = dim.dimensionLine
        const { distance: dimLineDist } = pointToLineDistance(
          relativePoint,
          dimLine.start,
          dimLine.end
        )
        if (dimLineDist < tolerance) {
          return i
        }

        // Check extension lines
        for (const extLine of dim.extensionLines) {
          const { distance: extLineDist } = pointToLineDistance(
            relativePoint,
            extLine.start,
            extLine.end
          )
          if (extLineDist < tolerance) {
            return i
          }
        }

        // Check text position (larger hit area for text)
        const textTolerance = 15
        const textDist = Math.hypot(
          relativePoint.x - dim.textPosition.x,
          relativePoint.y - dim.textPosition.y
        )
        if (textDist < textTolerance) {
          return i
        }
      }

      return null
    },
    [drawing]
  )

  // Find annotation at point (hit-testing for annotation selection)
  const findAnnotationAtPoint = useCallback(
    (paperPoint: Point2D): { annotationId: string; hitType: "box" | "anchor" } | null => {
      if (!drawing?.annotations?.annotations) return null

      const annotations = drawing.annotations.annotations
      const tolerance = 8 // mm tolerance

      for (const annotation of annotations) {
        // Get the view offset if annotation is attached to a view
        let viewOffsetX = 0
        let viewOffsetY = 0
        if (annotation.viewId) {
          const view = drawing.views.find((v) => v.id === annotation.viewId)
          if (view) {
            viewOffsetX = view.position[0]
            viewOffsetY = view.position[1]
          }
        }

        // Convert paper point to annotation-relative coordinates
        const relativePoint: Point2D = {
          x: paperPoint.x - viewOffsetX,
          y: paperPoint.y - viewOffsetY,
        }

        // Check anchor point (small circle)
        const anchorDist = Math.hypot(
          relativePoint.x - annotation.anchorPoint.x,
          relativePoint.y - annotation.anchorPoint.y
        )
        if (anchorDist < tolerance * 1.5) {
          return { annotationId: annotation.id, hitType: "anchor" }
        }

        // Check box (approximate bounding box)
        const style = annotation.style || drawing.annotations.defaultStyle
        const padding = style.padding || 2
        const fontSize = style.fontSize || 3.5
        // Approximate text width (rough estimate)
        const textWidth = annotation.text.length * fontSize * 0.6
        const boxWidth = textWidth + padding * 2
        const boxHeight = fontSize + padding * 2

        const boxX = annotation.position.x
        const boxY = annotation.position.y - boxHeight / 2

        if (
          relativePoint.x >= boxX - tolerance &&
          relativePoint.x <= boxX + boxWidth + tolerance &&
          relativePoint.y >= boxY - boxHeight / 2 - tolerance &&
          relativePoint.y <= boxY + boxHeight / 2 + tolerance
        ) {
          return { annotationId: annotation.id, hitType: "box" }
        }
      }

      return null
    },
    [drawing]
  )

  // Mouse handlers for pan, dimensioning, and view dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Ensure canvas has focus to capture keyboard events
      e.currentTarget.focus()

      // Right click = Cancel selection
      if (e.button === 2) {
        if (selectedPoints.length > 0) {
          console.log("🚫 Cancelled selection")
          setSelectedPoints([])
          e.preventDefault()
        }
        // Also clear dimension selection on right click
        if (selectedDimensionIndex !== null) {
          clearSelection()
        }
        return
      }

      // Middle click or Ctrl+Left click = Pan mode (for viewport panning)
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        setIsPanning(true)
        setPanStart([e.clientX, e.clientY])
        setPanStartOffset([pan[0], pan[1]])
        e.preventDefault()
        return
      }

      // Left click without modifiers - check for dimension selection/dragging first
      if (e.button === 0 && !e.ctrlKey && !activeTool) {
        const paperPoint = screenToPaper(e.clientX, e.clientY)

        // Check if clicking on a dimension
        const dimIndex = findDimensionAtPoint(paperPoint)
        if (dimIndex !== null) {
          if (dimIndex === selectedDimensionIndex) {
            // Clicking on already selected dimension - start dragging to adjust offset
            const dim = drawing?.dimensions?.dimensions[dimIndex]
            if (dim && drawing) {
              setDraggedDimension({
                dimensionIndex: dimIndex,
                viewId: dim.viewId,
              })
              e.preventDefault()
              return
            }
          } else {
            // Clicking on a different dimension - select it
            setSelectedDimensionIndex(dimIndex)
            e.preventDefault()
            return
          }
        }

        // Clear dimension selection if clicking elsewhere
        if (selectedDimensionIndex !== null) {
          clearSelection()
        }

        // Check if clicking on an annotation
        const annotationHit = findAnnotationAtPoint(paperPoint)
        if (annotationHit) {
          const annotation = drawing?.annotations?.annotations.find(
            (a) => a.id === annotationHit.annotationId
          )
          if (annotation) {
            // Get view offset for this annotation
            let viewOffsetX = 0
            let viewOffsetY = 0
            if (annotation.viewId) {
              const view = drawing?.views.find((v) => v.id === annotation.viewId)
              if (view) {
                viewOffsetX = view.position[0]
                viewOffsetY = view.position[1]
              }
            }

            // Convert paper point to view-relative coordinates
            const relativePoint = {
              x: paperPoint.x - viewOffsetX,
              y: paperPoint.y - viewOffsetY,
            }

            if (annotationHit.annotationId === selectedAnnotationId) {
              // Already selected - start dragging
              if (annotationHit.hitType === "anchor") {
                setDraggedAnnotation({
                  annotationId: annotationHit.annotationId,
                  offset: {
                    x: relativePoint.x - annotation.anchorPoint.x,
                    y: relativePoint.y - annotation.anchorPoint.y,
                  },
                  isAnchor: true,
                })
              } else {
                setDraggedAnnotation({
                  annotationId: annotationHit.annotationId,
                  offset: {
                    x: relativePoint.x - annotation.position.x,
                    y: relativePoint.y - annotation.position.y,
                  },
                  isAnchor: false,
                })
              }
            } else {
              // Select this annotation
              setSelectedAnnotationId(annotationHit.annotationId)
            }
            e.preventDefault()
            return
          }
        }

        // Clear annotation selection if clicking elsewhere
        if (selectedAnnotationId !== null) {
          setSelectedAnnotationId(null)
        }

        // Then check for view dragging (if not locked)
        if (!viewsLocked) {
          const viewHit = findViewAtPoint(paperPoint)

          if (viewHit && drawing) {
            // Start dragging view
            const offsetX = paperPoint.x - viewHit.centerX
            const offsetY = paperPoint.y - viewHit.centerY
            setDraggedView({ viewId: viewHit.view.id, offset: [offsetX, offsetY] })
            setPanStart([e.clientX, e.clientY])
            e.preventDefault()
            return
          }
        }
      }

      // Dimensioning mode - use snap points for precise selection
      if (activeTool && e.button === 0 && !e.ctrlKey && drawing) {
        const paperPoint = screenToPaper(e.clientX, e.clientY)

        console.log("🎯 Dimensioning click:", {
          activeTool,
          activeSnap: activeSnap ? activeSnap.snap.type : "none",
          selectedPoints: selectedPoints.length,
        })

        // For "nota" tool: clicking on a line creates an annotation
        if (activeTool === "nota") {
          const lineHit = findLineAtPoint(paperPoint)
          if (lineHit) {
            const view = drawing.views.find((v) => v.id === lineHit.viewId)
            if (view) {
              const bbox = view.projection.bounding_box
              const viewCenterX = (bbox.min.x + bbox.max.x) / 2
              const viewCenterY = (bbox.min.y + bbox.max.y) / 2

              // Anchor point is where user clicked (in view-relative coordinates)
              const anchorPoint: Point2D = {
                x: lineHit.closestPoint.x,
                y: -lineHit.closestPoint.y, // Flip Y for paper coordinates
              }

              // Position the annotation box offset from the anchor
              // Place it above and to the right by default
              const boxOffset = 20 // mm
              const annotationPosition: Point2D = {
                x: anchorPoint.x + boxOffset,
                y: anchorPoint.y + boxOffset * 0.5,
              }

              // Create the annotation
              const newAnnotation: Annotation = {
                id: `annotation-${Date.now()}`,
                text: "Nota",
                position: annotationPosition,
                anchorPoint: anchorPoint,
                viewId: lineHit.viewId,
                style: { ...DEFAULT_ANNOTATION_STYLE },
              }

              addAnnotation(drawing.id, newAnnotation)
              setSelectedAnnotationId(newAnnotation.id)

              // Start editing immediately
              const screenPos = paperToScreen(
                view.position[0] + annotationPosition.x,
                view.position[1] + annotationPosition.y
              )
              if (screenPos) {
                setEditingAnnotationId(newAnnotation.id)
                setEditingAnnotationText("Nota")
                setEditingAnnotationPos(screenPos)
              }

              console.log("📝 Annotation created!")
              e.preventDefault()
              return
            }
          }
          // If no line hit, still prevent default to stay in nota mode
          e.preventDefault()
          return
        }

        // For "line-length" tool: clicking on a line creates dimension for entire line
        if (activeTool === "line-length" && !activeSnap) {
          const lineHit = findLineAtPoint(paperPoint)
          if (lineHit) {
            const view = drawing.views.find((v) => v.id === lineHit.viewId)
            if (view) {
              const bbox = view.projection.bounding_box
              const viewCenterX = (bbox.min.x + bbox.max.x) / 2
              const viewCenterY = (bbox.min.y + bbox.max.y) / 2

              // Get line endpoints in view-relative coordinates
              const p1: Point2D = {
                x: lineHit.line.start.x - viewCenterX,
                y: lineHit.line.start.y - viewCenterY,
              }
              const p2: Point2D = {
                x: lineHit.line.end.x - viewCenterX,
                y: lineHit.line.end.y - viewCenterY,
              }

              const config = drawing.dimensions.config
              // Calculate offset proportional to view size for consistent visual appearance
              const viewBbox = view.projection.bounding_box
              const viewSize = Math.max(
                viewBbox.max.x - viewBbox.min.x,
                viewBbox.max.y - viewBbox.min.y
              )
              // Offset as ~5% of the view size, with a minimum based on config
              const scaleAwareOffset = Math.max(config.offset, viewSize * 0.05)

              // Always create aligned dimension for line-length (parallel to the line)
              console.log("📏 Creating ALIGNED dimension for line-length")
              const dimension = createAlignedDimension(p1, p2, config, scaleAwareOffset)
              dimension.viewId = lineHit.viewId

              addDimension(drawing.id, dimension)
              console.log("✨ Line dimension added!")
              e.preventDefault()
              return
            }
          }
        }

        // Use active snap point if available
        if (activeSnap) {
          // Convert snap point from view-local to paper coordinates
          const snapPaperX = activeSnap.viewPosition[0] + activeSnap.snap.point.x
          const snapPaperY = activeSnap.viewPosition[1] + activeSnap.snap.point.y

          const pointInPaperCoords: Point2D = {
            x: snapPaperX,
            y: snapPaperY,
          }

          console.log(`📍 Snapped to ${activeSnap.snap.type.toUpperCase()}:`, pointInPaperCoords)

          const newSelection = [
            ...selectedPoints,
            { point: pointInPaperCoords, viewId: activeSnap.viewId },
          ]
          setSelectedPoints(newSelection)
          console.log("✅ Point selected:", newSelection.length, "points total", pointInPaperCoords)

          // Create dimension after 2 points are selected
          if (newSelection.length >= 2) {
            console.log("🔧 Attempting to create dimension with points:", newSelection)

            // Use the first point's view as the anchor view for the dimension
            const anchorViewId = newSelection[0].viewId
            const anchorView = drawing.views.find((v) => v.id === anchorViewId)

            if (!anchorView) {
              console.error("❌ Anchor view not found")
              setSelectedPoints([])
              return
            }

            // Get the view's current position (center in paper coordinates)
            const viewPosX = anchorView.position[0]
            const viewPosY = anchorView.position[1]

            // Convert paper coordinates to view-relative coordinates
            const p1Absolute = newSelection[0].point
            const p2Absolute = newSelection[1].point

            const p1: Point2D = {
              x: p1Absolute.x - viewPosX,
              y: p1Absolute.y - viewPosY,
            }
            const p2: Point2D = {
              x: p2Absolute.x - viewPosX,
              y: p2Absolute.y - viewPosY,
            }

            const config = drawing.dimensions.config

            console.log("📊 Points for dimension (view-relative):", { p1, p2, anchorViewId })

            // Calculate offset proportional to view size for consistent visual appearance
            const viewBbox = anchorView.projection.bounding_box
            const viewSize = Math.max(
              viewBbox.max.x - viewBbox.min.x,
              viewBbox.max.y - viewBbox.min.y
            )
            // Offset as ~5% of the view size, with a minimum based on config
            const scaleAwareOffset = Math.max(config.offset, viewSize * 0.05)

            console.log("📐 Scale info:", {
              scale: drawing.sheetConfig.scale,
              viewSize,
              scaleAwareOffset,
            })

            let dimension: Dimension | null = null

            // Smart dimension detection based on tool type
            if (activeTool === "auto") {
              // Auto mode: detect best dimension type based on angle
              const dx = p2.x - p1.x
              const dy = p2.y - p1.y
              const angle = Math.atan2(dy, dx) * (180 / Math.PI)

              console.log("📏 Auto mode - Angle:", angle)

              // If angle is close to 0° or 180° (±15°), prefer horizontal
              if (
                Math.abs(angle) < 15 ||
                Math.abs(angle - 180) < 15 ||
                Math.abs(angle + 180) < 15
              ) {
                console.log("→ Creating HORIZONTAL dimension")
                dimension = createHorizontalDimension(p1, p2, config, scaleAwareOffset)
              }
              // If angle is close to 90° or 270° (±15°), prefer vertical
              else if (Math.abs(angle - 90) < 15 || Math.abs(angle + 90) < 15) {
                console.log("↑ Creating VERTICAL dimension")
                dimension = createVerticalDimension(p1, p2, config, scaleAwareOffset)
              }
              // Otherwise, use aligned dimension
              else {
                console.log("↗ Creating ALIGNED dimension")
                dimension = createAlignedDimension(p1, p2, config, scaleAwareOffset)
              }
            } else if (activeTool === "line-length" || activeTool === "point-to-line") {
              // Line-length and point-to-line: always aligned (parallel to line)
              console.log("↗ Creating ALIGNED dimension (line-length/point-to-line)")
              dimension = createAlignedDimension(p1, p2, config, scaleAwareOffset)
            } else if (activeTool === "point-to-point") {
              // Point-to-point: use aligned dimension
              console.log("↗ Creating ALIGNED dimension (point-to-point)")
              dimension = createAlignedDimension(p1, p2, config, scaleAwareOffset)
            }

            if (dimension) {
              // Attach the dimension to the anchor view
              dimension.viewId = anchorViewId
              console.log("📏 Dimension created (attached to view):", dimension)
              addDimension(drawing.id, dimension)
              setSelectedPoints([])
              console.log("✨ Dimension added to drawing successfully!")
            } else {
              console.error("❌ Failed to create dimension - dimension is null")
            }
          } else {
            console.log(`⏳ Waiting for ${2 - newSelection.length} more point(s)`)
          }
        }

        e.preventDefault()
      }
    },
    [
      activeTool,
      setActiveTool,
      screenToPaper,
      paperToScreen,
      activeSnap,
      findLineAtPoint,
      findViewAtPoint,
      findDimensionAtPoint,
      findAnnotationAtPoint,
      drawing,
      selectedPoints,
      addDimension,
      addAnnotation,
      viewsLocked,
      setSelectedPoints,
      selectedDimensionIndex,
      setSelectedDimensionIndex,
      selectedAnnotationId,
      clearSelection,
      pan,
    ]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Viewport panning (middle-click or ctrl+drag)
      if (isPanning && panStart) {
        const dx = e.clientX - panStart[0]
        const dy = e.clientY - panStart[1]
        setPan([panStartOffset[0] + dx, panStartOffset[1] + dy])
        return
      }

      const paperPoint = screenToPaper(e.clientX, e.clientY)

      // Dragging a view
      if (draggedView && drawing) {
        const newCenterX = paperPoint.x - draggedView.offset[0]
        const newCenterY = paperPoint.y - draggedView.offset[1]
        updateViewPosition(drawing.id, draggedView.viewId, [newCenterX, newCenterY])
        return
      }

      // Dragging a dimension to adjust its offset
      if (draggedDimension && drawing) {
        const dim = drawing.dimensions?.dimensions[draggedDimension.dimensionIndex]
        if (dim && dim.point1 && dim.point2) {
          // Get the view offset if dimension is attached to a view
          let viewOffsetX = 0
          let viewOffsetY = 0
          if (draggedDimension.viewId) {
            const view = drawing.views.find((v) => v.id === draggedDimension.viewId)
            if (view) {
              viewOffsetX = view.position[0]
              viewOffsetY = view.position[1]
            }
          }

          // Convert paper point to view-relative coordinates
          const relativePoint = {
            x: paperPoint.x - viewOffsetX,
            y: paperPoint.y - viewOffsetY,
          }

          // Calculate perpendicular offset from the line between point1 and point2
          const newOffset = calculatePerpendicularOffset(relativePoint, dim.point1, dim.point2)

          // Recalculate dimension geometry with new offset
          const updates = recalculateDimensionWithOffset(dim, newOffset)
          if (Object.keys(updates).length > 0) {
            updateDimension(drawing.id, draggedDimension.dimensionIndex, updates)
          }
        }
        return
      }

      // Dragging an annotation
      if (draggedAnnotation && drawing) {
        const annotation = drawing.annotations?.annotations.find(
          (a) => a.id === draggedAnnotation.annotationId
        )
        if (annotation) {
          // Get the view offset if annotation is attached to a view
          let viewOffsetX = 0
          let viewOffsetY = 0
          if (annotation.viewId) {
            const view = drawing.views.find((v) => v.id === annotation.viewId)
            if (view) {
              viewOffsetX = view.position[0]
              viewOffsetY = view.position[1]
            }
          }

          // Convert paper point to view-relative coordinates
          const relativePoint = {
            x: paperPoint.x - viewOffsetX,
            y: paperPoint.y - viewOffsetY,
          }

          if (draggedAnnotation.isAnchor) {
            // Move anchor point
            const newAnchor = {
              x: relativePoint.x - draggedAnnotation.offset.x,
              y: relativePoint.y - draggedAnnotation.offset.y,
            }
            updateAnnotation(drawing.id, annotation.id, { anchorPoint: newAnchor })
          } else {
            // Move box position
            const newPosition = {
              x: relativePoint.x - draggedAnnotation.offset.x,
              y: relativePoint.y - draggedAnnotation.offset.y,
            }
            updateAnnotation(drawing.id, annotation.id, { position: newPosition })
          }
        }
        return
      }

      // Hover detection for "+" button - always show at PAPER CENTER
      const viewHit = findViewAtPoint(paperPoint)
      if (viewHit && drawing) {
        setHoveredViewId(viewHit.view.id)
        // Position "+" button at CENTER OF THE PAPER SHEET (not the view)
        const canvas = canvasRef.current
        if (canvas) {
          const canvasWidth = canvas.width / window.devicePixelRatio
          const canvasHeight = canvas.height / window.devicePixelRatio

          // The paper is always centered in the canvas.
          // The viewport transform zooms around the canvas center, so the paper center
          // stays at canvas center regardless of zoom level - only pan affects it.
          setHoveredViewScreenPos({
            x: canvasWidth / 2 + pan[0],
            y: canvasHeight / 2 + pan[1],
          })
        }
      } else {
        setHoveredViewId(null)
        setHoveredViewScreenPos(null)
      }

      // Snap point detection for dimensioning
      if (activeTool && drawing) {
        // Find snap points in all visible views
        let foundSnap: { snap: SnapPoint; viewId: string; viewPosition: [number, number] } | null =
          null
        let nearestDistance = snapConfig.tolerance

        for (const view of drawing.views) {
          if (!view.visible) continue

          const viewPos = view.position
          const bbox = view.projection.bounding_box
          const viewCenterX = (bbox.min.x + bbox.max.x) / 2
          const viewCenterY = (bbox.min.y + bbox.max.y) / 2

          // Convert paper point to view-local coordinates
          const localPoint: Point2D = {
            x: paperPoint.x - viewPos[0],
            y: paperPoint.y - viewPos[1],
          }

          // Get lines in view-local coordinates (centered)
          const centeredLines: Line2D[] = view.projection.lines.map((line) => ({
            ...line,
            start: {
              x: line.start.x - viewCenterX,
              y: line.start.y - viewCenterY,
            },
            end: {
              x: line.end.x - viewCenterX,
              y: line.end.y - viewCenterY,
            },
          }))

          // Extract snap points for this view
          const viewSnapPoints = extractSnapPoints(centeredLines, snapConfig)

          // Find nearest snap to cursor
          const snap = findNearestSnapPoint(localPoint, viewSnapPoints, centeredLines, snapConfig)

          if (snap) {
            const dist = Math.hypot(localPoint.x - snap.point.x, localPoint.y - snap.point.y)
            if (dist < nearestDistance) {
              nearestDistance = dist
              foundSnap = {
                snap,
                viewId: view.id,
                viewPosition: viewPos,
              }
            }
          }
        }

        setActiveSnap(foundSnap)
        setHoveredLine(null)
      } else {
        setActiveSnap(null)
        setHoveredLine(null)
      }
    },
    [
      draggedView,
      draggedDimension,
      draggedAnnotation,
      activeTool,
      drawing,
      snapConfig,
      screenToPaper,
      findViewAtPoint,
      updateViewPosition,
      updateDimension,
      updateAnnotation,
      isPanning,
      panStart,
      panStartOffset,
    ]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setPanStart(null)
    setDraggedView(null)
    setDraggedDimension(null)
    setDraggedAnnotation(null)
  }, [])

  // Handle wheel for zooming
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const canvasWidth = canvas.width / window.devicePixelRatio
      const canvasHeight = canvas.height / window.devicePixelRatio

      // Zoom factor
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(5, viewportZoom * zoomFactor))

      // Calculate new pan to zoom towards mouse position
      const centerX = canvasWidth / 2
      const centerY = canvasHeight / 2

      // Mouse position relative to center
      const dx = mouseX - centerX - pan[0]
      const dy = mouseY - centerY - pan[1]

      // Adjust pan to keep mouse position fixed
      const scale = newZoom / viewportZoom
      const newPanX = pan[0] - dx * (scale - 1)
      const newPanY = pan[1] - dy * (scale - 1)

      setViewportZoom(newZoom)
      setPan([newPanX, newPanY])
    },
    [viewportZoom, pan]
  )

  // Reset zoom to fit the entire sheet
  const resetZoom = useCallback(() => {
    setViewportZoom(1)
    setPan([0, 0])
  }, [])

  // Always call hooks
  const { addView, generateProjection, updateDrawing } = useDrawingStore()
  const [showAddViewPopover, setShowAddViewPopover] = useState(false)

  type StandardViewKey = "Top" | "Front" | "Right" | "Left" | "Bottom" | "Back" | "Isometric"

  const availableProjectionTypes: Array<{
    type: ProjectionType
    label: string
    key: StandardViewKey
  }> = [
    { type: "Top", label: t("drawings.views.top"), key: "Top" },
    { type: "Front", label: t("drawings.views.front"), key: "Front" },
    { type: "Right", label: t("drawings.views.right"), key: "Right" },
    { type: "Left", label: t("drawings.views.left"), key: "Left" },
    { type: "Bottom", label: t("drawings.views.bottom"), key: "Bottom" },
    { type: "Back", label: t("drawings.views.back"), key: "Back" },
    { type: "Isometric", label: t("drawings.views.isometric"), key: "Isometric" },
  ]

  const existingViewTypes = new Set<StandardViewKey>(
    drawing?.views
      .map((v) => {
        if (typeof v.projectionType === "string") {
          return v.projectionType as StandardViewKey
        }
        return null
      })
      .filter((v): v is StandardViewKey => v !== null) || []
  )

  // Calculate smart position for new view based on existing views - 2x2 grid layout
  const calculateNewViewPosition = useCallback(
    (newBbox: { min: Point2D; max: Point2D }): [number, number] => {
      if (!drawing) return [0, 0]

      const newWidth = newBbox.max.x - newBbox.min.x
      const viewCount = drawing.views.length
      const spacing = 15 // mm spacing between views

      // Get paper dimensions to determine available area
      const paperDims = getPaperDimensions(
        drawing.sheetConfig.size,
        drawing.sheetConfig.orientation
      )
      // Use 70% of paper for views (leave space for title block)
      const availableWidth = paperDims.width * 0.7
      const availableHeight = paperDims.height * 0.7

      // If first view, position in top-left quadrant of center
      if (viewCount === 0) {
        return [-availableWidth / 6, availableHeight / 6]
      }

      // Use a 2x2 grid layout for up to 4 views
      // Grid positions: [top-left, top-right, bottom-left, bottom-right]
      const gridPositions: Array<[number, number]> = [
        [-availableWidth / 6, availableHeight / 6], // top-left (index 0)
        [availableWidth / 6, availableHeight / 6], // top-right (index 1)
        [-availableWidth / 6, -availableHeight / 6], // bottom-left (index 2)
        [availableWidth / 6, -availableHeight / 6], // bottom-right (index 3)
      ]

      // If there's a hovered view, position next to it intelligently
      if (hoveredViewId) {
        const hoveredView = drawing.views.find((v) => v.id === hoveredViewId)
        if (hoveredView) {
          const hBbox = hoveredView.projection.bounding_box
          const hWidth = hBbox.max.x - hBbox.min.x
          const hPos = hoveredView.position

          // Check grid positions that are not occupied
          const occupiedPositions = new Set(
            drawing.views.map((v) => {
              // Find which grid position this view is closest to
              let closestIdx = 0
              let closestDist = Infinity
              gridPositions.forEach((pos, idx) => {
                const dist = Math.hypot(v.position[0] - pos[0], v.position[1] - pos[1])
                if (dist < closestDist) {
                  closestDist = dist
                  closestIdx = idx
                }
              })
              return closestIdx
            })
          )

          // Find next available grid position
          for (let i = 0; i < gridPositions.length; i++) {
            if (!occupiedPositions.has(i)) {
              return gridPositions[i]
            }
          }

          // All grid positions occupied, place to the right
          return [hPos[0] + hWidth / 2 + spacing + newWidth / 2, hPos[1]]
        }
      }

      // Place in the next available grid position
      if (viewCount < gridPositions.length) {
        return gridPositions[viewCount]
      }

      // More than 4 views: extend to the right of the last view
      const lastView = drawing.views[drawing.views.length - 1]
      const lastBbox = lastView.projection.bounding_box
      const lastWidth = lastBbox.max.x - lastBbox.min.x
      return [lastView.position[0] + lastWidth / 2 + spacing + newWidth / 2, lastView.position[1]]
    },
    [drawing, hoveredViewId]
  )

  const handleAddView = useCallback(
    async (projectionType: ProjectionType) => {
      if (!drawing || !drawing.sourceShapeIds.length) return

      try {
        const originalId = drawing.sourceShapeIds[0]
        const unitFactor = getModelMetersToDrawingUnitsFactor(drawing.sheetConfig.units)
        const projection = await generateProjection(
          originalId,
          projectionType,
          drawing.sheetConfig.scale * unitFactor
        ).catch(async (err) => {
          const mapped = shapeIdMap.get(originalId)
          if (!mapped) throw err
          const retry = await generateProjection(
            mapped,
            projectionType,
            drawing.sheetConfig.scale * unitFactor
          )
          updateDrawing(drawing.id, {
            sourceShapeIds: [mapped, ...drawing.sourceShapeIds.slice(1)],
          })
          return retry
        })

        // Calculate smart position based on existing views
        const position = calculateNewViewPosition(projection.bounding_box)

        addView(drawing.id, projectionType, projection, position)
        setShowAddViewPopover(false)

        // Auto-fit to show all views after a brief delay to allow state update
        setTimeout(() => fitAllViews(), 100)
      } catch (error) {
        console.error("Error adding view:", error)
      }
    },
    [drawing, generateProjection, addView, updateDrawing, calculateNewViewPosition, fitAllViews]
  )

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <canvas
        id="drawing-viewport-canvas"
        ref={canvasRef}
        className={cn(
          "h-full w-full",
          isPanning
            ? "cursor-grabbing"
            : draggedView
              ? "cursor-move"
              : draggedDimension
                ? "cursor-ns-resize"
                : activeTool
                  ? "cursor-crosshair"
                  : selectedDimensionIndex !== null
                    ? "cursor-ns-resize"
                    : viewsLocked
                      ? "cursor-default"
                      : hoveredViewId
                        ? "cursor-grab"
                        : "cursor-default"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            console.log("⌨️ ESC pressed - Current state:", {
              selectedPoints: selectedPoints.length,
              selectedDimension: selectedDimensionIndex,
              selectedAnnotation: selectedAnnotationId,
              editingAnnotation: editingAnnotationId,
              activeTool,
            })

            // Clear in priority order: editing > points > selections > active tool
            if (editingAnnotationId !== null) {
              console.log("🚫 Cancelled annotation editing (Escape)")
              setEditingAnnotationId(null)
              setEditingAnnotationText("")
              setEditingAnnotationPos(null)
              e.preventDefault()
            } else if (selectedPoints.length > 0) {
              console.log("🚫 Cancelled point selection (Escape)")
              setSelectedPoints([])
              e.preventDefault()
            } else if (selectedAnnotationId !== null) {
              console.log("🚫 Cleared annotation selection (Escape)")
              setSelectedAnnotationId(null)
              e.preventDefault()
            } else if (selectedDimensionIndex !== null) {
              console.log("🚫 Cleared dimension selection (Escape)")
              clearSelection()
              e.preventDefault()
            } else if (activeTool !== null) {
              console.log("🚫 Deactivated tool (Escape):", activeTool)
              setActiveTool(null)
              e.preventDefault()
            }
          }
          // Delete selected dimension with Delete or Backspace
          if (
            (e.key === "Delete" || e.key === "Backspace") &&
            selectedDimensionIndex !== null &&
            drawing
          ) {
            console.log("🗑️ Deleting dimension at index:", selectedDimensionIndex)
            removeDimension(drawing.id, selectedDimensionIndex)
            clearSelection()
            e.preventDefault()
          }
          // Delete selected annotation with Delete or Backspace
          if (
            (e.key === "Delete" || e.key === "Backspace") &&
            selectedAnnotationId !== null &&
            !editingAnnotationId &&
            drawing
          ) {
            console.log("🗑️ Deleting annotation:", selectedAnnotationId)
            removeAnnotation(drawing.id, selectedAnnotationId)
            setSelectedAnnotationId(null)
            e.preventDefault()
          }
          // Enter to start editing selected annotation
          if (
            e.key === "Enter" &&
            selectedAnnotationId !== null &&
            !editingAnnotationId &&
            drawing
          ) {
            const annotation = drawing.annotations?.annotations.find(
              (a) => a.id === selectedAnnotationId
            )
            if (annotation) {
              // Get view offset for positioning
              let viewOffsetX = 0
              let viewOffsetY = 0
              if (annotation.viewId) {
                const view = drawing.views.find((v) => v.id === annotation.viewId)
                if (view) {
                  viewOffsetX = view.position[0]
                  viewOffsetY = view.position[1]
                }
              }
              const screenPos = paperToScreen(
                viewOffsetX + annotation.position.x,
                viewOffsetY + annotation.position.y
              )
              if (screenPos) {
                setEditingAnnotationId(selectedAnnotationId)
                setEditingAnnotationText(annotation.text)
                setEditingAnnotationPos(screenPos)
              }
            }
            e.preventDefault()
          }
          // Reset zoom with "0" or "Home" key
          if (e.key === "0" || e.key === "Home") {
            resetZoom()
            e.preventDefault()
          }
        }}
      />

      {/* Add First View Button - if no views exist */}
      {drawing && drawing.views.length === 0 && (
        <Popover open={showAddViewPopover} onOpenChange={setShowAddViewPopover}>
          <PopoverTrigger asChild>
            <Button
              className="absolute top-14 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg"
              variant="outline"
              onClick={() => setShowAddViewPopover(true)}
            >
              <HugeiconsIcon icon={Add01Icon} className="size-4 mr-2" />
              {t("drawings.views.addBaseView")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {t("drawings.views.selectOrientation")}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {availableProjectionTypes.map(({ type, label, key }) => (
                  <Button
                    key={key}
                    size="sm"
                    className="h-8 text-xs justify-start"
                    onClick={() => handleAddView(type)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Back to Modeller Button */}
      <Button
        size="sm"
        variant="outline"
        className="absolute top-4 left-14 bg-background/95 backdrop-blur-sm border-border/50 shadow-sm hover:bg-muted"
        onClick={() => setView("modeller")}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4 mr-1" />
        {t("drawings.backToModeller")}
      </Button>

      {/* "+" Button on hovered view - Shapr3D style */}
      {drawing && hoveredViewId && hoveredViewScreenPos && !draggedView && (
        <Popover open={showAddViewPopover} onOpenChange={setShowAddViewPopover}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="absolute z-10 size-8 rounded-full bg-white text-slate-900 shadow-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
              style={{
                left: hoveredViewScreenPos.x - 16,
                top: hoveredViewScreenPos.y - 16,
              }}
              onClick={() => setShowAddViewPopover(true)}
            >
              <HugeiconsIcon icon={Add01Icon} className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1.5" align="start">
            <div className="space-y-0.5">
              {availableProjectionTypes.map(({ type, label, key }) => {
                const isAdded = existingViewTypes.has(key)
                return (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                      isAdded
                        ? "text-muted-foreground cursor-not-allowed"
                        : "hover:bg-muted cursor-pointer"
                    )}
                    disabled={isAdded}
                    onClick={() => handleAddView(type)}
                  >
                    <span className="flex items-center gap-2">
                      {isAdded && (
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          className="size-4 text-green-500"
                        />
                      )}
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Drawing info overlay */}
      {drawing && (
        <div className="absolute top-4 right-4 text-xs text-muted-foreground bg-background/60 px-2 py-1 rounded">
          {drawing.name} •{" "}
          {typeof drawing.sheetConfig.size === "string" ? drawing.sheetConfig.size : "Custom"} • 1:
          {Math.round(1 / drawing.sheetConfig.scale)}
          {viewportZoom !== 1 && (
            <span className="ml-1 text-primary">• {Math.round(viewportZoom * 100)}%</span>
          )}
        </div>
      )}

      {/* Selected dimension indicator */}
      {drawing && selectedDimensionIndex !== null && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
          <span className="text-sm text-green-400">
            {t("drawings.dimensions.selected", { index: selectedDimensionIndex + 1 })}
          </span>
          <button
            type="button"
            onClick={() => {
              removeDimension(drawing.id, selectedDimensionIndex)
              clearSelection()
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors"
            title={t("drawings.dimensions.delete")}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
            {t("drawings.dimensions.delete")}
          </button>
          <span className="text-xs text-muted-foreground">
            ({t("drawings.dimensions.escToDeselect")})
          </span>
        </div>
      )}

      {/* Selected annotation indicator */}
      {drawing && selectedAnnotationId !== null && !editingAnnotationId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
          <span className="text-sm text-green-400">{t("drawings.annotations.selected")}</span>
          <button
            type="button"
            onClick={() => {
              const annotation = drawing.annotations?.annotations.find(
                (a) => a.id === selectedAnnotationId
              )
              if (annotation) {
                let viewOffsetX = 0
                let viewOffsetY = 0
                if (annotation.viewId) {
                  const view = drawing.views.find((v) => v.id === annotation.viewId)
                  if (view) {
                    viewOffsetX = view.position[0]
                    viewOffsetY = view.position[1]
                  }
                }
                const screenPos = paperToScreen(
                  viewOffsetX + annotation.position.x,
                  viewOffsetY + annotation.position.y
                )
                if (screenPos) {
                  setEditingAnnotationId(selectedAnnotationId)
                  setEditingAnnotationText(annotation.text)
                  setEditingAnnotationPos(screenPos)
                }
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary text-xs transition-colors"
          >
            {t("drawings.annotations.edit")}
          </button>
          <button
            type="button"
            onClick={() => {
              removeAnnotation(drawing.id, selectedAnnotationId)
              setSelectedAnnotationId(null)
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors"
            title={t("drawings.annotations.delete")}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
            {t("drawings.annotations.delete")}
          </button>
          <span className="text-xs text-muted-foreground">
            ({t("drawings.dimensions.escToDeselect")})
          </span>
        </div>
      )}

      {/* Annotation editing input overlay */}
      {editingAnnotationId && editingAnnotationPos && (
        <div
          className="absolute z-50"
          style={{
            left: editingAnnotationPos.x,
            top: editingAnnotationPos.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <input
            ref={annotationInputRef}
            type="text"
            value={editingAnnotationText}
            onChange={(e) => setEditingAnnotationText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Save the annotation text
                if (drawing && editingAnnotationId) {
                  updateAnnotation(drawing.id, editingAnnotationId, { text: editingAnnotationText })
                }
                setEditingAnnotationId(null)
                setEditingAnnotationText("")
                setEditingAnnotationPos(null)
                e.preventDefault()
                e.stopPropagation()
              } else if (e.key === "Escape") {
                // Cancel editing
                setEditingAnnotationId(null)
                setEditingAnnotationText("")
                setEditingAnnotationPos(null)
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            onBlur={() => {
              // Save on blur
              if (drawing && editingAnnotationId && editingAnnotationText.trim()) {
                updateAnnotation(drawing.id, editingAnnotationId, { text: editingAnnotationText })
              }
              setEditingAnnotationId(null)
              setEditingAnnotationText("")
              setEditingAnnotationPos(null)
            }}
            className="px-2 py-1 text-sm bg-background border border-primary rounded shadow-lg min-w-[100px] focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t("drawings.annotations.placeholder")}
          />
        </div>
      )}

      {/* View controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        {/* Lock/Unlock views button */}
        {drawing && drawing.views.length > 0 && (
          <button
            type="button"
            onClick={() => setViewsLocked(!viewsLocked)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all shadow-sm",
              viewsLocked
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground bg-background/90 hover:bg-background border border-border/50"
            )}
            title={viewsLocked ? t("drawings.views.unlockViews") : t("drawings.views.lockViews")}
          >
            <HugeiconsIcon
              icon={viewsLocked ? SquareLock01Icon : SquareUnlock01Icon}
              className="size-4"
            />
            {viewsLocked ? t("drawings.views.locked") : t("drawings.views.lock")}
          </button>
        )}
        {/* Ajustar: repositions all views in a grid within the paper */}
        {drawing && drawing.views.length > 0 && (
          <button
            type="button"
            onClick={fitAllViews}
            className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded hover:bg-background"
            title={t("drawings.views.fitViewsTooltip")}
          >
            {t("drawings.views.fitViews")}
          </button>
        )}
        {/* Zoom to Fit: reset zoom and pan to show entire sheet */}
        {drawing && (
          <button
            type="button"
            onClick={resetZoom}
            className={cn(
              "flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors",
              viewportZoom !== 1 || pan[0] !== 0 || pan[1] !== 0
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground bg-background/80 hover:bg-background"
            )}
            title={t("drawings.viewport.zoomTotalTooltip")}
          >
            <HugeiconsIcon icon={ViewIcon} className="size-3.5" />
            {t("drawings.viewport.zoomTotal")}
          </button>
        )}
      </div>
    </div>
  )
}
