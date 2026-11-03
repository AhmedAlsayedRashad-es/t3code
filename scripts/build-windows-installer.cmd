@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-windows-installer.ps1" %*
set code=%ERRORLEVEL%
rem Keep the window open when double-clicked from Explorer.
echo %cmdcmdline% | find /i "/c" >nul && pause
exit /b %code%
