import React, { useState } from 'react';
import { toast } from '../../context/ToastContext';

export default function DgmsRegisterUpdateModal({ isOpen, onClose, registerItem, onSave }) {
  if (!isOpen || !registerItem) return null;

  const reg = registerItem.register;
  const now = new Date().toISOString().slice(0, 10);
  const [updateDate, setUpdateDate] = useState(now);
  const [officerName, setOfficerName] = useState('Mines Manager (F.C.C.)');
  const [notes, setNotes] = useState('');
  const [certRef, setCertRef] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast('Please enter verification notes or log details', 'error');
      return;
    }

    onSave({
      registerId: reg.id,
      lastUpdatedAt: new Date(updateDate).getTime(),
      officer: officerName,
      notes: notes.trim(),
      certRef: certRef.trim()
    });

    toast(`${reg.title} updated and verified!`, 'success');
    onClose();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-card, #0f172a)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '540px',
        padding: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '10px', color: '#e8a020', fontFamily: 'var(--mono, monospace)', fontWeight: 700, textTransform: 'uppercase' }}>
              DGMS STATUTORY REGISTER UPDATE &bull; {reg.notes || 'MMR 1961'}
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              {reg.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text2, #94a3b8)', marginBottom: '4px' }}>
                Verification & Audit Date
              </label>
              <input
                type="date"
                value={updateDate}
                onChange={(e) => setUpdateDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '12.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text2, #94a3b8)', marginBottom: '4px' }}>
                Responsible Competent Officer / Signatory
              </label>
              <select
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '12.5px' }}
              >
                <option value="Mines Manager (F.C.C.)">Mines Manager (F.C.C. First Class Manager)</option>
                <option value="Safety Officer (MMR Reg. 43)">Safety Officer (MMR Reg. 43)</option>
                <option value="Workmen Inspector (Mining)">Workmen Inspector (Mining Discipline)</option>
                <option value="Certified Blaster / Magazine In-Charge">Certified Blaster / Magazine In-Charge</option>
                <option value="Medical Officer (Rule 29B)">Occupational Medical Officer (Rule 29B)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text2, #94a3b8)', marginBottom: '4px' }}>
                Verification Remarks / Entry Details
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Inspected all daily entries; physical verification matches log records. No statutory violations detected."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '12.5px', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--text2, #94a3b8)', marginBottom: '4px' }}>
                Certificate / Physical Register Reference Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. REG/MMR/2026/BOOK-4/PG-18"
                value={certRef}
                onChange={(e) => setCertRef(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '6px', background: 'transparent', color: '#cbd5e1', border: '1px solid #475569', fontSize: '12.5px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 20px', borderRadius: '6px', background: '#e8a020', color: '#050810', border: 'none', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
            >
              Confirm & Mark Up-to-Date
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
