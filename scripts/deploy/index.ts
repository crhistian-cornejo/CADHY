#!/usr/bin/env bun

/**
 * CADHY Deploy Script
 *
 * Usage: bun deploy
 *
 * Deploys the web app to Vercel (cadhy.app)
 */

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

// Parse CLI args
const args = process.argv.slice(2)
const isPreview = args.includes("--preview") || args.includes("-p")
const skipConfirm = args.includes("--yes") || args.includes("-y")

// Create readline interface
function createRL(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

// Confirm action
async function confirm(question: string): Promise<boolean> {
  if (skipConfirm) return true

  const rl = createRL()
  return new Promise((resolve) => {
    rl.question(
      `${colors.cyan}?${colors.reset} ${question} ${colors.dim}(Y/n):${colors.reset} `,
      (answer) => {
        rl.close()
        const input = answer.trim().toLowerCase()
        resolve(input === "" || input === "y" || input === "yes")
      }
    )
  })
}

// Main deploy flow
async function main() {
  log.title("🚀 CADHY Deploy")

  // Check Vercel CLI
  try {
    await $`vercel --version`.quiet()
  } catch {
    log.error("Vercel CLI not found. Install with: bun add -g vercel")
    process.exit(1)
  }

  // Confirm
  const target = isPreview ? "preview" : "production (cadhy.app)"
  if (!(await confirm(`Deploy to ${target}?`))) {
    log.warn("Cancelled")
    process.exit(0)
  }

  // Deploy (Vercel handles build automatically via vercel.json)
  log.step(`Deploying to ${target}...`)

  try {
    if (isPreview) {
      // Preview deployment
      await $`vercel --yes`
    } else {
      // Production deployment
      await $`vercel --prod --yes`
    }

    log.success("Deployed successfully!")

    if (!isPreview) {
      console.log(`
${colors.green}✅ Live at:${colors.reset} ${colors.cyan}https://cadhy.app${colors.reset}
`)
    }
  } catch (error) {
    log.error(`Deploy failed: ${error}`)
    process.exit(1)
  }
}

// Run
main()
