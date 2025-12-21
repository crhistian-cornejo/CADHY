/**
 * TextureMaterialPanel Component
 *
 * Panel UI for assigning PBR textures to objects with:
 * - Horizontal carousels per category
 * - Improved 2D texture previews
 * - "See all" expandable views
 */

import { Button } from "@cadhy/ui/components/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@cadhy/ui/components/carousel"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@cadhy/ui/components/collapsible"
import { Input } from "@cadhy/ui/components/input"
import { Label } from "@cadhy/ui/components/label"
import { ScrollArea } from "@cadhy/ui/components/scroll-area"
import { Separator } from "@cadhy/ui/components/separator"
import { Slider } from "@cadhy/ui/components/slider"
import { cn } from "@cadhy/ui/lib/utils"
import { ArrowDown01Icon, ArrowRight01Icon, PaintBrush01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  fetchPolyHavenTextures,
  loadPBRTexturesFromPolyHaven,
  type PBRTextureMaps,
  TEXTURE_CATEGORIES,
  type TextureInfo,
} from "@/services/texture-service"

// ============================================================================
// TYPES
// ============================================================================

export interface TextureMaterialPanelProps {
  /** Whether post-processing is enabled */
  postProcessingEnabled: boolean
  /** Current texture maps */
  textureMaps?: PBRTextureMaps
  /** Current texture ID */
  currentTextureId?: string
  /** UV repeat X */
  repeatX?: number
  /** UV repeat Y */
  repeatY?: number
  /** Callback when textures change */
  onTexturesChange?: (maps: PBRTextureMaps, textureId: string) => void
  /** Callback when UV repeat changes */
  onRepeatChange?: (x: number, y: number) => void
}

interface CategoryCarouselProps {
  category: string
  textures: TextureInfo[]
  currentTextureId?: string
  isLoading: boolean
  isOpen: boolean
  onToggle: () => void
  onSelect: (texture: TextureInfo) => void
  onSeeAll: () => void
}

// ============================================================================
// TEXTURE PREVIEW COMPONENT
// ============================================================================

interface TexturePreviewProps {
  texture: TextureInfo
  isSelected: boolean
  isLoading: boolean
  onClick: () => void
}

function TexturePreview({ texture, isSelected, isLoading, onClick }: TexturePreviewProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "relative w-14 h-14 rounded-lg overflow-hidden transition-all group",
        "border-2 hover:scale-105 hover:shadow-md",
        isSelected
          ? "border-primary ring-2 ring-primary/30"
          : "border-transparent hover:border-primary/50"
      )}
      title={texture.name}
    >
      <img
        src={texture.previewUrl}
        alt={texture.name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = "none"
        }}
      />
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
          <svg
            className="w-2 h-2 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {/* Hover overlay with name */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none p-0.5">
        <span className="text-[8px] text-white text-center leading-tight line-clamp-2">
          {texture.name}
        </span>
      </div>
    </button>
  )
}

// ============================================================================
// CATEGORY CAROUSEL COMPONENT
// ============================================================================

function CategoryCarousel({
  category,
  textures,
  currentTextureId,
  isLoading,
  isOpen,
  onToggle,
  onSelect,
  onSeeAll,
}: CategoryCarouselProps) {
  const { t } = useTranslation()

  // Don't hide categories completely, just show them collapsed
  const hasContent = textures.length > 0 || isLoading

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      {/* Category Header - Always visible */}
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-1.5 hover:text-foreground transition-colors group">
          <HugeiconsIcon
            icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon}
            className="size-3 text-muted-foreground group-hover:text-foreground transition-colors"
          />
          <h3 className="text-xs font-medium text-muted-foreground group-hover:text-foreground capitalize transition-colors">
            {t(`modeller.properties.textures.categories.${category}`, category)}
          </h3>
          {!isOpen && textures.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60">({textures.length})</span>
          )}
        </CollapsibleTrigger>
        {isOpen && hasContent && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] text-muted-foreground hover:text-foreground gap-0.5 px-1"
            onClick={onSeeAll}
          >
            {t("modeller.properties.textures.seeAll", "See all")}
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3" />
          </Button>
        )}
      </div>

      {/* Collapsible Content - Carousel */}
      <CollapsibleContent>
        <div className="relative px-8 mt-2">
          {isLoading ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-14 h-14 rounded-lg bg-muted animate-pulse shrink-0" />
              ))}
            </div>
          ) : textures.length > 0 ? (
            <Carousel
              opts={{
                align: "start",
                dragFree: true,
                containScroll: "trimSnaps",
              }}
            >
              <CarouselContent className="-ml-2">
                {textures.slice(0, 12).map((texture) => (
                  <CarouselItem key={texture.id} className="pl-2 basis-auto">
                    <TexturePreview
                      texture={texture}
                      isSelected={currentTextureId === texture.id}
                      isLoading={isLoading}
                      onClick={() => onSelect(texture)}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 h-6 w-6" />
              <CarouselNext className="right-0 h-6 w-6" />
            </Carousel>
          ) : (
            <p className="text-xs text-muted-foreground/60 py-2">
              {t("modeller.properties.textures.noTextures", "No textures available")}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// EXPANDED CATEGORY VIEW
// ============================================================================

interface ExpandedCategoryViewProps {
  category: string
  textures: TextureInfo[]
  currentTextureId?: string
  isLoading: boolean
  onSelect: (texture: TextureInfo) => void
  onClose: () => void
}

function ExpandedCategoryView({
  category,
  textures,
  currentTextureId,
  isLoading,
  onSelect,
  onClose,
}: ExpandedCategoryViewProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onClose}>
          {t("common.close", "Close")}
        </Button>
        <span className="text-sm font-medium capitalize">{category}</span>
        <span className="text-xs text-muted-foreground">({textures.length})</span>
      </div>

      {/* Grid of all textures */}
      <ScrollArea className="h-64">
        {isLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array(12)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 pr-2">
            {textures.map((texture) => (
              <TexturePreview
                key={texture.id}
                texture={texture}
                isSelected={currentTextureId === texture.id}
                isLoading={false}
                onClick={() => onSelect(texture)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Categories that are expanded by default
const DEFAULT_EXPANDED_CATEGORIES = new Set(["concrete", "metal"])

export function TextureMaterialPanel({
  postProcessingEnabled,
  textureMaps,
  currentTextureId,
  repeatX = 1,
  repeatY = 1,
  onTexturesChange,
  onRepeatChange,
}: TextureMaterialPanelProps) {
  const { t } = useTranslation()
  const [isLoadingTexture, setIsLoadingTexture] = useState(false)
  const [texturesByCategory, setTexturesByCategory] = useState<Record<string, TextureInfo[]>>({})
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set())
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  // Track which categories are open (not collapsed)
  const [openCategories, setOpenCategories] = useState<Set<string>>(DEFAULT_EXPANDED_CATEGORIES)

  // Toggle category open/closed state
  const toggleCategory = useCallback((category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  // Load textures for a category
  const loadCategoryTextures = useCallback(
    async (category: string) => {
      if (texturesByCategory[category] || loadingCategories.has(category)) {
        return
      }

      setLoadingCategories((prev) => new Set(prev).add(category))
      try {
        const textures = await fetchPolyHavenTextures(category, 20)
        setTexturesByCategory((prev) => ({ ...prev, [category]: textures }))
      } catch (error) {
        console.error(`Failed to load ${category} textures:`, error)
        setTexturesByCategory((prev) => ({ ...prev, [category]: [] }))
      } finally {
        setLoadingCategories((prev) => {
          const next = new Set(prev)
          next.delete(category)
          return next
        })
      }
    },
    [texturesByCategory, loadingCategories]
  )

  // Load initial categories on mount
  useEffect(() => {
    if (!postProcessingEnabled || initialLoadDone) return

    // Load first 4 categories initially
    const initialCategories = TEXTURE_CATEGORIES.slice(0, 4)
    for (const category of initialCategories) {
      loadCategoryTextures(category)
    }
    setInitialLoadDone(true)
  }, [postProcessingEnabled, initialLoadDone, loadCategoryTextures])

  // Load remaining categories when user scrolls or interacts
  const loadRemainingCategories = useCallback(() => {
    const remainingCategories = TEXTURE_CATEGORIES.slice(4)
    for (const category of remainingCategories) {
      loadCategoryTextures(category)
    }
  }, [loadCategoryTextures])

  // Load and apply a texture
  const applyTexture = useCallback(
    async (texture: TextureInfo) => {
      setIsLoadingTexture(true)
      try {
        const maps = await loadPBRTexturesFromPolyHaven(texture.id, "1k")
        onTexturesChange?.(maps, texture.id)
      } catch (error) {
        console.error("Failed to load texture:", error)
      } finally {
        setIsLoadingTexture(false)
      }
    },
    [onTexturesChange]
  )

  // Handle "See all" click
  const handleSeeAll = useCallback(
    (category: string) => {
      setExpandedCategory(category)
      loadCategoryTextures(category)
    },
    [loadCategoryTextures]
  )

  // Don't show if post-processing is disabled
  if (!postProcessingEnabled) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={PaintBrush01Icon} className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("modeller.properties.textures.title", "PBR Textures")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            "modeller.properties.textures.enablePostProcessing",
            "Enable post-processing in viewport settings to use PBR textures."
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center gap-2">
        <HugeiconsIcon icon={PaintBrush01Icon} className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {t("modeller.properties.textures.title", "PBR Textures")}
        </span>
      </div>

      {/* Expanded Category View */}
      {expandedCategory ? (
        <div className="px-4">
          <ExpandedCategoryView
            category={expandedCategory}
            textures={texturesByCategory[expandedCategory] || []}
            currentTextureId={currentTextureId}
            isLoading={loadingCategories.has(expandedCategory)}
            onSelect={applyTexture}
            onClose={() => setExpandedCategory(null)}
          />
        </div>
      ) : (
        /* Category Carousels */
        <ScrollArea className="h-[280px]" onScrollCapture={loadRemainingCategories}>
          <div className="px-4 space-y-3">
            {TEXTURE_CATEGORIES.map((category) => (
              <CategoryCarousel
                key={category}
                category={category}
                textures={texturesByCategory[category] || []}
                currentTextureId={currentTextureId}
                isLoading={loadingCategories.has(category)}
                isOpen={openCategories.has(category)}
                onToggle={() => toggleCategory(category)}
                onSelect={applyTexture}
                onSeeAll={() => handleSeeAll(category)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <Separator />

      {/* Current Texture & UV Controls */}
      <div className="px-4 pb-4 space-y-4">
        {/* Current Texture Preview */}
        {currentTextureId && (
          <div className="space-y-2">
            <Label className="text-xs">
              {t("modeller.properties.textures.appliedTexture", "Applied Texture")}
            </Label>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shadow-md">
                <img
                  src={`https://cdn.polyhaven.com/asset_img/primary/${currentTextureId}.png?height=128`}
                  alt={currentTextureId}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium truncate">{currentTextureId}</p>
                {/* Map indicators */}
                {textureMaps && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {textureMaps.albedo && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>Albedo</span>
                      </div>
                    )}
                    {textureMaps.normal && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span>Normal</span>
                      </div>
                    )}
                    {textureMaps.roughness && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span>Rough</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* UV Tiling */}
        <div className="space-y-2">
          <Label className="text-xs">
            {t("modeller.properties.textures.uvTiling", "UV Tiling")}
          </Label>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] w-12 text-muted-foreground">Scale:</Label>
            <Slider
              value={[(repeatX + repeatY) / 2]}
              onValueChange={([scale]) => onRepeatChange?.(scale, scale)}
              min={0.1}
              max={10}
              step={0.1}
              className="flex-1"
            />
            <Input
              type="text"
              value={((repeatX + repeatY) / 2).toFixed(1)}
              onChange={(e) => {
                const value = e.target.value
                if (value === "" || value === "." || value === "-" || value.endsWith(".")) return
                const num = Number.parseFloat(value)
                if (!Number.isNaN(num) && num >= 0.1 && num <= 10) {
                  onRepeatChange?.(num, num)
                }
              }}
              onBlur={(e) => {
                const value = e.target.value
                if (value === "" || value === "." || value === "-") {
                  onRepeatChange?.(1, 1)
                  return
                }
                const num = Number.parseFloat(value)
                if (Number.isNaN(num) || num < 0.1) {
                  onRepeatChange?.(1, 1)
                } else if (num > 10) {
                  onRepeatChange?.(10, 10)
                }
              }}
              className="w-14 h-6 text-xs"
            />
          </div>
        </div>

        {/* Clear Textures Button */}
        {textureMaps && Object.keys(textureMaps).length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTexturesChange?.({}, "")}
            className="w-full h-7 text-xs"
          >
            {t("modeller.properties.textures.clear", "Clear Textures")}
          </Button>
        )}
      </div>
    </div>
  )
}

export default TextureMaterialPanel
