import { spawn } from "node:child_process"
import { platform } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const currentPlatform = platform()
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error("Please provide a command to run.")
  process.exit(1)
}

const commandToRun = args.join(" ")

// IMPORTANT:
// Use the repo root based on this script location, not process.cwd().
// This makes the wrapper work even when invoked from a workspace package.
const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(scriptDir, "..", "..")

function runAndWait(cmd: string, cmdArgs: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, {
      stdio: "inherit",
      cwd: projectRoot,
      env: process.env,
    })

    child.on("exit", (code) => resolve(code ?? 0))
  })
}

async function maybeKillDevPorts() {
  // Only do this for desktop dev runs.
  // This avoids randomly killing ports for build/test scripts.
  const shouldKillPorts =
    /\btauri:dev\b/.test(commandToRun) || /\btauri\b.*\bdev\b/.test(commandToRun)

  if (!shouldKillPorts) return

  if (currentPlatform === "win32") {
    const killScript = join(projectRoot, "scripts", "dev", "kill-dev-ports.ps1")
    await runAndWait("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      killScript,
    ])
    return
  }

  const killScript = join(projectRoot, "scripts", "dev", "kill-dev-ports.sh")
  await runAndWait("bash", [killScript])
}

async function main() {
  await maybeKillDevPorts()

  let shellCommand: string
  let shellArgs: string[]

  if (currentPlatform === "win32") {
    const scriptPath = join(projectRoot, "scripts", "dev", "run-with-occt.ps1")
    shellCommand = "powershell"
    shellArgs = ["-ExecutionPolicy", "Bypass", "-File", scriptPath, commandToRun]
  } else {
    const scriptPath = join(projectRoot, "scripts", "dev", "run-with-occt.sh")
    shellCommand = "bash"
    shellArgs = [scriptPath, commandToRun]
  }

  const exitCode = await runAndWait(shellCommand, shellArgs)
  process.exit(exitCode)
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(msg)
  process.exit(1)
})
