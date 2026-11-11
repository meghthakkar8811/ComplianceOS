import React, { useState, memo } from 'react';
import { toast } from '../context/ToastContext';

export function buildAlerts(dashboardData) {
  if (!dashboardData) return [];
  const dgmsTotal = dashboardData?.dgms?.totalActions ?? 0;
  const dgmsCompleted = dashboardData?.dgms?.completedActions ?? 0;
  const dgmsOverdue = Math.max(0, dgmsTotal - dgmsCompleted);
  const {
    overdueFilingsCount = 0,
    pendingFilingsCount = 0,
    expiredDocsCount = 0,
    expiringDocsCount = 0,
  } = dashboardData?.complianceCounts || {};

  const alerts = [];

  if (dgmsOverdue > 0) {
    alerts.push({
      type: 'critical',
      icon: '⚠',
      title: `${dgmsOverdue} DGMS Register(s) Need Update`,
      desc: `${dgmsCompleted} of ${dgmsTotal} statutory registers are within their update window. Update overdue registers immediately.`,
      time: 'Now',
      action: 'Update Registers',
      nav: 'dgms',
    });
  }

  if (overdueFilingsCount > 0) {
    alerts.push({
      type: 'critical',
      icon: '📋',
      title: `${overdueFilingsCount} Filing(s) Overdue`,
      desc: 'Statutory returns are past their due date. File immediately to avoid penalties and show-cause notices.',
      time: 'Now',
      action: 'View Calendar',
      nav: 'calendar',
    });
  }

  if (expiredDocsCount > 0) {
    alerts.push({
      type: 'critical',
      icon: '📄',
      title: `${expiredDocsCount} Document(s) Expired`,
      desc: 'An expired CTO, EC or DGMS certificate can halt operations. Renew immediately.',
      time: 'Now',
      action: 'View Documents',
      nav: 'documents',
    });
  }

  if (pendingFilingsCount > 0) {
    alerts.push({
      type: 'warning',
      icon: '⏰',
      title: `${pendingFilingsCount} Deadline(s) Upcoming`,
      desc: 'Review your compliance calendar and take action before due dates.',
      time: 'Current',
      action: 'View Calendar',
      nav: 'calendar',
    });
  }

  if (expiringDocsCount > 0) {
    alerts.push({
      type: 'warning',
      icon: '📄',
      title: `${expiringDocsCount} Document(s) Expiring Soon`,
      desc: 'Check your document repository. Expiring CTO, EC or DGMS certificates need renewal.',
      time: 'Within 90 days',
      action: 'View Documents',
      nav: 'documents',
    });
  }

  return alerts;
}

const AlertsView = memo(function AlertsView({ dashboardData, onNavigate }) {
  const [allRead, setAllRead] = useState(false);
  const alerts = buildAlerts(dashboardData);
  const displayAlerts = alerts.length > 0 ? alerts : [
    {
      type: 'success',
      icon: '✓',
      title: 'All compliance checks passing!',
      desc: 'Your mine has no critical alerts at this time. Keep updating your registers and filing returns on schedule.',
      time: 'Now',
      action: null,
      nav: null,
    },
  ];

  const handleMarkAllRead = () => {
    setAllRead(true);
    toast('All alerts marked as read', 'success');
  };

  return (
    <section className="page active" id="page-alerts">
      <div className="page-header">
        <div className="page-title-block">
          <h1>Alerts & Notifications</h1>
          <p className="page-sub">Compliance alerts · Deadline warnings · System notices</p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={handleMarkAllRead}>
            Mark all read
          </button>
        </div>
      </div>

      <div id="alerts-list">
        {displayAlerts.map((a, idx) => (
          <div
            key={idx}
            className={`alert-row ${a.type}`}
            style={{ opacity: allRead ? 0.45 : 1, transition: 'opacity 0.25s ease' }}
          >
            <div className="alert-icon-wrap">{a.icon}</div>
            <div>
              <div className="alert-title">{a.title}</div>
              <div className="alert-desc">{a.desc}</div>
              <div className="alert-time">{a.time}</div>
            </div>
            <div>
              {a.action && onNavigate && (
                <button className="btn-ghost" onClick={() => onNavigate(a.nav)}>
                  {a.action}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

export default AlertsView;
