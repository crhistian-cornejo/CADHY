import { execSync } from "node:child_process"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Get git info for build metadata
function getGitInfo() {
  try {
    const gitCommit = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim()
    const gitBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim()
    const gitDirty = execSync("git status --porcelain", { encoding: "utf-8" }).trim().length > 0
    return { gitCommit, gitBranch, gitDirty }
  } catch {
    return { gitCommit: "unknown", gitBranch: "unknown", gitDirty: false }
  }
}

// Get Rust/Tauri versions
function getRustVersion() {
  try {
    const rustc = execSync("rustc --version", { encoding: "utf-8" }).trim()
    return rustc.replace("rustc ", "").split(" ")[0]
  } catch {
    return "unknown"
  }
}

export default defineConfig(({ mode }) => {
  const isDev = mode === "development"
  const git = getGitInfo()
  const rustVersion = getRustVersion()
  const buildTimestamp = new Date().toISOString()

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Define global constants for build info
    define: {
      __DEV__: JSON.stringify(isDev),
      __GIT_COMMIT__: JSON.stringify(git.gitCommit),
      __GIT_BRANCH__: JSON.stringify(git.gitBranch),
      __GIT_DIRTY__: JSON.stringify(git.gitDirty),
      __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
      __RUST_VERSION__: JSON.stringify(rustVersion),
      __TAURI_VERSION__: JSON.stringify("2.x"),
    },
    // Load env from monorepo root
    envDir: path.resolve(__dirname, "../.."),
    // Tauri expects a fixed port
    server: {
      port: 5173,
      strictPort: true,
    },
    clearScreen: false,
    envPrefix: ["VITE_", "TAURI_"],
    build: {
      target: "esnext",
      minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
      sourcemap: !!process.env.TAURI_DEBUG,
    },
  }
})
