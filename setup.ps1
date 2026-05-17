Write-Host ""
Write-Host "============================================================"
Write-Host "  INSTALADOR - SISTEMA DE AGENDAMENTO SALAO DE BELEZA"
Write-Host "============================================================"
Write-Host ""

try {
    $nodeVersion = node -v 2>&1
    Write-Host "[OK] Node.js: $nodeVersion"
} catch {
    Write-Host "[ERRO] Node.js nao encontrado! Baixe em: https://nodejs.org"
    Read-Host "Pressione Enter para sair"
    exit 1
}

try {
    $npmVersion = npm -v 2>&1
    Write-Host "[OK] npm: $npmVersion"
} catch {
    Write-Host "[ERRO] npm nao encontrado!"
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host ""
Write-Host "============================================================"
Write-Host "  CONFIGURACAO DO BANCO DE DADOS"
Write-Host "============================================================"
Write-Host ""
Write-Host "Pressione ENTER para usar o valor padrao entre colchetes"
Write-Host ""

$dbHost = Read-Host "Host [localhost]"
if ($dbHost -eq "") { $dbHost = "localhost" }

$dbPort = Read-Host "Porta [5432]"
if ($dbPort -eq "") { $dbPort = "5432" }

$dbUser = Read-Host "Usuario [postgres]"
if ($dbUser -eq "") { $dbUser = "postgres" }

$dbPass = Read-Host "Senha do banco"

$dbName = Read-Host "Nome do banco [salao_db]"
if ($dbName -eq "") { $dbName = "salao_db" }

$jwtSecret = "salao_$([System.Guid]::NewGuid().ToString('N').Substring(0,16))"
$webhookSecret = "wh_$([System.Guid]::NewGuid().ToString('N'))"

Write-Host ""
Write-Host "============================================================"
Write-Host "  CONFIGURACAO DE SEGURANCA"
Write-Host "============================================================"
Write-Host ""

$appUrl = Read-Host "URL publica do sistema [http://localhost:5173]"
if ($appUrl -eq "") { $appUrl = "http://localhost:5173" }

$corsOrigins = Read-Host "CORS_ORIGINS [$appUrl]"
if ($corsOrigins -eq "") { $corsOrigins = $appUrl }

$superAdminEmail = Read-Host "Email do super admin [superadmin@empresa.com]"
if ($superAdminEmail -eq "") { $superAdminEmail = "superadmin@empresa.com" }

do {
    $superAdminSenha = Read-Host "Senha do super admin (min. 8 chars, maiuscula, minuscula e numero)"
    $senhaValida = $superAdminSenha.Length -ge 8 -and `
        $superAdminSenha -match '[A-Z]' -and `
        $superAdminSenha -match '[a-z]' -and `
        $superAdminSenha -match '[0-9]'

    if (-not $senhaValida) {
        Write-Host "[ERRO] A senha do super admin nao atende aos requisitos de seguranca."
    }
} while (-not $senhaValida)

$emailHost = Read-Host "SMTP host [opcional]"
$emailPort = Read-Host "SMTP porta [587]"
if ($emailPort -eq "") { $emailPort = "587" }
$emailUser = Read-Host "SMTP usuario [opcional]"
$emailPass = Read-Host "SMTP senha [opcional]"
$emailFrom = Read-Host "EMAIL_FROM [Athena SaaS <$emailUser>]"
if ($emailFrom -eq "" -and $emailUser -ne "") { $emailFrom = "Athena SaaS <$emailUser>" }

Write-Host ""
Write-Host "Criando backend\.env ..."
$backendEnv = @"
DATABASE_URL="postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}"
JWT_SECRET="${jwtSecret}"
WEBHOOK_SECRET="${webhookSecret}"
SUPERADMIN_EMAIL="${superAdminEmail}"
SUPERADMIN_SENHA="${superAdminSenha}"
APP_URL="${appUrl}"
CORS_ORIGINS="${corsOrigins}"
PORT=3001
EMAIL_HOST="${emailHost}"
EMAIL_PORT="${emailPort}"
EMAIL_USER="${emailUser}"
EMAIL_PASS="${emailPass}"
EMAIL_FROM="${emailFrom}"
"@
[System.IO.File]::WriteAllText("$PSScriptRoot\backend\.env", $backendEnv, [System.Text.Encoding]::UTF8)
Write-Host "[OK] backend\.env criado"

Write-Host "Criando frontend\.env ..."
[System.IO.File]::WriteAllText("$PSScriptRoot\frontend\.env", "VITE_API_URL=http://localhost:3001`nVITE_WEBHOOK_SECRET=${webhookSecret}`n", [System.Text.Encoding]::UTF8)
Write-Host "[OK] frontend\.env criado"

Write-Host ""
Write-Host "============================================================"
Write-Host "  INSTALANDO DEPENDENCIAS"
Write-Host "============================================================"

Write-Host "Instalando backend..."
Set-Location "$PSScriptRoot\backend"
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "[ERRO] Falha no backend!"; Read-Host "Enter para sair"; exit 1 }
Write-Host "[OK] Backend OK"

Write-Host "Instalando frontend..."
Set-Location "$PSScriptRoot\frontend"
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "[ERRO] Falha no frontend!"; Read-Host "Enter para sair"; exit 1 }
Write-Host "[OK] Frontend OK"

Write-Host ""
Write-Host "============================================================"
Write-Host "  CONFIGURANDO BANCO DE DADOS"
Write-Host "============================================================"

Set-Location "$PSScriptRoot\backend"

Write-Host "Criando tabelas..."
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha! Verifique se o PostgreSQL esta rodando e as credenciais estao corretas."
    Read-Host "Enter para sair"
    exit 1
}
Write-Host "[OK] Tabelas criadas"

Write-Host "Populando dados iniciais..."
node prisma/seed.js
if ($LASTEXITCODE -ne 0) { Write-Host "[ERRO] Falha no seed!"; Read-Host "Enter para sair"; exit 1 }
Write-Host "[OK] Dados inseridos"

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "============================================================"
Write-Host "  INSTALACAO CONCLUIDA!"
Write-Host "============================================================"
Write-Host ""
Write-Host "  Site publico : http://localhost:5173"
Write-Host "  Painel admin : http://localhost:5173/admin"
Write-Host "  Login admin  : admin@salao.com / admin123"
Write-Host "  Super admin  : $superAdminEmail"
Write-Host "  Webhook URL  : ${appUrl}/api/webhook/whatsapp?token=${webhookSecret}"
Write-Host ""
Write-Host "  Execute: .\start.ps1 para iniciar o sistema"
Write-Host ""
Read-Host "Pressione Enter para sair"
