/**
 * Search Dialog Component
 *
 * Full-text search across documentation using Orama.
 * Supports fuzzy matching, keyboard navigation, and content highlighting.
 */

import { ArrowRight01Icon, CommandIcon, File02Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { initializeSearch, type SearchResult, searchDocs } from "@/lib/search-index"

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Initialize search engine on first open
  useEffect(() => {
    if (open && !isInitialized) {
      initializeSearch().then(() => {
        setIsInitialized(true)
      })
    }
  }, [open, isInitialized])

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const searchResults = await searchDocs(searchQuery, { limit: 8 })
      setResults(searchResults)
      setSelectedIndex(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 150)

    return () => clearTimeout(timer)
  }, [query, performSearch])

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
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm"
          />
          {isLoading && (
            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          )}
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
          {query && !isLoading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No results found for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <ul className="py-2">
              {results.map((result, index) => (
                <li key={result.id}>
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
                      {result.highlight && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {result.highlight}
                        </p>
                      )}
                    </div>
                    {result.score > 0 && (
                      <span className="text-[10px] text-muted-foreground/50 font-mono">
                        {Math.round(result.score * 100)}%
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!query && (
            <div className="px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm mb-4">
                Search for concepts like "Manning equation", "Froude number", or "installation"
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
          <div className="flex items-center gap-2">
            <span>{results.length} results</span>
            <span className="text-muted-foreground/50">• Powered by Orama</span>
          </div>
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
