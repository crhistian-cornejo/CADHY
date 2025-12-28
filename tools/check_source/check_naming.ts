#!/usr/bin/env bun

/**
 * Check Naming Conventions
 *
 * Validates that files follow CADHY's Blender-inspired naming conventions:
 * - ED_* for editors
 * - OP_* for operators
 * - WM_* for window manager
 * - UI_* for interface
 * - RE_* for render
 * - ST_* for stores
 * - SV_* for services
 * - KE_* for kernel
 * - IC_* for icons
 * - UT_* for utilities
 *
 * Usage: bun run tools/check_source/check_naming.ts [--fix]
 */

import path from "node:path"
import { glob } from "glob"

// Define expected prefixes for each directory
const DIRECTORY_PREFIXES: Record<string, string[]> = {
  "editors/space_view3d": ["ED_view3d_"],
  "editors/space_properties": ["ED_props_"],
  "editors/space_outliner": ["ED_outliner_"],
  "editors/space_timeline": ["ED_timeline_"],
  "editors/space_drawing": ["ED_draw_"],
  "editors/space_projects": ["ED_project_"],
  "editors/space_results": ["ED_results_"],
  "editors/space_gallery": ["ED_gallery_"],
  "editors/space_ai": ["ED_ai_"],
  "editors/space_cadras": ["ED_cadras_"],
  "operators/create": ["OP_create_"],
  "operators/context": ["OP_"],
  "operators/interactive": ["OP_interactive_"],
  windowmanager: ["WM_"],
  "interface/common": ["UI_"],
  "interface/dialogs": ["UI_"],
  "interface/settings": ["UI_settings_"],
  "interface/onboarding": ["UI_onboarding_"],
  render: ["RE_"],
  "render/meshes": ["RE_"],
  "render/cache": ["RE_"],
  "stores/slices": ["ST_"],
  services: ["SV_"],
  kernel: ["KE_"],
  "lib/icons": ["IC_"],
  "lib/utils": ["UT_"],
}

// Files to ignore (index files, types, etc.)
const IGNORE_PATTERNS = [
  "index.ts",
  "types.ts",
  "*.test.ts",
  "*.spec.ts",
  "use-*.ts", // hooks keep their naming
]

interface ValidationResult {
  file: string
  expected: string[]
  actual: string
  valid: boolean
}

async function checkNaming(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []
  const srcDir = "apps/desktop/src"

  for (const [dir, prefixes] of Object.entries(DIRECTORY_PREFIXES)) {
    const fullPath = path.join(srcDir, dir)
    const files = await glob(`${fullPath}/*.{ts,tsx}`, { ignore: IGNORE_PATTERNS })

    for (const file of files) {
      const filename = path.basename(file)

      // Skip index and type files
      if (IGNORE_PATTERNS.some((p) => filename.match(new RegExp(p.replace("*", ".*"))))) {
        continue
      }

      const valid = prefixes.some((prefix) => filename.startsWith(prefix))

      results.push({
        file: file.replace(srcDir + "/", ""),
        expected: prefixes,
        actual: filename,
        valid,
      })
    }
  }

  return results
}

async function main() {
  console.log("Checking naming conventions...\n")

  const results = await checkNaming()
  const invalid = results.filter((r) => !r.valid)
  const valid = results.filter((r) => r.valid)

  if (invalid.length > 0) {
    console.log("Files with incorrect naming:\n")
    for (const r of invalid) {
      console.log(`  ${r.file}`)
      console.log(`    Expected prefix: ${r.expected.join(" or ")}`)
      console.log(`    Actual: ${r.actual}\n`)
    }
  }

  console.log(`\nSummary:`)
  console.log(`  Valid: ${valid.length}`)
  console.log(`  Invalid: ${invalid.length}`)
  console.log(`  Total: ${results.length}`)

  if (invalid.length > 0) {
    process.exit(1)
  }
}

main().catch(console.error)
