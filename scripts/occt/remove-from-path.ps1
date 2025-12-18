<# 
.SYNOPSIS
    Removes OCCT paths from User PATH
    
.DESCRIPTION
    Removes the OpenCASCADE DLL directories from your User PATH environment variable.
    Use this to clean up if you no longer need OCCT in your permanent PATH.
    
.EXAMPLE
    .\scripts\remove_occt_from_path.ps1
#>

$ErrorActionPreference = "Stop"

# Get project root: scripts/occt -> scripts -> root
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# Paths to remove (patterns)
$PatternsToRemove = @(
    "*occt*",
    "*3rdparty\tbb*",
    "*3rdparty\freetype*",
    "*3rdparty\freeimage*",
    "*3rdparty\tcltk*"
)

# Get current User PATH
$CurrentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$CurrentPaths = $CurrentPath -split ";" | Where-Object { $_ -ne "" }

# Find paths to remove
$PathsToRemove = @()
$PathsToKeep = @()

foreach ($path in $CurrentPaths) {
    $ShouldRemove = $false
    foreach ($pattern in $PatternsToRemove) {
        if ($path -like $pattern) {
            $ShouldRemove = $true
            break
        }
    }
    
    if ($ShouldRemove) {
        $PathsToRemove += $path
    } else {
        $PathsToKeep += $path
    }
}

if ($PathsToRemove.Count -eq 0) {
    Write-Host "No OCCT-related paths found in User PATH." -ForegroundColor Green
    exit 0
}

Write-Host "The following paths will be REMOVED from your User PATH:" -ForegroundColor Yellow
foreach ($path in $PathsToRemove) {
    Write-Host "  - $path" -ForegroundColor Red
}

$Confirm = Read-Host "`nContinue? (y/N)"

if ($Confirm -ne "y" -and $Confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Gray
    exit 0
}

# Remove paths
$NewPath = $PathsToKeep -join ";"
[Environment]::SetEnvironmentVariable("PATH", $NewPath, "User")

Write-Host "`nSUCCESS: OCCT paths removed from User PATH!" -ForegroundColor Green
Write-Host "Restart your terminal for changes to take effect." -ForegroundColor Yellow
