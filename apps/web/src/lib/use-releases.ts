/**
 * GitHub Releases Hook
 *
 * Fetches release data from GitHub API to provide dynamic download links.
 * Automatically detects user platform for smart download button.
 */

import { useEffect, useState } from "react"

const GITHUB_OWNER = "crhistian-cornejo"
const GITHUB_REPO = "CADHY"
const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`

export type Platform = "windows" | "macos" | "linux" | "unknown"
export type Architecture = "x64" | "arm64" | "universal"

export interface ReleaseAsset {
  name: string
  url: string
  size: number
  downloadCount: number
  platform: Platform
  architecture: Architecture
  fileType: string
}

export interface Release {
  version: string
  tagName: string
  publishedAt: string
  body: string
  isLatest: boolean
  isDraft: boolean
  isPrerelease: boolean
  assets: ReleaseAsset[]
}

interface GitHubAsset {
  name: string
  browser_download_url: string
  size: number
  download_count: number
}

interface GitHubRelease {
  tag_name: string
  published_at: string
  body: string
  draft: boolean
  prerelease: boolean
  assets: GitHubAsset[]
}

/**
 * Parse asset filename to determine platform and architecture
 */
function parseAsset(asset: GitHubAsset): ReleaseAsset | null {
  const name = asset.name.toLowerCase()

  // Skip non-downloadable files and auto-updater artifacts
  if (
    name === "latest.json" ||
    name === "coderesources" ||
    name === "info.plist" ||
    name.endsWith(".sig") ||
    name.endsWith(".icns") ||
    name.endsWith(".app.tar.gz") // Auto-updater artifact, not for direct download
  ) {
    return null
  }

  let platform: Platform = "unknown"
  let architecture: Architecture = "x64"
  let fileType = ""

  // Windows
  if (name.endsWith(".exe") || name.endsWith(".msi")) {
    platform = "windows"
    fileType = name.endsWith(".exe") ? "exe" : "msi"
    if (name.includes("arm64")) architecture = "arm64"
    else architecture = "x64"
  }
  // macOS - only DMG for user downloads
  else if (name.endsWith(".dmg")) {
    platform = "macos"
    fileType = "dmg"
    if (name.includes("aarch64") || name.includes("arm64")) architecture = "arm64"
    else if (name.includes("universal")) architecture = "universal"
    else if (name.includes("x64") || name.includes("x86_64")) architecture = "x64"
    else architecture = "arm64" // Default to arm64 for modern Macs
  }
  // Linux
  else if (
    name.endsWith(".deb") ||
    name.endsWith(".rpm") ||
    name.endsWith(".appimage") ||
    name.endsWith(".tar.gz")
  ) {
    platform = "linux"
    if (name.endsWith(".deb")) fileType = "deb"
    else if (name.endsWith(".rpm")) fileType = "rpm"
    else if (name.endsWith(".appimage")) fileType = "AppImage"
    else fileType = "tar.gz"

    if (name.includes("aarch64") || name.includes("arm64")) architecture = "arm64"
    else architecture = "x64"
  }
  // Raw binary (like "CADHY" without extension)
  else if (name === "cadhy" || asset.name === "CADHY") {
    // This is likely the macOS binary inside the .app
    return null
  }

  if (platform === "unknown") return null

  return {
    name: asset.name,
    url: asset.browser_download_url,
    size: asset.size,
    downloadCount: asset.download_count,
    platform,
    architecture,
    fileType,
  }
}

/**
 * Detect user's platform from browser
 */
export function detectPlatform(): { platform: Platform; architecture: Architecture } {
  if (typeof navigator === "undefined") {
    return { platform: "unknown", architecture: "x64" }
  }

  const userAgent = navigator.userAgent.toLowerCase()
  const platform = (navigator.platform || "").toLowerCase()

  let detectedPlatform: Platform = "unknown"
  let detectedArch: Architecture = "x64"

  // Detect OS
  if (platform.includes("win") || userAgent.includes("windows")) {
    detectedPlatform = "windows"
  } else if (platform.includes("mac") || userAgent.includes("macintosh")) {
    detectedPlatform = "macos"
  } else if (platform.includes("linux") || userAgent.includes("linux")) {
    detectedPlatform = "linux"
  }

  // Detect architecture (for macOS ARM)
  if (detectedPlatform === "macos") {
    // Check for Apple Silicon
    // Modern approach: check for ARM in platform
    if (
      userAgent.includes("arm") ||
      platform.includes("arm") ||
      // Fallback: check screen resolution typical of M1+ Macs
      (typeof window !== "undefined" && window.devicePixelRatio >= 2)
    ) {
      detectedArch = "arm64"
    }
  }

  return { platform: detectedPlatform, architecture: detectedArch }
}

/**
 * Format bytes to human readable size
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

/**
 * Format date to readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * Hook to fetch releases from GitHub
 */
export function useReleases() {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReleases() {
      try {
        const response = await fetch(RELEASES_API, {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        })

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`)
        }

        const data: GitHubRelease[] = await response.json()

        const parsed: Release[] = data
          .filter((r) => !r.draft) // Exclude drafts from public API
          .map((release, index) => ({
            version: release.tag_name.replace(/^v/, ""),
            tagName: release.tag_name,
            publishedAt: release.published_at,
            body: release.body || "",
            isLatest: index === 0,
            isDraft: release.draft,
            isPrerelease: release.prerelease,
            assets: release.assets.map(parseAsset).filter((a): a is ReleaseAsset => a !== null),
          }))

        setReleases(parsed)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch releases")
        // Fallback to static data
        setReleases([])
      } finally {
        setLoading(false)
      }
    }

    fetchReleases()
  }, [])

  const latestRelease = releases[0] || null

  // Get best download for user's platform
  const { platform: userPlatform } = detectPlatform()

  const recommendedDownload = latestRelease?.assets.find((a) => a.platform === userPlatform) || null

  return {
    releases,
    latestRelease,
    recommendedDownload,
    userPlatform,
    loading,
    error,
  }
}

/**
 * Get assets grouped by platform for a release
 */
export function getAssetsByPlatform(assets: ReleaseAsset[]) {
  const grouped: Record<Platform, ReleaseAsset[]> = {
    macos: [],
    windows: [],
    linux: [],
    unknown: [],
  }

  for (const asset of assets) {
    grouped[asset.platform].push(asset)
  }

  return grouped
}

/**
 * Platform display names and icons
 */
export const PLATFORM_INFO: Record<
  Platform,
  { name: string; icon: string; architectures: string[] }
> = {
  macos: {
    name: "macOS",
    icon: "apple",
    architectures: ["Apple Silicon (ARM64)", "Intel (x64)", "Universal"],
  },
  windows: {
    name: "Windows",
    icon: "windows",
    architectures: ["64-bit (x64)", "ARM64"],
  },
  linux: {
    name: "Linux",
    icon: "linux",
    architectures: [".deb (Debian/Ubuntu)", ".rpm (Fedora/RHEL)", "AppImage"],
  },
  unknown: {
    name: "Other",
    icon: "download",
    architectures: [],
  },
}
