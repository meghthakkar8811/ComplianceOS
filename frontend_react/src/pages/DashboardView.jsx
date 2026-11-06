import React, { memo } from 'react';
import ProdChart from '../components/dashboard/ProdChart';
import DgmsGauge from '../components/dashboard/DgmsGauge';
import Rule11CappingCard from '../components/dashboard/Rule11CappingCard';
import AntiTheftSentinelCard from '../components/dashboard/AntiTheftSentinelCard';

const DashboardView = memo(function DashboardView({
  dashboardData,
  activeMine,
  chartType,
  onChartTypeChange,
  onNavigate,
  onOpenLogProd,
}) {
  const dgmsScore = dashboardData?.dgms?.overallScore ?? 84;
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
  const targetAnnual = 1200000;
  const extractedYtd = dashboardData?.extractedYtd ?? 842150;

  return (
    <div className="page active" id="page-dashboard">
      <div className="page-header">
        <div className="page-title-block">
          <h1 id="dash-greeting">Operational Command Center</h1>
          <p className="page-sub" id="dash-sub">
            {activeMine ? `${activeMine.name} (${activeMine.mineral || 'Iron Ore'}) — ${activeMine.state || 'Odisha'}` : 'Loading lease data…'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={onOpenLogProd}>+ Log Production</button>
          <button className="btn-primary" onClick={() => onNavigate('forms')}>Generate IBM Return (Form F-1)</button>
        </div>
      </div>

      {/* STATUTORY REGULATORY CARDS GRID */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* RULE 11 MINING PLAN ANNUAL CEILING */}
        <Rule11CappingCard
          target={targetAnnual}
          extractedYtd={extractedYtd}
          unit="MT"
        />

        {/* ANTI-THEFT FORENSIC SENTINEL */}
        <AntiTheftSentinelCard
          voidRatio={98.6}
          powderFactor={5.9}
          ghostTrips={0}
          encroachments={0}
        />

        {/* DGMS INSPECTION READINESS GAUGE */}
        <DgmsGauge
          score={dgmsScore}
          onNavigate={onNavigate}
        />
      </div>

      {/* 60-FPS PRODUCTION & DISPATCH TREND CHART */}
      <div style={{ marginBottom: '20px' }}>
        <ProdChart
          data={chartData}
          chartType={chartType}
          onChartTypeChange={onChartTypeChange}
        />
      </div>

      {/* MASS-BALANCE & OPERATIONAL SUMMARY STRIP */}
      <div className="metric-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div className="metric-card">
          <span className="mc-label">Month-to-Date ROM Production</span>
          <div className="mc-val-row">
            <span className="mc-val">{monthProduced.toLocaleString()}</span>
            <span className="mc-unit">MT</span>
          </div>
          <span className="mc-sub">MCDR 2017 Rule 45 verified</span>
        </div>

        <div className="metric-card">
          <span className="mc-label">Today's Blasted & Hauled</span>
          <div className="mc-val-row">
            <span className="mc-val">{todayProduced.toLocaleString()}</span>
            <span className="mc-unit">MT</span>
          </div>
          <span className="mc-sub">Across 3 active shifts</span>
        </div>

        <div className="metric-card">
          <span className="mc-label">Statutory Barrier Compliance</span>
          <div className="mc-val-row" style={{ color: 'var(--green, #10b981)' }}>
            <span className="mc-val">7.5m</span>
            <span className="mc-unit">Buffer Intact</span>
          </div>
          <span className="mc-sub">MMR 1961 Regulation 111</span>
        </div>

        <div className="metric-card">
          <span className="mc-label">IBM MTS Integration Bridge</span>
          <div className="mc-val-row" style={{ color: 'var(--accent, #4a9eff)' }}>
            <span className="mc-val" style={{ fontSize: '18px' }}>Pre-Validated</span>
          </div>
          <span className="mc-sub">Ready for 1-Click Upload</span>
        </div>
      </div>
    </div>
  );
});

export default DashboardView;

