import React, { useState, useEffect } from 'react';
import { apiFetch, catalogSearchAll } from '../../services/api';
import { toast } from '../../context/ToastContext';

export default function DispatchModal({ isOpen, onClose, activeMineId, onSaved }) {
  const [dispatchedDate, setDispatchedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mineral, setMineral] = useState('');
  const [grade, setGrade] = useState('');
  const [saleType, setSaleType] = useState('DOMESTIC_SALE');
  const [buyerId, setBuyerId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [saleValue, setSaleValue] = useState('');
  const [deductionPerUnit, setDeductionPerUnit] = useState('0');
  const [saving, setSaving] = useState(false);

  const [mineralsList, setMineralsList] = useState([]);
  const [buyersList, setBuyersList] = useState([]);

  useEffect(() => {
    if (!isOpen || !activeMineId) return;

    // Load available minerals for this mine
    catalogSearchAll('Mineral', {}, { mineId: activeMineId })
      .then((res) => {
        const items = res?.items || [];
        setMineralsList(items);
        if (items.length > 0 && !mineral) {
          setMineral(items[0].id);
          if (items[0].grades?.length > 0) {
            setGrade(items[0].grades[0].name);
          }
        }
      })
      .catch(() => setMineralsList([]));

    // Load buyers master catalog
    catalogSearchAll('Buyer', {})
      .then((res) => {
        const items = res?.items || [];
        setBuyersList(items);
        if (items.length > 0 && !buyerId) {
          setBuyerId(items[0].id);
        }
      })
      .catch(() => setBuyersList([]));
  }, [isOpen, activeMineId]);

  if (!isOpen) return null;

  const currentMineral = mineralsList.find((m) => m.id === mineral);
  const grades = currentMineral?.grades || [];

  const handleMineralChange = (minId) => {
    setMineral(minId);
    const chosen = mineralsList.find((m) => m.id === minId);
    if (chosen?.grades?.length > 0) {
      setGrade(chosen.grades[0].name);
    } else {
      setGrade('');
    }
  };

  const handleQtyChange = (val) => {
    setQuantity(val);
    const numQty = Number(val) || 0;
    const numRate = Number(ratePerUnit) || 0;
    if (numRate > 0) {
      setSaleValue(String(Math.round(numQty * numRate)));
    }
  };

  const handleRateChange = (val) => {
    setRatePerUnit(val);
    const numRate = Number(val) || 0;
    const numQty = Number(quantity) || 0;
    if (numQty > 0) {
      setSaleValue(String(Math.round(numQty * numRate)));
    }
  };

  const numQty = Number(quantity) || 0;
  const numVal = Number(saleValue) || 0;
  const numDed = Number(deductionPerUnit) || 0;
  const totalDeductions = numDed * numQty;
  const exMineValue = Math.max(0, numVal - totalDeductions);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dispatchedDate) {
      toast('Dispatch date is required', 'error');
      return;
    }
    if (!mineral) {
      toast('Please select a mineral', 'error');
      return;
    }
    if (!buyerId) {
      toast('Please select a registered buyer', 'error');
      return;
    }
    if (!numQty || numQty <= 0) {
      toast('Please specify a valid dispatch quantity in MT', 'error');
      return;
    }
    if (!numVal || numVal <= 0) {
      toast('Please specify the total sale value (₹)', 'error');
      return;
    }

    setSaving(true);
    try {
      // Estimated statutory liability components
      const royaltyAmount = Math.round(exMineValue * 0.15);
      const dmfAmount = Math.round(royaltyAmount * 0.10);
      const nmetAmount = Math.round(royaltyAmount * 0.02);
      const gstAmount = Math.round(numVal * 0.05);

      const payload = {
        mineId: activeMineId,
        dispatchedOn: Date.parse(dispatchedDate + 'T00:00:00Z'),
        mineral,
        grade: grade || 'All Grades',
        type: saleType,
        buyerId,
        quantity: numQty,
        saleValue: numVal,
        deductionPerUnit: numDed,
        liability: {
          royaltyAmount,
          dmfAmount,
          nmetAmount,
          gstAmount,
        },
      };

      await apiFetch(`/mines/${activeMineId}/sales?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast('New dispatch recorded successfully!', 'success');
      onSaved?.();
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to save dispatch', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="modal-new-dispatch"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box medium" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div>
            <h2>Record New Mineral Dispatch</h2>
            <p className="modal-sub">Create commercial sale and generate statutory ex-mine invoice</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            <div className="form-row-2">
              <div className="fg">
                <label>Dispatch Date *</label>
                <input
                  type="date"
                  required
                  value={dispatchedDate}
                  onChange={(e) => setDispatchedDate(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Sale Type *</label>
                <select value={saleType} onChange={(e) => setSaleType(e.target.value)}>
                  <option value="DOMESTIC_SALE">Domestic Commercial Sale</option>
                  <option value="EXPORT">Export Dispatch</option>
                  <option value="CAPTIVE_CONSUMPTION">Captive Plant Transfer</option>
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="fg">
                <label>Mineral *</label>
                <select
                  required
                  value={mineral}
                  onChange={(e) => handleMineralChange(e.target.value)}
                >
                  <option value="">Select Mineral…</option>
                  {mineralsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.mineral}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>Grade / Quality</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                  <option value="">Select Grade…</option>
                  {grades.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                  {grades.length === 0 && <option value="Standard">Standard ROM</option>}
                </select>
              </div>
            </div>

            <div className="fg">
              <label>Registered Buyer *</label>
              <select
                required
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
              >
                <option value="">Select Buyer…</option>
                {buyersList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.gstin ? `(${b.gstin})` : ''} — {b.state}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row-2">
              <div className="fg">
                <label>Quantity (Metric Tonnes) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="e.g. 500.00"
                  value={quantity}
                  onChange={(e) => handleQtyChange(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Rate / MT (₹)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1850"
                  value={ratePerUnit}
                  onChange={(e) => handleRateChange(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="fg">
                <label>Gross Sale Value (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 925000"
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Deductions / MT (₹) <span style={{ color: 'var(--text2)', fontSize: '11px' }}>(Freight/Handling)</span></label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 150"
                  value={deductionPerUnit}
                  onChange={(e) => setDeductionPerUnit(e.target.value)}
                />
              </div>
            </div>

            {/* LIVE CALCULATION STRIP */}
            <div
              style={{
                marginTop: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                fontSize: '12px',
              }}
            >
              <div>
                <div style={{ color: 'var(--text2)', fontSize: '11px' }}>Total Deductions</div>
                <div className="mono" style={{ fontWeight: 600, color: '#f59e0b', marginTop: '2px' }}>
                  ₹{totalDeductions.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text2)', fontSize: '11px' }}>Taxable Ex-Mine Price</div>
                <div className="mono" style={{ fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
                  ₹{exMineValue.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text2)', fontSize: '11px' }}>Est. Royalty (15%)</div>
                <div className="mono" style={{ fontWeight: 600, color: 'var(--blue)', marginTop: '2px' }}>
                  ₹{Math.round(exMineValue * 0.15).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving Dispatch…' : 'Record Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
