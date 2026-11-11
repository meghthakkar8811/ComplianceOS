import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { fetchMinePeriodStats, getPreviousMonthRange } from '../../utils/formStats';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FormBModal({ isOpen, onClose, activeMine, activeMineMinerals, onSubmitted }) {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

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
  const mineral = activeMineMinerals || '';
  const leaseArea = activeMine?.ibmRegistration?.leaseArea ? `${activeMine.ibmRegistration.leaseArea} Hectares` : '';

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
            title: `IBM Monthly Return (Form F-1) — ${per}`,
            referenceNumber: referenceNumber.trim(),
          }),
        });
      }
      toast('IBM Monthly Return filed successfully! Reference logged.', 'success');
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to submit return', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="modal-formb"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box large" style={{ maxWidth: '820px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2>MCDR 2017 · Form F-1 Monthly Return</h2>
            <p className="modal-sub" id="formb-period">
              {per} · Indian Bureau of Mines (IBM) Filing Log
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          <div className="form-section" style={{ marginBottom: '18px' }}>
            <div className="fs-title" style={{ fontSize: '13px', color: '#e8a020', marginBottom: '10px' }}>
              PART I — Mine & Lessee Particulars
            </div>
            <div className="fs-grid">
              <div className="fg"><label>Name of Mine</label><input readOnly value={mineName} /></div>
              <div className="fg"><label>IBM Mine Code</label><input readOnly value={ibmMineCode || '—'} /></div>
              <div className="fg"><label>Lease Number</label><input readOnly value={leaseNo || '—'} /></div>
              <div className="fg"><label>State & District</label><input readOnly value={[district, state].filter(Boolean).join(', ') || '—'} /></div>
              <div className="fg"><label>Minerals</label><input readOnly value={mineral || '—'} /></div>
              <div className="fg"><label>Lease Area</label><input readOnly value={leaseArea || '—'} /></div>
            </div>
          </div>

          <div className="form-section" style={{ marginBottom: '18px' }}>
            <div className="fs-title" style={{ fontSize: '13px', color: '#e8a020', marginBottom: '10px' }}>
              PART II — Recorded Ledger Summary ({per})
            </div>
            {loadingStats ? (
              <p style={{ fontSize: '12px', color: 'var(--text2)' }}>Loading ledger figures…</p>
            ) : (
              <div className="fs-grid">
                <div className="fg"><label>Production Logged (MT)</label><input readOnly value={`${(stats?.producedQty || 0).toLocaleString('en-IN')} MT (${stats?.prodCount || 0} entries)`} /></div>
                <div className="fg"><label>Dispatched Quantity (MT)</label><input readOnly value={`${(stats?.dispatchedQty || 0).toLocaleString('en-IN')} MT (${stats?.saleCount || 0} sales)`} /></div>
                <div className="fg"><label>Dispatch Sale Value (₹)</label><input readOnly value={`₹${Math.round(stats?.dispatchedValue || 0).toLocaleString('en-IN')}`} /></div>
                <div className="fg"><label>Stoppage Days / Attendance Days</label><input readOnly value={`${stats?.stoppageDays || 0} stoppages · ${stats?.laborDays || 0} days logged`} /></div>
              </div>
            )}
          </div>

          <div className="form-section" style={{ marginBottom: '18px' }}>
            <div className="fs-title" style={{ fontSize: '13px', color: '#00b4d8', marginBottom: '6px' }}>
              Record Official IBM MTS Filing Reference
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text2, #94a3b8)' }}>
              After filing your return on <code style={{ color: '#00b4d8' }}>ibmts.gov.in</code> using your Production and Dispatches ledgers for {per}, record the acknowledgement number below.
            </p>
            <div className="fg">
              <label>IBM Acknowledgement Reference Number *</label>
              <input
                id="fb-reference"
                placeholder="e.g. MTS/2026/F1/..."
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Save Filed Acknowledgement →'}
          </button>
        </div>
      </div>
    </div>
  );
}
