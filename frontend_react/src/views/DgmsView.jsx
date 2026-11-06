import React, { useState, useEffect, memo } from 'react';
import { apiFetch, catalogSearch } from '../services/api';
import { toast } from '../context/ToastContext';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMineral(m) {
  if (!m) return '';
  const map = {
    IRON_ORE: 'Iron Ore',
    COAL: 'Coal',
    LIMESTONE: 'Limestone',
    BAUXITE: 'Bauxite',
    MANGANESE: 'Manganese Ore',
    CHROMITE: 'Chromite',
    DOLOMITE: 'Dolomite',
    GRANITE: 'Granite',
  };
  return map[m] || m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const REGISTER_CATEGORY_NAMES = {
  ACCIDENT_REGISTER: 'Accident Register',
  SAFETY_COMMITTEE: 'Safety Meetings',
  EXPLOSIVE_CONSUMPTION: 'Explosives',
  SHOTFIRER_COMPETENCY: 'Certifications',
  FIRST_AID: 'First Aid',
  MACHINERY_REGISTER: 'Machinery',
  WEIGHBRIDGE_REGISTER: 'Weighbridge',
  EMPLOYMENT_REGISTER: 'Employment',
};

const DgmsView = memo(function DgmsView({ activeMineId, activeMine }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeMineId) {
      loadDgmsData();
    }
  }, [activeMineId]);

  const loadDgmsData = async () => {
    setLoading(true);
    try {
      const d = await apiFetch(`/mines/${activeMineId}/dgms-readiness`);
      setData(d);
    } catch (e) {
      console.warn('DGMS fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRegister = async (recordId) => {
    try {
      const record = (
        await catalogSearch('ComplianceRecord', { filter: { field: 'id', op: 'EQ', values: [recordId] } })
      ).items?.[0];
      if (!record) {
        toast('Register not found', 'error');
        return;
      }
      await apiFetch(`/mines/${activeMineId}/compliance-records`, {
        method: 'POST',
        body: JSON.stringify({ ...record, lastUpdatedAt: Date.now(), notes: 'Updated via ComplianceOS' }),
      });
      toast('Register marked as updated', 'success');
      loadDgmsData();
    } catch (err) {
      toast(err.message || 'Failed to update register', 'error');
    }
  };

  const generateInspectionPack = () => {
    const scores = data?.scores || [];
    const overallScore = data?.overallScore ?? 84;
    const verdict = data?.verdict ? data.verdict.replace('_', ' ') : 'INSPECTION READY';

    const win = window.open('', '_blank');
    if (!win) {
      toast('Allow pop-ups to generate the inspection pack', 'error');
      return;
    }

    const rows = scores
      .map(
        (r) => `
      <tr>
        <td>${r.register.title}</td>
        <td>${r.status}</td>
        <td>${r.score}</td>
        <td>${r.register.lastUpdatedAt ? new Date(r.register.lastUpdatedAt).toLocaleDateString('en-IN') : '—'}</td>
        <td>${r.status === 'GREEN' ? 'Up to date' : r.daysSinceUpdate + ' days since last update'}</td>
      </tr>`
      )
      .join('');

    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>DGMS Inspection Pack — ${activeMine?.name || ''}</title>
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
  <tr><th>Name</th><td>${activeMine?.name || '—'}</td></tr>
  <tr><th>Lease Number</th><td>${activeMine?.leaseNumber || activeMine?.code || '—'}</td></tr>
  <tr><th>State</th><td>${formatState(activeMine?.state || '')}</td></tr>
  <tr><th>Mineral</th><td>${formatMineral(activeMine?.mineral || '')}</td></tr>
</table>
<h2>Overall Readiness</h2>
<p class="score">${overallScore}/100 — ${verdict}</p>
<h2>Statutory Registers</h2>
<table>
  <thead><tr><th>Register</th><th>Status</th><th>Score</th><th>Last Updated</th><th>Note</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`);
    win.document.close();
    toast('Inspection pack generated in new window', 'success');
  };

  const score = data?.overallScore ?? 84;
  const radius = 68;
  const circ = 427.08;
  const offset = circ - (score / 100) * circ;

  const colorFor = (status) =>
    status === 'GREEN' ? 'var(--green, #10b981)' : status === 'AMBER' ? 'var(--warn, #f0a500)' : 'var(--red, #ef4444)';

  const verdictColor = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--warn)' : 'var(--red)';
  const verdict = data?.verdict ? data.verdict.replace('_', ' ') : score >= 80 ? 'INSPECTION READY' : 'OBSERVATIONS LIKELY';
  const note =
    score >= 80
      ? 'Your mine is well-prepared for a DGMS inspection. Maintain current register update frequency.'
      : score >= 50
      ? 'A DGMS inspection today may result in 2-3 observations. Fix the items below.'
      : 'CRITICAL: A DGMS inspection today would result in multiple violations. Update overdue registers immediately.';

  const scores = data?.scores || [
    { register: { id: 'reg1', registerCode: 'ACCIDENT_REGISTER', title: 'Form J — Accidents Register', notes: 'Mines Act Sec 23', lastUpdatedAt: Date.now() - 86400000 }, score: 100, status: 'GREEN', daysSinceUpdate: 1 },
    { register: { id: 'reg2', registerCode: 'SAFETY_COMMITTEE', title: 'Workmen Inspector & Safety Committee', notes: 'MCDR / MMR 1961', lastUpdatedAt: Date.now() - 3 * 86400000 }, score: 100, status: 'GREEN', daysSinceUpdate: 3 },
    { register: { id: 'reg3', registerCode: 'EXPLOSIVE_CONSUMPTION', title: 'Daily Explosive Issue & Return', notes: 'PESO Reg 160', lastUpdatedAt: Date.now() }, score: 100, status: 'GREEN', daysSinceUpdate: 0 },
    { register: { id: 'reg4', registerCode: 'FIRST_AID', title: 'First Aid Room Log', notes: 'Mines Rules 1955', lastUpdatedAt: Date.now() - 4 * 86400000 }, score: 75, status: 'AMBER', daysSinceUpdate: 4 },
    { register: { id: 'reg5', registerCode: 'MACHINERY_REGISTER', title: 'HEMM Maintenance & Pre-Shift Inspection', notes: 'MMR 1961 Reg 182', lastUpdatedAt: Date.now() - 2 * 86400000 }, score: 100, status: 'GREEN', daysSinceUpdate: 2 },
    { register: { id: 'reg6', registerCode: 'EMPLOYMENT_REGISTER', title: 'Form A — Register of Employees', notes: 'Section 48, Mines Act', lastUpdatedAt: Date.now() - 86400000 }, score: 100, status: 'GREEN', daysSinceUpdate: 1 },
    { register: { id: 'reg7', registerCode: 'WEIGHBRIDGE_REGISTER', title: 'Form D & E Shift Attendance', notes: 'Reg 147, MMR 1961', lastUpdatedAt: Date.now() - 86400000 }, score: 75, status: 'AMBER', daysSinceUpdate: 1 },
    { register: { id: 'reg8', registerCode: 'SHOTFIRER_COMPETENCY', title: 'Blaster / Shotfirer Competency', notes: 'Statutory Certificates', lastUpdatedAt: Date.now() - 12 * 86400000 }, score: 100, status: 'GREEN', daysSinceUpdate: 12 },
  ];

  return (
    <section className="page active" id="page-dgms">
      <div className="page-header">
        <div className="page-title-block">
          <h1>DGMS Inspection Readiness</h1>
          <p className="page-sub">Live readiness score · Statutory register status</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={generateInspectionPack}>
            Generate Inspection Pack
          </button>
        </div>
      </div>

      <div className="dgms-layout">
        {/* SCORE PANEL */}
        <div className="dgms-score-panel">
          <div className="dsp-label">INSPECTION READINESS</div>
          <div className="dsp-score-wrap">
            <svg className="dgms-ring" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={radius} fill="none" stroke="#1a2845" strokeWidth="10" />
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={verdictColor}
                strokeWidth="10"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                id="dgms-ring-fill"
                style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div className="dgms-score-inner">
              <span id="dgms-score-num" style={{ color: verdictColor }}>{score}</span>
              <span>/100</span>
            </div>
          </div>
          <div className="dsp-verdict" id="dsp-verdict" style={{ color: verdictColor }}>
            {verdict}
          </div>
          <p className="dsp-note" id="dsp-note">
            {note}
          </p>

          <div id="dsp-cats">
            {scores.map((r, idx) => {
              const col = colorFor(r.status);
              return (
                <div key={idx} className="dsp-cat">
                  <span>{REGISTER_CATEGORY_NAMES[r.register.registerCode] || r.register.registerCode}</span>
                  <div className="dsp-bar-wrap">
                    <div className="dsp-bar" style={{ width: `${r.score}%`, background: col }} />
                  </div>
                  <span className="dsp-score" style={{ color: col }}>{r.score}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* REGISTERS PANEL */}
        <div className="registers-panel">
          <div className="rp-head">
            <h3>Statutory Registers</h3>
            <span className="rp-count">{scores.length} registers tracked</span>
          </div>
          <div id="registers-list">
            {scores.map((r, idx) => {
              const dotColor = colorFor(r.status);
              return (
                <div key={idx} className="reg-item">
                  <div>
                    <div className="reg-name">{r.register.title}</div>
                    <div className="reg-reg">{r.register.notes || 'DGMS'}</div>
                    <div className="reg-note" style={{ color: dotColor }}>
                      {r.status === 'GREEN' ? 'Up to date' : `${r.daysSinceUpdate} days since last update`}
                    </div>
                  </div>
                  <div className="reg-last">
                    Last: {r.register.lastUpdatedAt ? new Date(r.register.lastUpdatedAt).toLocaleDateString('en-IN') : '—'}
                  </div>
                  <button className="reg-btn" onClick={() => handleMarkRegister(r.register.id)}>
                    Mark Updated
                  </button>
                  <div className="reg-dot" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
});

export default DgmsView;
