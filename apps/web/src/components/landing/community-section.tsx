/**
 * Community Section Component
 *
 * Node graph-style community links visualization.
 */

import {
  Book02Icon,
  Download02Icon,
  Github01Icon,
  Message01Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

// Node component for consistent styling
function GraphNode({
  children,
  href,
  external = false,
  variant = "default",
}: {
  children: React.ReactNode
  href: string
  external?: boolean
  variant?: "default" | "primary"
}) {
  const baseStyles =
    "flex items-center gap-3 px-5 py-3 transition-all group relative rounded-lg shadow-md"
  const variantStyles =
    variant === "primary"
      ? "bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
      : "bg-card border border-border hover:border-foreground/50"

  const content = <div className={`${baseStyles} ${variantStyles}`}>{children}</div>

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }

  return <Link to={href}>{content}</Link>
}

// Connection port (handle)
function Port({ position }: { position: "left" | "right" | "top" | "bottom" }) {
  const positionStyles = {
    left: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
    right: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
    top: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
    bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  }

  return (
    <div
      className={`absolute w-3 h-3 bg-foreground rounded-full border-2 border-background z-10 ${positionStyles[position]}`}
    />
  )
}

export function CommunitySection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [paths, setPaths] = useState<string[]>([])

  // Node positions (percentages)
  const nodePositions = {
    github: { x: 12, y: 50 },
    discussions: { x: 35, y: 25 },
    docs: { x: 35, y: 75 },
    download: { x: 88, y: 50 },
  }

  useEffect(() => {
    const updatePaths = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      // Calculate pixel positions
      const github = { x: w * 0.12 + 80, y: h * 0.5 }
      const discussions = { x: w * 0.35, y: h * 0.25 + 20 }
      const discussionsLeft = { x: w * 0.35 - 70, y: h * 0.25 }
      const docs = { x: w * 0.35, y: h * 0.75 - 20 }
      const docsRight = { x: w * 0.35 + 50, y: h * 0.75 }
      const download = { x: w * 0.88 - 80, y: h * 0.5 }

      // Generate bezier paths
      const newPaths = [
        // GitHub -> Discussions
        `M ${github.x} ${github.y} C ${github.x + 60} ${github.y}, ${discussionsLeft.x - 30} ${discussionsLeft.y}, ${discussionsLeft.x} ${discussionsLeft.y}`,
        // Discussions -> Download
        `M ${discussions.x + 70} ${discussions.y - 20} C ${discussions.x + 150} ${discussions.y - 20}, ${download.x - 60} ${download.y}, ${download.x} ${download.y}`,
        // GitHub -> Docs
        `M ${github.x} ${github.y} C ${github.x + 40} ${github.y + 60}, ${docs.x - 70} ${docs.y}, ${docs.x - 50} ${docs.y}`,
        // Docs -> Download
        `M ${docsRight.x} ${docsRight.y} C ${docsRight.x + 100} ${docsRight.y}, ${download.x - 60} ${download.y + 40}, ${download.x} ${download.y}`,
        // Discussions -> Docs (vertical)
        `M ${discussions.x} ${discussions.y + 20} L ${docs.x} ${docs.y - 20}`,
      ]

      setPaths(newPaths)
    }

    updatePaths()
    window.addEventListener("resize", updatePaths)
    return () => window.removeEventListener("resize", updatePaths)
  }, [])

  return (
    <section className="relative bg-background border-t border-border overflow-hidden py-24">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.08] pointer-events-none" />

      {/* Header */}
      <div className="relative z-20 px-8 lg:px-16 mb-16 text-center">
        <div className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1 mb-6 rounded-full">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Engineering Community
          </span>
        </div>
        <h2 className="text-5xl lg:text-7xl font-bold tracking-tighter text-foreground mb-6">
          Get Involved
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm lg:text-base">
          Join a community of civil engineers and hydraulic specialists. Share knowledge, report
          issues, request features, and shape the future of hydraulic analysis software.
        </p>
      </div>

      {/* Node Graph Visual */}
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl mx-auto h-[350px] lg:h-[320px] px-4"
      >
        {/* Animated Edge SVG Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <pattern id="flowPattern" width="20" height="1" patternUnits="userSpaceOnUse">
              <rect width="10" height="1" className="fill-primary">
                <animate attributeName="x" from="-20" to="0" dur="1s" repeatCount="indefinite" />
              </rect>
            </pattern>
          </defs>

          {paths.map((d, i) => (
            <g key={i}>
              <path d={d} fill="none" className="stroke-border" strokeWidth="2" />
              {i === 0 || i === 1 || i === 3 ? (
                <path
                  d={d}
                  fill="none"
                  className="stroke-primary/50"
                  strokeWidth="2"
                  strokeDasharray="8 12"
                  strokeDashoffset="0"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="0;-20"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </path>
              ) : null}
            </g>
          ))}
        </svg>

        {/* Node: GitHub (Left) */}
        <div
          className="absolute z-10"
          style={{
            left: `${nodePositions.github.x}%`,
            top: `${nodePositions.github.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <GraphNode href="https://github.com/crhistian-cornejo/CADHY" external>
            <HugeiconsIcon
              icon={Github01Icon}
              size={20}
              className="text-muted-foreground group-hover:text-foreground transition-colors"
            />
            <span className="text-xs font-bold tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
              GITHUB
            </span>
            <Port position="right" />
          </GraphNode>
        </div>

        {/* Node: Discussions (Top Center-Left) */}
        <div
          className="absolute z-10"
          style={{
            left: `${nodePositions.discussions.x}%`,
            top: `${nodePositions.discussions.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <GraphNode href="https://github.com/crhistian-cornejo/CADHY/discussions" external>
            <HugeiconsIcon
              icon={Message01Icon}
              size={20}
              className="text-muted-foreground group-hover:text-foreground transition-colors"
            />
            <span className="hidden sm:block text-xs font-bold tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
              DISCUSSIONS
            </span>
            <Port position="left" />
            <Port position="right" />
            <Port position="bottom" />
          </GraphNode>
        </div>

        {/* Node: Docs (Bottom Center-Left) */}
        <div
          className="absolute z-10"
          style={{
            left: `${nodePositions.docs.x}%`,
            top: `${nodePositions.docs.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <GraphNode href="/docs">
            <HugeiconsIcon
              icon={Book02Icon}
              size={20}
              className="text-muted-foreground group-hover:text-foreground transition-colors"
            />
            <span className="text-xs font-bold tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
              DOCS
            </span>
            <Port position="left" />
            <Port position="top" />
            <Port position="right" />
          </GraphNode>
        </div>

        {/* Node: Download (Right - Primary CTA) */}
        <div
          className="absolute z-10"
          style={{
            left: `${nodePositions.download.x}%`,
            top: `${nodePositions.download.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <GraphNode href="/#downloads" variant="primary">
            <Port position="left" />
            <HugeiconsIcon icon={Download02Icon} size={24} />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold tracking-widest opacity-70">v0.1.0</span>
              <span className="text-sm font-bold tracking-tighter">DOWNLOAD</span>
            </div>
            <HugeiconsIcon icon={ZapIcon} size={16} className="opacity-50" />
          </GraphNode>
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-20 mt-16 px-8 lg:px-16">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: "4", label: "Channel Types" },
            { value: "48K", label: "Lines of Rust" },
            { value: "25+", label: "Tauri Commands" },
            { value: "3", label: "Platforms" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 border border-border rounded-xl bg-card">
              <div className="text-2xl font-bold text-foreground tracking-tighter">
                {stat.value}
              </div>
              <div className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
