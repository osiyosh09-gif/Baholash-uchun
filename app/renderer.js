const { ipcRenderer } = require('electron');

// ===== SAHIFA YUKLANGANDA =====
document.addEventListener('DOMContentLoaded', () => {
  // Bugungi sanani avtomatik o'rnatish
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('report_date').value = today;

  // Barcha jadval hisoblarini ulash
  initTableListeners('parts-body', 'parts-total');
  initTableListeners('works-body', 'works-total');
  initTableListeners('materials-body', 'materials-total');

  // Wear o'zgarganda residual hisoblash
  document.getElementById('car_value_before').addEventListener('input', calcResidual);
  document.getElementById('car_wear').addEventListener('input', calcResidual);

  // PDF tugmasi
  document.getElementById('btn-pdf').addEventListener('click', openReport);

  // Tozalash tugmasi
  document.getElementById('btn-clear').addEventListener('click', clearForm);

  // LocalStorage dan yuklash
  loadFromStorage();
});

// ===== QATORLAR QOSHISH =====
function addRow(tbodyId, totalId) {
  const tbody = document.getElementById(tbodyId);
  const rows = tbody.querySelectorAll('tr');
  const rowNum = rows.length + 1;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${rowNum}</td>
    <td><input type="text" placeholder="Наименование" /></td>
    <td><input type="number" value="1" min="0.5" step="0.5" class="qty-input" /></td>
    <td><input type="number" placeholder="0" class="price-input" /></td>
    <td class="sum-cell">0</td>
    <td><button class="btn-remove" onclick="removeRow(this)">✕</button></td>
  `;
  tbody.appendChild(tr);
  initRowListeners(tr, tbodyId, totalId);
  updateRowNumbers(tbodyId);
}

// ===== QATORNI O'CHIRISH =====
function removeRow(btn) {
  const tr = btn.closest('tr');
  const tbody = tr.closest('tbody');
  const tbodyId = tbody.id;

  // Eng kamida 1 qator qolsin
  if (tbody.querySelectorAll('tr').length <= 1) {
    alert('Kamida bitta qator bo\'lishi kerak!');
    return;
  }

  tr.remove();
  updateRowNumbers(tbodyId);

  // Qaysi total?
  const totalId = tbodyId.replace('-body', '-total');
  recalcTotal(tbodyId, totalId);
  updateGrandTotal();
}

// ===== QATOR RAQAMLARINI YANGILASH =====
function updateRowNumbers(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  tbody.querySelectorAll('tr').forEach((tr, i) => {
    tr.querySelector('td:first-child').textContent = i + 1;
  });
}

// ===== JADVAL TINGLOVCHILARI =====
function initTableListeners(tbodyId, totalId) {
  const tbody = document.getElementById(tbodyId);
  tbody.querySelectorAll('tr').forEach(tr => {
    initRowListeners(tr, tbodyId, totalId);
  });
}

function initRowListeners(tr, tbodyId, totalId) {
  const qty = tr.querySelector('.qty-input');
  const price = tr.querySelector('.price-input');

  if (qty) qty.addEventListener('input', () => {
    calcRowSum(tr);
    recalcTotal(tbodyId, totalId);
    updateGrandTotal();
  });

  if (price) price.addEventListener('input', () => {
    calcRowSum(tr);
    recalcTotal(tbodyId, totalId);
    updateGrandTotal();
  });
}

// ===== QATOR SUMMASINI HISOBLASH =====
function calcRowSum(tr) {
  const qty   = parseFloat(tr.querySelector('.qty-input')?.value)   || 0;
  const price = parseFloat(tr.querySelector('.price-input')?.value) || 0;
  const sum   = qty * price;
  const cell  = tr.querySelector('.sum-cell');
  if (cell) cell.textContent = formatNum(sum);
  return sum;
}

// ===== JADVAL TOTALINI HISOBLASH =====
function recalcTotal(tbodyId, totalId) {
  const tbody = document.getElementById(tbodyId);
  let total = 0;
  tbody.querySelectorAll('tr').forEach(tr => {
    total += calcRowSum(tr);
  });
  const totalEl = document.getElementById(totalId);
  if (totalEl) totalEl.textContent = formatNum(total);
  return total;
}

// ===== UMUMIY SUMMA =====
function updateGrandTotal() {
  const parts     = getTotal('parts-total');
  const works     = getTotal('works-total');
  const materials = getTotal('materials-total');
  const grand     = parts + works + materials;

  document.getElementById('summary-parts').textContent     = formatNum(parts) + ' сум';
  document.getElementById('summary-works').textContent     = formatNum(works) + ' сум';
  document.getElementById('summary-materials').textContent = formatNum(materials) + ' сум';
  document.getElementById('summary-total').textContent     = formatNum(grand) + ' сум';
  document.getElementById('summary-words').textContent     = numberToWords(grand);
  document.getElementById('footer-total').textContent      = 'Итого: ' + formatNum(grand) + ' сум';

  saveToStorage();
}

function getTotal(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseFloat(el.textContent.replace(/\s/g, '').replace(',', '.')) || 0;
}

// ===== QOLDIQ QIYMAT =====
function calcResidual() {
  const before = parseFloat(document.getElementById('car_value_before').value) || 0;
  const wear   = parseFloat(document.getElementById('car_wear').value)          || 0;
  const residual = before * (1 - wear / 100);
  document.getElementById('car_residual').value = Math.round(residual);
  saveToStorage();
}

// ===== FORMANI TOZALASH =====
function clearForm() {
  if (!confirm('Barcha ma\'lumotlarni o\'chirishni xohlaysizmi?')) return;

  // Inputlarni tozalash
  document.querySelectorAll('input:not([readonly]), select').forEach(el => {
    if (el.type === 'number') el.value = '';
    else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });

  // Bugungi sanani qayta o'rnatish
  document.getElementById('report_date').value = new Date().toISOString().split('T')[0];

  // Jadvallarni reset
  ['parts-body', 'works-body', 'materials-body'].forEach(id => {
    const tbody = document.getElementById(id);
    tbody.innerHTML = `
      <tr>
        <td>1</td>
        <td><input type="text" placeholder="Наименование" /></td>
        <td><input type="number" value="1" min="0.5" step="0.5" class="qty-input" /></td>
        <td><input type="number" placeholder="0" class="price-input" /></td>
        <td class="sum-cell">0</td>
        <td><button class="btn-remove" onclick="removeRow(this)">✕</button></td>
      </tr>
    `;
    const totalId = id.replace('-body', '-total');
    initTableListeners(id, totalId);
  });

  // Totallarni reset
  ['parts-total','works-total','materials-total'].forEach(id => {
    document.getElementById(id).textContent = '0';
  });

  document.getElementById('summary-parts').textContent     = '0 сум';
  document.getElementById('summary-works').textContent     = '0 сум';
  document.getElementById('summary-materials').textContent = '0 сум';
  document.getElementById('summary-total').textContent     = '0 сум';
  document.getElementById('summary-words').textContent     = '—';
  document.getElementById('footer-total').textContent      = 'Итого: 0 сум';

  localStorage.removeItem('dtp_form_data');
}

// ===== PDF OCHISH =====
function openReport() {
  const data = collectFormData();

  // Majburiy maydonlarni tekshirish
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
  if (missing.length > 0) {
    alert('Пожалуйста, заполните обязательные поля:\n\n' + missing.map(f => '• ' + f.name).join('\n'));
    return;
  }

  const grand = getTotal('parts-total') + getTotal('works-total') + getTotal('materials-total');
  if (grand <= 0) {
    alert('Пожалуйста, заполните калькуляцию ущерба (запчасти, работы или материалы).');
    return;
  }

  ipcRenderer.send('open-report', data);
}

// ===== FORMA MA'LUMOTLARINI YIGISH =====
function collectFormData() {
  const parts     = collectTable('parts-body');
  const works     = collectTable('works-body');
  const materials = collectTable('materials-body');

  const partsTotal     = getTotal('parts-total');
  const worksTotal     = getTotal('works-total');
  const materialsTotal = getTotal('materials-total');
  const grandTotal     = partsTotal + worksTotal + materialsTotal;

  return {
    // Rekvizitlar
    report_number:  val('report_number'),
    report_date:    formatDate(val('report_date')),
    client_name:    val('client_name'),
    client_phone:   val('client_phone'),
    client_address: val('client_address'),
    eval_purpose:   val('eval_purpose') || 'Определение рыночной стоимости восстановительного ущерба АТС',

    // AMTS
    car_brand:        val('car_brand'),
    car_model:        val('car_model'),
    car_year:         val('car_year'),
    car_color:        val('car_color'),
    car_plate:        val('car_plate'),
    car_vin:          val('car_vin'),
    car_mileage:      val('car_mileage'),
    car_body:         val('car_body'),
    car_engine:       val('car_engine'),
    car_power:        val('car_power'),
    car_transmission: val('car_transmission'),
    car_drive:        val('car_drive'),
    car_full_name:    `${val('car_brand')} ${val('car_model')}, ${val('car_year')} г.`,

    // Qiymat
    car_value_before: formatNum(parseFloat(val('car_value_before')) || 0),
    car_wear:         val('car_wear') || '0',
    car_residual:     formatNum(parseFloat(val('car_residual')) || 0),
    dtp_date:         formatDate(val('dtp_date')),
    dtp_place:        val('dtp_place'),
    dtp_ref:          val('dtp_ref'),

    // Kalkulyatsiya
    parts,
    works,
    materials,
    parts_total:     formatNum(partsTotal),
    works_total:     formatNum(worksTotal),
    materials_total: formatNum(materialsTotal),
    grand_total:     formatNum(grandTotal),
    grand_total_raw: grandTotal,
    grand_words:     numberToWords(grandTotal),

    // Baholovchi
    expert_name:     val('expert_name'),
    expert_position: val('expert_position') || 'Сертифицированный оценщик',
    expert_cert:     val('expert_cert'),
    expert_exp:      val('expert_exp'),

    // Meta
    year: new Date().getFullYear(),
  };
}

function collectTable(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  const rows = [];
  tbody.querySelectorAll('tr').forEach((tr, i) => {
    const inputs = tr.querySelectorAll('input');
    if (inputs.length < 3) return;
    const name  = inputs[0]?.value?.trim() || '';
    const qty   = parseFloat(inputs[1]?.value) || 0;
    const price = parseFloat(inputs[2]?.value) || 0;
    const sum   = qty * price;
    if (name || sum > 0) {
      rows.push({ num: i + 1, name, qty, price: formatNum(price), sum: formatNum(sum) });
    }
  });
  return rows;
}

function val(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

// ===== LOCALSTORAGE =====
function saveToStorage() {
  try {
    const data = {};
    document.querySelectorAll('input:not([readonly]), select').forEach(el => {
      if (el.id) data[el.id] = el.value;
    });
    // Jadval qatorlarini saqlash
    ['parts-body', 'works-body', 'materials-body'].forEach(id => {
      const tbody = document.getElementById(id);
      const rows = [];
      tbody.querySelectorAll('tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input');
        rows.push(Array.from(inputs).map(i => i.value));
      });
      data['_table_' + id] = rows;
    });
    localStorage.setItem('dtp_form_data', JSON.stringify(data));
  } catch(e) {}
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('dtp_form_data');
    if (!saved) return;
    const data = JSON.parse(saved);

    // Inputlarni tiklash
    Object.keys(data).forEach(key => {
      if (key.startsWith('_table_')) return;
      const el = document.getElementById(key);
      if (el) el.value = data[key];
    });

    // Jadvallarni tiklash
    ['parts-body', 'works-body', 'materials-body'].forEach(id => {
      const tableKey = '_table_' + id;
      if (!data[tableKey]) return;
      const tbody = document.getElementById(id);
      const totalId = id.replace('-body', '-total');
      tbody.innerHTML = '';

      data[tableKey].forEach((row, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td><input type="text" placeholder="Наименование" value="${escHtml(row[0] || '')}" /></td>
          <td><input type="number" value="${row[1] || 1}" min="0.5" step="0.5" class="qty-input" /></td>
          <td><input type="number" placeholder="0" value="${row[2] || ''}" class="price-input" /></td>
          <td class="sum-cell">0</td>
          <td><button class="btn-remove" onclick="removeRow(this)">✕</button></td>
        `;
        tbody.appendChild(tr);
        initRowListeners(tr, id, totalId);
      });

      recalcTotal(id, totalId);
    });

    calcResidual();
    updateGrandTotal();
  } catch(e) {}
}

// Auto-save inputlar o'zgarganda
document.addEventListener('input', () => saveToStorage());

// ===== YORDAMCHI FUNKSIYALAR =====
function formatNum(n) {
  if (!n && n !== 0) return '0';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDate(str) {
  if (!str) return '___.____.______';
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return str;
  return `${d}.${m}.${y}`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== RAQAMNI SO'ZGA O'GIRISH (RU) =====
function numberToWords(n) {
  n = Math.round(n);
  if (n === 0) return 'Ноль сум';

  const ones = ['','один','два','три','четыре','пять','шесть','семь','восемь','девять',
                 'десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать',
                 'шестнадцать','семнадцать','восемнадцать','девятнадцать'];
  const tens = ['','','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто'];
  const hundreds = ['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот'];

  function group(num, fem) {
    let res = '';
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const o = num % 10;
    const tt = num % 100;

    if (h) res += hundreds[h] + ' ';
    if (tt < 20 && tt >= 10) {
      res += ones[tt] + ' ';
    } else {
      if (t) res += tens[t] + ' ';
      if (o) {
        if (fem && o === 1) res += 'одна ';
        else if (fem && o === 2) res += 'две ';
        else res += ones[o] + ' ';
      }
    }
    return res.trim();
  }

  let result = '';
  const billions  = Math.floor(n / 1_000_000_000);
  const millions  = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;

  if (billions) {
    result += group(billions, false) + ' ' + plural(billions, 'миллиард','миллиарда','миллиардов') + ' ';
  }
  if (millions) {
    result += group(millions, false) + ' ' + plural(millions, 'миллион','миллиона','миллионов') + ' ';
  }
  if (thousands) {
    result += group(thousands, true) + ' ' + plural(thousands, 'тысяча','тысячи','тысяч') + ' ';
  }
  if (remainder) {
    result += group(remainder, false) + ' ';
  }

  result = result.trim();
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result + ' сум';
}

function plural(n, one, two, five) {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return five;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return two;
  return five;
}
