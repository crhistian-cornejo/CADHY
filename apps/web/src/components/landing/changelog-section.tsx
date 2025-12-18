/**
 * Changelog Section Component
 *
 * Release history with categorized changes.
 */

import {
  ArrowUpRight01Icon,
  ArtificialIntelligence04Icon,
  CodeIcon,
  DropletIcon,
  GridIcon,
  TextIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

interface ChangelogEntry {
  version: string
  date: string
  title: string
  highlights: {
    category: string
    items: string[]
  }[]
  isLatest?: boolean
}

const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "2025-12-15",
    title: "Initial Public Release",
    isLatest: true,
    highlights: [
      {
        category: "Hydraulics",
        items: [
          "Manning equation calculations",
          "Normal and critical depth solvers",
          "GVF profile analysis (M1, M2, S1, S2)",
          "4 channel section types",
        ],
      },
      {
        category: "AI System",
        items: [
          "Multi-provider support (Claude, GPT, Gemini)",
          "Streaming responses with tool calling",
          "Hydraulic problem understanding",
          "Natural language input",
        ],
      },
      {
        category: "Desktop App",
        items: [
          "Tauri 2.0 + React 19 frontend",
          "3D channel visualization",
          "Project save/load system",
          "Cross-platform (Win/Mac/Linux)",
        ],
      },
      {
        category: "Core",
        items: [
          "Rust 2024 Edition backend",
          "64-bit floating point precision",
          "Workspace monorepo structure",
          "Comprehensive test suite",
        ],
      },
    ],
  },
]

const CategoryIcons: Record<string, IconSvgElement> = {
  Hydraulics: DropletIcon,
  "AI System": ArtificialIntelligence04Icon,
  "Desktop App": GridIcon,
  Core: CodeIcon,
}

function CategoryIcon({ category }: { category: string }) {
  const Icon = CategoryIcons[category] || TextIcon
  return <HugeiconsIcon icon={Icon} size={16} className="text-muted-foreground" />
}

export function ChangelogSection() {
  return (
    <section
      className="relative bg-background border-t border-border py-24 px-8 lg:px-16"
      id="changelog"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1 mb-6 rounded-full">
            <HugeiconsIcon icon={TextIcon} size={12} className="text-muted-foreground" />
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground">
              RELEASE HISTORY
            </span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-4xl lg:text-6xl font-bold tracking-tighter text-foreground mb-4">
                Changelog
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Track all updates, improvements, and new features in CADHY.
              </p>
            </div>
            <a
              href="https://github.com/crhistian-cornejo/cadhy-releases/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>ALL RELEASES</span>
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} />
            </a>
          </div>
        </div>

        {/* Changelog Entries */}
        <div className="space-y-12">
          {CHANGELOG_ENTRIES.map((entry) => (
            <div
              key={entry.version}
              className="border border-border bg-card overflow-hidden rounded-xl"
            >
              {/* Version Header */}
              <div className="border-b border-border p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-3xl lg:text-4xl font-bold text-foreground tracking-tighter">
                    v{entry.version}
                  </span>
                  {entry.isLatest && (
                    <span className="text-[10px] font-bold tracking-widest px-2 py-1 border border-green-600/50 text-green-600 dark:border-green-500/50 dark:text-green-400 bg-green-500/10 rounded">
                      LATEST
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-mono">{entry.date}</span>
                  <span className="text-border">|</span>
                  <span>{entry.title}</span>
                </div>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
                {entry.highlights.map((highlight) => (
                  <div key={highlight.category} className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CategoryIcon category={highlight.category} />
                      <h4 className="text-xs font-bold tracking-widest text-muted-foreground">
                        {highlight.category.toUpperCase()}
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {highlight.items.map((item) => (
                        <li
                          key={item}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-green-600 dark:text-green-400 mt-0.5">+</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "RUST LOC", value: "~48K" },
            { label: "FRONTEND LOC", value: "~20K" },
            { label: "CHANNEL TYPES", value: "4" },
            { label: "TAURI COMMANDS", value: "25+" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border border-border bg-card p-6 text-center rounded-xl"
            >
              <div className="text-2xl lg:text-3xl font-bold text-foreground tracking-tighter mb-1">
                {stat.value}
              </div>
              <div className="text-[10px] font-bold tracking-widest text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
