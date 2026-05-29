const { ipcRenderer } = require('electron');

// ===== HOLAT =====
let currentLang  = 'ru';
let currentPhoto = null;

// ===== SAHIFA YUKLANGANDA =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('report_date').value = todayStr();
  initAllTables();
  bindCalcListeners();
  loadFromStorage();
});

// ===== IPC: TIL =====
ipcRenderer.on('set-lang', (e, lang) => applyLang(lang));

// ===== IPC: STATISTIKA =====
ipcRenderer.on('db-stats', (e, stats) => {
  const el1 = document.getElementById('stats-total');
  const el2 = document.getElementById('stats-month');
  if (el1) el1.textContent = stats.total   || 0;
  if (el2) el2.textContent = stats.thisMonth || 0;
});

// ===== IPC: TARIXDAN MA'LUMOT YUKLASH =====
ipcRenderer.on('load-report-data', (e, row) => {
  loadRowIntoForm(row);
});

// ===== TIL ALMASHTIRISH =====
function switchLang(lang) {
  currentLang = lang;
  applyLang(lang);
  ipcRenderer.send('save-lang', lang);
  saveToStorage();
}

function applyLang(lang) {
  currentLang = lang;
  const T = TRANSLATIONS[lang] || TRANSLATIONS['ru'];

  // data-i18n atributli elementlarni yangilash
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (T[key] !== undefined) el.textContent = T[key];
  });

  // Tugma faol holati
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('lang-' + lang);
  if (activeBtn) activeBtn.classList.add('active');

  // Select optionlarini yangilash
  updateSelectOptions('car_body',         T.bodyTypes  || []);
  updateSelectOptions('car_transmission', T.transTypes || []);
  updateSelectOptions('car_drive',        T.driveTypes || []);

  // Footer total
  updateFooterTotal();
}

function updateSelectOptions(selectId, options) {
  const sel = document.getElementById(selectId);
  if (!sel || !options.length) return;
  const current = sel.value;
  sel.innerHTML = options.map(o => `<option>${o}</option>`).join('');
  // Eski qiymatni saqlab qolishga harakat
  const match = Array.from(sel.options).find(o => o.value === current);
  if (match) sel.value = current;
}

// ===== RASM YUKLASH =====
async function uploadPhoto() {
  const result = await ipcRenderer.invoke('upload-photo');
  if (!result) return;
  currentPhoto = result;
  showPhoto(result);
  saveToStorage();
}

function showPhoto(dataUrl) {
  const preview     = document.getElementById('photo-preview');
  const placeholder = document.getElementById('photo-placeholder');
  const removeBtn   = document.getElementById('btn-remove-photo');
  if (!preview) return;
  preview.src = dataUrl;
  preview.classList.remove('hidden');
  placeholder.classList.add('hidden');
  removeBtn.classList.remove('hidden');
}

function removePhoto() {
  currentPhoto = null;
  const preview     = document.getElementById('photo-preview');
  const placeholder = document.getElementById('photo-placeholder');
  const removeBtn   = document.getElementById('btn-remove-photo');
  preview.src = '';
  preview.classList.add('hidden');
  placeholder.classList.remove('hidden');
  removeBtn.classList.add('hidden');
  saveToStorage();
}

// ===== JADVAL BOSHQARUVI =====
function initAllTables() {
  initTableListeners('parts-body',     'parts-total');
  initTableListeners('works-body',     'works-total');
  initTableListeners('materials-body', 'materials-total');
}

function addRow(tbodyId, totalId) {
  const tbody  = document.getElementById(tbodyId);
  const rowNum = tbody.querySelectorAll('tr').length + 1;
  const tr     = document.createElement('tr');
  tr.innerHTML = `
    <td>${rowNum}</td>
    <td><input type="text" placeholder="Наименование"/></td>
    <td><input type="number" value="1" min="0.5" step="0.5" class="qty-input"/></td>
    <td><input type="number" placeholder="0" class="price-input"/></td>
    <td class="sum-cell">0</td>
    <td><button class="btn-remove" onclick="removeRow(this)">✕</button></td>
  `;
  tbody.appendChild(tr);
  initRowListeners(tr, tbodyId, totalId);
  updateRowNumbers(tbodyId);
}

function removeRow(btn) {
  const tr    = btn.closest('tr');
  const tbody = tr.closest('tbody');
  if (tbody.querySelectorAll('tr').length <= 1) return;
  tr.remove();
  const tbodyId = tbody.id;
  updateRowNumbers(tbodyId);
  recalcTotal(tbodyId, tbodyId.replace('-body', '-total'));
  updateGrandTotal();
}

function updateRowNumbers(tbodyId) {
  document.getElementById(tbodyId)
    .querySelectorAll('tr')
    .forEach((tr, i) => { tr.querySelector('td:first-child').textContent = i + 1; });
}

function initTableListeners(tbodyId, totalId) {
  document.getElementById(tbodyId).querySelectorAll('tr').forEach(tr => {
    initRowListeners(tr, tbodyId, totalId);
  });
}

function initRowListeners(tr, tbodyId, totalId) {
  tr.querySelectorAll('.qty-input, .price-input').forEach(inp => {
    inp.addEventListener('input', () => {
      calcRowSum(tr);
      recalcTotal(tbodyId, totalId);
      updateGrandTotal();
    });
  });
}

function calcRowSum(tr) {
  const qty   = parseFloat(tr.querySelector('.qty-input')?.value)   || 0;
  const price = parseFloat(tr.querySelector('.price-input')?.value) || 0;
  const sum   = qty * price;
  const cell  = tr.querySelector('.sum-cell');
  if (cell) cell.textContent = fmtNum(sum);
  return sum;
}

function recalcTotal(tbodyId, totalId) {
  let total = 0;
  document.getElementById(tbodyId).querySelectorAll('tr').forEach(tr => {
    total += calcRowSum(tr);
  });
  const el = document.getElementById(totalId);
  if (el) el.textContent = fmtNum(total);
  return total;
}

// ===== CALC LISTENERS =====
function bindCalcListeners() {
  document.getElementById('car_value_before')
    ?.addEventListener('input', calcResidual);
  document.getElementById('car_wear')
    ?.addEventListener('input', calcResidual);
  document.addEventListener('input', debounce(() => {
    saveToStorage();
  }, 600));
}

function calcResidual() {
  const before   = parseFloat(v('car_value_before')) || 0;
  const wear     = parseFloat(v('car_wear'))          || 0;
  const residual = Math.round(before * (1 - wear / 100));
  const el = document.getElementById('car_residual');
  if (el) el.value = residual;
}

// ===== GRAND TOTAL =====
function updateGrandTotal() {
  const T       = TRANSLATIONS[currentLang] || TRANSLATIONS['ru'];
  const cur     = T.currency || 'сум';
  const parts   = getNumTotal('parts-total');
  const works   = getNumTotal('works-total');
  const mats    = getNumTotal('materials-total');
  const grand   = parts + works + mats;

  setText('summary-parts',     fmtNum(parts)  + ' ' + cur);
  setText('summary-works',     fmtNum(works)  + ' ' + cur);
  setText('summary-materials', fmtNum(mats)   + ' ' + cur);
  setText('summary-total',     fmtNum(grand)  + ' ' + cur);
  setText('summary-words',     numToWords(grand));
  updateFooterTotal();
}

function updateFooterTotal() {
  const T   = TRANSLATIONS[currentLang] || TRANSLATIONS['ru'];
  const cur = T.currency || 'сум';
  const grand = getNumTotal('parts-total') +
                getNumTotal('works-total') +
                getNumTotal('materials-total');
  const el = document.getElementById('footer-total');
  if (el) el.textContent = (T.footerTotal || 'Итого:') + ' ' + fmtNum(grand) + ' ' + cur;
}

function getNumTotal(id) {
  const t = document.getElementById(id)?.textContent || '0';
  return parseFloat(t.replace(/\s/g, '')) || 0;
}

// ===== FORMA MA'LUMOTLARI =====
function collectFormData() {
  const parts     = collectTable('parts-body');
  const works     = collectTable('works-body');
  const materials = collectTable('materials-body');
  const pT = getNumTotal('parts-total');
  const wT = getNumTotal('works-total');
  const mT = getNumTotal('materials-total');
  const grand = pT + wT + mT;

  return {
    report_number:    v('report_number'),
    report_date:      fmtDate(v('report_date')),
    client_name:      v('client_name'),
    client_phone:     v('client_phone'),
    client_address:   v('client_address'),
    eval_purpose:     v('eval_purpose') || 'Определение рыночной стоимости восстановительного ущерба АТС',
    car_brand:        v('car_brand'),
    car_model:        v('car_model'),
    car_year:         v('car_year'),
    car_color:        v('car_color'),
    car_plate:        v('car_plate'),
    car_vin:          v('car_vin'),
    car_mileage:      v('car_mileage'),
    car_body:         v('car_body'),
    car_engine:       v('car_engine'),
    car_power:        v('car_power'),
    car_transmission: v('car_transmission'),
    car_drive:        v('car_drive'),
    car_full_name:    `${v('car_brand')} ${v('car_model')}, ${v('car_year')} г.`,
    car_value_before: fmtNum(parseFloat(v('car_value_before')) || 0),
    car_wear:         v('car_wear') || '0',
    car_residual:     fmtNum(parseFloat(v('car_residual'))     || 0),
    dtp_date:         fmtDate(v('dtp_date')),
    dtp_place:        v('dtp_place'),
    dtp_ref:          v('dtp_ref'),
    expert_name:      v('expert_name'),
    expert_position:  v('expert_position') || 'Сертифицированный оценщик',
    expert_cert:      v('expert_cert'),
    expert_exp:       v('expert_exp'),
    parts,  works,  materials,
    parts_total:     fmtNum(pT),
    works_total:     fmtNum(wT),
    materials_total: fmtNum(mT),
    grand_total:     fmtNum(grand),
    grand_total_raw: grand,
    grand_words:     numToWords(grand),
    car_photo:       currentPhoto || null,
    lang:            currentLang,
    year:            new Date().getFullYear(),
  };
}

function collectTable(tbodyId) {
  const rows = [];
  document.getElementById(tbodyId).querySelectorAll('tr').forEach((tr, i) => {
    const inputs = tr.querySelectorAll('input');
    if (inputs.length < 3) return;
    const name  = inputs[0]?.value?.trim() || '';
    const qty   = parseFloat(inputs[1]?.value) || 0;
    const price = parseFloat(inputs[2]?.value) || 0;
    if (name || price > 0) {
      rows.push({ num: i+1, name, qty, price: fmtNum(price), sum: fmtNum(qty * price) });
    }
  });
  return rows;
}

// ===== PDF OCHISH =====
function openReport() {
  const data = collectFormData();
  const T    = TRANSLATIONS[currentLang] || TRANSLATIONS['ru'];
  const required = [
    { id: 'report_number', name: 'Номер отчёта' },
    { id: 'client_name',   name: 'ФИО заказчика' },
    { id: 'car_brand',     name: 'Марка автомобиля' },
    { id: 'car_model',     name: 'Модель' },
    { id: 'car_year',      name: 'Год выпуска' },
    { id: 'car_plate',     name: 'Гос. номер' },
    { id: 'expert_name',   name: 'ФИО оценщика' },
  ];
  const missing = required.filter(f => !document.getElementById(f.id)?.value?.trim());
  if (missing.length) {
    alert((T.msgFillRequired || 'Обязательные поля:\n\n') + missing.map(f => '• ' + f.name).join('\n'));
    return;
  }
  if (data.grand_total_raw <= 0) {
    alert(T.msgFillCalc || 'Пожалуйста, заполните калькуляцию ущерба.');
    return;
  }
  ipcRenderer.send('open-report', data);
}

// ===== DB SAQLASH =====
async function saveReport() {
  const data = collectFormData();
  if (!data.report_number) {
    alert('Hisobot raqamini kiriting!');
    return;
  }
  const result = await ipcRenderer.invoke('db-save', data);
  if (result.success) {
    showSaveIndicator();
  } else {
    alert('Xatolik: ' + result.error);
  }
}

function showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

// ===== TARIX OCHISH =====
function openHistory() {
  ipcRenderer.send('open-history');
}

// ===== FORMANI TOZALASH =====
function clearForm() {
  const T = TRANSLATIONS[currentLang] || TRANSLATIONS['ru'];
  if (!confirm(T.msgClearConfirm || 'Очистить форму?')) return;

  document.querySelectorAll('input:not([readonly]), select').forEach(el => {
    el.tagName === 'SELECT' ? el.selectedIndex = 0 : (el.value = '');
  });
  document.getElementById('report_date').value = todayStr();

  ['parts-body','works-body','materials-body'].forEach(id => {
    const tbody   = document.getElementById(id);
    const totalId = id.replace('-body','-total');
    tbody.innerHTML = `
      <tr>
        <td>1</td>
        <td><input type="text" placeholder="Наименование"/></td>
        <td><input type="number" value="1" min="0.5" step="0.5" class="qty-input"/></td>
        <td><input type="number" placeholder="0" class="price-input"/></td>
        <td class="sum-cell">0</td>
        <td><button class="btn-remove" onclick="removeRow(this)">✕</button></td>
      </tr>`;
    initTableListeners(id, totalId);
    document.getElementById(totalId).textContent = '0';
  });

  removePhoto();
  updateGrandTotal();
  localStorage.removeItem('dtp_form_data');
}

// ===== LOCALSTORAGE =====
function saveToStorage() {
  try {
    const data = { _lang: currentLang, _photo: currentPhoto };
    document.querySelectorAll('input:not([readonly]), select').forEach(el => {
      if (el.id) data[el.id] = el.value;
    });
    ['parts-body','works-body','materials-body'].forEach(id => {
      data['_tbl_' + id] = collectTableRaw(id);
    });
    localStorage.setItem('dtp_form_data', JSON.stringify(data));
  } catch(e) {}
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('dtp_form_data');
    if (!saved) return;
    const data = JSON.parse(saved);

    if (data._lang) applyLang(data._lang);
    if (data._photo) { currentPhoto = data._photo; showPhoto(data._photo); }

    Object.keys(data).forEach(key => {
      if (key.startsWith('_')) return;
      const el = document.getElementById(key);
      if (el) el.value = data[key];
    });

    ['parts-body','works-body','materials-body'].forEach(id => {
      const rows = data['_tbl_' + id];
      if (!rows || !rows.length) return;
      restoreTable(id, rows);
    });

    calcResidual();
    updateGrandTotal();
  } catch(e) {}
}

function collectTableRaw(tbodyId) {
  const rows = [];
  document.getElementById(tbodyId).querySelectorAll('tr').forEach(tr => {
    const inputs = tr.querySelectorAll('input');
    rows.push(Array.from(inputs).map(i => i.value));
  });
  return rows;
}

function restoreTable(tbodyId, rows) {
  const tbody   = document.getElementById(tbodyId);
  const totalId = tbodyId.replace('-body','-total');
  tbody.innerHTML = '';
  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td><input type="text" value="${esc(row[0]||'')}"/></td>
      <td><input type="number" value="${row[1]||1}" min="0.5" step="0.5" class="qty-input"/></td>
      <td><input type="number" value="${row[2]||''}" placeholder="0" class="price-input"/></td>
      <td class="sum-cell">0</td>
      <td><button class="btn-remove" onclick="removeRow(this)">✕</button></td>`;
    tbody.appendChild(tr);
    initRowListeners(tr, tbodyId, totalId);
  });
  recalcTotal(tbodyId, totalId);
}

// Tarixdan formaga yuklash
function loadRowIntoForm(row) {
  const fields = [
    'report_number','report_date','client_name','client_phone','client_address',
    'eval_purpose','car_brand','car_model','car_year','car_color','car_plate',
    'car_vin','car_mileage','car_body','car_engine','car_power','car_transmission',
    'car_drive','car_value_before','car_wear','car_residual','dtp_date','dtp_place',
    'dtp_ref','expert_name','expert_position','expert_cert','expert_exp'
  ];
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el && row[f] !== undefined) el.value = row[f];
  });

  if (row.car_photo) { currentPhoto = row.car_photo; showPhoto(row.car_photo); }
  else removePhoto();

  ['parts','works','materials'].forEach(key => {
    const tbodyId = key + '-body';
    const rows    = row[key] || [];
    if (!rows.length) return;
    restoreTable(tbodyId, rows.map(r => [r.name, r.qty, parseFloat(r.price?.replace(/\s/g,''))||0]));
  });

  if (row.lang) applyLang(row.lang);
  calcResidual();
  updateGrandTotal();
  saveToStorage();
}

// ===== YORDAMCHI =====
function v(id) { return document.getElementById(id)?.value?.trim() || ''; }
function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function fmtNum(n) {
  return Math.round(n||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ');
}

function fmtDate(str) {
  if (!str) return '___.___.______';
  const [y,m,d] = str.split('-');
  return (y && m && d) ? `${d}.${m}.${y}` : str;
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ===== RAQAMNI SO'ZGA (RU/UZ) =====
function numToWords(n) {
  const T = TRANSLATIONS[currentLang] || TRANSLATIONS['ru'];
  n = Math.round(n);
  if (n === 0) return currentLang === 'uz' ? 'Nol so\'m' : 'Ноль сум';

  const cur = T.currency || 'сум';

  if (currentLang === 'uz') {
    return numToWordsUZ(n) + ' ' + cur;
  }
  return numToWordsRU(n) + ' ' + cur;
}

function numToWordsRU(n) {
  const ones = ['','один','два','три','четыре','пять','шесть','семь','восемь','девять',
    'десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать',
    'шестнадцать','семнадцать','восемнадцать','девятнадцать'];
  const tens = ['','','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто'];
  const huns = ['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот'];

  function grp(num, fem) {
    let r = '';
    const h=Math.floor(num/100), tt=num%100, t=Math.floor(tt/10), o=tt%10;
    if(h) r+=huns[h]+' ';
    if(tt<20&&tt>=10){ r+=ones[tt]+' '; }
    else { if(t) r+=tens[t]+' '; if(o){ if(fem&&o===1)r+='одна '; else if(fem&&o===2)r+='две '; else r+=ones[o]+' '; } }
    return r.trim();
  }
  function pl(n,a,b,c){ const m=n%10,h=n%100; return(h>=11&&h<=19)?c:m===1?a:m>=2&&m<=4?b:c; }

  let res='';
  const B=Math.floor(n/1e9), M=Math.floor((n%1e9)/1e6), K=Math.floor((n%1e6)/1e3), R=n%1e3;
  if(B) res+=grp(B,false)+' '+pl(B,'миллиард','миллиарда','миллиардов')+' ';
  if(M) res+=grp(M,false)+' '+pl(M,'миллион','миллиона','миллионов')+' ';
  if(K) res+=grp(K,true)+' '+pl(K,'тысяча','тысячи','тысяч')+' ';
  if(R) res+=grp(R,false)+' ';
  res=res.trim();
  return res.charAt(0).toUpperCase()+res.slice(1);
}

function numToWordsUZ(n) {
  const ones=['','bir','ikki','uch','to\'rt','besh','olti','yetti','sakkiz','to\'qqiz',
    'o\'n','o\'n bir','o\'n ikki','o\'n uch','o\'n to\'rt','o\'n besh',
    'o\'n olti','o\'n yetti','o\'n sakkiz','o\'n to\'qqiz'];
  const tens=['','','yigirma','o\'ttiz','qirq','ellik','oltmish','yetmish','sakson','to\'qson'];
  const huns=['','yuz','ikki yuz','uch yuz','to\'rt yuz','besh yuz','olti yuz','yetti yuz','sakkiz yuz','to\'qqiz yuz'];

  function grp(num){
    let r='';
    const h=Math.floor(num/100),tt=num%100,t=Math.floor(tt/10),o=tt%10;
    if(h) r+=huns[h]+' ';
    if(tt<20&&tt>=10){ r+=ones[tt]+' '; }
    else{ if(t) r+=tens[t]+' '; if(o) r+=ones[o]+' '; }
    return r.trim();
  }

  let res='';
  const B=Math.floor(n/1e9),M=Math.floor((n%1e9)/1e6),K=Math.floor((n%1e6)/1e3),R=n%1e3;
  if(B) res+=grp(B)+' milliard ';
  if(M) res+=grp(M)+' million ';
  if(K) res+=grp(K)+' ming ';
  if(R) res+=grp(R)+' ';
  res=res.trim();
  return res.charAt(0).toUpperCase()+res.slice(1);
}
