Set-Location -Path "$PSScriptRoot"
Write-Host "Dang khoi dong Frontend HTTP Server (No-Cache) tai http://localhost:3000 ..." -ForegroundColor Cyan
python "$PSScriptRoot\dev-server.py"
