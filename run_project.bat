@echo off
title Data Quality & ML Platform Starter
echo ===================================================
echo Starting Data Quality Analysis and Management Platform
echo ===================================================

echo.
echo [1/3] Starting Backend (FastAPI)...
start "Platform Backend" cmd /c "cd backend && ..\.venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8010"

echo [2/3] Starting Frontend (Vite)...
start "Platform Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo ===================================================
echo Platform launched! Close the individual windows to stop.
echo ===================================================
timeout /t 10
