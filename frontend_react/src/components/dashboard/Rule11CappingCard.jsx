import React from 'react';

export default function Rule11CappingCard({ activeMine, cumulativeYtdProduced, onNavigate }) {
  // Financial Year Calculation (Indian FY runs April 1 to March 31)
  const now = new Date();
  const currentYear = now.getFullYear();
  const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
  const fyEndYear = fyStartYear + 1;
  const fyLabel = `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`;

  const annualCap = activeMine?.ibmRegistration?.capacity > 0 ? activeMine.ibmRegistration.capacity : null;
  const ytdExtracted = cumulativeYtdProduced != null ? Number(cumulativeYtdProduced) : 0;
  const utilization = annualCap ? (ytdExtracted / annualCap) * 100 : null;
  const remainingAllowance = annualCap ? Math.max(0, annualCap - ytdExtracted) : null;

  // Days left in current Financial Year (till March 31)
  const fyEnd = new Date(fyEndYear, 2, 31, 23, 59, 59);
  const daysLeftInFy = Math.max(0, Math.ceil((fyEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Proactive Warning Thresholds (only when approved annual capacity is configured on the mine)
  let statusBadge = {
    label: annualCap ? 'COMPLIANT (SAFE BUFFER)' : 'ANNUAL CAP NOT CONFIGURED',
    color: annualCap ? '#10b981' : '#94a3b8',
    bg: annualCap ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
    border: annualCap ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.3)',
  };

  if (utilization != null && utilization >= 100) {
    statusBadge = {
      label: 'STATUTORY CEILING EXCEEDED — RULE 11(2) RISK',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.18)',
      border: 'rgba(239, 68, 68, 0.5)',
    };
  } else if (utilization != null && utilization >= 95) {
    statusBadge = {
      label: 'CRITICAL CEILING ALERT (<5% REMAINING)',
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.15)',
      border: 'rgba(248, 113, 113, 0.4)',
    };
  } else if (utilization != null && utilization >= 85) {
    statusBadge = {
      label: 'APPROACHING ANNUAL CEILING',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
    };
  }

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
            Approved Mining Plan / EC Target for <strong>{fyLabel}</strong>
            {activeMine?.leaseNumber ? ` • Lease #${activeMine.leaseNumber}` : ''}
          </div>
        </div>

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
      </div>

      {/* PROGRESS BAR */}
      {annualCap && (
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
      )}

      {/* METRIC CHIPS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>Approved Annual Cap</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
            {annualCap ? `${annualCap.toLocaleString('en-IN')} MT` : 'Not set'}
          </div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>Extracted YTD (ROM)</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#00b4d8' }}>{ytdExtracted.toLocaleString('en-IN', { maximumFractionDigits: 0 })} MT</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>Remaining Permitted</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: statusBadge.color }}>
            {remainingAllowance != null ? `${remainingAllowance.toLocaleString('en-IN', { maximumFractionDigits: 0 })} MT` : '—'}
          </div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>{fyLabel} Runway</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{daysLeftInFy} Days left</div>
        </div>
      </div>
    </div>
  );
}

