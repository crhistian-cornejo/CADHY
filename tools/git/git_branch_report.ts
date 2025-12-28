#!/usr/bin/env bun
/**
 * Git Branch Report
 *
 * Generates a report of all branches with their status:
 * - Local branches and their tracking status
 * - Stale branches (not updated recently)
 * - Merged branches that can be deleted
 *
 * Usage: bun run tools/git/git_branch_report.ts
 */

import { $ } from "bun"

// ============================================================================
// TYPES
// ============================================================================

interface BranchInfo {
  name: string
  isLocal: boolean
  isRemote: boolean
  isCurrent: boolean
  tracking?: string
  ahead: number
  behind: number
  lastCommitDate: string
  lastCommitMessage: string
  isMerged: boolean
  isStale: boolean
}

// ============================================================================
// FUNCTIONS
// ============================================================================

async function getBranches(): Promise<BranchInfo[]> {
  const branches: BranchInfo[] = []

  // Get current branch
  const currentBranch = (await $`git branch --show-current`.text()).trim()

  // Get all local branches with details
  const localBranches = (await $`git branch --format='%(refname:short)'`.text())
    .trim()
    .split("\n")
    .filter(Boolean)

  // Get main branch for merge check
  const mainBranch = localBranches.includes("main") ? "main" : "master"

  for (const branch of localBranches) {
    try {
      // Get tracking info
      let tracking = ""
      let ahead = 0
      let behind = 0

      try {
        tracking = (await $`git rev-parse --abbrev-ref ${branch}@{upstream}`.text()).trim()
        const aheadBehind = (
          await $`git rev-list --left-right --count ${branch}...${tracking}`.text()
        )
          .trim()
          .split("\t")
        ahead = parseInt(aheadBehind[0]) || 0
        behind = parseInt(aheadBehind[1]) || 0
      } catch {
        // No upstream tracking
      }

      // Get last commit info
      const lastCommitDate = (await $`git log -1 --format='%ci' ${branch}`.text()).trim()
      const lastCommitMessage = (await $`git log -1 --format='%s' ${branch}`.text()).trim()

      // Check if merged into main
      let isMerged = false
      try {
        const mergedBranches = await $`git branch --merged ${mainBranch}`.text()
        isMerged = mergedBranches.includes(branch) && branch !== mainBranch
      } catch {
        // Ignore
      }

      // Check if stale (no commits in 30 days)
      const commitDate = new Date(lastCommitDate)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const isStale = commitDate < thirtyDaysAgo

      branches.push({
        name: branch,
        isLocal: true,
        isRemote: !!tracking,
        isCurrent: branch === currentBranch,
        tracking: tracking || undefined,
        ahead,
        behind,
        lastCommitDate,
        lastCommitMessage: lastCommitMessage.substring(0, 50),
        isMerged,
        isStale,
      })
    } catch (error) {
      console.error(`Error processing branch ${branch}:`, error)
    }
  }

  return branches
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("Git Branch Report")
  console.log("═".repeat(70))
  console.log()

  const branches = await getBranches()

  // Current branch
  const current = branches.find((b) => b.isCurrent)
  if (current) {
    console.log(`\x1b[32m● Current:\x1b[0m ${current.name}`)
    if (current.tracking) {
      const status = []
      if (current.ahead > 0) status.push(`↑${current.ahead}`)
      if (current.behind > 0) status.push(`↓${current.behind}`)
      console.log(`  Tracking: ${current.tracking} ${status.join(" ")}`)
    }
    console.log()
  }

  // Active branches (not stale, not merged)
  const active = branches.filter((b) => !b.isStale && !b.isMerged && !b.isCurrent)
  if (active.length > 0) {
    console.log("\x1b[36mActive Branches:\x1b[0m")
    console.log("─".repeat(70))
    for (const b of active) {
      const status = []
      if (b.ahead > 0) status.push(`↑${b.ahead}`)
      if (b.behind > 0) status.push(`↓${b.behind}`)
      console.log(`  ${b.name} ${status.join(" ")}`)
      console.log(`    Last: ${formatDate(b.lastCommitDate)} - ${b.lastCommitMessage}`)
    }
    console.log()
  }

  // Merged branches (can delete)
  const merged = branches.filter((b) => b.isMerged && !b.isCurrent)
  if (merged.length > 0) {
    console.log("\x1b[33mMerged Branches (can delete):\x1b[0m")
    console.log("─".repeat(70))
    for (const b of merged) {
      console.log(`  ${b.name}`)
    }
    console.log()
    console.log("  To delete: git branch -d <branch>")
    console.log()
  }

  // Stale branches
  const stale = branches.filter((b) => b.isStale && !b.isMerged && !b.isCurrent)
  if (stale.length > 0) {
    console.log("\x1b[31mStale Branches (>30 days):\x1b[0m")
    console.log("─".repeat(70))
    for (const b of stale) {
      console.log(`  ${b.name}`)
      console.log(`    Last: ${formatDate(b.lastCommitDate)}`)
    }
    console.log()
  }

  // Summary
  console.log("Summary:")
  console.log("─".repeat(70))
  console.log(`  Total branches: ${branches.length}`)
  console.log(`  Active: ${active.length + 1}`) // +1 for current
  console.log(`  Merged: ${merged.length}`)
  console.log(`  Stale: ${stale.length}`)
}

main().catch(console.error)
