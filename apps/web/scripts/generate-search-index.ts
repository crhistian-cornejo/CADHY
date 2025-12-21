/**
 * Generate Search Index Script
 *
 * Reads all MDX files in content/docs and generates a JSON search index.
 * Run with: bun run generate-search-index
 */

import * as fs from "node:fs"
import * as path from "node:path"

interface SearchDocument {
  id: string
  title: string
  section: string
  sectionSlug: string
  url: string
  description: string
  content: string
  headings: string[]
}

const DOCS_DIR = path.join(import.meta.dirname, "../content/docs")
const OUTPUT_FILE = path.join(import.meta.dirname, "../src/lib/search-data.json")

function extractFrontmatter(content: string): { title: string; description: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) {
    return { title: "Untitled", description: "" }
  }

  const frontmatter = frontmatterMatch[1]
  const titleMatch = frontmatter.match(/title:\s*(.+)/)
  const descriptionMatch = frontmatter.match(/description:\s*(.+)/)

  return {
    title: titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : "Untitled",
    description: descriptionMatch ? descriptionMatch[1].trim().replace(/^["']|["']$/g, "") : "",
  }
}

function extractHeadings(content: string): string[] {
  const headings: string[] = []
  const headingRegex = /^#{2,4}\s+(.+)$/gm
  let match: RegExpExecArray | null = null

  match = headingRegex.exec(content)
  while (match !== null) {
    headings.push(match[1].trim())
    match = headingRegex.exec(content)
  }

  return headings
}

function extractTextContent(content: string): string {
  // Remove frontmatter
  let text = content.replace(/^---\n[\s\S]*?\n---\n?/, "")

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, "")

  // Remove inline code
  text = text.replace(/`[^`]+`/g, "")

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "")

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, "")

  // Remove headings markers
  text = text.replace(/^#{1,6}\s+/gm, "")

  // Remove bold/italic markers
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1")
  text = text.replace(/\*([^*]+)\*/g, "$1")
  text = text.replace(/__([^_]+)__/g, "$1")
  text = text.replace(/_([^_]+)_/g, "$1")

  // Remove list markers
  text = text.replace(/^[-*+]\s+/gm, "")
  text = text.replace(/^\d+\.\s+/gm, "")

  // Remove table formatting
  text = text.replace(/\|/g, " ")
  text = text.replace(/^[-:]+$/gm, "")

  // Collapse whitespace
  text = text.replace(/\n+/g, " ")
  text = text.replace(/\s+/g, " ")

  return text.trim()
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function generateSearchIndex(): SearchDocument[] {
  const documents: SearchDocument[] = []

  // Get all section directories
  const sections = fs
    .readdirSync(DOCS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  for (const sectionSlug of sections) {
    const sectionDir = path.join(DOCS_DIR, sectionSlug)
    const sectionTitle = slugToTitle(sectionSlug)

    // Get all MDX files in the section
    const files = fs.readdirSync(sectionDir).filter((file) => file.endsWith(".mdx"))

    for (const file of files) {
      const filePath = path.join(sectionDir, file)
      const content = fs.readFileSync(filePath, "utf-8")

      const { title, description } = extractFrontmatter(content)
      const headings = extractHeadings(content)
      const textContent = extractTextContent(content)

      const itemSlug = file.replace(".mdx", "")
      const isIndex = itemSlug === "index"
      const url = isIndex ? `/docs/${sectionSlug}` : `/docs/${sectionSlug}/${itemSlug}`
      const id = `${sectionSlug}-${itemSlug}`

      documents.push({
        id,
        title,
        section: sectionTitle,
        sectionSlug,
        url,
        description,
        content: textContent,
        headings,
      })
    }
  }

  return documents
}

// Main
console.log("📚 Generating search index...")

const documents = generateSearchIndex()

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(documents, null, 2))

console.log(`✅ Generated search index with ${documents.length} documents`)
console.log(`📄 Output: ${OUTPUT_FILE}`)

// Also print a summary
for (const doc of documents) {
  console.log(`   - ${doc.section} > ${doc.title}`)
}
