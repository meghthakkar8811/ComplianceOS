import React, { useState, useEffect } from 'react';
import { catalogSearchAll } from '../../services/api';
import { toast } from '../../context/ToastContext';

const MONTH_INDEX = {
  JANUARY: 0, FEBRUARY: 1, MARCH: 2, APRIL: 3, MAY: 4, JUNE: 5,
  JULY: 6, AUGUST: 7, SEPTEMBER: 8, OCTOBER: 9, NOVEMBER: 10, DECEMBER: 11,
};

/** The latest royalty rate per (state, mineral, grade) — grade is null for a mineral-wide rate. */
function latestRoyaltyRatesByStateAndMineral(rates) {
  const latest = new Map();
  for (const rate of rates) {
    const key = `${rate.state || ''}:${rate.mineral || ''}:${rate.grade || ''}`;
    const existing = latest.get(key);
    const yr = Number(rate.year) || 0;
    const rank = yr * 12 + (MONTH_INDEX[rate.month] ?? 0);
    const existingYr = existing ? (Number(existing.year) || 0) : 0;
    const existingRank = existing ? existingYr * 12 + (MONTH_INDEX[existing.month] ?? 0) : -1;
    if (!existing || rank > existingRank) {
      latest.set(key, rate);
    }
  }
  return [...latest.values()];
}

/** The latest GST rate per mineral, most recently effective first. */
function latestGstRatesByMineral(rates) {
  const latest = new Map();
  for (const rate of rates) {
    const existing = latest.get(rate.mineral);
    if (!existing || rate.effectiveFrom > existing.effectiveFrom) {
      latest.set(rate.mineral, rate);
    }
  }
  return [...latest.values()];
}

export default function StatutoryRatesModal({ isOpen, onClose, activeMineral = '' }) {
  const [royaltyRates, setRoyaltyRates] = useState([]);
  const [gstRates, setGstRates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadRates();
  }, [isOpen]);

  const loadRates = async () => {
    setLoading(true);
    try {
      const [royaltyRes, gstRes] = await Promise.all([
        catalogSearchAll('RoyaltyRate', {}).catch(() => ({ items: [] })),
        catalogSearchAll('GstRate', {}).catch(() => ({ items: [] })),
      ]);
      setRoyaltyRates(latestRoyaltyRatesByStateAndMineral(royaltyRes?.items || []));
      setGstRates(latestGstRatesByMineral(gstRes?.items || []));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeMinerals = new Set(
    (activeMineral || '').split(',').map((m) => m.trim().toUpperCase()).filter(Boolean)
  );

  return (
    <div
      className="modal-overlay"
      id="modal-statutory-rates"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box large">
        <div className="modal-header">
          <div>
            <h2>Government Statutory Rates Schedule</h2>
            <p className="modal-sub">MMDR Act Second Schedule royalty rates, and GST rates on royalty under reverse charge</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="rate-source-banner" style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px' }}>
              <strong>Source:</strong> rates recorded on this platform, each with its own official citation.
            </div>
            <button
              className="btn-primary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={() => {
                loadRates();
                toast('Statutory rates reloaded', 'success');
              }}
              disabled={loading}
            >
              🔄 Reload
            </button>
          </div>

          <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>Royalty Rates (latest per state, mineral &amp; grade)</h3>
          <div className="table-wrap" style={{ marginBottom: '20px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>State</th>
                  <th>Mineral</th>
                  <th>Grade</th>
                  <th>Effective Period</th>
                  <th>Rate / MT</th>
                  <th>Source Citation</th>
                </tr>
              </thead>
              <tbody>
                {royaltyRates.length > 0 ? (
                  royaltyRates.map((rate) => {
                    const isCurrent = activeMinerals.has((rate.mineral || '').toUpperCase());
                    return (
                      <tr
                        key={rate.id}
                        style={{
                          background: isCurrent ? 'rgba(240,165,0,0.08)' : undefined,
                          fontWeight: isCurrent ? 600 : undefined,
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{rate.state}</span>
                            {isCurrent && <span className="rate-pill">Active Lease</span>}
                          </div>
                        </td>
                        <td>{rate.mineral}</td>
                        <td>{rate.grade || 'All grades'}</td>
                        <td>{rate.month} {rate.year}</td>
                        <td className="num-col">
                          <span className="rate-pill">₹{Number(rate.ratePerTonne).toFixed(2)}/MT</span>
                        </td>
                        <td>
                          <small style={{ color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{rate.sourceCitation}</small>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text2)', padding: '16px' }}>
                      {loading ? 'Loading…' : 'No royalty rates recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>GST on Royalty, Reverse Charge (latest per mineral)</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mineral</th>
                  <th>Effective From</th>
                  <th>Rate</th>
                  <th>Source Citation</th>
                </tr>
              </thead>
              <tbody>
                {gstRates.length > 0 ? (
                  gstRates.map((rate) => {
                    const isCurrent = activeMinerals.has((rate.mineral || '').toUpperCase());
                    return (
                      <tr
                        key={rate.id}
                        style={{
                          background: isCurrent ? 'rgba(240,165,0,0.08)' : undefined,
                          fontWeight: isCurrent ? 600 : undefined,
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{rate.mineral}</span>
                            {isCurrent && <span className="rate-pill">Active Lease</span>}
                          </div>
                        </td>
                        <td>{new Date(rate.effectiveFrom).toLocaleDateString('en-IN')}</td>
                        <td className="num-col">
                          <span className="rate-pill green">{(Number(rate.rate) * 100).toFixed(2)}%</span>
                        </td>
                        <td>
                          <small style={{ color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{rate.sourceCitation}</small>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text2)', padding: '16px' }}>
                      {loading ? 'Loading…' : 'No GST rates recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
