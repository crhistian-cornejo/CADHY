param(
    [string]$Version
)

$ErrorActionPreference = "Stop"

if (-not $Version) {
    Write-Error "Please provide a version number (e.g., 0.2.0)"
    exit 1
}

if (-not ($Version -match "^\d+\.\d+\.\d+$")) {
    Write-Error "Version must be in format X.Y.Z (e.g., 0.2.0)"
    exit 1
}

# Update package.json
$PackageJsonPath = "package.json"
$PackageJson = Get-Content $PackageJsonPath | ConvertFrom-Json
$PackageJson.version = $Version
$PackageJson | ConvertTo-Json -Depth 10 | Set-Content $PackageJsonPath

# Update tauri.conf.json
$TauriConfPath = "apps/desktop/src-tauri/tauri.conf.json"
if (Test-Path $TauriConfPath) {
    $TauriConf = Get-Content $TauriConfPath | ConvertFrom-Json
    $TauriConf.package.version = $Version
    # Pretty print JSON isn't perfect in PowerShell, but this works for basic updates
    $TauriConf | ConvertTo-Json -Depth 10 | Set-Content $TauriConfPath
    Write-Host "Updated tauri.conf.json to $Version" -ForegroundColor Green
} else {
    Write-Warning "tauri.conf.json not found at $TauriConfPath"
}

# Stage changes
git add package.json
git add $TauriConfPath

# Commit
git commit -m "chore: release v$Version"

# Tag
git tag "v$Version"

# Push
Write-Host "Pushing changes and tags to GitHub..." -ForegroundColor Cyan
git push
git push origin "v$Version"

Write-Host ""
Write-Host "Release v$Version triggered!" -ForegroundColor Green
Write-Host "Check GitHub Actions for build status." -ForegroundColor Yellow
