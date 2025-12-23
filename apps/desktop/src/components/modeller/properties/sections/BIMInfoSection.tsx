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
import type { AnySceneObject, ChannelObject, ShapeObject } from "@/stores/modeller"
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

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  Identification: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  Geometry: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  Dimensions: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  Quantities: "bg-amber-500/10 text-amber-500 border-amber-500/30",
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
  const freeBoard = channel.freeBoard ?? 0.3
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

  // Stats for header
  const stats = useMemo(() => {
    const totalProps = bimData.length
    const categoriesCount = categories.length
    const highlightedCount = bimData.filter((d) => d.highlight).length
    return { totalProps, categoriesCount, highlightedCount }
  }, [bimData, categories])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col">
        <SheetHeader className="pb-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="pr-8">
              <SheetTitle className="flex items-center gap-2 text-lg">
                {t("bim.fullTable", "BIM Data Explorer")}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {object.name} • <span className="text-primary">{object.type.toUpperCase()}</span>
              </SheetDescription>

              {/* Stats badges */}
              <div className="flex gap-2 mt-3">
                <Badge variant="outline" className="gap-1">
                  <span className="text-primary font-bold">{stats.totalProps}</span>
                  {t("bim.properties", "Properties")}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="text-emerald-500 font-bold">{stats.categoriesCount}</span>
                  {t("bim.categories", "Categories")}
                </Badge>
                <Badge variant="outline" className="gap-1 bg-amber-500/10">
                  <span className="text-amber-500 font-bold">{stats.highlightedCount}</span>
                  {t("bim.keyMetrics", "Key Metrics")}
                </Badge>
              </div>
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
                  <div key={category} className="space-y-2">
                    {/* Category header */}
                    <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                      <Badge
                        variant="outline"
                        className={`text-sm px-3 py-1 ${getCategoryColor(category)}`}
                      >
                        {category}
                      </Badge>
                      <div className="h-px flex-1 bg-border/50" />
                      <span className="text-xs text-muted-foreground">
                        {filteredItems.length} {t("bim.items", "items")}
                      </span>
                    </div>

                    {/* Category table */}
                    <div className="rounded-2xl border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="w-[40%] font-semibold text-xs">
                              {t("bim.property", "Property")}
                            </TableHead>
                            <TableHead className="font-semibold text-xs text-right">
                              {t("bim.value", "Value")}
                            </TableHead>
                            <TableHead className="w-20 font-semibold text-xs text-center">
                              {t("bim.unit", "Unit")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredItems.map((item, idx) => (
                            <TableRow key={`${item.property}-${idx}`}>
                              <TableCell className="font-medium text-sm">{item.property}</TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {item.value}
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">
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
            <div className="rounded-2xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[40%] font-semibold">
                      {t("bim.property", "Property")}
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      {t("bim.value", "Value")}
                    </TableHead>
                    <TableHead className="w-24 font-semibold text-center">
                      {t("bim.unit", "Unit")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => (
                    <TableRow key={`${item.property}-${idx}`}>
                      <TableCell className="font-medium">{item.property}</TableCell>
                      <TableCell className="text-right font-mono">{item.value}</TableCell>
                      <TableCell className="text-center text-muted-foreground">
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
    <div className="space-y-3">
      {Object.entries(groupedData).map(([category, items]) => (
        <div key={category}>
          <Badge variant="outline" className={`text-xs mb-2 ${getCategoryColor(category)}`}>
            {category}
          </Badge>
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="h-6 text-xs font-medium text-muted-foreground py-1">
                  {t("bim.property", "Property")}
                </TableHead>
                <TableHead className="h-6 text-xs font-medium text-muted-foreground py-1 text-right">
                  {t("bim.value", "Value")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={`${item.property}-${idx}`} className="border-border/20">
                  <TableCell className="py-1 text-xs text-muted-foreground">
                    {item.property}
                  </TableCell>
                  <TableCell className="py-1 text-xs text-right font-mono">
                    {item.value}
                    {item.unit && (
                      <span className="text-muted-foreground/70 ml-1">{item.unit}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
