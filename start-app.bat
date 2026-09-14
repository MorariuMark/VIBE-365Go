@echo off
title VIBE 365 - Habits and Fitness
cd /d "%~dp0"

echo ========================================================
echo   Launching VIBE 365 (Habits and Fitness)
echo ========================================================
echo.

echo Checking port 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

if exist ".next\BUILD_ID" (
    echo Clearing stale build artifacts...
    rd /s /q ".next" >nul 2>&1
)

echo Starting browser in background (http://localhost:3000)...
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:3000'"

echo Starting Next.js development server...
echo Press Ctrl+C in this window to stop the server.
echo ========================================================
echo.

npm run dev
pause
