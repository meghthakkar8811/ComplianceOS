import React, { memo } from 'react';

const DgmsGauge = memo(function DgmsGauge({ score = 0, onNavigate }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.16
  const validScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  const offset = circumference * (1 - validScore / 100);

  // Dynamic statutory color thresholds
  let statusColor = '#10b981'; // Green
  let statusLabel = 'Inspection Ready';
  if (validScore < 60) {
    statusColor = '#ef4444'; // Red
    statusLabel = 'Critical Non-Compliance';
  } else if (validScore < 80) {
    statusColor = '#f0a500'; // Amber
    statusLabel = 'Scrutiny Required';
  }

  return (
    <div className="dgms-card" onClick={() => onNavigate && onNavigate('dgms')} style={{ cursor: 'pointer' }}>
      <div className="dgms-card-top">
        <span className="dgms-badge">MMR 1961</span>
        <span className="card-action-link">View 8 Registers →</span>
      </div>
      <div className="dgms-ring-wrap">
        <svg className="dgms-ring-svg" viewBox="0 0 120 120">
          <circle className="dgms-ring-bg" cx="60" cy="60" r={radius} />
          <circle
            className="dgms-ring-fill"
            id="dgms-ring-fill"
            cx="60"
            cy="60"
            r={radius}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              stroke: statusColor,
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease',
            }}
          />
        </svg>
        <div className="dgms-score-block">
          <span className="dgms-score-num" id="dgms-score-num" style={{ color: statusColor }}>
            {validScore}
          </span>
          <span className="dgms-score-label">DGMS Score</span>
        </div>
      </div>
      <div className="dgms-card-footer">
        <span className="dgms-status-indicator" style={{ color: statusColor }}>
          ● {statusLabel}
        </span>
      </div>
    </div>
  );
});

export default DgmsGauge;

