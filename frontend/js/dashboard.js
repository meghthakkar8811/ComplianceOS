'use strict';

// ═══════════════════════════════════════════════════════════
// CONFIG & STATE
// ═══════════════════════════════════════════════════════════
let STATE = {
  user:     null,
  roleIds:  [],
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
  try {
    const me = await apiFetch('/auth/me');
    STATE.user = me.user;
    STATE.roleIds = me.roleIds || [];
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
async function logout() {
  try { await apiFetch('/auth/logout', { method: 'POST' }); } catch {}
  localStorage.removeItem('cos_mine_id');
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
  if (page === 'royalty')    loadRoyalty();
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
  const name = STATE.user.username || 'User';
  const initials = name.split(/[@._\s]/).filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase();
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('topbar-av').textContent   = initials;
  document.getElementById('user-name').textContent   = name;
  document.getElementById('user-role').textContent   = '';
  loadUserRoleNames();
}

async function loadUserRoleNames() {
  if (!STATE.roleIds.length) return;
  try {
    const result = await catalogSearch('Role', { filter: { field: 'id', op: 'IN', values: STATE.roleIds } });
    const names = (result.items || []).map(r => r.name).filter(Boolean);
    document.getElementById('user-role').textContent = names.join(', ');
  } catch (err) {
    console.error('Failed to load role names', err);
  }
}

// ═══════════════════════════════════════════════════════════
// MINE MANAGEMENT
// ═══════════════════════════════════════════════════════════
async function loadMines() {
  showLoader(true);
  let result;
  try {
    result = await catalogSearch('Mine', { filter: { field: 'isActive', op: 'EQ', values: [true] } });
  } finally {
    showLoader(false);
  }
  STATE.mines = result.items || [];

  if (STATE.mines.length && !STATE.mines.some(m => m.id === STATE.mineId)) {
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
  document.getElementById('active-mine-id').textContent   = 'Lease #' + mine.leaseNumber;
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
  const name       = document.getElementById('am-name').value.trim();
  const leaseNumber= document.getElementById('am-lease').value.trim();
  const state      = document.getElementById('am-state').value;
  const mineral    = document.getElementById('am-mineral').value;
  const district   = document.getElementById('am-district').value.trim();
  const mineType   = document.getElementById('am-type').value;
  const leaseStart = document.getElementById('am-lease-start').value;

  if (!name || !leaseNumber || !state || !mineral || !leaseStart) { toast('Please fill all required fields', 'error'); return; }

  try {
    const mine = await apiFetch('/mines/', {
      method: 'POST',
      body: JSON.stringify({
        name, leaseNumber, state, mineral, district, mineType,
        leaseStartOn: Date.parse(leaseStart + 'T00:00:00Z'),
      }),
    });
    STATE.mines.push(mine);
    STATE.mineId = mine.id;
    localStorage.setItem('cos_mine_id', STATE.mineId);
    renderMineList();
    updateActiveMineUI();
    closeModal('modal-add-mine');
    toast('Mine added! Compliance calendar auto-generated.', 'success');
    loadDashboard();
  } catch (err) {
    toast(err.message || 'Failed to add mine', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
const MONTH_INDEX = {
  JANUARY:0, FEBRUARY:1, MARCH:2, APRIL:3, MAY:4, JUNE:5,
  JULY:6, AUGUST:7, SEPTEMBER:8, OCTOBER:9, NOVEMBER:10, DECEMBER:11,
};

/**
 * Composes the dashboard view from the generic catalog + mine endpoints — there is no single
 * aggregate endpoint. The health score only has two real inputs: filing compliance (the ratio of
 * non-overdue PENDING_SUBMISSION records to all of them, across every authority) and DGMS
 * readiness (already computed server-side); royalty and environment sub-scores were never real
 * (PHP hardcoded environment to 55 and keyed royalty off a payment-status field that no longer
 * exists), so they're dropped rather than ported.
 */
async function loadDashboard() {
  if (!STATE.mineId) { showEmptyState(); return; }
  showLoader(true);

  let d;
  try {
    const mine = STATE.mines.find(m => m.id === STATE.mineId);
    const now = Date.now();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const todayStart = new Date().setHours(0,0,0,0);
    const sixMonthsAgoStart = new Date(new Date().getFullYear(), new Date().getMonth()-5, 1).getTime();

    const [recordsResult, entriesResult, dgms, royalties] = await Promise.all([
      catalogSearch('ComplianceRecord', { filter: { field:'mineId', op:'EQ', values:[STATE.mineId] } }),
      catalogSearch('ProductionEntry', { filter: { op:'AND', values: [
        { field:'mineId', op:'EQ', values:[STATE.mineId] },
        { field:'entryTime', op:'GTE', values:[sixMonthsAgoStart] },
      ] } }),
      apiFetch(`/mines/${STATE.mineId}/dgms-readiness`),
      apiFetch(`/mines/${STATE.mineId}/royalty`),
    ]);

    const records = recordsResult.items || [];
    const entries = entriesResult.items || [];

    const filings = records.filter(r => r.recordType !== 'REGISTER');
    const pendingFilings = filings.filter(r => r.status === 'PENDING_SUBMISSION');
    const overdueFilings = pendingFilings.filter(r => r.expiry < now);
    const expiringDocs = records.filter(r =>
      (r.recordType === 'CLEARANCE' || r.recordType === 'STATUTORY_PLAN') &&
      r.status === 'VALID' && r.expiry >= now && r.expiry - now < 90*86400000);

    const monthProduced = entries.filter(e => e.entryTime >= monthStart).reduce((s,e)=>s+(e.quantityProduced||0),0);
    const todayProduced  = entries.filter(e => e.entryTime >= todayStart).reduce((s,e)=>s+(e.quantityProduced||0),0);

    const chart = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(new Date().getFullYear(), new Date().getMonth()-i, 1);
      const start = monthDate.getTime();
      const end   = new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 1).getTime();
      const inMonth = entries.filter(e => e.entryTime >= start && e.entryTime < end);
      chart.push({
        month: monthDate.toLocaleString('default',{month:'short'}),
        produced:   inMonth.reduce((s,e)=>s+(e.quantityProduced||0),0),
        dispatched: inMonth.reduce((s,e)=>s+(e.quantityDispatched||0),0),
      });
    }

    const ibmScore  = pendingFilings.length === 0 ? 100 : Math.max(0, Math.round((1 - overdueFilings.length / pendingFilings.length) * 100));
    const dgmsScore = dgms.overallScore;
    const overall   = Math.round(ibmScore*0.5 + dgmsScore*0.5);

    const royaltyCurrent = (royalties.items || []).slice()
      .sort((a,b) => (b.year*12+MONTH_INDEX[b.month]) - (a.year*12+MONTH_INDEX[a.month]))[0] || null;

    const deadlines = pendingFilings.slice().sort((a,b) => a.expiry - b.expiry).map(r => ({
      title: r.title, authority: r.authority, due_date: new Date(r.expiry).toISOString(),
      days_until: Math.floor((r.expiry - now) / 86400000),
    }));

    d = {
      mine,
      health: { overall, ibm: ibmScore, dgms: dgmsScore },
      kpis: {
        month_produced_mt: monthProduced, today_produced_mt: todayProduced,
        pending_filings: pendingFilings.length, overdue_filings: overdueFilings.length,
        expiring_documents: expiringDocs.length,
      },
      dgms: { overall_score: dgmsScore },
      deadlines,
      production_chart: chart,
      royalty_current: royaltyCurrent,
    };
  } catch (err) {
    showLoader(false);
    toast('Failed to load dashboard', 'error');
    console.error(err);
    return;
  }
  showLoader(false);
  STATE.dashData = d;

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-greeting').textContent = `${greet}, ${STATE.user?.username || 'there'}`;
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

  animateBar('hb-ibm',  d.health.ibm,  'hb-ibm-val');
  animateBar('hb-dgms', d.health.dgms, 'hb-dgms-val');

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
  document.getElementById('kpi-royalty').textContent    = d.royalty_current ? '₹' + fmtINR(d.royalty_current.grossLiability/100) : '₹—';
  document.getElementById('kpi-royalty-sub').textContent= d.royalty_current ? `${d.royalty_current.month} ${d.royalty_current.year}` : 'No production yet';
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
    const pct = (part) => r.baseAmount ? ' (' + Math.round(part / r.baseAmount * 100) + '%)' : '';
    snap.innerHTML = `
      <div class="rb-row"><span class="rb-label">Base Royalty</span><span class="rb-val">₹${fmtINR(r.baseAmount/100)}</span></div>
      <div class="rb-row"><span class="rb-label">DMF${pct(r.dmfAmount)}</span><span class="rb-val">₹${fmtINR(r.dmfAmount/100)}</span></div>
      <div class="rb-row"><span class="rb-label">NMET${pct(r.nmetAmount)}</span><span class="rb-val">₹${fmtINR(r.nmetAmount/100)}</span></div>
      <div class="rb-row" style="border-bottom:none"><span class="rb-label" style="font-weight:600;color:var(--amber)">Gross Liability</span><span class="rb-val" style="color:var(--amber);font-size:15px">₹${fmtINR(r.grossLiability/100)}</span></div>`;
  } else {
    snap.innerHTML = '<p style="color:var(--text2);font-size:12px">No royalty calculated yet — add a production entry to generate one. <a style="color:var(--amber);cursor:pointer" onclick="navigate(\'production\')">Log production →</a></p>';
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
  const filters = [
    { field:'mineId', op:'EQ', values:[STATE.mineId] },
    { field:'recordType', op:'NE', values:['REGISTER'] },
  ];
  if (auth) filters.push({ field:'authority', op:'EQ', values:[auth] });

  let result;
  try {
    result = await catalogSearch('ComplianceRecord', { filter: { op:'AND', values: filters } });
  } catch (err) {
    toast('Failed to load calendar', 'error');
    return;
  }

  const now = Date.now();
  const items = (result.items || []).map(r => ({
    ...r, days_until: Math.floor((r.expiry - now) / 86400000),
  })).sort((a,b) => a.expiry - b.expiry);

  const content = document.getElementById('calendar-content');
  if (!items.length) { content.innerHTML = '<p style="color:var(--text2);font-family:var(--mono);padding:24px">No deadlines found.</p>'; return; }

  const months = {};
  items.forEach(d => {
    const dt  = new Date(d.expiry);
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
        return `<div class="cal-item ${cls}" onclick="openMarkSubmitted('${ev.id}')">
          <div><span class="cal-day-num">${ev.dt.getDate()}</span><span class="cal-day-mon">${ev.dt.toLocaleString('default',{month:'short'}).toUpperCase()}</span></div>
          <div><div class="cal-item-title">${ev.title}</div><div class="cal-item-sub">${ev.authority.replace('_',' ')}</div></div>
          <span class="auth-chip auth-${ev.authority}">${ev.authority.replace('_',' ')}</span>
          <span class="days-chip ${chipCls}">${chip}</span>
        </div>`;
      }).join('')}
    </div>`).join('');
}

/** Marks a deadline SUBMITTED with a reference number the user enters. */
async function openMarkSubmitted(recordId) {
  const record = (await catalogSearch('ComplianceRecord', { filter: { field:'id', op:'EQ', values:[recordId] } })).items?.[0];
  if (!record || record.status === 'SUBMITTED') return;
  const referenceNumber = prompt(`Mark "${record.title}" as submitted.\nEnter the authority's reference/acknowledgement number:`);
  if (!referenceNumber) return;
  try {
    await apiFetch(`/mines/${STATE.mineId}/compliance-records`, {
      method: 'POST',
      body: JSON.stringify({ ...record, status: 'SUBMITTED', submittedOn: Date.now(), referenceNumber }),
    });
    toast('Marked as submitted', 'success');
    loadCalendar();
  } catch (err) {
    toast(err.message || 'Failed to mark as submitted', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// ROYALTY — read-only; derived from production entries, recalculated server-side
// whenever production changes. There is no manual input or save action any more.
// ═══════════════════════════════════════════════════════════
async function loadRoyalty() {
  if (!STATE.mineId) return;
  let result;
  try {
    result = await apiFetch(`/mines/${STATE.mineId}/royalty`);
  } catch (err) {
    toast('Failed to load royalty', 'error');
    return;
  }
  const periods = (result.items || []).slice()
    .sort((a,b) => (b.year*12+MONTH_INDEX[b.month]) - (a.year*12+MONTH_INDEX[a.month]));
  const current = periods[0];

  if (current) {
    const pct = (part) => current.baseAmount ? ' (' + Math.round(part / current.baseAmount * 100) + '%)' : '';
    document.getElementById('cc-period').textContent   = `${current.month} ${current.year}`;
    document.getElementById('co-dmf-label').textContent = 'DMF' + pct(current.dmfAmount);
    document.getElementById('co-nmet-label').textContent= 'NMET' + pct(current.nmetAmount);
    document.getElementById('co-base').textContent     = '₹' + fmtINR(current.baseAmount/100);
    document.getElementById('co-dmf').textContent      = '₹' + fmtINR(current.dmfAmount/100);
    document.getElementById('co-nmet').textContent     = '₹' + fmtINR(current.nmetAmount/100);
    document.getElementById('co-gross').textContent    = '₹' + fmtINR(current.grossLiability/100);
  } else {
    document.getElementById('cc-period').textContent = '—';
    ['co-base','co-dmf','co-nmet','co-gross'].forEach(id => document.getElementById(id).textContent = '₹—');
  }

  document.getElementById('royalty-history-tbody').innerHTML = periods.length
    ? periods.map(r => `
        <tr>
          <td>${r.month} ${r.year}</td>
          <td class="num-col">₹${fmtINR(r.baseAmount/100)}</td>
          <td class="num-col">₹${fmtINR(r.dmfAmount/100)}</td>
          <td class="num-col">₹${fmtINR(r.nmetAmount/100)}</td>
          <td class="num-col">₹${fmtINR(r.grossLiability/100)}</td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="color:var(--text2)">No royalty calculated yet — add a production entry to generate one.</td></tr>';
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
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon-1, 1).getTime();
  const end   = new Date(year, mon, 1).getTime();

  let result;
  try {
    result = await catalogSearch('ProductionEntry', { filter: { op:'AND', values: [
      { field:'mineId', op:'EQ', values:[STATE.mineId] },
      { field:'entryTime', op:'GTE', values:[start] },
      { field:'entryTime', op:'LT', values:[end] },
    ] } });
  } catch (err) {
    toast('Failed to load production entries', 'error');
    return;
  }
  STATE.prodData = (result.items || []).sort((a,b) => b.entryTime - a.entryTime);
  renderProdTable(STATE.prodData);
  renderProdSummary();
}

function renderProdTable(rows) {
  document.getElementById('prod-tbody').innerHTML = rows.map(r => `
    <tr>
      <td>${new Date(r.entryTime).toLocaleDateString('en-IN')}</td>
      <td>${r.shift}</td>
      <td>${r.pitSection}</td>
      <td>${r.mineralGrade}</td>
      <td class="num-col">${r.quantityProduced.toLocaleString('en-IN')}</td>
      <td class="num-col">${r.quantityDispatched.toLocaleString('en-IN')}</td>
      <td>${r.supervisorName || '—'}</td>
      <td><span class="status-pill ${r.status}">${r.status}</span></td>
      <td>${r.status === 'PENDING' ? `<button class="action-link" onclick="verifyEntry('${r.id}')">Verify</button>` : '—'}</td>
    </tr>`).join('');
}

function renderProdSummary() {
  const totalP = STATE.prodData.reduce((s,r) => s + (r.quantityProduced||0), 0);
  const totalD = STATE.prodData.reduce((s,r) => s + (r.quantityDispatched||0), 0);
  document.getElementById('prod-summary').innerHTML = `
    <div class="psr-card"><span class="psr-label">Total Produced</span><span class="psr-val">${totalP.toLocaleString('en-IN',{maximumFractionDigits:1})} MT</span></div>
    <div class="psr-card"><span class="psr-label">Total Dispatched</span><span class="psr-val">${totalD.toLocaleString('en-IN',{maximumFractionDigits:1})} MT</span></div>
    <div class="psr-card"><span class="psr-label">Entries</span><span class="psr-val">${STATE.prodData.length}</span></div>`;
}

function filterProd() {
  const q = document.getElementById('prod-search').value.toLowerCase();
  const filtered = q ? STATE.prodData.filter(r =>
    (r.pitSection||'').toLowerCase().includes(q) ||
    (r.supervisorName||'').toLowerCase().includes(q) || r.shift.toLowerCase().includes(q)
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
    entryTime:          Date.parse(document.getElementById('pf-date').value + 'T00:00:00Z'),
    shift:               document.getElementById('pf-shift').value,
    pitSection:          document.getElementById('pf-pit').value.trim(),
    mineralGrade:        document.getElementById('pf-grade').value.trim(),
    quantityProduced:    parseFloat(document.getElementById('pf-prod').value)||0,
    quantityDispatched:  parseFloat(document.getElementById('pf-disp').value)||0,
    supervisorName:      document.getElementById('pf-sup').value.trim(),
    remarks:             document.getElementById('pf-rem').value.trim(),
  };
  if (!body.pitSection || !body.mineralGrade) { toast('Pit/section and grade are required','error'); return; }
  try {
    await apiFetch(`/mines/${STATE.mineId}/production`, { method:'POST', body:JSON.stringify(body) });
    toast('Production entry saved','success');
    toggleProdForm();
    loadProduction();
  } catch (err) {
    toast(err.message || 'Failed to save entry', 'error');
  }
}

async function verifyEntry(id) {
  const entry = (await catalogSearch('ProductionEntry', { filter: { field:'id', op:'EQ', values:[id] } })).items?.[0];
  if (!entry) { toast('Entry not found', 'error'); return; }
  try {
    await apiFetch(`/mines/${STATE.mineId}/production`, {
      method:'POST', body:JSON.stringify({ ...entry, status:'VERIFIED' }),
    });
    toast('Entry verified','success');
    loadProduction();
  } catch (err) {
    toast(err.message || 'Failed to verify', 'error');
  }
}

function exportProdCSV() {
  const month = document.getElementById('prod-month')?.value || new Date().toISOString().slice(0,7);
  const rows  = [['Date','Shift','Pit','Grade','Produced (MT)','Dispatched (MT)','Supervisor','Status'],
    ...STATE.prodData.map(r=>[new Date(r.entryTime).toLocaleDateString('en-IN'),r.shift,r.pitSection,r.mineralGrade,r.quantityProduced,r.quantityDispatched,r.supervisorName||'',r.status])];
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
const DOCUMENT_RECORD_TYPES = ['CLEARANCE', 'STATUTORY_PLAN', 'NOTICE'];
const AUTHORITY_ICONS = { IBM:'📄', DGMS:'🏅', MOEFCC:'🌿', SPCB:'🏭', STATE_GOVT:'📜' };

async function loadDocuments(authority) {
  if (!STATE.mineId) return;
  const filters = [
    { field:'mineId', op:'EQ', values:[STATE.mineId] },
    { field:'recordType', op:'IN', values:DOCUMENT_RECORD_TYPES },
  ];
  if (authority) filters.push({ field:'authority', op:'EQ', values:[authority] });

  let result;
  try {
    result = await catalogSearch('ComplianceRecord', { filter: { op:'AND', values: filters } });
  } catch (err) {
    toast('Failed to load documents', 'error');
    return;
  }
  const docs = (result.items || []).sort((a,b) => (b.issuedOn||0) - (a.issuedOn||0));
  document.getElementById('doc-grid').innerHTML = docs.length
    ? docs.map(d => `
        <div class="doc-card" onclick="${d.attachment ? `openDocument('${encodeURIComponent(JSON.stringify(d.attachment))}')` : `toast('No file attached','info')`}">
          <div class="doc-card-icon">${AUTHORITY_ICONS[d.authority]||'📄'}</div>
          <div class="doc-card-name">${d.title}</div>
          <div class="doc-card-type">${d.authority.replace('_',' ')} · ${d.recordType.replace('_',' ')}</div>
          <div class="doc-card-date">Issued: ${d.issuedOn ? new Date(d.issuedOn).toLocaleDateString('en-IN') : '—'}</div>
          <span class="doc-expiry-tag ${getExpiryStatus(d.expiry)}">
            ${getExpiryLabel(d.expiry)} ${d.expiry ? '· '+new Date(d.expiry).toLocaleDateString('en-IN') : ''}
          </span>
        </div>`).join('')
    : '<p style="color:var(--text2);font-family:var(--mono);grid-column:1/-1">No documents uploaded yet.</p>';
}

async function openDocument(attachmentJson) {
  const attachment = JSON.parse(decodeURIComponent(attachmentJson));
  try {
    const res = await fetch(`${API}/storage/download`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attachment),
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  } catch (err) {
    toast('Failed to open document', 'error');
  }
}

function getExpiryStatus(expiryMillis) {
  if (!expiryMillis) return 'none';
  const now = Date.now();
  if (expiryMillis < now) return 'expired';
  if (expiryMillis - now < 90*86400000) return 'expiring';
  return 'valid';
}
function getExpiryLabel(expiryMillis) {
  const s = getExpiryStatus(expiryMillis);
  return s==='none'?'No Expiry':s==='expired'?'✕ Expired':s==='expiring'?'⚠ Expiring Soon':'✓ Valid';
}

function filterDocs(btn, authority) {
  document.querySelectorAll('.doc-filter-row .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  loadDocuments(authority);
}

function openAddDocModal() { openModal('modal-add-doc'); }

async function addDocument() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }

  const fileInput = document.getElementById('doc-file');
  const file = fileInput.files[0];

  const title      = document.getElementById('doc-name').value.trim();
  const authority  = document.getElementById('doc-authority').value;
  const recordType = document.getElementById('doc-record-type').value;
  const issuedOn   = document.getElementById('doc-issued').value;
  const expiryVal  = document.getElementById('doc-expiry').value;

  if (!title) { toast('Document title is required','error'); return; }
  if (!file) { toast('Please select a file to upload','error'); return; }

  try {
    const attachment = await apiUpload(file, `${STATE.mineId}/${Date.now()}_${file.name}`);
    const expiry = expiryVal ? Date.parse(expiryVal + 'T00:00:00Z') : null;
    await apiFetch(`/mines/${STATE.mineId}/compliance-records`, {
      method: 'POST',
      body: JSON.stringify({
        title, authority, recordType, attachment,
        issuedOn: issuedOn ? Date.parse(issuedOn + 'T00:00:00Z') : null,
        expiry,
        status: expiry && expiry < Date.now() ? 'EXPIRED' : 'VALID',
      }),
    });
    toast('Document saved','success');
    closeModal('modal-add-doc');
    loadDocuments('');
    fileInput.value = '';
    document.getElementById('file-name-display').innerText = '';
  } catch (err) {
    toast(err.message || 'Failed to save document','error');
  }
}

// ═══════════════════════════════════════════════════════════
// DGMS
// ═══════════════════════════════════════════════════════════
async function loadDgms() {
  if (!STATE.mineId) return;
  let d;
  try {
    d = await apiFetch(`/mines/${STATE.mineId}/dgms-readiness`);
  } catch (err) {
    toast('Failed to load DGMS readiness', 'error');
    return;
  }

  const score = d.overallScore;
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

  const colorFor = status => status==='GREEN'?'var(--green)':status==='AMBER'?'var(--amber)':'var(--red)';

  // Category bars
  const cats = {ACCIDENT_REGISTER:'Accident Register',SAFETY_COMMITTEE:'Safety Meetings',EXPLOSIVE_CONSUMPTION:'Explosives',SHOTFIRER_COMPETENCY:'Certifications',FIRST_AID:'First Aid',MACHINERY_REGISTER:'Machinery',WEIGHBRIDGE_REGISTER:'Weighbridge',EMPLOYMENT_REGISTER:'Employment'};
  document.getElementById('dsp-cats').innerHTML = (d.scores||[]).map(r => {
    const col = colorFor(r.status);
    return `<div class="dsp-cat">
      <span>${cats[r.register.registerCode]||r.register.registerCode}</span>
      <div class="dsp-bar-wrap"><div class="dsp-bar" style="width:${r.score}%;background:${col}"></div></div>
      <span class="dsp-score" style="color:${col}">${r.score}</span>
    </div>`;
  }).join('');

  document.getElementById('registers-list').innerHTML = (d.scores||[]).map(r => {
    const dotColor = colorFor(r.status);
    return `<div class="reg-item">
      <div>
        <div class="reg-name">${r.register.title}</div>
        <div class="reg-reg">${r.register.notes||'DGMS'}</div>
        <div class="reg-note" style="color:${dotColor}">${r.status==='GREEN'?'Up to date':r.daysSinceUpdate+' days since last update'}</div>
      </div>
      <div class="reg-last">Last: ${r.register.lastUpdatedAt ? new Date(r.register.lastUpdatedAt).toLocaleDateString('en-IN') : '—'}</div>
      <button class="reg-btn" onclick="markRegister('${r.register.id}')">Mark Updated</button>
      <div class="reg-dot" style="background:${dotColor};box-shadow:0 0 6px ${dotColor}"></div>
    </div>`;
  }).join('');
}

async function markRegister(recordId) {
  const record = (await catalogSearch('ComplianceRecord', { filter: { field:'id', op:'EQ', values:[recordId] } })).items?.[0];
  if (!record) { toast('Register not found', 'error'); return; }
  try {
    await apiFetch(`/mines/${STATE.mineId}/compliance-records`, {
      method:'POST', body:JSON.stringify({ ...record, lastUpdatedAt: Date.now(), notes:'Updated via ComplianceOS' }),
    });
    toast('Register marked as updated','success');
    loadDgms();
  } catch (err) {
    toast(err.message || 'Failed to update register', 'error');
  }
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
/**
 * The IBM monthly return is modeled as a ComplianceRecord (authority IBM, recordType RETURN),
 * seeded due on the 1st of the month following the production it reports — so the record whose
 * expiry is soonest (including already-overdue ones) is the one still outstanding to file.
 */
async function findIbmMonthlyReturn() {
  if (!STATE.mineId) return null;
  const result = await catalogSearch('ComplianceRecord', { filter: { op:'AND', values: [
    { field:'mineId', op:'EQ', values:[STATE.mineId] },
    { field:'authority', op:'EQ', values:['IBM'] },
    { field:'recordType', op:'EQ', values:['RETURN'] },
    { field:'status', op:'EQ', values:['PENDING_SUBMISSION'] },
  ] } });
  return (result.items || []).sort((a,b) => a.expiry - b.expiry)[0] || null;
}

let formBRecord = null;

async function setFormBDueDate() {
  const badge = document.querySelector('#page-forms .form-tile.ready .ft-badge');
  formBRecord = await findIbmMonthlyReturn();
  if (!formBRecord) {
    document.getElementById('formb-due').textContent = 'No return currently outstanding';
    if (badge) badge.textContent = 'FILED';
    return;
  }
  document.getElementById('formb-due').textContent = 'Due: ' + new Date(formBRecord.expiry).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  if (badge) badge.textContent = formBRecord.expiry < Date.now() ? 'OVERDUE' : 'READY TO FILE';
}

async function openFormB() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }
  if (!formBRecord) { toast('No return currently outstanding for this mine','info'); return; }
  const mine = STATE.mines.find(m => m.id === STATE.mineId);

  // The return due on the 1st of month M reports production from month M-1.
  const dueDate = new Date(formBRecord.expiry);
  const reportStart = new Date(dueDate.getFullYear(), dueDate.getMonth()-1, 1);
  const reportEnd   = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
  const per = reportStart.toLocaleString('default',{month:'long',year:'numeric'});

  let entries = [];
  try {
    const result = await catalogSearch('ProductionEntry', { filter: { op:'AND', values: [
      { field:'mineId', op:'EQ', values:[STATE.mineId] },
      { field:'entryTime', op:'GTE', values:[reportStart.getTime()] },
      { field:'entryTime', op:'LT', values:[reportEnd.getTime()] },
    ] } });
    entries = result.items || [];
  } catch (err) { /* leave entries empty; the form still opens with zeros */ }

  const totalProduced   = entries.reduce((s,r)=>s+(r.quantityProduced||0),0);
  const totalDispatched = entries.reduce((s,r)=>s+(r.quantityDispatched||0),0);

  document.getElementById('formb-period').textContent = `${per} · Auto-filled from ComplianceOS`;
  document.getElementById('formb-content').innerHTML = `
    <div class="form-section">
      <div class="fs-title">PART A — Mine Identification</div>
      <div class="fs-grid">
        <div class="fg"><label>Name of Mine</label><input value="${mine?.name||''}"></div>
        <div class="fg"><label>Lease Number</label><input value="${mine?.leaseNumber||''}"></div>
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
        <div class="fg"><label>Agent / Manager Name</label><input value="${STATE.user?.username||''}" id="fb-agent"></div>
        <div class="fg"><label>Submission Date</label><input type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="fg"><label>IBM Reference Number *</label><input placeholder="e.g. IBM/MPR/2026/1042" id="fb-reference"></div>
      </div>
    </div>`;
  openModal('modal-formb');
}

async function submitFormB() {
  if (!formBRecord) return;
  const referenceNumber = document.getElementById('fb-reference').value.trim();
  if (!referenceNumber) { toast('Enter the IBM reference/acknowledgement number', 'error'); return; }
  try {
    await apiFetch(`/mines/${STATE.mineId}/compliance-records`, {
      method: 'POST',
      body: JSON.stringify({ ...formBRecord, status: 'SUBMITTED', submittedOn: Date.now(), referenceNumber }),
    });
    closeModal('modal-formb');
    toast('IBM return submitted and filed! Reference saved.','success');
    formBRecord = null;
    setFormBDueDate();
  } catch (err) {
    toast(err.message || 'Failed to submit return', 'error');
  }
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
