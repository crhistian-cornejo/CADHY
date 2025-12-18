<# 
.SYNOPSIS
    Copies required OCCT DLLs to the Tauri bundle resources directory

.DESCRIPTION
    This script copies all required OpenCASCADE and 3rd-party DLLs
    to the src-tauri/resources directory for bundling with the app.
    
    Must be run AFTER setup.ps1 has downloaded and extracted OCCT.

.EXAMPLE
    .\scripts\occt\copy-dlls.ps1
    
.NOTES
    This ensures the Windows installer includes all required DLLs
    so users don't need to install OCCT separately.
#>

$ErrorActionPreference = "Stop"

# Calculate project root correctly
# Script is at: scripts/occt/copy-dlls.ps1 (3 levels deep from root)
# In CI, prefer GITHUB_WORKSPACE for reliability
if ($env:GITHUB_WORKSPACE) {
    $ProjectRoot = $env:GITHUB_WORKSPACE
} else {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path  # scripts/occt
    $ScriptsDir = Split-Path -Parent $ScriptDir                   # scripts
    $ProjectRoot = Split-Path -Parent $ScriptsDir                 # root
}

# Source directories
$OcctRoot = Join-Path $ProjectRoot "deps\occt-7.9.2"
$OcctBin = Join-Path $OcctRoot "win64\vc14\bin"
$ThirdPartyRoot = Join-Path $ProjectRoot "deps\3rdparty"

# Destination directory (inside src-tauri for bundling)
$DestDir = Join-Path $ProjectRoot "apps\desktop\src-tauri\resources\occt-dlls"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CADHY OCCT DLL Bundler" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify OCCT exists
if (-not (Test-Path $OcctBin)) {
    Write-Error "OCCT not found at: $OcctBin`nPlease run: .\scripts\occt\setup.ps1 first"
    exit 1
}

# Create destination directory
if (Test-Path $DestDir) {
    Write-Host "[*] Cleaning existing DLLs directory..." -ForegroundColor Yellow
    Remove-Item $DestDir -Recurse -Force
}
New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
Write-Host "[+] Created: $DestDir" -ForegroundColor Green

# Required OCCT libraries (matching build.rs)
$RequiredLibs = @(
    # Foundation Classes
    "TKernel", "TKMath",
    # Modeling Data
    "TKG2d", "TKG3d", "TKGeomBase", "TKBRep",
    # Modeling Algorithms
    "TKGeomAlgo", "TKTopAlgo", "TKPrim", "TKBO", "TKBool", 
    "TKFillet", "TKShHealing", "TKMesh", "TKOffset",
    # Hidden Line Removal
    "TKHLR",
    # Data Exchange
    "TKDE", "TKXSBase", "TKDESTEP", "TKDEIGES", "TKDEGLTF",
    "TKDEOBJ", "TKDESTL", "TKDEPLY", "TKDEVRML", "TKRWMesh",
    # XDE
    "TKCDF", "TKLCAF", "TKXCAF"
)

# Copy OCCT DLLs
Write-Host ""
Write-Host "[*] Copying OCCT DLLs..." -ForegroundColor Yellow
$occtCopied = 0
foreach ($lib in $RequiredLibs) {
    $dllPath = Join-Path $OcctBin "$lib.dll"
    if (Test-Path $dllPath) {
        Copy-Item $dllPath -Destination $DestDir -Force
        $occtCopied++
    } else {
        Write-Host "    [!] Not found: $lib.dll" -ForegroundColor Yellow
    }
}
Write-Host "[+] Copied $occtCopied OCCT DLLs" -ForegroundColor Green

# Copy all DLLs from OCCT bin (includes dependencies)
# Some OCCT DLLs depend on others not in our explicit list
Write-Host ""
Write-Host "[*] Copying additional OCCT dependencies..." -ForegroundColor Yellow
$additionalDlls = Get-ChildItem $OcctBin -Filter "*.dll" | Where-Object { 
    $_.Name -notin ($RequiredLibs | ForEach-Object { "$_.dll" })
}
foreach ($dll in $additionalDlls) {
    Copy-Item $dll.FullName -Destination $DestDir -Force
}
Write-Host "[+] Copied $($additionalDlls.Count) additional OCCT DLLs" -ForegroundColor Green

# Copy 3rd-party DLLs (matching run-with-occt.ps1)
$ThirdPartyDirs = @(
    "tcltk-8.6.15-x64\bin",
    "freetype-2.13.3-x64\bin",
    "freeimage-3.18.0-x64\bin",
    "tbb-2021.13.0-x64\bin"
    # Note: VTK, ffmpeg, jemalloc, etc. are optional visualization libs
    # Only including required runtime dependencies
)

Write-Host ""
Write-Host "[*] Copying 3rd-party DLLs..." -ForegroundColor Yellow
$thirdPartyCopied = 0
foreach ($dir in $ThirdPartyDirs) {
    $fullPath = Join-Path $ThirdPartyRoot $dir
    if (Test-Path $fullPath) {
        $dlls = Get-ChildItem $fullPath -Filter "*.dll" -ErrorAction SilentlyContinue
        foreach ($dll in $dlls) {
            # Skip debug versions (d.dll suffix)
            if ($dll.Name -notmatch 'd\.dll$') {
                Copy-Item $dll.FullName -Destination $DestDir -Force
                $thirdPartyCopied++
            }
        }
    }
}
Write-Host "[+] Copied $thirdPartyCopied 3rd-party DLLs" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$totalDlls = (Get-ChildItem $DestDir -Filter "*.dll").Count
$totalSize = [math]::Round(((Get-ChildItem $DestDir | Measure-Object -Property Length -Sum).Sum / 1MB), 2)
Write-Host "[+] Total DLLs: $totalDlls" -ForegroundColor Green
Write-Host "[+] Total size: $totalSize MB" -ForegroundColor Green
Write-Host "[+] Location: $DestDir" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Build the app with 'bun run tauri:build:windows'" -ForegroundColor Yellow
