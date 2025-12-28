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
      viewBox="0 0 320 220"
      className="w-full h-auto max-w-sm"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Gradient for top layer highlighting */}
        <linearGradient id="layer-gradient-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.15">
            <animate
              attributeName="stop-opacity"
              dur="2s"
              values="0.15;0.25;0.15"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="layer-gradient-mid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.08" />
          <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Base grid pattern */}
      <g className="stroke-primary/20" strokeWidth="0.5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`gv${i}`} x1={70 + i * 30} y1="155" x2={100 + i * 30} y2="180" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`gh${i}`}
            x1={70 + i * 12}
            y1={155 + i * 6}
            x2={280 + i * 12}
            y2={155 + i * 6}
          />
        ))}
      </g>

      {/* Layer 1 - Base plane */}
      <path
        d="M80 155 L250 155 L290 180 L120 180 Z"
        className="fill-primary/5 stroke-primary/30"
        strokeWidth="1"
      />
      {/* Base layer rectangle annotation */}
      <rect
        x="80"
        y="155"
        width="56"
        height="20"
        className="fill-primary/10 stroke-primary/40"
        rx="1"
        strokeWidth="1"
      />

      {/* Layer 2 - Middle mesh layer */}
      <g transform="translate(0, -50)">
        <path
          d="M80 155 L250 155 L290 180 L120 180 Z"
          fill="url(#layer-gradient-mid)"
          className="stroke-primary/40"
          strokeWidth="1"
        />
        {/* Mesh cross pattern */}
        <g className="stroke-primary/25" strokeWidth="0.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={`mx${i}`} x1={100 + i * 30} y1="157" x2={115 + i * 30} y2="178" />
          ))}
          {[0, 1, 2].map((i) => (
            <line
              key={`my${i}`}
              x1={90 + i * 10}
              y1={160 + i * 6}
              x2={275 + i * 10}
              y2={160 + i * 6}
            />
          ))}
        </g>
        {/* Middle layer control box */}
        <rect
          x="145"
          y="158"
          width="45"
          height="15"
          className="fill-primary/20 stroke-primary/50"
          rx="1"
          strokeWidth="1"
        />
      </g>

      {/* Layer 3 - Top layer with detail */}
      <g transform="translate(0, -100)">
        <path
          d="M80 155 L250 155 L290 180 L120 180 Z"
          fill="url(#layer-gradient-top)"
          className="stroke-primary/60"
          strokeWidth="1.5"
        />
        {/* Checkerboard/detail pattern */}
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3, 4, 5].map((col) => (
            <rect
              key={`sq${row}${col}`}
              x={90 + col * 28 + row * 5}
              y={157 + row * 5}
              width="14"
              height="7"
              className={(row + col) % 2 === 0 ? "fill-primary/50" : "fill-primary/15"}
            />
          ))
        )}
        {/* Highlight rectangle */}
        <rect
          x="200"
          y="157"
          width="35"
          height="18"
          className="fill-background stroke-primary"
          rx="1"
          strokeWidth="1.5"
        />
      </g>

      {/* Vertical connectors with animated dashes */}
      <line
        x1="80"
        y1="55"
        x2="80"
        y2="155"
        className="stroke-primary/30"
        strokeWidth="0.75"
        strokeDasharray="4 4"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="2s"
          values="0;-16;"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="250"
        y1="55"
        x2="250"
        y2="155"
        className="stroke-primary/30"
        strokeWidth="0.75"
        strokeDasharray="4 4"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="2s"
          values="0;-16;"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="290"
        y1="80"
        x2="290"
        y2="180"
        className="stroke-primary/30"
        strokeWidth="0.75"
        strokeDasharray="4 4"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="2s"
          values="0;-16;"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="120"
        y1="80"
        x2="120"
        y2="180"
        className="stroke-primary/30"
        strokeWidth="0.75"
        strokeDasharray="4 4"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="2s"
          values="0;-16;"
          repeatCount="indefinite"
        />
      </line>

      {/* Layer height annotations */}
      <g className="stroke-primary/50" strokeWidth="1">
        <line x1="40" y1="55" x2="40" y2="155" />
        <line x1="35" y1="55" x2="45" y2="55" />
        <line x1="35" y1="105" x2="45" y2="105" />
        <line x1="35" y1="155" x2="45" y2="155" />
      </g>

      {/* Pixel-art style labels */}
      <text x="28" y="82" className="fill-muted-foreground font-mono text-[7px]">
        L3
      </text>
      <text x="28" y="132" className="fill-muted-foreground font-mono text-[7px]">
        L2
      </text>
      <text x="28" y="172" className="fill-muted-foreground font-mono text-[7px]">
        L1
      </text>

      {/* Dimension arrow at top */}
      <path d="M85 40 L245 40" className="stroke-primary/40" strokeWidth="1" />
      <path d="M85 35 L85 45" className="stroke-primary/40" strokeWidth="1" />
      <path d="M245 35 L245 45" className="stroke-primary/40" strokeWidth="1" />
      <text
        x="155"
        y="35"
        className="fill-muted-foreground font-mono text-[7px]"
        textAnchor="middle"
      >
        WIDTH
      </text>

      {/* Figure label */}
      <text
        x="15"
        y="30"
        className="fill-muted-foreground font-mono text-[8px]"
        transform="rotate(-90, 15, 30)"
      >
        FIG.001
      </text>

      {/* Animated pulse on active layer */}
      <circle cx="220" cy="65" r="3" className="fill-primary">
        <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
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
      aria-hidden="true"
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
      viewBox="0 0 340 200"
      className="w-full h-auto max-w-sm"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Gradient for water surface */}
        <linearGradient id="water-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.2">
            <animate
              attributeName="stop-opacity"
              dur="2s"
              values="0.2;0.3;0.2"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Base plane with isometric grid */}
      <g className="stroke-primary/15" strokeWidth="0.5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`gv${i}`} x1={60 + i * 35} y1="155" x2={95 + i * 35} y2="180" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={`gh${i}`}
            x1={60 + i * 10}
            y1={155 + i * 8}
            x2={310 + i * 10}
            y2={155 + i * 8}
          />
        ))}
      </g>

      {/* 3D Gaussian water surface */}
      <path
        d="M60 155
           Q100 130 130 100
           Q150 55 175 35
           Q200 55 220 100
           Q250 130 290 155
           L325 180
           L95 180 Z"
        fill="url(#water-gradient)"
        className="stroke-primary/50"
        strokeWidth="1.5"
      />

      {/* Contour lines on surface */}
      {[0, 1, 2].map((i) => (
        <path
          key={`gc${i}`}
          d={`M${75 + i * 18} ${155 - i * 8}
              Q${115 + i * 10} ${130 - i * 20} ${175} ${55 + i * 12}
              Q${235 - i * 10} ${130 - i * 20} ${275 - i * 18} ${155 - i * 8}`}
          className="stroke-primary/35"
          strokeWidth="0.75"
          fill="none"
        >
          <animate
            attributeName="stroke-dashoffset"
            dur="4s"
            values="0;-20;"
            repeatCount="indefinite"
          />
        </path>
      ))}

      {/* Flow indicator lines with animation */}
      <line
        x1="100"
        y1="90"
        x2="160"
        y2="50"
        className="stroke-primary/40"
        strokeWidth="0.75"
        strokeDasharray="4 4"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="1.5s"
          values="0;-16;"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="250"
        y1="90"
        x2="190"
        y2="50"
        className="stroke-primary/40"
        strokeWidth="0.75"
        strokeDasharray="4 4"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="1.5s"
          values="0;-16;"
          repeatCount="indefinite"
        />
      </line>

      {/* Peak marker with pulse */}
      <line
        x1="175"
        y1="35"
        x2="175"
        y2="180"
        className="stroke-primary/25"
        strokeWidth="0.75"
        strokeDasharray="3 3"
      />
      <circle cx="175" cy="35" r="4" className="fill-primary">
        <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Height annotation on left */}
      <g className="stroke-primary/50" strokeWidth="1">
        <line x1="35" y1="35" x2="35" y2="155" />
        <line x1="30" y1="35" x2="40" y2="35" />
        <line x1="30" y1="95" x2="40" y2="95" />
        <line x1="30" y1="155" x2="40" y2="155" />
      </g>
      <text x="22" y="65" className="fill-muted-foreground font-mono text-[7px]">
        H
      </text>
      <text x="22" y="130" className="fill-muted-foreground font-mono text-[7px]">
        0
      </text>

      {/* Water level indicators */}
      <rect
        x="175"
        y="33"
        width="40"
        height="12"
        rx="1"
        className="fill-primary/15 stroke-primary/50"
        strokeWidth="1"
      />
      <text x="180" y="42" className="fill-muted-foreground font-mono text-[6px]">
        PEAK
      </text>

      {/* Axis labels */}
      <text x="310" y="185" className="fill-muted-foreground font-mono text-[7px]">
        X
      </text>
      <text x="80" y="190" className="fill-muted-foreground font-mono text-[7px]">
        Y
      </text>

      {/* Water particles animated */}
      {[0, 1, 2].map((i) => (
        <circle key={`wp${i}`} r="2" className="fill-primary/60">
          <animateMotion
            dur={`${4 + i}s`}
            repeatCount="indefinite"
            path="M95 155 Q135 100 175 50 Q215 100 255 155"
            begin={`${i * 0.8}s`}
          />
        </circle>
      ))}

      {/* Figure label */}
      <text
        x="12"
        y="30"
        className="fill-muted-foreground font-mono text-[8px]"
        transform="rotate(-90, 12, 30)"
      >
        FIG.003
      </text>
    </svg>
  )
}

// SVG Illustration: Download Icon CAD Style (for CAD Export)
function IllustrationGridType() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="w-full h-auto max-w-sm"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Gradient for icon fill - subtle */}
        <linearGradient id="download-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.03" />
          <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.12">
            <animate
              attributeName="stop-opacity"
              dur="2s"
              values="0.12;0.18;0.12"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* Background grid */}
      <g className="stroke-primary/10" strokeWidth="0.5">
        {[...Array(16)].map((_, i) => (
          <line key={`gv${i}`} x1={20 + i * 20} y1="10" x2={20 + i * 20} y2="190" />
        ))}
        {[...Array(10)].map((_, i) => (
          <line key={`gh${i}`} x1="20" y1={10 + i * 20} x2="300" y2={10 + i * 20} />
        ))}
      </g>

      {/* File/Document box */}
      <rect
        x="100"
        y="90"
        width="100"
        height="75"
        rx="3"
        fill="url(#download-gradient)"
        className="stroke-primary"
        strokeWidth="2"
      />
      {/* Folded corner effect */}
      <path
        d="M180 90 L200 90 L200 110 L180 110 Z"
        className="fill-primary/8 stroke-primary/60"
        strokeWidth="1"
      />
      <path
        d="M180 90 L180 110 L200 110"
        className="stroke-primary"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Download arrow - animated */}
      <g>
        {/* Arrow stem */}
        <line
          x1="150"
          y1="25"
          x2="150"
          y2="70"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <animate attributeName="y2" values="65;75;65" dur="1.5s" repeatCount="indefinite" />
        </line>
        {/* Arrow head */}
        <path
          d="M130 55 L150 80 L170 55"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <animate
            attributeName="d"
            values="M130 50 L150 75 L170 50;M130 60 L150 85 L170 60;M130 50 L150 75 L170 50"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* Control points on document corners */}
      <circle cx="100" cy="90" r="4" className="fill-background stroke-primary" strokeWidth="1.5" />
      <circle cx="200" cy="90" r="4" className="fill-background stroke-primary" strokeWidth="1.5" />
      <circle
        cx="100"
        cy="165"
        r="4"
        className="fill-background stroke-primary"
        strokeWidth="1.5"
      />
      <circle
        cx="200"
        cy="165"
        r="4"
        className="fill-background stroke-primary"
        strokeWidth="1.5"
      />

      {/* Document lines inside */}
      <line x1="115" y1="120" x2="185" y2="120" className="stroke-primary/40" strokeWidth="1" />
      <line x1="115" y1="132" x2="170" y2="132" className="stroke-primary/30" strokeWidth="1" />
      <line x1="115" y1="144" x2="180" y2="144" className="stroke-primary/30" strokeWidth="1" />

      {/* Export lines emanating right */}
      <g className="stroke-primary/40" strokeWidth="1">
        <line x1="210" y1="100" x2="270" y2="70" strokeDasharray="4 4">
          <animate
            attributeName="stroke-dashoffset"
            dur="1s"
            values="0;-16;"
            repeatCount="indefinite"
          />
        </line>
        <line x1="210" y1="125" x2="270" y2="125" strokeDasharray="4 4">
          <animate
            attributeName="stroke-dashoffset"
            dur="1s"
            values="0;-16;"
            repeatCount="indefinite"
          />
        </line>
        <line x1="210" y1="150" x2="270" y2="175" strokeDasharray="4 4">
          <animate
            attributeName="stroke-dashoffset"
            dur="1s"
            values="0;-16;"
            repeatCount="indefinite"
          />
        </line>
      </g>

      {/* Export format labels */}
      <rect
        x="255"
        y="58"
        width="40"
        height="14"
        rx="1"
        className="fill-primary/10 stroke-primary/50"
        strokeWidth="1"
      />
      <text x="260" y="68" className="fill-muted-foreground font-mono text-[6px]">
        .STEP
      </text>

      <rect
        x="255"
        y="118"
        width="40"
        height="14"
        rx="1"
        className="fill-primary/10 stroke-primary/50"
        strokeWidth="1"
      />
      <text x="260" y="128" className="fill-muted-foreground font-mono text-[6px]">
        .DXF
      </text>

      <rect
        x="255"
        y="168"
        width="40"
        height="14"
        rx="1"
        className="fill-primary/10 stroke-primary/50"
        strokeWidth="1"
      />
      <text x="260" y="178" className="fill-muted-foreground font-mono text-[6px]">
        .OBJ
      </text>

      {/* Dimension lines */}
      <g className="stroke-primary/40" strokeWidth="0.75">
        <line x1="100" y1="175" x2="200" y2="175" />
        <line x1="100" y1="170" x2="100" y2="180" />
        <line x1="200" y1="170" x2="200" y2="180" />
      </g>
      <text
        x="145"
        y="188"
        className="fill-muted-foreground font-mono text-[6px]"
        textAnchor="middle"
      >
        100mm
      </text>

      {/* Height dimension */}
      <g className="stroke-primary/40" strokeWidth="0.75">
        <line x1="85" y1="90" x2="85" y2="165" />
        <line x1="80" y1="90" x2="90" y2="90" />
        <line x1="80" y1="165" x2="90" y2="165" />
      </g>
      <text
        x="70"
        y="130"
        className="fill-muted-foreground font-mono text-[6px]"
        transform="rotate(-90, 70, 130)"
      >
        75mm
      </text>

      {/* Figure label */}
      <text
        x="15"
        y="25"
        className="fill-muted-foreground font-mono text-[8px]"
        transform="rotate(-90, 15, 25)"
      >
        FIG.005
      </text>

      {/* Status indicator */}
      <circle cx="290" cy="15" r="4" className="fill-primary">
        <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
      </circle>
      <text x="265" y="25" className="fill-muted-foreground font-mono text-[5px]">
        READY
      </text>
    </svg>
  )
}

// SVG Illustration: Hydraulic Channel (for Structures)
function IllustrationPipeNetwork() {
  return (
    <svg
      viewBox="0 0 360 200"
      className="w-full h-auto max-w-sm"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Water gradient */}
        <linearGradient id="water-flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.12" />
          <stop offset="50%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.08">
            <animate
              attributeName="stop-opacity"
              dur="2s"
              values="0.08;0.12;0.08"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.12" />
        </linearGradient>
        {/* Channel wall gradient */}
        <linearGradient id="channel-wall-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.05" />
          <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Channel walls - Cross section */}
      <path
        d="M30 45 L30 155 L330 155 L330 45"
        fill="url(#channel-wall-gradient)"
        className="stroke-primary/50"
        strokeWidth="2"
      />

      {/* Channel bottom */}
      <line x1="30" y1="155" x2="330" y2="155" className="stroke-primary" strokeWidth="2" />

      {/* Weir/Step obstacle */}
      <rect
        x="155"
        y="110"
        width="50"
        height="45"
        className="fill-primary/20 stroke-primary"
        strokeWidth="1.5"
      />
      {/* Weir crest hatching */}
      <g className="stroke-primary/40" strokeWidth="0.5">
        {[0, 1, 2, 3].map((i) => (
          <line key={`wh${i}`} x1={160 + i * 12} y1="110" x2={165 + i * 12} y2="125" />
        ))}
      </g>

      {/* Water surface upstream - higher level */}
      <path
        d="M35 70 Q90 65 155 70"
        fill="url(#water-flow-gradient)"
        className="stroke-primary/60"
        strokeWidth="1.5"
      />
      <rect
        x="35"
        y="70"
        width="120"
        height="85"
        fill="url(#water-flow-gradient)"
        className="stroke-none"
      />

      {/* Water flow over weir - animated curve */}
      <path
        d="M155 70 Q175 60 180 75 Q185 100 205 110"
        className="stroke-primary/50"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 3"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="0.8s"
          values="0;-14;"
          repeatCount="indefinite"
        />
      </path>

      {/* Water surface downstream - lower level */}
      <path
        d="M205 110 Q260 115 325 110"
        fill="url(#water-flow-gradient)"
        className="stroke-primary/60"
        strokeWidth="1.5"
      />
      <rect
        x="205"
        y="110"
        width="120"
        height="45"
        fill="url(#water-flow-gradient)"
        className="stroke-none"
      />

      {/* Flow arrows */}
      <g className="stroke-primary" strokeWidth="2" fill="none">
        <path d="M60 85 L80 85 M75 80 L80 85 L75 90" />
        <path d="M270 125 L290 125 M285 120 L290 125 L285 130" />
      </g>

      {/* Turbulence indicators at weir */}
      <g className="stroke-primary/40" strokeWidth="0.75">
        <path d="M185 95 Q190 90 195 95 Q200 100 205 95" fill="none" strokeDasharray="2 2">
          <animate
            attributeName="stroke-dashoffset"
            dur="0.5s"
            values="0;-8;"
            repeatCount="indefinite"
          />
        </path>
        <path d="M180 100 Q187 95 194 100" fill="none" strokeDasharray="2 2">
          <animate
            attributeName="stroke-dashoffset"
            dur="0.6s"
            values="0;-8;"
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* Water level indicators */}
      <g className="stroke-primary/50" strokeWidth="0.75">
        {/* Upstream level */}
        <line x1="20" y1="70" x2="35" y2="70" />
        <line x1="20" y1="155" x2="20" y2="70" />
        <line x1="17" y1="70" x2="23" y2="70" />
        <line x1="17" y1="155" x2="23" y2="155" />
      </g>
      <text
        x="8"
        y="115"
        className="fill-muted-foreground font-mono text-[5px]"
        transform="rotate(-90, 8, 115)"
      >
        H1
      </text>

      <g className="stroke-primary/50" strokeWidth="0.75">
        {/* Downstream level */}
        <line x1="340" y1="110" x2="330" y2="110" />
        <line x1="340" y1="155" x2="340" y2="110" />
        <line x1="337" y1="110" x2="343" y2="110" />
        <line x1="337" y1="155" x2="343" y2="155" />
      </g>
      <text
        x="348"
        y="135"
        className="fill-muted-foreground font-mono text-[5px]"
        transform="rotate(-90, 348, 135)"
      >
        H2
      </text>

      {/* Weir height annotation */}
      <g className="stroke-primary/40" strokeWidth="0.5">
        <line x1="215" y1="110" x2="215" y2="155" />
        <line x1="212" y1="110" x2="218" y2="110" />
        <line x1="212" y1="155" x2="218" y2="155" />
      </g>
      <text x="222" y="135" className="fill-muted-foreground font-mono text-[5px]">
        P
      </text>

      {/* Weir width annotation */}
      <g className="stroke-primary/40" strokeWidth="0.5">
        <line x1="155" y1="165" x2="205" y2="165" />
        <line x1="155" y1="162" x2="155" y2="168" />
        <line x1="205" y1="162" x2="205" y2="168" />
      </g>
      <text
        x="175"
        y="175"
        className="fill-muted-foreground font-mono text-[5px]"
        textAnchor="middle"
      >
        L
      </text>

      {/* Flow particles */}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={`wfp${i}`} r="2" className="fill-primary">
          <animateMotion
            dur={`${2 + i * 0.3}s`}
            repeatCount="indefinite"
            path="M40 80 L150 75 Q175 60 185 90 Q195 105 210 115 L320 120"
            begin={`${i * 0.4}s`}
          />
          <animate
            attributeName="opacity"
            values="0.8;0.3;0.8"
            dur={`${2 + i * 0.3}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* Labels */}
      <rect
        x="30"
        y="25"
        width="45"
        height="12"
        rx="1"
        className="fill-primary/10 stroke-primary/40"
        strokeWidth="1"
      />
      <text x="35" y="34" className="fill-muted-foreground font-mono text-[5px]">
        INLET
      </text>

      <rect
        x="285"
        y="25"
        width="45"
        height="12"
        rx="1"
        className="fill-primary/10 stroke-primary/40"
        strokeWidth="1"
      />
      <text x="290" y="34" className="fill-muted-foreground font-mono text-[5px]">
        OUTLET
      </text>

      <rect
        x="158"
        y="90"
        width="45"
        height="12"
        rx="1"
        className="fill-primary/10 stroke-primary/40"
        strokeWidth="1"
      />
      <text x="163" y="99" className="fill-muted-foreground font-mono text-[5px]">
        WEIR
      </text>

      {/* Figure label */}
      <text
        x="12"
        y="185"
        className="fill-muted-foreground font-mono text-[8px]"
        transform="rotate(-90, 12, 185)"
      >
        FIG.004
      </text>

      {/* Flow indicator */}
      <circle cx="330" cy="185" r="4" className="fill-primary">
        <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite" />
      </circle>
      <text x="300" y="192" className="fill-muted-foreground font-mono text-[5px]">
        Q ACTIVE
      </text>
    </svg>
  )
}

// SVG Illustration: AI Assistant with Tool Calling
function IllustrationAI() {
  return (
    <svg
      viewBox="0 0 340 200"
      className="w-full h-auto max-w-sm"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Grid background */}
      <g className="stroke-primary/8" strokeWidth="0.5">
        {[...Array(17)].map((_, i) => (
          <line key={`gv${i}`} x1={20 + i * 20} y1="10" x2={20 + i * 20} y2="190" />
        ))}
        {[...Array(10)].map((_, i) => (
          <line key={`gh${i}`} x1="20" y1={10 + i * 20} x2="320" y2={10 + i * 20} />
        ))}
      </g>

      {/* User Prompt Box */}
      <g>
        <rect
          x="25"
          y="25"
          width="90"
          height="45"
          rx="2"
          className="fill-primary/5 stroke-primary/40"
          strokeWidth="1"
        />
        {/* Corner marks */}
        <path d="M25 25 L25 32 M25 25 L32 25" className="stroke-primary/30" strokeWidth="1" />
        <path d="M115 70 L115 63 M115 70 L108 70" className="stroke-primary/30" strokeWidth="1" />

        <text x="32" y="38" className="fill-muted-foreground font-mono text-[6px]">
          USER PROMPT
        </text>
        <text x="32" y="52" className="fill-primary/60 font-mono text-[5px]">
          "Calculate normal
        </text>
        <text x="32" y="60" className="fill-primary/60 font-mono text-[5px]">
          depth for Q=5m³/s"
        </text>
      </g>

      {/* Flow arrow from prompt to AI */}
      <g className="stroke-primary/40" strokeWidth="1">
        <line x1="120" y1="47" x2="145" y2="47" strokeDasharray="3 2">
          <animate
            attributeName="stroke-dashoffset"
            dur="0.8s"
            values="0;-10;"
            repeatCount="indefinite"
          />
        </line>
        <path d="M142 44 L148 47 L142 50" fill="none" />
      </g>

      {/* AI Core - central processing */}
      <g>
        <rect
          x="150"
          y="20"
          width="70"
          height="55"
          rx="2"
          className="fill-primary/8 stroke-primary"
          strokeWidth="1.5"
        />
        {/* AI indicator dots */}
        <circle cx="160" cy="30" r="2" className="fill-primary/40" />
        <circle cx="168" cy="30" r="2" className="fill-primary/60" />
        <circle cx="176" cy="30" r="2" className="fill-primary">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        </circle>

        <text x="158" y="46" className="fill-primary font-mono text-[7px] font-bold">
          AI CORE
        </text>
        <text x="158" y="56" className="fill-muted-foreground font-mono text-[5px]">
          Claude/GPT/
        </text>
        <text x="158" y="64" className="fill-muted-foreground font-mono text-[5px]">
          Gemini
        </text>
      </g>

      {/* Tool Call Indicators */}
      <g>
        {/* Tool 1: Calculate */}
        <rect
          x="245"
          y="20"
          width="75"
          height="25"
          rx="2"
          className="fill-primary/10 stroke-primary/50"
          strokeWidth="1"
        />
        <text x="252" y="32" className="fill-primary/70 font-mono text-[5px]">
          ⚡ TOOL CALL
        </text>
        <text x="252" y="41" className="fill-muted-foreground font-mono text-[5px]">
          calculate_depth()
        </text>

        {/* Tool 2: Analyze */}
        <rect
          x="245"
          y="50"
          width="75"
          height="25"
          rx="2"
          className="fill-primary/10 stroke-primary/50"
          strokeWidth="1"
        />
        <text x="252" y="62" className="fill-primary/70 font-mono text-[5px]">
          ⚡ TOOL CALL
        </text>
        <text x="252" y="71" className="fill-muted-foreground font-mono text-[5px]">
          analyze_flow()
        </text>
      </g>

      {/* Flow arrows to tools */}
      <g className="stroke-primary/30" strokeWidth="1">
        <line x1="225" y1="35" x2="240" y2="32" strokeDasharray="2 2">
          <animate
            attributeName="stroke-dashoffset"
            dur="0.6s"
            values="0;-8;"
            repeatCount="indefinite"
          />
        </line>
        <line x1="225" y1="55" x2="240" y2="62" strokeDasharray="2 2">
          <animate
            attributeName="stroke-dashoffset"
            dur="0.6s"
            values="0;-8;"
            repeatCount="indefinite"
          />
        </line>
      </g>

      {/* Response Stream */}
      <g>
        <rect
          x="25"
          y="95"
          width="195"
          height="75"
          rx="2"
          className="fill-primary/3 stroke-primary/30"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
        {/* Corner marks */}
        <path d="M25 95 L25 102 M25 95 L32 95" className="stroke-primary/30" strokeWidth="1" />
        <path
          d="M220 170 L220 163 M220 170 L213 170"
          className="stroke-primary/30"
          strokeWidth="1"
        />

        <text x="32" y="108" className="fill-primary/60 font-mono text-[6px]">
          AI RESPONSE (streaming)
        </text>

        {/* Response content lines */}
        <rect x="32" y="115" width="140" height="6" rx="1" className="fill-primary/20" />
        <rect x="32" y="125" width="120" height="6" rx="1" className="fill-primary/15" />
        <rect x="32" y="135" width="160" height="6" rx="1" className="fill-primary/10" />

        {/* Streaming cursor */}
        <rect x="196" y="135" width="2" height="6" className="fill-primary">
          <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
        </rect>

        {/* Result preview */}
        <text x="32" y="158" className="fill-muted-foreground font-mono text-[5px]">
          yn = 1.23m | Fr = 0.85 | Flow: Subcritical
        </text>
      </g>

      {/* Connection from AI to response */}
      <g className="stroke-primary/40" strokeWidth="1">
        <path d="M185 80 L185 90" strokeDasharray="3 2">
          <animate
            attributeName="stroke-dashoffset"
            dur="0.6s"
            values="0;-10;"
            repeatCount="indefinite"
          />
        </path>
        <path d="M182 87 L185 93 L188 87" fill="none" />
      </g>

      {/* Provider indicators */}
      <g>
        <rect
          x="245"
          y="95"
          width="75"
          height="75"
          rx="2"
          className="stroke-border"
          strokeWidth="1"
          fill="none"
        />
        <text x="252" y="108" className="fill-muted-foreground font-mono text-[6px]">
          PROVIDERS
        </text>

        {/* Provider list */}
        <circle
          cx="255"
          cy="122"
          r="3"
          className="fill-primary/30 stroke-primary/50"
          strokeWidth="0.5"
        />
        <text x="262" y="124" className="fill-muted-foreground font-mono text-[5px]">
          Claude Opus 4.5
        </text>

        <circle
          cx="255"
          cy="136"
          r="3"
          className="fill-primary/30 stroke-primary/50"
          strokeWidth="0.5"
        />
        <text x="262" y="138" className="fill-muted-foreground font-mono text-[5px]">
          GPT-5.2
        </text>

        <circle
          cx="255"
          cy="150"
          r="3"
          className="fill-primary/30 stroke-primary/50"
          strokeWidth="0.5"
        />
        <text x="262" y="152" className="fill-muted-foreground font-mono text-[5px]">
          Gemini 3 Pro
        </text>

        {/* Active indicator */}
        <circle cx="255" cy="122" r="2" className="fill-primary">
          <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Figure label */}
      <text
        x="12"
        y="180"
        className="fill-muted-foreground font-mono text-[8px]"
        transform="rotate(-90, 12, 180)"
      >
        FIG.006
      </text>

      {/* Status indicator */}
      <circle cx="320" cy="185" r="4" className="fill-primary">
        <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite" />
      </circle>
      <text x="290" y="192" className="fill-muted-foreground font-mono text-[5px]">
        STREAMING
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
    <section id="features" className="relative bg-transparent py-24 px-8 lg:px-16 overflow-hidden">
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
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-foreground mb-4">
            {t.features.title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t.features.description}</p>
        </div>

        {/* Features List */}
        <div>
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
      </div>
    </section>
  )
}
