import React, { useState, useEffect, memo } from 'react';
import { catalogSearch, apiFetch } from '../services/api';
import { toast } from '../context/ToastContext';

const CalendarView = memo(function CalendarView({ activeMineId }) {
  const [authorityFilter, setAuthorityFilter] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeMineId) {
      loadCalendarData();
    }
  }, [activeMineId, authorityFilter]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const filters = [
        { field: 'mineId', op: 'EQ', values: [activeMineId] },
        { field: 'recordType', op: 'NE', values: ['REGISTER'] },
      ];
      if (authorityFilter) {
        filters.push({ field: 'authority', op: 'EQ', values: [authorityFilter] });
      }
      const res = await catalogSearch('ComplianceRecord', { filter: { op: 'AND', values: filters } });
      const now = Date.now();
      const items = (res.items || [])
        .map((r) => ({
          ...r,
          days_until: Math.floor((r.expiry - now) / 86400000),
          dt: new Date(r.expiry),
        }))
        .sort((a, b) => a.expiry - b.expiry);
      setRecords(items);
    } catch (err) {
      toast('Failed to load compliance calendar', 'error');
    } finally {
      setLoading(false);
    }
  };

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
    } catch (err) {
      toast(err.message || 'Failed to mark as submitted', 'error');
    }
  };

  // Group events by month
  const months = {};
  records.forEach((ev) => {
    const key = ev.dt.toLocaleString('default', { month: 'long', year: 'numeric' });
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
                    : days < 0
                    ? 'overdue'
                    : days <= 7
                    ? 'due-soon'
                    : 'upcoming';
                const chipCls =
                  ev.status === 'SUBMITTED'
                    ? 'green'
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
                      <span className="cal-day-num">{ev.dt.getDate()}</span>
                      <span className="cal-day-mon">
                        {ev.dt.toLocaleString('default', { month: 'short' }).toUpperCase()}
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
    </section>
  );
});

export default CalendarView;
