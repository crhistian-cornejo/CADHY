/**
 * SweepCreator - CADHY
 *
 * UI component for creating swept solids (pipe operation).
 * Uses the existing cad_pipe and cad_pipe_shell Tauri commands.
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
import { Cancel01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useUnits } from "@/hooks/use-units"
import * as cadService from "@/services/cad-service"
import { type ShapeObject, useModellerStore, useObjects } from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface SweepCreatorProps {
  onClose: () => void
  onCreated: () => void
}

// ============================================================================
// SWEEP CREATOR
// ============================================================================

export function SweepCreator({ onClose, onCreated }: SweepCreatorProps) {
  const { t } = useTranslation()
  const { addObject } = useModellerStore()
  const allObjects = useObjects()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { lengthLabel, convertLengthToDisplay, parseLength } = useUnits()

  // Get wire/curve objects that can be used as profiles or spines
  const availableShapes = useMemo(() => {
    return allObjects.filter(
      (obj) => obj.type === "shape" && (obj as ShapeObject).metadata?.backendShapeId
    ) as ShapeObject[]
  }, [allObjects])

  // Profiles are closed curves (circles, rectangles, ellipses, etc.)
  const profileShapes = useMemo(() => {
    return availableShapes.filter((obj) =>
      ["circle", "rectangle", "ellipse", "polygon", "wire"].includes(obj.shapeType || "")
    )
  }, [availableShapes])

  // Spines are open curves (lines, arcs, polylines, splines, helixes)
  const spineShapes = useMemo(() => {
    return availableShapes.filter((obj) =>
      ["line", "arc", "polyline", "spline", "bspline", "bezier", "helix", "wire"].includes(
        obj.shapeType || ""
      )
    )
  }, [availableShapes])

  // Form state
  const [name, setName] = useState("Sweep")
  const [profileId, setProfileId] = useState<string>("")
  const [spineId, setSpineId] = useState<string>("")
  const [hollow, setHollow] = useState(false)
  const [thickness, setThickness] = useState(0.1)
  const [isCreating, setIsCreating] = useState(false)

  // Focus name input when form opens
  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const handleCreate = async () => {
    if (!profileId || !spineId) {
      toast.error(t("createPanel.sweepSelectBoth", "Select both profile and spine"))
      return
    }

    setIsCreating(true)
    try {
      // Get backend shape IDs
      const profile = allObjects.find((o) => o.id === profileId) as ShapeObject | undefined
      const spine = allObjects.find((o) => o.id === spineId) as ShapeObject | undefined

      const profileBackendId = profile?.metadata?.backendShapeId as string | undefined
      const spineBackendId = spine?.metadata?.backendShapeId as string | undefined

      if (!profileBackendId || !spineBackendId) {
        toast.error(t("createPanel.sweepInvalidSelection", "Invalid profile or spine selection"))
        return
      }

      // Call appropriate Tauri command
      let result: cadService.ShapeResult
      if (hollow) {
        result = await cadService.pipeShell(profileBackendId, spineBackendId, thickness)
      } else {
        result = await cadService.pipe(profileBackendId, spineBackendId)
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
        shapeType: hollow ? "pipe_shell" : "pipe",
        parameters: {
          hollow: hollow ? 1 : 0,
          thickness: hollow ? thickness : 0,
        },
        mesh: {
          vertices: new Float32Array(meshData.vertices),
          normals: new Float32Array(meshData.normals ?? []),
          indices: new Uint32Array(meshData.indices),
        },
        material: {
          color: "#10b981",
          opacity: 1,
          metalness: 0.1,
          roughness: 0.6,
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
      toast.success(t("createPanel.sweepCreated", "Sweep created successfully"))
      onCreated()
    } catch (error) {
      console.error("Failed to create sweep:", error)
      toast.error(
        `${t("createPanel.sweepFailed", "Failed to create sweep")}: ${error instanceof Error ? error.message : String(error)}`
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
      className="mx-3 mb-3 p-3 space-y-3 border-emerald-500/30 bg-emerald-500/5 max-h-[80vh] overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <span className="text-xs font-medium text-emerald-500">S</span>
          </div>
          <span className="text-xs font-medium">{t("createPanel.sweep", "Sweep/Pipe")}</span>
          <Badge
            variant="outline"
            className="text-xs h-4 px-1 text-emerald-500 border-emerald-500/30"
          >
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

        {/* Profile Selection */}
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.profile", "Profile")}
          </Label>
          <Select value={profileId} onValueChange={(v) => setProfileId(v ?? "")}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profileShapes.length === 0 ? (
                <SelectItem value="none" disabled className="text-xs">
                  {t("createPanel.noProfiles", "No profiles available")}
                </SelectItem>
              ) : (
                profileShapes.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id} className="text-xs">
                    {obj.name} ({obj.shapeType})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Spine Selection */}
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs text-muted-foreground shrink-0">
            {t("createPanel.spine", "Spine")}
          </Label>
          <Select value={spineId} onValueChange={(v) => setSpineId(v ?? "")}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {spineShapes.length === 0 ? (
                <SelectItem value="none" disabled className="text-xs">
                  {t("createPanel.noSpines", "No paths available")}
                </SelectItem>
              ) : (
                spineShapes.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id} className="text-xs">
                    {obj.name} ({obj.shapeType})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Options */}
        <div className="space-y-2 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              {t("createPanel.hollowPipe", "Hollow (Shell)")}
            </Label>
            <Switch checked={hollow} onCheckedChange={setHollow} />
          </div>

          {hollow && (
            <div className="flex items-center gap-2">
              <Label className="w-20 text-xs text-muted-foreground shrink-0">
                {t("createPanel.wallThickness", "Thickness")}
              </Label>
              <div className="flex-1 flex items-center gap-1">
                <NumberInput
                  value={Number(convertLengthToDisplay(thickness).toFixed(4))}
                  onChange={(v) => setThickness(parseLength(v))}
                  min={0.01}
                  step={0.01}
                  className="h-7 text-xs"
                />
                <span className="text-xs text-muted-foreground w-6">{lengthLabel}</span>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2 rounded-lg bg-muted/20 text-xs text-muted-foreground">
          {t(
            "createPanel.sweepInfo",
            "Sweep extrudes a profile shape along a spine path. Create a circle/rectangle profile and a line/spline path first."
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
          disabled={!profileId || !spineId || isCreating}
          className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700"
        >
          <HugeiconsIcon icon={Tick01Icon} className="size-3 mr-1" />
          {isCreating ? t("createPanel.creating", "Creating...") : t("createPanel.create")}
          <span className="text-xs opacity-60 ml-1">{submitShortcut}</span>
        </Button>
      </div>
    </Card>
  )
}

export default SweepCreator
