import React, { useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from '../../context/ToastContext';

export default function AddMineModal({ isOpen, onClose, onMineAdded }) {
  const [name, setName] = useState('');
  const [leaseNumber, setLeaseNumber] = useState('');
  const [state, setState] = useState('RAJASTHAN');
  const [district, setDistrict] = useState('');
  const [mineral, setMineral] = useState('LIMESTONE');
  const [mineType, setMineType] = useState('METALLIFEROUS');
  const [leaseStart, setLeaseStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddMine = async () => {
    if (!name.trim() || !leaseNumber.trim() || !state || !mineral || !leaseStart) {
      toast('Please fill all required fields', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        leaseNumber: leaseNumber.trim(),
        state,
        district: district.trim(),
        mineral,
        mineType,
        leaseStartOn: Date.parse(leaseStart + 'T00:00:00Z'),
      };
      const mine = await apiFetch('/mines/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast(`Mine lease "${name}" added successfully!`, 'success');
      setName('');
      setLeaseNumber('');
      setDistrict('');
      if (onMineAdded) onMineAdded(mine);
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to add mine', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="modal-add-mine"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box medium">
        <div className="modal-header">
          <div>
            <h2>Add New Mine Lease</h2>
            <p className="modal-sub">This auto-generates your 12-month compliance calendar</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="fs-grid">
            <div className="fg">
              <label>Mine Name *</label>
              <input
                id="am-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Thakkar Limestone Quarry"
              />
            </div>
            <div className="fg">
              <label>Lease Number *</label>
              <input
                id="am-lease"
                value={leaseNumber}
                onChange={(e) => setLeaseNumber(e.target.value)}
                placeholder="ML/RJ/2019/0047"
              />
            </div>
            <div className="fg">
              <label>State *</label>
              <select
                id="am-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="RAJASTHAN">Rajasthan</option>
                <option value="GUJARAT">Gujarat</option>
                <option value="ODISHA">Odisha</option>
                <option value="JHARKHAND">Jharkhand</option>
                <option value="CHHATTISGARH">Chhattisgarh</option>
                <option value="MADHYA_PRADESH">Madhya Pradesh</option>
                <option value="GOA">Goa</option>
                <option value="KARNATAKA">Karnataka</option>
              </select>
            </div>
            <div className="fg">
              <label>District</label>
              <input
                id="am-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Jodhpur"
              />
            </div>
            <div className="fg">
              <label>Mineral *</label>
              <select
                id="am-mineral"
                value={mineral}
                onChange={(e) => setMineral(e.target.value)}
              >
                <option value="LIMESTONE">Limestone</option>
                <option value="IRON_ORE">Iron Ore</option>
                <option value="COAL">Coal</option>
                <option value="BAUXITE">Bauxite</option>
                <option value="MANGANESE">Manganese Ore</option>
                <option value="CHROMITE">Chromite</option>
                <option value="DOLOMITE">Dolomite</option>
                <option value="GRANITE">Granite</option>
              </select>
            </div>
            <div className="fg">
              <label>Mine Type</label>
              <select
                id="am-type"
                value={mineType}
                onChange={(e) => setMineType(e.target.value)}
              >
                <option value="METALLIFEROUS">Metalliferous</option>
                <option value="COAL">Coal</option>
              </select>
            </div>
            <div className="fg">
              <label>Lease Start Date *</label>
              <input
                type="date"
                id="am-lease-start"
                value={leaseStart}
                onChange={(e) => setLeaseStart(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleAddMine} disabled={loading}>
            {loading ? 'Adding…' : 'Add Mine & Generate Calendar →'}
          </button>
        </div>
      </div>
    </div>
  );
}
