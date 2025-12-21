/**
 * MultipleSelection Component - CADHY
 *
 * UI for when multiple objects are selected.
 * Allows batch operations and common property editing.
 */

import { Button } from "@cadhy/ui"
import { Copy01Icon, Delete01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { AnySceneObject } from "@/stores/modeller-store"
import { TextureMaterialPanel } from "../TextureMaterialPanel"

// ============================================================================
// TYPES
// ============================================================================

export interface MultipleSelectionProps {
  count: number
  selectedObjects: AnySceneObject[]
  postProcessingEnabled: boolean
  onDelete: () => void
  onDuplicate: () => void
  onUpdateAll: (updates: Partial<AnySceneObject>) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MultipleSelection({
  count,
  selectedObjects,
  postProcessingEnabled,
  onDelete,
  onDuplicate,
  onUpdateAll,
}: MultipleSelectionProps) {
  const { t } = useTranslation()

  // Find common texture ID (if all objects have the same texture)
  const commonTextureId = useMemo(() => {
    const textureIds = selectedObjects
      .map((obj) => obj.material?.pbr?.albedoTextureId)
      .filter(Boolean)

    if (textureIds.length === 0) return undefined
    const firstId = textureIds[0]
    const allSame = textureIds.every((id) => id === firstId)
    return allSame ? firstId : undefined
  }, [selectedObjects])

  // Find common UV repeat values (if all objects have the same values)
  const commonRepeat = useMemo(() => {
    const repeatXs = selectedObjects.map((obj) => obj.material?.pbr?.repeatX ?? 1)
    const repeatYs = selectedObjects.map((obj) => obj.material?.pbr?.repeatY ?? 1)

    const allSameX = repeatXs.every((x) => x === repeatXs[0])
    const allSameY = repeatYs.every((y) => y === repeatYs[0])

    return {
      x: allSameX ? repeatXs[0] : 1,
      y: allSameY ? repeatYs[0] : 1,
    }
  }, [selectedObjects])

  return (
    <div>
      {/* Header */}
      <div className="px-3 py-3 border-b border-border/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium">
            {t("properties.multipleSelected", { count })} {t("properties.objects", "objects")}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-xs" onClick={onDuplicate} className="h-6 w-6">
              <HugeiconsIcon icon={Copy01Icon} className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDelete}
              className="h-6 w-6 text-destructive hover:text-destructive"
            >
              <HugeiconsIcon icon={Delete01Icon} className="size-3" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {t("properties.multipleEditInfo", "Changes will apply to all selected objects")}
        </p>
      </div>

      {/* PBR Textures - Common Properties */}
      <TextureMaterialPanel
        postProcessingEnabled={postProcessingEnabled}
        currentTextureId={commonTextureId}
        repeatX={commonRepeat.x}
        repeatY={commonRepeat.y}
        onTexturesChange={(maps, textureId) => {
          // Apply texture to all selected objects
          onUpdateAll({
            material: {
              pbr: {
                albedoTextureId: textureId,
                normalTextureId: maps.normal ? textureId : undefined,
                roughnessTextureId: maps.roughness ? textureId : undefined,
                metalnessTextureId: maps.metalness ? textureId : undefined,
                aoTextureId: maps.ao ? textureId : undefined,
                // Preserve current UV repeat values
                repeatX: commonRepeat.x,
                repeatY: commonRepeat.y,
              },
            },
          })
        }}
        onRepeatChange={(x, y) => {
          // Apply UV repeat to all selected objects
          onUpdateAll({
            material: {
              pbr: {
                repeatX: x,
                repeatY: y,
              },
            },
          })
        }}
      />
    </div>
  )
}
