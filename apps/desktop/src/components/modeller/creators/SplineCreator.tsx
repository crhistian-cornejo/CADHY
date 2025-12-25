/**
 * SplineCreator - CADHY
 *
 * UI component for creating B-spline and Bezier curves.
 * Uses the existing cad_create_bspline and cad_create_bezier Tauri commands.
 */

import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
} from "@cadhy/ui"
import { Add01Icon, Cancel01Icon, Delete01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useUnits } from "@/hooks/use-units"
import * as cadService from "@/services/cad-service"
import { type ShapeObject, useModellerStore } from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface SplineCreatorProps {
  onClose: () => void
  onCreated: () => void
}

type SplineType = "bspline" | "bezier"

interface Point3D {
  x: number
  y: number
  z: number
}

// ============================================================================
// SPLINE CREATOR
// ============================================================================

export function SplineCreator({ onClose, onCreated }: SplineCreatorProps) {
  const { t } = useTranslation()
  const { addObject } = useModellerStore()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { convertLengthToDisplay, parseLength } = useUnits()

  // Form state
  const [name, setName] = useState("Spline")
  const [splineType, setSplineType] = useState<SplineType>("bspline")
  const [closed, setClosed] = useState(false)
  const [points, setPoints] = useState<Point3D[]>([
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 1 },
    { x: 2, y: 0, z: 0 },
  ])
  const [isCreating, setIsCreating] = useState(false)

  // Focus name input when form opens
  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const addPoint = () => {
    const lastPoint = points[points.length - 1] || { x: 0, y: 0, z: 0 }
    setPoints([...points, { x: lastPoint.x + 1, y: lastPoint.y, z: lastPoint.z }])
  }

  const removePoint = (index: number) => {
    if (points.length <= 2) return
    setPoints(points.filter((_, i) => i !== index))
  }

  const updatePoint = (index: number, coord: "x" | "y" | "z", value: number) => {
    setPoints(points.map((p, i) => (i === index ? { ...p, [coord]: value } : p)))
  }

  const handleCreate = async () => {
    const minPoints = splineType === "bezier" ? 2 : 2
    if (points.length < minPoints) {
      toast.error(t("createPanel.splineMinPoints", `Need at least ${minPoints} points`))
      return
    }

    setIsCreating(true)
    try {
      let result: cadService.ShapeResult

      if (splineType === "bspline") {
        result = await cadService.createBSpline(points, closed)
      } else {
        result = await cadService.createBezier(points)
      }

      // Tessellate the result
      const meshData = await cadService.tessellate(result.id, 0.1)

      // Add to scene
      const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
        type: "shape",
        name,
        layerId: "default",
        visible: true,
        locked: false,
        selected: false,
        shapeType: splineType,
        parameters: {
          pointCount: points.length,
          closed: closed ? 1 : 0,
        },
        mesh: {
          vertices: new Float32Array(meshData.vertices),
          normals: new Float32Array(meshData.normals ?? []),
          indices: new Uint32Array(meshData.indices),
        },
        material: {
          color: "#ec4899",
          opacity: 1,
          metalness: 0.3,
          roughness: 0.4,
        },
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        metadata: {
          backendShapeId: result.id,
          analysis: result.analysis,
        },
      }

      addObject(shapeObject)
      toast.success(t("createPanel.splineCreated", "Spline created successfully"))
      onCreated()
    } catch (error) {
      console.error("Failed to create spline:", error)
      toast.error(
        `${t("createPanel.splineFailed", "Failed to create spline")}: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsCreating(false)
    }
  }

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  const submitShortcut = isMac ? "⌘↵" : "Ctrl+↵"

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleCreate()
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <Card
      className="mx-3 mb-3 p-3 space-y-3 border-pink-500/30 bg-pink-500/5 max-h-[80vh] overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-2xl bg-pink-500/20 flex items-center justify-center">
            <span className="text-xs font-medium text-pink-500">~</span>
          </div>
          <span className="text-xs font-medium">{t("createPanel.spline", "Spline")}</span>
          <Badge variant="outline" className="text-xs h-4 px-1 text-pink-500 border-pink-500/30">
            CAD
          </Badge>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose} className="h-5 w-5">
          <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Name */}
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.name")}
          </Label>
          <Input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-xs"
            placeholder={t("createPanel.objectName")}
          />
        </div>

        {/* Type Selection */}
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.type", "Type")}
          </Label>
          <Select value={splineType} onValueChange={(v) => setSplineType(v as SplineType)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bspline" className="text-xs">
                <div className="flex flex-col">
                  <span>B-Spline</span>
                  <span className="text-xs text-muted-foreground">
                    {t("createPanel.bsplineDesc", "Smooth curve through points")}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="bezier" className="text-xs">
                <div className="flex flex-col">
                  <span>Bezier</span>
                  <span className="text-xs text-muted-foreground">
                    {t("createPanel.bezierDesc", "Control point curve")}
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Closed option (only for B-spline) */}
        {splineType === "bspline" && (
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              {t("createPanel.closedCurve", "Closed Curve")}
            </Label>
            <Switch checked={closed} onCheckedChange={setClosed} />
          </div>
        )}

        {/* Control Points */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              {splineType === "bezier"
                ? t("createPanel.controlPoints", "Control Points")
                : t("createPanel.throughPoints", "Through Points")}{" "}
              ({points.length})
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={addPoint}
              className="h-6 text-xs text-pink-400 hover:text-pink-300"
            >
              <HugeiconsIcon icon={Add01Icon} className="size-3 mr-1" />
              {t("createPanel.addPoint", "Add")}
            </Button>
          </div>

          <div className="border border-border/40 rounded-lg p-2 space-y-2 max-h-[200px] overflow-y-auto">
            {points.map((point, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className="text-pink-400 font-mono text-xs w-4">{index + 1}</span>
                <div className="flex-1 grid grid-cols-3 gap-1">
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-muted-foreground">X</span>
                    <NumberInput
                      value={Number(convertLengthToDisplay(point.x).toFixed(2))}
                      onChange={(v) => updatePoint(index, "x", parseLength(v))}
                      step={0.1}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-muted-foreground">Y</span>
                    <NumberInput
                      value={Number(convertLengthToDisplay(point.y).toFixed(2))}
                      onChange={(v) => updatePoint(index, "y", parseLength(v))}
                      step={0.1}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-muted-foreground">Z</span>
                    <NumberInput
                      value={Number(convertLengthToDisplay(point.z).toFixed(2))}
                      onChange={(v) => updatePoint(index, "z", parseLength(v))}
                      step={0.1}
                      className="h-6 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePoint(index)}
                  disabled={points.length <= 2}
                  className="text-red-400 hover:text-red-300 disabled:opacity-30 p-1"
                >
                  <HugeiconsIcon icon={Delete01Icon} className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-2 rounded-lg bg-muted/20 text-xs text-muted-foreground">
          {splineType === "bspline"
            ? t(
                "createPanel.bsplineInfo",
                "B-Spline creates a smooth curve that passes through all specified points. Can be closed to form a loop."
              )
            : t(
                "createPanel.bezierInfo",
                "Bezier curve uses control points to define the curve shape. First and last points are on the curve, intermediate points control the shape."
              )}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClose} className="flex-1 h-8">
          {t("createPanel.cancel")}
        </Button>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={points.length < 2 || isCreating}
          className="flex-1 h-8 bg-pink-600 hover:bg-pink-700"
        >
          <HugeiconsIcon icon={Tick01Icon} className="size-3 mr-1" />
          {isCreating ? t("createPanel.creating", "Creating...") : t("createPanel.create")}
          <span className="text-xs opacity-60 ml-1">{submitShortcut}</span>
        </Button>
      </div>
    </Card>
  )
}

export default SplineCreator
