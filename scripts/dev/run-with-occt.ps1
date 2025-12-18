<# 
.SYNOPSIS
    Runs a command with OCCT DLLs in PATH

.DESCRIPTION
    This script temporarily adds OCCT binary directory and all 3rdparty
    dependencies to PATH before running cargo commands.

.EXAMPLE
    .\scripts\run_with_occt.ps1 cargo test
    .\scripts\run_with_occt.ps1 cargo run -p graphcad-occt --example basic
    .\scripts\run_with_occt.ps1 cargo build --workspace

.NOTES
    Requires OCCT to be installed in deps/occt-7.9.2/
#>

param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$Command
)

$ErrorActionPreference = "Stop"

# Get script and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)

# OCCT paths
$OcctRoot = Join-Path $ProjectRoot "deps\occt-7.9.2"
$OcctBin = Join-Path $OcctRoot "win64\vc14\bin"
$OcctBinDebug = Join-Path $OcctRoot "win64\vc14\bind"

# 3rdparty dependencies directory
$ThirdPartyRoot = Join-Path $ProjectRoot "deps\3rdparty"

# Verify OCCT exists
if (-not (Test-Path $OcctBin)) {
    Write-Error @"
OCCT not found at: $OcctBin

Please run: .\scripts\occt\setup.ps1
"@
    exit 1
}

# Build PATH with all required directories
$PathDirs = @()

# OCCT binaries (debug first for priority)
if (Test-Path $OcctBinDebug) { $PathDirs += $OcctBinDebug }
$PathDirs += $OcctBin

# All 3rdparty bin directories (matching custom_vc14_64.bat)
$ThirdPartyDirs = @(
    "tcltk-8.6.15-x64\bin",
    "freetype-2.13.3-x64\bin",
    "freeimage-3.18.0-x64\bin",
    "tbb-2021.13.0-x64\bin",
    "vtk-9.4.1-x64\bin",
    "ffmpeg-3.3.4-64\bin",
    "jemalloc-vc14-64\bin",
    "openvr-1.14.15-64\bin\win64",
    "angle-gles2-2.1.0-vc14-64\bin",
    "zlib-1.2.8-vc14-64\bin",
    "gl2ps-1.3.8-vc14-64\bin",
    "draco-1.4.1-vc14-64\bin"
)

foreach ($dir in $ThirdPartyDirs) {
    $fullPath = Join-Path $ThirdPartyRoot $dir
    if (Test-Path $fullPath) {
        $PathDirs += $fullPath
    }
}

# Build final PATH string
$NewPath = ($PathDirs -join ";") + ";$env:PATH"
$env:PATH = $NewPath

# Set environment variables that OCCT expects
$env:OCCT_ROOT = $OcctRoot
$env:CASROOT = $OcctRoot
$env:THIRDPARTY_DIR = $ThirdPartyRoot
$env:CSF_OCCTBinPath = $OcctBin
$env:CSF_OCCTLibPath = (Join-Path $OcctRoot "win64\vc14\lib")
$env:CSF_OCCTIncludePath = (Join-Path $OcctRoot "inc")
$env:CSF_OCCTResourcePath = (Join-Path $OcctRoot "src")

# Load environment variables from .env.local for AI Gateway
# Check config/ first, then root for backwards compatibility
$EnvLocalPath = Join-Path $ProjectRoot "config\.env.local"
if (-not (Test-Path $EnvLocalPath)) {
    $EnvLocalPath = Join-Path $ProjectRoot ".env.local"
}
if (Test-Path $EnvLocalPath) {
    Write-Host "Loading environment from $EnvLocalPath..." -ForegroundColor Cyan
    Get-Content $EnvLocalPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            Set-Item -Path "env:$key" -Value $value
            if ($key -eq "AI_GATEWAY_API_KEY") {
                $keyLen = $value.Length
                Write-Host "  [OK] AI_GATEWAY_API_KEY loaded ($keyLen chars)" -ForegroundColor Green
            }
        }
    }
}

Write-Host ""
Write-Host "OCCT environment configured:" -ForegroundColor Green
Write-Host "  OCCT_ROOT: $OcctRoot" -ForegroundColor Cyan
Write-Host "  THIRDPARTY_DIR: $ThirdPartyRoot" -ForegroundColor Cyan
Write-Host "  Added $($PathDirs.Count) directories to PATH" -ForegroundColor Cyan
Write-Host ""

# Keep current working directory (don't change to project root)
$WorkingDir = Get-Location

if ($Command.Count -eq 0) {
    Write-Host "Usage: .\scripts\dev\run-with-occt.ps1 <command>" -ForegroundColor Yellow
    Write-Host "Example: .\scripts\dev\run-with-occt.ps1 cargo test" -ForegroundColor Yellow
    Write-Host "Example: .\scripts\dev\run-with-occt.ps1 bun run dev" -ForegroundColor Yellow
    exit 0
}

# Build command string
$CommandStr = $Command -join " "

# Windows-specific Tauri config
Write-Host "[Windows] Using custom window controls configuration" -ForegroundColor Cyan
$env:TAURI_PLATFORM = "windows"

# Replace tauri:dev with tauri:dev:windows and tauri:build with tauri:build:windows
$CommandStr = $CommandStr -replace "tauri:dev:platform", "tauri:dev:windows"
$CommandStr = $CommandStr -replace "tauri:dev(?!:)", "tauri:dev:windows"
$CommandStr = $CommandStr -replace "tauri:build(?!:)", "tauri:build:windows"
# Handle direct tauri commands
$CommandStr = $CommandStr -replace "tauri dev(?! --config)", "tauri dev --config src-tauri/tauri.windows.conf.json"
$CommandStr = $CommandStr -replace "tauri build(?! --config)", "tauri build --config src-tauri/tauri.windows.conf.json"

# Execute the command
Write-Host "Running: $CommandStr" -ForegroundColor Green
Write-Host "Working directory: $WorkingDir" -ForegroundColor Cyan
Write-Host ""

# Use Invoke-Expression to run command and capture output in real-time
Invoke-Expression $CommandStr
exit $LASTEXITCODE
