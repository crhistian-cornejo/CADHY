import { logger } from "@cadhy/shared/logger"
import { relaunch } from "@tauri-apps/plugin-process"
import { check, type Update } from "@tauri-apps/plugin-updater"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Check if updater is enabled.
 * Uses runtime state from Tauri backend when available (preferred),
 * falls back to build-time environment check.
 */
function isUpdaterEnabled(): boolean {
  // Prefer runtime state injected by Tauri backend
  if (typeof window !== "undefined" && window.__CADHY__) {
    return window.__CADHY__.updaterEnabled
  }
  // Fallback: disable in dev mode
  return !import.meta.env.DEV && import.meta.env.MODE !== "development"
}

export interface UpdateInfo {
  version: string
  currentVersion: string
  body?: string
  date?: string
}

export type UpdateState =
  | "idle"
  | "checking"
  | "downloading"
  | "downloaded"
  | "installing"
  | "error"

export interface UseUpdaterReturn {
  /** Whether an update is available */
  updateAvailable: boolean
  /** Information about the available update */
  updateInfo: UpdateInfo | null
  /** Current state of the updater */
  state: UpdateState
  /** Whether we're currently checking for updates */
  checking: boolean
  /** Whether we're currently downloading */
  downloading: boolean
  /** Whether download is complete and ready to install */
  readyToInstall: boolean
  /** Download progress (0-100) */
  progress: number
  /** Any error that occurred (only set for manual checks) */
  error: string | null
  /** Whether the dialog has been dismissed by user */
  dismissed: boolean
  /** Check for updates manually */
  checkForUpdates: () => Promise<void>
  /** Download the update (separate from install) */
  downloadUpdate: () => Promise<void>
  /** Install the downloaded update and relaunch */
  installUpdate: () => Promise<void>
  /** Download and install in one step (legacy behavior) */
  downloadAndInstall: () => Promise<void>
  /** Dismiss the update notification */
  dismiss: () => void
  /** Resume update check from badge click (clears dismissed state first) */
  resumeFromBadge: () => void
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
  const [state, setState] = useState<UpdateState>("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [update, setUpdate] = useState<Update | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [readyToInstall, setReadyToInstall] = useState(false)

  // Track if initial check has been done to avoid re-checking on every render
  const hasCheckedOnMount = useRef(false)
  // Track if current check is manual (user-initiated) vs automatic
  const isManualCheck = useRef(false)

  // Derived states for backward compatibility
  const checking = state === "checking"
  const downloading = state === "downloading"

  const checkForUpdates = useCallback(
    async (manual = true) => {
      // Skip update checks if updater is disabled (dev mode or no signing key)
      if (!isUpdaterEnabled()) {
        logger.log("[Updater] Skipping update check - updater not enabled")
        return
      }

      if (state === "checking" || state === "downloading" || state === "installing") return

      isManualCheck.current = manual
      setState("checking")
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
          logger.log(`[Updater] Update available: ${result.currentVersion} → ${result.version}`)
        } else {
          setUpdateAvailable(false)
          setUpdateInfo(null)
          logger.log("[Updater] No updates available")
        }
        setState("idle")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to check for updates"
        // Only set error state for manual checks to avoid annoying popups
        if (isManualCheck.current) {
          setError(message)
          setState("error")
        } else {
          setState("idle")
        }
        console.error("[Updater] Error checking for updates:", err)
      }
    },
    [state]
  )

  // Download update separately (OpenCode pattern)
  const downloadUpdate = useCallback(async () => {
    if (!update || state === "downloading" || state === "installing") return

    setState("downloading")
    setProgress(0)
    setError(null)

    try {
      logger.log("[Updater] Starting download...")

      let downloaded = 0
      let contentLength = 0

      await update.download((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0
            logger.log(`[Updater] Download started, size: ${contentLength || "unknown"} bytes`)
            break
          case "Progress": {
            downloaded += event.data.chunkLength
            if (contentLength > 0) {
              const percent = Math.min(Math.round((downloaded / contentLength) * 100), 99)
              setProgress(percent)
            }
            break
          }
          case "Finished":
            logger.log("[Updater] Download finished")
            setProgress(100)
            break
        }
      })

      setState("downloaded")
      setReadyToInstall(true)
      logger.log("[Updater] Update downloaded and ready to install")
    } catch (err) {
      const message = extractErrorMessage(err)
      setError(message)
      setState("error")
      console.error("[Updater] Error downloading update:", err)
    }
  }, [update, state])

  // Install the downloaded update
  const installUpdate = useCallback(async () => {
    if (!update || !readyToInstall) {
      logger.warn("[Updater] Cannot install: update not downloaded yet")
      return
    }

    setState("installing")
    setError(null)

    try {
      logger.log("[Updater] Installing update...")

      // Save state before relaunching
      if (update.version) {
        localStorage.setItem(
          "cadhy-update-badge",
          JSON.stringify({
            type: "installed",
            version: update.version,
          })
        )
      }

      await update.install()
      logger.log("[Updater] Update installed, relaunching...")
      await relaunch()
    } catch (err) {
      const message = extractErrorMessage(err)
      setError(message)
      setState("error")
      console.error("[Updater] Error installing update:", err)
    }
  }, [update, readyToInstall])

  // Legacy: download and install in one step
  const downloadAndInstall = useCallback(async () => {
    if (!update || state === "downloading" || state === "installing") return

    setState("downloading")
    setProgress(0)
    setError(null)

    try {
      logger.log("[Updater] Starting download...")

      let downloaded = 0
      let contentLength = 0

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0
            logger.log(`[Updater] Download started, size: ${contentLength || "unknown"} bytes`)
            break
          case "Progress": {
            downloaded += event.data.chunkLength
            if (contentLength > 0) {
              const percent = Math.min(Math.round((downloaded / contentLength) * 100), 99)
              setProgress(percent)
            }
            break
          }
          case "Finished":
            logger.log("[Updater] Download finished")
            setProgress(100)
            break
        }
      })

      setState("installing")
      logger.log("[Updater] Update installed, relaunching...")

      if (update.version) {
        localStorage.setItem(
          "cadhy-update-badge",
          JSON.stringify({
            type: "installed",
            version: update.version,
          })
        )
      }
      await relaunch()
    } catch (err) {
      const message = extractErrorMessage(err)
      setError(message)
      setState("error")
      console.error("[Updater] Error installing update:", err)
    }
  }, [update, state])

  const dismiss = useCallback(() => {
    // Save "Later" state to show badge
    if (updateInfo?.version) {
      localStorage.setItem(
        "cadhy-update-badge",
        JSON.stringify({
          type: "pending",
          version: updateInfo.version,
        })
      )
    }
    setUpdateAvailable(false)
    setUpdateInfo(null)
    setUpdate(null)
    setError(null)
    setDismissed(true)
    setState("idle")
    setReadyToInstall(false)
  }, [updateInfo])

  // Resume update from badge click - just re-check without dismissing
  const resumeFromBadge = useCallback(() => {
    // Clear dismissed state so dialog can show
    setDismissed(false)
    // Trigger a fresh check (manual mode will show errors)
    checkForUpdates(true)
  }, [checkForUpdates])

  // Check on mount - only once (automatic, no error popup)
  useEffect(() => {
    if (checkOnMount && !hasCheckedOnMount.current) {
      hasCheckedOnMount.current = true
      // Small delay to let the app initialize
      const timeout = setTimeout(() => checkForUpdates(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [checkForUpdates, checkOnMount])

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
    downloadAndInstall,
    dismiss,
    resumeFromBadge,
  }
}

// Helper function to extract error message
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // Log full error details for debugging
    console.error("[Updater] Error details:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: (err as Error & { cause?: unknown }).cause,
    })
    return err.message
  }
  if (typeof err === "string") {
    return err
  }
  if (err && typeof err === "object") {
    return JSON.stringify(err)
  }
  return "Unknown error occurred"
}
