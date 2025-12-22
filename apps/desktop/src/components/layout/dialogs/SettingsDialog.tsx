/**
 * Settings Dialog - CADHY
 *
 * Global preferences dialog with tabs for:
 * - Profile: User information (name, email, avatar)
 * - AI Providers: Gemini OAuth status, BYOK API keys, active provider
 * - Shortcuts: Keyboard shortcuts reference
 * - Privacy: Privacy and security settings
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@cadhy/ui"
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

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsTab = "profile" | "ai" | "shortcuts" | "privacy"

// ============================================================================
// MAIN DIALOG
// ============================================================================

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")

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
              <HugeiconsIcon icon={Settings01Icon} className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold">
                {t("settings.title", "Settings")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("settings.description", "Configure your profile and AI providers")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)}>
          <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent h-9 px-4 gap-0">
            <TabsTrigger
              value="profile"
              className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-2"
            >
              <HugeiconsIcon icon={UserIcon} className="size-3.5 mr-1.5" />
              {t("settings.tabs.profile", "Profile")}
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-2"
            >
              <HugeiconsIcon icon={SparklesIcon} className="size-3.5 mr-1.5" />
              {t("settings.tabs.ai", "AI")}
            </TabsTrigger>
            <TabsTrigger
              value="shortcuts"
              className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-2"
            >
              <HugeiconsIcon icon={KeyboardIcon} className="size-3.5 mr-1.5" />
              {t("settings.tabs.shortcuts", "Shortcuts")}
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-2"
            >
              <HugeiconsIcon icon={LockIcon} className="size-3.5 mr-1.5" />
              {t("settings.tabs.privacy", "Privacy")}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[400px]">
            <div className="p-4">
              <TabsContent value="profile" className="mt-0">
                <ProfileTab />
              </TabsContent>
              <TabsContent value="ai" className="mt-0">
                <AIProvidersTab />
              </TabsContent>
              <TabsContent value="shortcuts" className="mt-0">
                <ShortcutsTab />
              </TabsContent>
              <TabsContent value="privacy" className="mt-0">
                <PrivacyTab />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="px-4 py-3 border-t border-border/50 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.close", "Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Re-export ProfileDialog for backward compatibility (deprecated)
/** @deprecated Use SettingsDialog instead */
export { SettingsDialog as ProfileDialog }
