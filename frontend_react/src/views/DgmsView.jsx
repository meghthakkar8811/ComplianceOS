import React, { useState, useEffect, useCallback, memo } from 'react';
import { apiFetch, catalogSearch } from '../services/api';
import { toast } from '../context/ToastContext';
import PaginationBar from '../components/common/PaginationBar';

const PAGE_SIZE = 20;

const DgmsView = memo(function DgmsView({ activeMineId, onDataChanged }) {
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [registers, setRegisters] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [progress, setProgress] = useState({ totalActions: 0, completedActions: 0 });

  useEffect(() => {
    setPage(0);
  }, [activeMineId]);

  const loadDgmsData = useCallback(async () => {
    if (!activeMineId) return;
    setLoading(true);
    try {
      const [progressRes, registersResult] = await Promise.all([
        apiFetch(`/mines/${activeMineId}/compliance/progress`, {
          method: 'POST',
          body: JSON.stringify({
            filter: { field: 'recordType', op: 'EQ', values: ['REGISTER'] },
          }),
        }).catch(() => ({ totalActions: 0, completedActions: 0 })),
        catalogSearch('ComplianceRecord', {
          filter: {
            op: 'AND',
            values: [
              { field: 'mineId', op: 'EQ', values: [activeMineId] },
              { field: 'recordType', op: 'EQ', values: ['REGISTER'] },
            ],
          },
          sorts: [{ field: 'lastUpdatedAt', order: 'ASC' }],
          page: { offset: page * PAGE_SIZE, limit: PAGE_SIZE },
          includeCount: true,
        }),
      ]);
      const items = registersResult?.items || [];
      setRegisters(items);
      setTotalCount(registersResult?.totalCount ?? items.length);
      setProgress({
        totalActions: progressRes?.totalActions ?? 0,
        completedActions: progressRes?.completedActions ?? 0,
      });
    } catch {
      toast('Failed to load DGMS registers', 'error');
      setRegisters([]);
    } finally {
      setLoading(false);
    }
  }, [activeMineId, page]);

  useEffect(() => {
    loadDgmsData();
  }, [loadDgmsData]);

  const handleMarkUpdated = async (registerId) => {
    setUpdatingId(registerId);
    try {
      await apiFetch(`/mines/${activeMineId}/compliance/records/${registerId}/mark-updated`, {
        method: 'POST',
      });
      toast('Register marked as updated today', 'success');
      await loadDgmsData();
      onDataChanged?.();
    } catch (err) {
      toast(err.message || 'Failed to update register', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const { totalActions, completedActions } = progress;
  const remainingCount = Math.max(0, totalActions - completedActions);
  const ratio = totalActions > 0 ? completedActions / totalActions : 0;
  const radius = 68;
  const circ = 427.08;
  const offset = circ - ratio * circ;
  const ringColor = totalActions === 0 ? '#334155' : remainingCount === 0 ? '#10b981' : '#f59e0b';

  const statusText =
    totalActions === 0
      ? 'NO REGISTERS TRACKED'
      : remainingCount === 0
      ? 'ALL REGISTERS UP TO DATE'
      : `${remainingCount} REGISTER${remainingCount > 1 ? 'S' : ''} NEED UPDATE`;

  const statusNote =
    totalActions === 0
      ? 'No DGMS registers found for this mine.'
      : remainingCount === 0
      ? 'Every tracked statutory register is within its required update window.'
      : 'Update overdue statutory registers listed on the right.';

  return (
    <section className="page active" id="page-dgms">
      <div className="page-header">
        <div className="page-title-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🛡️</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono, monospace)', fontWeight: 600, color: '#e8a020', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Directorate General of Mines Safety &bull; MMR 1961
            </span>
          </div>
          <h1>DGMS Statutory Registers</h1>
          <p className="page-sub">
            Statutory register update tracking &bull; Mines Act 1952 Compliance
          </p>
        </div>
      </div>

      <div className="dgms-layout">
        {/* TASK COMPLETION PANEL */}
        <div className="dgms-score-panel">
          <div className="dsp-label">REGISTERS COMPLETED</div>
          <div className="dsp-score-wrap">
            <svg className="dgms-ring" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={radius} fill="none" stroke="#1a2845" strokeWidth="10" />
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={ringColor}
                strokeWidth="10"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                id="dgms-ring-fill"
                style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div className="dgms-score-inner">
              <span id="dgms-score-num" style={{ color: totalActions ? ringColor : '#94a3b8' }}>
                {completedActions}
              </span>
              <span>/{totalActions}</span>
            </div>
          </div>
          <div className="dsp-verdict" id="dsp-verdict" style={{ color: totalActions ? ringColor : '#94a3b8', fontSize: '12px', fontWeight: 700 }}>
            {statusText}
          </div>
          <p className="dsp-note" id="dsp-note">
            {statusNote}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(16,185,129,0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text2)' }}>Up to Date</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{completedActions}</div>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(245,158,11,0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text2)' }}>Needs Update</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: remainingCount > 0 ? '#f59e0b' : 'var(--text2)' }}>{remainingCount}</div>
            </div>
          </div>
        </div>

        {/* REGISTERS PANEL */}
        <div className="registers-panel">
          <div className="rp-head" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3>Mandatory Statutory Registers (Mines Act & MMR 1961)</h3>
              <span className="rp-count">
                {loading ? 'Loading registers…' : `${totalCount} registers monitored`}
              </span>
            </div>
          </div>

          <div id="registers-list">
            {registers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text2, #94a3b8)', fontSize: '13px' }}>
                {loading ? 'Loading registers…' : 'No statutory registers found.'}
              </div>
            ) : (
              registers.map((r) => {
                const lastUpdated = r.lastUpdatedAt || 0;
                const daysSince = lastUpdated > 0
                  ? Math.max(0, Math.floor((Date.now() - lastUpdated) / 86400000))
                  : null;
                const maxDays = Math.max(r.maxDaysAllowed || 1, 1);
                const isUpToDate = daysSince != null && daysSince <= maxDays;
                const dotColor = isUpToDate ? '#10b981' : '#ef4444';

                return (
                  <div key={r.id} className="reg-item">
                    <div>
                      <div className="reg-name">{r.title}</div>
                      <div className="reg-reg">{r.notes || 'MMR 1961'}</div>
                      <div className="reg-note" style={{ color: dotColor, fontWeight: 600 }}>
                        {isUpToDate
                          ? '✓ Up to Date'
                          : daysSince == null
                          ? 'Never updated'
                          : `${daysSince} days since last update (limit ${maxDays}d)`}
                      </div>
                    </div>
                    <div className="reg-last">
                      Updated: {r.lastUpdatedAt ? new Date(r.lastUpdatedAt).toLocaleDateString('en-IN') : '—'}
                    </div>
                    <button
                      className="reg-btn"
                      disabled={updatingId === r.id}
                      onClick={() => handleMarkUpdated(r.id)}
                    >
                      {updatingId === r.id ? 'Saving…' : 'Mark Updated Today'}
                    </button>
                    <div className="reg-dot" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
                  </div>
                );
              })
            )}
          </div>

          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            itemCount={registers.length}
            onPageChange={setPage}
          />
        </div>
      </div>
    </section>
  );
});

export default DgmsView;
