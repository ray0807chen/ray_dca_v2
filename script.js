// ══════════════════════════════════════════
//  RAY DCA — script.js v3.0
//  Premium UX: Toast · Skeleton · GSAP · CountUp
// ══════════════════════════════════════════

// ── Global State ──
let stockData      = null;
let companiesData  = {};
let selectedStock  = null;
let myChart        = null;

// ── Top progress bar ──
const progress = document.getElementById('topProgress');
function progressStart() {
  if (!progress) return;
  progress.style.width = '0%';
  progress.style.opacity = '1';
  requestAnimationFrame(() => { progress.style.width = '70%'; });
}
function progressDone() {
  if (!progress) return;
  progress.style.width = '100%';
  setTimeout(() => { progress.style.opacity = '0'; progress.style.width = '0%'; }, 400);
}

// ── Toast system (replaces alert) ──
const icons = {
  error:   `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  warn:    `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.29 3.86-8.25 14.27A2 2 0 0 0 3.75 21h16.5a2 2 0 0 0 1.71-3.01L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:    `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

function showToast(type, title, msg, duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) { console.warn(title, msg); return; }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `${icons[type]}<div class="toast-body"><div class="toast-title">${title}</div>${msg ? `<div class="toast-msg">${msg}</div>` : ''}</div>`;
  container.appendChild(t);
  requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add('show')); });
  setTimeout(() => {
    t.classList.replace('show', 'hide');
    t.addEventListener('transitionend', () => t.remove(), { once: true });
  }, duration);
}

// ── Skeleton builders ──
function buildSkeletonCards(count = 12) {
  const grid = document.getElementById('stockGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    grid.insertAdjacentHTML('beforeend', `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton skeleton-line w-60"></div>
        <div class="skeleton skeleton-line w-40"></div>
        <div class="skeleton skeleton-line w-80"></div>
      </div>`);
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  buildSkeletonCards();
  progressStart();
  await loadCompaniesData();
  progressDone();
  
  const grid = document.getElementById('stockGrid');
  if (grid) {
    initializeStockCards();
    initializeDateRange();
    setupSearchFilter();
  }
});

// ── Load companies.json ──
async function loadCompaniesData() {
  try {
    const res = await fetch('companies.json');
    companiesData = await res.json();
    
    if (companiesData._metadata && companiesData._metadata.last_updated) {
      const noteEl = document.getElementById('dataUpdateNote');
      if (noteEl) {
        noteEl.innerHTML = `⭐ 數據更新日期：<strong>${companiesData._metadata.last_updated}</strong> (收盤價)`;
      }
    }
  } catch (e) {
    showToast('error', '資料載入失敗', '無法取得公司列表，請重新整理');
  }
}

// ── Load per-stock JSON ──
async function loadStockData(symbol) {
  try {
    const res = await fetch(`stock_data/${symbol}.json`);
    const data = await res.json();
    return data.prices;
  } catch (e) {
    showToast('error', '資料載入失敗', `無法取得 ${symbol} 的股價數據`);
    return null;
  }
}

// ── Render stock cards with stagger ──
function initializeStockCards() {
  const grid = document.getElementById('stockGrid');
  if (!grid) return;
  // Filter out metadata
  const entries = Object.entries(companiesData).filter(([symbol]) => !symbol.startsWith('_'));
  const countEl = document.getElementById('searchCount');

  if (countEl) countEl.textContent = `${entries.length} 支`;

  grid.innerHTML = '';
  entries.forEach(([symbol, company], idx) => {
    const card = document.createElement('div');
    card.className = 'stock-card';
    card.id = `card-${symbol}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${company.chinese_name} ${symbol}`);
    card.addEventListener('click', () => selectStock(symbol));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') selectStock(symbol); });

    card.innerHTML = `
      <img src="${company.icon}" alt="${company.chinese_name}" loading="lazy"
           onerror="this.src='icon/default.png'">
      <h3>${company.chinese_name}</h3>
      <p class="stock-symbol">${symbol}</p>
      <p class="stock-sector">${company.sector} · ${company.industry}</p>
      <span class="price-change" id="pc-${symbol}">—</span>`;
    grid.appendChild(card);

    // Stagger entrance via IntersectionObserver
    setTimeout(() => {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.05 });
      obs.observe(card);
    }, idx * 30);
  });

  // Batch-load price changes
  const BATCH = 5;
  (async () => {
    for (let i = 0; i < entries.length; i += BATCH) {
      await Promise.all(entries.slice(i, i + BATCH).map(async ([symbol]) => {
        try {
          const res = await fetch(`stock_data/${symbol}.json`);
          if (!res.ok) return;
          const data = await res.json();
          const dates = Object.keys(data.prices).sort();
          if (dates.length < 2) return;
          const latest = data.prices[dates[dates.length - 1]];
          const prev   = data.prices[dates[dates.length - 2]];
          const change = ((latest - prev) / prev) * 100;
          const el = document.getElementById(`pc-${symbol}`);
          if (el) {
            el.className  = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
            el.innerHTML  = `
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                ${change >= 0
                  ? '<polyline points="18 15 12 9 6 15"/>'
                  : '<polyline points="6 9 12 15 18 9"/>'}
              </svg>
              ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
          }
        } catch (_) {}
      }));
    }
  })();
}

// ── Search filter ──
function setupSearchFilter() {
  const input   = document.getElementById('searchInput');
  const countEl = document.getElementById('searchCount');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const cards = document.querySelectorAll('.stock-card');
    let visible = 0;
    cards.forEach(card => {
      const sym  = card.querySelector('.stock-symbol')?.textContent.toLowerCase() || '';
      const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
      const sect = card.querySelector('.stock-sector')?.textContent.toLowerCase() || '';
      const show = !q || sym.includes(q) || name.includes(q) || sect.includes(q);
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (countEl) countEl.textContent = q ? `${visible} 筆結果` : `${Object.keys(companiesData).filter(k => !k.startsWith('_')).length} 支`;
  });
}

// ── Date range ──
function initializeDateRange() {
  const today = new Date().toISOString().split('T')[0];
  const fiveAgo = new Date();
  fiveAgo.setFullYear(fiveAgo.getFullYear() - 5);

  const startEl = document.getElementById('startDate');
  const endEl   = document.getElementById('endDate');
  if (!startEl || !endEl) return;

  startEl.value = fiveAgo.toISOString().split('T')[0];
  endEl.value   = today;
  endEl.max     = today;

  startEl.addEventListener('change', () => { if (endEl.value < startEl.value) endEl.value = startEl.value; });
  endEl.addEventListener('change',   () => { if (startEl.value > endEl.value) startEl.value = endEl.value; });
}

// ── Page navigation ──
function showMainPage() {
  window.location.href = window.location.pathname;
}

window.addEventListener('popstate', () => { window.location.reload(); });

function resetResults() {
  ['totalInvestment','currentValue','totalProfitLoss','totalReturn','annualReturn','maxDrawdown','totalFees']
    .forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = id.includes('Return') || id.includes('Profit') ? '0%' : '$0';
      el.className = '';
    });
  if (myChart) { myChart.destroy(); myChart = null; }
  const rs = document.getElementById('resultsSection');
  if (rs) rs.classList.add('hidden');
  document.querySelectorAll('input[name="investmentDay"]').forEach(cb => cb.checked = false);
  const mi = document.getElementById('monthlyInvestment'); if (mi) mi.value = '1000';
  const fr = document.getElementById('feeRate');           if (fr) fr.value = '0.1';
  const hh = document.getElementById('holidayHandling');   if (hh) hh.value = 'next';
}

// ── Select a stock → show backtest page ──
async function selectStock(symbol) {
  try {
    selectedStock = symbol;
    const company = companiesData[symbol];
    if (!company) { showToast('error', '找不到公司資料', `${symbol} 的資料不存在`); return; }

    const required = ['chinese_name','description','headquarters','ceo','key_products','key_services'];
    const missing  = required.filter(f => !company[f]);
    if (missing.length) { showToast('warn', '資料不完整', `缺少欄位: ${missing.join(', ')}`); return; }

    // Update date limits
    const startEl = document.getElementById('startDate');
    const endEl   = document.getElementById('endDate');
    if (company.ipo_date) {
      startEl.min = company.ipo_date;
      if (new Date(startEl.value) < new Date(company.ipo_date)) startEl.value = company.ipo_date;
    }
    const today = new Date().toISOString().split('T')[0];
    endEl.max = today;

    // Populate stock info
    document.getElementById('selectedStockIcon').src = company.icon || '';
    document.getElementById('selectedStockName').textContent = `${company.chinese_name} (${symbol})`;
    document.getElementById('selectedStockDescription').innerHTML = `
      <p class="company-desc">${company.description}</p>
      <div class="company-details">
        <div class="detail-item"><span class="label">成立時間</span><span class="value">${company.founded || '—'}</span></div>
        <div class="detail-item"><span class="label">總部</span><span class="value">${company.headquarters}</span></div>
        <div class="detail-item"><span class="label">CEO</span><span class="value">${company.ceo}</span></div>
        <div class="detail-item"><span class="label">上市日期</span><span class="value">${company.ipo_date || '—'}</span></div>
      </div>
      <div class="company-products">
        <h4>主要產品</h4><p>${company.key_products.join('、')}</p>
        <h4>主要服務</h4><p>${company.key_services.join('、')}</p>
      </div>`;

    // Render Market Data if available
    if (company.market_data && company.market_data.price) {
      const md = company.market_data;
      const mktCapB = (md.mktCap / 1000000000).toFixed(2);
      const isBuy = md.rating_recommendation && String(md.rating_recommendation).includes('Buy');
      const isSell = md.rating_recommendation && String(md.rating_recommendation).includes('Sell');
      
      const updateDate = (companiesData._metadata && companiesData._metadata.last_updated) ? companiesData._metadata.last_updated : '';
      const updateDateHtml = updateDate ? `<span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal; margin-left: 8px;">(數據更新日期：${updateDate} 收盤價)</span>` : '';

      
      let ratingScoreNum = parseFloat(md.rating_score) || 0;
      let gaugePercentage = 0;
      if (ratingScoreNum > 0) {
        // Map 1-5 to 0-100%
        gaugePercentage = ((ratingScoreNum - 1) / 4) * 100;
        // Clamp
        gaugePercentage = Math.max(0, Math.min(100, gaugePercentage));
      }

      document.getElementById('selectedStockDescription').innerHTML += `
        <div class="market-data-panel mt-3">
          <h4>最新市場評估 ${updateDateHtml}</h4>
          <div class="market-grid">
            <div class="m-item"><span>最新股價</span><strong>$${md.price.toFixed(2)}</strong></div>
            <div class="m-item"><span>總市值</span><strong>$${mktCapB}B</strong></div>
            <div class="m-item">
              <span class="has-tooltip" data-tooltip="本益比 (PE Ratio)\n資料來源: Yahoo Finance\n每日自動更新">本益比 (PE) <i class="tooltip-icon">?</i></span>
              <strong>${md.pe ? md.pe.toFixed(2) : '—'}</strong>
            </div>
          </div>
          
          <div class="rating-gauge-container mt-3">
            <div class="gauge-header">
              <span class="has-tooltip" data-tooltip="綜合評級與華爾街分析師共識建議\n分數由 1 (賣出) 至 5 (強烈買進)\n資料來源: Yahoo Finance">分析師綜合評估 <i class="tooltip-icon">?</i></span>
              <strong class="gauge-score-text ${isBuy ? 'positive' : isSell ? 'text-down' : ''}">
                ${md.rating_recommendation || '—'} (${md.rating_score && md.rating_score !== '-' ? md.rating_score + ' / 5' : md.rating_score})
              </strong>
            </div>
            <div class="gauge-bar-wrapper">
              <div class="gauge-bar-bg"></div>
              <div class="gauge-marker" style="left: ${gaugePercentage}%;">
                <div class="gauge-pointer"></div>
                ${md.rating && md.rating !== 'N/A' && md.rating !== 'NR' ? `<div class="gauge-badge">${md.rating}</div>` : ''}
              </div>
            </div>
            <div class="gauge-labels">
              <span>1 (賣出)</span>
              <span>3 (持有)</span>
              <span>5 (強烈買進)</span>
            </div>
          </div>
        </div>
      `;
    }

    resetResults();

    // Page transition
    const mainPage    = document.getElementById('mainPage');
    const backtestPage = document.getElementById('backtestPage');
    mainPage.style.display = 'none';
    backtestPage.classList.add('active');
    backtestPage.style.animationName = 'none';
    requestAnimationFrame(() => { backtestPage.style.animationName = ''; });

    if (!arguments[1]) history.pushState({ page: 'backtest' }, '', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (e) {
    showToast('error', '發生錯誤', '請重新整理頁面後再試');
    console.error(e);
  }
}

// ── Calculate backtest ──
async function calculatePortfolioPerformance() {
  if (!selectedStock) { showToast('warn', '尚未選擇股票', '請先選擇一支股票'); return; }

  const btn = document.getElementById('calculateBtn');
  btn.classList.add('loading');
  btn.textContent = '計算中';
  progressStart();

  const startDate = document.getElementById('startDate').value;
  const endDate   = document.getElementById('endDate').value;
  const monthly   = parseFloat(document.getElementById('monthlyInvestment').value);
  const feeRate   = parseFloat(document.getElementById('feeRate').value) / 100;
  const company   = companiesData[selectedStock];

  if (company.ipo_date && new Date(startDate) < new Date(company.ipo_date)) {
    showToast('warn', '日期超過範圍', `上市時間為 ${company.ipo_date}，已自動調整`);
    document.getElementById('startDate').value = company.ipo_date;
    btn.classList.remove('loading'); btn.textContent = '開始回測'; progressDone(); return;
  }

  const selectedDays = Array.from(document.querySelectorAll('input[name="investmentDay"]:checked'))
    .map(cb => parseInt(cb.value));
  if (!selectedDays.length) {
    showToast('warn', '請選擇投資日', '至少選擇一個每月投資日');
    btn.classList.remove('loading'); btn.textContent = '開始回測'; progressDone(); return;
  }

  const priceData = await loadStockData(selectedStock);
  if (!priceData) { btn.classList.remove('loading'); btn.textContent = '開始回測'; progressDone(); return; }

  // ── Core DCA calculation ──
  const tradingDays = Object.entries(priceData)
    .filter(([date]) => date >= startDate && date <= endDate)
    .sort(([a], [b]) => new Date(a) - new Date(b));

  let totalInvestment = 0, totalShares = 0, totalFees = 0;
  let monthlyResults = [], currentMonth = '', pendingDays = [];

  tradingDays.forEach(([date, price]) => {
    const day   = new Date(date).getDate();
    const month = date.slice(0, 7);
    if (month !== currentMonth) { currentMonth = month; pendingDays = [...selectedDays]; }
    const investDays = pendingDays.filter(d => d <= day);
    if (!investDays.length) return;

    let dailyInv = 0, dailyShares = 0, dailyFees = 0;
    investDays.forEach(() => {
      const inv    = monthly / selectedDays.length;
      const fee    = inv * feeRate;
      const actual = inv - fee;
      dailyInv    += inv; dailyFees += fee; dailyShares += actual / price;
    });
    totalInvestment += dailyInv;
    totalFees       += dailyFees;
    totalShares     += dailyShares;
    monthlyResults.push({ date, price, dailyInv, totalInvestment, totalFees, totalShares, currentValue: totalShares * price });
    pendingDays = pendingDays.filter(d => !investDays.includes(d));
  });

  if (!monthlyResults.length) {
    showToast('error', '計算失敗', '所選期間內無交易數據，請調整日期範圍');
    btn.classList.remove('loading'); btn.textContent = '開始回測'; progressDone(); return;
  }

  const last         = monthlyResults[monthlyResults.length - 1];
  const profitLoss   = last.currentValue - last.totalInvestment;
  const totalReturn  = profitLoss / last.totalInvestment;
  const years        = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 365);
  const annualReturn = Math.pow(1 + totalReturn, 1 / years) - 1;

  // Animated count-up for result numbers
  const setResult = (id, val, isPercent) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = isPercent
      ? (val >= 0 ? 'positive' : 'negative')
      : (val < 0 ? 'negative' : '');
    if (isPercent) {
      animateCountUpPercent(el, val * 100);
    } else {
      animateCountUpCurrency(el, val);
    }
  };

  // ── Compute max drawdown (new feature) ──
  let peak = 0, maxDrawdown = 0;
  monthlyResults.forEach(r => {
    if (r.currentValue > peak) peak = r.currentValue;
    const dd = (peak - r.currentValue) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  setResult('totalInvestment', last.totalInvestment, false);
  setResult('currentValue',    last.currentValue,    false);
  setResult('totalProfitLoss', profitLoss,           false);
  setResult('totalReturn',     totalReturn,          true);
  setResult('annualReturn',    annualReturn,          true);
  setResult('totalFees',       last.totalFees,       false);
  setResult('maxDrawdown',     -maxDrawdown,          true);

  updatePerformanceChart(monthlyResults);

  const rs = document.getElementById('resultsSection');
  rs.classList.remove('hidden');
  rs.style.animationName = 'none';
  requestAnimationFrame(() => { rs.style.animationName = ''; });

  // Smooth scroll to results on mobile
  if (window.innerWidth <= 768) {
    setTimeout(() => rs.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }

  btn.classList.remove('loading');
  btn.innerHTML = '<span class="btn-shimmer"></span>重新計算';
  progressDone();
  showToast('success', '回測完成', `${selectedStock} 年化 ${(annualReturn * 100).toFixed(2)}% / 最大回撤 ${(maxDrawdown * 100).toFixed(1)}%`);

  // Smooth scroll down to results smoothly
  setTimeout(() => {
    document.getElementById('resultsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ── Count-up helpers ──
function animateCountUpCurrency(el, target) {
  const dur = 1000, start = performance.now(), sign = target < 0 ? '-' : '';
  const abs = Math.abs(target);
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = sign + '$' + (abs * ease).toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function animateCountUpPercent(el, target) {
  const dur = 1000, start = performance.now(), sign = target >= 0 ? '+' : '';
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = sign + (target * ease).toFixed(2) + '%';
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Performance chart ──
function updatePerformanceChart(results) {
  const ctx = document.getElementById('performanceChart');
  if (!ctx) return;
  if (myChart) { myChart.destroy(); myChart = null; }

  const dates       = results.map(r => r.date);
  const investments = results.map(r => r.totalInvestment);
  const values      = results.map(r => r.currentValue);

  // Thin out labels for readability
  const step = Math.max(1, Math.floor(dates.length / 24));
  const labels = dates.map((d, i) => i % step === 0 ? d.slice(0, 7) : '');

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '投資組合價值',
          data: values,
          borderColor: '#c9a84c',
          backgroundColor: 'rgba(201,168,76,.08)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: .4,
        },
        {
          label: '累計投入',
          data: investments,
          borderColor: 'rgba(255,255,255,.3)',
          borderWidth: 1.5,
          borderDash: [5,5],
          pointRadius: 0,
          fill: false,
          tension: .4,
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,.05)' },
          ticks: { color: '#8893a8', font: { size: 11 }, maxTicksLimit: 12 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,.05)' },
          ticks: {
            color: '#8893a8', font: { size: 11 },
            callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v.toFixed(0))
          }
        }
      },
      plugins: {
        legend: { labels: { color: '#eef0f6', font: { size: 12 }, padding: 16, boxWidth: 12 } },
        tooltip: {
          backgroundColor: 'rgba(13,17,32,.95)',
          borderColor: 'rgba(201,168,76,.3)',
          borderWidth: 1,
          titleColor: '#eef0f6',
          bodyColor: '#8893a8',
          padding: 12,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: $${ctx.raw.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          }
        }
      }
    }
  });
}

// ── Ripple effect ──
document.addEventListener('click', e => {
  const btn = e.target.closest('button, .calculate-button');
  if (!btn) return;
  const r   = document.createElement('span');
  r.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(r);
  r.addEventListener('animationend', () => r.remove(), { once: true });
});

// ── Calculate button click ──
const calcBtn = document.getElementById('calculateBtn');
if (calcBtn) {
  calcBtn.addEventListener('click', () => calculatePortfolioPerformance());
}

// ── Keyboard: Escape closes backtest page ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const backtestPage = document.getElementById('backtestPage');
    if (backtestPage && backtestPage.classList.contains('active')) showMainPage();
  }
});

// ── Simple Mobile Nav Handler ──
(function initMobileNav() {
  const trigger   = document.getElementById('hamburgerTrigger');
  const simpleNav = document.getElementById('simpleMobileNav');
  const overlay   = document.getElementById('smnOverlay');
  const closeBtn  = document.getElementById('smnClose');

  if (trigger && simpleNav) {
    const toggleMenu = (e) => {
      e?.preventDefault();
      const isOpen = simpleNav.classList.contains('open');
      if (isOpen) {
        simpleNav.classList.remove('open');
        if(overlay) overlay.classList.remove('show');
      } else {
        simpleNav.classList.add('open');
        if(overlay) overlay.classList.add('show');
      }
    };
    trigger.addEventListener('click', toggleMenu);
    if(overlay) overlay.addEventListener('click', toggleMenu);
    if(closeBtn) closeBtn.addEventListener('click', toggleMenu);
  }
})();
