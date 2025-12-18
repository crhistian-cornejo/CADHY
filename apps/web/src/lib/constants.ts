/**
 * CADHY Web - Constants
 *
 * Landing page specs, downloads, and configuration.
 */

// ============================================================================
// TECHNICAL SPECIFICATIONS
// ============================================================================

export const SPECS = [
  { label: "ENGINE", value: "cadhy-hydraulics" },
  { label: "BACKEND", value: "Rust 2024 Edition" },
  { label: "FRONTEND", value: "React 19 + Three.js" },
  { label: "PRECISION", value: "64-bit floating point" },
  { label: "FORMATS", value: "CADHY, CSV, PDF, DXF" },
  { label: "PLATFORM", value: "Windows / macOS / Linux" },
] as const

// ============================================================================
// FEATURES
// ============================================================================

export const FEATURES = [
  {
    title: "Open Channel Flow",
    description:
      "Analyze trapezoidal, rectangular, circular, and custom channel sections with Manning equation and GVF profiles.",
    icon: "waves",
  },
  {
    title: "Pipe Networks",
    description:
      "Design and analyze pressurized pipe systems with Hardy Cross method and demand analysis.",
    icon: "pipeline",
  },
  {
    title: "AI Assistant",
    description:
      "Describe your hydraulic problem in natural language and let AI help with calculations and design.",
    icon: "sparkles",
  },
  {
    title: "Results Visualization",
    description:
      "Interactive water surface profiles, energy grade lines, and Froude number analysis.",
    icon: "chart",
  },
  {
    title: "3D Viewer",
    description: "Visualize channel geometry and flow conditions in real-time 3D environment.",
    icon: "cube",
  },
  {
    title: "Export & Reports",
    description:
      "Generate professional reports with detailed calculations and export to CAD formats.",
    icon: "file-export",
  },
] as const

// ============================================================================
// DOWNLOADS
// ============================================================================

export const RELEASES_REPO = "crhistian-cornejo/CADHY"
export const RELEASES_URL = `https://github.com/${RELEASES_REPO}/releases/latest`

export const DOWNLOADS = [
  {
    platform: "Windows",
    version: "0.1.0",
    architecture: "WIN64",
    size: "~180 MB",
    url: `${RELEASES_URL}/download/CADHY_0.1.0_x64-setup.exe`,
    filename: "CADHY_0.1.0_x64-setup.exe",
    comingSoon: false,
  },
  {
    platform: "macOS",
    version: "0.1.0",
    architecture: "ARM64 / Intel",
    size: "~150 MB",
    url: `${RELEASES_URL}/download/CADHY_0.1.0_aarch64.dmg`,
    filename: "CADHY_0.1.0_aarch64.dmg",
    comingSoon: false,
  },
  {
    platform: "Linux",
    version: "0.1.0",
    architecture: "x64",
    size: "~140 MB",
    url: "#",
    filename: "CADHY_0.1.0_amd64.AppImage",
    comingSoon: true,
  },
] as const

// ============================================================================
// FOOTER LINKS
// ============================================================================

export const FOOTER_SECTIONS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Roadmap", href: "/#roadmap" },
      { label: "Changelog", href: "/#changelog" },
      { label: "Downloads", href: "/#downloads" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#/docs" },
      { label: "Getting Started", href: "#/docs/getting-started/introduction" },
      { label: "API Reference", href: "#/docs/technical-reference" },
      { label: "GitHub", href: "https://github.com/crhistian-cornejo/CADHY" },
    ],
  },
  {
    title: "Engineering",
    links: [
      { label: "Open Channels", href: "#/docs/hydraulics/channels" },
      { label: "Pipe Networks", href: "#/docs/hydraulics/pipes" },
      { label: "GVF Analysis", href: "#/docs/hydraulics/gvf" },
      { label: "AI Integration", href: "#/docs/ai-features" },
    ],
  },
] as const

// ============================================================================
// NAVIGATION
// ============================================================================

export const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Roadmap", href: "/#roadmap" },
  { label: "Documentation", href: "#/docs" },
  { label: "GitHub", href: "https://github.com/crhistian-cornejo/CADHY", external: true },
] as const
