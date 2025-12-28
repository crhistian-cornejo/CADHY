/**
 * Changelog Page
 *
 * Timeline-style display of all releases from GitHub.
 * Similar to Cursor's changelog with date sidebar and markdown content.
 */

import { ArrowLeft01Icon, Github01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { SEO } from "@/components/seo"
import { useTranslation } from "@/lib/i18n"
import { type Release, useReleases } from "@/lib/use-releases"

/**
 * Parse markdown body into structured sections.
 * Handles ### headers and bullet points.
 */
function parseMarkdownBody(body: string): { title: string; items: string[] }[] {
  if (!body || body.trim().length === 0) {
    return []
  }

  const sections: { title: string; items: string[] }[] = []
  let currentSection: { title: string; items: string[] } | null = null

  const lines = body.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()

    // Check for ### header
    if (trimmed.startsWith("### ")) {
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        title: trimmed.replace("### ", ""),
        items: [],
      }
    }
    // Check for bullet point
    else if ((trimmed.startsWith("- ") || trimmed.startsWith("* ")) && currentSection) {
      const item = trimmed
        .replace(/^[-*]\s*/, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold to plain
        .replace(/`([^`]+)`/g, "$1") // Code to plain
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links to text
        .trim()

      if (item.length > 0) {
        currentSection.items.push(item)
      }
    }
  }

  // Push last section
  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}

/**
 * Get section icon/color based on section title
 */
function getSectionStyle(title: string): { color: string; label: string } {
  const lower = title.toLowerCase()

  if (lower.includes("fix") || lower.includes("arregl") || lower.includes("correg")) {
    return { color: "text-red-400", label: title }
  }
  if (
    lower.includes("add") ||
    lower.includes("feat") ||
    lower.includes("new") ||
    lower.includes("agreg") ||
    lower.includes("nuev")
  ) {
    return { color: "text-green-400", label: title }
  }
  if (
    lower.includes("change") ||
    lower.includes("update") ||
    lower.includes("improv") ||
    lower.includes("cambio") ||
    lower.includes("mejor")
  ) {
    return { color: "text-blue-400", label: title }
  }
  if (lower.includes("break") || lower.includes("deprecat")) {
    return { color: "text-yellow-400", label: title }
  }
  if (lower.includes("security") || lower.includes("segur")) {
    return { color: "text-orange-400", label: title }
  }

  return { color: "text-muted-foreground", label: title }
}

function ReleaseEntry({
  release,
  index,
  totalReleases,
}: {
  release: Release
  index: number
  totalReleases: number
}) {
  const { t, language } = useTranslation()
  const sections = parseMarkdownBody(release.body)

  // Format date for display
  const date = new Date(release.publishedAt)
  const formattedDate = date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  // Reverse numbering: oldest release = REL.001, newest = highest number
  const releaseNumber = totalReleases - index

  return (
    <article
      id={`v${release.version}`}
      className="relative grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 pb-16 scroll-mt-24"
    >
      {/* Date sidebar */}
      <div className="md:text-right">
        <time
          dateTime={release.publishedAt}
          className="text-sm font-mono text-muted-foreground sticky top-24 tracking-wider"
        >
          {formattedDate}
        </time>
      </div>

      {/* Content */}
      <div className="relative">
        {/* Timeline line - simple dashed border */}
        <div className="absolute left-0 top-0 bottom-0 w-px -ml-[25px] hidden md:block border-l border-dashed border-border" />

        {/* Timeline dot - simple circle */}
        <div className="absolute -left-[29px] top-1 w-2 h-2 border border-border bg-background hidden md:block" />

        {/* Version header with CAD corner marks */}
        <header className="relative mb-6 p-4 border border-border/50 bg-card/30">
          {/* CAD corner marks */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-muted-foreground/30" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-muted-foreground/30" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-muted-foreground/30" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-muted-foreground/30" />

          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
              {t.changelog.badge}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-1">
            {release.version}
            {release.isLatest && (
              <span className="ml-3 text-[10px] font-mono tracking-wider px-2 py-1 border border-primary/30 bg-primary/5 text-primary">
                {t.common.latest.toUpperCase()}
              </span>
            )}
            {release.isPrerelease && (
              <span className="ml-3 text-[10px] font-mono tracking-wider px-2 py-1 border border-yellow-500/30 bg-yellow-500/5 text-yellow-500">
                PRE-RELEASE
              </span>
            )}
          </h2>

          {/* Figure label */}
          <span className="absolute -bottom-2 right-4 text-[8px] font-mono text-muted-foreground/40 bg-background px-1">
            REL.{String(releaseNumber).padStart(3, "0")}
          </span>
        </header>

        {/* Sections */}
        <div className="space-y-6">
          {sections.length > 0 ? (
            sections.map((section, idx) => {
              const style = getSectionStyle(section.title)
              return (
                <section key={`${release.version}-${idx}`}>
                  <h3
                    className={`text-sm font-mono font-semibold mb-3 ${style.color} tracking-wider uppercase`}
                  >
                    {section.title}
                  </h3>
                  <ul className="space-y-2 border-l border-border/30 pl-4">
                    {section.items.map((item, itemIdx) => (
                      <li
                        key={`${release.version}-${idx}-${itemIdx}`}
                        className="flex items-start gap-2 text-foreground/90"
                      >
                        <span className="text-muted-foreground mt-1.5 text-[10px] font-mono">
                          —
                        </span>
                        <span className="text-sm leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })
          ) : (
            <p className="text-muted-foreground text-sm font-mono">
              {language === "es"
                ? "Correcciones de errores y mejoras de rendimiento."
                : "Bug fixes and performance improvements."}
            </p>
          )}
        </div>

        {/* GitHub link */}
        <footer className="mt-6 pt-4 border-t border-dashed border-border/50">
          <a
            href={`https://github.com/crhistian-cornejo/CADHY/releases/tag/${release.tagName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={Github01Icon} size={14} />
            {t.changelog.viewOnGithub}
          </a>
        </footer>
      </div>
    </article>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-16">
      {[1, 2, 3].map((i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 animate-pulse">
          <div className="md:text-right">
            <div className="h-4 w-24 bg-muted rounded ml-auto" />
          </div>
          <div>
            <div className="h-8 w-32 bg-muted rounded mb-4" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ChangelogPage() {
  const { releases, loading, error } = useReleases()
  const { t } = useTranslation()
  const location = useLocation()

  // Scroll to version if hash is present
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.slice(1))
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
      }
    }
  }, [location.hash])

  return (
    <>
      <SEO title={t.changelog.pageTitle} description={t.changelog.pageDescription} />

      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-8 py-16">
          {/* Header */}
          <header className="mb-16">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              {t.changelog.backToHome}
            </Link>

            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4">
              {t.changelog.pageTitle}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">{t.changelog.pageDescription}</p>
          </header>

          {/* Timeline */}
          <div className="md:pl-6">
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">{t.changelog.unableToLoad}</p>
                <a
                  href="https://github.com/crhistian-cornejo/CADHY/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-muted rounded-lg text-sm hover:bg-muted/70 transition-colors"
                >
                  <HugeiconsIcon icon={Github01Icon} size={16} />
                  {t.changelog.viewOnGithub}
                </a>
              </div>
            ) : releases.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">{t.changelog.noReleases}</p>
              </div>
            ) : (
              <div className="space-y-0">
                {releases.map((release, index) => (
                  <ReleaseEntry
                    key={release.tagName}
                    release={release}
                    index={index}
                    totalReleases={releases.length}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer note */}
          {releases.length > 0 && (
            <footer className="mt-16 pt-8 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                {t.changelog.footerNote}{" "}
                <Link to="/roadmap" className="text-primary hover:underline">
                  {t.changelog.checkRoadmap}
                </Link>
              </p>
            </footer>
          )}
        </div>
      </div>
    </>
  )
}
