import React, { useState, useEffect, memo } from 'react';
import { catalogSearch, apiFetch, apiUpload, apiDownload } from '../services/api';
import { toast } from '../context/ToastContext';

const AUTHORITY_ICONS = {
  IBM: '📄',
  DGMS: '🏅',
  MOEFCC: '🌿',
  SPCB: '🏭',
  STATE_GOVT: '📜',
};

function getExpiryStatus(expiryMillis) {
  if (!expiryMillis) return 'none';
  const now = Date.now();
  if (expiryMillis < now) return 'expired';
  if (expiryMillis - now < 90 * 86400000) return 'expiring';
  return 'valid';
}

function getExpiryLabel(expiryMillis) {
  const s = getExpiryStatus(expiryMillis);
  return s === 'none'
    ? 'No Expiry'
    : s === 'expired'
    ? '✕ Expired'
    : s === 'expiring'
    ? '⚠ Expiring Soon'
    : '✓ Valid';
}

const DocumentsView = memo(function DocumentsView({ activeMineId, onOpenUploadDoc }) {
  const [filterAuth, setFilterAuth] = useState('');
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Edit Doc Modal State
  const [editingDoc, setEditingDoc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthority, setEditAuthority] = useState('STATE_GOVT');
  const [editRecordType, setEditRecordType] = useState('CLEARANCE');
  const [editIssued, setEditIssued] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (activeMineId) {
      loadDocuments();
    }
  }, [activeMineId, filterAuth]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const filters = [
        { field: 'mineId', op: 'EQ', values: [activeMineId] },
        { field: 'recordType', op: 'IN', values: ['CLEARANCE', 'STATUTORY_PLAN', 'NOTICE'] },
      ];
      if (filterAuth) {
        filters.push({ field: 'authority', op: 'EQ', values: [filterAuth] });
      }
      const res = await catalogSearch('ComplianceRecord', { filter: { op: 'AND', values: filters } });
      const rawDocs = (res.items || [])
        .filter((d) => d.recordType !== 'DELETED' && d.status !== 'DELETED')
        .sort((a, b) => (b.issuedOn || 0) - (a.issuedOn || 0));
      setDocs(rawDocs);
    } catch (e) {
      toast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDoc = async (doc) => {
    if (!doc.attachment) {
      toast('No file attached', 'info');
      return;
    }
    try {
      await apiDownload(doc.attachment);
    } catch (e) {
      toast(e.message || 'Failed to download document', 'error');
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await apiFetch(`/mines/${activeMineId}/compliance-records/${id}`, { method: 'DELETE' });
      toast('Document deleted', 'success');
      loadDocuments();
    } catch (e) {
      toast(e.message || 'Failed to delete document', 'error');
    }
  };

  const openEditModal = (d) => {
    setEditingDoc(d);
    setEditTitle(d.title || '');
    setEditAuthority(d.authority || 'STATE_GOVT');
    setEditRecordType(d.recordType || 'CLEARANCE');
    setEditIssued(d.issuedOn ? new Date(d.issuedOn).toISOString().slice(0, 10) : '');
    setEditExpiry(d.expiry ? new Date(d.expiry).toISOString().slice(0, 10) : '');
    setEditFile(null);
  };

  const handleSaveEdit = async () => {
    if (!editTitle) {
      toast('Document title is required', 'error');
      return;
    }
    setEditSaving(true);
    try {
      let attachment = editingDoc.attachment;
      if (editFile) {
        attachment = await apiUpload(editFile, `${activeMineId}/${Date.now()}_${editFile.name}`);
      }
      const issuedOn = editIssued ? Date.parse(editIssued + 'T00:00:00Z') : null;
      const expiry = editExpiry ? Date.parse(editExpiry + 'T00:00:00Z') : null;
      const status = expiry && expiry < Date.now() ? 'EXPIRED' : 'VALID';

      await apiFetch(`/mines/${activeMineId}/compliance-records`, {
        method: 'POST',
        body: JSON.stringify({
          ...editingDoc,
          title: editTitle,
          authority: editAuthority,
          recordType: editRecordType,
          attachment,
          issuedOn,
          expiry,
          status,
        }),
      });
      toast('Document updated successfully', 'success');
      setEditingDoc(null);
      loadDocuments();
    } catch (e) {
      toast(e.message || 'Failed to update document', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const filteredDocs = docs.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.title || '').toLowerCase().includes(q) ||
      (d.authority || '').toLowerCase().includes(q) ||
      (d.recordType || '').toLowerCase().includes(q)
    );
  });

  return (
    <section className="page active" id="page-documents">
      <div className="page-header">
        <div className="page-title-block">
          <h1>Document Repository</h1>
          <p className="page-sub">Lease, clearances, certificates — expiry tracked</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={onOpenUploadDoc}>
            + Upload Document
          </button>
        </div>
      </div>

      <div className="doc-toolbar">
        <div className="doc-filter-row" style={{ marginBottom: 0 }}>
          <button
            className={`filter-btn ${filterAuth === '' ? 'active' : ''}`}
            onClick={() => setFilterAuth('')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filterAuth === 'STATE_GOVT' ? 'active' : ''}`}
            onClick={() => setFilterAuth('STATE_GOVT')}
          >
            Mining Lease
          </button>
          <button
            className={`filter-btn ${filterAuth === 'MOEFCC' ? 'active' : ''}`}
            onClick={() => setFilterAuth('MOEFCC')}
          >
            Environmental
          </button>
          <button
            className={`filter-btn ${filterAuth === 'DGMS' ? 'active' : ''}`}
            onClick={() => setFilterAuth('DGMS')}
          >
            DGMS
          </button>
          <button
            className={`filter-btn ${filterAuth === 'IBM' ? 'active' : ''}`}
            onClick={() => setFilterAuth('IBM')}
          >
            IBM
          </button>
          <button
            className={`filter-btn ${filterAuth === 'SPCB' ? 'active' : ''}`}
            onClick={() => setFilterAuth('SPCB')}
          >
            SPCB
          </button>
        </div>
        <div className="doc-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            id="doc-search"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="doc-grid" id="doc-grid">
        {loading ? (
          <p style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', gridColumn: '1/-1', padding: '24px 0' }}>
            Loading documents…
          </p>
        ) : filteredDocs.length > 0 ? (
          filteredDocs.map((d) => (
            <div
              key={d.id}
              className="doc-card"
              onClick={() => handleOpenDoc(d)}
            >
              <div>
                <div className="doc-card-top">
                  <div className="doc-card-icon">{AUTHORITY_ICONS[d.authority] || '📄'}</div>
                  <span className={`auth-chip auth-${d.authority}`}>{(d.authority || '').replace('_', ' ')}</span>
                </div>
                <div className="doc-card-name">{d.title}</div>
                <div className="doc-card-type">{(d.recordType || '').replace('_', ' ')}</div>
                <div className="doc-card-date">
                  Issued: {d.issuedOn ? new Date(d.issuedOn).toLocaleDateString('en-IN') : '—'}
                </div>
                <span className={`doc-expiry-tag ${getExpiryStatus(d.expiry)}`}>
                  {getExpiryLabel(d.expiry)} {d.expiry ? '· ' + new Date(d.expiry).toLocaleDateString('en-IN') : ''}
                </span>
              </div>
              <div className="doc-actions-bar" onClick={(e) => e.stopPropagation()}>
                {d.attachment && (
                  <button
                    className="doc-action-btn view"
                    onClick={() => handleOpenDoc(d)}
                    title="View attachment"
                  >
                    👁️ View
                  </button>
                )}
                <button
                  className="doc-action-btn edit"
                  onClick={() => openEditModal(d)}
                  title="Edit document"
                >
                  ✏️ Edit
                </button>
                <button
                  className="doc-action-btn danger"
                  onClick={() => handleDeleteDoc(d.id)}
                  title="Delete document"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', gridColumn: '1/-1', padding: '24px 0' }}>
            No documents found matching the filter.
          </p>
        )}
      </div>

      {/* EDIT DOCUMENT MODAL */}
      {editingDoc && (
        <div
          className="modal-overlay"
          id="modal-edit-doc"
          style={{ display: 'flex' }}
          onClick={(e) => e.target === e.currentTarget && setEditingDoc(null)}
        >
          <div className="modal-box medium">
            <div className="modal-header">
              <div>
                <h2>Edit Document</h2>
                <p className="modal-sub">Update metadata or replace file attachment</p>
              </div>
              <button className="modal-close" onClick={() => setEditingDoc(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg">
                <label>Document Title *</label>
                <input
                  id="edit-doc-name"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Consent to Operate (CTO)"
                />
              </div>
              <div className="form-row-2">
                <div className="fg">
                  <label>Authority *</label>
                  <select
                    id="edit-doc-authority"
                    value={editAuthority}
                    onChange={(e) => setEditAuthority(e.target.value)}
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
                    id="edit-doc-record-type"
                    value={editRecordType}
                    onChange={(e) => setEditRecordType(e.target.value)}
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
                    id="edit-doc-issued"
                    value={editIssued}
                    onChange={(e) => setEditIssued(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    id="edit-doc-expiry"
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                  />
                </div>
              </div>
              <div className="fg" style={{ marginTop: '8px' }}>
                <label>Current Attachment</label>
                <div
                  id="edit-doc-current-file"
                  style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}
                >
                  {editingDoc.attachment?.name
                    ? `📎 ${editingDoc.attachment.name} (${Math.round((editingDoc.attachment.sizeBytes || 0) / 1024)} KB)`
                    : 'No file currently attached'}
                </div>
                <label>Replace Attachment (Optional)</label>
                <div
                  style={{
                    background: 'var(--bg-inp)',
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--r)',
                    padding: '20px',
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
                    id="edit-doc-file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    onChange={(e) => setEditFile(e.target.files[0])}
                  />
                  {editFile && (
                    <div style={{ marginTop: '8px', fontWeight: 600, color: 'var(--text1)' }}>
                      Selected: {editFile.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setEditingDoc(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

export default DocumentsView;
