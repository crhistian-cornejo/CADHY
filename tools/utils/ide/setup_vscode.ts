#!/usr/bin/env bun
/**
 * Setup VSCode/Cursor Configuration
 *
 * Configures IDE settings for optimal CADHY development:
 * - Recommended extensions
 * - Workspace settings
 * - Debug configurations
 * - Task definitions
 *
 * Usage: bun run tools/utils_ide/setup_vscode.ts
 */

import { existsSync, mkdirSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

// ============================================================================
// CONFIGURATION
// ============================================================================

const VSCODE_DIR = ".vscode"

const RECOMMENDED_EXTENSIONS = {
  recommendations: [
    // TypeScript/JavaScript
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "biomejs.biome",

    // Rust
    "rust-lang.rust-analyzer",
    "tamasfe.even-better-toml",

    // Tauri
    "tauri-apps.tauri-vscode",

    // React
    "dsznajder.es7-react-js-snippets",
    "bradlc.vscode-tailwindcss",

    // Git
    "eamodio.gitlens",
    "mhutchie.git-graph",

    // Other
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker",
    "gruntfuggly.todo-tree",
    "wayou.vscode-todo-highlight",
  ],
}

const WORKSPACE_SETTINGS = {
  // Editor
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit",
  },
  "editor.rulers": [100],
  "editor.tabSize": 2,

  // TypeScript
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.paths": true,
  "typescript.updateImportsOnFileMove.enabled": "always",

  // Files
  "files.exclude": {
    "**/node_modules": true,
    "**/target": true,
    "**/.turbo": true,
    "**/dist": true,
  },
  "files.associations": {
    "*.css": "tailwindcss",
  },

  // Search
  "search.exclude": {
    "**/node_modules": true,
    "**/target": true,
    "**/dist": true,
    "**/.turbo": true,
    "**/bun.lockb": true,
  },

  // Rust
  "rust-analyzer.cargo.features": "all",
  "rust-analyzer.check.command": "clippy",

  // Tailwind
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", '"([^"]*)"'],
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
  ],

  // Spell checker
  "cSpell.words": [
    "cadhy",
    "tauri",
    "brep",
    "opencascade",
    "tessellate",
    "meshing",
    "loft",
    "revolve",
    "extrude",
    "fillet",
    "chamfer",
    "boolean",
  ],
}

const LAUNCH_CONFIGURATIONS = {
  version: "0.2.0",
  configurations: [
    {
      name: "Tauri Development",
      type: "lldb",
      request: "launch",
      cargo: {
        args: ["build", "--manifest-path=./apps/desktop/src-tauri/Cargo.toml"],
      },
      preLaunchTask: "tauri:dev",
    },
    {
      name: "Debug Rust Tests",
      type: "lldb",
      request: "launch",
      cargo: {
        args: ["test", "--no-run", "--workspace"],
        filter: {
          kind: "test",
        },
      },
    },
    {
      name: "Debug Web (Chrome)",
      type: "chrome",
      request: "launch",
      url: "http://localhost:1420",
      webRoot: "${workspaceFolder}/apps/desktop/src",
    },
  ],
}

const TASKS = {
  version: "2.0.0",
  tasks: [
    {
      label: "tauri:dev",
      type: "shell",
      command: "bun run dev",
      isBackground: true,
      problemMatcher: {
        pattern: {
          regexp: ".",
          file: 1,
          location: 2,
          message: 3,
        },
        background: {
          activeOnStart: true,
          beginsPattern: ".",
          endsPattern: "Listening",
        },
      },
    },
    {
      label: "typecheck",
      type: "shell",
      command: "bun typecheck",
      problemMatcher: "$tsc",
    },
    {
      label: "lint",
      type: "shell",
      command: "bun lint",
      problemMatcher: ["$eslint-stylish"],
    },
    {
      label: "lint:fix",
      type: "shell",
      command: "bun lint:fix",
      problemMatcher: ["$eslint-stylish"],
    },
    {
      label: "test:rust",
      type: "shell",
      command: "cargo test --workspace",
      problemMatcher: "$rustc",
    },
    {
      label: "build:check",
      type: "shell",
      command: "bun run tools/utils_build/build_check.ts",
      problemMatcher: [],
    },
  ],
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("Setting up VSCode/Cursor configuration...")
  console.log("─".repeat(50))

  // Create .vscode directory
  if (!existsSync(VSCODE_DIR)) {
    mkdirSync(VSCODE_DIR, { recursive: true })
    console.log(`✓ Created ${VSCODE_DIR}/`)
  }

  // Write extensions.json
  const extensionsPath = path.join(VSCODE_DIR, "extensions.json")
  await writeFile(extensionsPath, JSON.stringify(RECOMMENDED_EXTENSIONS, null, 2))
  console.log(`✓ Created ${extensionsPath}`)

  // Write settings.json (merge with existing)
  const settingsPath = path.join(VSCODE_DIR, "settings.json")
  let existingSettings = {}
  if (existsSync(settingsPath)) {
    try {
      const content = await readFile(settingsPath, "utf-8")
      existingSettings = JSON.parse(content)
    } catch {
      // Ignore parse errors
    }
  }
  const mergedSettings = { ...existingSettings, ...WORKSPACE_SETTINGS }
  await writeFile(settingsPath, JSON.stringify(mergedSettings, null, 2))
  console.log(`✓ Updated ${settingsPath}`)

  // Write launch.json
  const launchPath = path.join(VSCODE_DIR, "launch.json")
  await writeFile(launchPath, JSON.stringify(LAUNCH_CONFIGURATIONS, null, 2))
  console.log(`✓ Created ${launchPath}`)

  // Write tasks.json
  const tasksPath = path.join(VSCODE_DIR, "tasks.json")
  await writeFile(tasksPath, JSON.stringify(TASKS, null, 2))
  console.log(`✓ Created ${tasksPath}`)

  console.log()
  console.log("─".repeat(50))
  console.log("\x1b[32m✓ VSCode/Cursor configuration complete!\x1b[0m")
  console.log()
  console.log("Recommended next steps:")
  console.log("1. Reload VSCode/Cursor window")
  console.log("2. Install recommended extensions (popup should appear)")
  console.log("3. Run 'Developer: Reload Window' if settings don't apply")
}

main().catch(console.error)
