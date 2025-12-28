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

/** Extended system info from Rust backend */
interface ExtendedSystemInfo {
  appName: string
  appDescription: string
  version: string
  osType: string
  osVersion: string
  arch: string
  hostname: string
  gitCommit: string
  gitBranch: string
  gitDirty: boolean
  buildTimestamp: string
  buildProfile: string
  targetTriple: string
  rustVersion: string
  tauriVersion: string
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
 * Uses the extended Rust command that has all build info
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  try {
    // Use the extended system info from Rust - has all build metadata
    const extInfo = await invoke<ExtendedSystemInfo>("get_extended_system_info")

    const systemInfo: SystemInfo = {
      appName: "CADHY",
      appDescription: extInfo.appDescription || "Computer-Aided Design for HYdraulics (CADHY)",
      build: {
        version: extInfo.version,
        gitCommit: extInfo.gitCommit,
        gitBranch: extInfo.gitBranch,
        gitDirty: extInfo.gitDirty,
        buildTimestamp: extInfo.buildTimestamp,
        buildProfile: extInfo.buildProfile as "debug" | "release",
        targetTriple: extInfo.targetTriple,
        rustVersion: extInfo.rustVersion,
      },
      os: {
        osType: extInfo.osType,
        osVersion: extInfo.osVersion,
        arch: extInfo.arch,
        hostname: extInfo.hostname,
        platform: capitalizeOS(extInfo.osType),
      },
      techStack: {
        tauriVersion: extInfo.tauriVersion,
        rustVersion: extInfo.rustVersion,
      },
      repository: "https://github.com/crhistian-cornejo/CADHY",
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

function capitalizeOS(os: string): string {
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
      buildProfile: "release",
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
    repository: "https://github.com/crhistian-cornejo/CADHY",
    homepage: "https://cadhy.app",
    license: "MIT",
    authors: ["CORX AI", "CADHY Contributors"],
  }
}
