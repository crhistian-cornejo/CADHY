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
    title: "3D Channel Modeling",
    description:
      "Create rectangular, trapezoidal, and triangular open channels with real-time 3D visualization.",
    icon: "cube",
  },
  {
    title: "Hydraulic Analysis",
    description:
      "Calculate normal depth, critical depth, Froude number, and flow characteristics using Manning's equation.",
    icon: "waves",
  },
  {
    title: "Hydraulic Structures",
    description:
      "Design transitions, drops, chutes, and energy dissipation basins (USBR Types I-IV, SAF).",
    icon: "pipeline",
  },
  {
    title: "Water Surface Profiles",
    description:
      "Compute gradually varied flow (GVF) profiles using the Standard Step Method with M1, M2, S1, S2 classification.",
    icon: "chart",
  },
  {
    title: "CAD Export",
    description:
      "Export geometry to STL, OBJ, STEP, and glTF formats for use in other CAD software.",
    icon: "file-export",
  },
  {
    title: "AI Assistant",
    description:
      "Multi-provider support (Claude, GPT, Gemini) with streaming responses to help with hydraulic calculations.",
    icon: "sparkles",
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
