import React, { memo } from 'react';
import ProdChart from '../components/dashboard/ProdChart';
import Rule11CappingCard from '../components/dashboard/Rule11CappingCard';

const DashboardView = memo(function DashboardView({
  dashboardData,
  activeMine,
  activeMineMinerals,
  chartType,
  onChartTypeChange,
  onNavigate,
  onOpenLogProd,
  onOpenFormB,
}) {
  const now = Date.now();
  const progress = dashboardData?.progress || { totalActions: 0, completedActions: 0 };
  const dgmsProgress = dashboardData?.dgms || { totalActions: 0, completedActions: 0 };
  const counts = dashboardData?.complianceCounts || {
    overdueFilingsCount: 0,
    pendingFilingsCount: 0,
    expiredDocsCount: 0,
    expiringDocsCount: 0,
  };

  const totalTasks = progress.totalActions ?? 0;
  const completedTasks = progress.completedActions ?? 0;
  const remainingTasks = Math.max(0, totalTasks - completedTasks);
  const dgmsRemaining = Math.max(0, (dgmsProgress.totalActions ?? 0) - (dgmsProgress.completedActions ?? 0));
  const attentionCount = (counts.overdueFilingsCount || 0) + (counts.expiredDocsCount || 0) + dgmsRemaining;

  const chartData = dashboardData?.chart || [];
  const monthProduced = dashboardData?.monthProduced ?? 0;
  const todayProduced = dashboardData?.todayProduced ?? 0;
  const pendingFilingsCount = counts.pendingFilingsCount || 0;
  const grossRoyalty = dashboardData?.grossRoyalty ?? '₹0';
  const royaltyBreakdown = dashboardData?.royaltyBreakdown || { base: 0, dmf: 0, nmet: 0 };
  const upcomingDeadlines = dashboardData?.upcomingDeadlines || [];

  return (
    <section className="page active" id="page-dashboard">
      <div className="page-header">
        <div className="page-title-block">
          <h1 id="dash-greeting">Good morning</h1>
          <p className="page-sub" id="dash-sub">
            {activeMine
              ? [activeMine.name, activeMineMinerals, activeMine.state].filter(Boolean).join(' · ')
              : 'Loading your mine data…'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={onOpenLogProd}>+ Log Production</button>
          <button className="btn-primary" onClick={onOpenFormB}>Generate IBM Return</button>
        </div>
      </div>

      {/* COMPLIANCE TASKS HERO (Completion counts only, no scoring) */}
      <div className="health-hero">
        <div className="compliance-hero-left">
          <div className="ch-top-row">
            <div className="ch-headline-block">
              <div className="ch-eyebrow">COMPLIANCE TASK COMPLETION</div>
              <div className="ch-main-ratio">
                <span className="ch-num-completed" id="ch-num-completed">{completedTasks}</span>
                <span className="ch-num-divider">/</span>
                <span className="ch-num-total" id="ch-num-total">{totalTasks}</span>
                <span className="ch-num-caption">Tasks Completed</span>
              </div>
            </div>
            <div className="ch-status-pill" id="hb-status">
              {attentionCount > 0 ? `⚠ ${attentionCount} Overdue / Needs Update` : totalTasks > 0 ? '✓ All Tasks On Track' : '● Loading tasks…'}
            </div>
          </div>

          <div className="compliance-cards-grid">
            <div className="ch-stat-card card-completed" onClick={() => onNavigate('calendar')} title="Completed filings, valid clearances & up-to-date registers">
              <div className="ch-card-header">
                <span className="ch-card-label">Completed</span>
                <div className="ch-card-icon blue">✓</div>
              </div>
              <div className="ch-card-number blue" id="cm-completed-val">{completedTasks}</div>
              <div className="ch-card-sub">Tasks finished</div>
            </div>

            <div className="ch-stat-card card-pending" onClick={() => onNavigate('calendar')} title="View remaining tasks">
              <div className="ch-card-header">
                <span className="ch-card-label">Remaining</span>
                <div className="ch-card-icon orange">⏳</div>
              </div>
              <div className="ch-card-number orange" id="cm-pending-val">{remainingTasks}</div>
              <div className="ch-card-sub">Tasks open</div>
            </div>

            <div className="ch-stat-card card-expired" onClick={() => onNavigate('alerts')} title="View overdue filings, expired docs & stale registers">
              <div className="ch-card-header">
                <span className="ch-card-label">Overdue</span>
                <div className="ch-card-icon red">⚠</div>
              </div>
              <div className="ch-card-number red" id="cm-expired-val">{attentionCount}</div>
              <div className="ch-card-sub">Expired / Overdue</div>
            </div>

            <div className="ch-stat-card card-total" onClick={() => onNavigate('calendar')} title="View all statutory tasks">
              <div className="ch-card-header">
                <span className="ch-card-label">Total</span>
                <div className="ch-card-icon neutral">📋</div>
              </div>
              <div className="ch-card-number neutral" id="cm-total-val">{totalTasks}</div>
              <div className="ch-card-sub">Total tracked tasks</div>
            </div>
          </div>
        </div>

        <div className="health-actions">
          <div className="ha-title">Priority Actions</div>
          <div id="priority-actions">
            {attentionCount > 0 && (
              <div className="action-card critical" onClick={() => onNavigate('alerts')} style={{ cursor: 'pointer' }}>
                <div className="ac-severity">CRITICAL ACTION</div>
                <div className="ac-text">{attentionCount} overdue item(s) / stale register(s) require immediate attention.</div>
                <div className="ac-cta">Review Alerts →</div>
              </div>
            )}
            {pendingFilingsCount > 0 && (
              <div className="action-card warning" onClick={() => onNavigate('calendar')} style={{ cursor: 'pointer' }}>
                <div className="ac-severity">ACTION REQUIRED</div>
                <div className="ac-text">{pendingFilingsCount} pending filing deadline(s) remaining.</div>
                <div className="ac-cta">View Calendar →</div>
              </div>
            )}
            <div className="action-card ok" onClick={() => onNavigate('royalty')} style={{ cursor: 'pointer' }}>
              <div className="ac-severity">ROYALTY LEDGER</div>
              <div className="ac-text">Current period gross royalty liability: {grossRoyalty}.</div>
              <div className="ac-cta">Review Breakdown →</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRIORITY 1: MCDR RULE 11 MINING PLAN CAPPING QUOTA SENTINEL ── */}
      <Rule11CappingCard
        activeMine={activeMine}
        cumulativeYtdProduced={dashboardData?.extractedYtd ?? 0}
        onNavigate={onNavigate}
      />

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
            <h3>Royalty — Latest Period</h3>
          </div>
          <div id="royalty-snap">
            <div className="rb-row">
              <span className="rb-label">Base Royalty</span>
              <span className="rb-val">₹{Math.round(royaltyBreakdown.base).toLocaleString('en-IN')}</span>
            </div>
            <div className="rb-row">
              <span className="rb-label">DMF</span>
              <span className="rb-val">₹{Math.round(royaltyBreakdown.dmf).toLocaleString('en-IN')}</span>
            </div>
            <div className="rb-row">
              <span className="rb-label">NMET</span>
              <span className="rb-val">₹{Math.round(royaltyBreakdown.nmet).toLocaleString('en-IN')}</span>
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
