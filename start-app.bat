@echo off
title VIBE 365 - Habit Tracker ^& IronForge Gym Logger
cd /d "D:\VIBE-365Go"

echo ========================================================
echo   Launching VIBE 365 (Habit Tracker ^& IronForge Gym)
echo ========================================================
echo.
echo Opening http://localhost:3000 in your browser...
start "" "http://localhost:3000"

echo.
echo Starting Next.js server...
echo Press Ctrl+C in this window to stop the app.
echo ========================================================
echo.

npm run dev
pause
