/**
 * SelectionModeToolbar Component - CADHY
 *
 * Toolbar for switching between selection modes (Vertex, Edge, Face, Solid).
 * Displays icon buttons for each mode with visual feedback.
 */

import { cn, formatKbd, Kbd } from "@cadhy/ui"
// import { useHotkey } from "@/hooks/use-hotkey"
import { type SelectionMode, useModellerStore, useSelectionMode } from "@/stores/modeller"

const SELECTION_MODES = [
  {
    mode: "vertex" as SelectionMode,
    label: "Vertex",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <title>Vertex Mode</title>
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
    hotkey: "⇧1",
  },
  {
    mode: "edge" as SelectionMode,
    label: "Edge",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <title>Edge Mode</title>
        <path
          d="M8 12 L16 12 M8 12 L8 8 L16 8 L16 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    hotkey: "⇧2",
  },
  {
    mode: "face" as SelectionMode,
    label: "Face",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <title>Face Mode</title>
        <rect
          x="8"
          y="8"
          width="8"
          height="8"
          fill="currentColor"
          opacity="0.3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
    hotkey: "⇧3",
  },
  {
    mode: "body" as SelectionMode,
    label: "Solid/Body",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <title>Body Mode</title>
        <path
          d="M12 4 L18 8 L18 16 L12 20 L6 16 L6 8 Z"
          fill="currentColor"
          opacity="0.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
    hotkey: "⇧4",
  },
]

export function SelectionModeToolbar() {
  const selectionMode = useSelectionMode()
  const setSelectionMode = useModellerStore((s) => s.setSelectionMode)

  // TODO: Register hotkeys after DEFAULT_HOTKEYS are loaded
  // useHotkey("selection.vertexMode", () => setSelectionMode("vertex"))
  // useHotkey("selection.edgeMode", () => setSelectionMode("edge"))
  // useHotkey("selection.faceMode", () => setSelectionMode("face"))
  // useHotkey("selection.bodyMode", () => setSelectionMode("body"))

  return (
    <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/95 dark:bg-toolbar-bg backdrop-blur-md border border-border/40 rounded-2xl shadow-lg p-1 z-[50]">
      {SELECTION_MODES.map((item) => (
        <button
          key={item.mode}
          type="button"
          onClick={() => setSelectionMode(item.mode)}
          className={cn(
            "relative group flex items-center justify-center size-9 rounded-2xl transition-all",
            "hover:bg-muted/50",
            selectionMode === item.mode
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={`${item.label} (${item.hotkey})`}
        >
          {item.icon}

          {/* Active indicator */}
          {selectionMode === item.mode && (
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full" />
          )}

          {/* Hotkey hint */}
          <Kbd className="absolute -top-1 -right-1 size-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            {formatKbd(item.hotkey)}
          </Kbd>
        </button>
      ))}
    </div>
  )
}
