import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import '../styles/auth.css';

export default function VerifyView({ email: propEmail, onNavigateToLogin }) {
  const { theme, toggleTheme } = useTheme();
  const email = propEmail || localStorage.getItem('cos_pending_email') || 'your email';
  const savedCode = localStorage.getItem('cos_pending_code') || '';

  const [otpDigits, setOtpDigits] = useState(() => {
    if (savedCode && savedCode.length === 6) {
      return savedCode.split('');
    }
    return ['', '', '', '', '', ''];
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(
    savedCode ? `Dev mode: Auto-filled OTP (${savedCode})` : ''
  );

  const handleOtpChange = (val, idx) => {
    const clean = val.replace(/\D/g, '').slice(0, 1);
    const copy = [...otpDigits];
    copy[idx] = clean;
    setOtpDigits(copy);

    if (clean && idx < 5) {
      const next = document.getElementById(`votp-${idx + 1}`);
      if (next) next.focus();
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter all 6 digits of the verification code');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/backend/auth/verify.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setSuccessMsg('Email verified successfully! Redirecting to login…');
        localStorage.removeItem('cos_pending_code');
        setTimeout(() => {
          onNavigateToLogin();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      setErrorMsg('Connection failed. Please ensure the backend services are running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-body-wrap" style={{ minHeight: '100vh', position: 'relative' }}>
      <button
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title="Toggle Dark/Light Mode"
        style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100 }}
      >
        {theme === 'dark' ? '☀' : '🌙'}
      </button>

      <div className="auth-bg">
        <div className="auth-bg-grid" />
        <div className="auth-bg-glow" />
      </div>

      <div className="auth-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px' }}>
        <div className="auth-card verify-card" style={{ maxWidth: '420px', width: '100%' }}>
          <div className="verify-icon" style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>✉</div>
          <h2 style={{ textAlign: 'center' }}>Check your email</h2>
          <p className="verify-sub" style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '13px', marginBottom: '20px' }}>
            We sent a 6-digit verification code to<br />
            <strong>{email}</strong>
          </p>

          {errorMsg && <div className="msg-box error" style={{ display: 'flex', marginBottom: '14px' }}>{errorMsg}</div>}
          {successMsg && <div className="msg-box success" style={{ display: 'flex', marginBottom: '14px' }}>{successMsg}</div>}

          <form onSubmit={handleVerify}>
            <div className="otp-wrap" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              {otpDigits.slice(0, 3).map((d, i) => (
                <input
                  key={i}
                  id={`votp-${i}`}
                  className="otp-input"
                  type="text"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(e.target.value, i)}
                  style={{ width: '42px', height: '48px', textAlign: 'center', fontSize: '18px', fontWeight: 600 }}
                />
              ))}
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text2)' }}>—</div>
              {otpDigits.slice(3, 6).map((d, i) => (
                <input
                  key={i + 3}
                  id={`votp-${i + 3}`}
                  className="otp-input"
                  type="text"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(e.target.value, i + 3)}
                  style={{ width: '42px', height: '48px', textAlign: 'center', fontSize: '18px', fontWeight: 600 }}
                />
              ))}
            </div>

            <button type="submit" className="btn-primary full-w" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Verifying…' : 'Verify Email'}
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop: '20px', textAlign: 'center' }}>
            <a href="javascript:void(0)" onClick={onNavigateToLogin}>← Back to Sign In</a>
          </div>
        </div>
      </div>
    </div>
  );
}

