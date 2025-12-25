/**
 * ImportIFCDialog - CADHY
 *
 * Dialog for importing IFC (Industry Foundation Classes) files.
 * Provides file selection, preview, and import configuration.
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

interface ImportIFCDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
}

interface IfcImportResult {
  objects: ImportedObjectInfo[]
  total_count: number
  warnings: string[]
  schema: string
}

interface ImportedObjectInfo {
  id: string
  name: string
  ifc_class: string
  global_id: string
  has_geometry: boolean
  properties: Record<string, unknown>
}

// ============================================================================
// DIALOG
// ============================================================================

export function ImportIFCDialog({ open, onOpenChange, onImportComplete }: ImportIFCDialogProps) {
  const { t } = useTranslation()
  const { addObject } = useModellerStore()

  const [filePath, setFilePath] = useState<string | null>(null)
  const [preview, setPreview] = useState<IfcImportResult | null>(null)
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleSelectFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "IFC Files",
            extensions: ["ifc", "ifczip"],
          },
        ],
      })

      if (selected && typeof selected === "string") {
        setFilePath(selected)
        setIsLoading(true)

        // Load preview
        try {
          const result = await invoke<IfcImportResult>("preview_ifc", {
            filePath: selected,
          })
          setPreview(result)
          // Select all objects by default
          setSelectedObjects(new Set(result.objects.map((o) => o.id)))
        } catch (error) {
          console.error("Failed to preview IFC:", error)
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

  const handleToggleObject = (id: string) => {
    const newSelected = new Set(selectedObjects)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedObjects(newSelected)
  }

  const handleSelectAll = () => {
    if (preview) {
      setSelectedObjects(new Set(preview.objects.map((o) => o.id)))
    }
  }

  const handleSelectNone = () => {
    setSelectedObjects(new Set())
  }

  const handleImport = useCallback(async () => {
    if (!filePath || !preview) return

    setIsImporting(true)
    try {
      // Import the full file
      const result = await invoke<IfcImportResult>("import_ifc", {
        filePath,
      })

      // Add selected objects to the scene
      let importedCount = 0
      for (const obj of result.objects) {
        if (selectedObjects.has(obj.id) && obj.has_geometry) {
          // Create a shape object for each imported IFC object
          const shapeObject: Omit<ShapeObject, "id" | "createdAt" | "updatedAt"> = {
            type: "shape",
            name: obj.name,
            layerId: "default",
            visible: true,
            locked: false,
            selected: false,
            shapeType: "compound",
            parameters: {},
            material: {
              color: "#64748b",
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
              ifcClass: obj.ifc_class,
              ifcGlobalId: obj.global_id,
              ifcProperties: obj.properties,
            },
          }
          addObject(shapeObject)
          importedCount++
        }
      }

      toast.success(
        t("import.success", "Imported {{count}} objects from IFC", {
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
      setSelectedObjects(new Set())
    } catch (error) {
      console.error("Failed to import IFC:", error)
      toast.error(
        `${t("import.failed", "Import failed")}: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsImporting(false)
    }
  }, [filePath, preview, selectedObjects, addObject, t, onOpenChange, onImportComplete])

  const fileName = filePath?.split("/").pop() ?? filePath?.split("\\").pop()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Upload01Icon} className="size-5" />
            {t("import.ifcTitle", "Import IFC File")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "import.ifcDescription",
              "Import geometry and properties from Industry Foundation Classes (IFC) files."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label>{t("import.file", "File")}</Label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSelectFile} className="flex-1 justify-start">
                <HugeiconsIcon icon={FolderOpenIcon} className="size-4 mr-2" />
                {fileName ?? t("import.selectFile", "Select IFC file...")}
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
                  <span className="text-muted-foreground">{t("import.schema", "Schema")}:</span>
                  <Badge variant="outline">{preview.schema}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("import.objectCount", "Objects")}:
                  </span>
                  <span>{preview.total_count}</span>
                </div>
                {preview.warnings.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-500">{t("import.warnings", "Warnings")}:</span>
                    <span className="text-amber-500">{preview.warnings.length}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Object List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    {t("import.objects", "Objects")} ({selectedObjects.size}/
                    {preview.objects.length})
                  </Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                      {t("import.selectAll", "Select All")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                      {t("import.selectNone", "Select None")}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[250px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {preview.objects.map((obj) => (
                      <div
                        key={obj.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded"
                      >
                        <Checkbox
                          checked={selectedObjects.has(obj.id)}
                          onCheckedChange={() => handleToggleObject(obj.id)}
                          disabled={!obj.has_geometry}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{obj.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {obj.ifc_class}
                          </div>
                        </div>
                        {obj.has_geometry ? (
                          <Badge variant="default" className="shrink-0">
                            {t("import.hasGeometry", "3D")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">
                            {t("import.noGeometry", "No Geo")}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
            disabled={!preview || selectedObjects.size === 0 || isImporting}
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {t("import.importing", "Importing...")}
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Upload01Icon} className="size-4 mr-2" />
                {t("import.import", "Import")} ({selectedObjects.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportIFCDialog
