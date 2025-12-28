/**
 * Privacy & Security Dialog
 *
 * Privacy and security settings dialog.
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
  Analytics01Icon,
  Delete01Icon,
  LockIcon,
  ShieldKeyIcon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { type PrivacySettings, useSettingsStore } from "@/stores/settings-store"

interface PrivacySecurityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrivacySecurityDialog({ open, onOpenChange }: PrivacySecurityDialogProps) {
  const { t } = useTranslation()

  // Use the settings store
  const privacy = useSettingsStore((s) => s.privacy)
  const setPrivacy = useSettingsStore((s) => s.setPrivacy)
  const clearAllData = useSettingsStore((s) => s.clearAllData)

  // Local state for editing (so we can cancel)
  const [localSettings, setLocalSettings] = useState<PrivacySettings>(privacy)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Sync local state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSettings(privacy)
    }
    onOpenChange(isOpen)
  }

  const updateSetting = (key: keyof PrivacySettings, value: boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    setPrivacy(localSettings)
    onOpenChange(false)
  }

  const handleClearData = () => {
    clearAllData()
    setShowDeleteConfirm(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="lg"
        className="w-[95vw] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-2xl bg-primary/10">
              <HugeiconsIcon icon={ShieldKeyIcon} className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{t("privacy.title")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("privacy.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[300px]">
          <div className="p-4 space-y-4">
            {/* Privacy Settings */}
            <PrivacySection
              title={t("privacy.dataCollection")}
              icon={<HugeiconsIcon icon={Analytics01Icon} className="size-3.5" />}
            >
              <div className="space-y-2">
                <PrivacyToggle
                  icon={<HugeiconsIcon icon={Analytics01Icon} className="size-3.5" />}
                  label={t("privacy.analytics")}
                  description={t("privacy.analyticsDesc")}
                  checked={localSettings.analytics}
                  onChange={(checked) => updateSetting("analytics", checked)}
                />
                <PrivacyToggle
                  icon={<HugeiconsIcon icon={ViewIcon} className="size-3.5" />}
                  label={t("privacy.crashReports")}
                  description={t("privacy.crashReportsDesc")}
                  checked={localSettings.crashReports}
                  onChange={(checked) => updateSetting("crashReports", checked)}
                />
                <PrivacyToggle
                  icon={<HugeiconsIcon icon={ViewOffIcon} className="size-3.5" />}
                  label={t("privacy.usageData")}
                  description={t("privacy.usageDataDesc")}
                  checked={localSettings.usageData}
                  onChange={(checked) => updateSetting("usageData", checked)}
                />
              </div>
            </PrivacySection>

            <Separator />

            {/* Security Settings */}
            <PrivacySection
              title={t("privacy.security")}
              icon={<HugeiconsIcon icon={LockIcon} className="size-3.5" />}
            >
              <div className="space-y-2">
                <PrivacyToggle
                  icon={<HugeiconsIcon icon={LockIcon} className="size-3.5" />}
                  label={t("privacy.rememberProjects")}
                  description={t("privacy.rememberProjectsDesc")}
                  checked={localSettings.rememberProjects}
                  onChange={(checked) => updateSetting("rememberProjects", checked)}
                />
                <PrivacyToggle
                  icon={<HugeiconsIcon icon={ShieldKeyIcon} className="size-3.5" />}
                  label={t("privacy.autoLock")}
                  description={t("privacy.autoLockDesc")}
                  checked={localSettings.autoLock}
                  onChange={(checked) => updateSetting("autoLock", checked)}
                />
              </div>
            </PrivacySection>

            <Separator />

            {/* Data Management */}
            <PrivacySection
              title={t("privacy.dataManagement")}
              icon={<HugeiconsIcon icon={Delete01Icon} className="size-3.5" />}
            >
              <div className="p-3 rounded-2xl border border-destructive/30 bg-destructive/5">
                <h4 className="text-xs font-medium text-destructive mb-1">
                  {t("privacy.clearData")}
                </h4>
                <p className="text-xs text-muted-foreground mb-2">{t("privacy.clearDataDesc")}</p>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleClearData}
                    >
                      {t("privacy.confirmClear")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive gap-1.5"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="size-3" />
                    {t("privacy.clearData")}
                  </Button>
                )}
              </div>
            </PrivacySection>
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

function PrivacySection({
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

function PrivacyToggle({
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
