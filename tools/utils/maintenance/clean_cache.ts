#!/usr/bin/env bun

/**
 * Clean Cache
 *
 * Cleans various caches and build artifacts:
 * - Turbo cache (.turbo)
 * - Bun cache
 * - Rust target directories
 * - Node modules (optional)
 * - TypeScript build info
 *
 * Usage: bun run tools/utils_maintenance/clean_cache.ts [--all]
 */

import { existsSync, rmSync, statSync } from "node:fs"
import { $ } from "bun"
import { glob } from "glob"

// ============================================================================
// CONFIGURATION
// ============================================================================

interface CacheTarget {
  name: string
  path: string | string[]
  description: string
  critical: boolean // If true, requires --all flag
}

const CACHE_TARGETS: CacheTarget[] = [
  {
    name: "Turbo",
    path: ".turbo",
    description: "Turborepo cache",
    critical: false,
  },
  {
    name: "Bun",
    path: ".bun",
    description: "Bun cache",
    critical: false,
  },
  {
    name: "TypeScript Build",
    path: "**/tsconfig.tsbuildinfo",
    description: "TypeScript incremental build cache",
    critical: false,
  },
  {
    name: "Vite Cache",
    path: "**/node_modules/.vite",
    description: "Vite pre-bundled dependencies",
    critical: false,
  },
  {
    name: "Rust Target",
    path: "**/target",
    description: "Rust compilation artifacts",
    critical: true,
  },
  {
    name: "Node Modules",
    path: "**/node_modules",
    description: "npm/bun dependencies",
    critical: true,
  },
  {
    name: "Dist",
    path: "**/dist",
    description: "Build output directories",
    critical: false,
  },
]

// ============================================================================
// FUNCTIONS
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function getDirectorySize(dir: string): number {
  try {
    const output = Bun.spawnSync(["du", "-s", "-b", dir]).stdout.toString()
    return parseInt(output.split("\t")[0]) || 0
  } catch {
    return 0
  }
}

async function findPaths(pattern: string): Promise<string[]> {
  if (pattern.includes("*")) {
    return glob(pattern, { ignore: ["**/node_modules/**/node_modules/**"] })
  }
  return existsSync(pattern) ? [pattern] : []
}

async function cleanTarget(
  target: CacheTarget,
  dryRun: boolean
): Promise<{ cleaned: number; size: number }> {
  const paths = await findPaths(target.path as string)
  let totalSize = 0

  for (const p of paths) {
    if (!existsSync(p)) continue

    const size = getDirectorySize(p)
    totalSize += size

    if (!dryRun) {
      try {
        rmSync(p, { recursive: true, force: true })
      } catch (error) {
        console.error(`  Failed to remove ${p}: ${error}`)
      }
    }
  }

  return { cleaned: paths.length, size: totalSize }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const cleanAll = args.includes("--all")
  const dryRun = args.includes("--dry-run")

  console.log("Cache Cleaner")
  console.log("═".repeat(60))

  if (dryRun) {
    console.log("\x1b[33m(Dry run - no files will be deleted)\x1b[0m")
  }

  console.log()

  let totalCleaned = 0
  let totalSize = 0

  for (const target of CACHE_TARGETS) {
    // Skip critical targets unless --all
    if (target.critical && !cleanAll) {
      console.log(`\x1b[90m○ ${target.name} (skipped - use --all)\x1b[0m`)
      continue
    }

    process.stdout.write(`● ${target.name}...`)
    const result = await cleanTarget(target, dryRun)

    if (result.cleaned > 0) {
      console.log(
        `\r\x1b[32m✓\x1b[0m ${target.name}: ${result.cleaned} item(s), ${formatSize(result.size)}`
      )
      totalCleaned += result.cleaned
      totalSize += result.size
    } else {
      console.log(`\r\x1b[90m○\x1b[0m ${target.name}: nothing to clean`)
    }
  }

  console.log()
  console.log("─".repeat(60))
  console.log(
    `Total: ${totalCleaned} item(s), ${formatSize(totalSize)} ${dryRun ? "(would be) " : ""}freed`
  )

  if (!cleanAll) {
    console.log()
    console.log("Tip: Use --all to also clean node_modules and Rust target")
  }

  if (dryRun) {
    console.log()
    console.log("Run without --dry-run to actually delete files")
  }
}

main().catch(console.error)
