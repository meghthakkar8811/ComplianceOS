import React, { useState } from 'react';
import { apiFetch, apiUpload } from '../../services/api';
import { toast } from '../../context/ToastContext';

export default function AddDocModal({ isOpen, onClose, activeMineId, onDocAdded }) {
  const [title, setTitle] = useState('');
  const [authority, setAuthority] = useState('STATE_GOVT');
  const [recordType, setRecordType] = useState('CLEARANCE');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      toast('Document title is required', 'error');
      return;
    }
    if (!file) {
      toast('Please select a file to upload', 'error');
      return;
    }
    setLoading(true);
    try {
      const attachment = await apiUpload(file, `${activeMineId}/${Date.now()}_${file.name}`);
      const issuedOn = issuedDate ? Date.parse(issuedDate + 'T00:00:00Z') : null;
      const expiry = expiryDate ? Date.parse(expiryDate + 'T00:00:00Z') : null;

      const payload = {
        title: title.trim(),
        authority,
        recordType,
        attachment,
        issuedOn,
        expiry,
      };

      await apiFetch(`/mines/${activeMineId}/compliance/records/documents`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast('Document saved', 'success');
      setTitle('');
      setIssuedDate('');
      setExpiryDate('');
      setFile(null);
      if (onDocAdded) onDocAdded();
      onClose();
    } catch (e) {
      toast(e.message || 'Failed to save document', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      id="modal-add-doc"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box medium">
        <div className="modal-header">
          <div>
            <h2>Upload Document</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="fg">
            <label>Document Title *</label>
            <input
              id="doc-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Consent to Operate (CTO)"
            />
          </div>
          <div className="form-row-2">
            <div className="fg">
              <label>Authority *</label>
              <select
                id="doc-authority"
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
              >
                <option value="STATE_GOVT">State Govt (Lease)</option>
                <option value="MOEFCC">MoEFCC (Environmental)</option>
                <option value="DGMS">DGMS</option>
                <option value="IBM">IBM</option>
                <option value="SPCB">SPCB</option>
              </select>
            </div>
            <div className="fg">
              <label>Record Type *</label>
              <select
                id="doc-record-type"
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
              >
                <option value="CLEARANCE">Clearance / Certificate</option>
                <option value="STATUTORY_PLAN">Statutory Plan</option>
                <option value="NOTICE">Notice</option>
              </select>
            </div>
          </div>
          <div className="form-row-2">
            <div className="fg">
              <label>Issued Date</label>
              <input
                type="date"
                id="doc-issued"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
              />
            </div>
            <div className="fg">
              <label>Expiry Date</label>
              <input
                type="date"
                id="doc-expiry"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <div className="fg" style={{ marginTop: '8px' }}>
            <label>File Upload</label>
            <div
              style={{
                background: 'var(--bg-inp)',
                border: '2px dashed var(--border)',
                borderRadius: 'var(--r)',
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text2)',
                fontSize: '13px',
                position: 'relative',
              }}
            >
              📎 Drag & drop file here or click to upload<br />
              <small style={{ color: 'var(--text3)' }}>PDF, JPG, PNG up to 10MB</small>
              <input
                type="file"
                id="doc-file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                }}
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
              <div id="file-name-display" style={{ marginTop: '10px', fontWeight: 600, color: 'var(--text1)' }}>
                {file ? file.name : ''}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
