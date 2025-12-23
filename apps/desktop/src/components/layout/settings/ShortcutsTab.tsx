/**
 * Shortcuts Tab - Settings Dialog
 *
 * Displays keyboard shortcuts reference organized by category.
 */

import { Separator } from "@cadhy/ui"
import { Edit01Icon, Settings01Icon, SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTranslation } from "react-i18next"
import { usePlatform } from "@/hooks/use-platform"

interface Shortcut {
  keys: string[]
  description: string
}

interface ShortcutCategory {
  id: string
  icon: React.ReactNode
  shortcuts: Shortcut[]
}

export function ShortcutsTab() {
  const { t } = useTranslation()
  const { isMacOS } = usePlatform()

  const modKey = isMacOS ? "Cmd" : "Ctrl"

  const categories: ShortcutCategory[] = [
    {
      id: "file",
      icon: <HugeiconsIcon icon={Settings01Icon} className="size-3.5" />,
      shortcuts: [
        { keys: [modKey, "N"], description: t("shortcuts.newProject", "New Project") },
        { keys: [modKey, "O"], description: t("shortcuts.openProject", "Open Project") },
        { keys: [modKey, "S"], description: t("shortcuts.save", "Save") },
        { keys: [modKey, "Shift", "S"], description: t("shortcuts.saveAs", "Save As") },
        { keys: [modKey, "W"], description: t("shortcuts.closeProject", "Close Project") },
      ],
    },
    {
      id: "edit",
      icon: <HugeiconsIcon icon={Edit01Icon} className="size-3.5" />,
      shortcuts: [
        { keys: [modKey, "Z"], description: t("shortcuts.undo", "Undo") },
        { keys: [modKey, "Shift", "Z"], description: t("shortcuts.redo", "Redo") },
        { keys: [modKey, "C"], description: t("shortcuts.copy", "Copy") },
        { keys: [modKey, "V"], description: t("shortcuts.paste", "Paste") },
        { keys: ["Delete"], description: t("shortcuts.delete", "Delete") },
      ],
    },
    {
      id: "view",
      icon: <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />,
      shortcuts: [
        { keys: [modKey, "B"], description: t("shortcuts.toggleSidebar", "Toggle Sidebar") },
        { keys: [modKey, "K"], description: t("shortcuts.commandPalette", "Command Palette") },
        { keys: [modKey, ","], description: t("shortcuts.openSettings", "Open Settings") },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      {categories.map((category, index) => (
        <div key={category.id}>
          {index > 0 && <Separator className="mb-4" />}
          <div className="space-y-2">
            <h3 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              {category.icon}
              {t(
                `shortcuts.${category.id}`,
                category.id.charAt(0).toUpperCase() + category.id.slice(1)
              )}
            </h3>
            <div className="space-y-1">
              {category.shortcuts.map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-xs text-muted-foreground">{shortcut.description}</span>
                  <div className="flex items-center gap-0.5">
                    {shortcut.keys.map((key, j) => (
                      <span key={j} className="flex items-center gap-0.5">
                        <kbd className="min-w-[18px] h-5 px-1 inline-flex items-center justify-center rounded-2xl border border-border bg-muted text-xs font-mono">
                          {key}
                        </kbd>
                        {j < shortcut.keys.length - 1 && (
                          <span className="text-muted-foreground text-xs">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      <Separator />
      <p className="text-xs text-muted-foreground text-center">
        {t(
          "shortcuts.customizeHint",
          "Keyboard shortcuts will be customizable in a future release"
        )}
      </p>
    </div>
  )
}
