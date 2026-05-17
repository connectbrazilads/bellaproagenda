@echo off
echo ========================================================
echo   BACKUP DO BANCO DE DADOS (BELLA PRO - VPS MIGRATION)
echo ========================================================
echo.
echo Iniciando exportacao dos dados...
echo Aguarde, isso pode levar alguns segundos dependendo do tamanho do banco.
echo.

set PGPASSWORD=salao123
pg_dump -U postgres -h localhost -p 5432 -F c -d salao_db -f backup_vps.dump

echo.
if %errorlevel% equ 0 (
    echo [SUCESSO] Backup finalizado! 
    echo O arquivo 'backup_vps.dump' foi gerado na mesma pasta deste script.
    echo.
    echo ========================================================
    echo INSTRUCOES PARA A VPS:
    echo 1. Envie o arquivo 'backup_vps.dump' para sua VPS.
    echo 2. Na VPS, restaure usando o comando:
    echo    pg_restore -U postgres -d salao_db -1 backup_vps.dump
    echo ========================================================
) else (
    echo [ERRO] Falha ao exportar. Verifique se o PostgreSQL esta rodando localmente.
)
echo.
pause
