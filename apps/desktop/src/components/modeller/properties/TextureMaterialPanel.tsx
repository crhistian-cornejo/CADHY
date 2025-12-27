/**
 * TextureMaterialPanel Component
 *
 * Panel UI for assigning PBR textures to objects with:
 * - Select-based category filter
 * - Grid of texture previews with names
 */

import {
  Button,
  cn,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "@cadhy/ui"
import { PaintBrush01Icon } from "@hugeicons/core-free-icons"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  fetchPolyHavenTextures,
  loadPBRTexturesFromPolyHaven,
  type PBRTextureMaps,
  TEXTURE_CATEGORIES,
  type TextureInfo,
} from "@/services/texture-service"
import { PropertySection } from "./shared/PropertySection"

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
    <div className="flex flex-col gap-1.5 group">
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className={cn(
          "relative aspect-[16/9] w-full rounded-2xl overflow-hidden transition-all duration-200",
          "border border-border hover:border-primary/50 bg-muted outline-none",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary"
        )}
        title={texture.name}
      >
        <img
          src={texture.previewUrl}
          alt={texture.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center shadow-lg">
            <svg
              className="w-2.5 h-2.5 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={4}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </button>
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate px-0.5">
        {texture.name}
      </span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  const [selectedCategory, setSelectedCategory] = useState<string>("concrete")
  const [isLoading, setIsLoading] = useState(false)
  const [textures, setTextures] = useState<TextureInfo[]>([])
  const [isLoadingTexture, setIsLoadingTexture] = useState(false)

  // Load textures based on category
  const loadTextures = useCallback(async (category: string) => {
    setIsLoading(true)
    try {
      if (category === "all") {
        // Fetch 2 textures from each category to get a diverse mix
        // Use a limit of 2 for each category fetch
        const results = await Promise.all(
          TEXTURE_CATEGORIES.map((cat) => fetchPolyHavenTextures(cat, 2))
        )
        // Flatten and shuffle
        setTextures(results.flat().sort(() => Math.random() - 0.5))
      } else {
        const results = await fetchPolyHavenTextures(category, 24)
        setTextures(results)
      }
    } catch (error) {
      console.error("Failed to load textures:", error)
      setTextures([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!postProcessingEnabled) return
    loadTextures(selectedCategory)
  }, [postProcessingEnabled, selectedCategory, loadTextures])

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

  if (!postProcessingEnabled) {
    return (
      <PropertySection
        title={t("modeller.properties.textures.title", "PBR Textures")}
        icon={PaintBrush01Icon}
        defaultOpen={false}
      >
        <p className="text-xs text-muted-foreground">
          {t(
            "modeller.properties.textures.enablePostProcessing",
            "Enable post-processing in viewport settings to use PBR textures."
          )}
        </p>
      </PropertySection>
    )
  }

  return (
    <PropertySection
      title={t("modeller.properties.textures.title", "PBR Textures")}
      icon={PaintBrush01Icon}
      defaultOpen={false}
    >
      <div className="space-y-3">
        {/* Category Selector */}
        <Select value={selectedCategory} onValueChange={(val) => val && setSelectedCategory(val)}>
          <SelectTrigger className="w-full h-8 text-xs bg-muted/30 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="bottom" align="center">
            <SelectItem value="all">
              {t("modeller.properties.textures.allMaterials", "All materials")}
            </SelectItem>
            {TEXTURE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="capitalize">
                {t(`modeller.properties.textures.categories.${cat}`, cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Texture Grid - contained with proper height and overflow */}
        <div className="relative h-[180px] rounded-2xl border border-border bg-muted/20 overflow-hidden">
          <ScrollArea className="h-full" showFadeMasks>
            <div className="p-2">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col gap-1.5 animate-pulse">
                      <div className="aspect-[16/9] w-full rounded-2xl bg-muted" />
                      <div className="h-2.5 w-1/2 rounded-2xl bg-muted" />
                    </div>
                  ))}
                </div>
              ) : textures.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {textures.map((texture) => (
                    <TexturePreview
                      key={texture.id}
                      texture={texture}
                      isSelected={currentTextureId === texture.id}
                      isLoading={isLoadingTexture}
                      onClick={() => applyTexture(texture)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[60px] text-center text-muted-foreground">
                  <p className="text-xs">
                    {t("modeller.properties.textures.noTextures", "No textures found")}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Current Texture Info */}
        {currentTextureId && (
          <div className="bg-muted/30 rounded-2xl p-2 border border-border">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl overflow-hidden shadow-inner bg-muted border border-border shrink-0">
                <img
                  src={`https://cdn.polyhaven.com/asset_img/primary/${currentTextureId}.png?height=128`}
                  alt={currentTextureId}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{currentTextureId}</p>
                {textureMaps && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {["albedo", "normal", "roughness", "ao"].map(
                      (map) =>
                        textureMaps[map as keyof PBRTextureMaps] && (
                          <span
                            key={map}
                            className="text-xs px-1 rounded-2xl bg-muted text-muted-foreground uppercase font-bold border border-border"
                          >
                            {map.slice(0, 3)}
                          </span>
                        )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* UV Tiling */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase tracking-tight">
              {t("modeller.properties.textures.uvTiling", "UV Tiling")}
            </Label>
            <span className="text-xs font-mono text-muted-foreground">
              {((repeatX + repeatY) / 2).toFixed(1)}x
            </span>
          </div>
          <div className="flex items-center gap-2">
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
                const num = Number.parseFloat(value)
                if (!Number.isNaN(num) && num >= 0.1 && num <= 10) {
                  onRepeatChange?.(num, num)
                }
              }}
              className="w-10 h-6 text-xs text-center bg-muted"
            />
          </div>
        </div>

        {/* Clear Button */}
        {currentTextureId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTexturesChange?.({}, "")}
            className="w-full h-6 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border"
          >
            {t("modeller.properties.textures.clear", "Clear selection")}
          </Button>
        )}
      </div>
    </PropertySection>
  )
}

export default TextureMaterialPanel
