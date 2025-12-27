/**
 * Features Section Component - Blueprint Style
 *
 * Showcases main features of CADHY with technical blueprint illustrations
 * and alternating text/illustration layout.
 */

import { useTranslation } from "@/lib/i18n"

// SVG Illustration: 3D Layers (for 3D Modeling feature)
function Illustration3DLayers() {
  return (
    <svg
      viewBox="0 0 300 200"
      className="w-full h-auto max-w-xs"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base grid layer */}
      <g className="stroke-primary/30" strokeWidth="0.5">
        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`v${i}`} x1={60 + i * 30} y1="140" x2={90 + i * 30} y2="160" />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={`h${i}`}
            x1={60 + i * 15}
            y1={140 + i * 5}
            x2={210 + i * 15}
            y2={140 + i * 5}
          />
        ))}
      </g>

      {/* Layer 1 - Base plane */}
      <path
        d="M75 140 L225 140 L255 160 L105 160 Z"
        className="fill-primary/5 stroke-primary/40"
        strokeWidth="1"
      />

      {/* Layer 2 - Middle transparent mesh */}
      <g transform="translate(0, -40)">
        <path
          d="M75 140 L225 140 L255 160 L105 160 Z"
          className="fill-primary/10 stroke-primary/50"
          strokeWidth="1"
        />
        {/* Mesh pattern */}
        <g className="stroke-primary/30" strokeWidth="0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`m${i}`} x1={95 + i * 35} y1="142" x2={110 + i * 35} y2="158" />
          ))}
        </g>
      </g>

      {/* Layer 3 - Top with checkerboard pattern */}
      <g transform="translate(0, -80)">
        <path
          d="M75 140 L225 140 L255 160 L105 160 Z"
          className="fill-background stroke-primary/60"
          strokeWidth="1.5"
        />
        {/* Checkerboard squares */}
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3, 4].map((col) => (
            <rect
              key={`sq${row}${col}`}
              x={85 + col * 30 + row * 5}
              y={142 + row * 4}
              width="12"
              height="6"
              className={(row + col) % 2 === 0 ? "fill-primary/60" : "fill-primary/20"}
            />
          ))
        )}
      </g>

      {/* Vertical connectors */}
      <line
        x1="75"
        y1="60"
        x2="75"
        y2="140"
        className="stroke-primary/30"
        strokeWidth="0.5"
        strokeDasharray="2 2"
      />
      <line
        x1="225"
        y1="60"
        x2="225"
        y2="140"
        className="stroke-primary/30"
        strokeWidth="0.5"
        strokeDasharray="2 2"
      />
      <line
        x1="255"
        y1="80"
        x2="255"
        y2="160"
        className="stroke-primary/30"
        strokeWidth="0.5"
        strokeDasharray="2 2"
      />
      <line
        x1="105"
        y1="80"
        x2="105"
        y2="160"
        className="stroke-primary/30"
        strokeWidth="0.5"
        strokeDasharray="2 2"
      />

      {/* Figure number label */}
      <text
        x="20"
        y="30"
        className="fill-muted-foreground font-mono text-[8px]"
        transform="rotate(-90, 20, 30)"
      >
        FIG.001
      </text>
    </svg>
  )
}

// SVG Illustration: Bézier Curve (for Hydraulic Analysis)
function IllustrationBezierCurve() {
  return (
    <svg
      viewBox="0 0 320 160"
      className="w-full h-auto max-w-sm"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <path id="curve-path1" d="M30 130C30 130 80 40 160 35C240 40 290 130 290 130" />
      </defs>

      {/* Control lines */}
      <line x1="30" y1="130" x2="90" y2="20" className="stroke-primary/40" strokeWidth="1" />
      <line x1="290" y1="130" x2="230" y2="20" className="stroke-primary/40" strokeWidth="1" />
      <line
        x1="90"
        y1="20"
        x2="230"
        y2="20"
        className="stroke-primary/30"
        strokeDasharray="3 3"
        strokeWidth="1"
      />

      {/* Main curve - dashed background */}
      <path
        d="M30 130 C30 130 80 40 160 35 C240 40 290 130 290 130"
        className="stroke-primary/30"
        strokeWidth="1"
        strokeDasharray="4 4"
        fill="none"
      />

      {/* Main curve - animated */}
      <path
        d="M30 130 C30 130 80 40 160 35 C240 40 290 130 290 130"
        className="stroke-primary"
        strokeWidth="2"
        fill="none"
      >
        <animate
          attributeName="stroke-dasharray"
          dur="8s"
          values="0,400;350,400;0,400"
          repeatCount="indefinite"
        />
      </path>

      {/* Animated point on curve */}
      <circle r="4" className="fill-primary">
        <animateMotion
          dur="8s"
          repeatCount="indefinite"
          keyPoints="0;1;0"
          keyTimes="0;0.5;1"
          calcMode="linear"
        >
          <mpath href="#curve-path1" />
        </animateMotion>
      </circle>

      {/* Control points */}
      <rect
        x="86"
        y="16"
        width="8"
        height="8"
        rx="1"
        className="fill-background stroke-primary"
        strokeWidth="1.5"
      />
      <rect
        x="226"
        y="16"
        width="8"
        height="8"
        rx="1"
        className="fill-background stroke-primary"
        strokeWidth="1.5"
      />

      {/* Endpoints */}
      <circle cx="30" cy="130" r="5" className="fill-primary" />
      <circle cx="290" cy="130" r="5" className="fill-primary" />

      {/* Moving construction points */}
      <g>
        <circle r="3" className="fill-primary/40 stroke-primary" strokeWidth="1">
          <animateMotion
            dur="8s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="linear"
            path="M30 130 L90 20"
          />
        </circle>
        <circle r="3" className="fill-primary/40 stroke-primary" strokeWidth="1">
          <animateMotion
            dur="8s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="linear"
            path="M90 20 L230 20"
          />
        </circle>
        <circle r="3" className="fill-primary/40 stroke-primary" strokeWidth="1">
          <animateMotion
            dur="8s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="linear"
            path="M230 20 L290 130"
          />
        </circle>
      </g>

      {/* T value label */}
      <text x="145" y="90" className="fill-primary font-mono text-xs">
        t = 0.5
      </text>

      {/* Figure label */}
      <text
        x="10"
        y="20"
        className="fill-muted-foreground font-mono text-[8px]"
        transform="rotate(-90, 10, 20)"
      >
        FIG.002
      </text>
    </svg>
  )
}

// SVG Illustration: Gaussian Distribution (for Water Surface)
function IllustrationGaussian() {
  return (
    <svg
      viewBox="0 0 300 180"
      className="w-full h-auto max-w-xs"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base plane grid */}
      <g className="stroke-primary/20" strokeWidth="0.5">
        {/* Grid lines on base */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`gv${i}`} x1={50 + i * 40} y1="140" x2={80 + i * 40} y2="165" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <line key={`gh${i}`} x1={50} y1={140 + i * 8} x2={250} y2={140 + i * 8} />
        ))}
      </g>

      {/* 3D Gaussian surface */}
      <path
        d="M50 140
           Q80 120 100 100
           Q120 60 150 40
           Q180 60 200 100
           Q220 120 250 140
           L280 165
           L80 165 Z"
        className="fill-primary/10 stroke-primary/50"
        strokeWidth="1"
      />

      {/* Gaussian curve lines */}
      {[0, 1, 2].map((i) => (
        <path
          key={`gc${i}`}
          d={`M${60 + i * 20} ${145 - i * 5}
              Q${100 + i * 10} ${120 - i * 20} ${150} ${50 + i * 5}
              Q${200 - i * 10} ${120 - i * 20} ${240 - i * 20} ${145 - i * 5}`}
          className="stroke-primary/40"
          strokeWidth="0.75"
          fill="none"
        />
      ))}

      {/* Peak marker */}
      <line
        x1="150"
        y1="40"
        x2="150"
        y2="165"
        className="stroke-primary/30"
        strokeWidth="0.5"
        strokeDasharray="2 2"
      />
      <circle cx="150" cy="40" r="3" className="fill-primary" />

      {/* Axis labels */}
      <text x="260" y="175" className="fill-muted-foreground font-mono text-[8px]">
        x
      </text>
      <text x="70" y="175" className="fill-muted-foreground font-mono text-[8px]">
        y
      </text>

      {/* Figure label */}
      <text
        x="10"
        y="30"
        className="fill-muted-foreground font-mono text-[8px]"
        transform="rotate(-90, 10, 30)"
      >
        FIG.003
      </text>
    </svg>
  )
}

// SVG Illustration: Grid Typography (for CAD Export)
function IllustrationGridType() {
  return (
    <svg
      viewBox="0 0 280 180"
      className="w-full h-auto max-w-xs"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background grid */}
      <g className="stroke-primary/15" strokeWidth="0.5">
        {[...Array(14)].map((_, i) => (
          <line key={`gv${i}`} x1={20 + i * 20} y1="10" x2={20 + i * 20} y2="170" />
        ))}
        {[...Array(9)].map((_, i) => (
          <line key={`gh${i}`} x1="20" y1={10 + i * 20} x2="260" y2={10 + i * 20} />
        ))}
      </g>

      {/* Letter "A" outline with control points */}
      <path d="M80 150 L140 30 L200 150" className="stroke-primary" strokeWidth="2" fill="none" />
      <line x1="100" y1="110" x2="180" y2="110" className="stroke-primary" strokeWidth="2" />

      {/* Control points on the letter */}
      <circle cx="80" cy="150" r="4" className="fill-background stroke-primary" strokeWidth="1.5" />
      <circle cx="140" cy="30" r="4" className="fill-background stroke-primary" strokeWidth="1.5" />
      <circle
        cx="200"
        cy="150"
        r="4"
        className="fill-background stroke-primary"
        strokeWidth="1.5"
      />
      <circle cx="100" cy="110" r="3" className="fill-primary/50 stroke-primary" strokeWidth="1" />
      <circle cx="180" cy="110" r="3" className="fill-primary/50 stroke-primary" strokeWidth="1" />

      {/* Bezier curves showing smooth version */}
      <path
        d="M85 145 Q90 130 100 110 Q110 90 140 35 Q170 90 180 110 Q190 130 195 145"
        className="stroke-primary/40"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        fill="none"
      />

      {/* Dimension lines */}
      <g className="stroke-muted-foreground/50" strokeWidth="0.5">
        <line x1="80" y1="160" x2="200" y2="160" />
        <line x1="80" y1="155" x2="80" y2="165" />
        <line x1="200" y1="155" x2="200" y2="165" />
      </g>

      {/* Figure label */}
      <text x="245" y="170" className="fill-muted-foreground font-mono text-[8px]">
        FIG.005
      </text>
    </svg>
  )
}

// SVG Illustration: Pipe Network (for Structures)
function IllustrationPipeNetwork() {
  return (
    <svg
      viewBox="0 0 300 160"
      className="w-full h-auto max-w-sm"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main pipe outline */}
      <ellipse
        cx="150"
        cy="80"
        rx="120"
        ry="50"
        className="stroke-primary/30"
        strokeWidth="1"
        fill="none"
      />
      <ellipse
        cx="150"
        cy="80"
        rx="100"
        ry="40"
        className="stroke-primary/50"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Cross section lines */}
      <line
        x1="50"
        y1="80"
        x2="250"
        y2="80"
        className="stroke-primary/30"
        strokeWidth="0.5"
        strokeDasharray="4 2"
      />
      <line
        x1="150"
        y1="30"
        x2="150"
        y2="130"
        className="stroke-primary/30"
        strokeWidth="0.5"
        strokeDasharray="4 2"
      />

      {/* Flow arrows */}
      <g className="stroke-primary" strokeWidth="1.5" fill="none">
        <path d="M80 65 L100 80 L80 95" />
        <path d="M200 65 L220 80 L200 95" />
      </g>

      {/* Dimension labels */}
      <g className="fill-muted-foreground font-mono text-[7px]">
        <text x="260" y="85">
          D
        </text>
        <text x="145" y="25">
          R
        </text>
      </g>

      {/* Animated flow particles */}
      {[0, 1, 2].map((i) => (
        <circle key={`p${i}`} r="2" className="fill-primary">
          <animateMotion
            dur={`${3 + i}s`}
            repeatCount="indefinite"
            path="M30 80 Q150 30 270 80 Q150 130 30 80"
            begin={`${i * 0.5}s`}
          />
        </circle>
      ))}

      {/* Labels */}
      <text
        x="10"
        y="20"
        className="fill-muted-foreground font-mono text-[8px]"
        transform="rotate(-90, 10, 20)"
      >
        FIG.004
      </text>
    </svg>
  )
}

// SVG Illustration: AI Sparkles (for AI Assistant)
function IllustrationAI() {
  return (
    <svg
      viewBox="0 0 280 160"
      className="w-full h-auto max-w-xs"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Neural network style connections */}
      <g className="stroke-primary/20" strokeWidth="0.5">
        {/* Input layer connections */}
        {[40, 80, 120].map((y) =>
          [60, 100].map((x2) => <line key={`c1-${y}-${x2}`} x1="20" y1={y} x2={x2} y2={80} />)
        )}
        {/* Hidden layer connections */}
        {[60, 100].map((x1) =>
          [40, 80, 120].map((y2) => (
            <line key={`c2-${x1}-${y2}`} x1={x1} y1={80} x2="140" y2={y2} />
          ))
        )}
        {/* Output connections */}
        {[40, 80, 120].map((y1) => (
          <line key={`c3-${y1}`} x1="140" y1={y1} x2="180" y2={80} />
        ))}
      </g>

      {/* Nodes */}
      {[40, 80, 120].map((y) => (
        <circle
          key={`n1-${y}`}
          cx="20"
          cy={y}
          r="6"
          className="fill-primary/20 stroke-primary"
          strokeWidth="1"
        />
      ))}
      {[60, 100].map((x) => (
        <circle
          key={`n2-${x}`}
          cx={x}
          cy={80}
          r="8"
          className="fill-primary/30 stroke-primary"
          strokeWidth="1.5"
        />
      ))}
      {[40, 80, 120].map((y) => (
        <circle
          key={`n3-${y}`}
          cx="140"
          cy={y}
          r="6"
          className="fill-primary/20 stroke-primary"
          strokeWidth="1"
        />
      ))}
      <circle cx="180" cy="80" r="10" className="fill-primary stroke-primary" strokeWidth="2">
        <animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Sparkle effects */}
      <g className="fill-primary">
        {[
          [200, 40],
          [220, 70],
          [210, 110],
          [240, 60],
          [250, 100],
        ].map(([x, y], i) => (
          <g key={`spark-${i}`} transform={`translate(${x}, ${y})`}>
            <path d="M0 -6 L1 -1 L6 0 L1 1 L0 6 L-1 1 L-6 0 L-1 -1 Z">
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur={`${1.5 + i * 0.3}s`}
                repeatCount="indefinite"
                begin={`${i * 0.2}s`}
              />
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur={`${4 + i}s`}
                repeatCount="indefinite"
              />
            </path>
          </g>
        ))}
      </g>

      {/* Figure label */}
      <text
        x="10"
        y="20"
        className="fill-muted-foreground font-mono text-[8px]"
        transform="rotate(-90, 10, 20)"
      >
        FIG.006
      </text>
    </svg>
  )
}

// Feature illustrations mapping
const FEATURE_ILLUSTRATIONS: Record<string, React.FC> = {
  "3dModeling": Illustration3DLayers,
  hydraulicAnalysis: IllustrationBezierCurve,
  structures: IllustrationPipeNetwork,
  waterSurface: IllustrationGaussian,
  cadExport: IllustrationGridType,
  aiAssistant: IllustrationAI,
}

// Single feature block with alternating layout
function FeatureBlock({
  title,
  description,
  featureKey,
  index,
}: {
  title: string
  description: string
  featureKey: string
  index: number
}) {
  const Illustration = FEATURE_ILLUSTRATIONS[featureKey] || Illustration3DLayers
  const isReversed = index % 2 === 1

  return (
    <div
      className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center py-16 ${
        index > 0 ? "border-t border-border/50" : ""
      }`}
    >
      {/* Text content */}
      <div className={`space-y-4 ${isReversed ? "lg:order-2" : ""}`}>
        <p className="text-foreground leading-relaxed text-lg">{description}</p>
        <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">{title}</h3>
      </div>

      {/* Illustration */}
      <div
        className={`flex justify-center items-center ${isReversed ? "lg:order-1 lg:justify-start" : "lg:justify-end"}`}
      >
        <div className="relative">
          <Illustration />
        </div>
      </div>
    </div>
  )
}

export function FeaturesSection() {
  const { t } = useTranslation()

  // Build features from translations
  const features = [
    { key: "3dModeling", ...t.features["3dModeling"] },
    { key: "hydraulicAnalysis", ...t.features.hydraulicAnalysis },
    { key: "structures", ...t.features.structures },
    { key: "waterSurface", ...t.features.waterSurface },
    { key: "cadExport", ...t.features.cadExport },
    { key: "aiAssistant", ...t.features.aiAssistant },
  ]

  return (
    <section
      id="features"
      className="relative border-t border-border bg-background py-24 px-8 lg:px-16 overflow-hidden"
    >
      {/* CAD Pattern Background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="features-grid"
            x="0"
            y="0"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              className="stroke-current text-muted-foreground/10"
              strokeWidth="0.5"
            />
            <circle cx="0" cy="0" r="1" className="fill-current text-muted-foreground/10" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#features-grid)" />
      </svg>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-xs font-mono tracking-[0.3em] text-muted-foreground mb-4">
            {t.features.badge}
          </h2>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-muted-foreground/30" />
            <div className="w-2 h-2 border border-muted-foreground/50 rotate-45" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-muted-foreground/30" />
          </div>
          <h3 className="text-4xl lg:text-5xl font-bold tracking-tighter text-foreground mb-4">
            {t.features.title}
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t.features.description}</p>
        </div>

        {/* Features List */}
        <div className="mt-16">
          {features.map((feature, index) => (
            <FeatureBlock
              key={feature.key}
              title={feature.title}
              description={feature.description}
              featureKey={feature.key}
              index={index}
            />
          ))}
        </div>

        {/* Blueprint-style markers */}
        <div className="absolute top-8 right-8 font-mono text-[8px] text-muted-foreground/30 tracking-wider hidden lg:block">
          SEC.02
        </div>
      </div>
    </section>
  )
}
