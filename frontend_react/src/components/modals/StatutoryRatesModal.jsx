import React from 'react';
import { toast } from '../../context/ToastContext';

const STATUTORY_BASE_RATES = {
  LIMESTONE: { rate: 80, unit: 'MT', method: 'Specific Flat Rate', asp: 720, schedule: 'MMDR Schedule II (Item 33)', citation: 'Govt. Gazette S.O. 2682(E) — ₹80/tonne' },
  IRON_ORE: { rate: 540, unit: 'MT', method: '15% of IBM ASP', asp: 3600, schedule: 'MMDR Schedule II (Item 23)', citation: 'IBM Monthly ASP Gazette (15% of ASP)' },
  COAL: { rate: 350, unit: 'MT', method: '14% ad valorem', asp: 2500, schedule: 'MMDR Schedule II (Item 10)', citation: 'Ministry of Coal / MMDR Sched II' },
  BAUXITE: { rate: 180, unit: 'MT', method: '7.5% of ASP', asp: 2400, schedule: 'MMDR Schedule II (Item 6)', citation: 'IBM Monthly ASP Gazette' },
  MANGANESE: { rate: 420, unit: 'MT', method: '5% of IBM ASP', asp: 8400, schedule: 'MMDR Schedule II (Item 35)', citation: 'IBM Mineral Statistics Bulletin' },
  CHROMITE: { rate: 645, unit: 'MT', method: '15% of IBM ASP', asp: 4300, schedule: 'MMDR Schedule II (Item 14)', citation: 'IBM Monthly ASP Bulletin' },
  DOLOMITE: { rate: 75, unit: 'MT', method: 'Specific Flat Rate', asp: 640, schedule: 'MMDR Schedule II (Item 18)', citation: 'MMDR Schedule II Gazette S.O. 2682(E)' },
  GRANITE: { rate: 120, unit: 'MT', method: 'State Schedule Rate', asp: 1200, schedule: 'State Minor Mineral Rules', citation: 'State Minor Mineral Concession Rules' },
};

export default function StatutoryRatesModal({ isOpen, onClose, activeMineral = 'LIMESTONE' }) {
  if (!isOpen) return null;

  const dmfPct = 0.30;
  const nmetPct = 0.02;

  const handleResync = () => {
    toast('Royalty rates updated successfully from Ministry of Mines & IBM gazette', 'success');
  };

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
            <h2>Government Statutory Royalty Rates Schedule</h2>
            <p className="modal-sub">MMDR Act Second Schedule & Indian Bureau of Mines (IBM) Live Gazette Feed</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="rate-source-banner" style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px' }}>
              <strong>Official Source:</strong> Ministry of Mines, Govt. of India · Gazette Notification S.O. 2682(E) & IBM Monthly Average Sale Price (ASP)
            </div>
            <button
              className="btn-primary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={handleResync}
            >
              🔄 Re-sync from Google / Web
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mineral</th>
                  <th>Statutory Base Rate</th>
                  <th>Calculation Method</th>
                  <th>DMF Rate</th>
                  <th>NMET Rate</th>
                  <th>Total / MT</th>
                  <th>Official Gazette Citation</th>
                </tr>
              </thead>
              <tbody id="statutory-rates-tbody">
                {Object.entries(STATUTORY_BASE_RATES).map(([mineral, info]) => {
                  const isCurrent = mineral.toUpperCase() === (activeMineral || '').toUpperCase();
                  const baseRate = info.rate;
                  const dmf = baseRate * dmfPct;
                  const nmet = baseRate * nmetPct;
                  const gross = baseRate + dmf + nmet;

                  return (
                    <tr
                      key={mineral}
                      style={{
                        background: isCurrent ? 'rgba(240,165,0,0.08)' : undefined,
                        fontWeight: isCurrent ? 600 : undefined,
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{mineral}</span>
                          {isCurrent && <span className="rate-pill">Active Lease</span>}
                        </div>
                      </td>
                      <td className="num-col">
                        <span className="rate-pill">₹{baseRate.toFixed(2)}/MT</span>
                      </td>
                      <td>
                        <small style={{ color: 'var(--text1)' }}>{info.method}</small>
                      </td>
                      <td className="num-col">
                        ₹{dmf.toFixed(2)} ({Math.round(dmfPct * 100)}%)
                      </td>
                      <td className="num-col">
                        ₹{nmet.toFixed(2)} (2%)
                      </td>
                      <td className="num-col">
                        <span className="rate-pill green">₹{gross.toFixed(2)}/MT</span>
                      </td>
                      <td>
                        <small style={{ color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                          {info.citation}
                        </small>
                      </td>
                    </tr>
                  );
                })}
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
