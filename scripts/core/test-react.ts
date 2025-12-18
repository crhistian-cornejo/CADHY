#!/usr/bin/env bun
/**
 * Script to run React component tests in isolation
 *
 * Due to a known issue with happy-dom and react-dom, tests that use
 * @testing-library/react fail when run together with other test files.
 * The issue is that react-dom's initialization check (setAttribute)
 * fails when the DOM environment changes between test files.
 *
 * This script runs each React test file in a separate process to
 * ensure proper DOM isolation.
 *
 * @see https://github.com/oven-sh/bun/issues/10282
 */

import { $, Glob } from "bun"

const REACT_TEST_PATTERNS = [
  "apps/desktop/src/components/panels/properties/__tests__/*.test.tsx",
  "apps/desktop/src/hooks/__tests__/*.test.ts",
]

async function findTestFiles(): Promise<string[]> {
  const files: string[] = []

  for (const pattern of REACT_TEST_PATTERNS) {
    const glob = new Glob(pattern)
    for await (const file of glob.scan(".")) {
      files.push(file)
    }
  }

  return files
}

async function runTest(file: string): Promise<{ file: string; success: boolean; output: string }> {
  try {
    const result = await $`bun test ${file}`.quiet()
    return { file, success: true, output: result.text() }
  } catch (error) {
    const output = error instanceof Error ? error.message : String(error)
    return { file, success: false, output }
  }
}

async function main() {
  console.log("🧪 Running React component tests in isolation...\n")

  const files = await findTestFiles()

  if (files.length === 0) {
    console.log("No React test files found.")
    process.exit(0)
  }

  console.log(`Found ${files.length} React test files:\n`)

  let passed = 0
  let failed = 0

  for (const file of files) {
    const shortName = file.split("/").slice(-2).join("/")
    process.stdout.write(`  Testing ${shortName}...`)

    const result = await runTest(file)

    if (result.success) {
      console.log(" ✓")
      passed++
    } else {
      console.log(" ✗")
      console.log(`\n${result.output}\n`)
      failed++
    }
  }

  console.log(`\n${"─".repeat(50)}`)
  console.log(`\n Results: ${passed} passed, ${failed} failed\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

main()
