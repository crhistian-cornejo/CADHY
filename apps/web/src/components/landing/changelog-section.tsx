/**
 * Changelog Section Component - CAD Style
 *
 * "What's New" section with CAD-style separators and animations.
 * Features pattern dividers and smooth card transitions.
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

// CAD corner decorations for cards - technical style
function CardCorner({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const positionClasses = {
    tl: "top-0 left-0",
    tr: "top-0 right-0",
    bl: "bottom-0 left-0",
    br: "bottom-0 right-0",
  }

  const lineRotation = {
    tl: "",
    tr: "rotate-90",
    bl: "-rotate-90",
    br: "rotate-180",
  }

  return (
    <div className={`absolute ${positionClasses[position]} pointer-events-none`}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className={`text-muted-foreground/30 ${lineRotation[position]}`}
        aria-hidden="true"
      >
        {/* L-shaped corner */}
        <path d="M0 0 L0 12" stroke="currentColor" strokeWidth="1" />
        <path d="M0 0 L12 0" stroke="currentColor" strokeWidth="1" />
        {/* Tick marks */}
        <path d="M4 0 L4 2" stroke="currentColor" strokeWidth="0.5" />
        <path d="M0 4 L2 4" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    </div>
  )
}

function ChangelogCard({ entry, index }: { entry: ChangelogEntry; index: number }) {
  return (
    <Link
      to={`/changelog#v${entry.version}`}
      className="group relative flex-shrink-0 w-72 border border-border bg-card/80 backdrop-blur-sm p-5 hover:border-foreground/30 transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:shadow-lg"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* CAD Corner decorations */}
      <CardCorner position="tl" />
      <CardCorner position="br" />

      {/* Version and date header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex items-center justify-center px-2 py-0.5 border border-border text-xs font-mono text-muted-foreground group-hover:border-primary/50 group-hover:text-primary transition-colors">
          v{entry.version}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
          {entry.date}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-foreground leading-relaxed line-clamp-3">{entry.summary}</p>

      {/* Hover indicator line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </Link>
  )
}

function PlaceholderCard({ comingSoonText }: { comingSoonText: string }) {
  return (
    <div className="relative flex-shrink-0 w-72 border border-dashed border-border/50 bg-muted/10 backdrop-blur-sm p-5">
      <CardCorner position="tl" />
      <CardCorner position="br" />

      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex items-center justify-center px-2 py-0.5 border border-border/30 text-xs font-mono text-muted-foreground/40">
          v?.?.?
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
          {comingSoonText}
        </span>
      </div>
      <p className="text-sm text-muted-foreground/40 leading-relaxed">
        More features and improvements on the way.
      </p>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="relative flex-shrink-0 w-72 border border-border bg-card/80 backdrop-blur-sm p-5">
      <CardCorner position="tl" />
      <CardCorner position="br" />

      <div className="flex items-center gap-3 mb-3">
        <div className="h-5 w-16 bg-muted/50 animate-pulse" />
        <div className="h-4 w-20 bg-muted/30 animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted/50 animate-pulse" />
        <div className="h-4 w-3/4 bg-muted/30 animate-pulse" />
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
    <section className="relative bg-transparent py-16 px-8 lg:px-16" id="changelog">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-foreground mb-4">
            {t.changelog.title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stay updated with the latest features and improvements
          </p>
        </div>

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
              {entries.map((entry, index) => (
                <ChangelogCard key={entry.version} entry={entry} index={index} />
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
        <div className="mt-8 text-center">
          <Link
            to="/changelog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{t.changelog.allReleases}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
