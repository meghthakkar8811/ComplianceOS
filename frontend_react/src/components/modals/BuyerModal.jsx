import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from '../../context/ToastContext';

const MINING_STATES = [
  { value: 'RAJASTHAN', label: 'Rajasthan' },
  { value: 'GUJARAT', label: 'Gujarat' },
  { value: 'ODISHA', label: 'Odisha' },
  { value: 'JHARKHAND', label: 'Jharkhand' },
  { value: 'CHHATTISGARH', label: 'Chhattisgarh' },
  { value: 'MADHYA_PRADESH', label: 'Madhya Pradesh' },
  { value: 'GOA', label: 'Goa' },
  { value: 'KARNATAKA', label: 'Karnataka' },
];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function BuyerModal({ isOpen, onClose, initialBuyer = null, onSaved }) {
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [ibmRegistrationNumber, setIbmRegistrationNumber] = useState('');
  const [state, setState] = useState('RAJASTHAN');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setName(initialBuyer?.name || '');
    setGstin(initialBuyer?.gstin || '');
    setIbmRegistrationNumber(initialBuyer?.ibmRegistrationNumber || '');
    setState(initialBuyer?.state || 'RAJASTHAN');
    setAddress(initialBuyer?.address || '');
    setErrors({});
  }, [isOpen, initialBuyer]);

  if (!isOpen) return null;

  const isEdit = Boolean(initialBuyer?.id);

  const validate = () => {
    const nextErrors = {};
    const trimmedName = name.trim();
    const trimmedGstin = gstin.trim().toUpperCase();

    if (!trimmedName) {
      nextErrors.name = 'Business / Buyer Name is required';
    }
    if (!state) {
      nextErrors.state = 'State is required';
    }
    if (trimmedGstin && !GSTIN_REGEX.test(trimmedGstin)) {
      nextErrors.gstin = 'Enter a valid 15-character GSTIN (e.g. 08AABCU9603R1ZM)';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const trimmedGstin = gstin.trim().toUpperCase();
      const trimmedIbm = ibmRegistrationNumber.trim();
      const trimmedAddress = address.trim();

      const payload = {
        ...(initialBuyer || {}),
        name: name.trim(),
        state,
        gstin: trimmedGstin || null,
        ibmRegistrationNumber: trimmedIbm || null,
        address: trimmedAddress || null,
      };

      await apiFetch('/buyers/?skipVersion=true', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast(isEdit ? 'Buyer business details updated' : 'Buyer added successfully', 'success');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to save buyer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="modal-buyer-form"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box medium">
        <div className="modal-header">
          <div>
            <h2>{isEdit ? 'Edit Buyer Business Details' : 'New Buyer — Business Details'}</h2>
            <p className="modal-sub">
              Register buyer identity, GSTIN, IBM trader code, and registered address for dispatches &amp; invoicing
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-section" style={{ marginBottom: '16px' }}>
              <div className="fs-title">Business &amp; Statutory Registration</div>
              <div className="fs-grid">
                <div className="fg" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="buyer-name">Business / Buyer Name *</label>
                  <input
                    id="buyer-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Shree Cement Ltd."
                    autoFocus
                  />
                  {errors.name && (
                    <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{errors.name}</span>
                  )}
                </div>

                <div className="fg">
                  <label htmlFor="buyer-gstin">GSTIN</label>
                  <input
                    id="buyer-gstin"
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 08AABCU9603R1ZM"
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.gstin && (
                    <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{errors.gstin}</span>
                  )}
                </div>

                <div className="fg">
                  <label htmlFor="buyer-ibm-reg">IBM Registration Number</label>
                  <input
                    id="buyer-ibm-reg"
                    type="text"
                    value={ibmRegistrationNumber}
                    onChange={(e) => setIbmRegistrationNumber(e.target.value)}
                    placeholder="e.g. IBM/TRD/RJ/2026/0012"
                  />
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="fs-title">Location &amp; Registered Address</div>
              <div className="fs-grid">
                <div className="fg" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="buyer-state">State *</label>
                  <select
                    id="buyer-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    {MINING_STATES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {errors.state && (
                    <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{errors.state}</span>
                  )}
                </div>

                <div className="fg" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="buyer-address">Registered Business Address</label>
                  <textarea
                    id="buyer-address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Plot / Street, Industrial Area, City, PIN Code"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Buyer →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

