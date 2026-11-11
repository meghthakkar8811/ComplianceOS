import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { fetchMinePeriodStats, getCurrentQuarterRange } from '../../utils/formStats';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FormCModal({ isOpen, onClose, activeMine, activeMineMinerals, onSubmitted, user }) {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const now = new Date();
  const { start, end, label: qName } = getCurrentQuarterRange(now);

  useEffect(() => {
    if (!isOpen || !activeMine?.id) return;
    setLoadingStats(true);
    fetchMinePeriodStats(activeMine.id, start, end)
      .then(setStats)
      .finally(() => setLoadingStats(false));
  }, [isOpen, activeMine?.id, start, end]);

  if (!isOpen) return null;

  const days = stats?.laborDays || 0;
  const avgDaily = (count) => (days > 0 ? Math.round(count / days) : 0);

  const handleSubmit = async () => {
    if (!referenceNumber.trim()) {
      toast('Enter the IBM Form C acknowledgement number', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (activeMine) {
        await apiFetch(`/mines/${activeMine.id}/compliance/records/returns`, {
          method: 'POST',
          body: JSON.stringify({
            title: 'IBM Form C — Quarterly Return of Labour Employed',
            referenceNumber: referenceNumber.trim(),
          }),
        });
      }
      toast('IBM Form C submitted and filed successfully! Reference saved.', 'success');
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to submit Form C', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="modal-formc"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box large">
        <div className="modal-header">
          <div>
            <h2>IBM Form C — Quarterly Return of Labour Employed</h2>
            <p className="modal-sub" id="formc-period">{qName} · Live data from Attendance, Payroll & Ledgers</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" id="formc-body">
          <div id="formc-content">
            <div className="form-section">
              <div className="fs-title">PART A — Mine & Lessee Identification</div>
              <div className="fs-grid">
                <div className="fg"><label>Name of Mine</label><input readOnly value={activeMine?.name || ''} /></div>
                <div className="fg"><label>Lease Number</label><input readOnly value={activeMine?.leaseNumber || activeMine?.code || ''} /></div>
                <div className="fg"><label>State & District</label><input readOnly value={[activeMine?.district, formatState(activeMine?.state || '')].filter(Boolean).join(', ') || '—'} /></div>
                <div className="fg"><label>Mineral Mined</label><input readOnly value={activeMineMinerals || '—'} /></div>
                <div className="fg"><label>Return Quarter</label><input readOnly value={qName} /></div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART B — Quarterly Labour & Wages (from LaborDay & LaborPayroll)</div>
              {loadingStats ? (
                <p style={{ fontSize: '12px', color: 'var(--text2)' }}>Loading quarterly labour records…</p>
              ) : (
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th>Classification</th>
                      <th>Daily Average</th>
                      <th>Total Mandays</th>
                      <th>Wages Recorded (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Below Ground</td>
                      <td>{avgDaily(stats?.bgMandays || 0)}</td>
                      <td>{(stats?.bgMandays || 0).toLocaleString('en-IN')}</td>
                      <td>₹{Math.round(stats?.bgWages || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td>Opencast</td>
                      <td>{avgDaily(stats?.ocMandays || 0)}</td>
                      <td>{(stats?.ocMandays || 0).toLocaleString('en-IN')}</td>
                      <td>₹{Math.round(stats?.ocWages || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td>Above Ground</td>
                      <td>{avgDaily(stats?.agMandays || 0)}</td>
                      <td>{(stats?.agMandays || 0).toLocaleString('en-IN')}</td>
                      <td>₹{Math.round(stats?.agWages || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td>Technical / Supervisory Staff (Payroll)</td>
                      <td>{stats?.payrollMonths > 0 ? Math.round((stats?.techCount || 0) / stats.payrollMonths) : (stats?.techCount || 0)}</td>
                      <td>—</td>
                      <td>₹{Math.round(stats?.techSalary || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr style={{ fontWeight: 600, background: 'rgba(255,255,255,.04)' }}>
                      <td>Total All Categories</td>
                      <td>{avgDaily(stats?.totalMandays || 0)}</td>
                      <td>{(stats?.totalMandays || 0).toLocaleString('en-IN')}</td>
                      <td>₹{Math.round(stats?.totalWages || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            <div className="form-section">
              <div className="fs-title">PART C — Operations Overview (from Production, Sales & Stoppages)</div>
              <div className="fs-grid">
                <div className="fg"><label>Attendance Days Logged in Quarter</label><input readOnly value={days} id="fc-shifts" /></div>
                <div className="fg"><label>Stoppage Days Recorded</label><input readOnly value={stats?.stoppageDays || 0} /></div>
                <div className="fg"><label>Total Ore Extracted (MT)</label><input readOnly value={(stats?.producedQty || 0).toLocaleString('en-IN')} /></div>
                <div className="fg"><label>Total Ore Dispatched (MT)</label><input readOnly value={(stats?.dispatchedQty || 0).toLocaleString('en-IN')} /></div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART D — Verification & Submission</div>
              <div className="fs-grid">
                <div className="fg"><label>Authorized Agent / Manager</label><input readOnly value={user?.username || 'Mines Manager'} id="fc-agent" /></div>
                <div className="fg"><label>Submission Date</label><input type="date" readOnly value={now.toISOString().slice(0, 10)} /></div>
                <div className="fg">
                  <label>IBM Acknowledgement / Ref Number *</label>
                  <input
                    id="fc-reference"
                    placeholder="e.g. IBM/FORMC/2026/0419"
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
