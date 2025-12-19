/**
 * TextureMaterialPanel Component
 *
 * Panel UI for assigning PBR textures to objects (like Blender's Shading panel).
 * Only appears when post-processing is enabled.
 */

import { Button } from "@cadhy/ui/components/button"
import { Input } from "@cadhy/ui/components/input"
import { Label } from "@cadhy/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cadhy/ui/components/select"
import { Separator } from "@cadhy/ui/components/separator"
import { Slider } from "@cadhy/ui/components/slider"
import { PaintBrush01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
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
  /** UV repeat X */
  repeatX?: number
  /** UV repeat Y */
  repeatY?: number
  /** Callback when textures change */
  onTexturesChange?: (maps: PBRTextureMaps) => void
  /** Callback when UV repeat changes */
  onRepeatChange?: (x: number, y: number) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TextureMaterialPanel({
  postProcessingEnabled,
  textureMaps,
  repeatX = 1,
  repeatY = 1,
  onTexturesChange,
  onRepeatChange,
}: TextureMaterialPanelProps) {
  const { t } = useTranslation()
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)
  const [isLoadingTexture, setIsLoadingTexture] = useState(false)
  const [textureLibrary, setTextureLibrary] = useState<TextureInfo[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("concrete")
  const [showLibrary, setShowLibrary] = useState(false)

  // Load texture library from Poly Haven
  const loadTextureLibrary = useCallback(async () => {
    setIsLoadingLibrary(true)
    try {
      const textures = await fetchPolyHavenTextures(selectedCategory, 50)
      setTextureLibrary(textures)
      setShowLibrary(true)
    } catch (error) {
      console.error("Failed to load texture library:", error)
    } finally {
      setIsLoadingLibrary(false)
    }
  }, [selectedCategory])

  // Load and apply a texture
  const applyTexture = useCallback(
    async (textureId: string) => {
      setIsLoadingTexture(true)
      try {
        const maps = await loadPBRTexturesFromPolyHaven(textureId, "1k")
        onTexturesChange?.(maps)
      } catch (error) {
        console.error("Failed to load texture:", error)
      } finally {
        setIsLoadingTexture(false)
      }
    },
    [onTexturesChange]
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
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={PaintBrush01Icon} className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("modeller.properties.textures.title", "PBR Textures")}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTextureLibrary}
          disabled={isLoadingLibrary}
        >
          {isLoadingLibrary
            ? t("modeller.properties.textures.loading", "Loading...")
            : t("modeller.properties.textures.browse", "Browse Library")}
        </Button>
      </div>

      {/* Category Selection */}
      <div className="space-y-2">
        <Label className="text-xs">{t("modeller.properties.textures.category", "Category")}</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXTURE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-xs">
                {t(`modeller.properties.textures.categories.${cat}`, cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Texture Library */}
      {showLibrary && textureLibrary.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">
            {t("modeller.properties.textures.availableTextures", "Available Textures")}
          </Label>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {textureLibrary.map((texture) => (
              <button
                key={texture.id}
                type="button"
                onClick={() => applyTexture(texture.id)}
                disabled={isLoadingTexture}
                className="relative aspect-square rounded border border-border hover:border-primary transition-colors overflow-hidden group"
                title={texture.name}
              >
                <img
                  src={texture.previewUrl}
                  alt={texture.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] text-white text-center px-1">{texture.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Texture Info */}
      {textureMaps && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs">
              {t("modeller.properties.textures.currentMaps", "Current Maps")}
            </Label>
            <div className="space-y-1 text-xs">
              {textureMaps.albedo && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>{t("modeller.properties.textures.albedo", "Albedo")}</span>
                </div>
              )}
              {textureMaps.normal && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>{t("modeller.properties.textures.normal", "Normal")}</span>
                </div>
              )}
              {textureMaps.roughness && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{t("modeller.properties.textures.roughness", "Roughness")}</span>
                </div>
              )}
              {textureMaps.metalness && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>{t("modeller.properties.textures.metalness", "Metalness")}</span>
                </div>
              )}
              {textureMaps.ao && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  <span>{t("modeller.properties.textures.ao", "AO")}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* UV Tiling */}
      <Separator />
      <div className="space-y-3">
        <Label className="text-xs">{t("modeller.properties.textures.uvTiling", "UV Tiling")}</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs w-8">X:</Label>
            <Slider
              value={[repeatX]}
              onValueChange={([x]) => onRepeatChange?.(x, repeatY)}
              min={0.1}
              max={10}
              step={0.1}
              className="flex-1"
            />
            <Input
              type="number"
              value={repeatX.toFixed(1)}
              onChange={(e) => onRepeatChange?.(Number.parseFloat(e.target.value), repeatY)}
              className="w-16 h-7 text-xs"
              min={0.1}
              max={10}
              step={0.1}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-8">Y:</Label>
            <Slider
              value={[repeatY]}
              onValueChange={([y]) => onRepeatChange?.(repeatX, y)}
              min={0.1}
              max={10}
              step={0.1}
              className="flex-1"
            />
            <Input
              type="number"
              value={repeatY.toFixed(1)}
              onChange={(e) => onRepeatChange?.(repeatX, Number.parseFloat(e.target.value))}
              className="w-16 h-7 text-xs"
              min={0.1}
              max={10}
              step={0.1}
            />
          </div>
        </div>
      </div>

      {/* Clear Textures */}
      {textureMaps && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTexturesChange?.({})}
          className="w-full"
        >
          {t("modeller.properties.textures.clear", "Clear Textures")}
        </Button>
      )}
    </div>
  )
}

export default TextureMaterialPanel
