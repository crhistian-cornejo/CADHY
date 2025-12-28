/**
 * Hotkey Settings Component - CADHY
 *
 * Advanced keyboard shortcut customization interface with:
 * - View all shortcuts organized by category
 * - Edit shortcut bindings with visual key capture
 * - Detect and warn about conflicts
 * - Reset individual or all shortcuts
 * - Export/Import shortcut configurations
 * - Preset management (save/load configurations)
 * - Search and filter shortcuts
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cadhy/ui"
import {
  Add01Icon,
  Cursor01Icon,
  Delete01Icon,
  Download04Icon,
  Edit01Icon,
  File01Icon,
  GridIcon,
  Move01Icon,
  RefreshIcon,
  Settings01Icon,
  Settings02Icon,
  Upload04Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import React, { useCallback, useEffect, useMemo, useState } from "react"

import { KeyCaptureInput } from "@/components/common/KeyCaptureInput"
import { usePlatform } from "@/hooks/use-platform"
import { DEFAULT_HOTKEYS, type DefaultHotkey } from "@/services/default-hotkeys"
import { hotkeyRegistry, normalizeShortcut } from "@/services/hotkey-registry"
import { type HotkeyCategory, useHotkeyStore } from "@/stores/hotkey-store"

// ============================================================================
// TYPES
// ============================================================================

interface EditingState {
  id: string
  keys: string[]
  conflict: string | null
}

interface HotkeyPreset {
  id: string
  name: string
  bindings: Record<string, string[]>
  createdAt: number
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
  operations: Settings01Icon,
  selection: Cursor01Icon,
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HotkeySettings() {
  const { isMacOS } = usePlatform()

  const [searchQuery, setSearchQuery] = useState("")
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [presets, setPresets] = useState<HotkeyPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [presetName, setPresetName] = useState("")

  const {
    customBindings,
    rebindHotkey,
    resetToDefault,
    resetAllToDefault,
    exportBindings,
    importBindings,
  } = useHotkeyStore()

  const modKey = isMacOS ? "Cmd" : "Ctrl"

  // Load presets from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("cadhy-hotkey-presets")
    if (stored) {
      try {
        setPresets(JSON.parse(stored))
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [])

  // Save presets to localStorage
  const savePresets = useCallback((newPresets: HotkeyPreset[]) => {
    setPresets(newPresets)
    localStorage.setItem("cadhy-hotkey-presets", JSON.stringify(newPresets))
  }, [])

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

  // Start editing a hotkey
  const startEditing = useCallback(
    (hotkey: DefaultHotkey) => {
      const currentKeys = getCurrentKeys(hotkey)
      setEditing({
        id: hotkey.id,
        keys: currentKeys,
        conflict: null,
      })
    },
    [getCurrentKeys]
  )

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditing(null)
  }, [])

  // Handle key capture change
  const handleKeyCaptureChange = useCallback(
    (id: string, newKeys: string[]) => {
      if (newKeys.length === 0) return

      // Check for conflicts
      const conflicts: string[] = []
      newKeys.forEach((key) => {
        const normalized = normalizeShortcut(key)
        const conflict = hotkeyRegistry.getConflict(normalized, id)
        if (conflict) {
          conflicts.push(`"${key}" conflicts with: ${conflict.name}`)
        }
      })

      if (conflicts.length > 0) {
        setEditing((prev) =>
          prev && prev.id === id ? { ...prev, keys: newKeys, conflict: conflicts.join("; ") } : prev
        )
        return
      }

      // No conflicts - save
      rebindHotkey(id, newKeys)
      hotkeyRegistry.rebind(id, newKeys)
      setEditing(null)
    },
    [rebindHotkey]
  )

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
        const data = JSON.parse(text)

        // Check if it's a preset (has name) or just bindings
        if (data.name && data.bindings) {
          // It's a preset
          const preset: HotkeyPreset = {
            id: `preset-${Date.now()}`,
            name: data.name,
            bindings: data.bindings,
            createdAt: data.createdAt || Date.now(),
          }
          savePresets([...presets, preset])
          // Also apply the bindings
          importBindings(JSON.stringify(data.bindings))
          hotkeyRegistry.importBindings(data.bindings)
        } else {
          // Just bindings
          const success = importBindings(text)
          if (success) {
            hotkeyRegistry.importBindings(data)
          } else {
            alert("Invalid hotkey configuration file")
          }
        }
      } catch {
        alert("Failed to import hotkey configuration")
      }
    }
    input.click()
  }, [importBindings, presets, savePresets])

  // Save current configuration as preset
  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      alert("Please enter a preset name")
      return
    }

    const preset: HotkeyPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      bindings: customBindings,
      createdAt: Date.now(),
    }

    savePresets([...presets, preset])
    setPresetName("")
  }, [presetName, customBindings, presets, savePresets])

  // Load preset
  const handleLoadPreset = useCallback(
    (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId)
      if (!preset) return

      importBindings(JSON.stringify(preset.bindings))
      hotkeyRegistry.importBindings(preset.bindings)
      setSelectedPreset(presetId)
    },
    [presets, importBindings]
  )

  // Delete preset
  const handleDeletePreset = useCallback(
    (presetId: string) => {
      if (!window.confirm("Delete this preset?")) return
      savePresets(presets.filter((p) => p.id !== presetId))
      if (selectedPreset === presetId) {
        setSelectedPreset(null)
      }
    },
    [presets, selectedPreset, savePresets]
  )

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
      <div className="space-y-3 mb-4">
        {/* Search */}
        <Input
          placeholder="Search shortcuts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8"
        />

        {/* Presets */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedPreset || ""}
            onValueChange={(value) => value && handleLoadPreset(value)}
          >
            <SelectTrigger className="h-8 flex-1">
              {selectedPreset ? (
                <SelectValue />
              ) : (
                <span className="text-muted-foreground">Load preset...</span>
              )}
            </SelectTrigger>
            <SelectContent>
              {presets.length === 0 ? (
                <SelectItem value="none" disabled>
                  No presets saved
                </SelectItem>
              ) : (
                presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{preset.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePreset(preset.id)
                        }}
                      >
                        <HugeiconsIcon icon={Delete01Icon} className="size-3" />
                      </Button>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="h-8 w-32"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSavePreset()
                }
              }}
            />
            <Button variant="outline" size="sm" onClick={handleSavePreset} className="h-8">
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
            </Button>
          </div>
        </div>

        {/* Actions */}
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
              className="border rounded-2xl px-3"
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
                        className="flex items-center justify-between py-2 px-2 rounded-2xl hover:bg-muted/50 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{hotkey.name}</span>
                            {customized && (
                              <span className="text-xs px-1.5 py-0.5 rounded-2xl bg-primary/10 text-primary">
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
                            <div className="flex items-center gap-2">
                              <KeyCaptureInput
                                value={editing.keys}
                                onChange={(keys) => handleKeyCaptureChange(editing.id, keys)}
                                onCancel={cancelEditing}
                                excludeId={editing.id}
                                className="w-48"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditing}
                                className="h-7 px-2"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditing(hotkey)}
                                className="flex items-center gap-1 px-2 py-1 rounded-2xl border border-border bg-muted/30 hover:bg-muted transition-colors"
                              >
                                {currentKeys.length > 0 ? (
                                  currentKeys.map((key, i) => (
                                    <React.Fragment key={`${hotkey.id}-${key}`}>
                                      <kbd className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-2xl border border-border bg-background text-xs font-mono">
                                        {key
                                          .replace("Ctrl", modKey)
                                          .replace("Alt", isMacOS ? "Option" : "Alt")}
                                      </kbd>
                                      {i < currentKeys.length - 1 && (
                                        <span className="text-muted-foreground text-xs">/</span>
                                      )}
                                    </React.Fragment>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">No shortcut</span>
                                )}
                              </button>
                              {customized && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReset(hotkey)}
                                  className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Reset to default"
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
