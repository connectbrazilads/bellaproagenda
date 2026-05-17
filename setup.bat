@echo off
title Instalador - Salao de Beleza

echo.
echo ============================================================
echo   INSTALADOR - SISTEMA DE AGENDAMENTO SALAO DE BELEZA
echo ============================================================
echo.

node -v >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado! Baixe em: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js encontrado:
node -v

npm -v >nul 2>&1
if errorlevel 1 (
    echo [ERRO] npm nao encontrado!
    pause
    exit /b 1
)
echo [OK] npm encontrado:
npm -v

echo.
echo ============================================================
echo   CONFIGURACAO DO BANCO DE DADOS
echo ============================================================
echo.
echo Pressione ENTER para usar o valor padrao entre colchetes
echo.

set /p DB_HOST="Host [localhost]: "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Porta [5432]: "
if "%DB_PORT%"=="" set DB_PORT=5432

set /p DB_USER="Usuario [postgres]: "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_PASS="Senha do banco: "

set /p DB_NAME="Nome do banco [salao_db]: "
if "%DB_NAME%"=="" set DB_NAME=salao_db

set JWT=%RANDOM%%RANDOM%%RANDOM%
set WEBHOOK=%RANDOM%%RANDOM%%RANDOM%%RANDOM%

echo.
echo ============================================================
echo   CONFIGURACAO DE SEGURANCA
echo ============================================================
echo.

set /p APP_URL="URL publica do sistema [http://localhost:5173]: "
if "%APP_URL%"=="" set APP_URL=http://localhost:5173

set /p CORS_ORIGINS="CORS_ORIGINS [%APP_URL%]: "
if "%CORS_ORIGINS%"=="" set CORS_ORIGINS=%APP_URL%

set /p SUPERADMIN_EMAIL="Email do super admin [superadmin@empresa.com]: "
if "%SUPERADMIN_EMAIL%"=="" set SUPERADMIN_EMAIL=superadmin@empresa.com

:ask_superadmin_password
set /p SUPERADMIN_SENHA="Senha do super admin (min. 8 chars, maiuscula, minuscula e numero): "
if "%SUPERADMIN_SENHA:~7,1%"=="" goto invalid_superadmin_password
echo %SUPERADMIN_SENHA% | findstr /r "[A-Z]" >nul || goto invalid_superadmin_password
echo %SUPERADMIN_SENHA% | findstr /r "[a-z]" >nul || goto invalid_superadmin_password
echo %SUPERADMIN_SENHA% | findstr /r "[0-9]" >nul || goto invalid_superadmin_password
goto superadmin_password_ok

:invalid_superadmin_password
echo [ERRO] A senha do super admin nao atende aos requisitos.
goto ask_superadmin_password

:superadmin_password_ok
set /p EMAIL_HOST="SMTP host [opcional]: "
set /p EMAIL_PORT="SMTP porta [587]: "
if "%EMAIL_PORT%"=="" set EMAIL_PORT=587
set /p EMAIL_USER="SMTP usuario [opcional]: "
set /p EMAIL_PASS="SMTP senha [opcional]: "
set /p EMAIL_FROM="EMAIL_FROM [Athena SaaS ^<%EMAIL_USER%^>]: "
if "%EMAIL_FROM%"=="" if not "%EMAIL_USER%"=="" set EMAIL_FROM=Athena SaaS ^<%EMAIL_USER%^>

echo.
echo Criando backend\.env ...
set "BACKEND_ENV=DATABASE_URL=""postgresql://%DB_USER%:%DB_PASS%@%DB_HOST%:%DB_PORT%/%DB_NAME%""\nJWT_SECRET=""salao_%JWT%""\nWEBHOOK_SECRET=""wh_%WEBHOOK%""\nSUPERADMIN_EMAIL=""%SUPERADMIN_EMAIL%""\nSUPERADMIN_SENHA=""%SUPERADMIN_SENHA%""\nAPP_URL=""%APP_URL%""\nCORS_ORIGINS=""%CORS_ORIGINS%""\nPORT=3001\nEMAIL_HOST=""%EMAIL_HOST%""\nEMAIL_PORT=""%EMAIL_PORT%""\nEMAIL_USER=""%EMAIL_USER%""\nEMAIL_PASS=""%EMAIL_PASS%""\nEMAIL_FROM=""%EMAIL_FROM%""\n"
powershell -NoProfile -Command "$content = $env:BACKEND_ENV -replace '\\n', [Environment]::NewLine; [IO.File]::WriteAllText('backend\.env', $content, [Text.UTF8Encoding]::new($false))"
echo [OK] backend\.env criado

echo Criando frontend\.env ...
set "FRONTEND_ENV=VITE_API_URL=http://localhost:3001\nVITE_WEBHOOK_SECRET=wh_%WEBHOOK%\n"
powershell -NoProfile -Command "$content = $env:FRONTEND_ENV -replace '\\n', [Environment]::NewLine; [IO.File]::WriteAllText('frontend\.env', $content, [Text.UTF8Encoding]::new($false))"
echo [OK] frontend\.env criado

echo.
echo ============================================================
echo   INSTALANDO DEPENDENCIAS
echo ============================================================

cd backend
echo Instalando backend...
call npm install
if errorlevel 1 ( echo [ERRO] Falha no backend! & cd .. & pause & exit /b 1 )
echo [OK] Backend OK
cd ..

cd frontend
echo Instalando frontend...
call npm install
if errorlevel 1 ( echo [ERRO] Falha no frontend! & cd .. & pause & exit /b 1 )
echo [OK] Frontend OK
cd ..

echo.
echo ============================================================
echo   CONFIGURANDO BANCO DE DADOS
echo ============================================================

cd backend
echo Criando tabelas...
call npx prisma db push
if errorlevel 1 (
    echo [ERRO] Falha! Verifique se o PostgreSQL esta rodando.
    cd ..
    pause
    exit /b 1
)
echo [OK] Tabelas criadas

echo Populando dados iniciais...
call node prisma/seed.js
if errorlevel 1 ( echo [ERRO] Falha no seed! & cd .. & pause & exit /b 1 )
echo [OK] Dados inseridos
cd ..

echo.
echo ============================================================
echo   INSTALACAO CONCLUIDA!
echo ============================================================
echo.
echo   Site publico : http://localhost:5173
echo   Painel admin : http://localhost:5173/admin
echo   Login admin  : admin@salao.com / admin123
echo   Super admin  : %SUPERADMIN_EMAIL%
echo   Webhook URL  : %APP_URL%/api/webhook/whatsapp?token=wh_%WEBHOOK%
echo.
echo   Execute start.bat para iniciar o sistema.
echo.
pause
