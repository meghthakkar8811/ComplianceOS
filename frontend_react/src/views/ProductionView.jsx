import React, { useState, useEffect, useCallback, memo } from 'react';
import { catalogSearch, catalogSearchAll, catalogAggregate, apiFetch } from '../services/api';
import { toast } from '../context/ToastContext';
import PaginationBar from '../components/common/PaginationBar';

const PAGE_SIZE = 20;

const ProductionView = memo(function ProductionView({ activeMineId, onDataChanged }) {
  const [showProdForm, setShowProdForm] = useState(false);
  const [entries, setEntries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({ totalProduced: 0, entryCount: 0 });
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
  const [mineMinerals, setMineMinerals] = useState([]);

  // Prod Form State
  const [editEntryId, setEditEntryId] = useState(null);
  const [prodDate, setProdDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [prodShift, setProdShift] = useState('DAY');
  const [prodPit, setProdPit] = useState('');
  const [prodMineral, setProdMineral] = useState('');
  const [prodGrade, setProdGrade] = useState('');
  const [prodQty, setProdQty] = useState('');
  const [prodSup, setProdSup] = useState('');
  const [prodRem, setProdRem] = useState('');

  useEffect(() => {
    setPage(0);
  }, [activeMineId, selectedMonth, search]);

  useEffect(() => {
    if (!activeMineId) return;
    catalogSearchAll('Mineral', {}, { mineId: activeMineId })
      .then((res) => setMineMinerals(res.items || []))
      .catch(() => setMineMinerals([]));
  }, [activeMineId]);

  const mineralNameOf = (mineMineralId) => mineMinerals.find((m) => m.id === mineMineralId)?.mineral || '—';
  const gradesOf = (mineMineralId) => mineMinerals.find((m) => m.id === mineMineralId)?.grades || [];

  const loadProductionData = useCallback(async () => {
    if (!activeMineId) return;
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = Date.UTC(year, month - 1, 1);
      const end = Date.UTC(year, month, 1);

      const filterValues = [
        { field: 'mineId', op: 'EQ', values: [activeMineId] },
        { field: 'entryTime', op: 'GTE', values: [start] },
        { field: 'entryTime', op: 'LT', values: [end] },
      ];
      const q = search.trim();
      if (q) {
        filterValues.push({
          op: 'OR',
          values: [
            { field: 'pitSection', op: 'CONTAINS', values: [q] },
            { field: 'grade', op: 'CONTAINS', values: [q] },
            { field: 'supervisorName', op: 'CONTAINS', values: [q] },
          ],
        });
      }
      const filter = { op: 'AND', values: filterValues };

      const [entriesRes, aggRes] = await Promise.all([
        catalogSearch('ProductionEntry', {
          filter,
          sorts: [{ field: 'entryTime', order: 'DESC' }],
          page: { offset: page * PAGE_SIZE, limit: PAGE_SIZE },
          includeCount: true,
        }),
        catalogAggregate(
          'ProductionEntry',
          {
            filter,
            metrics: [
              { field: 'quantity', function: 'SUM', alias: 'totalProduced' },
              { field: 'id', function: 'COUNT', alias: 'entryCount' },
            ],
          },
          { mineId: activeMineId }
        ).catch(() => ({ buckets: [] })),
      ]);

      const items = entriesRes?.items || [];
      setEntries(items);
      setTotalCount(entriesRes?.totalCount ?? items.length);
      const bucket = aggRes?.buckets?.[0];
      setSummary({
        totalProduced: bucket?.totalProduced || 0,
        entryCount: bucket?.entryCount || 0,
      });
    } catch (e) {
      toast('Failed to load production data', 'error');
    }
  }, [activeMineId, selectedMonth, search, page]);

  useEffect(() => {
    loadProductionData();
  }, [loadProductionData]);

  const handleSaveProd = async () => {
    if (!prodDate || !prodQty) {
      toast('Date and Produced Quantity are required.', 'error');
      return;
    }
    try {
      const payload = {
        mineId: activeMineId,
        entryTime: Date.parse(prodDate + 'T00:00:00Z'),
        shift: prodShift,
        pitSection: prodPit || 'Pit A (North)',
        mineral: prodMineral,
        grade: prodGrade,
        quantity: Number(prodQty),
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
      setProdMineral('');
      setProdGrade('');
      setProdQty('');
      loadProductionData();
      if (onDataChanged) onDataChanged();
    } catch (e) {
      toast(e.message || 'Failed to save production entry', 'error');
    }
  };

  const handleEditEntry = (r) => {
    setEditEntryId(r.id);
    setProdDate(new Date(r.entryTime).toISOString().slice(0, 10));
    setProdShift(r.shift || 'DAY');
    setProdPit(r.pitSection || '');
    setProdMineral(r.mineral || '');
    setProdGrade(r.grade || '');
    setProdQty(String(r.quantity || ''));
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
      if (onDataChanged) onDataChanged();
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
      if (onDataChanged) onDataChanged();
    } catch (e) {
      toast(e.message || 'Failed to verify entry', 'error');
    }
  };

  return (
    <section className="page active" id="page-production">
      <div className="page-header">
        <div className="page-title-block">
          <h1>Production Log</h1>
          <p className="page-sub">Daily shift-wise production entry</p>
        </div>
        <div className="page-actions">
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
              <label>Mineral</label>
              <select
                id="pf-mineral"
                value={prodMineral}
                onChange={(e) => {
                  setProdMineral(e.target.value);
                  setProdGrade('');
                }}
              >
                <option value="">Select mineral…</option>
                {mineMinerals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.mineral}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>Grade</label>
              <select
                id="pf-grade"
                value={prodGrade}
                onChange={(e) => setProdGrade(e.target.value)}
                disabled={!prodMineral}
              >
                <option value="">Select grade…</option>
                {gradesOf(prodMineral).map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>Produced (MT)</label>
              <input type="number" id="pf-prod" value={prodQty} onChange={(e) => setProdQty(e.target.value)} placeholder="1850" />
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

      {/* SUMMARY ROW (Server-Side Aggregated) */}
      <div className="prod-summary-row" id="prod-summary">
        <div className="psr-card">
          <span className="psr-label">Total Produced</span>
          <span className="psr-val">{summary.totalProduced.toLocaleString('en-IN', { maximumFractionDigits: 1 })} MT</span>
        </div>
        <div className="psr-card">
          <span className="psr-label">Entries</span>
          <span className="psr-val">{summary.entryCount}</span>
        </div>
      </div>

      {/* Production Entries Table */}
      <div className="table-card">
        <div className="table-toolbar">
          <input
            className="table-search"
            id="prod-search"
            placeholder="Search pit, grade, supervisor…"
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
                <th>Mineral</th>
                <th>Grade</th>
                <th className="num-col">Produced</th>
                <th>Supervisor</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="prod-tbody">
              {entries.length > 0 ? (
                entries.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.entryTime).toLocaleDateString('en-IN')}</td>
                    <td>{r.shift}</td>
                    <td>{r.pitSection}</td>
                    <td>{mineralNameOf(r.mineral)}</td>
                    <td>{r.grade}</td>
                    <td className="num-col">{r.quantity.toLocaleString('en-IN')} MT</td>
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
                    No production entries recorded for this period.
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
          itemCount={entries.length}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
});

export default ProductionView;
