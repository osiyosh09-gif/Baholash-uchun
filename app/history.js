const { ipcRenderer } = require('electron');

let allReports  = [];
let filtered    = [];

// ===== MA'LUMOTLAR KELGANDA =====
ipcRenderer.on('load-history', (event, reports) => {
  allReports = reports || [];
  filtered   = [...allReports];
  renderCards(filtered);
  updateCount();
});

// ===== KARTLARNI CHIZISH =====
function renderCards(reports) {
  const grid       = document.getElementById('cards-grid');
  const emptyState = document.getElementById('empty-state');
  grid.innerHTML   = '';

  if (!reports || reports.length === 0) {
    emptyState.style.display = 'flex';
    grid.style.display       = 'none';
    return;
  }

  emptyState.style.display = 'none';
  grid.style.display       = 'grid';

  reports.forEach(r => {
    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
      <div class="card-header">
        <span class="card-number">
          № ${esc(r.report_number)}
          <span class="lang-badge">${(r.lang || 'ru').toUpperCase()}</span>
        </span>
        <span class="card-date">${fmtDate(r.report_date)}</span>
      </div>
      <div class="card-car">🚗 ${esc(r.car_brand || '')} ${esc(r.car_model || '')}, ${esc(r.car_year || '')}</div>
      <span class="card-plate">${esc(r.car_plate || '—')}</span>
      <div class="card-client">👤 ${esc(r.client_name || '—')}</div>
      <div class="card-total">💰 ${fmtNum(r.grand_total)} сум</div>
      <div class="card-footer">
        <button class="btn-card btn-open"  onclick="openReport(${r.id})">✏️ Ochish</button>
        <button class="btn-card btn-pdf"   onclick="openPdf(${r.id})">📄 PDF</button>
        <button class="btn-card btn-del"   onclick="deleteReport(${r.id}, this)">🗑</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ===== QIDIRUV =====
function filterCards() {
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  if (!q) {
    filtered = [...allReports];
  } else {
    filtered = allReports.filter(r => {
      const haystack = [
        r.report_number, r.client_name, r.car_brand,
        r.car_model, r.car_year, r.car_plate
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }
  renderCards(filtered);
  updateCount();
}

// ===== SONI YANGILASH =====
function updateCount() {
  const countEl = document.getElementById('hist-count');
  const footEl  = document.getElementById('footer-total-count');
  const shown   = filtered.length;
  const total   = allReports.length;

  if (countEl) countEl.textContent = shown + ' та';
  if (footEl)  footEl.textContent  = `Jami: ${total} ta hisobot`;
}

// ===== HISOBOTNI ASOSIY OYNADA OCHISH =====
function openReport(id) {
  ipcRenderer.send('history-open-report', id);
}

// ===== PDF OCHISH =====
async function openPdf(id) {
  const row = await ipcRenderer.invoke('db-get-one', id);
  if (!row) { alert('Hisobot topilmadi!'); return; }

  // Ma'lumotlarni to'g'ri formatga o'tkazish
  const parts     = parseJson(row.parts_json);
  const works     = parseJson(row.works_json);
  const materials = parseJson(row.materials_json);

  const pT = sumTable(parts);
  const wT = sumTable(works);
  const mT = sumTable(materials);
  const grand = pT + wT + mT;

  const data = {
    report_number:    row.report_number,
    report_date:      row.report_date,
    client_name:      row.client_name,
    client_phone:     row.client_phone     || '',
    client_address:   row.client_address   || '',
    eval_purpose:     row.eval_purpose     || 'Определение рыночной стоимости восстановительного ущерба АТС',
    car_brand:        row.car_brand        || '',
    car_model:        row.car_model        || '',
    car_year:         row.car_year         || '',
    car_color:        row.car_color        || '',
    car_plate:        row.car_plate        || '',
    car_vin:          row.car_vin          || '',
    car_mileage:      row.car_mileage      || '',
    car_body:         row.car_body         || '',
    car_engine:       row.car_engine       || '',
    car_power:        row.car_power        || '',
    car_transmission: row.car_transmission || '',
    car_drive:        row.car_drive        || '',
    car_full_name:    `${row.car_brand} ${row.car_model}, ${row.car_year} г.`,
    car_value_before: row.car_value_before || '0',
    car_wear:         row.car_wear         || '0',
    car_residual:     row.car_residual     || '0',
    dtp_date:         row.dtp_date         || '',
    dtp_place:        row.dtp_place        || '',
    dtp_ref:          row.dtp_ref          || '',
    expert_name:      row.expert_name      || '',
    expert_position:  row.expert_position  || 'Сертифицированный оценщик',
    expert_cert:      row.expert_cert      || '',
    expert_exp:       row.expert_exp       || '',
    parts, works, materials,
    parts_total:     fmtNum(pT),
    works_total:     fmtNum(wT),
    materials_total: fmtNum(mT),
    grand_total:     fmtNum(grand),
    grand_total_raw: grand,
    grand_words:     numToWordsRU(grand) + ' сум',
    car_photo:       row.car_photo || null,
    lang:            row.lang      || 'ru',
    year:            new Date().getFullYear(),
  };

  ipcRenderer.send('open-report', data);
}

// ===== HISOBOTNI O'CHIRISH =====
async function deleteReport(id, btn) {
  if (!confirm('Bu hisobotni o\'chirishni xohlaysizmi?')) return;
  const result = await ipcRenderer.invoke('db-delete', id);
  if (result.success) {
    // Ro'yxatdan olib tashlash
    allReports = allReports.filter(r => r.id !== id);
    filtered   = filtered.filter(r => r.id !== id);
    // Kartani animatsiya bilan olib tashlash
    const card = btn.closest('.report-card');
    if (card) {
      card.style.transition = 'opacity 0.25s, transform 0.25s';
      card.style.opacity    = '0';
      card.style.transform  = 'scale(0.95)';
      setTimeout(() => { renderCards(filtered); updateCount(); }, 260);
    }
  } else {
    alert('O\'chirishda xatolik: ' + (result.error || ''));
  }
}

// ===== YORDAMCHI =====
function parseJson(str) {
  try { return JSON.parse(str || '[]'); } catch(e) { return []; }
}

function sumTable(rows) {
  return rows.reduce((acc, r) => {
    const qty   = parseFloat(r.qty)   || 0;
    const price = parseFloat(String(r.price || '').replace(/\s/g,'')) || 0;
    return acc + qty * price;
  }, 0);
}

function fmtNum(n) {
  const num = parseFloat(String(n || '0').replace(/\s/g,'')) || 0;
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ');
}

function fmtDate(str) {
  if (!str) return '—';
  // ISO: YYYY-MM-DD → DD.MM.YYYY
  const [y,m,d] = str.split('-');
  if (y && m && d) return `${d}.${m}.${y}`;
  return str;
}

function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function numToWordsRU(n) {
  const ones=['','один','два','три','четыре','пять','шесть','семь','восемь','девять',
    'десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать',
    'шестнадцать','семнадцать','восемнадцать','девятнадцать'];
  const tens=['','','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто'];
  const huns=['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот'];
  function grp(num,fem){
    let r='';
    const h=Math.floor(num/100),tt=num%100,t=Math.floor(tt/10),o=tt%10;
    if(h)r+=huns[h]+' ';
    if(tt<20&&tt>=10){r+=ones[tt]+' ';}
    else{if(t)r+=tens[t]+' ';if(o){if(fem&&o===1)r+='одна ';else if(fem&&o===2)r+='две ';else r+=ones[o]+' ';}}
    return r.trim();
  }
  function pl(n,a,b,c){const m=n%10,h=n%100;return(h>=11&&h<=19)?c:m===1?a:m>=2&&m<=4?b:c;}
  n=Math.round(n); if(!n) return 'Ноль';
  let res='';
  const B=Math.floor(n/1e9),M=Math.floor((n%1e9)/1e6),K=Math.floor((n%1e6)/1e3),R=n%1e3;
  if(B)res+=grp(B,false)+' '+pl(B,'миллиард','миллиарда','миллиардов')+' ';
  if(M)res+=grp(M,false)+' '+pl(M,'миллион','миллиона','миллионов')+' ';
  if(K)res+=grp(K,true)+' '+pl(K,'тысяча','тысячи','тысяч')+' ';
  if(R)res+=grp(R,false)+' ';
  res=res.trim();
  return res.charAt(0).toUpperCase()+res.slice(1);
}
