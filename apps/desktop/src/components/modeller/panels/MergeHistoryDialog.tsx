/**
 * Merge History Dialog - CADHY
 *
 * Dialog for merging modeling steps in the history.
 * Allows users to combine previous steps and delete subsequent ones.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
} from "@cadhy/ui"
import { useState } from "react"
import { useModellerStore } from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface MergeHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mergeIndex: number
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MergeHistoryDialog({ open, onOpenChange, mergeIndex }: MergeHistoryDialogProps) {
  const { mergeHistory } = useModellerStore()
  const [deleteSketches, setDeleteSketches] = useState(true)
  const [keepVariables, setKeepVariables] = useState(true)

  const handleMerge = () => {
    mergeHistory(mergeIndex, {
      deleteSketches,
      keepVariables,
    })
    onOpenChange(false)
    // Reset state
    setDeleteSketches(true)
    setKeepVariables(true)
  }

  const handleSketchesChange = (value: unknown) => {
    const val = value as "delete" | "keep"
    setDeleteSketches(val === "delete")
  }

  const handleVariablesChange = (value: unknown) => {
    const val = value as "delete" | "keep"
    setKeepVariables(val === "keep")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Unir pasos de modelado</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Desvincula todos los bocetos de los cuerpos. Al unir, se combinan los pasos previos y se
            eliminan todos aquellos posteriores al punto de interrupción. No se podrán recuperar
            tras abandonar el proyecto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sketch Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Bocetos</Label>
            <RadioGroup
              value={deleteSketches ? "delete" : "keep"}
              onValueChange={handleSketchesChange}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delete" id="delete-sketches" />
                <Label htmlFor="delete-sketches" className="font-normal cursor-pointer">
                  Eliminar bocetos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="keep" id="keep-sketches" />
                <Label htmlFor="keep-sketches" className="font-normal cursor-pointer">
                  Mantener bocetos
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Variable Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Variables</Label>
            <RadioGroup
              value={keepVariables ? "keep" : "delete"}
              onValueChange={handleVariablesChange}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delete" id="delete-variables" />
                <Label htmlFor="delete-variables" className="font-normal cursor-pointer">
                  Eliminar variables
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="keep" id="keep-variables" />
                <Label htmlFor="keep-variables" className="font-normal cursor-pointer">
                  Mantener variables
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} className="gap-2">
            Unir ahora
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>M
            </kbd>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
