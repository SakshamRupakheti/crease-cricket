@echo off
pushd "%~dp0.."
node tools/export-unity.mjs
if errorlevel 1 (
  echo Motion export failed. Check that Node.js is installed.
  pause
  popd
  exit /b 1
)
echo Motion data refreshed. Unity will reimport the JSON when focused.
popd
pause
