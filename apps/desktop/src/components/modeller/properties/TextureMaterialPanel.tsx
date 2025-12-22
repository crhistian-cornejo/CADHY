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
  Separator,
  Slider,
} from "@cadhy/ui"
import { PaintBrush01Icon } from "@hugeicons/core-free-icons"
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
          "relative aspect-[16/9] w-full rounded-md overflow-hidden transition-all duration-200",
          "border border-zinc-500/30 hover:border-primary/50 bg-muted outline-none",
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
      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors truncate px-0.5">
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
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
    <div className="flex flex-col h-full bg-background/50">
      <div className="px-3 pt-3 pb-2 space-y-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={PaintBrush01Icon} className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t("modeller.properties.textures.title", "PBR Textures")}
          </span>
        </div>

        <Select value={selectedCategory} onValueChange={(val) => val && setSelectedCategory(val)}>
          <SelectTrigger className="w-full h-8 text-xs bg-muted/30 border-zinc-500/20">
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
      </div>

      <ScrollArea className="flex-1 px-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 py-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col gap-1.5 animate-pulse">
                <div className="aspect-[16/9] w-full rounded-md bg-muted" />
                <div className="h-2.5 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : textures.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 py-2">
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
          <div className="flex flex-col items-center justify-center min-h-[100px] text-center text-muted-foreground">
            <p className="text-xs">
              {t("modeller.properties.textures.noTextures", "No textures found")}
            </p>
          </div>
        )}
      </ScrollArea>

      <Separator className="my-2 bg-border/40" />

      <div className="px-3 pb-3 space-y-4">
        {currentTextureId && (
          <div className="bg-muted/30 rounded-lg p-2 border border-zinc-500/10">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-md overflow-hidden shadow-inner bg-zinc-900 border border-white/5 shrink-0">
                <img
                  src={`https://cdn.polyhaven.com/asset_img/primary/${currentTextureId}.png?height=128`}
                  alt={currentTextureId}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-zinc-300 truncate">{currentTextureId}</p>
                {textureMaps && (
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {["albedo", "normal", "roughness", "ao"].map(
                      (map) =>
                        textureMaps[map as keyof PBRTextureMaps] && (
                          <span
                            key={map}
                            className="text-[8px] px-1 rounded bg-zinc-800 text-zinc-500 uppercase font-bold border border-white/5"
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {t("modeller.properties.textures.uvTiling", "UV Tiling")}
            </Label>
            <span className="text-[10px] font-mono text-zinc-400">
              {((repeatX + repeatY) / 2).toFixed(1)}x
            </span>
          </div>
          <div className="flex items-center gap-3">
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
              className="w-12 h-6 text-[10px] text-center bg-zinc-900"
            />
          </div>
        </div>

        {currentTextureId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTexturesChange?.({}, "")}
            className="w-full h-7 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-zinc-500/10"
          >
            {t("modeller.properties.textures.clear", "Clear selection")}
          </Button>
        )}
      </div>
    </div>
  )
}

export default TextureMaterialPanel
