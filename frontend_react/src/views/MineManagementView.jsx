import React, { useState, useEffect, useCallback, memo } from 'react';
import { apiFetch, catalogSearch, catalogSearchAll, catalogAggregate } from '../services/api';
import { toast } from '../context/ToastContext';
import PaginationBar from '../components/common/PaginationBar';

const PAGE_SIZE = 15;

const STATES = [
  ['RAJASTHAN', 'Rajasthan'],
  ['GUJARAT', 'Gujarat'],
  ['ODISHA', 'Odisha'],
  ['JHARKHAND', 'Jharkhand'],
  ['CHHATTISGARH', 'Chhattisgarh'],
  ['MADHYA_PRADESH', 'Madhya Pradesh'],
  ['GOA', 'Goa'],
  ['KARNATAKA', 'Karnataka'],
];

const PAYMENT_TYPES = [
  'ROYALTY',
  'DMF_CONTRIBUTION',
  'NMET_CONTRIBUTION',
  'GST_ON_ROYALTY_RCM',
  'RENT',
  'DEAD_RENT',
];

const STOPPAGE_REASONS = [
  'STRIKE',
  'LOCKOUT',
  'HEAVY_RAIN',
  'LABOUR_SHORTAGE',
  'TRANSPORT_BOTTLENECK',
  'LACK_OF_DEMAND',
  'UNECONOMIC_OPERATIONS',
  'OTHER',
];

function fmtDate(ms) {
  if (!ms) return '—';
  try {
    const d = new Date(ms);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
  } catch {
    return '—';
  }
}

function toDateInput(ms) {
  if (!ms) return '';
  try {
    const d = new Date(ms);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function useMinePagedList(mineId, assetType, sortField, reloadKey) {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(0);
  }, [mineId]);

  const load = useCallback(async () => {
    if (!mineId) return;
    setLoading(true);
    try {
      const res = await catalogSearch(assetType, {
        filter: { field: 'mineId', op: 'EQ', values: [mineId] },
        sorts: [{ field: sortField, order: 'DESC' }],
        page: { offset: page * PAGE_SIZE, limit: PAGE_SIZE },
        includeCount: true,
      });
      const list = res?.items || [];
      setItems(list);
      setTotalCount(res?.totalCount ?? list.length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mineId, assetType, sortField, page, reloadKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, totalCount, page, setPage, loading, reload: load };
}

const MineManagementView = memo(function MineManagementView({ activeMine, onMineUpdated, onOpenAddMine }) {
  const mineId = activeMine?.id;
  const [tab, setTab] = useState('profile');
  const [reloadKey, setReloadKey] = useState(0);
  const bumpReload = () => setReloadKey((k) => k + 1);

  // ---- TAB 1: Profile & IBM Registration + Minerals ----
  const [mineForm, setMineForm] = useState({
    name: '',
    leaseNumber: '',
    gstin: '',
    state: 'RAJASTHAN',
    district: '',
    mineType: 'METALLIFEROUS',
    leaseStart: '',
    active: true,
    ibmRegNo: '',
    leaseArea: '',
    capacity: '',
  });
  const [savingMine, setSavingMine] = useState(false);

  const [mineMinerals, setMineMinerals] = useState([]);
  const [platformMinerals, setPlatformMinerals] = useState([]);
  const [selectedMineralName, setSelectedMineralName] = useState('');
  const [gradeRows, setGradeRows] = useState([]);
  const [savingMineral, setSavingMineral] = useState(false);

  useEffect(() => {
    if (!activeMine) return;
    setMineForm({
      name: activeMine.name || '',
      leaseNumber: activeMine.leaseNumber || '',
      gstin: activeMine.gstin || '',
      state: activeMine.state || 'RAJASTHAN',
      district: activeMine.district || '',
      mineType: activeMine.mineType || 'METALLIFEROUS',
      leaseStart: toDateInput(activeMine.leaseStartOn),
      active: activeMine.active !== false,
      ibmRegNo: activeMine.ibmRegistration?.registrationNumber || '',
      leaseArea: activeMine.ibmRegistration?.leaseArea ?? '',
      capacity: activeMine.ibmRegistration?.capacity ?? '',
    });
  }, [activeMine]);

  const loadMineralsData = useCallback(async () => {
    if (!mineId) return;
    try {
      const [mineMinsRes, platMinsRes] = await Promise.all([
        catalogSearchAll('Mineral', {}, { mineId }).catch(() => ({ items: [] })),
        catalogSearchAll('Mineral', {}).catch(() => ({ items: [] })),
      ]);
      const mineMins = mineMinsRes?.items || [];
      const platMins = platMinsRes?.items || [];
      setMineMinerals(mineMins);
      setPlatformMinerals(platMins);
      if (!selectedMineralName && platMins.length > 0) {
        setSelectedMineralName(mineMins[0]?.mineral || platMins[0].mineral);
      }
    } catch {
      // keep existing
    }
  }, [mineId, selectedMineralName]);

  useEffect(() => {
    loadMineralsData();
  }, [loadMineralsData, reloadKey]);

  // Populate grade rows when selectedMineralName or mine/platform lists change
  useEffect(() => {
    if (!selectedMineralName) {
      setGradeRows([]);
      return;
    }
    const existingMineMin = mineMinerals.find((m) => m.mineral === selectedMineralName);
    const platMin = platformMinerals.find((m) => m.mineral === selectedMineralName);
    const existingByName = new Map((existingMineMin?.grades || []).map((g) => [g.name, g]));
    const platGradeNames = (platMin?.grades || []).map((g) => g.name);
    const mergedNames = [...new Set([...platGradeNames, ...existingByName.keys()])];
    if (mergedNames.length === 0) {
      setGradeRows([{ name: 'Standard', openingStock: '', openingPricePerUnit: '' }]);
      return;
    }
    setGradeRows(
      mergedNames.map((gName) => {
        const g = existingByName.get(gName);
        return {
          name: gName,
          openingStock: g?.openingStock ?? '',
          openingPricePerUnit: g?.openingPricePerUnit ?? '',
        };
      })
    );
  }, [selectedMineralName, mineMinerals, platformMinerals]);

  const handleSaveMine = async (e) => {
    e.preventDefault();
    if (!mineForm.name.trim() || !mineForm.leaseNumber.trim() || !mineForm.leaseStart) {
      toast('Name, Lease Number, and Lease Start Date are required', 'error');
      return;
    }
    setSavingMine(true);
    try {
      const payload = {
        ...(activeMine || {}),
        id: activeMine?.id,
        name: mineForm.name.trim(),
        leaseNumber: mineForm.leaseNumber.trim(),
        gstin: mineForm.gstin.trim() ? mineForm.gstin.trim().toUpperCase() : null,
        state: mineForm.state,
        district: mineForm.district.trim(),
        mineType: mineForm.mineType,
        active: Boolean(mineForm.active),
        leaseStartOn: Date.parse(mineForm.leaseStart + 'T00:00:00Z'),
        ibmRegistration: {
          registrationNumber: mineForm.ibmRegNo.trim() || null,
          leaseArea: Number(mineForm.leaseArea) || 0,
          capacity: Number(mineForm.capacity) || 0,
        },
      };
      const saved = await apiFetch('/mines/?skipVersion=true', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast('Mine profile & IBM registration saved', 'success');
      onMineUpdated?.(saved);
    } catch (err) {
      toast(err.message || 'Failed to update mine profile', 'error');
    } finally {
      setSavingMine(false);
    }
  };

  const handleSaveMineral = async (e) => {
    e.preventDefault();
    if (!selectedMineralName) return;
    setSavingMineral(true);
    try {
      const gradesPayload = gradeRows.map((g) => ({
        name: g.name,
        ...(g.openingStock !== '' && g.openingStock != null ? { openingStock: Number(g.openingStock) } : {}),
        ...(g.openingPricePerUnit !== '' && g.openingPricePerUnit != null
          ? { openingPricePerUnit: Number(g.openingPricePerUnit) }
          : {}),
      }));
      await apiFetch(`/mines/${mineId}/minerals?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify({
          mineral: selectedMineralName,
          grades: gradesPayload,
        }),
      });
      toast(`Saved mineral "${selectedMineralName}"`, 'success');
      await loadMineralsData();
      onMineUpdated?.();
    } catch (err) {
      toast(err.message || 'Failed to save mineral', 'error');
    } finally {
      setSavingMineral(false);
    }
  };

  // ---- TAB 2: MineRent ----
  const rents = useMinePagedList(mineId, 'MineRent', 'validFrom', reloadKey);
  const [rentForm, setRentForm] = useState({
    type: 'DEAD_RENT',
    amount: '',
    payee: '',
    validFrom: toDateInput(Date.now()),
    nextDueOn: '',
  });
  const [savingRent, setSavingRent] = useState(false);

  const handleSaveRent = async (e) => {
    e.preventDefault();
    if (!rentForm.amount || !rentForm.validFrom || !rentForm.nextDueOn) {
      toast('Amount, Valid From, and Next Due Date are required', 'error');
      return;
    }
    setSavingRent(true);
    try {
      await apiFetch(`/mines/${mineId}/rents?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify({
          type: rentForm.type,
          amount: Number(rentForm.amount),
          payee: rentForm.payee.trim() || null,
          validFrom: Date.parse(rentForm.validFrom + 'T00:00:00Z'),
          nextDueOn: Date.parse(rentForm.nextDueOn + 'T00:00:00Z'),
        }),
      });
      toast('Rent term saved', 'success');
      setRentForm((f) => ({ ...f, amount: '', payee: '' }));
      bumpReload();
    } catch (err) {
      toast(err.message || 'Failed to save rent term', 'error');
    } finally {
      setSavingRent(false);
    }
  };

  // ---- TAB 3: MinePayment ----
  const payments = useMinePagedList(mineId, 'MinePayment', 'paidOn', reloadKey);
  const [paymentSummary, setPaymentSummary] = useState({ totalPaid: 0, count: 0 });
  const [recentSales, setRecentSales] = useState([]);
  const [payForm, setPayForm] = useState({
    type: 'ROYALTY',
    referenceId: '',
    amount: '',
    paidOn: toDateInput(Date.now()),
    receiptNumber: '',
  });
  const [savingPay, setSavingPay] = useState(false);

  useEffect(() => {
    if (!mineId) return;
    catalogAggregate(
      'MinePayment',
      {
        metrics: [
          { field: 'amount', function: 'SUM', alias: 'totalPaid' },
          { field: 'id', function: 'COUNT', alias: 'count' },
        ],
      },
      { mineId }
    )
      .then((res) => {
        const b = res?.buckets?.[0] || {};
        setPaymentSummary({ totalPaid: b.totalPaid || 0, count: b.count || 0 });
      })
      .catch(() => {});
    catalogSearch('Sale', {
      filter: { field: 'mineId', op: 'EQ', values: [mineId] },
      sorts: [{ field: 'dispatchedOn', order: 'DESC' }],
      page: { offset: 0, limit: 25 },
    })
      .then((res) => setRecentSales(res?.items || []))
      .catch(() => {});
  }, [mineId, reloadKey]);

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount || !payForm.paidOn || !payForm.receiptNumber.trim()) {
      toast('Amount, Payment Date, and Receipt Number are required', 'error');
      return;
    }
    setSavingPay(true);
    try {
      await apiFetch(`/mines/${mineId}/payments?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify({
          type: payForm.type,
          referenceId: payForm.referenceId.trim() || null,
          amount: Number(payForm.amount),
          paidOn: Date.parse(payForm.paidOn + 'T00:00:00Z'),
          receiptNumber: payForm.receiptNumber.trim(),
        }),
      });
      toast('Statutory payment recorded', 'success');
      setPayForm((f) => ({ ...f, amount: '', receiptNumber: '' }));
      bumpReload();
    } catch (err) {
      toast(err.message || 'Failed to record payment', 'error');
    } finally {
      setSavingPay(false);
    }
  };

  // ---- TAB 4: LaborDay & LaborPayroll ----
  const laborDays = useMinePagedList(mineId, 'LaborDay', 'workedOn', reloadKey);
  const laborPayrolls = useMinePagedList(mineId, 'LaborPayroll', 'periodStart', reloadKey);
  const [laborSummary, setLaborSummary] = useState({ daysLogged: 0, totalWages: 0 });
  const [dayForm, setDayForm] = useState({
    workedOn: toDateInput(Date.now()),
    belowGroundCount: 0,
    openCastCount: 0,
    aboveGroundCount: 0,
  });
  const [payRollForm, setPayRollForm] = useState({
    periodMonth: new Date().toISOString().slice(0, 7),
    belowGroundWages: 0,
    openCastWages: 0,
    aboveGroundWages: 0,
    technicalStaffCount: 0,
    technicalStaffSalary: 0,
  });
  const [savingLabor, setSavingLabor] = useState(false);

  useEffect(() => {
    if (!mineId) return;
    Promise.all([
      catalogAggregate(
        'LaborDay',
        { metrics: [{ field: 'id', function: 'COUNT', alias: 'count' }] },
        { mineId }
      ).catch(() => ({ buckets: [] })),
      catalogAggregate(
        'LaborPayroll',
        {
          metrics: [
            { field: 'belowGroundWages', function: 'SUM', alias: 'bg' },
            { field: 'openCastWages', function: 'SUM', alias: 'oc' },
            { field: 'aboveGroundWages', function: 'SUM', alias: 'ag' },
            { field: 'technicalStaffSalary', function: 'SUM', alias: 'tech' },
          ],
        },
        { mineId }
      ).catch(() => ({ buckets: [] })),
    ]).then(([dayRes, payRes]) => {
      const db = dayRes?.buckets?.[0] || {};
      const pb = payRes?.buckets?.[0] || {};
      setLaborSummary({
        daysLogged: db.count || 0,
        totalWages: (pb.bg || 0) + (pb.oc || 0) + (pb.ag || 0) + (pb.tech || 0),
      });
    });
  }, [mineId, reloadKey]);

  const handleSaveLaborDay = async (e) => {
    e.preventDefault();
    if (!dayForm.workedOn) return;
    setSavingLabor(true);
    try {
      await apiFetch(`/mines/${mineId}/labor-days?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify({
          workedOn: Date.parse(dayForm.workedOn + 'T00:00:00Z'),
          belowGroundCount: Number(dayForm.belowGroundCount) || 0,
          openCastCount: Number(dayForm.openCastCount) || 0,
          aboveGroundCount: Number(dayForm.aboveGroundCount) || 0,
        }),
      });
      toast('Daily labor attendance saved', 'success');
      bumpReload();
    } catch (err) {
      toast(err.message || 'Failed to save labor day', 'error');
    } finally {
      setSavingLabor(false);
    }
  };

  const handleSavePayroll = async (e) => {
    e.preventDefault();
    if (!payRollForm.periodMonth) return;
    setSavingLabor(true);
    try {
      await apiFetch(`/mines/${mineId}/labor-payrolls?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify({
          periodStart: Date.parse(payRollForm.periodMonth + '-01T00:00:00Z'),
          belowGroundWages: Number(payRollForm.belowGroundWages) || 0,
          openCastWages: Number(payRollForm.openCastWages) || 0,
          aboveGroundWages: Number(payRollForm.aboveGroundWages) || 0,
          technicalStaffCount: Number(payRollForm.technicalStaffCount) || 0,
          technicalStaffSalary: Number(payRollForm.technicalStaffSalary) || 0,
        }),
      });
      toast('Monthly payroll return saved', 'success');
      bumpReload();
    } catch (err) {
      toast(err.message || 'Failed to save payroll return', 'error');
    } finally {
      setSavingLabor(false);
    }
  };

  // ---- TAB 5: MineStoppage ----
  const stoppages = useMinePagedList(mineId, 'MineStoppage', 'stoppedOn', reloadKey);
  const [stoppageForm, setStoppageForm] = useState({
    stoppedOn: toDateInput(Date.now()),
    reason: 'HEAVY_RAIN',
  });
  const [savingStoppage, setSavingStoppage] = useState(false);

  const handleSaveStoppage = async (e) => {
    e.preventDefault();
    if (!stoppageForm.stoppedOn) return;
    setSavingStoppage(true);
    try {
      await apiFetch(`/mines/${mineId}/stoppages?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify({
          stoppedOn: Date.parse(stoppageForm.stoppedOn + 'T00:00:00Z'),
          reason: stoppageForm.reason,
        }),
      });
      toast('Stoppage day recorded', 'success');
      bumpReload();
    } catch (err) {
      toast(err.message || 'Failed to save stoppage', 'error');
    } finally {
      setSavingStoppage(false);
    }
  };

  if (!activeMine) {
    return (
      <section className="page active" id="page-mine">
        <div className="page-header">
          <div className="page-title-block">
            <h1>Mine Management</h1>
            <p className="page-sub">Select or add a mine lease to manage profile, minerals, rents, payments, labour, and stoppages.</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-card, #0f172a)', borderRadius: '12px', border: '1px solid var(--border, #334155)', margin: '20px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⛏️</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text0, #f8fafc)' }}>No Mine Lease Selected</h3>
          <p style={{ color: 'var(--text2, #94a3b8)', maxWidth: '440px', margin: '0 auto 20px', fontSize: '13px' }}>
            There are currently no active mine leases configured in this account. Add your mining lease to begin compliance tracking.
          </p>
          {onOpenAddMine && (
            <button className="btn-primary" onClick={onOpenAddMine}>
              + Add Mine Lease
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="page active" id="page-mine">
      <div className="page-header">
        <div className="page-title-block">
          <h1>Mine Management</h1>
          <p className="page-sub">
            Lease profile, IBM registration, minerals & opening stock, rents, payments, labour & stoppages — {activeMine.name}
          </p>
        </div>
      </div>

      <div className="doc-filter-row" style={{ marginBottom: '20px' }}>
        {[
          ['profile', 'Lease, IBM & Minerals'],
          ['rents', 'Surface & Dead Rent'],
          ['payments', 'Statutory Payments'],
          ['labor', 'Labour & Payroll'],
          ['stoppages', 'Stoppages'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`filter-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* PROFILE & MINERALS */}
      {tab === 'profile' && (
        <div className="dash-grid">
          <div className="card">
            <div className="card-header">
              <div>
                <span className="card-title">Lease & IBM Registration</span>
                <span className="card-sub">Edit mine master metadata, GSTIN & IBM parameters</span>
              </div>
            </div>
            <form onSubmit={handleSaveMine} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-row-2">
                <div className="fg">
                  <label>Mine Name *</label>
                  <input value={mineForm.name} onChange={(e) => setMineForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="fg">
                  <label>Lease Number *</label>
                  <input value={mineForm.leaseNumber} onChange={(e) => setMineForm((f) => ({ ...f, leaseNumber: e.target.value }))} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="fg">
                  <label>GSTIN</label>
                  <input value={mineForm.gstin} onChange={(e) => setMineForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))} placeholder="08ABCDE1234F1Z5" />
                </div>
                <div className="fg">
                  <label>Lease Start Date *</label>
                  <input type="date" value={mineForm.leaseStart} onChange={(e) => setMineForm((f) => ({ ...f, leaseStart: e.target.value }))} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="fg">
                  <label>State *</label>
                  <select value={mineForm.state} onChange={(e) => setMineForm((f) => ({ ...f, state: e.target.value }))}>
                    {STATES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label>District</label>
                  <input value={mineForm.district} onChange={(e) => setMineForm((f) => ({ ...f, district: e.target.value }))} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="fg">
                  <label>Mine Type</label>
                  <select value={mineForm.mineType} onChange={(e) => setMineForm((f) => ({ ...f, mineType: e.target.value }))}>
                    <option value="METALLIFEROUS">Metalliferous</option>
                    <option value="COAL">Coal</option>
                  </select>
                </div>
                <div className="fg">
                  <label>IBM Registration Number</label>
                  <input value={mineForm.ibmRegNo} onChange={(e) => setMineForm((f) => ({ ...f, ibmRegNo: e.target.value }))} placeholder="IBM/RAJ/2019/..." />
                </div>
              </div>
              <div className="form-row-2">
                <div className="fg">
                  <label>Lease Area (Hectares)</label>
                  <input type="number" step="0.01" value={mineForm.leaseArea} onChange={(e) => setMineForm((f) => ({ ...f, leaseArea: e.target.value }))} />
                </div>
                <div className="fg">
                  <label>Annual Sanctioned Capacity (MT)</label>
                  <input type="number" step="0.01" value={mineForm.capacity} onChange={(e) => setMineForm((f) => ({ ...f, capacity: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" type="submit" disabled={savingMine}>
                  {savingMine ? 'Saving…' : 'Save Mine & IBM Profile'}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <span className="card-title">Mine Minerals & Opening Balances</span>
                <span className="card-sub">
                  Configured: {mineMinerals.map((m) => m.mineral).join(', ') || 'None yet'}
                </span>
              </div>
            </div>
            <form onSubmit={handleSaveMineral} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="fg">
                <label>Mineral</label>
                <select value={selectedMineralName} onChange={(e) => setSelectedMineralName(e.target.value)}>
                  {platformMinerals.map((pm) => (
                    <option key={pm.mineral} value={pm.mineral}>
                      {pm.mineral} {mineMinerals.some((m) => m.mineral === pm.mineral) ? '✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {gradeRows.map((g, idx) => (
                  <div key={g.name} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: '12px' }}>{g.name}</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Opening Stock (MT)"
                      value={g.openingStock}
                      onChange={(e) =>
                        setGradeRows((rows) =>
                          rows.map((r, i) => (i === idx ? { ...r, openingStock: e.target.value } : r))
                        )
                      }
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Opening ₹/MT"
                      value={g.openingPricePerUnit}
                      onChange={(e) =>
                        setGradeRows((rows) =>
                          rows.map((r, i) => (i === idx ? { ...r, openingPricePerUnit: e.target.value } : r))
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" type="submit" disabled={savingMineral || !selectedMineralName}>
                  {savingMineral ? 'Saving…' : 'Save Mineral & Grades'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENTS */}
      {tab === 'rents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <span className="card-title">Add / Revise Rent Term</span>
                <span className="card-sub">Dead rent to State Government or surface rent to landowner</span>
              </div>
            </div>
            <form onSubmit={handleSaveRent} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', alignItems: 'end' }}>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Type</label>
                <select value={rentForm.type} onChange={(e) => setRentForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="DEAD_RENT">Dead Rent</option>
                  <option value="RENT">Surface Rent</option>
                </select>
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Amount (₹) *</label>
                <input type="number" step="0.01" value={rentForm.amount} onChange={(e) => setRentForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Payee</label>
                <input value={rentForm.payee} onChange={(e) => setRentForm((f) => ({ ...f, payee: e.target.value }))} placeholder="State Govt / Landowner" />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Valid From *</label>
                <input type="date" value={rentForm.validFrom} onChange={(e) => setRentForm((f) => ({ ...f, validFrom: e.target.value }))} />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Next Due Date *</label>
                <input type="date" value={rentForm.nextDueOn} onChange={(e) => setRentForm((f) => ({ ...f, nextDueOn: e.target.value }))} />
              </div>
              <button className="btn-primary" type="submit" disabled={savingRent}>{savingRent ? 'Saving…' : '+ Save Term'}</button>
            </form>
          </div>
          <div className="table-card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th className="num-col">Amount (₹)</th>
                    <th>Payee</th>
                    <th>Valid From</th>
                    <th>Valid Till</th>
                    <th>Next Due On</th>
                  </tr>
                </thead>
                <tbody>
                  {rents.loading ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Loading rent terms…</td></tr>
                  ) : rents.items.length > 0 ? rents.items.map((r) => (
                    <tr key={r.id}>
                      <td><span className="pill-badge">{r.type}</span></td>
                      <td className="num-col mono">₹{Number(r.amount || 0).toLocaleString()}</td>
                      <td>{r.payee || '—'}</td>
                      <td>{fmtDate(r.validFrom)}</td>
                      <td>{r.validTill ? fmtDate(r.validTill) : 'Current'}</td>
                      <td>{fmtDate(r.nextDueOn)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text2)' }}>No rent terms recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar page={rents.page} pageSize={PAGE_SIZE} totalCount={rents.totalCount} itemCount={rents.items.length} onPageChange={rents.setPage} />
          </div>
        </div>
      )}

      {/* PAYMENTS */}
      {tab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="prod-kpi-row">
            <div className="pk-card"><span className="pk-label">Total Statutory Paid</span><span className="pk-val">₹{Math.round(paymentSummary.totalPaid).toLocaleString()}</span></div>
            <div className="pk-card"><span className="pk-label">Payment Challans Recorded</span><span className="pk-val">{paymentSummary.count}</span></div>
          </div>
          <div className="card">
            <div className="card-header">
              <div><span className="card-title">Record Statutory Payment</span><span className="card-sub">Royalty, DMF, NMET, GST RCM, Rent, or Dead Rent challans</span></div>
            </div>
            <form onSubmit={handleSavePayment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', alignItems: 'end' }}>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Payment Type</label>
                <select value={payForm.type} onChange={(e) => setPayForm((f) => ({ ...f, type: e.target.value }))}>
                  {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Sale Reference (Optional)</label>
                <select value={payForm.referenceId} onChange={(e) => setPayForm((f) => ({ ...f, referenceId: e.target.value }))}>
                  <option value="">None / Standalone</option>
                  {recentSales.map((s) => (
                    <option key={s.id} value={s.id}>{fmtDate(s.dispatchedOn)} · {s.quantity} MT ({s.grade || s.mineral})</option>
                  ))}
                </select>
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Amount (₹) *</label>
                <input type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Paid On *</label>
                <input type="date" value={payForm.paidOn} onChange={(e) => setPayForm((f) => ({ ...f, paidOn: e.target.value }))} />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Receipt / Challan # *</label>
                <input value={payForm.receiptNumber} onChange={(e) => setPayForm((f) => ({ ...f, receiptNumber: e.target.value }))} />
              </div>
              <button className="btn-primary" type="submit" disabled={savingPay}>{savingPay ? 'Saving…' : '+ Record Payment'}</button>
            </form>
          </div>
          <div className="table-card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Paid On</th><th>Type</th><th>Receipt #</th><th>Reference Sale ID</th><th className="num-col">Amount (₹)</th></tr>
                </thead>
                <tbody>
                  {payments.loading ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Loading payments…</td></tr>
                  ) : payments.items.length > 0 ? payments.items.map((p) => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.paidOn)}</td>
                      <td><span className="pill-badge">{p.type}</span></td>
                      <td className="mono">{p.receiptNumber || '—'}</td>
                      <td className="mono">{p.referenceId || '—'}</td>
                      <td className="num-col mono">₹{Number(p.amount || 0).toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text2)' }}>No statutory payments recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar page={payments.page} pageSize={PAGE_SIZE} totalCount={payments.totalCount} itemCount={payments.items.length} onPageChange={payments.setPage} />
          </div>
        </div>
      )}

      {/* LABOUR & PAYROLL */}
      {tab === 'labor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="prod-kpi-row">
            <div className="pk-card"><span className="pk-label">Attendance Days Logged</span><span className="pk-val">{laborSummary.daysLogged}</span></div>
            <div className="pk-card"><span className="pk-label">Total Payroll Recorded</span><span className="pk-val">₹{Math.round(laborSummary.totalWages).toLocaleString()}</span></div>
          </div>
          <div className="dash-grid">
            <div className="card">
              <div className="card-header"><div><span className="card-title">Log Daily Employment</span><span className="card-sub">Headcount across categories</span></div></div>
              <form onSubmit={handleSaveLaborDay} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', alignItems: 'end' }}>
                <div className="fg" style={{ marginBottom: 0 }}><label>Date</label><input type="date" value={dayForm.workedOn} onChange={(e) => setDayForm((f) => ({ ...f, workedOn: e.target.value }))} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Below Ground</label><input type="number" min="0" value={dayForm.belowGroundCount} onChange={(e) => setDayForm((f) => ({ ...f, belowGroundCount: e.target.value }))} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Open Cast</label><input type="number" min="0" value={dayForm.openCastCount} onChange={(e) => setDayForm((f) => ({ ...f, openCastCount: e.target.value }))} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Above Ground</label><input type="number" min="0" value={dayForm.aboveGroundCount} onChange={(e) => setDayForm((f) => ({ ...f, aboveGroundCount: e.target.value }))} /></div>
                <button className="btn-primary" type="submit" disabled={savingLabor}>Save Day</button>
              </form>
              <div className="table-wrap" style={{ marginTop: '14px' }}>
                <table className="data-table">
                  <thead><tr><th>Date</th><th className="num-col">Below</th><th className="num-col">Open Cast</th><th className="num-col">Above</th><th className="num-col">Total</th></tr></thead>
                  <tbody>
                    {laborDays.items.length > 0 ? laborDays.items.map((d) => (
                      <tr key={d.id}>
                        <td>{fmtDate(d.workedOn)}</td>
                        <td className="num-col mono">{d.belowGroundCount}</td>
                        <td className="num-col mono">{d.openCastCount}</td>
                        <td className="num-col mono">{d.aboveGroundCount}</td>
                        <td className="num-col mono">{(d.belowGroundCount || 0) + (d.openCastCount || 0) + (d.aboveGroundCount || 0)}</td>
                      </tr>
                    )) : <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text2)' }}>No attendance entries.</td></tr>}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={laborDays.page} pageSize={PAGE_SIZE} totalCount={laborDays.totalCount} itemCount={laborDays.items.length} onPageChange={laborDays.setPage} />
            </div>

            <div className="card">
              <div className="card-header"><div><span className="card-title">Monthly Payroll Return</span><span className="card-sub">Category wages & technical staff</span></div></div>
              <form onSubmit={handleSavePayroll} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', alignItems: 'end' }}>
                <div className="fg" style={{ marginBottom: 0 }}><label>Month</label><input type="month" value={payRollForm.periodMonth} onChange={(e) => setPayRollForm((f) => ({ ...f, periodMonth: e.target.value }))} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Below Wages (₹)</label><input type="number" min="0" value={payRollForm.belowGroundWages} onChange={(e) => setPayRollForm((f) => ({ ...f, belowGroundWages: e.target.value }))} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Open Cast Wages (₹)</label><input type="number" min="0" value={payRollForm.openCastWages} onChange={(e) => setPayRollForm((f) => ({ ...f, openCastWages: e.target.value }))} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Above Wages (₹)</label><input type="number" min="0" value={payRollForm.aboveGroundWages} onChange={(e) => setPayRollForm((f) => ({ ...f, aboveGroundWages: e.target.value }))} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Tech Staff Count</label><input type="number" min="0" value={payRollForm.technicalStaffCount} onChange={(e) => setPayRollForm((f) => ({ ...f, technicalStaffCount: e.target.value }))} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Tech Salary (₹)</label><input type="number" min="0" value={payRollForm.technicalStaffSalary} onChange={(e) => setPayRollForm((f) => ({ ...f, technicalStaffSalary: e.target.value }))} /></div>
                <button className="btn-primary" type="submit" disabled={savingLabor}>Save Payroll</button>
              </form>
              <div className="table-wrap" style={{ marginTop: '14px' }}>
                <table className="data-table">
                  <thead><tr><th>Month</th><th className="num-col">Worker Wages</th><th className="num-col">Tech Staff</th><th className="num-col">Total Payout</th></tr></thead>
                  <tbody>
                    {laborPayrolls.items.length > 0 ? laborPayrolls.items.map((p) => {
                      const worker = (p.belowGroundWages || 0) + (p.openCastWages || 0) + (p.aboveGroundWages || 0);
                      return (
                        <tr key={p.id}>
                          <td>{new Date(p.periodStart).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</td>
                          <td className="num-col mono">₹{worker.toLocaleString()}</td>
                          <td className="num-col mono">{p.technicalStaffCount}</td>
                          <td className="num-col mono">₹{(worker + (p.technicalStaffSalary || 0)).toLocaleString()}</td>
                        </tr>
                      );
                    }) : <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text2)' }}>No payroll returns.</td></tr>}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={laborPayrolls.page} pageSize={PAGE_SIZE} totalCount={laborPayrolls.totalCount} itemCount={laborPayrolls.items.length} onPageChange={laborPayrolls.setPage} />
            </div>
          </div>
        </div>
      )}

      {/* STOPPAGES */}
      {tab === 'stoppages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card">
            <div className="card-header"><div><span className="card-title">Log Mine Stoppage Day</span><span className="card-sub">Used to compute days worked and statutory stoppage breakdowns</span></div></div>
            <form onSubmit={handleSaveStoppage} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end' }}>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Stoppage Date *</label>
                <input type="date" value={stoppageForm.stoppedOn} onChange={(e) => setStoppageForm((f) => ({ ...f, stoppedOn: e.target.value }))} />
              </div>
              <div className="fg" style={{ marginBottom: 0, minWidth: '220px' }}>
                <label>Reason *</label>
                <select value={stoppageForm.reason} onChange={(e) => setStoppageForm((f) => ({ ...f, reason: e.target.value }))}>
                  {STOPPAGE_REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <button className="btn-primary" type="submit" disabled={savingStoppage}>{savingStoppage ? 'Saving…' : '+ Record Stoppage'}</button>
            </form>
          </div>
          <div className="table-card">
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Reason</th></tr></thead>
                <tbody>
                  {stoppages.loading ? (
                    <tr><td colSpan="2" style={{ textAlign: 'center', padding: '20px' }}>Loading stoppages…</td></tr>
                  ) : stoppages.items.length > 0 ? stoppages.items.map((s) => (
                    <tr key={s.id}>
                      <td>{fmtDate(s.stoppedOn)}</td>
                      <td><span className="pill-badge">{(s.reason || 'UNKNOWN').replace(/_/g, ' ')}</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: 'var(--text2)' }}>No stoppage days recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar page={stoppages.page} pageSize={PAGE_SIZE} totalCount={stoppages.totalCount} itemCount={stoppages.items.length} onPageChange={stoppages.setPage} />
          </div>
        </div>
      )}
    </section>
  );
});

export default MineManagementView;
