#!/usr/bin/env bun

/**
 * Backend Debug Utilities
 *
 * Provides debugging utilities for the Rust/Tauri backend:
 * - Trace Tauri commands
 * - Inspect CAD kernel state
 * - Profile command execution
 * - Log analysis
 *
 * Usage: bun run tools/debug/debug_backend.ts [command]
 * Commands: trace, logs, profile, symbols
 */

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { $ } from "bun"

// ============================================================================
// CONFIGURATION
// ============================================================================

const TAURI_SRC = "apps/desktop/src-tauri/src"
const LOG_PATTERNS = ["error!", "warn!", "info!", "debug!", "trace!"]

// ============================================================================
// COMMANDS
// ============================================================================

async function traceCommands() {
  console.log("Tauri Command Trace")
  console.log("═".repeat(60))
  console.log()

  // Find all #[tauri::command] functions
  const output = await $`grep -r "#\\[tauri::command\\]" ${TAURI_SRC} -A 5`.text()

  const commands: { name: string; file: string; async: boolean; params: string[] }[] = []

  const lines = output.split("\n")
  let currentFile = ""
  let nextIsCommand = false

  for (const line of lines) {
    if (line.includes(".rs:")) {
      const match = line.match(/(.+\.rs):/)
      if (match) currentFile = match[1]
    }

    if (line.includes("#[tauri::command]")) {
      nextIsCommand = true
      continue
    }

    if (nextIsCommand && line.includes("fn ")) {
      const fnMatch = line.match(/(async\s+)?fn\s+(\w+)\s*\(([^)]*)\)/)
      if (fnMatch) {
        const isAsync = !!fnMatch[1]
        const name = fnMatch[2]
        const params = fnMatch[3]
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p && !p.includes("State<") && !p.includes("Window"))

        commands.push({
          name,
          file: path.basename(currentFile),
          async: isAsync,
          params,
        })
      }
      nextIsCommand = false
    }
  }

  // Group by file
  const byFile = new Map<string, typeof commands>()
  for (const cmd of commands) {
    if (!byFile.has(cmd.file)) byFile.set(cmd.file, [])
    byFile.get(cmd.file)!.push(cmd)
  }

  for (const [file, cmds] of byFile) {
    console.log(`\x1b[36m${file}\x1b[0m`)
    for (const cmd of cmds) {
      const asyncTag = cmd.async ? "\x1b[33masync\x1b[0m " : ""
      const paramsStr = cmd.params.length > 0 ? `(${cmd.params.join(", ")})` : "()"
      console.log(`  ${asyncTag}${cmd.name}${paramsStr}`)
    }
    console.log()
  }

  console.log("─".repeat(60))
  console.log(`Total: ${commands.length} commands`)
}

async function analyzeLogs() {
  console.log("Log Statement Analysis")
  console.log("═".repeat(60))
  console.log()

  const counts: Record<string, number> = {}
  for (const pattern of LOG_PATTERNS) {
    counts[pattern] = 0
  }

  // Count log statements
  for (const pattern of LOG_PATTERNS) {
    try {
      const output = await $`grep -r "${pattern}" ${TAURI_SRC} --include="*.rs" -c`.text()
      const lines = output.trim().split("\n")
      for (const line of lines) {
        const match = line.match(/:(\d+)$/)
        if (match) counts[pattern] += parseInt(match[1])
      }
    } catch {
      // No matches
    }
  }

  for (const [pattern, count] of Object.entries(counts)) {
    const level = pattern.replace("!", "").padEnd(6)
    const bar = "█".repeat(Math.min(count, 50))
    const color =
      pattern === "error!"
        ? "\x1b[31m"
        : pattern === "warn!"
          ? "\x1b[33m"
          : pattern === "info!"
            ? "\x1b[32m"
            : pattern === "debug!"
              ? "\x1b[34m"
              : "\x1b[90m"

    console.log(`${color}${level}\x1b[0m ${bar} ${count}`)
  }

  console.log()
  console.log("─".repeat(60))
  console.log(`Total log statements: ${Object.values(counts).reduce((a, b) => a + b, 0)}`)
}

async function profileSetup() {
  console.log("Profiling Setup Guide")
  console.log("═".repeat(60))
  console.log()

  console.log("\x1b[36m1. CPU Profiling (samply)\x1b[0m")
  console.log("   Install: cargo install samply")
  console.log("   Usage:   samply record -- ./target/release/cadhy-desktop")
  console.log()

  console.log("\x1b[36m2. Memory Profiling (heaptrack)\x1b[0m")
  console.log("   Install: brew install heaptrack (macOS)")
  console.log("   Usage:   heaptrack ./target/release/cadhy-desktop")
  console.log()

  console.log("\x1b[36m3. Flamegraph\x1b[0m")
  console.log("   Install: cargo install flamegraph")
  console.log("   Usage:   cargo flamegraph --bin cadhy-desktop")
  console.log()

  console.log("\x1b[36m4. Tracing (tokio-console)\x1b[0m")
  console.log("   Add to Cargo.toml:")
  console.log('     console-subscriber = "0.2"')
  console.log("   Add to main.rs:")
  console.log("     console_subscriber::init();")
  console.log("   Run:     tokio-console")
  console.log()

  console.log("\x1b[36m5. LLDB Debugging\x1b[0m")
  console.log("   Load helpers: command script import tools/debug/lldb_rust.py")
  console.log("   Commands: rust_bt, show_vec, show_str, cadhy_shapes")
}

async function listSymbols() {
  console.log("Debug Symbols Check")
  console.log("═".repeat(60))
  console.log()

  const debugBinary = "target/debug/cadhy-desktop"
  const releaseBinary = "target/release/cadhy-desktop"

  for (const binary of [debugBinary, releaseBinary]) {
    const exists = existsSync(binary)
    const type = binary.includes("debug") ? "Debug" : "Release"

    console.log(`\x1b[36m${type} Build:\x1b[0m ${binary}`)

    if (!exists) {
      console.log("  Status: Not built")
      console.log()
      continue
    }

    try {
      // Check file size
      const { size } = Bun.file(binary)
      const sizeMB = (size / 1024 / 1024).toFixed(2)

      // Check for debug symbols (macOS)
      const hasSymbols = await $`dsymutil -s ${binary} 2>/dev/null | head -5`.text()
      const symbolStatus = hasSymbols.length > 0 ? "Present" : "Stripped"

      console.log(`  Size: ${sizeMB} MB`)
      console.log(`  Debug symbols: ${symbolStatus}`)
    } catch (error) {
      console.log(`  Error checking: ${error}`)
    }
    console.log()
  }

  console.log("─".repeat(60))
  console.log("Tip: For debug builds, use: cargo build")
  console.log("     For release with symbols: cargo build --release")
  console.log("     Add to Cargo.toml [profile.release]: debug = true")
}

// ============================================================================
// MAIN
// ============================================================================

function printHelp() {
  console.log("Backend Debug Utilities")
  console.log("═".repeat(60))
  console.log()
  console.log("Usage: bun run tools/debug/debug_backend.ts <command>")
  console.log()
  console.log("Commands:")
  console.log("  trace    - List all Tauri commands")
  console.log("  logs     - Analyze log statements")
  console.log("  profile  - Show profiling setup guide")
  console.log("  symbols  - Check debug symbols")
}

async function main() {
  const command = process.argv[2]

  if (!command || command === "--help" || command === "-h") {
    printHelp()
    return
  }

  switch (command) {
    case "trace":
      await traceCommands()
      break
    case "logs":
      await analyzeLogs()
      break
    case "profile":
      await profileSetup()
      break
    case "symbols":
      await listSymbols()
      break
    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      process.exit(1)
  }
}

main().catch(console.error)
