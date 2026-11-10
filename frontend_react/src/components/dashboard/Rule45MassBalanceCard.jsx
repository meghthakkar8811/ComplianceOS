import React, { useState } from 'react';

export default function Rule45MassBalanceCard({
  openingStock = 12500,
  romProduced = 28400,
  dispatched = 26200,
  wasteRejects = 1100,
  selectedMonth = 'November 2026',
  onOpenDispatches,
  onOpenProduction
}) {
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // Compute calculated closing stock
  const availableOre = openingStock + romProduced;
  const calculatedClosing = availableOre - dispatched - wasteRejects;
  const isAnomaly = dispatched > availableOre;
  const variance = isAnomaly ? dispatched - availableOre : 0;

  return (
    <div style={{
      background: 'var(--bg-card, #0f172a)',
      border: '1px solid var(--border, #334155)',
      borderRadius: '12px',
      padding: '18px 22px',
      marginBottom: '20px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      position: 'relative'
    }}>
      {/* CARD HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>⚖️</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono, monospace)', fontWeight: 600, color: '#00b4d8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              MCDR 2017 &bull; Rule 45 Stock Integrity Sentinel
            </span>
          </div>
          <h2 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 700, color: 'var(--text0, #ffffff)' }}>
            Statutory Mass-Balance & Pit-Head Stock Ledger
          </h2>
          <div style={{ fontSize: '11.5px', color: 'var(--text2, #94a3b8)' }}>
            Opening Stock + ROM Mined &minus; Dispatches &minus; Rejects = Closing Stock ({selectedMonth})
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: isAnomaly ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${isAnomaly ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            color: isAnomaly ? '#ef4444' : '#10b981',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isAnomaly ? '#ef4444' : '#10b981',
              boxShadow: `0 0 6px ${isAnomaly ? '#ef4444' : '#10b981'}`
            }} />
            {isAnomaly ? '⚠ VARIANCE DETECTED' : '✓ 100% RECONCILED'}
          </div>

          <button
            onClick={() => setShowLedgerModal(true)}
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
            📋 Grade Breakdown
          </button>
        </div>
      </div>

      {/* ANOMALY WARNING BANNER IF PRESENT */}
      {isAnomaly && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '8px',
          color: '#fca5a5',
          fontSize: '12px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>🚨</span>
          <div>
            <strong>Illegal Mineral Transit Anomaly Flagged:</strong> Dispatches exceed total available pit stock by {variance.toLocaleString('en-IN')} MT. Possible unrecorded extraction or weighbridge mismatch.
          </div>
        </div>
      )}

      {/* 4-PILLAR FLOW GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>
            1. Opening Stock
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
            {openingStock.toLocaleString('en-IN')} MT
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Pit-head baseline</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>
            2. (+) ROM Extracted
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#00b4d8' }}>
            +{romProduced.toLocaleString('en-IN')} MT
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Shift log entries</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>
            3. (&minus;) Off-Lease Dispatches
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8a020' }}>
            &minus;{dispatched.toLocaleString('en-IN')} MT
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Weighbridge challans</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text2, #94a3b8)', textTransform: 'uppercase', marginBottom: '2px' }}>
            4. (=) Closing Pit Stock
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: isAnomaly ? '#ef4444' : '#10b981' }}>
            {calculatedClosing.toLocaleString('en-IN')} MT
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Verified closing ledger</div>
        </div>
      </div>

      {/* GRADE-WISE LEDGER MODAL */}
      {showLedgerModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid var(--border, #334155)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '620px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                  Rule 45 Grade-Wise Mass-Balance Ledger
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: 'var(--text2, #94a3b8)' }}>
                  Statutory stock reconciliation conforming to Form F-1 Part II Item 2
                </p>
              </div>
              <button
                onClick={() => setShowLedgerModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '18px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text2, #94a3b8)', borderBottom: '1px solid var(--border, #334155)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Grade Specification</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Opening (MT)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Produced (MT)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Dispatched (MT)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Closing (MT)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 10px', color: '#fff', fontWeight: 600 }}>Iron Ore Lumps (+62% Fe)</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>7,200</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#00b4d8' }}>+16,400</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#e8a020' }}>-15,100</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#10b981', fontWeight: 700 }}>8,500</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 10px', color: '#fff', fontWeight: 600 }}>Iron Ore Fines (58–60% Fe)</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>5,300</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#00b4d8' }}>+12,000</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#e8a020' }}>-11,100</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#10b981', fontWeight: 700 }}>6,200</td>
                </tr>
                <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 700 }}>
                  <td style={{ padding: '10px', color: '#f8fafc' }}>Total Reconciled</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{openingStock.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#00b4d8' }}>+{romProduced.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#e8a020' }}>-{dispatched.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#10b981' }}>{calculatedClosing.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowLedgerModal(false)}
                style={{ padding: '6px 14px', borderRadius: '6px', background: '#334155', color: '#fff', border: 'none', fontSize: '12px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

