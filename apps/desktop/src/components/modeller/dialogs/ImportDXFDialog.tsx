/**
 * ImportDXFDialog - CADHY
 *
 * Dialog for importing DXF (AutoCAD Drawing Exchange Format) files.
 * Provides file selection, layer preview, and import configuration.
 */

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  ScrollArea,
  Separator,
  toast,
} from "@cadhy/ui"
import { FolderOpenIcon, Upload01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { type ShapeObject, useModellerStore } from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface ImportDXFDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
}

interface DxfImportResult {
  entities: DxfEntityInfo[]
  total_count: number
  warnings: string[]
  layers: DxfLayerInfo[]
}

interface DxfEntityInfo {
  id: string
  layer: string
  entity_type: string
  color: number
  has_geometry: boolean
}

interface DxfLayerInfo {
  name: string
  color: number
  visible: boolean
  frozen: boolean
  locked: boolean
  entity_count: number
}

// DXF color index to hex mapping (simplified)
const DXF_COLORS: Record<number, string> = {
  0: "#000000", // ByBlock
  1: "#ff0000", // Red
  2: "#ffff00", // Yellow
  3: "#00ff00", // Green
  4: "#00ffff", // Cyan
  5: "#0000ff", // Blue
  6: "#ff00ff", // Magenta
  7: "#ffffff", // White
  8: "#808080", // Gray
  9: "#c0c0c0", // Light Gray
}

function getDxfColor(colorIndex: number): string {
  return DXF_COLORS[colorIndex] ?? "#808080"
}

// ============================================================================
// DIALOG
// ============================================================================

export function ImportDXFDialog({ open, onOpenChange, onImportComplete }: ImportDXFDialogProps) {
  const { t } = useTranslation()
  const { addObject } = useModellerStore()

  const [filePath, setFilePath] = useState<string | null>(null)
  const [preview, setPreview] = useState<DxfImportResult | null>(null)
  const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleSelectFile = useCallback(async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        filters: [{ name: "DXF Files", extensions: ["dxf"] }],
      })

      if (selected && typeof selected === "string") {
        setFilePath(selected)
        setIsLoading(true)

        try {
          const result = await invoke<DxfImportResult>("preview_dxf", {
            filePath: selected,
          })
          setPreview(result)
          // Select all visible layers by default
          setSelectedLayers(
            new Set(result.layers.filter((l) => l.visible && !l.frozen).map((l) => l.name))
          )
        } catch (error) {
          console.error("Failed to preview DXF:", error)
          toast.error(
            `${t("import.previewFailed", "Failed to preview file")}: ${error instanceof Error ? error.message : String(error)}`
          )
        } finally {
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.error("Failed to open file dialog:", error)
    }
  }, [t])

  const handleToggleLayer = (layerName: string) => {
    const newSelected = new Set(selectedLayers)
    if (newSelected.has(layerName)) {
      newSelected.delete(layerName)
    } else {
      newSelected.add(layerName)
    }
    setSelectedLayers(newSelected)
  }

  const handleSelectAllLayers = () => {
    if (preview) {
      setSelectedLayers(new Set(preview.layers.map((l) => l.name)))
    }
  }

  const handleSelectNoneLayers = () => {
    setSelectedLayers(new Set())
  }

  const handleImport = useCallback(async () => {
    if (!filePath || !preview) return

    setIsImporting(true)
    try {
      const result = await invoke<DxfImportResult>("import_dxf_file", {
        filePath,
      })

      // Add entities from selected layers to the scene
      let importedCount = 0
      for (const entity of result.entities) {
        if (selectedLayers.has(entity.layer) && entity.has_geometry) {
          const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
            type: "shape",
            name: `${entity.entity_type}_${entity.id}`,
            layerId: entity.layer,
            visible: true,
            locked: false,
            selected: false,
            shapeType: "wire",
            parameters: {},
            material: {
              color: getDxfColor(entity.color),
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
              dxfEntityType: entity.entity_type,
              dxfLayer: entity.layer,
              dxfColor: entity.color,
            },
          }
          addObject(shapeObject)
          importedCount++
        }
      }

      toast.success(
        t("import.success", "Imported {{count}} entities from DXF", {
          count: importedCount,
        })
      )

      if (result.warnings.length > 0) {
        toast.warning(
          t("import.warnings", "Import completed with {{count}} warnings", {
            count: result.warnings.length,
          })
        )
      }

      onOpenChange(false)
      onImportComplete?.()

      // Reset state
      setFilePath(null)
      setPreview(null)
      setSelectedLayers(new Set())
    } catch (error) {
      console.error("Failed to import DXF:", error)
      toast.error(
        `${t("import.failed", "Import failed")}: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsImporting(false)
    }
  }, [filePath, preview, selectedLayers, addObject, t, onOpenChange, onImportComplete])

  const fileName = filePath?.split("/").pop() ?? filePath?.split("\\").pop()

  const selectedEntityCount = preview
    ? preview.entities.filter((e) => selectedLayers.has(e.layer) && e.has_geometry).length
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Upload01Icon} className="size-5" />
            {t("import.dxfTitle", "Import DXF File")}
          </DialogTitle>
          <DialogDescription>
            {t("import.dxfDescription", "Import 2D/3D geometry from AutoCAD DXF files.")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label>{t("import.file", "File")}</Label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSelectFile} className="flex-1 justify-start">
                <HugeiconsIcon icon={FolderOpenIcon} className="size-4 mr-2" />
                {fileName ?? t("import.selectFile", "Select DXF file...")}
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {/* Preview */}
          {preview && !isLoading && (
            <>
              {/* File Info */}
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("import.entityCount", "Entities")}:
                  </span>
                  <span>{preview.total_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("import.layerCount", "Layers")}:</span>
                  <span>{preview.layers.length}</span>
                </div>
                {preview.warnings.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-500">{t("import.warnings", "Warnings")}:</span>
                    <span className="text-amber-500">{preview.warnings.length}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Layer Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    {t("import.layers", "Layers")} ({selectedLayers.size}/{preview.layers.length})
                  </Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleSelectAllLayers}>
                      {t("import.selectAll", "Select All")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSelectNoneLayers}>
                      {t("import.selectNone", "Select None")}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {preview.layers.map((layer) => (
                      <div
                        key={layer.name}
                        className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded"
                      >
                        <Checkbox
                          checked={selectedLayers.has(layer.name)}
                          onCheckedChange={() => handleToggleLayer(layer.name)}
                        />
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: getDxfColor(layer.color) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{layer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {layer.entity_count} {t("import.entities", "entities")}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {layer.frozen && (
                            <Badge variant="secondary" className="text-xs">
                              {t("import.frozen", "Frozen")}
                            </Badge>
                          )}
                          {layer.locked && (
                            <Badge variant="secondary" className="text-xs">
                              {t("import.locked", "Locked")}
                            </Badge>
                          )}
                          {!layer.visible && (
                            <Badge variant="secondary" className="text-xs">
                              {t("import.hidden", "Hidden")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Entity Type Summary */}
              <div className="p-3 rounded-lg bg-muted/30">
                <Label className="text-xs text-muted-foreground">
                  {t("import.entityTypes", "Entity Types")}
                </Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Array.from(new Set(preview.entities.map((e) => e.entity_type))).map((type) => {
                    const count = preview.entities.filter((e) => e.entity_type === type).length
                    return (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}: {count}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!preview || selectedEntityCount === 0 || isImporting}
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {t("import.importing", "Importing...")}
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Upload01Icon} className="size-4 mr-2" />
                {t("import.import", "Import")} ({selectedEntityCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportDXFDialog
