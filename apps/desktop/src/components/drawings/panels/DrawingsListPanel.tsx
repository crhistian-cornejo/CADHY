/**
 * Drawings List Panel - CADHY
 *
 * Left sidebar panel for managing drawings:
 * - List of all drawings
 * - Create new drawing button
 * - Delete/edit drawings
 */

import type { SheetConfig } from "@cadhy/types"
import { Button, cn, ScrollArea, toast } from "@cadhy/ui"
import { Add01Icon, Delete01Icon, DrawingModeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDrawingStore } from "@/stores/drawing-store"
import { DrawingConfigDialog } from "../dialogs/DrawingConfigDialog"

export function DrawingsListPanel() {
  const { t } = useTranslation()
  const drawings = useDrawingStore((s) => s.drawings)
  const activeDrawingId = useDrawingStore((s) => s.activeDrawingId)
  const setActiveDrawing = useDrawingStore((s) => s.setActiveDrawing)
  const deleteDrawing = useDrawingStore((s) => s.deleteDrawing)
  const createDrawing = useDrawingStore((s) => s.createDrawing)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const handleCreateDrawing = useCallback(() => {
    setShowCreateDialog(true)
  }, [])

  const handleConfigConfirm = useCallback(
    (config: SheetConfig) => {
      try {
        // Create drawing with empty source shapes (user can add views later)
        const drawingId = createDrawing(
          t("drawings.list.defaultName", { date: new Date().toLocaleDateString() }),
          config,
          [] // Empty source shapes - views will be added manually
        )
        setActiveDrawing(drawingId)
        setShowCreateDialog(false)
        toast.success(t("drawings.list.createdSuccess"))
      } catch (error) {
        toast.error(
          t("drawings.list.createError", {
            error: error instanceof Error ? error.message : String(error),
          })
        )
      }
    },
    [createDrawing, setActiveDrawing, t]
  )

  const handleSelectDrawing = useCallback(
    (drawingId: string) => {
      setActiveDrawing(drawingId)
    },
    [setActiveDrawing]
  )

  const handleDeleteDrawing = useCallback(
    (drawingId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (confirm(t("drawings.list.deleteConfirm"))) {
        deleteDrawing(drawingId)
      }
    },
    [deleteDrawing, t]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={DrawingModeIcon} className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("drawings.list.title")}
            </span>
          </div>
        </div>
      </div>

      {/* Create button */}
      <div className="border-b border-border/40 p-2">
        <Button size="sm" className="w-full" onClick={handleCreateDrawing}>
          <HugeiconsIcon icon={Add01Icon} className="size-4 mr-2" />
          {t("drawings.list.newDrawing")}
        </Button>
      </div>

      {/* Drawings list */}
      <ScrollArea className="flex-1" showFadeMasks>
        <div className="p-2 space-y-1">
          {drawings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <HugeiconsIcon icon={DrawingModeIcon} className="size-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("drawings.list.noDrawings")}</p>
              <p className="text-xs mt-1">{t("drawings.list.createToStart")}</p>
            </div>
          ) : (
            drawings.map((drawing) => (
              <div
                key={drawing.id}
                className={cn(
                  "group relative rounded-lg border p-2 cursor-pointer transition-colors",
                  activeDrawingId === drawing.id
                    ? "border-primary bg-primary/10"
                    : "border-border/40 hover:border-border hover:bg-muted/50"
                )}
                onClick={() => handleSelectDrawing(drawing.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{drawing.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {drawing.views.length}{" "}
                      {drawing.views.length !== 1
                        ? t("drawings.list.views")
                        : t("drawings.list.view")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                    onClick={(e) => handleDeleteDrawing(drawing.id, e)}
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="size-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create dialog */}
      <DrawingConfigDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onConfirm={handleConfigConfirm}
      />
    </div>
  )
}
