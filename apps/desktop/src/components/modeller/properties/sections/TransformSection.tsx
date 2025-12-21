/**
 * TransformSection Component - CADHY
 *
 * Position, rotation, and scale controls for scene objects.
 */

import { Move01Icon } from "@hugeicons/core-free-icons"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import type { AnySceneObject } from "@/stores/modeller-store"
import { PropertyRow } from "../shared/PropertyRow"
import { PropertySection } from "../shared/PropertySection"
import { type Vector3, VectorInput } from "../shared/VectorInput"

// ============================================================================
// TYPES
// ============================================================================

export interface TransformSectionProps {
  object: AnySceneObject
  onUpdate: (updates: Partial<AnySceneObject>) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TransformSection({ object, onUpdate }: TransformSectionProps) {
  const { t } = useTranslation()

  const handlePositionChange = useCallback(
    (position: Vector3) => {
      onUpdate({ transform: { ...object.transform, position } })
    },
    [object.transform, onUpdate]
  )

  const handleRotationChange = useCallback(
    (rotation: Vector3) => {
      onUpdate({ transform: { ...object.transform, rotation } })
    },
    [object.transform, onUpdate]
  )

  const handleScaleChange = useCallback(
    (scale: Vector3) => {
      onUpdate({ transform: { ...object.transform, scale } })
    },
    [object.transform, onUpdate]
  )

  return (
    <PropertySection title={t("properties.transform")} icon={Move01Icon}>
      <PropertyRow label={t("properties.position")}>
        <VectorInput value={object.transform.position} onChange={handlePositionChange} step={0.1} />
      </PropertyRow>
      <PropertyRow label={t("properties.rotation")}>
        <VectorInput value={object.transform.rotation} onChange={handleRotationChange} step={1} />
      </PropertyRow>
      <PropertyRow label={t("properties.scale")}>
        <VectorInput value={object.transform.scale} onChange={handleScaleChange} step={0.1} />
      </PropertyRow>
    </PropertySection>
  )
}
