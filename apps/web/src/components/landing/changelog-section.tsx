/**
 * Changelog Section Component
 *
 * Horizontal cards showing recent releases with version badges.
 * Dynamically fetches releases from GitHub API.
 * Clean, minimal design like Cursor's changelog.
 */

import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "react-router-dom"
import { useTranslation } from "@/lib/i18n"
import { formatDate, useReleases } from "@/lib/use-releases"

interface ChangelogEntry {
  version: string
  date: string
  summary: string
}

/**
 * Extract a clean summary from GitHub release markdown body.
 * Parses the first meaningful content after headers.
 */
function extractSummary(body: string): string {
  if (!body || body.trim().length === 0) {
    return "Bug fixes and improvements."
  }

  // Split by lines and find meaningful content
  const lines = body.split("\n").map((line) => line.trim())
  const summaryParts: string[] = []

  for (const line of lines) {
    // Skip empty lines and headers
    if (!line || line.startsWith("#")) continue

    // Clean markdown syntax: list markers, bold, links, code
    const cleaned = line
      .replace(/^[-*]\s*/, "") // Remove list markers
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold to plain
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links to text
      .replace(/`([^`]+)`/g, "$1") // Inline code to plain
      .trim()

    if (cleaned.length > 0) {
      summaryParts.push(cleaned)
      // Get up to 2 items for a concise summary
      if (summaryParts.length >= 2) break
    }
  }

  if (summaryParts.length === 0) {
    return "Bug fixes and improvements."
  }

  // Join with period separation, max 150 chars
  const summary = summaryParts.join(". ")
  return summary.length > 150 ? `${summary.slice(0, 147)}...` : summary
}

function ChangelogCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <div className="flex-shrink-0 w-72 border border-border bg-card rounded-xl p-5 hover:border-foreground/30 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex items-center justify-center px-2 py-0.5 border border-border rounded text-xs font-mono text-muted-foreground">
          {entry.version}
        </span>
        <span className="text-xs text-muted-foreground">{entry.date}</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed line-clamp-3">{entry.summary}</p>
    </div>
  )
}

function PlaceholderCard({ comingSoonText }: { comingSoonText: string }) {
  return (
    <div className="flex-shrink-0 w-72 border border-dashed border-border/50 bg-muted/20 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex items-center justify-center px-2 py-0.5 border border-border/50 rounded text-xs font-mono text-muted-foreground/50">
          ?.?.?
        </span>
        <span className="text-xs text-muted-foreground/50">{comingSoonText}</span>
      </div>
      <p className="text-sm text-muted-foreground/50 leading-relaxed">
        More features and improvements on the way.
      </p>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="flex-shrink-0 w-72 border border-border bg-card rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-5 w-12 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
    </div>
  )
}

export function ChangelogSection() {
  const { t } = useTranslation()
  const { releases, loading } = useReleases()

  // Convert releases to changelog entries
  const entries: ChangelogEntry[] = releases.slice(0, 4).map((release) => ({
    version: release.version,
    date: formatDate(release.publishedAt),
    summary: extractSummary(release.body),
  }))

  const placeholderCount = Math.max(0, 4 - entries.length)

  return (
    <section
      className="relative bg-background border-t border-border py-20 px-8 lg:px-16"
      id="changelog"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tighter text-foreground mb-8">
          {t.changelog.title}
        </h2>

        {/* Horizontal scroll cards */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-8 px-8 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {loading ? (
            // Loading skeleton
            <>
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </>
          ) : (
            <>
              {entries.map((entry) => (
                <ChangelogCard key={entry.version} entry={entry} />
              ))}

              {/* Placeholder cards for visual balance */}
              {placeholderCount > 0 &&
                Array.from({ length: placeholderCount }).map((_, i) => (
                  <PlaceholderCard
                    key={`placeholder-${entries.length + i}`}
                    comingSoonText={t.common.comingSoon}
                  />
                ))}
            </>
          )}
        </div>

        {/* Link to full changelog */}
        <Link
          to="/download"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-6"
        >
          {t.changelog.allReleases}
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
        </Link>
      </div>
    </section>
  )
}
