const electronInstaller = require('electron-winstaller');
const path = require('path');

async function createInstaller() {
  console.log('Creando el instalador de Windows (Setup.exe) con el logo oficial...');
  try {
    await electronInstaller.createWindowsInstaller({
      name: 'VentasBV',
      appDirectory: path.join(__dirname, 'release/VentasBV-win32-x64'),
      outputDirectory: path.join(__dirname, 'release/installer'),
      authors: 'VentasBV',
      exe: 'VentasBV.exe',
      setupExe: 'VentasBV-Instalador-v1.0.0.exe',
      setupMsi: 'VentasBV-Instalador-v1.0.0.msi',
      setupIcon: path.join(__dirname, 'electron/icon.ico'),
      noMsi: false,
      title: 'VentasBV - Sistema de Gestión Comercial',
      description: 'Sistema de Gestión Comercial y Punto de Venta VentasBV',
    });
    console.log('¡Instalador creado exitosamente con el logo oficial en release/installer!');
  } catch (e) {
    console.error('Error al crear instalador:', e.message);
  }
}

createInstaller();
