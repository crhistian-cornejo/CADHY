/**
 * Hotkey Settings Component - CADHY
 *
 * Allows users to view and customize keyboard shortcuts.
 * Features:
 * - View all shortcuts organized by category
 * - Edit shortcut bindings inline
 * - Detect and warn about conflicts
 * - Reset individual or all shortcuts
 * - Export/Import shortcut configurations
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Input,
  ScrollArea,
} from "@cadhy/ui"
import {
  AlertCircleIcon,
  Cursor01Icon,
  Download04Icon,
  Edit01Icon,
  File01Icon,
  GridIcon,
  Move01Icon,
  RefreshIcon,
  Settings02Icon,
  Tick02Icon,
  Upload04Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { usePlatform } from "@/hooks/use-platform"
import { DEFAULT_HOTKEYS, type DefaultHotkey } from "@/services/default-hotkeys"
import { hotkeyRegistry, normalizeShortcut } from "@/services/hotkey-registry"
import { type HotkeyCategory, useCollapsedCategories, useHotkeyStore } from "@/stores/hotkey-store"

// ============================================================================
// TYPES
// ============================================================================

interface EditingState {
  id: string
  keys: string
  conflict: string | null
}

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const CATEGORY_ICONS: Record<HotkeyCategory, typeof File01Icon> = {
  file: File01Icon,
  edit: Edit01Icon,
  view: ViewIcon,
  transform: Move01Icon,
  navigation: Cursor01Icon,
  workspace: GridIcon,
  tools: Settings02Icon,
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HotkeySettings() {
  const { t } = useTranslation()
  const { isMacOS } = usePlatform()

  const [searchQuery, setSearchQuery] = useState("")
  const [editing, setEditing] = useState<EditingState | null>(null)

  const {
    customBindings,
    rebindHotkey,
    resetToDefault,
    resetAllToDefault,
    exportBindings,
    importBindings,
    toggleCategory,
  } = useHotkeyStore()

  const _collapsedCategories = useCollapsedCategories()

  const modKey = isMacOS ? "Cmd" : "Ctrl"

  // Get current keys for a hotkey (custom or default)
  const getCurrentKeys = useCallback(
    (hotkey: DefaultHotkey): string[] => {
      return customBindings[hotkey.id] ?? hotkey.keys
    },
    [customBindings]
  )

  // Check if a hotkey has been customized
  const isCustomized = useCallback(
    (id: string): boolean => {
      return id in customBindings
    },
    [customBindings]
  )

  // Filter hotkeys by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return DEFAULT_HOTKEYS

    const query = searchQuery.toLowerCase()
    return DEFAULT_HOTKEYS.map((category) => ({
      ...category,
      hotkeys: category.hotkeys.filter(
        (h) =>
          h.name.toLowerCase().includes(query) ||
          h.description.toLowerCase().includes(query) ||
          h.keys.some((k) => k.toLowerCase().includes(query))
      ),
    })).filter((category) => category.hotkeys.length > 0)
  }, [searchQuery])

  // Handle key capture for editing
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!editing) return

      e.preventDefault()
      e.stopPropagation()

      // Build shortcut string from event
      const parts: string[] = []

      if (e.ctrlKey || e.metaKey) {
        parts.push(isMacOS ? "Cmd" : "Ctrl")
      }
      if (e.altKey) {
        parts.push(isMacOS ? "Option" : "Alt")
      }
      if (e.shiftKey) {
        parts.push("Shift")
      }

      // Skip if only modifier keys
      const key = e.key
      if (!["Control", "Alt", "Shift", "Meta"].includes(key)) {
        // Normalize key
        let normalizedKey = key
        if (key === " ") normalizedKey = "Space"
        else if (key.length === 1) normalizedKey = key.toUpperCase()

        parts.push(normalizedKey)

        const newKeys = parts.join("+")
        const normalized = normalizeShortcut(newKeys)

        // Check for conflicts
        const conflict = hotkeyRegistry.getConflict(normalized, editing.id)

        setEditing({
          ...editing,
          keys: newKeys,
          conflict: conflict ? `Conflicts with: ${conflict.name}` : null,
        })
      }
    },
    [editing, isMacOS]
  )

  // Start editing a hotkey
  const startEditing = useCallback((hotkey: DefaultHotkey) => {
    setEditing({
      id: hotkey.id,
      keys: "",
      conflict: null,
    })
  }, [])

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditing(null)
  }, [])

  // Save edited hotkey
  const saveEditing = useCallback(() => {
    if (!editing || !editing.keys || editing.conflict) return

    rebindHotkey(editing.id, [editing.keys])
    hotkeyRegistry.rebind(editing.id, [editing.keys])
    setEditing(null)
  }, [editing, rebindHotkey])

  // Reset a single hotkey
  const handleReset = useCallback(
    (hotkey: DefaultHotkey) => {
      resetToDefault(hotkey.id)
      hotkeyRegistry.resetToDefault(hotkey.id)
    },
    [resetToDefault]
  )

  // Reset all hotkeys
  const handleResetAll = useCallback(() => {
    if (window.confirm("Reset all keyboard shortcuts to defaults?")) {
      resetAllToDefault()
      hotkeyRegistry.resetAllToDefault()
    }
  }, [resetAllToDefault])

  // Export hotkeys
  const handleExport = useCallback(() => {
    const json = exportBindings()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cadhy-hotkeys.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [exportBindings])

  // Import hotkeys
  const handleImport = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const success = importBindings(text)
        if (success) {
          hotkeyRegistry.importBindings(JSON.parse(text))
        } else {
          alert("Invalid hotkey configuration file")
        }
      } catch {
        alert("Failed to import hotkey configuration")
      }
    }
    input.click()
  }, [importBindings])

  // Handle escape to cancel editing
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editing) {
        cancelEditing()
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [editing, cancelEditing])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImport}>
            <HugeiconsIcon icon={Upload04Icon} className="size-4 mr-1" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <HugeiconsIcon icon={Download04Icon} className="size-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetAll}>
            <HugeiconsIcon icon={RefreshIcon} className="size-4 mr-1" />
            Reset All
          </Button>
        </div>
      </div>

      {/* Shortcuts List */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <Accordion
          type="multiple"
          defaultValue={filteredCategories.map((c) => c.category)}
          className="space-y-2"
        >
          {filteredCategories.map((categoryData) => (
            <AccordionItem
              key={categoryData.category}
              value={categoryData.category}
              className="border rounded-lg px-3"
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={CATEGORY_ICONS[categoryData.category] || Settings02Icon}
                    className="size-4 text-muted-foreground"
                  />
                  <span className="font-medium">{categoryData.label}</span>
                  <span className="text-xs text-muted-foreground">
                    ({categoryData.hotkeys.length})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="space-y-1">
                  {categoryData.hotkeys.map((hotkey) => {
                    const currentKeys = getCurrentKeys(hotkey)
                    const customized = isCustomized(hotkey.id)
                    const isEditing = editing?.id === hotkey.id

                    return (
                      <div
                        key={hotkey.id}
                        className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{hotkey.name}</span>
                            {customized && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                Modified
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {hotkey.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <div className="flex flex-col items-end gap-1">
                                <Input
                                  value={editing.keys || "Press keys..."}
                                  onKeyDown={handleKeyDown}
                                  className="h-7 w-32 text-xs text-center"
                                  autoFocus
                                  readOnly
                                />
                                {editing.conflict && (
                                  <span className="text-[10px] text-destructive flex items-center gap-1">
                                    <HugeiconsIcon icon={AlertCircleIcon} className="size-3" />
                                    {editing.conflict}
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={saveEditing}
                                disabled={!editing.keys || !!editing.conflict}
                                className="h-7 px-2"
                              >
                                <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditing}
                                className="h-7 px-2"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(hotkey)}
                                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-muted/30 hover:bg-muted transition-colors"
                              >
                                {currentKeys.map((key, i) => (
                                  <kbd
                                    key={i}
                                    className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded border border-border bg-background text-[10px] font-mono"
                                  >
                                    {key
                                      .replace("Ctrl", modKey)
                                      .replace("Alt", isMacOS ? "Option" : "Alt")}
                                  </kbd>
                                ))}
                              </button>
                              {customized && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReset(hotkey)}
                                  className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <HugeiconsIcon icon={RefreshIcon} className="size-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>

      {/* Footer hint */}
      <div className="mt-4 pt-3 border-t">
        <p className="text-xs text-muted-foreground">
          Click on a shortcut to edit. Press Escape to cancel.
        </p>
      </div>
    </div>
  )
}
