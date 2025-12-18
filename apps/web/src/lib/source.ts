/**
 * CADHY Web - Documentation Source
 *
 * Sidebar configuration and navigation helpers for docs.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DocItem {
  slug: string
  title: string
  description?: string
}

export interface DocSection {
  slug: string
  title: string
  icon?: string
  items: DocItem[]
}

// ============================================================================
// SIDEBAR CONFIGURATION
// ============================================================================

export const DOCS_SIDEBAR: DocSection[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    icon: "rocket",
    items: [
      {
        slug: "introduction",
        title: "Introduction",
        description: "What is CADHY and why use it?",
      },
      {
        slug: "installation",
        title: "Installation",
        description: "Install CADHY on your system",
      },
      {
        slug: "quick-start",
        title: "Quick Start",
        description: "Create your first hydraulic analysis",
      },
    ],
  },
  {
    slug: "user-guide",
    title: "User Guide",
    icon: "book",
    items: [
      {
        slug: "index",
        title: "Overview",
        description: "Complete guide to using CADHY",
      },
      {
        slug: "interface",
        title: "Interface",
        description: "Understanding the main window",
      },
      {
        slug: "projects",
        title: "Projects",
        description: "Create and manage projects",
      },
      {
        slug: "channels",
        title: "Channel Design",
        description: "Design open channel sections",
      },
      {
        slug: "pipes",
        title: "Pipe Networks",
        description: "Model pressurized systems",
      },
      {
        slug: "results",
        title: "Results & Export",
        description: "View and export analysis results",
      },
    ],
  },
  {
    slug: "hydraulics",
    title: "Hydraulic Analysis",
    icon: "waves",
    items: [
      {
        slug: "index",
        title: "Overview",
        description: "Hydraulic calculation methods",
      },
      {
        slug: "channels",
        title: "Open Channels",
        description: "Manning equation and flow analysis",
      },
      {
        slug: "gvf",
        title: "GVF Analysis",
        description: "Gradually varied flow profiles",
      },
      {
        slug: "critical-flow",
        title: "Critical Flow",
        description: "Critical depth and Froude number",
      },
      {
        slug: "pipes",
        title: "Pipe Systems",
        description: "Pressurized flow analysis",
      },
    ],
  },
  {
    slug: "ai-features",
    title: "AI Features",
    icon: "sparkles",
    items: [
      {
        slug: "index",
        title: "Overview",
        description: "AI-powered hydraulic assistant",
      },
      {
        slug: "quick-start",
        title: "Quick Start",
        description: "Configure AI providers",
      },
      {
        slug: "prompts",
        title: "Effective Prompts",
        description: "Best practices for AI queries",
      },
    ],
  },
  {
    slug: "architecture",
    title: "Architecture",
    icon: "layers",
    items: [
      {
        slug: "overview",
        title: "System Overview",
        description: "How CADHY is built",
      },
      {
        slug: "project-structure",
        title: "Project Structure",
        description: "Repository layout and modules",
      },
      {
        slug: "hydraulics-engine",
        title: "Hydraulics Engine",
        description: "Core calculation algorithms",
      },
    ],
  },
  {
    slug: "technical-reference",
    title: "Technical Reference",
    icon: "code",
    items: [
      {
        slug: "index",
        title: "API Reference",
        description: "Complete API documentation",
      },
      {
        slug: "formulas",
        title: "Formulas",
        description: "Hydraulic equations used",
      },
    ],
  },
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Find a doc item by its full path (e.g., "getting-started/introduction")
 */
export function findDocByPath(path: string): {
  section: DocSection
  item: DocItem
} | null {
  const [sectionSlug, itemSlug = "index"] = path.split("/")

  const section = DOCS_SIDEBAR.find((s) => s.slug === sectionSlug)
  if (!section) return null

  const item = section.items.find((i) => i.slug === itemSlug)
  if (!item) return null

  return { section, item }
}

/**
 * Get the next and previous doc items for navigation
 */
export function getAdjacentDocs(path: string): {
  prev: { path: string; title: string } | null
  next: { path: string; title: string } | null
} {
  const allDocs: { path: string; title: string }[] = []

  for (const section of DOCS_SIDEBAR) {
    for (const item of section.items) {
      const docPath = item.slug === "index" ? section.slug : `${section.slug}/${item.slug}`
      allDocs.push({ path: docPath, title: item.title })
    }
  }

  const currentIndex = allDocs.findIndex((d) => d.path === path)
  if (currentIndex === -1) return { prev: null, next: null }

  return {
    prev: currentIndex > 0 ? allDocs[currentIndex - 1] : null,
    next: currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null,
  }
}

/**
 * Get breadcrumbs for a doc path
 */
export function getBreadcrumbs(path: string): { label: string; href: string }[] {
  const doc = findDocByPath(path)
  if (!doc) return []

  const breadcrumbs = [
    { label: "Docs", href: "#/docs" },
    { label: doc.section.title, href: `#/docs/${doc.section.slug}` },
  ]

  if (doc.item.slug !== "index") {
    breadcrumbs.push({
      label: doc.item.title,
      href: `#/docs/${doc.section.slug}/${doc.item.slug}`,
    })
  }

  return breadcrumbs
}

// Alias for compatibility
export const getBreadcrumb = getBreadcrumbs
