import { Button } from "@cadhy/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cadhy/ui/components/dialog"
import { Progress } from "@cadhy/ui/components/progress"
import { Cancel01Icon, Download04Icon, RefreshIcon, Rocket01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useUpdater } from "@/hooks/use-updater"

export function UpdateDialog() {
  const {
    updateAvailable,
    updateInfo,
    checking,
    downloading,
    progress,
    error,
    dismissed,
    checkForUpdates,
    downloadAndInstall,
    dismiss,
  } = useUpdater({
    checkOnMount: true,
    // Check every 4 hours (only if not dismissed, errors from auto-checks are silent)
    checkInterval: 4 * 60 * 60 * 1000,
  })

  // Show dialog when:
  // - Update is available (and not dismissed)
  // - There's an error from a manual check (and not dismissed)
  // Don't show for automatic check errors or when dismissed
  const isOpen = !dismissed && (updateAvailable || !!error)

  if (!isOpen && !downloading) {
    return null
  }

  return (
    <Dialog open={isOpen || downloading} onOpenChange={(open) => !open && dismiss()}>
      <DialogContent showCloseButton={!downloading}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Rocket01Icon} size={20} className="text-primary" />
            {checking ? "Checking for Updates..." : "Update Available"}
          </DialogTitle>
          <DialogDescription>
            {checking ? (
              "Looking for new versions..."
            ) : error ? (
              <span className="text-destructive">{error}</span>
            ) : updateInfo ? (
              <>
                A new version of CADHY is available.
                <br />
                <span className="font-medium text-foreground">
                  {updateInfo.currentVersion} → {updateInfo.version}
                </span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {downloading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress < 100 ? `Downloading... ${progress}%` : "Installing..."}
            </p>
          </div>
        )}

        {updateInfo?.body && !downloading && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs max-h-32 overflow-y-auto">
            <p className="font-medium mb-1">What's new:</p>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {updateInfo.body.replace(/https:\/\/github\.com\/[^\s]+\/releases\/tag\/[^\s]+/g, "")}
            </p>
            {updateInfo.version && (
              <a
                href={`https://github.com/crhristian-cornejo/CADHY/releases/tag/v${updateInfo.version}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline mt-2 inline-block"
              >
                See full changes here →
              </a>
            )}
          </div>
        )}

        <DialogFooter>
          {error ? (
            <>
              <Button variant="outline" onClick={dismiss}>
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
                Dismiss
              </Button>
              <Button onClick={checkForUpdates}>
                <HugeiconsIcon icon={RefreshIcon} size={16} />
                Retry
              </Button>
            </>
          ) : !downloading ? (
            <>
              <Button variant="outline" onClick={dismiss}>
                Later
              </Button>
              <Button onClick={downloadAndInstall} disabled={checking}>
                <HugeiconsIcon icon={Download04Icon} size={16} />
                Update Now
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
