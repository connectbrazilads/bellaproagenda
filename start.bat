@echo off
title Salao de Beleza - Sistema

echo.
echo ============================================================
echo   INICIANDO SISTEMA - SALAO DE BELEZA
echo ============================================================
echo.

if not exist backend\.env (
    echo [ERRO] backend\.env nao encontrado. Execute setup.bat primeiro.
    pause
    exit /b 1
)

if not exist frontend\.env (
    echo [ERRO] frontend\.env nao encontrado. Execute setup.bat primeiro.
    pause
    exit /b 1
)

echo Iniciando Backend porta 3001...
start "Backend - API" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 3 /nobreak >nul

echo Iniciando Frontend porta 5173...
start "Frontend - Salao" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 4 /nobreak >nul

echo Abrindo navegador...
start http://localhost:5173

echo.
echo   Site publico : http://localhost:5173
echo   Painel admin : http://localhost:5173/admin
echo   Login        : admin@salao.com / admin123
echo.
echo   Para encerrar feche as janelas Backend e Frontend
echo.
pause