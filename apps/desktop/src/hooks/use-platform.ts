/**
 * Platform Detection Hook (Desktop App)
 *
 * Uses Tauri's os-plugin for accurate platform detection.
 * Falls back to navigator-based detection if Tauri is unavailable.
 */

import { getCurrentWindow } from "@tauri-apps/api/window"
import { type as getType } from "@tauri-apps/plugin-os"
import { useEffect, useState } from "react"

export type Platform = "windows" | "macos" | "linux" | "ios" | "android" | "unknown"

export interface PlatformInfo {
  /** Current operating system platform */
  platform: Platform
  /** Whether the current platform is Windows */
  isWindows: boolean
  /** Whether the current platform is macOS */
  isMacOS: boolean
  /** Whether the current platform is Linux */
  isLinux: boolean
  /** Whether we're running in a desktop environment (not mobile) */
  isDesktop: boolean
  /** Whether we're running in a mobile environment */
  isMobile: boolean
  /** Whether the platform has been detected yet (Tauri async detection) */
  isLoading: boolean
}

// Cached platform value to avoid multiple detections
let cachedPlatform: Platform | null = null

/**
 * Detect platform from navigator (fallback)
 */
function detectPlatformFromNavigator(): Platform {
  if (typeof navigator === "undefined") return "unknown"

  const userAgent = navigator.userAgent.toLowerCase()
  const platform = navigator.platform?.toLowerCase() || ""

  // Check for mobile first
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios"
  if (/android/.test(userAgent)) return "android"

  // Desktop platforms
  if (platform.includes("win") || userAgent.includes("windows")) return "windows"
  if (platform.includes("mac") || userAgent.includes("macintosh")) return "macos"
  if (platform.includes("linux") || userAgent.includes("linux")) return "linux"

  return "unknown"
}

/**
 * Map Tauri OS type to our Platform type
 */
function mapOsTypeToPlatform(osType: string): Platform {
  switch (osType) {
    case "windows":
      return "windows"
    case "macos":
      return "macos"
    case "linux":
      return "linux"
    case "ios":
      return "ios"
    case "android":
      return "android"
    default:
      return "unknown"
  }
}

/**
 * Hook to get current platform information with Tauri-enhanced detection
 */
export function usePlatform(): PlatformInfo {
  // Start with cached or navigator-based detection (synchronous)
  const initialPlatform = cachedPlatform ?? detectPlatformFromNavigator()
  const [platform, setPlatform] = useState<Platform>(initialPlatform)
  const [isLoading, setIsLoading] = useState(cachedPlatform === null)

  useEffect(() => {
    if (cachedPlatform !== null) {
      setPlatform(cachedPlatform)
      setIsLoading(false)
      return
    }

    const detectPlatform = async () => {
      try {
        // Try Tauri's os-plugin for accurate detection
        const osType = await getType()
        const detectedPlatform = mapOsTypeToPlatform(osType)
        cachedPlatform = detectedPlatform
        setPlatform(detectedPlatform)
      } catch {
        // Tauri not available, use navigator detection (already set as initial)
        cachedPlatform = initialPlatform
      } finally {
        setIsLoading(false)
      }
    }

    detectPlatform()
  }, [initialPlatform])

  return {
    platform,
    isWindows: platform === "windows",
    isMacOS: platform === "macos",
    isLinux: platform === "linux",
    isDesktop: platform === "windows" || platform === "macos" || platform === "linux",
    isMobile: platform === "ios" || platform === "android",
    isLoading,
  }
}

/**
 * Synchronous platform check using cached value or navigator fallback.
 */
export function getPlatformSync(): Platform {
  return cachedPlatform ?? detectPlatformFromNavigator()
}

/**
 * Check if we're on macOS (sync version for conditional rendering)
 */
export function isMacOS(): boolean {
  return getPlatformSync() === "macos"
}

/**
 * Check if we're on Windows (sync version for conditional rendering)
 */
export function isWindows(): boolean {
  return getPlatformSync() === "windows"
}

/**
 * Check if we're on Linux (sync version for conditional rendering)
 */
export function isLinux(): boolean {
  return getPlatformSync() === "linux"
}

/**
 * Hook to detect fullscreen state
 *
 * Listens to window resize events and checks fullscreen state.
 * Useful for adjusting UI layout (e.g., moving logo on macOS fullscreen).
 */
export function useIsFullscreen(): boolean {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const checkFullscreen = async () => {
      try {
        const window = getCurrentWindow()
        const fullscreen = await window.isFullscreen()
        setIsFullscreen(fullscreen)
      } catch {
        // Tauri not available or error
        setIsFullscreen(false)
      }
    }

    // Check initial state
    checkFullscreen()

    // Listen for window resize events (fullscreen triggers resize)
    const handleResize = () => {
      checkFullscreen()
    }

    window.addEventListener("resize", handleResize)

    // Also listen for Tauri's window events if available
    let unlisten: (() => void) | undefined
    const setupListener = async () => {
      try {
        const tauriWindow = getCurrentWindow()
        unlisten = await tauriWindow.onResized(() => {
          checkFullscreen()
        })
      } catch {
        // Tauri not available
      }
    }
    setupListener()

    return () => {
      window.removeEventListener("resize", handleResize)
      unlisten?.()
    }
  }, [])

  return isFullscreen
}
