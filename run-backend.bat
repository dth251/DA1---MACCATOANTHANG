@echo off
title Backend - Macca Toan Thang (Port 8080)
echo ========================================================
echo   Dang khoi dong Backend Spring Boot (Port 8080)...
echo ========================================================
cd /d "%~dp0backend"
call gradlew.bat bootRun
pause
