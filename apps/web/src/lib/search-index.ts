/**
 * Search Index for Documentation
 *
 * Full-text search using Orama with content from generated JSON.
 * The JSON is generated at build time from MDX files via:
 *   bun run generate-search-index
 */

import { create, insert, type Orama, type SearchParams, search } from "@orama/orama"
import searchData from "./search-data.json"

// ============================================================================
// TYPES
// ============================================================================

export interface SearchDocument {
  id: string
  title: string
  section: string
  sectionSlug: string
  url: string
  description: string
  content: string
  headings: string[]
}

export interface SearchResult {
  id: string
  title: string
  section: string
  sectionSlug: string
  url: string
  description: string
  content: string
  score: number
  highlight?: string
}

// ============================================================================
// SEARCH ENGINE
// ============================================================================

let searchDb: Orama<typeof schema> | null = null

const schema = {
  id: "string" as const,
  title: "string" as const,
  section: "string" as const,
  sectionSlug: "string" as const,
  url: "string" as const,
  description: "string" as const,
  content: "string" as const,
  headings: "string[]" as const,
}

/**
 * Initialize the search database
 */
export async function initializeSearch(): Promise<void> {
  if (searchDb) return

  searchDb = await create({ schema })

  for (const doc of searchData as SearchDocument[]) {
    await insert(searchDb, doc)
  }
}

/**
 * Search the documentation
 */
export async function searchDocs(
  query: string,
  options?: { limit?: number }
): Promise<SearchResult[]> {
  if (!searchDb) {
    await initializeSearch()
  }

  if (!query.trim() || !searchDb) {
    return []
  }

  const searchParams: SearchParams<Orama<typeof schema>, typeof schema> = {
    term: query,
    properties: ["title", "content", "description", "headings"],
    limit: options?.limit ?? 10,
    threshold: 0.3, // Fuzzy matching threshold
    boost: {
      title: 3,
      headings: 2,
      description: 1.5,
      content: 1,
    },
  }

  const results = await search(searchDb, searchParams)

  return results.hits.map((hit) => {
    const doc = hit.document as unknown as SearchDocument
    const highlight = extractHighlight(doc.content, query)

    return {
      id: doc.id,
      title: doc.title,
      section: doc.section,
      sectionSlug: doc.sectionSlug,
      url: doc.url,
      description: doc.description,
      content: doc.content,
      score: hit.score,
      highlight,
    }
  })
}

/**
 * Extract a relevant snippet with the search term highlighted
 */
function extractHighlight(content: string, query: string): string {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerContent.indexOf(lowerQuery)

  if (index === -1) {
    // No exact match, return first 150 chars
    return `${content.slice(0, 150)}...`
  }

  // Get context around the match
  const start = Math.max(0, index - 50)
  const end = Math.min(content.length, index + query.length + 100)
  let snippet = content.slice(start, end)

  // Add ellipsis if we're not at the boundaries
  if (start > 0) snippet = `...${snippet}`
  if (end < content.length) snippet = `${snippet}...`

  return snippet
}

/**
 * Get all indexed documents (for debugging)
 */
export function getAllDocs(): SearchDocument[] {
  return searchData as SearchDocument[]
}
