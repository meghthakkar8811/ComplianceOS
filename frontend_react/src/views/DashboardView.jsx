import React, { memo } from 'react';
import ProdChart from '../components/dashboard/ProdChart';

const DashboardView = memo(function DashboardView({
  dashboardData,
  activeMine,
  chartType,
  onChartTypeChange,
  onNavigate,
  onOpenLogProd,
  onOpenFormB,
}) {
  const records = dashboardData?.records || [];
  const now = Date.now();

  // Dynamic compliance activity metrics
  let completedCount = 0;
  let pendingCount = 0;
  let expiredCount = 0;

  records.forEach((r) => {
    const isExpired = r.status === 'EXPIRED' || (r.expiry && r.expiry < now && r.status !== 'SUBMITTED');
    const isCompleted = !isExpired && (r.status === 'SUBMITTED' || (r.status === 'VALID' && (!r.expiry || r.expiry >= now)));
    if (isExpired) {
      expiredCount++;
    } else if (isCompleted) {
      completedCount++;
    } else {
      pendingCount++;
    }
  });
  const totalActivities = records.length || 26;
  const displayCompleted = records.length ? completedCount : 18;
  const displayPending = records.length ? pendingCount : 6;
  const displayExpired = records.length ? expiredCount : 2;

  const chartData = dashboardData?.chart || [
    { month: 'Jun', produced: 82000, dispatched: 79000 },
    { month: 'Jul', produced: 89000, dispatched: 85000 },
    { month: 'Aug', produced: 95000, dispatched: 91000 },
    { month: 'Sep', produced: 104000, dispatched: 98000 },
    { month: 'Oct', produced: 112000, dispatched: 108000 },
    { month: 'Nov', produced: 98000, dispatched: 95000 },
  ];

  const monthProduced = dashboardData?.monthProduced ?? 98000;
  const todayProduced = dashboardData?.todayProduced ?? 3420;
  const pendingFilingsCount = dashboardData?.pendingFilingsCount ?? displayPending;
  const grossRoyalty = dashboardData?.grossRoyalty ?? '₹1,05,600';

  // Deadlines feed
  const upcomingDeadlines = records
    .filter((r) => r.expiry && r.status !== 'SUBMITTED')
    .sort((a, b) => a.expiry - b.expiry)
    .slice(0, 4);

  return (
    <section className="page active" id="page-dashboard">
      <div className="page-header">
        <div className="page-title-block">
          <h1 id="dash-greeting">Good morning</h1>
          <p className="page-sub" id="dash-sub">
            {activeMine ? `${activeMine.name} · ${activeMine.mineral || 'Iron Ore'} · ${activeMine.state || 'Odisha'}` : 'Loading your mine data…'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={onOpenLogProd}>+ Log Production</button>
          <button className="btn-primary" onClick={onOpenFormB}>Generate IBM Return</button>
        </div>
      </div>

      {/* COMPLIANCE ACTIVITIES HERO */}
      <div className="health-hero">
        <div className="compliance-hero-left">
          <div className="ch-top-row">
            <div className="ch-headline-block">
              <div className="ch-eyebrow">COMPLIANCE ACTIVITIES STATUS</div>
              <div className="ch-main-ratio">
                <span className="ch-num-completed" id="ch-num-completed">{displayCompleted}</span>
                <span className="ch-num-divider">/</span>
                <span className="ch-num-total" id="ch-num-total">{totalActivities}</span>
                <span className="ch-num-caption">Activities Completed</span>
              </div>
            </div>
            <div className="ch-status-pill" id="hb-status">
              {displayExpired > 0 ? `⚠ ${displayExpired} Attention Required` : '● Checking compliance records…'}
            </div>
          </div>

          <div className="compliance-cards-grid">
            <div className="ch-stat-card card-completed" onClick={() => onNavigate('calendar')} title="View completed activities">
              <div className="ch-card-header">
                <span className="ch-card-label">Completed</span>
                <div className="ch-card-icon blue">✓</div>
              </div>
              <div className="ch-card-number blue" id="cm-completed-val">{displayCompleted}</div>
              <div className="ch-card-sub">Activities completed</div>
            </div>

            <div className="ch-stat-card card-pending" onClick={() => onNavigate('calendar')} title="View pending activities">
              <div className="ch-card-header">
                <span className="ch-card-label">Pending</span>
                <div className="ch-card-icon orange">⏳</div>
              </div>
              <div className="ch-card-number orange" id="cm-pending-val">{displayPending}</div>
              <div className="ch-card-sub">Activities remaining</div>
            </div>

            <div className="ch-stat-card card-expired" onClick={() => onNavigate('calendar')} title="View expired / overdue activities">
              <div className="ch-card-header">
                <span className="ch-card-label">Expired</span>
                <div className="ch-card-icon red">⚠</div>
              </div>
              <div className="ch-card-number red" id="cm-expired-val">{displayExpired}</div>
              <div className="ch-card-sub">Expired / Overdue</div>
            </div>

            <div className="ch-stat-card card-total" onClick={() => onNavigate('calendar')} title="View all activities">
              <div className="ch-card-header">
                <span className="ch-card-label">Total</span>
                <div className="ch-card-icon neutral">📋</div>
              </div>
              <div className="ch-card-number neutral" id="cm-total-val">{totalActivities}</div>
              <div className="ch-card-sub">Expected activities</div>
            </div>
          </div>
        </div>

        <div className="health-actions">
          <div className="ha-title">Priority Actions</div>
          <div id="priority-actions">
            <div className="action-card critical" onClick={() => onNavigate('forms')} style={{ cursor: 'pointer' }}>
              <div className="ac-severity">CRITICAL ACTION</div>
              <div className="ac-text">Monthly IBM Form B return due in 4 days. Production entries verified.</div>
              <div className="ac-cta">File Form B →</div>
            </div>
            <div className="action-card warning" onClick={() => onNavigate('calendar')} style={{ cursor: 'pointer' }}>
              <div className="ac-severity">ACTION REQUIRED</div>
              <div className="ac-text">DGMS shift attendance records update pending for 2 shifts.</div>
              <div className="ac-cta">Update Records →</div>
            </div>
            <div className="action-card ok" onClick={() => onNavigate('royalty')} style={{ cursor: 'pointer' }}>
              <div className="ac-severity">ON TRACK</div>
              <div className="ac-text">Current month royalty liability calculated. Dispatches reconciled.</div>
              <div className="ac-cta">Review Breakdown →</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-grid" id="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap blue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Month Production</div>
            <div className="kpi-value" id="kpi-produced">{monthProduced.toLocaleString()} MT</div>
            <div className="kpi-change neutral" id="kpi-produced-sub">This month</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap amber">
            <span style={{ fontSize: '16px', fontWeight: 700 }}>₹</span>
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Royalty (Gross)</div>
            <div className="kpi-value" id="kpi-royalty">{grossRoyalty}</div>
            <div className="kpi-change neutral" id="kpi-royalty-sub">Current period</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap red">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Pending Filings</div>
            <div className="kpi-value" id="kpi-filings">{pendingFilingsCount}</div>
            <div className="kpi-change neutral" id="kpi-filings-sub">Deadlines</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Today's Production</div>
            <div className="kpi-value" id="kpi-today">{todayProduced.toLocaleString()} MT</div>
            <div className="kpi-change neutral">Today</div>
          </div>
        </div>
      </div>

      {/* LOWER GRID: PRODUCTION & DISPATCH DUAL-LINE CHART + DEADLINE FEED + ROYALTY SNAP */}
      <div className="dashboard-grid">
        <div className="dash-card span-2">
          <ProdChart
            data={chartData}
            chartType={chartType}
            onChartTypeChange={onChartTypeChange}
          />
        </div>

        <div className="dash-card">
          <div className="card-head">
            <h3>Upcoming Deadlines</h3>
            <a className="card-link" onClick={() => onNavigate('calendar')}>View all →</a>
          </div>
          <div id="deadline-feed">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((item) => {
                const days = Math.floor((item.expiry - now) / 86400000);
                return (
                  <div key={item.id} className="df-item" onClick={() => onNavigate('calendar')}>
                    <div className="df-date">
                      <span className="df-day">{new Date(item.expiry).getDate()}</span>
                      <span className="df-mon">
                        {new Date(item.expiry).toLocaleString('default', { month: 'short' }).toUpperCase()}
                      </span>
                    </div>
                    <div className="df-info">
                      <div className="df-title">{item.title}</div>
                      <div className="df-sub">{(item.authority || '').replace('_', ' ')}</div>
                    </div>
                    <span className={`df-chip ${days < 0 ? 'red' : days <= 7 ? 'amber' : 'green'}`}>
                      {days < 0 ? 'OVERDUE' : `${days}d`}
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--text2)', fontSize: '12px', padding: '12px 0' }}>
                No upcoming deadlines
              </div>
            )}
          </div>
        </div>

        <div className="dash-card">
          <div className="card-head">
            <h3>Royalty — Current Month</h3>
          </div>
          <div id="royalty-snap">
            <div className="rb-row">
              <span className="rb-label">Base Royalty</span>
              <span className="rb-val">₹80,000</span>
            </div>
            <div className="rb-row">
              <span className="rb-label">DMF (30%)</span>
              <span className="rb-val">₹24,000</span>
            </div>
            <div className="rb-row">
              <span className="rb-label">NMET (2%)</span>
              <span className="rb-val">₹1,600</span>
            </div>
            <div className="rb-row" style={{ borderBottom: 'none' }}>
              <span className="rb-label" style={{ fontWeight: 600, color: 'var(--amber)' }}>Gross Liability</span>
              <span className="rb-val" style={{ color: 'var(--amber)', fontSize: '15px' }}>{grossRoyalty}</span>
            </div>
          </div>
          <button className="btn-primary full-w mt-12" onClick={() => onNavigate('royalty')}>
            View Royalty →
          </button>
        </div>
      </div>
    </section>
  );
});

export default DashboardView;
