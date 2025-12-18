/**
 * Download Page
 *
 * Platform-specific downloads with version history accordion.
 * Fetches release data from GitHub API.
 */

import { Download02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { LinuxIcon, MacIcon, WindowsIcon } from "@/components/icons/platform-icons"
import { SEO } from "@/components/seo"
import {
  formatSize,
  getAssetsByPlatform,
  type Platform,
  type Release,
  type ReleaseAsset,
  useReleases,
} from "@/lib/use-releases"

// Get base path from Vite
const basePath = import.meta.env.BASE_URL || "/"

const PlatformIcons: Record<Platform, React.FC<{ className?: string }>> = {
  macos: MacIcon,
  windows: WindowsIcon,
  linux: LinuxIcon,
  unknown: () => <HugeiconsIcon icon={Download02Icon} size={20} />,
}

const PlatformNames: Record<Platform, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  unknown: "Other",
}

function getArchLabel(asset: ReleaseAsset): string {
  if (asset.platform === "macos") {
    if (asset.architecture === "arm64") return "Apple Silicon"
    if (asset.architecture === "x64") return "Intel"
    if (asset.architecture === "universal") return "Universal"
  }
  if (asset.platform === "windows") {
    const arch = asset.architecture === "arm64" ? "ARM64" : "x64"
    const type = asset.fileType === "msi" ? "MSI Installer" : "EXE Installer"
    return `${type} (${arch})`
  }
  if (asset.platform === "linux") {
    const arch = asset.architecture === "arm64" ? "ARM64" : "x64"
    return `${asset.fileType.toUpperCase()} (${arch})`
  }
  return asset.architecture
}

function AssetRow({ asset }: { asset: ReleaseAsset }) {
  return (
    <a
      href={asset.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 transition-colors group"
    >
      <span className="text-sm text-foreground">{getArchLabel(asset)}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{formatSize(asset.size)}</span>
        <HugeiconsIcon
          icon={Download02Icon}
          size={16}
          className="text-muted-foreground group-hover:text-primary transition-colors"
        />
      </div>
    </a>
  )
}

function PlatformCard({ platform, assets }: { platform: Platform; assets: ReleaseAsset[] }) {
  const Icon = PlatformIcons[platform]
  const name = PlatformNames[platform]

  if (assets.length === 0) {
    return (
      <div className="border border-border bg-card/50 rounded-xl overflow-hidden opacity-50">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span className="font-medium text-foreground">{name}</span>
        </div>
        <div className="p-5 text-center text-sm text-muted-foreground">Coming soon</div>
      </div>
    )
  }

  return (
    <div className="border border-border bg-card rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span className="font-medium text-foreground">{name}</span>
      </div>
      <div className="divide-y divide-border">
        {assets.map((asset) => (
          <AssetRow key={asset.name} asset={asset} />
        ))}
      </div>
    </div>
  )
}

function ReleaseAccordion({
  release,
  isOpen,
  onToggle,
}: {
  release: Release
  isOpen: boolean
  onToggle: () => void
}) {
  const assetsByPlatform = getAssetsByPlatform(release.assets)

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-foreground tracking-tight">
            {release.version}
          </span>
          {release.isLatest && (
            <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 border border-border bg-muted text-muted-foreground rounded">
              Latest
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-border p-5 bg-muted/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <PlatformCard platform="macos" assets={assetsByPlatform.macos} />
            <PlatformCard platform="windows" assets={assetsByPlatform.windows} />
            <PlatformCard platform="linux" assets={assetsByPlatform.linux} />
          </div>

          <Link
            to={`https://github.com/crhistian-cornejo/CADHY/releases/tag/${release.tagName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View release notes →
          </Link>
        </div>
      )}
    </div>
  )
}

export default function DownloadPage() {
  const { releases, latestRelease, recommendedDownload, userPlatform, loading, error } =
    useReleases()
  const [openRelease, setOpenRelease] = useState<string | null>(null)

  // Fallback data if API fails
  const fallbackVersion = "0.1.0"
  const displayVersion = latestRelease?.version || fallbackVersion

  // Get user's platform name
  const platformName = PlatformNames[userPlatform] || "your platform"

  // Latest release assets by platform
  const latestAssets = latestRelease ? getAssetsByPlatform(latestRelease.assets) : null

  return (
    <>
      <SEO
        title="Download"
        description="Download CADHY for Windows, macOS, and Linux. Free hydraulic engineering CAD software."
      />

      <div className="py-16 px-8 lg:px-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-start gap-6 mb-12">
            <img
              src={`${basePath}favicon.png`}
              alt="CADHY"
              className="w-20 h-20 rounded-2xl border border-border"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                Download CADHY
              </h1>
              <p className="text-muted-foreground">Available for macOS, Windows, and Linux.</p>

              {/* Smart download button */}
              {loading ? (
                <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 border border-border bg-muted rounded-lg text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : recommendedDownload ? (
                <a
                  href={recommendedDownload.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 border border-border bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  Download for {platformName}
                  <HugeiconsIcon icon={Download02Icon} size={16} />
                </a>
              ) : (
                <a
                  href="https://github.com/crhistian-cornejo/CADHY/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 border border-border bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  View Downloads
                  <HugeiconsIcon icon={Download02Icon} size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Latest Version */}
          {latestRelease && latestAssets && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl font-bold text-foreground tracking-tight">
                  {displayVersion}
                </span>
                <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 border border-border bg-muted text-muted-foreground rounded">
                  Latest
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <PlatformCard platform="macos" assets={latestAssets.macos} />
                <PlatformCard platform="windows" assets={latestAssets.windows} />
                <PlatformCard platform="linux" assets={latestAssets.linux} />
              </div>

              <Link
                to={`https://github.com/crhistian-cornejo/CADHY/releases/tag/${latestRelease.tagName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View release notes →
              </Link>
            </div>
          )}

          {/* Error state */}
          {error && !latestRelease && (
            <div className="mb-8 p-6 border border-border bg-card rounded-xl">
              <p className="text-muted-foreground mb-4">
                Unable to fetch releases from GitHub. Please visit the releases page directly:
              </p>
              <a
                href="https://github.com/crhistian-cornejo/CADHY/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-muted rounded-lg text-sm hover:bg-muted/70 transition-colors"
              >
                View on GitHub
                <HugeiconsIcon icon={Download02Icon} size={16} />
              </a>
            </div>
          )}

          {/* Previous versions */}
          {releases.length > 1 && (
            <div className="space-y-3">
              {releases.slice(1).map((release) => (
                <ReleaseAccordion
                  key={release.tagName}
                  release={release}
                  isOpen={openRelease === release.tagName}
                  onToggle={() =>
                    setOpenRelease(openRelease === release.tagName ? null : release.tagName)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
