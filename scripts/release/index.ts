#!/usr/bin/env bun

/**
 * CADHY Interactive Release Script
 *
 * Usage: bun release
 *
 * Features:
 * - Interactive prompts for release type
 * - Automatic version bumping
 * - Changelog generation from commits
 * - Tag creation and push
 * - Workflow trigger for builds
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as readline from "node:readline"
import { $ } from "bun"

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
}

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  title: (msg: string) => console.log(`\n${colors.bold}${colors.magenta}${msg}${colors.reset}\n`),
}

interface Version {
  major: number
  minor: number
  patch: number
  prerelease?: string
  prereleaseNum?: number
}

type ReleaseType = "major" | "minor" | "patch" | "prerelease"
type PrereleaseType = "alpha" | "beta" | "rc" | "stable"

const ROOT_DIR = join(import.meta.dir, "../..")
const FILES_TO_UPDATE = [
  "package.json",
  "apps/desktop/package.json",
  "apps/desktop/src-tauri/tauri.conf.json",
  "apps/desktop/src-tauri/Cargo.toml",
]

// Parse semantic version
function parseVersion(version: string): Version {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.?(\d+)?)?$/)
  if (!match) {
    throw new Error(`Invalid version format: ${version}`)
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
    prereleaseNum: match[5] ? parseInt(match[5], 10) : undefined,
  }
}

// Format version to string
function formatVersion(v: Version): string {
  let version = `${v.major}.${v.minor}.${v.patch}`
  if (v.prerelease) {
    version += `-${v.prerelease}`
    if (v.prereleaseNum !== undefined) {
      version += `.${v.prereleaseNum}`
    }
  }
  return version
}

// Get current version from package.json
function getCurrentVersion(): string {
  const pkgPath = join(ROOT_DIR, "apps/desktop/package.json")
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
  return pkg.version
}

// Bump version based on release type
function bumpVersion(
  current: Version,
  type: ReleaseType,
  prereleaseType?: PrereleaseType
): Version {
  const next = { ...current }

  switch (type) {
    case "major":
      next.major++
      next.minor = 0
      next.patch = 0
      delete next.prerelease
      delete next.prereleaseNum
      break
    case "minor":
      next.minor++
      next.patch = 0
      delete next.prerelease
      delete next.prereleaseNum
      break
    case "patch":
      next.patch++
      delete next.prerelease
      delete next.prereleaseNum
      break
    case "prerelease":
      if (prereleaseType === "stable") {
        // Remove prerelease tag
        delete next.prerelease
        delete next.prereleaseNum
      } else if (prereleaseType) {
        if (current.prerelease === prereleaseType) {
          // Increment prerelease number
          next.prereleaseNum = (current.prereleaseNum || 0) + 1
        } else {
          // New prerelease type
          next.prerelease = prereleaseType
          next.prereleaseNum = 1
        }
      }
      break
  }

  return next
}

// Create readline interface
function createRL(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

// Prompt for input
function promptRL(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

// Read user input
async function _prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = createRL()
  const suffix = defaultValue ? ` ${colors.dim}[${defaultValue}]${colors.reset}` : ""

  const answer = await promptRL(rl, `${colors.cyan}?${colors.reset} ${question}${suffix}: `)
  rl.close()

  return answer || defaultValue || ""
}

// Select from options
async function select<T extends string>(
  question: string,
  options: { value: T; label: string }[]
): Promise<T> {
  const rl = createRL()

  console.log(`\n${colors.cyan}?${colors.reset} ${question}`)
  options.forEach((opt, i) => {
    console.log(`  ${colors.dim}${i + 1}.${colors.reset} ${opt.label}`)
  })

  const answer = await promptRL(
    rl,
    `${colors.dim}Enter number (1-${options.length}):${colors.reset} `
  )
  rl.close()

  const num = parseInt(answer, 10)
  if (num >= 1 && num <= options.length) {
    return options[num - 1].value
  }
  return options[0].value
}

// Confirm action
async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const rl = createRL()
  const hint = defaultYes ? "Y/n" : "y/N"

  const answer = await promptRL(
    rl,
    `${colors.cyan}?${colors.reset} ${question} ${colors.dim}(${hint}):${colors.reset} `
  )
  rl.close()

  const input = answer.toLowerCase()
  if (input === "") return defaultYes
  if (input === "y" || input === "yes") return true
  if (input === "n" || input === "no") return false
  return defaultYes
}

// Get commits since last tag
async function getCommitsSinceLastTag(): Promise<string[]> {
  try {
    const result =
      await $`git log $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~20)..HEAD --oneline --no-merges`.text()
    return result.trim().split("\n").filter(Boolean)
  } catch {
    // If no tags exist, get last 20 commits
    const result = await $`git log -20 --oneline --no-merges`.text()
    return result.trim().split("\n").filter(Boolean)
  }
}

// Categorize commits
function categorizeCommits(commits: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    feat: [],
    fix: [],
    refactor: [],
    docs: [],
    style: [],
    test: [],
    chore: [],
    other: [],
  }

  const prefixMap: Record<string, string> = {
    feat: "feat",
    feature: "feat",
    fix: "fix",
    bug: "fix",
    refactor: "refactor",
    docs: "docs",
    style: "style",
    test: "test",
    chore: "chore",
    ci: "chore",
    build: "chore",
  }

  for (const commit of commits) {
    const match = commit.match(/^[a-f0-9]+ (?:(\w+)(?:\([^)]*\))?:\s*)?(.+)$/i)
    if (match) {
      const [, prefix, message] = match
      const category = prefixMap[prefix?.toLowerCase() || ""] || "other"
      categories[category].push(message || commit)
    } else {
      categories.other.push(commit)
    }
  }

  return categories
}

// Generate changelog entry
function generateChangelogEntry(version: string, categories: Record<string, string[]>): string {
  const date = new Date().toISOString().split("T")[0]
  let entry = `## [${version}] - ${date}\n\n`

  const categoryLabels: Record<string, string> = {
    feat: "### Added",
    fix: "### Fixed",
    refactor: "### Changed",
    docs: "### Documentation",
    style: "### Style",
    test: "### Tests",
    chore: "### Maintenance",
    other: "### Other",
  }

  for (const [category, label] of Object.entries(categoryLabels)) {
    const commits = categories[category]
    if (commits && commits.length > 0) {
      entry += `${label}\n\n`
      for (const commit of commits) {
        entry += `- ${commit}\n`
      }
      entry += "\n"
    }
  }

  return entry
}

// Update version in file
function updateVersionInFile(filePath: string, newVersion: string): boolean {
  const fullPath = join(ROOT_DIR, filePath)
  if (!existsSync(fullPath)) {
    log.warn(`File not found: ${filePath}`)
    return false
  }

  let content = readFileSync(fullPath, "utf-8")
  const ext = filePath.split(".").pop()

  if (ext === "json") {
    const json = JSON.parse(content)
    json.version = newVersion
    content = `${JSON.stringify(json, null, 2)}\n`
  } else if (ext === "toml") {
    // Update version in Cargo.toml
    content = content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`)
  }

  writeFileSync(fullPath, content)
  return true
}

// Update changelog
function updateChangelog(newEntry: string, version: string): void {
  const changelogPath = join(ROOT_DIR, "CHANGELOG.md")
  let content = ""

  if (existsSync(changelogPath)) {
    content = readFileSync(changelogPath, "utf-8")
  } else {
    content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

`
  }

  // Insert new entry after [Unreleased] section
  const unreleasedIndex = content.indexOf("## [Unreleased]")
  if (unreleasedIndex !== -1) {
    const nextSectionIndex = content.indexOf("\n## [", unreleasedIndex + 1)
    if (nextSectionIndex !== -1) {
      content = `${content.slice(0, nextSectionIndex)}\n${newEntry}${content.slice(nextSectionIndex)}`
    } else {
      content += `\n${newEntry}`
    }
  } else {
    // No Unreleased section, add at the start
    const firstVersion = content.indexOf("## [")
    if (firstVersion !== -1) {
      content = `${content.slice(0, firstVersion) + newEntry}\n${content.slice(firstVersion)}`
    } else {
      content += `\n${newEntry}`
    }
  }

  // Add version link at the bottom (releases go to cadhy-releases repo)
  const linkLine = `[${version}]: https://github.com/crhistian-cornejo/cadhy-releases/releases/tag/v${version}`
  if (!content.includes(linkLine)) {
    content = `${content.trimEnd()}\n${linkLine}\n`
  }

  writeFileSync(changelogPath, content)
}

// Run validation checks
async function runValidation(): Promise<boolean> {
  log.step("Running validation checks...")

  try {
    // Check for uncommitted changes
    const status = await $`git status --porcelain`.text()
    if (status.trim()) {
      log.error("Working directory has uncommitted changes")
      console.log(status)
      return false
    }

    // Run linting (only fail on errors, not warnings)
    log.step("Running linter...")
    await $`bunx biome check --diagnostic-level=error .`.quiet()
    log.success("Linting passed")

    // Run typecheck
    log.step("Running TypeScript check...")
    await $`bun run typecheck`.quiet()
    log.success("TypeScript check passed")

    // Run tests
    log.step("Running tests...")
    await $`bun run test`.quiet()
    log.success("Tests passed")

    return true
  } catch (error) {
    log.error(`Validation failed: ${error}`)
    return false
  }
}

// Create git tag and push
async function createTagAndPush(version: string, changelogEntry: string): Promise<void> {
  const tag = `v${version}`

  log.step("Creating git commit...")
  await $`git add -A`
  await $`git commit -m "chore: release ${tag}"`

  log.step(`Creating tag ${tag}...`)
  await $`git tag -a ${tag} -m ${`Release ${tag}\n\n${changelogEntry}`}`

  log.step("Pushing to remote...")
  await $`git push origin main`
  await $`git push origin ${tag}`
}

// Main release flow
async function main() {
  log.title("🚀 CADHY Release Manager")

  // Get current version
  const currentVersionStr = getCurrentVersion()
  const currentVersion = parseVersion(currentVersionStr)
  log.info(`Current version: ${colors.bold}${currentVersionStr}${colors.reset}`)

  // Check if there's a prerelease tag
  const isPrerelease = !!currentVersion.prerelease
  if (isPrerelease) {
    log.info(
      `Current prerelease: ${currentVersion.prerelease}.${currentVersion.prereleaseNum || 1}`
    )
  }

  // Select release type
  const releaseType = await select<ReleaseType>("What type of release is this?", [
    {
      value: "patch",
      label: `Patch (bug fixes) → ${formatVersion(bumpVersion(currentVersion, "patch"))}`,
    },
    {
      value: "minor",
      label: `Minor (new features) → ${formatVersion(bumpVersion(currentVersion, "minor"))}`,
    },
    {
      value: "major",
      label: `Major (breaking changes) → ${formatVersion(bumpVersion(currentVersion, "major"))}`,
    },
    { value: "prerelease", label: "Prerelease (alpha/beta/rc)" },
  ])

  let prereleaseType: PrereleaseType | undefined
  let nextVersion: Version

  if (releaseType === "prerelease") {
    prereleaseType = await select<PrereleaseType>("Prerelease type:", [
      {
        value: "beta",
        label: `Beta → ${formatVersion(bumpVersion(currentVersion, "prerelease", "beta"))}`,
      },
      {
        value: "alpha",
        label: `Alpha → ${formatVersion(bumpVersion(currentVersion, "prerelease", "alpha"))}`,
      },
      {
        value: "rc",
        label: `Release Candidate → ${formatVersion(bumpVersion(currentVersion, "prerelease", "rc"))}`,
      },
      {
        value: "stable",
        label: `Promote to stable → ${formatVersion(bumpVersion(currentVersion, "prerelease", "stable"))}`,
      },
    ])
    nextVersion = bumpVersion(currentVersion, "prerelease", prereleaseType)
  } else {
    nextVersion = bumpVersion(currentVersion, releaseType)
  }

  const nextVersionStr = formatVersion(nextVersion)
  console.log("")
  log.info(`New version: ${colors.bold}${colors.green}${nextVersionStr}${colors.reset}`)

  // Get commits and generate changelog
  const commits = await getCommitsSinceLastTag()
  const categories = categorizeCommits(commits)
  const changelogEntry = generateChangelogEntry(nextVersionStr, categories)

  console.log(`\n${colors.dim}${"─".repeat(50)}${colors.reset}`)
  console.log(`${colors.bold}Changelog preview:${colors.reset}`)
  console.log(colors.dim + changelogEntry + colors.reset)
  console.log(`${colors.dim + "─".repeat(50) + colors.reset}\n`)

  // Confirm
  const shouldContinue = await confirm(`Release ${colors.bold}v${nextVersionStr}${colors.reset}?`)
  if (!shouldContinue) {
    log.warn("Release cancelled")
    process.exit(0)
  }

  // Run validation
  const skipValidation = await confirm("Skip validation checks?", false)
  if (!skipValidation) {
    const valid = await runValidation()
    if (!valid) {
      log.error("Validation failed. Fix issues and try again.")
      process.exit(1)
    }
  }

  // Update version in files
  log.step("Updating version in files...")
  for (const file of FILES_TO_UPDATE) {
    if (updateVersionInFile(file, nextVersionStr)) {
      log.success(`Updated ${file}`)
    }
  }

  // Update changelog
  log.step("Updating CHANGELOG.md...")
  updateChangelog(changelogEntry, nextVersionStr)
  log.success("Changelog updated")

  // Create tag and push
  await createTagAndPush(nextVersionStr, changelogEntry)
  log.success(`Tag v${nextVersionStr} created and pushed`)

  // Success message
  console.log("")
  log.title("✅ Release Complete!")
  console.log(`
${colors.green}Version:${colors.reset} ${nextVersionStr}
${colors.green}Tag:${colors.reset}     v${nextVersionStr}

${colors.cyan}GitHub Actions will now:${colors.reset}
1. Build for all platforms (Windows, macOS, Linux)
2. Create GitHub release with binaries
3. Update the auto-updater manifest

${colors.yellow}Monitor progress:${colors.reset}
https://github.com/crhistian-cornejo/CADHY/actions

${colors.yellow}Release will be available at:${colors.reset}
https://github.com/crhistian-cornejo/cadhy-releases/releases/tag/v${nextVersionStr}

${colors.dim}Estimated build time: ~45 minutes${colors.reset}
`)
}

// Run
main().catch((error) => {
  log.error(`Release failed: ${error.message}`)
  process.exit(1)
})
