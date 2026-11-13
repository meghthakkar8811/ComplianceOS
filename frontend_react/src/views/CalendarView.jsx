import React, { useState, useEffect, useCallback, memo } from 'react';
import { catalogSearch, apiFetch } from '../services/api';
import { toast } from '../context/ToastContext';
import PaginationBar from '../components/common/PaginationBar';

const PAGE_SIZE = 20;

const CalendarView = memo(function CalendarView({ activeMineId, onDataChanged }) {
  const [authorityFilter, setAuthorityFilter] = useState('');
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(0);
  }, [activeMineId, authorityFilter]);

  const loadCalendarData = useCallback(async () => {
    if (!activeMineId) return;
    setLoading(true);
    try {
      const filters = [
        { field: 'mineId', op: 'EQ', values: [activeMineId] },
        { field: 'recordType', op: 'NE', values: ['REGISTER'] },
      ];
      if (authorityFilter) {
        filters.push({ field: 'authority', op: 'EQ', values: [authorityFilter] });
      }
      const res = await catalogSearch('ComplianceRecord', {
        filter: { op: 'AND', values: filters },
        sorts: [{ field: 'expiry', order: 'ASC' }],
        page: { offset: page * PAGE_SIZE, limit: PAGE_SIZE },
        includeCount: true,
      });
      const now = Date.now();
      const raw = res?.items || [];
      const items = raw.map((r) => {
        const hasExpiry = typeof r.expiry === 'number' && !isNaN(r.expiry) && r.expiry > 0;
        const dt = hasExpiry ? new Date(r.expiry) : null;
        return {
          ...r,
          days_until: hasExpiry ? Math.floor((r.expiry - now) / 86400000) : null,
          dt,
        };
      });
      setRecords(items);
      setTotalCount(res?.totalCount ?? raw.length);
    } catch (err) {
      toast('Failed to load compliance calendar', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeMineId, authorityFilter, page]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const handleMarkSubmitted = async (ev) => {
    if (ev.status === 'SUBMITTED') {
      toast(`Already filed on ${ev.submittedOn ? new Date(ev.submittedOn).toLocaleDateString('en-IN') : 'date'}. Ref #${ev.referenceNumber || 'N/A'}`, 'info');
      return;
    }
    const refNum = prompt(`Mark "${ev.title}" as submitted.\nEnter the authority's reference/acknowledgement number:`);
    if (!refNum) return;

    try {
      await apiFetch(`/mines/${activeMineId}/compliance/records/${ev.id}/mark-submitted`, {
        method: 'POST',
        body: JSON.stringify({ referenceNumber: refNum }),
      });
      toast(`Marked "${ev.title}" as submitted!`, 'success');
      loadCalendarData();
      onDataChanged?.();
    } catch (err) {
      toast(err.message || 'Failed to mark as submitted', 'error');
    }
  };

  // Group events by month
  const months = {};
  records.forEach((ev) => {
    const key = ev.dt ? ev.dt.toLocaleString('default', { month: 'long', year: 'numeric' }) : 'Standing / No Expiry Date';
    if (!months[key]) months[key] = [];
    months[key].push(ev);
  });

  return (
    <section className="page active" id="page-calendar">
      <div className="page-header">
        <div className="page-title-block">
          <h1>Compliance Calendar</h1>
          <p className="page-sub">All statutory deadlines · IBM · DGMS · MoEFCC · SPCB</p>
        </div>
        <div className="page-actions">
          <select
            className="filter-select"
            id="cal-filter"
            value={authorityFilter}
            onChange={(e) => setAuthorityFilter(e.target.value)}
          >
            <option value="">All Authorities</option>
            <option value="IBM">IBM</option>
            <option value="DGMS">DGMS</option>
            <option value="MOEFCC">MoEFCC</option>
            <option value="SPCB">SPCB</option>
            <option value="STATE_GOVT">State Govt</option>
          </select>
        </div>
      </div>

      <div id="calendar-content">
        {loading ? (
          <p style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', padding: '24px' }}>
            Loading calendar events…
          </p>
        ) : Object.keys(months).length === 0 ? (
          <p style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', padding: '24px' }}>
            No deadlines found.
          </p>
        ) : (
          Object.entries(months).map(([month, evts]) => (
            <div key={month} className="cal-month-block">
              <div className="cal-month-label">{month}</div>
              {evts.map((ev) => {
                const days = ev.days_until;
                const cls =
                  ev.status === 'SUBMITTED'
                    ? 'done'
                    : days == null
                    ? 'upcoming'
                    : days < 0
                    ? 'overdue'
                    : days <= 7
                    ? 'due-soon'
                    : 'upcoming';
                const chipCls =
                  ev.status === 'SUBMITTED'
                    ? 'green'
                    : days == null
                    ? 'neutral'
                    : days <= 0
                    ? 'red'
                    : days <= 7
                    ? 'red'
                    : days <= 14
                    ? 'amber'
                    : 'green';
                const chip =
                  ev.status === 'SUBMITTED'
                    ? 'Filed ✓'
                    : days == null
                    ? 'Ongoing'
                    : days < 0
                    ? 'OVERDUE'
                    : `${days}d away`;

                return (
                  <div
                    key={ev.id}
                    className={`cal-item ${cls}`}
                    onClick={() => handleMarkSubmitted(ev)}
                    title={ev.status === 'SUBMITTED' ? 'Already submitted' : 'Click to mark as submitted'}
                  >
                    <div>
                      <span className="cal-day-num">{ev.dt ? ev.dt.getDate() : '—'}</span>
                      <span className="cal-day-mon">
                        {ev.dt ? ev.dt.toLocaleString('default', { month: 'short' }).toUpperCase() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <div className="cal-item-title">{ev.title}</div>
                      <div className="cal-item-sub">{(ev.authority || '').replace('_', ' ')}</div>
                    </div>
                    <span className={`auth-chip auth-${ev.authority}`}>
                      {(ev.authority || '').replace('_', ' ')}
                    </span>
                    <span className={`days-chip ${chipCls}`}>{chip}</span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        itemCount={records.length}
        onPageChange={setPage}
      />
    </section>
  );
});

export default CalendarView;
