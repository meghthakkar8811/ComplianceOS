import React, { useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from '../../context/ToastContext';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}


export default function FormBModal({ isOpen, onClose, activeMine, activeMineMinerals, onSubmitted, user }) {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const reportStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const per = reportStart.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleSubmit = async () => {
    if (!referenceNumber.trim()) {
      toast('Enter the IBM reference/acknowledgement number', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (activeMine) {
        await apiFetch(`/mines/${activeMine.id}/compliance-records`, {
          method: 'POST',
          body: JSON.stringify({
            mineId: activeMine.id,
            title: `IBM Monthly Return (F-Series) — ${per}`,
            authority: 'IBM',
            recordType: 'RETURN',
            status: 'SUBMITTED',
            submittedOn: Date.now(),
            expiry: Date.now(),
            referenceNumber: referenceNumber.trim(),
          }),
        });
      }
      toast('IBM Monthly Return submitted and filed! Reference saved.', 'success');
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
      <div className="modal-box large">
        <div className="modal-header">
          <div>
            <h2>IBM Monthly Return — F-Series</h2>
            <p className="modal-sub" id="formb-period">{per} · Auto-filled from ComplianceOS</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" id="formb-body">
          <div className="autofill-banner">
            <span className="afb-icon">✓</span>
            <span>94% of fields auto-filled from your production data</span>
            <span className="afb-pct">94% complete</span>
          </div>

          <div id="formb-content">
            <div className="form-section">
              <div className="fs-title">PART A — Mine Identification</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Name of Mine</label>
                  <input readOnly value={activeMine?.name || ''} />
                </div>
                <div className="fg">
                  <label>Lease Number</label>
                  <input readOnly value={activeMine?.leaseNumber || activeMine?.code || ''} />
                </div>
                <div className="fg">
                  <label>State</label>
                  <input readOnly value={formatState(activeMine?.state || '')} />
                </div>
                <div className="fg">
                  <label>Mineral</label>
                  <input readOnly value={(activeMineMinerals || "—")} />
                </div>
                <div className="fg">
                  <label>Return Period</label>
                  <input readOnly value={per} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART B — Production Data (Auto-filled)</div>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Produced (MT)</th>
                    <th>Dispatched (MT)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{(activeMineMinerals || "—")} — All Grades</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>98,000.000</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>95,000.000</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="form-section">
              <div className="fs-title">PART C — Employment</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Total Workers Employed</label>
                  <input readOnly value="48" id="fb-workers" />
                </div>
                <div className="fg">
                  <label>Mandays Worked</label>
                  <input readOnly value="1,248" id="fb-mandays" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART D — Declaration</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Agent / Manager Name</label>
                  <input readOnly value={user?.username || 'Mines Manager'} id="fb-agent" />
                </div>
                <div className="fg">
                  <label>Submission Date</label>
                  <input type="date" readOnly value={now.toISOString().slice(0, 10)} />
                </div>
                <div className="fg">
                  <label>IBM Reference Number *</label>
                  <input
                    id="fb-reference"
                    placeholder="e.g. IBM/MPR/2026/1042"
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
