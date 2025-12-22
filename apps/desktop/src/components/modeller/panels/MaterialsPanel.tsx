/**
 * Materials Panel - CADHY
 *
 * Left-side materials panel inspired by Plasticity with:
 * - Used materials (active in scene)
 * - All materials library with visual grid
 * - Material preview thumbnails
 * - Quick assign on click
 */

import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
  ScrollArea,
  Separator,
} from "@cadhy/ui"
import { ArrowDown01Icon, Settings01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

// ============================================================================
// TYPES
// ============================================================================

interface MaterialsPanelProps {
  className?: string
  onMaterialSelect?: (materialId: string) => void
  onOpenMaterialEditor?: (materialId: string) => void
}

interface MaterialPreset {
  id: string
  name: string
  type: "PBR" | "Basic" | "Matcap"
  color: string
  metalness?: number
  roughness?: number
  preview?: string // Base64 or URL
}

// ============================================================================
// MATERIAL PRESETS (Plasticity-style)
// ============================================================================

const USED_MATERIALS: MaterialPreset[] = [
  {
    id: "default",
    name: "Default material",
    type: "PBR",
    color: "#808080",
    metalness: 0,
    roughness: 0.5,
  },
  {
    id: "new-material",
    name: "New material",
    type: "PBR",
    color: "#e74c3c",
    metalness: 0.2,
    roughness: 0.4,
  },
]

const ALL_MATERIALS: MaterialPreset[] = [
  {
    id: "aluminum",
    name: "Aluminum",
    type: "PBR",
    color: "#d4d4d4",
    metalness: 0.9,
    roughness: 0.3,
  },
  {
    id: "aluminum-brushed",
    name: "Aluminum brushed",
    type: "PBR",
    color: "#c0c0c0",
    metalness: 0.85,
    roughness: 0.45,
  },
  {
    id: "aluminum-matte",
    name: "Aluminum matte",
    type: "PBR",
    color: "#b8b8b8",
    metalness: 0.7,
    roughness: 0.6,
  },
  {
    id: "gold-foil",
    name: "Gold foil",
    type: "PBR",
    color: "#ffd700",
    metalness: 1,
    roughness: 0.1,
  },
  {
    id: "white-plastic",
    name: "White plastic",
    type: "PBR",
    color: "#f5f5f5",
    metalness: 0,
    roughness: 0.4,
  },
  { id: "rubber", name: "Rubber", type: "PBR", color: "#2c2c2c", metalness: 0, roughness: 0.9 },
  {
    id: "plastic-rough",
    name: "Plastic rough",
    type: "PBR",
    color: "#4a4a4a",
    metalness: 0,
    roughness: 0.7,
  },
  { id: "nickel", name: "Nickel", type: "PBR", color: "#c4c4c4", metalness: 0.95, roughness: 0.2 },
  {
    id: "nickel-oxidized",
    name: "Nickel oxidized",
    type: "PBR",
    color: "#a0a090",
    metalness: 0.8,
    roughness: 0.5,
  },
  { id: "iron", name: "Iron", type: "PBR", color: "#4a4a4a", metalness: 0.9, roughness: 0.4 },
  { id: "gold", name: "Gold", type: "PBR", color: "#ffd700", metalness: 1, roughness: 0.15 },
  { id: "copper", name: "Copper", type: "PBR", color: "#b87333", metalness: 1, roughness: 0.2 },
  {
    id: "copper-oxidized",
    name: "Copper oxidized",
    type: "PBR",
    color: "#4a9c7a",
    metalness: 0.6,
    roughness: 0.6,
  },
  {
    id: "copper-brushed",
    name: "Copper brushed",
    type: "PBR",
    color: "#b87333",
    metalness: 0.9,
    roughness: 0.4,
  },
  {
    id: "copper-old",
    name: "Copper old",
    type: "PBR",
    color: "#8b4513",
    metalness: 0.7,
    roughness: 0.5,
  },
  { id: "chrome", name: "Chrome", type: "PBR", color: "#e8e8e8", metalness: 1, roughness: 0.05 },
]

// ============================================================================
// MATERIAL THUMBNAIL
// ============================================================================

interface MaterialThumbnailProps {
  material: MaterialPreset
  selected?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
  size?: "sm" | "md"
}

function MaterialThumbnail({
  material,
  selected,
  onClick,
  onDoubleClick,
  size = "md",
}: MaterialThumbnailProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
  }

  // Generate a simple gradient preview based on material properties
  const generatePreview = () => {
    const baseColor = material.color
    const metalness = material.metalness ?? 0
    const roughness = material.roughness ?? 0.5

    // Create gradient based on metalness/roughness
    const highlight = metalness > 0.5 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)"
    const shadow = `rgba(0,0,0,${0.3 + roughness * 0.3})`

    return `linear-gradient(135deg, ${highlight} 0%, ${baseColor} 30%, ${baseColor} 70%, ${shadow} 100%)`
  }

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "relative rounded-md overflow-hidden transition-all border-2",
        sizeClasses[size],
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-transparent hover:border-border/60"
      )}
      title={material.name}
    >
      {/* Material Preview */}
      <div className="w-full h-full" style={{ background: generatePreview() }} />

      {/* Type indicator */}
      {material.type === "PBR" && (
        <span className="absolute bottom-0.5 right-0.5 text-[8px] font-medium text-white/80 bg-black/40 px-1 rounded">
          PBR
        </span>
      )}
    </button>
  )
}

// ============================================================================
// MATERIAL ROW (for used materials)
// ============================================================================

interface MaterialRowProps {
  material: MaterialPreset
  selected?: boolean
  onClick?: () => void
  onSettingsClick?: () => void
}

function MaterialRow({ material, selected, onClick, onSettingsClick }: MaterialRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors rounded-md",
        selected ? "bg-primary/10" : "hover:bg-muted/50"
      )}
    >
      {/* Color indicator */}
      <div
        className="w-4 h-4 rounded-full ring-1 ring-border/40"
        style={{ backgroundColor: material.color }}
      />

      {/* Name */}
      <span className="flex-1 text-sm truncate">{material.name}</span>

      {/* Type badge */}
      <span className="text-[10px] text-muted-foreground uppercase">{material.type}</span>

      {/* Settings button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          onSettingsClick?.()
        }}
      >
        <HugeiconsIcon icon={Settings01Icon} className="size-3" />
      </Button>
    </div>
  )
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

interface SectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  action?: React.ReactNode
}

function Section({ title, defaultOpen = true, children, action }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors">
        <span className="text-[11px] font-medium text-muted-foreground">{title}</span>
        <div className="flex items-center gap-1">
          {action}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className={cn(
              "size-3 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MaterialsPanel({
  className,
  onMaterialSelect,
  onOpenMaterialEditor,
}: MaterialsPanelProps) {
  const { t } = useTranslation()
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("default")

  const handleMaterialClick = (material: MaterialPreset) => {
    setSelectedMaterialId(material.id)
    onMaterialSelect?.(material.id)
  }

  const handleMaterialDoubleClick = (material: MaterialPreset) => {
    onOpenMaterialEditor?.(material.id)
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <ScrollArea className="flex-1">
        {/* Used Materials Section */}
        <Section title={t("materials.usedMaterials", "Used materials")}>
          <div className="px-2 pb-2 space-y-0.5">
            {USED_MATERIALS.map((material) => (
              <MaterialRow
                key={material.id}
                material={material}
                selected={selectedMaterialId === material.id}
                onClick={() => handleMaterialClick(material)}
                onSettingsClick={() => handleMaterialDoubleClick(material)}
              />
            ))}
          </div>
        </Section>

        <Separator className="my-1" />

        {/* All Materials Grid */}
        <Section title={t("materials.allMaterials", "All materials")}>
          <div className="px-3 pb-3">
            <div className="grid grid-cols-2 gap-2">
              {ALL_MATERIALS.map((material) => (
                <div key={material.id} className="flex flex-col items-center gap-1">
                  <MaterialThumbnail
                    material={material}
                    selected={selectedMaterialId === material.id}
                    onClick={() => handleMaterialClick(material)}
                    onDoubleClick={() => handleMaterialDoubleClick(material)}
                  />
                  <span className="text-[10px] text-muted-foreground text-center truncate w-full">
                    {material.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </ScrollArea>
    </div>
  )
}

export default MaterialsPanel
