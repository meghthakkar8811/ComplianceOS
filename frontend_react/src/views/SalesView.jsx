import React, { useState, useEffect, memo } from 'react';
import { catalogSearch, apiFetch, downloadInvoice } from '../services/api';
import { toast } from '../context/ToastContext';
import { SchemaForm } from '../components/forms/SchemaForm';

const SalesView = memo(function SalesView({ activeMineId }) {
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [sales, setSales] = useState([]);
  const [buyerNames, setBuyerNames] = useState({});
  const [mineralNames, setMineralNames] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (activeMineId) {
      loadSales();
    }
  }, [activeMineId, selectedMonth]);

  const loadSales = async () => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = new Date(year, month - 1, 1).getTime();
      const end = new Date(year, month, 1).getTime();

      const salesRes = await catalogSearch('Sale', {
        filter: {
          op: 'AND',
          values: [
            { field: 'mineId', op: 'EQ', values: [activeMineId] },
            { field: 'dispatchedOn', op: 'GTE', values: [start] },
            { field: 'dispatchedOn', op: 'LT', values: [end] },
          ],
        },
      }).catch(() => ({ items: [] }));

      const sortedSales = (salesRes.items || []).sort((a, b) => (b.dispatchedOn || 0) - (a.dispatchedOn || 0));
      setSales(sortedSales);
      loadBuyerNames(sortedSales);
      loadMineralNames(sortedSales);
    } catch (e) {
      toast('Failed to load dispatches', 'error');
    }
  };

  const loadBuyerNames = async (saleRows) => {
    const buyerIds = [...new Set(saleRows.map((s) => s.buyerId).filter(Boolean))];
    if (buyerIds.length === 0) return;
    try {
      const res = await catalogSearch('Buyer', { filter: { field: 'id', op: 'IN', values: buyerIds } });
      const names = {};
      for (const buyer of res.items || []) {
        names[buyer.id] = buyer.name;
      }
      setBuyerNames(names);
    } catch (e) {
      // Buyer names are a display nicety; leave the column blank for unresolved ids rather than
      // failing the whole dispatch list.
    }
  };

  // Sale.mineral holds a Mineral record id (e.g. "mine123:Iron Ore"), not a display name —
  // resolve it to the mineral name the same way buyerId is resolved to a buyer name.
  const loadMineralNames = async (saleRows) => {
    const mineralIds = [...new Set(saleRows.map((s) => s.mineral).filter(Boolean))];
    if (mineralIds.length === 0) return;
    try {
      const res = await catalogSearch(
        'Mineral',
        { filter: { field: 'id', op: 'IN', values: mineralIds } },
        { mineId: activeMineId }
      );
      const names = {};
      for (const mineral of res.items || []) {
        names[mineral.id] = mineral.mineral;
      }
      setMineralNames(names);
    } catch (e) {
      // A display nicety; leave the column blank for unresolved ids rather than failing the list.
    }
  };

  const handleSaveSale = async (formData) => {
    try {
      const payload = { ...formData, mineId: activeMineId };
      await apiFetch(`/mines/${activeMineId}/sales?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast('Dispatch saved successfully', 'success');
      setShowSaleForm(false);
      loadSales();
    } catch (e) {
      toast(e.message || 'Failed to save dispatch entry', 'error');
    }
  };

  const handleDownloadInvoice = async (sale) => {
    setDownloadingId(sale.id);
    try {
      const result = await downloadInvoice(activeMineId, sale.id);
      if (!result.required) {
        toast('No invoice required for this sale', 'info');
      }
    } catch (e) {
      toast(e.message || 'Failed to download invoice', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const totalSaleQty = sales.reduce((s, r) => s + (r.quantity || 0), 0);
  const totalSaleVal = sales.reduce((s, r) => s + (r.saleValue || 0), 0);

  return (
    <section className="page active" id="page-sales">
      <div className="page-header">
        <div className="page-title-block">
          <h1>Dispatches</h1>
          <p className="page-sub">Buyer-level sales — this is what royalty, stock, and ex-mine price are calculated from</p>
        </div>
        <div className="page-actions">
          <input
            type="month"
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
          <SchemaForm
            assetType="Sale"
            mode="create"
            onSubmit={handleSaveSale}
            onCancel={() => setShowSaleForm(false)}
            submitLabel="Save Dispatch"
          />
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
                <th>Mineral</th>
                <th>Grade</th>
                <th>Type</th>
                <th>Buyer</th>
                <th className="num-col">Qty (MT)</th>
                <th className="num-col">Sale Value</th>
                <th className="num-col">Deduction/MT</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody id="sale-tbody">
              {sales.length > 0 ? (
                sales.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.dispatchedOn).toLocaleDateString('en-IN')}</td>
                    <td>{mineralNames[s.mineral] || '—'}</td>
                    <td>{s.grade}</td>
                    <td>{(s.type || '').replace('_', ' ')}</td>
                    <td>{buyerNames[s.buyerId] || '—'}</td>
                    <td className="num-col">{s.quantity.toLocaleString('en-IN')} MT</td>
                    <td className="num-col">₹{(s.saleValue || 0).toLocaleString('en-IN')}</td>
                    <td className="num-col">₹{(s.deductionPerUnit || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <button
                        className="btn-ghost"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        disabled={downloadingId === s.id}
                        onClick={() => handleDownloadInvoice(s)}
                      >
                        {downloadingId === s.id ? '…' : 'Download'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text2)', padding: '24px' }}>
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

export default SalesView;
