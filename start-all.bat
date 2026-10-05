@echo off
title Khoi dong Macca Toan Thang (Full Stack)
echo ========================================================
echo   Dang khoi dong he thong Macca Toan Thang...
echo ========================================================

echo 1. Dang mo cua so Backend Spring Boot (Port 8080)...
start "Backend - Macca Toan Thang" "%~dp0run-backend.bat"

echo 2. Dang mo cua so Frontend Web Server (Port 3000)...
start "Frontend - Macca Toan Thang" "%~dp0run-frontend.bat"

echo 3. Dang mo trinh duyet...
ping 127.0.0.1 -n 5 >nul
start http://localhost:3000
start http://localhost:3000/admin.html

echo ========================================================
echo   Khoi dong hoan tat!
echo   - Khach hang: http://localhost:3000
echo   - Quan tri:   http://localhost:3000/admin.html
echo   - Backend:    http://localhost:8080/api/products
echo ========================================================
