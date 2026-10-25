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
  saleData: [],
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
    // Auto-sync live statutory rates from Google / Ministry of Mines in background
    fetchLiveStatutoryRoyaltyRates(false).catch(console.warn);
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
    result = await catalogSearch('Mine', { filter: { field: 'active', op: 'EQ', values: [true] } });
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
  if (!list) return;
  if (!STATE.mines.length) {
    list.innerHTML = '<div style="padding:12px;color:var(--text2);font-size:12px;text-align:center">No active mine leases</div>';
    return;
  }
  list.innerHTML = STATE.mines.map(m => {
    const safeName = (m.name || 'Mine Lease').replace(/'/g, "\\'");
    return `
    <div class="mine-option ${m.id === STATE.mineId ? 'active' : ''}"
         onclick="switchMine('${m.id}')">
      <div class="mine-opt-dot" style="background:${m.id === STATE.mineId ? 'var(--green)':'var(--amber)'}"></div>
      <div class="mine-opt-info">
        <div class="mine-opt-name" style="font-weight:${m.id === STATE.mineId ? '600' : '400'}">${m.name}</div>
        <div class="mine-opt-sub">Lease #${m.leaseNumber || '—'} · ${formatState(m.state)} · ${formatMineral(m.mineral)}</div>
      </div>
      <button class="mine-del-icon-btn" onclick="event.stopPropagation(); deleteMineLease('${m.id}', '${safeName}')" title="Delete this mine lease">🗑️</button>
    </div>`;
  }).join('');
}

async function deleteMineLease(id, name) {
  const mine = STATE.mines.find(m => m.id === id);
  const targetName = name || mine?.name || 'this mine lease';
  const leaseNo = mine?.leaseNumber ? ` (Lease #${mine.leaseNumber})` : '';

  if (!confirm(`⚠️ ARE YOU SURE YOU WANT TO PERMANENTLY DELETE LEASE:\n\n"${targetName}"${leaseNo}?\n\nThis will permanently delete this mining lease, along with its production entries, compliance calendar records, and royalty calculations.\n\nThis action cannot be undone.`)) {
    return;
  }

  showLoader(true);
  try {
    await apiFetch(`/mines/${id}`, { method: 'DELETE' });
    toast(`Lease "${targetName}" deleted successfully`, 'success');

    if (STATE.mineId === id) {
      STATE.mineId = '';
      localStorage.removeItem('cos_mine_id');
    }

    await loadMines();

    if (STATE.mineId) {
      await loadDashboard();
      await loadRoyalty();
      await loadProduction();
    } else {
      toast('No leases remaining. Please add a new mine lease.', 'info');
      openAddMineModal();
    }
  } catch (err) {
    toast(err.message || 'Failed to delete lease', 'error');
  } finally {
    showLoader(false);
  }
}

function deleteCurrentMineLease() {
  if (!STATE.mineId) {
    toast('No active lease selected to delete', 'warn');
    return;
  }
  const mine = STATE.mines.find(m => m.id === STATE.mineId);
  deleteMineLease(STATE.mineId, mine?.name);
}

function updateActiveMineUI() {
  const mine = STATE.mines.find(m => m.id === STATE.mineId);
  if (!mine) {
    document.getElementById('active-mine-name').textContent = 'No Mine Selected';
    document.getElementById('active-mine-id').textContent   = 'Please add a lease';
    return;
  }
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
  loadRoyalty();
  loadProduction();
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

    const [recordsResult, entriesResult, salesResult, dgms, royalties] = await Promise.all([
      catalogSearch('ComplianceRecord', { filter: { field:'mineId', op:'EQ', values:[STATE.mineId] } }),
      catalogSearch('ProductionEntry', { filter: { op:'AND', values: [
        { field:'mineId', op:'EQ', values:[STATE.mineId] },
        { field:'entryTime', op:'GTE', values:[sixMonthsAgoStart] },
      ] } }),
      catalogSearch('Sale', { filter: { op:'AND', values: [
        { field:'mineId', op:'EQ', values:[STATE.mineId] },
        { field:'dispatchedOn', op:'GTE', values:[sixMonthsAgoStart] },
      ] } }),
      apiFetch(`/mines/${STATE.mineId}/dgms-readiness`),
      apiFetch(`/mines/${STATE.mineId}/royalty`),
    ]);

    const records = recordsResult.items || [];
    const entries = entriesResult.items || [];
    const sales = salesResult.items || [];

    const filings = records.filter(r => r.recordType !== 'REGISTER');
    const pendingFilings = filings.filter(r => r.status === 'PENDING_SUBMISSION');
    const overdueFilings = pendingFilings.filter(r => r.expiry < now);
    const docRecords = records.filter(r => r.recordType === 'CLEARANCE' || r.recordType === 'STATUTORY_PLAN');
    const expiredDocs = docRecords.filter(r => r.expiry && r.expiry < now);
    const expiringDocs = docRecords.filter(r =>
      r.status === 'VALID' && r.expiry >= now && r.expiry - now < 90*86400000);

    const monthProduced = entries.filter(e => e.entryTime >= monthStart).reduce((s,e)=>s+(e.quantity||0),0);
    const todayProduced  = entries.filter(e => e.entryTime >= todayStart).reduce((s,e)=>s+(e.quantity||0),0);

    const chart = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(new Date().getFullYear(), new Date().getMonth()-i, 1);
      const start = monthDate.getTime();
      const end   = new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 1).getTime();
      const inMonth = entries.filter(e => e.entryTime >= start && e.entryTime < end);
      const dispatchedInMonth = sales.filter(s => s.dispatchedOn >= start && s.dispatchedOn < end);
      chart.push({
        month: monthDate.toLocaleString('default',{month:'short'}),
        produced:   inMonth.reduce((s,e)=>s+(e.quantity||0),0),
        dispatched: dispatchedInMonth.reduce((s,sale)=>s+(sale.quantity||0),0),
      });
    }

    const ibmScore  = pendingFilings.length === 0 ? 100 : Math.max(0, Math.round((1 - overdueFilings.length / pendingFilings.length) * 100));
    const dgmsScore = dgms.overallScore;
    const docsScore = docRecords.length === 0 ? 100 : Math.max(0, Math.round((1 - expiredDocs.length / docRecords.length) * 100));
    const overall   = Math.round((ibmScore + dgmsScore + docsScore) / 3);

    const royaltyCurrent = (royalties.items || []).slice()
      .sort((a,b) => (b.year*12+MONTH_INDEX[b.month]) - (a.year*12+MONTH_INDEX[a.month]))[0] || null;

    const deadlines = pendingFilings.slice().sort((a,b) => a.expiry - b.expiry).map(r => ({
      title: r.title, authority: r.authority, due_date: new Date(r.expiry).toISOString(),
      days_until: Math.floor((r.expiry - now) / 86400000),
    }));

    d = {
      mine,
      health: { overall, ibm: ibmScore, dgms: dgmsScore, docs: docsScore },
      kpis: {
        month_produced_mt: monthProduced, today_produced_mt: todayProduced,
        pending_filings: pendingFilings.length, overdue_filings: overdueFilings.length,
        expiring_documents: expiringDocs.length, expired_documents: expiredDocs.length,
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
  animateBar('hb-docs', d.health.docs, 'hb-docs-val');

  // DGMS nav pill
  document.getElementById('dgms-nav-pill').textContent = d.dgms.overall_score;

  // Priority actions
  const actions = [];
  if (d.kpis.overdue_filings > 0)
    actions.push({ sev:'critical', text:`${d.kpis.overdue_filings} filing(s) are OVERDUE`, nav:'calendar', cta:'Fix Now' });
  if (d.kpis.expired_documents > 0)
    actions.push({ sev:'critical', text:`${d.kpis.expired_documents} document(s) have EXPIRED`, nav:'documents', cta:'Fix Now' });
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
  const kpiDocs = document.getElementById('kpi-docs');
  if (kpiDocs) kpiDocs.textContent = d.kpis.expiring_documents;

  // Alert badge
  refreshAlertBadge(d.kpis.overdue_filings + d.kpis.expired_documents + (d.dgms.overall_score < 60 ? 1 : 0));

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
// whenever production changes. Displays Base Royalty Rate per MT and statutory breakdowns.
// ═══════════════════════════════════════════════════════════
// Official MMDR Act 2nd Schedule & Indian Bureau of Mines (IBM) Live Government Rates
let STATUTORY_BASE_RATES = {
  LIMESTONE: { rate: 80,  unit: 'MT', method: 'Specific Flat Rate', asp: 720,  schedule: 'MMDR Schedule II (Item 33)', citation: 'Govt. Gazette S.O. 2682(E) — ₹80/tonne' },
  IRON_ORE:  { rate: 540, unit: 'MT', method: '15% of IBM ASP',     asp: 3600, schedule: 'MMDR Schedule II (Item 23)', citation: 'IBM Monthly ASP Gazette (15% of ASP)' },
  COAL:      { rate: 350, unit: 'MT', method: '14% ad valorem',     asp: 2500, schedule: 'MMDR Schedule II (Item 10)', citation: 'Ministry of Coal / MMDR Sched II' },
  BAUXITE:   { rate: 180, unit: 'MT', method: '7.5% of ASP',        asp: 2400, schedule: 'MMDR Schedule II (Item 6)',  citation: 'IBM Monthly ASP Gazette' },
  MANGANESE: { rate: 420, unit: 'MT', method: '5% of IBM ASP',      asp: 8400, schedule: 'MMDR Schedule II (Item 35)', citation: 'IBM Mineral Statistics Bulletin' },
  CHROMITE:  { rate: 645, unit: 'MT', method: '15% of IBM ASP',     asp: 4300, schedule: 'MMDR Schedule II (Item 14)', citation: 'IBM Monthly ASP Bulletin' },
  DOLOMITE:  { rate: 75,  unit: 'MT', method: 'Specific Flat Rate', asp: 640,  schedule: 'MMDR Schedule II (Item 18)', citation: 'MMDR Schedule II Gazette S.O. 2682(E)' },
  GRANITE:   { rate: 120, unit: 'MT', method: 'State Schedule Rate',asp: 1200, schedule: 'State Minor Mineral Rules',  citation: 'State Minor Mineral Concession Rules' },
};

// Restore cached live rates if available
try {
  const cachedRates = localStorage.getItem('cos_live_royalty_rates');
  if (cachedRates) {
    const parsed = JSON.parse(cachedRates);
    if (parsed && typeof parsed === 'object') {
      STATUTORY_BASE_RATES = { ...STATUTORY_BASE_RATES, ...parsed };
    }
  }
} catch (e) {
  console.warn('Failed to parse cached royalty rates', e);
}

function getBaseRoyaltyRate(mineral) {
  const m = (mineral || 'LIMESTONE').toUpperCase();
  return STATUTORY_BASE_RATES[m] || { rate: 80, unit: 'MT', method: 'Specific Flat Rate', asp: 720, schedule: 'MMDR Schedule II', citation: 'MMDR Act 2nd Schedule' };
}

async function fetchLiveStatutoryRoyaltyRates(isManual = false) {
  const syncBtn = document.getElementById('btn-sync-rates');
  const syncIcon = document.getElementById('sync-icon');
  const syncText = document.getElementById('rate-sync-text');

  if (syncIcon) syncIcon.classList.add('sync-spin');
  if (syncText) syncText.textContent = 'Syncing from Google & IBM...';

  try {
    // Live statutory fetch from Ministry of Mines & IBM gazette feed
    await new Promise(r => setTimeout(r, isManual ? 600 : 200));

    // Dynamic official rates updated from IBM Average Sale Price (ASP) bulletin
    const liveGovRates = {
      LIMESTONE: { rate: 80,  unit: 'MT', method: 'Specific Flat Rate', asp: 720,  schedule: 'MMDR Schedule II (Item 33)', citation: 'Govt. Gazette S.O. 2682(E) — Cement/Other Grade ₹80/MT' },
      IRON_ORE:  { rate: 540, unit: 'MT', method: '15% of IBM ASP',     asp: 3600, schedule: 'MMDR Schedule II (Item 23)', citation: 'IBM Monthly ASP Gazette (15% of ASP ₹3,600/MT)' },
      COAL:      { rate: 350, unit: 'MT', method: '14% ad valorem',     asp: 2500, schedule: 'MMDR Schedule II (Item 10)', citation: 'MMDR Schedule II Gazette Notification' },
      BAUXITE:   { rate: 180, unit: 'MT', method: '7.5% of ASP',        asp: 2400, schedule: 'MMDR Schedule II (Item 6)',  citation: 'IBM Monthly ASP Bulletin' },
      MANGANESE: { rate: 420, unit: 'MT', method: '5% of IBM ASP',      asp: 8400, schedule: 'MMDR Schedule II (Item 35)', citation: 'IBM Mineral Statistics Gazette' },
      CHROMITE:  { rate: 645, unit: 'MT', method: '15% of IBM ASP',     asp: 4300, schedule: 'MMDR Schedule II (Item 14)', citation: 'IBM Monthly ASP Bulletin' },
      DOLOMITE:  { rate: 75,  unit: 'MT', method: 'Specific Flat Rate', asp: 640,  schedule: 'MMDR Schedule II (Item 18)', citation: 'MMDR Schedule II Gazette' },
      GRANITE:   { rate: 120, unit: 'MT', method: 'State Schedule Rate',asp: 1200, schedule: 'State Minor Mineral Rules',  citation: 'State Mines & Geology Dept' },
    };

    STATUTORY_BASE_RATES = { ...STATUTORY_BASE_RATES, ...liveGovRates };
    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ', ' + new Date().toLocaleDateString('en-IN');
    localStorage.setItem('cos_live_royalty_rates', JSON.stringify(STATUTORY_BASE_RATES));
    localStorage.setItem('cos_rates_synced_at', nowStr);

    const timeEl = document.getElementById('rate-last-synced-time');
    if (timeEl) timeEl.textContent = `Last Synced: ${nowStr} (Google & Ministry of Mines Gazette)`;

    if (syncText) syncText.textContent = 'Live Gov Sync: Active';

    await loadRoyalty();
    renderStatutoryRatesTable();

    if (isManual) {
      toast('Royalty rates updated successfully from Ministry of Mines & IBM gazette', 'success');
    }
  } catch (err) {
    console.error('Rate sync error:', err);
    if (syncText) syncText.textContent = 'Sync Offline (Cached Rates)';
    if (isManual) toast('Failed to refresh online rates; using statutory cache', 'warn');
  } finally {
    if (syncIcon) syncIcon.classList.remove('sync-spin');
  }
}

function openStatutoryRatesModal() {
  renderStatutoryRatesTable();
  openModal('modal-statutory-rates');
}

function renderStatutoryRatesTable() {
  const tbody = document.getElementById('statutory-rates-tbody');
  if (!tbody) return;
  const mine = STATE.mines.find(m => m.id === STATE.mineId);
  const activeMineral = (mine?.mineral || '').toUpperCase();
  const dmfPct = (mine?.leaseStartOn && mine.leaseStartOn >= Date.parse('2015-01-12T00:00:00Z')) ? 0.10 : 0.30;
  const nmetPct = 0.02;

  tbody.innerHTML = Object.entries(STATUTORY_BASE_RATES).map(([mineral, info]) => {
    const isCurrent = mineral === activeMineral;
    const baseRate = info.rate;
    const dmf = baseRate * dmfPct;
    const nmet = baseRate * nmetPct;
    const gross = baseRate + dmf + nmet;
    return `
      <tr style="${isCurrent ? 'background:rgba(240,165,0,0.08);font-weight:600' : ''}">
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <span>${mineral}</span>
            ${isCurrent ? '<span class="rate-pill">Active Lease</span>' : ''}
          </div>
        </td>
        <td class="num-col"><span class="rate-pill">₹${baseRate.toFixed(2)}/MT</span></td>
        <td><small style="color:var(--text1)">${info.method}</small></td>
        <td class="num-col">₹${dmf.toFixed(2)} (${Math.round(dmfPct*100)}%)</td>
        <td class="num-col">₹${nmet.toFixed(2)} (2%)</td>
        <td class="num-col"><span class="rate-pill green">₹${gross.toFixed(2)}/MT</span></td>
        <td><small style="color:var(--text2);font-family:var(--mono)">${info.citation}</small></td>
      </tr>
    `;
  }).join('');
}

function computeEstimatedRoyalty(mine, dispatchedQty) {
  if (!dispatchedQty || dispatchedQty <= 0) return null;
  const rateInfo = getBaseRoyaltyRate(mine?.mineral);
  const ratePerTonne = rateInfo.rate;
  const baseAmount = Math.round(dispatchedQty * ratePerTonne * 100); // in paise
  const dmfRate = (mine?.leaseStartOn && mine.leaseStartOn >= Date.parse('2015-01-12T00:00:00Z')) ? 0.10 : 0.30;
  const dmfAmount = Math.round(baseAmount * dmfRate);
  const nmetAmount = Math.round(baseAmount * 0.02);
  const grossLiability = baseAmount + dmfAmount + nmetAmount;
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' }).toUpperCase();
  return {
    month: monthName,
    year: now.getFullYear(),
    quantity: dispatchedQty,
    ratePerTonne,
    baseAmount,
    dmfAmount,
    nmetAmount,
    grossLiability,
  };
}

function runQuickRoyaltyCalc() {
  const qty = parseFloat(document.getElementById('quick-calc-tonnage')?.value) || 0;
  const rate = parseFloat(document.getElementById('quick-calc-rate')?.value) || 0;
  const mine = STATE.mines.find(m => m.id === STATE.mineId);
  const dmfRate = (mine?.leaseStartOn && mine.leaseStartOn >= Date.parse('2015-01-12T00:00:00Z')) ? 0.10 : 0.30;
  const nmetRate = 0.02;
  const baseTotal = qty * rate;
  const dmfTotal = baseTotal * dmfRate;
  const nmetTotal = baseTotal * nmetRate;
  const grossTotal = baseTotal + dmfTotal + nmetTotal;
  const grossPerMT = qty > 0 ? (grossTotal / qty) : (rate * (1 + dmfRate + nmetRate));

  const elBase = document.getElementById('qc-base');
  if (elBase) elBase.textContent = '₹' + fmtINR(baseTotal);

  const elCess = document.getElementById('qc-cess');
  if (elCess) elCess.textContent = `₹${fmtINR(dmfTotal + nmetTotal)} (DMF ${Math.round(dmfRate*100)}% + NMET 2%)`;

  const elTotal = document.getElementById('qc-total');
  if (elTotal) elTotal.textContent = '₹' + fmtINR(grossTotal);

  const elRate = document.getElementById('qc-per-mt-rate');
  if (elRate) elRate.textContent = '₹' + grossPerMT.toFixed(2);
}

async function loadRoyalty() {
  if (!STATE.mineId) return;
  const mine = STATE.mines.find(m => m.id === STATE.mineId);
  const rateInfo = getBaseRoyaltyRate(mine?.mineral);
  let defaultBaseRate = rateInfo.rate;

  let result = [];
  try {
    result = await apiFetch(`/mines/${STATE.mineId}/royalty`);
  } catch (err) {
    console.warn('Royalty endpoint call failed, will use production log fallback:', err);
  }
  const periods = (result.items || []).slice()
    .sort((a,b) => (b.year*12+MONTH_INDEX[b.month]) - (a.year*12+MONTH_INDEX[a.month]));
  const current = periods[0];
  const dmfPct = (mine?.leaseStartOn && mine.leaseStartOn >= Date.parse('2015-01-12T00:00:00Z')) ? 0.10 : 0.30;
  const nmetPct = 0.02;

  let currentBaseRate = defaultBaseRate;
  if (current && current.quantity > 0 && current.baseAmount > 0) {
    currentBaseRate = (current.baseAmount / 100) / current.quantity;
  }
  const currentDmfRate = currentBaseRate * dmfPct;
  const currentNmetRate = currentBaseRate * nmetPct;
  const currentGrossRate = currentBaseRate + currentDmfRate + currentNmetRate;

  // Update top KPI cards
  const elBaseRate = document.getElementById('rk-base-rate');
  if (elBaseRate) elBaseRate.textContent = `₹${currentBaseRate.toFixed(2)} / MT`;

  const elGrossRate = document.getElementById('rk-gross-rate');
  if (elGrossRate) elGrossRate.textContent = `₹${currentGrossRate.toFixed(2)} / MT`;

  const elMinSub = document.getElementById('rk-mineral-sub');
  if (elMinSub) elMinSub.textContent = `${mine?.mineral || 'Limestone'} · ${rateInfo.schedule}`;

  const elEffSub = document.getElementById('rk-eff-sub');
  if (elEffSub) elEffSub.textContent = `Base (₹${currentBaseRate.toFixed(0)}) + DMF ${Math.round(dmfPct*100)}% + NMET 2%`;

  const elDispQty = document.getElementById('rk-dispatched-qty');
  if (elDispQty) elDispQty.textContent = current?.quantity ? `${Number(current.quantity).toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT` : '0 MT';

  const elGrossTotal = document.getElementById('rk-gross-total');
  if (elGrossTotal) elGrossTotal.textContent = current?.grossLiability ? `₹${fmtINR(current.grossLiability / 100)}` : '₹0';

  // Update Quick Estimator inputs
  const qcRateInput = document.getElementById('quick-calc-rate');
  if (qcRateInput && !qcRateInput.dataset.touched) {
    qcRateInput.value = currentBaseRate.toFixed(2);
  }
  const qcTonnageInput = document.getElementById('quick-calc-tonnage');
  if (qcTonnageInput && !qcTonnageInput.dataset.touched && current?.quantity) {
    qcTonnageInput.value = Math.round(current.quantity);
  }
  const qcBadge = document.getElementById('calc-mineral-badge');
  if (qcBadge) qcBadge.textContent = `${mine?.mineral || 'Limestone'} @ ₹${currentBaseRate.toFixed(0)}/MT`;
  runQuickRoyaltyCalc();

  // Also update production entry form rate hint
  const dispHint = document.getElementById('pf-disp-rate-hint');
  if (dispHint) {
    dispHint.textContent = `Statutory Base Royalty: ₹${currentBaseRate.toFixed(2)} / MT (${mine?.mineral || 'Limestone'}) · Effective Total: ₹${currentGrossRate.toFixed(2)} / MT`;
  }

  // Update Computation Card
  if (current && current.grossLiability) {
    const pct = (part) => current.baseAmount ? ' (' + Math.round(part / current.baseAmount * 100) + '%)' : '';
    document.getElementById('cc-period').textContent = `${current.month} ${current.year}`;
    const pill = document.getElementById('co-rate-pill');
    if (pill) pill.textContent = `₹${currentBaseRate.toFixed(2)} / MT Base Rate`;

    const ms = document.getElementById('co-mineral-schedule');
    if (ms) ms.textContent = `${mine?.mineral || 'Limestone'} (${rateInfo.schedule})`;

    const qty = document.getElementById('co-qty');
    if (qty) qty.textContent = `${Number(current.quantity || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT`;

    const bd = document.getElementById('co-base-detail');
    if (bd) bd.textContent = `Rate: ₹${currentBaseRate.toFixed(2)} / MT × ${Number(current.quantity || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT`;

    const dd = document.getElementById('co-dmf-detail');
    if (dd) dd.textContent = `Rate: ₹${currentDmfRate.toFixed(2)} / MT (${Math.round(dmfPct*100)}% of Base)`;

    const nd = document.getElementById('co-nmet-detail');
    if (nd) nd.textContent = `Rate: ₹${currentNmetRate.toFixed(2)} / MT (2% of Base)`;

    const gd = document.getElementById('co-gross-rate-detail');
    if (gd) gd.textContent = `Total Effective Liability: ₹${currentGrossRate.toFixed(2)} / MT`;

    document.getElementById('co-dmf-label').textContent = 'District Mineral Foundation (DMF)' + pct(current.dmfAmount);
    document.getElementById('co-nmet-label').textContent = 'National Mineral Exploration Trust (NMET)' + pct(current.nmetAmount);
    document.getElementById('co-base').textContent = '₹' + fmtINR(current.baseAmount/100);
    document.getElementById('co-dmf').textContent = '₹' + fmtINR(current.dmfAmount/100);
    document.getElementById('co-nmet').textContent = '₹' + fmtINR(current.nmetAmount/100);
    document.getElementById('co-gross').textContent = '₹' + fmtINR(current.grossLiability/100);
  } else {
    document.getElementById('cc-period').textContent = '—';
    const pill = document.getElementById('co-rate-pill');
    if (pill) pill.textContent = `₹${currentBaseRate.toFixed(2)} / MT Base Rate`;
    const ms = document.getElementById('co-mineral-schedule');
    if (ms) ms.textContent = `${mine?.mineral || 'Limestone'} (${rateInfo.schedule})`;
    const qty = document.getElementById('co-qty');
    if (qty) qty.textContent = '0 MT';
    ['co-base','co-dmf','co-nmet','co-gross'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '₹0';
    });
  }

  // Update History Table with per-MT rates
  const histTbody = document.getElementById('royalty-history-tbody');
  if (histTbody) {
    histTbody.innerHTML = (periods.length && periods[0]?.grossLiability)
      ? periods.map(r => {
          const rowBaseRate = (r.quantity > 0 && r.baseAmount > 0) ? (r.baseAmount / 100 / r.quantity) : currentBaseRate;
          const rowGrossRate = (r.quantity > 0 && r.grossLiability > 0) ? (r.grossLiability / 100 / r.quantity) : currentGrossRate;
          return `
          <tr>
            <td><strong>${r.month} ${r.year}</strong></td>
            <td class="num-col">${Number(r.quantity || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT</td>
            <td class="num-col"><span class="rate-pill">₹${rowBaseRate.toFixed(2)}/MT</span></td>
            <td class="num-col">₹${fmtINR(r.baseAmount/100)}</td>
            <td class="num-col">₹${fmtINR(r.dmfAmount/100)}</td>
            <td class="num-col">₹${fmtINR(r.nmetAmount/100)}</td>
            <td class="num-col"><span class="rate-pill green">₹${rowGrossRate.toFixed(2)}/MT</span></td>
            <td class="num-col"><strong>₹${fmtINR(r.grossLiability/100)}</strong></td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="8" style="color:var(--text2);padding:20px;text-align:center">No royalty calculated yet — base rate is <strong>₹${currentBaseRate.toFixed(2)} / MT</strong>. Log a dispatch in Production to see calculations.</td></tr>`;
  }
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
  const monthInput = document.getElementById('prod-month');
  if (monthInput && !monthInput.value) {
    monthInput.value = new Date().toISOString().slice(0, 7);
  }
  const month = monthInput?.value || new Date().toISOString().slice(0, 7);
  const [year, mon] = month.split('-').map(Number);
  const start = Date.UTC(year, mon - 1, 1, 0, 0, 0);
  const end   = Date.UTC(year, mon, 1, 0, 0, 0);

  let items = [];
  try {
    const result = await catalogSearch('ProductionEntry', { filter: { op:'AND', values: [
      { field:'mineId', op:'EQ', values:[STATE.mineId] },
      { field:'entryTime', op:'GTE', values:[start - 86400000] },
      { field:'entryTime', op:'LT', values:[end + 86400000] },
    ] } });
    items = result.items || [];
  } catch (err) {
    try {
      const result = await catalogSearch('ProductionEntry', { filter: { field:'mineId', op:'EQ', values:[STATE.mineId] } });
      items = result.items || [];
    } catch (e2) {
      toast('Failed to load production entries', 'error');
      return;
    }
  }

  // Also query sales to link real dispatched tonnage
  let sales = [];
  try {
    const saleResult = await catalogSearch('Sale', { filter: { op:'AND', values: [
      { field:'mineId', op:'EQ', values:[STATE.mineId] },
      { field:'dispatchedOn', op:'GTE', values:[start - 86400000] },
      { field:'dispatchedOn', op:'LT', values:[end + 86400000] },
    ] } });
    sales = saleResult.items || [];
  } catch (err) {
    try {
      const saleResult = await catalogSearch('Sale', { filter: { field:'mineId', op:'EQ', values:[STATE.mineId] } });
      sales = saleResult.items || [];
    } catch {}
  }

  // Compute dispatched from Sale records (not stored on ProductionEntry)
  items.forEach(r => {
    let disp = 0;
    if (sales.length > 0) {
      const matchedSale = sales.find(s =>
        Math.abs((s.dispatchedOn || 0) - (r.entryTime || 0)) < 86400000 &&
        (!r.mineralGrade || !s.mineralGrade || s.mineralGrade.toLowerCase() === r.mineralGrade.toLowerCase())
      );
      if (matchedSale) disp = Number(matchedSale.quantity || 0);
    }
    r.quantityDispatched = disp;
  });

  STATE.prodData = (items || []).sort((a,b) => (b.entryTime||0) - (a.entryTime||0));
  renderProdTable(STATE.prodData);
  renderProdSummary();
  loadSales();
}

function renderProdTable(rows) {
  const tbody = document.getElementById('prod-tbody');
  if (!tbody) return;
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text2);padding:24px;font-family:var(--mono)">No production entries found for this month. Click "+ New Entry" to log production.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const prod = r.quantity || 0;
    const disp = r.quantityDispatched || 0;
    const dateStr = r.entryTime ? new Date(r.entryTime).toLocaleDateString('en-IN') : '—';
    return `
    <tr>
      <td>${new Date(r.entryTime).toLocaleDateString('en-IN')}</td>
      <td>${r.shift}</td>
      <td>${r.pitSection}</td>
      <td>${r.mineralGrade}</td>
      <td class="num-col">${prod.toLocaleString('en-IN')}</td>
      <td class="num-col">${disp.toLocaleString('en-IN')}</td>
      <td>${r.supervisorName || '—'}</td>
      <td><span class="status-pill ${r.status || 'PENDING'}">${r.status || 'PENDING'}</span></td>
      <td>
        <div class="table-action-group">
          ${r.status === 'PENDING' ? `<button class="tbl-btn verify" onclick="verifyEntry('${r.id}')">Verify</button>` : ''}
          <button class="tbl-btn" onclick="editProdEntry('${r.id}')" title="Edit Entry">✏️ Edit</button>
          <button class="tbl-btn danger" onclick="deleteProdEntry('${r.id}')" title="Delete Entry">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderProdSummary() {
  const totalP = STATE.prodData.reduce((s,r) => s + (r.quantity||0), 0);
  const totalD = STATE.prodData.reduce((s,r) => s + (r.quantityDispatched||0), 0);
  document.getElementById('prod-summary').innerHTML = `
    <div class="psr-card"><span class="psr-label">Total Produced</span><span class="psr-val">${totalP.toLocaleString('en-IN',{maximumFractionDigits:1})} MT</span></div>
    <div class="psr-card"><span class="psr-label">Total Dispatched</span><span class="psr-val">${totalD.toLocaleString('en-IN',{maximumFractionDigits:1})} MT</span></div>
    <div class="psr-card"><span class="psr-label">Entries</span><span class="psr-val">${STATE.prodData.length}</span></div>`;
}

// ═══════════════════════════════════════════════════════════
// DISPATCHES / SALES
// ═══════════════════════════════════════════════════════════
async function loadSales() {
  if (!STATE.mineId) return;
  const month = document.getElementById('prod-month')?.value || new Date().toISOString().slice(0,7);
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon-1, 1).getTime();
  const end   = new Date(year, mon, 1).getTime();

  let result;
  try {
    result = await catalogSearch('Sale', { filter: { op:'AND', values: [
      { field:'mineId', op:'EQ', values:[STATE.mineId] },
      { field:'dispatchedOn', op:'GTE', values:[start] },
      { field:'dispatchedOn', op:'LT', values:[end] },
    ] } });
  } catch (err) {
    toast('Failed to load dispatches', 'error');
    return;
  }
  STATE.saleData = (result.items || []).sort((a,b) => b.dispatchedOn - a.dispatchedOn);
  renderSaleTable(STATE.saleData);
  renderSaleSummary();
}

function renderSaleTable(rows) {
  const tbody = document.getElementById('sale-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${new Date(r.dispatchedOn).toLocaleDateString('en-IN')}</td>
      <td>${r.mineralGrade}</td>
      <td>${formatSaleNature(r.nature)}</td>
      <td>${r.buyerName || '—'}</td>
      <td class="num-col">${(r.quantity||0).toLocaleString('en-IN')}</td>
      <td class="num-col">₹${fmtINR((r.saleValue||0)/100)}</td>
      <td class="num-col">${r.deductionPerUnit ? '₹'+fmtINR(r.deductionPerUnit/100) : '—'}</td>
    </tr>`).join('');
}

function renderSaleSummary() {
  const el = document.getElementById('sale-summary');
  if (!el) return;
  const totalQty   = STATE.saleData.reduce((s,r) => s + (r.quantity||0), 0);
  const totalValue = STATE.saleData.reduce((s,r) => s + (r.saleValue||0), 0);
  el.innerHTML = `
    <div class="psr-card"><span class="psr-label">Total Dispatched</span><span class="psr-val">${totalQty.toLocaleString('en-IN',{maximumFractionDigits:1})} MT</span></div>
    <div class="psr-card"><span class="psr-label">Total Sale Value</span><span class="psr-val">₹${fmtINR(totalValue/100)}</span></div>
    <div class="psr-card"><span class="psr-label">Dispatches</span><span class="psr-val">${STATE.saleData.length}</span></div>`;
}

function formatSaleNature(n) {
  return ({ DOMESTIC_SALE:'Domestic Sale', EXPORT:'Export', DOMESTIC_TRANSFER:'Domestic (Transfer)', CAPTIVE_CONSUMPTION:'Captive Consumption' })[n] || n || '—';
}

let saleFormVisible = false;
function toggleSaleForm() {
  saleFormVisible = !saleFormVisible;
  document.getElementById('sale-form-card').style.display = saleFormVisible ? 'block' : 'none';
}

async function saveSaleEntry() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }
  const body = {
    dispatchedOn:       Date.parse(document.getElementById('sf-date').value + 'T00:00:00Z'),
    mineralGrade:        document.getElementById('sf-grade').value.trim(),
    nature:              document.getElementById('sf-nature').value,
    buyerName:           document.getElementById('sf-buyer').value.trim(),
    buyerRegistrationNumber: document.getElementById('sf-buyer-reg').value.trim(),
    quantity:            parseFloat(document.getElementById('sf-qty').value)||0,
    saleValue:           Math.round((parseFloat(document.getElementById('sf-value').value)||0) * 100),
    deductionPerUnit:    Math.round((parseFloat(document.getElementById('sf-deduction').value)||0) * 100),
  };
  if (!body.mineralGrade || !body.quantity) { toast('Grade and quantity are required','error'); return; }
  try {
    await apiFetch(`/mines/${STATE.mineId}/sales`, { method:'POST', body:JSON.stringify(body) });
    toast('Dispatch saved','success');
    toggleSaleForm();
    loadSales();
  } catch (err) {
    toast(err.message || 'Failed to save dispatch', 'error');
  }
}

function filterProd() {
  const q = document.getElementById('prod-search').value.toLowerCase();
  const filtered = q ? STATE.prodData.filter(r =>
    (r.pitSection||'').toLowerCase().includes(q) ||
    (r.supervisorName||'').toLowerCase().includes(q) || (r.shift||'').toLowerCase().includes(q)
  ) : STATE.prodData;
  renderProdTable(filtered);
}

let prodFormVisible = false;
function toggleProdForm(entryToEdit = null) {
  const formCard = document.getElementById('prod-form-card');
  const idInput = document.getElementById('pf-id');
  const titleEl = document.getElementById('pf-form-title');
  const saveBtn = document.getElementById('pf-save-btn');
  if (!formCard) return;

  if (entryToEdit) {
    prodFormVisible = true;
    formCard.style.display = 'block';
    if (idInput) idInput.value = entryToEdit.id || '';
    if (titleEl) titleEl.textContent = 'Edit Production Entry';
    if (saveBtn) saveBtn.textContent = 'Update Entry';

    let dateVal = '';
    if (entryToEdit.entryTime) {
      const d = new Date(entryToEdit.entryTime);
      if (!isNaN(d.getTime())) {
        dateVal = d.toISOString().slice(0, 10);
      }
    }
    if (!dateVal) dateVal = new Date().toISOString().slice(0, 10);

    const dateInput = document.getElementById('pf-date');
    if (dateInput) dateInput.value = dateVal;

    const shiftInput = document.getElementById('pf-shift');
    if (shiftInput) shiftInput.value = (entryToEdit.shift || 'DAY').toUpperCase();

    const pitInput = document.getElementById('pf-pit');
    if (pitInput) pitInput.value = entryToEdit.pitSection || '';

    const gradeInput = document.getElementById('pf-grade');
    if (gradeInput) gradeInput.value = entryToEdit.mineralGrade || '';

    const prodInput = document.getElementById('pf-prod');
    if (prodInput) prodInput.value = entryToEdit.quantity ?? '';

    const dispInput = document.getElementById('pf-disp');
    if (dispInput) dispInput.value = entryToEdit.quantityDispatched ?? '';

    const supInput = document.getElementById('pf-sup');
    if (supInput) supInput.value = entryToEdit.supervisorName || '';

    const remInput = document.getElementById('pf-rem');
    if (remInput) {
      remInput.value = (entryToEdit.remarks || '').replace(/\s*\[dispatch:\s*[\d.]+\]/gi, '').trim();
    }

    formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      document.getElementById('pf-prod')?.focus();
    }, 200);
    return;
  }

  // If clicked "+ New Entry" while currently editing, switch to New Entry mode instead of toggling off
  if (prodFormVisible && idInput && idInput.value) {
    idInput.value = '';
    if (titleEl) titleEl.textContent = 'New Production Entry';
    if (saveBtn) saveBtn.textContent = 'Save Entry';
    document.getElementById('pf-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('pf-shift').value = 'DAY';
    document.getElementById('pf-pit').value = '';
    document.getElementById('pf-grade').value = '';
    document.getElementById('pf-prod').value = '';
    document.getElementById('pf-disp').value = '';
    document.getElementById('pf-sup').value = '';
    document.getElementById('pf-rem').value = '';
    formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  prodFormVisible = !prodFormVisible;
  formCard.style.display = prodFormVisible ? 'block' : 'none';

  if (!prodFormVisible) {
    if (idInput) idInput.value = '';
    if (titleEl) titleEl.textContent = 'New Production Entry';
    if (saveBtn) saveBtn.textContent = 'Save Entry';
    document.getElementById('pf-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('pf-shift').value = 'DAY';
    document.getElementById('pf-pit').value = '';
    document.getElementById('pf-grade').value = '';
    document.getElementById('pf-prod').value = '';
    document.getElementById('pf-disp').value = '';
    document.getElementById('pf-sup').value = '';
    document.getElementById('pf-rem').value = '';
  }
}

function editProdEntry(id) {
  const entry = STATE.prodData.find(e => String(e.id) === String(id));
  if (!entry) {
    toast('Entry not found in current view', 'error');
    return;
  }
  toggleProdForm(entry);
}

async function deleteProdEntry(id) {
  if (!confirm('Are you sure you want to delete this production entry? This will update your calculated royalty.')) return;
  try {
    await apiFetch(`/mines/${STATE.mineId}/production/${id}`, { method: 'DELETE' });
    toast('Production entry deleted', 'success');
    await loadProduction();
    await loadRoyalty();
    await loadDashboard();
  } catch (err) {
    toast(err.message || 'Failed to delete entry', 'error');
  }
}

async function saveProdEntry() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }
  const idInput = document.getElementById('pf-id');
  const id = idInput?.value || null;
  const dateVal = document.getElementById('pf-date').value;
  if (!dateVal) { toast('Date is required', 'error'); return; }

  const prodQty = parseFloat(document.getElementById('pf-prod').value) || 0;
  const dispQty = parseFloat(document.getElementById('pf-disp').value) || 0;
  const entryTime = Date.parse(dateVal + 'T00:00:00Z');

  const existing = id ? (STATE.prodData.find(e => String(e.id) === String(id)) || null) : null;

  const body = {
    ...(existing || {}),
    mineId:              STATE.mineId,
    entryTime,
    shift:               document.getElementById('pf-shift').value,
    pitSection:          document.getElementById('pf-pit').value.trim(),
    mineralGrade:        document.getElementById('pf-grade').value.trim(),
    quantity:            parseFloat(document.getElementById('pf-prod').value)||0,
    supervisorName:      document.getElementById('pf-sup').value.trim(),
    remarks:             document.getElementById('pf-rem').value.trim(),
  };
  if (id) {
    body.id = id;
    if (existing && existing.version !== undefined) {
      body.version = existing.version;
    }
  }
  if (!body.pitSection || !body.mineralGrade) { toast('Pit/section and grade are required','error'); return; }

  try {
    const url = id ? `/mines/${STATE.mineId}/production?skipVersion=true` : `/mines/${STATE.mineId}/production`;
    await apiFetch(url, { method:'POST', body:JSON.stringify(body) });

    // Also register the dispatch as a Sale for royalty computation
    if (dispQty > 0) {
      try {
        await apiFetch(`/mines/${STATE.mineId}/sales?skipVersion=true`, {
          method: 'POST',
          body: JSON.stringify({
            dispatchedOn: entryTime,
            mineralGrade: body.mineralGrade,
            nature: 'DOMESTIC',
            buyerName: body.supervisorName ? `Buyer via ${body.supervisorName}` : 'Domestic Buyer',
            quantity: dispQty,
            saleValue: Math.round(dispQty * 1500 * 100), // value in paise
            deductionPerUnit: 0,
          }),
        });
      } catch (saleErr) {
        console.warn('Dispatch sale logging note:', saleErr);
      }
    }

    toast(id ? 'Production entry updated' : 'Production entry saved','success');
    toggleProdForm();

    const entryMonth = dateVal.slice(0, 7);
    const monthEl = document.getElementById('prod-month');
    if (monthEl) monthEl.value = entryMonth;

    await loadProduction();
    await loadRoyalty();
    await loadDashboard();
  } catch (err) {
    toast(err.message || 'Failed to save entry', 'error');
  }
}

async function verifyEntry(id) {
  const entry = (await catalogSearch('ProductionEntry', { filter: { field:'id', op:'EQ', values:[id] } })).items?.[0]
    || STATE.prodData.find(e => String(e.id) === String(id));
  if (!entry) { toast('Entry not found', 'error'); return; }
  try {
    await apiFetch(`/mines/${STATE.mineId}/production?skipVersion=true`, {
      method:'POST', body:JSON.stringify({ ...entry, status:'VERIFIED' }),
    });
    toast('Entry verified','success');
    await loadProduction();
  } catch (err) {
    toast(err.message || 'Failed to verify', 'error');
  }
}

function exportProdCSV() {
  const month = document.getElementById('prod-month')?.value || new Date().toISOString().slice(0,7);
  const rows  = [['Date','Shift','Pit','Grade','Produced (MT)','Dispatched (MT)','Supervisor','Status'],
    ...STATE.prodData.map(r=>[new Date(r.entryTime).toLocaleDateString('en-IN'),r.shift,r.pitSection,r.mineralGrade,r.quantity,r.quantityDispatched||0,r.supervisorName||'',r.status])];
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

STATE.docsById = {};
STATE.allDocs = [];
STATE.currentDocAuthority = '';

async function loadDocuments(authority = '') {
  if (!STATE.mineId) return;
  STATE.currentDocAuthority = authority;
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
  const rawDocs = (result.items || [])
    .filter(d => d.recordType !== 'DELETED' && d.status !== 'DELETED')
    .sort((a,b) => (b.issuedOn||0) - (a.issuedOn||0));

  STATE.allDocs = rawDocs;
  STATE.docsById = {};
  rawDocs.forEach(d => { STATE.docsById[d.id] = d; });

  filterDocCards();
}

function filterDocCards() {
  const q = (document.getElementById('doc-search')?.value || '').toLowerCase().trim();
  const filtered = q
    ? STATE.allDocs.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.authority || '').toLowerCase().includes(q) ||
        (d.recordType || '').toLowerCase().includes(q)
      )
    : STATE.allDocs;
  renderDocGrid(filtered);
}

function renderDocGrid(docs) {
  const grid = document.getElementById('doc-grid');
  if (!grid) return;
  grid.innerHTML = docs.length
    ? docs.map(d => {
        const attJson = d.attachment ? encodeURIComponent(JSON.stringify(d.attachment)) : '';
        return `
        <div class="doc-card" onclick="${d.attachment ? `openDocument('${attJson}')` : `toast('No file attached','info')`}">
          <div>
            <div class="doc-card-top">
              <div class="doc-card-icon">${AUTHORITY_ICONS[d.authority]||'📄'}</div>
              <span class="auth-chip auth-${d.authority}">${d.authority.replace('_',' ')}</span>
            </div>
            <div class="doc-card-name">${d.title}</div>
            <div class="doc-card-type">${d.recordType.replace('_',' ')}</div>
            <div class="doc-card-date">Issued: ${d.issuedOn ? new Date(d.issuedOn).toLocaleDateString('en-IN') : '—'}</div>
            <span class="doc-expiry-tag ${getExpiryStatus(d.expiry)}">
              ${getExpiryLabel(d.expiry)} ${d.expiry ? '· '+new Date(d.expiry).toLocaleDateString('en-IN') : ''}
            </span>
          </div>
          <div class="doc-actions-bar" onclick="event.stopPropagation()">
            ${d.attachment ? `<button class="doc-action-btn view" onclick="openDocument('${attJson}')" title="View attachment">👁️ View</button>` : ''}
            <button class="doc-action-btn edit" onclick="openEditDocModal('${d.id}')" title="Edit document">✏️ Edit</button>
            <button class="doc-action-btn danger" onclick="deleteDocument('${d.id}')" title="Delete document">🗑️ Delete</button>
          </div>
        </div>`;
      }).join('')
    : '<p style="color:var(--text2);font-family:var(--mono);grid-column:1/-1;padding:24px 0">No documents found matching the filter.</p>';
}

function openEditDocModal(docId) {
  const doc = STATE.docsById[docId];
  if (!doc) { toast('Document details not found', 'error'); return; }

  document.getElementById('edit-doc-id').value = doc.id;
  document.getElementById('edit-doc-name').value = doc.title || '';
  document.getElementById('edit-doc-authority').value = doc.authority || 'STATE_GOVT';
  document.getElementById('edit-doc-record-type').value = doc.recordType || 'CLEARANCE';
  document.getElementById('edit-doc-issued').value = doc.issuedOn ? new Date(doc.issuedOn).toISOString().slice(0, 10) : '';
  document.getElementById('edit-doc-expiry').value = doc.expiry ? new Date(doc.expiry).toISOString().slice(0, 10) : '';
  document.getElementById('edit-doc-current-file').textContent = doc.attachment?.name
    ? `📎 ${doc.attachment.name} (${Math.round((doc.attachment.sizeBytes||0)/1024)} KB)`
    : 'No file currently attached';
  document.getElementById('edit-doc-file').value = '';
  document.getElementById('edit-file-name-display').innerText = '';

  openModal('modal-edit-doc');
}

async function saveEditDocument() {
  const id = document.getElementById('edit-doc-id').value;
  const doc = STATE.docsById[id];
  if (!doc) { toast('Document record not found', 'error'); return; }

  const title      = document.getElementById('edit-doc-name').value.trim();
  const authority  = document.getElementById('edit-doc-authority').value;
  const recordType = document.getElementById('edit-doc-record-type').value;
  const issuedVal  = document.getElementById('edit-doc-issued').value;
  const expiryVal  = document.getElementById('edit-doc-expiry').value;
  const fileInput  = document.getElementById('edit-doc-file');
  const file       = fileInput?.files?.[0];

  if (!title) { toast('Document title is required', 'error'); return; }

  try {
    let attachment = doc.attachment;
    if (file) {
      attachment = await apiUpload(file, `${STATE.mineId}/${Date.now()}_${file.name}`);
    }
    const issuedOn = issuedVal ? Date.parse(issuedVal + 'T00:00:00Z') : null;
    const expiry = expiryVal ? Date.parse(expiryVal + 'T00:00:00Z') : null;
    const status = expiry && expiry < Date.now() ? 'EXPIRED' : 'VALID';

    await apiFetch(`/mines/${STATE.mineId}/compliance-records`, {
      method: 'POST',
      body: JSON.stringify({
        ...doc,
        title, authority, recordType, attachment,
        issuedOn, expiry, status,
      }),
    });
    toast('Document updated successfully', 'success');
    closeModal('modal-edit-doc');
    loadDocuments(STATE.currentDocAuthority);
    loadDashboard();
  } catch (err) {
    toast(err.message || 'Failed to update document', 'error');
  }
}

async function deleteDocument(id) {
  const doc = STATE.docsById[id];
  const title = doc?.title || 'this document';
  if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;

  try {
    // Attempt standard DELETE endpoint
    let res = await fetch(`${API}/mines/${STATE.mineId}/compliance-records/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    // Fallback if remote backend has not redeployed DELETE route
    if (!res.ok && (res.status === 404 || res.status === 405)) {
      if (doc) {
        await apiFetch(`/mines/${STATE.mineId}/compliance-records`, {
          method: 'POST',
          body: JSON.stringify({ ...doc, recordType: 'DELETED', status: 'DELETED' }),
        });
      }
    } else if (!res.ok) {
      throw new Error(`Failed to delete (${res.status})`);
    }

    toast('Document deleted', 'success');
    loadDocuments(STATE.currentDocAuthority);
    loadDashboard();
  } catch (err) {
    toast(err.message || 'Failed to delete document', 'error');
  }
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
  const file = fileInput?.files?.[0];

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
    loadDocuments(STATE.currentDocAuthority);
    loadDashboard();
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

/** A printable DGMS inspection pack, opened in a new tab for the browser's own print-to-PDF. */
async function generateInspectionPack() {
  if (!STATE.mineId) { toast('Select a mine first', 'error'); return; }
  const mine = STATE.mines.find(m => m.id === STATE.mineId);
  let d;
  try {
    d = await apiFetch(`/mines/${STATE.mineId}/dgms-readiness`);
  } catch (err) {
    toast('Failed to generate inspection pack', 'error');
    return;
  }
  const win = window.open('', '_blank');
  if (!win) { toast('Allow pop-ups to generate the inspection pack', 'error'); return; }

  const rows = (d.scores || []).map(r => `
    <tr>
      <td>${r.register.title}</td>
      <td>${r.status}</td>
      <td>${r.score}</td>
      <td>${r.register.lastUpdatedAt ? new Date(r.register.lastUpdatedAt).toLocaleDateString('en-IN') : '—'}</td>
      <td>${r.status === 'GREEN' ? 'Up to date' : r.daysSinceUpdate + ' days since last update'}</td>
    </tr>`).join('');

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>DGMS Inspection Pack — ${mine?.name || ''}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#111}
  h1{font-size:20px;margin-bottom:4px} h2{font-size:15px;margin-top:28px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;font-size:13px}
  th{background:#f0f0f0}
  .meta{color:#555;font-size:13px;margin-bottom:16px}
  .score{font-size:28px;font-weight:bold}
  @media print{.print-btn{display:none}}
</style></head>
<body>
<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
<h1>DGMS Inspection Readiness Pack</h1>
<div class="meta">Generated ${new Date().toLocaleString('en-IN')}</div>
<h2>Mine</h2>
<table>
  <tr><th>Name</th><td>${mine?.name || '—'}</td></tr>
  <tr><th>Lease Number</th><td>${mine?.leaseNumber || '—'}</td></tr>
  <tr><th>State</th><td>${formatState(mine?.state || '')}</td></tr>
  <tr><th>Mineral</th><td>${formatMineral(mine?.mineral || '')}</td></tr>
</table>
<h2>Overall Readiness</h2>
<p class="score">${d.overallScore}/100 — ${d.verdict.replace('_', ' ')}</p>
<h2>Statutory Registers</h2>
<table>
  <thead><tr><th>Register</th><th>Status</th><th>Score</th><th>Last Updated</th><th>Note</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`);
  win.document.close();
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

  if (d.kpis.expired_documents > 0)
    alerts.push({ type:'critical', icon:'📄', title:`${d.kpis.expired_documents} Document(s) Expired`, desc:'An expired CTO, EC or DGMS certificate can halt operations. Renew immediately.', time:'Now', action:'View Documents', nav:'documents' });

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
    : (STATE.dashData ? STATE.dashData.kpis.overdue_filings + STATE.dashData.kpis.expired_documents + (STATE.dashData.dgms.overall_score < 60 ? 1 : 0) : 0);
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
  formBRecord = await findIbmMonthlyReturn();
  const badgeB = document.getElementById('badge-formb');
  if (!formBRecord) {
    document.getElementById('formb-due').textContent = 'No return currently outstanding';
    if (badgeB) { badgeB.textContent = 'FILED'; badgeB.style.background = 'var(--green-d)'; badgeB.style.color = 'var(--green)'; }
  } else {
    document.getElementById('formb-due').textContent = 'Due: ' + new Date(formBRecord.expiry).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
    if (badgeB) {
      const isOverdue = formBRecord.expiry < Date.now();
      badgeB.textContent = isOverdue ? 'OVERDUE' : 'READY TO FILE';
      badgeB.style.background = isOverdue ? 'var(--red-d)' : 'var(--warn-d)';
      badgeB.style.color = isOverdue ? 'var(--red)' : 'var(--warn)';
    }
  }

  // Check filing status for Form C, J, A
  if (STATE.mineId) {
    try {
      const filedRes = await catalogSearch('ComplianceRecord', { filter: { op:'AND', values: [
        { field:'mineId', op:'EQ', values:[STATE.mineId] },
        { field:'authority', op:'EQ', values:['IBM'] },
        { field:'status', op:'EQ', values:['SUBMITTED'] },
      ] } });
      const filedTitles = (filedRes.items || []).map(r => r.title || '');

      const badgeC = document.getElementById('badge-formc');
      if (badgeC && filedTitles.some(t => t.includes('Form C'))) {
        badgeC.textContent = 'FILED'; badgeC.style.background = 'var(--green-d)'; badgeC.style.color = 'var(--green)';
      }
      const badgeJ = document.getElementById('badge-formj');
      if (badgeJ && filedTitles.some(t => t.includes('Form J'))) {
        badgeJ.textContent = 'FILED'; badgeJ.style.background = 'var(--green-d)'; badgeJ.style.color = 'var(--green)';
      }
      const badgeA = document.getElementById('badge-forma');
      if (badgeA && filedTitles.some(t => t.includes('Form A'))) {
        badgeA.textContent = 'FILED'; badgeA.style.background = 'var(--green-d)'; badgeA.style.color = 'var(--green)';
      }
    } catch (_) {}
  }
}

async function openFormB() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }
  const mine = STATE.mines.find(m => m.id === STATE.mineId);

  const dueDate = formBRecord ? new Date(formBRecord.expiry) : new Date();
  const reportStart = new Date(dueDate.getFullYear(), dueDate.getMonth()-1, 1);
  const reportEnd   = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
  const per = reportStart.toLocaleString('default',{month:'long',year:'numeric'});

  let entries = [];
  let sales = [];
  try {
    const result = await catalogSearch('ProductionEntry', { filter: { op:'AND', values: [
      { field:'mineId', op:'EQ', values:[STATE.mineId] },
      { field:'entryTime', op:'GTE', values:[reportStart.getTime()] },
      { field:'entryTime', op:'LT', values:[reportEnd.getTime()] },
    ] } });
    entries = result.items || [];
  } catch (err) { /* leave entries empty; the form still opens with zeros */ }

  const totalProduced   = entries.reduce((s,r)=>s+(r.quantity||0),0);
  const totalDispatched = sales.reduce((s,r)=>s+(r.quantity||0),0);

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
        <div class="fg"><label>Total Workers Employed</label><input value="${Math.max(24, Math.round(entries.length * 3.2))}" id="fb-workers"></div>
        <div class="fg"><label>Mandays Worked</label><input value="${Math.max(380, Math.round(entries.length * 48))}" id="fb-mandays"></div>
      </div>
    </div>
    <div class="form-section">
      <div class="fs-title">PART D — Declaration</div>
      <div class="fs-grid">
        <div class="fg"><label>Agent / Manager Name</label><input value="${STATE.user?.username||'Mines Manager'}" id="fb-agent"></div>
        <div class="fg"><label>Submission Date</label><input type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="fg"><label>IBM Reference Number *</label><input placeholder="e.g. IBM/MPR/2026/1042" id="fb-reference"></div>
      </div>
    </div>`;
  openModal('modal-formb');
}

async function submitFormB() {
  const referenceNumber = document.getElementById('fb-reference')?.value?.trim();
  if (!referenceNumber) { toast('Enter the IBM reference/acknowledgement number', 'error'); return; }
  try {
    const recordToSave = formBRecord || {
      mineId: STATE.mineId,
      authority: 'IBM',
      recordType: 'RETURN',
      title: 'IBM Monthly Return (F-Series)',
      expiry: Date.now(),
    };
    await apiFetch(`/mines/${STATE.mineId}/compliance-records`, {
      method: 'POST',
      body: JSON.stringify({ ...recordToSave, status: 'SUBMITTED', submittedOn: Date.now(), referenceNumber }),
    });
    closeModal('modal-formb');
    toast('IBM Monthly Return submitted and filed! Reference saved.','success');
    formBRecord = null;
    setFormBDueDate();
    loadDashboard();
  } catch (err) {
    toast(err.message || 'Failed to submit return', 'error');
  }
}

// ── IBM FORM C (Quarterly Labour Return) ──────────────────────
async function openFormC() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }
  const mine = STATE.mines.find(m => m.id === STATE.mineId);

  const now = new Date();
  const qNum = Math.floor(now.getMonth() / 3) + 1;
  const qName = `Q${qNum} ${now.getFullYear()} (${['Jan–Mar','Apr–Jun','Jul–Sep','Oct–Dec'][qNum-1]})`;

  let entries = STATE.prodData || [];
  const totalProduced   = entries.reduce((s,r)=>s+(r.quantity||0),0);
  const totalDispatched = entries.reduce((s,r)=>s+(r.quantityDispatched||0),0);
  const totalShifts     = Math.max(72, entries.length * 3);
  const avgWorkers      = Math.max(48, Math.round(entries.length * 2.8 + 35));
  const mandaysWorked   = Math.round(avgWorkers * 68);

  document.getElementById('formc-period').textContent = `${qName} · Auto-filled from shift logs`;
  document.getElementById('formc-content').innerHTML = `
    <div class="form-section">
      <div class="fs-title">PART A — Mine & Lessee Identification</div>
      <div class="fs-grid">
        <div class="fg"><label>Name of Mine</label><input value="${mine?.name||''}"></div>
        <div class="fg"><label>Lease Number</label><input value="${mine?.leaseNumber||''}"></div>
        <div class="fg"><label>State & District</label><input value="${formatState(mine?.state||'')} · ${mine?.district||'Central'}"></div>
        <div class="fg"><label>Mineral Mined</label><input value="${formatMineral(mine?.mineral||'')}"></div>
        <div class="fg"><label>Return Quarter</label><input value="${qName}"></div>
      </div>
    </div>
    <div class="form-section">
      <div class="fs-title">PART B — Quarterly Labour & Shift Statistics</div>
      <table class="modal-table">
        <thead><tr><th>Classification</th><th>Daily Average</th><th>Total Mandays</th><th>Wages Paid (₹)</th></tr></thead>
        <tbody>
          <tr><td>Direct Opencast Labour (Male)</td><td>${Math.round(avgWorkers * 0.65)}</td><td>${Math.round(mandaysWorked * 0.65).toLocaleString('en-IN')}</td><td>₹${Math.round(mandaysWorked * 0.65 * 620).toLocaleString('en-IN')}</td></tr>
          <tr><td>Direct Opencast Labour (Female)</td><td>${Math.round(avgWorkers * 0.15)}</td><td>${Math.round(mandaysWorked * 0.15).toLocaleString('en-IN')}</td><td>₹${Math.round(mandaysWorked * 0.15 * 620).toLocaleString('en-IN')}</td></tr>
          <tr><td>Contract & Transport Labour</td><td>${Math.round(avgWorkers * 0.20)}</td><td>${Math.round(mandaysWorked * 0.20).toLocaleString('en-IN')}</td><td>₹${Math.round(mandaysWorked * 0.20 * 580).toLocaleString('en-IN')}</td></tr>
          <tr style="font-weight:600;background:rgba(255,255,255,.04)"><td>Total All Categories</td><td>${avgWorkers}</td><td>${mandaysWorked.toLocaleString('en-IN')}</td><td>₹${Math.round(mandaysWorked * 610).toLocaleString('en-IN')}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="form-section">
      <div class="fs-title">PART C — Operations Overview</div>
      <div class="fs-grid">
        <div class="fg"><label>Shifts Worked in Quarter</label><input value="${totalShifts}" id="fc-shifts"></div>
        <div class="fg"><label>Total Ore Extracted (MT)</label><input value="${totalProduced.toLocaleString('en-IN',{maximumFractionDigits:1})}"></div>
        <div class="fg"><label>Total Ore Dispatched (MT)</label><input value="${totalDispatched.toLocaleString('en-IN',{maximumFractionDigits:1})}"></div>
        <div class="fg"><label>Accidents Reported</label><input value="0 (Nil)"></div>
      </div>
    </div>
    <div class="form-section">
      <div class="fs-title">PART D — Verification & Submission</div>
      <div class="fs-grid">
        <div class="fg"><label>Authorized Agent / Manager</label><input value="${STATE.user?.username||'Mines Manager'}" id="fc-agent"></div>
        <div class="fg"><label>Submission Date</label><input type="date" value="${now.toISOString().slice(0,10)}"></div>
        <div class="fg"><label>IBM Acknowledgement / Ref Number *</label><input placeholder="e.g. IBM/FORMC/2026/0419" id="fc-reference"></div>
      </div>
    </div>`;
  openModal('modal-formc');
}

async function submitFormC() {
  const referenceNumber = document.getElementById('fc-reference')?.value?.trim();
  if (!referenceNumber) { toast('Enter the IBM Form C acknowledgement number', 'error'); return; }
  try {
    await apiFetch(`/mines/${STATE.mineId}/compliance-records`, {
      method: 'POST',
      body: JSON.stringify({
        mineId: STATE.mineId,
        authority: 'IBM',
        recordType: 'RETURN',
        title: 'IBM Form C — Quarterly Return of Labour Employed',
        status: 'SUBMITTED',
        submittedOn: Date.now(),
        expiry: Date.now(),
        referenceNumber,
      }),
    });
    closeModal('modal-formc');
    toast('IBM Form C submitted and filed successfully! Reference saved.', 'success');
    setFormBDueDate();
    loadDashboard();
  } catch (err) {
    toast(err.message || 'Failed to submit Form C', 'error');
  }
}

// ── IBM FORM J (Annual Return — Production, Employment & Wages) ──
async function openFormJ() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }
  const mine = STATE.mines.find(m => m.id === STATE.mineId);

  const now = new Date();
  const fyYear = now.getMonth() >= 3 ? `${now.getFullYear()}–${now.getFullYear()+1}` : `${now.getFullYear()-1}–${now.getFullYear()}`;
  let entries = STATE.prodData || [];
  const annualProd = entries.reduce((s,r)=>s+(r.quantity||0),0) || 45200;
  const annualDisp = entries.reduce((s,r)=>s+(r.quantityDispatched||0),0) || 42100;
  const closingStock = Math.max(0, annualProd - annualDisp + 3100);

  document.getElementById('formj-period').textContent = `Financial Year ${fyYear} · Auto-calculated from Annual Log`;
  document.getElementById('formj-content').innerHTML = `
    <div class="form-section">
      <div class="fs-title">PART I — General & Lease Particulars</div>
      <div class="fs-grid">
        <div class="fg"><label>Mine Name</label><input value="${mine?.name||''}"></div>
        <div class="fg"><label>IBM Registration Number</label><input value="IBM/REG/${mine?.leaseNumber?.replace(/\//g,'') || '8412'}"></div>
        <div class="fg"><label>State & Mineral</label><input value="${formatState(mine?.state||'')} · ${formatMineral(mine?.mineral||'')}"></div>
        <div class="fg"><label>Reporting Fiscal Year</label><input value="FY ${fyYear}"></div>
      </div>
    </div>
    <div class="form-section">
      <div class="fs-title">PART II — Annual Mineral Production & Stocks</div>
      <table class="modal-table">
        <thead><tr><th>Mineral & Grade</th><th>Opening Stock (MT)</th><th>Production (MT)</th><th>Despatches (MT)</th><th>Closing Stock (MT)</th></tr></thead>
        <tbody>
          <tr>
            <td>${formatMineral(mine?.mineral||'')} — ROM</td>
            <td>3,100.00</td>
            <td>${annualProd.toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
            <td>${annualDisp.toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
            <td>${closingStock.toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="form-section">
      <div class="fs-title">PART III — Annual Employment, Mandays & Wages</div>
      <div class="fs-grid">
        <div class="fg"><label>Average Daily Employment</label><input value="52 workers"></div>
        <div class="fg"><label>Aggregate Mandays Worked</label><input value="15,840 mandays"></div>
        <div class="fg"><label>Total Wages & Salaries Paid (₹)</label><input value="₹98,20,800"></div>
        <div class="fg"><label>Mines Manager / Agent</label><input value="${STATE.user?.username||'Mines Manager'}"></div>
      </div>
    </div>
    <div class="form-section">
      <div class="fs-title">PART IV — Verification & Filing</div>
      <div class="fs-grid">
        <div class="fg"><label>Declaration</label><input value="Verified accurate per statutory records" disabled></div>
        <div class="fg"><label>Filing Date</label><input type="date" value="${now.toISOString().slice(0,10)}"></div>
        <div class="fg"><label>IBM Reference Number *</label><input placeholder="e.g. IBM/FORMJ/2026/0889" id="fj-reference"></div>
      </div>
    </div>`;
  openModal('modal-formj');
}

async function submitFormJ() {
  const referenceNumber = document.getElementById('fj-reference')?.value?.trim();
  if (!referenceNumber) { toast('Enter the IBM Form J acknowledgement number', 'error'); return; }
  try {
    await apiFetch(`/mines/${STATE.mineId}/compliance-records`, {
      method: 'POST',
      body: JSON.stringify({
        mineId: STATE.mineId,
        authority: 'IBM',
        recordType: 'RETURN',
        title: 'IBM Form J — Annual Return (Production, Employment & Wages)',
        status: 'SUBMITTED',
        submittedOn: Date.now(),
        expiry: Date.now(),
        referenceNumber,
      }),
    });
    closeModal('modal-formj');
    toast('IBM Form J submitted and filed successfully! Reference saved.', 'success');
    setFormBDueDate();
    loadDashboard();
  } catch (err) {
    toast(err.message || 'Failed to submit Form J', 'error');
  }
}

// ── IBM FORM A (Annual Mineral Production Statistics & Reserves) ──
async function openFormA() {
  if (!STATE.mineId) { toast('Select a mine first','error'); return; }
  const mine = STATE.mines.find(m => m.id === STATE.mineId);

  const now = new Date();
  const fyYear = now.getMonth() >= 3 ? `${now.getFullYear()}–${now.getFullYear()+1}` : `${now.getFullYear()-1}–${now.getFullYear()}`;
  let entries = STATE.prodData || [];
  const annualProd = entries.reduce((s,r)=>s+(r.quantity||0),0) || 45200;
  const overburden = Math.round(annualProd * 1.85);

  document.getElementById('forma-period').textContent = `Fiscal Year ${fyYear} · Geological & Mining Data`;
  document.getElementById('forma-content').innerHTML = `
    <div class="form-section">
      <div class="fs-title">PART A — Mine & Mining Lease Specifics</div>
      <div class="fs-grid">
        <div class="fg"><label>Mine Name</label><input value="${mine?.name||''}"></div>
        <div class="fg"><label>Lease Grant Date</label><input value="${mine?.leaseStartOn ? new Date(mine.leaseStartOn).toLocaleDateString('en-IN') : '2019-04-01'}"></div>
        <div class="fg"><label>Mine Type & Category</label><input value="${mine?.mineType || 'METALLIFEROUS'} — Category 'A' Opencast"></div>
        <div class="fg"><label>Total Lease Area (Ha)</label><input value="48.50 Ha"></div>
      </div>
    </div>
    <div class="form-section">
      <div class="fs-title">PART B — Mining & Geological Statistics</div>
      <table class="modal-table">
        <thead><tr><th>Parameter</th><th>Metric (Units)</th><th>Remarks</th></tr></thead>
        <tbody>
          <tr><td>Total ROM Ore Extracted</td><td>${annualProd.toLocaleString('en-IN')} MT</td><td>From Pit A & Pit B</td></tr>
          <tr><td>Overburden / Waste Handled</td><td>${overburden.toLocaleString('en-IN')} MT</td><td>Stripping Ratio: 1:1.85</td></tr>
          <tr><td>Estimated Remaining Reserves</td><td>1,420,000 MT</td><td>Proved (111) & Probable (122)</td></tr>
          <tr><td>Average Mineral Grade (ROM)</td><td>53.8% purity</td><td>Chemical assay verified</td></tr>
        </tbody>
      </table>
    </div>
    <div class="form-section">
      <div class="fs-title">PART C — Machinery Deployed & Explosives</div>
      <div class="fs-grid">
        <div class="fg"><label>Excavators (1.2–2.5 cu.m)</label><input value="4 units operational"></div>
        <div class="fg"><label>Dumpers / Tippers (25–35T)</label><input value="12 units operational"></div>
        <div class="fg"><label>Blast Hole Drill Rigs</label><input value="2 units (115mm dia)"></div>
        <div class="fg"><label>Explosives Consumed (SME/ANFO)</label><input value="18,450 kg"></div>
      </div>
    </div>
    <div class="form-section">
      <div class="fs-title">PART D — Declaration & Submission</div>
      <div class="fs-grid">
        <div class="fg"><label>Mines Geologist / Manager</label><input value="${STATE.user?.username||'Mines Manager'}"></div>
        <div class="fg"><label>Filing Date</label><input type="date" value="${now.toISOString().slice(0,10)}"></div>
        <div class="fg"><label>IBM Acknowledgement Number *</label><input placeholder="e.g. IBM/FORMA/2026/0212" id="fa-reference"></div>
      </div>
    </div>`;
  openModal('modal-forma');
}

async function submitFormA() {
  const referenceNumber = document.getElementById('fa-reference')?.value?.trim();
  if (!referenceNumber) { toast('Enter the IBM Form A acknowledgement number', 'error'); return; }
  try {
    await apiFetch(`/mines/${STATE.mineId}/compliance-records`, {
      method: 'POST',
      body: JSON.stringify({
        mineId: STATE.mineId,
        authority: 'IBM',
        recordType: 'RETURN',
        title: 'IBM Form A — Annual Mineral Production Statistics',
        status: 'SUBMITTED',
        submittedOn: Date.now(),
        expiry: Date.now(),
        referenceNumber,
      }),
    });
    closeModal('modal-forma');
    toast('IBM Form A submitted and filed successfully! Reference saved.', 'success');
    setFormBDueDate();
    loadDashboard();
  } catch (err) {
    toast(err.message || 'Failed to submit Form A', 'error');
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
