#!/usr/bin/env bun
/**
 * Check Documentation
 *
 * Validates that key files and modules have proper documentation:
 * - JSDoc comments on exports
 * - README files in major directories
 * - .agents/ documentation is up to date
 *
 * Usage: bun run tools/check_docs/check_docs.ts
 */

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { glob } from "glob"

// ============================================================================
// TYPES
// ============================================================================

interface DocCheckResult {
  file: string
  hasModuleDoc: boolean
  exportCount: number
  documentedExports: number
  undocumentedExports: string[]
}

interface ReadmeCheckResult {
  directory: string
  hasReadme: boolean
  readmePath: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Directories that should have README.md
const README_REQUIRED_DIRS = [
  "apps/desktop",
  "apps/web",
  "packages/ui",
  "packages/shared",
  "packages/types",
  "crates/cadhy-cad",
  "crates/cadhy-desktop",
  "crates/cadhy-ifc",
  "tools",
  ".agents",
]

// Key files that should be documented
const KEY_FILES = [
  "apps/desktop/src/render/RE_texture_service.ts",
  "apps/desktop/src/operators/core/OP_types.ts",
  "apps/desktop/src/operators/core/OP_registry.ts",
  "apps/desktop/src/operators/core/OP_executor.ts",
  "apps/desktop/src/core/stores/modeller.ts",
  "apps/desktop/src/windowmanager/WM_hotkeys.ts",
]

// ============================================================================
// CHECK FUNCTIONS
// ============================================================================

/**
 * Check if a TypeScript file has proper documentation
 */
async function checkFileDocumentation(filePath: string): Promise<DocCheckResult> {
  const content = await readFile(filePath, "utf-8")

  // Check for module-level documentation
  const hasModuleDoc = /^\/\*\*[\s\S]*?\*\//.test(content.trim())

  // Find all exports
  const exportMatches = content.matchAll(
    /export\s+(async\s+)?(?:function|const|class|interface|type|enum)\s+(\w+)/g
  )
  const exports = [...exportMatches].map((m) => m[2])

  // Check which exports have JSDoc
  const documentedExports: string[] = []
  const undocumentedExports: string[] = []

  for (const exp of exports) {
    // Look for JSDoc comment before the export
    const pattern = new RegExp(`\\/\\*\\*[\\s\\S]*?\\*\\/\\s*export[^]*?${exp}`, "g")
    if (pattern.test(content)) {
      documentedExports.push(exp)
    } else {
      undocumentedExports.push(exp)
    }
  }

  return {
    file: filePath,
    hasModuleDoc,
    exportCount: exports.length,
    documentedExports: documentedExports.length,
    undocumentedExports,
  }
}

/**
 * Check if directory has README
 */
function checkReadme(directory: string): ReadmeCheckResult {
  const readmePath = path.join(directory, "README.md")
  return {
    directory,
    hasReadme: existsSync(readmePath),
    readmePath,
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("Checking documentation...\n")

  // Check README files
  console.log("README.md Status:")
  console.log("─".repeat(60))

  const readmeResults = README_REQUIRED_DIRS.map(checkReadme)
  const missingReadmes = readmeResults.filter((r) => !r.hasReadme)

  for (const result of readmeResults) {
    const status = result.hasReadme ? "✓" : "✗"
    const color = result.hasReadme ? "\x1b[32m" : "\x1b[31m"
    console.log(`${color}${status}\x1b[0m ${result.directory}/README.md`)
  }

  // Check key file documentation
  console.log("\n\nKey File Documentation:")
  console.log("─".repeat(60))

  const fileResults: DocCheckResult[] = []

  for (const file of KEY_FILES) {
    if (!existsSync(file)) {
      console.log(`\x1b[33m?\x1b[0m ${file} (not found)`)
      continue
    }

    const result = await checkFileDocumentation(file)
    fileResults.push(result)

    const moduleStatus = result.hasModuleDoc ? "✓" : "✗"
    const exportRatio = `${result.documentedExports}/${result.exportCount}`
    const color =
      result.hasModuleDoc && result.undocumentedExports.length === 0 ? "\x1b[32m" : "\x1b[33m"

    console.log(`${color}${moduleStatus}\x1b[0m ${file}`)
    console.log(`    Exports: ${exportRatio} documented`)

    if (result.undocumentedExports.length > 0 && result.undocumentedExports.length <= 5) {
      console.log(`    Missing: ${result.undocumentedExports.join(", ")}`)
    }
  }

  // Summary
  console.log("\n\nSummary:")
  console.log("─".repeat(60))
  console.log(
    `README files: ${readmeResults.filter((r) => r.hasReadme).length}/${readmeResults.length}`
  )
  console.log(`Key files checked: ${fileResults.length}`)
  console.log(
    `Files with module docs: ${fileResults.filter((r) => r.hasModuleDoc).length}/${fileResults.length}`
  )

  const totalExports = fileResults.reduce((sum, r) => sum + r.exportCount, 0)
  const totalDocumented = fileResults.reduce((sum, r) => sum + r.documentedExports, 0)
  console.log(`Documented exports: ${totalDocumented}/${totalExports}`)

  if (missingReadmes.length > 0) {
    console.log(`\n\x1b[33mWarning: ${missingReadmes.length} directories missing README.md\x1b[0m`)
    process.exit(1)
  }
}

main().catch(console.error)
