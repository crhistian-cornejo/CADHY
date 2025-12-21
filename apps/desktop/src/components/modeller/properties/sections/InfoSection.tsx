/**
 * InfoSection Component - CADHY
 *
 * IFC/BIM-style information display (ID, type, volume, timestamps).
 */

import { Badge } from "@cadhy/ui"
import { InformationCircleIcon } from "@hugeicons/core-free-icons"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { AnySceneObject, ShapeObject } from "@/stores/modeller-store"
import { PropertyRow } from "../shared/PropertyRow"
import { PropertySection } from "../shared/PropertySection"

// ============================================================================
// TYPES
// ============================================================================

export interface InfoSectionProps {
  object: AnySceneObject
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateVolume(obj: AnySceneObject): string {
  if (obj.type !== "shape") return "N/A"

  const shape = obj as ShapeObject
  const params = shape.parameters
  const scale = shape.transform.scale
  const scaleFactor = scale.x * scale.y * scale.z

  let baseVolume = 0

  switch (shape.shapeType) {
    case "box":
      baseVolume = (params.width ?? 1) * (params.height ?? 1) * (params.depth ?? 1)
      break
    case "cylinder":
      baseVolume = Math.PI * (params.radius ?? 0.5) ** 2 * (params.height ?? 1)
      break
    case "sphere":
      baseVolume = (4 / 3) * Math.PI * (params.radius ?? 0.5) ** 3
      break
    case "cone":
      baseVolume =
        (1 / 3) *
        Math.PI *
        (params.height ?? 1) *
        ((params.bottomRadius ?? 0.5) ** 2 +
          (params.bottomRadius ?? 0.5) * (params.topRadius ?? 0) +
          (params.topRadius ?? 0) ** 2)
      break
    case "torus":
      baseVolume =
        2 * Math.PI * Math.PI * (params.majorRadius ?? 1) * (params.minorRadius ?? 0.3) ** 2
      break
    default:
      return "N/A"
  }

  return (baseVolume * scaleFactor).toFixed(3)
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InfoSection({ object }: InfoSectionProps) {
  const { t } = useTranslation()

  const createdDate = useMemo(() => new Date(object.createdAt).toLocaleString(), [object.createdAt])

  const updatedDate = useMemo(() => new Date(object.updatedAt).toLocaleString(), [object.updatedAt])

  const volume = useMemo(() => calculateVolume(object), [object])

  return (
    <PropertySection
      title={t("properties.information")}
      icon={InformationCircleIcon}
      defaultOpen={false}
    >
      <PropertyRow label={t("properties.id")}>
        <code className="text-[10px] text-muted-foreground font-mono">
          {object.id.slice(0, 12)}...
        </code>
      </PropertyRow>
      <PropertyRow label={t("properties.type")}>
        <Badge variant="outline" className="text-[10px] capitalize">
          {object.type}
        </Badge>
      </PropertyRow>
      {object.type === "shape" && (
        <PropertyRow label={t("properties.volume")}>
          <span className="text-[10px]">{volume} m³</span>
        </PropertyRow>
      )}
      <PropertyRow label={t("properties.created")}>
        <span className="text-[10px] text-muted-foreground">{createdDate}</span>
      </PropertyRow>
      <PropertyRow label={t("properties.modified")}>
        <span className="text-[10px] text-muted-foreground">{updatedDate}</span>
      </PropertyRow>
    </PropertySection>
  )
}
