/**
 * Preferences Dialog - CADHY
 *
 * Modern preferences dialog with vertical sidebar navigation.
 * Similar to VS Code/Figma settings layout.
 *
 * Features:
 * - Vertical sidebar with icons and labels
 * - Spacious content area with scroll
 * - Responsive design
 * - Keyboard navigation support
 */

import { Button, cn, Dialog, DialogContent, ScrollArea } from "@cadhy/ui"
import {
  KeyboardIcon,
  LockIcon,
  Settings01Icon,
  SparklesIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AIProvidersTab, PrivacyTab, ProfileTab, ShortcutsTab } from "../settings"

// ============================================================================
// TYPES
// ============================================================================

interface PreferencesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: PreferenceSection
}

type PreferenceSection = "profile" | "ai" | "shortcuts" | "privacy"

interface SidebarItem {
  id: PreferenceSection
  icon: typeof UserIcon
  label: string
  description: string
}

// ============================================================================
// SIDEBAR ITEMS
// ============================================================================

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "profile",
    icon: UserIcon,
    label: "Profile",
    description: "Personal information",
  },
  {
    id: "ai",
    icon: SparklesIcon,
    label: "AI Providers",
    description: "Configure AI models",
  },
  {
    id: "shortcuts",
    icon: KeyboardIcon,
    label: "Shortcuts",
    description: "Keyboard shortcuts",
  },
  {
    id: "privacy",
    icon: LockIcon,
    label: "Privacy & Security",
    description: "Data and analytics",
  },
]

// ============================================================================
// COMPONENTS
// ============================================================================

function SidebarButton({
  item,
  isActive,
  onClick,
}: {
  item: SidebarItem
  isActive: boolean
  onClick: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group relative",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
      data-slot="sidebar-button"
    >
      <HugeiconsIcon
        icon={item.icon}
        className={cn(
          "size-4 shrink-0 transition-colors",
          isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm font-medium transition-colors",
            isActive ? "text-primary-foreground" : ""
          )}
        >
          {t(`preferences.sidebar.${item.id}.label`, item.label)}
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// MAIN DIALOG
// ============================================================================

export function PreferencesDialog({
  open,
  onOpenChange,
  defaultTab = "profile",
}: PreferencesDialogProps) {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState<PreferenceSection>(defaultTab)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="5xl"
        className="w-[95vw] h-[85vh] p-0 flex flex-col overflow-hidden"
        showCloseButton={false}
        data-slot="preferences-dialog"
      >
        {/* Header */}
        <div className="shrink-0">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10">
                <HugeiconsIcon icon={Settings01Icon} className="size-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("preferences.title", "Preferences")}</h2>
                <p className="text-xs text-muted-foreground">
                  {t("preferences.description", "Customize CADHY to your needs")}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {t("common.close", "Close")}
            </Button>
          </div>
          <div className="border-b" />
        </div>

        {/* Content: Sidebar + Main Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-56 border-r p-3 shrink-0" data-slot="sidebar">
            <div className="space-y-1">
              {SIDEBAR_ITEMS.map((item) => (
                <SidebarButton
                  key={item.id}
                  item={item}
                  isActive={activeSection === item.id}
                  onClick={() => setActiveSection(item.id)}
                />
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden" data-slot="content">
            <ScrollArea className="h-full">
              <div className="p-8">
                {/* Section Title */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold">
                    {t(
                      `preferences.sections.${activeSection}.title`,
                      SIDEBAR_ITEMS.find((item) => item.id === activeSection)?.label
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t(
                      `preferences.sections.${activeSection}.subtitle`,
                      SIDEBAR_ITEMS.find((item) => item.id === activeSection)?.description
                    )}
                  </p>
                </div>

                {/* Section Content */}
                {activeSection === "profile" && <ProfileTab />}
                {activeSection === "ai" && <AIProvidersTab />}
                {activeSection === "shortcuts" && <ShortcutsTab />}
                {activeSection === "privacy" && <PrivacyTab />}
              </div>
            </ScrollArea>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}
