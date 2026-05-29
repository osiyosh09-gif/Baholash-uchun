const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'ДТП Оценка — THE BEST VALUATION',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    show: false,
    backgroundColor: '#f0f2f5'
  });

  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// PDF hisobot oynasini ochish
ipcMain.on('open-report', (event, data) => {
  const reportWindow = new BrowserWindow({
    width: 900,
    height: 800,
    title: 'Отчёт об оценке — THE BEST VALUATION',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    show: false,
    backgroundColor: '#ffffff'
  });

  reportWindow.loadFile(path.join(__dirname, 'app', 'report.html'));

  reportWindow.webContents.on('did-finish-load', () => {
    reportWindow.webContents.send('fill-report', data);
    reportWindow.show();
  });

  // Print dialog (PDF sifatida saqlash)
  ipcMain.once('print-report', () => {
    reportWindow.webContents.print({
      silent: false,
      printBackground: true,
      margins: { marginType: 'none' }
    }, (success) => {
      if (!success) console.log('Print cancelled');
    });
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
