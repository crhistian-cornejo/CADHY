/**
 * HelixCreator - CADHY
 *
 * UI component for creating helix (spiral) wire shapes.
 * Uses the existing cad_create_helix Tauri command.
 */

import { Badge, Button, Card, Input, Label, NumberInput, Switch, toast } from "@cadhy/ui"
import { Cancel01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useUnits } from "@/hooks/use-units"
import * as cadService from "@/services/cad-service"
import { type ShapeObject, useModellerStore } from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface HelixCreatorProps {
  onClose: () => void
  onCreated: () => void
}

// ============================================================================
// HELIX CREATOR
// ============================================================================

export function HelixCreator({ onClose, onCreated }: HelixCreatorProps) {
  const { t } = useTranslation()
  const { addObject } = useModellerStore()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { lengthLabel, convertLengthToDisplay, parseLength } = useUnits()

  // Form state
  const [name, setName] = useState("Helix")
  const [radius, setRadius] = useState(1)
  const [pitch, setPitch] = useState(0.5)
  const [height, setHeight] = useState(5)
  const [clockwise, setClockwise] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // Computed values
  const turns = useMemo(() => {
    return pitch > 0 ? height / pitch : 0
  }, [height, pitch])

  // Focus name input when form opens
  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const handleCreate = async () => {
    if (radius <= 0 || pitch <= 0 || height <= 0) {
      toast.error(t("createPanel.helixInvalidParams", "All dimensions must be positive"))
      return
    }

    setIsCreating(true)
    try {
      // Call Tauri helix command
      const result = await cadService.createHelix(radius, pitch, height, clockwise)

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
        shapeType: "helix",
        parameters: {
          radius,
          pitch,
          height,
          clockwise: clockwise ? 1 : 0,
          turns,
        },
        mesh: {
          vertices: new Float32Array(meshData.vertices),
          normals: new Float32Array(meshData.normals ?? []),
          indices: new Uint32Array(meshData.indices),
        },
        material: {
          color: "#f59e0b",
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
      toast.success(t("createPanel.helixCreated", "Helix created successfully"))
      onCreated()
    } catch (error) {
      console.error("Failed to create helix:", error)
      toast.error(
        `${t("createPanel.helixFailed", "Failed to create helix")}: ${error instanceof Error ? error.message : String(error)}`
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
      className="mx-3 mb-3 p-3 space-y-3 border-amber-500/30 bg-amber-500/5 max-h-[80vh] overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-2xl bg-amber-500/20 flex items-center justify-center">
            <span className="text-xs font-medium text-amber-500">H</span>
          </div>
          <span className="text-xs font-medium">{t("createPanel.helix", "Helix")}</span>
          <Badge variant="outline" className="text-xs h-4 px-1 text-amber-500 border-amber-500/30">
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

        {/* Geometry */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="w-20 text-xs text-muted-foreground shrink-0">
              {t("properties.radius", "Radius")}
            </Label>
            <div className="flex-1 flex items-center gap-1">
              <NumberInput
                value={Number(convertLengthToDisplay(radius).toFixed(4))}
                onChange={(v) => setRadius(parseLength(v))}
                min={0.01}
                step={0.1}
                className="h-7 text-xs"
              />
              <span className="text-xs text-muted-foreground w-6">{lengthLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-20 text-xs text-muted-foreground shrink-0">
              {t("createPanel.pitch", "Pitch")}
            </Label>
            <div className="flex-1 flex items-center gap-1">
              <NumberInput
                value={Number(convertLengthToDisplay(pitch).toFixed(4))}
                onChange={(v) => setPitch(parseLength(v))}
                min={0.01}
                step={0.1}
                className="h-7 text-xs"
              />
              <span className="text-xs text-muted-foreground w-6">{lengthLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-20 text-xs text-muted-foreground shrink-0">
              {t("properties.height", "Height")}
            </Label>
            <div className="flex-1 flex items-center gap-1">
              <NumberInput
                value={Number(convertLengthToDisplay(height).toFixed(4))}
                onChange={(v) => setHeight(parseLength(v))}
                min={0.1}
                step={0.5}
                className="h-7 text-xs"
              />
              <span className="text-xs text-muted-foreground w-6">{lengthLabel}</span>
            </div>
          </div>
        </div>

        {/* Direction */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <Label className="text-xs text-muted-foreground">
            {t("createPanel.clockwise", "Clockwise")}
          </Label>
          <Switch checked={clockwise} onCheckedChange={setClockwise} />
        </div>

        {/* Computed Values */}
        <div className="p-2 rounded-lg bg-muted/20 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("createPanel.turns", "Turns")}:</span>
            <span className="font-mono">{turns.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("createPanel.helixLength", "Wire Length")}:
            </span>
            <span className="font-mono">
              ~{(turns * 2 * Math.PI * radius).toFixed(2)} {lengthLabel}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-2 rounded-lg bg-muted/20 text-xs text-muted-foreground">
          {t(
            "createPanel.helixInfo",
            "Creates a spiral wire that can be used as a sweep path for springs, threads, or decorative elements."
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
          disabled={isCreating}
          className="flex-1 h-8 bg-amber-600 hover:bg-amber-700"
        >
          <HugeiconsIcon icon={Tick01Icon} className="size-3 mr-1" />
          {isCreating ? t("createPanel.creating", "Creating...") : t("createPanel.create")}
          <span className="text-xs opacity-60 ml-1">{submitShortcut}</span>
        </Button>
      </div>
    </Card>
  )
}

export default HelixCreator
