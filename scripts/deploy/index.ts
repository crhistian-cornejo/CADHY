#!/usr/bin/env bun

/**
 * CADHY Deploy Script
 *
 * Usage: bun deploy
 *
 * Features:
 * - Builds the web application
 * - Deploys to gh-pages branch in CADHY repo
 * - Supports preview mode for testing builds
 */

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
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

const ROOT_DIR = join(import.meta.dir, "../..")
const WEB_DIR = join(ROOT_DIR, "apps/web")
const DIST_DIR = join(WEB_DIR, "dist")
const DEPLOY_DIR = join(ROOT_DIR, ".deploy-temp")
const RELEASES_REPO = "crhistian-cornejo/CADHY"

// Create readline interface
function createRL(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

// Prompt for input
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

// Confirm action
async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const rl = createRL()
  const hint = defaultYes ? "Y/n" : "y/N"

  const answer = await prompt(
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

  const answer = await prompt(
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

// Build web application
async function buildWeb(): Promise<boolean> {
  log.step("Building web application...")

  try {
    await $`bun run build:web`.cwd(ROOT_DIR)
    log.success("Web application built successfully")
    return true
  } catch (error) {
    log.error(`Build failed: ${error}`)
    return false
  }
}

// Prepare deployment files
function prepareDeployment(): void {
  log.step("Preparing deployment files...")

  // Clean and create deploy directory
  if (existsSync(DEPLOY_DIR)) {
    rmSync(DEPLOY_DIR, { recursive: true })
  }
  mkdirSync(DEPLOY_DIR, { recursive: true })

  // Copy dist contents
  cpSync(DIST_DIR, DEPLOY_DIR, { recursive: true })

  // Create 404.html for SPA routing
  const indexPath = join(DEPLOY_DIR, "index.html")
  const notFoundPath = join(DEPLOY_DIR, "404.html")
  if (existsSync(indexPath)) {
    cpSync(indexPath, notFoundPath)
    log.info("Created 404.html for SPA routing")
  }

  // Create .nojekyll
  writeFileSync(join(DEPLOY_DIR, ".nojekyll"), "")
  log.info("Created .nojekyll file")

  // Create CNAME if needed (uncomment and modify if using custom domain)
  // writeFileSync(join(DEPLOY_DIR, "CNAME"), "cadhy.app")

  log.success("Deployment files prepared")
}

// Deploy to gh-pages
async function deployToGhPages(): Promise<void> {
  log.step("Deploying to GitHub Pages...")

  const timestamp = new Date().toISOString()
  const commitMsg = `Deploy web app - ${timestamp}`

  try {
    // Check if gh CLI is available
    await $`gh --version`.quiet()
  } catch {
    log.error("GitHub CLI (gh) is not installed or not authenticated")
    log.info("Install with: brew install gh && gh auth login")
    throw new Error("GitHub CLI not available")
  }

  try {
    // Clone the releases repo gh-pages branch (shallow)
    const tempRepo = join(ROOT_DIR, ".deploy-repo")
    if (existsSync(tempRepo)) {
      rmSync(tempRepo, { recursive: true })
    }

    log.step("Cloning gh-pages branch...")
    await $`git clone --depth 1 --branch gh-pages https://github.com/${RELEASES_REPO}.git ${tempRepo}`.quiet()

    // Clear old files (except .git)
    const files = await $`ls -A ${tempRepo}`.text()
    for (const file of files.trim().split("\n")) {
      if (file && file !== ".git") {
        rmSync(join(tempRepo, file), { recursive: true, force: true })
      }
    }

    // Copy new files
    cpSync(DEPLOY_DIR, tempRepo, { recursive: true })

    // Commit and push
    log.step("Committing changes...")
    await $`git add -A`.cwd(tempRepo)

    // Check if there are changes
    const status = await $`git status --porcelain`.cwd(tempRepo).text()
    if (!status.trim()) {
      log.info("No changes to deploy")
      rmSync(tempRepo, { recursive: true })
      return
    }

    await $`git commit -m ${commitMsg}`.cwd(tempRepo)

    log.step("Pushing to gh-pages...")
    await $`git push origin gh-pages`.cwd(tempRepo)

    // Cleanup
    rmSync(tempRepo, { recursive: true })
    log.success("Deployed successfully!")
  } catch (error) {
    log.error(`Deployment failed: ${error}`)
    throw error
  }
}

// Preview locally
async function previewLocally(): Promise<void> {
  log.step("Starting local preview server...")
  log.info(`Preview URL: ${colors.cyan}http://localhost:4173${colors.reset}`)
  log.info("Press Ctrl+C to stop")

  await $`bun run --filter @cadhy/web preview`.cwd(ROOT_DIR)
}

// Cleanup temp files
function cleanup(): void {
  if (existsSync(DEPLOY_DIR)) {
    rmSync(DEPLOY_DIR, { recursive: true })
  }
}

// Main deploy flow
async function main() {
  log.title("🚀 CADHY Web Deploy")

  // Select action
  const action = await select("What would you like to do?", [
    { value: "deploy", label: "Build and deploy to production (gh-pages)" },
    { value: "preview", label: "Build and preview locally" },
    { value: "build", label: "Build only (no deploy)" },
  ])

  // Build
  const buildSuccess = await buildWeb()
  if (!buildSuccess) {
    log.error("Build failed. Fix errors and try again.")
    process.exit(1)
  }

  if (action === "build") {
    log.success("Build complete!")
    log.info(`Output: ${DIST_DIR}`)
    return
  }

  if (action === "preview") {
    await previewLocally()
    return
  }

  // Deploy
  const shouldDeploy = await confirm("Deploy to production?")
  if (!shouldDeploy) {
    log.warn("Deployment cancelled")
    return
  }

  prepareDeployment()
  await deployToGhPages()
  cleanup()

  console.log("")
  log.title("✅ Deployment Complete!")
  console.log(`
${colors.green}Status:${colors.reset} Live

${colors.yellow}Your site is available at:${colors.reset}
https://crhistian-cornejo.github.io/CADHY/

${colors.dim}Note: It may take a few minutes for changes to propagate.${colors.reset}
`)
}

// Run
main().catch((error) => {
  log.error(`Deploy failed: ${error.message}`)
  cleanup()
  process.exit(1)
})
