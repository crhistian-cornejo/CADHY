/**
 * Download Section Component
 *
 * Platform-specific download options with build from source.
 * Adapted from GraphCAD with CADHY branding.
 */

import { Download02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "react-router-dom"
import { LinuxIcon, MacIcon, WindowsIcon } from "@/components/icons/platform-icons"
import { DOWNLOADS } from "@/lib/constants"

const PlatformIcons: Record<string, React.FC<{ className?: string }>> = {
  Windows: WindowsIcon,
  macOS: MacIcon,
  Linux: LinuxIcon,
}

export function DownloadSection() {
  return (
    <div
      className="relative border-t border-border bg-background py-24 px-8 lg:px-16"
      id="downloads"
    >
      {/* Background subtle pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-block border border-border bg-card px-3 py-1 text-xs font-bold mb-4 rounded-full text-muted-foreground">
            RELEASE 0.1.0
          </div>
          <h2 className="text-4xl lg:text-6xl font-bold text-foreground tracking-tighter mb-4">
            Download CADHY
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Get the desktop application for your platform. Includes the full hydraulics engine, AI
            assistant, and visualization tools.
          </p>
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {DOWNLOADS.map((opt) => {
            const PlatformIcon = PlatformIcons[opt.platform]
            return (
              <div
                key={opt.platform}
                className="group relative border border-border bg-card/95 dark:bg-card backdrop-blur-sm p-8 hover:border-foreground/50 transition-all duration-300 flex flex-col justify-between min-h-[340px] rounded-xl hover:shadow-lg hover:shadow-primary/5"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      {PlatformIcon && <PlatformIcon className="w-10 h-10" />}
                      <h3 className="text-2xl font-bold text-foreground tracking-tight">
                        {opt.platform}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground border border-border px-2 py-0.5 rounded">
                      {opt.architecture}
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs text-muted-foreground">
                    <div className="flex justify-between border-b border-border pb-2">
                      <span>VERSION</span>
                      <span className="text-foreground">{opt.version}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span>SIZE</span>
                      <span className="text-foreground">{opt.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FILE</span>
                      <span className="text-foreground/80 truncate max-w-[150px]">
                        {opt.filename}
                      </span>
                    </div>
                  </div>
                </div>

                <a
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 w-full border border-border bg-primary/10 hover:bg-primary/20 text-foreground py-4 px-6 flex items-center justify-between rounded-lg group-hover:border-primary/50 transition-all duration-300 hover:shadow-md"
                >
                  <span className="text-xs font-bold tracking-widest">DOWNLOAD</span>
                  <HugeiconsIcon icon={Download02Icon} size={16} />
                </a>
              </div>
            )
          })}
        </div>

        {/* All Releases */}
        <div className="border border-border bg-card p-8 lg:p-12 relative overflow-hidden rounded-xl">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <HugeiconsIcon
              icon={Download02Icon}
              size={96}
              strokeWidth={1}
              className="text-foreground"
            />
          </div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">All Releases</h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                View all available versions including previous releases, pre-releases, and
                platform-specific builds.
              </p>
              <Link
                to="/docs/getting-started/installation"
                className="text-xs underline underline-offset-4 decoration-muted-foreground hover:text-foreground hover:decoration-foreground transition-colors text-muted-foreground"
              >
                VIEW INSTALLATION DOCS &rarr;
              </Link>
            </div>

            <div className="space-y-4">
              <a
                href="https://github.com/crhistian-cornejo/CADHY/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-muted/50 border border-border p-4 flex items-center justify-between group hover:border-foreground/50 transition-colors text-left rounded-lg"
              >
                <div>
                  <div className="text-sm font-medium text-foreground mb-1">GitHub Releases</div>
                  <div className="text-xs text-muted-foreground">
                    All versions, changelogs, and assets
                  </div>
                </div>
                <HugeiconsIcon
                  icon={Download02Icon}
                  size={20}
                  className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 ml-2"
                />
              </a>
              <div className="w-full bg-muted/30 border border-border p-4 rounded-lg">
                <div className="text-xs text-muted-foreground mb-2">AUTOMATIC UPDATES</div>
                <div className="text-sm text-foreground">
                  CADHY checks for updates automatically. You'll be notified when a new version is
                  available.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
