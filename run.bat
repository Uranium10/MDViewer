@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Quiet Page - Local Server
set "APP_URL=http://localhost:3000"
set "SERVER_LOG=%~dp0.local-server.log"

echo.
echo  Quiet Page local server
echo  =======================
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not available in PATH.
  echo         Install the current Node.js LTS release and run this file again.
  echo.
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not available in PATH.
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0node_modules\next\package.json" (
  echo [1/3] Installing dependencies. This may take a few minutes...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Dependencies are ready.
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%' -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content -match 'Quiet Page') { exit 0 } } catch {}; exit 1" >nul 2>&1
if errorlevel 1 (
  echo [2/3] Starting the development server...
  echo Server output: "%SERVER_LOG%"
  start "Quiet Page Server" /min cmd.exe /k "cd /d ""%~dp0"" && npm run dev 1^>^> ""%SERVER_LOG%"" 2^>^&1"
) else (
  echo [2/3] A server is already responding on port 3000.
)

echo [3/3] Waiting until the page is ready...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$url='%APP_URL%'; $limit=(Get-Date).AddSeconds(120); do { try { $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 3; if ($r.StatusCode -eq 200 -and $r.Content -match 'Quiet Page') { exit 0 } } catch {}; Start-Sleep -Milliseconds 750 } while ((Get-Date) -lt $limit); exit 1"

if errorlevel 1 (
  echo.
  echo [ERROR] The server did not become ready within 120 seconds.
  echo         Check "%SERVER_LOG%" for details.
  echo.
  pause
  exit /b 1
)

echo.
echo Ready: %APP_URL%
echo Opening the browser now...
start "" "%APP_URL%"
echo.
echo The server runs in the minimized "Quiet Page Server" window.
echo Close that server window to stop the local server.
timeout /t 4 /nobreak >nul
endlocal
