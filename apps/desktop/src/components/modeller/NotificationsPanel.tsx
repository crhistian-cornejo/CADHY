/**
 * NotificationsPanel - CADHY
 *
 * Displays design notifications and warnings for hydraulic elements.
 * Shows info, warnings, and errors with recommendations.
 * Can be dismissed or filtered by severity/category.
 */

import {
  Badge,
  Button,
  Card,
  cn,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  Add01Icon,
  Alert01Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Recycle03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  type DesignNotification,
  type NotificationSeverity,
  useActiveNotifications,
  useModellerStore,
  useNotificationSummary,
  useObjects,
} from "@/stores/modeller-store"

// ============================================================================
// TYPES
// ============================================================================

interface NotificationsPanelProps {
  className?: string
  /** Compact mode for viewport overlay */
  compact?: boolean
}

// ============================================================================
// SEVERITY CONFIG
// ============================================================================

const SEVERITY_CONFIG: Record<
  NotificationSeverity,
  {
    icon: typeof Alert01Icon
    bgClass: string
    borderClass: string
    textClass: string
    badgeVariant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  info: {
    icon: InformationCircleIcon,
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    textClass: "text-blue-500",
    badgeVariant: "secondary",
  },
  warning: {
    icon: Alert01Icon,
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    textClass: "text-amber-500",
    badgeVariant: "default",
  },
  error: {
    icon: AlertCircleIcon,
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/30",
    textClass: "text-red-500",
    badgeVariant: "destructive",
  },
}

// ============================================================================
// NOTIFICATION ITEM
// ============================================================================

interface NotificationItemProps {
  notification: DesignNotification
  onDismiss: (id: string) => void
  onFocusObject: (id: string) => void
  onExecuteAction: (id: string) => void
  compact?: boolean
}

function NotificationItem({
  notification,
  onDismiss,
  onFocusObject,
  onExecuteAction,
  compact,
}: NotificationItemProps) {
  const { t } = useTranslation()
  const config = SEVERITY_CONFIG[notification.severity]
  const Icon = config.icon

  return (
    <Card
      className={cn(
        "p-2 border transition-colors",
        config.bgClass,
        config.borderClass,
        "hover:bg-opacity-20"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div className={cn("shrink-0 mt-0.5", config.textClass)}>
          <HugeiconsIcon icon={Icon} className="size-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title & Object */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium truncate">{notification.title}</span>
            {notification.objectName && (
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 h-4 shrink-0 cursor-pointer hover:bg-muted"
                onClick={() => notification.objectId && onFocusObject(notification.objectId)}
              >
                {notification.objectName}
              </Badge>
            )}
          </div>

          {/* Message */}
          {!compact && (
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {notification.message}
            </p>
          )}

          {/* Recommendation */}
          {!compact && notification.recommendation && (
            <div className="flex items-start gap-1.5 mt-1.5 p-1.5 rounded bg-muted/30">
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-3 shrink-0 mt-0.5 text-muted-foreground"
              />
              <p className="text-[9px] text-muted-foreground italic">
                {notification.recommendation}
              </p>
            </div>
          )}

          {/* Action Button */}
          {!compact && notification.action && (
            <div className="mt-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-6 text-[10px] gap-1.5"
                onClick={() => onExecuteAction(notification.id)}
              >
                <HugeiconsIcon icon={Add01Icon} className="size-3" />
                {notification.action.label}
              </Button>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 h-5 w-5 opacity-60 hover:opacity-100"
              onClick={() => onDismiss(notification.id)}
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">{t("designChecks.dismiss")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </Card>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-6 text-green-500" />
      </div>
      <p className="text-sm font-medium text-foreground">{t("designChecks.noIssues")}</p>
      <p className="text-xs text-muted-foreground mt-1">{t("designChecks.designLooksGood")}</p>
    </div>
  )
}

// ============================================================================
// SUMMARY BAR
// ============================================================================

interface SummaryBarProps {
  summary: { info: number; warning: number; error: number; total: number }
  onDismissAll: () => void
  onRefresh: () => void
}

function SummaryBar({ summary, onDismissAll, onRefresh }: SummaryBarProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/30">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">{t("designChecks.title")}</span>
        <div className="flex items-center gap-1.5">
          {summary.error > 0 && (
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
              {summary.error}
            </Badge>
          )}
          {summary.warning > 0 && (
            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500 hover:bg-amber-600">
              {summary.warning}
            </Badge>
          )}
          {summary.info > 0 && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
              {summary.info}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="h-6 w-6" onClick={onRefresh}>
              <HugeiconsIcon icon={Recycle03Icon} className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{t("designChecks.reanalyze")}</p>
          </TooltipContent>
        </Tooltip>

        {summary.total > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={onDismissAll}
              >
                {t("designChecks.dismissAll")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t("designChecks.dismissAllTooltip")}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotificationsPanel({ className, compact = false }: NotificationsPanelProps) {
  const notifications = useActiveNotifications()
  const summary = useNotificationSummary()
  const _objects = useObjects()
  const {
    analyzeScene,
    dismissNotification,
    dismissAllNotifications,
    executeNotificationAction,
    focusObject,
  } = useModellerStore()

  // Re-analyze when objects change
  useEffect(() => {
    analyzeScene()
  }, [analyzeScene])

  // Group notifications by severity
  const groupedNotifications = useMemo(() => {
    const errors = notifications.filter((n) => n.severity === "error")
    const warnings = notifications.filter((n) => n.severity === "warning")
    const infos = notifications.filter((n) => n.severity === "info")
    return { errors, warnings, infos }
  }, [notifications])

  const handleFocusObject = (objectId: string) => {
    focusObject(objectId)
  }

  const handleExecuteAction = (notificationId: string) => {
    executeNotificationAction(notificationId)
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Summary Bar */}
      <SummaryBar
        summary={summary}
        onDismissAll={dismissAllNotifications}
        onRefresh={analyzeScene}
      />

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Errors first */}
              {groupedNotifications.errors.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onDismiss={dismissNotification}
                  onFocusObject={handleFocusObject}
                  onExecuteAction={handleExecuteAction}
                  compact={compact}
                />
              ))}

              {/* Then warnings */}
              {groupedNotifications.warnings.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onDismiss={dismissNotification}
                  onFocusObject={handleFocusObject}
                  onExecuteAction={handleExecuteAction}
                  compact={compact}
                />
              ))}

              {/* Then info */}
              {groupedNotifications.infos.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onDismiss={dismissNotification}
                  onFocusObject={handleFocusObject}
                  onExecuteAction={handleExecuteAction}
                  compact={compact}
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// COMPACT INDICATOR (for toolbar/status bar)
// ============================================================================

interface NotificationIndicatorProps {
  onClick?: () => void
}

export function NotificationIndicator({ onClick }: NotificationIndicatorProps) {
  const summary = useNotificationSummary()
  const { t } = useTranslation()

  if (summary.total === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-7 w-7 text-green-500"
            onClick={onClick}
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{t("designChecks.noIssues")}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Determine the most severe icon to show
  const Icon =
    summary.error > 0 ? AlertCircleIcon : summary.warning > 0 ? Alert01Icon : InformationCircleIcon

  const colorClass =
    summary.error > 0 ? "text-red-500" : summary.warning > 0 ? "text-amber-500" : "text-blue-500"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className={cn("h-7 w-7 relative", colorClass)}
          onClick={onClick}
        >
          <HugeiconsIcon icon={Icon} className="size-4" />
          <span className="absolute -top-0.5 -right-0.5 size-3.5 text-[8px] bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
            {summary.total > 9 ? "9+" : summary.total}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {summary.error > 0 && `${summary.error} errors, `}
          {summary.warning > 0 && `${summary.warning} warnings, `}
          {summary.info > 0 && `${summary.info} info`}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

export default NotificationsPanel
