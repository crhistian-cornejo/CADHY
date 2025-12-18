/**
 * Docs Layout
 *
 * Three-column layout for documentation pages.
 * Uses @cadhy/ui components and hugeicons.
 */

import { ScrollArea } from "@cadhy/ui"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useRef, useState } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { DOCS_SIDEBAR, type DocSection } from "@/lib/source"
import { TocProvider, useToc } from "@/lib/toc-context"

export default function DocsLayout() {
  return (
    <TocProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex">
          {/* Left Sidebar - Navigation */}
          <aside className="hidden md:block w-64 shrink-0 border-r border-border sticky top-16 h-[calc(100vh-4rem)]">
            <ScrollArea className="h-full py-6 px-4">
              <Sidebar />
            </ScrollArea>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0 p-6 md:p-8 lg:p-12">
            <div className="max-w-3xl mx-auto lg:mx-0">
              <Outlet />
            </div>
          </main>

          {/* Right Sidebar - TOC */}
          <aside className="hidden lg:block w-56 shrink-0 border-l border-border sticky top-16 h-[calc(100vh-4rem)]">
            <ScrollArea className="h-full py-6 px-4">
              <TocSidebar />
            </ScrollArea>
          </aside>
        </div>
        <Footer />
      </div>
    </TocProvider>
  )
}

function Sidebar() {
  const location = useLocation()
  const currentPath = location.pathname.replace("/docs/", "").replace("/docs", "")

  return (
    <div className="space-y-6">
      {DOCS_SIDEBAR.map((section) => (
        <SidebarSection key={section.slug} section={section} currentPath={currentPath} />
      ))}
    </div>
  )
}

function SidebarSection({ section, currentPath }: { section: DocSection; currentPath: string }) {
  const [isOpen, setIsOpen] = useState(() => {
    return section.items.some((item) => {
      const itemPath = item.slug === "index" ? section.slug : `${section.slug}/${item.slug}`
      return currentPath === itemPath || currentPath.startsWith(section.slug)
    })
  })

  return (
    <div>
      <button
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
                  className={`
                    block py-1.5 pl-3 text-sm
                    border-l -ml-px
                    transition-colors
                    ${
                      isActive
                        ? "text-primary border-primary"
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

function TocSidebar() {
  const { toc } = useToc()
  const [activeId, setActiveId] = useState<string>("")
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Set up intersection observer to highlight active heading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      {
        rootMargin: "-80px 0px -80% 0px",
        threshold: 0,
      }
    )

    // Observe all headings
    const headings = document.querySelectorAll("article h2, article h3, article h4")
    headings.forEach((heading) => {
      observerRef.current?.observe(heading)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  if (toc.length === 0) {
    return null
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-foreground mb-4">On this page</h4>
      <ul className="space-y-2">
        {toc.map((item, index) => {
          const id = item.url.replace("#", "")
          const isActive = activeId === id
          const indent = item.depth === 3 ? "pl-3" : item.depth === 4 ? "pl-6" : ""

          return (
            <li key={`${item.url}-${index}`}>
              <a
                href={item.url}
                onClick={(e) => {
                  e.preventDefault()
                  const element = document.getElementById(id)
                  if (element) {
                    const navbarHeight = 80
                    const elementPosition = element.getBoundingClientRect().top + window.scrollY
                    window.scrollTo({
                      top: elementPosition - navbarHeight,
                      behavior: "smooth",
                    })
                  }
                }}
                className={`
                  block text-sm py-1 transition-colors
                  ${indent}
                  ${
                    isActive
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {item.title}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
