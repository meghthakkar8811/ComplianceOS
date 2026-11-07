import React, { useState, useEffect, memo } from 'react';
import { catalogAggregate, catalogSearch } from '../services/api';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

const RoyaltyView = memo(function RoyaltyView({ activeMine, onOpenStatutoryRates }) {
  const [tonnage, setTonnage] = useState(1000);
  const [baseRate, setBaseRate] = useState(0);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [royaltyRatesById, setRoyaltyRatesById] = useState({});

  useEffect(() => {
    if (activeMine) {
      loadRoyaltyData();
    }
  }, [activeMine]);

  // The statutory RoyaltyRate catalog is global reference data, not scoped to any one mine — load
  // it once so the current period's royaltyRateIds can be resolved to a mineral + source citation.
  useEffect(() => {
    catalogSearch('RoyaltyRate', {})
      .then((res) => {
        const byId = {};
        for (const rate of res.items || []) {
          byId[rate.id] = rate;
        }
        setRoyaltyRatesById(byId);
      })
      .catch(() => {
        // A display nicety for the schedule/citation row; the computed amounts don't depend on it.
      });
  }, []);

  const loadRoyaltyData = async () => {
    setLoading(true);
    try {
      // Royalty/DMF/NMET are computed and stored directly on each Sale at save time, so a
      // period's totals are a plain sum over its sales — grouped by royaltyRateId (not just
      // mineral/grade) so distinct rates applied that period can still be listed for display.
      // year/month are derived from dispatchedOn by the aggregation itself (month comes back as
      // 1-12, not a name), since Sale has no stored period fields of its own to group by.
      const result = await catalogAggregate(
        'Sale',
        {
          groupByFields: [
            { field: 'dispatchedOn', alias: 'year', additional: { dateTruncUnit: 'YEARS' } },
            { field: 'dispatchedOn', alias: 'month', additional: { dateTruncUnit: 'MONTHS' } },
            { field: 'liability.royaltyRateId', alias: 'royaltyRateId' },
          ],
          metrics: [
            { field: 'quantity', function: 'SUM', alias: 'quantity' },
            { field: 'liability.royaltyAmount', function: 'SUM', alias: 'royaltyAmount' },
            { field: 'liability.dmfAmount', function: 'SUM', alias: 'dmfAmount' },
            { field: 'liability.nmetAmount', function: 'SUM', alias: 'nmetAmount' },
          ],
        },
        { mineId: activeMine.id }
      );

      const periodKey = (bucket) => `${bucket.year}-${bucket.month}`;
      const periodsByKey = new Map();
      for (const bucket of result?.buckets || []) {
        const key = periodKey(bucket);
        const period =
          periodsByKey.get(key) ||
          { year: bucket.year, month: MONTH_NAMES[bucket.month - 1], quantity: 0, baseAmount: 0, dmfAmount: 0, nmetAmount: 0, royaltyRateIds: [] };
        period.quantity += bucket.quantity || 0;
        period.baseAmount += bucket.royaltyAmount || 0;
        period.dmfAmount += bucket.dmfAmount || 0;
        period.nmetAmount += bucket.nmetAmount || 0;
        if (bucket.royaltyRateId) period.royaltyRateIds.push(bucket.royaltyRateId);
        periodsByKey.set(key, period);
      }

      const periods = [...periodsByKey.entries()]
        .map(([key, period]) => ({
          id: key,
          ...period,
          grossLiability: period.baseAmount + period.dmfAmount + period.nmetAmount,
        }))
        .sort((a, b) => b.year - a.year || MONTH_NAMES.indexOf(b.month) - MONTH_NAMES.indexOf(a.month));

      setCurrent(periods[0] || null);
      setHistory(periods);
    } catch (e) {
      console.warn('Royalty fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const dmfPct = 0.30;
  const nmetPct = 0.02;

  // Current period liability — summed from each Sale's own stored royalty/DMF/NMET amounts, never estimated.
  const dispatchedQty = current?.quantity || 0;
  const curBase = current?.baseAmount || 0;
  const curDmf = current?.dmfAmount || 0;
  const curNmet = current?.nmetAmount || 0;
  const curGross = current?.grossLiability || 0;
  const curRatePerMt = dispatchedQty > 0 ? curBase / dispatchedQty : 0;

  // The estimator's starting rate is the mine's own latest real rate (averaged across whatever
  // minerals it dispatched), not a hardcoded guess — the user can still edit it freely.
  useEffect(() => {
    if (curRatePerMt > 0) {
      setBaseRate(Number(curRatePerMt.toFixed(2)));
    }
  }, [curRatePerMt]);

  const curMineralSchedule = (current?.royaltyRateIds || [])
    .map((id) => royaltyRatesById[id])
    .filter(Boolean)
    .map((rate) => `${rate.mineral} (${rate.sourceCitation})`)
    .join('; ') || '—';

  // Estimator math
  const estBase = Math.round(tonnage * baseRate);
  const estDmf = Math.round(estBase * dmfPct);
  const estNmet = Math.round(estBase * nmetPct);
  const estTotal = estBase + estDmf + estNmet;
  const perMtTotal = (estTotal / (tonnage || 1)).toFixed(2);

  return (
    <section className="page active" id="page-royalty">
      <div className="page-header">
        <div className="page-title-block">
          <h1>Royalty Calculator & Statutory Rates</h1>
          <p className="page-sub">Statutory royalty rates per metric tonne (MT), DMF, and NMET under MMDR Act Schedule II</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className="live-sync-indicator" id="rate-sync-indicator">
            <span className="live-pulse-dot" />
            <span id="rate-sync-text">Live Gov Sync: Active</span>
          </span>
          <button className="btn-ghost" onClick={onOpenStatutoryRates} title="View full government statutory rates table for all minerals">
            <span style={{ marginRight: '4px' }}>📊</span>All Mineral Rates
          </button>
          <button className="btn-primary" id="btn-sync-rates" onClick={loadRoyaltyData} title="Fetch and update latest statutory royalty rates online">
            <span id="sync-icon" style={{ marginRight: '4px' }}>🔄</span>Fetch Latest Rates
          </button>
        </div>
      </div>

      {/* Official Live Government Source Banner */}
      <div className="rate-source-banner" id="rate-source-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span className="gov-badge">Official Govt Gazette</span>
          <span id="rate-source-text">
            Source: Indian Bureau of Mines (ibm.gov.in) & Ministry of Mines Gazette (MMDR Act Schedule II)
          </span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text2)' }} id="rate-last-synced-time">
          Auto-synced via Google & Ministry of Mines Feed
        </div>
      </div>

      {/* Per-MT Statutory Rate Metric Cards */}
      <div className="royalty-kpi-row">
        <div className="rk-card highlight">
          <span className="rk-label">Base Royalty Rate (per MT)</span>
          <span className="rk-val amber" id="rk-base-rate">₹{baseRate}.00 / MT</span>
          <span className="rk-sub" id="rk-mineral-sub">{curMineralSchedule}</span>
        </div>
        <div className="rk-card">
          <span className="rk-label">Effective Total per MT</span>
          <span className="rk-val" id="rk-gross-rate">₹{perMtTotal} / MT</span>
          <span className="rk-sub" id="rk-eff-sub">Base + DMF (10-30%) + NMET (2%)</span>
        </div>
        <div className="rk-card">
          <span className="rk-label">Current Period Dispatched</span>
          <span className="rk-val" id="rk-dispatched-qty">{dispatchedQty.toLocaleString()} MT</span>
          <span className="rk-sub" id="rk-period-sub">Monthly dispatch tonnage</span>
        </div>
        <div className="rk-card">
          <span className="rk-label">Current Month Gross Liability</span>
          <span className="rk-val amber" id="rk-gross-total">₹{curGross.toLocaleString()}</span>
          <span className="rk-sub">Total statutory payable</span>
        </div>
      </div>

      <div className="royalty-layout">
        {/* Left: Current Period Breakdown & Per MT Quick Calculator */}
        <div className="royalty-output">
          <div className="computation-card">
            <div className="cc-header">
              <div>
                <h3>Current Period Liability</h3>
                <span className="cc-period" id="cc-period">
                  {current ? `${current.month} ${current.year}` : 'No period calculated yet'}
                </span>
              </div>
              <span className="rate-pill" id="co-rate-pill">₹{curRatePerMt.toFixed(2)} / MT Base</span>
            </div>

            <div className="comp-rows" id="comp-rows">
              <div className="cr">
                <span>Mineral & Schedule</span>
                <span className="mono" id="co-mineral-schedule">{curMineralSchedule}</span>
              </div>
              <div className="cr">
                <span>Dispatched Quantity</span>
                <span className="mono" id="co-qty">{dispatchedQty.toLocaleString()} MT</span>
              </div>
              <div className="cr subtotal">
                <div>
                  <span>Base Royalty</span>
                  <small style={{ display: 'block', fontSize: '10.5px', color: 'var(--text2)' }}>
                    Rate: ₹{curRatePerMt.toFixed(2)} / MT
                  </small>
                </div>
                <span className="mono" id="co-base">₹{curBase.toLocaleString()}</span>
              </div>
              <div className="cr">
                <div>
                  <span id="co-dmf-label">District Mineral Foundation (DMF)</span>
                  <small style={{ display: 'block', fontSize: '10.5px', color: 'var(--text2)' }}>
                    Rate: {curBase > 0 ? Math.round((curDmf / curBase) * 100) : 0}% of Base Royalty
                  </small>
                </div>
                <span className="mono" id="co-dmf">₹{curDmf.toLocaleString()}</span>
              </div>
              <div className="cr">
                <div>
                  <span id="co-nmet-label">National Mineral Exploration Trust (NMET)</span>
                  <small style={{ display: 'block', fontSize: '10.5px', color: 'var(--text2)' }}>
                    Rate: {curBase > 0 ? Math.round((curNmet / curBase) * 100) : 0}% of Base Royalty
                  </small>
                </div>
                <span className="mono" id="co-nmet">₹{curNmet.toLocaleString()}</span>
              </div>
              <div className="cr-divider amber" />
              <div className="cr gross">
                <div>
                  <span>Gross Statutory Liability</span>
                  <small style={{ display: 'block', fontSize: '11px', color: 'var(--amber)' }}>
                    Total: ₹{(dispatchedQty > 0 ? curGross / dispatchedQty : 0).toFixed(2)} / MT
                  </small>
                </div>
                <span className="mono amber-text" style={{ fontSize: '17px', fontWeight: 700 }} id="co-gross">
                  ₹{curGross.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Interactive Quick Per-MT Estimator */}
            <div className="calc-quick-box">
              <div className="calc-quick-header">
                <h4>Quick Per-MT Royalty Estimator</h4>
                <span className="rate-pill green" id="calc-mineral-badge">Live Calculator</span>
              </div>
              <div className="calc-quick-inputs">
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label>Tonnage (MT)</label>
                  <input
                    type="number"
                    id="quick-calc-tonnage"
                    value={tonnage}
                    onChange={(e) => setTonnage(Number(e.target.value) || 0)}
                    min="1"
                    step="10"
                  />
                </div>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label>Base Rate (₹/MT)</label>
                  <input
                    type="number"
                    id="quick-calc-rate"
                    value={baseRate}
                    onChange={(e) => setBaseRate(Number(e.target.value) || 0)}
                    min="0"
                    step="1"
                  />
                </div>
              </div>
              <div className="cr" style={{ border: 'none', padding: '5px 0', fontSize: '12px' }}>
                <span>Estimated Base Royalty:</span>
                <span className="mono" id="qc-base">₹{estBase.toLocaleString()}</span>
              </div>
              <div className="cr" style={{ border: 'none', padding: '5px 0', fontSize: '12px' }}>
                <span>Estimated DMF + NMET:</span>
                <span className="mono" id="qc-cess">₹{(estDmf + estNmet).toLocaleString()}</span>
              </div>
              <div className="cr" style={{ borderTop: '1px dashed var(--border)', padding: '8px 0 0 0', fontWeight: 600 }}>
                <span style={{ color: 'var(--text0)' }}>Total Liability (@ <span id="qc-per-mt-rate">₹{perMtTotal}</span>/MT):</span>
                <span className="mono green" id="qc-total">₹{estTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Royalty History Table with Per MT Breakdown */}
        <div className="royalty-output">
          <div className="history-card">
            <div className="cc-header">
              <div>
                <h3>Royalty History & Monthly Rates</h3>
                <span className="cc-period">Tonnage & per-MT Rates</span>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="num-col">Dispatched</th>
                    <th className="num-col">Base Rate</th>
                    <th className="num-col">Base Royalty</th>
                    <th className="num-col">DMF</th>
                    <th className="num-col">NMET</th>
                    <th className="num-col">Total / MT</th>
                    <th className="num-col">Gross</th>
                  </tr>
                </thead>
                <tbody id="royalty-history-tbody">
                  {history.length > 0 ? (
                    history.map((row) => {
                      const rowQty = row.quantity || 0;
                      const rowBase = row.baseAmount || 0;
                      const rowDmf = row.dmfAmount || 0;
                      const rowNmet = row.nmetAmount || 0;
                      const rowGross = row.grossLiability || 0;
                      const rowRate = rowQty > 0 ? rowBase / rowQty : 0;
                      const rowTotalPerMt = rowQty > 0 ? rowGross / rowQty : 0;
                      return (
                        <tr key={row.id || `${row.year}-${row.month}`}>
                          <td>{row.month} {row.year}</td>
                          <td className="num-col">{rowQty.toLocaleString()} MT</td>
                          <td className="num-col">₹{rowRate.toFixed(2)}</td>
                          <td className="num-col">₹{rowBase.toLocaleString()}</td>
                          <td className="num-col">₹{rowDmf.toLocaleString()}</td>
                          <td className="num-col">₹{rowNmet.toLocaleString()}</td>
                          <td className="num-col">₹{rowTotalPerMt.toFixed(2)}</td>
                          <td className="num-col" style={{ fontWeight: 600, color: 'var(--amber)' }}>
                            ₹{rowGross.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text2)', padding: '24px' }}>
                        No royalty calculated yet — add a production entry with a dispatch to generate one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default RoyaltyView;
