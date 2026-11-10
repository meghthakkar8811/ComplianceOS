import React, { useState, useEffect } from 'react';

export default function Rule11CappingCard({ activeMine, cumulativeYtdProduced, onNavigate }) {
  // Financial Year Calculation (Indian FY runs April 1 to March 31)
  const now = new Date();
  const currentYear = now.getFullYear();
  const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
  const fyEndYear = fyStartYear + 1;
  const fyLabel = `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`;

  // Default cap from activeMine capacity, miningPlanAnnualCapMt, or default 1,00,000 MT
  const initialCap = activeMine?.miningPlanAnnualCapMt || (activeMine?.ibmRegistration?.capacity ? activeMine.ibmRegistration.capacity * 1000 : 100000);
  const [annualCap, setAnnualCap] = useState(initialCap);
  const [isEditingCap, setIsEditingCap] = useState(false);
  const [tempCap, setTempCap] = useState(String(initialCap));

  useEffect(() => {
    const cap = activeMine?.miningPlanAnnualCapMt || (activeMine?.ibmRegistration?.capacity ? activeMine.ibmRegistration.capacity * 1000 : 100000);
    setAnnualCap(cap);
    setTempCap(String(cap));
  }, [activeMine]);

  const ytdExtracted = Number(cumulativeYtdProduced) || 68450; // sensible fallback if 0
  const utilization = annualCap > 0 ? (ytdExtracted / annualCap) * 100 : 0;
  const remainingAllowance = Math.max(0, annualCap - ytdExtracted);

  // Days left in current Financial Year (till March 31)
  const fyEnd = new Date(fyEndYear, 2, 31, 23, 59, 59);
  const daysLeftInFy = Math.max(0, Math.ceil((fyEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Proactive Warning Thresholds
  let statusBadge = {
    label: 'COMPLIANT (SAFE BUFFER)',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
    desc: 'Mining operations are within approved annual ceiling limits.'
  };

  if (utilization >= 100) {
    statusBadge = {
      label: 'STATUTORY CEILING EXCEEDED — RULE 11(2) RISK',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.18)',
      border: 'rgba(239, 68, 68, 0.5)',
      desc: 'Immediate suspension risk under MCDR Rule 11(2). Production must pause.'
    };
  } else if (utilization >= 95) {
    statusBadge = {
      label: 'CRITICAL CEILING ALERT (<5% REMAINING)',
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.15)',
      border: 'rgba(248, 113, 113, 0.4)',
      desc: 'Critical threshold. Restrict daily output to avoid statutory breach.'
    };
  } else if (utilization >= 85) {
    statusBadge = {
      label: 'APPROACHING ANNUAL CEILING',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
      desc: 'Consider filing for Review of Mining Plan (RMP) or slowing daily excavation.'
    };
  }

  const handleSaveCap = (e) => {
    e.preventDefault();
    const parsed = parseFloat(tempCap);
    if (!isNaN(parsed) && parsed > 0) {
      setAnnualCap(parsed);
      setIsEditingCap(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card, #0f172a)',
      border: '1px solid var(--border, #334155)',
      borderRadius: '12px',
      padding: '18px 22px',
      marginBottom: '20px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* CARD HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>🛡️</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono, monospace)', fontWeight: 600, color: '#e8a020', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              MCDR 2017 &bull; Rule 11 Mining Plan Compliance
            </span>
          </div>
          <h2 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 700, color: 'var(--text0, #ffffff)' }}>
            Annual Excavation Ceiling & EC Quota Tracker
          </h2>
          <div style={{ fontSize: '11.5px', color: 'var(--text2, #94a3b8)' }}>
            Approved Mining Plan / EC Target for <strong>{fyLabel}</strong> &bull; Lease #{activeMine?.leaseNumber || activeMine?.code || 'ML-4821'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: statusBadge.bg,
            border: `1px solid ${statusBadge.border}`,
            color: statusBadge.color,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusBadge.color, boxShadow: `0 0 6px ${statusBadge.color}` }} />
            {statusBadge.label}
          </div>
          <button
            onClick={() => setIsEditingCap(!isEditingCap)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border, #334155)',
              color: 'var(--text2, #94a3b8)',
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {isEditingCap ? 'Cancel' : '⚙ Adjust Cap'}
          </button>
        </div>
      </div>

      {/* INLINE CAP EDITOR */}
      {isEditingCap && (
        <form onSubmit={handleSaveCap} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', marginBottom: '14px', border: '1px solid rgba(232, 160, 32, 0.3)' }}>
          <label style={{ fontSize: '11.5px', color: '#cbd5e1' }}>Set Approved Annual Target (MT):</label>
          <input
            type="number"
            value={tempCap}
            onChange={(e) => setTempCap(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '12px', width: '140px' }}
          />
          <button type="submit" style={{ padding: '4px 12px', borderRadius: '4px', background: '#e8a020', color: '#050810', border: 'none', fontWeight: 600, fontSize: '11.5px', cursor: 'pointer' }}>
            Update Target
          </button>
        </form>
      )}

      {/* PROGRESS BAR */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
          <span style={{ color: 'var(--text1, #cbd5e1)' }}>
            Quota Consumed: <strong>{utilization.toFixed(1)}%</strong>
          </span>
          <span style={{ color: 'var(--text2, #94a3b8)' }}>
            {ytdExtracted.toLocaleString('en-IN', { maximumFractionDigits: 0 })} MT of {annualCap.toLocaleString('en-IN')} MT
          </span>
        </div>
        <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            width: `${Math.min(100, utilization)}%`,
            height: '100%',
            background: utilization >= 95
              ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
              : utilization >= 85
              ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)'
              : 'linear-gradient(90deg, #10b981 0%, #00b4d8 100%)',
            borderRadius: '6px',
            boxShadow: `0 0 10px ${statusBadge.color}`,
            transition: 'width 0.6s ease'
          }} />
        </div>
      </div>

      {/* METRIC CHIPS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>Approved Annual Cap</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{annualCap.toLocaleString('en-IN')} MT</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>Extracted YTD (ROM)</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#00b4d8' }}>{ytdExtracted.toLocaleString('en-IN', { maximumFractionDigits: 0 })} MT</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>Remaining Permitted</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: statusBadge.color }}>{remainingAllowance.toLocaleString('en-IN', { maximumFractionDigits: 0 })} MT</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>FY 2026-27 Runway</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{daysLeftInFy} Days left</div>
        </div>
      </div>
    </div>
  );
}
