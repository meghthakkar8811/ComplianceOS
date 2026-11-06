import React, { useState, memo } from 'react';
import { toast } from '../context/ToastContext';

const AlertsView = memo(function AlertsView({ dashboardData, onNavigate }) {
  const [allRead, setAllRead] = useState(false);
  const records = dashboardData?.records || [];
  const now = Date.now();
  const dgmsScore = dashboardData?.dgms?.overallScore ?? 84;

  const docRecords = records.filter((r) => r.recordType === 'CLEARANCE' || r.recordType === 'STATUTORY_PLAN');
  const expiredDocs = docRecords.filter((r) => r.expiry && r.expiry < now);
  const expiringDocs = docRecords.filter(
    (r) => r.status === 'VALID' && r.expiry >= now && r.expiry - now < 90 * 86400000
  );

  const filings = records.filter((r) => r.recordType !== 'REGISTER');
  const pendingFilings = filings.filter((r) => r.status === 'PENDING_SUBMISSION');
  const overdueFilings = pendingFilings.filter((r) => r.expiry < now);

  const alerts = [];

  if (dgmsScore < 60) {
    alerts.push({
      type: 'critical',
      icon: '⚠',
      title: 'DGMS Readiness is Critical',
      desc: `Score: ${dgmsScore}/100. Multiple registers are overdue. A DGMS inspection today would result in violations.`,
      time: 'Now',
      action: 'Fix Now',
      nav: 'dgms',
    });
  }

  if (overdueFilings.length > 0) {
    alerts.push({
      type: 'critical',
      icon: '📋',
      title: `${overdueFilings.length} Filing(s) Overdue`,
      desc: 'Statutory returns are past their due date. File immediately to avoid penalties and show-cause notices.',
      time: 'Now',
      action: 'View Calendar',
      nav: 'calendar',
    });
  }

  if (expiredDocs.length > 0) {
    alerts.push({
      type: 'critical',
      icon: '📄',
      title: `${expiredDocs.length} Document(s) Expired`,
      desc: 'An expired CTO, EC or DGMS certificate can halt operations. Renew immediately.',
      time: 'Now',
      action: 'View Documents',
      nav: 'documents',
    });
  }

  if (pendingFilings.length > 0) {
    alerts.push({
      type: 'warning',
      icon: '⏰',
      title: `${pendingFilings.length} Deadline(s) Upcoming`,
      desc: 'Review your compliance calendar and take action before due dates.',
      time: 'Current',
      action: 'View Calendar',
      nav: 'calendar',
    });
  }

  if (expiringDocs.length > 0) {
    alerts.push({
      type: 'warning',
      icon: '📄',
      title: `${expiringDocs.length} Document(s) Expiring Soon`,
      desc: 'Check your document repository. Expiring CTO, EC or DGMS certificates need renewal.',
      time: 'Within 90 days',
      action: 'View Documents',
      nav: 'documents',
    });
  }

  if (!alerts.length) {
    alerts.push({
      type: 'success',
      icon: '✓',
      title: 'All compliance checks passing!',
      desc: 'Your mine has no critical alerts at this time. Keep updating your registers and filing returns on schedule.',
      time: 'Now',
      action: null,
      nav: null,
    });
  }

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
        {alerts.map((a, idx) => (
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
