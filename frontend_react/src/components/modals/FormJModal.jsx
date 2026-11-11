import React, { useState, useEffect } from 'react';
import { apiFetch, catalogAggregate, catalogSearchAll } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { fetchMinePeriodStats, getCurrentFyRange } from '../../utils/formStats';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FormJModal({ isOpen, onClose, activeMine, activeMineMinerals, onSubmitted, user }) {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);
  const [mineralRows, setMineralRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const { start, end, label: fyYear } = getCurrentFyRange(now);

  useEffect(() => {
    if (!isOpen || !activeMine?.id) return;
    const mineId = activeMine.id;
    setLoading(true);
    Promise.all([
      fetchMinePeriodStats(mineId, start, end),
      catalogSearchAll('Mineral', {}, { mineId }).catch(() => ({ items: [] })),
      catalogAggregate(
        'ProductionEntry',
        {
          filter: {
            op: 'AND',
            values: [
              { field: 'mineId', op: 'EQ', values: [mineId] },
              { field: 'entryTime', op: 'GTE', values: [start] },
              { field: 'entryTime', op: 'LT', values: [end] },
            ],
          },
          groupByFields: [{ field: 'mineral', alias: 'mineralId' }],
          metrics: [{ field: 'quantity', function: 'SUM', alias: 'producedQty' }],
        },
        { mineId }
      ).catch(() => ({ buckets: [] })),
      catalogAggregate(
        'Sale',
        {
          filter: {
            op: 'AND',
            values: [
              { field: 'mineId', op: 'EQ', values: [mineId] },
              { field: 'dispatchedOn', op: 'GTE', values: [start] },
              { field: 'dispatchedOn', op: 'LT', values: [end] },
            ],
          },
          groupByFields: [{ field: 'mineral', alias: 'mineralId' }],
          metrics: [{ field: 'quantity', function: 'SUM', alias: 'dispatchedQty' }],
        },
        { mineId }
      ).catch(() => ({ buckets: [] })),
    ])
      .then(([periodStats, mineralsRes, prodAgg, saleAgg]) => {
        setStats(periodStats);
        const minerals = mineralsRes?.items || [];
        const prodMap = new Map((prodAgg?.buckets || []).map((b) => [b.mineralId, b.producedQty || 0]));
        const saleMap = new Map((saleAgg?.buckets || []).map((b) => [b.mineralId, b.dispatchedQty || 0]));
        const rows = minerals.map((m) => {
          const opening = (m.grades || []).reduce((acc, g) => acc + (g.openingStock || 0), 0);
          const produced = prodMap.get(m.id) || 0;
          const dispatched = saleMap.get(m.id) || 0;
          return {
            name: m.mineral,
            opening,
            produced,
            dispatched,
            closing: opening + produced - dispatched,
          };
        });
        setMineralRows(rows);
      })
      .finally(() => setLoading(false));
  }, [isOpen, activeMine?.id, start, end]);

  if (!isOpen) return null;

  const avgDailyWorkers = stats?.laborDays > 0 ? Math.round(stats.totalMandays / stats.laborDays) : 0;

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
            <p className="modal-sub" id="formj-period">Financial Year {fyYear} · Live data from Mine Ledgers</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" id="formj-body">
          <div id="formj-content">
            <div className="form-section">
              <div className="fs-title">PART I — General & Lease Particulars</div>
              <div className="fs-grid">
                <div className="fg"><label>Mine Name</label><input readOnly value={activeMine?.name || ''} /></div>
                <div className="fg"><label>IBM Registration Number</label><input readOnly value={activeMine?.ibmRegistration?.registrationNumber || '—'} /></div>
                <div className="fg"><label>State & Mineral</label><input readOnly value={`${formatState(activeMine?.state || '')} · ${activeMineMinerals || '—'}`} /></div>
                <div className="fg"><label>Reporting Fiscal Year</label><input readOnly value={`FY ${fyYear}`} /></div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART II — Annual Mineral Production & Stocks</div>
              {loading ? (
                <p style={{ fontSize: '12px', color: 'var(--text2)' }}>Loading FY ledgers…</p>
              ) : (
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th>Mineral</th>
                      <th>Opening Stock (MT)</th>
                      <th>Production (MT)</th>
                      <th>Despatches (MT)</th>
                      <th>Closing Stock (MT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mineralRows.length > 0 ? (
                      mineralRows.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{row.opening.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td>{row.produced.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td>{row.dispatched.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td>{row.closing.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text2)' }}>
                          No minerals configured yet under Mine Management. Total FY Produced: {(stats?.producedQty || 0).toLocaleString('en-IN')} MT · Dispatched: {(stats?.dispatchedQty || 0).toLocaleString('en-IN')} MT
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="form-section">
              <div className="fs-title">PART III — Annual Employment, Mandays & Wages</div>
              <div className="fs-grid">
                <div className="fg"><label>Average Daily Employment</label><input readOnly value={`${avgDailyWorkers} workers (${stats?.laborDays || 0} days logged)`} /></div>
                <div className="fg"><label>Aggregate Mandays Worked</label><input readOnly value={`${(stats?.totalMandays || 0).toLocaleString('en-IN')} mandays`} /></div>
                <div className="fg"><label>Total Wages & Salaries Paid (₹)</label><input readOnly value={`₹${Math.round(stats?.totalWages || 0).toLocaleString('en-IN')}`} /></div>
                <div className="fg"><label>Mines Manager / Agent</label><input readOnly value={user?.username || 'Mines Manager'} /></div>
              </div>
            </div>

            <div className="form-section">
              <div className="fs-title">PART IV — Verification & Filing</div>
              <div className="fs-grid">
                <div className="fg"><label>Declaration</label><input readOnly value="Verified accurate per statutory records" disabled /></div>
                <div className="fg"><label>Filing Date</label><input type="date" readOnly value={now.toISOString().slice(0, 10)} /></div>
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
