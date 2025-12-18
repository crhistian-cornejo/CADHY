/**
 * Tauri Service - CADHY
 *
 * Provides access to native Tauri functionality including system information,
 * shell operations, and application metadata.
 */

import { invoke } from "@tauri-apps/api/core"
import { open as openShell } from "@tauri-apps/plugin-shell"

// ============================================================================
// TYPES
// ============================================================================

export interface BuildInfo {
  version: string
  gitCommit: string
  gitBranch: string
  gitDirty: boolean
  buildTimestamp: string
  buildProfile: "debug" | "release"
  targetTriple: string
  rustVersion: string
}

export interface OSInfo {
  osType: string
  osVersion: string
  arch: string
  hostname: string
  platform: string
}

export interface TechStack {
  tauriVersion: string
  rustVersion: string
}

export interface SystemInfo {
  appName: string
  appDescription: string
  build: BuildInfo
  os: OSInfo
  techStack: TechStack
  repository: string
  homepage: string
  license: string
  authors: string[]
}

export interface BasicSystemInfo {
  os: string
  arch: string
  version: string
}

// ============================================================================
// SYSTEM INFORMATION
// ============================================================================

/**
 * Get basic system information from Rust backend
 */
export async function getBasicSystemInfo(): Promise<BasicSystemInfo> {
  return invoke<BasicSystemInfo>("get_system_info")
}

/**
 * Get comprehensive system information for About dialog
 * This combines Rust backend data with frontend constants
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  try {
    const basicInfo = await getBasicSystemInfo()

    // Build comprehensive info combining backend and frontend data
    const systemInfo: SystemInfo = {
      appName: "CADHY",
      appDescription: "Computer-Aided Design for HYdraulics (CADHY)",
      build: {
        version: basicInfo.version || "0.1.0",
        gitCommit: __GIT_COMMIT__ || "unknown",
        gitBranch: __GIT_BRANCH__ || "main",
        gitDirty: __GIT_DIRTY__ || false,
        buildTimestamp: __BUILD_TIMESTAMP__ || new Date().toISOString(),
        buildProfile: __DEV__ ? "debug" : "release",
        targetTriple: getTargetTriple(basicInfo),
        rustVersion: __RUST_VERSION__ || "unknown",
      },
      os: {
        osType: basicInfo.os || "unknown",
        osVersion: getOSVersion(),
        arch: basicInfo.arch || "unknown",
        hostname: getHostname(),
        platform: getPlatform(basicInfo.os),
      },
      techStack: {
        tauriVersion: __TAURI_VERSION__ || "2.x",
        rustVersion: __RUST_VERSION__ || "unknown",
      },
      repository: "https://github.com/corx-ai/cadhy",
      homepage: "https://cadhy.app",
      license: "MIT",
      authors: ["CORX AI", "CADHY Contributors"],
    }

    return systemInfo
  } catch (error) {
    console.error("Failed to get system info:", error)
    // Return fallback info
    return getFallbackSystemInfo()
  }
}

// ============================================================================
// SHELL OPERATIONS
// ============================================================================

/**
 * Open a URL in the default browser
 */
export async function openUrl(url: string): Promise<void> {
  try {
    await openShell(url)
  } catch (error) {
    console.error("Failed to open URL:", error)
    // Fallback to window.open
    window.open(url, "_blank")
  }
}

/**
 * Open a file path in the system file manager
 */
export async function openPath(path: string): Promise<void> {
  try {
    await openShell(path)
  } catch (error) {
    console.error("Failed to open path:", error)
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTargetTriple(info: BasicSystemInfo): string {
  const os = info.os?.toLowerCase() || "unknown"
  const arch = info.arch?.toLowerCase() || "unknown"

  const osMap: Record<string, string> = {
    windows: "pc-windows-msvc",
    macos: "apple-darwin",
    linux: "unknown-linux-gnu",
  }

  const archMap: Record<string, string> = {
    x86_64: "x86_64",
    aarch64: "aarch64",
    arm: "arm",
    x86: "i686",
  }

  const targetArch = archMap[arch] || arch
  const targetOs = osMap[os] || os

  return `${targetArch}-${targetOs}`
}

function getOSVersion(): string {
  // Try to get OS version from user agent as fallback
  const ua = navigator.userAgent

  if (ua.includes("Windows")) {
    const match = ua.match(/Windows NT (\d+\.\d+)/)
    if (match) {
      const versions: Record<string, string> = {
        "10.0": "10/11",
        "6.3": "8.1",
        "6.2": "8",
        "6.1": "7",
      }
      return versions[match[1]] || match[1]
    }
  } else if (ua.includes("Mac OS X")) {
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/)
    if (match) {
      return match[1].replace(/_/g, ".")
    }
  } else if (ua.includes("Linux")) {
    return "Linux"
  }

  return "Unknown"
}

function getHostname(): string {
  // Hostname is not available in browser context for security reasons
  return "localhost"
}

function getPlatform(os: string): string {
  const platformMap: Record<string, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
    ios: "iOS",
    android: "Android",
  }

  return platformMap[os?.toLowerCase()] || os || "Unknown"
}

function getFallbackSystemInfo(): SystemInfo {
  return {
    appName: "CADHY",
    appDescription: "Computer-Aided Design for HYdraulics (CADHY)",
    build: {
      version: "0.1.0",
      gitCommit: "unknown",
      gitBranch: "main",
      gitDirty: false,
      buildTimestamp: new Date().toISOString(),
      buildProfile: "debug",
      targetTriple: "unknown",
      rustVersion: "unknown",
    },
    os: {
      osType: "unknown",
      osVersion: "unknown",
      arch: "unknown",
      hostname: "localhost",
      platform: "Unknown",
    },
    techStack: {
      tauriVersion: "2.x",
      rustVersion: "unknown",
    },
    repository: "https://github.com/corx-ai/cadhy",
    homepage: "https://cadhy.app",
    license: "MIT",
    authors: ["CORX AI", "CADHY Contributors"],
  }
}

// ============================================================================
// GLOBAL TYPE DECLARATIONS
// ============================================================================

// These are injected at build time via vite/define
declare const __GIT_COMMIT__: string | undefined
declare const __GIT_BRANCH__: string | undefined
declare const __GIT_DIRTY__: boolean | undefined
declare const __BUILD_TIMESTAMP__: string | undefined
declare const __DEV__: boolean | undefined
declare const __RUST_VERSION__: string | undefined
declare const __TAURI_VERSION__: string | undefined
