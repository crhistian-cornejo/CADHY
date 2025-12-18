/**
 * Privacy Tab - Settings Dialog
 *
 * Privacy and security settings including data collection toggles
 * and data management options.
 */

import { Button, Separator, Switch, toast } from "@cadhy/ui"
import { Delete01Icon, InformationCircleIcon, LockIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useSettingsStore } from "@/stores/settings-store"

function PrivacyToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0">
        <span className="text-xs font-medium">{label}</span>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-90" />
    </div>
  )
}

export function PrivacyTab() {
  const { t } = useTranslation()
  const privacy = useSettingsStore((s) => s.privacy)
  const setPrivacy = useSettingsStore((s) => s.setPrivacy)
  const clearAllData = useSettingsStore((s) => s.clearAllData)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const updateSetting = (key: keyof typeof privacy, value: boolean) => {
    setPrivacy({ ...privacy, [key]: value })
  }

  const handleClearData = () => {
    clearAllData()
    setShowDeleteConfirm(false)
    toast.success(t("privacy.dataCleared", "All local data has been cleared"))
  }

  return (
    <div className="space-y-4">
      {/* Data Collection */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
          <HugeiconsIcon icon={InformationCircleIcon} className="size-3.5" />
          {t("privacy.dataCollection", "Data Collection")}
        </h3>
        <div className="space-y-3">
          <PrivacyToggle
            label={t("privacy.analytics", "Analytics")}
            description={t("privacy.analyticsDesc", "Help improve CADHY with anonymous usage data")}
            checked={privacy.analytics}
            onChange={(checked) => updateSetting("analytics", checked)}
          />
          <PrivacyToggle
            label={t("privacy.crashReports", "Crash Reports")}
            description={t("privacy.crashReportsDesc", "Automatically send crash reports")}
            checked={privacy.crashReports}
            onChange={(checked) => updateSetting("crashReports", checked)}
          />
          <PrivacyToggle
            label={t("privacy.usageData", "Usage Data")}
            description={t("privacy.usageDataDesc", "Share feature usage statistics")}
            checked={privacy.usageData}
            onChange={(checked) => updateSetting("usageData", checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Security */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
          <HugeiconsIcon icon={LockIcon} className="size-3.5" />
          {t("privacy.security", "Security")}
        </h3>
        <div className="space-y-3">
          <PrivacyToggle
            label={t("privacy.rememberProjects", "Remember Projects")}
            description={t("privacy.rememberProjectsDesc", "Keep recent projects in history")}
            checked={privacy.rememberProjects}
            onChange={(checked) => updateSetting("rememberProjects", checked)}
          />
          <PrivacyToggle
            label={t("privacy.autoLock", "Auto Lock")}
            description={t("privacy.autoLockDesc", "Lock app after period of inactivity")}
            checked={privacy.autoLock}
            onChange={(checked) => updateSetting("autoLock", checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Clear Data */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
          <HugeiconsIcon icon={Delete01Icon} className="size-3.5" />
          {t("privacy.dataManagement", "Data Management")}
        </h3>
        <div className="p-3 rounded-md border border-destructive/30 bg-destructive/5">
          <h4 className="text-xs font-medium text-destructive mb-1">
            {t("privacy.clearData", "Clear Local Data")}
          </h4>
          <p className="text-[10px] text-muted-foreground mb-2">
            {t("privacy.clearDataDesc", "Remove all local settings and cached data")}
          </p>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={handleClearData}
              >
                {t("privacy.confirmClear", "Confirm Clear")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("common.cancel", "Cancel")}
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
              {t("privacy.clearData", "Clear Local Data")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
