/**
 * Keyboard Shortcuts Dialog
 *
 * Displays all available keyboard shortcuts organized by category.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator,
} from "@cadhy/ui"
import {
  Cursor01Icon,
  Edit01Icon,
  File01Icon,
  GridIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTranslation } from "react-i18next"

import { usePlatform } from "@/hooks/use-platform"

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Shortcut {
  keys: string[]
  description: string
}

interface ShortcutCategory {
  id: string
  icon: React.ReactNode
  shortcuts: Shortcut[]
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const { t } = useTranslation()
  const { isMacOS } = usePlatform()

  const modKey = isMacOS ? "Cmd" : "Ctrl"
  const _optKey = isMacOS ? "Option" : "Alt"

  const categories: ShortcutCategory[] = [
    {
      id: "file",
      icon: <HugeiconsIcon icon={File01Icon} className="size-4" />,
      shortcuts: [
        { keys: [modKey, "N"], description: t("shortcuts.newProject") },
        { keys: [modKey, "O"], description: t("shortcuts.openProject") },
        { keys: [modKey, "S"], description: t("shortcuts.save") },
        { keys: [modKey, "Shift", "S"], description: t("shortcuts.saveAs") },
        { keys: [modKey, "E"], description: t("shortcuts.export") },
        { keys: [modKey, "W"], description: t("shortcuts.closeProject") },
      ],
    },
    {
      id: "edit",
      icon: <HugeiconsIcon icon={Edit01Icon} className="size-4" />,
      shortcuts: [
        { keys: [modKey, "Z"], description: t("shortcuts.undo") },
        { keys: [modKey, "Shift", "Z"], description: t("shortcuts.redo") },
        { keys: [modKey, "X"], description: t("shortcuts.cut") },
        { keys: [modKey, "C"], description: t("shortcuts.copy") },
        { keys: [modKey, "V"], description: t("shortcuts.paste") },
        { keys: [modKey, "A"], description: t("shortcuts.selectAll") },
        { keys: ["Delete"], description: t("shortcuts.delete") },
      ],
    },
    {
      id: "view",
      icon: <HugeiconsIcon icon={ViewIcon} className="size-4" />,
      shortcuts: [
        { keys: [modKey, "1"], description: t("shortcuts.toggle3DViewer") },
        { keys: [modKey, "2"], description: t("shortcuts.toggleProperties") },
        { keys: [modKey, "B"], description: t("shortcuts.toggleSidebar") },
        { keys: [modKey, "K"], description: t("shortcuts.commandPalette") },
        { keys: [modKey, ","], description: t("shortcuts.openSettings") },
        { keys: ["F11"], description: t("shortcuts.fullscreen") },
      ],
    },
    {
      id: "workspace",
      icon: <HugeiconsIcon icon={GridIcon} className="size-4" />,
      shortcuts: [
        { keys: [modKey, "Shift", "M"], description: t("shortcuts.modeller") },
        { keys: [modKey, "Shift", "G"], description: t("shortcuts.mesh") },
        { keys: [modKey, "Shift", "C"], description: t("shortcuts.cfd") },
        { keys: [modKey, "Shift", "R"], description: t("shortcuts.results") },
      ],
    },
    {
      id: "navigation",
      icon: <HugeiconsIcon icon={Cursor01Icon} className="size-4" />,
      shortcuts: [
        { keys: ["Scroll"], description: t("shortcuts.zoom") },
        { keys: ["Middle Drag"], description: t("shortcuts.pan") },
        { keys: ["Right Drag"], description: t("shortcuts.rotate") },
        { keys: ["Home"], description: t("shortcuts.resetView") },
        { keys: [modKey, "0"], description: t("shortcuts.fitToScreen") },
      ],
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md w-[95vw] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
              <span className="text-lg">&#x2328;</span>
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold">{t("shortcuts.title")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("shortcuts.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[320px]">
          <div className="p-4 space-y-4">
            {categories.map((category, index) => (
              <div key={category.id}>
                {index > 0 && <Separator className="mb-4" />}
                <ShortcutSection title={t(`shortcuts.${category.id}`)} icon={category.icon}>
                  <div className="space-y-1">
                    {category.shortcuts.map((shortcut, i) => (
                      <ShortcutRow
                        key={i}
                        keys={shortcut.keys}
                        description={shortcut.description}
                      />
                    ))}
                  </div>
                </ShortcutSection>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border/50 bg-muted/30">
          <p className="text-[10px] text-muted-foreground">{t("shortcuts.customizeHint")}</p>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ShortcutSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-muted-foreground">{description}</span>
      <div className="flex items-center gap-0.5">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-0.5">
            <kbd className="min-w-[18px] h-5 px-1 inline-flex items-center justify-center rounded border border-border bg-muted text-[10px] font-mono">
              {key}
            </kbd>
            {i < keys.length - 1 && <span className="text-muted-foreground text-[10px]">+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
