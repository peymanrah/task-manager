# Task Manager Control Tower — Persistent Server Launcher
# This script ensures the server keeps running with auto-restart on crash.

# Refresh PATH so Node.js is available
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")

Set-Location "$PSScriptRoot\server"

$maxRetries = 50
$retryDelay = 3  # seconds between restart attempts
$attempt = 0

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host " Task Manager Control Tower Server" -ForegroundColor Cyan
Write-Host " Auto-restart enabled ($maxRetries retries)" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

while ($attempt -lt $maxRetries) {
    $attempt++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    if ($attempt -gt 1) {
        Write-Host ""
        Write-Host "[$timestamp] Restarting server (attempt $attempt/$maxRetries)..." -ForegroundColor Yellow
        Start-Sleep -Seconds $retryDelay
    } else {
        Write-Host "[$timestamp] Starting server..." -ForegroundColor Green
    }
    
    try {
        # Run the server directly with ts-node
        npx ts-node src/index.ts
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Host "[$timestamp] Server exited cleanly." -ForegroundColor Green
            break
        } else {
            Write-Host "[$timestamp] Server exited with code $exitCode" -ForegroundColor Red
        }
    } catch {
        Write-Host "[$timestamp] Server crashed: $_" -ForegroundColor Red
    }
}

if ($attempt -ge $maxRetries) {
    Write-Host "Max retries ($maxRetries) reached. Server will not restart." -ForegroundColor Red
}
