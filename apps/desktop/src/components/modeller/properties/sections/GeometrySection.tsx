/**
 * GeometrySection Component - CADHY
 *
 * Geometry parameters for shape objects (box, cylinder, sphere, etc.)
 * When parameters change, the CAD geometry is regenerated via the backend.
 */

import { Badge, NumberInput } from "@cadhy/ui"
import { CubeIcon } from "@hugeicons/core-free-icons"
import { useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useCAD } from "@/hooks/use-cad"
import type { ShapeObject } from "@/stores/modeller"
import { PropertyRow } from "../shared/PropertyRow"
import { PropertySection } from "../shared/PropertySection"

// ============================================================================
// TYPES
// ============================================================================

export interface GeometrySectionProps {
  object: ShapeObject
  onUpdate: (updates: Partial<ShapeObject>) => void
}

// Debounce time for CAD regeneration (ms)
const DEBOUNCE_TIME = 150

// ============================================================================
// COMPONENT
// ============================================================================

export function GeometrySection({ object, onUpdate }: GeometrySectionProps) {
  const { t } = useTranslation()
  const { updateShapeParameters } = useCAD()
  const [isUpdating, setIsUpdating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingParamsRef = useRef<Record<string, number>>({})

  const handleParamChange = useCallback(
    (param: string, value: number) => {
      // For "segments" parameter on basic primitives, update store directly (instant feedback)
      // Three.js geometry will update immediately without calling backend
      const isBasicPrimitive = ["box", "cylinder", "sphere", "cone", "torus"].includes(
        object.shapeType
      )

      if (param === "segments" && isBasicPrimitive) {
        // Direct store update - no backend call needed for display
        onUpdate({
          parameters: { ...object.parameters, segments: value },
        })
        return
      }

      // For dimension changes (width, height, radius, etc.), call backend
      pendingParamsRef.current = {
        ...pendingParamsRef.current,
        [param]: value,
      }

      // Clear existing debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      // Debounce the CAD update to avoid too many calls while dragging slider
      debounceRef.current = setTimeout(async () => {
        const paramsToUpdate = { ...pendingParamsRef.current }
        pendingParamsRef.current = {}

        setIsUpdating(true)
        try {
          // Regenerate geometry with new parameters
          await updateShapeParameters(object.id, paramsToUpdate)
        } catch (error) {
          console.error("[GeometrySection] Failed to update parameters:", error)
          // Fallback: just update the store without regenerating geometry
          onUpdate({
            parameters: { ...object.parameters, ...paramsToUpdate },
          })
        } finally {
          setIsUpdating(false)
        }
      }, DEBOUNCE_TIME)
    },
    [object.id, object.shapeType, object.parameters, updateShapeParameters, onUpdate]
  )

  // Get segment limits based on shape type
  // Boxes don't need subdivisions in CAD (B-Rep is mathematically exact)
  // Curved primitives: 8-128 segments for tessellation detail (approximating curves)
  const segmentLimits = useMemo(() => {
    // Boxes: hide subdivisions slider (always use 1)
    if (object.shapeType === "box") {
      return null // No slider for boxes
    }
    return { min: 8, max: 128, step: 8, label: t("createPanel.detail", "Detail") }
  }, [object.shapeType, t])

  // Get current segments with appropriate default based on shape type
  const defaultSegments = object.shapeType === "box" ? 1 : 32
  const currentSegments = object.parameters.segments ?? defaultSegments

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
                className="h-6 text-xs"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.height")}>
              <NumberInput
                value={object.parameters.height ?? 1}
                onChange={(v) => handleParamChange("height", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-xs"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.depth")}>
              <NumberInput
                value={object.parameters.depth ?? 1}
                onChange={(v) => handleParamChange("depth", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-xs"
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
                className="h-6 text-xs"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.height")}>
              <NumberInput
                value={object.parameters.height ?? 1}
                onChange={(v) => handleParamChange("height", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-xs"
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
              className="h-6 text-xs"
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
                className="h-6 text-xs"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.topRadius")}>
              <NumberInput
                value={object.parameters.topRadius ?? 0}
                onChange={(v) => handleParamChange("topRadius", v)}
                step={0.1}
                min={0}
                className="h-6 text-xs"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.height")}>
              <NumberInput
                value={object.parameters.height ?? 1}
                onChange={(v) => handleParamChange("height", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-xs"
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
                className="h-6 text-xs"
              />
            </PropertyRow>
            <PropertyRow label={t("properties.minorRadius")}>
              <NumberInput
                value={object.parameters.minorRadius ?? 0.3}
                onChange={(v) => handleParamChange("minorRadius", v)}
                step={0.1}
                min={0.01}
                className="h-6 text-xs"
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
        <Badge variant="outline" className="text-xs capitalize">
          {object.shapeType}
        </Badge>
      </PropertyRow>
      {renderParams()}
      {/* Mesh Detail/Segments Control - only for curved primitives, not boxes */}
      {segmentLimits && (
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
              <span className="text-xs text-muted-foreground font-mono w-8 text-right">
                {currentSegments}
              </span>
            </div>
          </PropertyRow>
        </div>
      )}
    </PropertySection>
  )
}
