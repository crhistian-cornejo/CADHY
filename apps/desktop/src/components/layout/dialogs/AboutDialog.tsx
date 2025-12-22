/**
 * About Dialog
 *
 * Comprehensive About dialog showing application version, build information,
 * system details, technology stack, and credits.
 */

import {
  Badge,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  CheckmarkCircle01Icon,
  Copy01Icon,
  Github01Icon,
  GlobalIcon,
  InformationCircleIcon,
  Link01Icon,
  Loading01Icon,
  Settings01Icon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { getSystemInfo, openUrl, type SystemInfo } from "@/services/tauri-service"

interface AboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const { t } = useTranslation()
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setLoading(true)
      getSystemInfo()
        .then(setSystemInfo)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open])

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const copyAllInfo = async () => {
    if (!systemInfo) return

    const info = `CADHY System Information
================================
Version: ${systemInfo.build.version}
Git Commit: ${systemInfo.build.gitCommit}${systemInfo.build.gitDirty ? " (dirty)" : ""}
Git Branch: ${systemInfo.build.gitBranch}
Build Date: ${systemInfo.build.buildTimestamp}
Build Profile: ${systemInfo.build.buildProfile}
Target: ${systemInfo.build.targetTriple}

Rust: ${systemInfo.build.rustVersion}
Tauri: ${systemInfo.techStack.tauriVersion}

OS: ${systemInfo.os.osType} (${systemInfo.os.osVersion})
Architecture: ${systemInfo.os.arch}
Hostname: ${systemInfo.os.hostname}

Repository: ${systemInfo.repository}
License: ${systemInfo.license}`

    await copyToClipboard(info, "all")
  }

  const handleOpenUrl = async (url: string) => {
    await openUrl(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md w-[95vw] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 p-1.5">
              <img src="/LOGO.png" alt="CADHY" className="size-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold">
                  {systemInfo?.appName ?? "CADHY"}
                </DialogTitle>
                {systemInfo && (
                  <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                    v{systemInfo.build.version}
                  </Badge>
                )}
                {systemInfo?.build.buildProfile === "debug" && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 text-yellow-600 border-yellow-500/50"
                  >
                    DEBUG
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {systemInfo?.appDescription ?? t("about.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <HugeiconsIcon
                icon={Loading01Icon}
                className="size-5 animate-spin text-muted-foreground"
              />
            </div>
          ) : systemInfo ? (
            <div className="p-4 space-y-4">
              {/* Build Information */}
              <InfoSection
                title={t("about.buildInfo")}
                icon={<HugeiconsIcon icon={Settings01Icon} className="size-3.5" />}
              >
                <InfoGrid>
                  <InfoRow
                    label={t("about.version")}
                    value={systemInfo.build.version}
                    mono
                    onCopy={() => copyToClipboard(systemInfo.build.version, "version")}
                    copied={copiedField === "version"}
                  />
                  <InfoRow
                    label={t("about.gitCommit")}
                    value={
                      systemInfo.build.gitCommit +
                      (systemInfo.build.gitDirty ? ` (${t("about.dirty")})` : "")
                    }
                    mono
                    onCopy={() => copyToClipboard(systemInfo.build.gitCommit, "commit")}
                    copied={copiedField === "commit"}
                  />
                  <InfoRow
                    label={t("about.gitBranch")}
                    value={systemInfo.build.gitBranch}
                    mono
                    onCopy={() => copyToClipboard(systemInfo.build.gitBranch, "branch")}
                    copied={copiedField === "branch"}
                  />
                  <InfoRow label={t("about.buildDate")} value={systemInfo.build.buildTimestamp} />
                  <InfoRow
                    label={t("about.buildProfile")}
                    value={systemInfo.build.buildProfile}
                    highlight={systemInfo.build.buildProfile === "release"}
                  />
                  <InfoRow label={t("about.target")} value={systemInfo.build.targetTriple} mono />
                </InfoGrid>
              </InfoSection>

              <Separator className="my-3" />

              {/* Technology Stack */}
              <InfoSection
                title={t("about.techStack")}
                icon={<HugeiconsIcon icon={Settings01Icon} className="size-3.5" />}
              >
                <InfoGrid>
                  <InfoRow
                    label="Rust"
                    value={systemInfo.build.rustVersion.replace("rustc ", "")}
                    mono
                  />
                  <InfoRow label="Tauri" value={systemInfo.techStack.tauriVersion} mono />
                  <InfoRow label="React" value="19.x" mono />
                  <InfoRow label="TypeScript" value="5.x" mono />
                </InfoGrid>
              </InfoSection>

              <Separator className="my-3" />

              {/* System Information */}
              <InfoSection
                title={t("about.systemInfo")}
                icon={<HugeiconsIcon icon={InformationCircleIcon} className="size-3.5" />}
              >
                <InfoGrid>
                  <InfoRow
                    label={t("about.operatingSystem")}
                    value={capitalizeOS(systemInfo.os.osType)}
                  />
                  <InfoRow label={t("about.osVersion")} value={systemInfo.os.osVersion} />
                  <InfoRow label={t("about.architecture")} value={systemInfo.os.arch} mono />
                  <InfoRow label={t("about.hostname")} value={systemInfo.os.hostname} mono />
                  <InfoRow label={t("about.platform")} value={systemInfo.os.platform} />
                </InfoGrid>
              </InfoSection>

              <Separator className="my-3" />

              {/* Links & Credits */}
              <InfoSection
                title={t("about.linksCredits")}
                icon={<HugeiconsIcon icon={Link01Icon} className="size-3.5" />}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <LinkButton
                      href={systemInfo.repository}
                      icon={<HugeiconsIcon icon={Github01Icon} className="size-3" />}
                      label="GitHub"
                      onClick={handleOpenUrl}
                    />
                    <LinkButton
                      href={systemInfo.homepage}
                      icon={<HugeiconsIcon icon={GlobalIcon} className="size-3" />}
                      label={t("about.website")}
                      onClick={handleOpenUrl}
                    />
                    <LinkButton
                      href={`${systemInfo.repository}/issues`}
                      icon={<HugeiconsIcon icon={InformationCircleIcon} className="size-3" />}
                      label={t("about.reportIssue")}
                      onClick={handleOpenUrl}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <HugeiconsIcon icon={ShieldKeyIcon} className="size-3" />
                    <span>{t("about.license")}:</span>
                    <span className="font-medium text-foreground">{systemInfo.license}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    <span>{t("about.authors")}: </span>
                    <span className="text-foreground">{systemInfo.authors.join(", ")}</span>
                  </div>
                </div>
              </InfoSection>

              <Separator className="my-3" />

              {/* Third-party Credits */}
              <InfoSection
                title={t("about.thirdParty")}
                icon={<HugeiconsIcon icon={Link01Icon} className="size-3.5" />}
              >
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p>Tauri (MIT/Apache-2.0)</p>
                  <p>React (MIT)</p>
                  <p>Zustand (MIT)</p>
                  <p>Lucide Icons (ISC)</p>
                  <p>Hugeicons (CC BY 4.0)</p>
                </div>
              </InfoSection>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              {t("about.loadError")}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border/50 bg-muted/30">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllInfo}
                    disabled={!systemInfo}
                    className="gap-1.5 h-7 text-xs"
                  />
                }
              >
                {copiedField === "all" ? (
                  <>
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      className="size-3.5 text-green-500"
                    />
                    {t("about.copied")}
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={Copy01Icon} className="size-3.5" />
                    {t("about.copyInfo")}
                  </>
                )}
              </TooltipTrigger>
              <TooltipContent>{t("about.copyInfoTooltip")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

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

function InfoSection({
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

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-1">{children}</div>
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
  onCopy,
  copied,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
  onCopy?: () => void
  copied?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 group">
      <span className="text-[10px] text-muted-foreground truncate">{label}</span>
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "text-[10px] truncate",
            mono && "font-mono",
            highlight && "text-green-600 dark:text-green-400 font-medium"
          )}
        >
          {value}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
            title="Copy"
          >
            {copied ? (
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-2.5 text-green-500" />
            ) : (
              <HugeiconsIcon icon={Copy01Icon} className="size-2.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function LinkButton({
  href,
  icon,
  label,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  label: string
  onClick: (url: string) => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onClick(href)}
      className="gap-1.5 h-7 text-xs"
    >
      {icon}
      {label}
    </Button>
  )
}

function capitalizeOS(os: string): string {
  const map: Record<string, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
    ios: "iOS",
    android: "Android",
  }
  return map[os.toLowerCase()] ?? os
}
