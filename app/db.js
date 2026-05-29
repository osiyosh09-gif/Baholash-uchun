/**
 * db.js — JSON fayl asosida ma'lumotlar bazasi
 * better-sqlite3 o'rniga ishlatiladi (hech qanday o'rnatma shart emas)
 */

const fs   = require('fs');
const path = require('path');

// Electron mavjud bo'lsa userData, bo'lmasa joriy papka
function getDataDir() {
  try {
    const { app } = require('electron');
    return app.getPath('userData');
  } catch(e) {
    return path.join(__dirname, '..', 'data');
  }
}

function getDbPath() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'dtp_reports.json');
}

function getSettingsPath() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'dtp_settings.json');
}

// ===== ASOSIY DB TUZILMASI =====
function loadDb() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    const empty = { reports: [], nextId: 1 };
    fs.writeFileSync(dbPath, JSON.stringify(empty, null, 2), 'utf8');
    return empty;
  }
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch(e) {
    return { reports: [], nextId: 1 };
  }
}

function saveDb(data) {
  try {
    fs.writeFileSync(getDbPath(), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch(e) {
    console.error('DB saqlashda xatolik:', e.message);
    return false;
  }
}

// ===== HISOBOT SAQLASH =====
function saveReport(reportData) {
  try {
    const db  = loadDb();
    const now = new Date().toLocaleString('ru-RU');

    // Mavjud hisobotni yangilash
    const existingIdx = db.reports.findIndex(
      r => r.report_number === reportData.report_number
    );

    if (existingIdx !== -1) {
      db.reports[existingIdx] = {
        ...db.reports[existingIdx],
        ...reportData,
        updated_at: now
      };
      saveDb(db);
      return { success: true, id: db.reports[existingIdx].id, updated: true };
    }

    // Yangi hisobot qo'shish
    const newReport = {
      id:         db.nextId,
      ...reportData,
      created_at: now,
      updated_at: now
    };

    db.reports.unshift(newReport); // eng yangi birinchi
    db.nextId += 1;
    saveDb(db);
    return { success: true, id: newReport.id, updated: false };

  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ===== BARCHA HISOBOTLAR RO'YXATI =====
function getAllReports() {
  try {
    const db = loadDb();
    return db.reports.map(r => ({
      id:            r.id,
      report_number: r.report_number,
      report_date:   r.report_date,
      client_name:   r.client_name,
      car_brand:     r.car_brand,
      car_model:     r.car_model,
      car_year:      r.car_year,
      car_plate:     r.car_plate,
      grand_total:   r.grand_total,
      lang:          r.lang || 'ru',
      created_at:    r.created_at
    }));
  } catch(e) {
    return [];
  }
}

// ===== BITTA HISOBOT =====
function getReportById(id) {
  try {
    const db  = loadDb();
    const row = db.reports.find(r => r.id === id);
    return row || null;
  } catch(e) {
    return null;
  }
}

// ===== HISOBOTNI O'CHIRISH =====
function deleteReport(id) {
  try {
    const db  = loadDb();
    const len = db.reports.length;
    db.reports = db.reports.filter(r => r.id !== id);
    if (db.reports.length === len) return { success: false, error: 'Topilmadi' };
    saveDb(db);
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ===== SOZLAMALAR =====
function getSetting(key, defaultVal = '') {
  try {
    const p = getSettingsPath();
    if (!fs.existsSync(p)) return defaultVal;
    const settings = JSON.parse(fs.readFileSync(p, 'utf8'));
    return settings[key] !== undefined ? settings[key] : defaultVal;
  } catch(e) {
    return defaultVal;
  }
}

function setSetting(key, value) {
  try {
    const p = getSettingsPath();
    let settings = {};
    if (fs.existsSync(p)) {
      settings = JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    settings[key] = value;
    fs.writeFileSync(p, JSON.stringify(settings, null, 2), 'utf8');
  } catch(e) {}
}

// ===== STATISTIKA =====
function getStats() {
  try {
    const db    = loadDb();
    const total = db.reports.length;

    const now   = new Date();
    const month = db.reports.filter(r => {
      if (!r.created_at) return false;
      try {
        // "29.05.2026, 18:30:00" formatini parse qilish
        const parts = r.created_at.split(', ')[0].split('.');
        const rDate = new Date(parts[2], parts[1] - 1, parts[0]);
        return rDate.getFullYear() === now.getFullYear() &&
               rDate.getMonth()    === now.getMonth();
      } catch(e) { return false; }
    }).length;

    return { total, thisMonth: month };
  } catch(e) {
    return { total: 0, thisMonth: 0 };
  }
}

module.exports = {
  saveReport,
  getAllReports,
  getReportById,
  deleteReport,
  getSetting,
  setSetting,
  getStats
};
