/**
 * Landing Layout
 *
 * Main layout for the landing page with navbar and footer.
 * Includes global CAD pattern background.
 */

import { Outlet } from "react-router-dom"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"

// Global CAD Pattern Background SVG
function GlobalCADPattern() {
  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Pattern 1: Main CAD grid with markers */}
        <pattern
          id="global-pattern-cad"
          x="0"
          y="0"
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          {/* Main grid lines */}
          <path
            d="M 80 0 L 0 0 0 80"
            fill="none"
            className="stroke-current text-muted-foreground/[0.06]"
            strokeWidth="0.5"
          />
          {/* Sub grid */}
          <path
            d="M 40 0 L 40 80 M 0 40 L 80 40"
            fill="none"
            className="stroke-current text-muted-foreground/[0.03]"
            strokeWidth="0.25"
          />
          {/* Corner markers */}
          <rect
            x="0"
            y="0"
            width="2"
            height="2"
            className="fill-current text-muted-foreground/[0.06]"
          />
          {/* Cross markers at intersections */}
          <path
            d="M 40 38 L 40 42 M 38 40 L 42 40"
            fill="none"
            className="stroke-current text-muted-foreground/[0.05]"
            strokeWidth="0.5"
          />
        </pattern>

        {/* Pattern 2: Small dots */}
        <pattern
          id="global-pattern-dots"
          x="0"
          y="0"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="0.4" className="fill-current text-muted-foreground/[0.04]" />
        </pattern>

        {/* Pattern for dividers - diagonal lines */}
        <pattern
          id="pattern-divider"
          x="0"
          y="0"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 6 L 6 0"
            fill="none"
            className="stroke-current text-muted-foreground/30"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>

      {/* Layer 1: Main CAD grid */}
      <rect x="0" y="0" width="100%" height="100%" fill="url(#global-pattern-cad)" />
      {/* Layer 2: Dots overlay */}
      <rect x="0" y="0" width="100%" height="100%" fill="url(#global-pattern-dots)" />
    </svg>
  )
}

export default function LandingLayout() {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Global CAD Pattern Background */}
      <GlobalCADPattern />

      <Navbar />
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
