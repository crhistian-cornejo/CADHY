/**
 * History Panel - CADHY
 *
 * Displays a chronological list of all CAD operations performed,
 * similar to parametric CAD software like Plasticity or Fusion 360.
 * Users can see the operation history and navigate through it.
 */

import { Button, cn, ScrollArea } from "@cadhy/ui"
import { ArrowDown01Icon, ClockIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CadIcon } from "@/components/ui/cad-icon"
import { useModellerStore } from "@/stores/modeller"
import type { HistoryOperationType } from "@/stores/modeller/types"
import { HistoryEntryDetails } from "./HistoryEntryDetails"
import { MergeHistoryDialog } from "./MergeHistoryDialog"

// ============================================================================
// TYPES
// ============================================================================

interface HistoryPanelProps {
  className?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse action string to determine operation type and icon
 */
function parseOperation(action: string): {
  type: HistoryOperationType
  icon: string
  displayName: string
} {
  const lowerAction = action.toLowerCase()

  // Sketch operations
  if (lowerAction.includes("boceto") || lowerAction.includes("sketch")) {
    return { type: "sketch", icon: "select", displayName: action }
  }

  // Extrusion operations
  if (
    lowerAction.includes("extrusión") ||
    lowerAction.includes("extrude") ||
    lowerAction.includes("extrusion")
  ) {
    return { type: "extrusion", icon: "extrude", displayName: action }
  }

  // Revolve operations
  if (lowerAction.includes("revolve") || lowerAction.includes("rotación")) {
    return { type: "revolve", icon: "revolve", displayName: action }
  }

  // Fillet operations
  if (lowerAction.includes("empalme") || lowerAction.includes("fillet")) {
    return { type: "fillet", icon: "fillet", displayName: action }
  }

  // Chamfer operations
  if (lowerAction.includes("chaflán") || lowerAction.includes("chamfer")) {
    return { type: "chamfer", icon: "chamfer", displayName: action }
  }

  // Offset operations
  if (lowerAction.includes("desfase") || lowerAction.includes("offset")) {
    return { type: "offset", icon: "offset", displayName: action }
  }

  // Shell operations
  if (lowerAction.includes("shell") || lowerAction.includes("hueco")) {
    return { type: "shell", icon: "shell", displayName: action }
  }

  // Boolean operations
  if (
    lowerAction.includes("union") ||
    lowerAction.includes("difference") ||
    lowerAction.includes("intersection") ||
    lowerAction.includes("boolean")
  ) {
    return { type: "boolean", icon: "union", displayName: action }
  }

  // Transform operations
  if (lowerAction.includes("transform") || lowerAction.includes("transformar")) {
    return { type: "transform", icon: "move", displayName: action }
  }

  // Move operations
  if (
    lowerAction.includes("move") ||
    lowerAction.includes("mover") ||
    lowerAction.includes("movimiento")
  ) {
    return { type: "move", icon: "move", displayName: action }
  }

  // Rotate operations
  if (
    lowerAction.includes("rotate") ||
    lowerAction.includes("rotar") ||
    lowerAction.includes("giro")
  ) {
    return { type: "rotate", icon: "rotate", displayName: action }
  }

  // Scale operations
  if (lowerAction.includes("scale") || lowerAction.includes("escalar")) {
    return { type: "scale", icon: "scale", displayName: action }
  }

  // Create operations
  if (
    lowerAction.includes("add") ||
    lowerAction.includes("create") ||
    lowerAction.includes("crear")
  ) {
    return { type: "create", icon: "box", displayName: action }
  }

  // Delete operations
  if (lowerAction.includes("delete") || lowerAction.includes("eliminar")) {
    return { type: "delete", icon: "delete", displayName: action }
  }

  // Duplicate operations
  if (lowerAction.includes("duplicate") || lowerAction.includes("duplicar")) {
    return { type: "duplicate", icon: "box", displayName: action }
  }

  // Update operations
  if (lowerAction.includes("update") || lowerAction.includes("actualizar")) {
    return { type: "update", icon: "settings", displayName: action }
  }

  // Default
  return { type: "other", icon: "settings", displayName: action }
}

/**
 * Format timestamp to relative time
 */
function formatTimestamp(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) {
    return "Ahora"
  }
  if (minutes < 60) {
    return `Hace ${minutes} min`
  }
  if (hours < 24) {
    return `Hace ${hours} h`
  }
  return new Date(timestamp).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HistoryPanel({ className }: HistoryPanelProps) {
  const { t } = useTranslation()
  const { history, historyIndex, historyPreviewIndex, undo, redo, setHistoryPreview } =
    useModellerStore()

  // State for expanded entries and merge dialog
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [mergeIndex, setMergeIndex] = useState<number | null>(null)

  // Reverse history to show most recent first (like in the image)
  const reversedHistory = [...history].reverse()

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }

  const handleMergeClick = (index: number) => {
    const actualIndex = history.length - 1 - index
    setMergeIndex(actualIndex)
    setMergeDialogOpen(true)
  }

  const handleHistoryItemClick = (index: number) => {
    const targetIndex = history.length - 1 - index
    const currentIndex = historyIndex

    // Clear preview when clicking
    setHistoryPreview(null)

    if (targetIndex < currentIndex) {
      // Need to undo
      const steps = currentIndex - targetIndex
      for (let i = 0; i < steps; i++) {
        undo()
      }
    } else if (targetIndex > currentIndex) {
      // Need to redo
      const steps = targetIndex - currentIndex
      for (let i = 0; i < steps; i++) {
        redo()
      }
    }
  }

  const handleHistoryItemHover = (index: number | null) => {
    if (index === null) {
      setHistoryPreview(null)
      return
    }
    const targetIndex = history.length - 1 - index
    setHistoryPreview(targetIndex)
  }

  return (
    <div className={cn("flex h-full flex-col bg-background border-l border-border", className)}>
      {/* Header */}
      <div className="flex items-center px-3 py-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ClockIcon} className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">Historial</span>
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1 min-h-0" showFadeMasks>
        <div className="p-2">
          {reversedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HugeiconsIcon icon={ClockIcon} className="size-12 text-muted-foreground/50 mb-3" />
              <p className="text-xs text-muted-foreground">No hay operaciones en el historial</p>
            </div>
          ) : (
            <div className="space-y-1">
              {reversedHistory.map((entry, index) => {
                const actualIndex = history.length - 1 - index
                const isActive = actualIndex === historyIndex
                const isPast = actualIndex < historyIndex
                const operation = parseOperation(entry.action)

                const isPreviewing = historyPreviewIndex === actualIndex
                const isExpanded = expandedEntries.has(entry.id)

                return (
                  <div key={entry.id} className="space-y-0">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleHistoryItemClick(index)}
                        onMouseEnter={() => handleHistoryItemHover(index)}
                        onMouseLeave={() => handleHistoryItemHover(null)}
                        className={cn(
                          "group flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          "hover:bg-accent/50 focus-visible:bg-accent focus-visible:outline-none",
                          isActive && "bg-accent",
                          isPast && "opacity-60",
                          isPreviewing && "bg-primary/10 border border-primary/30"
                        )}
                      >
                        {/* Icon */}
                        <div className="flex shrink-0 items-center justify-center">
                          <CadIcon
                            name={operation.icon}
                            size={18}
                            className={cn(
                              "text-muted-foreground transition-colors",
                              isActive && "text-foreground"
                            )}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground">
                            {operation.displayName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTimestamp(entry.timestamp)}</span>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpanded(entry.id)
                        }}
                        className="p-1 rounded hover:bg-accent/50 transition-colors"
                        aria-label="Expandir detalles"
                      >
                        <HugeiconsIcon
                          icon={ArrowDown01Icon}
                          className={cn(
                            "size-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <HistoryEntryDetails
                        entry={entry}
                        operationIcon={operation.icon}
                        operationName={operation.displayName}
                        isExpanded={isExpanded}
                        onToggleExpanded={() => toggleExpanded(entry.id)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      {history.length > 0 && (
        <div className="border-t border-border p-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-xs">
              {historyIndex + 1} / {history.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="h-7 text-xs"
              >
                Deshacer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="h-7 text-xs"
              >
                Rehacer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
