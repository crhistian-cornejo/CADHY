/**
 * Logo Component
 *
 * CADHY logo with automatic base path handling for GitHub Pages.
 */

interface LogoProps {
  className?: string
}

// Get base path from Vite (handles GitHub Pages deployment)
const basePath = import.meta.env.BASE_URL || "/"

export function Logo({ className = "h-8 w-8" }: LogoProps) {
  return <img src={`${basePath}logo.png`} alt="CADHY" className={className} />
}
