import React, { memo } from 'react';
import { useTheme } from '../../context/ThemeContext';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  alerts: 'Alerts',
  calendar: 'Compliance Calendar',
  forms: 'IBM Forms',
  dgms: 'DGMS Readiness',
  documents: 'Documents',
  royalty: 'Royalty Calculator',
  sales: 'Sales / Dispatches',
  buyers: 'Buyers',
  production: 'Production Log',
  mine: 'Mine Management',
};

const Topbar = memo(function Topbar({
  activePage = 'dashboard',
  onToggleSidebar,
  onNavigate,
  alertCount = 0,
  complianceProgress,
  user,
}) {
  const totalTasks = complianceProgress?.totalActions ?? 0;
  const completedTasks = complianceProgress?.completedActions ?? 0;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const progressColor = totalTasks === 0 ? 'var(--text2)' : completedTasks === totalTasks ? 'var(--green)' : 'var(--amber)';
  const { theme, toggleTheme } = useTheme();
  const userName = user?.username || 'User';
  const initials =
    userName
      .split(/[@._\s]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'MT';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="hamburger" onClick={onToggleSidebar} aria-label="Toggle navigation">
          <span />
          <span />
          <span />
        </button>
        <div className="breadcrumb-trail">
          <span className="bc-root">ComplianceOS</span>
          <span className="bc-sep">›</span>
          <span id="bc-current">{PAGE_TITLES[activePage] || activePage}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* THEME TOGGLE */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title="Toggle Dark/Light Mode"
          style={{ position: 'static', marginRight: '12px' }}
        >
          {theme === 'dark' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* TASK COMPLETION PILL */}
        <div className="health-pill" id="health-pill" onClick={() => onNavigate('dashboard')} title="Completed vs total statutory tasks">
          <span className="hp-label">Tasks</span>
          <div className="hp-bar-wrap">
            <div
              className="hp-bar"
              id="hp-bar"
              style={{
                width: `${completionPct}%`,
                background: progressColor,
              }}
            />
          </div>
          <span
            className="hp-score"
            id="hp-score"
            style={{ color: progressColor }}
          >
            {complianceProgress ? `${completedTasks}/${totalTasks}` : '–'}
          </span>
        </div>

        {/* ALERTS BUTTON */}
        <button className="topbar-icon-btn" onClick={() => onNavigate('alerts')} title="Alerts">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {alertCount > 0 && (
            <span className="topbar-badge" id="topbar-alert-count">
              {alertCount}
            </span>
          )}
        </button>

        {/* USER AVATAR */}
        <div className="user-av topbar-av" id="topbar-av">
          {initials}
        </div>
      </div>
    </header>
  );
});

export default Topbar;
