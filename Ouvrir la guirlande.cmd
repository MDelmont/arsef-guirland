@echo off
cd /d "%~dp0"
node server.cjs
if errorlevel 1 pause
