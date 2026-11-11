import React, { useState, useEffect, useCallback, memo } from 'react';
import { catalogSearch, apiFetch } from '../services/api';
import { toast } from '../context/ToastContext';
import { SchemaForm } from '../components/forms/SchemaForm';
import PaginationBar from '../components/common/PaginationBar';

const PAGE_SIZE = 20;

const BuyersView = memo(function BuyersView() {
  const [buyers, setBuyers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);

  const loadBuyers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await catalogSearch('Buyer', {
        sorts: [{ field: 'name', order: 'ASC' }],
        page: { offset: page * PAGE_SIZE, limit: PAGE_SIZE },
        includeCount: true,
      });
      const items = res?.items || [];
      setBuyers(items);
      setTotalCount(res?.totalCount ?? items.length);
    } catch (e) {
      toast('Failed to load buyers', 'error');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadBuyers();
  }, [loadBuyers]);

  const openCreate = () => {
    setEditingBuyer(null);
    setShowForm(true);
  };

  const openEdit = (buyer) => {
    setEditingBuyer(buyer);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBuyer(null);
  };

  const handleSave = async (formData) => {
    try {
      const payload = editingBuyer ? { ...editingBuyer, ...formData } : formData;
      await apiFetch(`/buyers/?skipVersion=true`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast(editingBuyer ? 'Buyer updated' : 'Buyer added', 'success');
      closeForm();
      loadBuyers();
    } catch (e) {
      toast(e.message || 'Failed to save buyer', 'error');
    }
  };

  const handleDelete = async (buyer) => {
    if (!confirm(`Are you sure you want to delete "${buyer.name}"?`)) return;
    try {
      await apiFetch(`/buyers/${buyer.id}`, { method: 'DELETE' });
      toast('Buyer deleted', 'success');
      loadBuyers();
    } catch (e) {
      toast(e.message || 'Failed to delete buyer', 'error');
    }
  };

  return (
    <section className="page active" id="page-buyers">
      <div className="page-header">
        <div className="page-title-block">
          <h1>Buyers</h1>
          <p className="page-sub">Buyer master data — used for sale dispatches and invoicing</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={openCreate}>
            + New Buyer
          </button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>GSTIN</th>
                <th>IBM Reg. No.</th>
                <th>State</th>
                <th>Address</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text2)', padding: '24px' }}>
                    Loading buyers…
                  </td>
                </tr>
              ) : buyers.length > 0 ? (
                buyers.map((b) => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>{b.gstin || '—'}</td>
                    <td>{b.ibmRegistrationNumber || '—'}</td>
                    <td>{b.state}</td>
                    <td>{b.address || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => openEdit(b)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-ghost danger"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => handleDelete(b)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text2)', padding: '24px' }}>
                    No buyers recorded yet.
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
          itemCount={buyers.length}
          onPageChange={setPage}
        />
      </div>

      {showForm && (
        <div
          className="modal-overlay"
          id="modal-buyer-form"
          style={{ display: 'flex' }}
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div className="modal-box medium">
            <div className="modal-header">
              <div>
                <h2>{editingBuyer ? 'Edit Buyer' : 'New Buyer'}</h2>
              </div>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <div className="modal-body">
              <SchemaForm
                key={editingBuyer ? editingBuyer.id : 'new'}
                assetType="Buyer"
                mode={editingBuyer ? 'edit' : 'create'}
                initialData={editingBuyer}
                onSubmit={handleSave}
                onCancel={closeForm}
                submitLabel={editingBuyer ? 'Save Changes' : 'Add Buyer'}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

export default BuyersView;
