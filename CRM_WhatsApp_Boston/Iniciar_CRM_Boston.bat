@echo off
title Boston CRM Desk & WhatsApp Hub
chcp 65001 > nul
cd /d "%~dp0"

echo =======================================================
echo    Iniciando Boston CRM Desk & WhatsApp Hub
echo    Colegio Boston - Turno & Agenda Operativa
echo =======================================================
echo.

:: Iniciar servidor en segundo plano si no está activo
netstat -ano | findstr :3000 > nul
if %ERRORLEVEL% NEQ 0 (
    echo [1/2] Levantando motor local de base de datos y servidor...
    start /b node server.js > nul 2>&1
    timeout /t 2 /nobreak > nul
) else (
    echo [1/2] El servidor local ya se encuentra activo en el puerto 3000.
)

echo [2/2] Abriendo interfaz de escritorio...

:: Buscar Edge o Chrome para abrir como Ventana de App Nativa de Escritorio
set BROWSER_FOUND=0

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000"
    set BROWSER_FOUND=1
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://localhost:3000"
    set BROWSER_FOUND=1
)

if %BROWSER_FOUND% EQU 0 (
    start http://localhost:3000
)

echo.
echo =======================================================
echo    CRM activo en pantalla. Puedes minimizar esta ventana.
echo    Para detenerlo, cierra esta ventana.
echo =======================================================
pause > nul
