@echo off
title FAQ Chatbot
echo.
echo  ╔══════════════════════════════════════╗
echo  ║     FAQ Chatbot — Startup Script     ║
echo  ╚══════════════════════════════════════╝
echo.

:: ── Always cd to script's own directory (critical fix) ──
cd /d "%~dp0"

:: ── Check Python is available ─────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.8+ and add it to PATH.
    pause
    exit /b 1
)

:: ── Install dependencies ──────────────────────────────────
echo [1/2] Checking and installing dependencies...
pip install --quiet flask flask-cors nltk scikit-learn numpy
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies. Check your pip/internet connection.
    pause
    exit /b 1
)
echo       Dependencies OK.
echo.

:: ── Start the server ──────────────────────────────────────
echo [2/2] Starting FAQ Chatbot server...
echo       Open your browser at: http://127.0.0.1:5000
echo       Press Ctrl+C to stop the server.
echo.
python app.py

:: ── If server exits ───────────────────────────────────────
echo.
echo [INFO] Server stopped.
pause
