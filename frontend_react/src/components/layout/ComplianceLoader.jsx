import React, { useState, useEffect } from 'react';

const BOOT_STAGES = [
  'ESTABLISHING ENCRYPTED STATUTORY SESSION...',
  'FETCHING MCDR 2017 & MMDR SCHEDULE II GAZETTE...',
  'CALIBRATING DGMS 8-REGISTER COMPLIANCE ENGINES...',
  'RECONCILING REAL-TIME PRODUCTION & MASS-BALANCE...',
  'COMPLIANCEOS v2.4 OPERATIONAL • ALL SYSTEMS GO'
];

export default function ComplianceLoader() {
  const [progress, setProgress] = useState(12);
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return 98;
        const inc = Math.floor(Math.random() * 18) + 8;
        const next = Math.min(prev + inc, 98);
        return next;
      });
    }, 180);

    const stageTimer = setInterval(() => {
      setStageIdx((prev) => (prev < BOOT_STAGES.length - 1 ? prev + 1 : prev));
    }, 400);

    return () => {
      clearInterval(timer);
      clearInterval(stageTimer);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 30%, #0c1628 0%, #050810 70%, #020408 100%)',
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      color: '#ffffff',
      overflow: 'hidden',
    }}>
      {/* CYBERNETIC MESH GRID BACKGROUND */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(232, 160, 32, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(232, 160, 32, 0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        opacity: 0.6,
        pointerEvents: 'none',
      }} />

      {/* AMBIENT GLOW AURAS */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(232, 160, 32, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        top: '20%',
        pointerEvents: 'none',
        animation: 'pulseGlow 3s ease-in-out infinite alternate',
      }} />

      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(0, 180, 216, 0.12) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(70px)',
        bottom: '15%',
        pointerEvents: 'none',
      }} />

      {/* GLASSMORPHIC COMMAND HUD CARD */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 44px',
        borderRadius: '20px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(232, 160, 32, 0.25)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(232, 160, 32, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        maxWidth: '460px',
        width: '90%',
      }}>
        {/* ROTATING QUANTUM HEXAGON CORE */}
        <div style={{ position: 'relative', width: '110px', height: '110px', marginBottom: '24px' }}>
          {/* Outer dashed spinning ring */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'spinClockwise 12s linear infinite' }} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(232, 160, 32, 0.4)" strokeWidth="1.5" strokeDasharray="6 4" />
          </svg>

          {/* Inner counter-spinning tick ring */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'spinCounter 7s linear infinite' }} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(0, 180, 216, 0.6)" strokeWidth="1.5" strokeDasharray="14 12" />
          </svg>

          {/* Center Pulsing Hex Core */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            color: '#e8a020',
            textShadow: '0 0 25px rgba(232, 160, 32, 0.8), 0 0 45px rgba(232, 160, 32, 0.4)',
            animation: 'hexPulse 1.8s ease-in-out infinite alternate',
          }}>
            ⬡
          </div>
        </div>

        {/* LOGO & TITLE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.04em', color: '#ffffff' }}>
            Compliance<span style={{ color: '#e8a020' }}>OS</span>
          </span>
          <span style={{
            fontSize: '9.5px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: '12px',
            background: 'rgba(232, 160, 32, 0.15)',
            border: '1px solid rgba(232, 160, 32, 0.4)',
            color: '#e8a020',
            letterSpacing: '0.06em',
          }}>
            v2.4
          </span>
        </div>

        <div style={{
          fontSize: '11px',
          fontFamily: "'IBM Plex Mono', monospace",
          color: '#64748b',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '28px',
        }}>
          Statutory Mining Platform
        </div>

        {/* TELEMETRY READOUT */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '8px 14px',
          background: 'rgba(5, 8, 16, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '8px',
          marginBottom: '18px',
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#2ecc71',
            boxShadow: '0 0 8px #2ecc71',
            animation: 'pulse 1.2s infinite',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10.5px',
            color: '#94a3b8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}>
            {BOOT_STAGES[stageIdx]}
          </span>
        </div>

        {/* LASER PROGRESS BAR */}
        <div style={{ width: '100%', marginBottom: '8px' }}>
          <div style={{
            width: '100%',
            height: '5px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #e8a020 0%, #00b4d8 100%)',
              borderRadius: '4px',
              boxShadow: '0 0 14px rgba(232, 160, 32, 0.8)',
              transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
        </div>

        {/* PERCENTAGE & TELEMETRY FOOTER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: '11px',
          fontFamily: "'IBM Plex Mono', monospace",
          color: '#64748b',
        }}>
          <span>SYS_BOOT_SEQUENCE</span>
          <span style={{ color: '#e8a020', fontWeight: 600 }}>{progress}%</span>
        </div>
      </div>

      {/* KEYFRAME ANIMATION INJECTIONS */}
      <style>{`
        @keyframes spinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes hexPulse {
          0% { transform: scale(0.92); opacity: 0.85; filter: drop-shadow(0 0 10px rgba(232,160,32,0.6)); }
          100% { transform: scale(1.08); opacity: 1; filter: drop-shadow(0 0 25px rgba(232,160,32,0.95)); }
        }
        @keyframes pulseGlow {
          0% { opacity: 0.5; transform: scale(0.95); }
          100% { opacity: 0.9; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

