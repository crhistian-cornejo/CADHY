/**
 * Notifications Dialog
 *
 * Notification preferences and settings dialog.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  ScrollArea,
  Separator,
  Switch,
} from "@cadhy/ui"
import {
  Alert02Icon,
  CheckmarkCircle01Icon,
  Mail01Icon,
  Notification01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { type NotificationSettings, useSettingsStore } from "@/stores/settings-store"

interface NotificationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationsDialog({ open, onOpenChange }: NotificationsDialogProps) {
  const { t } = useTranslation()

  // Use the settings store
  const notifications = useSettingsStore((s) => s.notifications)
  const setNotifications = useSettingsStore((s) => s.setNotifications)

  // Local state for editing (so we can cancel)
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(notifications)

  // Sync local state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSettings(notifications)
    }
    onOpenChange(isOpen)
  }

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    setNotifications(localSettings)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-sm w-[95vw] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-2xl bg-primary/10">
              <HugeiconsIcon icon={Notification01Icon} className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{t("notifications.title")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("notifications.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[280px]">
          <div className="p-4 space-y-4">
            {/* Notification Types */}
            <NotificationSection
              title={t("notifications.types")}
              icon={<HugeiconsIcon icon={Notification01Icon} className="size-3.5" />}
            >
              <div className="space-y-2">
                <NotificationToggle
                  icon={<HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3.5" />}
                  label={t("notifications.projectUpdates")}
                  description={t("notifications.projectUpdatesDesc")}
                  checked={localSettings.projectUpdates}
                  onChange={(checked) => updateSetting("projectUpdates", checked)}
                />
                <NotificationToggle
                  icon={<HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3.5" />}
                  label={t("notifications.analysisComplete")}
                  description={t("notifications.analysisCompleteDesc")}
                  checked={localSettings.analysisComplete}
                  onChange={(checked) => updateSetting("analysisComplete", checked)}
                />
                <NotificationToggle
                  icon={<HugeiconsIcon icon={Alert02Icon} className="size-3.5 text-destructive" />}
                  label={t("notifications.errors")}
                  description={t("notifications.errorsDesc")}
                  checked={localSettings.errors}
                  onChange={(checked) => updateSetting("errors", checked)}
                />
              </div>
            </NotificationSection>

            <Separator />

            {/* Delivery Methods */}
            <NotificationSection
              title={t("notifications.delivery")}
              icon={<HugeiconsIcon icon={Mail01Icon} className="size-3.5" />}
            >
              <div className="space-y-2">
                <NotificationToggle
                  icon={<HugeiconsIcon icon={Notification01Icon} className="size-3.5" />}
                  label={t("notifications.desktop")}
                  description={t("notifications.desktopDesc")}
                  checked={localSettings.desktopNotifications}
                  onChange={(checked) => updateSetting("desktopNotifications", checked)}
                />
                <NotificationToggle
                  icon={<HugeiconsIcon icon={Mail01Icon} className="size-3.5" />}
                  label={t("notifications.email")}
                  description={t("notifications.emailDesc")}
                  checked={localSettings.emailNotifications}
                  onChange={(checked) => updateSetting("emailNotifications", checked)}
                />
                <NotificationToggle
                  label={t("notifications.sound")}
                  description={t("notifications.soundDesc")}
                  checked={localSettings.soundEnabled}
                  onChange={(checked) => updateSetting("soundEnabled", checked)}
                />
              </div>
            </NotificationSection>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/50 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="default" size="sm" onClick={handleSave}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function NotificationSection({
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

function NotificationToggle({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon?: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        {icon && (
          <div className="flex items-center justify-center size-6 rounded-2xl bg-muted/50 shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="space-y-0">
          <Label className="text-xs font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-90" />
    </div>
  )
}
