/**
 * CAD Section Divider Component
 *
 * Reusable divider with pattern SVG for separating sections.
 */

// CAD-style pattern divider component
export function CADSectionDivider({ label }: { label?: string }) {
  return (
    <div className="max-w-6xl mx-auto px-8 lg:px-16 py-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
        <svg width="100%" height="10" aria-hidden="true">
          <defs>
            <pattern
              id={`divider-left-${label?.replace(/\s/g, "-") || "default"}`}
              x="0"
              y="0"
              width="8"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 0 10 L 8 0"
                fill="none"
                className="stroke-current text-muted-foreground/30"
                strokeWidth="0.75"
              />
            </pattern>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#divider-left-${label?.replace(/\s/g, "-") || "default"})`}
          />
        </svg>
        {label && <p className="px-3 whitespace-nowrap">{label}</p>}
        <svg width="100%" height="10" aria-hidden="true">
          <defs>
            <pattern
              id={`divider-right-${label?.replace(/\s/g, "-") || "default"}`}
              x="0"
              y="0"
              width="8"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 8 10 L 0 0"
                fill="none"
                className="stroke-current text-muted-foreground/30"
                strokeWidth="0.75"
              />
            </pattern>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#divider-right-${label?.replace(/\s/g, "-") || "default"})`}
          />
        </svg>
      </div>
    </div>
  )
}

// Simpler horizontal pattern divider without label
export function CADHorizontalDivider() {
  return (
    <div className="max-w-6xl mx-auto px-8 lg:px-16">
      <svg width="100%" height="6" aria-hidden="true">
        <defs>
          <pattern
            id="horizontal-divider-pattern"
            x="0"
            y="0"
            width="12"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 0 3 L 4 0 L 8 3 L 12 0"
              fill="none"
              className="stroke-current text-muted-foreground/20"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#horizontal-divider-pattern)" />
      </svg>
    </div>
  )
}
