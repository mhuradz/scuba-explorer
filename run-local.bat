@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting the local project...
echo Open the URL shown by Vite, then press Ctrl+C here to stop it.
call npm run dev -- --host 127.0.0.1

pause
