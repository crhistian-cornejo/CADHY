/**
 * Drawing Configuration Dialog - CADHY
 *
 * Dialog for configuring technical drawing sheet settings.
 * Inspired by Shapr3D's drawing preferences dialog:
 * - Drawing name
 * - Paper orientation (visual selection)
 * - Paper size
 * - Scale
 * - Include 4 views option (Front, Left, Top, Isometric)
 */

import type {
  Orientation,
  PaperSize,
  ProjectionAngle,
  SheetConfig,
  TitleBlockStyle,
} from "@cadhy/types"
import {
  Button,
  Checkbox,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cadhy/ui"
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

// ============================================================================
// TYPES
// ============================================================================

interface DrawingConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (config: SheetConfig, drawingName: string, includeFourViews: boolean) => void
  initialConfig?: Partial<SheetConfig>
  initialName?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DrawingConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  initialConfig,
  initialName,
}: DrawingConfigDialogProps) {
  const [drawingName, setDrawingName] = useState<string>(initialName ?? "")
  const [orientation, setOrientation] = useState<Orientation>(
    initialConfig?.orientation ?? "landscape"
  )
  const [paperSize, setPaperSize] = useState<PaperSize>(initialConfig?.size ?? "A3")
  const [scale, setScale] = useState<string>(initialConfig?.scale?.toString() ?? "0.25")
  const [projectionAngle, setProjectionAngle] = useState<ProjectionAngle>(
    initialConfig?.projectionAngle ?? "first"
  )
  const [units, setUnits] = useState<string>(initialConfig?.units ?? "mm")
  const [titleBlock, setTitleBlock] = useState<TitleBlockStyle>(
    initialConfig?.titleBlock ?? "simple"
  )
  const [includeFourViews, setIncludeFourViews] = useState<boolean>(true)

  const handleConfirm = () => {
    const config: SheetConfig = {
      orientation,
      size: paperSize,
      scale: Number.parseFloat(scale) || 0.25,
      projectionAngle,
      units,
      titleBlock,
      titleBlockInfo: {
        title: drawingName || undefined,
      },
    }
    onConfirm(config, drawingName, includeFourViews)
    onOpenChange(false)
  }

  const paperSizeOptions: Array<{ value: PaperSize; label: string }> = [
    { value: "A0", label: "ISO A0 (841 × 1189 mm)" },
    { value: "A1", label: "ISO A1 (594 × 841 mm)" },
    { value: "A2", label: "ISO A2 (420 × 594 mm)" },
    { value: "A3", label: "ISO A3 (420 × 297 mm)" },
    { value: "A4", label: "ISO A4 (210 × 297 mm)" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Preferencias de dibujo</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Nombre del dibujo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Nombre:</Label>
            <Input
              value={drawingName}
              onChange={(e) => setDrawingName(e.target.value)}
              placeholder="Mi dibujo"
              className="h-9"
            />
          </div>

          {/* Orientación - Visual selection like Shapr3D */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">Orientación:</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-2.5 rounded-lg border-2 p-4 transition-all duration-200",
                  "hover:border-primary/60 hover:bg-muted/50",
                  orientation === "portrait"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background"
                )}
              >
                <div className="relative">
                  <div className="h-16 w-11 rounded border-2 border-muted-foreground/50 bg-muted/30" />
                  {orientation === "portrait" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-primary p-0.5">
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          className="size-3.5 text-primary-foreground"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground">Vertical</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation("landscape")}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-2.5 rounded-lg border-2 p-4 transition-all duration-200",
                  "hover:border-primary/60 hover:bg-muted/50",
                  orientation === "landscape"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background"
                )}
              >
                <div className="relative">
                  <div className="h-11 w-16 rounded border-2 border-muted-foreground/50 bg-muted/30" />
                  {orientation === "landscape" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-primary p-0.5">
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          className="size-3.5 text-primary-foreground"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground">Horizontal</span>
              </button>
            </div>
          </div>

          {/* Tamaño de hoja */}
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Tamaño de la hoja:
            </Label>
            <Select
              value={typeof paperSize === "string" ? paperSize : "A3"}
              onValueChange={(value) => {
                if (value && typeof value === "string") {
                  setPaperSize(value as PaperSize)
                }
              }}
            >
              <SelectTrigger className="h-8 w-auto min-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paperSizeOptions.map((option) => (
                  <SelectItem key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Escala */}
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Escala de vista a hoja:
            </Label>
            <Select
              value={scale}
              onValueChange={(value) => {
                if (value) setScale(value)
              }}
            >
              <SelectTrigger className="h-8 w-auto min-w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.1">1:10</SelectItem>
                <SelectItem value="0.125">1:8</SelectItem>
                <SelectItem value="0.2">1:5</SelectItem>
                <SelectItem value="0.25">1:4</SelectItem>
                <SelectItem value="0.5">1:2</SelectItem>
                <SelectItem value="1.0">1:1</SelectItem>
                <SelectItem value="2.0">2:1</SelectItem>
                <SelectItem value="5.0">5:1</SelectItem>
                <SelectItem value="10.0">10:1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Incluir 4 vistas - Shapr3D style checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="include-four-views"
              checked={includeFourViews}
              onCheckedChange={(checked) => setIncludeFourViews(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="include-four-views"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Incluir 4 vistas
              </Label>
              <p className="text-xs text-muted-foreground">
                Frontal, Izquierda, Superior, Isométrica
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-[80px]">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="min-w-[80px]">
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
