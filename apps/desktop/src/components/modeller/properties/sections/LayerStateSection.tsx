/**
 * LayerStateSection Component - CADHY
 *
 * Layer assignment and visibility/lock controls for objects.
 */

import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cadhy/ui"
import {
  Layers01Icon,
  LockIcon,
  SquareUnlock02Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { AnySceneObject, Layer } from "@/stores/modeller"
import { PropertyRow } from "../shared/PropertyRow"
import { PropertySection } from "../shared/PropertySection"

// ============================================================================
// TYPES
// ============================================================================

export interface LayerStateSectionProps {
  object: AnySceneObject
  layers: Layer[]
  onUpdate: (updates: Partial<AnySceneObject>) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LayerStateSection({ object, layers, onUpdate }: LayerStateSectionProps) {
  const { t } = useTranslation()

  const currentLayer = useMemo(
    () => layers.find((l) => l.id === object.layerId),
    [layers, object.layerId]
  )

  const handleLayerChange = useCallback(
    (layerId: string) => {
      onUpdate({ layerId })
    },
    [onUpdate]
  )

  const handleToggleVisibility = useCallback(() => {
    onUpdate({ visible: !object.visible })
  }, [object.visible, onUpdate])

  const handleToggleLock = useCallback(() => {
    onUpdate({ locked: !object.locked })
  }, [object.locked, onUpdate])

  return (
    <PropertySection title={t("properties.layerState")} icon={Layers01Icon}>
      {/* Layer selector */}
      <PropertyRow label={t("properties.layer")}>
        <Select value={object.layerId} onValueChange={handleLayerChange}>
          <SelectTrigger className="h-6 text-xs">
            <SelectValue>
              <div className="flex items-center gap-2">
                <div
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: currentLayer?.color ?? "#6366f1" }}
                />
                <span className="truncate">{currentLayer?.name ?? "Default"}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {layers.map((layer) => (
              <SelectItem key={layer.id} value={layer.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span>{layer.name}</span>
                  {layer.id === object.layerId && (
                    <Badge variant="secondary" className="ml-auto h-4 px-1 text-xs">
                      {t("properties.current")}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>

      {/* Visibility & Lock */}
      <div className="flex gap-1 mt-2">
        <Button
          variant={object.visible ? "secondary" : "outline"}
          size="sm"
          className="flex-1 h-7 text-xs gap-1.5"
          onClick={handleToggleVisibility}
        >
          <HugeiconsIcon icon={object.visible ? ViewIcon : ViewOffIcon} className="size-3" />
          {object.visible ? t("properties.visible") : t("properties.hidden")}
        </Button>
        <Button
          variant={object.locked ? "secondary" : "outline"}
          size="sm"
          className="flex-1 h-7 text-xs gap-1.5"
          onClick={handleToggleLock}
        >
          <HugeiconsIcon icon={object.locked ? LockIcon : SquareUnlock02Icon} className="size-3" />
          {object.locked ? t("properties.locked") : t("properties.unlocked")}
        </Button>
      </div>
    </PropertySection>
  )
}
