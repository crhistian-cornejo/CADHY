/**
 * Docs Breadcrumb with Mobile Menu
 *
 * Shows breadcrumb navigation with inline hamburger menu on mobile.
 * Design inspired by Graphite docs.
 */

import { Button, ScrollArea, Sheet, SheetClose, SheetContent, SheetTrigger } from "@cadhy/ui"
import { ArrowRight01Icon, Cancel01Icon, Menu01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { DOCS_SIDEBAR, type DocSection, getBreadcrumbs } from "@/lib/source"

export function DocsBreadcrumb() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const path = location.pathname.replace("/docs/", "").replace("/docs", "").replace(/^\//, "")
  const currentPath = path || "getting-started/introduction"
  const breadcrumbs = getBreadcrumbs(currentPath)

  // Don't show anything if no breadcrumbs
  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <div className="md:hidden sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-2.5">
        {/* Hamburger Menu Trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Open docs navigation"
            >
              <HugeiconsIcon icon={Menu01Icon} size={18} />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            hideDefaultClose
            className="w-[280px] p-0 bg-background/98 backdrop-blur-xl"
          >
            {/* Custom header with close button */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">Documentation</span>
              <SheetClose asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </button>
              </SheetClose>
            </div>
            <ScrollArea className="h-[calc(100vh-52px)]">
              <div className="p-4 space-y-6">
                {DOCS_SIDEBAR.map((section) => (
                  <MobileSidebarSection
                    key={section.slug}
                    section={section}
                    currentPath={currentPath}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm overflow-hidden">
          {breadcrumbs.slice(1).map((crumb, i, arr) => (
            <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={12}
                  className="text-muted-foreground shrink-0"
                />
              )}
              {i === arr.length - 1 ? (
                // Last item - not a link, bold
                <span className="font-medium text-foreground truncate">{crumb.label}</span>
              ) : (
                // Parent items - link, muted
                <Link
                  to={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>
    </div>
  )
}

function MobileSidebarSection({
  section,
  currentPath,
  onNavigate,
}: {
  section: DocSection
  currentPath: string
  onNavigate: () => void
}) {
  // Check if any item in this section is active
  const isExpanded = section.items.some((item) => {
    const itemPath = item.slug === "index" ? section.slug : `${section.slug}/${item.slug}`
    return currentPath === itemPath || currentPath.startsWith(section.slug)
  })

  const [isOpen, setIsOpen] = useState(isExpanded)

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full flex items-center justify-between
          py-2 text-sm font-medium
          text-foreground
          hover:text-primary
          transition-colors
        "
      >
        <span>{section.title}</span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={14}
          className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
      </button>

      {isOpen && (
        <ul className="mt-1 space-y-1 pl-3 border-l border-border">
          {section.items.map((item) => {
            const itemPath = item.slug === "index" ? section.slug : `${section.slug}/${item.slug}`
            const isActive = currentPath === itemPath

            return (
              <li key={item.slug}>
                <Link
                  to={`/docs/${itemPath}`}
                  onClick={onNavigate}
                  className={`
                    block py-2 pl-3 text-sm
                    border-l -ml-px
                    transition-colors
                    ${
                      isActive
                        ? "text-primary border-primary font-medium"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                    }
                  `}
                >
                  {item.title}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
