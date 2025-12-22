/**
 * CAD Operation Dialog - CADHY
 *
 * Global dialog for CAD operations with parameter input.
 * Manages Fillet, Chamfer, Shell, etc. with backend integration.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@cadhy/ui"
import { useEffect } from "react"
import type { OperationDialogState } from "@/hooks"

interface CADOperationDialogProps {
  state: OperationDialogState
  onClose: () => void
  onApply: () => void
  onValueChange: (value: string) => void
}

export function CADOperationDialog({
  state,
  onClose,
  onApply,
  onValueChange,
}: CADOperationDialogProps) {
  // Auto-focus input when dialog opens
  useEffect(() => {
    if (state.open) {
      const input = document.getElementById("operation-value-input")
      if (input) {
        setTimeout(() => input.focus(), 100)
      }
    }
  }, [state.open])

  // Handle Enter key to apply
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      onApply()
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          <DialogDescription>{state.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="operation-value-input" className="text-right">
              {state.label}
            </Label>
            <Input
              id="operation-value-input"
              type="number"
              step="0.1"
              min="0.01"
              value={state.value}
              onChange={(e) => onValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="col-span-3"
              placeholder="Enter value"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
