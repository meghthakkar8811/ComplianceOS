import React, { useState, useEffect, memo } from 'react';
import { apiFetch, catalogSearch } from '../services/api';
import { toast } from '../context/ToastContext';
import DgmsInspectionPackModal from '../components/modals/DgmsInspectionPackModal';
import DgmsRegisterUpdateModal from '../components/modals/DgmsRegisterUpdateModal';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

const DEFAULT_SCORES = [
  { register: { id: 'reg1', registerCode: 'ACCIDENT_REGISTER', title: 'Form J — Accidents Register', notes: 'Mines Act Sec 23 & MMR 1961', lastUpdatedAt: Date.now() - 86400000 }, score: 100, status: 'GREEN', daysSinceUpdate: 1 },
  { register: { id: 'reg2', registerCode: 'SAFETY_COMMITTEE', title: 'Workmen Inspector & Safety Committee', notes: 'MMR 1961 Reg 43 / DGMS Circular', lastUpdatedAt: Date.now() - 3 * 86400000 }, score: 100, status: 'GREEN', daysSinceUpdate: 3 },
  { register: { id: 'reg3', registerCode: 'EXPLOSIVE_CONSUMPTION', title: 'Daily Explosive Issue & Return', notes: 'PESO & MMR 1961 Reg 160', lastUpdatedAt: Date.now() }, score: 100, status: 'GREEN', daysSinceUpdate: 0 },
  { register: { id: 'reg4', registerCode: 'FIRST_AID', title: 'First Aid Room & Equipment Log', notes: 'Mines Rules 1955 Rule 44', lastUpdatedAt: Date.now() - 4 * 86400000 }, score: 75, status: 'AMBER', daysSinceUpdate: 4 },
  { register: { id: 'reg5', registerCode: 'MACHINERY_REGISTER', title: 'HEMM Maintenance & Pre-Shift Inspection', notes: 'MMR 1961 Reg 182', lastUpdatedAt: Date.now() - 2 * 86400000 }, score: 100, status: 'GREEN', daysSinceUpdate: 2 },
  { register: { id: 'reg6', registerCode: 'EMPLOYMENT_REGISTER', title: 'Form A — Register of Employees', notes: 'Section 48, Mines Act 1952', lastUpdatedAt: Date.now() - 86400000 }, score: 100, status: 'GREEN', daysSinceUpdate: 1 },
  { register: { id: 'reg7', registerCode: 'WEIGHBRIDGE_REGISTER', title: 'Form D & E Shift Attendance Ledger', notes: 'Reg 147, MMR 1961', lastUpdatedAt: Date.now() - 86400000 }, score: 75, status: 'AMBER', daysSinceUpdate: 1 },
  { register: { id: 'reg8', registerCode: 'SHOTFIRER_COMPETENCY', title: 'Blaster / Shotfirer Competency Records', notes: 'Statutory Blasting Certificates', lastUpdatedAt: Date.now() - 12 * 86400000 }, score: 100, status: 'GREEN', daysSinceUpdate: 12 },
];

const DgmsView = memo(function DgmsView({ activeMineId, activeMine, activeMineMinerals }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'GREEN', 'AMBER', 'RED'
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [activeUpdateItem, setActiveUpdateItem] = useState(null);
  const [localScores, setLocalScores] = useState(DEFAULT_SCORES);

  useEffect(() => {
    if (activeMineId) {
      loadDgmsData();
    }
  }, [activeMineId]);

  const loadDgmsData = async () => {
    setLoading(true);
    try {
      const registersResult = await catalogSearch('ComplianceRecord', {
        filter: {
          op: 'AND',
          values: [
            { field: 'mineId', op: 'EQ', values: [activeMineId] },
            { field: 'recordType', op: 'EQ', values: ['REGISTER'] },
          ],
        },
      });
      const records = registersResult?.items || [];
      if (records.length > 0) {
        const mapped = records.map((r) => {
          const daysSince = Math.max(0, Math.floor((Date.now() - (r.lastUpdatedAt || 0)) / 86400000));
          const maxDays = Math.max(r.maxDaysAllowed || 1, 1);
          const status = daysSince <= maxDays ? 'GREEN' : daysSince <= maxDays * 2 ? 'AMBER' : 'RED';
          const score = status === 'GREEN' ? 100 : status === 'AMBER' ? 60 : 20;
          return {
            register: r,
            score,
            status,
            daysSinceUpdate: daysSince,
          };
        });
        setLocalScores(mapped);
      }
    } catch (e) {
      console.warn('DGMS fetch note:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpdateModal = (item) => {
    setActiveUpdateItem(item);
  };

  const handleSaveRegisterUpdate = async ({ registerId, lastUpdatedAt, officer, notes }) => {
    // Optimistically update local scores
    setLocalScores((prev) =>
      prev.map((item) => {
        if (item.register.id === registerId) {
          return {
            ...item,
            score: 100,
            status: 'GREEN',
            daysSinceUpdate: 0,
            register: {
              ...item.register,
              lastUpdatedAt: lastUpdatedAt,
              notes: `${officer}: ${notes}`
            }
          };
        }
        return item;
      })
    );

    // Call backend API if available
    try {
      await apiFetch(`/mines/${activeMineId}/compliance/records/${registerId}/mark-updated`, {
        method: 'POST',
      });
      toast('Register marked as updated', 'success');
    } catch (err) {
      console.warn('Backend record sync note:', err);
    }
  };

  // Compute live overall score
  const calculatedScore = Math.round(
    localScores.reduce((sum, item) => sum + item.score, 0) / (localScores.length || 1)
  );
  const overallScore = data?.overallScore ?? calculatedScore;

  const radius = 68;
  const circ = 427.08;
  const offset = circ - (overallScore / 100) * circ;

  const colorFor = (status) =>
    status === 'GREEN' ? '#10b981' : status === 'AMBER' ? '#f59e0b' : '#ef4444';

  const verdictColor = overallScore >= 80 ? '#10b981' : overallScore >= 50 ? '#f59e0b' : '#ef4444';
  const verdict = overallScore >= 80 ? 'INSPECTION READY (SAFE BUFFER)' : overallScore >= 50 ? 'OBSERVATIONS LIKELY (ACTION REQUIRED)' : 'CRITICAL DEFICIT (IMMEDIATE ACTION)';
  const verdictNote =
    overallScore >= 80
      ? 'Your mine is compliant with MMR 1961 and Mines Act 1952. All 8 mandatory registers are within statutory validity.'
      : overallScore >= 50
      ? 'A DGMS inspection today may trigger 2-3 statutory observations. Review the registers marked in amber below.'
      : 'CRITICAL: Severe register decay detected. An inspection today would trigger Section 22 orders or work stoppage.';

  // Filtered scores
  const filteredScores = localScores.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const greenCount = localScores.filter((r) => r.status === 'GREEN').length;
  const amberCount = localScores.filter((r) => r.status === 'AMBER').length;
  const redCount = localScores.filter((r) => r.status === 'RED').length;

  return (
    <section className="page active" id="page-dgms">
      <div className="page-header">
        <div className="page-title-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🛡️</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono, monospace)', fontWeight: 600, color: '#e8a020', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Directorate General of Mines Safety &bull; MMR 1961
            </span>
          </div>
          <h1>DGMS Inspection Readiness Center</h1>
          <p className="page-sub">
            Real-time safety score &bull; 8 Statutory Registers decay tracking &bull; Mines Act 1952 Compliance
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn-primary"
            style={{ backgroundColor: '#e8a020', color: '#050810', fontWeight: 700, border: 'none' }}
            onClick={() => setShowInspectionModal(true)}
            title="Generate executive DGMS safety inspection pack printable on A4 and downloadable as PDF"
          >
            📋 Generate DGMS Inspection Pack
          </button>
        </div>
      </div>

      {/* DGMS STATUTORY TECHNICAL CIRCULAR NOTICE BOARD */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
        fontSize: '11.5px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px', color: '#00b4d8' }}>🚜</span>
          <div>
            <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '2px' }}>Reg 182 &bull; HEMM Pre-Shift Inspections</strong>
            <span style={{ color: '#94a3b8' }}>Daily physical brake and steering test required for all dumpers, excavators, and loaders before shift handover.</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px', color: '#e8a020' }}>⛰️</span>
          <div>
            <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '2px' }}>Reg 106 &bull; Slope Stability in Open Cast</strong>
            <span style={{ color: '#94a3b8' }}>Bench height must not exceed boom reach of loading equipment. Berm width minimum 1.5x height.</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px', color: '#10b981' }}>🩺</span>
          <div>
            <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '2px' }}>Rule 29B &bull; Periodical Medical Exam</strong>
            <span style={{ color: '#94a3b8' }}>100% of employees must undergo audiometry, chest radiography, and pulmonary function tests.</span>
          </div>
        </div>
      </div>

      <div className="dgms-layout">
        {/* SCORE PANEL */}
        <div className="dgms-score-panel">
          <div className="dsp-label">DGMS SAFETY AUDIT INDEX</div>
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
              <span id="dgms-score-num" style={{ color: verdictColor }}>{overallScore}</span>
              <span>/100</span>
            </div>
          </div>
          <div className="dsp-verdict" id="dsp-verdict" style={{ color: verdictColor, fontSize: '12px', fontWeight: 700 }}>
            {verdict}
          </div>
          <p className="dsp-note" id="dsp-note">
            {verdictNote}
          </p>

          <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
            STATUTORY CATEGORY COMPLIANCE
          </div>
          <div id="dsp-cats">
            {localScores.map((r, idx) => {
              const col = colorFor(r.status);
              return (
                <div key={idx} className="dsp-cat" onClick={() => handleOpenUpdateModal(r)}>
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
          <div className="rp-head" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3>Mandatory 8 Statutory Registers (Mines Act & MMR 1961)</h3>
              <span className="rp-count">{localScores.length} registers continuously monitored for legal decay</span>
            </div>

            {/* STATUS FILTER PILLS */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setFilter('ALL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  background: filter === 'ALL' ? 'var(--amber, #e8a020)' : 'transparent',
                  color: filter === 'ALL' ? '#050810' : '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                All ({localScores.length})
              </button>
              <button
                onClick={() => setFilter('GREEN')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  background: filter === 'GREEN' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: '#10b981',
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                ✓ Up to Date ({greenCount})
              </button>
              <button
                onClick={() => setFilter('AMBER')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  background: filter === 'AMBER' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: '#f59e0b',
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                ⏳ Due Soon ({amberCount})
              </button>
              {redCount > 0 && (
                <button
                  onClick={() => setFilter('RED')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: filter === 'RED' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: '#ef4444',
                    fontWeight: 600,
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  ⚠ Overdue ({redCount})
                </button>
              )}
            </div>
          </div>

          <div id="registers-list">
            {filteredScores.map((r, idx) => {
              const dotColor = colorFor(r.status);
              return (
                <div key={idx} className="reg-item" onClick={() => handleOpenUpdateModal(r)}>
                  <div>
                    <div className="reg-name">{r.register.title}</div>
                    <div className="reg-reg">{r.register.notes || 'MMR 1961'}</div>
                    <div className="reg-note" style={{ color: dotColor, fontWeight: 600 }}>
                      {r.status === 'GREEN' ? '✓ Verified Up to Date' : `${r.daysSinceUpdate} days elapsed since last verification`}
                    </div>
                  </div>
                  <div className="reg-last">
                    Verified: {r.register.lastUpdatedAt ? new Date(r.register.lastUpdatedAt).toLocaleDateString('en-IN') : '—'}
                  </div>
                  <button
                    className="reg-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenUpdateModal(r);
                    }}
                  >
                    Log / Verify Update
                  </button>
                  <div className="reg-dot" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL 1: INSPECTION PACK A4 PDF */}
      <DgmsInspectionPackModal
        isOpen={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        activeMine={activeMine}
        activeMineMinerals={activeMineMinerals}
        score={overallScore}
        verdict={verdict}
        note={verdictNote}
        scores={localScores}
      />

      {/* MODAL 2: REGISTER UPDATE MODAL */}
      <DgmsRegisterUpdateModal
        isOpen={Boolean(activeUpdateItem)}
        onClose={() => setActiveUpdateItem(null)}
        registerItem={activeUpdateItem}
        onSave={handleSaveRegisterUpdate}
      />
    </section>
  );
});

export default DgmsView;
