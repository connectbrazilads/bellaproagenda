Write-Host ""
Write-Host "============================================================"
Write-Host "  INICIANDO SISTEMA - SALAO DE BELEZA"
Write-Host "============================================================"
Write-Host ""

if (-not (Test-Path "$PSScriptRoot\backend\.env")) {
    Write-Host "[ERRO] backend\.env nao encontrado. Execute setup.ps1 primeiro."
    Read-Host "Enter para sair"
    exit 1
}

if (-not (Test-Path "$PSScriptRoot\frontend\.env")) {
    Write-Host "[ERRO] frontend\.env nao encontrado. Execute setup.ps1 primeiro."
    Read-Host "Enter para sair"
    exit 1
}

Write-Host "Iniciando Backend (porta 3001)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Iniciando Frontend (porta 5173)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 4

Write-Host "Abrindo navegador..."
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "  Site publico : http://localhost:5173"
Write-Host "  Painel admin : http://localhost:5173/admin"
Write-Host "  Login        : admin@salao.com / admin123"
Write-Host ""
Write-Host "  Para encerrar: feche as janelas do Backend e Frontend"
Write-Host ""
Read-Host "Pressione Enter para sair"