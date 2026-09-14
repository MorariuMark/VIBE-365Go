@echo off
title VIBE 365 - Habits ^& Fitness
cd /d "D:\VIBE-365Go"

echo ========================================================
echo   Launching VIBE 365
echo ========================================================
echo.

:: 1. Free port 3000 if already occupied by any previous zombie process
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Freeing port 3000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Clear stale build cache if switching between build and dev
if exist ".next\BUILD_ID" (
    echo Cleaning stale build cache...
    rd /s /q ".next" >nul 2>&1
)

:: 3. Open browser after brief delay so server has initialized
start "" /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

echo Starting Next.js development server on http://localhost:3000 ...
echo Press Ctrl+C in this window to stop the server.
echo ========================================================
echo.

npm run dev
pause
