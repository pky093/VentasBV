@echo off
chcp 65001 >nul
title Instalador VentasBV - Sistema de Gestión Comercial
echo ========================================================
echo       INSTALADOR OFICIAL VENTASBV PARA WINDOWS
echo ========================================================
echo.
echo [1/3] Preparando archivos de la aplicación...
set "TARGET_DIR=%LOCALAPPDATA%\VentasBV"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [2/3] Instalando programa en %TARGET_DIR%...
xcopy /E /I /Y /Q "%~dp0frontend\release\VentasBV-win32-x64\*" "%TARGET_DIR%\" >nul

echo [3/3] Creando accesos directos con el icono oficial en Escritorio y Menú Inicio...
powershell -ExecutionPolicy Bypass -Command "$WshShell = New-Object -ComObject WScript.Shell; $DesktopShortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'VentasBV.lnk')); $DesktopShortcut.TargetPath = '%TARGET_DIR%\VentasBV.exe'; $DesktopShortcut.WorkingDirectory = '%TARGET_DIR%'; $DesktopShortcut.IconLocation = '%TARGET_DIR%\resources\app\electron\icon.ico'; $DesktopShortcut.Description = 'VentasBV - Sistema de Gestión Comercial y Punto de Venta'; $DesktopShortcut.Save(); $StartMenuPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath('StartMenu'), 'Programs', 'VentasBV.lnk'); $StartShortcut = $WshShell.CreateShortcut($StartMenuPath); $StartShortcut.TargetPath = '%TARGET_DIR%\VentasBV.exe'; $StartShortcut.WorkingDirectory = '%TARGET_DIR%'; $StartShortcut.IconLocation = '%TARGET_DIR%\resources\app\electron\icon.ico'; $StartShortcut.Description = 'VentasBV - Sistema de Gestión Comercial'; $StartShortcut.Save();"

echo.
echo ========================================================
echo    ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!
echo ========================================================
echo Se ha creado el icono "VentasBV" con su logo oficial en tu Escritorio.
echo.
echo Iniciando VentasBV...
start "" "%TARGET_DIR%\VentasBV.exe"
timeout /t 3 >nul
exit
