/**
 * Help Dialog
 *
 * Comprehensive Help & Support dialog providing documentation links,
 * keyboard shortcuts, tutorials, and support resources.
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
} from "@cadhy/ui"
import {
  Book01Icon,
  BookOpen01Icon,
  BubbleChatQuestionIcon,
  CustomerServiceIcon,
  Github01Icon,
  KeyboardIcon,
  Link01Icon,
  PlayCircleIcon,
  RocketIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { getVersion } from "@tauri-apps/api/app"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { openUrl } from "@/services/tauri-service"

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenShortcuts?: () => void
}

export function HelpDialog({ open, onOpenChange, onOpenShortcuts }: HelpDialogProps) {
  const { t } = useTranslation()
  const [version, setVersion] = useState<string>("")

  useEffect(() => {
    getVersion()
      .then((v) => setVersion(v))
      .catch(() => setVersion("unknown"))
  }, [])

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
            <div className="flex items-center justify-center size-10 rounded-2xl bg-primary/10">
              <HugeiconsIcon icon={BubbleChatQuestionIcon} className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>{t("help.title")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("help.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[320px]">
          <div className="p-4 space-y-4">
            {/* Getting Started */}
            <HelpSection
              title={t("help.gettingStarted")}
              icon={<HugeiconsIcon icon={RocketIcon} className="size-3.5" />}
            >
              <div className="grid gap-1">
                <HelpLink
                  icon={<HugeiconsIcon icon={PlayCircleIcon} className="size-3.5" />}
                  title={t("help.quickStart")}
                  description={t("help.quickStartDesc")}
                  onClick={() => handleOpenUrl("https://cadhy.app/docs/quickstart")}
                />
                <HelpLink
                  icon={<HugeiconsIcon icon={Video01Icon} className="size-3.5" />}
                  title={t("help.videoTutorials")}
                  description={t("help.videoTutorialsDesc")}
                  onClick={() => handleOpenUrl("https://cadhy.app/tutorials")}
                />
                <HelpLink
                  icon={<HugeiconsIcon icon={BookOpen01Icon} className="size-3.5" />}
                  title={t("help.examples")}
                  description={t("help.examplesDesc")}
                  onClick={() => handleOpenUrl("https://cadhy.app/examples")}
                />
              </div>
            </HelpSection>

            <Separator className="my-3" />

            {/* Documentation */}
            <HelpSection
              title={t("help.documentation")}
              icon={<HugeiconsIcon icon={Book01Icon} className="size-3.5" />}
            >
              <div className="grid gap-1">
                <HelpLink
                  icon={<HugeiconsIcon icon={Book01Icon} className="size-3.5" />}
                  title={t("help.userGuide")}
                  description={t("help.userGuideDesc")}
                  onClick={() => handleOpenUrl("https://cadhy.app/docs")}
                />
                <HelpLink
                  icon={<HugeiconsIcon icon={Link01Icon} className="size-3.5" />}
                  title={t("help.apiReference")}
                  description={t("help.apiReferenceDesc")}
                  onClick={() => handleOpenUrl("https://cadhy.app/docs/api")}
                  badge="Advanced"
                />
                <HelpLink
                  icon={<HugeiconsIcon icon={KeyboardIcon} className="size-3.5" />}
                  title={t("help.keyboardShortcuts")}
                  description={t("help.keyboardShortcutsDesc")}
                  onClick={onOpenShortcuts}
                />
              </div>
            </HelpSection>

            <Separator className="my-3" />

            {/* Hydraulics Reference */}
            <HelpSection
              title={t("help.hydraulicsReference")}
              icon={<HugeiconsIcon icon={BookOpen01Icon} className="size-3.5" />}
            >
              <div className="grid gap-1">
                <HelpLink
                  icon={<HugeiconsIcon icon={BookOpen01Icon} className="size-3.5" />}
                  title={t("help.manningEquation")}
                  description={t("help.manningEquationDesc")}
                  onClick={() => handleOpenUrl("https://cadhy.app/docs/hydraulics/manning")}
                />
                <HelpLink
                  icon={<HugeiconsIcon icon={BookOpen01Icon} className="size-3.5" />}
                  title={t("help.channelFlow")}
                  description={t("help.channelFlowDesc")}
                  onClick={() => handleOpenUrl("https://cadhy.app/docs/hydraulics/channel-flow")}
                />
                <HelpLink
                  icon={<HugeiconsIcon icon={BookOpen01Icon} className="size-3.5" />}
                  title={t("help.pipeNetwork")}
                  description={t("help.pipeNetworkDesc")}
                  onClick={() => handleOpenUrl("https://cadhy.app/docs/hydraulics/pipe-network")}
                />
              </div>
            </HelpSection>

            <Separator className="my-3" />

            {/* Support */}
            <HelpSection
              title={t("help.support")}
              icon={<HugeiconsIcon icon={CustomerServiceIcon} className="size-3.5" />}
            >
              <div className="grid gap-1">
                <HelpLink
                  icon={<HugeiconsIcon icon={Github01Icon} className="size-3.5" />}
                  title={t("help.reportIssue")}
                  description={t("help.reportIssueDesc")}
                  onClick={() => handleOpenUrl("https://github.com/corx-ai/cadhy/issues")}
                />
                <HelpLink
                  icon={<HugeiconsIcon icon={BubbleChatQuestionIcon} className="size-3.5" />}
                  title={t("help.community")}
                  description={t("help.communityDesc")}
                  onClick={() => handleOpenUrl("https://github.com/corx-ai/cadhy/discussions")}
                />
                <HelpLink
                  icon={<HugeiconsIcon icon={CustomerServiceIcon} className="size-3.5" />}
                  title={t("help.contactSupport")}
                  description={t("help.contactSupportDesc")}
                  onClick={() => handleOpenUrl("mailto:support@cadhy.app")}
                />
              </div>
            </HelpSection>

            {/* Version Info */}
            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>CADHY v{version}</span>
              <span>-</span>
              <button
                type="button"
                onClick={() => handleOpenUrl("https://cadhy.app/changelog")}
                className="text-primary hover:underline"
              >
                {t("help.viewChangelog")}
              </button>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/50 bg-muted/30">
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

function HelpSection({
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

function HelpLink({
  icon,
  title,
  description,
  onClick,
  badge,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick?: () => void
  badge?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 p-2 rounded-2xl text-left w-full",
        "hover:bg-muted/50 transition-colors",
        "group cursor-pointer"
      )}
    >
      <div className="flex items-center justify-center size-7 rounded-2xl bg-muted shrink-0 group-hover:bg-muted/80 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">{title}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
      </div>
    </button>
  )
}
