const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme } = require('electron');
const path  = require('path');
const fs    = require('fs');
const db    = require('./app/db');

let mainWindow    = null;
let reportWindow  = null;
let historyWindow = null;

// ===== ASOSIY OYNA =====
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width:     1200,
    height:    860,
    minWidth:  900,
    minHeight: 600,
    title:     'ДТП Оценка — THE BEST VALUATION',
    icon:      path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration:  true,
      contextIsolation: false,
      webSecurity:      false
    },
    show:            false,
    backgroundColor: '#f3f4f6'
  });

  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Saqlangan tilni yuborish
    const lang = db.getSetting('lang', 'ru');
    mainWindow.webContents.send('set-lang', lang);
    // Statistika
    const stats = db.getStats();
    mainWindow.webContents.send('db-stats', stats);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ===== HISOBOT OYNASI =====
function createReportWindow(data) {
  if (reportWindow) { reportWindow.focus(); return; }

  reportWindow = new BrowserWindow({
    width:  960,
    height: 820,
    title:  'Отчёт — THE BEST VALUATION',
    parent: mainWindow,
    webPreferences: {
      nodeIntegration:  true,
      contextIsolation: false,
      webSecurity:      false
    },
    show:            false,
    backgroundColor: '#ffffff'
  });

  reportWindow.loadFile(path.join(__dirname, 'app', 'report.html'));

  reportWindow.webContents.on('did-finish-load', () => {
    reportWindow.webContents.send('fill-report', data);
    reportWindow.show();
  });

  reportWindow.on('closed', () => { reportWindow = null; });
}

// ===== TARIX OYNASI =====
function createHistoryWindow() {
  if (historyWindow) { historyWindow.focus(); return; }

  historyWindow = new BrowserWindow({
    width:  900,
    height: 650,
    title:  'История отчётов — THE BEST VALUATION',
    parent: mainWindow,
    webPreferences: {
      nodeIntegration:  true,
      contextIsolation: false,
      webSecurity:      false
    },
    show:            false,
    backgroundColor: '#f3f4f6'
  });

  historyWindow.loadFile(path.join(__dirname, 'app', 'history.html'));

  historyWindow.once('ready-to-show', () => {
    historyWindow.show();
    const reports = db.getAllReports();
    historyWindow.webContents.send('load-history', reports);
  });

  historyWindow.on('closed', () => { historyWindow = null; });
}

// ===== IPC: HISOBOT OYNASINI OCHISH =====
ipcMain.on('open-report', (event, data) => {
  createReportWindow(data);
});

// ===== IPC: CHOP ETISH =====
ipcMain.on('print-report', () => {
  if (!reportWindow) return;
  reportWindow.webContents.print(
    { silent: false, printBackground: true },
    (success) => { if (!success) console.log('Print cancelled'); }
  );
});

// ===== IPC: DB SAQLASH =====
ipcMain.handle('db-save', async (event, data) => {
  const result = db.saveReport(data);
  if (result.success) {
    const stats = db.getStats();
    mainWindow?.webContents.send('db-stats', stats);
  }
  return result;
});

// ===== IPC: BARCHA HISOBOTLAR =====
ipcMain.handle('db-get-all', async () => {
  return db.getAllReports();
});

// ===== IPC: BITTA HISOBOT =====
ipcMain.handle('db-get-one', async (event, id) => {
  return db.getReportById(id);
});

// ===== IPC: HISOBOTNI O'CHIRISH =====
ipcMain.handle('db-delete', async (event, id) => {
  const result = db.deleteReport(id);
  if (result.success) {
    const stats = db.getStats();
    mainWindow?.webContents.send('db-stats', stats);
  }
  return result;
});

// ===== IPC: TARIX OYNASINI OCHISH =====
ipcMain.on('open-history', () => {
  createHistoryWindow();
});

// ===== IPC: TARIXDAN HISOBOTNI OCHISH =====
ipcMain.on('history-open-report', (event, id) => {
  const row = db.getReportById(id);
  if (!row) return;
  // Asosiy oynaga yuborish (formani to'ldirish uchun)
  mainWindow?.webContents.send('load-report-data', row);
  historyWindow?.close();
});

// ===== IPC: RASM YUKLASH =====
ipcMain.handle('upload-photo', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title:       'Автомобиль расмини танланг',
    filters:     [{ name: 'Расмлар', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    properties:  ['openFile']
  });

  if (result.canceled || !result.filePaths.length) return null;

  const filePath = result.filePaths[0];
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const ext        = path.extname(filePath).slice(1).toLowerCase();
    const mimeType   = ext === 'png' ? 'image/png' : 'image/jpeg';
    const base64     = fileBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    return null;
  }
});

// ===== IPC: TIL SAQLASH =====
ipcMain.on('save-lang', (event, lang) => {
  db.setSetting('lang', lang);
});

// ===== IPC: STATISTIKA =====
ipcMain.handle('db-stats', async () => {
  return db.getStats();
});

// ===== APP LIFECYCLE =====
app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
