<# 
.SYNOPSIS
    Kills processes using development ports (5173 for desktop, 3000 for web)

.DESCRIPTION
    This script kills any processes using ports 5173 (Vite/Tauri) and 3000 (Web)
    to ensure clean restarts of development servers.

.EXAMPLE
    .\scripts\dev\kill-dev-ports.ps1
#>

$ErrorActionPreference = "SilentlyContinue"

$ports = @(5173, 3000, 1420)  # 5173=Vite desktop, 3000=Web, 1420=Tauri dev server

Write-Host "Killing processes on dev ports..." -ForegroundColor Yellow

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "  Killing $($process.ProcessName) (PID: $processId) on port $port" -ForegroundColor Cyan
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Small delay to ensure ports are released
Start-Sleep -Milliseconds 500

Write-Host "Dev ports cleared." -ForegroundColor Green
Write-Host ""
