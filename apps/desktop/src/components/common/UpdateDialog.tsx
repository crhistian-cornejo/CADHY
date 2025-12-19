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
    state,
    checking,
    downloading,
    readyToInstall,
    progress,
    error,
    dismissed,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismiss,
  } = useUpdater({
    checkOnMount: true,
    // Check every 4 hours (only if not dismissed, errors from auto-checks are silent)
    checkInterval: 4 * 60 * 60 * 1000,
  })

  const isInstalling = state === "installing"

  // Show dialog when:
  // - Update is available (and not dismissed)
  // - There's an error from a manual check (and not dismissed)
  // - Download is in progress
  // - Ready to install
  // - Installing
  const showDialog =
    !dismissed && (updateAvailable || !!error || downloading || readyToInstall || isInstalling)

  if (!showDialog) {
    return null
  }

  // Render title based on state
  const renderTitle = () => {
    if (checking) return "Checking for Updates..."
    if (isInstalling) return "Installing Update..."
    if (readyToInstall) return "Update Ready to Install"
    if (downloading) return "Downloading Update..."
    if (error) return "Update Error"
    return "Update Available"
  }

  // Render description based on state
  const renderDescription = () => {
    if (checking) {
      return "Looking for new versions..."
    }
    if (error) {
      return <span className="text-destructive">{error}</span>
    }
    if (isInstalling) {
      return "Installing update and preparing to restart..."
    }
    if (readyToInstall && updateInfo) {
      return (
        <>
          Version {updateInfo.version} has been downloaded.
          <br />
          <span className="font-medium text-foreground">Ready to install and restart.</span>
        </>
      )
    }
    if (downloading) {
      return "Please wait while the update downloads..."
    }
    if (updateInfo) {
      return (
        <>
          A new version of CADHY is available.
          <br />
          <span className="font-medium text-foreground">
            {updateInfo.currentVersion} → {updateInfo.version}
          </span>
        </>
      )
    }
    return null
  }

  // Render footer buttons based on state
  const renderFooter = () => {
    // Error state: show dismiss and retry
    if (error) {
      return (
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
      )
    }

    // Installing: no buttons (user can't cancel)
    if (isInstalling) {
      return null
    }

    // Ready to install: show install button
    if (readyToInstall) {
      return (
        <>
          <Button variant="outline" onClick={dismiss}>
            Not yet
          </Button>
          <Button onClick={installUpdate}>
            <HugeiconsIcon icon={Rocket01Icon} size={16} />
            Install and Restart
          </Button>
        </>
      )
    }

    // Downloading: no buttons
    if (downloading) {
      return null
    }

    // Update available: show download button
    return (
      <>
        <Button variant="outline" onClick={dismiss}>
          Later
        </Button>
        <Button onClick={downloadUpdate} disabled={checking}>
          <HugeiconsIcon icon={Download04Icon} size={16} />
          Download Update
        </Button>
      </>
    )
  }

  return (
    <Dialog
      open={showDialog}
      onOpenChange={(open) => !open && !downloading && !isInstalling && dismiss()}
    >
      <DialogContent showCloseButton={!downloading && !isInstalling}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Rocket01Icon} size={20} className="text-primary" />
            {renderTitle()}
          </DialogTitle>
          <DialogDescription>{renderDescription()}</DialogDescription>
        </DialogHeader>

        {(downloading || isInstalling) && (
          <div className="space-y-2">
            <Progress value={isInstalling ? 100 : progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {isInstalling ? "Installing..." : `Downloading... ${progress}%`}
            </p>
          </div>
        )}

        {updateInfo?.body && !downloading && !isInstalling && !readyToInstall && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs max-h-32 overflow-y-auto">
            <p className="font-medium mb-1">What's new:</p>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {updateInfo.body.replace(/https:\/\/github\.com\/[^\s]+\/releases\/tag\/[^\s]+/g, "")}
            </p>
            {updateInfo.version && (
              <a
                href={`https://github.com/crhistian-cornejo/CADHY/releases/tag/v${updateInfo.version}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline mt-2 inline-block"
              >
                See full changes here →
              </a>
            )}
          </div>
        )}

        <DialogFooter>{renderFooter()}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
