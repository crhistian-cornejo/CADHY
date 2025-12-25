/**
 * History Entry Details - CADHY
 *
 * Expandable panel showing detailed information about a history entry.
 * Shows operation parameters and allows editing them.
 */

import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
  Label,
  Switch,
} from "@cadhy/ui"
import { ArrowDown01Icon, Edit01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { CadIcon } from "@/components/ui/cad-icon"
import type { HistoryEntry } from "@/stores/modeller/types"

// ============================================================================
// TYPES
// ============================================================================

interface HistoryEntryDetailsProps {
  entry: HistoryEntry
  operationIcon: string
  operationName: string
  isExpanded: boolean
  onToggleExpanded: () => void
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HistoryEntryDetails({
  entry,
  operationIcon,
  operationName,
  isExpanded,
  onToggleExpanded,
}: HistoryEntryDetailsProps) {
  const details = entry.details || {}

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <div className="border-t border-border first:border-t-0">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 bg-primary/10 px-4 py-3 hover:bg-primary/15 transition-colors">
            <div className="flex shrink-0 items-center justify-center">
              <CadIcon name={operationIcon} size={20} className="text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-foreground">{operationName}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
              </Button>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-4 py-3 space-y-3 bg-muted/30">
            {/* Start Center */}
            {details.startCenter !== undefined && (
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Centro de inicio</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  Editar...
                  <HugeiconsIcon icon={Edit01Icon} className="size-3" />
                </Button>
              </div>
            )}

            {/* Target Bodies */}
            {details.targetBodies !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label className="text-sm text-muted-foreground">Cuerpos objetivo</Label>
                  <span className="text-xs text-foreground">
                    {Array.isArray(details.targetBodies) && details.targetBodies.length > 0
                      ? details.targetBodies.length === 1
                        ? "Primer cuerpo"
                        : details.targetBodies.length === 2
                          ? "Segundo cuerpo"
                          : `${details.targetBodies.length} cuerpos`
                      : "Ninguno"}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  Editar...
                  <HugeiconsIcon icon={Edit01Icon} className="size-3" />
                </Button>
              </div>
            )}

            {/* Target Faces */}
            {details.targetFaces !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label className="text-sm text-muted-foreground">Caras objetivo</Label>
                  <span className="text-xs text-foreground">
                    {details.targetFaces} {details.targetFaces === 1 ? "cara" : "caras"}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  Editar...
                  <HugeiconsIcon icon={Edit01Icon} className="size-3" />
                </Button>
              </div>
            )}

            {/* Target Edges */}
            {details.targetEdges !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label className="text-sm text-muted-foreground">Aristas objetivo</Label>
                  <span className="text-xs text-foreground">
                    {details.targetEdges} {details.targetEdges === 1 ? "arista" : "aristas"}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  Editar...
                  <HugeiconsIcon icon={Edit01Icon} className="size-3" />
                </Button>
              </div>
            )}

            {/* Copy Toggle */}
            {details.copy !== undefined && (
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Copiar</Label>
                <Switch checked={details.copy === true} onCheckedChange={() => {}} />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
