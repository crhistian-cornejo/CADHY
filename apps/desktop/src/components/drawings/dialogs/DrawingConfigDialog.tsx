/**
 * Drawing Configuration Dialog - CADHY
 *
 * Dialog for configuring technical drawing sheet settings:
 * - Paper size and orientation
 * - Scale
 * - Projection angle
 * - Units
 * - Title block style
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
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useTranslation } from "react-i18next"

// ============================================================================
// TYPES
// ============================================================================

interface DrawingConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (config: SheetConfig) => void
  initialConfig?: Partial<SheetConfig>
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DrawingConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  initialConfig,
}: DrawingConfigDialogProps) {
  const { t } = useTranslation()
  const [orientation, setOrientation] = useState<Orientation>(
    initialConfig?.orientation ?? "landscape"
  )
  const [paperSize, setPaperSize] = useState<PaperSize>(initialConfig?.size ?? "A3")
  const [scale, setScale] = useState<string>(initialConfig?.scale?.toString() ?? "0.25")
  const [projectionAngle, setProjectionAngle] = useState<ProjectionAngle>(
    initialConfig?.projectionAngle ?? "first"
  )
  const [units, setUnits] = useState<string>(initialConfig?.units ?? "m")
  const [titleBlock, setTitleBlock] = useState<TitleBlockStyle>(
    initialConfig?.titleBlock ?? "simple"
  )

  const handleConfirm = () => {
    const config: SheetConfig = {
      orientation,
      size: paperSize,
      scale: Number.parseFloat(scale) || 0.25,
      projectionAngle,
      units,
      titleBlock,
    }
    onConfirm(config)
    onOpenChange(false)
  }

  const paperSizeOptions: Array<{ value: PaperSize; label: string }> = [
    { value: "A0", label: "ISO A0 (841 x 1189 mm)" },
    { value: "A1", label: "ISO A1 (594 x 841 mm)" },
    { value: "A2", label: "ISO A2 (420 x 594 mm)" },
    { value: "A3", label: "ISO A3 (297 x 420 mm)" },
    { value: "A4", label: "ISO A4 (210 x 297 mm)" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("drawings.config.dialogTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Orientación */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              {t("drawings.config.orientation")}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-5 transition-all duration-200",
                  "hover:border-primary/60 hover:bg-muted/50",
                  orientation === "portrait"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background"
                )}
              >
                <div className="relative">
                  <div className="h-20 w-14 rounded-md border-2 border-foreground/60 bg-muted/30 transition-colors group-hover:border-foreground/80" />
                  {orientation === "portrait" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-primary p-1 shadow-md">
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          className="size-4 text-primary-foreground"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {t("drawings.config.portrait")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation("landscape")}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-5 transition-all duration-200",
                  "hover:border-primary/60 hover:bg-muted/50",
                  orientation === "landscape"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background"
                )}
              >
                <div className="relative">
                  <div className="h-14 w-20 rounded-md border-2 border-foreground/60 bg-muted/30 transition-colors group-hover:border-foreground/80" />
                  {orientation === "landscape" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-primary p-1 shadow-md">
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          className="size-4 text-primary-foreground"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {t("drawings.config.landscape")}
                </span>
              </button>
            </div>
          </div>

          {/* Tamaño de hoja */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {t("drawings.config.paperSize")}
            </Label>
            <Select
              value={typeof paperSize === "string" ? paperSize : "A3"}
              onValueChange={(value) => {
                if (value && typeof value === "string") {
                  setPaperSize(value as PaperSize)
                }
              }}
            >
              <SelectTrigger className="h-9">
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
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {t("drawings.config.scale")}
            </Label>
            <Select
              value={scale}
              onValueChange={(value) => {
                if (value) setScale(value)
              }}
            >
              <SelectTrigger className="h-9">
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

          {/* Proyección */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {t("drawings.config.projection")}
            </Label>
            <Select
              value={projectionAngle}
              onValueChange={(value) => {
                if (value) setProjectionAngle(value as ProjectionAngle)
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first">{t("drawings.config.firstAngle")}</SelectItem>
                <SelectItem value="third">{t("drawings.config.thirdAngle")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Unidades */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {t("drawings.config.units")}
            </Label>
            <Select
              value={units}
              onValueChange={(value) => {
                if (value) setUnits(value)
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mm">{t("drawings.config.mm")}</SelectItem>
                <SelectItem value="cm">{t("drawings.config.cm")}</SelectItem>
                <SelectItem value="m">{t("drawings.config.m")}</SelectItem>
                <SelectItem value="in">{t("drawings.config.in")}</SelectItem>
                <SelectItem value="ft">{t("drawings.config.ft")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bloque de título */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {t("drawings.config.titleBlock")}
            </Label>
            <Select
              value={titleBlock}
              onValueChange={(value) => setTitleBlock(value as TitleBlockStyle)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">{t("drawings.config.simple")}</SelectItem>
                <SelectItem value="standard">{t("drawings.config.standard")}</SelectItem>
                <SelectItem value="custom">{t("drawings.config.custom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-[80px]">
            {t("drawings.config.cancel")}
          </Button>
          <Button onClick={handleConfirm} className="min-w-[80px]">
            {t("drawings.config.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
