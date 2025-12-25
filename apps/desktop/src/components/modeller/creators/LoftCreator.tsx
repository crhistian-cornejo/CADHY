/**
 * LoftCreator - CADHY
 *
 * UI component for creating lofted solids/shells through multiple wire profiles.
 * Uses the existing cad_loft Tauri command.
 */

import { Badge, Button, Card, Input, Label, ScrollArea, Switch, toast } from "@cadhy/ui"
import { Add01Icon, Cancel01Icon, Delete01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import * as cadService from "@/services/cad-service"
import { type ShapeObject, useModellerStore, useObjects } from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface LoftCreatorProps {
  onClose: () => void
  onCreated: () => void
}

// ============================================================================
// LOFT CREATOR
// ============================================================================

export function LoftCreator({ onClose, onCreated }: LoftCreatorProps) {
  const { t } = useTranslation()
  const { addObject } = useModellerStore()
  const allObjects = useObjects()
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Get wire/curve objects that can be used as profiles
  const availableProfiles = useMemo(() => {
    return allObjects.filter(
      (obj) =>
        obj.type === "shape" &&
        (obj as ShapeObject).metadata?.backendShapeId &&
        // Include shapes that could be profiles: circles, rectangles, ellipses, wires
        ["circle", "rectangle", "ellipse", "wire", "polygon", "polyline"].includes(
          (obj as ShapeObject).shapeType || ""
        )
    ) as ShapeObject[]
  }, [allObjects])

  // Form state
  const [name, setName] = useState("Loft")
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])
  const [solid, setSolid] = useState(true)
  const [ruled, setRuled] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Focus name input when form opens
  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Add profile to selection
  const addProfile = (id: string) => {
    if (!selectedProfileIds.includes(id)) {
      setSelectedProfileIds([...selectedProfileIds, id])
    }
  }

  // Remove profile from selection
  const removeProfile = (id: string) => {
    setSelectedProfileIds(selectedProfileIds.filter((pid) => pid !== id))
  }

  // Move profile up in order
  const moveProfileUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...selectedProfileIds]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setSelectedProfileIds(newOrder)
  }

  // Move profile down in order
  const moveProfileDown = (index: number) => {
    if (index === selectedProfileIds.length - 1) return
    const newOrder = [...selectedProfileIds]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setSelectedProfileIds(newOrder)
  }

  const handleCreate = async () => {
    if (selectedProfileIds.length < 2) {
      toast.error(t("createPanel.loftMinProfiles", "Select at least 2 profiles"))
      return
    }

    setIsCreating(true)
    try {
      // Get backend shape IDs for the selected profiles
      const backendIds = selectedProfileIds
        .map((id) => {
          const obj = allObjects.find((o) => o.id === id) as ShapeObject | undefined
          return obj?.metadata?.backendShapeId as string | undefined
        })
        .filter((id): id is string => Boolean(id))

      if (backendIds.length < 2) {
        toast.error(t("createPanel.loftInvalidProfiles", "Selected profiles are invalid"))
        return
      }

      // Call Tauri loft command
      const result = await cadService.loft(backendIds, solid, ruled)

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
        shapeType: "loft",
        parameters: {
          numProfiles: selectedProfileIds.length,
          solid: solid ? 1 : 0,
          ruled: ruled ? 1 : 0,
        },
        mesh: {
          vertices: new Float32Array(meshData.vertices),
          normals: new Float32Array(meshData.normals ?? []),
          indices: new Uint32Array(meshData.indices),
        },
        material: {
          color: "#8b5cf6",
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
      toast.success(t("createPanel.loftCreated", "Loft created successfully"))
      onCreated()
    } catch (error) {
      console.error("Failed to create loft:", error)
      toast.error(
        `${t("createPanel.loftFailed", "Failed to create loft")}: ${error instanceof Error ? error.message : String(error)}`
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

  const unselectedProfiles = availableProfiles.filter((p) => !selectedProfileIds.includes(p.id))

  return (
    <Card
      className="mx-3 mb-3 p-3 space-y-3 border-violet-500/30 bg-violet-500/5 max-h-[80vh] overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-2xl bg-violet-500/20 flex items-center justify-center">
            <span className="text-xs font-medium text-violet-500">L</span>
          </div>
          <span className="text-xs font-medium">{t("createPanel.loft", "Loft")}</span>
          <Badge
            variant="outline"
            className="text-xs h-4 px-1 text-violet-500 border-violet-500/30"
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

        {/* Selected Profiles */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t("createPanel.selectedProfiles", "Selected Profiles")} ({selectedProfileIds.length})
          </Label>
          <div className="border border-border/40 rounded-lg p-2 min-h-[60px] space-y-1">
            {selectedProfileIds.length === 0 ? (
              <div className="text-xs text-muted-foreground/50 text-center py-2">
                {t("createPanel.noProfilesSelected", "No profiles selected")}
              </div>
            ) : (
              selectedProfileIds.map((id, index) => {
                const obj = allObjects.find((o) => o.id === id)
                return (
                  <div
                    key={id}
                    className="flex items-center gap-1 px-2 py-1 bg-violet-500/10 rounded text-xs"
                  >
                    <span className="text-violet-400 font-mono w-4">{index + 1}</span>
                    <span className="flex-1 truncate">{obj?.name ?? id}</span>
                    <button
                      type="button"
                      onClick={() => moveProfileUp(index)}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 px-1"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveProfileDown(index)}
                      disabled={index === selectedProfileIds.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 px-1"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProfile(id)}
                      className="text-red-400 hover:text-red-300 px-1"
                    >
                      <HugeiconsIcon icon={Delete01Icon} className="size-3" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Available Profiles */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t("createPanel.availableProfiles", "Available Profiles")}
          </Label>
          <ScrollArea className="h-24 border border-border/40 rounded-lg">
            <div className="p-2 space-y-1">
              {unselectedProfiles.length === 0 ? (
                <div className="text-xs text-muted-foreground/50 text-center py-2">
                  {t("createPanel.noProfilesAvailable", "No wire profiles available")}
                </div>
              ) : (
                unselectedProfiles.map((obj) => (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => addProfile(obj.id)}
                    className="w-full flex items-center gap-2 px-2 py-1 hover:bg-muted/30 rounded text-xs text-left"
                  >
                    <HugeiconsIcon icon={Add01Icon} className="size-3 text-violet-400" />
                    <span className="flex-1 truncate">{obj.name}</span>
                    <span className="text-muted-foreground">{obj.shapeType}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Options */}
        <div className="space-y-2 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              {t("createPanel.solidLoft", "Solid")}
            </Label>
            <Switch checked={solid} onCheckedChange={setSolid} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              {t("createPanel.ruledLoft", "Ruled Surface")}
            </Label>
            <Switch checked={ruled} onCheckedChange={setRuled} />
          </div>
        </div>

        {/* Info */}
        <div className="p-2 rounded-lg bg-muted/20 text-xs text-muted-foreground">
          {t(
            "createPanel.loftInfo",
            "Loft creates a smooth surface or solid through two or more profile curves. Order matters - profiles are connected in sequence."
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
          disabled={selectedProfileIds.length < 2 || isCreating}
          className="flex-1 h-8 bg-violet-600 hover:bg-violet-700"
        >
          <HugeiconsIcon icon={Tick01Icon} className="size-3 mr-1" />
          {isCreating ? t("createPanel.creating", "Creating...") : t("createPanel.create")}
          <span className="text-xs opacity-60 ml-1">{submitShortcut}</span>
        </Button>
      </div>
    </Card>
  )
}

export default LoftCreator
