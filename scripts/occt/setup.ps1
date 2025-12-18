# GraphCAD-AI OpenCASCADE Setup Script
# Downloads and configures pre-compiled OpenCASCADE 7.9.2 for Windows
# Includes all bug fixes for solvers and boolean operations

$ErrorActionPreference = "Stop"

$PROJECT_ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DEPS_DIR = Join-Path $PROJECT_ROOT "deps"
$OCCT_VERSION = "7.9.2"
$OCCT_TAG = "V7_9_2"

# New archive names for V7.9.x releases
$OCCT_ARCHIVE = "opencascade-with-debug-pch.zip"
$THIRDPARTY_ARCHIVE = "3rdparty-vc14-64.zip"

$OCCT_URL = "https://github.com/Open-Cascade-SAS/OCCT/releases/download/$OCCT_TAG/$OCCT_ARCHIVE"
$THIRDPARTY_URL = "https://github.com/Open-Cascade-SAS/OCCT/releases/download/$OCCT_TAG/$THIRDPARTY_ARCHIVE"

$OCCT_DIR = Join-Path $DEPS_DIR "occt-$OCCT_VERSION"
$THIRDPARTY_DIR = Join-Path $DEPS_DIR "3rdparty"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GraphCAD-AI OpenCASCADE $OCCT_VERSION Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This version includes fixes for:" -ForegroundColor Gray
Write-Host "  - IntAna_IntQuadQuad solver bugs" -ForegroundColor Gray
Write-Host "  - Bnd_Box CornerMax issues" -ForegroundColor Gray
Write-Host "  - UnifySameDomain crashes" -ForegroundColor Gray
Write-Host "  - GeomFill_CorrectedFrenet hangs" -ForegroundColor Gray
Write-Host "  - Infinite loop in Fuse operations" -ForegroundColor Gray
Write-Host ""

# Create deps directory
if (-not (Test-Path $DEPS_DIR)) {
    New-Item -ItemType Directory -Path $DEPS_DIR | Out-Null
    Write-Host "[+] Created deps directory" -ForegroundColor Green
}

# Function to download with progress
function Download-WithProgress {
    param(
        [string]$Url,
        [string]$OutFile,
        [string]$Description
    )

    Write-Host "[*] Downloading $Description..." -ForegroundColor Yellow
    Write-Host "    URL: $Url" -ForegroundColor Gray

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
        $ProgressPreference = 'Continue'

        Write-Host "[+] Download complete: $Description" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[!] Failed to download $Description" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
        return $false
    }
}

# Download and extract OCCT
$occtArchivePath = Join-Path $DEPS_DIR $OCCT_ARCHIVE
$occtExtractDir = Join-Path $DEPS_DIR "occt-extract"

if (-not (Test-Path $OCCT_DIR)) {
    # Download OCCT
    if (-not (Test-Path $occtArchivePath)) {
        $success = Download-WithProgress -Url $OCCT_URL -OutFile $occtArchivePath -Description "OpenCASCADE $OCCT_VERSION (256 MB)"
        if (-not $success) {
            Write-Host ""
            Write-Host "Please download manually:" -ForegroundColor Yellow
            Write-Host "  1. Go to: https://github.com/Open-Cascade-SAS/OCCT/releases/tag/$OCCT_TAG" -ForegroundColor White
            Write-Host "  2. Download: $OCCT_ARCHIVE" -ForegroundColor White
            Write-Host "  3. Place in: $DEPS_DIR" -ForegroundColor White
            exit 1
        }
    }

    # Extract OCCT (handles nested zips from GitHub releases)
    Write-Host "[*] Extracting OpenCASCADE..." -ForegroundColor Yellow

    # Extract to temp directory first
    if (Test-Path $occtExtractDir) {
        Remove-Item $occtExtractDir -Recurse -Force
    }
    Expand-Archive -Path $occtArchivePath -DestinationPath $occtExtractDir -Force

    # Check for nested zip (GitHub releases often have zip inside zip)
    $innerZip = Get-ChildItem $occtExtractDir -Filter "*.zip" -Recurse | Select-Object -First 1
    if ($innerZip) {
        Write-Host "[*] Found nested archive, extracting..." -ForegroundColor Yellow
        Expand-Archive -Path $innerZip.FullName -DestinationPath $occtExtractDir -Force
        Remove-Item $innerZip.FullName -Force
    }

    # Find the actual OCCT directory (might be nested)
    $occtContent = Get-ChildItem $occtExtractDir -Directory | Where-Object { $_.Name -like "opencascade*" -or $_.Name -like "occt*" }
    if ($occtContent) {
        # Move contents up if nested
        New-Item -ItemType Directory -Path $OCCT_DIR -Force | Out-Null
        Get-ChildItem $occtContent.FullName | Move-Item -Destination $OCCT_DIR -Force
        Remove-Item $occtExtractDir -Recurse -Force
    } else {
        # Direct content - just rename
        Rename-Item $occtExtractDir $OCCT_DIR
    }

    Write-Host "[+] Extraction complete" -ForegroundColor Green
} else {
    Write-Host "[+] OpenCASCADE already installed at: $OCCT_DIR" -ForegroundColor Green
}

# Download and extract 3rd-party dependencies
$thirdpartyArchivePath = Join-Path $DEPS_DIR $THIRDPARTY_ARCHIVE
$thirdpartyExtractDir = Join-Path $DEPS_DIR "3rdparty-extract"

if (-not (Test-Path $THIRDPARTY_DIR)) {
    # Download 3rd-party
    if (-not (Test-Path $thirdpartyArchivePath)) {
        $success = Download-WithProgress -Url $THIRDPARTY_URL -OutFile $thirdpartyArchivePath -Description "3rd-party dependencies (180 MB)"
        if (-not $success) {
            Write-Host "[!] Warning: 3rd-party dependencies not downloaded" -ForegroundColor Yellow
            Write-Host "    Some features may not work without them" -ForegroundColor Yellow
        }
    }

    if (Test-Path $thirdpartyArchivePath) {
        Write-Host "[*] Extracting 3rd-party dependencies..." -ForegroundColor Yellow

        # Extract to temp directory
        if (Test-Path $thirdpartyExtractDir) {
            Remove-Item $thirdpartyExtractDir -Recurse -Force
        }
        Expand-Archive -Path $thirdpartyArchivePath -DestinationPath $thirdpartyExtractDir -Force

        # Check for nested zip
        $innerZip = Get-ChildItem $thirdpartyExtractDir -Filter "*.zip" -Recurse | Select-Object -First 1
        if ($innerZip) {
            Write-Host "[*] Found nested archive, extracting..." -ForegroundColor Yellow
            Expand-Archive -Path $innerZip.FullName -DestinationPath $thirdpartyExtractDir -Force
            Remove-Item $innerZip.FullName -Force
        }

        # Find the 3rdparty directory
        $thirdpartyContent = Get-ChildItem $thirdpartyExtractDir -Directory | Where-Object { $_.Name -like "*3rdparty*" }
        if ($thirdpartyContent) {
            New-Item -ItemType Directory -Path $THIRDPARTY_DIR -Force | Out-Null
            Get-ChildItem $thirdpartyContent.FullName | Move-Item -Destination $THIRDPARTY_DIR -Force
            Remove-Item $thirdpartyExtractDir -Recurse -Force
        } else {
            Rename-Item $thirdpartyExtractDir $THIRDPARTY_DIR
        }

        Write-Host "[+] 3rd-party extraction complete" -ForegroundColor Green
    }
} else {
    Write-Host "[+] 3rd-party already installed at: $THIRDPARTY_DIR" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Verifying Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Try multiple possible directory structures
$possibleIncludeDirs = @(
    (Join-Path $OCCT_DIR "inc"),
    (Join-Path $OCCT_DIR "include"),
    (Join-Path $OCCT_DIR "opencascade-$OCCT_VERSION\inc")
)

$possibleLibDirs = @(
    (Join-Path $OCCT_DIR "win64\vc14\lib"),
    (Join-Path $OCCT_DIR "lib"),
    (Join-Path $OCCT_DIR "win64\vc143\lib"),
    (Join-Path $OCCT_DIR "opencascade-$OCCT_VERSION\win64\vc14\lib")
)

$possibleBinDirs = @(
    (Join-Path $OCCT_DIR "win64\vc14\bin"),
    (Join-Path $OCCT_DIR "bin"),
    (Join-Path $OCCT_DIR "win64\vc143\bin"),
    (Join-Path $OCCT_DIR "opencascade-$OCCT_VERSION\win64\vc14\bin")
)

$includeDir = $null
$libDir = $null
$binDir = $null

foreach ($dir in $possibleIncludeDirs) {
    if (Test-Path $dir) {
        $includeDir = $dir
        break
    }
}

foreach ($dir in $possibleLibDirs) {
    if (Test-Path $dir) {
        $libDir = $dir
        break
    }
}

foreach ($dir in $possibleBinDirs) {
    if (Test-Path $dir) {
        $binDir = $dir
        break
    }
}

# Show directory structure for debugging
Write-Host "[*] OCCT directory structure:" -ForegroundColor Gray
Get-ChildItem $OCCT_DIR -Depth 1 | ForEach-Object {
    $indent = if ($_.PSIsContainer) { "[D]" } else { "[F]" }
    Write-Host "    $indent $($_.Name)" -ForegroundColor Gray
}

if ($includeDir) {
    Write-Host "[+] Include directory: $includeDir" -ForegroundColor Green
} else {
    Write-Host "[!] Include directory not found" -ForegroundColor Yellow
}

if ($libDir) {
    Write-Host "[+] Library directory: $libDir" -ForegroundColor Green
} else {
    Write-Host "[!] Library directory not found" -ForegroundColor Yellow
}

if ($binDir) {
    Write-Host "[+] Binary directory: $binDir" -ForegroundColor Green
} else {
    Write-Host "[!] Binary directory not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Environment Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variables for current session
$env:DEP_OCCT_ROOT = $OCCT_DIR
$env:OCCT_ROOT = $OCCT_DIR
$env:CASROOT = $OCCT_DIR

Write-Host "[+] Set DEP_OCCT_ROOT=$OCCT_DIR" -ForegroundColor Green
Write-Host "[+] Set OCCT_ROOT=$OCCT_DIR" -ForegroundColor Green
Write-Host "[+] Set CASROOT=$OCCT_DIR" -ForegroundColor Green

if ($THIRDPARTY_DIR -and (Test-Path $THIRDPARTY_DIR)) {
    $env:OCCT_3RDPARTY = $THIRDPARTY_DIR
    Write-Host "[+] Set OCCT_3RDPARTY=$THIRDPARTY_DIR" -ForegroundColor Green
}

# Add bin to PATH if exists
if ($binDir) {
    if ($env:PATH -notlike "*$binDir*") {
        $env:PATH = "$binDir;$env:PATH"
        Write-Host "[+] Added OCCT bin to PATH" -ForegroundColor Green
    }
}

# Add CMake to PATH if found
$cmakePaths = @(
    "C:\Program Files\CMake\bin",
    "C:\Program Files (x86)\CMake\bin"
)
foreach ($cmakePath in $cmakePaths) {
    if (Test-Path "$cmakePath\cmake.exe") {
        if ($env:PATH -notlike "*$cmakePath*") {
            $env:PATH = "$cmakePath;$env:PATH"
            Write-Host "[+] Added CMake to PATH" -ForegroundColor Green
        }
        break
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Permanent Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To set environment variables permanently, run:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [Environment]::SetEnvironmentVariable('DEP_OCCT_ROOT', '$OCCT_DIR', 'User')" -ForegroundColor White
Write-Host "  [Environment]::SetEnvironmentVariable('OCCT_ROOT', '$OCCT_DIR', 'User')" -ForegroundColor White
Write-Host "  [Environment]::SetEnvironmentVariable('CASROOT', '$OCCT_DIR', 'User')" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Ready to Build!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "OpenCASCADE $OCCT_VERSION is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. cargo build --release" -ForegroundColor White
Write-Host ""
Write-Host "If build fails, ensure these are set in your terminal:" -ForegroundColor Gray
Write-Host "  `$env:DEP_OCCT_ROOT = '$OCCT_DIR'" -ForegroundColor Gray
Write-Host ""

