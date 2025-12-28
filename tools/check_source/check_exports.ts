#!/usr/bin/env bun
/**
 * Check Barrel Exports
 *
 * Validates that all modules in a directory are properly exported
 * through their index.ts barrel file.
 *
 * Usage: bun run tools/check_source/check_exports.ts
 */

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { glob } from "glob"

interface ExportCheckResult {
  directory: string
  hasIndex: boolean
  modules: string[]
  exported: string[]
  missing: string[]
}

// Directories that should have barrel exports
const BARREL_DIRECTORIES = [
  "editors/space_view3d",
  "editors/space_view3d/panels",
  "editors/space_view3d/toolbars",
  "editors/space_view3d/camera",
  "editors/space_properties",
  "editors/space_properties/sections",
  "editors/space_properties/types",
  "editors/space_properties/states",
  "editors/space_properties/previews",
  "editors/space_outliner",
  "editors/space_timeline",
  "editors/space_drawing",
  "editors/space_drawing/dialogs",
  "editors/space_projects",
  "editors/space_results",
  "editors/space_gallery",
  "editors/space_ai",
  "editors/space_cadras",
  "operators/create",
  "operators/context",
  "operators/interactive",
  "windowmanager",
  "interface/common",
  "interface/dialogs",
  "interface/settings",
  "interface/onboarding",
  "interface/properties",
  "render",
  "render/meshes",
  "render/cache",
  "render/pool",
  "stores/slices",
  "services",
  "kernel",
  "lib/icons",
  "lib/utils",
  "hooks",
]

async function checkExports(): Promise<ExportCheckResult[]> {
  const results: ExportCheckResult[] = []
  const srcDir = "apps/desktop/src"

  for (const dir of BARREL_DIRECTORIES) {
    const fullPath = path.join(srcDir, dir)
    const indexPath = path.join(fullPath, "index.ts")

    // Get all TypeScript files in directory
    const files = await glob(`${fullPath}/*.{ts,tsx}`)
    const modules = files
      .map((f) => path.basename(f, path.extname(f)))
      .filter((f) => f !== "index" && !f.endsWith(".test") && !f.endsWith(".spec"))

    // Check if index.ts exists
    const hasIndex = existsSync(indexPath)

    let exported: string[] = []
    if (hasIndex) {
      const content = await readFile(indexPath, "utf-8")
      // Extract module names from export statements
      const exportMatches = content.matchAll(/from\s+["']\.\/([^"']+)["']/g)
      exported = [...exportMatches].map((m) => m[1])
    }

    const missing = modules.filter((m) => !exported.includes(m))

    results.push({
      directory: dir,
      hasIndex,
      modules,
      exported,
      missing,
    })
  }

  return results
}

async function main() {
  console.log("Checking barrel exports...\n")

  const results = await checkExports()

  const missingIndex = results.filter((r) => !r.hasIndex)
  const missingExports = results.filter((r) => r.hasIndex && r.missing.length > 0)

  if (missingIndex.length > 0) {
    console.log("Directories missing index.ts:\n")
    for (const r of missingIndex) {
      console.log(`  ${r.directory}/`)
      console.log(`    Modules: ${r.modules.join(", ")}\n`)
    }
  }

  if (missingExports.length > 0) {
    console.log("\nDirectories with missing exports:\n")
    for (const r of missingExports) {
      console.log(`  ${r.directory}/index.ts`)
      console.log(`    Missing: ${r.missing.join(", ")}\n`)
    }
  }

  const totalModules = results.reduce((sum, r) => sum + r.modules.length, 0)
  const totalExported = results.reduce((sum, r) => sum + r.exported.length, 0)
  const totalMissing = results.reduce((sum, r) => sum + r.missing.length, 0)

  console.log(`\nSummary:`)
  console.log(`  Directories checked: ${results.length}`)
  console.log(`  Directories with index.ts: ${results.filter((r) => r.hasIndex).length}`)
  console.log(`  Total modules: ${totalModules}`)
  console.log(`  Total exported: ${totalExported}`)
  console.log(`  Total missing: ${totalMissing}`)

  if (missingIndex.length > 0 || missingExports.length > 0) {
    process.exit(1)
  }
}

main().catch(console.error)
