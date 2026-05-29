const { ipcRenderer } = require('electron');

// ===== MA'LUMOTLAR KELGANDA TO'LDIRISH =====
ipcRenderer.on('fill-report', (event, d) => {
  fillReport(d);
});

function fillReport(d) {
  // Отчёт raqamini hamma sahifalarga
  document.querySelectorAll('.ph-number').forEach(el => {
    el.textContent = d.report_number || '—';
  });

  fillPage1(d);
  fillPage2(d);
  fillPage3(d);
  fillPage4(d);
  fillPage5(d);
  fillPage6(d);
  fillPage7(d);
  fillPage8(d);
}

// ===== ВАРАҚ 1: ТИТУЛЬНЫЙ ЛИСТ =====
function fillPage1(d) {
  set('t1-car-name',      `${d.car_brand} ${d.car_model}, ${d.car_year} г.`);
  set('t1-report-number', d.report_number);
  set('t1-report-date',   d.report_date);
  set('t1-client-name',   d.client_name);
  set('t1-car-plate',     d.car_plate);
  set('t1-grand-total',   d.grand_total + ' сум');
  set('t1-year',          d.year);
}

// ===== ВАРАҚ 2: СОДЕРЖАНИЕ =====
function fillPage2(d) {
  set('p2-report-date', d.report_date);
}

// ===== ВАРАҚ 3: СОПРОВОДИТЕЛЬНОЕ ПИСЬМО =====
function fillPage3(d) {
  set('p3-client-name',   d.client_name);
  set('p3-client-name2',  d.client_name);
  set('p3-report-date',   d.report_date);
  set('p3-car-full',      d.car_full_name);
  set('p3-car-plate',     d.car_plate);
  set('p3-dtp-date',      d.dtp_date   || '—');
  set('p3-dtp-place',     d.dtp_place  || '—');
  set('p3-grand-total',   d.grand_total + ' сум');
  set('p3-grand-words',   d.grand_words);
  set('p3-expert-name',   d.expert_name);
  set('p3-expert-position', d.expert_position);
  set('p3-expert-cert',   d.expert_cert || '—');
  set('p3-date-footer',   d.report_date);
}

// ===== ВАРАҚ 4: ИДЕНТИФИКАЦИЯ АМТС =====
function fillPage4(d) {
  set('p4-car-full',        `${d.car_brand} ${d.car_model}`);
  set('p4-car-year',        d.car_year);
  set('p4-car-color',       d.car_color   || '—');
  set('p4-car-plate',       d.car_plate);
  set('p4-car-vin',         d.car_vin     || '—');
  set('p4-car-body',        d.car_body    || '—');
  set('p4-car-engine',      (d.car_engine || '—') + ' л');
  set('p4-car-power',       (d.car_power  || '—') + ' л.с.');
  set('p4-car-transmission',d.car_transmission || '—');
  set('p4-car-drive',       d.car_drive   || '—');
  set('p4-car-mileage',     d.car_mileage ? formatNum(d.car_mileage) + ' км' : '—');
  set('p4-dtp-date',        d.dtp_date    || '—');
  set('p4-dtp-place',       d.dtp_place   || '—');
  set('p4-dtp-ref',         d.dtp_ref     || '—');
  set('p4-client-name',     d.client_name);
  set('p4-eval-purpose',    d.eval_purpose);
  set('p4-report-date',     d.report_date);
  set('p4-report-number',   d.report_number);
  set('p4-value-before',    d.car_value_before + ' сум');
  set('p4-car-wear',        d.car_wear + '%');
  set('p4-car-residual',    d.car_residual + ' сум');
  set('p4-date-footer',     d.report_date);
}

// ===== ВАРАҚ 5: АТАМАЛАР + АНДРИАНОВ =====
function fillPage5(d) {
  const currentYear = new Date().getFullYear();
  const carAge = d.car_year ? (currentYear - parseInt(d.car_year)) : '—';

  set('p5-car-age',       carAge + ' йил');
  set('p5-car-wear',      d.car_wear + '%');
  set('p5-value-before',  d.car_value_before + ' сум');
  set('p5-car-residual',  d.car_residual + ' сум');
  set('p5-date-footer',   d.report_date);
}

// ===== ВАРАҚ 6: ЁНДАШУВЛАР + ХУЛОСАЛАР =====
function fillPage6(d) {
  set('p6-parts-total',     d.parts_total + ' сум');
  set('p6-works-total',     d.works_total + ' сум');
  set('p6-materials-total', d.materials_total + ' сум');
  set('p6-grand-total',     d.grand_total + ' сум');
  set('p6-wear',            d.car_wear || '0');

  // Эскириш суммасини ҳисоблаш
  const wearPct    = parseFloat(d.car_wear) || 0;
  const grandRaw   = d.grand_total_raw || 0;
  const wearAmount = Math.round(grandRaw * wearPct / 100);
  const vshch      = grandRaw - wearAmount;

  set('p6-wear-amount', '− ' + formatNum(wearAmount) + ' сум');
  set('p6-vshch',       formatNum(vshch) + ' сум');

  set('p6-car-full',          d.car_full_name);
  set('p6-car-plate',         d.car_plate);
  set('p6-dtp-date',          d.dtp_date || '—');
  set('p6-conclusion-total',  d.grand_total + ' сум');
  set('p6-conclusion-words',  d.grand_words);
  set('p6-date-footer',       d.report_date);
}

// ===== ВАРАҚ 7: МУТАХАССИС =====
function fillPage7(d) {
  set('p7-expert-name',     d.expert_name);
  set('p7-expert-position', d.expert_position);
  set('p7-expert-cert',     d.expert_cert || '—');
  set('p7-expert-exp',      d.expert_exp  ? d.expert_exp + ' лет' : '—');
  set('p7-sign-name',       d.expert_name);
  set('p7-sign-date',       d.report_date);
  set('p7-date-footer',     d.report_date);
}

// ===== ВАРАҚ 8: КАЛЬКУЛЯЦИЯ =====
function fillPage8(d) {
  set('p8-car-full', `${d.car_brand} ${d.car_model}, ${d.car_year} г. | Гос. номер: ${d.car_plate}`);

  fillCalcTable('p8-parts-body',     d.parts     || []);
  fillCalcTable('p8-works-body',     d.works     || []);
  fillCalcTable('p8-materials-body', d.materials || []);

  set('p8-parts-total',     d.parts_total     + ' сум');
  set('p8-works-total',     d.works_total     + ' сум');
  set('p8-materials-total', d.materials_total + ' сум');

  set('p8-sum-parts',     d.parts_total     + ' сум');
  set('p8-sum-works',     d.works_total     + ' сум');
  set('p8-sum-materials', d.materials_total + ' сум');
  set('p8-grand-total',   d.grand_total     + ' сум');
  set('p8-grand-words',   d.grand_words);
  set('p8-date-footer',   d.report_date);
}

// ===== JADVAL TO'LDIRISH =====
function fillCalcTable(tbodyId, rows) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Маълумот йўқ</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.num}</td>
      <td>${escHtml(row.name)}</td>
      <td style="text-align:right">${row.qty}</td>
      <td style="text-align:right">${row.price}</td>
      <td style="text-align:right;font-weight:600;color:#1e429f">${row.sum}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== CHOP ETISH =====
function printReport() {
  ipcRenderer.send('print-report');
}

// ===== YORDAMCHI =====
function set(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '—';
}

function formatNum(n) {
  if (!n && n !== 0) return '0';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
