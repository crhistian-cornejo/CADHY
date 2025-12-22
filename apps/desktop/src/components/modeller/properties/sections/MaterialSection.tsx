/**
 * MaterialSection Component - CADHY
 *
 * Basic material controls (color, opacity, metalness, roughness)
 * for shape objects.
 */

import { Slider } from "@cadhy/ui"
import { PaintBrush01Icon } from "@hugeicons/core-free-icons"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import type { ShapeObject } from "@/stores/modeller"
import { PropertyRow } from "../shared/PropertyRow"
import { PropertySection } from "../shared/PropertySection"

// ============================================================================
// TYPES
// ============================================================================

export interface MaterialSectionProps {
  object: ShapeObject
  onUpdate: (updates: Partial<ShapeObject>) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MaterialSection({ object, onUpdate }: MaterialSectionProps) {
  const { t } = useTranslation()

  const handleColorChange = useCallback(
    (color: string) => {
      onUpdate({
        material: { ...object.material, color },
      })
    },
    [object.material, onUpdate]
  )

  const handleOpacityChange = useCallback(
    (opacity: number[]) => {
      onUpdate({
        material: { ...object.material, opacity: opacity[0] },
      })
    },
    [object.material, onUpdate]
  )

  const handleMetalnessChange = useCallback(
    (metalness: number[]) => {
      onUpdate({
        material: { ...object.material, metalness: metalness[0] },
      })
    },
    [object.material, onUpdate]
  )

  const handleRoughnessChange = useCallback(
    (roughness: number[]) => {
      onUpdate({
        material: { ...object.material, roughness: roughness[0] },
      })
    },
    [object.material, onUpdate]
  )

  return (
    <PropertySection title={t("properties.material")} icon={PaintBrush01Icon}>
      <PropertyRow label={t("properties.color")}>
        <div className="flex items-center gap-2">
          {/* Color swatch with hidden color picker */}
          <label className="relative cursor-pointer group">
            <div
              className="size-7 rounded-full border-2 border-border/50 shadow-sm transition-all group-hover:scale-105 group-hover:shadow-md"
              style={{ backgroundColor: object.material.color }}
            />
            <input
              type="color"
              value={object.material.color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
          {/* Hex value display */}
          <span className="text-[10px] text-muted-foreground font-mono uppercase">
            {object.material.color}
          </span>
        </div>
      </PropertyRow>
      <PropertyRow label={t("properties.opacity")}>
        <div className="flex items-center gap-2">
          <Slider
            value={[object.material.opacity]}
            onValueChange={handleOpacityChange}
            min={0}
            max={1}
            step={0.1}
            className="flex-1"
          />
          <span className="w-8 text-[10px] text-muted-foreground text-right">
            {Math.round(object.material.opacity * 100)}%
          </span>
        </div>
      </PropertyRow>
      <PropertyRow label={t("properties.metalness")}>
        <div className="flex items-center gap-2">
          <Slider
            value={[object.material.metalness]}
            onValueChange={handleMetalnessChange}
            min={0}
            max={1}
            step={0.1}
            className="flex-1"
          />
          <span className="w-8 text-[10px] text-muted-foreground text-right">
            {Math.round(object.material.metalness * 100)}%
          </span>
        </div>
      </PropertyRow>
      <PropertyRow label={t("properties.roughness")}>
        <div className="flex items-center gap-2">
          <Slider
            value={[object.material.roughness]}
            onValueChange={handleRoughnessChange}
            min={0}
            max={1}
            step={0.1}
            className="flex-1"
          />
          <span className="w-8 text-[10px] text-muted-foreground text-right">
            {Math.round(object.material.roughness * 100)}%
          </span>
        </div>
      </PropertyRow>
    </PropertySection>
  )
}
