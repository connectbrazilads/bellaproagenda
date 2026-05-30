Write-Host ""
Write-Host "============================================================"
Write-Host "  INICIANDO SISTEMA COM TUNEL - SALAO DE BELEZA"
Write-Host "============================================================"
Write-Host ""

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    Write-Host "[ERRO] cloudflared nao encontrado no PATH."
    Write-Host "Instale o cloudflared e tente novamente."
    Read-Host "Enter para sair"
    exit 1
}

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

Write-Host "Encerrando instancias antigas do frontend deste projeto..."
$frontendProcesses = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*$PSScriptRoot\frontend*" }
foreach ($process in $frontendProcesses) {
    try { Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop } catch {}
}

Write-Host "Iniciando Backend (porta 3001)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Iniciando Frontend (porta 5173, strict)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev -- --host 127.0.0.1 --port 5173 --strictPort" -WindowStyle Normal

Start-Sleep -Seconds 5

Write-Host "Iniciando Cloudflare Tunnel para http://127.0.0.1:5174 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cloudflared tunnel --url http://127.0.0.1:5174" -WindowStyle Normal

Write-Host ""
Write-Host "  Frontend local : http://127.0.0.1:5173"
Write-Host "  Backend health : http://localhost:3001/health"
Write-Host "  Tunnel         : confira a URL gerada na janela do cloudflared"
Write-Host ""
Write-Host "  Dica: use a URL do tunnel para acessar /admin/login do outro PC."
Write-Host ""
Read-Host "Pressione Enter para sair"
