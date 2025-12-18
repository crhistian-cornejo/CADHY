import { spawn } from "node:child_process"
import { platform } from "node:os"
import { join } from "node:path"

const currentPlatform = platform()
const projectRoot = process.cwd()

async function killDevPorts(): Promise<void> {
  return new Promise((resolve, reject) => {
    let killCommand: string
    let killArgs: string[]

    if (currentPlatform === "win32") {
      const scriptPath = join(projectRoot, "scripts", "dev", "kill-dev-ports.ps1")
      killCommand = "powershell"
      killArgs = ["-ExecutionPolicy", "Bypass", "-File", scriptPath]
    } else {
      const scriptPath = join(projectRoot, "scripts", "dev", "kill-dev-ports.sh")
      killCommand = "bash"
      killArgs = [scriptPath]
    }

    const child = spawn(killCommand, killArgs, {
      stdio: "inherit",
      cwd: projectRoot,
      env: process.env,
    })

    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`kill-dev-ports script exited with code ${code}`))
      }
    })

    child.on("error", (err) => {
      reject(err)
    })
  })
}

async function startWebDev(): Promise<void> {
  return new Promise((resolve) => {
    let webCommand: string
    let webArgs: string[]

    if (currentPlatform === "win32") {
      webCommand = "powershell"
      webArgs = [
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Start-Process -NoNewWindow powershell -ArgumentList '-Command bun run dev:web'",
      ]
    } else {
      // On macOS/Linux, run in background
      webCommand = "bun"
      webArgs = ["run", "dev:web"]
    }

    const webProcess = spawn(webCommand, webArgs, {
      stdio: currentPlatform === "win32" ? "inherit" : "ignore",
      cwd: projectRoot,
      env: process.env,
      detached: currentPlatform !== "win32",
    })

    if (currentPlatform !== "win32") {
      webProcess.unref()
    }

    // Wait a bit for web server to start
    setTimeout(() => {
      console.log("\x1b[32m✓ Web dev server started\x1b[0m")
      resolve()
    }, 1000)
  })
}

async function startDesktopDev(): Promise<void> {
  return new Promise(() => {
    let desktopCommand: string
    let desktopArgs: string[]

    const tauriCommand = "bun run --filter @graphcad/desktop tauri:dev"

    if (currentPlatform === "win32") {
      const scriptPath = join(projectRoot, "scripts", "dev", "run-with-occt.ps1")
      desktopCommand = "powershell"
      desktopArgs = ["-ExecutionPolicy", "Bypass", "-File", scriptPath, tauriCommand]
    } else {
      const scriptPath = join(projectRoot, "scripts", "dev", "run-with-occt.sh")
      desktopCommand = "bash"
      desktopArgs = [scriptPath, tauriCommand]
    }

    console.log("\x1b[36mStarting desktop dev server with OCCT...\x1b[0m")

    const desktopProcess = spawn(desktopCommand, desktopArgs, {
      stdio: "inherit",
      cwd: projectRoot,
      env: process.env,
    })

    desktopProcess.on("exit", (code) => {
      console.log(`\x1b[33mDesktop dev server exited with code ${code}\x1b[0m`)
      process.exit(code ?? 0)
    })

    desktopProcess.on("error", (err) => {
      console.error("\x1b[31mError starting desktop dev server:\x1b[0m", err)
      process.exit(1)
    })
  })
}

async function main() {
  try {
    console.log("\x1b[1m\x1b[35m🚀 Starting GraphCAD development servers...\x1b[0m\n")

    // Step 1: Kill existing processes on dev ports
    await killDevPorts()

    // Step 2: Start web dev server in background
    await startWebDev()

    // Step 3: Start desktop dev server (this will keep running)
    await startDesktopDev()
  } catch (error) {
    console.error("\x1b[31mError during startup:\x1b[0m", error)
    process.exit(1)
  }
}

main()
