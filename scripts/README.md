# Scripts - GraphCAD-AI

Utility scripts organized by category.

## 📁 Structure

```
scripts/
├── core/           # Main orchestration scripts
│   ├── dev-all.ts      # Start all dev servers
│   ├── run-cross.ts    # Cross-platform command runner
│   └── test-react.ts   # React test runner
├── dev/            # Development helpers
├── occt/           # OpenCASCADE setup (Windows only)
└── release/        # Release automation
```

## 🚀 Quick Start

### macOS

```bash
# 1. Install OpenCASCADE via Homebrew
brew install opencascade

# 2. Install dependencies
bun install

# 3. Run development server
bun run dev
```

### Windows

```powershell
# 1. Install OpenCASCADE (run once)
.\scripts\occt\setup.ps1

# 2. Add OCCT to PATH permanently (optional, requires restart)
.\scripts\occt\add-to-path.ps1

# 3. Install dependencies
bun install

# 4. Run development server
bun run dev
```

### Linux

```bash
# 1. Install OpenCASCADE from package manager
# Ubuntu/Debian:
sudo apt install libocct-data-exchange-dev libocct-draw-dev

# Fedora:
sudo dnf install opencascade-devel

# 2. Install dependencies
bun install

# 3. Run development server
bun run dev
```

## 📦 Available Scripts

### Root package.json

| Script | Description |
|--------|-------------|
| `bun run dev` | Start desktop app in development mode |
| `bun run dev:all` | Start both web and desktop dev servers |
| `bun run build` | Build the desktop app for production |
| `bun run test` | Run all tests |
| `bun run typecheck` | Type-check all packages |
| `bun run format` | Format code with Biome |
| `bun run lint` | Lint code with Biome |

## 🔧 Development Scripts (`dev/`)

| Script | Platform | Description |
|--------|----------|-------------|
| `run-with-occt.sh` | macOS/Linux | Runs command with env vars from `.env.local` |
| `run-with-occt.ps1` | Windows | Runs command with OCCT in PATH |
| `kill-dev-ports.sh` | macOS/Linux | Kills processes on dev ports (3000, 1420) |
| `kill-dev-ports.ps1` | Windows | Kills processes on dev ports |

## 🔩 OCCT Scripts (`occt/`) - Windows Only

| Script | Description |
|--------|-------------|
| `setup.ps1` | Downloads and installs OCCT 7.9.2 binaries |
| `add-to-path.ps1` | Adds OCCT DLLs to system PATH permanently |
| `remove-from-path.ps1` | Removes OCCT from system PATH |

## 📋 How It Works

### Cross-Platform Command Execution

`run-cross.ts` wraps commands to:
- **Windows**: Execute via `run-with-occt.ps1` (sets up OCCT PATH)
- **macOS/Linux**: Execute via `run-with-occt.sh` (loads `.env.local`)

### macOS-Specific Configuration

On macOS, the scripts automatically:
- Use `tauri:dev:macos` instead of `tauri:dev` for native traffic lights
- Load environment variables from `.env.local`

### Environment Variables

Create `.env.local` in the project root with:

```env
AI_GATEWAY_API_KEY=your_api_key_here
```

This file is automatically loaded by the dev scripts.

## ⚠️ Troubleshooting

### OCCT Not Found (macOS)

```bash
# Reinstall OpenCASCADE
brew reinstall opencascade

# Verify installation
ls /opt/homebrew/opt/opencascade/lib  # Apple Silicon
ls /usr/local/opt/opencascade/lib     # Intel
```

### OCCT Not Found (Windows)

```powershell
# Run the setup script
.\scripts\occt\setup.ps1

# Verify installation
dir .\deps\occt-7.9.2\win64\vc14\bin
```

### Build Errors

```bash
# Clean and rebuild
bun run clean
rm -rf node_modules
bun install
cd rust && cargo clean && cd ..
bun run build
```
