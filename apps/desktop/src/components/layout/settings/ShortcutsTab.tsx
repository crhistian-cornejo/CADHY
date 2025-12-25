/**
 * Shortcuts Tab - Settings Dialog
 *
 * Displays keyboard shortcuts reference organized by category.
 * Shows a quick reference view with link to full customization.
 */

import { Button, formatKbd, Kbd, KbdGroup, Separator } from "@cadhy/ui"
import {
  Cursor01Icon,
  Edit01Icon,
  File01Icon,
  GridIcon,
  KeyboardIcon,
  Move01Icon,
  Settings01Icon,
  Settings02Icon,
  SparklesIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import React, { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useHotkeyRegistry } from "@/hooks/use-hotkey"
import { usePlatform } from "@/hooks/use-platform"
import { DEFAULT_HOTKEYS, getCategoryLabel } from "@/services/default-hotkeys"
import { useCustomBindings } from "@/stores/hotkey-store"
import { HotkeySettings } from "./HotkeySettings"

const CATEGORY_ICONS: Record<string, typeof File01Icon> = {
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

export function ShortcutsTab() {
  const { t } = useTranslation()
  const { isMacOS } = usePlatform()
  const [showFullEditor, setShowFullEditor] = useState(false)

  const allHotkeys = useHotkeyRegistry()
  const customBindings = useCustomBindings()

  // Get current keys for a hotkey
  const getCurrentKeys = (hotkeyId: string, defaultKeys: string[]): string[] => {
    return customBindings[hotkeyId] ?? defaultKeys
  }

  // Group hotkeys by category
  const hotkeysByCategory = useMemo(() => {
    const grouped: Record<string, (typeof DEFAULT_HOTKEYS)[0]["hotkeys"]> = {}

    DEFAULT_HOTKEYS.forEach((category) => {
      grouped[category.category] = category.hotkeys.map((hotkey) => {
        const registered = allHotkeys.find((h) => h.id === hotkey.id)
        return {
          ...hotkey,
          currentKeys: getCurrentKeys(hotkey.id, hotkey.keys),
          customized: hotkey.id in customBindings,
        }
      })
    })

    return grouped
  }, [allHotkeys, customBindings])

  // Show full editor if requested
  if (showFullEditor) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Customize Keyboard Shortcuts</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowFullEditor(false)}>
            Back to Quick Reference
          </Button>
        </div>
        <HotkeySettings />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick reference */}
      {DEFAULT_HOTKEYS.map((category, index) => {
        const hotkeys = hotkeysByCategory[category.category] || []
        if (hotkeys.length === 0) return null

        const Icon = CATEGORY_ICONS[category.category] || Settings01Icon

        return (
          <div key={category.category}>
            {index > 0 && <Separator className="mb-4" />}
            <div className="space-y-2">
              <h3 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <HugeiconsIcon icon={Icon} className="size-3.5" />
                {getCategoryLabel(category.category)}
              </h3>
              <div className="space-y-1">
                {hotkeys.slice(0, 5).map((hotkey) => (
                  <div key={hotkey.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{hotkey.description}</span>
                      {hotkey.customized && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Modified
                        </span>
                      )}
                    </div>
                    <KbdGroup>
                      {hotkey.currentKeys.map((key, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-muted-foreground text-xs">/</span>}
                          {key.split("+").map((k, j) => (
                            <React.Fragment key={j}>
                              <Kbd>{formatKbd(k)}</Kbd>
                              {j < key.split("+").length - 1 && (
                                <span className="text-muted-foreground text-xs">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ))}
                    </KbdGroup>
                  </div>
                ))}
                {hotkeys.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{hotkeys.length - 5} more shortcuts
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}

      <Separator />

      {/* Customize button */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFullEditor(true)}
          className="w-full"
        >
          <HugeiconsIcon icon={KeyboardIcon} className="size-4 mr-2" />
          {t("shortcuts.customize", "Customize Keyboard Shortcuts")}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {t(
            "shortcuts.customizeHint",
            "Click above to customize, reset, or export your keyboard shortcuts"
          )}
        </p>
      </div>
    </div>
  )
}
