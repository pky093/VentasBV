const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop');
const targetExe = path.join(__dirname, 'release', 'VentasBV-win32-x64', 'VentasBV.exe');
const workingDir = path.join(__dirname, 'release', 'VentasBV-win32-x64');
const iconPath = path.join(__dirname, 'electron', 'icon.ico');
const shortcutPath = path.join(desktopPath, 'VentasBV.lnk');

const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
$Shortcut.TargetPath = "${targetExe.replace(/\\/g, '\\\\')}"
$Shortcut.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"
$Shortcut.IconLocation = "${iconPath.replace(/\\/g, '\\\\')}"
$Shortcut.Description = "VentasBV - Sistema de Gestion Comercial y POS"
$Shortcut.Save()
`;

const tempPs = path.join(__dirname, 'create-temp-shortcut.ps1');
fs.writeFileSync(tempPs, psScript, 'utf8');

try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${tempPs}"`, { stdio: 'inherit' });
  console.log(`¡Acceso directo con logo oficial creado exitosamente en el Escritorio!: ${shortcutPath}`);
} catch (e) {
  console.error('Error al crear acceso directo:', e.message);
} finally {
  if (fs.existsSync(tempPs)) fs.unlinkSync(tempPs);
}
