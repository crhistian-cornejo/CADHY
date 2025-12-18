/**
 * Changelog Section Component
 *
 * Horizontal cards showing recent releases with version badges.
 * Clean, minimal design like Cursor's changelog.
 */

import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "react-router-dom"

interface ChangelogEntry {
  version: string
  date: string
  summary: string
}

// Static changelog - this could be fetched from GitHub releases in the future
const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "Dec 15, 2025",
    summary:
      "Initial release with Manning calculations, GVF analysis, 3D visualization, and AI assistant.",
  },
  // Future releases will be added here
  // {
  //   version: "0.2.0",
  //   date: "Jan 2026",
  //   summary: "Pipe networks, circular channels, and export improvements.",
  // },
]

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

export function ChangelogSection() {
  return (
    <section
      className="relative bg-background border-t border-border py-20 px-8 lg:px-16"
      id="changelog"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tighter text-foreground mb-8">
          Changelog
        </h2>

        {/* Horizontal scroll cards */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-8 px-8 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {CHANGELOG_ENTRIES.map((entry) => (
            <ChangelogCard key={entry.version} entry={entry} />
          ))}

          {/* Placeholder cards for visual balance */}
          {CHANGELOG_ENTRIES.length < 4 &&
            Array.from({ length: 4 - CHANGELOG_ENTRIES.length }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="flex-shrink-0 w-72 border border-dashed border-border/50 bg-muted/20 rounded-xl p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 border border-border/50 rounded text-xs font-mono text-muted-foreground/50">
                    ?.?.?
                  </span>
                  <span className="text-xs text-muted-foreground/50">Coming soon</span>
                </div>
                <p className="text-sm text-muted-foreground/50 leading-relaxed">
                  More features and improvements on the way.
                </p>
              </div>
            ))}
        </div>

        {/* Link to full changelog */}
        <Link
          to="/download"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-6"
        >
          See what's new in CADHY
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
        </Link>
      </div>
    </section>
  )
}
