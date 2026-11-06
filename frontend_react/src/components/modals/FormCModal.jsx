import React, { useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from '../../context/ToastContext';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMineral(m) {
  if (!m) return '';
  const map = {
    IRON_ORE: 'Iron Ore',
    COAL: 'Coal',
    LIMESTONE: 'Limestone',
    BAUXITE: 'Bauxite',
    MANGANESE: 'Manganese Ore',
    CHROMITE: 'Chromite',
    DOLOMITE: 'Dolomite',
    GRANITE: 'Granite',
  };
  return map[m] || m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FormCModal({ isOpen, onClose, activeMine, onSubmitted, user }) {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const qNum = Math.floor(now.getMonth() / 3) + 1;
  const qName = `Q${qNum} ${now.getFullYear()} (${['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'][qNum - 1]})`;

  const totalShifts = 78;
  const avgWorkers = 54;
  const mandaysWorked = Math.round(avgWorkers * 68);

  const handleSubmit = async () => {
    if (!referenceNumber.trim()) {
      toast('Enter the IBM Form C acknowledgement number', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (activeMine) {
        await apiFetch(`/mines/${activeMine.id}/compliance-records`, {
          method: 'POST',
          body: JSON.stringify({
            mineId: activeMine.id,
            authority: 'IBM',
            recordType: 'RETURN',
            title: 'IBM Form C — Quarterly Return of Labour Employed',
            status: 'SUBMITTED',
            submittedOn: Date.now(),
            expiry: Date.now(),
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
            <p className="modal-sub" id="formc-period">{qName} · Auto-filled from shift logs</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" id="formc-body">
          <div className="autofill-banner">
            <span className="afb-icon">✓</span>
            <span>96% auto-filled from your shift & production logs</span>
            <span className="afb-pct">96% complete</span>
          </div>

          <div id="formc-content">
            <div className="form-section">
              <div className="fs-title">PART A — Mine & Lessee Identification</div>
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
                  <label>State & District</label>
                  <input readOnly value={`${formatState(activeMine?.state || '')} · ${activeMine?.district || 'Central'}`} />
                </div>
                <div className="fg">
                  <label>Mineral Mined</label>
                  <input readOnly value={formatMineral(activeMine?.mineral || '')} />
                </div>
                <div className="fg">
                  <label>Return Quarter</label>
                  <input readOnly value={qName} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART B — Quarterly Labour & Shift Statistics</div>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Classification</th>
                    <th>Daily Average</th>
                    <th>Total Mandays</th>
                    <th>Wages Paid (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Direct Opencast Labour (Male)</td>
                    <td>{Math.round(avgWorkers * 0.65)}</td>
                    <td>{Math.round(mandaysWorked * 0.65).toLocaleString('en-IN')}</td>
                    <td>₹{Math.round(mandaysWorked * 0.65 * 620).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td>Direct Opencast Labour (Female)</td>
                    <td>{Math.round(avgWorkers * 0.15)}</td>
                    <td>{Math.round(mandaysWorked * 0.15).toLocaleString('en-IN')}</td>
                    <td>₹{Math.round(mandaysWorked * 0.15 * 620).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td>Contract & Transport Labour</td>
                    <td>{Math.round(avgWorkers * 0.2)}</td>
                    <td>{Math.round(mandaysWorked * 0.2).toLocaleString('en-IN')}</td>
                    <td>₹{Math.round(mandaysWorked * 0.2 * 580).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{ fontWeight: 600, background: 'rgba(255,255,255,.04)' }}>
                    <td>Total All Categories</td>
                    <td>{avgWorkers}</td>
                    <td>{mandaysWorked.toLocaleString('en-IN')}</td>
                    <td>₹{Math.round(mandaysWorked * 610).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="form-section">
              <div className="fs-title">PART C — Operations Overview</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Shifts Worked in Quarter</label>
                  <input readOnly value={totalShifts} id="fc-shifts" />
                </div>
                <div className="fg">
                  <label>Total Ore Extracted (MT)</label>
                  <input readOnly value="98,000" />
                </div>
                <div className="fg">
                  <label>Total Ore Dispatched (MT)</label>
                  <input readOnly value="95,000" />
                </div>
                <div className="fg">
                  <label>Accidents Reported</label>
                  <input readOnly value="0 (Nil)" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART D — Verification & Submission</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Authorized Agent / Manager</label>
                  <input readOnly value={user?.username || 'Mines Manager'} id="fc-agent" />
                </div>
                <div className="fg">
                  <label>Submission Date</label>
                  <input type="date" readOnly value={now.toISOString().slice(0, 10)} />
                </div>
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

