/**
 * Hero Section Component
 *
 * Clean, minimal hero with centered layout.
 * Text on top, app screenshot below.
 */

import { ArrowRight01Icon, Download02Icon, PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "react-router-dom"
import { RELEASES_URL } from "@/lib/constants"
import { AnimatedGridBackground } from "./animated-grid-background"

// Get base path from Vite (handles GitHub Pages deployment)
const basePath = import.meta.env.BASE_URL || "/"

export function HeroSection() {
  const scrollToDownloads = () => {
    const element = document.getElementById("downloads")
    if (element) {
      const navbarHeight = 64
      const elementPosition = element.getBoundingClientRect().top + window.scrollY
      window.scrollTo({
        top: elementPosition - navbarHeight - 16,
        behavior: "smooth",
      })
    }
  }

  return (
    <section className="relative border-b border-border bg-background py-20 px-8 lg:px-16 overflow-hidden">
      {/* Animated Grid Background */}
      <AnimatedGridBackground />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Content - Centered */}
        <div className="flex flex-col items-center text-center gap-6 mb-12">
          {/* Badge */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 border border-border bg-card text-xs font-bold text-muted-foreground rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              v0.1.0 AVAILABLE
            </span>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Changelog
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            </a>
          </div>

          {/* Headline */}
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-foreground leading-[1.1]">
              Hydraulic Engineering, <span className="text-muted-foreground">Reimagined</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Professional CAD software for open channel flow, pipe networks, and GVF analysis.
              Built with OpenCASCADE geometry kernel and AI assistance.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={scrollToDownloads}
              className="inline-flex items-center gap-3 px-6 py-3 bg-foreground text-background font-bold text-sm hover:bg-foreground/90 transition-colors rounded-lg"
            >
              <HugeiconsIcon icon={Download02Icon} size={18} />
              Download Free
            </button>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 border border-border bg-card hover:border-foreground/50 text-foreground font-medium text-sm transition-colors rounded-lg"
            >
              <HugeiconsIcon icon={PlayIcon} size={16} className="text-primary" />
              Documentation
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* App Screenshot - Centered and Large */}
        <div className="relative max-w-6xl mx-auto">
          {/* Screenshot Container */}
          <div className="relative border border-border bg-card rounded-xl overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/30">
            {/* Window Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">
                CADHY — Hydraulic Analysis
              </span>
            </div>

            {/* Screenshot Image - Light Theme */}
            <img
              src={`${basePath}hero/light.png`}
              alt="CADHY Application"
              className="w-full h-auto block dark:hidden"
            />
            {/* Screenshot Image - Dark Theme */}
            <img
              src={`${basePath}hero/dark.png`}
              alt="CADHY Application"
              className="w-full h-auto hidden dark:block"
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-16 pt-16 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "4", label: "Channel Types" },
              { value: "48K+", label: "Lines of Rust" },
              { value: "3", label: "Platforms" },
              { value: "v0.1.0", label: "Latest Release" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-foreground tracking-tighter mb-1">
                  {stat.value}
                </div>
                <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
