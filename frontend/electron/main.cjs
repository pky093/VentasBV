const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'VentasBV - Sistema de Gestión Comercial',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  Menu.setApplicationMenu(null);

  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Print Handler for thermal receipt printers
ipcMain.handle('print-ticket', async (event, htmlContent) => {
  let printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  printWin.loadURL(`data:text/html;charset=utf-8,${encodeURI(htmlContent)}`);

  return new Promise((resolve) => {
    printWin.webContents.on('did-finish-load', () => {
      printWin.webContents.print(
        {
          silent: false,
          printBackground: true,
          deviceName: '',
        },
        (success, failureReason) => {
          printWin.close();
          resolve({ success, failureReason });
        }
      );
    });
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
