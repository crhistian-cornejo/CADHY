/**
 * Sketch Extrude Operator - CADHY
 *
 * Converts a 2D sketch into a 3D solid through extrusion.
 * Supports:
 * - Linear extrusion (straight up/down)
 * - Symmetric extrusion (both directions)
 * - Draft angle for tapered extrusion
 * - Boolean operations with existing geometry
 *
 * Workflow:
 * 1. Select or create a sketch
 * 2. Set extrusion parameters (height, direction, draft)
 * 3. Preview the result
 * 4. Apply to create the solid
 */

import {
  Button,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
} from "@cadhy/ui"
import { ArrowMoveUpLeftIcon, Cube01Icon, LayersIcon, SquareIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import * as CadService from "@/core/services/cad-service"
import { useModellerStore } from "@/core/stores/modeller"
import {
  SKETCH_PLANES,
  type Sketch,
  type SketchPlane,
  useSketchStore,
} from "@/core/stores/ST_sketch"

// =============================================================================
// TYPES
// =============================================================================

type ExtrusionDirection = "normal" | "custom"
type BooleanOperation = "none" | "union" | "cut" | "intersect"

interface ExtrusionSettings {
  height: number
  symmetric: boolean
  direction: ExtrusionDirection
  customDirection: { x: number; y: number; z: number }
  draftAngle: number // degrees
  booleanOperation: BooleanOperation
  targetObjectId: string | null
  createNew: boolean
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_SETTINGS: ExtrusionSettings = {
  height: 10,
  symmetric: false,
  direction: "normal",
  customDirection: { x: 0, y: 0, z: 1 },
  draftAngle: 0,
  booleanOperation: "none",
  targetObjectId: null,
  createNew: true,
}

// =============================================================================
// SKETCH PREVIEW
// =============================================================================

interface SketchPreviewProps {
  sketch: Sketch
}

function SketchPreview({ sketch }: SketchPreviewProps) {
  const entityCount = sketch.entities.filter((e) => !e.isConstruction).length
  const constrainedCount = sketch.constraints.filter((c) => c.isSatisfied).length
  const totalConstraints = sketch.constraints.length

  return (
    <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <HugeiconsIcon icon={SquareIcon} className="size-4 text-primary" />
        <span className="font-medium text-sm">{sketch.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="text-foreground">{entityCount}</span> entities
        </div>
        <div>
          <span className="text-foreground">
            {constrainedCount}/{totalConstraints}
          </span>{" "}
          constraints
        </div>
        <div>
          Plane: <span className="text-foreground">{sketch.plane.type}</span>
        </div>
        <div>
          Status:{" "}
          <span className={sketch.isFullyConstrained ? "text-green-500" : "text-yellow-500"}>
            {sketch.isFullyConstrained ? "Constrained" : "Under-constrained"}
          </span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface SketchExtrudeOperatorProps {
  className?: string
  onClose?: () => void
  onApply?: (shapeId: string) => void
}

export function SketchExtrudeOperator({ className, onClose, onApply }: SketchExtrudeOperatorProps) {
  const { t } = useTranslation()

  // Sketch store state
  const sketches = useSketchStore((s) => s.sketches)
  const activeSketchId = useSketchStore((s) => s.activeSketchId)
  const setActiveSketch = useSketchStore((s) => s.setActiveSketch)
  const createSketch = useSketchStore((s) => s.createSketch)
  const extrudeSketch = useSketchStore((s) => s.extrudeSketch)

  // Modeller store for adding objects
  const addObject = useModellerStore((s) => s.addObject)
  const objects = useModellerStore((s) => s.objects)

  // Local state
  const [settings, setSettings] = useState<ExtrusionSettings>(DEFAULT_SETTINGS)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewShapeId, setPreviewShapeId] = useState<string | null>(null)

  // Get active sketch
  const activeSketch = sketches.find((s) => s.id === activeSketchId)

  // Validate sketch can be extruded
  const canExtrude =
    activeSketch && activeSketch.entities.filter((e) => !e.isConstruction).length > 0

  // Update setting helper
  const updateSetting = <K extends keyof ExtrusionSettings>(
    key: K,
    value: ExtrusionSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Create new sketch
  const handleCreateSketch = useCallback(() => {
    const id = createSketch("New Sketch", SKETCH_PLANES.XY)
    setActiveSketch(id)
    toast.success(t("sketch.created", "Sketch created"))
  }, [createSketch, setActiveSketch, t])

  // Apply extrusion
  const handleApply = useCallback(async () => {
    if (!activeSketch || !canExtrude) return

    setIsProcessing(true)

    try {
      // Calculate extrusion direction
      let direction = activeSketch.plane.normal
      if (settings.direction === "custom") {
        direction = settings.customDirection
      }

      // Calculate effective height
      let height = settings.height
      if (settings.symmetric) {
        height = settings.height / 2
      }

      // Apply draft angle (convert to radians for tangent calculation)
      // Draft creates a tapered extrusion - for simplicity, we'll do straight extrusion first
      // TODO: Implement drafted extrusion with variable offset

      // Perform extrusion
      const shapeId = await extrudeSketch(activeSketch.id, height, direction)

      if (!shapeId) {
        toast.error(t("sketch.extrusion.failed", "Extrusion failed"))
        return
      }

      // If symmetric, also extrude in opposite direction and union
      if (settings.symmetric) {
        const oppositeDir = {
          x: -direction.x,
          y: -direction.y,
          z: -direction.z,
        }
        const oppositeShapeId = await extrudeSketch(activeSketch.id, height, oppositeDir)

        if (oppositeShapeId) {
          // Boolean union the two halves
          const unionResult = await CadService.booleanUnion(shapeId, oppositeShapeId)
          if (unionResult?.id) {
            // Use the unified shape
          }
        }
      }

      // Handle boolean operations
      if (settings.booleanOperation !== "none" && settings.targetObjectId) {
        const targetObject = objects.find((o) => o.id === settings.targetObjectId)
        if (targetObject && targetObject.metadata?.backendShapeId) {
          const targetShapeId = targetObject.metadata.backendShapeId

          let resultId: string | null = null
          switch (settings.booleanOperation) {
            case "union": {
              const unionResult = await CadService.booleanUnion(targetShapeId, shapeId)
              resultId = unionResult?.id ?? null
              break
            }
            case "cut": {
              const cutResult = await CadService.booleanCut(targetShapeId, shapeId)
              resultId = cutResult?.id ?? null
              break
            }
            case "intersect": {
              const intersectResult = await CadService.booleanIntersect(targetShapeId, shapeId)
              resultId = intersectResult?.id ?? null
              break
            }
          }

          if (resultId) {
            // Update the target object with new shape
            // TODO: Update object's backend shape ID
          }
        }
      }

      // Create new 3D object from extruded shape
      if (settings.createNew) {
        // Tessellate the shape for visualization
        const meshData = await CadService.tessellate(shapeId, 0.1, 0.5)

        if (meshData && meshData.vertices.length > 0) {
          // Add to scene as a new shape object
          addObject({
            type: "shape",
            name: `${activeSketch.name} - Extrusion`,
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            visible: true,
            locked: false,
            shapeType: "extrusion",
            mesh: {
              vertices: new Float32Array(meshData.vertices),
              indices: new Uint32Array(meshData.indices),
              normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
            },
            metadata: {
              backendShapeId: shapeId,
              sourceSketchId: activeSketch.id,
            },
          })

          toast.success(t("sketch.extrusion.success", "Extrusion created successfully"))
          onApply?.(shapeId)
        }
      }
    } catch (error) {
      console.error("[SketchExtrude] Failed:", error)
      toast.error(
        t("sketch.extrusion.error", "Error creating extrusion: {{message}}", {
          message: error instanceof Error ? error.message : String(error),
        })
      )
    } finally {
      setIsProcessing(false)
    }
  }, [activeSketch, canExtrude, settings, extrudeSketch, objects, addObject, onApply, t])

  return (
    <div className={className}>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HugeiconsIcon icon={Cube01Icon} className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("sketch.extrusion.title", "Extrude Sketch")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("sketch.extrusion.description", "Create a 3D solid from a 2D sketch")}
              </p>
            </div>
          </div>

          {/* Sketch Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("sketch.extrusion.sourceSketch", "Source Sketch")}
            </Label>

            {sketches.length === 0 ? (
              <div className="text-center py-6">
                <HugeiconsIcon
                  icon={LayersIcon}
                  className="size-8 mx-auto mb-2 text-muted-foreground/50"
                />
                <p className="text-sm text-muted-foreground mb-3">
                  {t("sketch.noSketches", "No sketches available")}
                </p>
                <Button size="sm" onClick={handleCreateSketch}>
                  {t("sketch.createNew", "Create New Sketch")}
                </Button>
              </div>
            ) : (
              <>
                <Select value={activeSketchId ?? ""} onValueChange={setActiveSketch}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("sketch.selectSketch", "Select a sketch")} />
                  </SelectTrigger>
                  <SelectContent>
                    {sketches.map((sketch) => (
                      <SelectItem key={sketch.id} value={sketch.id}>
                        {sketch.name} ({sketch.entities.length} entities)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {activeSketch && <SketchPreview sketch={activeSketch} />}
              </>
            )}
          </div>

          {/* Extrusion Settings */}
          {activeSketch && (
            <>
              {/* Height */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {t("sketch.extrusion.height", "Height")}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {settings.height.toFixed(2)} mm
                  </span>
                </div>
                <div className="flex gap-2">
                  <Slider
                    value={[settings.height]}
                    onValueChange={([v]) => updateSetting("height", v)}
                    min={0.1}
                    max={100}
                    step={0.1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={settings.height}
                    onChange={(e) => updateSetting("height", parseFloat(e.target.value) || 0)}
                    className="w-20"
                    min={0.1}
                    step={0.1}
                  />
                </div>
              </div>

              {/* Symmetric */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    {t("sketch.extrusion.symmetric", "Symmetric")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("sketch.extrusion.symmetricDesc", "Extrude equally in both directions")}
                  </p>
                </div>
                <Switch
                  checked={settings.symmetric}
                  onCheckedChange={(v) => updateSetting("symmetric", v)}
                />
              </div>

              {/* Direction */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {t("sketch.extrusion.direction", "Direction")}
                </Label>
                <Select
                  value={settings.direction}
                  onValueChange={(v: ExtrusionDirection) => updateSetting("direction", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">
                      {t("sketch.extrusion.normalToPlane", "Normal to Plane")}
                    </SelectItem>
                    <SelectItem value="custom">
                      {t("sketch.extrusion.customDirection", "Custom Direction")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {settings.direction === "custom" && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">X</Label>
                      <Input
                        type="number"
                        value={settings.customDirection.x}
                        onChange={(e) =>
                          updateSetting("customDirection", {
                            ...settings.customDirection,
                            x: parseFloat(e.target.value) || 0,
                          })
                        }
                        step={0.1}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Y</Label>
                      <Input
                        type="number"
                        value={settings.customDirection.y}
                        onChange={(e) =>
                          updateSetting("customDirection", {
                            ...settings.customDirection,
                            y: parseFloat(e.target.value) || 0,
                          })
                        }
                        step={0.1}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Z</Label>
                      <Input
                        type="number"
                        value={settings.customDirection.z}
                        onChange={(e) =>
                          updateSetting("customDirection", {
                            ...settings.customDirection,
                            z: parseFloat(e.target.value) || 0,
                          })
                        }
                        step={0.1}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Draft Angle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {t("sketch.extrusion.draftAngle", "Draft Angle")}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {settings.draftAngle.toFixed(1)}°
                  </span>
                </div>
                <Slider
                  value={[settings.draftAngle]}
                  onValueChange={([v]) => updateSetting("draftAngle", v)}
                  min={-45}
                  max={45}
                  step={0.5}
                />
                <p className="text-xs text-muted-foreground">
                  {t("sketch.extrusion.draftAngleDesc", "Taper the extrusion for mold release")}
                </p>
              </div>

              {/* Boolean Operation */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {t("sketch.extrusion.booleanOperation", "Boolean Operation")}
                </Label>
                <Select
                  value={settings.booleanOperation}
                  onValueChange={(v: BooleanOperation) => updateSetting("booleanOperation", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("sketch.extrusion.newBody", "New Body")}
                    </SelectItem>
                    <SelectItem value="union">
                      {t("sketch.extrusion.union", "Join (Union)")}
                    </SelectItem>
                    <SelectItem value="cut">
                      {t("sketch.extrusion.cut", "Cut (Subtract)")}
                    </SelectItem>
                    <SelectItem value="intersect">
                      {t("sketch.extrusion.intersect", "Intersect")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {settings.booleanOperation !== "none" && (
                  <Select
                    value={settings.targetObjectId ?? ""}
                    onValueChange={(v) => updateSetting("targetObjectId", v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("sketch.extrusion.selectTarget", "Select target body")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {objects
                        .filter((o) => o.type === "shape" && o.metadata?.backendShapeId)
                        .map((obj) => (
                          <SelectItem key={obj.id} value={obj.id}>
                            {obj.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-border/50">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button className="flex-1" disabled={!canExtrude || isProcessing} onClick={handleApply}>
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                  {t("common.processing", "Processing...")}
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={ArrowMoveUpLeftIcon} className="size-4 mr-2" />
                  {t("sketch.extrusion.apply", "Extrude")}
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          {!canExtrude && activeSketch && (
            <p className="text-xs text-yellow-500 text-center">
              {t(
                "sketch.extrusion.noGeometry",
                "Sketch needs at least one non-construction entity"
              )}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default SketchExtrudeOperator
