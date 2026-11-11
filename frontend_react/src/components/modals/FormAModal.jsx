import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { fetchMinePeriodStats, getCurrentFyRange } from '../../utils/formStats';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FormAModal({ isOpen, onClose, activeMine, activeMineMinerals, onSubmitted, user }) {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const { start, end, label: fyYear } = getCurrentFyRange(now);

  useEffect(() => {
    if (!isOpen || !activeMine?.id) return;
    setLoading(true);
    fetchMinePeriodStats(activeMine.id, start, end)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [isOpen, activeMine?.id, start, end]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!referenceNumber.trim()) {
      toast('Enter the IBM Form A acknowledgement number', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (activeMine) {
        await apiFetch(`/mines/${activeMine.id}/compliance/records/returns`, {
          method: 'POST',
          body: JSON.stringify({
            title: 'IBM Form A — Annual Mineral Production Statistics',
            referenceNumber: referenceNumber.trim(),
          }),
        });
      }
      toast('IBM Form A submitted and filed successfully! Reference saved.', 'success');
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to submit Form A', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="modal-forma"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box large">
        <div className="modal-header">
          <div>
            <h2>IBM Form A — Annual Mineral Production & Statistics</h2>
            <p className="modal-sub" id="forma-period">Fiscal Year {fyYear} · Mine Profile & Annual Ledgers</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" id="forma-body">
          <div id="forma-content">
            <div className="form-section">
              <div className="fs-title">PART A — Mine & Mining Lease Specifics</div>
              <div className="fs-grid">
                <div className="fg"><label>Mine Name</label><input readOnly value={activeMine?.name || ''} /></div>
                <div className="fg"><label>IBM Registration Number</label><input readOnly value={activeMine?.ibmRegistration?.registrationNumber || '—'} /></div>
                <div className="fg">
                  <label>Lease Grant Date</label>
                  <input readOnly value={activeMine?.leaseStartOn ? new Date(activeMine.leaseStartOn).toLocaleDateString('en-IN') : '—'} />
                </div>
                <div className="fg"><label>Mine Type & State</label><input readOnly value={[activeMine?.mineType || '—', formatState(activeMine?.state || '')].join(' · ')} /></div>
                <div className="fg">
                  <label>Total Lease Area (Ha)</label>
                  <input readOnly value={activeMine?.ibmRegistration?.leaseArea ? `${activeMine.ibmRegistration.leaseArea} Ha` : '—'} />
                </div>
                <div className="fg">
                  <label>Sanctioned Annual Capacity (MT)</label>
                  <input readOnly value={activeMine?.ibmRegistration?.capacity ? `${Number(activeMine.ibmRegistration.capacity).toLocaleString('en-IN')} MT` : '—'} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART B — Recorded Annual Production & Dispatches (FY {fyYear})</div>
              {loading ? (
                <p style={{ fontSize: '12px', color: 'var(--text2)' }}>Loading FY ledgers…</p>
              ) : (
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Minerals Configured</td>
                      <td>{activeMineMinerals || '—'}</td>
                      <td>Mine Minerals</td>
                    </tr>
                    <tr>
                      <td>Total ROM Ore Extracted</td>
                      <td>{(stats?.producedQty || 0).toLocaleString('en-IN')} MT ({stats?.prodCount || 0} entries)</td>
                      <td>ProductionEntry</td>
                    </tr>
                    <tr>
                      <td>Total Ore Dispatched</td>
                      <td>{(stats?.dispatchedQty || 0).toLocaleString('en-IN')} MT ({stats?.saleCount || 0} sales)</td>
                      <td>Sale Ledger</td>
                    </tr>
                    <tr>
                      <td>Total Dispatch Value</td>
                      <td>₹{Math.round(stats?.dispatchedValue || 0).toLocaleString('en-IN')}</td>
                      <td>Sale Ledger</td>
                    </tr>
                  </tbody>
                </table>
              )}
              <p style={{ marginTop: '10px', fontSize: '11.5px', color: 'var(--text2)' }}>
                Note: Geological reserves, overburden/waste volume, ore purity %, machinery fleet counts, and explosives consumption are not tracked in ComplianceOS and must be entered directly on the IBM portal.
              </p>
            </div>

            <div className="form-section">
              <div className="fs-title">PART C — Declaration & Submission</div>
              <div className="fs-grid">
                <div className="fg"><label>Mines Geologist / Manager</label><input readOnly value={user?.username || 'Mines Manager'} /></div>
                <div className="fg"><label>Filing Date</label><input type="date" readOnly value={now.toISOString().slice(0, 10)} /></div>
                <div className="fg">
                  <label>IBM Acknowledgement Number *</label>
                  <input
                    id="fa-reference"
                    placeholder="e.g. IBM/FORMA/2026/0212"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit & Mark Filed →'}
          </button>
        </div>
      </div>
    </div>
  );
}
