<# 
.SYNOPSIS
    Adds OCCT and dependencies to User PATH permanently (persists across reboots)
    
.DESCRIPTION
    This script adds the OpenCASCADE DLL directories to your User PATH environment variable.
    This is OPTIONAL - only needed if you want to run Rust tests without using run_with_occt.ps1
    
.EXAMPLE
    .\scripts\add_occt_to_path.ps1
    
.NOTES
    - Requires running from GraphCAD-AI root directory
    - Changes persist after reboot
    - Safe to run multiple times (won't duplicate paths)
    - To remove, manually edit Environment Variables in Windows Settings
#>

$ErrorActionPreference = "Stop"

# Get project root: scripts/occt -> scripts -> root
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Paths to add
$PathsToAdd = @(
    "$ProjectRoot\deps\occt-7.9.2\win64\vc14\bin",
    "$ProjectRoot\deps\3rdparty\tbb-2021.13.0-x64\bin",
    "$ProjectRoot\deps\3rdparty\freetype-2.13.3-x64\bin",
    "$ProjectRoot\deps\3rdparty\freeimage-3.18.0-x64\bin",
    "$ProjectRoot\deps\3rdparty\tcltk-8.6.15-x64\bin"
)

# Verify paths exist
Write-Host "Verifying OCCT installation..." -ForegroundColor Cyan
$MissingPaths = @()
foreach ($path in $PathsToAdd) {
    if (-not (Test-Path $path)) {
        $MissingPaths += $path
    }
}

if ($MissingPaths.Count -gt 0) {
    Write-Host "`nERROR: Some paths don't exist. Run setup_occt.ps1 first:" -ForegroundColor Red
    foreach ($path in $MissingPaths) {
        Write-Host "  - $path" -ForegroundColor Yellow
    }
    Write-Host "`nRun: .\scripts\setup_occt.ps1" -ForegroundColor Cyan
    exit 1
}

# Get current User PATH
$CurrentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$CurrentPaths = $CurrentPath -split ";" | Where-Object { $_ -ne "" }

# Add new paths if not already present
$AddedPaths = @()
foreach ($path in $PathsToAdd) {
    $NormalizedPath = $path.TrimEnd("\")
    $AlreadyExists = $CurrentPaths | Where-Object { $_.TrimEnd("\") -eq $NormalizedPath }
    
    if (-not $AlreadyExists) {
        $AddedPaths += $NormalizedPath
    }
}

if ($AddedPaths.Count -eq 0) {
    Write-Host "`nAll OCCT paths are already in your User PATH." -ForegroundColor Green
    Write-Host "No changes needed." -ForegroundColor Gray
    exit 0
}

# Confirm with user
Write-Host "`nThe following paths will be added to your User PATH:" -ForegroundColor Yellow
foreach ($path in $AddedPaths) {
    Write-Host "  + $path" -ForegroundColor Green
}

Write-Host "`nThis change will persist across reboots." -ForegroundColor Cyan
$Confirm = Read-Host "Continue? (y/N)"

if ($Confirm -ne "y" -and $Confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Gray
    exit 0
}

# Add paths
$NewPath = ($CurrentPaths + $AddedPaths) -join ";"
[Environment]::SetEnvironmentVariable("PATH", $NewPath, "User")

Write-Host "`nSUCCESS: OCCT paths added to User PATH!" -ForegroundColor Green
Write-Host "`nIMPORTANT: You need to restart your terminal for changes to take effect." -ForegroundColor Yellow
Write-Host "After restart, you can run 'cargo test --workspace' directly without run_with_occt.ps1" -ForegroundColor Gray

# Also update current session
$env:PATH = $NewPath + ";" + $env:PATH
Write-Host "`nCurrent session PATH has been updated. You can test now:" -ForegroundColor Cyan
Write-Host "  cargo test --workspace" -ForegroundColor White
