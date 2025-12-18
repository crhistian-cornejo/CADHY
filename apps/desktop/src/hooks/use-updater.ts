import { relaunch } from "@tauri-apps/plugin-process"
import { check, type Update } from "@tauri-apps/plugin-updater"
import { useCallback, useEffect, useRef, useState } from "react"

export interface UpdateInfo {
  version: string
  currentVersion: string
  body?: string
  date?: string
}

export interface UseUpdaterReturn {
  /** Whether an update is available */
  updateAvailable: boolean
  /** Information about the available update */
  updateInfo: UpdateInfo | null
  /** Whether we're currently checking for updates */
  checking: boolean
  /** Whether we're currently downloading/installing */
  downloading: boolean
  /** Download progress (0-100) */
  progress: number
  /** Any error that occurred (only set for manual checks) */
  error: string | null
  /** Whether the dialog has been dismissed by user */
  dismissed: boolean
  /** Check for updates manually */
  checkForUpdates: () => Promise<void>
  /** Download and install the update */
  downloadAndInstall: () => Promise<void>
  /** Dismiss the update notification */
  dismiss: () => void
}

export function useUpdater(options?: {
  /** Check for updates automatically on mount */
  checkOnMount?: boolean
  /** Check interval in milliseconds (0 = disabled) */
  checkInterval?: number
}): UseUpdaterReturn {
  const { checkOnMount = true, checkInterval = 0 } = options ?? {}

  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [update, setUpdate] = useState<Update | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Track if initial check has been done to avoid re-checking on every render
  const hasCheckedOnMount = useRef(false)
  // Track if current check is manual (user-initiated) vs automatic
  const isManualCheck = useRef(false)

  const checkForUpdates = useCallback(
    async (manual = true) => {
      if (checking || downloading) return

      isManualCheck.current = manual
      setChecking(true)
      // Only clear error for manual checks
      if (manual) {
        setError(null)
        setDismissed(false)
      }

      try {
        const result = await check()

        if (result) {
          setUpdate(result)
          setUpdateAvailable(true)
          setUpdateInfo({
            version: result.version,
            currentVersion: result.currentVersion,
            body: result.body ?? undefined,
            date: result.date ?? undefined,
          })
          console.log(`[Updater] Update available: ${result.currentVersion} → ${result.version}`)
        } else {
          setUpdateAvailable(false)
          setUpdateInfo(null)
          console.log("[Updater] No updates available")
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to check for updates"
        // Only set error state for manual checks to avoid annoying popups
        if (isManualCheck.current) {
          setError(message)
        }
        console.error("[Updater] Error checking for updates:", err)
      } finally {
        setChecking(false)
      }
    },
    [checking, downloading]
  )

  const downloadAndInstall = useCallback(async () => {
    if (!update || downloading) return

    setDownloading(true)
    setProgress(0)
    setError(null)

    try {
      console.log("[Updater] Starting download...")

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            console.log(
              `[Updater] Download started, size: ${event.data.contentLength ?? "unknown"}`
            )
            break
          case "Progress": {
            const percent = event.data.chunkLength
              ? Math.round((event.data.chunkLength / (update as any).contentLength) * 100)
              : 0
            setProgress(percent)
            break
          }
          case "Finished":
            console.log("[Updater] Download finished")
            setProgress(100)
            break
        }
      })

      console.log("[Updater] Update installed, relaunching...")
      await relaunch()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to install update"
      setError(message)
      console.error("[Updater] Error installing update:", err)
      setDownloading(false)
    }
  }, [update, downloading])

  const dismiss = useCallback(() => {
    setUpdateAvailable(false)
    setUpdateInfo(null)
    setUpdate(null)
    setError(null)
    setDismissed(true)
  }, [])

  // Check on mount - only once (automatic, no error popup)
  useEffect(() => {
    if (checkOnMount && !hasCheckedOnMount.current) {
      hasCheckedOnMount.current = true
      // Small delay to let the app initialize
      const timeout = setTimeout(() => checkForUpdates(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [checkForUpdates, checkOnMount]) // Empty deps - only run once on mount

  // Periodic check - only if not dismissed (automatic, no error popup)
  useEffect(() => {
    if (checkInterval > 0 && !dismissed) {
      const interval = setInterval(() => checkForUpdates(false), checkInterval)
      return () => clearInterval(interval)
    }
  }, [checkInterval, dismissed, checkForUpdates])

  return {
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
  }
}
