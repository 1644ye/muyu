@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "MUYU_NODE="
if exist "%~dp0runtime\node.exe" set "MUYU_NODE=%~dp0runtime\node.exe"
for /f "delims=" %%I in ('where node.exe 2^>nul') do if not defined MUYU_NODE set "MUYU_NODE=%%I"
if not defined MUYU_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "MUYU_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined MUYU_NODE (
 echo Node.js was not found. Install Node.js 20 or newer, then try again.
 pause
 exit /b 1
)
"%MUYU_NODE%" "%~dp0scripts\launch.cjs" %*
if errorlevel 1 pause
