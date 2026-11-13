import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { fetchMinePeriodStats, getPreviousMonthRange } from '../../utils/formStats';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const DEFAULT_END_USES = [
  { id: 'cement', name: 'Cement Industry', defaultPct: 55 },
  { id: 'steel', name: 'Iron & Steel / Metallurgical', defaultPct: 20 },
  { id: 'chemical', name: 'Chemical / Fertilizer', defaultPct: 15 },
  { id: 'glass', name: 'Glass & Ceramics', defaultPct: 5 },
  { id: 'other', name: 'Captive Plant & Other Industrial', defaultPct: 5 },
];

export default function FormF2Modal({ isOpen, onClose, activeMine, activeMineMinerals, onSubmitted }) {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [endUseDist, setEndUseDist] = useState(DEFAULT_END_USES);

  const { start, end, label: per } = getPreviousMonthRange();

  useEffect(() => {
    if (!isOpen || !activeMine?.id) return;
    setLoadingStats(true);
    fetchMinePeriodStats(activeMine.id, start, end)
      .then(setStats)
      .finally(() => setLoadingStats(false));
  }, [isOpen, activeMine?.id, start, end]);

  if (!isOpen) return null;

  const mineName = activeMine?.name || '';
  const leaseNo = activeMine?.leaseNumber || '';
  const ibmMineCode = activeMine?.ibmRegistration?.registrationNumber || '';
  const state = formatState(activeMine?.state || '');
  const district = activeMine?.district || '';
  const mineral = activeMineMinerals || 'Limestone / Non-Metallic';
  const leaseArea = activeMine?.ibmRegistration?.leaseArea ? `${activeMine.ibmRegistration.leaseArea} Hectares` : '';

  const totalDispatched = stats?.dispatchedQty || 0;
  const totalValue = stats?.dispatchedValue || 0;
  const exMinePrice = totalDispatched > 0 ? Math.round(totalValue / totalDispatched) : 0;

  const handlePctChange = (id, newPct) => {
    const val = Math.max(0, Math.min(100, Number(newPct) || 0));
    setEndUseDist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, defaultPct: val } : item))
    );
  };

  const handleSubmit = async () => {
    if (!referenceNumber.trim()) {
      toast('Enter the IBM reference/acknowledgement number', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (activeMine) {
        await apiFetch(`/mines/${activeMine.id}/compliance/records/returns`, {
          method: 'POST',
          body: JSON.stringify({
            title: `IBM Monthly Return (Form F-2 Non-Metallic) — ${per}`,
            referenceNumber: referenceNumber.trim(),
          }),
        });
      }
      toast('IBM Form F-2 Non-Metallic Monthly Return filed successfully!', 'success');
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to submit Form F-2 return', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="modal-formf2"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-box large"
        style={{
          maxWidth: '860px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-tag" style={{ background: '#00b4d822', color: '#00b4d8', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
                MCDR 2017 &bull; RULE 45
              </span>
              <h2>Form F-2 &mdash; Monthly Return (Non-Metallic Minerals)</h2>
            </div>
            <p className="modal-sub" id="formf2-period" style={{ marginTop: '4px' }}>
              {per} &bull; For Limestone, Dolomite, Silica Sand, Gypsum &amp; Industrial Minerals
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {/* PART I */}
          <div className="form-section" style={{ marginBottom: '18px' }}>
            <div className="fs-title" style={{ fontSize: '13px', color: '#e8a020', marginBottom: '10px' }}>
              PART I &mdash; Mine &amp; Lessee Particulars
            </div>
            <div className="fs-grid">
              <div className="fg"><label>Name of Mine</label><input readOnly value={mineName} /></div>
              <div className="fg"><label>IBM Mine Code</label><input readOnly value={ibmMineCode || '—'} /></div>
              <div className="fg"><label>Lease Number</label><input readOnly value={leaseNo || '—'} /></div>
              <div className="fg"><label>State &amp; District</label><input readOnly value={[district, state].filter(Boolean).join(', ') || '—'} /></div>
              <div className="fg"><label>Mineral Mined</label><input readOnly value={mineral} /></div>
              <div className="fg"><label>Sanctioned Capacity</label><input readOnly value={activeMine?.ibmRegistration?.capacity ? `${Number(activeMine.ibmRegistration.capacity).toLocaleString('en-IN')} MT/Yr` : '—'} /></div>
            </div>
          </div>

          {/* PART II: LEDGER SUMMARY */}
          <div className="form-section" style={{ marginBottom: '18px' }}>
            <div className="fs-title" style={{ fontSize: '13px', color: '#e8a020', marginBottom: '10px' }}>
              PART II &mdash; Monthly Production &amp; Dispatches ({per})
            </div>
            {loadingStats ? (
              <p style={{ fontSize: '12px', color: 'var(--text2)' }}>Loading ledger figures…</p>
            ) : (
              <div className="fs-grid">
                <div className="fg">
                  <label>ROM Production Extracted</label>
                  <input readOnly value={`${(stats?.producedQty || 0).toLocaleString('en-IN')} MT (${stats?.prodCount || 0} pit entries)`} />
                </div>
                <div className="fg">
                  <label>Total Dispatched Quantity</label>
                  <input readOnly value={`${totalDispatched.toLocaleString('en-IN')} MT (${stats?.saleCount || 0} sales)`} />
                </div>
                <div className="fg">
                  <label>Total Gross Sale Value (₹)</label>
                  <input readOnly value={`₹${Math.round(totalValue).toLocaleString('en-IN')}`} />
                </div>
                <div className="fg">
                  <label>Derived Ex-Mine Price (EMP)</label>
                  <input readOnly value={`₹${exMinePrice.toLocaleString('en-IN')} / MT`} />
                </div>
              </div>
            )}
          </div>

          {/* PART III: END-USE INDUSTRY BREAKDOWN (STATUTORY SPECIFIC TO FORM F-2) */}
          <div className="form-section" style={{ marginBottom: '18px' }}>
            <div className="fs-title" style={{ fontSize: '13px', color: '#00b4d8', marginBottom: '6px' }}>
              PART III &mdash; Consuming Industry / End-Use Classification (MCDR Form F-2 §4)
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text2, #94a3b8)' }}>
              Non-metallic mineral dispatches must be broken down by consuming industry classification for IBM tenement records.
            </p>
            <table className="modal-table">
              <thead>
                <tr>
                  <th>Consuming Industry Sector</th>
                  <th style={{ width: '120px' }}>Allocation (%)</th>
                  <th style={{ width: '160px', textAlign: 'right' }}>Dispatched Qty (MT)</th>
                </tr>
              </thead>
              <tbody>
                {endUseDist.map((item) => {
                  const qty = Math.round((totalDispatched * item.defaultPct) / 100);
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong></td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.defaultPct}
                          onChange={(e) => handlePctChange(item.id, e.target.value)}
                          style={{
                            width: '70px',
                            padding: '4px 6px',
                            fontSize: '12px',
                            background: 'var(--bg-inp)',
                            border: '1px solid var(--border)',
                            color: 'var(--text0)',
                            borderRadius: '4px',
                          }}
                        />
                        <span style={{ marginLeft: '4px', fontSize: '12px', color: 'var(--text2)' }}>%</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {qty.toLocaleString('en-IN')} MT
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: 'rgba(255,255,255,0.04)', fontWeight: 600 }}>
                  <td>Total Allocated</td>
                  <td>{endUseDist.reduce((acc, curr) => acc + curr.defaultPct, 0)}%</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: '#00b4d8' }}>
                    {totalDispatched.toLocaleString('en-IN')} MT
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PART IV: FILING ACKNOWLEDGEMENT */}
          <div className="form-section" style={{ marginBottom: '18px' }}>
            <div className="fs-title" style={{ fontSize: '13px', color: '#10b981', marginBottom: '6px' }}>
              PART IV &mdash; Record Official IBM MTS Filing Reference
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text2, #94a3b8)' }}>
              File your return on <code style={{ color: '#00b4d8' }}>ibmts.gov.in</code> for {per}, then log the acknowledgement reference below.
            </p>
            <div className="fg">
              <label>IBM Acknowledgement Reference Number *</label>
              <input
                id="ff2-reference"
                placeholder="e.g. MTS/2026/F2/LIMESTONE/0192"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Save Form F-2 Filing Acknowledgement →'}
          </button>
        </div>
      </div>
    </div>
  );
}
