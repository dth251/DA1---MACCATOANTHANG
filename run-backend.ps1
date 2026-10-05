Set-Location -Path "$PSScriptRoot\backend"
Write-Host "Dang khoi dong Backend Spring Boot (Port 8080)..." -ForegroundColor Cyan
.\gradlew.bat bootRun
