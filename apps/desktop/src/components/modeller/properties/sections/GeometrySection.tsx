/**
 * GeometrySection Component - CADHY
 *
 * Geometry parameters for shape objects (box, cylinder, sphere, etc.)
 */

import { Badge, NumberInput } from "@cadhy/ui"
import { CubeIcon } from "@hugeicons/core-free-icons"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ShapeObject } from "@/stores/modeller-store"
import { PropertyRow } from "../shared/PropertyRow"
import { PropertySection } from "../shared/PropertySection"

// ============================================================================
// TYPES
// ============================================================================

export interface GeometrySectionProps {
  object: ShapeObject
  onUpdate: (updates: Partial<ShapeObject>) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GeometrySection({ object, onUpdate }: GeometrySectionProps) {
  const { t } = useTranslation()

  const handleParamChange = useCallback(
    (param: string, value: number) => {
      onUpdate({
        parameters: { ...object.parameters, [param]: value },
      })
    },
    [object.parameters, onUpdate]
  )

  // Get segment limits based on shape type
  const segmentLimits = useMemo(() => {
    if (object.shapeType === "box") {
      return {
        min: 1,
        max: 10,
        step: 1,
        label: t("createPanel.subdivisions", "Subdivisions"),
      }
    }
    return { min: 8, max: 128, step: 8, label: t("createPanel.detail", "Detail") }
  }, [object.shapeType, t])

  const currentSegments = object.parameters.segments ?? 32

  const renderParams = () => {
    switch (object.shapeType) {
      case "box":
        return (
          <>
            <PropertyRow label={t("properties.width")}>
              <NumberInput
                value={object.parameters.width ?? 1}
                onChange={(v) => handleParamChange("width", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.height")}>
              <NumberInput
                value={object.parameters.height ?? 1}
                onChange={(v) => handleParamChange("height", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.depth")}>
              <NumberInput
                value={object.parameters.depth ?? 1}
                onChange={(v) => handleParamChange("depth", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )
      case "cylinder":
        return (
          <>
            <PropertyRow label={t("properties.radius")}>
              <NumberInput
                value={object.parameters.radius ?? 0.5}
                onChange={(v) => handleParamChange("radius", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.height")}>
              <NumberInput
                value={object.parameters.height ?? 1}
                onChange={(v) => handleParamChange("height", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )
      case "sphere":
        return (
          <PropertyRow label={t("properties.radius")}>
            <NumberInput
              value={object.parameters.radius ?? 0.5}
              onChange={(v) => handleParamChange("radius", v)}
              step={0.1}
              min={0.01}
              className="h-6 text-[10px]"
            />
          </PropertyRow>
        )
      case "cone":
        return (
          <>
            <PropertyRow label={t("properties.bottomRadius")}>
              <NumberInput
                value={object.parameters.bottomRadius ?? 0.5}
                onChange={(v) => handleParamChange("bottomRadius", v)}
                step={0.1}
                min={0}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.topRadius")}>
              <NumberInput
                value={object.parameters.topRadius ?? 0}
                onChange={(v) => handleParamChange("topRadius", v)}
                step={0.1}
                min={0}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.height")}>
              <NumberInput
                value={object.parameters.height ?? 1}
                onChange={(v) => handleParamChange("height", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )
      case "torus":
        return (
          <>
            <PropertyRow label={t("properties.majorRadius")}>
              <NumberInput
                value={object.parameters.majorRadius ?? 1}
                onChange={(v) => handleParamChange("majorRadius", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.minorRadius")}>
              <NumberInput
                value={object.parameters.minorRadius ?? 0.3}
                onChange={(v) => handleParamChange("minorRadius", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-[10px]"
              />
            </PropertyRow>
          </>
        )
      default:
        return null
    }
  }

  return (
    <PropertySection title={t("properties.geometry")} icon={CubeIcon}>
      <PropertyRow label={t("properties.type")}>
        <Badge variant="outline" className="text-[10px] capitalize">
          {object.shapeType}
        </Badge>
      </PropertyRow>
      {renderParams()}
      {/* Mesh Detail/Segments Control */}
      <div className="pt-2 mt-2 border-t border-border/30">
        <PropertyRow label={segmentLimits.label}>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={currentSegments}
              onChange={(e) => handleParamChange("segments", Number(e.target.value))}
              min={segmentLimits.min}
              max={segmentLimits.max}
              step={segmentLimits.step}
              className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
            />
            <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
              {currentSegments}
            </span>
          </div>
        </PropertyRow>
      </div>
    </PropertySection>
  )
}
