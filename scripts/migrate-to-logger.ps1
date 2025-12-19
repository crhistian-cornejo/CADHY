#
# migrate-to-logger.ps1
# Migrates console.log/warn/info/debug to logger equivalents
# Usage: .\scripts\migrate-to-logger.ps1
#

$ErrorActionPreference = "Stop"

Write-Host "🔍 Searching for TypeScript files to migrate..." -ForegroundColor Cyan

$totalFiles = 0
$totalChanges = 0

# Function to process a single file
function Process-File {
    param (
        [string]$FilePath
    )

    $content = Get-Content $FilePath -Raw
    $newContent = $content
    $changes = 0

    # Check if file already has logger import
    $hasLoggerImport = $content -match "from '@cadhy/shared/logger'"

    # Count occurrences
    $logCount = ([regex]::Matches($content, 'console\.log')).Count
    $warnCount = ([regex]::Matches($content, 'console\.warn')).Count
    $infoCount = ([regex]::Matches($content, 'console\.info')).Count
    $debugCount = ([regex]::Matches($content, 'console\.debug')).Count

    $total = $logCount + $warnCount + $infoCount + $debugCount

    if ($total -eq 0) {
        return
    }

    Write-Host "📝 $FilePath" -ForegroundColor Yellow
    Write-Host "   Found: $logCount log, $warnCount warn, $infoCount info, $debugCount debug"

    # Replace console.* with logger.*
    $newContent = $newContent -replace 'console\.log\b', 'logger.log'
    $newContent = $newContent -replace 'console\.warn\b', 'logger.warn'
    $newContent = $newContent -replace 'console\.info\b', 'logger.info'
    $newContent = $newContent -replace 'console\.debug\b', 'logger.debug'

    # Add import if not present
    if (-not $hasLoggerImport) {
        # Find last import line
        $lines = $content -split "`n"
        $lastImportIndex = -1

        for ($i = 0; $i -lt $lines.Length; $i++) {
            if ($lines[$i] -match "^import .* from") {
                $lastImportIndex = $i
            }
        }

        if ($lastImportIndex -ge 0) {
            $beforeImport = $lines[0..$lastImportIndex] -join "`n"
            $afterImport = $lines[($lastImportIndex + 1)..($lines.Length - 1)] -join "`n"
            $newContent = $beforeImport + "`nimport { logger } from '@cadhy/shared/logger'" + "`n" + $afterImport
            $changes++
        }
    }

    $changes += $total

    # Write changes back to file
    Set-Content -Path $FilePath -Value $newContent -NoNewline

    Write-Host "   ✅ Replaced $changes occurrences" -ForegroundColor Green
    Write-Host ""

    $script:totalChanges += $changes
    $script:totalFiles++
}

# Find all TypeScript files (excluding node_modules, dist, and test files)
$files = Get-ChildItem -Path "apps\desktop\src" -Recurse -Include "*.ts", "*.tsx" |
    Where-Object {
        $_.FullName -notmatch "node_modules" -and
        $_.FullName -notmatch "dist" -and
        $_.Name -notmatch "\.test\.(ts|tsx)$"
    }

foreach ($file in $files) {
    Process-File -FilePath $file.FullName
}

Write-Host ""
Write-Host "✨ Migration complete!" -ForegroundColor Green
Write-Host "   Total changes: $totalChanges across $totalFiles files"
Write-Host ""
Write-Host "⚠️  Next steps:" -ForegroundColor Yellow
Write-Host "   1. Run: bun typecheck"
Write-Host "   2. Run: bun lint:fix"
Write-Host "   3. Test the app manually"
