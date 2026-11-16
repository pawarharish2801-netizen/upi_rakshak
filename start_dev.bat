@echo off
title UPI Rakshak - Pre-Transaction Fraud Defense Engine
echo =====================================================================
echo             UPI Rakshak - Sovereign Fraud Prevention
echo =====================================================================
echo.
echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "UPI Rakshak - Backend API" cmd /k "cd /d %~dp0 && python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Launching Vite Frontend on http://localhost:5173 ...
start "UPI Rakshak - React Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =====================================================================
echo   System online!
echo   Frontend Application: http://localhost:5173
echo   Interactive API Docs: http://127.0.0.1:8000/docs
echo =====================================================================
echo.
pause

