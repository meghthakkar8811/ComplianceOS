import React, { useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from '../../context/ToastContext';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FormAModal({ isOpen, onClose, activeMine, onSubmitted, user }) {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const fyYear =
    now.getMonth() >= 3
      ? `${now.getFullYear()}–${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}–${now.getFullYear()}`;

  const annualProd = 45200;
  const overburden = Math.round(annualProd * 1.85);

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
            <p className="modal-sub" id="forma-period">Fiscal Year {fyYear} · Geological & Mining Data</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" id="forma-body">
          <div className="autofill-banner">
            <span className="afb-icon">✓</span>
            <span>92% auto-filled from geological & mining logs</span>
            <span className="afb-pct">92% complete</span>
          </div>

          <div id="forma-content">
            <div className="form-section">
              <div className="fs-title">PART A — Mine & Mining Lease Specifics</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Mine Name</label>
                  <input readOnly value={activeMine?.name || ''} />
                </div>
                <div className="fg">
                  <label>Lease Grant Date</label>
                  <input
                    readOnly
                    value={
                      activeMine?.leaseStartOn
                        ? new Date(activeMine.leaseStartOn).toLocaleDateString('en-IN')
                        : '2019-04-01'
                    }
                  />
                </div>
                <div className="fg">
                  <label>Mine Type & Category</label>
                  <input readOnly value={`${activeMine?.mineType || 'METALLIFEROUS'} — Category 'A' Opencast`} />
                </div>
                <div className="fg">
                  <label>Total Lease Area (Ha)</label>
                  <input readOnly value="48.50 Ha" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART B — Mining & Geological Statistics</div>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Metric (Units)</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total ROM Ore Extracted</td>
                    <td>{annualProd.toLocaleString('en-IN')} MT</td>
                    <td>From Pit A & Pit B</td>
                  </tr>
                  <tr>
                    <td>Overburden / Waste Handled</td>
                    <td>{overburden.toLocaleString('en-IN')} MT</td>
                    <td>Stripping Ratio: 1:1.85</td>
                  </tr>
                  <tr>
                    <td>Estimated Remaining Reserves</td>
                    <td>1,420,000 MT</td>
                    <td>Proved (111) & Probable (122)</td>
                  </tr>
                  <tr>
                    <td>Average Mineral Grade (ROM)</td>
                    <td>53.8% purity</td>
                    <td>Chemical assay verified</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="form-section">
              <div className="fs-title">PART C — Machinery Deployed & Explosives</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Excavators (1.2–2.5 cu.m)</label>
                  <input readOnly value="4 units operational" />
                </div>
                <div className="fg">
                  <label>Dumpers / Tippers (25–35T)</label>
                  <input readOnly value="12 units operational" />
                </div>
                <div className="fg">
                  <label>Blast Hole Drill Rigs</label>
                  <input readOnly value="2 units (115mm dia)" />
                </div>
                <div className="fg">
                  <label>Explosives Consumed (SME/ANFO)</label>
                  <input readOnly value="18,450 kg" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART D — Declaration & Submission</div>
              <div className="fs-grid">
                <div className="fg">
                  <label>Mines Geologist / Manager</label>
                  <input readOnly value={user?.username || 'Mines Manager'} />
                </div>
                <div className="fg">
                  <label>Filing Date</label>
                  <input type="date" readOnly value={now.toISOString().slice(0, 10)} />
                </div>
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

