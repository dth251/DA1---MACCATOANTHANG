Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Khoi dong Macca Toan Thang (Backend + Frontend)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

# 1. Start Backend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$PSScriptRoot\run-backend.ps1"

# 2. Start Frontend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$PSScriptRoot\run-frontend.ps1"

# 3. Open browser after short delay
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"
Start-Process "http://localhost:3000/admin.html"

Write-Host "He thong da duoc mo trong 2 cua so terminal rieng biet!" -ForegroundColor Yellow
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Admin:    http://localhost:3000/admin.html" -ForegroundColor White
Write-Host "- Backend:  http://localhost:8080/api/products" -ForegroundColor White
