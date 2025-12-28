#!/usr/bin/env bun

/**
 * Project Statistics
 *
 * Generates statistics about the codebase:
 * - Lines of code by language
 * - File counts by type
 * - Package sizes
 * - Dependency counts
 *
 * Usage: bun run tools/utils/stats.ts
 */

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { $ } from "bun"
import { glob } from "glob"

// ============================================================================
// TYPES
// ============================================================================

interface LanguageStats {
  language: string
  files: number
  lines: number
  blank: number
  comment: number
  code: number
}

interface PackageInfo {
  name: string
  path: string
  dependencies: number
  devDependencies: number
}

// ============================================================================
// FUNCTIONS
// ============================================================================

async function countLines(pattern: string): Promise<{ files: number; lines: number }> {
  const files = await glob(pattern, {
    ignore: ["**/node_modules/**", "**/target/**", "**/dist/**", "**/.turbo/**"],
  })

  let totalLines = 0
  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8")
      totalLines += content.split("\n").length
    } catch {
      // Skip unreadable files
    }
  }

  return { files: files.length, lines: totalLines }
}

async function getPackageInfo(packagePath: string): Promise<PackageInfo | null> {
  const pkgJsonPath = `${packagePath}/package.json`
  if (!existsSync(pkgJsonPath)) return null

  try {
    const content = await readFile(pkgJsonPath, "utf-8")
    const pkg = JSON.parse(content)

    return {
      name: pkg.name || packagePath,
      path: packagePath,
      dependencies: Object.keys(pkg.dependencies || {}).length,
      devDependencies: Object.keys(pkg.devDependencies || {}).length,
    }
  } catch {
    return null
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("CADHY Project Statistics")
  console.log("═".repeat(60))
  console.log()

  // Language statistics
  console.log("\x1b[36mCode by Language:\x1b[0m")
  console.log("─".repeat(60))

  const languages = [
    { name: "TypeScript", pattern: "**/*.{ts,tsx}", color: "\x1b[34m" },
    { name: "Rust", pattern: "**/*.rs", color: "\x1b[33m" },
    { name: "CSS", pattern: "**/*.css", color: "\x1b[35m" },
    { name: "JSON", pattern: "**/*.json", color: "\x1b[32m" },
    { name: "Markdown", pattern: "**/*.md", color: "\x1b[37m" },
    { name: "TOML", pattern: "**/*.toml", color: "\x1b[36m" },
  ]

  let totalFiles = 0
  let totalLines = 0

  for (const lang of languages) {
    const stats = await countLines(lang.pattern)
    totalFiles += stats.files
    totalLines += stats.lines

    const filesStr = stats.files.toString().padStart(5)
    const linesStr = stats.lines.toLocaleString().padStart(10)
    console.log(`${lang.color}${lang.name.padEnd(15)}\x1b[0m ${filesStr} files  ${linesStr} lines`)
  }

  console.log("─".repeat(60))
  console.log(
    `${"Total".padEnd(15)} ${totalFiles.toString().padStart(5)} files  ${totalLines.toLocaleString().padStart(10)} lines`
  )

  // Package information
  console.log()
  console.log("\x1b[36mPackages:\x1b[0m")
  console.log("─".repeat(60))

  const packageDirs = [
    "apps/desktop",
    "apps/web",
    "packages/ui",
    "packages/shared",
    "packages/types",
  ]

  let totalDeps = 0
  let totalDevDeps = 0

  for (const dir of packageDirs) {
    const info = await getPackageInfo(dir)
    if (!info) continue

    totalDeps += info.dependencies
    totalDevDeps += info.devDependencies

    console.log(
      `${info.name.padEnd(25)} deps: ${info.dependencies.toString().padStart(3)}  devDeps: ${info.devDependencies.toString().padStart(3)}`
    )
  }

  console.log("─".repeat(60))
  console.log(
    `${"Total".padEnd(25)} deps: ${totalDeps.toString().padStart(3)}  devDeps: ${totalDevDeps.toString().padStart(3)}`
  )

  // Rust crates
  console.log()
  console.log("\x1b[36mRust Crates:\x1b[0m")
  console.log("─".repeat(60))

  const crateStats = await countLines("crates/**/*.rs")
  console.log(
    `Crates: ${crateStats.files} files, ${crateStats.lines.toLocaleString()} lines of Rust`
  )

  // Tools
  console.log()
  console.log("\x1b[36mDevelopment Tools:\x1b[0m")
  console.log("─".repeat(60))

  const toolStats = await countLines("tools/**/*.ts")
  console.log(`Tools: ${toolStats.files} scripts, ${toolStats.lines.toLocaleString()} lines`)

  // Summary
  console.log()
  console.log("═".repeat(60))
  console.log(
    `\x1b[32mTotal: ${totalFiles} files, ${totalLines.toLocaleString()} lines of code\x1b[0m`
  )
}

main().catch(console.error)
