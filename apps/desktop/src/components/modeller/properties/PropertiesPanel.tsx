/**
 * Properties Panel Component - CADHY
 *
 * Main properties panel that orchestrates all property sections.
 * Displays context-specific properties based on selected object type.
 *
 * Components are split into:
 * - shared/: Common building blocks (Section, PropertyRow, VectorInput)
 * - sections/: Generic sections (Transform, Geometry, Material, Layer, Info)
 * - panels/: Object-specific panels (Channel, Transition, Chute)
 * - previews/: SVG previews for hydraulic objects
 * - states/: Selection states (NoSelection, MultipleSelection)
 */

import { Button, cn, Input, ScrollArea } from "@cadhy/ui"
import { Copy01Icon, Delete01Icon, Settings01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  type AnySceneObject,
  type ChannelObject,
  type ChuteObject,
  type MaterialProperties,
  type ShapeObject,
  type TransitionObject,
  useModellerStore,
  useSelectedIds,
  useViewportSettings,
} from "@/stores/modeller"
import { ChannelPropertiesPanel } from "./panels/ChannelPropertiesPanel"
import { ChutePropertiesPanel } from "./panels/ChutePropertiesPanel"
import { TransitionPropertiesPanel } from "./panels/TransitionPropertiesPanel"
import { BIMInfoSection } from "./sections/BIMInfoSection"
import { GeometrySection } from "./sections/GeometrySection"
import { MaterialSection } from "./sections/MaterialSection"
import { MeshDetailsSection } from "./sections/MeshDetailsSection"
import { PropertyRow } from "./shared/PropertyRow"
import { MultipleSelection } from "./states/MultipleSelection"
import { NoSelection } from "./states/NoSelection"
import { TextureMaterialPanel } from "./TextureMaterialPanel"

// ============================================================================
// TYPES
// ============================================================================

interface PropertiesPanelProps {
  className?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  const { t } = useTranslation()
  const selectedIds = useSelectedIds()
  const objects = useModellerStore((s) => s.objects)
  const viewportSettings = useViewportSettings()
  const updateObject = useModellerStore((s) => s.updateObject)
  const deleteSelected = useModellerStore((s) => s.deleteSelected)
  const duplicateSelected = useModellerStore((s) => s.duplicateSelected)

  // Get the selected object directly from objects array
  // This avoids the getObjectById function reference changing
  const selectedObject = useMemo(() => {
    if (selectedIds.length === 1) {
      return objects.find((o) => o.id === selectedIds[0]) ?? null
    }
    return null
  }, [selectedIds, objects])

  // Get all selected objects (for multiple selection)
  const selectedObjects = useMemo(() => {
    return objects.filter((o) => selectedIds.includes(o.id))
  }, [selectedIds, objects])

  // Stable reference to the selected object ID
  const selectedObjectId = selectedObject?.id

  const handleUpdate = useCallback(
    (updates: Partial<AnySceneObject>) => {
      if (selectedObjectId) {
        updateObject(selectedObjectId, updates)
      }
    },
    [selectedObjectId, updateObject]
  )

  // Handle updates for multiple objects
  const handleUpdateAll = useCallback(
    (updates: Partial<AnySceneObject>) => {
      selectedIds.forEach((id) => {
        const obj = objects.find((o) => o.id === id)
        if (!obj) return

        if (obj.material) {
          updateObject(id, {
            ...updates,
            material: {
              ...obj.material,
              ...(updates.material ?? {}),
              pbr: {
                ...obj.material.pbr,
                ...(updates.material?.pbr ?? {}),
              },
            } as MaterialProperties,
          })
        } else {
          updateObject(id, updates)
        }
      })
    },
    [selectedIds, objects, updateObject]
  )

  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden border-l border-border/40", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Settings01Icon} className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">{t("properties.title")}</span>
        </div>
        {selectedObject && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => duplicateSelected()}
              className="h-6 w-6"
            >
              <HugeiconsIcon icon={Copy01Icon} className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => deleteSelected()}
              className="h-6 w-6 text-destructive hover:text-destructive"
            >
              <HugeiconsIcon icon={Delete01Icon} className="size-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        {/* No selection state */}
        {selectedIds.length === 0 && <NoSelection />}

        {/* Multiple selection state */}
        {selectedIds.length > 1 && (
          <MultipleSelection
            count={selectedIds.length}
            selectedObjects={selectedObjects}
            postProcessingEnabled={viewportSettings.enablePostProcessing ?? false}
            onDelete={deleteSelected}
            onDuplicate={duplicateSelected}
            onUpdateAll={handleUpdateAll}
          />
        )}

        {/* Single selection - show full properties */}
        {selectedObject && (
          <div className="divide-y divide-border/40">
            {/* Name */}
            <div className="px-3 py-3">
              <PropertyRow label={t("properties.name")}>
                <Input
                  value={selectedObject.name}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                  className="h-6 text-xs"
                />
              </PropertyRow>
            </div>

            {/* Geometry (for shapes) */}
            {selectedObject.type === "shape" && (
              <GeometrySection
                object={selectedObject as ShapeObject}
                onUpdate={handleUpdate as (updates: Partial<ShapeObject>) => void}
              />
            )}

            {/* Channel Properties */}
            {selectedObject.type === "channel" && (
              <ChannelPropertiesPanel
                object={selectedObject as ChannelObject}
                onUpdate={handleUpdate as (updates: Partial<ChannelObject>) => void}
              />
            )}

            {/* Transition Properties */}
            {selectedObject.type === "transition" && (
              <TransitionPropertiesPanel
                object={selectedObject as TransitionObject}
                onUpdate={handleUpdate as (updates: Partial<TransitionObject>) => void}
              />
            )}

            {/* Chute Properties */}
            {selectedObject.type === "chute" && (
              <ChutePropertiesPanel
                object={selectedObject as ChuteObject}
                onUpdate={handleUpdate as (updates: Partial<ChuteObject>) => void}
              />
            )}

            {/* Material (for shapes) */}
            {selectedObject.type === "shape" && (
              <MaterialSection
                object={selectedObject as ShapeObject}
                onUpdate={handleUpdate as (updates: Partial<ShapeObject>) => void}
              />
            )}

            {/* PBR Textures (for all objects when post-processing is enabled) */}
            {selectedObject.material && (
              <TextureMaterialPanel
                postProcessingEnabled={viewportSettings.enablePostProcessing ?? false}
                currentTextureId={selectedObject.material.pbr?.albedoTextureId}
                repeatX={selectedObject.material.pbr?.repeatX ?? 1}
                repeatY={selectedObject.material.pbr?.repeatY ?? 1}
                onTexturesChange={(maps, textureId) => {
                  if (!selectedObject.material) return
                  // Store the texture ID in material.pbr so it can be loaded later
                  handleUpdate({
                    material: {
                      ...selectedObject.material,
                      pbr: {
                        ...selectedObject.material.pbr,
                        albedoTextureId: textureId,
                        normalTextureId: maps.normal ? textureId : undefined,
                        roughnessTextureId: maps.roughness ? textureId : undefined,
                        metalnessTextureId: maps.metalness ? textureId : undefined,
                        aoTextureId: maps.ao ? textureId : undefined,
                        // Preserve current UV repeat values when applying new texture
                        repeatX: selectedObject.material.pbr?.repeatX ?? 1,
                        repeatY: selectedObject.material.pbr?.repeatY ?? 1,
                      },
                    } as MaterialProperties,
                  })
                }}
                onRepeatChange={(x, y) => {
                  if (!selectedObject.material) return
                  handleUpdate({
                    material: {
                      ...selectedObject.material,
                      pbr: {
                        ...selectedObject.material.pbr,
                        repeatX: x,
                        repeatY: y,
                      },
                    } as MaterialProperties,
                  })
                }}
              />
            )}

            {/* Mesh Details */}
            <MeshDetailsSection object={selectedObject} />

            {/* BIM Information */}
            <BIMInfoSection object={selectedObject} />
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export default PropertiesPanel
