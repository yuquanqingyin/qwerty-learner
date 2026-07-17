@echo off
setlocal

set "APP_ROOT=%~dp0"
set "WEB_ROOT=%APP_ROOT%build"
set "SERVER_SCRIPT=%APP_ROOT%scripts\start-local-server.ps1"

rem The packaged edition keeps the website in app\ and the server beside this launcher.
if exist "%APP_ROOT%app\index.html" set "WEB_ROOT=%APP_ROOT%app"
if exist "%APP_ROOT%local-server.ps1" set "SERVER_SCRIPT=%APP_ROOT%local-server.ps1"

if not exist "%WEB_ROOT%\index.html" (
  echo Local website files were not found.
  echo Run npm run package:local once in the project folder.
  pause
  exit /b 1
)

if not exist "%SERVER_SCRIPT%" (
  echo Local server script was not found: %SERVER_SCRIPT%
  pause
  exit /b 1
)

title Qwerty Learner Local
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SERVER_SCRIPT%" -WebRoot "%WEB_ROOT%"

if errorlevel 1 (
  echo.
  echo The local edition failed to start.
  pause
)
