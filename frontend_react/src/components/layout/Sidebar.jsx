import React, { memo } from 'react';

function formatState(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const Sidebar = memo(function Sidebar({
  activePage = 'dashboard',
  onNavigate,
  activeMine,
  mines = [],
  mineralsByMineId = {},
  isMinePickerOpen,
  onToggleMinePicker,
  onSelectMine,
  onDeleteMine,
  onOpenAddMine,
  user,
  dgmsScore,
  alertCount = 0,
  isOpen,
  onClose,
  onLogout,
}) {
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
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">⬡</div>
        <div>
          <span className="logo-name">ComplianceOS</span>
          <span className="logo-tag">Mining Platform</span>
        </div>
      </div>

      {/* MINE SWITCHER */}
      <div className="mine-switcher" id="mine-switcher" onClick={onToggleMinePicker}>
        <div className="mine-live-dot" />
        <div className="mine-switcher-info">
          <span id="active-mine-name">{activeMine ? activeMine.name : 'Loading mine…'}</span>
          <span id="active-mine-id">{activeMine ? (activeMine.leaseNumber ? `Lease #${activeMine.leaseNumber}` : activeMine.code || activeMine.id) : '—'}</span>
        </div>
        <span className={`chevron ${isMinePickerOpen ? 'open' : ''}`} id="mine-chevron">▾</span>
      </div>

      {isMinePickerOpen && (
        <div className="mine-picker show" id="mine-picker" style={{ display: 'block' }}>
          <div id="mine-list">
            {mines.length === 0 ? (
              <div style={{ padding: '12px', color: 'var(--text2)', fontSize: '12px', textAlign: 'center' }}>
                No active mine leases
              </div>
            ) : (
              mines.map((m) => {
                const isActive = activeMine && activeMine.id === m.id;
                return (
                  <div
                    key={m.id}
                    className={`mine-option ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectMine(m.id);
                      onToggleMinePicker();
                    }}
                  >
                    <div
                      className="mine-opt-dot"
                      style={{ background: isActive ? 'var(--green)' : 'var(--amber)' }}
                    />
                    <div className="mine-opt-info">
                      <div className="mine-opt-name" style={{ fontWeight: isActive ? '600' : '400' }}>
                        {m.name}
                      </div>
                      <div className="mine-opt-sub">
                        Lease #{m.leaseNumber || m.code || '—'} · {formatState(m.state)} · {mineralsByMineId[m.id] || '—'}
                      </div>
                    </div>
                    <button
                      className="mine-del-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteMine) onDeleteMine(m.id, m.name);
                      }}
                      title="Delete this mine lease"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <div
            className="mine-option add-mine"
            onClick={() => {
              onToggleMinePicker();
              onOpenAddMine();
            }}
          >
            + Add New Mine Lease
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Overview</div>
        <a
          className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <span className="nav-icon">◈</span>
          <span>Dashboard</span>
        </a>
        <a
          className={`nav-item ${activePage === 'alerts' ? 'active' : ''}`}
          onClick={() => onNavigate('alerts')}
        >
          <span className="nav-icon">◎</span>
          <span>Alerts</span>
          {alertCount > 0 && <span className="nav-badge" id="alert-badge">{alertCount}</span>}
        </a>

        <div className="nav-section-label">Compliance</div>
        <a
          className={`nav-item ${activePage === 'calendar' ? 'active' : ''}`}
          onClick={() => onNavigate('calendar')}
        >
          <span className="nav-icon">◷</span>
          <span>Compliance Calendar</span>
        </a>
        <a
          className={`nav-item ${activePage === 'forms' ? 'active' : ''}`}
          onClick={() => onNavigate('forms')}
        >
          <span className="nav-icon">▤</span>
          <span>IBM Forms</span>
        </a>
        <a
          className={`nav-item ${activePage === 'dgms' ? 'active' : ''}`}
          onClick={() => onNavigate('dgms')}
        >
          <span className="nav-icon">◉</span>
          <span>DGMS Readiness</span>
          <span className="nav-score-pill" id="dgms-nav-pill">
            {dgmsScore != null ? dgmsScore : '–'}
          </span>
        </a>
        <a
          className={`nav-item ${activePage === 'documents' ? 'active' : ''}`}
          onClick={() => onNavigate('documents')}
        >
          <span className="nav-icon">▣</span>
          <span>Documents</span>
        </a>
        <a
          className={`nav-item ${activePage === 'star-rating' ? 'active' : ''}`}
          onClick={() => onNavigate('star-rating')}
        >
          <span className="nav-icon" style={{ color: '#e8a020' }}>★</span>
          <span>Rule 35 Star Rating</span>
        </a>

        <div className="nav-section-label">Finance</div>
        <a
          className={`nav-item ${activePage === 'royalty' ? 'active' : ''}`}
          onClick={() => onNavigate('royalty')}
        >
          <span className="nav-icon">₹</span>
          <span>Royalty Calculator</span>
        </a>
        <a
          className={`nav-item ${activePage === 'sales' ? 'active' : ''}`}
          onClick={() => onNavigate('sales')}
        >
          <span className="nav-icon">⬢</span>
          <span>Sales / Dispatches</span>
        </a>
        <a
          className={`nav-item ${activePage === 'buyers' ? 'active' : ''}`}
          onClick={() => onNavigate('buyers')}
        >
          <span className="nav-icon">◆</span>
          <span>Buyers</span>
        </a>

        <div className="nav-section-label">Operations</div>
        <a
          className={`nav-item ${activePage === 'production' ? 'active' : ''}`}
          onClick={() => onNavigate('production')}
        >
          <span className="nav-icon">⬡</span>
          <span>Production Log</span>
        </a>
      </nav>

      {/* FOOTER */}
      <div className="sidebar-footer">
        <div className="sidebar-user" id="sidebar-user">
          <div className="user-av" id="user-avatar">{initials}</div>
          <div className="user-info">
            <span id="user-name">{userName}</span>
            <span id="user-role">Mine Manager</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Sign Out">
          ⏏
        </button>
      </div>
    </aside>
  );
});

export default Sidebar;
