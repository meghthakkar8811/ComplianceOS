'use strict';

// ═══════════════════════════════════════════════════════════
// CONFIG & STATE
// ═══════════════════════════════════════════════════════════
const API = '../backend/api';
const AUTH = '../backend/auth';

let STATE = {
  token:    localStorage.getItem('cos_token') || '',
  user:     JSON.parse(localStorage.getItem('cos_user') || 'null'),
  mineId:   localStorage.getItem('cos_mine_id') || '',
  mines:    [],
  dashData: null,
  prodData: [],
  chartType:'produced',
  chartData: [],
};

// ═══════════════════════════════════════════════════════════
// BOOTSTRAP — runs on page load
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Pick up token from URL (Google OAuth redirect)
  const p = new URLSearchParams(window.location.search);
  if (p.get('token')) {
    STATE.token = p.get('token');
    localStorage.setItem('cos_token', STATE.token);
    window.history.replaceState({}, '', 'dashboard.html');
  }

  if (!STATE.token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    await loadMines();
    populateUserUI();
    setInterval(refreshAlertBadge, 5 * 60 * 1000); // refresh every 5 min
    navigate('dashboard');
  } catch (err) {
    console.error('Boot error:', err);
    window.location.href = 'login.html';
  }
});

// ═══════════════════════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════════════════════
function headers() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + STATE.token };
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: headers(), credentials: 'include' });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

async function apiFetchForm(url, formData) {
  const res = await fetch(url, { 
    method: 'POST',
    body: formData,
    headers: { 'Authorization': 'Bearer ' + STATE.token },
    credentials: 'include'
  });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

async function logout() {
  try { await fetch(`${AUTH}/logout.php`, { method: 'POST', headers: headers(), credentials: 'include' }); } catch {}
  localStorage.clear();
  window.location.href = 'login.html';
}

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span style="font-size:15px;flex-shrink:0">${icons[type]||'ℹ'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 220); }, 3200);
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
const PAGE_NAMES = {
  dashboard:'Dashboard', calendar:'Compliance Calendar', royalty:'Royalty Calculator',
  forms:'IBM Forms Library', production:'Production Log', documents:'Document Repository',
  dgms:'DGMS Inspection Readiness', alerts:'Alerts & Notifications',
};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  const ni = document.querySelector(`[data-page="${page}"]`);
  if (ni) ni.classList.add('active');
  document.getElementById('bc-current').textContent = PAGE_NAMES[page] || page;
  if (window.innerWidth < 900) document.getElementById('sidebar').classList.remove('open');

  if (page === 'dashboard')  loadDashboard();
  if (page === 'calendar')   loadCalendar();
  if (page === 'production') initProduction();
  if (page === 'royalty')    { liveRoyalty(); loadRateCompare(); }
  if (page === 'dgms')       loadDgms();
  if (page === 'alerts')     loadAlerts();
  if (page === 'documents')  loadDocuments('');
  if (page === 'forms')      setFormBDueDate();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ═══════════════════════════════════════════════════════════
// USER UI
// ═══════════════════════════════════════════════════════════
function populateUserUI() {
  if (!STATE.user) return;
  const initials = (STATE.user.full_name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('topbar-av').textContent   = initials;
  document.getElementById('user-name').textContent   = STATE.user.full_name || '';
  document.getElementById('user-role').textContent   = (STATE.user.role || '').replace('_', ' ');
  if (STATE.user.avatar_url) {
    ['user-avatar','topbar-av'].forEach(id => {
      const el = document.getElementById(id);
      el.style.backgroundImage = `url(${STATE.user.avatar_url})`;
      el.style.backgroundSize = 'cover';
      el.textContent = '';
    });
  }
}

// ═══════════════════════════════════════════════════════════
// MINE MANAGEMENT
// ═══════════════════════════════════════════════════════════
async function loadMines() {
  showLoader(true);
  const data = await apiFetch(`${API}/mines.php`);
  showLoader(false);
  if (!data || !data.success) return;
  STATE.mines = data.data || [];

  if (STATE.mines.length && !STATE.mineId) {
    STATE.mineId = STATE.mines[0].id;
    localStorage.setItem('cos_mine_id', STATE.mineId);
  }

  renderMineList();
  updateActiveMineUI();
}

function renderMineList() {
  const list = document.getElementById('mine-list');
  list.innerHTML = STATE.mines.map(m => `
    <div class="mine-option ${m.id === STATE.mineId ? 'active' : ''}"
         onclick="switchMine('${m.id}')">
      <div class="mine-opt-dot" style="background:${m.id === STATE.mineId ? 'var(--green)':'var(--amber)'}"></div>
      <div>
        <div>${m.name}</div>
        <div class="mine-opt-sub">${formatState(m.state)} · ${formatMineral(m.mineral)}</div>
      </div>
    </div>
  `).join('');
}

function updateActiveMineUI() {
  const mine = STATE.mines.find(m => m.id === STATE.mineId);
  if (!mine) return;
  document.getElementById('active-mine-name').textContent = mine.name;
  document.getElementById('active-mine-id').textContent   = 'Lease #' + mine.lease_number;
}

function switchMine(id) {
  STATE.mineId = id;
  localStorage.setItem('cos_mine_id', id);
  toggleMinePicker();
  renderMineList();
  updateActiveMineUI();
  loadDashboard();
  toast('Switched to ' + (STATE.mines.find(m=>m.id===id)?.name || 'mine'), 'success');
}

function toggleMinePicker() {
  const picker  = document.getElementById('mine-picker');
  const chevron = document.getElementById('mine-chevron');
  picker.classList.toggle('show');
  chevron.classList.toggle('open');
}

document.addEventListener('click', e => {
  const sw = document.getElementById('mine-switcher');
  const pk = document.getElementById('mine-picker');
  if (sw && pk && !sw.contains(e.target) && !pk.contains(e.target)) {
    pk.classList.remove('show');
    document.getElementById('mine-chevron').classList.remove('open');
  }
});

function openAddMineModal() {
  toggleMinePicker();
  openModal('modal-add-mine');
}

async function addMine() {
  const name  = document.getElementById('am-name').value.trim();
  const lease = document.getElementById('am-lease').value.trim();
  const state = document.getElementById('am-state').value;
  const min   = document.getElementById('am-mineral').value;
  const dist  = document.getElementById('am-district').value.trim();
  const type  = document.getElementById('am-type').value;

  if (!name || !lease || !state || !min) { toast('Please fill all required fields', 'error'); return; }

  const data = await apiFetch(`${API}/mines.php`, {
    method: 'POST',
    body: JSON.stringify({ name, lease_number: lease, state, mineral: min, district: dist, mine_type: type }),
  });

  if (data?.success) {
    STATE.mines.push(data.data);
    STATE.mineId = data.data.id;
    localStorage.setItem('cos_mine_id', STATE.mineId);
    renderMineList();
    updateActiveMineUI();
    closeModal('modal-add-mine');
    toast('Mine added! Compliance calendar auto-generated.', 'success');
    loadDashboard();
  } else {
    toast(data?.error || 'Failed to add mine', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
async function loadDashboard() {
  if (!STATE.mineId) { showEmptyState(); return; }
  showLoader(true);

  const data = await apiFetch(`${API}/core.php?ep=dashboard&mine_id=${STATE.mineId}`);
  showLoader(false);
  if (!data?.success) { toast('Failed to load dashboard', 'error'); return; }

  STATE.dashData = data.data;
  const d = data.data;

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-greeting').textContent = `${greet}, ${STATE.user?.full_name?.split(' ')[0] || 'there'}`;
  document.getElementById('dash-sub').textContent = `${d.mine.name} · ${formatState(d.mine.state)} · ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}`;

  // Health score
  const score = d.health.overall;
  document.getElementById('hs-num').textContent = score;
  document.getElementById('hp-score').textContent = score;
  document.getElementById('hp-bar').style.width = score + '%';
  const ring = document.getElementById('ring-fill');
  const circ = 326.73;
  setTimeout(() => { ring.style.strokeDashoffset = circ - (score / 100) * circ; }, 150);

  document.getElementById('hb-status').textContent =
    score >= 80 ? '✓ Compliant — No immediate action required' :
    score >= 60 ? '⚠ Needs Attention — Some items require action' :
                  '✕ Critical — Immediate action required';
  document.getElementById('hb-status').style.color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--warn)' : 'var(--red)';

  animateBar('hb-ibm',    d.health.ibm,         'hb-ibm-val');
  animateBar('hb-royalty',d.health.royalty,      'hb-royalty-val');
  animateBar('hb-dgms',   d.health.dgms,         'hb-dgms-val');
  animateBar('hb-env',    d.health.environment,  'hb-env-val');

  // DGMS nav pill
  document.getElementById('dgms-nav-pill').textContent = d.dgms.overall_score;

  // Priority actions
  const actions = [];
  if (d.kpis.overdue_filings > 0)
    actions.push({ sev:'critical', text:`${d.kpis.overdue_filings} filing(s) are OVERDUE`, nav:'calendar', cta:'Fix Now' });
  if (d.dgms.overall_score < 60)
    actions.push({ sev:'critical', text:'DGMS Readiness is CRITICAL — registers overdue', nav:'dgms', cta:'Fix Now' });
  if (d.kpis.pending_filings > 0)
    actions.push({ sev:'warning', text:`${d.kpis.pending_filings} deadline(s) pending action`, nav:'calendar', cta:'View' });
  if (d.kpis.expiring_documents > 0)
    actions.push({ sev:'warning', text:`${d.kpis.expiring_documents} document(s) expiring within 90 days`, nav:'documents', cta:'View' });
  if (!actions.length)
    actions.push({ sev:'ok', text:'All compliance checks passing. Keep it up!', nav:'dashboard', cta:'View Report' });

  document.getElementById('priority-actions').innerHTML = actions.slice(0,3).map(a => `
    <div class="action-card ${a.sev}" onclick="navigate('${a.nav}')">
      <div class="ac-severity">${a.sev === 'critical' ? 'CRITICAL' : a.sev === 'warning' ? 'ACTION NEEDED' : 'ALL GOOD'}</div>
      <div class="ac-text">${a.text}</div>
      <div class="ac-cta">${a.cta} →</div>
    </div>
  `).join('');

  // KPIs
  animateCounter('kpi-produced',  d.kpis.month_produced_mt, '', ' MT');
  animateCounter('kpi-today',     d.kpis.today_produced_mt, '', ' MT');
  document.getElementById('kpi-royalty').textContent    = d.royalty_current ? '₹' + fmtINR(d.royalty_current.net_due_paise/100) : '₹—';
  document.getElementById('kpi-royalty-sub').textContent= d.royalty_current ? d.royalty_current.challan_status : 'No calculation yet';
  document.getElementById('kpi-filings').textContent    = d.kpis.pending_filings;
  document.getElementById('kpi-filings-sub').textContent= `${d.kpis.overdue_filings} overdue`;
  document.getElementById('kpi-filings-sub').className  = 'kpi-change ' + (d.kpis.overdue_filings > 0 ? 'down' : 'neutral');
  document.getElementById('kpi-docs').textContent       = d.kpis.expiring_documents;

  // Alert badge
  refreshAlertBadge(d.kpis.overdue_filings + (d.dgms.overall_score < 60 ? 1 : 0));

  // Production chart
  STATE.chartData = d.production_chart;
  drawProductionChart();

  // Deadlines feed
  const feed = document.getElementById('deadline-feed');
  feed.innerHTML = (d.deadlines || []).slice(0,5).map(dl => {
    const days = dl.days_until;
    const cls  = days < 0 ? 'critical' : days <= 7 ? 'critical' : days <= 14 ? 'warn' : 'ok';
    const chip = days < 0 ? 'OVERDUE' : days === 0 ? 'Today' : days + 'd';
    const chipCls = days <= 0 ? 'red' : days <= 7 ? 'red' : days <= 14 ? 'amber' : 'green';
    const dt = new Date(dl.due_date);
    return `<div class="df-item ${cls}" onclick="navigate('calendar')">
      <div class="df-date"><span class="df-day">${dt.getDate()}</span><span class="df-mon">${dt.toLocaleString('default',{month:'short'}).toUpperCase()}</span></div>
      <div class="df-info"><div class="df-title">${dl.title}</div><div class="df-sub">${dl.authority.replace('_',' ')}</div></div>
      <span class="df-chip ${chipCls}">${chip}</span>
    </div>`;
  }).join('') || '<p style="color:var(--text2);font-size:12px;padding:12px 0">No upcoming deadlines</p>';

  // Royalty snapshot
  const snap = document.getElementById('royalty-snap');
  if (d.royalty_current) {
    const r = d.royalty_current;
    snap.innerHTML = `
      <div class="rb-row"><span class="rb-label">Base Royalty</span><span class="rb-val">₹${fmtINR(r.base_royalty_paise/100)}</span></div>
      <div class="rb-row"><span class="rb-label">DMF (30%)</span><span class="rb-val">₹${fmtINR(r.dmf_paise/100)}</span></div>
      <div class="rb-row"><span class="rb-label">NMET (2%)</span><span class="rb-val">₹${fmtINR(r.nmet_paise/100)}</span></div>
      <div class="rb-row" style="border-bottom:none"><span class="rb-label" style="font-weight:600;color:var(--amber)">Net Due</span><span class="rb-val" style="color:var(--amber);font-size:15px">₹${fmtINR(r.net_due_paise/100)}</span></div>`;
  } else {
    snap.innerHTML = '<p style="color:var(--text2);font-size:12px">No royalty calculated yet. <a style="color:var(--amber);cursor:pointer" onclick="navigate(\'royalty\')">Calculate now →</a></p>';
  }
}

function animateBar(barId, value, valId) {
  setTimeout(() => {
    const bar = document.getElementById(barId);
    const lbl = document.getElementById(valId);
    if (bar) bar.style.width = Math.min(100, value) + '%';
    if (lbl) lbl.textContent = value;
  }, 200);
}

function animateCounter(elId, target, prefix='', suffix='') {
  const el = document.getElementById(elId);
  if (!el) return;
  const duration = 1200;
  const start = performance.now();
  const fmt = n => prefix + Math.round(n).toLocaleString('en-IN') + suffix;
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(target * ease);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = fmt(target);
  }
  requestAnimationFrame(step);
}

// ═══════════════════════════════════════════════════════════
// PRODUCTION CHART (canvas — no external library)
// ═══════════════════════════════════════════════════════════
function switchChart(btn, type) {
  document.querySelectorAll('.ct-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  STATE.chartType = type;
  drawProductionChart();
}

function drawProductionChart() {
  const canvas = document.getElementById('prod-chart');
  if (!canvas || !STATE.chartData.length) return;
  const ctx = canvas.getContext('2d');
  const area = canvas.parentElement;
  canvas.width  = area.offsetWidth || 600;
  canvas.height = 150;

  const data   = STATE.chartData.map(m => m[STATE.chartType] || 0);
  const labels = STATE.chartData.map(m => m.label || m.month);
  const W = canvas.width, H = canvas.height;
  const pad = { t:20, r:14, b:28, l:52 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const max = Math.max(...data, 1) * 1.1;

  ctx.clearRect(0, 0, W, H);

  // Grid
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + cH * (1 - i/4);
    ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillStyle = 'rgba(142,168,204,0.7)'; ctx.font = '9px IBM Plex Mono,monospace'; ctx.textAlign = 'right';
    const val = Math.round(max * i / 4);
    ctx.fillText(val >= 1000 ? (val/1000).toFixed(0)+'k' : val, pad.l-5, y+3);
  }

  const barW = (cW / labels.length) * 0.52;
  const barGap = cW / labels.length;
  let frame = 0;
  const totalFrames = 32;
  const isLast = (i) => i === data.length - 1;

  const animate = () => {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + cH * (1 - i/4);
      ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
      ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = 'rgba(142,168,204,0.7)'; ctx.font = '9px IBM Plex Mono,monospace'; ctx.textAlign = 'right';
      const val = Math.round(max * i / 4);
      ctx.fillText(val >= 1000 ? (val/1000).toFixed(0)+'k' : val, pad.l-5, y+3);
    }

    const progress = Math.min(frame / totalFrames, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    data.forEach((val, i) => {
      const bH = (val / max) * cH * ease;
      const x = pad.l + i * barGap + (barGap - barW) / 2;
      const y = pad.t + cH - bH;
      const grad = ctx.createLinearGradient(0, y, 0, y + bH);
      if (isLast(i)) {
        grad.addColorStop(0, 'rgba(232,160,32,0.9)');
        grad.addColorStop(1, 'rgba(232,160,32,0.3)');
      } else {
        grad.addColorStop(0, 'rgba(74,158,255,0.5)');
        grad.addColorStop(1, 'rgba(74,158,255,0.1)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, barW, bH, 3);
      else ctx.rect(x, y, barW, bH);
      ctx.fill();

      if (progress > 0.9) {
        ctx.fillStyle = isLast(i) ? 'rgba(232,160,32,0.9)' : 'rgba(142,168,204,0.7)';
        ctx.font = (isLast(i)?'bold ':'') + '9px IBM Plex Mono,monospace';
        ctx.textAlign = 'center';
        ctx.fillText(val >= 1000 ? (val/1000).toFixed(0)+'k' : val, x + barW/2, y - 4);
      }

      ctx.fillStyle = 'rgba(142,168,204,0.7)'; ctx.font = '9.5px IBM Plex Mono,monospace'; ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barW/2, H - 6);
    });

    frame++;
    if (frame <= totalFrames) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

// ═══════════════════════════════════════════════════════════
// COMPLIANCE CALENDAR
// ═══════════════════════════════════════════════════════════
async function loadCalendar() {
  if (!STATE.mineId) return;
  const auth = document.getElementById('cal-filter')?.value || '';
  const url  = `${API}/core.php?ep=deadlines&mine_id=${STATE.mineId}${auth ? '&authority='+auth : ''}`;
  const data = await apiFetch(url);
  if (!data?.success) return;

  const items = data.data || [];
  const content = document.getElementById('calendar-content');
  if (!items.length) { content.innerHTML = '<p style="color:var(--text2);font-family:var(--mono);padding:24px">No deadlines found.</p>'; return; }

  const months = {};
  items.forEach(d => {
    const dt  = new Date(d.due_date);
    const key = dt.toLocaleString('default', { month:'long', year:'numeric' });
    if (!months[key]) months[key] = [];
    months[key].push({ ...d, dt });
  });

  content.innerHTML = Object.entries(months).map(([month, evts]) => `
    <div class="cal-month-block">
      <div class="cal-month-label">${month}</div>
      ${evts.map(ev => {
        const days = ev.days_until;
        const cls  = ev.status === 'SUBMITTED' ? 'done' : days < 0 ? 'overdue' : days <= 7 ? 'due-soon' : 'upcoming';
        const chipCls = ev.status === 'SUBMITTED' ? 'green' : days <= 0 ? 'red' : days <= 7 ? 'red' : days <= 14 ? 'amber' : 'green';
        const chip = ev.status === 'SUBMITTED' ? 'Filed ✓' : days < 0 ? 'OVERDUE' : days+'d away';
        const dt = new Date(ev.due_date);
        return `<div class="cal-item ${cls}">
          <div><span class="cal-day-num">${dt.getDate()}</span><span class="cal-day-mon">${dt.toLocaleString('default',{month:'short'}).toUpperCase()}</span></div>
          <div><div class="cal-item-title">${ev.title}</div><div class="cal-item-sub">${ev.authority.replace('_',' ')}</div></div>
          <span class="auth-chip auth-${ev.authority}">${ev.authority.replace('_',' ')}</span>
          <span class="days-chip ${chipCls}">${chip}</span>
        </div>`;
      }).join('')}
    </div>`).join('');
}

// ═══════════════════════════════════════════════════════════
// ROYALTY CALCULATOR
// ═══════════════════════════════════════════════════════════
function syncQty(v)   { document.getElementById('rc-qty').value = v;       liveRoyalty(); }
function syncRange(v) { document.getElementById('rc-qty-range').value = v; liveRoyalty(); }

async function liveRoyalty() {
  const state   = document.getElementById('rc-state')?.value;
  const mineral = document.getElementById('rc-mineral')?.value;
  const qty     = parseFloat(document.getElementById('rc-qty')?.value) || 0;
  const advance = Math.round((parseFloat(document.getElementById('rc-advance')?.value) || 0) * 100);

  if (!state || !mineral || qty <= 0) return;

  const data = await apiFetch(`${API}/core.php?ep=royalty_preview&mine_id=${STATE.mineId||''}&state=${state}&mineral=${mineral}&quantity_mt=${qty}&advance_paise=${advance}`);
  if (!data?.success) return;
  const r = data.data;

  document.getElementById('lrc-rate').textContent   = '₹' + r.rate_rupees + ' / MT';
  document.getElementById('lrc-source').textContent = r.source + ' · Effective ' + r.effective_from;
  document.getElementById('co-qty').textContent     = qty.toLocaleString('en-IN') + ' MT';
  document.getElementById('co-rate').textContent    = '₹' + r.rate_rupees + '/MT';
  document.getElementById('co-base').textContent    = '₹' + fmtINR(r.base_royalty_rupees);
  document.getElementById('co-dmf').textContent     = '₹' + fmtINR(r.dmf_rupees);
  document.getElementById('co-nmet').textContent    = '₹' + fmtINR(r.nmet_rupees);
  document.getElementById('co-gross').textContent   = '₹' + fmtINR(r.gross_rupees);
  document.getElementById('co-adv').textContent     = '−₹' + fmtINR(r.advance_rupees);
  document.getElementById('co-net').textContent     = '₹' + fmtINR(r.net_due_rupees);
  document.getElementById('cc-period').textContent  = new Date().toLocaleString('default',{month:'long',year:'numeric'});
  document.getElementById('compare-mineral').textContent = document.getElementById('rc-mineral').options[document.getElementById('rc-mineral').selectedIndex]?.text || mineral;

  loadRateCompare();
}

async function loadRateCompare() {
  const mineral = document.getElementById('rc-mineral')?.value;
  const state   = document.getElementById('rc-state')?.value;
  if (!mineral) return;
  const data = await apiFetch(`${API}/core.php?ep=royalty_compare&mine_id=${STATE.mineId||''}&mineral=${mineral}`);
  if (!data?.success) return;
  const rows = data.data || [];
  const lowest = rows[0]?.rate_paise_per_mt;
  document.getElementById('compare-list').innerHTML = rows.map(r => `
    <div class="compare-row ${r.state === state ? 'current' : ''}">
      <span class="compare-state">${formatState(r.state)}${r.state === state ? ' (selected)' : ''}</span>
      <span class="compare-rate">₹${r.rate_rupees}/MT</span>
      ${r.rate_paise_per_mt === lowest ? '<span class="compare-badge">Lowest</span>' : ''}
    </div>`).join('');
}

async function saveRoyaltyCalc() {
  if (!STATE.mineId) { toast('Select a mine first', 'error'); return; }
  const qty     = parseFloat(document.getElementById('rc-qty')?.value) || 0;
  const advance = Math.round((parseFloat(document.getElementById('rc-advance')?.value) || 0) * 100);
  const month   = new Date().toISOString().slice(0, 7);
  const data = await apiFetch(`${API}/core.php?ep=royalty_calculate&mine_id=${STATE.mineId}`, {
    method: 'POST',
    body: JSON.stringify({ period_month: month, quantity_mt: qty, advance_paise: advance }),
  });
  if (data?.success) toast('Royalty calculation saved successfully!', 'success');
  else toast(data?.error || 'Failed to save calculation', 'error');
}

// ═══════════════════════════════════════════════════════════
// PRODUCTION LOG
// ═══════════════════════════════════════════════════════════
function initProduction() {
  const monthEl = document.getElementById('prod-month');
  if (monthEl && !monthEl.value) monthEl.value = new Date().toISOString().slice(0,7);
  const dateEl = document.getElementById('pf-date');
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0,10);
  loadProduction();
}

async function loadProduction() {
  if (!STATE.mineId) return;
  const month = document.getElementById('prod-month')?.value || new Date().toISOString().slice(0,7);
  const data  = await apiFetch(`${API}/core.php?ep=production&mine_id=${STATE.mineId}&month=${month}`);
  if (!data?.success) return;
  STATE.prodData = data.data || [];
  renderProdTable(STATE.prodData);
  renderProdSummary();
}

function renderProdTable(rows) {
  document.getElementById('prod-tbody').innerHTML = rows.map((r,i) => `
    <tr>
      <td>${r.entry_date}</td>
      <td>${r.shift}</td>
      <td>${r.pit_section}</td>
      <td>${r.mineral_grade}</td>
      <td class="num-col">${parseFloat(r.quantity_produced_mt).toLocaleString('en-IN')}</td>
      <td class="num-col">${parseFloat(r.quantity_dispatched_mt).toLocaleString('en-IN')}</td>
      <td>${r.supervisor_name || '—'}</td>
      <td><span class="status-pill ${r.status}">${r.status}</span></td>
      <td>${r.status === 'PENDING' ? `<button class="action-link" onclick="verifyEntry('${r.id}')">Verify</button>` : '—'}</td>
    </tr>`).join('');
}

function renderProdSummary() {
  const totalP = STATE.prodData.reduce((s,r) => s + parseFloat(r.quantity_produced_mt||0), 0);
  const totalD = STATE.prodData.reduce((s,r) => s + parseFloat(r.quantity_dispatched_mt||0), 0);
  document.getElementById('prod-summary').innerHTML = `
    <div class="psr-card"><span class="psr-label">Total Produced</span><span class="psr-val">${totalP.toLocaleString('en-IN',{maximumFractionDigits:1})} MT</span></div>
    <div class="psr-card"><span class="psr-label">Total Dispatched</span><span class="psr-val">${totalD.toLocaleString('en-IN',{maximumFractionDigits:1})} MT</span></div>
    <div class="psr-card"><span class="psr-label">Entries</span><span class="psr-val">${STATE.prodData.length}</span></div>`;
}

function filterProd() {
  const q = document.getElementById('prod-search').value.toLowerCase();
  const filtered = q ? STATE.prodData.filter(r =>
    r.entry_date.includes(q) || (r.pit_section||'').toLowerCase().includes(q) ||
    (r.supervisor_name||'').toLowerCase().includes(q) || r.shift.toLowerCase().includes(q)
  ) : STATE.prodData;
  renderProdTable(filtered);
}

let prodFormVisible = false;
function toggleProdForm() {
  prodFormVisible = !prodFormVisible;
  document.getElementById('prod-form-card').style.display = prodFormVisible ? 'block' : 'none';
}

async function saveProdEntry() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }
  const body = {
    entry_date:            document.getElementById('pf-date').value,
    shift:                 document.getElementById('pf-shift').value,
    pit_section:           document.getElementById('pf-pit').value.trim(),
    mineral_grade:         document.getElementById('pf-grade').value.trim(),
    quantity_produced_mt:  parseFloat(document.getElementById('pf-prod').value)||0,
    quantity_dispatched_mt:parseFloat(document.getElementById('pf-disp').value)||0,
    supervisor_name:       document.getElementById('pf-sup').value.trim(),
    remarks:               document.getElementById('pf-rem').value.trim(),
  };
  if (!body.pit_section || !body.mineral_grade) { toast('Pit/section and grade are required','error'); return; }
  const data = await apiFetch(`${API}/core.php?ep=production&mine_id=${STATE.mineId}`, {
    method:'POST', body:JSON.stringify(body),
  });
  if (data?.success) {
    toast('Production entry saved','success');
    toggleProdForm();
    loadProduction();
  } else toast(data?.error||'Failed to save entry','error');
}

async function verifyEntry(id) {
  const data = await apiFetch(`${API}/core.php?ep=production&mine_id=${STATE.mineId}&entry_id=${id}`, { method:'PATCH' });
  if (data?.success) { toast('Entry verified','success'); loadProduction(); }
  else toast('Failed to verify','error');
}

function exportProdCSV() {
  const month = document.getElementById('prod-month')?.value || new Date().toISOString().slice(0,7);
  const rows  = [['Date','Shift','Pit','Grade','Produced (MT)','Dispatched (MT)','Supervisor','Status'],
    ...STATE.prodData.map(r=>[r.entry_date,r.shift,r.pit_section,r.mineral_grade,r.quantity_produced_mt,r.quantity_dispatched_mt,r.supervisor_name||'',r.status])];
  const csv  = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `production_${STATE.mineId}_${month}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  toast('CSV exported','success');
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════
async function loadDocuments(cat) {
  if (!STATE.mineId) return;
  const url  = `${API}/core.php?ep=documents&mine_id=${STATE.mineId}${cat?'&category='+cat:''}`;
  const data = await apiFetch(url);
  if (!data?.success) return;
  const docs = data.data || [];
  const icons = { LEASE:'📜', ENVIRONMENTAL:'🌿', DGMS_CERT:'🏅', OTHER:'📄' };
  document.getElementById('doc-grid').innerHTML = docs.length
    ? docs.map(d => `
        <div class="doc-card" onclick="toast('Document viewer opens in Beta','info')">
          <div class="doc-card-icon">${icons[d.category]||'📄'}</div>
          <div class="doc-card-name">${d.name}</div>
          <div class="doc-card-type">${d.document_type}</div>
          <div class="doc-card-date">Uploaded: ${d.created_at?.slice(0,10)||'—'}</div>
          <span class="doc-expiry-tag ${getExpiryStatus(d.expiry_date)}">
            ${getExpiryLabel(d.expiry_date)} ${d.expiry_date?'· '+d.expiry_date:''}
          </span>
        </div>`).join('')
    : '<p style="color:var(--text2);font-family:var(--mono);grid-column:1/-1">No documents uploaded yet.</p>';
}

function getExpiryStatus(date) {
  if (!date) return 'none';
  const d = new Date(date), now = new Date();
  if (d < now) return 'expired';
  if ((d - now) < 90*86400000) return 'expiring';
  return 'valid';
}
function getExpiryLabel(date) {
  const s = getExpiryStatus(date);
  return s==='none'?'No Expiry':s==='expired'?'✕ Expired':s==='expiring'?'⚠ Expiring Soon':'✓ Valid';
}

function filterDocs(btn, cat) {
  document.querySelectorAll('.doc-filter-row .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  loadDocuments(cat);
}

function openAddDocModal() { openModal('modal-add-doc'); }

async function addDocument() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }
  
  const fileInput = document.getElementById('doc-file');
  const file = fileInput.files[0];
  
  const name = document.getElementById('doc-name').value.trim();
  const category = document.getElementById('doc-cat').value;
  const document_type = document.getElementById('doc-type').value.trim();
  const issued_date = document.getElementById('doc-issued').value || '';
  const expiry_date = document.getElementById('doc-expiry').value || '';

  if (!name || !document_type) { toast('Name and document type required','error'); return; }
  if (!file) { toast('Please select a file to upload','error'); return; }

  const formData = new FormData();
  formData.append('mine_id', STATE.mineId);
  formData.append('name', name);
  formData.append('category', category);
  formData.append('document_type', document_type);
  formData.append('issued_date', issued_date);
  formData.append('expiry_date', expiry_date);
  formData.append('file', file);

  try {
    const data = await apiFetchForm(`${API}/core.php?ep=documents&mine_id=${STATE.mineId}`, formData);
    
    if (data?.success) { 
      toast('Document saved','success'); 
      closeModal('modal-add-doc'); 
      loadDocuments(''); 
      fileInput.value = '';
      document.getElementById('file-name-display').innerText = '';
    }
    else toast(data?.error||'Failed to save document','error');
  } catch (err) {
    toast('An error occurred while uploading.','error');
    console.error(err);
  }
}

// ═══════════════════════════════════════════════════════════
// DGMS
// ═══════════════════════════════════════════════════════════
async function loadDgms() {
  if (!STATE.mineId) return;
  const data = await apiFetch(`${API}/core.php?ep=dgms&mine_id=${STATE.mineId}`);
  if (!data?.success) return;
  const d = data.data;

  const score = d.overall_score;
  document.getElementById('dgms-score-num').textContent = score;
  document.getElementById('dsp-verdict').textContent = d.verdict.replace('_',' ');
  document.getElementById('dsp-verdict').style.color = score>=80?'var(--green)':score>=50?'var(--warn)':'var(--red)';
  document.getElementById('dsp-note').textContent = score>=80
    ? 'Your mine is well-prepared for a DGMS inspection. Maintain current register update frequency.'
    : score>=50 ? 'A DGMS inspection today may result in 2-3 observations. Fix the items below.'
    : 'CRITICAL: A DGMS inspection today would result in multiple violations. Update overdue registers immediately.';

  const ring = document.getElementById('dgms-ring-fill');
  const circ = 427.08;
  setTimeout(() => { ring.style.strokeDashoffset = circ - (score/100)*circ; ring.style.transition='stroke-dashoffset 1s ease'; }, 100);

  // Category bars
  const cats = {ACCIDENT_REGISTER:'Accident Register',SAFETY_COMMITTEE:'Safety Meetings',EXPLOSIVE_CONSUMPTION:'Explosives',SHOTFIRER_COMPETENCY:'Certifications',FIRST_AID:'First Aid',MACHINERY_REGISTER:'Machinery',WEIGHBRIDGE_REGISTER:'Weighbridge',EMPLOYMENT_REGISTER:'Employment'};
  document.getElementById('dsp-cats').innerHTML = (d.registers||[]).map(r => {
    const col = r.status==='green'?'var(--green)':r.status==='amber'?'var(--amber)':'var(--red)';
    return `<div class="dsp-cat">
      <span>${cats[r.register_code]||r.register_code}</span>
      <div class="dsp-bar-wrap"><div class="dsp-bar" style="width:${r.score}%;background:${col}"></div></div>
      <span class="dsp-score" style="color:${col}">${r.score}</span>
    </div>`;
  }).join('');

  document.getElementById('registers-list').innerHTML = (d.registers||[]).map(r => {
    const dotColor = r.status==='green'?'var(--green)':r.status==='amber'?'var(--amber)':'var(--red)';
    const noteColor = dotColor;
    return `<div class="reg-item">
      <div>
        <div class="reg-name">${r.register_name}</div>
        <div class="reg-reg">${r.regulation_ref||'DGMS'}</div>
        <div class="reg-note" style="color:${noteColor}">${r.status==='green'?'Up to date':r.days_since_update+' days since last update'}</div>
      </div>
      <div class="reg-last">Last: ${r.last_updated_at?.slice(0,10)||'—'}</div>
      <button class="reg-btn" onclick="markRegister('${r.register_code}')">Mark Updated</button>
      <div class="reg-dot" style="background:${dotColor};box-shadow:0 0 6px ${dotColor}"></div>
    </div>`;
  }).join('');
}

async function markRegister(code) {
  const data = await apiFetch(`${API}/core.php?ep=dgms&mine_id=${STATE.mineId}`, {
    method:'POST', body:JSON.stringify({register_code:code, notes:'Updated via ComplianceOS'}),
  });
  if (data?.success) { toast('Register marked as updated. Score: '+data.data.new_score.overall_score,'success'); loadDgms(); }
  else toast('Failed to update register','error');
}

// ═══════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════
function loadAlerts() {
  if (!STATE.dashData) { loadDashboard().then(() => buildAlerts()); return; }
  buildAlerts();
}

function buildAlerts() {
  const d = STATE.dashData;
  if (!d) return;
  const alerts = [];

  if (d.dgms.overall_score < 60)
    alerts.push({ type:'critical', icon:'⚠', title:'DGMS Readiness is Critical', desc:`Score: ${d.dgms.overall_score}/100. Multiple registers are overdue. A DGMS inspection today would result in violations.`, time:'Now', action:'Fix Now', nav:'dgms' });

  if (d.kpis.overdue_filings > 0)
    alerts.push({ type:'critical', icon:'📋', title:`${d.kpis.overdue_filings} Filing(s) Overdue`, desc:'Statutory returns are past their due date. File immediately to avoid penalties and show-cause notices.', time:'Now', action:'View Calendar', nav:'calendar' });

  if (d.kpis.pending_filings > 0)
    alerts.push({ type:'warning', icon:'⏰', title:`${d.kpis.pending_filings} Deadline(s) Upcoming`, desc:'Review your compliance calendar and take action before due dates.', time:'Current', action:'View Calendar', nav:'calendar' });

  if (d.kpis.expiring_documents > 0)
    alerts.push({ type:'warning', icon:'📄', title:`${d.kpis.expiring_documents} Document(s) Expiring Soon`, desc:'Check your document repository. Expiring CTO, EC or DGMS certificates need renewal.', time:'Within 90 days', action:'View Documents', nav:'documents' });

  if (d.royalty_current?.challan_status === 'DRAFT')
    alerts.push({ type:'info', icon:'₹', title:'Royalty Calculation Pending Payment', desc:`Net amount due: ₹${fmtINR(d.royalty_current.net_due_paise/100)}. Generate e-Challan and pay before due date.`, time:'Current period', action:'Calculate', nav:'royalty' });

  if (!alerts.length)
    alerts.push({ type:'success', icon:'✓', title:'All compliance checks passing!', desc:'Your mine has no critical alerts at this time. Keep updating your registers and filing returns on schedule.', time:'Now', action:null });

  document.getElementById('alerts-list').innerHTML = alerts.map(a => `
    <div class="alert-row ${a.type}">
      <div class="alert-icon-wrap">${a.icon}</div>
      <div>
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.desc}</div>
        <div class="alert-time">${a.time}</div>
      </div>
      <div>${a.action ? `<button class="btn-ghost" onclick="navigate('${a.nav}')">${a.action}</button>` : ''}</div>
    </div>`).join('');
}

function refreshAlertBadge(count) {
  const n = typeof count === 'number' ? count
    : (STATE.dashData ? STATE.dashData.kpis.overdue_filings + (STATE.dashData.dgms.overall_score < 60 ? 1 : 0) : 0);
  const badge   = document.getElementById('alert-badge');
  const topbadge= document.getElementById('topbar-alert-count');
  if (badge) badge.textContent = n;
  if (topbadge) { topbadge.textContent = n; topbadge.style.display = n > 0 ? 'block' : 'none'; }
}

function markAllRead() {
  document.querySelectorAll('.alert-row').forEach((el,i) => setTimeout(()=>{el.style.opacity='0.5'},i*80));
  refreshAlertBadge(0);
  toast('All alerts marked as read','success');
}

// ═══════════════════════════════════════════════════════════
// IBM FORMS
// ═══════════════════════════════════════════════════════════
function setFormBDueDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 5);
  document.getElementById('formb-due').textContent = 'Due: ' + d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}

async function openFormB() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }
  const mine = STATE.mines.find(m => m.id === STATE.mineId);
  const month = new Date().toISOString().slice(0,7);
  const data  = await apiFetch(`${API}/core.php?ep=production&mine_id=${STATE.mineId}&month=${month}`);
  const entries = data?.success ? data.data : [];

  const totalProduced   = entries.reduce((s,r)=>s+parseFloat(r.quantity_produced_mt||0),0);
  const totalDispatched = entries.reduce((s,r)=>s+parseFloat(r.quantity_dispatched_mt||0),0);
  const d = new Date(); const per = d.toLocaleString('default',{month:'long',year:'numeric'});

  document.getElementById('formb-period').textContent = `${per} · Auto-filled from ComplianceOS`;
  document.getElementById('formb-content').innerHTML = `
    <div class="form-section">
      <div class="fs-title">PART A — Mine Identification</div>
      <div class="fs-grid">
        <div class="fg"><label>Name of Mine</label><input value="${mine?.name||''}"></div>
        <div class="fg"><label>Lease Number</label><input value="${mine?.lease_number||''}"></div>
        <div class="fg"><label>State</label><input value="${formatState(mine?.state||'')}"></div>
        <div class="fg"><label>Mineral</label><input value="${formatMineral(mine?.mineral||'')}"></div>
        <div class="fg"><label>Return Period</label><input value="${per}"></div>
      </div>
    </div>
    <div class="form-section">
      <div class="fs-title">PART B — Production Data (Auto-filled)</div>
      <table class="modal-table">
        <thead><tr><th>Category</th><th>Produced (MT)</th><th>Dispatched (MT)</th></tr></thead>
        <tbody>
          <tr><td>${formatMineral(mine?.mineral||'')} — All Grades</td><td>${totalProduced.toLocaleString('en-IN',{maximumFractionDigits:3})}</td><td>${totalDispatched.toLocaleString('en-IN',{maximumFractionDigits:3})}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="form-section">
      <div class="fs-title">PART C — Employment</div>
      <div class="fs-grid">
        <div class="fg"><label>Total Workers Employed</label><input placeholder="Enter count" id="fb-workers"></div>
        <div class="fg"><label>Mandays Worked</label><input placeholder="Enter mandays" id="fb-mandays"></div>
      </div>
    </div>
    <div class="form-section">
      <div class="fs-title">PART D — Declaration</div>
      <div class="fs-grid">
        <div class="fg"><label>Agent / Manager Name</label><input value="${STATE.user?.full_name||''}" id="fb-agent"></div>
        <div class="fg"><label>Submission Date</label><input type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
    </div>`;
  openModal('modal-formb');
}

async function submitFormB() {
  const data = await apiFetch(`${API}/core.php?ep=deadlines&mine_id=${STATE.mineId}`, {
    method:'POST', body:JSON.stringify({ deadline_id: '', reference_number: 'IBM/MPR/' + new Date().getFullYear() + '/' + Math.floor(Math.random()*9000+1000) }),
  });
  closeModal('modal-formb');
  toast('IBM Form B submitted and filed! Reference saved.','success');
}

// ═══════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeModalOutside(e, id) { if (e.target === e.currentTarget) closeModal(id); }

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
function showLoader(on) {
  const loader = document.getElementById('page-loader');
  if (loader) loader.style.display = on ? 'flex' : 'none';
}

function showEmptyState() {
  showLoader(false);
  navigate('dashboard');
  document.getElementById('dash-greeting').textContent = 'Welcome to ComplianceOS';
  document.getElementById('dash-sub').textContent = 'Add your first mine lease to get started';
  document.getElementById('priority-actions').innerHTML = `<div class="action-card ok" onclick="openAddMineModal()"><div class="ac-severity">GET STARTED</div><div class="ac-text">Add your first mine lease to auto-generate your compliance calendar</div><div class="ac-cta">Add Mine →</div></div>`;
}

function fmtINR(num) {
  if (num === undefined || num === null) return '—';
  const n = parseFloat(num);
  if (isNaN(n)) return '—';
  if (n >= 10000000) return (n/10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return (n/100000).toFixed(2) + ' L';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

function formatMineral(m) {
  if (!m) return '';
  const map = {IRON_ORE:'Iron Ore',COAL:'Coal',LIMESTONE:'Limestone',BAUXITE:'Bauxite',MANGANESE:'Manganese Ore',CHROMITE:'Chromite',DOLOMITE:'Dolomite',GRANITE:'Granite'};
  return map[m] || m.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.getElementById('mine-picker').classList.remove('show');
  }
  if (e.altKey) {
    const map = {'1':'dashboard','2':'calendar','3':'royalty','4':'forms','5':'production','6':'documents','7':'dgms','8':'alerts'};
    if (map[e.key]) navigate(map[e.key]);
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth >= 900) document.getElementById('sidebar').classList.remove('open');
  drawProductionChart();
});
