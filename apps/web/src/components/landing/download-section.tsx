/**
 * Download CTA Section
 *
 * Simple, centered CTA at the bottom of the landing page.
 * Smart download button + docs link.
 */

import { ArrowRight01Icon, Download02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "react-router-dom"
import { useTranslation } from "@/lib/i18n"
import { useReleases } from "@/lib/use-releases"

const PlatformNames: Record<string, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  unknown: "Desktop",
}

export function DownloadSection() {
  const { recommendedDownload, userPlatform, loading } = useReleases()
  const { t } = useTranslation()
  const platformName = PlatformNames[userPlatform] || "Desktop"

  return (
    <section
      className="relative bg-muted/50 dark:bg-zinc-900 border-t border-border py-32 px-8 lg:px-16"
      id="downloads"
    >
      <div className="max-w-4xl mx-auto text-center">
        {/* Big headline */}
        <h2 className="text-5xl lg:text-7xl font-bold tracking-tighter text-foreground mb-10">
          {t.downloadCta.title}
        </h2>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {loading ? (
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-foreground/10 text-foreground font-bold rounded-full">
              <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
              {t.common.loading}
            </div>
          ) : recommendedDownload ? (
            <a
              href={recommendedDownload.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background font-bold text-base hover:bg-foreground/90 transition-colors rounded-full"
            >
              {t.downloadCta.downloadFor} {platformName}
              <HugeiconsIcon icon={Download02Icon} size={20} />
            </a>
          ) : (
            <Link
              to="/download"
              className="inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background font-bold text-base hover:bg-foreground/90 transition-colors rounded-full"
            >
              {t.downloadCta.downloadFree}
              <HugeiconsIcon icon={Download02Icon} size={20} />
            </Link>
          )}

          <Link
            to="/docs"
            className="inline-flex items-center gap-2 px-8 py-4 border border-border bg-card hover:border-foreground/50 text-foreground font-medium text-base transition-colors rounded-full"
          >
            {t.downloadCta.readDocs}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-muted-foreground" />
          </Link>
        </div>

        {/* Platform links */}
        <div className="mt-8 text-sm text-muted-foreground">
          {t.downloadCta.availableFor}{" "}
          <Link to="/download" className="text-foreground hover:underline">
            macOS
          </Link>
          ,{" "}
          <Link to="/download" className="text-foreground hover:underline">
            Windows
          </Link>{" "}
          {t.downloadCta.and}{" "}
          <span className="text-muted-foreground/70">{t.downloadCta.linuxSoon}</span>
        </div>
      </div>
    </section>
  )
}
