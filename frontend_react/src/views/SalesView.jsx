import React, { useState, useEffect, useCallback, memo } from 'react';
import { catalogSearch, catalogAggregate, apiFetch, downloadInvoice } from '../services/api';
import { toast } from '../context/ToastContext';
import { SchemaForm } from '../components/forms/SchemaForm';
import PaginationBar from '../components/common/PaginationBar';

const PAGE_SIZE = 20;

const SalesView = memo(function SalesView({ activeMineId, onDataChanged }) {
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [sales, setSales] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [summary, setSummary] = useState({ totalQty: 0, totalVal: 0, dispatchCount: 0, distinctBuyers: 0 });
  const [buyerNames, setBuyerNames] = useState({});
  const [mineralNames, setMineralNames] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    setPage(0);
  }, [activeMineId, selectedMonth]);

  const loadBuyerNames = async (saleRows) => {
    const buyerIds = [...new Set(saleRows.map((s) => s.buyerId).filter(Boolean))];
    if (buyerIds.length === 0) return;
    try {
      const res = await catalogSearch('Buyer', {
        filter: { field: 'id', op: 'IN', values: buyerIds },
        page: { offset: 0, limit: buyerIds.length },
      });
      const names = {};
      for (const buyer of res.items || []) {
        names[buyer.id] = buyer.name;
      }
      setBuyerNames(names);
    } catch (e) {
      // Display nicety
    }
  };

  const loadMineralNames = async (saleRows) => {
    const mineralIds = [...new Set(saleRows.map((s) => s.mineral).filter(Boolean))];
    if (mineralIds.length === 0) return;
    try {
      const res = await catalogSearch(
        'Mineral',
        { filter: { field: 'id', op: 'IN', values: mineralIds }, page: { offset: 0, limit: mineralIds.length } },
        { mineId: activeMineId }
      );
      const names = {};
      for (const mineral of res.items || []) {
        names[mineral.id] = mineral.mineral;
      }
      setMineralNames(names);
    } catch (e) {
      // Display nicety
    }
  };

  const loadSales = useCallback(async () => {
    if (!activeMineId) return;
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = Date.UTC(year, month - 1, 1);
      const end = Date.UTC(year, month, 1);

      const filter = {
        op: 'AND',
        values: [
          { field: 'mineId', op: 'EQ', values: [activeMineId] },
          { field: 'dispatchedOn', op: 'GTE', values: [start] },
          { field: 'dispatchedOn', op: 'LT', values: [end] },
        ],
      };

      const [salesRes, totalsRes, buyersRes] = await Promise.all([
        catalogSearch('Sale', {
          filter,
          sorts: [{ field: 'dispatchedOn', order: 'DESC' }],
          page: { offset: page * PAGE_SIZE, limit: PAGE_SIZE },
          includeCount: true,
        }),
        catalogAggregate(
          'Sale',
          {
            filter,
            metrics: [
              { field: 'quantity', function: 'SUM', alias: 'totalQty' },
              { field: 'saleValue', function: 'SUM', alias: 'totalVal' },
              { field: 'id', function: 'COUNT', alias: 'dispatchCount' },
            ],
          },
          { mineId: activeMineId }
        ).catch(() => ({ buckets: [] })),
        catalogAggregate(
          'Sale',
          {
            filter,
            groupByFields: [{ field: 'buyerId', alias: 'buyerId' }],
            metrics: [{ field: 'id', function: 'COUNT', alias: 'count' }],
          },
          { mineId: activeMineId }
        ).catch(() => ({ buckets: [] })),
      ]);

      const items = salesRes?.items || [];
      setSales(items);
      setTotalCount(salesRes?.totalCount ?? items.length);

      const t = totalsRes?.buckets?.[0];
      const distinctBuyers = (buyersRes?.buckets || []).filter((b) => b.buyerId).length;
      setSummary({
        totalQty: t?.totalQty || 0,
        totalVal: t?.totalVal || 0,
        dispatchCount: t?.dispatchCount || 0,
        distinctBuyers,
      });

      loadBuyerNames(items);
      loadMineralNames(items);
    } catch (e) {
      toast('Failed to load dispatches', 'error');
    }
  }, [activeMineId, selectedMonth, page]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

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
      if (onDataChanged) onDataChanged();
    } catch (e) {
      toast(e.message || 'Failed to save dispatch entry', 'error');
    }
  };

  const handleDownloadInvoice = async (sale) => {
    setDownloadingId(sale.id);
    try {
      const result = await downloadInvoice(activeMineId, sale.id);
      if (!result.required) {
        toast('This sale does not require an invoice (non-commercial dispatch).', 'info');
      } else {
        toast('Invoice PDF downloaded successfully.', 'success');
      }
    } catch (e) {
      toast('Failed to download invoice: ' + (e.message || 'Server error'), 'error');
    } finally {
      setDownloadingId(null);
    }
  };

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
            key={activeMineId}
            assetType="Sale"
            mode="create"
            initialData={{ mineId: activeMineId }}
            onSubmit={handleSaveSale}
            onCancel={() => setShowSaleForm(false)}
            submitLabel="Save Dispatch"
          />
        </div>
      )}

      {/* SUMMARY ROW (Server-Side Aggregated) */}
      <div className="prod-summary-row" id="sale-summary">
        <div className="psr-card">
          <span className="psr-label">Total Dispatched</span>
          <span className="psr-val">{summary.totalQty.toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT</span>
        </div>
        <div className="psr-card">
          <span className="psr-label">Total Value</span>
          <span className="psr-val">₹{summary.totalVal.toLocaleString('en-IN')}</span>
        </div>
        <div className="psr-card">
          <span className="psr-label">Dispatches</span>
          <span className="psr-val">{summary.dispatchCount}</span>
        </div>
        <div className="psr-card">
          <span className="psr-label">Distinct Buyers</span>
          <span className="psr-val">{summary.distinctBuyers}</span>
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
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-primary"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                          disabled={downloadingId === s.id}
                          onClick={() => handleDownloadInvoice(s)}
                          title="Download Official Tax Invoice PDF (Generated by ComplianceOS Backend)"
                        >
                          {downloadingId === s.id ? '…' : '📄 Invoice'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text2)', padding: '24px' }}>
                    No buyer dispatches recorded for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          itemCount={sales.length}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
});

export default SalesView;
