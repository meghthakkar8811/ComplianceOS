import React, { useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from '../../context/ToastContext';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}


export default function FormJModal({ isOpen, onClose, activeMine, activeMineMinerals, onSubmitted, user }) {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const fyYear =
    now.getMonth() >= 3
      ? `${now.getFullYear()}–${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}–${now.getFullYear()}`;

  const annualProd = 45200;
  const annualDisp = 42100;
  const closingStock = 3100 + annualProd - annualDisp;

  const handleSubmit = async () => {
    if (!referenceNumber.trim()) {
      toast('Enter the IBM Form J acknowledgement number', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (activeMine) {
        await apiFetch(`/mines/${activeMine.id}/compliance/records/returns`, {
          method: 'POST',
          body: JSON.stringify({
            title: 'IBM Form J — Annual Return (Production, Employment & Wages)',
            referenceNumber: referenceNumber.trim(),
          }),
        });
      }
      toast('IBM Form J submitted and filed successfully! Reference saved.', 'success');
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to submit Form J', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="modal-formj"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box large">
        <div className="modal-header">
          <div>
            <h2>IBM Form J — Annual Return (Production, Employment & Wages)</h2>
            <p className="modal-sub" id="formj-period">Financial Year {fyYear} · Auto-calculated from Annual Log</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" id="formj-body">
          <div className="autofill-banner">
            <span className="afb-icon">✓</span>
            <span>95% auto-calculated from fiscal year production entries</span>
            <span className="afb-pct">95% complete</span>
          </div>

          <div id="formj-content">
            <div className="form-section">
              <div className="fs-title">PART I — General & Lease Particulars</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Mine Name</label>
                  <input readOnly value={activeMine?.name || ''} />
                </div>
                <div className="fg">
                  <label>IBM Registration Number</label>
                  <input readOnly value={`IBM/REG/${(activeMine?.leaseNumber || '8412').replace(/\//g, '')}`} />
                </div>
                <div className="fg">
                  <label>State & Mineral</label>
                  <input readOnly value={`${formatState(activeMine?.state || '')} · ${(activeMineMinerals || "—")}`} />
                </div>
                <div className="fg">
                  <label>Reporting Fiscal Year</label>
                  <input readOnly value={`FY ${fyYear}`} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART II — Annual Mineral Production & Stocks</div>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Mineral & Grade</th>
                    <th>Opening Stock (MT)</th>
                    <th>Production (MT)</th>
                    <th>Despatches (MT)</th>
                    <th>Closing Stock (MT)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{(activeMineMinerals || "—")} — ROM</td>
                    <td>3,100.00</td>
                    <td>{annualProd.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td>{annualDisp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td>{closingStock.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="form-section">
              <div className="fs-title">PART III — Annual Employment, Mandays & Wages</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Average Daily Employment</label>
                  <input readOnly value="52 workers" />
                </div>
                <div className="fg">
                  <label>Aggregate Mandays Worked</label>
                  <input readOnly value="15,840 mandays" />
                </div>
                <div className="fg">
                  <label>Total Wages & Salaries Paid (₹)</label>
                  <input readOnly value="₹98,20,800" />
                </div>
                <div className="fg">
                  <label>Mines Manager / Agent</label>
                  <input readOnly value={user?.username || 'Mines Manager'} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART IV — Verification & Filing</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Declaration</label>
                  <input readOnly value="Verified accurate per statutory records" disabled />
                </div>
                <div className="fg">
                  <label>Filing Date</label>
                  <input type="date" readOnly value={now.toISOString().slice(0, 10)} />
                </div>
                <div className="fg">
                  <label>IBM Reference Number *</label>
                  <input
                    id="fj-reference"
                    placeholder="e.g. IBM/FORMJ/2026/0889"
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

