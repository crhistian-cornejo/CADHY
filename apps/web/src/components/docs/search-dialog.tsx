/**
 * Search Dialog Component
 *
 * Full-text search across documentation with keyboard navigation.
 */

import { ArrowRight01Icon, CommandIcon, File02Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { DOCS_SIDEBAR } from "@/lib/source"

interface SearchResult {
  title: string
  section: string
  url: string
  description?: string
}

// Build search index from sidebar data
function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = []
  for (const section of DOCS_SIDEBAR) {
    for (const item of section.items) {
      results.push({
        title: item.title,
        section: section.title,
        url: `/docs/${section.slug}/${item.slug}`,
        description: item.description,
      })
    }
  }
  return results
}

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const searchIndex = useRef<SearchResult[]>(buildSearchIndex())

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Search logic
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    const lowerQuery = searchQuery.toLowerCase()
    const filtered = searchIndex.current.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.section.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery)
    )
    setResults(filtered)
    setSelectedIndex(0)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault()
        navigate(results[selectedIndex].url)
        onOpenChange(false)
      } else if (e.key === "Escape") {
        onOpenChange(false)
      }
    },
    [results, selectedIndex, navigate, onOpenChange]
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        onKeyDown={() => {}}
        role="button"
        tabIndex={-1}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl mx-4 bg-background border border-border shadow-2xl rounded-lg overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <HugeiconsIcon icon={Search01Icon} size={20} className="text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              performSearch(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted text-muted-foreground font-mono rounded">
              esc
            </kbd>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="sr-only">Close</span>
            &times;
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query && results.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No results found for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <ul className="py-2">
              {results.map((result, index) => (
                <li key={result.url}>
                  <Link
                    to={result.url}
                    onClick={() => onOpenChange(false)}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      index === selectedIndex
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <HugeiconsIcon
                      icon={File02Icon}
                      size={16}
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{result.section}</span>
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          size={12}
                          className="text-muted-foreground"
                        />
                        <span className="font-medium text-foreground">{result.title}</span>
                      </div>
                      {result.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {result.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!query && (
            <div className="px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm mb-4">
                Start typing to search the documentation
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>Quick navigation:</span>
                <kbd className="px-1.5 py-0.5 bg-muted text-muted-foreground font-mono rounded flex items-center gap-1">
                  <HugeiconsIcon icon={CommandIcon} size={12} />K
                </kbd>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted text-muted-foreground font-mono rounded">↑↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted text-muted-foreground font-mono rounded">↵</kbd>
              to select
            </span>
          </div>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  )
}

// Hook to manage search dialog
export function useSearchDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return { open, setOpen }
}
