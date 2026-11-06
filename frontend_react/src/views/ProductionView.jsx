import React, { useState, useEffect, memo } from 'react';
import { catalogSearch, apiFetch } from '../services/api';
import { toast } from '../context/ToastContext';

const ProductionView = memo(function ProductionView({ activeMineId }) {
  const [showProdForm, setShowProdForm] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [entries, setEntries] = useState([]);
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Prod Form State
  const [editEntryId, setEditEntryId] = useState(null);
  const [prodDate, setProdDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [prodShift, setProdShift] = useState('DAY');
  const [prodPit, setProdPit] = useState('');
  const [prodGrade, setProdGrade] = useState('');
  const [prodQty, setProdQty] = useState('');
  const [prodDisp, setProdDisp] = useState('');
  const [prodSup, setProdSup] = useState('');
  const [prodRem, setProdRem] = useState('');

  // Sale Form State
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saleGrade, setSaleGrade] = useState('');
  const [saleNature, setSaleNature] = useState('DOMESTIC_SALE');
  const [saleBuyer, setSaleBuyer] = useState('');
  const [saleBuyerReg, setSaleBuyerReg] = useState('');
  const [saleQty, setSaleQty] = useState('');
  const [saleValue, setSaleValue] = useState('');
  const [saleDeduction, setSaleDeduction] = useState('');

  useEffect(() => {
    if (activeMineId) {
      loadProductionData();
    }
  }, [activeMineId, selectedMonth]);

  const loadProductionData = async () => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = new Date(year, month - 1, 1).getTime();
      const end = new Date(year, month, 1).getTime();

      const [entriesRes, salesRes] = await Promise.all([
        catalogSearch('ProductionEntry', {
          filter: {
            op: 'AND',
            values: [
              { field: 'mineId', op: 'EQ', values: [activeMineId] },
              { field: 'entryTime', op: 'GTE', values: [start - 86400000] },
              { field: 'entryTime', op: 'LT', values: [end + 86400000] },
            ],
          },
        }).catch(() => ({ items: [] })),
        catalogSearch('Sale', {
          filter: {
            op: 'AND',
            values: [
              { field: 'mineId', op: 'EQ', values: [activeMineId] },
              { field: 'dispatchedOn', op: 'GTE', values: [start] },
              { field: 'dispatchedOn', op: 'LT', values: [end] },
            ],
          },
        }).catch(() => ({ items: [] })),
      ]);

      const sortedEntries = (entriesRes.items || []).sort((a, b) => (b.entryTime || 0) - (a.entryTime || 0));
      const sortedSales = (salesRes.items || []).sort((a, b) => (b.dispatchedOn || 0) - (a.dispatchedOn || 0));

      setEntries(sortedEntries);
      setSales(sortedSales);
    } catch (e) {
      toast('Failed to load production data', 'error');
    }
  };

  const handleSaveProd = async () => {
    if (!prodDate || !prodQty) {
      toast('Date and Produced Quantity are required.', 'error');
      return;
    }
    try {
      const payload = {
        mineId: activeMineId,
        entryTime: new Date(prodDate).getTime(),
        shift: prodShift,
        pitSection: prodPit || 'Pit A (North)',
        mineralGrade: prodGrade || 'Grade A',
        quantity: Number(prodQty),
        quantityDispatched: Number(prodDisp) || 0,
        supervisorName: prodSup || 'Pit Supervisor',
        remarks: prodRem,
        status: 'VERIFIED',
      };
      if (editEntryId) {
        payload.id = editEntryId;
      }
      await apiFetch(`/mines/${activeMineId}/production?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast(editEntryId ? 'Entry updated' : 'Production entry saved', 'success');
      setShowProdForm(false);
      setEditEntryId(null);
      setProdQty('');
      setProdDisp('');
      loadProductionData();
    } catch (e) {
      toast(e.message || 'Failed to save production entry', 'error');
    }
  };

  const handleEditEntry = (r) => {
    setEditEntryId(r.id);
    setProdDate(new Date(r.entryTime).toISOString().slice(0, 10));
    setProdShift(r.shift || 'DAY');
    setProdPit(r.pitSection || '');
    setProdGrade(r.mineralGrade || '');
    setProdQty(String(r.quantity || ''));
    setProdDisp(String(r.quantityDispatched || ''));
    setProdSup(r.supervisorName || '');
    setProdRem(r.remarks || '');
    setShowProdForm(true);
  };

  const handleDeleteProd = async (id) => {
    if (!confirm('Are you sure you want to delete this shift entry?')) return;
    try {
      await apiFetch(`/mines/${activeMineId}/production/${id}`, { method: 'DELETE' });
      toast('Entry deleted', 'success');
      loadProductionData();
    } catch (e) {
      toast(e.message || 'Failed to delete entry', 'error');
    }
  };

  const handleVerifyEntry = async (r) => {
    try {
      await apiFetch(`/mines/${activeMineId}/production?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify({ ...r, status: 'VERIFIED' }),
      });
      toast('Entry verified', 'success');
      loadProductionData();
    } catch (e) {
      toast(e.message || 'Failed to verify entry', 'error');
    }
  };

  const handleSaveSale = async () => {
    if (!saleDate || !saleQty || !saleBuyer) {
      toast('Date, Quantity, and Buyer Name are required.', 'error');
      return;
    }
    try {
      const payload = {
        mineId: activeMineId,
        dispatchedOn: new Date(saleDate).getTime(),
        grade: saleGrade || 'Grade A',
        natureOfSale: saleNature,
        buyerName: saleBuyer,
        buyerIbmRegNo: saleBuyerReg,
        quantity: Number(saleQty),
        grossSaleValue: Number(saleValue) || 0,
        deductionPerTonne: Number(saleDeduction) || 0,
      };
      await apiFetch(`/mines/${activeMineId}/sales?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast('Dispatch saved successfully', 'success');
      setShowSaleForm(false);
      setSaleQty('');
      setSaleBuyer('');
      loadProductionData();
    } catch (e) {
      toast(e.message || 'Failed to save dispatch entry', 'error');
    }
  };

  const exportProdCSV = () => {
    const rows = [
      ['Date', 'Shift', 'Pit', 'Grade', 'Produced (MT)', 'Dispatched (MT)', 'Supervisor', 'Status'],
      ...entries.map((r) => [
        new Date(r.entryTime).toLocaleDateString('en-IN'),
        r.shift,
        r.pitSection,
        r.mineralGrade,
        r.quantity,
        r.quantityDispatched || 0,
        r.supervisorName || '',
        r.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production_${activeMineId}_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('CSV exported', 'success');
  };

  const totalP = entries.reduce((s, r) => s + (r.quantity || 0), 0);
  const totalD = entries.reduce((s, r) => s + (r.quantityDispatched || 0), 0);

  const totalSaleQty = sales.reduce((s, r) => s + (r.quantity || 0), 0);
  const totalSaleVal = sales.reduce((s, r) => s + (r.grossSaleValue || 0), 0);

  const filteredEntries = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.pitSection || '').toLowerCase().includes(q) ||
      (e.mineralGrade || '').toLowerCase().includes(q) ||
      (e.supervisorName || '').toLowerCase().includes(q)
    );
  });

  return (
    <section className="page active" id="page-production">
      <div className="page-header">
        <div className="page-title-block">
          <h1>Production Log</h1>
          <p className="page-sub">Daily shift-wise production entry</p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={exportProdCSV}>
            Export CSV
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setEditEntryId(null);
              setShowProdForm(!showProdForm);
            }}
          >
            {showProdForm ? 'Cancel' : '+ New Entry'}
          </button>
        </div>
      </div>

      {showProdForm && (
        <div className="prod-form-card" id="prod-form-card" style={{ display: 'block' }}>
          <div className="pfc-header">
            <h3 id="pf-form-title">{editEntryId ? 'Edit Production Entry' : 'New Production Entry'}</h3>
            <button className="icon-close" onClick={() => setShowProdForm(false)}>✕</button>
          </div>
          <div className="pfc-grid">
            <div className="fg">
              <label>Date</label>
              <input type="date" id="pf-date" value={prodDate} onChange={(e) => setProdDate(e.target.value)} />
            </div>
            <div className="fg">
              <label>Shift</label>
              <select id="pf-shift" value={prodShift} onChange={(e) => setProdShift(e.target.value)}>
                <option value="DAY">Day (6AM–6PM)</option>
                <option value="NIGHT">Night (6PM–6AM)</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            <div className="fg">
              <label>Pit / Section</label>
              <input id="pf-pit" value={prodPit} onChange={(e) => setProdPit(e.target.value)} placeholder="e.g. Pit A (North)" />
            </div>
            <div className="fg">
              <label>Grade</label>
              <input id="pf-grade" value={prodGrade} onChange={(e) => setProdGrade(e.target.value)} placeholder="e.g. Grade A" />
            </div>
            <div className="fg">
              <label>Produced (MT)</label>
              <input type="number" id="pf-prod" value={prodQty} onChange={(e) => setProdQty(e.target.value)} placeholder="1850" />
            </div>
            <div className="fg">
              <label>Dispatched (MT)</label>
              <input type="number" id="pf-disp" value={prodDisp} onChange={(e) => setProdDisp(e.target.value)} placeholder="1620" />
            </div>
            <div className="fg">
              <label>Supervisor</label>
              <input id="pf-sup" value={prodSup} onChange={(e) => setProdSup(e.target.value)} placeholder="Supervisor name" />
            </div>
            <div className="fg">
              <label>Remarks</label>
              <input id="pf-rem" value={prodRem} onChange={(e) => setProdRem(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="pfc-actions">
            <button className="btn-ghost" onClick={() => setShowProdForm(false)}>Cancel</button>
            <button className="btn-primary" id="pf-save-btn" onClick={handleSaveProd}>Save Entry</button>
          </div>
        </div>
      )}

      {/* SUMMARY ROW */}
      <div className="prod-summary-row" id="prod-summary">
        <div className="psr-card">
          <span className="psr-label">Total Produced</span>
          <span className="psr-val">{totalP.toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT</span>
        </div>
        <div className="psr-card">
          <span className="psr-label">Total Dispatched</span>
          <span className="psr-val">{totalD.toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT</span>
        </div>
        <div className="psr-card">
          <span className="psr-label">Entries</span>
          <span className="psr-val">{entries.length}</span>
        </div>
      </div>

      {/* Production Entries Table */}
      <div className="table-card">
        <div className="table-toolbar">
          <input
            className="table-search"
            id="prod-search"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="month"
            id="prod-month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              background: 'var(--bg-inp)',
              border: '1px solid var(--border)',
              color: 'var(--text0)',
              padding: '8px 12px',
              borderRadius: 'var(--r-sm)',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Pit</th>
                <th>Grade</th>
                <th className="num-col">Produced</th>
                <th className="num-col">Dispatched</th>
                <th>Supervisor</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="prod-tbody">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.entryTime).toLocaleDateString('en-IN')}</td>
                    <td>{r.shift}</td>
                    <td>{r.pitSection}</td>
                    <td>{r.mineralGrade}</td>
                    <td className="num-col">{r.quantity.toLocaleString('en-IN')} MT</td>
                    <td className="num-col">{(r.quantityDispatched || 0).toLocaleString('en-IN')} MT</td>
                    <td>{r.supervisorName || '—'}</td>
                    <td>
                      <span className={`status-pill ${r.status === 'VERIFIED' ? 'green' : 'amber'}`}>
                        {r.status || 'UNVERIFIED'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {r.status !== 'VERIFIED' && (
                          <button
                            className="btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => handleVerifyEntry(r)}
                          >
                            Verify
                          </button>
                        )}
                        <button
                          className="btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => handleEditEntry(r)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-ghost danger"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => handleDeleteProd(r.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text2)', padding: '24px' }}>
                    No production entries recorded for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DISPATCHES / SALES ── */}
      <div className="page-header" style={{ marginTop: '28px' }}>
        <div className="page-title-block">
          <h1 style={{ fontSize: '16px' }}>Dispatches</h1>
          <p className="page-sub">Buyer-level sales — this is what royalty, stock, and ex-mine price are calculated from</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => setShowSaleForm(!showSaleForm)}>
            {showSaleForm ? 'Cancel' : '+ New Dispatch'}
          </button>
        </div>
      </div>

      {showSaleForm && (
        <div className="prod-form-card" id="sale-form-card" style={{ display: 'block' }}>
          <div className="pfc-header">
            <h3>New Dispatch</h3>
            <button className="icon-close" onClick={() => setShowSaleForm(false)}>✕</button>
          </div>
          <div className="pfc-grid">
            <div className="fg">
              <label>Date</label>
              <input type="date" id="sf-date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            </div>
            <div className="fg">
              <label>Grade</label>
              <input id="sf-grade" value={saleGrade} onChange={(e) => setSaleGrade(e.target.value)} placeholder="e.g. Grade A" />
            </div>
            <div className="fg">
              <label>Nature</label>
              <select id="sf-nature" value={saleNature} onChange={(e) => setSaleNature(e.target.value)}>
                <option value="DOMESTIC_SALE">Domestic Sale</option>
                <option value="EXPORT">Export</option>
                <option value="DOMESTIC_TRANSFER">Domestic (Transfer)</option>
                <option value="CAPTIVE_CONSUMPTION">Captive Consumption</option>
              </select>
            </div>
            <div className="fg">
              <label>Buyer Name</label>
              <input id="sf-buyer" value={saleBuyer} onChange={(e) => setSaleBuyer(e.target.value)} placeholder="Buyer name" />
            </div>
            <div className="fg">
              <label>Buyer IBM Reg. No.</label>
              <input id="sf-buyer-reg" value={saleBuyerReg} onChange={(e) => setSaleBuyerReg(e.target.value)} placeholder="Optional" />
            </div>
            <div className="fg">
              <label>Quantity (MT)</label>
              <input type="number" id="sf-qty" value={saleQty} onChange={(e) => setSaleQty(e.target.value)} placeholder="1620" />
            </div>
            <div className="fg">
              <label>Sale Value (₹)</label>
              <input type="number" id="sf-value" value={saleValue} onChange={(e) => setSaleValue(e.target.value)} placeholder="Total sale/FOB value" />
            </div>
            <div className="fg">
              <label>Deduction (₹/MT)</label>
              <input type="number" id="sf-deduction" value={saleDeduction} onChange={(e) => setSaleDeduction(e.target.value)} placeholder="Beyond mine-head only" />
            </div>
          </div>
          <div className="pfc-actions">
            <button className="btn-ghost" onClick={() => setShowSaleForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveSale}>Save Dispatch</button>
          </div>
        </div>
      )}

      <div className="prod-summary-row" id="sale-summary">
        <div className="psr-card">
          <span className="psr-label">Total Dispatched</span>
          <span className="psr-val">{totalSaleQty.toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT</span>
        </div>
        <div className="psr-card">
          <span className="psr-label">Total Value</span>
          <span className="psr-val">₹{totalSaleVal.toLocaleString('en-IN')}</span>
        </div>
        <div className="psr-card">
          <span className="psr-label">Buyers</span>
          <span className="psr-val">{sales.length}</span>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Grade</th>
                <th>Nature</th>
                <th>Buyer</th>
                <th className="num-col">Qty (MT)</th>
                <th className="num-col">Sale Value</th>
                <th className="num-col">Deduction/MT</th>
              </tr>
            </thead>
            <tbody id="sale-tbody">
              {sales.length > 0 ? (
                sales.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.dispatchedOn).toLocaleDateString('en-IN')}</td>
                    <td>{s.grade}</td>
                    <td>{(s.natureOfSale || '').replace('_', ' ')}</td>
                    <td>{s.buyerName}</td>
                    <td className="num-col">{s.quantity.toLocaleString('en-IN')} MT</td>
                    <td className="num-col">₹{(s.grossSaleValue || 0).toLocaleString('en-IN')}</td>
                    <td className="num-col">₹{s.deductionPerTonne || 0}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text2)', padding: '24px' }}>
                    No buyer dispatches recorded for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
});

export default ProductionView;
