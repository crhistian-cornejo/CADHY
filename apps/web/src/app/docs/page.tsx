/**
 * Docs Page
 *
 * Renders MDX documentation content with frontmatter and TOC support.
 * Uses fumadocs-core for TOC extraction.
 */

import { Button } from "@cadhy/ui"
import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { DocsSEO } from "@/components/seo"
import { findDocByPath, getAdjacentDocs, getBreadcrumbs } from "@/lib/source"
import { type TocItem, useToc } from "@/lib/toc-context"

interface Frontmatter {
  title?: string
  description?: string
}

interface MdxModule {
  default: React.ComponentType
  frontmatter?: Frontmatter
  toc?: TocItem[]
}

// Import all MDX files dynamically
const mdxModules = import.meta.glob<MdxModule>("/content/docs/**/*.mdx")

export default function DocsPage() {
  const location = useLocation()
  const { setToc } = useToc()
  const [Content, setContent] = useState<React.ComponentType | null>(null)
  const [frontmatter, setFrontmatter] = useState<Frontmatter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract path from location
  const path =
    location.pathname.replace("/docs/", "").replace("/docs", "").replace(/^\//, "") ||
    "getting-started/introduction" // Default to intro

  const docInfo = findDocByPath(path)
  const adjacent = getAdjacentDocs(path)
  const breadcrumbs = getBreadcrumbs(path)

  useEffect(() => {
    async function loadContent() {
      setLoading(true)
      setError(null)
      setToc([])

      // Determine MDX file path
      const [section, item = "index"] = path.split("/")
      const mdxPath =
        item === "index"
          ? `/content/docs/${section}/index.mdx`
          : `/content/docs/${section}/${item}.mdx`

      // Try to load the MDX file
      let loader = mdxModules[mdxPath]
      if (!loader) {
        // Try without index
        const altPath = `/content/docs/${path}.mdx`
        loader = mdxModules[altPath]
        if (!loader) {
          setError(`Documentation page not found: ${path}`)
          setLoading(false)
          return
        }
      }

      try {
        const mod = await loader()
        setContent(() => mod.default)
        setFrontmatter(mod.frontmatter || null)

        // Set TOC from the module export
        if (mod.toc && Array.isArray(mod.toc)) {
          setToc(mod.toc)
        }
      } catch (e) {
        setError(`Failed to load documentation: ${e}`)
      }
      setLoading(false)
    }

    loadContent()
  }, [path, setToc])

  // Clear TOC when unmounting
  useEffect(() => {
    return () => setToc([])
  }, [setToc])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button render={<Link to="/docs/getting-started/introduction">Go to Introduction</Link>} />
      </div>
    )
  }

  // Use frontmatter title/description if available, fallback to source.ts data
  const title = frontmatter?.title || docInfo?.item.title
  const description = frontmatter?.description || docInfo?.item.description

  return (
    <div className="space-y-8">
      {/* SEO */}
      <DocsSEO pageTitle={title} />

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              <Link to={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>
      )}

      {/* Title */}
      {title && (
        <div>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          {description && <p className="text-lg text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Content */}
      <article className="prose">{Content && <Content />}</article>

      {/* Navigation */}
      <nav className="flex justify-between pt-8 border-t border-border">
        {adjacent.prev ? (
          <Link
            to={`/docs/${adjacent.prev.path}`}
            className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
          >
            <span className="text-sm text-muted-foreground">Previous</span>
            <span className="block font-medium">{adjacent.prev.title}</span>
          </Link>
        ) : (
          <div />
        )}
        {adjacent.next && (
          <Link
            to={`/docs/${adjacent.next.path}`}
            className="p-4 rounded-xl border border-border bg-card text-right hover:border-primary/50 transition-colors"
          >
            <span className="text-sm text-muted-foreground">Next</span>
            <span className="block font-medium">{adjacent.next.title}</span>
          </Link>
        )}
      </nav>
    </div>
  )
}
