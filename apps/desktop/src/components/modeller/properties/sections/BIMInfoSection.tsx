/**
 * BIMInfoSection Component - CADHY
 *
 * Comprehensive BIM/IFC information display with:
 * - Dimensions (width, height, depth, radius)
 * - Volume & Surface Area calculations
 * - Concrete/Material quantities
 * - Estimated costs
 * - Object metadata
 * - "Show as Table" button that opens a premium Sheet panel
 */

import {
  Badge,
  Button,
  Input,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@cadhy/ui"
import {
  Cancel01Icon,
  InformationCircleIcon,
  Search01Icon,
  Table01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  AnySceneObject,
  ChannelObject,
  ChuteObject,
  ShapeObject,
  TransitionObject,
} from "@/stores/modeller"
import { PropertySection } from "../shared/PropertySection"

// ============================================================================
// TYPES
// ============================================================================

export interface BIMInfoSectionProps {
  object: AnySceneObject
}

interface BIMData {
  category: string
  property: string
  value: string
  unit?: string
  highlight?: boolean
}

// ============================================================================
// COST CONSTANTS (USD per m³ or m²)
// ============================================================================

const MATERIAL_COSTS = {
  concrete: 150, // USD per m³
  steel: 2500, // USD per m³
  default: 100, // USD per m³
}

const FORMWORK_COST = 25 // USD per m² of surface area

// Structural constants
const SOLADO_THICKNESS = 0.1 // Standard solado thickness in meters (10 cm)
const STEEL_GRADE = "Grade 60" // ASTM A615 Grade 60
const STEEL_FY = 420 // MPa (60 ksi)
const MIN_REBAR_RATIO = 0.0018 // ρ_min for walls/channels (ACI 318)

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  Identification: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  Geometry: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  Dimensions: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  Quantities: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  Structural: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  Hydraulics: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
  Costs: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  Metadata: "bg-slate-500/10 text-slate-500 border-slate-500/30",
  State: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
}

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

function calculateShapeMetrics(shape: ShapeObject): {
  volume: number
  surfaceArea: number
  dimensions: { width?: number; height?: number; depth?: number; radius?: number }
} {
  const params = shape.parameters
  const scale = shape.transform.scale
  const scaleX = scale.x
  const scaleY = scale.y
  const scaleZ = scale.z

  let volume = 0
  let surfaceArea = 0
  const dimensions: { width?: number; height?: number; depth?: number; radius?: number } = {}

  switch (shape.shapeType) {
    case "box": {
      const w = (params.width ?? 1) * scaleX
      const h = (params.height ?? 1) * scaleY
      const d = (params.depth ?? 1) * scaleZ
      volume = w * h * d
      surfaceArea = 2 * (w * h + h * d + w * d)
      dimensions.width = w
      dimensions.height = h
      dimensions.depth = d
      break
    }
    case "cylinder": {
      const r = (params.radius ?? 0.5) * Math.max(scaleX, scaleZ)
      const h = (params.height ?? 1) * scaleY
      volume = Math.PI * r * r * h
      surfaceArea = 2 * Math.PI * r * (r + h)
      dimensions.radius = r
      dimensions.height = h
      break
    }
    case "sphere": {
      const r = (params.radius ?? 0.5) * Math.max(scaleX, scaleY, scaleZ)
      volume = (4 / 3) * Math.PI * r * r * r
      surfaceArea = 4 * Math.PI * r * r
      dimensions.radius = r
      break
    }
    case "cone": {
      const rBottom = (params.bottomRadius ?? 0.5) * Math.max(scaleX, scaleZ)
      const rTop = (params.topRadius ?? 0) * Math.max(scaleX, scaleZ)
      const h = (params.height ?? 1) * scaleY
      volume = (1 / 3) * Math.PI * h * (rBottom * rBottom + rBottom * rTop + rTop * rTop)
      const slant = Math.sqrt(h * h + (rBottom - rTop) * (rBottom - rTop))
      surfaceArea = Math.PI * (rBottom * rBottom + rTop * rTop + (rBottom + rTop) * slant)
      dimensions.radius = rBottom
      dimensions.height = h
      break
    }
    case "torus": {
      const R = (params.majorRadius ?? 1) * Math.max(scaleX, scaleZ)
      const r = (params.minorRadius ?? 0.3) * scaleY
      volume = 2 * Math.PI * Math.PI * R * r * r
      surfaceArea = 4 * Math.PI * Math.PI * R * r
      dimensions.radius = R
      break
    }
    default:
      break
  }

  return { volume, surfaceArea, dimensions }
}

function calculateChannelMetrics(channel: ChannelObject): {
  volume: number
  surfaceArea: number
  concreteVolume: number
  length: number
  crossSectionArea: number
} {
  const length = channel.length ?? 0
  const thickness = channel.thickness ?? 0.15
  const section = channel.section

  let crossSectionArea = 0
  let wetPerimeter = 0

  if (section) {
    switch (section.type) {
      case "rectangular": {
        const w = section.width ?? 0
        const d = section.depth ?? 0
        crossSectionArea = w * d
        wetPerimeter = w + 2 * d
        break
      }
      case "trapezoidal": {
        const b = section.bottomWidth ?? 0
        const d = section.depth ?? 0
        const z = section.sideSlope ?? 1.5
        const topWidth = b + 2 * z * d
        crossSectionArea = ((b + topWidth) / 2) * d
        const sideLength = Math.sqrt(d * d + z * d * (z * d))
        wetPerimeter = b + 2 * sideLength
        break
      }
      case "triangular": {
        const d = section.depth ?? 0
        const z = section.sideSlope ?? 1
        crossSectionArea = z * d * d
        const sideLength = Math.sqrt(d * d + z * d * (z * d))
        wetPerimeter = 2 * sideLength
        break
      }
    }
  }

  const waterVolume = crossSectionArea * length
  const innerSurfaceArea = wetPerimeter * length
  const concreteVolume = wetPerimeter * thickness * length

  return {
    volume: waterVolume,
    surfaceArea: innerSurfaceArea,
    concreteVolume,
    length,
    crossSectionArea,
    wetPerimeter,
  }
}

function calculateTransitionMetrics(transition: TransitionObject): {
  volume: number
  surfaceArea: number
  concreteVolume: number
  length: number
  crossSectionArea: number
  wetPerimeter: number
} {
  const length = transition.length ?? 0
  const inlet = transition.inlet
  const outlet = transition.outlet

  // Calculate inlet section
  let inletArea = 0
  let inletPerimeter = 0
  if (inlet) {
    const w = inlet.width ?? 0
    const d = inlet.depth ?? 0
    const z = inlet.sideSlope ?? 0
    if (inlet.sectionType === "rectangular") {
      inletArea = w * d
      inletPerimeter = w + 2 * d
    } else if (inlet.sectionType === "trapezoidal") {
      const topWidth = w + 2 * z * d
      inletArea = ((w + topWidth) / 2) * d
      const sideLength = Math.sqrt(d * d + z * d * (z * d))
      inletPerimeter = w + 2 * sideLength
    }
  }

  // Calculate outlet section
  let outletArea = 0
  let outletPerimeter = 0
  if (outlet) {
    const w = outlet.width ?? 0
    const d = outlet.depth ?? 0
    const z = outlet.sideSlope ?? 0
    if (outlet.sectionType === "rectangular") {
      outletArea = w * d
      outletPerimeter = w + 2 * d
    } else if (outlet.sectionType === "trapezoidal") {
      const topWidth = w + 2 * z * d
      outletArea = ((w + topWidth) / 2) * d
      const sideLength = Math.sqrt(d * d + z * d * (z * d))
      outletPerimeter = w + 2 * sideLength
    }
  }

  // Average values (prismoidal approximation)
  const avgArea = (inletArea + outletArea) / 2
  const avgPerimeter = (inletPerimeter + outletPerimeter) / 2
  const avgThickness = ((inlet?.wallThickness ?? 0.15) + (outlet?.wallThickness ?? 0.15)) / 2

  const waterVolume = avgArea * length
  const innerSurfaceArea = avgPerimeter * length
  const concreteVolume = avgPerimeter * avgThickness * length

  return {
    volume: waterVolume,
    surfaceArea: innerSurfaceArea,
    concreteVolume,
    length,
    crossSectionArea: avgArea,
    wetPerimeter: avgPerimeter,
  }
}

function calculateChuteMetrics(chute: ChuteObject): {
  volume: number
  surfaceArea: number
  concreteVolume: number
  length: number
  crossSectionArea: number
  wetPerimeter: number
  inclinedLength: number
} {
  const length = chute.length ?? 0
  const drop = chute.drop ?? 0
  const width = chute.width ?? 0
  const depth = chute.depth ?? 0
  const sideSlope = chute.sideSlope ?? 0
  const thickness = chute.thickness ?? 0.15

  // Inclined length (actual surface length)
  const inclinedLength = Math.sqrt(length * length + drop * drop)

  // Cross section area
  let crossSectionArea = 0
  let wetPerimeter = 0

  if (sideSlope === 0) {
    // Rectangular
    crossSectionArea = width * depth
    wetPerimeter = width + 2 * depth
  } else {
    // Trapezoidal
    const topWidth = width + 2 * sideSlope * depth
    crossSectionArea = ((width + topWidth) / 2) * depth
    const sideLength = Math.sqrt(depth * depth + sideSlope * depth * (sideSlope * depth))
    wetPerimeter = width + 2 * sideLength
  }

  const waterVolume = crossSectionArea * inclinedLength
  const innerSurfaceArea = wetPerimeter * inclinedLength
  const concreteVolume = wetPerimeter * thickness * inclinedLength

  return {
    volume: waterVolume,
    surfaceArea: innerSurfaceArea,
    concreteVolume,
    length,
    crossSectionArea,
    wetPerimeter,
    inclinedLength,
  }
}

function formatNumber(num: number, decimals = 3): string {
  return num.toFixed(decimals)
}

function getMaterialType(color?: string): string {
  if (!color) return "default"
  const lowerColor = color.toLowerCase()
  if (lowerColor.includes("808080") || lowerColor.includes("gray") || lowerColor.includes("grey")) {
    return "concrete"
  }
  if (lowerColor.includes("c0c0c0") || lowerColor.includes("silver")) {
    return "steel"
  }
  return "default"
}

function getCategoryColor(category: string): string {
  for (const [key, value] of Object.entries(CATEGORY_COLORS)) {
    if (category.includes(key)) return value
  }
  return "bg-muted text-muted-foreground border-border"
}

/**
 * Calculate recommended concrete strength based on structure volume
 * Returns f'c in MPa (megapascals)
 */
function getRecommendedConcreteStrength(concreteVolume: number): {
  fcMPa: number
  fcKgCm2: number
  type: string
} {
  // Based on structure size and typical hydraulic structure requirements
  if (concreteVolume < 5) {
    // Small structures
    return { fcMPa: 21, fcKgCm2: 210, type: "Concreto f'c=210 kg/cm²" }
  }
  if (concreteVolume < 20) {
    // Medium structures
    return { fcMPa: 24, fcKgCm2: 245, type: "Concreto f'c=245 kg/cm²" }
  }
  // Large structures
  return { fcMPa: 28, fcKgCm2: 280, type: "Concreto f'c=280 kg/cm²" }
}

/**
 * Calculate required rebar area based on concrete cross-sectional area
 * Uses minimum reinforcement ratio per ACI 318
 */
function calculateRequiredRebarArea(
  concreteArea: number,
  thickness: number
): {
  rebarArea: number // cm²
  rebarAreaPerMeter: number // cm²/m
} {
  // Convert to cm²
  const concreteAreaCm2 = concreteArea * 10000
  const thicknessCm = thickness * 100

  // Calculate gross area for reinforcement
  const grossArea = concreteAreaCm2

  // As = ρ_min * A_gross
  const rebarArea = MIN_REBAR_RATIO * grossArea

  // Per meter of length (for walls/channels)
  const rebarAreaPerMeter = MIN_REBAR_RATIO * (thicknessCm * 100) // per meter width

  return { rebarArea, rebarAreaPerMeter }
}

/**
 * Calculate solado (concrete base) properties based on structure footprint
 */
function calculateSoladoProperties(
  length: number,
  width: number
): {
  area: number
  volume: number
  thickness: number
} {
  const area = length * width
  const volume = area * SOLADO_THICKNESS
  return {
    area,
    volume,
    thickness: SOLADO_THICKNESS,
  }
}

// ============================================================================
// BIM DATA HOOK
// ============================================================================

function useBIMData(object: AnySceneObject) {
  const { t } = useTranslation()

  const bimData = useMemo<BIMData[]>(() => {
    const data: BIMData[] = []

    // Common properties
    data.push({
      category: t("bim.identification", "Identification"),
      property: t("bim.objectId", "Object ID"),
      value: object.id.slice(0, 12) + "...",
    })

    data.push({
      category: t("bim.identification", "Identification"),
      property: t("bim.objectType", "Type"),
      value: object.type.charAt(0).toUpperCase() + object.type.slice(1),
    })

    data.push({
      category: t("bim.identification", "Identification"),
      property: t("bim.name", "Name"),
      value: object.name,
      highlight: true,
    })

    // Shape-specific metrics
    if (object.type === "shape") {
      const shape = object as ShapeObject
      const metrics = calculateShapeMetrics(shape)
      const materialType = getMaterialType(shape.material?.color)
      const costPerUnit =
        MATERIAL_COSTS[materialType as keyof typeof MATERIAL_COSTS] || MATERIAL_COSTS.default

      data.push({
        category: t("bim.geometry", "Geometry"),
        property: t("bim.shapeType", "Shape Type"),
        value: shape.shapeType.charAt(0).toUpperCase() + shape.shapeType.slice(1),
      })

      if (metrics.dimensions.width) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.width", "Width"),
          value: formatNumber(metrics.dimensions.width),
          unit: "m",
        })
      }

      if (metrics.dimensions.height) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.height", "Height"),
          value: formatNumber(metrics.dimensions.height),
          unit: "m",
        })
      }

      if (metrics.dimensions.depth) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.depth", "Depth"),
          value: formatNumber(metrics.dimensions.depth),
          unit: "m",
        })
      }

      if (metrics.dimensions.radius) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.radius", "Radius"),
          value: formatNumber(metrics.dimensions.radius),
          unit: "m",
        })
      }

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.volume", "Volume"),
        value: formatNumber(metrics.volume),
        unit: "m³",
        highlight: true,
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.surfaceArea", "Surface Area"),
        value: formatNumber(metrics.surfaceArea),
        unit: "m²",
      })

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.materialCost", "Material Cost"),
        value: formatNumber(metrics.volume * costPerUnit, 2),
        unit: "USD",
      })

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.formworkCost", "Formwork Cost"),
        value: formatNumber(metrics.surfaceArea * FORMWORK_COST, 2),
        unit: "USD",
      })

      const totalCost = metrics.volume * costPerUnit + metrics.surfaceArea * FORMWORK_COST
      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.totalEstimate", "Total Estimate"),
        value: formatNumber(totalCost, 2),
        unit: "USD",
        highlight: true,
      })
    }

    // Channel-specific metrics
    if (object.type === "channel") {
      const channel = object as ChannelObject

      data.push({
        category: t("bim.geometry", "Geometry"),
        property: t("bim.sectionType", "Section Type"),
        value: channel.section?.type
          ? channel.section.type.charAt(0).toUpperCase() + channel.section.type.slice(1)
          : "N/A",
      })

      const metrics = calculateChannelMetrics(channel)

      data.push({
        category: t("bim.dimensions", "Dimensions"),
        property: t("bim.length", "Length"),
        value: formatNumber(metrics.length),
        unit: "m",
        highlight: true,
      })

      if (channel.section?.type === "rectangular" && channel.section.width) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.width", "Width"),
          value: formatNumber(channel.section.width),
          unit: "m",
        })
      }

      if (channel.section?.type === "trapezoidal" && channel.section.bottomWidth) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.bottomWidth", "Bottom Width"),
          value: formatNumber(channel.section.bottomWidth),
          unit: "m",
        })
      }

      if (channel.section?.depth) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.depth", "Depth"),
          value: formatNumber(channel.section.depth),
          unit: "m",
        })
      }

      if (channel.freeBoard) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.freeBoard", "Free Board"),
          value: formatNumber(channel.freeBoard),
          unit: "m",
        })
      }

      if (channel.thickness) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.thickness", "Wall Thickness"),
          value: formatNumber(channel.thickness),
          unit: "m",
        })
      }

      data.push({
        category: t("bim.hydraulics", "Hydraulics"),
        property: t("bim.slope", "Slope"),
        value: formatNumber(channel.slope ?? 0, 5),
        unit: "m/m",
      })

      data.push({
        category: t("bim.hydraulics", "Hydraulics"),
        property: t("bim.manningN", "Manning's n"),
        value: formatNumber(channel.manningN ?? 0.013, 4),
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.waterVolume", "Water Volume"),
        value: formatNumber(metrics.volume),
        unit: "m³",
        highlight: true,
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.crossSectionArea", "Cross Section Area"),
        value: formatNumber(metrics.crossSectionArea),
        unit: "m²",
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.wetSurfaceArea", "Wet Surface Area"),
        value: formatNumber(metrics.surfaceArea),
        unit: "m²",
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.concreteVolume", "Concrete Volume"),
        value: formatNumber(metrics.concreteVolume),
        unit: "m³",
        highlight: true,
      })

      // Structural information
      const concreteSpec = getRecommendedConcreteStrength(metrics.concreteVolume)
      const rebarCalc = calculateRequiredRebarArea(
        metrics.wetPerimeter * channel.thickness,
        channel.thickness
      )
      const solado = calculateSoladoProperties(
        metrics.length,
        (channel.section?.width ?? 0) + 2 * (channel.thickness ?? 0.15)
      )

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.concreteType", "Concrete Type"),
        value: concreteSpec.type,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.concreteStrength", "Concrete Strength (f'c)"),
        value: `${formatNumber(concreteSpec.fcMPa, 0)} MPa / ${formatNumber(concreteSpec.fcKgCm2, 0)} kg/cm²`,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.steelGrade", "Steel Grade"),
        value: STEEL_GRADE,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.steelYield", "Steel Yield Strength (fy)"),
        value: formatNumber(STEEL_FY, 0),
        unit: "MPa",
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.minRebarRatio", "Minimum Rebar Ratio (ρ_min)"),
        value: formatNumber(MIN_REBAR_RATIO, 4),
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.rebarArea", "Required Rebar Area"),
        value: formatNumber(rebarCalc.rebarAreaPerMeter, 2),
        unit: "cm²/m",
        highlight: true,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.soladoThickness", "Solado Thickness"),
        value: formatNumber(solado.thickness),
        unit: "m",
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.soladoArea", "Solado Area"),
        value: formatNumber(solado.area),
        unit: "m²",
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.soladoVolume", "Solado Volume"),
        value: formatNumber(solado.volume),
        unit: "m³",
      })

      const concreteCost = metrics.concreteVolume * MATERIAL_COSTS.concrete
      const formworkCost = metrics.surfaceArea * FORMWORK_COST

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.concreteCost", "Concrete Cost"),
        value: formatNumber(concreteCost, 2),
        unit: "USD",
      })

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.formworkCost", "Formwork Cost"),
        value: formatNumber(formworkCost, 2),
        unit: "USD",
      })

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.totalEstimate", "Total Estimate"),
        value: formatNumber(concreteCost + formworkCost, 2),
        unit: "USD",
        highlight: true,
      })
    }

    // Transition-specific metrics
    if (object.type === "transition") {
      const transition = object as TransitionObject
      const metrics = calculateTransitionMetrics(transition)

      data.push({
        category: t("bim.geometry", "Geometry"),
        property: t("bim.transitionType", "Transition Type"),
        value: transition.transitionType
          ? transition.transitionType.charAt(0).toUpperCase() + transition.transitionType.slice(1)
          : "N/A",
      })

      data.push({
        category: t("bim.dimensions", "Dimensions"),
        property: t("bim.length", "Length"),
        value: formatNumber(metrics.length),
        unit: "m",
        highlight: true,
      })

      // Inlet dimensions
      if (transition.inlet) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.inletWidth", "Inlet Width"),
          value: formatNumber(transition.inlet.width),
          unit: "m",
        })
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.inletDepth", "Inlet Depth"),
          value: formatNumber(transition.inlet.depth),
          unit: "m",
        })
      }

      // Outlet dimensions
      if (transition.outlet) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.outletWidth", "Outlet Width"),
          value: formatNumber(transition.outlet.width),
          unit: "m",
        })
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.outletDepth", "Outlet Depth"),
          value: formatNumber(transition.outlet.depth),
          unit: "m",
        })
      }

      if (transition.inlet?.wallThickness) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.thickness", "Wall Thickness"),
          value: formatNumber(transition.inlet.wallThickness),
          unit: "m",
        })
      }

      // Hydraulics
      const slope =
        transition.length > 0
          ? Math.abs(transition.endElevation - transition.startElevation) / transition.length
          : 0
      data.push({
        category: t("bim.hydraulics", "Hydraulics"),
        property: t("bim.slope", "Slope"),
        value: formatNumber(slope, 5),
        unit: "m/m",
      })

      // Quantities
      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.waterVolume", "Water Volume"),
        value: formatNumber(metrics.volume),
        unit: "m³",
        highlight: true,
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.crossSectionArea", "Cross Section Area"),
        value: formatNumber(metrics.crossSectionArea),
        unit: "m²",
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.wetSurfaceArea", "Wet Surface Area"),
        value: formatNumber(metrics.surfaceArea),
        unit: "m²",
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.concreteVolume", "Concrete Volume"),
        value: formatNumber(metrics.concreteVolume),
        unit: "m³",
        highlight: true,
      })

      // Structural information for transition
      const transitionConcreteSpec = getRecommendedConcreteStrength(metrics.concreteVolume)
      const transitionRebarCalc = calculateRequiredRebarArea(
        metrics.wetPerimeter * (transition.inlet?.wallThickness ?? 0.15),
        transition.inlet?.wallThickness ?? 0.15
      )
      const avgWidth = ((transition.inlet?.width ?? 0) + (transition.outlet?.width ?? 0)) / 2
      const transitionSolado = calculateSoladoProperties(
        metrics.length,
        avgWidth + 2 * (transition.inlet?.wallThickness ?? 0.15)
      )

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.concreteType", "Concrete Type"),
        value: transitionConcreteSpec.type,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.concreteStrength", "Concrete Strength (f'c)"),
        value: `${formatNumber(transitionConcreteSpec.fcMPa, 0)} MPa / ${formatNumber(transitionConcreteSpec.fcKgCm2, 0)} kg/cm²`,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.steelGrade", "Steel Grade"),
        value: STEEL_GRADE,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.steelYield", "Steel Yield Strength (fy)"),
        value: formatNumber(STEEL_FY, 0),
        unit: "MPa",
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.minRebarRatio", "Minimum Rebar Ratio (ρ_min)"),
        value: formatNumber(MIN_REBAR_RATIO, 4),
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.rebarArea", "Required Rebar Area"),
        value: formatNumber(transitionRebarCalc.rebarAreaPerMeter, 2),
        unit: "cm²/m",
        highlight: true,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.soladoThickness", "Solado Thickness"),
        value: formatNumber(transitionSolado.thickness),
        unit: "m",
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.soladoArea", "Solado Area"),
        value: formatNumber(transitionSolado.area),
        unit: "m²",
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.soladoVolume", "Solado Volume"),
        value: formatNumber(transitionSolado.volume),
        unit: "m³",
      })

      // Costs
      const concreteCost = metrics.concreteVolume * MATERIAL_COSTS.concrete
      const formworkCost = metrics.surfaceArea * FORMWORK_COST

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.concreteCost", "Concrete Cost"),
        value: formatNumber(concreteCost, 2),
        unit: "USD",
      })

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.formworkCost", "Formwork Cost"),
        value: formatNumber(formworkCost, 2),
        unit: "USD",
      })

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.totalEstimate", "Total Estimate"),
        value: formatNumber(concreteCost + formworkCost, 2),
        unit: "USD",
        highlight: true,
      })
    }

    // Chute-specific metrics
    if (object.type === "chute") {
      const chute = object as ChuteObject
      const metrics = calculateChuteMetrics(chute)

      data.push({
        category: t("bim.geometry", "Geometry"),
        property: t("bim.chuteType", "Chute Type"),
        value: chute.chuteType
          ? chute.chuteType.charAt(0).toUpperCase() + chute.chuteType.slice(1)
          : "N/A",
      })

      data.push({
        category: t("bim.dimensions", "Dimensions"),
        property: t("bim.length", "Horizontal Length"),
        value: formatNumber(metrics.length),
        unit: "m",
      })

      data.push({
        category: t("bim.dimensions", "Dimensions"),
        property: t("bim.inclinedLength", "Inclined Length"),
        value: formatNumber(metrics.inclinedLength),
        unit: "m",
        highlight: true,
      })

      data.push({
        category: t("bim.dimensions", "Dimensions"),
        property: t("bim.drop", "Drop"),
        value: formatNumber(chute.drop ?? 0),
        unit: "m",
      })

      data.push({
        category: t("bim.dimensions", "Dimensions"),
        property: t("bim.width", "Width"),
        value: formatNumber(chute.width ?? 0),
        unit: "m",
      })

      data.push({
        category: t("bim.dimensions", "Dimensions"),
        property: t("bim.depth", "Depth"),
        value: formatNumber(chute.depth ?? 0),
        unit: "m",
      })

      if (chute.thickness) {
        data.push({
          category: t("bim.dimensions", "Dimensions"),
          property: t("bim.thickness", "Wall Thickness"),
          value: formatNumber(chute.thickness),
          unit: "m",
        })
      }

      // Hydraulics
      data.push({
        category: t("bim.hydraulics", "Hydraulics"),
        property: t("bim.slope", "Slope"),
        value: formatNumber(chute.slope ?? 0, 5),
        unit: "m/m",
      })

      data.push({
        category: t("bim.hydraulics", "Hydraulics"),
        property: t("bim.manningN", "Manning's n"),
        value: formatNumber(chute.manningN ?? 0.013, 4),
      })

      // Quantities
      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.waterVolume", "Water Volume"),
        value: formatNumber(metrics.volume),
        unit: "m³",
        highlight: true,
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.crossSectionArea", "Cross Section Area"),
        value: formatNumber(metrics.crossSectionArea),
        unit: "m²",
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.wetSurfaceArea", "Wet Surface Area"),
        value: formatNumber(metrics.surfaceArea),
        unit: "m²",
      })

      data.push({
        category: t("bim.quantities", "Quantities"),
        property: t("bim.concreteVolume", "Concrete Volume"),
        value: formatNumber(metrics.concreteVolume),
        unit: "m³",
        highlight: true,
      })

      // Structural information for chute
      const chuteConcreteSpec = getRecommendedConcreteStrength(metrics.concreteVolume)
      const chuteRebarCalc = calculateRequiredRebarArea(
        metrics.wetPerimeter * (chute.thickness ?? 0.15),
        chute.thickness ?? 0.15
      )
      const chuteSolado = calculateSoladoProperties(
        metrics.inclinedLength,
        (chute.width ?? 0) + 2 * (chute.thickness ?? 0.15)
      )

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.concreteType", "Concrete Type"),
        value: chuteConcreteSpec.type,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.concreteStrength", "Concrete Strength (f'c)"),
        value: `${formatNumber(chuteConcreteSpec.fcMPa, 0)} MPa / ${formatNumber(chuteConcreteSpec.fcKgCm2, 0)} kg/cm²`,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.steelGrade", "Steel Grade"),
        value: STEEL_GRADE,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.steelYield", "Steel Yield Strength (fy)"),
        value: formatNumber(STEEL_FY, 0),
        unit: "MPa",
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.minRebarRatio", "Minimum Rebar Ratio (ρ_min)"),
        value: formatNumber(MIN_REBAR_RATIO, 4),
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.rebarArea", "Required Rebar Area"),
        value: formatNumber(chuteRebarCalc.rebarAreaPerMeter, 2),
        unit: "cm²/m",
        highlight: true,
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.soladoThickness", "Solado Thickness"),
        value: formatNumber(chuteSolado.thickness),
        unit: "m",
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.soladoArea", "Solado Area"),
        value: formatNumber(chuteSolado.area),
        unit: "m²",
      })

      data.push({
        category: t("bim.structural", "Structural"),
        property: t("bim.soladoVolume", "Solado Volume"),
        value: formatNumber(chuteSolado.volume),
        unit: "m³",
      })

      // Costs
      const concreteCost = metrics.concreteVolume * MATERIAL_COSTS.concrete
      const formworkCost = metrics.surfaceArea * FORMWORK_COST

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.concreteCost", "Concrete Cost"),
        value: formatNumber(concreteCost, 2),
        unit: "USD",
      })

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.formworkCost", "Formwork Cost"),
        value: formatNumber(formworkCost, 2),
        unit: "USD",
      })

      data.push({
        category: t("bim.costs", "Costs"),
        property: t("bim.totalEstimate", "Total Estimate"),
        value: formatNumber(concreteCost + formworkCost, 2),
        unit: "USD",
        highlight: true,
      })
    }

    // Timestamps
    data.push({
      category: t("bim.metadata", "Metadata"),
      property: t("bim.created", "Created"),
      value: new Date(object.createdAt).toLocaleString(),
    })

    data.push({
      category: t("bim.metadata", "Metadata"),
      property: t("bim.modified", "Modified"),
      value: new Date(object.updatedAt).toLocaleString(),
    })

    // Visibility state
    data.push({
      category: t("bim.state", "State"),
      property: t("bim.visible", "Visible"),
      value: object.visible ? t("common.yes", "Yes") : t("common.no", "No"),
    })

    data.push({
      category: t("bim.state", "State"),
      property: t("bim.locked", "Locked"),
      value: object.locked ? t("common.yes", "Yes") : t("common.no", "No"),
    })

    return data
  }, [object, t])

  // Group data by category
  const groupedData = useMemo(() => {
    const groups: Record<string, BIMData[]> = {}
    for (const item of bimData) {
      if (!groups[item.category]) {
        groups[item.category] = []
      }
      groups[item.category].push(item)
    }
    return groups
  }, [bimData])

  // Get unique categories
  const categories = useMemo(() => Object.keys(groupedData), [groupedData])

  return { bimData, groupedData, categories }
}

// ============================================================================
// PREMIUM TABLE SHEET COMPONENT
// ============================================================================

interface BIMTableSheetProps {
  object: AnySceneObject
  bimData: BIMData[]
  groupedData: Record<string, BIMData[]>
  categories: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function BIMTableSheet({
  object,
  bimData,
  groupedData,
  categories,
  open,
  onOpenChange,
}: BIMTableSheetProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")

  // Filter data based on search and category
  const filteredData = useMemo(() => {
    let data = bimData

    if (activeCategory !== "all") {
      data = data.filter((item) => item.category === activeCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      data = data.filter(
        (item) =>
          item.property.toLowerCase().includes(query) ||
          item.value.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      )
    }

    return data
  }, [bimData, activeCategory, searchQuery])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col">
        <SheetHeader className="pb-6 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-semibold">
                {t("bim.fullTable", "BIM Data Explorer")}
              </SheetTitle>
              <SheetDescription className="mt-2 text-sm">
                {object.name} •{" "}
                <span className="text-primary font-medium">{object.type.toUpperCase()}</span>
              </SheetDescription>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 max-w-sm">
              <HugeiconsIcon
                icon={Search01Icon}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              />
              <Input
                placeholder={t("bim.searchProperties", "Search properties...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5"
                  onClick={() => setSearchQuery("")}
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                </Button>
              )}
            </div>

            {/* Category tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1">
              <TabsList className="h-9 bg-muted/50">
                <TabsTrigger
                  value="all"
                  className="text-xs h-7 px-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("bim.allCategories", "All")}
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
                    {bimData.length}
                  </Badge>
                </TabsTrigger>
                {categories.slice(0, 5).map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="text-xs h-7 px-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {category.split(" ")[0]}
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
                      {groupedData[category]?.length || 0}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </SheetHeader>

        {/* Table content */}
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          {activeCategory === "all" ? (
            // Grouped view
            <div className="space-y-6 pb-6">
              {Object.entries(groupedData).map(([category, items]) => {
                const filteredItems = searchQuery
                  ? items.filter(
                      (item) =>
                        item.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.value.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : items

                if (filteredItems.length === 0) return null

                return (
                  <div key={category} className="space-y-3">
                    {/* Category header */}
                    <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                      <h3 className="text-sm font-semibold text-foreground">{category}</h3>
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">
                        {filteredItems.length} {t("bim.items", "items")}
                      </span>
                    </div>

                    {/* Category table */}
                    <div className="rounded-xl border overflow-hidden bg-muted/20">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                            <TableHead className="w-[45%] font-semibold text-xs h-10">
                              {t("bim.property", "Property")}
                            </TableHead>
                            <TableHead className="font-semibold text-xs text-right h-10">
                              {t("bim.value", "Value")}
                            </TableHead>
                            <TableHead className="w-24 font-semibold text-xs text-center h-10">
                              {t("bim.unit", "Unit")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredItems.map((item, idx) => (
                            <TableRow key={`${item.property}-${idx}`} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-sm py-3">
                                {item.property}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm py-3">
                                {item.value}
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm py-3">
                                {item.unit || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Single category view
            <div className="rounded-xl border overflow-hidden bg-muted/20">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                    <TableHead className="w-[45%] font-semibold text-xs h-10">
                      {t("bim.property", "Property")}
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-right h-10">
                      {t("bim.value", "Value")}
                    </TableHead>
                    <TableHead className="w-24 font-semibold text-xs text-center h-10">
                      {t("bim.unit", "Unit")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => (
                    <TableRow key={`${item.property}-${idx}`} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm py-3">{item.property}</TableCell>
                      <TableCell className="text-right font-mono text-sm py-3">
                        {item.value}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-sm py-3">
                        {item.unit || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <HugeiconsIcon icon={Search01Icon} className="size-8 mb-3 text-muted-foreground/50" />
              <p className="text-sm">{t("bim.noResults", "No matching properties found")}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSearchQuery("")
                  setActiveCategory("all")
                }}
              >
                {t("bim.clearFilters", "Clear filters")}
              </Button>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// FULL SECTION VIEW (for Properties Panel)
// ============================================================================

interface FullBIMViewProps {
  groupedData: Record<string, BIMData[]>
}

function FullBIMView({ groupedData }: FullBIMViewProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {Object.entries(groupedData).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground px-1">{category}</h4>
          <div className="rounded-xl border overflow-hidden bg-muted/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                  <TableHead className="h-8 text-xs font-medium py-2">
                    {t("bim.property", "Property")}
                  </TableHead>
                  <TableHead className="h-8 text-xs font-medium py-2 text-right">
                    {t("bim.value", "Value")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={`${item.property}-${idx}`} className="hover:bg-muted/20">
                    <TableCell className="py-2 text-xs font-medium">{item.property}</TableCell>
                    <TableCell className="py-2 text-xs text-right font-mono">
                      {item.value}
                      {item.unit && <span className="text-muted-foreground ml-1">{item.unit}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BIMInfoSection({ object }: BIMInfoSectionProps) {
  const { t } = useTranslation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { bimData, groupedData, categories } = useBIMData(object)

  return (
    <>
      <PropertySection
        title={t("properties.bimInformation", "BIM Information")}
        icon={InformationCircleIcon}
        defaultOpen={true}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs gap-1"
            onClick={() => setSheetOpen(true)}
          >
            <HugeiconsIcon icon={Table01Icon} className="size-3" />
            {t("properties.showTable")}
          </Button>
        }
      >
        <FullBIMView groupedData={groupedData} />
      </PropertySection>

      {/* Premium Table Sheet */}
      <BIMTableSheet
        object={object}
        bimData={bimData}
        groupedData={groupedData}
        categories={categories}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
