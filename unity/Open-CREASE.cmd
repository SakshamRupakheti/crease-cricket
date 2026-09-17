@echo off
set "CREASE_EDITOR=C:\Program Files\Unity\Hub\Editor\6000.6.1f1\Editor\Unity.exe"
if not exist "%CREASE_EDITOR%" (
  echo Unity 6000.6.1f1 was not found. Add the CREASE folder through Unity Hub.
  pause
  exit /b 1
)
start "CREASE Unity" "%CREASE_EDITOR%" -projectPath "%~dp0CREASE"
