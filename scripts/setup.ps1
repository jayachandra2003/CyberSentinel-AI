Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🛡️ CyberSentinel AI Environment Setup (Windows)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

If (!(Test-Path ".env")) {
    Write-Host "📄 Copying root .env.example -> .env"
    Copy-Item ".env.example" ".env"
}

If (!(Test-Path "frontend\.env.local")) {
    Write-Host "📄 Copying frontend\.env.example -> frontend\.env.local"
    Copy-Item "frontend\.env.example" "frontend\.env.local"
}

If (!(Test-Path "backend\.env")) {
    Write-Host "📄 Copying backend\.env.example -> backend\.env"
    Copy-Item "backend\.env.example" "backend\.env"
}

Write-Host "📦 Installing Frontend Dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

Write-Host "🐍 Setting up Python Virtual Environment..." -ForegroundColor Yellow
Set-Location backend
If (!(Test-Path "venv")) {
    python -m venv venv
}
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\pip.exe install -r requirements.txt
Set-Location ..

Write-Host "✅ CyberSentinel AI Environment Setup Complete!" -ForegroundColor Green
