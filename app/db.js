const path = require('path');
const { app } = require('electron');

let db = null;

// ===== DB NI OCHISH / YARATISH =====
function openDB() {
  if (db) return db;
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'dtp_ocenka.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    createTables();
    return db;
  } catch (e) {
    console.error('SQLite error:', e.message);
    return null;
  }
}

// ===== JADVALLAR YARATISH =====
function createTables() {
  if (!db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      report_number TEXT    NOT NULL,
      report_date   TEXT    NOT NULL,
      client_name   TEXT    NOT NULL,
      client_phone  TEXT,
      client_address TEXT,
      eval_purpose  TEXT,
      car_brand     TEXT,
      car_model     TEXT,
      car_year      TEXT,
      car_color     TEXT,
      car_plate     TEXT,
      car_vin       TEXT,
      car_mileage   TEXT,
      car_body      TEXT,
      car_engine    TEXT,
      car_power     TEXT,
      car_transmission TEXT,
      car_drive     TEXT,
      car_value_before TEXT,
      car_wear      TEXT,
      car_residual  TEXT,
      dtp_date      TEXT,
      dtp_place     TEXT,
      dtp_ref       TEXT,
      expert_name   TEXT,
      expert_position TEXT,
      expert_cert   TEXT,
      expert_exp    TEXT,
      parts_json    TEXT,
      works_json    TEXT,
      materials_json TEXT,
      parts_total   TEXT,
      works_total   TEXT,
      materials_total TEXT,
      grand_total   TEXT,
      car_photo     TEXT,
      lang          TEXT DEFAULT 'ru',
      created_at    TEXT DEFAULT (datetime('now','localtime')),
      updated_at    TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// ===== HISOBOT SAQLASH =====
function saveReport(data) {
  const d = openDB();
  if (!d) return { success: false, error: 'DB ochilmadi' };
  try {
    const existing = d.prepare(
      'SELECT id FROM reports WHERE report_number = ?'
    ).get(data.report_number);

    if (existing) {
      d.prepare(`
        UPDATE reports SET
          report_date=?, client_name=?, client_phone=?, client_address=?,
          eval_purpose=?, car_brand=?, car_model=?, car_year=?, car_color=?,
          car_plate=?, car_vin=?, car_mileage=?, car_body=?, car_engine=?,
          car_power=?, car_transmission=?, car_drive=?, car_value_before=?,
          car_wear=?, car_residual=?, dtp_date=?, dtp_place=?, dtp_ref=?,
          expert_name=?, expert_position=?, expert_cert=?, expert_exp=?,
          parts_json=?, works_json=?, materials_json=?,
          parts_total=?, works_total=?, materials_total=?, grand_total=?,
          car_photo=?, lang=?,
          updated_at=datetime('now','localtime')
        WHERE report_number=?
      `).run(
        data.report_date, data.client_name, data.client_phone,
        data.client_address, data.eval_purpose, data.car_brand, data.car_model,
        data.car_year, data.car_color, data.car_plate, data.car_vin,
        data.car_mileage, data.car_body, data.car_engine, data.car_power,
        data.car_transmission, data.car_drive, data.car_value_before,
        data.car_wear, data.car_residual, data.dtp_date, data.dtp_place,
        data.dtp_ref, data.expert_name, data.expert_position, data.expert_cert,
        data.expert_exp,
        JSON.stringify(data.parts || []),
        JSON.stringify(data.works || []),
        JSON.stringify(data.materials || []),
        data.parts_total, data.works_total, data.materials_total,
        data.grand_total, data.car_photo || null, data.lang || 'ru',
        data.report_number
      );
      return { success: true, id: existing.id, updated: true };
    } else {
      const result = d.prepare(`
        INSERT INTO reports (
          report_number, report_date, client_name, client_phone, client_address,
          eval_purpose, car_brand, car_model, car_year, car_color, car_plate,
          car_vin, car_mileage, car_body, car_engine, car_power, car_transmission,
          car_drive, car_value_before, car_wear, car_residual, dtp_date,
          dtp_place, dtp_ref, expert_name, expert_position, expert_cert,
          expert_exp, parts_json, works_json, materials_json,
          parts_total, works_total, materials_total, grand_total, car_photo, lang
        ) VALUES (
          ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        )
      `).run(
        data.report_number, data.report_date, data.client_name,
        data.client_phone, data.client_address, data.eval_purpose,
        data.car_brand, data.car_model, data.car_year, data.car_color,
        data.car_plate, data.car_vin, data.car_mileage, data.car_body,
        data.car_engine, data.car_power, data.car_transmission, data.car_drive,
        data.car_value_before, data.car_wear, data.car_residual,
        data.dtp_date, data.dtp_place, data.dtp_ref,
        data.expert_name, data.expert_position, data.expert_cert, data.expert_exp,
        JSON.stringify(data.parts || []),
        JSON.stringify(data.works || []),
        JSON.stringify(data.materials || []),
        data.parts_total, data.works_total, data.materials_total,
        data.grand_total, data.car_photo || null, data.lang || 'ru'
      );
      return { success: true, id: result.lastInsertRowid, updated: false };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ===== BARCHA HISOBOTLAR RO'YXATI =====
function getAllReports() {
  const d = openDB();
  if (!d) return [];
  try {
    return d.prepare(`
      SELECT id, report_number, report_date, client_name, car_brand,
             car_model, car_year, car_plate, grand_total, lang, created_at
      FROM reports
      ORDER BY id DESC
    `).all();
  } catch (e) {
    return [];
  }
}

// ===== BITTA HISOBOT YUKLASH =====
function getReportById(id) {
  const d = openDB();
  if (!d) return null;
  try {
    const row = d.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!row) return null;
    row.parts     = JSON.parse(row.parts_json     || '[]');
    row.works     = JSON.parse(row.works_json     || '[]');
    row.materials = JSON.parse(row.materials_json || '[]');
    return row;
  } catch (e) {
    return null;
  }
}

// ===== HISOBOTNI O'CHIRISH =====
function deleteReport(id) {
  const d = openDB();
  if (!d) return { success: false };
  try {
    d.prepare('DELETE FROM reports WHERE id = ?').run(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ===== SOZLAMALAR =====
function getSetting(key, defaultVal = '') {
  const d = openDB();
  if (!d) return defaultVal;
  try {
    const row = d.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setSetting(key, value) {
  const d = openDB();
  if (!d) return;
  try {
    d.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    ).run(key, String(value));
  } catch (e) {}
}

// ===== STATISTIKA =====
function getStats() {
  const d = openDB();
  if (!d) return { total: 0, thisMonth: 0, totalSum: '0' };
  try {
    const total = d.prepare('SELECT COUNT(*) as c FROM reports').get().c;
    const month = d.prepare(
      "SELECT COUNT(*) as c FROM reports WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')"
    ).get().c;
    return { total, thisMonth: month };
  } catch (e) {
    return { total: 0, thisMonth: 0 };
  }
}

module.exports = {
  openDB, saveReport, getAllReports,
  getReportById, deleteReport,
  getSetting, setSetting, getStats
};
